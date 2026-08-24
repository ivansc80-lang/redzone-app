"use client";

type Props = {
  teamId: string;
  onBack: () => void;
};

const AFC_WEST = [
  { nombre: "Denver Broncos", abrev: "DEN", g: "14", p: "3", e: "0", pct: ".824", pf: "401", pc: "311", dif: "+90" },
  { nombre: "Los Angeles Chargers", abrev: "LAC", g: "11", p: "6", e: "0", pct: ".647", pf: "368", pc: "340", dif: "+28" },
  { nombre: "Kansas City Chiefs", abrev: "KC", g: "6", p: "11", e: "0", pct: ".353", pf: "362", pc: "328", dif: "+34" },
  { nombre: "Las Vegas Raiders", abrev: "LV", g: "3", p: "14", e: "0", pct: ".176", pf: "241", pc: "432", dif: "-191" },
];

const INFO_KC = [
  ["Fundador", "Lamar Hunt en 1959"],
  ["Estadio", "GEHA Field at Arrowhead Stadium"],
  ["Ciudad", "Kansas City, Missouri"],
];

export default function FranchiseHome({ teamId, onBack }: Props) {
  const esKansasCity = teamId === "KC";

  if (!esKansasCity) {
    return (
      <section className="px-3 pt-4 pb-5 md:px-6 md:pt-5 md:pb-7">
        <div className="rounded-2xl bg-white p-6 text-black shadow-2xl md:p-10">
          <button
            type="button"
            onClick={onBack}
            className="mb-6 rounded-lg border border-red-700 px-4 py-2 font-['Orbitron'] text-[10px] font-black uppercase text-red-700 hover:bg-red-50"
          >
            ← Volver a franquicias
          </button>
          <div className="font-['Orbitron'] text-xl font-black uppercase">
            {teamId}
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Construiremos esta franquicia a partir del modelo de Kansas City.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-3 pt-4 pb-5 md:px-6 md:pt-5 md:pb-7">
      <div className="overflow-hidden rounded-2xl bg-white text-black shadow-2xl">
        <div className="grid grid-cols-2 border-b border-zinc-200">
          <button
            type="button"
            className="relative py-4 font-['Orbitron'] text-sm font-black uppercase text-red-700 md:py-5 md:text-base"
          >
            HOME
            <span className="absolute bottom-0 left-5 right-5 h-[3px] bg-red-700" />
          </button>
          <button
            type="button"
            className="relative py-4 font-['Orbitron'] text-sm font-black uppercase text-zinc-400 md:py-5 md:text-base"
          >
            PLANTILLA
          </button>
        </div>

        <div className="p-5 md:p-8">
          <div className="mb-5 flex justify-end">
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 font-['Orbitron'] text-[9px] font-black uppercase text-red-700 hover:text-red-900 md:text-[10px]"
            >
              <span className="md:hidden">← VOLVER</span>
              <span className="hidden md:inline">← VOLVER A FRANQUICIAS</span>
            </button>
          </div>

          <div className="mb-8 flex items-center gap-4 border-b border-zinc-200 pb-6 md:gap-6">
            <img
              src="https://a.espncdn.com/i/teamlogos/nfl/500/kc.png"
              alt="Kansas City Chiefs"
              className="h-20 w-20 flex-shrink-0 object-contain md:h-28 md:w-28"
            />
            <div className="min-w-0">
              <div className="font-['Orbitron'] text-[10px] font-black uppercase tracking-widest text-zinc-500 md:text-xs">
                AFC Oeste
              </div>
              <h2 className="mt-1 font-['Orbitron'] text-2xl font-black uppercase leading-tight text-[#002244] md:text-4xl">
                Kansas City Chiefs
              </h2>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="mb-3 border-b-2 border-red-700 pb-2">
                <h3 className="font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">
                  Información general
                </h3>
              </div>

              <dl className="text-xs md:text-sm">
                {INFO_KC.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[150px_1fr] gap-3 border-b border-zinc-200 py-2 last:border-b-0 md:grid-cols-[180px_1fr]"
                  >
                    <dt className="font-bold text-zinc-800">{label}</dt>
                    <dd className="font-medium text-zinc-900">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 mb-3 border-b-2 border-red-700 pb-2">
                <h3 className="font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">
                  Palmarés
                </h3>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-zinc-50 p-4">
                  <div className="flex items-baseline gap-4">
                    <div className="font-['Orbitron'] text-3xl font-black text-red-700">4</div>
                    <div>
                      <div className="font-bold text-[#002244]">Super Bowls</div>
                      <div className="mt-1 text-xs text-zinc-500">IV · LIV · LVII · LVIII</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-50 p-4">
                  <div className="flex items-baseline gap-4">
                    <div className="font-['Orbitron'] text-3xl font-black text-red-700">3</div>
                    <div>
                      <div className="font-bold text-[#002244]">Títulos AFL</div>
                      <div className="mt-1 text-xs text-zinc-500">1962 · 1966 · 1969</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 border-b-2 border-red-700 pb-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-end justify-center gap-[2px] rounded-full bg-red-700 px-2 pb-2">
                  <span className="h-2 w-1 bg-white" />
                  <span className="h-3 w-1 bg-white" />
                  <span className="h-4 w-1 bg-white" />
                </div>
                <h3 className="font-['Orbitron'] text-sm font-black uppercase text-red-700 md:text-base">Clasificación AFC Oeste</h3>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="min-w-[620px] w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#002244] text-white">
                      <th className="px-3 py-3 text-left font-black">EQUIPO</th>
                      <th className="px-2 py-3 text-center font-black">G</th>
                      <th className="px-2 py-3 text-center font-black">P</th>
                      <th className="px-2 py-3 text-center font-black">E</th>
                      <th className="px-2 py-3 text-center font-black">PCT</th>
                      <th className="px-2 py-3 text-center font-black">PF</th>
                      <th className="px-2 py-3 text-center font-black">PC</th>
                      <th className="px-2 py-3 text-center font-black">DIF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AFC_WEST.map((equipo) => {
                      const kc = equipo.abrev === "KC";
                      return (
                        <tr key={equipo.abrev} className={`border-b border-zinc-200 ${kc ? "bg-red-50 text-red-700" : "bg-white text-zinc-900"}`}>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <img src={`https://a.espncdn.com/i/teamlogos/nfl/500/${equipo.abrev.toLowerCase()}.png`} alt={equipo.nombre} className="h-8 w-8 flex-shrink-0 object-contain" />
                              <span className="whitespace-nowrap font-bold">{equipo.nombre}</span>
                            </div>
                          </td>
                          <td className="px-2 py-4 text-center font-bold">{equipo.g}</td>
                          <td className="px-2 py-4 text-center font-bold">{equipo.p}</td>
                          <td className="px-2 py-4 text-center font-bold">{equipo.e}</td>
                          <td className="bg-blue-50 px-2 py-4 text-center font-black">{equipo.pct}</td>
                          <td className="px-2 py-4 text-center font-bold">{equipo.pf}</td>
                          <td className="px-2 py-4 text-center font-bold">{equipo.pc}</td>
                          <td className="px-2 py-4 text-center font-bold">{equipo.dif}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">Temporada regular 2025</p>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-6">
            <div className="font-['Orbitron'] text-xs font-black uppercase text-zinc-400">Próximo bloque</div>
            <div className="mt-1 text-sm font-bold text-[#002244]">Resumen estadístico del equipo</div>
          </div>
        </div>
      </div>
    </section>
  );
}
