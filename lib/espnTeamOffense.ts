const ESPN_CORE =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

export type EspnTeamOffenseCategory =
  | "yardas_totales"
  | "pasando"
  | "corriendo";

export interface EspnTeamOffenseLeader {
  posicion: number;
  teamId: string;
  nombre: string;
  equipo: string;
  GP: string;
  YDS: string;
  YDS_G: string;
  ATT: string;
  AVG: string;
  LNG: string;
  TD: string;
  INT: string;
  PTS: string;
  PASS: string;
  RUSH: string;
}

type StatEntry = {
  value: number;
  display: string;
};

type StatMap = Map<string, StatEntry>;

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

function statKey(category: string, name: string) {
  return `${category}:${name}`;
}

function extraerStats(data: any): StatMap {
  const stats = new Map<string, StatEntry>();

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name ?? "";

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name ?? "";
      const raw = stat?.value;
      const value = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      const display = stat?.displayValue ?? "";

      stats.set(statKey(nombreCategoria, nombre), { value, display });
    }
  }

  return stats;
}

function getDisplay(stats: StatMap, category: string, name: string) {
  return stats.get(statKey(category, name))?.display ?? "";
}

function getValue(stats: StatMap, category: string, name: string) {
  return stats.get(statKey(category, name))?.value ?? 0;
}

async function cargarEquipo(refItem: any) {
  const teamRef = https(refItem?.$ref ?? "");

  if (!teamRef) {
    throw new Error("ESPN devolvió un equipo sin referencia");
  }

  const team = await getJson(teamRef);
  const teamId = String(team?.id ?? "");

  if (!teamId) {
    throw new Error("ESPN devolvió un equipo sin id");
  }

  const statistics = await getJson(
    `${ESPN_CORE}/seasons/2025/types/2/teams/${teamId}/statistics?lang=en&region=us`,
  );

  return {
    teamId,
    nombre: team?.displayName ?? team?.name ?? "",
    equipo: team?.abbreviation ?? "",
    stats: extraerStats(statistics),
  };
}

export async function getTeamOffenseLeaders(
  categoria: EspnTeamOffenseCategory,
  temporada = 2025,
  seasonType = 2,
): Promise<EspnTeamOffenseLeader[]> {
  const teamsData = await getJson(
    `${ESPN_CORE}/seasons/${temporada}/teams?limit=32&lang=en&region=us`,
  );

  const refs = teamsData?.items ?? [];

  const equipos = await Promise.all(
    refs.map(async (refItem: any) => {
      const teamRef = https(refItem?.$ref ?? "");
      const team = await getJson(teamRef);
      const teamId = String(team?.id ?? "");

      const statistics = await getJson(
        `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/teams/${teamId}/statistics?lang=en&region=us`,
      );

      const stats = extraerStats(statistics);

      let sortValue = 0;

      if (categoria === "yardas_totales") {
        sortValue = getValue(stats, "passing", "totalYards");
      } else if (categoria === "pasando") {
        sortValue = getValue(stats, "passing", "passingYards");
      } else {
        sortValue = getValue(stats, "rushing", "rushingYards");
      }

      const totalYards = getDisplay(stats, "passing", "totalYards");
      const totalYardsPerGame = getDisplay(stats, "passing", "yardsPerGame");
      const passingYards = getDisplay(stats, "passing", "passingYards");
      const passingYardsPerGame = getDisplay(
        stats,
        "passing",
        "passingYardsPerGame",
      );
      const rushingYards = getDisplay(stats, "rushing", "rushingYards");
      const rushingYardsPerGame = getDisplay(
        stats,
        "rushing",
        "rushingYardsPerGame",
      );

      return {
        sortValue,
        teamId,
        nombre: team?.displayName ?? team?.name ?? "",
        equipo: team?.abbreviation ?? "",
        GP: getDisplay(stats, "general", "gamesPlayed"),
        YDS:
          categoria === "yardas_totales"
            ? totalYards
            : categoria === "pasando"
              ? passingYards
              : rushingYards,
        YDS_G:
          categoria === "yardas_totales"
            ? totalYardsPerGame
            : categoria === "pasando"
              ? passingYardsPerGame
              : rushingYardsPerGame,
        ATT:
          categoria === "pasando"
            ? getDisplay(stats, "passing", "passingAttempts")
            : categoria === "corriendo"
              ? getDisplay(stats, "rushing", "rushingAttempts")
              : "",
        AVG:
          categoria === "pasando"
            ? getDisplay(stats, "passing", "yardsPerPassAttempt")
            : categoria === "corriendo"
              ? getDisplay(stats, "rushing", "yardsPerRushAttempt")
              : "",
        LNG:
          categoria === "pasando"
            ? getDisplay(stats, "passing", "longPassing")
            : categoria === "corriendo"
              ? getDisplay(stats, "rushing", "longRushing")
              : "",
        TD:
          categoria === "pasando"
            ? getDisplay(stats, "passing", "passingTouchdowns")
            : categoria === "corriendo"
              ? getDisplay(stats, "rushing", "rushingTouchdowns")
              : getDisplay(stats, "passing", "totalTouchdowns"),
        INT:
          categoria === "pasando"
            ? getDisplay(stats, "passing", "interceptions")
            : "",
        PTS: getDisplay(stats, "passing", "totalPoints"),
        PASS: passingYards,
        RUSH: rushingYards,
      };
    }),
  );

  return equipos
    .sort((a: any, b: any) => b.sortValue - a.sortValue)
    .map(({ sortValue: _sortValue, ...equipo }: any, index: number) => ({
      posicion: index + 1,
      ...equipo,
    }));
}

export function getTeamTotalOffenseLeaders(
  temporada = 2025,
  seasonType = 2,
) {
  return getTeamOffenseLeaders("yardas_totales", temporada, seasonType);
}

export function getTeamPassingOffenseLeaders(
  temporada = 2025,
  seasonType = 2,
) {
  return getTeamOffenseLeaders("pasando", temporada, seasonType);
}

export function getTeamRushingOffenseLeaders(
  temporada = 2025,
  seasonType = 2,
) {
  return getTeamOffenseLeaders("corriendo", temporada, seasonType);
}
