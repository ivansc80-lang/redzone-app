"use client";

import { useEffect, useState } from "react";
import type { EspnTeamOffenseSummary } from "@/lib/espnTeamSummary";

type Props = {
  temporada: number;
  onTemporadaChange: (temporada: number) => void;
  onVolverALideres: () => void;
};

export default function TeamOffenseSummary({ temporada, onTemporadaChange, onVolverALideres }: Props) {
  const [datos, setDatos] = useState<EspnTeamOffenseSummary[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/espn-team-stats/summary/offense?temporada=${temporada}&seasonType=2`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: EspnTeamOffenseSummary[] = await response.json();

        if (!cancelado) {
          setDatos(data);
        }
      } catch (err) {
        console.error("Error cargando resumen ofensivo de equipos:", err);
        if (!cancelado) {
          setError("No se pudo cargar el resumen ofensivo de ESPN.");
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      cancelado = true;
    };
  }, [temporada]);

  const columnas = [
    "GP",
    "YDS",
    "YDS/G",
    "PASS",
    "PASS/G",
    "RUSH",
    "RUSH/G",
    "PTS",
    "PTS/G",
  ];

  return (
    <div className="w-full">
    <div className="flex items-center justify-between gap-3 border-b-2 border-red-600 pb-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-3 h-3 bg-red-600 rounded-full flex-shrink-0" />
        <h3 className="text-sm md:text-xl font-black uppercase tracking-wider text-red-600 font-['Orbitron'] italic underline decoration-red-600 underline-offset-4">
          Resumen ofensivo
        </h3>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <select
          value={temporada}
          onChange={(e) => onTemporadaChange(Number(e.target.value))}
          className="hidden xl:block bg-white border border-zinc-300 rounded-full px-3 py-2 text-[10px] font-semibold text-zinc-700 outline-none"
        >
          <option value={2026}>2026 Temporada regular</option>
          <option value={2025}>2025 Temporada regular</option>
        </select>

        <button
          onClick={onVolverALideres}
          className="shrink-0 px-3 py-2 rounded-lg border border-red-600 text-red-700 hover:bg-red-700 hover:text-white transition-all font-['Orbitron'] font-black text-[8px] md:text-[10px] uppercase"
        >
          ← Volver a líderes
        </button>
      </div>
    </div>

      <p className="md:hidden text-[9px] text-zinc-500 font-semibold mb-2 text-right">
        Desliza para ver todas las estadísticas →
      </p>

      <div className="w-full overflow-x-auto border border-zinc-200 rounded-xl shadow-sm">
        <table className="min-w-[980px] w-full border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-100 text-zinc-600 font-black uppercase">
              <th className="sticky left-0 z-30 w-11 min-w-11 bg-zinc-100 border-r border-zinc-300 px-2 py-3 text-center">
                POS
              </th>
              <th className="sticky left-11 z-30 min-w-[190px] md:min-w-[240px] bg-zinc-100 border-r-2 border-zinc-300 px-3 py-3 text-left">
                EQUIPO
              </th>
              {columnas.map((col) => (
                <th
                  key={col}
                  className="min-w-[78px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-200"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-zinc-500 font-semibold">
                  Cargando estadísticas desde ESPN...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-red-600 font-semibold">
                  {error}
                </td>
              </tr>
            ) : datos.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-zinc-500 font-semibold">
                  No hay estadísticas disponibles.
                </td>
              </tr>
            ) : (
              datos.map((equipo) => {
                const valores = [
                  equipo.GP,
                  equipo.TOTAL_YDS,
                  equipo.TOTAL_YDS_G,
                  equipo.PASS_YDS,
                  equipo.PASS_YDS_G,
                  equipo.RUSH_YDS,
                  equipo.RUSH_YDS_G,
                  equipo.PTS,
                  equipo.PTS_G,
                ];

                return (
                  <tr key={equipo.teamId} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="sticky left-0 z-20 w-11 min-w-11 bg-white border-r border-zinc-200 px-2 py-3 text-center font-semibold text-zinc-500">
                      {equipo.posicion}
                    </td>
                    <td className="sticky left-11 z-20 min-w-[190px] md:min-w-[240px] bg-white border-r-2 border-zinc-300 px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={`https://a.espncdn.com/i/teamlogos/nfl/500/${equipo.equipo.toLowerCase()}.png`}
                          alt={equipo.nombre}
                          className="w-7 h-7 object-contain flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-900 truncate">{equipo.nombre}</div>
                          <div className="text-[9px] text-zinc-400 font-semibold">{equipo.equipo}</div>
                        </div>
                      </div>
                    </td>
                    {valores.map((valor, idx) => (
                      <td
                        key={idx}
                        className={`min-w-[78px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-100 ${
                          idx === 1 ? "font-black text-red-700" : "text-zinc-600"
                        }`}
                      >
                        {valor || "-"}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
