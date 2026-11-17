// Funciones puras: no acceden a ESPN, Supabase ni al cron.
export function validarFechaEspnRegular(
  fecha: unknown,
  temporada: number,
  jornada: number,
  eventoId: unknown,
): Date {
  if (typeof fecha !== 'string' || !fecha.trim()) {
    throw new Error(`ESPN J${jornada} evento ${String(eventoId)}: fecha ausente`);
  }

  const parsed = new Date(fecha);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`ESPN J${jornada} evento ${String(eventoId)}: fecha inválida ${fecha}`);
  }

  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth() + 1;
  if (!((year === temporada && month >= 8) || (year === temporada + 1 && month <= 2))) {
    throw new Error(
      `ESPN J${jornada} evento ${String(eventoId)}: fecha ${fecha} incompatible con temporada ${temporada}`,
    );
  }
  return parsed;
}

export function cierreGuardadoCoincideConEspn(
  cierreGuardado: string | null,
  cierreEspn: string,
): boolean {
  if (!cierreGuardado) return false;
  const guardadoMs = new Date(cierreGuardado).getTime();
  const espnMs = new Date(cierreEspn).getTime();
  return Number.isFinite(guardadoMs) &&
    Number.isFinite(espnMs) &&
    Math.abs(guardadoMs - espnMs) <= 60_000;
}

export function debeCerrarPorra(
  estado: string | null,
  cierreGuardado: string | null,
  cierreEspn: string,
  ahora: Date,
): boolean {
  return estado === 'pendiente' &&
    cierreGuardadoCoincideConEspn(cierreGuardado, cierreEspn) &&
    Number.isFinite(ahora.getTime()) &&
    ahora.getTime() >= new Date(cierreEspn).getTime();
}
