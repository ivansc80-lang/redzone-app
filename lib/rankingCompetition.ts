import { supabaseServer as supabase } from '@/lib/supabaseServer';

export const PARTICIPANTES_REDZONE = [
  '088072d0-0782-409f-b5e4-f8a558f27b4f', // Cace
  'dadb359a-8bc1-442e-8202-62fa2f8ddab9', // Juanjo
  '351a81a5-86f9-4d6d-a567-f49ed5959e57', // Iván
] as const;

export type ParticipanteRedzone = (typeof PARTICIPANTES_REDZONE)[number];

export interface RankingParticipanteServidor {
  userId: string;
  puntos: number;
  validados: number;
  efectividad: number;
}

export interface RankingCompeticionServidor {
  temporada: number;
  ranking: RankingParticipanteServidor[];
  maxPuntos: number;
  lideres: RankingParticipanteServidor[];
}

/**
 * Fuente servidor de RANKING REDZONE para la simulación TR25/TR26.
 * Esta rama trabaja exclusivamente contra las tablas TEST:
 * - partidos_test
 * - pronosticos_test
 * - desempate_superbowl_estado_test
 *
 * La Super Bowl sigue perteneciendo a `playoffs`; no existe un tercer
 * tipo de competición necesario para el ranking.
 */
export async function calcularRankingCompeticion(
  temporada: number,
): Promise<RankingCompeticionServidor> {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida para calcular ranking: ${temporada}`);
  }

  const { data: partidos, error: partidosError } = await supabase
    .from('partidos_test')
    .select('id')
    .eq('temporada', temporada)
    .in('tipo_competicion', ['regular', 'playoffs']);

  if (partidosError) {
    throw new Error(`Error leyendo partidos TEST para ranking: ${partidosError.message}`);
  }

  const idsPartidos = (partidos || []).map((p: any) => p.id);

  const acumulado = new Map<string, { puntos: number; validados: number }>(
    PARTICIPANTES_REDZONE.map((userId) => [userId, { puntos: 0, validados: 0 }]),
  );

  if (idsPartidos.length > 0) {
    const { data: pronosticos, error: pronosticosError } = await supabase
      .from('pronosticos_test')
      .select('user_id, acierto')
      .in('partido_id', idsPartidos)
      .in('user_id', [...PARTICIPANTES_REDZONE]);

    if (pronosticosError) {
      throw new Error(`Error leyendo pronósticos TEST para ranking: ${pronosticosError.message}`);
    }

    for (const pronostico of pronosticos || []) {
      const userId = String(pronostico.user_id || '');
      const actual = acumulado.get(userId);
      if (!actual) continue;

      if (pronostico.acierto === true || pronostico.acierto === false) {
        actual.validados += 1;
        if (pronostico.acierto === true) actual.puntos += 1;
      }
    }
  }

  const { data: desempate, error: desempateError } = await supabase
    .from('desempate_superbowl_estado_test')
    .select('estado, ganador_eleccion')
    .eq('temporada', temporada)
    .maybeSingle();

  if (desempateError) {
    throw new Error(`Error leyendo bonus TEST de desempate: ${desempateError.message}`);
  }

  const ganadorBonus = desempate?.ganador_eleccion
    ? String(desempate.ganador_eleccion)
    : null;

  if (ganadorBonus && acumulado.has(ganadorBonus)) {
    acumulado.get(ganadorBonus)!.puntos += 1;
  }

  const ranking: RankingParticipanteServidor[] = PARTICIPANTES_REDZONE.map(
    (userId) => {
      const datos = acumulado.get(userId) || { puntos: 0, validados: 0 };
      const bonus = ganadorBonus === userId ? 1 : 0;

      return {
        userId,
        puntos: datos.puntos,
        validados: datos.validados,
        efectividad:
          datos.validados > 0
            ? Math.round(((datos.puntos - bonus) / datos.validados) * 100)
            : 0,
      };
    },
  ).sort((a, b) => b.puntos - a.puntos);

  const maxPuntos = ranking[0]?.puntos ?? 0;
  const lideres = ranking.filter((participante) => participante.puntos === maxPuntos);

  return { temporada, ranking, maxPuntos, lideres };
}
