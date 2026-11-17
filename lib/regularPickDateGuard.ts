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

/**
 * La fotografía ESPN debe representar una sola jornada.
 * El margen de 14 días permite partidos especiales/reprogramaciones
 * sin aceptar mezclas de semanas separadas.
 */
export function validarFechasJornadaEspn(
  eventos: ReadonlyArray<{ id: unknown; date: unknown }>,
  temporada: number,
  jornada: number,
): void {
  if (!Array.isArray(eventos) || eventos.length === 0) {
    throw new Error(`ESPN J${jornada}: calendario vacío o inválido`);
  }

  const ids = new Set<string>();
  const timestamps: number[] = [];
  for (const evento of eventos) {
    const id = String(evento?.id ?? '');
    if (!id || id === 'null' || id === 'undefined' || ids.has(id)) {
      throw new Error(`ESPN J${jornada}: identificador ausente o duplicado ${id}`);
    }
    ids.add(id);
    timestamps.push(
      validarFechaEspnRegular(evento?.date, temporada, jornada, evento?.id).getTime(),
    );
  }

  const intervaloMs = Math.max(...timestamps) - Math.min(...timestamps);
  if (intervaloMs > 14 * 24 * 60 * 60 * 1000) {
    throw new Error(
      `ESPN J${jornada}: partidos separados más de 14 días; revisar calendario antes de actualizar`,
    );
  }
}
