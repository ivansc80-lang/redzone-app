"use client";

import { useEffect, useState } from "react";
import type { EspnTeamSpecialTeamsSummary } from "@/lib/espnTeamSummary";

export default function TeamSpecialTeamsSummary() {
  const [datos,setDatos]=useState<EspnTeamSpecialTeamsSummary[]>([]);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{ let cancelado=false;
    (async()=>{ try {
      const response=await fetch("/api/espn-team-stats/summary/special-teams",{cache:"no-store"});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data:EspnTeamSpecialTeamsSummary[]=await response.json();
      if(!cancelado) setDatos(data);
    } catch(err) { console.error("Error cargando Resumen equipos especiales:",err); if(!cancelado) setError("No se pudo cargar el resumen desde ESPN."); }
      finally { if(!cancelado) setCargando(false); }
    })();
    return()=>{cancelado=true};
  },[]);

  const columnas=["GP","KR YDS","KR AVG","KR TD","PR YDS","PR AVG","PR TD","FGM","FGA","FG%","XPM","PUNTS","P AVG","IN20"];
  const keys=["GP","KRYDS","KRAVG","KRTD","PRYDS","PRAVG","PRTD","FGM","FGA","FGPCT","XPM","PUNTS","PAVG","IN20"] as (keyof EspnTeamSpecialTeamsSummary)[];

  return <div className="w-full">
    <div className="flex items-center gap-3 border-b-2 border-blue-500 pb-3 mb-4">
      <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
      <h3 className="text-sm md:text-xl font-black uppercase tracking-wider text-blue-600 font-['Orbitron'] italic underline decoration-blue-500 underline-offset-4">Resumen equipos especiales</h3>
    </div>
    <p className="md:hidden text-[9px] text-zinc-500 font-semibold mb-2 text-right">Desliza para ver todas las estadísticas →</p>
    <div className="w-full overflow-x-auto border border-zinc-200 rounded-xl shadow-sm">
      <table className="min-w-[900px] w-full border-collapse text-xs">
        <thead><tr className="bg-zinc-100 text-zinc-600 font-black uppercase">
          <th className="sticky left-0 z-30 w-11 min-w-11 bg-zinc-100 border-r border-zinc-300 px-2 py-3 text-center">POS</th>
          <th className="sticky left-11 z-30 min-w-[190px] md:min-w-[240px] bg-zinc-100 border-r-2 border-zinc-300 px-3 py-3 text-left">EQUIPO</th>
          {columnas.map(col=><th key={col} className="min-w-[78px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-200">{col}</th>)}
        </tr></thead>
        <tbody>{cargando?<tr><td colSpan={columnas.length+2} className="px-4 py-8 text-center text-zinc-500 font-semibold">Cargando estadísticas desde ESPN...</td></tr>
        :error?<tr><td colSpan={columnas.length+2} className="px-4 py-8 text-center text-red-600 font-semibold">{error}</td></tr>
        :datos.length===0?<tr><td colSpan={columnas.length+2} className="px-4 py-8 text-center text-zinc-500 font-semibold">No hay estadísticas disponibles.</td></tr>
        :datos.map(e=><tr key={e.teamId} className="border-b border-zinc-100 hover:bg-zinc-50">
          <td className="sticky left-0 z-20 w-11 min-w-11 bg-white border-r border-zinc-200 px-2 py-3 text-center font-semibold text-zinc-500">{e.posicion}</td>
          <td className="sticky left-11 z-20 min-w-[190px] md:min-w-[240px] bg-white border-r-2 border-zinc-300 px-3 py-3"><div className="flex items-center gap-2 min-w-0">
            <img src={`https://a.espncdn.com/i/teamlogos/nfl/500/${e.equipo.toLowerCase()}.png`} alt={e.nombre} className="w-7 h-7 object-contain flex-shrink-0" />
            <div className="min-w-0"><div className="font-bold text-zinc-900 truncate">{e.nombre}</div><div className="text-[9px] text-zinc-400 font-semibold">{e.equipo}</div></div>
          </div></td>
          {keys.map((key,idx)=><td key={String(key)} className={`min-w-[78px] px-3 py-3 text-center whitespace-nowrap border-r border-zinc-100 ${idx===1?"font-black text-blue-700":"text-zinc-600"}`}>{String(e[key]||"-")}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
