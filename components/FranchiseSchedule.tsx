"use client";

import { useEffect, useState } from "react";
import { getPartidosPorJornada, type PartidoTemporada } from "@/lib/queries";

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

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      const jornadas = await Promise.all(
        Array.from({ length: 18 }, (_, i) => getPartidosPorJornada(i + 1)),
      );

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
        setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [teamId]);

  return (
    <div className="mt-10 border-t border-zinc-200 pt-7">
      <h3 className="mb-5 border-b-2 border-red-700 pb-2 font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">
        Calendario
      </h3>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
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
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <img src={visitante.logo_url} alt="" className="h-7 w-7 shrink-0 object-contain" />
                        <span className="truncate text-[11px] font-bold text-[#002244]">{visitante.nombre}</span>
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

        <div className="hidden min-h-[300px] rounded-xl border border-dashed border-zinc-200 lg:block" aria-label="Espacio reservado para próximo rival" />
      </div>
    </div>
  );
}
