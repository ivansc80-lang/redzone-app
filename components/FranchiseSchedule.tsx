"use client";

import { useEffect, useState } from "react";
import { getPartidosPorJornada, type PartidoTemporada } from "@/lib/queries";
import type {
  EspnTeamDefenseSummary,
  EspnTeamOffenseSummary,
  EspnTeamTurnoversSummary,
} from "@/lib/espnTeamSummary";

type Props = { teamId: string };

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

export default function FranchiseSchedule({ teamId }: Props) {
  const [partidos, setPartidos] = useState<PartidoFranquicia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ofensiva, setOfensiva] = useState<EspnTeamOffenseSummary[]>([]);
  const [defensiva, setDefensiva] = useState<EspnTeamDefenseSummary[]>([]);
  const [entregas, setEntregas] = useState<EspnTeamTurnoversSummary[]>([]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      const [jornadas, offenseRes, defenseRes, turnoversRes] = await Promise.all([
        Promise.all(
          Array.from({ length: 18 }, (_, i) => getPartidosPorJornada(i + 1)),
        ),
        fetch("/api/espn-team-stats/summary/offense", { cache: "no-store" }),
        fetch("/api/espn-team-stats/summary/defense", { cache: "no-store" }),
        fetch("/api/espn-team-stats/summary/turnovers", { cache: "no-store" }),
      ]);

      const [offenseData, defenseData, turnoversData] = await Promise.all([
        offenseRes.ok ? offenseRes.json() : Promise.resolve([]),
        defenseRes.ok ? defenseRes.json() : Promise.resolve([]),
        turnoversRes.ok ? turnoversRes.json() : Promise.resolve([]),
      ]);

      const delEquipo = jornadas
        .flat()
        .filter(
          (p) =>
            p.equipo_local.toUpperCase() === teamId.toUpperCase() ||
            p.equipo_visitante.toUpperCase() === teamId.toUpperCase(),
        )
        .map((p) => ({
          ...p,
          rivalLocal: p.equipo_local.toUpperCase() === teamId.toUpperCase(),
        }))
        .sort((a, b) => a.jornada - b.jornada);

      if (!cancelado) {
        setPartidos(delEquipo);
        setOfensiva(offenseData as EspnTeamOffenseSummary[]);
        setDefensiva(defenseData as EspnTeamDefenseSummary[]);
        setEntregas(turnoversData as EspnTeamTurnoversSummary[]);
        setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [teamId]);

  const proximoPartido =
    partidos.find((p) => new Date(p.fecha_partido).getTime() >= Date.now()) ??
    partidos.find((p) => p.resultado_oficial == null) ??
    null;

  const buscarOfensiva = (equipo: string) =>
    ofensiva.find((item) => item.equipo.toUpperCase() === equipo.toUpperCase()) ?? null;

  const buscarDefensiva = (equipo: string) =>
    defensiva.find((item) => item.equipo.toUpperCase() === equipo.toUpperCase()) ?? null;

  const buscarEntregas = (equipo: string) =>
    entregas.find((item) => item.equipo.toUpperCase() === equipo.toUpperCase()) ?? null;

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
      <h3 className="mb-5 border-b-2 border-red-700 pb-2 font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">
        Calendario
      </h3>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          {cargando ? (
            <div className="py-8 text-center text-xs font-semibold text-zinc-500">
              Cargando calendario...
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
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

        <div className="lg:col-span-2">
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
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-zinc-50 px-5 py-5">
                <div className="flex items-center gap-3">
                  <img src={resumenComparacion.local.logo} alt="" className="h-12 w-12 object-contain" />
                  <div>
                    <div className="text-sm font-black text-[#002244]">{resumenComparacion.local.nombre}</div>
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
                    <div className="text-sm font-black text-[#002244]">{resumenComparacion.visitante.nombre}</div>
                    <div className="text-[9px] font-semibold uppercase text-zinc-400">Visitante</div>
                  </div>
                  <img src={resumenComparacion.visitante.logo} alt="" className="h-12 w-12 object-contain" />
                </div>
              </div>

              <div className="grid gap-4 p-4 xl:grid-cols-2">
                {[
                  {
                    titulo: `Ataque ${resumenComparacion.local.nombre} vs defensa ${resumenComparacion.visitante.nombre}`,
                    ataque: resumenComparacion.local.ofensiva,
                    defensa: resumenComparacion.visitante.defensiva,
                  },
                  {
                    titulo: `Ataque ${resumenComparacion.visitante.nombre} vs defensa ${resumenComparacion.local.nombre}`,
                    ataque: resumenComparacion.visitante.ofensiva,
                    defensa: resumenComparacion.local.defensiva,
                  },
                ].map((bloque) => (
                  <div key={bloque.titulo} className="rounded-xl border border-zinc-200">
                    <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 font-['Orbitron'] text-[9px] font-black uppercase text-[#002244]">
                      {bloque.titulo}
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 px-3 py-3 text-[10px]">
                      <span className="font-bold text-zinc-500">Métrica</span>
                      <span className="font-black text-red-700">ATAQUE</span>
                      <span className="font-black text-[#002244]">DEFENSA</span>

                      <span>YDS/G</span>
                      <span className="text-center font-bold">{bloque.ataque?.TOTAL_YDS_G ?? "-"}</span>
                      <span className="text-center font-bold">{bloque.defensa?.YDS_G ?? "-"}</span>

                      <span>PASE/G</span>
                      <span className="text-center font-bold">{bloque.ataque?.PASS_YDS_G ?? "-"}</span>
                      <span className="text-center font-bold">{bloque.defensa?.PASS_G ?? "-"}</span>

                      <span>CARRERA/G</span>
                      <span className="text-center font-bold">{bloque.ataque?.RUSH_YDS_G ?? "-"}</span>
                      <span className="text-center font-bold">{bloque.defensa?.RUSH_G ?? "-"}</span>

                      <span>PTS/G</span>
                      <span className="text-center font-bold">{bloque.ataque?.PTS_G ?? "-"}</span>
                      <span className="text-center font-bold">{bloque.defensa?.PTS_G ?? "-"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-200 p-4">
                <div className="mb-3 font-['Orbitron'] text-[10px] font-black uppercase text-red-700">
                  Entregas
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[resumenComparacion.local, resumenComparacion.visitante].map((equipo) => (
                    <div key={equipo.codigo} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg bg-zinc-50 px-3 py-3 text-[10px]">
                      <div className="flex min-w-0 items-center gap-2">
                        <img src={equipo.logo} alt="" className="h-7 w-7 shrink-0 object-contain" />
                        <span className="truncate font-bold text-[#002244]">{equipo.nombre}</span>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-black uppercase text-zinc-400">Perdidas</div>
                        <div className="mt-1 font-black text-red-700">{equipo.entregas?.GIVE ?? "-"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-black uppercase text-zinc-400">Recuperadas</div>
                        <div className="mt-1 font-black text-[#002244]">{equipo.entregas?.TAKE ?? "-"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
