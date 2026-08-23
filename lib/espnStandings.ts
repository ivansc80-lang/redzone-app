const ESPN_CORE =
  "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl";

const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

const NFL_DIVISION_MAP: Record<
  string,
  { conferencia: "AFC" | "NFC"; division: string }
> = {
  BUF: { conferencia: "AFC", division: "EAST" },
  MIA: { conferencia: "AFC", division: "EAST" },
  NE: { conferencia: "AFC", division: "EAST" },
  NYJ: { conferencia: "AFC", division: "EAST" },

  BAL: { conferencia: "AFC", division: "NORTH" },
  CIN: { conferencia: "AFC", division: "NORTH" },
  CLE: { conferencia: "AFC", division: "NORTH" },
  PIT: { conferencia: "AFC", division: "NORTH" },

  HOU: { conferencia: "AFC", division: "SOUTH" },
  IND: { conferencia: "AFC", division: "SOUTH" },
  JAX: { conferencia: "AFC", division: "SOUTH" },
  TEN: { conferencia: "AFC", division: "SOUTH" },

  DEN: { conferencia: "AFC", division: "WEST" },
  KC: { conferencia: "AFC", division: "WEST" },
  LV: { conferencia: "AFC", division: "WEST" },
  LAC: { conferencia: "AFC", division: "WEST" },

  DAL: { conferencia: "NFC", division: "EAST" },
  NYG: { conferencia: "NFC", division: "EAST" },
  PHI: { conferencia: "NFC", division: "EAST" },
  WSH: { conferencia: "NFC", division: "EAST" },

  CHI: { conferencia: "NFC", division: "NORTH" },
  DET: { conferencia: "NFC", division: "NORTH" },
  GB: { conferencia: "NFC", division: "NORTH" },
  MIN: { conferencia: "NFC", division: "NORTH" },

  ATL: { conferencia: "NFC", division: "SOUTH" },
  CAR: { conferencia: "NFC", division: "SOUTH" },
  NO: { conferencia: "NFC", division: "SOUTH" },
  TB: { conferencia: "NFC", division: "SOUTH" },

  ARI: { conferencia: "NFC", division: "WEST" },
  LAR: { conferencia: "NFC", division: "WEST" },
  SF: { conferencia: "NFC", division: "WEST" },
  SEA: { conferencia: "NFC", division: "WEST" },
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

function inferConferenceAndDivision(abbreviation: string) {
  const info = NFL_DIVISION_MAP[String(abbreviation).toUpperCase()];

  return {
    conferencia: info?.conferencia ?? "",
    division: info?.division ?? "",
  };
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

      const agrupacion = inferConferenceAndDivision(
        String(team?.abbreviation ?? ""),
      );

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
