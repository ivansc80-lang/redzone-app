const ESPN_CORE =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

export interface EspnStandingTeam {
  teamId: string;
  nombre: string;
  equipo: string;
  logo: string;
  conferencia: "AFC" | "NFC" | "";
  division: string;
  G: string;
  P: string;
  E: string;
  PCT: string;
  LOCAL: string;
  VIS: string;
  PA: string;
  PC: string;
}

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: ESPN_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ESPN ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

function statDisplay(stats: any[], name: string) {
  const stat = (stats ?? []).find((item: any) => item?.name === name);
  return String(stat?.displayValue ?? "");
}

function normalizeTeamRef(ref: string) {
  return ref.replace("http://", "https://");
}

async function getTeamDataFromRef(ref: string) {
  return getJson(normalizeTeamRef(ref));
}

async function getRecordSplits(
  teamId: string,
  season: number,
  seasonType: number,
) {
  const url =
    `${ESPN_CORE}/seasons/${season}/types/${seasonType}/teams/${teamId}/record` +
    `?lang=en&region=us`;

  const data = await getJson(url);
  const items = data?.items ?? [];

  const home = items.find((item: any) => item?.type === "home");
  const road = items.find((item: any) => item?.type === "road");

  return {
    LOCAL: String(home?.summary ?? ""),
    VIS: String(road?.summary ?? ""),
  };
}

function inferConferenceAndDivision(team: any) {
  const groups = team?.groups ?? team?.group ?? [];

  const textos: string[] = [];

  const collect = (obj: any) => {
    if (!obj) return;
    if (Array.isArray(obj)) {
      obj.forEach(collect);
      return;
    }
    if (typeof obj === "object") {
      for (const value of Object.values(obj)) collect(value);
      return;
    }
    if (typeof obj === "string") textos.push(obj);
  };

  collect(groups);

  const joined = textos.join(" ").toUpperCase();

  const conferencia: "AFC" | "NFC" | "" = joined.includes("AFC")
    ? "AFC"
    : joined.includes("NFC")
      ? "NFC"
      : "";

  let division = "";
  for (const nombre of ["EAST", "NORTH", "SOUTH", "WEST"]) {
    if (joined.includes(nombre)) {
      division = nombre;
      break;
    }
  }

  return { conferencia, division };
}

export async function getEspnStandings(
  season = 2025,
  seasonType = 2,
): Promise<EspnStandingTeam[]> {
  const standingsUrl =
    `${ESPN_CORE}/seasons/${season}/types/${seasonType}/groups/9/standings/2` +
    `?lang=en&region=us`;

  const data = await getJson(standingsUrl);
  const standings = data?.standings ?? [];

  const rows = await Promise.all(
    standings.map(async (entry: any) => {
      const overall = (entry?.records ?? []).find(
        (record: any) => record?.type === "total" || record?.name === "overall",
      );

      const stats = overall?.stats ?? [];
      const teamRef = String(entry?.team?.$ref ?? "");
      const team = teamRef ? await getTeamDataFromRef(teamRef) : {};
      const teamId = String(team?.id ?? "");

      const splits = teamId
        ? await getRecordSplits(teamId, season, seasonType)
        : { LOCAL: "", VIS: "" };

      const agrupacion = inferConferenceAndDivision(team);

      return {
        teamId,
        nombre: String(team?.displayName ?? team?.name ?? ""),
        equipo: String(team?.abbreviation ?? ""),
        logo: String(
          team?.logos?.[0]?.href ??
            `https://a.espncdn.com/i/teamlogos/nfl/500/${String(team?.abbreviation ?? "").toLowerCase()}.png`,
        ),
        conferencia: agrupacion.conferencia,
        division: agrupacion.division,
        G: statDisplay(stats, "wins"),
        P: statDisplay(stats, "losses"),
        E: statDisplay(stats, "ties"),
        PCT: statDisplay(stats, "winPercent"),
        LOCAL: splits.LOCAL,
        VIS: splits.VIS,
        PA: statDisplay(stats, "pointsFor"),
        PC: statDisplay(stats, "pointsAgainst"),
      } satisfies EspnStandingTeam;
    }),
  );

  return rows;
}
