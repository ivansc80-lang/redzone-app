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
 * Reproduce en servidor la misma regla usada por RANKING en la PWA:
 * - competición real de la temporada: regular + playoffs + Super Bowl;
 * - un pronóstico validado es aquel cuyo acierto es true/false;
 * - cada acierto === true suma exactamente 1 punto;
 * - el liderazgo depende exclusivamente de la puntuación total.
 *
 * En la transición Conference -> Super Bowl, la Super Bowl todavía no tiene
 * resultados, por lo que incluirla en el conjunto no altera la clasificación.
 */
export async function calcularRankingCompeticion(
  temporada: number,
): Promise<RankingCompeticionServidor> {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida para calcular ranking: ${temporada}`);
  }

  const { data: partidos, error: partidosError } = await supabase
    .from('partidos')
    .select('id')
    .eq('temporada', temporada)
    .in('tipo_competicion', ['regular', 'playoffs', 'superbowl']);

  if (partidosError) {
    throw new Error(`Error leyendo partidos para ranking: ${partidosError.message}`);
  }

  const idsPartidos = (partidos || []).map((p: any) => p.id);

  const acumulado = new Map<string, { puntos: number; validados: number }>(
    PARTICIPANTES_REDZONE.map((userId) => [
      userId,
      { puntos: 0, validados: 0 },
    ]),
  );

  if (idsPartidos.length > 0) {
    const { data: pronosticos, error: pronosticosError } = await supabase
      .from('pronosticos')
      .select('user_id, acierto')
      .in('partido_id', idsPartidos)
      .in('user_id', [...PARTICIPANTES_REDZONE]);

    if (pronosticosError) {
      throw new Error(`Error leyendo pronósticos para ranking: ${pronosticosError.message}`);
    }

    for (const pronostico of pronosticos || []) {
      const userId = String(pronostico.user_id || '');
      const actual = acumulado.get(userId);
      if (!actual) continue;

      // Igual que el frontend: solo cuentan para efectividad los ya validados.
      if (pronostico.acierto === true || pronostico.acierto === false) {
        actual.validados += 1;
        if (pronostico.acierto === true) {
          actual.puntos += 1;
        }
      }
    }
  }

  const ranking: RankingParticipanteServidor[] = PARTICIPANTES_REDZONE.map(
    (userId) => {
      const datos = acumulado.get(userId) || { puntos: 0, validados: 0 };
      return {
        userId,
        puntos: datos.puntos,
        validados: datos.validados,
        efectividad:
          datos.validados > 0
            ? Math.round((datos.puntos / datos.validados) * 100)
            : 0,
      };
    },
  ).sort((a, b) => b.puntos - a.puntos);

  const maxPuntos = ranking[0]?.puntos ?? 0;
  const lideres = ranking.filter((participante) => participante.puntos === maxPuntos);

  return {
    temporada,
    ranking,
    maxPuntos,
    lideres,
  };
}
