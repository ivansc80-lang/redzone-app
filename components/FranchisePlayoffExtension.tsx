"use client";

import type { PartidoTemporada } from "@/lib/queries";

type PlayoffForm = {
  equipo: string;
  partidos: number;
  ofensiva: {
    YDS_G: number;
    PASS_G: number;
    RUSH_G: number;
    PTS_G: number;
    INT: number;
    SACKS_RECIBIDOS: number;
  };
  defensiva: {
    YDS_G: number;
    PASS_G: number;
    RUSH_G: number;
    PTS_G: number;
    INT: number;
    SACKS: number;
  };
  entregas: { PERDIDAS: number; RECUPERADAS: number; DIF: number };
};

export type { PlayoffForm };

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

export function FranchisePlayoffCalendar({ partidos }: { partidos: PartidoTemporada[] }) {
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
    </>
  );
}

function dato(valor: number) {
  return Number.isFinite(valor) ? String(valor) : "-";
}

function dif(valor: number) {
  if (!Number.isFinite(valor)) return "-";
  return valor > 0 ? `+${valor}` : String(valor);
}

export function FranchisePlayoffComparison({
  local,
  visitante,
  localNombre,
  visitanteNombre,
}: {
  local: PlayoffForm | null;
  visitante: PlayoffForm | null;
  localNombre: string;
  visitanteNombre: string;
}) {
  if (!local || !visitante || local.partidos < 1 || visitante.partidos < 1) return null;

  const fila = (titulo: string, a: string | number, b: string | number) => (
    <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center border-t border-zinc-200 px-3 py-2 text-center text-[10px] md:text-[11px]">
      <span className="font-black text-[#002244]">{a}</span>
      <span className="font-black uppercase text-zinc-500">{titulo}</span>
      <span className="font-black text-[#002244]">{b}</span>
    </div>
  );

  return (
    <div className="border-t border-zinc-200 p-5">
      <div className="mb-1 text-center font-['Orbitron'] text-xs font-black uppercase text-red-700 md:text-sm">
        Playoffs · acumulado
      </div>
      <div className="mb-4 text-center text-[9px] font-semibold text-zinc-400">
        {local.partidos} PJ · desde Wild Card
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
        <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center px-3 py-3 text-center text-[10px] font-black text-[#002244] md:text-[11px]">
          <span className="truncate">{localNombre}</span>
          <span className="font-['Orbitron'] text-[9px] text-red-700">OFENSIVA</span>
          <span className="truncate">{visitanteNombre}</span>
        </div>
        {fila("YDS/G", dato(local.ofensiva.YDS_G), dato(visitante.ofensiva.YDS_G))}
        {fila("PASE/G", dato(local.ofensiva.PASS_G), dato(visitante.ofensiva.PASS_G))}
        {fila("CARRERA/G", dato(local.ofensiva.RUSH_G), dato(visitante.ofensiva.RUSH_G))}
        {fila("PTS/G", dato(local.ofensiva.PTS_G), dato(visitante.ofensiva.PTS_G))}
        {fila("INT LANZADAS", dato(local.ofensiva.INT), dato(visitante.ofensiva.INT))}
        {fila("SACKS RECIBIDOS", dato(local.ofensiva.SACKS_RECIBIDOS), dato(visitante.ofensiva.SACKS_RECIBIDOS))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
        <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center px-3 py-3 text-center text-[10px] font-black text-[#002244] md:text-[11px]">
          <span className="truncate">{localNombre}</span>
          <span className="font-['Orbitron'] text-[9px] text-red-700">DEFENSIVA</span>
          <span className="truncate">{visitanteNombre}</span>
        </div>
        {fila("YDS/G", dato(local.defensiva.YDS_G), dato(visitante.defensiva.YDS_G))}
        {fila("PASE/G", dato(local.defensiva.PASS_G), dato(visitante.defensiva.PASS_G))}
        {fila("CARRERA/G", dato(local.defensiva.RUSH_G), dato(visitante.defensiva.RUSH_G))}
        {fila("PTS/G", dato(local.defensiva.PTS_G), dato(visitante.defensiva.PTS_G))}
        {fila("INT CONSEGUIDAS", dato(local.defensiva.INT), dato(visitante.defensiva.INT))}
        {fila("SACKS CONSEGUIDOS", dato(local.defensiva.SACKS), dato(visitante.defensiva.SACKS))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
        <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center px-3 py-3 text-center text-[10px] font-black text-[#002244] md:text-[11px]">
          <span className="truncate">{localNombre}</span>
          <span className="font-['Orbitron'] text-[9px] text-red-700">ENTREGAS</span>
          <span className="truncate">{visitanteNombre}</span>
        </div>
        {fila("PERDIDAS", dato(local.entregas.PERDIDAS), dato(visitante.entregas.PERDIDAS))}
        {fila("RECUPERADAS", dato(local.entregas.RECUPERADAS), dato(visitante.entregas.RECUPERADAS))}
        {fila("DIFERENCIAL", dif(local.entregas.DIF), dif(visitante.entregas.DIF))}
      </div>
    </div>
  );
}
