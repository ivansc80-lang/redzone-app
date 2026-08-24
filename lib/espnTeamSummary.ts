import { getTeamOffenseLeaders } from "@/lib/espnTeamOffense";
import { getTeamDefenseLeaders } from "@/lib/espnTeamDefense";
import { getTeamSpecialTeamsLeaders } from "@/lib/espnTeamSpecialTeams";
import { getTeamTurnoversLeaders } from "@/lib/espnTeamTurnovers";

interface TeamSummaryBase {
  posicion: number;
  teamId: string;
  nombre: string;
  equipo: string;
  GP: string;
}

export interface EspnTeamOffenseSummary extends TeamSummaryBase {
  TOTAL_YDS: string; TOTAL_YDS_G: string; PASS_YDS: string; PASS_YDS_G: string;
  RUSH_YDS: string; RUSH_YDS_G: string; PTS: string; PTS_G: string;
}

export interface EspnTeamDefenseSummary extends TeamSummaryBase {
  YDS: string; YDS_G: string; PASS: string; PASS_G: string;
  RUSH: string; RUSH_G: string; PTS: string; PTS_G: string;
}

export interface EspnTeamSpecialTeamsSummary extends TeamSummaryBase {
  KRYDS: string; KRAVG: string; KRTD: string; PRYDS: string; PRAVG: string; PRTD: string;
  FGM: string; FGA: string; FGPCT: string; XPM: string; PUNTS: string; PAVG: string; IN20: string;
}

export interface EspnTeamTurnoversSummary extends TeamSummaryBase {
  GIVE: string; TAKE: string; DIFF: string;
}

function toNumber(value: string) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function perGame(total: string, games: string) {
  const gamesNumber = toNumber(games);
  if (!gamesNumber) return "-";
  return (toNumber(total) / gamesNumber).toFixed(1);
}

export async function getTeamOffenseSummary(temporada=2025, seasonType=2): Promise<EspnTeamOffenseSummary[]> {
  const equipos=await getTeamOffenseLeaders("yardas_totales",temporada,seasonType);
  return equipos.map(e=>({posicion:e.posicion,teamId:e.teamId,nombre:e.nombre,equipo:e.equipo,GP:e.GP,
    TOTAL_YDS:e.YDS,TOTAL_YDS_G:e.YDS_G,PASS_YDS:e.PASS,PASS_YDS_G:perGame(e.PASS,e.GP),
    RUSH_YDS:e.RUSH,RUSH_YDS_G:perGame(e.RUSH,e.GP),PTS:e.PTS,PTS_G:perGame(e.PTS,e.GP)}));
}

export async function getTeamDefenseSummary(temporada=2025, seasonType=2): Promise<EspnTeamDefenseSummary[]> {
  const equipos=await getTeamDefenseLeaders("yardas_permitidas",temporada,seasonType);
  return equipos.map(e=>({posicion:e.posicion,teamId:e.teamId,nombre:e.nombre,equipo:e.equipo,GP:e.GP,
    YDS:e.YDS,YDS_G:e.YDS_G,PASS:e.PASS,PASS_G:e.PASS_G,RUSH:e.RUSH,RUSH_G:e.RUSH_G,PTS:e.PTS,PTS_G:e.PTS_G}));
}

export async function getTeamSpecialTeamsSummary(temporada=2025, seasonType=2): Promise<EspnTeamSpecialTeamsSummary[]> {
  const equipos=await getTeamSpecialTeamsLeaders("devoluciones",temporada,seasonType);
  return equipos.map(e=>({posicion:e.posicion,teamId:e.teamId,nombre:e.nombre,equipo:e.equipo,GP:e.GP,
    KRYDS:e.KRYDS,KRAVG:e.KRAVG,KRTD:e.KRTD,PRYDS:e.PRYDS,PRAVG:e.PRAVG,PRTD:e.PRTD,
    FGM:e.FGM,FGA:e.FGA,FGPCT:e.FGPCT,XPM:e.XPM,PUNTS:e.PUNTS,PAVG:e.PAVG,IN20:e.IN20}));
}

export async function getTeamTurnoversSummary(temporada=2025, seasonType=2): Promise<EspnTeamTurnoversSummary[]> {
  return getTeamTurnoversLeaders("diferencial",temporada,seasonType);
}
