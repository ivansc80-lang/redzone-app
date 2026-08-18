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
  // Añadimos esto:
  info_local?: { nombre: string; logo_url: string };
  info_visitante?: { nombre: string; logo_url: string };
}

/**
 * Obtiene todos los partidos de una jornada específica.
 */
export async function getPartidosPorJornada(jornada: number): Promise<PartidoTemporada[]> {
  try {

    const { data, error } = await supabase
          .from('partidos')
          .select(`
            *,
            info_local:equipos!partidos_equipo_local_fkey (
              id,
              nombre,
              logo_url
            ),
            info_visitante:equipos!partidos_equipo_visitante_fkey (
              id,
              nombre,
              logo_url
            )
          `)
          .eq('jornada', jornada)
          .order('fecha_partido', { ascending: true });

    if (error) {
      console.error(`Error al obtener los partidos de la jornada ${jornada}:`, error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Excepción en getPartidosPorJornada:", err);
    return [];
  }
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
