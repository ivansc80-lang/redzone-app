import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { calcularRelojAdministrativo } from '@/lib/nflAdministrativeClock';

export type FaseAnualTest = 'finalizada' | 'draft' | 'pretemporada' | 'regular';

const HORAS_ANTES_INICIO_TR = 125;
const TOTAL_EQUIPOS_NFL = 32;
const MIN_PARTIDOS_POR_EQUIPO = 17;
const MIN_JORNADAS_REGULAR = 18;
const MAX_JORNADAS_EXPLORACION = 24;
const SEMANAS_VACIAS_PARA_CERRAR = 2;

function fechaUTC(anio: number, mes: number, dia: number) {
  return new Date(Date.UTC(anio, mes - 1, dia, 0, 0, 0, 0));
}

function fechaValida(valor: unknown) {
  return typeof valor === 'string' && valor.length > 0 && !Number.isNaN(new Date(valor).getTime());
}

type PartidoNuevoTest = {
  id: string;
  espn_event_id: string;
  temporada: number;
  jornada: number;
  semana_competicion: number;
  tipo_competicion: 'regular';
  equipo_local: string;
  equipo_visitante: string;
  fecha_partido: string;
  estado: string;
  puntos_local: number;
  puntos_visitante: number;
  periodo: number | null;
  reloj: string | null;
  resultado_oficial: null;
};

