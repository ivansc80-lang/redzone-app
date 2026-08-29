import { supabase } from "./supabaseClient";

export interface PartidoTemporada {
  id: string;
  temporada: number;
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
  tipo_competicion?: "regular" | "pretemporada_test" | "playoffs" | "superbowl";
  semana_competicion?: number | null;
  info_local?: { nombre: string; logo_url: string };
  info_visitante?: { nombre: string; logo_url: string };
}

async function obtenerContextoCompeticion() {
  const { data, error } = await supabase
    .from("app_config")
    .select(
      "temporada, jornada_actual, modo_pretemporada_test, modo_pretemporada_hasta, temporada_test, jornada_test_actual",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `No se pudo obtener el contexto de competición: ${error?.message ?? "app_config vacío"}`,
    );
  }

  const pretemporadaActiva = Boolean(data.modo_pretemporada_test);

  return {
    temporadaRegular: Number(data.temporada),
    jornadaRegular: Number(data.jornada_actual ?? 1),
    pretemporadaActiva,
    temporadaTest: Number(data.temporada_test ?? data.temporada),
    jornadaTestActual: Number(data.jornada_test_actual ?? 1),
  };
}

/**
 * Obtiene los partidos que debe mostrar la PWA.
 * Durante la prueba temporal devuelve la pretemporada real de ESPN.
 * Fuera de la prueba devuelve la jornada regular solicitada.
 */
export interface ContextoJornadaActiva {
  temporada: number;
  jornada: number;
  tipoCompeticion: "regular" | "pretemporada_test";
  estado: string;
  cierrePronosticos: string | null;
}

export async function getContextoJornadaActiva(): Promise<ContextoJornadaActiva> {
  const contexto = await obtenerContextoCompeticion();

  if (contexto.pretemporadaActiva) {
    const { data, error } = await supabase
      .from("jornadas_eventos_test")
      .select("estado, cierre_pronosticos")
      .eq("temporada", contexto.temporadaTest)
      .eq("jornada_test", contexto.jornadaTestActual)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Error al obtener contexto de jornada TEST: ${error.message}`,
      );
    }

    if (!data) {
      throw new Error(
        `No existe TEST ${contexto.jornadaTestActual} de ${contexto.temporadaTest}`,
      );
    }

    return {
      temporada: contexto.temporadaTest,
      jornada: contexto.jornadaTestActual,
      tipoCompeticion: "pretemporada_test",
      estado: data.estado || "pendiente",
      cierrePronosticos: data.cierre_pronosticos || null,
    };
  }

  const { data, error } = await supabase
    .from("jornadas_eventos")
    .select("estado, cierre_pronosticos")
    .eq("temporada", contexto.temporadaRegular)
    .eq("jornada", contexto.jornadaRegular)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error al obtener contexto de jornada regular: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      `No existe jornada ${contexto.jornadaRegular} de ${contexto.temporadaRegular}`,
    );
  }

  return {
    temporada: contexto.temporadaRegular,
    jornada: contexto.jornadaRegular,
    tipoCompeticion: "regular",
    estado: data.estado || "pendiente",
    cierrePronosticos: data.cierre_pronosticos || null,
  };
}

export async function getPartidosPorJornada(
  jornada: number,
): Promise<PartidoTemporada[]> {
  try {
    const contexto = await obtenerContextoCompeticion();

    let query = supabase
      .from("partidos")
      .select(
        `
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
      `,
      )
      .order("fecha_partido", { ascending: true });

    if (contexto.pretemporadaActiva) {
      if (jornada !== contexto.jornadaTestActual) {
        return [];
      }

      query = query
        .eq("temporada", contexto.temporadaTest)
        .eq("tipo_competicion", "pretemporada_test")
        .eq("jornada", contexto.jornadaTestActual);
    } else {
      query = query
        .eq("temporada", contexto.temporadaRegular)
        .eq("tipo_competicion", "regular")
        .eq("jornada", jornada);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        `Error al obtener los partidos de la jornada ${jornada}:`,
        error.message,
      );
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Excepción en getPartidosPorJornada:", err);
    return [];
  }
}

/**
 * Obtiene el calendario completo que debe mostrar EQUIPOS → GAMES.
 *
 * TEST:
 *   temporada_test + pretemporada_test → todas las jornadas TEST disponibles.
 *
 * COMPETICIÓN REAL:
 *   temporada activa → temporada regular + playoffs + Super Bowl.
 *
 * Esta consulta es independiente de PORRA/JORNADA, que continúan utilizando
 * getPartidosPorJornada() y por tanto solamente trabajan con la jornada activa.
 */
export async function getPartidosGames(): Promise<PartidoTemporada[]> {
  try {
    const contexto = await obtenerContextoCompeticion();

    let query = supabase
      .from("partidos")
      .select(
        `
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
      `,
      )
      .order("jornada", { ascending: true })
      .order("fecha_partido", { ascending: true });

    if (contexto.pretemporadaActiva) {
      query = query
        .eq("temporada", contexto.temporadaTest)
        .eq("tipo_competicion", "pretemporada_test");
    } else {
      query = query
        .eq("temporada", contexto.temporadaRegular)
        .in("tipo_competicion", ["regular", "playoffs", "superbowl"]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener partidos para GAMES:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Excepción en getPartidosGames:", err);
    return [];
  }
}

/**
 * Obtiene toda la temporada regular ignorando el modo temporal de pretemporada.
 * Se usa en FRANQUICIAS para mostrar las 18 jornadas completas.
 */
export async function getPartidosTemporadaRegularCompleta(): Promise<
  PartidoTemporada[]
> {
  try {
    const contexto = await obtenerContextoCompeticion();

    const { data, error } = await supabase
      .from("partidos")
      .select(
        `
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
      `,
      )
      .eq("temporada", contexto.temporadaRegular)
      .eq("tipo_competicion", "regular")
      .order("jornada", { ascending: true })
      .order("fecha_partido", { ascending: true });

    if (error) {
      console.error(
        "Error al obtener la temporada regular completa:",
        error.message,
      );
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Excepción en getPartidosTemporadaRegularCompleta:", err);
    return [];
  }
}

/**
 * Obtiene la información general de la temporada completa o resumen por jornadas.
 */
export async function getResumenTemporada() {
  const { data, error } = await supabase
    .from("temporada_regular")
    .select("jornada, fecha_partido, inicio_porra, inicio_jornada")
    .order("jornada", { ascending: true });

  if (error) {
    console.error(
      "Error al obtener el resumen de la temporada:",
      error.message,
    );
    return [];
  }

  return data || [];
}

/**
 * Obtiene los partidos de postemporada.
 * fase = 'playoffs' para Wild Card / Divisional / Conference
 * fase = 'superbowl' para la final.
 */
export async function getPartidosPostemporada(
  fase: "playoffs" | "superbowl",
  semanaCompeticion?: number,
): Promise<PartidoTemporada[]> {
  try {
    let query = supabase
      .from("partidos")
      .select(
        `
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
      `,
      )
      .eq("tipo_competicion", fase)
      .order("fecha_partido", { ascending: true });

    if (semanaCompeticion !== undefined) {
      query = query.eq("semana_competicion", semanaCompeticion);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error al obtener postemporada ${fase}:`, error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Excepción en getPartidosPostemporada:", err);
    return [];
  }
}
