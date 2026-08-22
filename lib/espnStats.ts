// ============================================================
// ESPN STATS - REDZONE
// Datos reales de estadísticas NFL desde ESPN Core API
// ============================================================

const ESPN_CORE =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
};

// ------------------------------------------------------------
// TIPOS
// ------------------------------------------------------------

export interface EspnPassingLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  GP: string;
  CMP: string;
  ATT: string;
  CMP_PCT: string;
  YDS: string;
  AVG: string;
  YDS_G: string;
  LNG: string;
  TD: string;
  INT: string;
  SACK: string;
  SYL: string;
  QBR: string;
  RTG: string;
}

// ------------------------------------------------------------
// UTILIDADES
// ------------------------------------------------------------

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: ESPN_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `ESPN API error ${response.status}: ${response.statusText}`,
    );
  }

  return response.json();
}

function https(url: string) {
  return url.replace("http://", "https://");
}

function extraerAthleteId(ref: string) {
  const match = ref.match(/\/athletes\/(\d+)/);
  return match?.[1] ?? "";
}

// ------------------------------------------------------------
// EXTRAER ESTADÍSTICAS DE PASANDO
// ------------------------------------------------------------

function extraerPassingStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general" && nombre === "gamesPlayed") {
        resultado.GP = valor;
      }

      if (nombreCategoria === "passing") {
        const mapping: Record<string, string> = {
          completions: "CMP",
          passingAttempts: "ATT",
          completionPct: "CMP_PCT",
          passingYards: "YDS",
          yardsPerPassAttempt: "AVG",
          passingYardsPerGame: "YDS_G",
          longPassing: "LNG",
          passingTouchdowns: "TD",
          interceptions: "INT",
          sacks: "SACK",
          sackYardsLost: "SYL",
          QBR: "QBR",
          QBRating: "RTG",
        };

        const destino = mapping[nombre];

        if (destino) {
          resultado[destino] = valor;
        }
      }
    }
  }

  return resultado;
}

// ------------------------------------------------------------
// PASANDO - 25 LÍDERES NFL
// ------------------------------------------------------------

export async function getPassingLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnPassingLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaPassing = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "passingYards",
  );

  if (!categoriaPassing) {
    throw new Error("ESPN no devolvió la categoría passingYards");
  }

  // ESPN devuelve 25 líderes.
  const leaders = categoriaPassing.leaders.slice(0, 25);

  const jugadores = await Promise.all(
    leaders.map(async (leader: any, index: number) => {
      const athleteRef = https(leader.athlete.$ref);
      const teamRef = https(leader.team.$ref);
      const statisticsRef = https(leader.statistics.$ref);

      const [athlete, team, statistics] = await Promise.all([
        getJson(athleteRef),
        getJson(teamRef),
        getJson(statisticsRef),
      ]);

      const stats = extraerPassingStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),

        nombre: athlete?.displayName ?? athlete?.fullName ?? "",

        equipo: team?.abbreviation ?? "",

        GP: stats.GP ?? "",
        CMP: stats.CMP ?? "",
        ATT: stats.ATT ?? "",
        CMP_PCT: stats.CMP_PCT ?? "",
        YDS: stats.YDS ?? "",
        AVG: stats.AVG ?? "",
        YDS_G: stats.YDS_G ?? "",
        LNG: stats.LNG ?? "",
        TD: stats.TD ?? "",
        INT: stats.INT ?? "",
        SACK: stats.SACK ?? "",
        SYL: stats.SYL ?? "",
        QBR: stats.QBR ?? "",
        RTG: stats.RTG ?? "",
      };
    }),
  );

  return jugadores;
}

// ------------------------------------------------------------
// TOP 5 PASANDO
// ------------------------------------------------------------

export async function getPassingTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnPassingLeader[]> {
  const jugadores = await getPassingLeaders(temporada, seasonType);

  return jugadores.slice(0, 5);
}
