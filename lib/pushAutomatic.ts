import {
  enviarPushRedzone,
  PUSH_EVENTOS,
  guardarLogro,
} from "@/lib/pushNotifications";
import { supabaseServer as supabase } from "@/lib/supabaseServer";
import {
  esOnFire,
  esMadreMia,
  esPlenoRedzone,
  esMenudoBano,
  esSeEscapa,
  esPlenoMagico,
  esNoTeComesElTurron,
  esLiderSolido,
} from "@/lib/pushRules";

// ============================================================
// 1. INICIO DE TEMPORADA / APERTURA PORRA J1
// ============================================================
//
// Solo debe ejecutarse:
//
// - fuera del Modo TEST;
// - en Temporada Regular;
// - con Jornada 1 todavía pendiente;
// - antes de que cierre la PORRA.
//
// La deduplicación real la controla push_eventos_enviados.
//
export async function pushInicioTemporadaSiProcede({
  temporada,
  jornada,
  estado,
  cierrePronosticos,
}: {
  temporada: number;
  jornada: number;
  estado: string | null;
  cierrePronosticos?: string | null;
}) {
  if (jornada !== 1) {
    return {
      enviado: false,
      motivo: "No es Jornada 1",
    };
  }

  if (estado !== "pendiente") {
    return {
      enviado: false,
      motivo: `Jornada 1 no está pendiente (${estado})`,
    };
  }

  // Protección adicional:
  // si por cualquier motivo llegáramos aquí después del cierre,
  // no enviamos una apertura de PORRA fuera de tiempo.
  if (
    cierrePronosticos &&
    new Date() >= new Date(cierrePronosticos)
  ) {
    return {
      enviado: false,
      motivo: "La PORRA J1 ya alcanzó su cierre",
    };
  }

  const claveEvento =
    `inicio_temporada_${temporada}_j1`;

  const resultado = await enviarPushRedzone({
    claveEvento,
    tipoEvento: PUSH_EVENTOS.INICIO_TEMPORADA,

    temporada,
    jornada: 1,

    titulo: `🏈 ¡ARRANCA REDZONE ${temporada}!`,
    mensaje:
      "INICIO DE TEMPORADA / APERTURA PORRA J1",

    url: "/",

    metadata: {
      evento: "inicio_temporada",
      jornada: 1,
    },
  });

  return {
    ...resultado,
    motivo: resultado.duplicado
      ? "El PUSH de inicio de temporada ya fue enviado"
      : resultado.enviado
        ? "PUSH de inicio de temporada enviado"
        : "No existen suscripciones PUSH activas",
  };
}


// ============================================================
// 2. CIERRE DE PORRA
// ============================================================
//
// Se ejecuta cuando REDZONE ya considera la jornada "cerrada".
//
// Una clave distinta por temporada + jornada garantiza que,
// aunque el cron vuelva a pasar cada 5 minutos, el PUSH solo
// pueda enviarse una vez.
//
export async function pushCierrePorraSiProcede({
  temporada,
  jornada,
  estado,
}: {
  temporada: number;
  jornada: number;
  estado: string | null;
}) {
  if (estado !== "cerrada") {
    return {
      enviado: false,
      motivo: `La jornada no está cerrada (${estado})`,
    };
  }

  const claveEvento =
    `cierre_porra_${temporada}_j${jornada}`;

  const resultado = await enviarPushRedzone({
    claveEvento,
    tipoEvento: PUSH_EVENTOS.CIERRE_PORRA,

    temporada,
    jornada,

    titulo: `🔒 PORRA CERRADA · JORNADA ${jornada}`,
    mensaje: "¡Que empiece el espectáculo!",

    url: "/",

    metadata: {
      evento: "cierre_porra",
      jornada,
    },
  });

  return {
    ...resultado,
    motivo: resultado.duplicado
      ? `El PUSH de cierre de la Jornada ${jornada} ya fue enviado`
      : resultado.enviado
        ? `PUSH de cierre de la Jornada ${jornada} enviado`
        : "No existen suscripciones PUSH activas",
  };
}


// ============================================================
// 3. RESULTADOS Jn + PORRA ABIERTA Jn+1
// ============================================================

const PARTICIPANTES_REDZONE = [
  {
    id: "088072d0-0782-409f-b5e4-f8a558f27b4f",
    nombre: "CACE",
  },
  {
    id: "dadb359a-8bc1-442e-8202-62fa2f8ddab9",
    nombre: "JUANJO",
  },
  {
    id: "351a81a5-86f9-4d6d-a567-f49ed5959e57",
    nombre: "IVÁN",
  },
] as const;

