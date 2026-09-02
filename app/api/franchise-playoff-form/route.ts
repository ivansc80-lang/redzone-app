import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

const ESPN_SUMMARY =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

type Acumulado = {
  equipo: string;
  partidos: number;
  ofensiva: {
    YDS_G: number;
    PASS_G: number;
    RUSH_G: number;
    PTS_G: number;
    INT: number;
    SACKS_RECIBIDOS: number;
  };
  defensiva: {
    YDS_G: number;
    PASS_G: number;
    RUSH_G: number;
    PTS_G: number;
    INT: number;
    SACKS: number;
  };
  entregas: {
    PERDIDAS: number;
    RECUPERADAS: number;
    DIF: number;
  };
};

type Totales = {
  equipo: string;
  partidos: number;
  yds: number;
  pass: number;
  rush: number;
  pts: number;
  intLanzadas: number;
  sacksRecibidos: number;
  ydsPermitidas: number;
  passPermitido: number;
  rushPermitido: number;
  ptsPermitidos: number;
  intConseguidas: number;
  sacksConseguidos: number;
  perdidas: number;
  recuperadas: number;
};

function numero(valor: unknown) {
  const texto = String(valor ?? "").replace(/,/g, "").trim();
  const n = Number(texto);
  return Number.isFinite(n) ? n : 0;
}

function numeroSacks(valor: unknown) {
  const texto = String(valor ?? "").trim();
  const primeraParte = texto.split("-")[0];
  return numero(primeraParte);
}

function mapaStats(equipoBoxscore: any) {
  const mapa = new Map<string, string>();
  for (const stat of equipoBoxscore?.statistics ?? []) {
    mapa.set(String(stat?.name ?? ""), String(stat?.displayValue ?? stat?.value ?? ""));
  }
  return mapa;
}

function stat(mapa: Map<string, string>, ...nombres: string[]) {
  for (const nombre of nombres) {
    if (mapa.has(nombre)) return mapa.get(nombre) ?? "";
  }
  return "";
}

function redondearPorPartido(total: number, partidos: number) {
  return partidos > 0 ? Number((total / partidos).toFixed(1)) : 0;
}

function nuevoTotal(equipo: string): Totales {
  return {
    equipo,
    partidos: 0,
    yds: 0,
    pass: 0,
    rush: 0,
    pts: 0,
    intLanzadas: 0,
    sacksRecibidos: 0,
    ydsPermitidas: 0,
    passPermitido: 0,
    rushPermitido: 0,
    ptsPermitidos: 0,
    intConseguidas: 0,
    sacksConseguidos: 0,
    perdidas: 0,
    recuperadas: 0,
  };
}

