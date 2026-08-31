import { supabaseServer as supabase } from '@/lib/supabaseServer';
import {
  calcularRankingCompeticion,
  PARTICIPANTES_REDZONE,
} from '@/lib/rankingCompetition';

/**
 * Activa el único desempate de REDZONE exclusivamente DESPUÉS de la Super Bowl.
 *
 * Flujo definitivo:
 * - la Super Bowl se pronostica y valida como cualquier otro partido;
 * - después se calcula el ranking real;
 * - si hay líder único, no existe desempate;
 * - si hay 2 o 3 empatados en cabeza, solo ellos realizan una tirada;
 * - si el valor máximo vuelve a empatar, únicamente esos empatados repiten;
 * - el ganador recibe exactamente 1 punto extra de clasificación.
 *
 * Para no reutilizar en la interfaz el antiguo flujo de "elegir equipo":
 * - `clasificatoria` significa tirada activa;
 * - `inactivo` + `ganador_eleccion` significa desempate ya resuelto.
 *
 * Es idempotente: jamás reinicia un desempate ya resuelto.
 */
export async function activarDesempateSuperbowlSiProcede() {
  const { data: config, error: configError } = await supabase
    .from('app_config')
    .select('temporada, fase_competicion')
    .eq('id', 1)
    .maybeSingle();

  if (configError || !config?.temporada) {
    throw new Error(
      `No se pudo obtener la temporada activa: ${configError?.message || 'app_config vacío'}`,
    );
  }

  const temporada = Number(config.temporada);

  const { data: estadoActual, error: estadoError } = await supabase
    .from('desempate_superbowl_estado')
    .select('*')
    .eq('temporada', temporada)
    .maybeSingle();

  if (estadoError) {
    throw new Error(
      `Error al consultar estado de desempate: ${estadoError.message}`,
    );
  }

  // Resuelto: queda inactivo para que la antigua UI de elección de equipo
  // no pueda aparecer, pero conservamos el ganador para el punto extra.
  if (estadoActual?.estado === 'inactivo' && estadoActual.ganador_eleccion) {
    return {
      activado: false,
      resuelto: true,
      estado: 'inactivo',
      participantes: estadoActual.participantes || [],
      ganador: estadoActual.ganador_eleccion,
      yaExistia: true,
    };
  }

  if (estadoActual && estadoActual.estado !== 'inactivo') {
    return {
      activado: true,
      resuelto: false,
      estado: estadoActual.estado,
      participantes: estadoActual.participantes || [],
      ronda: Number(estadoActual.ronda_actual || 1),
      yaExistia: true,
    };
  }

  // No se puede activar nada hasta que la Super Bowl esté FINAL y validada.
  const { data: superBowl, error: superBowlError } = await supabase
    .from('partidos')
    .select('id, estado, resultado_oficial')
    .eq('temporada', temporada)
    .eq('tipo_competicion', 'superbowl')
    .limit(1)
    .maybeSingle();

  if (superBowlError) {
    throw new Error(`Error comprobando la Super Bowl: ${superBowlError.message}`);
  }

  if (
    !superBowl ||
    superBowl.estado !== 'STATUS_FINAL' ||
    superBowl.resultado_oficial == null
  ) {
    return {
      activado: false,
      resuelto: false,
      motivo: 'La Super Bowl todavía no está finalizada.',
    };
  }

  const { data: pronosticosSb, error: pronosticosError } = await supabase
    .from('pronosticos')
    .select('user_id, eleccion, acierto')
    .eq('partido_id', superBowl.id)
    .in('user_id', [...PARTICIPANTES_REDZONE]);

  if (pronosticosError) {
    throw new Error(
      `Error comprobando pronósticos de Super Bowl: ${pronosticosError.message}`,
    );
  }

  const pendientes = (pronosticosSb || []).filter(
    (p: any) =>
      p.eleccion !== null &&
      p.eleccion !== undefined &&
      typeof p.acierto !== 'boolean',
  );

  if (pendientes.length > 0) {
    return {
      activado: false,
      resuelto: false,
      motivo: 'La Super Bowl todavía tiene pronósticos sin validar.',
    };
  }

  const ranking = await calcularRankingCompeticion(temporada);
  const empatados = ranking.lideres.map((p) => p.userId);

  if (empatados.length <= 1) {
    const { error: guardarInactivoError } = await supabase
      .from('desempate_superbowl_estado')
      .upsert(
        {
          temporada,
          estado: 'inactivo',
          ronda_actual: 1,
          participantes: [],
          finalista_1: null,
          finalista_2: null,
          ganador_eleccion: null,
          eliminado: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'temporada' },
      );

    if (guardarInactivoError) {
      throw new Error(
        `Error guardando estado sin desempate: ${guardarInactivoError.message}`,
      );
    }

    return {
      activado: false,
      resuelto: true,
      motivo: 'La Super Bowl dejó un líder único.',
      participantes: empatados,
      puntosMaximos: ranking.maxPuntos,
    };
  }

  if (empatados.length !== 2 && empatados.length !== 3) {
    throw new Error(
      `Número inesperado de participantes empatados: ${empatados.length}`,
    );
  }

  const { error: activarError } = await supabase
    .from('desempate_superbowl_estado')
    .upsert(
      {
        temporada,
        estado: 'clasificatoria',
        ronda_actual: 1,
        participantes: empatados,
        finalista_1: null,
        finalista_2: null,
        ganador_eleccion: null,
        eliminado: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'temporada' },
    );

  if (activarError) {
    throw new Error(`Error activando desempate final: ${activarError.message}`);
  }

  return {
    activado: true,
    resuelto: false,
    tipo: empatados.length === 3 ? 'triple' : 'doble',
    participantes: empatados,
    puntosMaximos: ranking.maxPuntos,
    ronda: 1,
  };
}
