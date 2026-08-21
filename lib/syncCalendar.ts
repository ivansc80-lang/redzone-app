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

      eventos.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const primerPartidoFecha = new Date(eventos[0].date);
      const inicioJornadaReal = primerPartidoFecha.toISOString();
      const cierrePronosticos = new Date(
        primerPartidoFecha.getTime() - 30 * 60 * 1000
      ).toISOString();

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

      if (
        jornadaEvento &&
        jornadaEvento.estado === 'pendiente' &&
        jornadaEvento.cierre_pronosticos &&
        new Date() >= new Date(jornadaEvento.cierre_pronosticos)
      ) {
        const { error: cerrarPorraError } = await supabase
          .from('jornadas_eventos')
          .update({ estado: 'cerrada' })
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
        const estado = comp.status?.type?.name || 'STATUS_SCHEDULED';
        const puntosLocal = parseInt(local?.score || '0');
        const puntosVisitante = parseInt(visitante?.score || '0');

        const periodo = Number(comp.status?.period || 0) || null;
        const reloj =
          comp.status?.displayClock ||
          comp.status?.type?.shortDetail ||
          null;

        let resultadoOficial: '1' | 'X' | '2' | null = null;

        if (comp.status?.type?.completed) {
          resultadoOficial =
            puntosLocal > puntosVisitante
              ? '1'
              : puntosLocal < puntosVisitante
                ? '2'
                : 'X';
        }

        const {
          data: partidoActualizado,
          error: upsertError,
        } = await supabase
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
              periodo,
              reloj,
              resultado_oficial: resultadoOficial,
            },
            { onConflict: 'espn_event_id' }
          )
          .select(
            'id, espn_event_id, estado, puntos_local, puntos_visitante, resultado_oficial'
          )
          .single();

        if (upsertError) {
          throw new Error(
            `Error al guardar partido ESPN ${evento.id} de la jornada ${semana}: ${upsertError.message}`
          );
        }

        const partidoGuardado = partidoActualizado;

        if (!partidoGuardado) {
          throw new Error(
            `No se pudo obtener el id interno del partido ESPN ${evento.id}`
          );
        }

        if (estado === 'STATUS_FINAL' && resultadoOficial) {
          const { error: validarPronosticosError } = await supabase
            .from('pronosticos')
            .update({ acierto: true })
            .eq('partido_id', partidoGuardado.id)
            .eq('eleccion', resultadoOficial);

          if (validarPronosticosError) {
            throw new Error(
              `Error al validar aciertos del partido ESPN ${evento.id}: ${validarPronosticosError.message}`
            );
          }

          const { error: marcarFallosError } = await supabase
            .from('pronosticos')
            .update({ acierto: false })
            .eq('partido_id', partidoGuardado.id)
            .neq('eleccion', resultadoOficial);

          if (marcarFallosError) {
            throw new Error(
              `Error al validar fallos del partido ESPN ${evento.id}: ${marcarFallosError.message}`
            );
          }

          console.log(
            `✅ Pronósticos validados para ${localAbrev} - ${visitAbrev}. Resultado: ${resultadoOficial}`
          );
        } else {
          // Mientras ESPN no considere FINAL el partido,
          // los pronósticos deben permanecer sin validar.
          const { error: limpiarAciertosError } = await supabase
            .from('pronosticos')
            .update({ acierto: null })
            .eq('partido_id', partidoGuardado.id);

          if (limpiarAciertosError) {
            throw new Error(
              `Error al limpiar aciertos pendientes del partido ESPN ${evento.id}: ${limpiarAciertosError.message}`
            );
          }
        }
      }

      const {
        data: partidosJornada,
        error: partidosJornadaError,
      } = await supabase
        .from('partidos')
        .select('estado')
        .eq('jornada', semana)
        .eq('tipo_competicion', 'regular');

      if (partidosJornadaError) {
        throw new Error(
          `Error al comprobar el estado de la jornada ${semana}: ${partidosJornadaError.message}`
        );
      }

      const todosFinalizados =
        partidosJornada &&
        partidosJornada.length > 0 &&
        partidosJornada.every(
          (p: any) => p.estado === 'STATUS_FINAL'
        );

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

      console.log(`Jornada ${semana} sincronizada correctamente.`);
    } catch (error) {
      console.error(`Error al sincronizar jornada ${semana}:`, error);
    }
  }
}
