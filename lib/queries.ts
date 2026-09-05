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
  tipo_competicion?: "regular" | "playoffs" | "superbowl";
  semana_competicion?: number | null;
  info_local?: { nombre: string; logo_url: string };
  info_visitante?: { nombre: string; logo_url: string };
}

type FaseActiva = "regular" | "playoffs" | "superbowl";

function normalizarFaseCompeticion(valor: unknown): FaseActiva {
  const fase = String(valor || "").toLowerCase();
  if (fase === "playoffs" || fase === "postseason") return "playoffs";
  if (fase === "superbowl" || fase === "super_bowl" || fase === "super bowl") {
    return "superbowl";
  }
  return "regular";
}

async function obtenerContextoCompeticion() {
  const { data, error } = await supabase
    .from("app_config")
    .select(
      "temporada, jornada_actual, fase_competicion, semana_postemporada",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `No se pudo obtener el contexto de competición: ${error?.message ?? "app_config vacío"}`,
    );
  }

  return {
    temporadaRegular: Number(data.temporada),
    jornadaRegular: Number(data.jornada_actual ?? 1),
    faseCompeticion: normalizarFaseCompeticion(data.fase_competicion),
    semanaPostemporada:
      data.semana_postemporada === null || data.semana_postemporada === undefined
        ? null
        : Number(data.semana_postemporada),
  };
}

async function obtenerFaseDeJornada(
  temporada: number,
  jornada: number,
  fallback: FaseActiva,
): Promise<FaseActiva> {
  const { data, error } = await supabase
    .from("jornadas_eventos")
    .select("fase_temporada")
    .eq("temporada", temporada)
    .eq("jornada", jornada)
    .maybeSingle();

  if (error) {
    console.warn(
      `No se pudo obtener fase_temporada de J${jornada}; se usa ${fallback}:`,
      error.message,
    );
    return fallback;
  }

  return data?.fase_temporada
    ? normalizarFaseCompeticion(data.fase_temporada)
    : fallback;
}

export interface ContextoJornadaActiva {
  temporada: number;
  jornada: number;
  tipoCompeticion: "regular" | "playoffs" | "superbowl";
  estado: string;
  cierrePronosticos: string | null;
}

export async function getContextoJornadaActiva(): Promise<ContextoJornadaActiva> {
  const contexto = await obtenerContextoCompeticion();


  const { data, error } = await supabase
    .from("jornadas_eventos")
    .select("estado, cierre_pronosticos, fase_temporada")
    .eq("temporada", contexto.temporadaRegular)
    .eq("jornada", contexto.jornadaRegular)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener contexto de jornada activa: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      `No existe jornada ${contexto.jornadaRegular} de ${contexto.temporadaRegular}`,
    );
  }

  return {
    temporada: contexto.temporadaRegular,
    jornada: contexto.jornadaRegular,
    tipoCompeticion: data.fase_temporada
      ? normalizarFaseCompeticion(data.fase_temporada)
      : contexto.faseCompeticion,
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

    const fallback =
      jornada === contexto.jornadaRegular ? contexto.faseCompeticion : "regular";
    const tipoCompeticion = await obtenerFaseDeJornada(
      contexto.temporadaRegular,
      jornada,
      fallback,
    );

    query = query
      .eq("temporada", contexto.temporadaRegular)
      .eq("tipo_competicion", tipoCompeticion)
      .eq("jornada", jornada);

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

export async function getPartidosGames(): Promise<PartidoTemporada[]> {
  try {
    const contexto = await obtenerContextoCompeticion();

    let temporadaGames = contexto.temporadaRegular;

    const { data: jornadasDisponibles, error: jornadasError } = await supabase
      .from("jornadas_eventos")
      .select("temporada")
      .eq("fase_temporada", "regular")
      .order("temporada", { ascending: false })
      .limit(1);

    if (!jornadasError && jornadasDisponibles?.length) {
      const temporadaMasAlta = Number(jornadasDisponibles[0].temporada);

      if (Number.isInteger(temporadaMasAlta)) {
        temporadaGames = temporadaMasAlta;
      }
    }

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

    query = query
      .eq("temporada", temporadaGames)
      .in("tipo_competicion", ["regular", "playoffs", "superbowl"]);

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

export async function getResumenTemporada() {
  const { data, error } = await supabase
    .from("temporada_regular")
    .select("jornada, fecha_partido, inicio_porra, inicio_jornada")
    .order("jornada", { ascending: true });

  if (error) {
    console.error("Error al obtener el resumen de la temporada:", error.message);
    return [];
  }

  return data || [];
}

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
