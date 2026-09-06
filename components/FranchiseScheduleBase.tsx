"use client";

import { useEffect, useState } from "react";
import {
  getContextoJornadaActiva,
  getPartidosGames,
  type PartidoTemporada,
} from "@/lib/queries";
import type {
  EspnTeamDefenseSummary,
  EspnTeamOffenseSummary,
  EspnTeamTurnoversSummary,
} from "@/lib/espnTeamSummary";
import {
  FranchisePlayoffComparison,
  type PlayoffForm,
} from "@/components/FranchisePlayoffExtension";

type Props = { teamId: string; temporada: number };

type PartidoFranquicia = PartidoTemporada & {
  rivalLocal: boolean;
};

function formatearFecha(fecha: string) {
  const d = new Date(fecha);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export default function FranchiseSchedule({ teamId, temporada }: Props) {
  const [partidos, setPartidos] = useState<PartidoFranquicia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ofensiva, setOfensiva] = useState<EspnTeamOffenseSummary[]>([]);
  const [defensiva, setDefensiva] = useState<EspnTeamDefenseSummary[]>([]);
  const [entregas, setEntregas] = useState<EspnTeamTurnoversSummary[]>([]);
  const [proximoPartido, setProximoPartido] = useState<PartidoFranquicia | null>(null);
  const [playoffForm, setPlayoffForm] = useState<PlayoffForm[]>([]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setPlayoffForm([]);

      const [contexto, temporadaCompleta, offenseRes, defenseRes, turnoversRes] =
        await Promise.all([
          getContextoJornadaActiva(),
          getPartidosGames(),
          fetch(
            `/api/espn-team-stats/summary/offense?temporada=${temporada}&seasonType=2`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/espn-team-stats/summary/defense?temporada=${temporada}&seasonType=2`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/espn-team-stats/summary/turnovers?temporada=${temporada}&seasonType=2`,
            { cache: "no-store" },
          ),
        ]);

      const [offenseData, defenseData, turnoversData] = await Promise.all([
        offenseRes.ok ? offenseRes.json() : Promise.resolve([]),
        defenseRes.ok ? defenseRes.json() : Promise.resolve([]),
        turnoversRes.ok ? turnoversRes.json() : Promise.resolve([]),
      ]);

      const equipo = teamId.toUpperCase();
      const delEquipo = temporadaCompleta
        .filter(
          (p) =>
            p.equipo_local.toUpperCase() === equipo ||
            p.equipo_visitante.toUpperCase() === equipo,
        )
        .map((p) => ({
          ...p,
          rivalLocal: p.equipo_local.toUpperCase() === equipo,
        }))
        .sort((a, b) => a.jornada - b.jornada);

      const partidoJornadaActual = delEquipo.find(
        (p) => p.jornada === contexto.jornada,
      );

      const siguiente =
        partidoJornadaActual && contexto.estado !== "finalizada"
          ? partidoJornadaActual
          : delEquipo.find((p) => p.jornada > contexto.jornada) ?? null;

      let formaPlayoff: PlayoffForm[] = [];

      // En Wild Card todavía no hay partidos de playoff previos que acumular.
      // Desde Divisional en adelante usamos únicamente las rondas ya jugadas.
      if (siguiente && siguiente.jornada >= 20) {
        const response = await fetch(
          `/api/franchise-playoff-form?temporada=${contexto.temporada}&hastaJornada=${siguiente.jornada}&equipos=${encodeURIComponent(
            `${siguiente.equipo_local},${siguiente.equipo_visitante}`,
          )}`,
          { cache: "no-store" },
        );

        if (response.ok) {
          formaPlayoff = (await response.json()) as PlayoffForm[];
        }
      }

      if (!cancelado) {
        setPartidos(delEquipo);
        setProximoPartido(siguiente);
        setPlayoffForm(formaPlayoff);
        setOfensiva(offenseData as EspnTeamOffenseSummary[]);
        setDefensiva(defenseData as EspnTeamDefenseSummary[]);
        setEntregas(turnoversData as EspnTeamTurnoversSummary[]);
        setCargando(false);
      }
    }

    cargar().catch((error) => {
      console.error("Error cargando HOME de franquicia:", error);
      if (!cancelado) {
        setProximoPartido(null);
        setPlayoffForm([]);
        setCargando(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [teamId, temporada]);

  const buscarOfensiva = (equipo: string) =>
    ofensiva.find((item) => item.equipo.toUpperCase() === equipo.toUpperCase()) ?? null;

  const buscarDefensiva = (equipo: string) =>
    defensiva.find((item) => item.equipo.toUpperCase() === equipo.toUpperCase()) ?? null;

  const buscarEntregas = (equipo: string) =>
    entregas.find((item) => item.equipo.toUpperCase() === equipo.toUpperCase()) ?? null;

  const buscarPlayoffForm = (equipo: string) =>
    playoffForm.find((item) => item.equipo.toUpperCase() === equipo.toUpperCase()) ?? null;

  const numero = (valor?: string | null) => {
    const n = Number(String(valor ?? "").replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  };

  const rankingOfensivo = (
    equipo: string,
    campo: "TOTAL_YDS_G" | "PASS_YDS_G" | "RUSH_YDS_G" | "PTS_G",
  ) => {
    const orden = ofensiva
      .map((item) => ({ equipo: item.equipo, valor: numero(item[campo]) }))
      .filter((item): item is { equipo: string; valor: number } => item.valor !== null)
      .sort((a, b) => b.valor - a.valor);
    const index = orden.findIndex((item) => item.equipo.toUpperCase() === equipo.toUpperCase());
    return index >= 0 ? index + 1 : null;
  };

  const rankingDefensivo = (
    equipo: string,
    campo: "YDS_G" | "PASS_G" | "RUSH_G" | "PTS_G",
  ) => {
    const orden = defensiva
      .map((item) => ({ equipo: item.equipo, valor: numero(item[campo]) }))
      .filter((item): item is { equipo: string; valor: number } => item.valor !== null)
      .sort((a, b) => a.valor - b.valor);
    const index = orden.findIndex((item) => item.equipo.toUpperCase() === equipo.toUpperCase());
    return index >= 0 ? index + 1 : null;
  };

  // ENTREGAS — rankings comparativos.
  // GIVE: menos pérdidas = mejor.
  // TAKE: más recuperaciones = mejor.
  // DIFF: usamos directamente la posición recibida desde STATS.
  const rankingEntregas = (
    equipo: string,
    campo: "GIVE" | "TAKE",
  ) => {
    const orden = entregas
      .map((item) => ({
        equipo: item.equipo,
        valor: numero(item[campo]),
      }))
      .filter(
        (item): item is { equipo: string; valor: number } =>
          item.valor !== null,
      )
      .sort((a, b) =>
        campo === "GIVE"
          ? a.valor - b.valor
          : b.valor - a.valor,
      );

    const index = orden.findIndex(
      (item) => item.equipo.toUpperCase() === equipo.toUpperCase(),
    );

    return index >= 0 ? index + 1 : null;
  };

  const rankingDiferencialEntregas = (equipo: string) => {
    const item = buscarEntregas(equipo);
    const ranking = Number(item?.posicion);

    return Number.isFinite(ranking) && ranking > 0
      ? ranking
      : null;
  };

  const ordinal = (ranking: number | null) => (ranking ? `${ranking}º` : "-");

  // PRÓXIMO PARTIDO — comparación visual directa de rankings.
  // Menor RK = mejor posición.
  // Mejor -> verde | Peor -> rojo | Empate -> naranja.
  const colorRankingComparado = (
    rankingPropio: number | null,
    rankingRival: number | null,
  ) => {
    if (rankingPropio === null || rankingRival === null) {
      return "text-zinc-500";
    }

    if (rankingPropio === rankingRival) {
      return "text-[#FBBF24]";
    }

    return rankingPropio < rankingRival
      ? "text-[#10B981]"
      : "text-[#E00000]";
  };

  const resumenComparacion = proximoPartido
    ? {
        local: {
          codigo: proximoPartido.equipo_local,
          nombre: proximoPartido.info_local?.nombre ?? proximoPartido.equipo_local,
          logo:
            proximoPartido.info_local?.logo_url ??
            `https://a.espncdn.com/i/teamlogos/nfl/500/${proximoPartido.equipo_local.toLowerCase()}.png`,
          ofensiva: buscarOfensiva(proximoPartido.equipo_local),
          defensiva: buscarDefensiva(proximoPartido.equipo_local),
          entregas: buscarEntregas(proximoPartido.equipo_local),
        },
        visitante: {
          codigo: proximoPartido.equipo_visitante,
          nombre:
            proximoPartido.info_visitante?.nombre ?? proximoPartido.equipo_visitante,
          logo:
            proximoPartido.info_visitante?.logo_url ??
            `https://a.espncdn.com/i/teamlogos/nfl/500/${proximoPartido.equipo_visitante.toLowerCase()}.png`,
          ofensiva: buscarOfensiva(proximoPartido.equipo_visitante),
          defensiva: buscarDefensiva(proximoPartido.equipo_visitante),
          entregas: buscarEntregas(proximoPartido.equipo_visitante),
        },
      }
    : null;

  return (
    <div className="mt-10 border-t border-zinc-200 pt-7">
      <div className="grid items-stretch gap-8 lg:grid-cols-2">
        <div className="flex h-full flex-col">
          <div className="mb-3 border-b-2 border-red-700 pb-2">
            <h3 className="font-['Orbitron'] text-xs font-black uppercase text-red-700 md:text-sm">
              Calendario
            </h3>
          </div>
          {cargando ? (
            <div className="py-8 text-center text-xs font-semibold text-zinc-500">
              Cargando calendario...
            </div>
          ) : (
            <div className="-ml-2 mr-2 flex-1 overflow-hidden rounded-xl border border-zinc-200 sm:ml-0 sm:mr-0">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((jornada) => {
                const partido = partidos.find((p) => p.jornada === jornada);

                if (!partido) {
                  return (
                    <div
                      key={jornada}
                      className="grid min-h-[58px] grid-cols-[76px_1fr] items-center border-b border-zinc-200 px-3 last:border-b-0"
                    >
                      <div className="font-['Orbitron'] text-[9px] font-black uppercase text-zinc-500">
                        Jornada {jornada}
                      </div>
                      <div className="text-xs font-bold uppercase text-zinc-400">
                        Descanso
                      </div>
                    </div>
                  );
                }

                const local = partido.info_local ?? {
                  nombre: partido.equipo_local,
                  logo_url: `https://a.espncdn.com/i/teamlogos/nfl/500/${partido.equipo_local.toLowerCase()}.png`,
                };
                const visitante = partido.info_visitante ?? {
                  nombre: partido.equipo_visitante,
                  logo_url: `https://a.espncdn.com/i/teamlogos/nfl/500/${partido.equipo_visitante.toLowerCase()}.png`,
                };

                return (
                  <div
                    key={partido.id}
                    className="grid min-h-[66px] grid-cols-[76px_1fr_auto] items-center gap-2 border-b border-zinc-200 px-3 py-2 last:border-b-0"
                  >
                    <div className="font-['Orbitron'] text-[9px] font-black uppercase text-zinc-500">
                      Jornada {jornada}
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <img src={local.logo_url} alt="" className="h-7 w-7 shrink-0 object-contain" />
                        <span className="truncate text-[11px] font-bold text-[#002244]">{local.nombre}</span>
                      </div>
                      <span className="shrink-0 font-['Orbitron'] text-[9px] font-black text-red-700">VS</span>
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                        <span className="truncate text-right text-[11px] font-bold text-[#002244]">{visitante.nombre}</span>
                        <img src={visitante.logo_url} alt="" className="h-7 w-7 shrink-0 object-contain" />
                      </div>
                    </div>

                    <div className="whitespace-nowrap pl-2 text-right text-[9px] font-semibold capitalize text-zinc-500">
                      {formatearFecha(partido.fecha_partido)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-3 border-b-2 border-red-700 pb-2">
            <h4 className="font-['Orbitron'] text-xs font-black uppercase text-red-700 md:text-sm">
              Próximo partido
            </h4>
          </div>

          {!resumenComparacion || !proximoPartido ? (
            <div className="rounded-xl border border-zinc-200 py-10 text-center text-xs font-semibold text-zinc-500">
              No hay próximo partido disponible.
            </div>
          ) : (
            <div className="-ml-2 mr-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 sm:ml-0 sm:mr-0">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 bg-zinc-50 px-6 py-7">
                <div className="flex items-center gap-3">
                  <img src={resumenComparacion.local.logo} alt="" className="h-14 w-14 object-contain" />
                  <div>
                    <div className="text-base font-black text-[#002244]">{resumenComparacion.local.nombre}</div>
                    <div className="text-[9px] font-semibold uppercase text-zinc-400">Local</div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="font-['Orbitron'] text-xs font-black text-red-700">VS</div>
                  <div className="mt-1 text-[9px] font-semibold capitalize text-zinc-500">
                    {formatearFecha(proximoPartido.fecha_partido)}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 text-right">
                  <div>
                    <div className="text-base font-black text-[#002244]">{resumenComparacion.visitante.nombre}</div>
                    <div className="text-[9px] font-semibold uppercase text-zinc-400">Visitante</div>
                  </div>
                  <img src={resumenComparacion.visitante.logo} alt="" className="h-14 w-14 object-contain" />
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-rows-2 gap-5 px-2 py-5 sm:p-5">
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-center font-['Orbitron'] text-[11px] font-black uppercase text-[#002244] md:text-xs">
                    Ataque {resumenComparacion.local.nombre} vs defensa {resumenComparacion.visitante.nombre}
                  </div>

                  <div className="grid flex-1 grid-cols-[minmax(0,1fr)_32px_minmax(64px,0.8fr)_minmax(0,1fr)_32px] items-center gap-x-1 gap-y-4 px-2 py-5 text-[10px] sm:grid-cols-[minmax(70px,1fr)_40px_minmax(76px,0.8fr)_minmax(70px,1fr)_40px] sm:gap-x-2 sm:px-3 sm:text-[11px] md:grid-cols-[minmax(110px,1fr)_55px_minmax(110px,0.8fr)_minmax(110px,1fr)_55px] md:gap-x-5 md:px-4 md:text-[13px]">
                    <span className="text-center font-black text-red-700">ATAQUE</span>
                    <span className="text-center font-black text-zinc-500">RK</span>
                    <span className="text-center font-black text-zinc-500">MÉTRICA</span>
                    <span className="text-center font-black text-[#002244]">DEFENSA</span>
                    <span className="text-center font-black text-zinc-500">RK</span>

                    {[
                      ["TOTAL_YDS_G", "YDS_G", "YDS/G"],
                      ["PASS_YDS_G", "PASS_G", "PASE/G"],
                      ["RUSH_YDS_G", "RUSH_G", "CARRERA/G"],
                      ["PTS_G", "PTS_G", "PTS/G"],
                    ].map(([campoAtaque, campoDefensa, etiqueta]) => {
                      const rkAtaque = rankingOfensivo(
                        resumenComparacion.local.codigo,
                        campoAtaque as "TOTAL_YDS_G" | "PASS_YDS_G" | "RUSH_YDS_G" | "PTS_G",
                      );
                      const rkDefensa = rankingDefensivo(
                        resumenComparacion.visitante.codigo,
                        campoDefensa as "YDS_G" | "PASS_G" | "RUSH_G" | "PTS_G",
                      );
                      return (
                        <div key={etiqueta} className="contents">
                          <span className="text-center font-bold">
                            {resumenComparacion.local.ofensiva?.[
                              campoAtaque as keyof EspnTeamOffenseSummary
                            ] ?? "-"}
                          </span>
                          <span className={`text-center font-black ${colorRankingComparado(rkAtaque, rkDefensa)}`}>
                            {ordinal(rkAtaque)}
                          </span>
                          <span className="text-center font-bold text-zinc-600">{etiqueta}</span>
                          <span className="text-center font-bold">
                            {resumenComparacion.visitante.defensiva?.[
                              campoDefensa as keyof EspnTeamDefenseSummary
                            ] ?? "-"}
                          </span>
                          <span className={`text-center font-black ${colorRankingComparado(rkDefensa, rkAtaque)}`}>
                            {ordinal(rkDefensa)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-center font-['Orbitron'] text-[11px] font-black uppercase text-[#002244] md:text-xs">
                    Defensa {resumenComparacion.local.nombre} vs ataque {resumenComparacion.visitante.nombre}
                  </div>

                  <div className="grid flex-1 grid-cols-[minmax(0,1fr)_32px_minmax(64px,0.8fr)_minmax(0,1fr)_32px] items-center gap-x-1 gap-y-4 px-2 py-5 text-[10px] sm:grid-cols-[minmax(70px,1fr)_40px_minmax(76px,0.8fr)_minmax(70px,1fr)_40px] sm:gap-x-2 sm:px-3 sm:text-[11px] md:grid-cols-[minmax(110px,1fr)_55px_minmax(110px,0.8fr)_minmax(110px,1fr)_55px] md:gap-x-5 md:px-4 md:text-[13px]">
                    <span className="text-center font-black text-[#002244]">DEFENSA</span>
                    <span className="text-center font-black text-zinc-500">RK</span>
                    <span className="text-center font-black text-zinc-500">MÉTRICA</span>
                    <span className="text-center font-black text-red-700">ATAQUE</span>
                    <span className="text-center font-black text-zinc-500">RK</span>

                    {[
                      ["YDS_G", "TOTAL_YDS_G", "YDS/G"],
                      ["PASS_G", "PASS_YDS_G", "PASE/G"],
                      ["RUSH_G", "RUSH_YDS_G", "CARRERA/G"],
                      ["PTS_G", "PTS_G", "PTS/G"],
                    ].map(([campoDefensa, campoAtaque, etiqueta]) => {
                      const rkDefensa = rankingDefensivo(
                        resumenComparacion.local.codigo,
                        campoDefensa as "YDS_G" | "PASS_G" | "RUSH_G" | "PTS_G",
                      );
                      const rkAtaque = rankingOfensivo(
                        resumenComparacion.visitante.codigo,
                        campoAtaque as "TOTAL_YDS_G" | "PASS_YDS_G" | "RUSH_YDS_G" | "PTS_G",
                      );
                      return (
                        <div key={etiqueta} className="contents">
                          <span className="text-center font-bold">
                            {resumenComparacion.local.defensiva?.[
                              campoDefensa as keyof EspnTeamDefenseSummary
                            ] ?? "-"}
                          </span>
                          <span className={`text-center font-black ${colorRankingComparado(rkDefensa, rkAtaque)}`}>
                            {ordinal(rkDefensa)}
                          </span>
                          <span className="text-center font-bold text-zinc-600">{etiqueta}</span>
                          <span className="text-center font-bold">
                            {resumenComparacion.visitante.ofensiva?.[
                              campoAtaque as keyof EspnTeamOffenseSummary
                            ] ?? "-"}
                          </span>
                          <span className={`text-center font-black ${colorRankingComparado(rkAtaque, rkDefensa)}`}>
                            {ordinal(rkAtaque)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 px-2 py-5 sm:p-5">
                <div className="mb-4 text-center font-['Orbitron'] text-xs font-black uppercase text-red-700 md:text-sm">
                  Entregas
                </div>

                <div className="overflow-hidden rounded-lg bg-zinc-50">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-zinc-200 px-4 py-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <img src={resumenComparacion.local.logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
                      <span className="truncate text-[11px] font-black text-[#002244] md:text-[12px]">
                        {resumenComparacion.local.nombre}
                      </span>
                    </div>
                    <div className="font-['Orbitron'] text-[9px] font-black text-red-700">VS</div>
                    <div className="flex min-w-0 items-center justify-end gap-2">
                      <span className="truncate text-right text-[11px] font-black text-[#002244] md:text-[12px]">
                        {resumenComparacion.visitante.nombre}
                      </span>
                      <img src={resumenComparacion.visitante.logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
                    </div>
                  </div>

                  <div className="grid grid-cols-[42px_58px_minmax(86px,1fr)_58px_42px] items-center gap-1 border-b border-zinc-200 px-3 py-2 text-center text-[8px] font-black uppercase text-zinc-400 md:grid-cols-[48px_70px_minmax(110px,1fr)_70px_48px]">
                    <span>RK</span><span>Dato</span><span></span><span>Dato</span><span>RK</span>
                  </div>

                  {([
                    ["GIVE", "Perdidas"],
                    ["TAKE", "Recuperadas"],
                  ] as const).map(([campo, etiqueta]) => {
                    const rkLocal = rankingEntregas(resumenComparacion.local.codigo, campo);
                    const rkVisitante = rankingEntregas(resumenComparacion.visitante.codigo, campo);
                    return (
                      <div key={campo} className="grid grid-cols-[42px_58px_minmax(86px,1fr)_58px_42px] items-center gap-1 border-b border-zinc-200 px-3 py-3 text-center text-[11px] md:grid-cols-[48px_70px_minmax(110px,1fr)_70px_48px] md:text-[12px]">
                        <span className={`font-black ${colorRankingComparado(rkLocal, rkVisitante)}`}>{ordinal(rkLocal)}</span>
                        <span className="font-black text-[#002244]">{resumenComparacion.local.entregas?.[campo] ?? "-"}</span>
                        <span className="font-black uppercase text-zinc-500">{etiqueta}</span>
                        <span className="font-black text-[#002244]">{resumenComparacion.visitante.entregas?.[campo] ?? "-"}</span>
                        <span className={`font-black ${colorRankingComparado(rkVisitante, rkLocal)}`}>{ordinal(rkVisitante)}</span>
                      </div>
                    );
                  })}

                  {(() => {
                    const rkLocal = rankingDiferencialEntregas(resumenComparacion.local.codigo);
                    const rkVisitante = rankingDiferencialEntregas(resumenComparacion.visitante.codigo);
                    return (
                      <div className="grid grid-cols-[42px_58px_minmax(86px,1fr)_58px_42px] items-center gap-1 px-3 py-3 text-center text-[11px] md:grid-cols-[48px_70px_minmax(110px,1fr)_70px_48px] md:text-[12px]">
                        <span className={`font-black ${colorRankingComparado(rkLocal, rkVisitante)}`}>{ordinal(rkLocal)}</span>
                        <span className="font-black text-[#002244]">{resumenComparacion.local.entregas?.DIFF ?? "-"}</span>
                        <span className="font-black uppercase text-zinc-500">Diferencial</span>
                        <span className="font-black text-[#002244]">{resumenComparacion.visitante.entregas?.DIFF ?? "-"}</span>
                        <span className={`font-black ${colorRankingComparado(rkVisitante, rkLocal)}`}>{ordinal(rkVisitante)}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {proximoPartido.jornada >= 20 && (
                <FranchisePlayoffComparison
                  local={buscarPlayoffForm(resumenComparacion.local.codigo)}
                  visitante={buscarPlayoffForm(resumenComparacion.visitante.codigo)}
                  localNombre={resumenComparacion.local.nombre}
                  visitanteNombre={resumenComparacion.visitante.nombre}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
