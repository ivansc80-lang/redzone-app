import { supabase } from './supabaseClient';

export interface PartidoTemporada {
  id: string;
  jornada: number;
  equipo_local: string;
  equipo_visitante: string;
  fecha_partido: string;
  inicio_porra: string;
  inicio_jornada: string;
  puntos_local: number | null;
  puntos_visitante: number | null;
  resultado_oficial: string | null;
  espn_event_id: string;
}

/**
 * Obtiene todos los partidos de una jornada específica.
 */
export async function getPartidosPorJornada(jornada: number): Promise<PartidoTemporada[]> {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .eq('jornada', jornada)
    .order('fecha_partido', { ascending: true });

  if (error) {
    console.error(`Error al obtener los partidos de la jornada ${jornada}:`, error.message);
    return [];
  }

  return data || [];
}

/**
 * Obtiene la información general de la temporada completa o resumen por jornadas.
 */
export async function getResumenTemporada() {
  const { data, error } = await supabase
    .from('temporada_regular')
    .select('jornada, fecha_partido, inicio_porra, inicio_jornada')
    .order('jornada', { ascending: true });

  if (error) {
    console.error('Error al obtener el resumen de la temporada:', error.message);
    return [];
  }

  return data || [];
}
