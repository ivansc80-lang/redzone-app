import { supabaseServer as supabase } from "@/lib/supabaseServer";

const PICK_CLOSE_MINUTES = 30;
const CHECKPOINT_MARGIN_HOURS = 4;

type FranjaNFL =
  | "tnf"
  | "friday_games"
  | "saturday_games"
  | "early_games"
  | "late_games"
  | "snf"
  | "mnf";

const FRANJAS_NFL: FranjaNFL[] = [
  "tnf",
  "friday_games",
  "saturday_games",
  "early_games",
  "late_games",
  "snf",
  "mnf",
];

function obtenerDatosEt(fechaIso: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(fechaIso));

  const weekday = partes.find((parte) => parte.type === "weekday")?.value || "";

  const hour = Number(
    partes.find((parte) => parte.type === "hour")?.value || "0",
  );

  return { weekday, hour };
}

function clasificarFranjaNFL(fechaIso: string): FranjaNFL | null {
  const { weekday, hour } = obtenerDatosEt(fechaIso);

  if (weekday === "Thu") return "tnf";
  if (weekday === "Fri") return "friday_games";
  if (weekday === "Sat") return "saturday_games";
  if (weekday === "Mon") return "mnf";

  if (weekday === "Sun") {
    if (hour < 15) return "early_games";
    if (hour < 19) return "late_games";
    return "snf";
  }

  return null;
}

function calcularEstadoFranjas(eventos: any[]) {
  const grupos = new Map<FranjaNFL, any[]>();

  for (const franja of FRANJAS_NFL) {
    grupos.set(franja, []);
  }

  for (const evento of eventos) {
    const franja = clasificarFranjaNFL(evento.date);

    if (franja) {
      grupos.get(franja)?.push(evento);
    }
  }

  const resultado: Record<string, string | boolean | null> = {};

  for (const franja of FRANJAS_NFL) {
    const eventosFranja = grupos.get(franja) || [];

    // NULL = esta franja no existe en la jornada.
    if (eventosFranja.length === 0) {
      resultado[franja] = null;
      resultado[`${franja}_validado`] = null;
      continue;
    }

    const ultimoKickoffMs = Math.max(
      ...eventosFranja.map((evento: any) => new Date(evento.date).getTime()),
    );

    const checkpoint = new Date(
      ultimoKickoffMs + CHECKPOINT_MARGIN_HOURS * 60 * 60 * 1000,
    );

    // ESPN manda, pero únicamente comprobamos el bloque
    // cuando ya hemos alcanzado su checkpoint administrativo.
    //
    // Antes del checkpoint:
    //   *_validado = null
    //
    // Desde el checkpoint:
    //   true  = todos los partidos están completed
    //   false = todavía queda alguno sin finalizar
    const checkpointAlcanzado = Date.now() >= checkpoint.getTime();

    const todosFinalizados = eventosFranja.every((evento: any) =>
      Boolean(evento.competitions?.[0]?.status?.type?.completed),
    );

    resultado[franja] = checkpoint.toISOString();
    resultado[`${franja}_validado`] = checkpointAlcanzado
      ? todosFinalizados
      : null;
  }

  return resultado;
}

export interface PreseasonSyncResult {
  active: boolean;
  expired?: boolean;
  games?: number;
  estado?: "pendiente" | "cerrada" | "finalizada";
  message: string;
}

