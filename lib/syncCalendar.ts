import { supabaseServer as supabase } from '@/lib/supabaseServer';

export async function sincronizarTemporadaCompleta(
  temporada = 2026,
  semanaInicio = 1,
  semanaFin = 18
) {
  console.log(
    `Iniciando sincronización de las 18 jornadas para la temporada ${temporada}...`
  );

  for (let semana = semanaInicio; semana <= semanaFin; semana++) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporada}&week=${semana}`
      );

      const data = await res.json();
      const eventos = data.events || [];

      if (eventos.length === 0) continue;

      // Ordenar por fecha para identificar el primer partido
      eventos.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const primerPartidoFecha = new Date(eventos[0].date);

      const inicioJornadaReal = primerPartidoFecha.toISOString();

      const cierrePronosticos = new Date(
        primerPartidoFecha.getTime() - 5 * 60 * 1000
      ).toISOString();

      // Comprobar el estado actual de la jornada
      const {
        data: jornadaEvento,
        error: jornadaEventoError,
      } = await supabase
        .from('jornadas_eventos')
        .select('jornada, estado, cierre_pronosticos')
        .eq('jornada', semana)
        .maybeSingle();

      if (jornadaEventoError) {
        throw new Error(
          `Error al consultar jornadas_eventos para la jornada ${semana}: ${jornadaEventoError.message}`
        );
      }

      console.log(`🔎 JORNADA ${semana}`, {
        estado: jornadaEvento?.estado,
        cierreGuardado: jornadaEvento?.cierre_pronosticos,
        ahora: new Date().toISOString(),
        cierreVencido: jornadaEvento?.cierre_pronosticos
          ? new Date() >= new Date(jornadaEvento.cierre_pronosticos)
          : false,
      });

      // Si el cierre guardado en Supabase ya ha vencido,
      // cerramos la porra antes de permitir cualquier cambio de horario.
      if (
        jornadaEvento &&
        jornadaEvento.estado === 'pendiente' &&
        jornadaEvento.cierre_pronosticos &&
        new Date() >= new Date(jornadaEvento.cierre_pronosticos)
      ) {
        const { error: cerrarPorraError } = await supabase
          .from('jornadas_eventos')
          .update({
            estado: 'cerrada',
          })
          .eq('jornada', semana)
          .eq('estado', 'pendiente');

        if (cerrarPorraError) {
          throw new Error(
            `Error al cerrar la porra de la jornada ${semana}: ${cerrarPorraError.message}`
          );
        }
      } else if (
        jornadaEvento &&
        jornadaEvento.estado === 'pendiente'
      ) {
        // Mientras la jornada siga pendiente y no haya llegado el cierre,
        // permitimos actualizar los horarios desde ESPN.
        const { error: actualizarJornadaError } = await supabase
          .from('jornadas_eventos')
          .update({
            inicio_jornada: inicioJornadaReal,
            cierre_pronosticos: cierrePronosticos,
          })
          .eq('jornada', semana)
          .eq('estado', 'pendiente');

        if (actualizarJornadaError) {
          throw new Error(
            `Error al actualizar jornadas_eventos para la jornada ${semana}: ${actualizarJornadaError.message}`
          );
        }
      }

      // Sincronizar cada partido de la jornada
      for (const evento of eventos) {
        const comp = evento.competitions[0];

        const local = comp.competitors.find(
          (c: any) => c.homeAway === 'home'
        );

        const visitante = comp.competitors.find(
          (c: any) => c.homeAway === 'away'
        );

        const localAbrev = local?.team?.abbreviation || '';
        const visitAbrev = visitante?.team?.abbreviation || '';

        const fechaPartido = new Date(evento.date).toISOString();

        const estado =
          comp.status?.type?.name || 'STATUS_SCHEDULED';

        // Guardamos siempre el marcador que devuelve ESPN.
        // Esto permitirá mostrarlo también mientras el partido está en directo.
        const puntosLocal = parseInt(local?.score || '0');
        const puntosVisitante = parseInt(visitante?.score || '0');

        let resultadoOficial = null;

        // El resultado 1 / X / 2 solo se considera oficial
        // cuando ESPN confirma que el partido ha terminado.
        if (comp.status?.type?.completed) {
          resultadoOficial =
            puntosLocal > puntosVisitante
              ? '1'
              : puntosLocal < puntosVisitante
                ? '2'
                : 'X';
        }

        // Inserta o actualiza automáticamente según espn_event_id
        const { error: upsertError } = await supabase
          .from('partidos')
          .upsert(
            {
              espn_event_id: evento.id,
              jornada: semana,
              equipo_local: localAbrev,
              equipo_visitante: visitAbrev,
              fecha_partido: fechaPartido,
              estado,
              puntos_local: puntosLocal,
              puntos_visitante: puntosVisitante,
              resultado_oficial: resultadoOficial,
            },
            {
              onConflict: 'espn_event_id',
            }
          );

        if (upsertError) {
          throw new Error(
            `Error al guardar partido ESPN ${evento.id} de la jornada ${semana}: ${upsertError.message}`
          );
        }
      }

      // Comprobar si TODOS los partidos de la jornada han finalizado
      const {
        data: partidosJornada,
        error: partidosJornadaError,
      } = await supabase
        .from('partidos')
        .select('estado')
        .eq('jornada', semana);

      if (partidosJornadaError) {
        throw new Error(
          `Error al comprobar el estado de la jornada ${semana}: ${partidosJornadaError.message}`
        );
      }

      const todosFinalizados =
        partidosJornada &&
        partidosJornada.length > 0 &&
        partidosJornada.every(
          (p: any) => p.estado === 'FINAL'
        );

      // Si todos están FINAL, la jornada pasa a finalizada.
      if (todosFinalizados) {
        const { error: cerrarJornadaError } = await supabase
          .from('jornadas_eventos')
          .update({
            estado: 'finalizada',
            fin_jornada: new Date().toISOString(),
          })
          .eq('jornada', semana);

        if (cerrarJornadaError) {
          throw new Error(
            `Error al finalizar la jornada ${semana}: ${cerrarJornadaError.message}`
          );
        }
      }

      console.log(
        `Jornada ${semana} sincronizada correctamente.`
      );
    } catch (error) {
      console.error(
        `Error al sincronizar jornada ${semana}:`,
        error
      );
    }
  }
}