"use client";

type Props = {
  teamId: string;
  onBack: () => void;
};

const AFC_WEST = [
  { nombre: "Denver Broncos", abrev: "DEN", record: "14-3" },
  { nombre: "Los Angeles Chargers", abrev: "LAC", record: "11-6" },
  { nombre: "Kansas City Chiefs", abrev: "KC", record: "6-11" },
  { nombre: "Las Vegas Raiders", abrev: "LV", record: "3-14" },
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
          <button
            type="button"
            onClick={onBack}
            className="mb-6 rounded-lg border border-red-700 px-4 py-2 font-['Orbitron'] text-[10px] font-black uppercase text-red-700 hover:bg-red-50"
          >
            ← Volver a franquicias
          </button>

          <div className="mb-7 flex items-center gap-4 border-b border-zinc-200 pb-6 md:gap-6">
            <img
              src="https://a.espncdn.com/i/teamlogos/nfl/500/kc.png"
              alt="Kansas City Chiefs"
              className="h-20 w-20 object-contain md:h-28 md:w-28"
            />
            <div>
              <div className="font-['Orbitron'] text-[10px] font-black uppercase tracking-widest text-red-700">
                AFC Oeste
              </div>
              <h2 className="mt-1 font-['Orbitron'] text-2xl font-black uppercase leading-tight text-[#002244] md:text-4xl">
                Kansas City Chiefs
              </h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 border-b-2 border-red-700 pb-2 font-['Orbitron'] text-sm font-black uppercase text-red-700">
                  Información general
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2"><dt className="font-bold text-zinc-500">Fundación</dt><dd className="text-right font-semibold">1959</dd></div>
                  <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2"><dt className="font-bold text-zinc-500">Ciudad</dt><dd className="text-right font-semibold">Kansas City, Missouri</dd></div>
                  <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2"><dt className="font-bold text-zinc-500">Estadio</dt><dd className="text-right font-semibold">GEHA Field at Arrowhead Stadium</dd></div>
                  <div className="flex justify-between gap-4 border-b border-zinc-100 pb-2"><dt className="font-bold text-zinc-500">Entrenador</dt><dd className="text-right font-semibold">Andy Reid</dd></div>
                  <div className="flex justify-between gap-4"><dt className="font-bold text-zinc-500">Fundador</dt><dd className="text-right font-semibold">Lamar Hunt</dd></div>
                </dl>
              </div>

              <div>
                <h3 className="mb-3 border-b-2 border-red-700 pb-2 font-['Orbitron'] text-sm font-black uppercase text-red-700">
                  Palmarés
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <div className="font-['Orbitron'] text-2xl font-black text-red-700">4</div>
                    <div className="mt-1 font-bold text-[#002244]">Super Bowls</div>
                    <div className="mt-1 text-xs text-zinc-500">IV · LIV · LVII · LVIII</div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <div className="font-['Orbitron'] text-2xl font-black text-red-700">3</div>
                    <div className="mt-1 font-bold text-[#002244]">Títulos AFL</div>
                    <div className="mt-1 text-xs text-zinc-500">1962 · 1966 · 1969</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 border-b-2 border-[#002244] pb-2 font-['Orbitron'] text-sm font-black uppercase text-[#002244]">
                AFC Oeste
              </h3>
              <div className="overflow-hidden rounded-xl border border-zinc-200">
                {AFC_WEST.map((equipo, index) => (
                  <div
                    key={equipo.abrev}
                    className={`grid grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-zinc-100 px-3 py-3 last:border-b-0 ${equipo.abrev === "KC" ? "bg-red-50" : "bg-white"}`}
                  >
                    <span className="text-xs font-black text-zinc-400">{index + 1}</span>
                    <div className="flex min-w-0 items-center gap-2">
                      <img
                        src={`https://a.espncdn.com/i/teamlogos/nfl/500/${equipo.abrev.toLowerCase()}.png`}
                        alt={equipo.nombre}
                        className="h-8 w-8 flex-shrink-0 object-contain"
                      />
                      <span className="truncate text-xs font-bold md:text-sm">{equipo.nombre}</span>
                    </div>
                    <span className="text-xs font-black text-zinc-600">{equipo.record}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                Temporada regular 2025
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-6">
            <div className="font-['Orbitron'] text-xs font-black uppercase text-zinc-400">
              Próximo bloque
            </div>
            <div className="mt-1 text-sm font-bold text-[#002244]">
              Resumen estadístico del equipo
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
