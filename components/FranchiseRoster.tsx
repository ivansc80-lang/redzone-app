"use client";

import { useEffect, useMemo, useState } from "react";

type Tab = "ofensiva" | "defensiva" | "especiales" | "lesionados";
type Athlete = {
  id: string;
  displayName?: string;
  fullName?: string;
  jersey?: string;
  age?: number;
  height?: number;
  weight?: number;
  position?: { abbreviation?: string; name?: string };
  experience?: { years?: number };
  college?: { name?: string };
  headshot?: { href?: string };
  status?: { name?: string; type?: string };
  salary?: number | { amount?: number; value?: number };
  contract?: {
    salary?: number;
    baseSalary?: number;
    totalSalary?: number;
  };
  contracts?: Array<{
    salary?: number;
    baseSalary?: number;
    totalSalary?: number;
  }>;
};
type Group = { position?: string; items?: Athlete[] };
type RosterResponse = {
  athletes?: Group[];
  coach?: { firstName?: string; lastName?: string }[];
};

const OFFENSE = new Set(["QB","RB","FB","WR","TE","OT","T","OG","G","C","OL"]);
const DEFENSE = new Set(["DE","DT","NT","DL","LB","ILB","OLB","CB","DB","S","FS","SS"]);
const SPECIAL = new Set(["K","P","PK","LS","KR","PR"]);

const ESPN_TEAM_IDS: Record<string, string> = {
  ATL: "1", BUF: "2", CHI: "3", CIN: "4", CLE: "5", DAL: "6", DEN: "7", DET: "8",
  GB: "9", TEN: "10", IND: "11", KC: "12", LV: "13", LAR: "14", MIA: "15", MIN: "16",
  NE: "17", NO: "18", NYG: "19", NYJ: "20", PHI: "21", ARI: "22", PIT: "23", LAC: "24",
  SF: "25", SEA: "26", TB: "27", WSH: "28", WAS: "28", CAR: "29", JAX: "30", BAL: "33", HOU: "34",
};

const OFFENSE_ORDER = ["QB","RB","WR","TE","C","G","OT"];
const DEFENSE_ORDER = ["DE","DT","LB","CB","S"];

function normalizedPosition(a: Athlete) {
  const p=(a.position?.abbreviation || "").toUpperCase();

  if (p === "FB") return "RB";
  if (p === "OG") return "G";
  if (p === "T" || p === "OL") return "OT";

  if (p === "NT" || p === "DL") return "DT";
  if (p === "ILB" || p === "OLB") return "LB";
  if (p === "DB") return "CB";
  if (p === "FS" || p === "SS") return "S";

  return p;
}

