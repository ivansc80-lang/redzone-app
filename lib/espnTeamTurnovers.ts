const ESPN_BY_TEAM =
  "https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byteam";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

export type EspnTeamTurnoversCategory =
  | "perdidos"
  | "recuperados"
  | "diferencial";

export interface EspnTeamTurnoversLeader {
  posicion: number;
  teamId: string;
  nombre: string;
  equipo: string;
  GP: string;
  GIVE: string;
  TAKE: string;
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

export async function getTeamTurnoversLeaders(
  categoria: EspnTeamTurnoversCategory,
  temporada = 2025,
  seasonType = 2,
): Promise<EspnTeamTurnoversLeader[]> {
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

  const data = await getJson(`${ESPN_BY_TEAM}?${params.toString()}`);

  const equipos = (data?.teams ?? []).map((item: any) => {
    const team = item?.team ?? {};
    const general = getCategory(item, "general", "Own General");
    const misc = getCategory(item, "miscellaneous", "Own Miscellaneous");

    const diffValue = valueAt(misc, 12);
    const takeValue = valueAt(misc, 13);
    const giveValue = valueAt(misc, 14);

    const sortValue =
      categoria === "perdidos"
        ? giveValue
        : categoria === "recuperados"
          ? takeValue
          : diffValue;

    return {
      sortValue,
      teamId: String(team?.id ?? ""),
      nombre: team?.displayName ?? team?.name ?? "",
      equipo: team?.abbreviation ?? "",
      GP: displayAt(general, 0),
      GIVE: displayAt(misc, 14),
      TAKE: displayAt(misc, 13),
      DIFF: signed(displayAt(misc, 12)),
    };
  });

  equipos.sort((a: any, b: any) => {
    if (categoria === "perdidos") {
      return a.sortValue - b.sortValue;
    }

    return b.sortValue - a.sortValue;
  });

  return equipos.map(
    ({ sortValue: _sortValue, ...equipo }: any, index: number) => ({
      posicion: index + 1,
      ...equipo,
    }),
  );
}
