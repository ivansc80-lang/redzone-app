import { supabaseServer as supabase } from '@/lib/supabaseServer';
import {
  pushCierrePorraSiProcede,
  pushResultadosAperturaSiProcede,
  pushOnFireSiProcede,
  pushMadreMiaSiProcede,
  pushPlenoRedzoneSiProcede,
  pushMenudoBanoSiProcede,
  pushSeEscapaSiProcede,
  pushPlenoMagicoSiProcede,
  pushNoTeComesElTurronSiProcede,
  pushLiderSolidoSiProcede,
  pushRecordatorioPronosticosSiProcede,
} from '@/lib/pushAutomatic';

async function prepararSiguienteJornadaRegular(
  temporada: number,
  jornada: number,
) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporada}&week=${jornada}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    throw new Error(
      `ESPN respondió HTTP ${res.status} preparando Jornada ${jornada}`,
    );
  }

  const data = await res.json();

  const eventos = (data.events || []).sort(
    (a: any, b: any) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime(),
  );

  if (eventos.length === 0) {
    throw new Error(
      `ESPN no devolvió partidos para preparar Jornada ${jornada}`,
    );
  }

  const { data: jornadaEvento, error: jornadaEventoError } =
    await supabase
      .from("jornadas_eventos")
      .select("jornada, estado")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .maybeSingle();

  if (jornadaEventoError) {
    throw new Error(
      `Error consultando Jornada ${jornada}: ${jornadaEventoError.message}`,
    );
  }

  if (!jornadaEvento) {
    throw new Error(
      `No existe jornadas_eventos para Jornada ${jornada}`,
    );
  }

  if (jornadaEvento.estado !== "pendiente") {
    throw new Error(
      `La Jornada ${jornada} no está pendiente (${jornadaEvento.estado})`,
    );
  }

  const primerPartido = new Date(eventos[0].date);

  const cierrePronosticos = new Date(
    primerPartido.getTime() - 30 * 60 * 1000,
  );

  const partidosPreparados = eventos.map((evento: any) => {
    const comp = evento.competitions?.[0];

    if (!comp) {
      throw new Error(
        `ESPN ${evento.id} no contiene competition válida`,
      );
    }

    const local = comp.competitors?.find(
      (c: any) => c.homeAway === "home",
    );

    const visitante = comp.competitors?.find(
      (c: any) => c.homeAway === "away",
    );

    const localAbrev = local?.team?.abbreviation || "";
    const visitanteAbrev =
      visitante?.team?.abbreviation || "";

    if (!localAbrev || !visitanteAbrev) {
      throw new Error(
        `ESPN ${evento.id} no contiene equipos válidos`,
      );
    }

    const estado =
      comp.status?.type?.name || "STATUS_SCHEDULED";

    const puntosLocal =
      parseInt(local?.score || "0", 10);

    const puntosVisitante =
      parseInt(visitante?.score || "0", 10);

    const periodo =
      Number(comp.status?.period || 0) || null;

    const reloj =
      comp.status?.displayClock ||
      comp.status?.type?.shortDetail ||
      null;

    let resultadoOficial:
      | "1"
      | "X"
      | "2"
      | null = null;

    if (comp.status?.type?.completed) {
      resultadoOficial =
        puntosLocal > puntosVisitante
          ? "1"
          : puntosLocal < puntosVisitante
            ? "2"
            : "X";
    }

    return {
      espn_event_id: evento.id,
      temporada,
      jornada,
      semana_competicion: jornada,
      tipo_competicion: "regular",
      equipo_local: localAbrev,
      equipo_visitante: visitanteAbrev,
      fecha_partido: new Date(evento.date).toISOString(),
      estado,
      puntos_local: puntosLocal,
      puntos_visitante: puntosVisitante,
      periodo,
      reloj,
      resultado_oficial: resultadoOficial,
    };
  });

  const { error: partidosError } = await supabase
    .from("partidos")
    .upsert(partidosPreparados, {
      onConflict: "espn_event_id",
    });

  if (partidosError) {
    throw new Error(
      `Error preparando partidos de Jornada ${jornada}: ${partidosError.message}`,
    );
  }

  const { error: jornadaUpdateError } = await supabase
    .from("jornadas_eventos")
    .update({
      inicio_jornada: primerPartido.toISOString(),
      cierre_pronosticos:
        cierrePronosticos.toISOString(),
    })
    .eq("temporada", temporada)
    .eq("jornada", jornada)
    .eq("estado", "pendiente");

  if (jornadaUpdateError) {
    throw new Error(
      `Error preparando calendario de Jornada ${jornada}: ${jornadaUpdateError.message}`,
    );
  }

  const { data: partidosVerificados, error: verificarError } =
    await supabase
      .from("partidos")
      .select("id")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular");

  if (verificarError) {
    throw new Error(
      `Error verificando Jornada ${jornada}: ${verificarError.message}`,
    );
  }

  if (
    !partidosVerificados ||
    partidosVerificados.length !==
      partidosPreparados.length
  ) {
    throw new Error(
      `Jornada ${jornada} incompleta: ESPN=${partidosPreparados.length}, BBDD=${partidosVerificados?.length || 0}`,
    );
  }

  return {
    jornada,
    partidos: partidosPreparados.length,
    inicioJornada: primerPartido.toISOString(),
    cierrePronosticos:
      cierrePronosticos.toISOString(),
  };
}


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

        // ======================================================
        // PUSH 2 - CIERRE DE PORRA
        // ======================================================
        // Se ejecuta EXACTAMENTE después de que REDZONE cambia
        // la jornada de pendiente -> cerrada.
        //
        // push_eventos_enviados impide cualquier duplicado en
        // siguientes pasadas del cron.
        //
        const pushCierrePorra =
          await pushCierrePorraSiProcede({
            temporada,
            jornada: semana,
            estado: 'cerrada',
          });

        console.log(
          `🔔 PUSH cierre Jornada ${semana}:`,
          pushCierrePorra
        );
      } else if (
        jornadaEvento &&
        jornadaEvento.estado === 'pendiente'
      ) {
        // ======================================================
        // PUSH 12 - ⏰ RECORDATORIO DE PRONÓSTICOS
        // ======================================================
        //
        // Usa el cierre REAL almacenado en jornadas_eventos.
        // El motor calcula automáticamente cierre - 6 horas.
        //
        // Cada participante se comprueba por separado:
        // solo recibe PUSH quien tenga pronósticos incompletos.
        //
        if (jornadaEvento.cierre_pronosticos) {
          const pushRecordatorioPronosticos =
            await pushRecordatorioPronosticosSiProcede({
              temporada,
              jornada: semana,
              cierrePronosticos:
                jornadaEvento.cierre_pronosticos,
            });

          if (
            pushRecordatorioPronosticos.resultados?.some(
              (r: any) => r.enviado
            )
          ) {
            console.log(
              `⏰ RECORDATORIO PRONÓSTICOS Jornada ${semana}:`,
              pushRecordatorioPronosticos
            );
          }
        }

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

          // ====================================================
          // PUSH 4 - 🔥 ON FIRE
          // ====================================================
          //
          // Evaluamos después de guardar el resultado y validar
          // todos los pronósticos de este partido.
          //
          // La propia función controla:
          // - ventana dominical REDZONE;
          // - 4/4 o 5/5;
          // - una sola vez por usuario y jornada.
          //
          const pushOnFire =
            await pushOnFireSiProcede({
              temporada,
              jornada: semana,
            });

          if (
            pushOnFire.resultados?.some(
              (r: any) => r.enviado
            )
          ) {
            console.log(
              `🔥 ON FIRE Jornada ${semana}:`,
              pushOnFire
            );
          }

          // ====================================================
          // PUSH 5 - 😱 MADRE MÍA CÓMO ESTAMOS
          // ====================================================
          const pushMadreMia =
            await pushMadreMiaSiProcede({
              temporada,
              jornada: semana,
            });

          if (
            pushMadreMia.resultados?.some(
              (r: any) => r.enviado
            )
          ) {
            console.log(
              `😱 MADRE MÍA Jornada ${semana}:`,
              pushMadreMia
            );
          }

          // ====================================================
          // PUSH 6 - 🏆 PLENO REDZONE
          // ====================================================
          //
          // Solo hará algo cuando TODOS los partidos del bloque
          // dominical REDZONE hayan terminado.
          //
          const pushPlenoRedzone =
            await pushPlenoRedzoneSiProcede({
              temporada,
              jornada: semana,
            });

          if (
            pushPlenoRedzone.resultados?.some(
              (r: any) => r.enviado
            )
          ) {
            console.log(
              `🏆 PLENO REDZONE Jornada ${semana}:`,
              pushPlenoRedzone
            );
          }

          // ====================================================
          // PUSH 7 - 🚿 MENUDO BAÑO
          // ====================================================
          const pushMenudoBano =
            await pushMenudoBanoSiProcede({
              temporada,
              jornada: semana,
            });

          if (
            "enviado" in pushMenudoBano &&
            pushMenudoBano.enviado
          ) {
            console.log(
              `🚿 MENUDO BAÑO Jornada ${semana}:`,
              pushMenudoBano
            );
          }

          // ====================================================
          // PUSH 8 - 🏃 VAMOS, QUE SE ESCAPA
          // ====================================================
          const pushSeEscapa =
            await pushSeEscapaSiProcede({
              temporada,
              jornada: semana,
            });

          if (
            "enviado" in pushSeEscapa &&
            pushSeEscapa.enviado
          ) {
            console.log(
              `🏃 VAMOS, QUE SE ESCAPA Jornada ${semana}:`,
              pushSeEscapa
            );
          }
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
        // ======================================================
        // PUSH 9 - ✨ PLENO MÁGICO
        // ======================================================
        //
        // Aquí TODA la jornada ya está finalizada.
        // Se ejecuta antes de la transición Jn -> Jn+1 y también
        // funciona en Jornada 18.
        //
        const pushPlenoMagico =
          await pushPlenoMagicoSiProcede({
            temporada,
            jornada: semana,
          });

        if (
          pushPlenoMagico.resultados?.some(
            (r: any) => r.enviado
          )
        ) {
          console.log(
            `✨ PLENO MÁGICO Jornada ${semana}:`,
            pushPlenoMagico
          );
        }

        // ======================================================
        // PUSH 10 - 🎄 NO TE COMES EL TURRÓN
        // ======================================================
        const pushNoTeComesElTurron =
          await pushNoTeComesElTurronSiProcede({
            temporada,
            jornada: semana,
          });

        if (
          pushNoTeComesElTurron.resultados?.some(
            (r: any) => r.enviado
          )
        ) {
          console.log(
            `🎄 NO TE COMES EL TURRÓN Jornada ${semana}:`,
            pushNoTeComesElTurron
          );
        }

        // ======================================================
        // PUSH 11 - 👑 LÍDER SÓLIDO
        // ======================================================
        //
        // Toda la jornada ya está finalizada y todos sus
        // pronósticos han sido validados.
        //
        const pushLiderSolido =
          await pushLiderSolidoSiProcede({
            temporada,
            jornada: semana,
          });

        if (
          "enviado" in pushLiderSolido &&
          pushLiderSolido.enviado
        ) {
          console.log(
            `👑 LÍDER SÓLIDO Jornada ${semana}:`,
            pushLiderSolido
          );
        }

        // ======================================================
        // TRANSICIÓN SEGURA Jn -> Jn+1
        // ======================================================
        //
        // Orden:
        // 1. preparar y verificar Jn+1;
        // 2. finalizar Jn;
        // 3. cambiar app_config.jornada_actual;
        // 4. enviar PUSH 3.
        //
        // Si falla la preparación de Jn+1, Jn permanece activa.
        //
        if (semana < 18) {
          const siguienteJornada = semana + 1;

          const preparacion =
            await prepararSiguienteJornadaRegular(
              temporada,
              siguienteJornada,
            );

          const ahora = new Date().toISOString();

          const { error: cerrarJornadaError } =
            await supabase
              .from('jornadas_eventos')
              .update({
                estado: 'finalizada',
                fin_jornada: ahora,
              })
              .eq('temporada', temporada)
              .eq('jornada', semana);

          if (cerrarJornadaError) {
            throw new Error(
              `Error al finalizar la jornada ${semana}: ${cerrarJornadaError.message}`
            );
          }

          const { error: activarJornadaError } =
            await supabase
              .from('app_config')
              .update({
                jornada_actual: siguienteJornada,
              })
              .eq('id', 1);

          if (activarJornadaError) {
            throw new Error(
              `Jornada ${siguienteJornada} preparada, pero no pudo activarse: ${activarJornadaError.message}`
            );
          }

          const pushResultadosApertura =
            await pushResultadosAperturaSiProcede({
              temporada,
              jornadaFinalizada: semana,
              jornadaNueva: siguienteJornada,
            });

          console.log(
            `🏁 Transición J${semana} -> J${siguienteJornada}:`,
            {
              preparacion,
              pushResultadosApertura,
            },
          );
        } else {
          // Jornada 18: no existe Jornada 19 regular.
          const { error: cerrarJornadaError } =
            await supabase
              .from('jornadas_eventos')
              .update({
                estado: 'finalizada',
                fin_jornada: new Date().toISOString(),
              })
              .eq('temporada', temporada)
              .eq('jornada', semana);

          if (cerrarJornadaError) {
            throw new Error(
              `Error al finalizar la jornada ${semana}: ${cerrarJornadaError.message}`
            );
          }
        }
      }

      console.log(`Jornada ${semana} sincronizada correctamente.`);
    } catch (error) {
      console.error(`Error al sincronizar jornada ${semana}:`, error);
    }
  }
}
