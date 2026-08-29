export const PICK_CLOSE_MINUTES = 30;
export const CHECKPOINT_MARGIN_HOURS = 4;
export const FIN_JORNADA_MARGIN_HOURS = 24;

export type FranjaNFL =
  | 'tnf'
  | 'friday_games'
  | 'saturday_games'
  | 'early_games'
  | 'late_games'
  | 'snf'
  | 'mnf';

export const FRANJAS_NFL: FranjaNFL[] = [
  'tnf',
  'friday_games',
  'saturday_games',
  'early_games',
  'late_games',
  'snf',
  'mnf',
];

function obtenerDatosEt(fechaIso: string) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(fechaIso));

  const weekday = partes.find((parte) => parte.type === 'weekday')?.value || '';
  const hour = Number(partes.find((parte) => parte.type === 'hour')?.value || '0');

  return { weekday, hour };
}

export function clasificarFranjaNFL(fechaIso: string): FranjaNFL | null {
  const { weekday, hour } = obtenerDatosEt(fechaIso);

  if (weekday === 'Thu') return 'tnf';
  if (weekday === 'Fri') return 'friday_games';
  if (weekday === 'Sat') return 'saturday_games';
  if (weekday === 'Mon') return 'mnf';

  if (weekday === 'Sun') {
    if (hour < 15) return 'early_games';
    if (hour < 19) return 'late_games';
    return 'snf';
  }

  return null;
}

export function calcularRelojAdministrativo(
  partidos: Array<{ fecha_partido: string }>
) {
  if (partidos.length === 0) {
    throw new Error('No se puede calcular el reloj de una jornada sin partidos.');
  }

  const ordenados = [...partidos].sort(
    (a, b) =>
      new Date(a.fecha_partido).getTime() - new Date(b.fecha_partido).getTime()
  );

  const primerKickoff = new Date(ordenados[0].fecha_partido);
  const ultimoKickoff = new Date(ordenados[ordenados.length - 1].fecha_partido);

  const cierrePronosticos = new Date(
    primerKickoff.getTime() - PICK_CLOSE_MINUTES * 60 * 1000
  );

  const grupos = new Map<FranjaNFL, Array<{ fecha_partido: string }>>();
  for (const franja of FRANJAS_NFL) grupos.set(franja, []);

  for (const partido of ordenados) {
    const franja = clasificarFranjaNFL(partido.fecha_partido);
    if (franja) grupos.get(franja)?.push(partido);
  }

  const franjas: Record<string, string | boolean | null> = {};

  for (const franja of FRANJAS_NFL) {
    const partidosFranja = grupos.get(franja) || [];

    if (partidosFranja.length === 0) {
      franjas[franja] = null;
      franjas[`${franja}_validado`] = null;
      continue;
    }

    const ultimoKickoffFranja = Math.max(
      ...partidosFranja.map((p) => new Date(p.fecha_partido).getTime())
    );

    franjas[franja] = new Date(
      ultimoKickoffFranja + CHECKPOINT_MARGIN_HOURS * 60 * 60 * 1000
    ).toISOString();
    franjas[`${franja}_validado`] = null;
  }

  // Mantenemos un hito administrativo separado de ESPN FINAL.
  // Se sitúa 24 h después del último kickoff, dando margen a ESPN,
  // validaciones y PUSH antes de preparar la jornada siguiente.
  const finJornada = new Date(
    ultimoKickoff.getTime() + FIN_JORNADA_MARGIN_HOURS * 60 * 60 * 1000
  );

  return {
    inicio_jornada: primerKickoff.toISOString(),
    cierre_pronosticos: cierrePronosticos.toISOString(),
    fin_jornada: finJornada.toISOString(),
    ...franjas,
  };
}
