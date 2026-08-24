"use client";

type Franchise = {
  id: string;
  nombre: string;
  abrev: string;
  logo: string;
  division: string;
};

const FRANQUICIAS: Franchise[] = [
  { id:"BUF", nombre:"Buffalo Bills", abrev:"BUF", logo:"buf", division:"AFC ESTE" },
  { id:"MIA", nombre:"Miami Dolphins", abrev:"MIA", logo:"mia", division:"AFC ESTE" },
  { id:"NE", nombre:"New England Patriots", abrev:"NE", logo:"ne", division:"AFC ESTE" },
  { id:"NYJ", nombre:"New York Jets", abrev:"NYJ", logo:"nyj", division:"AFC ESTE" },

  { id:"BAL", nombre:"Baltimore Ravens", abrev:"BAL", logo:"bal", division:"AFC NORTE" },
  { id:"CIN", nombre:"Cincinnati Bengals", abrev:"CIN", logo:"cin", division:"AFC NORTE" },
  { id:"CLE", nombre:"Cleveland Browns", abrev:"CLE", logo:"cle", division:"AFC NORTE" },
  { id:"PIT", nombre:"Pittsburgh Steelers", abrev:"PIT", logo:"pit", division:"AFC NORTE" },

  { id:"HOU", nombre:"Houston Texans", abrev:"HOU", logo:"hou", division:"AFC SUR" },
  { id:"IND", nombre:"Indianapolis Colts", abrev:"IND", logo:"ind", division:"AFC SUR" },
  { id:"JAX", nombre:"Jacksonville Jaguars", abrev:"JAX", logo:"jax", division:"AFC SUR" },
  { id:"TEN", nombre:"Tennessee Titans", abrev:"TEN", logo:"ten", division:"AFC SUR" },

  { id:"DEN", nombre:"Denver Broncos", abrev:"DEN", logo:"den", division:"AFC OESTE" },
  { id:"KC", nombre:"Kansas City Chiefs", abrev:"KC", logo:"kc", division:"AFC OESTE" },
  { id:"LV", nombre:"Las Vegas Raiders", abrev:"LV", logo:"lv", division:"AFC OESTE" },
  { id:"LAC", nombre:"Los Angeles Chargers", abrev:"LAC", logo:"lac", division:"AFC OESTE" },

  { id:"DAL", nombre:"Dallas Cowboys", abrev:"DAL", logo:"dal", division:"NFC ESTE" },
  { id:"NYG", nombre:"New York Giants", abrev:"NYG", logo:"nyg", division:"NFC ESTE" },
  { id:"PHI", nombre:"Philadelphia Eagles", abrev:"PHI", logo:"phi", division:"NFC ESTE" },
  { id:"WSH", nombre:"Washington Commanders", abrev:"WSH", logo:"wsh", division:"NFC ESTE" },

  { id:"CHI", nombre:"Chicago Bears", abrev:"CHI", logo:"chi", division:"NFC NORTE" },
  { id:"DET", nombre:"Detroit Lions", abrev:"DET", logo:"det", division:"NFC NORTE" },
  { id:"GB", nombre:"Green Bay Packers", abrev:"GB", logo:"gb", division:"NFC NORTE" },
  { id:"MIN", nombre:"Minnesota Vikings", abrev:"MIN", logo:"min", division:"NFC NORTE" },

  { id:"ATL", nombre:"Atlanta Falcons", abrev:"ATL", logo:"atl", division:"NFC SUR" },
  { id:"CAR", nombre:"Carolina Panthers", abrev:"CAR", logo:"car", division:"NFC SUR" },
  { id:"NO", nombre:"New Orleans Saints", abrev:"NO", logo:"no", division:"NFC SUR" },
  { id:"TB", nombre:"Tampa Bay Buccaneers", abrev:"TB", logo:"tb", division:"NFC SUR" },

  { id:"ARI", nombre:"Arizona Cardinals", abrev:"ARI", logo:"ari", division:"NFC OESTE" },
  { id:"LAR", nombre:"Los Angeles Rams", abrev:"LAR", logo:"lar", division:"NFC OESTE" },
  { id:"SF", nombre:"San Francisco 49ers", abrev:"SF", logo:"sf", division:"NFC OESTE" },
  { id:"SEA", nombre:"Seattle Seahawks", abrev:"SEA", logo:"sea", division:"NFC OESTE" },
];

const ORDEN_DIVISIONES = [
  "AFC ESTE", "AFC NORTE", "AFC SUR", "AFC OESTE",
  "NFC ESTE", "NFC NORTE", "NFC SUR", "NFC OESTE",
];

export default function FranchiseSelector({
  onSelect,
}: {
  onSelect: (teamId: string) => void;
}) {
  return (
    <section className="px-3 pt-4 pb-5 md:px-6 md:pt-5 md:pb-7">
      <div className="bg-white text-black rounded-2xl shadow-2xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-8 flex items-start gap-4 md:gap-5">
          <img
            src="https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png"
            alt="NFL"
            className="h-14 w-14 flex-shrink-0 object-contain md:h-20 md:w-20"
          />

          <div className="min-w-0 pt-1">
            <h2 className="font-['Orbitron'] text-xl md:text-3xl font-black uppercase tracking-tight text-red-700">
              Franquicias NFL
            </h2>
            <p className="mt-1 text-xs md:text-sm text-zinc-500">
              Selecciona un equipo para ver su información.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 xl:grid-cols-4">
          {ORDEN_DIVISIONES.map((division) => (
            <div key={division} className="min-w-0">
              <div className="mb-3 border-b border-zinc-200 pb-2 font-['Orbitron'] text-[10px] font-black uppercase tracking-wide text-[#002244]">
                {division}
                <span className="mt-1 block h-[2px] w-8 rounded-full bg-red-600" />
              </div>

              <div className="space-y-2">
                {FRANQUICIAS.filter((equipo) => equipo.division === division).map(
                  (equipo) => (
                    <button
                      key={equipo.id}
                      type="button"
                      onClick={() => onSelect(equipo.id)}
                      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-all hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <img
                        src={`https://a.espncdn.com/i/teamlogos/nfl/500/${equipo.logo}.png`}
                        alt={equipo.nombre}
                        className="h-9 w-9 flex-shrink-0 object-contain transition-transform group-hover:scale-110 md:h-10 md:w-10"
                      />

                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-zinc-900 md:text-base">
                          {equipo.nombre}
                        </div>
                        <div className="text-[9px] font-semibold text-zinc-400">
                          {equipo.abrev}
                        </div>
                      </div>
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
