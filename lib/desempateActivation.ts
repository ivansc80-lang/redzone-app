import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { calcularRankingCompeticion } from '@/lib/rankingCompetition';

export type ResultadoPreparacionDesempate = {
  requerido: boolean;
  tipo: 'ninguno' | 'simple' | 'doble';
  participantes: string[];
  puntosMaximos: number;
};

/**
 * Prepara el desempate justo antes de activar la Super Bowl.
 * La decisión sale de la misma regla de puntos que usa RANKING:
 * 1 líder -> no hay desempate; 2 -> simple; 3 -> doble.
 *
 * Es idempotente por temporada: si el estado ya está activo/resuelto no lo reinicia.
 */
export async function prepararDesempateSuperBowl(
  temporada: number,
): Promise<ResultadoPreparacionDesempate> {
  const ranking = await calcularRankingCompeticion(temporada);
  const lideres = ranking.lideres.map((p) => p.userId);

  if (lideres.length <= 1) {
    return {
      requerido: false,
      tipo: 'ninguno',
      participantes: lideres,
      puntosMaximos: ranking.maxPuntos,
    };
  }

  if (lideres.length !== 2 && lideres.length !== 3) {
    throw new Error(
      `Número inesperado de líderes para desempate: ${lideres.length}`,
    );
  }

  const { data: existente, error: existenteError } = await supabase
    .from('desempate_superbowl_estado')
    .select('estado, participantes')
    .eq('temporada', temporada)
    .maybeSingle();

  if (existenteError) {
    throw new Error(`Error consultando estado de desempate: ${existenteError.message}`);
  }

  if (existente && existente.estado !== 'inactivo') {
    return {
      requerido: true,
      tipo: lideres.length === 3 ? 'doble' : 'simple',
      participantes: Array.isArray(existente.participantes)
        ? existente.participantes
        : lideres,
      puntosMaximos: ranking.maxPuntos,
    };
  }

  const esTriple = lideres.length === 3;
  const estadoInicial = esTriple ? 'clasificatoria' : 'eleccion_final';

  const payload = {
    temporada,
    estado: estadoInicial,
    ronda_actual: 1,
    participantes: lideres,
    finalista_1: esTriple ? null : lideres[0],
    finalista_2: esTriple ? null : lideres[1],
    eliminado: null,
    ganador_eleccion: null,
    updated_at: new Date().toISOString(),
  };

  const { error: guardarError } = await supabase
    .from('desempate_superbowl_estado')
    .upsert(payload, { onConflict: 'temporada' });

  if (guardarError) {
    throw new Error(`Error preparando desempate de Super Bowl: ${guardarError.message}`);
  }

  return {
    requerido: true,
    tipo: esTriple ? 'doble' : 'simple',
    participantes: lideres,
    puntosMaximos: ranking.maxPuntos,
  };
}
