import { supabaseServer as supabase } from '@/lib/supabaseServer';
import {
  calcularRankingCompeticion,
  PARTICIPANTES_REDZONE,
} from '@/lib/rankingCompetition';

/**
 * Activa el desempate de REDZONE exclusivamente DESPUÉS de la Super Bowl.
 * Esta rama de simulación trabaja únicamente con tablas TEST.
 */
export async function activarDesempateSuperbowlSiProcede() {
  const { data: config, error: configError } = await supabase
    .from('app_config_test')
    .select('temporada, jornada_actual, fase_competicion, semana_postemporada')
    .eq('id', 1)
    .maybeSingle();

  if (configError || !config?.temporada) {
    throw new Error(
      `No se pudo obtener la temporada TEST activa: ${configError?.message || 'app_config_test vacío'}`,
    );
  }

  const temporada = Number(config.temporada);

  const { data: estadoActual, error: estadoError } = await supabase
    .from('desempate_superbowl_estado_test')
    .select('*')
    .eq('temporada', temporada)
    .maybeSingle();

  if (estadoError) {
    throw new Error(
      `Error al consultar estado TEST de desempate: ${estadoError.message}`,
    );
  }

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

  // La Super Bowl es la cuarta ronda de postseason y sigue siendo `playoffs`.
  // No dependemos de la week ESPN (en TR25 es Week 5).
  if (Number(config.semana_postemporada) !== 4) {
    return {
      activado: false,
      resuelto: false,
      motivo: 'La competición TEST todavía no está en la ronda de Super Bowl.',
    };
  }

  const jornadaSuperBowl = Number(config.jornada_actual);
  const { data: superBowl, error: superBowlError } = await supabase
    .from('partidos_test')
    .select('id, jornada, estado, resultado_oficial')
    .eq('temporada', temporada)
    .eq('jornada', jornadaSuperBowl)
    .eq('tipo_competicion', 'playoffs')
    .limit(1)
    .maybeSingle();

  if (superBowlError) {
    throw new Error(`Error comprobando la Super Bowl TEST: ${superBowlError.message}`);
  }

  if (
    !superBowl ||
    superBowl.estado !== 'STATUS_FINAL' ||
    superBowl.resultado_oficial == null
  ) {
    return {
      activado: false,
      resuelto: false,
      motivo: 'La Super Bowl TEST todavía no está finalizada.',
    };
  }

  const { data: pronosticosSb, error: pronosticosError } = await supabase
    .from('pronosticos_test')
    .select('user_id, eleccion, acierto')
    .eq('temporada', temporada)
    .eq('partido_id', superBowl.id)
    .in('user_id', [...PARTICIPANTES_REDZONE]);

  if (pronosticosError) {
    throw new Error(
      `Error comprobando pronósticos TEST de Super Bowl: ${pronosticosError.message}`,
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
      motivo: 'La Super Bowl TEST todavía tiene pronósticos sin validar.',
    };
  }

  const ranking = await calcularRankingCompeticion(temporada);
  const empatados = ranking.lideres.map((p) => p.userId);

  if (empatados.length <= 1) {
    const { error: guardarInactivoError } = await supabase
      .from('desempate_superbowl_estado_test')
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
        `Error guardando estado TEST sin desempate: ${guardarInactivoError.message}`,
      );
    }

    return {
      activado: false,
      resuelto: true,
      motivo: 'La Super Bowl TEST dejó un líder único.',
      participantes: empatados,
      puntosMaximos: ranking.maxPuntos,
    };
  }

  if (empatados.length !== 2 && empatados.length !== 3) {
    throw new Error(
      `Número inesperado de participantes TEST empatados: ${empatados.length}`,
    );
  }

  const { error: activarError } = await supabase
    .from('desempate_superbowl_estado_test')
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
    throw new Error(`Error activando desempate TEST final: ${activarError.message}`);
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
