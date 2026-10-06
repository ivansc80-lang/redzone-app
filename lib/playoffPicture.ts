import { supabaseServer } from '@/lib/supabaseServer';
export type ConferenciaPlayoffPicture = "AFC" | "NFC";

export interface EquipoPlayoffPicture {
  equipo: string;
  conferencia: ConferenciaPlayoffPicture;
  seed: number;
  G: number;
  P: number;
  E: number;
  PCT: number;
  HOME: string;
  ROAD: string;
  clincher: string;
}

interface EspnStandingStat {
  name?: string;
  value?: number;
  displayValue?: string;
}

interface EspnStandingEntry {
  team?: {
    abbreviation?: string;
  };
  stats?: EspnStandingStat[];
}

function buscarStat(
  entrada: EspnStandingEntry,
  nombre: string,
): EspnStandingStat | undefined {
  const objetivo = nombre.toLowerCase();

  return entrada.stats?.find(
    (stat) => stat.name?.toLowerCase() === objetivo,
  );
}

function valorNumerico(
  entrada: EspnStandingEntry,
  nombre: string,
): number {
  const stat = buscarStat(entrada, nombre);

  if (typeof stat?.value === "number" && Number.isFinite(stat.value)) {
    return stat.value;
  }

  const desdeDisplay = Number(stat?.displayValue);

  return Number.isFinite(desdeDisplay) ? desdeDisplay : 0;
}

function extraerEquipoPlayoffPicture(
  entrada: EspnStandingEntry,
  conferencia: ConferenciaPlayoffPicture,
): EquipoPlayoffPicture | null {
  const equipo = entrada.team?.abbreviation?.trim().toUpperCase() ?? "";
  const statSeed = buscarStat(entrada, "playoffSeed");

  if (
    !equipo ||
    typeof statSeed?.value !== "number" ||
    !Number.isInteger(statSeed.value) ||
    statSeed.value < 1 ||
    statSeed.value > 16
  ) {
    return null;
  }

  return {
    equipo,
    conferencia,
    seed: statSeed.value,
    G: valorNumerico(entrada, "wins"),
    P: valorNumerico(entrada, "losses"),
    E: valorNumerico(entrada, "ties"),
    PCT: valorNumerico(entrada, "winPercent"),
    HOME: buscarStat(entrada, "Home")?.displayValue?.trim() ?? "",
    ROAD: buscarStat(entrada, "Road")?.displayValue?.trim() ?? "",
    clincher:
      buscarStat(entrada, "clincher")?.displayValue?.trim().toLowerCase() ?? "",
  };
}

export async function obtenerPlayoffPictureEspn(
  temporada: number,
): Promise<EquipoPlayoffPicture[]> {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida para ESPN: ${temporada}`);
  }

  const url =
    `https://site.api.espn.com/apis/v2/sports/football/nfl/standings?season=${temporada}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `ESPN Playoff Picture ${temporada} respondió HTTP ${response.status}.`,
    );
  }

  const data = await response.json();

  const grupos: Array<{
    conferencia: ConferenciaPlayoffPicture;
    entries: EspnStandingEntry[];
  }> = ["AFC", "NFC"].map((conferencia) => {
    const grupo = data.children?.find(
      (item: any) =>
        String(item?.abbreviation ?? "").toUpperCase() === conferencia,
    );

    if (!grupo?.standings?.entries) {
      throw new Error(
        `ESPN ${temporada}: no se encontraron standings de ${conferencia}.`,
      );
    }

    return {
      conferencia: conferencia as ConferenciaPlayoffPicture,
      entries: grupo.standings.entries,
    };
  });

  const equipos = grupos.flatMap(({ conferencia, entries }) =>
    entries
      .map((entrada) =>
        extraerEquipoPlayoffPicture(entrada, conferencia),
      )
      .filter(
        (equipo): equipo is EquipoPlayoffPicture => equipo !== null,
      )
      .sort((a, b) => a.seed - b.seed),
  );

  const afc = equipos.filter((equipo) => equipo.conferencia === "AFC");
  const nfc = equipos.filter((equipo) => equipo.conferencia === "NFC");

  if (afc.length !== 16 || nfc.length !== 16) {
    throw new Error(
      `ESPN ${temporada}: Playoff Picture incompleto ` +
        `(AFC=${afc.length}, NFC=${nfc.length}).`,
    );
  }

  return equipos;
}


export type MomentoPlayoffPicture = "APERTURA" | "SABADO" | "LUNES";

export interface ResultadoPersistenciaPlayoffPicture {
  temporada: number;
  jornada: number;
  momento: MomentoPlayoffPicture;
  filas: number;
}

function validarFotografiaPlayoffPicture(
  equipos: EquipoPlayoffPicture[],
): void {
  if (equipos.length !== 32) {
    throw new Error(
      `Playoff Picture inválido: ESPN debe aportar 32 equipos y ha aportado ${equipos.length}.`,
    );
  }

  const codigos = new Set(equipos.map((equipo) => equipo.equipo));

  if (codigos.size !== 32) {
    throw new Error(
      "Playoff Picture inválido: existen equipos duplicados.",
    );
  }

  for (const conferencia of ["AFC", "NFC"] as const) {
    const equiposConferencia = equipos.filter(
      (equipo) => equipo.conferencia === conferencia,
    );

    if (equiposConferencia.length !== 16) {
      throw new Error(
        `Playoff Picture inválido: ${conferencia} debe contener 16 equipos y contiene ${equiposConferencia.length}.`,
      );
    }

    const seeds = equiposConferencia
      .map((equipo) => equipo.seed)
      .sort((a, b) => a - b);

    const seedsEsperados = Array.from(
      { length: 16 },
      (_, indice) => indice + 1,
    );

    if (
      seeds.some(
        (seed, indice) => seed !== seedsEsperados[indice],
      )
    ) {
      throw new Error(
        `Playoff Picture inválido: ${conferencia} no contiene exactamente los seeds 1-16.`,
      );
    }
  }
}

export async function persistirPlayoffPicture(
  temporada: number,
  jornada: number,
  momento: MomentoPlayoffPicture,
  equipos: EquipoPlayoffPicture[],
): Promise<ResultadoPersistenciaPlayoffPicture> {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(
      `Temporada inválida para Playoff Picture: ${temporada}.`,
    );
  }

  if (!Number.isInteger(jornada) || jornada < 5 || jornada > 18) {
    throw new Error(
      `Playoff Picture permitido entre J5 y J18. Recibida J${jornada}.`,
    );
  }

  if (!["APERTURA", "SABADO", "LUNES"].includes(momento)) {
    throw new Error(
      `Momento inválido para Playoff Picture: ${momento}.`,
    );
  }

  validarFotografiaPlayoffPicture(equipos);

  // Una fotografía = un único instante para sus 32 equipos.
  const capturadoAt = new Date().toISOString();

  const filas = equipos.map((equipo) => ({
    temporada,
    jornada,
    momento,
    equipo: equipo.equipo,
    conferencia: equipo.conferencia,
    seed: equipo.seed,
    g: equipo.G,
    p: equipo.P,
    e: equipo.E,
    pct: equipo.PCT,
    home: equipo.HOME,
    road: equipo.ROAD,
    clincher: equipo.clincher,
    capturado_at: capturadoAt,
  }));

  const { error } = await supabaseServer
    .from("playoff_picture")
    .upsert(filas, {
      onConflict: "temporada,jornada,momento,equipo",
    });

  if (error) {
    throw new Error(
      `Error persistiendo Playoff Picture: ${error.message}`,
    );
  }

  return {
    temporada,
    jornada,
    momento,
    filas: filas.length,
  };
}
