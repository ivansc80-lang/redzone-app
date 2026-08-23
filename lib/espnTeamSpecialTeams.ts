const ESPN_BY_TEAM =
  "https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/statistics/byteam";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

export type EspnTeamSpecialTeamsCategory =
  | "devoluciones"
  | "pateando"
  | "despejes";

export interface EspnTeamSpecialTeamsLeader {
  posicion: number;
  teamId: string;
  nombre: string;
  equipo: string;
  GP: string;
  KR: string;
  KRYDS: string;
  KRAVG: string;
  KRLNG: string;
  KRTD: string;
  PR: string;
  PRYDS: string;
  PRAVG: string;
  PRLNG: string;
  PRTD: string;
  FC: string;
  FGM: string;
  FGA: string;
  FGPCT: string;
  FGLNG: string;
  FGM50: string;
  XPM: string;
  XPA: string;
  XPPCT: string;
  PUNTS: string;
  PYDS: string;
  PLNG: string;
  PAVG: string;
  PNET: string;
  PBLK: string;
  IN20: string;
  TB: string;
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

export async function getTeamSpecialTeamsLeaders(
  categoria: EspnTeamSpecialTeamsCategory,
  temporada = 2025,
  seasonType = 2,
): Promise<EspnTeamSpecialTeamsLeader[]> {
  const data = await getByTeamData(temporada, seasonType);

  const equipos = (data?.teams ?? []).map((item: any) => {
    const base = baseFromItem(item);
    const returning = getCategory(item, "returning", "Own Returning");
    const kicking = getCategory(item, "kicking", "Own Kicking");
    const punting = getCategory(item, "punting", "Own Punting");

    const sortValue =
      categoria === "devoluciones"
        ? valueAt(returning, 1)
        : categoria === "pateando"
          ? valueAt(kicking, 0)
          : valueAt(punting, 1);

    return {
      sortValue,
      ...base,
      KR: displayAt(returning, 0),
      KRYDS: displayAt(returning, 1),
      KRAVG: displayAt(returning, 2),
      KRLNG: displayAt(returning, 3),
      KRTD: displayAt(returning, 4),
      PR: displayAt(returning, 5),
      PRYDS: displayAt(returning, 6),
      PRAVG: displayAt(returning, 7),
      PRLNG: displayAt(returning, 8),
      PRTD: displayAt(returning, 9),
      FC: displayAt(returning, 10),
      FGM: displayAt(kicking, 0),
      FGA: displayAt(kicking, 1),
      FGPCT: displayAt(kicking, 2),
      FGLNG: displayAt(kicking, 3),
      FGM50: displayAt(kicking, 8),
      XPM: displayAt(kicking, 14),
      XPA: displayAt(kicking, 15),
      XPPCT: displayAt(kicking, 16),
      PUNTS: displayAt(punting, 0),
      PYDS: displayAt(punting, 1),
      PLNG: displayAt(punting, 2),
      PAVG: displayAt(punting, 3),
      PNET: displayAt(punting, 4),
      PBLK: displayAt(punting, 5),
      IN20: displayAt(punting, 6),
      TB: displayAt(punting, 7),
    };
  });

  return equipos
    .sort((a: any, b: any) => b.sortValue - a.sortValue)
    .map(({ sortValue: _sortValue, ...equipo }: any, index: number) => ({
      posicion: index + 1,
      ...equipo,
    }));
}
