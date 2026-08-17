import { createClient } from '@supabase/supabase-js';

// Inicializa tu cliente de Supabase (ajusta con tus variables de entorno)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Servicio centralizado para obtener y sincronizar los partidos de una jornada
 * @param {number} jornadaNum - Número de jornada (1 a 18)
 */
export async function fetchAndSyncJornadaData(jornadaNum) {
  try {
    // 1. Lectura Base desde Supabase ordenados inicialmente por fecha
    const { data: partidosDB, error } = await supabase
      .from('partidos')
      .select('*')
      .eq('jornada', jornadaNum)
      .order('fecha_partido', { ascending: true });

    if (error) throw error;
    if (!partidosDB || partidosDB.length === 0) return [];

    // 2. Cotejo y Sincronización con la API de ESPN en paralelo
    const partidosSincronizados = await Promise.all(
      partidosDB.map(async (partido) => {
        if (!partido.espn_event_id) return partido;

        try {
          // Endpoint oficial de ESPN para el evento/partido
          const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${partido.espn_event_id}`);
          const espnData = await response.json();

          // Extraer fecha oficial actualizada por la NFL desde ESPN
          const espnFechaISO = espnData?.header?.competitions[0]?.date;
          const espnStatus = espnData?.header?.competitions[0]?.status?.type?.completed; // true/false si finalizó
          const competitors = espnData?.header?.competitions[0]?.competitors || [];

          let fechaActualizada = partido.fecha_partido;

          // Si la NFL cambió el horario (Flexible Scheduling)
          if (espnFechaISO && espnFechaISO !== partido.fecha_partido) {
            fechaActualizada = espnFechaISO;
            
            // Actualización silenciosa en Supabase
            await supabase
              .from('partidos')
              .update({ fecha_partido: fechaActualizada })
              .eq('id', partido.id);
          }

          // Extraer metadatos visuales de ESPN (logos, nombres cortos, marcadores si acabó)
          const localData = competitors.find(c => c.homeAway === 'home');
          const visitorData = competitors.find(c => c.homeAway === 'away');

          return {
            ...partido,
            fecha_partido: fechaActualizada,
            es_finalizado: espnStatus || false,
            // Metadatos enriquecidos de ESPN para la UI
            meta_local: {
              nombre: localData?.team?.displayName,
              logo: localData?.team?.logo,
              puntos: localData?.score
            },
            meta_visitante: {
              nombre: visitorData?.team?.displayName,
              logo: visitorData?.team?.logo,
              puntos: visitorData?.score
            }
          };

        } catch (espnError) {
          console.warn(`No se pudo sincronizar el evento ESPN ID: ${partido.espn_event_id}`, espnError);
          // Si falla ESPN, devolvemos el dato de la DB para no romper la app
          return partido;
        }
      })
    );

    // 3. Ordenación cronológica estricta (el primero de la jornada arriba, el último abajo)
    partidosSincronizados.sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido));

    return partidosSincronizados;

  } catch (err) {
    console.error("Error al cargar la jornada:", err);
    return [];
  }
}
