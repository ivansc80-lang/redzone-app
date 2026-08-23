const ESPN_CORE =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";
const ESPN_BY_TEAM =
  "https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byteam";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

export type EspnTeamDefenseCategory =
  | "yardas_permitidas"
  | "capturas"
  | "entregas_def";

export interface EspnTeamDefenseLeader {
  posicion: number;
  teamId: string;
  nombre: string;
  equipo: string;
  GP: string;
  YDS: string;
  YDS_G: string;
  PASS: string;
  PASS_G: string;
  RUSH: string;
  RUSH_G: string;
  PTS: string;
  PTS_G: string;
  SACK: string;
  SACK_YDS: string;
  TFL: string;
  PD: string;
  INT: string;
  TAKE: string;
  GIVE: string;
  DIFF: string;
}

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

function getCategory(item: any, name: string, displayName: string) {
  return (item?.categories ?? []).find(
    (cat: any) =>
      cat?.name === name &&
      String(cat?.displayName ?? "").toLowerCase() ===
        displayName.toLowerCase(),
  );
}

function displayAt(category: any, index: number) {
  return String(category?.totals?.[index] ?? "");
}

function valueAt(category: any, index: number) {
  const value = Number(category?.values?.[index]);
  return Number.isFinite(value) ? value : 0;
}

function signed(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n > 0 ? `+${n}` : String(n);
}

async function getByTeamData(temporada: number, seasonType: number) {
  const params = new URLSearchParams({
    region: "us",
    lang: "en",
    contentorigin: "espn",
    isqualified: "false",
    page: "1",
    limit: "32",
    season: String(temporada),
    seasontype: String(seasonType),
  });

  return getJson(`${ESPN_BY_TEAM}?${params.toString()}`);
}

function baseFromItem(item: any) {
  const team = item?.team ?? {};
  const ownGeneral = getCategory(item, "general", "Own General");

  return {
    teamId: String(team?.id ?? ""),
    nombre: team?.displayName ?? team?.name ?? "",
    equipo: team?.abbreviation ?? "",
    GP: displayAt(ownGeneral, 0),
  };
}

async function getYardsAllowedLeaders(
  temporada: number,
  seasonType: number,
): Promise<EspnTeamDefenseLeader[]> {
  const data = await getByTeamData(temporada, seasonType);

  const equipos = (data?.teams ?? []).map((item: any) => {
    const base = baseFromItem(item);
    const opponentPassing = getCategory(item, "passing", "Opponent Passing");
    const opponentRushing = getCategory(item, "rushing", "Opponent Rushing");

    return {
      sortValue: valueAt(opponentPassing, 0),
      ...base,
      YDS: displayAt(opponentPassing, 0),
      YDS_G: displayAt(opponentPassing, 1),
      PASS: displayAt(opponentPassing, 7),
      PASS_G: displayAt(opponentPassing, 8),
      RUSH: displayAt(opponentRushing, 0),
      RUSH_G: displayAt(opponentRushing, 1),
      PTS: displayAt(opponentPassing, 4),
      PTS_G: displayAt(opponentPassing, 5),
      SACK: "",
      SACK_YDS: "",
      TFL: "",
      PD: "",
      INT: "",
      TAKE: "",
      GIVE: "",
      DIFF: "",
    };
  });

  return equipos
    .sort((a: any, b: any) => a.sortValue - b.sortValue)
    .map(({ sortValue: _sortValue, ...equipo }: any, index: number) => ({
      posicion: index + 1,
      ...equipo,
    }));
}

function extraerCoreStats(data: any) {
  const out: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const category = categoria?.name ?? "";

    for (const stat of categoria?.stats ?? []) {
      const name = stat?.name ?? "";
      const value = stat?.displayValue ?? "";
      out[`${category}:${name}`] = value;
    }
  }

  return out;
}

async function getSacksLeaders(
  temporada: number,
  seasonType: number,
): Promise<EspnTeamDefenseLeader[]> {
  const data = await getByTeamData(temporada, seasonType);

  const equipos = await Promise.all(
    (data?.teams ?? []).map(async (item: any) => {
      const base = baseFromItem(item);
      const core = await getJson(
        `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/teams/${base.teamId}/statistics?lang=en&region=us`,
      );
      const stats = extraerCoreStats(core);
      const sacksValue = Number(stats["defensive:sacks"] || 0);

      return {
        sortValue: Number.isFinite(sacksValue) ? sacksValue : 0,
        ...base,
        YDS: "",
        YDS_G: "",
        PASS: "",
        PASS_G: "",
        RUSH: "",
        RUSH_G: "",
        PTS: "",
        PTS_G: "",
        SACK: stats["defensive:sacks"] ?? "",
        SACK_YDS: stats["defensive:sackYards"] ?? "",
        TFL: stats["defensive:tacklesForLoss"] ?? "",
        PD: stats["defensive:passesDefended"] ?? "",
        INT: stats["defensiveinterceptions:interceptions"] ?? "",
        TAKE: "",
        GIVE: "",
        DIFF: "",
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

async function getTurnoverLeaders(
  temporada: number,
  seasonType: number,
): Promise<EspnTeamDefenseLeader[]> {
  const data = await getByTeamData(temporada, seasonType);

  const equipos = (data?.teams ?? []).map((item: any) => {
    const base = baseFromItem(item);
    const misc = getCategory(item, "miscellaneous", "Own Miscellaneous");
    const diff = displayAt(misc, 12);

    return {
      sortValue: valueAt(misc, 12),
      takeValue: valueAt(misc, 13),
      ...base,
      YDS: "",
      YDS_G: "",
      PASS: "",
      PASS_G: "",
      RUSH: "",
      RUSH_G: "",
      PTS: "",
      PTS_G: "",
      SACK: "",
      SACK_YDS: "",
      TFL: "",
      PD: "",
      INT: "",
      TAKE: displayAt(misc, 13),
      GIVE: displayAt(misc, 14),
      DIFF: signed(diff),
    };
  });

  return equipos
    .sort(
      (a: any, b: any) =>
        b.sortValue - a.sortValue || b.takeValue - a.takeValue,
    )
    .map(
      ({ sortValue: _sortValue, takeValue: _takeValue, ...equipo }: any, index: number) => ({
        posicion: index + 1,
        ...equipo,
      }),
    );
}

export async function getTeamDefenseLeaders(
  categoria: EspnTeamDefenseCategory,
  temporada = 2025,
  seasonType = 2,
): Promise<EspnTeamDefenseLeader[]> {
  if (categoria === "yardas_permitidas") {
    return getYardsAllowedLeaders(temporada, seasonType);
  }

  if (categoria === "capturas") {
    return getSacksLeaders(temporada, seasonType);
  }

  return getTurnoverLeaders(temporada, seasonType);
}