export async function pushResultadosAperturaSiProcede({
  temporada,
  jornadaFinalizada,
  jornadaNueva,
}: {
  temporada: number;
  jornadaFinalizada: number;
  jornadaNueva: number;
}) {
  const ids = PARTICIPANTES_REDZONE.map((p) => p.id);

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select(`
        user_id,
        acierto,
        partido:partidos!inner (
          jornada,
          temporada,
          tipo_competicion
        )
      `)
      .in("user_id", ids)
      .eq("partido.temporada", temporada)
      .eq("partido.jornada", jornadaFinalizada)
      .eq("partido.tipo_competicion", "regular")
      .not("acierto", "is", null);

  if (pronosticosError) {
    throw new Error(
      `Error calculando resultados de la Jornada ${jornadaFinalizada}: ${pronosticosError.message}`,
    );
  }

  const aciertos: Record<string, number> = {};

  for (const participante of PARTICIPANTES_REDZONE) {
    aciertos[participante.id] = 0;
  }

  for (const pronostico of pronosticos || []) {
    if (
      pronostico.acierto === true &&
      aciertos[pronostico.user_id] !== undefined
    ) {
      aciertos[pronostico.user_id] += 1;
    }
  }

  const marcador = PARTICIPANTES_REDZONE
    .map(
      (participante) =>
        `${participante.nombre} ${aciertos[participante.id]}`,
    )
    .join(" · ");

  const claveEvento =
    `resultados_apertura_${temporada}_j${jornadaFinalizada}_j${jornadaNueva}`;

  const resultado = await enviarPushRedzone({
    claveEvento,
    tipoEvento: PUSH_EVENTOS.RESULTADOS_APERTURA,

    temporada,
    jornada: jornadaNueva,

    titulo:
      `🏁 RESULTADOS J${jornadaFinalizada} · PORRA J${jornadaNueva} ABIERTA`,

    mensaje:
      `${marcador} · Ya puedes hacer tus pronósticos de la Jornada ${jornadaNueva}.`,

    url: "/",

    metadata: {
      evento: "resultados_apertura",
      jornada_finalizada: jornadaFinalizada,
      jornada_nueva: jornadaNueva,
      resultados: PARTICIPANTES_REDZONE.map(
        (participante) => ({
          user_id: participante.id,
          nombre: participante.nombre,
          aciertos: aciertos[participante.id],
        }),
      ),
    },
  });

  return {
    ...resultado,
    marcador,
    motivo: resultado.duplicado
      ? `El PUSH J${jornadaFinalizada} → J${jornadaNueva} ya fue enviado`
      : resultado.enviado
        ? `Resultados J${jornadaFinalizada} y apertura J${jornadaNueva} enviados`
        : "No existen suscripciones PUSH activas",
  };
}


// ============================================================
// 4. 🔥 ON FIRE
// ============================================================
//
// REGLAS:
//
// - Solo durante la ventana REDZONE del domingo.
// - Hora peninsular española: domingo 19:00 -> lunes 02:30.
// - Cuentan TODOS los partidos ya finalizados de la jornada,
//   incluidos jueves/viernes/sábado.
// - Solo se estrena en 4/4 o 5/5.
// - Máximo una vez por participante y jornada.
// ============================================================

function estamosEnVentanaRedzone() {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value || "";

  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));

  const minutos = hour * 60 + minute;

  // Domingo desde las 19:00.
  if (
    weekday === "Sun" &&
    minutos >= 19 * 60
  ) {
    return true;
  }

  // Madrugada inmediatamente posterior:
  // lunes hasta las 02:30.
  if (
    weekday === "Mon" &&
    minutos <= 2 * 60 + 30
  ) {
    return true;
  }

  return false;
}

