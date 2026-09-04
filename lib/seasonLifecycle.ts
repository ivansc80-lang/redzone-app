import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { pushInicioTemporadaSiProcede } from '@/lib/pushAutomatic';

export type FaseAnual = 'finalizada' | 'draft' | 'pretemporada' | 'regular';

interface GestionarCicloAnualParams {
  temporada: number;
  temporadaObjetivo: number | null;
  faseCompeticion: 'finalizada' | 'draft' | 'pretemporada';
  ahora?: Date;
}

const HORAS_ANTES_INICIO_TR = 125;

function fechaUTC(anio: number, mes: number, dia: number) {
  return new Date(Date.UTC(anio, mes - 1, dia, 0, 0, 0, 0));
}

async function obtenerInicioJ1(temporada: number) {
  const { data, error } = await supabase
    .from('partidos')
    .select('fecha_partido')
    .eq('temporada', temporada)
    .eq('tipo_competicion', 'regular')
    .eq('jornada', 1)
    .order('fecha_partido', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo el inicio de J1 ${temporada}: ${error.message}`);
  }

  if (!data?.fecha_partido) return null;

  const fecha = new Date(data.fecha_partido);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export async function gestionarCicloAnual({
  temporada,
  temporadaObjetivo,
  faseCompeticion,
  ahora = new Date(),
}: GestionarCicloAnualParams) {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida en ciclo anual: ${temporada}`);
  }

  let objetivo: number | null =
    Number.isInteger(temporadaObjetivo) && Number(temporadaObjetivo) >= 2000
      ? Number(temporadaObjetivo)
      : null;

  // temporada_objetivo solo nace cuando llega el 15 de mayo de la
  // siguiente campaña respecto a la temporada que está cargada.
  // Ejemplo: una vez activada 2027 y puesto objetivo=null, 2028 no puede
  // aparecer hasta el 15/05/2028 aunque el cron pase cada 5 minutos.
  const siguienteTemporada = temporada + 1;
  const inicioBusquedaSiguiente = fechaUTC(siguienteTemporada, 5, 15);

  if (objetivo === null && ahora >= inicioBusquedaSiguiente) {
    objetivo = siguienteTemporada;
  }

  // Mientras el calendario nuevo no está validado, temporada puede seguir
  // apuntando al año anterior. Por eso el ciclo natural puede ser temporada+1.
  const anioCiclo = ahora.getUTCFullYear() > temporada ? temporada + 1 : temporada;
  const inicioDraft = fechaUTC(anioCiclo, 3, 1);
  const inicioPretemporada = fechaUTC(anioCiclo, 7, 16);

  let nuevaFase: FaseAnual;

  if (ahora >= inicioPretemporada) {
    nuevaFase = 'pretemporada';
  } else if (ahora >= inicioDraft) {
    nuevaFase = 'draft';
  } else {
    nuevaFase = 'finalizada';
  }

  // `temporada` continúa siendo la temporada competitiva vigente.
  // `objetivo` identifica la siguiente temporada preparada en BBDD.
  // Solo al alcanzar T-125 respecto al kickoff real de J1 se activa.
  const temporadaEntradaRegular = objetivo ?? temporada;
  let temporadaActiva = temporada;
  let inicioRegular: Date | null = null;

  if (nuevaFase === 'pretemporada') {
    const inicioJ1 = await obtenerInicioJ1(temporadaEntradaRegular);

    if (inicioJ1) {
      inicioRegular = new Date(
        inicioJ1.getTime() - HORAS_ANTES_INICIO_TR * 60 * 60 * 1000,
      );
    }
  }

  const entraEnRegular =
    nuevaFase === 'pretemporada' &&
    inicioRegular !== null &&
    ahora >= inicioRegular;

  const cambios: Record<string, any> = {};

  if (objetivo !== null && temporadaObjetivo !== objetivo) {
    cambios.temporada_objetivo = objetivo;
  }

  if (!entraEnRegular && nuevaFase !== faseCompeticion) {
    cambios.fase_competicion = nuevaFase;
  }

  if (entraEnRegular) {
    nuevaFase = 'regular';
    cambios.temporada = temporadaEntradaRegular;
    cambios.temporada_objetivo = null;
    cambios.fase_competicion = 'regular';
    cambios.jornada_actual = 1;
    cambios.semana_postemporada = null;
  }

  if (Object.keys(cambios).length > 0) {
    let update = supabase
      .from('app_config')
      .update(cambios)
      .eq('id', 1);

    // La activación de la nueva temporada es una transición protegida:
    // solo se realiza si la temporada competitiva sigue siendo la esperada.
    if (entraEnRegular) {
      update = update.eq('temporada', temporada);
    }

    const { error } = await update;

    if (error) {
      throw new Error(`Error actualizando ciclo anual: ${error.message}`);
    }

    if (entraEnRegular) {
      temporadaActiva = temporadaEntradaRegular;
      objetivo = null;

      const { data: jornada1, error: jornada1Error } = await supabase
        .from('jornadas_eventos')
        .select('estado, cierre_pronosticos')
        .eq('temporada', temporadaActiva)
        .eq('jornada', 1)
        .eq('fase_temporada', 'regular')
        .maybeSingle();

      if (jornada1Error) {
        throw new Error(
          `Error leyendo Jornada 1 para PUSH de inicio de temporada: ${jornada1Error.message}`,
        );
      }

      if (!jornada1) {
        throw new Error(
          `No existe Jornada 1 regular de ${temporadaActiva} para enviar el PUSH de inicio de temporada`,
        );
      }

      await pushInicioTemporadaSiProcede({
        temporada: temporadaActiva,
        jornada: 1,
        estado: jornada1.estado,
        cierrePronosticos: jornada1.cierre_pronosticos,
      });
    }
  }

  return {
    temporadaMostrada: temporadaActiva,
    temporadaObjetivo: objetivo,
    faseAnterior: faseCompeticion,
    faseActual: nuevaFase,
    cambios,
    debeBuscarCalendario:
      objetivo !== null &&
      ahora >= fechaUTC(objetivo, 5, 15) &&
      (nuevaFase === 'draft' || nuevaFase === 'pretemporada'),
    fechas: {
      inicioDraft: inicioDraft.toISOString(),
      inicioBusquedaCalendario:
        objetivo !== null
          ? fechaUTC(objetivo, 5, 15).toISOString()
          : inicioBusquedaSiguiente.toISOString(),
      inicioPretemporada: inicioPretemporada.toISOString(),
      inicioRegular: inicioRegular?.toISOString() ?? null,
    },
  };
}