function salaryValue(a: Athlete) {
  const direct =
    typeof a.salary === "number"
      ? a.salary
      : a.salary?.amount ?? a.salary?.value;

  const contract =
    a.contract?.baseSalary ??
    a.contract?.salary ??
    a.contract?.totalSalary;

  const contracts = (a.contracts || [])
    .map((item) => item.baseSalary ?? item.salary ?? item.totalSalary)
    .filter((value): value is number => typeof value === "number");

  const value = direct ?? contract ?? (contracts.length ? Math.max(...contracts) : undefined);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function playerName(a: Athlete) {
  return a.displayName || a.fullName || "Jugador";
}

function sortRoster(a: Athlete, b: Athlete, tab: Tab) {
  const order = tab === "ofensiva" ? OFFENSE_ORDER : DEFENSE_ORDER;
  const posA = normalizedPosition(a);
  const posB = normalizedPosition(b);
  const rankA = order.indexOf(posA);
  const rankB = order.indexOf(posB);
  const safeRankA = rankA === -1 ? order.length : rankA;
  const safeRankB = rankB === -1 ? order.length : rankB;

  if (safeRankA !== safeRankB) return safeRankA - safeRankB;

  const salaryA = salaryValue(a);
  const salaryB = salaryValue(b);

  if (salaryA !== null && salaryB !== null && salaryA !== salaryB) {
    return salaryB - salaryA;
  }

  if (salaryA !== null && salaryB === null) return -1;
  if (salaryA === null && salaryB !== null) return 1;

  return playerName(a).localeCompare(playerName(b), "es", { sensitivity: "base" });
}

function feetInches(inches?: number) {
  if (!inches) return "—";
  const ft = Math.floor(inches / 12);
  return `${ft}' ${inches % 12}"`;
}
function category(a: Athlete): Exclude<Tab,"lesionados"> {
  const p=(a.position?.abbreviation || "").toUpperCase();
  if (SPECIAL.has(p)) return "especiales";
  if (DEFENSE.has(p)) return "defensiva";
  return "ofensiva";
}
function isInjured(a: Athlete) {
  const s=(a.status?.name || a.status?.type || "").toLowerCase();
  return s.includes("injur") || s.includes("reserve") || s.includes("out") || s.includes("pup");
}

export default function FranchiseRoster({
  teamId,
  initialTab = "ofensiva",
}: {
  teamId: string;
  initialTab?: Tab;
}) {
  const [tab,setTab]=useState<Tab>(initialTab);
  const [data,setData]=useState<RosterResponse | null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let alive=true;
    setLoading(true); setError("");
    const espnId = ESPN_TEAM_IDS[teamId.toUpperCase()] ?? teamId;
    fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${espnId}/roster`)
      .then(r=>{ if(!r.ok) throw new Error(`ESPN ${r.status}`); return r.json(); })
      .then(j=>{ if(alive) setData(j); })
      .catch(e=>{ if(alive) setError(e instanceof Error ? e.message : "No se pudo cargar la plantilla"); })
      .finally(()=>{ if(alive) setLoading(false); });
    return ()=>{ alive=false; };
  },[teamId]);

  const players=useMemo(()=> (data?.athletes || []).flatMap(g=>g.items || []),[data]);
  const shown=useMemo(()=>{
    if(tab==="lesionados") return players.filter(isInjured);

    const filtered = players.filter(a=>!isInjured(a) && category(a)===tab);

    if(tab==="ofensiva" || tab==="defensiva") {
      return [...filtered].sort((a,b)=>sortRoster(a,b,tab));
    }

    return filtered;
  },[players,tab]);
  const coach=data?.coach?.[0];
  const coachName=coach ? [coach.firstName,coach.lastName].filter(Boolean).join(" ") : "";

  const tabs: {id:Tab;label:string}[]=[
    {id:"ofensiva",label:"Ofensiva"},
    {id:"defensiva",label:"Defensiva"},
    {id:"especiales",label:"Equipos especiales"},
    {id:"lesionados",label:"Lesionados / IR"},
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h3 className="font-['Orbitron'] text-3xl font-black uppercase text-red-700 md:text-4xl">Plantilla</h3>
        {coachName && <div className="font-['Orbitron'] text-xs font-black uppercase text-red-700 md:text-sm">Head coach: {coachName}</div>}
      </div>

      <div className="mb-4 flex overflow-x-auto border-b border-zinc-200">
        {tabs.map(t=>(
          <button key={t.id} type="button" onClick={()=>setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-black uppercase md:text-sm ${tab===t.id ? "border-red-700 text-red-700" : "border-transparent text-zinc-500 hover:text-zinc-900"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="py-12 text-center text-sm text-zinc-500">Cargando plantilla de ESPN…</div>}
      {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">No se pudo cargar ESPN: {error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[850px] border-collapse text-xs md:text-sm">
            <thead className="bg-zinc-50 text-[10px] uppercase text-zinc-500 md:text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-3 py-3 text-center">Pos</th>
                <th className="px-3 py-3 text-center">Edad</th>
                <th className="px-3 py-3 text-center">Altura</th>
                <th className="px-3 py-3 text-center">Peso</th>
                <th className="px-3 py-3 text-center">Exp</th>
                <th className="px-4 py-3 text-left">Universidad</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(a=>{
                const name=a.displayName || a.fullName || "Jugador";
                const profile=`https://www.espn.com/nfl/player/_/id/${a.id}`;
                return (
                  <tr key={a.id} className="border-t border-zinc-200 even:bg-zinc-50/60">
                    <td className="px-4 py-2">
                      <a
                        href={profile}
                        onClick={() => {
                          sessionStorage.setItem(
                            "redzoneExternalReturn",
                            JSON.stringify({
                              pestanaActiva: "equipos",
                              subPestanaEquipos: "franquicia",
                              franquiciaSeleccionada: teamId,
                              franchiseSection: "plantilla",
                              rosterTab: tab,
                            }),
                          );
                        }}
                        className="inline-flex items-center gap-3 font-bold text-[#002244] hover:text-red-700 hover:underline"
                      >
                        {a.headshot?.href ? <img src={a.headshot.href} alt="" className="h-10 w-10 rounded-full object-contain" loading="lazy" /> : <span className="h-10 w-10 rounded-full bg-zinc-100" />}
                        <span>{name}{a.jersey ? <span className="ml-1 text-[10px] font-normal text-zinc-400">{a.jersey}</span> : null}</span>
                      </a>
                    </td>
                    <td className="px-3 py-2 text-center font-bold">{a.position?.abbreviation || "—"}</td>
                    <td className="px-3 py-2 text-center">{a.age ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{feetInches(a.height)}</td>
                    <td className="px-3 py-2 text-center">{a.weight ? `${a.weight} lb` : "—"}</td>
                    <td className="px-3 py-2 text-center">{a.experience?.years ?? "—"}</td>
                    <td className="px-4 py-2">{a.college?.name || "—"}</td>
                  </tr>
                );
              })}
              {shown.length===0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-400">No hay jugadores disponibles en esta categoría.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[10px] text-zinc-400">Foto + nombre abren el perfil del jugador en ESPN en esta misma pestaña.</p>
    </div>
  );
}
