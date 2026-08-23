const ESPN_SPECIAL_TEAMS =
  "https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byathlete";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

export type EspnSpecialTeamsCategory = "returning" | "kicking" | "punting";

export interface EspnSpecialTeamsLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;
  POS: string;
  categoria: EspnSpecialTeamsCategory;
  totals: string[];
  values: number[];
  ranks: string[];
}

const SORTS: Record<EspnSpecialTeamsCategory, string> = {
  returning: "returning.kickReturnYards:desc",
  kicking: "kicking.fieldGoalsMade:desc",
  punting: "punting.puntYards:desc",
};

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: ESPN_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ESPN API error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

function obtenerItems(data: any): any[] {
  if (Array.isArray(data?.athletes)) return data.athletes;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export async function getSpecialTeamsLeaders(
  categoria: EspnSpecialTeamsCategory,
  temporada = 2025,
  seasonType = 2,
): Promise<EspnSpecialTeamsLeader[]> {
  const params = new URLSearchParams({
    region: "us",
    lang: "en",
    contentorigin: "espn",
    isqualified: "false",
    page: "1",
    limit: "25",
    season: String(temporada),
    seasontype: String(seasonType),
    sort: SORTS[categoria],
  });

  const data = await getJson(`${ESPN_SPECIAL_TEAMS}?${params.toString()}`);
  const items = obtenerItems(data);

  return items.slice(0, 25).map((item: any, index: number) => {
    const athlete = item?.athlete ?? item;
    const statsCategory = (item?.categories ?? []).find(
      (cat: any) => cat?.name === categoria,
    );

    return {
      posicion: index + 1,
      athleteId: String(athlete?.id ?? ""),
      nombre: athlete?.displayName ?? athlete?.fullName ?? "",
      equipo: athlete?.teamShortName ?? athlete?.teamName ?? "",
      POS: athlete?.position?.abbreviation ?? athlete?.position?.name ?? "",
      categoria,
      totals: statsCategory?.totals ?? [],
      values: statsCategory?.values ?? [],
      ranks: statsCategory?.ranks ?? [],
    };
  });
}

export function getReturningLeaders(temporada = 2025, seasonType = 2) {
  return getSpecialTeamsLeaders("returning", temporada, seasonType);
}

export function getKickingLeaders(temporada = 2025, seasonType = 2) {
  return getSpecialTeamsLeaders("kicking", temporada, seasonType);
}

export function getPuntingLeaders(temporada = 2025, seasonType = 2) {
  return getSpecialTeamsLeaders("punting", temporada, seasonType);
}