export async function pushOnFireSiProcede({
  temporada,
  jornada,
}: {
  temporada: number;
  jornada: number;
}) {
  if (!estamosEnVentanaRedzone()) {
    return {
      evaluado: false,
      motivo: "Fuera de la ventana REDZONE dominical",
      resultados: [],
    };
  }

  const { data: partidosFinalizados, error: partidosError } =
    await supabase
      .from("partidos")
      .select("id")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular")
      .eq("estado", "STATUS_FINAL");

  if (partidosError) {
    throw new Error(
      `Error contando partidos finalizados de J${jornada}: ${partidosError.message}`,
    );
  }

  const totalFinalizados =
    partidosFinalizados?.length || 0;

  // ON FIRE solo puede estrenarse exactamente en 4 o 5.
  if (
    totalFinalizados !== 4 &&
    totalFinalizados !== 5
  ) {
    return {
      evaluado: true,
      motivo:
        `ON FIRE solo se evalúa con 4 o 5 finalizados; ahora hay ${totalFinalizados}`,
      resultados: [],
    };
  }

  const idsPartidos =
    (partidosFinalizados || []).map((p) => p.id);

  if (idsPartidos.length === 0) {
    return {
      evaluado: true,
      motivo: "No hay partidos finalizados",
      resultados: [],
    };
  }

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select("user_id, partido_id, acierto")
      .in(
        "user_id",
        PARTICIPANTES_REDZONE.map((p) => p.id),
      )
      .in("partido_id", idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error calculando ON FIRE de J${jornada}: ${pronosticosError.message}`,
    );
  }

  const resultados: any[] = [];

  for (const participante of PARTICIPANTES_REDZONE) {
    const apuestasUsuario =
      (pronosticos || []).filter(
        (p) => p.user_id === participante.id,
      );

    // Debe tener pronóstico validado para TODOS los partidos
    // que estamos contabilizando.
    if (
      apuestasUsuario.length !== totalFinalizados
    ) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        motivo:
          `Solo tiene ${apuestasUsuario.length}/${totalFinalizados} pronósticos evaluables`,
      });
      continue;
    }

    const aciertos =
      apuestasUsuario.filter(
        (p) => p.acierto === true,
      ).length;

    if (!esOnFire(aciertos, totalFinalizados)) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        aciertos,
        total: totalFinalizados,
        motivo: "No cumple ON FIRE",
      });
      continue;
    }

    const resultado =
      await enviarPushRedzone({
        claveEvento:
          `on_fire_${temporada}_j${jornada}_${participante.id}`,

        tipoEvento: PUSH_EVENTOS.ON_FIRE,

        temporada,
        jornada,

        titulo: `🔥 ${participante.nombre} ESTÁ ON FIRE`,

        mensaje:
          `${aciertos}/${totalFinalizados} para empezar la Jornada ${jornada}. ¡No falla una!`,

        url: "/",

        metadata: {
          evento: "on_fire",
          nombre: participante.nombre,
          aciertos,
          partidos_finalizados: totalFinalizados,
        },
      });

    resultados.push({
      nombre: participante.nombre,
      aciertos,
      total: totalFinalizados,
      ...resultado,
    });
  }

  return {
    evaluado: true,
    partidosFinalizados: totalFinalizados,
    resultados,
  };
}


// ============================================================
// 5. 😱 MADRE MÍA CÓMO ESTAMOS
// ============================================================
//
// - Misma ventana que ON FIRE.
// - Cuenta todos los partidos finalizados de la jornada.
// - Se estrena solo en 0/4 o 0/5.
// - Máximo una vez por participante y jornada.
// - Se envía a TODOS.
// ============================================================

export async function pushMadreMiaSiProcede({
  temporada,
  jornada,
}: {
  temporada: number;
  jornada: number;
}) {
  if (!estamosEnVentanaRedzone()) {
    return {
      evaluado: false,
      motivo: "Fuera de la ventana REDZONE dominical",
      resultados: [],
    };
  }

  const { data: partidosFinalizados, error: partidosError } =
    await supabase
      .from("partidos")
      .select("id")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular")
      .eq("estado", "STATUS_FINAL");

  if (partidosError) {
    throw new Error(
      `Error contando partidos finalizados de J${jornada}: ${partidosError.message}`,
    );
  }

  const totalFinalizados =
    partidosFinalizados?.length || 0;

  if (
    totalFinalizados !== 4 &&
    totalFinalizados !== 5
  ) {
    return {
      evaluado: true,
      motivo:
        `MADRE MÍA solo se evalúa con 4 o 5 finalizados; ahora hay ${totalFinalizados}`,
      resultados: [],
    };
  }

  const idsPartidos =
    (partidosFinalizados || []).map((p) => p.id);

  if (idsPartidos.length === 0) {
    return {
      evaluado: true,
      motivo: "No hay partidos finalizados",
      resultados: [],
    };
  }

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select("user_id, partido_id, acierto")
      .in(
        "user_id",
        PARTICIPANTES_REDZONE.map((p) => p.id),
      )
      .in("partido_id", idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error calculando MADRE MÍA de J${jornada}: ${pronosticosError.message}`,
    );
  }

  const resultados: any[] = [];

  for (const participante of PARTICIPANTES_REDZONE) {
    const apuestasUsuario =
      (pronosticos || []).filter(
        (p) => p.user_id === participante.id,
      );

    if (
      apuestasUsuario.length !== totalFinalizados
    ) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        motivo:
          `Solo tiene ${apuestasUsuario.length}/${totalFinalizados} pronósticos evaluables`,
      });
      continue;
    }

    const aciertos =
      apuestasUsuario.filter(
        (p) => p.acierto === true,
      ).length;

    if (!esMadreMia(aciertos, totalFinalizados)) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        aciertos,
        total: totalFinalizados,
        motivo: "No cumple MADRE MÍA",
      });
      continue;
    }

    const resultado =
      await enviarPushRedzone({
        claveEvento:
          `madre_mia_${temporada}_j${jornada}_${participante.id}`,

        tipoEvento: PUSH_EVENTOS.MADRE_MIA,

        temporada,
        jornada,

        titulo:
          `😱 MADRE MÍA, ${participante.nombre}...`,

        mensaje:
          `0/${totalFinalizados} para empezar la Jornada ${jornada}. ¡Madre mía cómo estamos!`,

        url: "/",

        metadata: {
          evento: "madre_mia",
          nombre: participante.nombre,
          aciertos: 0,
          partidos_finalizados: totalFinalizados,
        },
      });

    resultados.push({
      nombre: participante.nombre,
      aciertos,
      total: totalFinalizados,
      ...resultado,
    });
  }

  return {
    evaluado: true,
    partidosFinalizados: totalFinalizados,
    resultados,
  };
}


// ============================================================
// 6. 🏆 PLENO REDZONE
// ============================================================
//
// BLOQUE REDZONE:
//
// - Domingo NFL.
// - Kickoff desde 13:00 ET hasta antes de 17:00 ET.
// - Incluye ventanas 1:00 PM + 4:05/4:25 PM.
// - Excluye partidos internacionales tempranos.
// - Excluye SNF.
//
// Se evalúa únicamente cuando TODOS los partidos del bloque
// REDZONE de esa jornada han finalizado.
//
// Si un participante acierta TODOS:
// - PUSH a TODOS;
// - logro histórico PLENO_REDZONE;
// - máximo una vez por participante y jornada.
// ============================================================

function esPartidoDelBloqueRedzone(
  fechaPartido: string,
) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(fechaPartido));

  const get = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value || "";

  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));

  const minutos = hour * 60 + minute;

  return (
    weekday === "Sun" &&
    minutos >= 13 * 60 &&
    minutos < 17 * 60
  );
}