async function obtenerInicioJ1Test(temporada: number) {
  const { data, error } = await supabase
    .from('partidos_test')
    .select('fecha_partido')
    .eq('temporada', temporada)
    .eq('tipo_competicion', 'regular')
    .eq('jornada', 1)
    .order('fecha_partido', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`TEST: error obteniendo inicio de J1 ${temporada}: ${error.message}`);
  if (!data?.fecha_partido) return null;
  const fecha = new Date(data.fecha_partido);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

async function prepararNuevaTemporadaTest(temporadaObjetivo: number, faseActual: 'draft' | 'pretemporada') {
  const partidos: PartidoNuevoTest[] = [];
  const jornadas = new Map<number, PartidoNuevoTest[]>();
  const ids = new Set<string>();
  const partidosPorEquipo = new Map<string, number>();
  let semanasVaciasConsecutivas = 0;
  let ultimaJornadaConPartidos = 0;

  for (let jornada = 1; jornada <= MAX_JORNADAS_EXPLORACION; jornada++) {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporadaObjetivo}&seasontype=2&week=${jornada}`,
      { cache: 'no-store' },
    );

    if (!res.ok) return { validado:false, activado:false, motivo:`ESPN HTTP ${res.status} en week ${jornada}` };
    const data = await res.json();
    const eventos = Array.isArray(data?.events) ? data.events : [];

    if (eventos.length === 0) {
      semanasVaciasConsecutivas += 1;
      if (ultimaJornadaConPartidos >= MIN_JORNADAS_REGULAR && semanasVaciasConsecutivas >= SEMANAS_VACIAS_PARA_CERRAR) break;
      if (ultimaJornadaConPartidos < MIN_JORNADAS_REGULAR) {
        return { validado:false, activado:false, motivo:`ESPN todavía no devuelve calendario completo; week ${jornada} vacía` };
      }
      continue;
    }

    if (semanasVaciasConsecutivas > 0) {
      return { validado:false, activado:false, motivo:'Calendario ESPN discontinuo antes de cerrar la temporada regular' };
    }

    ultimaJornadaConPartidos = jornada;
    const lista: PartidoNuevoTest[] = [];

    for (const evento of eventos) {
      const comp = evento?.competitions?.[0];
      const local = comp?.competitors?.find((c:any) => c.homeAway === 'home');
      const visitante = comp?.competitors?.find((c:any) => c.homeAway === 'away');
      const espnId = String(evento?.id || '');
      const localAbrev = String(local?.team?.abbreviation || '');
      const visitanteAbrev = String(visitante?.team?.abbreviation || '');

      if (!espnId || !localAbrev || !visitanteAbrev || !fechaValida(evento?.date)) {
        return { validado:false, activado:false, motivo:`Week ${jornada} contiene partido incompleto` };
      }
      if (localAbrev === visitanteAbrev || ids.has(espnId)) {
        return { validado:false, activado:false, motivo:`Week ${jornada} contiene partido inválido o duplicado ${espnId}` };
      }

      ids.add(espnId);
      partidosPorEquipo.set(localAbrev, (partidosPorEquipo.get(localAbrev) || 0) + 1);
      partidosPorEquipo.set(visitanteAbrev, (partidosPorEquipo.get(visitanteAbrev) || 0) + 1);

      const partido: PartidoNuevoTest = {
        id: `tr-${temporadaObjetivo}-${espnId}`,
        espn_event_id: espnId,
        temporada: temporadaObjetivo,
        jornada,
        semana_competicion: jornada,
        tipo_competicion: 'regular',
        equipo_local: localAbrev,
        equipo_visitante: visitanteAbrev,
        fecha_partido: new Date(evento.date).toISOString(),
        estado: comp?.status?.type?.name || 'STATUS_SCHEDULED',
        puntos_local: 0,
        puntos_visitante: 0,
        periodo: null,
        reloj: null,
        resultado_oficial: null,
      };
      partidos.push(partido);
      lista.push(partido);
    }
    jornadas.set(jornada, lista);
  }

  if (jornadas.size < MIN_JORNADAS_REGULAR) return { validado:false, activado:false, motivo:`Calendario incompleto: ${jornadas.size} jornadas` };
  if (partidosPorEquipo.size !== TOTAL_EQUIPOS_NFL) return { validado:false, activado:false, motivo:`Equipos ESPN=${partidosPorEquipo.size}, esperado=${TOTAL_EQUIPOS_NFL}` };

  const cantidades = [...partidosPorEquipo.values()];
  const partidosPorEquipoEsperados = cantidades[0] || 0;
  if (partidosPorEquipoEsperados < MIN_PARTIDOS_POR_EQUIPO || cantidades.some(total => total !== partidosPorEquipoEsperados)) {
    return { validado:false, activado:false, motivo:'Los 32 equipos no tienen un calendario regular completo y homogéneo' };
  }

  const totalPartidosEsperados = (TOTAL_EQUIPOS_NFL * partidosPorEquipoEsperados) / 2;
  if (!Number.isInteger(totalPartidosEsperados) || partidos.length !== totalPartidosEsperados) {
    return { validado:false, activado:false, motivo:`Número total de partidos incoherente: ${partidos.length}/${totalPartidosEsperados}` };
  }

  const jornadasEventos = [...jornadas.entries()].map(([jornada, lista]) => ({
    temporada: temporadaObjetivo,
    jornada_test: jornada,
    semana_espn: jornada,
    fase_temporada: 'regular',
    ...calcularRelojAdministrativo(lista),
    estado: 'pendiente',
  }));

  const { error: partidosError } = await supabase.from('partidos_test').upsert(partidos, { onConflict:'espn_event_id' });
  if (partidosError) throw new Error(`TEST: error guardando calendario ${temporadaObjetivo}: ${partidosError.message}`);

  const { error: jornadasError } = await supabase.from('jornadas_eventos_test').upsert(jornadasEventos, { onConflict:'temporada,jornada_test' });
  if (jornadasError) throw new Error(`TEST: error guardando jornadas ${temporadaObjetivo}: ${jornadasError.message}`);

  const { data: verificarPartidos, error: vpError } = await supabase.from('partidos_test').select('espn_event_id').eq('temporada',temporadaObjetivo).eq('tipo_competicion','regular');
  if (vpError) throw new Error(`TEST: error verificando partidos ${temporadaObjetivo}: ${vpError.message}`);
  const { data: verificarJornadas, error: vjError } = await supabase.from('jornadas_eventos_test').select('jornada_test').eq('temporada',temporadaObjetivo).eq('fase_temporada','regular');
  if (vjError) throw new Error(`TEST: error verificando jornadas ${temporadaObjetivo}: ${vjError.message}`);

  if ((verificarPartidos||[]).length !== totalPartidosEsperados || (verificarJornadas||[]).length !== jornadas.size) {
    return { validado:false, activado:false, motivo:`Escritura TEST incompleta: partidos=${verificarPartidos?.length||0}/${totalPartidosEsperados}, jornadas=${verificarJornadas?.length||0}/${jornadas.size}` };
  }

  const { error: activarError } = await supabase.from('app_config_test').update({
    temporada: temporadaObjetivo,
    temporada_objetivo: null,
    jornada_actual: 1,
    jornada_test_actual: 1,
    semana_postemporada: null,
    fase_competicion: faseActual,
  }).eq('id',1);
  if (activarError) throw new Error(`TEST: calendario ${temporadaObjetivo} validado pero no pudo activarse: ${activarError.message}`);

  return { validado:true, activado:true, temporadaObjetivo, jornadas:jornadas.size, partidos:totalPartidosEsperados };
}

export async function gestionarCicloAnualTest(params:{
  temporada:number;
  temporadaObjetivo:number|null;
  faseCompeticion:'finalizada'|'draft'|'pretemporada';
  ahora?:Date;
}) {
  const { temporada, faseCompeticion, ahora = new Date() } = params;
  let objetivo = Number.isInteger(params.temporadaObjetivo) && Number(params.temporadaObjetivo) >= 2000 ? Number(params.temporadaObjetivo) : null;

  const siguienteTemporada = temporada + 1;
  const inicioBusqueda = fechaUTC(siguienteTemporada,5,15);
  if (objetivo === null && ahora >= inicioBusqueda) objetivo = siguienteTemporada;

  const anioCiclo = ahora.getUTCFullYear() > temporada ? temporada + 1 : temporada;
  const inicioDraft = fechaUTC(anioCiclo,3,1);
  const inicioPretemporada = fechaUTC(anioCiclo,7,16);
  let nuevaFase:FaseAnualTest = ahora >= inicioPretemporada ? 'pretemporada' : ahora >= inicioDraft ? 'draft' : 'finalizada';

  const cambios:Record<string,any> = {};
  if (objetivo !== null && params.temporadaObjetivo !== objetivo) cambios.temporada_objetivo = objetivo;
  if (nuevaFase !== faseCompeticion) cambios.fase_competicion = nuevaFase;
  if (Object.keys(cambios).length) {
    const { error } = await supabase.from('app_config_test').update(cambios).eq('id',1);
    if (error) throw new Error(`TEST: error avanzando ciclo anual: ${error.message}`);
  }

  let calendario:any = null;
  if (objetivo !== null && ahora >= fechaUTC(objetivo,5,15) && (nuevaFase === 'draft' || nuevaFase === 'pretemporada')) {
    calendario = await prepararNuevaTemporadaTest(objetivo, nuevaFase);
    if (calendario.activado) {
      objetivo = null;
      // prepararNuevaTemporadaTest ya ha movido app_config_test a la nueva temporada.
    }
  }

  const temporadaActiva = calendario?.activado ? siguienteTemporada : temporada;
  if (calendario?.activado) nuevaFase = nuevaFase === 'draft' ? 'draft' : 'pretemporada';

  let inicioRegular:Date|null = null;
  if (nuevaFase === 'pretemporada' && objetivo === null) {
    const inicioJ1 = await obtenerInicioJ1Test(temporadaActiva);
    if (inicioJ1) {
      inicioRegular = new Date(inicioJ1.getTime() - HORAS_ANTES_INICIO_TR*60*60*1000);
      if (ahora >= inicioRegular) {
        nuevaFase = 'regular';
        const { error } = await supabase.from('app_config_test').update({
          fase_competicion:'regular', jornada_actual:1, jornada_test_actual:1, semana_postemporada:null,
        }).eq('id',1).eq('temporada',temporadaActiva);
        if (error) throw new Error(`TEST: error entrando en TR${String(temporadaActiva).slice(-2)}: ${error.message}`);
      }
    }
  }

  return {
    mode:'tr25_test',
    temporada:temporadaActiva,
    fase:'ciclo_anual',
    faseAnterior:faseCompeticion,
    faseActual:nuevaFase,
    temporadaObjetivo:objetivo,
    calendario,
    fechas:{
      inicioDraft:inicioDraft.toISOString(),
      inicioBusquedaCalendario:(objetivo!==null?fechaUTC(objetivo,5,15):inicioBusqueda).toISOString(),
      inicioPretemporada:inicioPretemporada.toISOString(),
      inicioRegular:inicioRegular?.toISOString()??null,
    },
  };
}
