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

type MejorEs = "mayor" | "menor";

function colorDato(a: number, b: number, mejorEs: MejorEs) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return ["text-[#002244]", "text-[#002244]"] as const;
  if (a === b) return ["text-[#FBBF24]", "text-[#FBBF24]"] as const;

  const aEsMejor = mejorEs === "mayor" ? a > b : a < b;
  return aEsMejor
    ? (["text-[#10B981]", "text-[#E00000]"] as const)
    : (["text-[#E00000]", "text-[#10B981]"] as const);
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

  const fila = (
    titulo: string,
    a: number,
    b: number,
    mejorEs: MejorEs,
    formateador: (valor: number) => string = dato,
  ) => {
    const [colorA, colorB] = colorDato(a, b, mejorEs);

    return (
      <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center border-t border-zinc-200 px-3 py-2 text-center text-[10px] md:text-[11px]">
        <span className={`font-black ${colorA}`}>{formateador(a)}</span>
        <span className="font-black uppercase text-zinc-500">{titulo}</span>
        <span className={`font-black ${colorB}`}>{formateador(b)}</span>
      </div>
    );
  };

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
        {fila("YDS/G", local.ofensiva.YDS_G, visitante.ofensiva.YDS_G, "mayor")}
        {fila("PASE/G", local.ofensiva.PASS_G, visitante.ofensiva.PASS_G, "mayor")}
        {fila("CARRERA/G", local.ofensiva.RUSH_G, visitante.ofensiva.RUSH_G, "mayor")}
        {fila("PTS/G", local.ofensiva.PTS_G, visitante.ofensiva.PTS_G, "mayor")}
        {fila("INT LANZADAS", local.ofensiva.INT, visitante.ofensiva.INT, "menor")}
        {fila("SACKS RECIBIDOS", local.ofensiva.SACKS_RECIBIDOS, visitante.ofensiva.SACKS_RECIBIDOS, "menor")}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
        <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center px-3 py-3 text-center text-[10px] font-black text-[#002244] md:text-[11px]">
          <span className="truncate">{localNombre}</span>
          <span className="font-['Orbitron'] text-[9px] text-red-700">DEFENSIVA</span>
          <span className="truncate">{visitanteNombre}</span>
        </div>
        {fila("YDS/G", local.defensiva.YDS_G, visitante.defensiva.YDS_G, "menor")}
        {fila("PASE/G", local.defensiva.PASS_G, visitante.defensiva.PASS_G, "menor")}
        {fila("CARRERA/G", local.defensiva.RUSH_G, visitante.defensiva.RUSH_G, "menor")}
        {fila("PTS/G", local.defensiva.PTS_G, visitante.defensiva.PTS_G, "menor")}
        {fila("INT CONSEGUIDAS", local.defensiva.INT, visitante.defensiva.INT, "mayor")}
        {fila("SACKS CONSEGUIDOS", local.defensiva.SACKS, visitante.defensiva.SACKS, "mayor")}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
        <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center px-3 py-3 text-center text-[10px] font-black text-[#002244] md:text-[11px]">
          <span className="truncate">{localNombre}</span>
          <span className="font-['Orbitron'] text-[9px] text-red-700">ENTREGAS</span>
          <span className="truncate">{visitanteNombre}</span>
        </div>
        {fila("PERDIDAS", local.entregas.PERDIDAS, visitante.entregas.PERDIDAS, "menor")}
        {fila("RECUPERADAS", local.entregas.RECUPERADAS, visitante.entregas.RECUPERADAS, "mayor")}
        {fila("DIFERENCIAL", local.entregas.DIF, visitante.entregas.DIF, "mayor", dif)}
      </div>
    </div>
  );
}