export async function sincronizarPretemporadaTest(): Promise<PreseasonSyncResult> {
  const ahora = new Date();

  const { data: config, error: configError } = await supabase
    .from("app_config")
    .select(
      "modo_pretemporada_test, modo_pretemporada_hasta, temporada_test, jornada_test_actual",
    )
    .eq("id", 1)
    .maybeSingle();

  if (configError)
    throw new Error(`Error al leer app_config: ${configError.message}`);

  if (!config?.modo_pretemporada_test) {
    return {
      active: false,
      message: "El modo de pretemporada de prueba no está activo.",
    };
  }

  const temporadaTest = Number(config.temporada_test || 2026);
  const jornadaTestActual = Number(config.jornada_test_actual || 1);

  const { data: jornadaTest, error: jornadaTestError } = await supabase
    .from("jornadas_eventos_test")
    .select(
      "temporada, jornada_test, semana_espn, inicio_jornada, cierre_pronosticos, fin_jornada, estado",
    )
    .eq("temporada", temporadaTest)
    .eq("jornada_test", jornadaTestActual)
    .maybeSingle();

  if (jornadaTestError) {
    throw new Error(
      `Error al leer jornadas_eventos_test: ${jornadaTestError.message}`,
    );
  }

  if (!jornadaTest) {
    throw new Error(
      `No existe configuración para TEST ${jornadaTestActual} de la temporada ${temporadaTest}.`,
    );
  }

  const preseasonWeek = Number(jornadaTest.semana_espn);

  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100&dates=${temporadaTest}&seasontype=1&week=${preseasonWeek}`,
    { cache: "no-store" },
  );

  if (!res.ok) throw new Error(`ESPN respondió con HTTP ${res.status}`);

  const data = await res.json();
  const eventos = (data.events || []).sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  if (eventos.length === 0) {
    throw new Error(
      `ESPN no devolvió partidos de pretemporada para la semana ${preseasonWeek} de ${temporadaTest}.`,
    );
  }

  const primerPartidoFecha = new Date(eventos[0].date);
  const ultimoPartidoFecha = new Date(eventos[eventos.length - 1].date);
  const estadoFranjas = calcularEstadoFranjas(eventos);

  const cierrePronosticos = new Date(
    primerPartidoFecha.getTime() - PICK_CLOSE_MINUTES * 60 * 1000,
  );

  let todosFinalizados = true;

  for (const evento of eventos) {
    const comp = evento.competitions?.[0];
    if (!comp) continue;

    const local = comp.competitors?.find((c: any) => c.homeAway === "home");
    const visitante = comp.competitors?.find((c: any) => c.homeAway === "away");
    const localAbrev = local?.team?.abbreviation || "";
    const visitAbrev = visitante?.team?.abbreviation || "";

    if (!localAbrev || !visitAbrev) continue;

    const estado = comp.status?.type?.name || "STATUS_SCHEDULED";
    const completado = Boolean(comp.status?.type?.completed);
    const puntosLocal = parseInt(local?.score || "0", 10);
    const puntosVisitante = parseInt(visitante?.score || "0", 10);

    const periodo = Number(comp.status?.period || 0) || null;
    const reloj =
      comp.status?.displayClock || comp.status?.type?.shortDetail || null;

    if (!completado) todosFinalizados = false;

    let resultadoOficial: "1" | "X" | "2" | null = null;
    if (completado) {
      resultadoOficial =
        puntosLocal > puntosVisitante
          ? "1"
          : puntosLocal < puntosVisitante
            ? "2"
            : "X";
    }

    // Si el partido fue finalizado manualmente durante las pruebas,
    // el cron NO debe sobrescribir su resultado con el estado actual de ESPN.
    const { data: partidoExistente, error: partidoExistenteError } =
      await supabase
        .from("partidos")
        .select("id, estado")
        .eq("espn_event_id", evento.id)
        .maybeSingle();

    if (partidoExistenteError) {
      throw new Error(
        `Error al comprobar partido de prueba ESPN ${evento.id}: ${partidoExistenteError.message}`,
      );
    }

    if (partidoExistente?.estado === "STATUS_FINAL_TEST") {
      // Ya fue simulado y validado. Lo dejamos intacto.
      continue;
    }

    const { data: partidoGuardado, error: upsertError } = await supabase
      .from("partidos")
      .upsert(
        {
          espn_event_id: evento.id,
          temporada: temporadaTest,
          jornada: jornadaTestActual,
          semana_competicion: preseasonWeek,
          tipo_competicion: "pretemporada_test",
          equipo_local: localAbrev,
          equipo_visitante: visitAbrev,
          fecha_partido: new Date(evento.date).toISOString(),
          estado,
          puntos_local: puntosLocal,
          puntos_visitante: puntosVisitante,
          periodo,
          reloj,
          resultado_oficial: resultadoOficial,
        },
        { onConflict: "espn_event_id" },
      )
      .select("id")
      .single();

    if (upsertError) {
      throw new Error(
        `Error al guardar partido de pretemporada ESPN ${evento.id}: ${upsertError.message}`,
      );
    }

    if (completado && resultadoOficial && partidoGuardado) {
      const { error: aciertosError } = await supabase
        .from("pronosticos")
        .update({ acierto: true })
        .eq("partido_id", partidoGuardado.id)
        .eq("eleccion", resultadoOficial);

      if (aciertosError)
        throw new Error(
          `Error al validar aciertos de pretemporada: ${aciertosError.message}`,
        );

      const { error: fallosError } = await supabase
        .from("pronosticos")
        .update({ acierto: false })
        .eq("partido_id", partidoGuardado.id)
        .neq("eleccion", resultadoOficial);

      if (fallosError)
        throw new Error(
          `Error al validar fallos de pretemporada: ${fallosError.message}`,
        );
    } else if (partidoGuardado) {
      // Si ESPN indica que el partido todavía NO ha finalizado,
      // ningún pronóstico puede conservar acierto/fallo.
      const { error: limpiarAciertosError } = await supabase
        .from("pronosticos")
        .update({ acierto: null })
        .eq("partido_id", partidoGuardado.id);

      if (limpiarAciertosError) {
        throw new Error(
          `Error al limpiar aciertos pendientes de pretemporada: ${limpiarAciertosError.message}`,
        );
      }
    }
  }

  // Conservamos un cierre manual durante las pruebas controladas.
  // El cron puede seguir sincronizando ESPN, pero no debe reabrir PORRA.
  const { data: jornadaActual, error: jornadaActualError } = await supabase
    .from("jornadas_eventos_test")
    .select("estado")
    .eq("temporada", temporadaTest)
    .eq("jornada_test", jornadaTestActual)
    .maybeSingle();

  if (jornadaActualError) {
    throw new Error(
      `Error al consultar el estado actual de TEST ${jornadaTestActual}: ${jornadaActualError.message}`,
    );
  }

  // El estado deportivo de los partidos NO finaliza administrativamente
  // la jornada. ESPN FINAL sirve para validar resultados y pronósticos.
  //
  // La jornada permanece:
  // - pendiente antes de cierre_pronosticos;
  // - cerrada desde cierre_pronosticos hasta fin_jornada.
  //
  // La transición administrativa se gobierna exclusivamente mediante
  // fin_jornada, más abajo, al preparar y activar la siguiente jornada.
  const estadoPretemporada: "pendiente" | "cerrada" | "finalizada" =
    jornadaActual?.estado === "finalizada"
      ? ahora >= new Date(jornadaTest.fin_jornada)
        ? "finalizada"
        : ahora >= cierrePronosticos
          ? "cerrada"
          : "pendiente"
      : jornadaActual?.estado === "cerrada"
        ? "cerrada"
        : ahora >= cierrePronosticos
          ? "cerrada"
          : "pendiente";

  const { error: configUpdateError } = await supabase
    .from("app_config")
    .update({
      semana_pretemporada_test: preseasonWeek,
      pretemporada_estado: estadoPretemporada,
      pretemporada_inicio: primerPartidoFecha.toISOString(),
      pretemporada_cierre_pronosticos: cierrePronosticos.toISOString(),
      pretemporada_fin: jornadaTest.fin_jornada,
    })
    .eq("id", 1);

  if (configUpdateError) {
    throw new Error(
      `Error al actualizar app_config de pretemporada: ${configUpdateError.message}`,
    );
  }

  const { error: jornadaError } = await supabase
    .from("jornadas_eventos_test")
    .update({
      inicio_jornada: primerPartidoFecha.toISOString(),
      cierre_pronosticos: cierrePronosticos.toISOString(),
      ...estadoFranjas,
      estado: estadoPretemporada,
    })
    .eq("temporada", temporadaTest)
    .eq("jornada_test", jornadaTestActual);

  if (jornadaError) {
    throw new Error(
      `Error al actualizar TEST ${jornadaTestActual} de ${temporadaTest}: ${jornadaError.message}`,
    );
  }

  // ==========================================================
  // TRANSICIÓN SEGURA A LA SIGUIENTE JORNADA TEST
  //
  // fin_jornada es un hito administrativo configurado por REDZONE.
  // No representa el kickoff del último partido.
  //
  // Al alcanzarlo:
  // 1. buscamos la siguiente jornada TEST configurada;
  // 2. verificamos que ESPN publica esa semana;
  // 3. sincronizamos sus partidos;
  // 4. solo después activamos la nueva jornada.
  //
  // Si cualquier paso falla, jornada_test_actual NO cambia.
  // ==========================================================

  const finJornada = new Date(jornadaTest.fin_jornada);

  if (ahora >= finJornada) {
    const siguienteJornadaTest = jornadaTestActual + 1;

    const { data: siguienteJornada, error: siguienteJornadaError } =
      await supabase
        .from("jornadas_eventos_test")
        .select(
          "temporada, jornada_test, semana_espn, inicio_jornada, cierre_pronosticos, fin_jornada, estado",
        )
        .eq("temporada", temporadaTest)
        .eq("jornada_test", siguienteJornadaTest)
        .maybeSingle();

    if (siguienteJornadaError) {
      throw new Error(
        `Error al buscar TEST ${siguienteJornadaTest}: ${siguienteJornadaError.message}`,
      );
    }

    // Si existe una siguiente jornada TEST, la preparamos antes
    // de cambiar jornada_test_actual.
    if (siguienteJornada) {
      const siguienteSemanaEspn = Number(siguienteJornada.semana_espn);

      const siguienteRes = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100&dates=${temporadaTest}&seasontype=1&week=${siguienteSemanaEspn}`,
        { cache: "no-store" },
      );

      if (!siguienteRes.ok) {
        throw new Error(
          `ESPN respondió con HTTP ${siguienteRes.status} al preparar TEST ${siguienteJornadaTest}.`,
        );
      }

      const siguienteData = await siguienteRes.json();

      const siguientesEventos = (siguienteData.events || []).sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      if (siguientesEventos.length === 0) {
        throw new Error(
          `ESPN no devolvió partidos para preparar TEST ${siguienteJornadaTest} / Week ${siguienteSemanaEspn}.`,
        );
      }

      // La BBDD define cuántos partidos pertenecen a esta jornada.
      // ESPN debe confirmar exactamente ese calendario antes de que
      // podamos activar la nueva jornada.
      const { data: partidosEsperados, error: partidosEsperadosError } =
        await supabase
          .from("partidos")
          .select("espn_event_id")
          .eq("temporada", temporadaTest)
          .eq("tipo_competicion", "pretemporada_test")
          .eq("jornada", siguienteJornadaTest);

      if (partidosEsperadosError) {
        throw new Error(
          `Error al validar partidos esperados de TEST ${siguienteJornadaTest}: ${partidosEsperadosError.message}`,
        );
      }

      const idsEsperados = new Set<string>(
        (partidosEsperados || []).map((p: any) => String(p.espn_event_id)),
      );

      const idsEspn = new Set<string>(
        siguientesEventos.map((evento: any) => String(evento.id)),
      );

      if (siguientesEventos.length !== idsEsperados.size) {
        throw new Error(
          `Calendario incompleto para TEST ${siguienteJornadaTest}: ` +
            `BBDD espera ${idsEsperados.size} partidos y ESPN devolvió ${siguientesEventos.length}.`,
        );
      }

      const faltanEnEspn = [...idsEsperados].filter((id) => !idsEspn.has(id));
      const sobranEnEspn = [...idsEspn].filter((id) => !idsEsperados.has(id));

      if (faltanEnEspn.length > 0 || sobranEnEspn.length > 0) {
        throw new Error(
          `Los partidos ESPN no coinciden con TEST ${siguienteJornadaTest}. ` +
            `Faltan: ${faltanEnEspn.join(", ") || "ninguno"}. ` +
            `Sobran: ${sobranEnEspn.join(", ") || "ninguno"}.`,
        );
      }

      const siguientePrimerPartido = new Date(siguientesEventos[0].date);
      const siguientesFranjas = calcularEstadoFranjas(siguientesEventos);

      const siguienteCierrePronosticos = new Date(
        siguientePrimerPartido.getTime() - PICK_CLOSE_MINUTES * 60 * 1000,
      );

      // Primero construimos y validamos TODOS los partidos en memoria.
      // No escribimos nada hasta comprobar que los 16 eventos son procesables.
      const partidosSiguienteJornada = siguientesEventos.map((evento: any) => {
        const comp = evento.competitions?.[0];

        if (!comp) {
          throw new Error(
            `ESPN ${evento.id} de TEST ${siguienteJornadaTest} no contiene competition procesable.`,
          );
        }

        const local = comp.competitors?.find((c: any) => c.homeAway === "home");

        const visitante = comp.competitors?.find(
          (c: any) => c.homeAway === "away",
        );

        const localAbrev = local?.team?.abbreviation || "";
        const visitAbrev = visitante?.team?.abbreviation || "";

        if (!localAbrev || !visitAbrev) {
          throw new Error(
            `ESPN ${evento.id} de TEST ${siguienteJornadaTest} no contiene local/visitante válidos.`,
          );
        }

        const estado = comp.status?.type?.name || "STATUS_SCHEDULED";
        const completado = Boolean(comp.status?.type?.completed);

        const puntosLocal = parseInt(local?.score || "0", 10);
        const puntosVisitante = parseInt(visitante?.score || "0", 10);

        const periodo = Number(comp.status?.period || 0) || null;

        const reloj =
          comp.status?.displayClock || comp.status?.type?.shortDetail || null;

        let resultadoOficial: "1" | "X" | "2" | null = null;

        if (completado) {
          resultadoOficial =
            puntosLocal > puntosVisitante
              ? "1"
              : puntosLocal < puntosVisitante
                ? "2"
                : "X";
        }

        return {
          espn_event_id: evento.id,
          temporada: temporadaTest,
          jornada: siguienteJornadaTest,
          semana_competicion: siguienteSemanaEspn,
          tipo_competicion: "pretemporada_test",
          equipo_local: localAbrev,
          equipo_visitante: visitAbrev,
          fecha_partido: new Date(evento.date).toISOString(),
          estado,
          puntos_local: puntosLocal,
          puntos_visitante: puntosVisitante,
          periodo,
          reloj,
          resultado_oficial: resultadoOficial,
        };
      });

      if (partidosSiguienteJornada.length !== idsEsperados.size) {
        throw new Error(
          `TEST ${siguienteJornadaTest} no puede activarse: ` +
            `se esperaban ${idsEsperados.size} partidos procesables y se prepararon ${partidosSiguienteJornada.length}.`,
        );
      }

      // Los 16 partidos se envían juntos a Supabase.
      // Si esta operación falla, NO continuamos hacia la activación de J2.
      const { error: siguienteUpsertError } = await supabase
        .from("partidos")
        .upsert(partidosSiguienteJornada, {
          onConflict: "espn_event_id",
        });

      if (siguienteUpsertError) {
        throw new Error(
          `Error al preparar los partidos de TEST ${siguienteJornadaTest}: ${siguienteUpsertError.message}`,
        );
      }

      // Actualizamos únicamente fechas derivadas de ESPN.
      // fin_jornada se conserva porque es configuración administrativa.
      const { error: siguienteEventoUpdateError } = await supabase
        .from("jornadas_eventos_test")
        .update({
          inicio_jornada: siguientePrimerPartido.toISOString(),
          cierre_pronosticos: siguienteCierrePronosticos.toISOString(),
          ...siguientesFranjas,
        })
        .eq("temporada", temporadaTest)
        .eq("jornada_test", siguienteJornadaTest);

      if (siguienteEventoUpdateError) {
        throw new Error(
          `Error al actualizar calendario de TEST ${siguienteJornadaTest}: ${siguienteEventoUpdateError.message}`,
        );
      }

      // La siguiente jornada ya está completamente preparada.
      //
      // Solo ahora podemos dar por finalizada administrativamente
      // la jornada TEST anterior.
      //
      // Si cualquier validación o escritura de J2 hubiera fallado antes,
      // nunca llegaríamos aquí y J1 permanecería cerrada y activa.
      const { error: finalizarActualError } = await supabase
        .from("jornadas_eventos_test")
        .update({
          estado: "finalizada",
        })
        .eq("temporada", temporadaTest)
        .eq("jornada_test", jornadaTestActual);

      if (finalizarActualError) {
        throw new Error(
          `TEST ${jornadaTestActual} no pudo finalizarse antes de activar TEST ${siguienteJornadaTest}: ${finalizarActualError.message}`,
        );
      }

      // Este es deliberadamente el ÚLTIMO paso.
      // Solo activamos la nueva jornada después de haberla preparado
      // y de haber finalizado administrativamente la anterior.
      const { error: activarSiguienteError } = await supabase
        .from("app_config")
        .update({
          jornada_test_actual: siguienteJornadaTest,
          semana_pretemporada_test: siguienteSemanaEspn,
          pretemporada_estado: "pendiente",
          pretemporada_inicio: siguientePrimerPartido.toISOString(),
          pretemporada_cierre_pronosticos:
            siguienteCierrePronosticos.toISOString(),
          pretemporada_fin: siguienteJornada.fin_jornada,
        })
        .eq("id", 1);

      if (activarSiguienteError) {
        throw new Error(
          `TEST ${siguienteJornadaTest} fue preparado pero no pudo activarse: ${activarSiguienteError.message}`,
        );
      }

      return {
        active: true,
        games: siguientesEventos.length,
        estado: "pendiente",
        message:
          `TEST ${jornadaTestActual} cerrado administrativamente. ` +
          `TEST ${siguienteJornadaTest} / ESPN Week ${siguienteSemanaEspn} ` +
          `verificado, sincronizado y activado correctamente.`,
      };
    }

    // Si no existe siguiente TEST, NO desactivamos nada aquí.
    // Este será el punto de entrada de la transición TEST -> REGULAR,
    // que implementaremos y validaremos por separado.
  }

  return {
    active: true,
    games: eventos.length,
    estado: estadoPretemporada,
    message: `Pretemporada de prueba sincronizada: ${eventos.length} partidos. Cierre de pronósticos ${PICK_CLOSE_MINUTES} minutos antes del primer partido.`,
  };
}