export async function pushPlenoRedzoneSiProcede({
  temporada,
  jornada,
}: {
  temporada: number;
  jornada: number;
}) {
  const { data: partidos, error: partidosError } =
    await supabase
      .from("partidos")
      .select("id, fecha_partido, estado")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular");

  if (partidosError) {
    throw new Error(
      `Error leyendo partidos para PLENO REDZONE J${jornada}: ${partidosError.message}`,
    );
  }

  const partidosRedzone =
    (partidos || []).filter(
      (p) =>
        p.fecha_partido &&
        esPartidoDelBloqueRedzone(p.fecha_partido),
    );

  if (partidosRedzone.length === 0) {
    return {
      evaluado: false,
      motivo:
        `No hay partidos identificados en el bloque REDZONE de J${jornada}`,
      resultados: [],
    };
  }

  const bloqueFinalizado =
    partidosRedzone.every(
      (p) => p.estado === "STATUS_FINAL",
    );

  if (!bloqueFinalizado) {
    return {
      evaluado: false,
      motivo:
        `El bloque REDZONE J${jornada} todavía no ha terminado`,
      partidosRedzone: partidosRedzone.length,
      resultados: [],
    };
  }

  const idsPartidos =
    partidosRedzone.map((p) => p.id);

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select("user_id, partido_id, acierto")
      .in(
        "user_id",
        PARTICIPANTES_REDZONE.map((p) => p.id),
      )
      .in("partido_id", idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error calculando PLENO REDZONE J${jornada}: ${pronosticosError.message}`,
    );
  }

  const resultados: any[] = [];
  const totalRedzone = partidosRedzone.length;

  for (const participante of PARTICIPANTES_REDZONE) {
    const apuestasUsuario =
      (pronosticos || []).filter(
        (p) => p.user_id === participante.id,
      );

    if (
      apuestasUsuario.length !== totalRedzone ||
      apuestasUsuario.some(
        (p) => p.acierto === null,
      )
    ) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        motivo:
          `Pronósticos REDZONE incompletos (${apuestasUsuario.length}/${totalRedzone})`,
      });
      continue;
    }

    const aciertos =
      apuestasUsuario.filter(
        (p) => p.acierto === true,
      ).length;

    if (!esPlenoRedzone(aciertos, totalRedzone)) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        aciertos,
        total: totalRedzone,
        motivo: "No consiguió PLENO REDZONE",
      });
      continue;
    }

    // ========================================================
    // PALMARÉS
    // ========================================================

    await guardarLogro({
      userId: participante.id,
      temporada,
      jornada,
      tipoCompeticion: "regular",
      tipoLogro: "PLENO_REDZONE",

      detalle:
        `JORNADA ${jornada} · TR ${String(temporada).slice(-2)} · 🏆 PLENO REDZONE`,

      metadata: {
        evento: "pleno_redzone",
        nombre: participante.nombre,
        aciertos,
        partidos_redzone: totalRedzone,
      },
    });

    // ========================================================
    // PUSH A TODOS
    // ========================================================

    const resultado =
      await enviarPushRedzone({
        claveEvento:
          `pleno_redzone_${temporada}_j${jornada}_${participante.id}`,

        tipoEvento: PUSH_EVENTOS.PLENO_REDZONE,

        temporada,
        jornada,

        titulo:
          `🏆 ¡PLENO REDZONE DE ${participante.nombre}!`,

        mensaje:
          `${aciertos}/${totalRedzone} en el bloque dominical. ¡No ha fallado ni uno!`,

        url: "/",

        metadata: {
          evento: "pleno_redzone",
          nombre: participante.nombre,
          aciertos,
          partidos_redzone: totalRedzone,
        },
      });

    resultados.push({
      nombre: participante.nombre,
      aciertos,
      total: totalRedzone,
      logroGuardado: true,
      ...resultado,
    });
  }

  return {
    evaluado: true,
    partidosRedzone: totalRedzone,
    resultados,
  };
}


// ============================================================
// 7. 🚿 MENUDO BAÑO
// ============================================================
//
// Se evalúa al terminar el bloque REDZONE.
//
// Cuenta TODOS los partidos finalizados de la jornada hasta
// ese momento, incluidos adelantados.
//
// Regla:
// - líder único;
// - ventaja >= 4 sobre ambos rivales;
// - PUSH a TODOS;
// - máximo una vez por jornada.
// ============================================================

export async function pushMenudoBanoSiProcede({
  temporada,
  jornada,
}: {
  temporada: number;
  jornada: number;
}) {
  const { data: partidos, error: partidosError } =
    await supabase
      .from("partidos")
      .select("id, fecha_partido, estado")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular");

  if (partidosError) {
    throw new Error(
      `Error leyendo partidos para MENUDO BAÑO J${jornada}: ${partidosError.message}`,
    );
  }

  const partidosRedzone =
    (partidos || []).filter(
      (p) =>
        p.fecha_partido &&
        esPartidoDelBloqueRedzone(p.fecha_partido),
    );

  if (partidosRedzone.length === 0) {
    return {
      evaluado: false,
      motivo: "No hay partidos REDZONE identificados",
      resultados: [],
    };
  }

  const bloqueFinalizado =
    partidosRedzone.every(
      (p) => p.estado === "STATUS_FINAL",
    );

  if (!bloqueFinalizado) {
    return {
      evaluado: false,
      motivo: "El bloque REDZONE todavía no ha terminado",
      resultados: [],
    };
  }

  const partidosFinalizados =
    (partidos || []).filter(
      (p) => p.estado === "STATUS_FINAL",
    );

  const totalFinalizados =
    partidosFinalizados.length;

  if (totalFinalizados === 0) {
    return {
      evaluado: false,
      motivo: "No hay partidos finalizados",
      resultados: [],
    };
  }

  const idsPartidos =
    partidosFinalizados.map((p) => p.id);

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select("user_id, partido_id, acierto")
      .in(
        "user_id",
        PARTICIPANTES_REDZONE.map((p) => p.id),
      )
      .in("partido_id", idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error calculando MENUDO BAÑO J${jornada}: ${pronosticosError.message}`,
    );
  }

  const clasificacion =
    PARTICIPANTES_REDZONE.map((participante) => {
      const apuestas =
        (pronosticos || []).filter(
          (p) => p.user_id === participante.id,
        );

      const completas =
        apuestas.length === totalFinalizados &&
        !apuestas.some(
          (p) => p.acierto === null,
        );

      const aciertos =
        apuestas.filter(
          (p) => p.acierto === true,
        ).length;

      return {
        ...participante,
        completas,
        aciertos,
      };
    });

  if (clasificacion.some((p) => !p.completas)) {
    return {
      evaluado: false,
      motivo:
        "Todavía no están evaluados todos los pronósticos",
      resultados: clasificacion,
    };
  }

  clasificacion.sort(
    (a, b) => b.aciertos - a.aciertos,
  );

  const lider = clasificacion[0];
  const segundo = clasificacion[1];
  const tercero = clasificacion[2];

  if (lider.aciertos === segundo.aciertos) {
    return {
      evaluado: true,
      motivo: "No existe líder único",
      resultados: clasificacion,
    };
  }

  if (
    !esMenudoBano(
      lider.aciertos,
      segundo.aciertos,
      tercero.aciertos,
    )
  ) {
    return {
      evaluado: true,
      motivo: "La ventaja no alcanza MENUDO BAÑO",
      resultados: clasificacion,
    };
  }

  const marcador =
    clasificacion
      .map(
        (p) =>
          `${p.nombre} ${p.aciertos}/${totalFinalizados}`,
      )
      .join(" · ");

  const resultado =
    await enviarPushRedzone({
      claveEvento:
        `menudo_bano_${temporada}_j${jornada}`,

      tipoEvento: PUSH_EVENTOS.MENUDO_BANO,

      temporada,
      jornada,

      titulo:
        `🚿 ¡MENUDO BAÑO DE ${lider.nombre}!`,

      mensaje:
        `${marcador} · ¡Vaya repaso está dando!`,

      url: "/",

      metadata: {
        evento: "menudo_bano",
        lider: lider.nombre,
        total_finalizados: totalFinalizados,
        resultados: clasificacion.map((p) => ({
          user_id: p.id,
          nombre: p.nombre,
          aciertos: p.aciertos,
        })),
      },
    });

  return {
    evaluado: true,
    lider: lider.nombre,
    marcador,
    resultados: clasificacion,
    ...resultado,
  };
}


