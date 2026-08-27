"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  EspnTeamDefenseSummary,
  EspnTeamOffenseSummary,
  EspnTeamSpecialTeamsSummary,
  EspnTeamTurnoversSummary,
} from "@/lib/espnTeamSummary";

type Props = {
  teamId: string;
  temporada: number;
};

type Estado = {
  offense: EspnTeamOffenseSummary | null;
  defense: EspnTeamDefenseSummary | null;
  special: EspnTeamSpecialTeamsSummary | null;
  turnovers: EspnTeamTurnoversSummary | null;
};

const VACIO: Estado = {
  offense: null,
  defense: null,
  special: null,
  turnovers: null,
};

export default function FranchiseTeamStatsSummary({ teamId, temporada }: Props) {
  const [datos, setDatos] = useState<Estado>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);

      try {
        const [offenseRes, defenseRes, specialRes, turnoversRes] =
          await Promise.all([
            fetch(`/api/espn-team-stats/summary/offense?temporada=${temporada}&seasonType=2`, { cache: "no-store" }),
            fetch(`/api/espn-team-stats/summary/defense?temporada=${temporada}&seasonType=2`, { cache: "no-store" }),
            fetch(`/api/espn-team-stats/summary/special-teams?temporada=${temporada}&seasonType=2`, { cache: "no-store" }),
            fetch(`/api/espn-team-stats/summary/turnovers?temporada=${temporada}&seasonType=2`, { cache: "no-store" }),
          ]);

        if (![offenseRes, defenseRes, specialRes, turnoversRes].every((r) => r.ok)) {
          throw new Error("Alguno de los resúmenes ESPN no respondió correctamente");
        }

        const [offense, defense, special, turnovers] = await Promise.all([
          offenseRes.json() as Promise<EspnTeamOffenseSummary[]>,
          defenseRes.json() as Promise<EspnTeamDefenseSummary[]>,
          specialRes.json() as Promise<EspnTeamSpecialTeamsSummary[]>,
          turnoversRes.json() as Promise<EspnTeamTurnoversSummary[]>,
        ]);

        const buscar = <T extends { equipo: string }>(lista: T[]) =>
          lista.find((item) => item.equipo.toUpperCase() === teamId.toUpperCase()) ?? null;

        if (!cancelado) {
          setDatos({
            offense: buscar(offense),
            defense: buscar(defense),
            special: buscar(special),
            turnovers: buscar(turnovers),
          });
        }
      } catch (err) {
        console.error("Error cargando resúmenes de franquicia:", err);
        if (!cancelado) setError("No se pudo cargar el resumen estadístico del equipo.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();

    return () => {
      cancelado = true;
    };
  }, [teamId, temporada]);

  const bloques = useMemo(() => {
    const { offense, defense, special, turnovers } = datos;

    return [
      {
        titulo: "OFENSIVA",
        ranking: offense?.posicion,
        columnas: [
          ["GP", offense?.GP],
          ["YDS", offense?.TOTAL_YDS],
          ["YDS/G", offense?.TOTAL_YDS_G],
          ["PASS", offense?.PASS_YDS],
          ["PASS/G", offense?.PASS_YDS_G],
          ["RUSH", offense?.RUSH_YDS],
          ["RUSH/G", offense?.RUSH_YDS_G],
          ["PTS", offense?.PTS],
          ["PTS/G", offense?.PTS_G],
        ],
      },
      {
        titulo: "DEFENSIVA",
        ranking: defense?.posicion,
        columnas: [
          ["GP", defense?.GP],
          ["YDS", defense?.YDS],
          ["YDS/G", defense?.YDS_G],
          ["PASS", defense?.PASS],
          ["PASS/G", defense?.PASS_G],
          ["RUSH", defense?.RUSH],
          ["RUSH/G", defense?.RUSH_G],
          ["PTS", defense?.PTS],
          ["PTS/G", defense?.PTS_G],
        ],
      },
      {
        titulo: "EQUIPOS ESPECIALES",
        ranking: special?.posicion,
        columnas: [
          ["GP", special?.GP],
          ["KR YDS", special?.KRYDS],
          ["KR AVG", special?.KRAVG],
          ["PR YDS", special?.PRYDS],
          ["PR AVG", special?.PRAVG],
          ["FGM", special?.FGM],
          ["FGA", special?.FGA],
          ["FG%", special?.FGPCT],
          ["P AVG", special?.PAVG],
          ["IN20", special?.IN20],
        ],
      },
      {
        titulo: "ENTREGAS",
        ranking: turnovers?.posicion,
        columnas: [
          ["GP", turnovers?.GP],
          ["PERDIDOS", turnovers?.GIVE],
          ["RECUPERADOS", turnovers?.TAKE],
          ["DIF", turnovers?.DIFF],
        ],
      },
    ];
  }, [datos]);

  if (cargando) {
    return (
      <div className="py-8 text-center text-xs font-semibold text-zinc-500">
        Cargando resumen estadístico desde ESPN...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-xs font-semibold text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-10 border-t border-zinc-200 pt-7">
      <h3 className="mb-5 border-b-2 border-red-700 pb-2 font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">
        Resumen estadístico
      </h3>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {bloques.map((bloque) => (
          <div key={bloque.titulo} className="overflow-hidden rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between bg-zinc-50 px-3 py-2">
              <span className="font-['Orbitron'] text-[10px] font-black text-[#002244] md:text-xs">
                {bloque.titulo}
              </span>
              <span className="text-[10px] font-black uppercase text-red-700 md:text-xs">
                Ranking {bloque.ranking ?? "-"}
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="min-w-[760px] w-full border-collapse text-[10px] md:text-xs">
                <thead>
                  <tr className="bg-white text-zinc-500">
                    {bloque.columnas.map(([label]) => (
                      <th key={label} className="border-t border-zinc-200 px-3 py-2 text-center font-black">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {bloque.columnas.map(([label, value]) => (
                      <td
                        key={label}
                        className={`border-t border-zinc-100 px-3 py-3 text-center font-semibold ${label === "DIF" ? "text-red-700 font-black" : "text-zinc-800"}`}
                      >
                        {value || "-"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
