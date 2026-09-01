import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { intentarTransicionRegularAWildCard } from '@/lib/playoffTransition';

const TABLAS_TEST = {
  config: 'app_config_test',
  jornadas: 'jornadas_eventos_test',
  partidos: 'partidos_test',
  pronosticos: 'pronosticos_test',
} as const;

type ResultadoOficial = '1' | 'X' | '2';

type PartidoTest = {
  id: string;
  jornada: number;
  fecha_partido: string;
  estado: string | null;
  puntos_local: number | null;
  puntos_visitante: number | null;
  resultado_oficial: ResultadoOficial | null;
};

function resultadoDesdeMarcador(partido: PartidoTest): ResultadoOficial {
  const local = Number(partido.puntos_local ?? 0);
  const visitante = Number(partido.puntos_visitante ?? 0);
  return local > visitante ? '1' : local < visitante ? '2' : 'X';
}

function ms(fecha: string | null | undefined) {
  if (!fecha) return Number.POSITIVE_INFINITY;
  const valor = new Date(fecha).getTime();
  return Number.isFinite(valor) ? valor : Number.POSITIVE_INFINITY;
}

export async function sincronizarTemporadaTestActual(ahora = new Date()) {
  const ahoraMs = ahora.getTime();

  const { data: config, error: configError } = await supabase
    .from(TABLAS_TEST.config)
    .select('temporada, jornada_actual, fase_competicion, semana_postemporada')
    .eq('id', 1)
    .maybeSingle();

  if (configError) throw new Error(`TEST: error leyendo app_config_test: ${configError.message}`);
  if (!config) throw new Error('TEST: app_config_test está vacío');

  const temporada = Number(config.temporada);
  const jornada = Number(config.jornada_actual);
  const faseCompeticion = String(config.fase_competicion || 'regular');
  const tipoCompeticionPartidos = faseCompeticion === 'regular' ? 'regular' : 'playoffs';

  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`TEST: temporada inválida: ${config.temporada}`);
  }
  if (!Number.isInteger(jornada) || jornada < 1) {
    throw new Error(`TEST: jornada inválida: ${config.jornada_actual}`);
  }

  const { data: evento, error: eventoError } = await supabase
    .from(TABLAS_TEST.jornadas)
    .select(
      'temporada, jornada_test, fase_temporada, inicio_jornada, cierre_pronosticos, early_games, late_games, mnf, fin_jornada, estado, early_games_validado, late_games_validado, mnf_validado',
    )
    .eq('temporada', temporada)
    .eq('jornada_test', jornada)
    .maybeSingle();

  if (eventoError) throw new Error(`TEST: error leyendo jornadas_eventos_test: ${eventoError.message}`);
  if (!evento) throw new Error(`TEST: no existe J${jornada} de ${temporada} en jornadas_eventos_test`);

  const inicioMs = ms(evento.inicio_jornada);
  const cierreMs = ms(evento.cierre_pronosticos);
  const checkpoint1Ms = ms(evento.early_games);
  const checkpoint2Ms = ms(evento.late_games);
  const checkpoint3Ms = ms(evento.mnf);
  const finMs = ms(evento.fin_jornada);

  if (ahoraMs < inicioMs) {
    return {
      mode: 'tr25_test',
      temporada,
      jornada,
      estado: evento.estado,
      fase: 'esperando_inicio',
      siguienteHito: evento.inicio_jornada,
    };
  }

  if (evento.estado === 'pendiente' && ahoraMs >= cierreMs) {
    const { error } = await supabase
      .from(TABLAS_TEST.jornadas)
      .update({ estado: 'cerrada' })
      .eq('temporada', temporada)
      .eq('jornada_test', jornada)
      .eq('estado', 'pendiente');

    if (error) throw new Error(`TEST: error cerrando J${jornada}: ${error.message}`);
  }

  const { data: partidosRaw, error: partidosError } = await supabase
    .from(TABLAS_TEST.partidos)
    .select('id, jornada, fecha_partido, estado, puntos_local, puntos_visitante, resultado_oficial')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', tipoCompeticionPartidos)
    .order('fecha_partido', { ascending: true })
    .order('espn_event_id', { ascending: true });

  if (partidosError) throw new Error(`TEST: error leyendo partidos_test J${jornada}: ${partidosError.message}`);
  const partidos = (partidosRaw || []) as PartidoTest[];
  if (partidos.length === 0) {
    throw new Error(
      `TEST: J${jornada} no tiene partidos_test para tipo_competicion=${tipoCompeticionPartidos}`,
    );
  }

  const finBloque1Ms = inicioMs + 4 * 60_000;
  const finBloque2Ms = inicioMs + 6 * 60_000;
  const finBloque3Ms = inicioMs + 8 * 60_000;

  const bloqueDe = (partido: PartidoTest) => {
    const offsetMin = Math.round((ms(partido.fecha_partido) - inicioMs) / 60_000);
    if (offsetMin <= 2) return 1;
    if (offsetMin <= 5) return 2;
    return 3;
  };

  const debeFinalizar = (partido: PartidoTest) => {
    const bloque = bloqueDe(partido);
    if (bloque === 1) return ahoraMs >= finBloque1Ms;
    if (bloque === 2) return ahoraMs >= finBloque2Ms;
    return ahoraMs >= finBloque3Ms;
  };

  const idsFinalizables = partidos.filter(debeFinalizar).map((p) => p.id);

  for (const partido of partidos) {
    if (!idsFinalizables.includes(partido.id)) continue;

    const resultado = resultadoDesdeMarcador(partido);
    const { error } = await supabase
      .from(TABLAS_TEST.partidos)
      .update({
        estado: 'STATUS_FINAL',
        periodo: 4,
        reloj: '0:00',
        resultado_oficial: resultado,
      })
      .eq('id', partido.id)
      .eq('temporada', temporada);

    if (error) throw new Error(`TEST: error finalizando partido ${partido.id}: ${error.message}`);

    const { error: aciertosError } = await supabase
      .from(TABLAS_TEST.pronosticos)
      .update({ acierto: true })
      .eq('partido_id', partido.id)
      .eq('temporada', temporada)
      .eq('eleccion', resultado);

    if (aciertosError) throw new Error(`TEST: error validando aciertos ${partido.id}: ${aciertosError.message}`);

    const { error: fallosError } = await supabase
      .from(TABLAS_TEST.pronosticos)
      .update({ acierto: false })
      .eq('partido_id', partido.id)
      .eq('temporada', temporada)
      .neq('eleccion', resultado);

    if (fallosError) throw new Error(`TEST: error validando fallos ${partido.id}: ${fallosError.message}`);
  }

  const cambiosCheckpoints: Record<string, boolean> = {};
  if (ahoraMs >= checkpoint1Ms) cambiosCheckpoints.early_games_validado = true;
  if (ahoraMs >= checkpoint2Ms) cambiosCheckpoints.late_games_validado = true;
  if (ahoraMs >= checkpoint3Ms) cambiosCheckpoints.mnf_validado = true;

  if (Object.keys(cambiosCheckpoints).length > 0) {
    const { error } = await supabase
      .from(TABLAS_TEST.jornadas)
      .update(cambiosCheckpoints)
      .eq('temporada', temporada)
      .eq('jornada_test', jornada);

    if (error) throw new Error(`TEST: error actualizando checkpoints J${jornada}: ${error.message}`);
  }

  const { data: partidosVerificados, error: verificarPartidosError } = await supabase
    .from(TABLAS_TEST.partidos)
    .select('id, estado, resultado_oficial')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', tipoCompeticionPartidos);

  if (verificarPartidosError) throw new Error(`TEST: error verificando partidos J${jornada}: ${verificarPartidosError.message}`);

  const todosFinalizados = (partidosVerificados || []).length === partidos.length &&
    (partidosVerificados || []).every(
      (p: any) => p.estado === 'STATUS_FINAL' && p.resultado_oficial !== null,
    );

  const idsPartidos = (partidosVerificados || []).map((p: any) => p.id);
  const { data: pronosticos, error: pronosticosError } = await supabase
    .from(TABLAS_TEST.pronosticos)
    .select('partido_id, eleccion, acierto')
    .eq('temporada', temporada)
    .in('partido_id', idsPartidos);

  if (pronosticosError) throw new Error(`TEST: error verificando pronosticos_test J${jornada}: ${pronosticosError.message}`);

  const pronosticosValidados = (pronosticos || [])
    .filter((p: any) => p.eleccion !== null)
    .every((p: any) => typeof p.acierto === 'boolean');

  const checkpointsOk =
    ahoraMs >= checkpoint3Ms &&
    Boolean(cambiosCheckpoints.mnf_validado || evento.mnf_validado) &&
    Boolean(cambiosCheckpoints.early_games_validado || evento.early_games_validado) &&
    Boolean(cambiosCheckpoints.late_games_validado || evento.late_games_validado);

  if (ahoraMs >= finMs && todosFinalizados && pronosticosValidados && checkpointsOk) {
    const { error: finalizarError } = await supabase
      .from(TABLAS_TEST.jornadas)
      .update({ estado: 'finalizada' })
      .eq('temporada', temporada)
      .eq('jornada_test', jornada);

    if (finalizarError) throw new Error(`TEST: error finalizando J${jornada}: ${finalizarError.message}`);

    const { data: siguiente, error: siguienteError } = await supabase
      .from(TABLAS_TEST.jornadas)
      .select('jornada_test, fase_temporada')
      .eq('temporada', temporada)
      .eq('jornada_test', jornada + 1)
      .maybeSingle();

    if (siguienteError) {
      throw new Error(`TEST: error buscando J${jornada + 1}: ${siguienteError.message}`);
    }

    // La transición regular -> postseason NO puede usar la transición genérica.
    // J18 permanece como contexto activo hasta que Wild Card esté preparada y
    // la fase + semana postseason + jornada cambien juntas en un único UPDATE.
    if (faseCompeticion === 'regular' && siguiente?.fase_temporada === 'postseason') {
      const transicionPlayoffs = await intentarTransicionRegularAWildCard(temporada, jornada);

      if (!transicionPlayoffs.transicion) {
        return {
          mode: 'tr25_test',
          temporada,
          jornada,
          estado: 'finalizada',
          fase: 'regular_completa',
          siguienteJornada: null,
          motivo: transicionPlayoffs.motivo,
        };
      }

      return {
        mode: 'tr25_test',
        temporada,
        jornada,
        estado: 'finalizada',
        fase: 'transicion_playoffs',
        siguienteJornada: transicionPlayoffs.jornadaNueva,
        faseCompeticion: transicionPlayoffs.faseCompeticion,
        semanaPostemporada: transicionPlayoffs.semanaPostemporada,
      };
    }

    if (siguiente && siguiente.fase_temporada === 'regular') {
      const { error: activarError } = await supabase
        .from(TABLAS_TEST.config)
        .update({ jornada_actual: jornada + 1, jornada_test_actual: jornada + 1 })
        .eq('id', 1)
        .eq('temporada', temporada)
        .eq('jornada_actual', jornada);

      if (activarError) throw new Error(`TEST: error activando J${jornada + 1}: ${activarError.message}`);

      return {
        mode: 'tr25_test',
        temporada,
        jornada,
        estado: 'finalizada',
        fase: 'transicion',
        siguienteJornada: jornada + 1,
      };
    }

    return {
      mode: 'tr25_test',
      temporada,
      jornada,
      estado: 'finalizada',
      fase: faseCompeticion === 'regular' ? 'regular_completa' : 'postseason_completa',
      siguienteJornada: null,
    };
  }

  let fase = 'jornada_abierta';
  if (ahoraMs >= cierreMs) fase = 'porra_cerrada';
  if (ahoraMs >= finBloque1Ms) fase = 'bloque_1_finalizado';
  if (ahoraMs >= checkpoint1Ms) fase = 'checkpoint_1';
  if (ahoraMs >= finBloque2Ms) fase = 'bloque_2_finalizado';
  if (ahoraMs >= checkpoint2Ms) fase = 'checkpoint_2';
  if (ahoraMs >= finBloque3Ms) fase = 'bloque_3_finalizado';
  if (ahoraMs >= checkpoint3Ms) fase = 'checkpoint_3';
  if (ahoraMs >= finMs) fase = 'esperando_validacion_final';

  return {
    mode: 'tr25_test',
    temporada,
    jornada,
    estado: ahoraMs >= cierreMs ? 'cerrada' : 'pendiente',
    fase,
    faseCompeticion,
    partidos: partidos.length,
    finalizados: (partidosVerificados || []).filter((p: any) => p.estado === 'STATUS_FINAL').length,
    pronosticosValidados,
    checkpointsOk,
  };
}
