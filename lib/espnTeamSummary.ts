import { getTeamOffenseLeaders } from "@/lib/espnTeamOffense";

export interface EspnTeamOffenseSummary {
  posicion: number;
  teamId: string;
  nombre: string;
  equipo: string;
  GP: string;
  TOTAL_YDS: string;
  TOTAL_YDS_G: string;
  PASS_YDS: string;
  PASS_YDS_G: string;
  RUSH_YDS: string;
  RUSH_YDS_G: string;
  PTS: string;
  PTS_G: string;
}

function toNumber(value: string) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function perGame(total: string, games: string) {
  const totalNumber = toNumber(total);
  const gamesNumber = toNumber(games);

  if (!gamesNumber) return "-";

  return (totalNumber / gamesNumber).toFixed(1);
}

export async function getTeamOffenseSummary(
  temporada = 2025,
  seasonType = 2,
): Promise<EspnTeamOffenseSummary[]> {
  const equipos = await getTeamOffenseLeaders(
    "yardas_totales",
    temporada,
    seasonType,
  );

  return equipos.map((equipo) => ({
    posicion: equipo.posicion,
    teamId: equipo.teamId,
    nombre: equipo.nombre,
    equipo: equipo.equipo,
    GP: equipo.GP,
    TOTAL_YDS: equipo.YDS,
    TOTAL_YDS_G: equipo.YDS_G,
    PASS_YDS: equipo.PASS,
    PASS_YDS_G: perGame(equipo.PASS, equipo.GP),
    RUSH_YDS: equipo.RUSH,
    RUSH_YDS_G: perGame(equipo.RUSH, equipo.GP),
    PTS: equipo.PTS,
    PTS_G: perGame(equipo.PTS, equipo.GP),
  }));
}