// ============================================================
// 8. 🏃 VAMOS, QUE SE ESCAPA
// ============================================================
//
// Se evalúa al terminar el bloque REDZONE.
//
// Cuenta TODOS los partidos finalizados de la jornada hasta
// ese momento, incluidos adelantados.
//
// Regla:
// - líder único;
// - ventaja >= 2 sobre ambos rivales;
// - NO puede cumplir MENUDO BAÑO;
// - PUSH a TODOS;
// - máximo una vez por jornada.
// ============================================================

export async function pushSeEscapaSiProcede({
  temporada,
  jornada,
}: {
  temporada: number;
  jornada: number;
}) {
  const { data: partidos, error: partidosError } =
    await supabase
      .from("partidos")
      .select("id, fecha_partido, estado")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular");

  if (partidosError) {
    throw new Error(
      `Error leyendo partidos para SE ESCAPA J${jornada}: ${partidosError.message}`,
    );
  }

  const partidosRedzone =
    (partidos || []).filter(
      (p) =>
        p.fecha_partido &&
        esPartidoDelBloqueRedzone(p.fecha_partido),
    );

  if (partidosRedzone.length === 0) {
    return {
      evaluado: false,
      motivo:
        `No hay partidos identificados en el bloque REDZONE de J${jornada}`,
      resultados: [],
    };
  }

  const bloqueFinalizado =
    partidosRedzone.every(
      (p) => p.estado === "STATUS_FINAL",
    );

  if (!bloqueFinalizado) {
    return {
      evaluado: false,
      motivo:
        `El bloque REDZONE J${jornada} todavía no ha terminado`,
      resultados: [],
    };
  }

  const partidosFinalizados =
    (partidos || []).filter(
      (p) => p.estado === "STATUS_FINAL",
    );

  const idsPartidos =
    partidosFinalizados.map((p) => p.id);

  const totalFinalizados =
    idsPartidos.length;

  if (totalFinalizados === 0) {
    return {
      evaluado: false,
      motivo: "No hay partidos finalizados",
      resultados: [],
    };
  }

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select("user_id, partido_id, acierto")
      .in(
        "user_id",
        PARTICIPANTES_REDZONE.map((p) => p.id),
      )
      .in("partido_id", idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error calculando SE ESCAPA J${jornada}: ${pronosticosError.message}`,
    );
  }

  const clasificacion =
    PARTICIPANTES_REDZONE.map((participante) => {
      const apuestasUsuario =
        (pronosticos || []).filter(
          (p) => p.user_id === participante.id,
        );

      const completas =
        apuestasUsuario.length === totalFinalizados &&
        !apuestasUsuario.some(
          (p) => p.acierto === null,
        );

      const aciertos =
        apuestasUsuario.filter(
          (p) => p.acierto === true,
        ).length;

      return {
        ...participante,
        completas,
        aciertos,
      };
    });

  if (
    clasificacion.some(
      (p) => !p.completas,
    )
  ) {
    return {
      evaluado: false,
      motivo:
        "Hay participantes con pronósticos todavía no evaluables",
      resultados: clasificacion,
    };
  }

  clasificacion.sort(
    (a, b) => b.aciertos - a.aciertos,
  );

  const lider = clasificacion[0];
  const segundo = clasificacion[1];
  const tercero = clasificacion[2];

  if (lider.aciertos === segundo.aciertos) {
    return {
      evaluado: true,
      motivo: "No existe líder único",
      resultados: clasificacion,
    };
  }

  if (
    !esSeEscapa(
      lider.aciertos,
      segundo.aciertos,
      tercero.aciertos,
    )
  ) {
    return {
      evaluado: true,
      motivo: "La ventaja no alcanza VAMOS, QUE SE ESCAPA",
      resultados: clasificacion,
    };
  }

  // Si ya es MENUDO BAÑO, corresponde únicamente al PUSH 7.
  if (
    esMenudoBano(
      lider.aciertos,
      segundo.aciertos,
      tercero.aciertos,
    )
  ) {
    return {
      evaluado: true,
      motivo:
        "La ventaja ya corresponde a MENUDO BAÑO",
      resultados: clasificacion,
    };
  }

  const marcador =
    clasificacion
      .map(
        (p) =>
          `${p.nombre} ${p.aciertos}/${totalFinalizados}`,
      )
      .join(" · ");

  const resultado =
    await enviarPushRedzone({
      claveEvento:
        `se_escapa_${temporada}_j${jornada}`,

      tipoEvento: PUSH_EVENTOS.SE_ESCAPA,

      temporada,
      jornada,

      titulo:
        `🏃 ¡VAMOS, QUE ${lider.nombre} SE ESCAPA!`,

      mensaje:
        `${marcador} · ¡Que no se nos vaya!`,

      url: "/",

      metadata: {
        evento: "se_escapa",
        lider: lider.nombre,
        total_finalizados: totalFinalizados,
        resultados: clasificacion.map((p) => ({
          user_id: p.id,
          nombre: p.nombre,
          aciertos: p.aciertos,
        })),
      },
    });

  return {
    evaluado: true,
    lider: lider.nombre,
    marcador,
    resultados: clasificacion,
    ...resultado,
  };
}


// ============================================================
// 9. ✨ PLENO MÁGICO
// ============================================================
//
// Se evalúa únicamente cuando TODA la jornada ha terminado.
//
// Regla:
// - todos los partidos de la jornada están FINAL;
// - participante con todos sus pronósticos evaluados;
// - acierta TODOS los partidos;
// - PUSH a TODOS;
// - guarda PLENO_MAGICO en PALMARÉS;
// - máximo una vez por participante y jornada.
// ============================================================

export async function pushPlenoMagicoSiProcede({
  temporada,
  jornada,
}: {
  temporada: number;
  jornada: number;
}) {
  const { data: partidos, error: partidosError } =
    await supabase
      .from("partidos")
      .select("id, estado")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular");

  if (partidosError) {
    throw new Error(
      `Error leyendo partidos para PLENO MÁGICO J${jornada}: ${partidosError.message}`,
    );
  }

  const totalPartidos = partidos?.length || 0;

  if (totalPartidos === 0) {
    return {
      evaluado: false,
      motivo: "No hay partidos en la jornada",
      resultados: [],
    };
  }

  const todosFinalizados =
    (partidos || []).every(
      (p) => p.estado === "STATUS_FINAL",
    );

  if (!todosFinalizados) {
    return {
      evaluado: false,
      motivo:
        `La Jornada ${jornada} todavía no ha terminado`,
      resultados: [],
    };
  }

  const idsPartidos =
    (partidos || []).map((p) => p.id);

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select("user_id, partido_id, acierto")
      .in(
        "user_id",
        PARTICIPANTES_REDZONE.map((p) => p.id),
      )
      .in("partido_id", idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error calculando PLENO MÁGICO J${jornada}: ${pronosticosError.message}`,
    );
  }

  const resultados: any[] = [];

  for (const participante of PARTICIPANTES_REDZONE) {
    const apuestasUsuario =
      (pronosticos || []).filter(
        (p) => p.user_id === participante.id,
      );

    if (
      apuestasUsuario.length !== totalPartidos ||
      apuestasUsuario.some(
        (p) => p.acierto === null,
      )
    ) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        motivo:
          `Pronósticos incompletos (${apuestasUsuario.length}/${totalPartidos})`,
      });
      continue;
    }

    const aciertos =
      apuestasUsuario.filter(
        (p) => p.acierto === true,
      ).length;

    if (!esPlenoMagico(aciertos, totalPartidos)) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        aciertos,
        total: totalPartidos,
        motivo: "No consiguió PLENO MÁGICO",
      });
      continue;
    }

    // ========================================================
    // PALMARÉS
    // ========================================================

    await guardarLogro({
      userId: participante.id,
      temporada,
      jornada,
      tipoCompeticion: "regular",
      tipoLogro: "PLENO_MAGICO",

      detalle:
        `JORNADA ${jornada} · TR ${String(temporada).slice(-2)} · ✨ PLENO MÁGICO`,

      metadata: {
        evento: "pleno_magico",
        nombre: participante.nombre,
        aciertos,
        total_partidos: totalPartidos,
      },
    });

    // ========================================================
    // PUSH A TODOS
    // ========================================================

    const resultado =
      await enviarPushRedzone({
        claveEvento:
          `pleno_magico_${temporada}_j${jornada}_${participante.id}`,

        tipoEvento: PUSH_EVENTOS.PLENO_MAGICO,

        temporada,
        jornada,

        titulo:
          `✨ ¡PLENO MÁGICO DE ${participante.nombre}!`,

        mensaje:
          `${aciertos}/${totalPartidos} en la Jornada ${jornada}. ¡Ha acertado absolutamente todos los partidos!`,

        url: "/",

        metadata: {
          evento: "pleno_magico",
          nombre: participante.nombre,
          aciertos,
          total_partidos: totalPartidos,
        },
      });

    resultados.push({
      nombre: participante.nombre,
      aciertos,
      total: totalPartidos,
      ...resultado,
    });
  }

  return {
    evaluado: true,
    totalPartidos,
    resultados,
  };
}



