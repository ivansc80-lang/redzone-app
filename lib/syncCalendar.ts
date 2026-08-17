import { supabase } from '@/lib/supabaseClient';

// Helper para calcular las fechas límite (martes 08:00 y jueves 23:59 ES)
function calcularFechasLimite(jornada: number, primerPartidoFecha: Date) {
  const inicioPorra = new Date(primerPartidoFecha);
  const inicioJornada = new Date(primerPartidoFecha);

  if (jornada === 1) {
    // JORNADA 1: Adelantada 1 día por partido inaugural
    inicioPorra.setDate(inicioPorra.getDate() - 3);
    inicioPorra.setHours(8, 0, 0, 0);

    inicioJornada.setDate(inicioJornada.getDate() - 1);
    inicioJornada.setHours(23, 59, 0, 0);
  } else {
    // JORNADAS 2-18: Estándar (Martes 08:00 ES y Jueves 23:59 ES)
    const dayOfWeek = primerPartidoFecha.getDay();
    const diffMartes = (dayOfWeek + 7 - 2) % 7;
    
    inicioPorra.setDate(primerPartidoFecha.getDate() - diffMartes);
    inicioPorra.setHours(8, 0, 0, 0);

    const diffJueves = (dayOfWeek + 7 - 4) % 7;
    inicioJornada.setDate(primerPartidoFecha.getDate() - diffJueves);
    inicioJornada.setHours(23, 59, 0, 0);
  }

  return {
    inicio_porra: inicioPorra.toISOString(),
    inicio_jornada: inicioJornada.toISOString(),
  };
}

export async function sincronizarTemporadaCompleta(temporada = 2026) {
  console.log(`Iniciando sincronización de las 18 jornadas para la temporada ${temporada}...`);

  for (let semana = 1; semana <= 18; semana++) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporada}&week=${semana}`
      );
      const data = await res.json();
      const eventos = data.events || [];

      if (eventos.length === 0) continue;

      // Ordenar por fecha para identificar el primer partido
      eventos.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const primerPartidoFecha = new Date(eventos[0].date);

      const { inicio_porra, inicio_jornada } = calcularFechasLimite(semana, primerPartidoFecha);

      for (const evento of eventos) {
        const comp = evento.competitions[0];
        const local = comp.competitors.find((c: any) => c.homeAway === 'home');
        const visitante = comp.competitors.find((c: any) => c.homeAway === 'away');

        const localAbrev = local?.team?.abbreviation || '';
        const visitAbrev = visitante?.team?.abbreviation || '';
        const fechaPartido = new Date(evento.date).toISOString();

        let resultadoOficial = null;
        let puntosLocal = null;
        let puntosVisitante = null;

        if (comp.status?.type?.completed) {
          puntosLocal = parseInt(local?.score || '0');
          puntosVisitante = parseInt(visitante?.score || '0');
          resultadoOficial = puntosLocal > puntosVisitante ? '1' : puntosLocal < puntosVisitante ? '2' : 'X';
        }

        // Inserta o actualiza automáticamente según espn_event_id
        await supabase.from('partidos').upsert(
          {
            espn_event_id: evento.id,
            jornada: semana,
            equipo_local: localAbrev,
            equipo_visitante: visitAbrev,
            fecha_partido: fechaPartido,
            inicio_porra,
            inicio_jornada,
            puntos_local: puntosLocal,
            puntos_visitante: puntosVisitante,
            resultado_oficial: resultadoOficial,
          },
          { onConflict: 'espn_event_id' }
        );
      }
      console.log(`Jornada ${semana} sincronizada correctamente.`);
    } catch (error) {
      console.error(`Error al sincronizar jornada ${semana}:`, error);
    }
  }
}