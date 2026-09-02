"use client";

import type { PartidoTemporada } from "@/lib/queries";

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

function etiquetaRonda(jornada: number) {
  if (jornada === 19) return "WC";
  if (jornada === 20) return "DIV";
  if (jornada === 21) return "CONF";
  if (jornada === 22) return "SB";
  return `J${jornada}`;
}

export default function FranchisePlayoffCalendar({
  partidos,
}: {
  partidos: PartidoTemporada[];
}) {
  if (!partidos.length) return null;

  return (
    <>
      <div className="flex min-h-[44px] items-center gap-3 border-b border-zinc-200 px-3">
        <div className="h-px flex-1 bg-red-200" />
        <div className="font-['Orbitron'] text-[10px] font-black uppercase tracking-[0.16em] text-red-700">
          Playoffs
        </div>
        <div className="h-px flex-1 bg-red-200" />
      </div>

      {partidos.map((partido) => {
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
            <div className="font-['Orbitron'] text-[10px] font-black uppercase text-red-700">
              {etiquetaRonda(partido.jornada)}
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <img src={local.logo_url} alt="" className="h-7 w-7 shrink-0 object-contain" />
                <span className="truncate text-[11px] font-bold text-[#002244]">
                  {local.nombre}
                </span>
              </div>
              <span className="shrink-0 font-['Orbitron'] text-[9px] font-black text-red-700">
                VS
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                <span className="truncate text-right text-[11px] font-bold text-[#002244]">
                  {visitante.nombre}
                </span>
                <img src={visitante.logo_url} alt="" className="h-7 w-7 shrink-0 object-contain" />
              </div>
            </div>

            <div className="whitespace-nowrap pl-2 text-right text-[9px] font-semibold capitalize text-zinc-500">
              {formatearFecha(partido.fecha_partido)}
            </div>
          </div>
        );
      })}
    </>
  );
}
