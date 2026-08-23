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

// ============================================================
// CORRIENDO
// ============================================================

export interface EspnRushingLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  POS: string;
  GP: string;
  ATT: string;
  YDS: string;
  AVG: string;
  YDS_G: string;
  LNG: string;
  TD: string;
  FUM: string;
}

function extraerRushingStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general") {
        if (nombre === "gamesPlayed") {
          resultado.GP = valor;
        }

        if (nombre === "fumbles") {
          resultado.FUM = valor;
        }
      }

      if (nombreCategoria === "rushing") {
        const mapping: Record<string, string> = {
          rushingAttempts: "ATT",
          rushingYards: "YDS",
          yardsPerRushAttempt: "AVG",
          rushingYardsPerGame: "YDS_G",
          longRushing: "LNG",
          rushingTouchdowns: "TD",
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

export async function getRushingLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnRushingLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaRushing = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "rushingYards",
  );

  if (!categoriaRushing) {
    throw new Error("ESPN no devolvió la categoría rushingYards");
  }

  const leaders = categoriaRushing.leaders.slice(0, 25);

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

      const stats = extraerRushingStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),

        nombre: athlete?.displayName ?? athlete?.fullName ?? "",
        equipo: team?.abbreviation ?? "",
        POS: athlete?.position?.abbreviation ?? "",

        GP: stats.GP ?? "",
        ATT: stats.ATT ?? "",
        YDS: stats.YDS ?? "",
        AVG: stats.AVG ?? "",
        YDS_G: stats.YDS_G ?? "",
        LNG: stats.LNG ?? "",
        TD: stats.TD ?? "",
        FUM: stats.FUM ?? "",
      };
    }),
  );

  return jugadores;
}

export async function getRushingTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnRushingLeader[]> {
  const jugadores = await getRushingLeaders(temporada, seasonType);

  return jugadores.slice(0, 5);
}

// ============================================================
// RECIBIENDO
// ============================================================

export interface EspnReceivingLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  POS: string;
  GP: string;
  REC: string;
  TGTS: string;
  YDS: string;
  AVG: string;
  YDS_G: string;
  LNG: string;
  TD: string;
  FUM: string;
}

function extraerReceivingStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general") {
        if (nombre === "gamesPlayed") {
          resultado.GP = valor;
        }

        if (nombre === "fumbles") {
          resultado.FUM = valor;
        }
      }

      if (nombreCategoria === "receiving") {
        const mapping: Record<string, string> = {
          receptions: "REC",
          receivingTargets: "TGTS",
          receivingYards: "YDS",
          yardsPerReception: "AVG",
          receivingYardsPerGame: "YDS_G",
          longReception: "LNG",
          receivingTouchdowns: "TD",
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

export async function getReceivingLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnReceivingLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaReceiving = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "receivingYards",
  );

  if (!categoriaReceiving) {
    throw new Error("ESPN no devolvió la categoría receivingYards");
  }

  const leaders = categoriaReceiving.leaders.slice(0, 25);

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

      const stats = extraerReceivingStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),

        nombre: athlete?.displayName ?? athlete?.fullName ?? "",
        equipo: team?.abbreviation ?? "",
        POS: athlete?.position?.abbreviation ?? "",

        GP: stats.GP ?? "",
        REC: stats.REC ?? "",
        TGTS: stats.TGTS ?? "",
        YDS: stats.YDS ?? "",
        AVG: stats.AVG ?? "",
        YDS_G: stats.YDS_G ?? "",
        LNG: stats.LNG ?? "",
        TD: stats.TD ?? "",
        FUM: stats.FUM ?? "",
      };
    }),
  );

  return jugadores;
}

export async function getReceivingTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnReceivingLeader[]> {
  const jugadores = await getReceivingLeaders(temporada, seasonType);

  return jugadores.slice(0, 5);
}

// ============================================================
// DEFENSIVA - TACLEADAS
// ============================================================

export interface EspnTacklesLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  POS: string;
  GP: string;
  TOT: string;
  SOLO: string;
  AST: string;
  SACK: string;
  TFL: string;
  PD: string;
  INT: string;
  YDS_INT: string;
  LNG_INT: string;
  TD_INT: string;
  FF: string;
  FR: string;
}

function extraerTacklesStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general") {
        if (nombre === "fumblesForced") {
          resultado.FF = valor;
        }

        if (nombre === "fumblesRecovered") {
          resultado.FR = valor;
        }
      }

      if (nombreCategoria === "defensive") {
        const mapping: Record<string, string> = {
          teamGamesPlayed: "GP",
          totalTackles: "TOT",
          soloTackles: "SOLO",
          assistTackles: "AST",
          sacks: "SACK",
          tacklesForLoss: "TFL",
          passesDefended: "PD",
          longInterception: "LNG_INT",
        };

        const destino = mapping[nombre];

        if (destino) {
          resultado[destino] = valor;
        }
      }

      if (nombreCategoria === "defensiveInterceptions") {
        const mapping: Record<string, string> = {
          interceptions: "INT",
          interceptionYards: "YDS_INT",
          interceptionTouchdowns: "TD_INT",
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

export async function getTacklesLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnTacklesLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaTackles = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "totalTackles",
  );

  if (!categoriaTackles) {
    throw new Error("ESPN no devolvió la categoría totalTackles");
  }

  const leaders = categoriaTackles.leaders.slice(0, 25);

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

      const stats = extraerTacklesStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),

        nombre: athlete?.displayName ?? athlete?.fullName ?? "",
        equipo: team?.abbreviation ?? "",
        POS: athlete?.position?.abbreviation ?? "",

        GP: stats.GP ?? "",
        TOT: stats.TOT ?? "",
        SOLO: stats.SOLO ?? "",
        AST: stats.AST ?? "",
        SACK: stats.SACK ?? "",
        TFL: stats.TFL ?? "",
        PD: stats.PD ?? "",
        INT: stats.INT ?? "",
        YDS_INT: stats.YDS_INT ?? "",
        LNG_INT: stats.LNG_INT ?? "",
        TD_INT: stats.TD_INT ?? "",
        FF: stats.FF ?? "",
        FR: stats.FR ?? "",
      };
    }),
  );

  return jugadores;
}

export async function getTacklesTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnTacklesLeader[]> {
  const jugadores = await getTacklesLeaders(temporada, seasonType);

  return jugadores.slice(0, 5);
}

// ============================================================
// DEFENSIVA - CAPTURAS
// ============================================================

export interface EspnSacksLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  POS: string;
  GP: string;
  SACK: string;
  SCKYDS: string;
  QBH: string;
  TFL: string;
  SOLO: string;
  AST: string;
  TOT: string;
  FF: string;
  FR: string;
  PD: string;
}

function extraerSacksStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general") {
        if (nombre === "gamesPlayed") {
          resultado.GP = valor;
        }

        if (nombre === "fumblesForced") {
          resultado.FF = valor;
        }

        if (nombre === "fumblesRecovered") {
          resultado.FR = valor;
        }
      }

      if (nombreCategoria === "defensive") {
        const mapping: Record<string, string> = {
          sacks: "SACK",
          sackYards: "SCKYDS",
          QBHits: "QBH",
          tacklesForLoss: "TFL",
          soloTackles: "SOLO",
          assistTackles: "AST",
          totalTackles: "TOT",
          passesDefended: "PD",
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

export async function getSacksLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnSacksLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaSacks = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "sacks",
  );

  if (!categoriaSacks) {
    throw new Error("ESPN no devolvió la categoría sacks");
  }

  const leaders = categoriaSacks.leaders.slice(0, 25);

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

      const stats = extraerSacksStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),

        nombre: athlete?.displayName ?? athlete?.fullName ?? "",
        equipo: team?.abbreviation ?? "",
        POS: athlete?.position?.abbreviation ?? "",

        GP: stats.GP ?? "",
        SACK: stats.SACK ?? "",
        SCKYDS: stats.SCKYDS ?? "",
        QBH: stats.QBH ?? "",
        TFL: stats.TFL ?? "",
        SOLO: stats.SOLO ?? "",
        AST: stats.AST ?? "",
        TOT: stats.TOT ?? "",
        FF: stats.FF ?? "",
        FR: stats.FR ?? "",
        PD: stats.PD ?? "",
      };
    }),
  );

  return jugadores;
}

export async function getSacksTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnSacksLeader[]> {
  const jugadores = await getSacksLeaders(temporada, seasonType);

  return jugadores.slice(0, 5);
}

// ============================================================
// DEFENSIVA - INTERCEPCIONES
// ============================================================

export interface EspnInterceptionsLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  POS: string;
  GP: string;
  INT: string;
  YDS: string;
  LNG: string;
  TD: string;
  PD: string;
  SOLO: string;
  AST: string;
  TOT: string;
  SACK: string;
  FF: string;
  FR: string;
}

function extraerInterceptionsStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general") {
        if (nombre === "gamesPlayed") {
          resultado.GP = valor;
        }

        if (nombre === "fumblesForced") {
          resultado.FF = valor;
        }

        if (nombre === "fumblesRecovered") {
          resultado.FR = valor;
        }
      }

      if (nombreCategoria === "defensive") {
        const mapping: Record<string, string> = {
          longInterception: "LNG",
          passesDefended: "PD",
          soloTackles: "SOLO",
          assistTackles: "AST",
          totalTackles: "TOT",
          sacks: "SACK",
        };

        const destino = mapping[nombre];

        if (destino) {
          resultado[destino] = valor;
        }
      }

      if (nombreCategoria === "defensiveInterceptions") {
        const mapping: Record<string, string> = {
          interceptions: "INT",
          interceptionYards: "YDS",
          interceptionTouchdowns: "TD",
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

export async function getInterceptionsLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnInterceptionsLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaInterceptions = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "interceptions",
  );

  if (!categoriaInterceptions) {
    throw new Error("ESPN no devolvió la categoría interceptions");
  }

  const leaders = categoriaInterceptions.leaders.slice(0, 25);

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

      const stats = extraerInterceptionsStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),
        nombre: athlete?.displayName ?? athlete?.fullName ?? "",
        equipo: team?.abbreviation ?? "",
        POS: athlete?.position?.abbreviation ?? "",

        GP: stats.GP ?? "",
        INT: stats.INT ?? "",
        YDS: stats.YDS ?? "",
        LNG: stats.LNG ?? "",
        TD: stats.TD ?? "",
        PD: stats.PD ?? "",
        SOLO: stats.SOLO ?? "",
        AST: stats.AST ?? "",
        TOT: stats.TOT ?? "",
        SACK: stats.SACK ?? "",
        FF: stats.FF ?? "",
        FR: stats.FR ?? "",
      };
    }),
  );

  return jugadores;
}

export async function getInterceptionsTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnInterceptionsLeader[]> {
  const jugadores = await getInterceptionsLeaders(temporada, seasonType);
  return jugadores.slice(0, 5);
}

// ============================================================
// ANOTANDO - TOUCHDOWNS
// ============================================================

export interface EspnScoringTouchdownsLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  POS: string;
  GP: string;
  TD: string;
  RUSH: string;
  REC: string;
  RET: string;
  PTS: string;
  PTS_G: string;
  TWO_PT: string;
}

function extraerScoringTouchdownsStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general") {
        if (nombre === "gamesPlayed") {
          resultado.GP = valor;
        }
      }

      if (nombreCategoria === "scoring") {
        const mapping: Record<string, string> = {
          totalTouchdowns: "TD",
          rushingTouchdowns: "RUSH",
          receivingTouchdowns: "REC",
          returnTouchdowns: "RET",
          totalPoints: "PTS",
          totalPointsPerGame: "PTS_G",
          totalTwoPointConvs: "TWO_PT",
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

export async function getScoringTouchdownsLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnScoringTouchdownsLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaTouchdowns = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "totalTouchdowns",
  );

  if (!categoriaTouchdowns) {
    throw new Error("ESPN no devolvió la categoría totalTouchdowns");
  }

  const leaders = categoriaTouchdowns.leaders.slice(0, 25);

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

      const stats = extraerScoringTouchdownsStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),
        nombre: athlete?.displayName ?? athlete?.fullName ?? "",
        equipo: team?.abbreviation ?? "",
        POS: athlete?.position?.abbreviation ?? "",

        GP: stats.GP ?? "",
        TD: stats.TD ?? "",
        RUSH: stats.RUSH ?? "",
        REC: stats.REC ?? "",
        RET: stats.RET ?? "",
        PTS: stats.PTS ?? "",
        PTS_G: stats.PTS_G ?? "",
        TWO_PT: stats.TWO_PT ?? "",
      };
    }),
  );

  return jugadores;
}

export async function getScoringTouchdownsTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnScoringTouchdownsLeader[]> {
  const jugadores = await getScoringTouchdownsLeaders(temporada, seasonType);
  return jugadores.slice(0, 5);
}

// ============================================================
// ANOTANDO - PUNTOS
// ============================================================

export interface EspnScoringPointsLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  POS: string;
  GP: string;
  PTS: string;
  PTS_G: string;
  TD: string;
  RUSH: string;
  REC: string;
  RET: string;
  PAT: string;
  TWO_PT: string;
}

function extraerScoringPointsStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general") {
        if (nombre === "gamesPlayed") {
          resultado.GP = valor;
        }
      }

      if (nombreCategoria === "scoring") {
        const mapping: Record<string, string> = {
          totalPoints: "PTS",
          totalPointsPerGame: "PTS_G",
          totalTouchdowns: "TD",
          rushingTouchdowns: "RUSH",
          receivingTouchdowns: "REC",
          returnTouchdowns: "RET",
          kickExtraPointsMade: "PAT",
          totalTwoPointConvs: "TWO_PT",
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

export async function getScoringPointsLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnScoringPointsLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaPoints = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "totalPoints",
  );

  if (!categoriaPoints) {
    throw new Error("ESPN no devolvió la categoría totalPoints");
  }

  const leaders = categoriaPoints.leaders.slice(0, 25);

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

      const stats = extraerScoringPointsStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),
        nombre: athlete?.displayName ?? athlete?.fullName ?? "",
        equipo: team?.abbreviation ?? "",
        POS: athlete?.position?.abbreviation ?? "",

        GP: stats.GP ?? "",
        PTS: stats.PTS ?? "",
        PTS_G: stats.PTS_G ?? "",
        TD: stats.TD ?? "",
        RUSH: stats.RUSH ?? "",
        REC: stats.REC ?? "",
        RET: stats.RET ?? "",
        PAT: stats.PAT ?? "",
        TWO_PT: stats.TWO_PT ?? "",
      };
    }),
  );

  return jugadores;
}

export async function getScoringPointsTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnScoringPointsLeader[]> {
  const jugadores = await getScoringPointsLeaders(temporada, seasonType);
  return jugadores.slice(0, 5);
}

// ============================================================
// ANOTANDO - TD RECEPCIÓN
// ============================================================

export interface EspnReceivingTouchdownsLeader {
  posicion: number;
  athleteId: string;
  nombre: string;
  equipo: string;

  POS: string;
  GP: string;
  TD: string;
  REC: string;
  TGTS: string;
  YDS: string;
  YDS_G: string;
  AVG: string;
  LNG: string;
  PTS: string;
}

function extraerReceivingTouchdownsStats(data: any) {
  const resultado: Record<string, string> = {};

  for (const categoria of data?.splits?.categories ?? []) {
    const nombreCategoria = categoria?.name;

    for (const stat of categoria?.stats ?? []) {
      const nombre = stat?.name;
      const valor = stat?.displayValue ?? "";

      if (nombreCategoria === "general") {
        if (nombre === "gamesPlayed") {
          resultado.GP = valor;
        }
      }

      if (nombreCategoria === "receiving") {
        const mapping: Record<string, string> = {
          receivingTouchdowns: "TD",
          receptions: "REC",
          receivingTargets: "TGTS",
          receivingYards: "YDS",
          receivingYardsPerGame: "YDS_G",
          yardsPerReception: "AVG",
          longReception: "LNG",
        };

        const destino = mapping[nombre];

        if (destino) {
          resultado[destino] = valor;
        }
      }

      if (nombreCategoria === "scoring") {
        if (nombre === "totalPoints") {
          resultado.PTS = valor;
        }
      }
    }
  }

  return resultado;
}

export async function getReceivingTouchdownsLeaders(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnReceivingTouchdownsLeader[]> {
  const leadersUrl =
    `${ESPN_CORE}/seasons/${temporada}/types/${seasonType}/leaders` +
    "?lang=en&region=us";

  const leadersData = await getJson(leadersUrl);

  const categoriaReceivingTouchdowns = leadersData?.categories?.find(
    (categoria: any) => categoria?.name === "receivingTouchdowns",
  );

  if (!categoriaReceivingTouchdowns) {
    throw new Error("ESPN no devolvió la categoría receivingTouchdowns");
  }

  const leaders = categoriaReceivingTouchdowns.leaders.slice(0, 25);

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

      const stats = extraerReceivingTouchdownsStats(statistics);

      return {
        posicion: index + 1,
        athleteId: extraerAthleteId(athleteRef),
        nombre: athlete?.displayName ?? athlete?.fullName ?? "",
        equipo: team?.abbreviation ?? "",
        POS: athlete?.position?.abbreviation ?? "",

        GP: stats.GP ?? "",
        TD: stats.TD ?? "",
        REC: stats.REC ?? "",
        TGTS: stats.TGTS ?? "",
        YDS: stats.YDS ?? "",
        YDS_G: stats.YDS_G ?? "",
        AVG: stats.AVG ?? "",
        LNG: stats.LNG ?? "",
        PTS: stats.PTS ?? "",
      };
    }),
  );

  return jugadores;
}

export async function getReceivingTouchdownsTop5(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnReceivingTouchdownsLeader[]> {
  const jugadores = await getReceivingTouchdownsLeaders(temporada, seasonType);
  return jugadores.slice(0, 5);
}