function salida(total: Totales): Acumulado {
  return {
    equipo: total.equipo,
    partidos: total.partidos,
    ofensiva: {
      YDS_G: redondearPorPartido(total.yds, total.partidos),
      PASS_G: redondearPorPartido(total.pass, total.partidos),
      RUSH_G: redondearPorPartido(total.rush, total.partidos),
      PTS_G: redondearPorPartido(total.pts, total.partidos),
      INT: total.intLanzadas,
      SACKS_RECIBIDOS: total.sacksRecibidos,
    },
    defensiva: {
      YDS_G: redondearPorPartido(total.ydsPermitidas, total.partidos),
      PASS_G: redondearPorPartido(total.passPermitido, total.partidos),
      RUSH_G: redondearPorPartido(total.rushPermitido, total.partidos),
      PTS_G: redondearPorPartido(total.ptsPermitidos, total.partidos),
      INT: total.intConseguidas,
      SACKS: total.sacksConseguidos,
    },
    entregas: {
      PERDIDAS: total.perdidas,
      RECUPERADAS: total.recuperadas,
      DIF: total.recuperadas - total.perdidas,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const temporada = Number(request.nextUrl.searchParams.get("temporada") ?? "2025");
    const hastaJornada = Number(request.nextUrl.searchParams.get("hastaJornada") ?? "19");
    const equiposSolicitados = new Set(
      (request.nextUrl.searchParams.get("equipos") ?? "")
        .split(",")
        .map((e) => e.trim().toUpperCase())
        .filter(Boolean),
    );

    if (!Number.isFinite(temporada) || !Number.isFinite(hastaJornada)) {
      return NextResponse.json({ error: "Parámetros no válidos" }, { status: 400 });
    }

    if (hastaJornada <= 19) {
      return NextResponse.json([]);
    }

    const { data: partidos, error } = await supabase
      .from("partidos")
      .select(
        "id,jornada,equipo_local,equipo_visitante,puntos_local,puntos_visitante,espn_event_id",
      )
      .eq("temporada", temporada)
      .gte("jornada", 19)
      .lt("jornada", hastaJornada)
      .order("jornada", { ascending: true });

    if (error) {
      throw new Error(`No se pudieron cargar los playoffs: ${error.message}`);
    }

    const relevantes = (partidos ?? []).filter((p: any) => {
      if (equiposSolicitados.size === 0) return true;
      return (
        equiposSolicitados.has(String(p.equipo_local).toUpperCase()) ||
        equiposSolicitados.has(String(p.equipo_visitante).toUpperCase())
      );
    });

    const totales = new Map<string, Totales>();

    for (const partido of relevantes as any[]) {
      const eventId = String(partido.espn_event_id ?? "");
      if (!eventId) continue;

      const response = await fetch(`${ESPN_SUMMARY}?event=${encodeURIComponent(eventId)}`, {
        headers: ESPN_HEADERS,
        cache: "no-store",
      });

      if (!response.ok) continue;

      const resumen = await response.json();
      const boxTeams = resumen?.boxscore?.teams ?? [];

      const localCodigo = String(partido.equipo_local).toUpperCase();
      const visitanteCodigo = String(partido.equipo_visitante).toUpperCase();
      const localBox = boxTeams.find(
        (item: any) => String(item?.team?.abbreviation ?? "").toUpperCase() === localCodigo,
      );
      const visitanteBox = boxTeams.find(
        (item: any) => String(item?.team?.abbreviation ?? "").toUpperCase() === visitanteCodigo,
      );

      if (!localBox || !visitanteBox) continue;

      const procesar = (
        codigo: string,
        propioBox: any,
        rivalBox: any,
        puntosPropios: unknown,
        puntosRival: unknown,
      ) => {
        if (equiposSolicitados.size > 0 && !equiposSolicitados.has(codigo)) return;

        const propio = mapaStats(propioBox);
        const rival = mapaStats(rivalBox);
        const total = totales.get(codigo) ?? nuevoTotal(codigo);

        total.partidos += 1;
        total.yds += numero(stat(propio, "totalYards"));
        total.pass += numero(stat(propio, "netPassingYards", "passingYards"));
        total.rush += numero(stat(propio, "rushingYards"));
        total.pts += numero(puntosPropios);
        total.intLanzadas += numero(stat(propio, "interceptions"));
        total.sacksRecibidos += numeroSacks(stat(propio, "sacksYardsLost"));

        total.ydsPermitidas += numero(stat(rival, "totalYards"));
        total.passPermitido += numero(stat(rival, "netPassingYards", "passingYards"));
        total.rushPermitido += numero(stat(rival, "rushingYards"));
        total.ptsPermitidos += numero(puntosRival);
        total.intConseguidas += numero(stat(rival, "interceptions"));
        total.sacksConseguidos += numeroSacks(stat(rival, "sacksYardsLost"));

        total.perdidas += numero(stat(propio, "turnovers"));
        total.recuperadas += numero(stat(rival, "turnovers"));

        totales.set(codigo, total);
      };

      procesar(
        localCodigo,
        localBox,
        visitanteBox,
        partido.puntos_local,
        partido.puntos_visitante,
      );
      procesar(
        visitanteCodigo,
        visitanteBox,
        localBox,
        partido.puntos_visitante,
        partido.puntos_local,
      );
    }

    return NextResponse.json(Array.from(totales.values()).map(salida));
  } catch (error) {
    console.error("Error cargando forma acumulada de playoffs:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la forma acumulada de playoffs" },
      { status: 500 },
    );
  }
}
