import { supabaseServer as supabase } from '@/lib/supabaseServer';

export type FaseAnual = 'finalizada' | 'draft' | 'pretemporada';

interface GestionarCicloAnualParams {
  temporada: number;
  temporadaObjetivo: number | null;
  faseCompeticion: FaseAnual;
  ahora?: Date;
}

function fechaUTC(anio: number, mes: number, dia: number) {
  return new Date(Date.UTC(anio, mes - 1, dia, 0, 0, 0, 0));
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

  const objetivo =
    Number.isInteger(temporadaObjetivo) && Number(temporadaObjetivo) >= 2000
      ? Number(temporadaObjetivo)
      : temporada + 1;

  const inicioDraft = fechaUTC(objetivo, 3, 1);
  const inicioBusquedaCalendario = fechaUTC(objetivo, 5, 15);
  const inicioPretemporada = fechaUTC(objetivo, 7, 16);

  let nuevaFase: FaseAnual = faseCompeticion;

  if (ahora >= inicioPretemporada) {
    nuevaFase = 'pretemporada';
  } else if (ahora >= inicioDraft) {
    nuevaFase = 'draft';
  } else {
    nuevaFase = 'finalizada';
  }

  const cambios: Record<string, any> = {};

  if (temporadaObjetivo !== objetivo) {
    cambios.temporada_objetivo = objetivo;
  }

  if (nuevaFase !== faseCompeticion) {
    cambios.fase_competicion = nuevaFase;
  }

  if (Object.keys(cambios).length > 0) {
    const { error } = await supabase
      .from('app_config')
      .update(cambios)
      .eq('id', 1);

    if (error) {
      throw new Error(`Error actualizando ciclo anual: ${error.message}`);
    }
  }

  return {
    temporadaMostrada: temporada,
    temporadaObjetivo: objetivo,
    faseAnterior: faseCompeticion,
    faseActual: nuevaFase,
    cambios,
    debeBuscarCalendario:
      ahora >= inicioBusquedaCalendario &&
      (nuevaFase === 'draft' || nuevaFase === 'pretemporada'),
    fechas: {
      inicioDraft: inicioDraft.toISOString(),
      inicioBusquedaCalendario: inicioBusquedaCalendario.toISOString(),
      inicioPretemporada: inicioPretemporada.toISOString(),
    },
  };
}
