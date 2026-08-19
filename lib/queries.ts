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
  tipo_competicion?: 'regular' | 'pretemporada_test';
  semana_competicion?: number | null;
  info_local?: { nombre: string; logo_url: string };
  info_visitante?: { nombre: string; logo_url: string };
}

async function modoPretemporadaActivo(): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_config')
    .select('modo_pretemporada_test, modo_pretemporada_hasta')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data?.modo_pretemporada_test) return false;
  if (!data.modo_pretemporada_hasta) return true;

  return new Date(data.modo_pretemporada_hasta).getTime() > Date.now();
}

/**
 * Obtiene los partidos que debe mostrar la PWA.
 * Durante la prueba temporal devuelve la pretemporada real de ESPN.
 * Fuera de la prueba devuelve la jornada regular solicitada.
 */
export async function getPartidosPorJornada(jornada: number): Promise<PartidoTemporada[]> {
  try {
    const pretemporada = await modoPretemporadaActivo();

    let query = supabase
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
      .order('fecha_partido', { ascending: true });

    if (pretemporada) {
      query = query.eq('tipo_competicion', 'pretemporada_test');
    } else {
      query = query
        .eq('tipo_competicion', 'regular')
        .eq('jornada', jornada);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error al obtener los partidos de la jornada ${jornada}:`, error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Excepción en getPartidosPorJornada:', err);
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