// ============================================================
// 10. 🎄 NO TE COMES EL TURRÓN
// ============================================================
//
// Se evalúa únicamente cuando TODA la jornada ha terminado.
//
// Regla:
// - todos los partidos de la jornada están FINAL;
// - participante con todos sus pronósticos evaluados;
// - aplica esNoTeComesElTurron según número de partidos;
// - PUSH a TODOS;
// - máximo una vez por participante y jornada.
// ============================================================

export async function pushNoTeComesElTurronSiProcede({
  temporada,
  jornada,
}: {
  temporada: number;
  jornada: number;
}) {
  const { data: partidos, error: partidosError } =
    await supabase
      .from("partidos")
      .select("id, estado")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular");

  if (partidosError) {
    throw new Error(
      `Error leyendo partidos para NO TE COMES EL TURRÓN J${jornada}: ${partidosError.message}`,
    );
  }

  const totalPartidos = partidos?.length || 0;

  if (totalPartidos === 0) {
    return {
      evaluado: false,
      motivo: "No hay partidos en la jornada",
      resultados: [],
    };
  }

  const todosFinalizados =
    (partidos || []).every(
      (p) => p.estado === "STATUS_FINAL",
    );

  if (!todosFinalizados) {
    return {
      evaluado: false,
      motivo:
        `La Jornada ${jornada} todavía no ha terminado`,
      resultados: [],
    };
  }

  const idsPartidos =
    (partidos || []).map((p) => p.id);

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select("user_id, partido_id, acierto")
      .in(
        "user_id",
        PARTICIPANTES_REDZONE.map((p) => p.id),
      )
      .in("partido_id", idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error calculando NO TE COMES EL TURRÓN J${jornada}: ${pronosticosError.message}`,
    );
  }

  const resultados: any[] = [];

  for (const participante of PARTICIPANTES_REDZONE) {
    const apuestasUsuario =
      (pronosticos || []).filter(
        (p) => p.user_id === participante.id,
      );

    if (
      apuestasUsuario.length !== totalPartidos ||
      apuestasUsuario.some(
        (p) => p.acierto === null,
      )
    ) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        motivo:
          `Pronósticos incompletos (${apuestasUsuario.length}/${totalPartidos})`,
      });
      continue;
    }

    const aciertos =
      apuestasUsuario.filter(
        (p) => p.acierto === true,
      ).length;

    if (
      !esNoTeComesElTurron(
        aciertos,
        totalPartidos,
      )
    ) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        aciertos,
        total: totalPartidos,
        motivo:
          "No cumple NO TE COMES EL TURRÓN",
      });
      continue;
    }

    const resultado =
      await enviarPushRedzone({
        claveEvento:
          `no_te_comes_el_turron_${temporada}_j${jornada}_${participante.id}`,

        tipoEvento:
          PUSH_EVENTOS.NO_TE_COMES_EL_TURRON,

        temporada,
        jornada,

        titulo:
          `🎄 ¡${participante.nombre}, NO TE COMES EL TURRÓN!`,

        mensaje:
          `${aciertos}/${totalPartidos} aciertos en la Jornada ${jornada}. ¡Menuda jornada para olvidar!`,

        url: "/",

        metadata: {
          evento: "no_te_comes_el_turron",
          nombre: participante.nombre,
          aciertos,
          total_partidos: totalPartidos,
        },
      });

    resultados.push({
      nombre: participante.nombre,
      aciertos,
      total: totalPartidos,
      ...resultado,
    });
  }

  return {
    evaluado: true,
    totalPartidos,
    resultados,
  };
}




// ============================================================
// 11. 👑 LÍDER SÓLIDO
// ============================================================
//
// Se evalúa cuando TODA la jornada ha terminado.
//
// Reconstruye el ranking acumulado después de cada jornada
// directamente desde PRONOSTICOS + PARTIDOS.
//
// Regla:
// - debe existir líder ÚNICO;
// - el mismo participante debe llevar >= 3 jornadas
//   consecutivas como líder único;
// - un empate en cabeza rompe la racha;
// - se notifica cada jornada desde la tercera;
// - PUSH a TODOS.
// ============================================================

export async function pushLiderSolidoSiProcede({
  temporada,
  jornada,
}: {
  temporada: number;
  jornada: number;
}) {
  const ids =
    PARTICIPANTES_REDZONE.map((p) => p.id);

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select(`
        user_id,
        acierto,
        partido:partidos!inner (
          jornada,
          temporada,
          tipo_competicion
        )
      `)
      .in("user_id", ids)
      .eq("partido.temporada", temporada)
      .eq("partido.tipo_competicion", "regular")
      .lte("partido.jornada", jornada)
      .not("acierto", "is", null);

  if (pronosticosError) {
    throw new Error(
      `Error calculando LÍDER SÓLIDO J${jornada}: ${pronosticosError.message}`,
    );
  }

  // ----------------------------------------------------------
  // Reconstruimos el líder acumulado al terminar cada jornada.
  // ----------------------------------------------------------

  const puntos: Record<string, number> = {};

  for (const participante of PARTICIPANTES_REDZONE) {
    puntos[participante.id] = 0;
  }

  const liderPorJornada:
    Array<{ jornada: number; liderId: string | null }> = [];

  for (let j = 1; j <= jornada; j++) {
    for (const pronostico of pronosticos || []) {
      const partidoRaw: any = pronostico.partido;
      const partido =
        Array.isArray(partidoRaw)
          ? partidoRaw[0]
          : partidoRaw;

      if (
        partido?.jornada === j &&
        pronostico.acierto === true &&
        puntos[pronostico.user_id] !== undefined
      ) {
        puntos[pronostico.user_id] += 1;
      }
    }

    const maxPuntos =
      Math.max(...Object.values(puntos));

    const lideres =
      PARTICIPANTES_REDZONE.filter(
        (p) => puntos[p.id] === maxPuntos,
      );

    liderPorJornada.push({
      jornada: j,
      liderId:
        lideres.length === 1
          ? lideres[0].id
          : null,
    });
  }

  const actual =
    liderPorJornada[liderPorJornada.length - 1];

  if (!actual || !actual.liderId) {
    return {
      evaluado: true,
      motivo:
        "No existe líder único al finalizar la jornada",
      jornadasConsecutivas: 0,
    };
  }

  // ----------------------------------------------------------
  // Contamos hacia atrás la racha del líder actual.
  // ----------------------------------------------------------

  let jornadasConsecutivas = 0;

  for (let i = liderPorJornada.length - 1; i >= 0; i--) {
    if (
      liderPorJornada[i].liderId === actual.liderId
    ) {
      jornadasConsecutivas++;
    } else {
      break;
    }
  }

  if (!esLiderSolido(jornadasConsecutivas)) {
    return {
      evaluado: true,
      motivo:
        `Racha insuficiente (${jornadasConsecutivas})`,
      liderId: actual.liderId,
      jornadasConsecutivas,
    };
  }

  const lider =
    PARTICIPANTES_REDZONE.find(
      (p) => p.id === actual.liderId,
    );

  if (!lider) {
    return {
      evaluado: false,
      motivo: "No se pudo identificar al líder",
    };
  }

  const resultado =
    await enviarPushRedzone({
      claveEvento:
        `lider_solido_${temporada}_j${jornada}_${lider.id}`,

      tipoEvento:
        PUSH_EVENTOS.LIDER_SOLIDO,

      temporada,
      jornada,

      titulo:
        `👑 ¡${lider.nombre} ES LÍDER SÓLIDO!`,

      mensaje:
        `Lleva ${jornadasConsecutivas} jornadas consecutivas como líder en solitario de REDZONE.`,

      url: "/",

      metadata: {
        evento: "lider_solido",
        lider: lider.nombre,
        lider_id: lider.id,
        jornadas_consecutivas:
          jornadasConsecutivas,
        historial: liderPorJornada,
      },
    });

  return {
    evaluado: true,
    lider: lider.nombre,
    jornadasConsecutivas,
    historial: liderPorJornada,
    ...resultado,
  };
}



// ============================================================
// 12. ⏰ RECORDATORIO DE PRONÓSTICOS
// ============================================================
//
// Se evalúa mientras la jornada continúa PENDIENTE.
//
// Momento:
// - desde 6 horas antes del cierre real de la porra;
// - nunca después del cierre.
//
// Regla:
// - comprueba CACE / JUANJO / IVÁN por separado;
// - si tiene TODOS los pronósticos, no recibe nada;
// - si le falta alguno, recibe el aviso SOLO él;
// - máximo una notificación por participante y jornada.
//
// No modifica pronósticos, jornadas ni app_config.
// ============================================================

export async function pushRecordatorioPronosticosSiProcede({
  temporada,
  jornada,
  cierrePronosticos,
}: {
  temporada: number;
  jornada: number;
  cierrePronosticos: string;
}) {
  const ahora = new Date();
  const cierre = new Date(cierrePronosticos);

  if (Number.isNaN(cierre.getTime())) {
    return {
      evaluado: false,
      motivo: "Fecha de cierre no válida",
      resultados: [],
    };
  }

  const inicioVentana = new Date(
    cierre.getTime() - 6 * 60 * 60 * 1000,
  );

  // Todavía faltan más de 6 horas.
  if (ahora < inicioVentana) {
    return {
      evaluado: false,
      motivo: "Todavía no estamos en la ventana de 6 horas",
      resultados: [],
    };
  }

  // La porra ya cerró.
  if (ahora >= cierre) {
    return {
      evaluado: false,
      motivo: "La porra ya está cerrada",
      resultados: [],
    };
  }

  const { data: partidos, error: partidosError } =
    await supabase
      .from("partidos")
      .select("id")
      .eq("temporada", temporada)
      .eq("jornada", jornada)
      .eq("tipo_competicion", "regular");

  if (partidosError) {
    throw new Error(
      `Error leyendo partidos para RECORDATORIO J${jornada}: ${partidosError.message}`,
    );
  }

  const idsPartidos = (partidos || []).map((p) => p.id);
  const totalPartidos = idsPartidos.length;

  if (totalPartidos === 0) {
    return {
      evaluado: false,
      motivo: "No hay partidos en la jornada",
      resultados: [],
    };
  }

  const { data: pronosticos, error: pronosticosError } =
    await supabase
      .from("pronosticos")
      .select("user_id, partido_id, eleccion")
      .in(
        "user_id",
        PARTICIPANTES_REDZONE.map((p) => p.id),
      )
      .in("partido_id", idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error leyendo pronósticos para RECORDATORIO J${jornada}: ${pronosticosError.message}`,
    );
  }

  const resultados: any[] = [];

  for (const participante of PARTICIPANTES_REDZONE) {
    const pronosticosUsuario =
      (pronosticos || []).filter(
        (p) =>
          p.user_id === participante.id &&
          p.eleccion !== null,
      );

    const completados = pronosticosUsuario.length;

    if (completados >= totalPartidos) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        completos: true,
        completados,
        total: totalPartidos,
        motivo: "Pronósticos completos",
      });

      continue;
    }

    const faltan = totalPartidos - completados;

    const resultado =
      await enviarPushRedzone({
        claveEvento:
          `recordatorio_pronosticos_${temporada}_j${jornada}_${participante.id}`,

        tipoEvento:
          PUSH_EVENTOS.RECORDATORIO_PRONOSTICOS,

        temporada,
        jornada,

        // IMPORTANTE:
        // este PUSH es exclusivamente para este participante.
        userId: participante.id,

        titulo:
          "⏰ ¡Que se te acaba el tiempo!",

        mensaje:
          `Te faltan pronósticos de la Jornada ${jornada}. La porra se cierra en unas 6 horas.`,

        url: "/",

        metadata: {
          evento: "recordatorio_pronosticos",
          nombre: participante.nombre,
          user_id: participante.id,
          completados,
          faltan,
          total_partidos: totalPartidos,
          cierre_pronosticos: cierre.toISOString(),
        },
      });

    resultados.push({
      nombre: participante.nombre,
      completados,
      faltan,
      total: totalPartidos,
      ...resultado,
    });
  }

  return {
    evaluado: true,
    jornada,
    cierrePronosticos: cierre.toISOString(),
    resultados,
  };
}
