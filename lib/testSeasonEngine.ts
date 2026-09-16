import { supabaseServer as supabase } from '@/lib/supabaseServer';
import {
  intentarTransicionRegularAWildCard,
  intentarTransicionSiguienteRondaPlayoff,
} from '@/lib/playoffTransition';
import { activarDesempateSuperbowlSiProcede } from '@/lib/activarDesempateSuperbowl';
import { calcularRankingCompeticion } from '@/lib/rankingCompetition';
import { gestionarCicloAnualTest } from '@/lib/testAnnualLifecycle';

const TABLAS_TEST = {
  config: 'app_config_test',
  jornadas: 'jornadas_eventos_test',
  partidos: 'partidos_test',
  pronosticos: 'pronosticos_test',
} as const;

const ESPERA_POST_SUPERBOWL_MS = 72 * 60 * 60 * 1000;

type ResultadoOficial = '1' | 'X' | '2';
type PartidoTest = { id: string; jornada: number; fecha_partido: string; estado: string | null; puntos_local: number | null; puntos_visitante: number | null; resultado_oficial: ResultadoOficial | null; };

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

async function obtenerOCrearT0Superbowl(params:{
  temporada:number;
  jornada:number;
  ahora:Date;
  t0Config:string|null|undefined;
  temporadaT0Config:number|null|undefined;
}) {
  const { temporada, jornada, ahora, t0Config, temporadaT0Config } = params;

  if (temporadaT0Config === temporada && t0Config) {
    const existente = new Date(t0Config);
    if (!Number.isNaN(existente.getTime())) return existente;
  }

  const t0 = ahora.toISOString();
  const { data, error } = await supabase
    .from(TABLAS_TEST.config)
    .update({ superbowl_final_t0:t0, superbowl_final_t0_temporada:temporada })
    .eq('id',1)
    .eq('temporada',temporada)
    .eq('jornada_actual',jornada)
    .select('superbowl_final_t0, superbowl_final_t0_temporada')
    .maybeSingle();

  if (error) throw new Error(`TEST: error guardando T0 de la Super Bowl: ${error.message}`);
  if (!data?.superbowl_final_t0 || Number(data.superbowl_final_t0_temporada) !== temporada) {
    throw new Error('TEST: no se pudo persistir T0 de la Super Bowl');
  }

  return new Date(data.superbowl_final_t0);
}

async function resolverT72Superbowl(params:{
  temporada:number;
  jornada:number;
  ahora:Date;
  t0:Date;
}) {
  const { temporada, jornada, ahora, t0 } = params;
  const finEspera = new Date(t0.getTime() + ESPERA_POST_SUPERBOWL_MS);
  const restanteMs = Math.max(0, finEspera.getTime() - ahora.getTime());

  if (restanteMs > 0) {
    return {
      finalizada:false as const,
      t0:t0.toISOString(),
      t72:finEspera.toISOString(),
      restanteMs,
    };
  }

  const { error } = await supabase
    .from(TABLAS_TEST.config)
    .update({ fase_competicion:'finalizada' })
    .eq('id',1)
    .eq('temporada',temporada)
    .eq('jornada_actual',jornada)
    .neq('fase_competicion','finalizada');

  if (error) throw new Error(`TEST: error marcando temporada ${temporada} como finalizada tras T+72: ${error.message}`);

  return {
    finalizada:true as const,
    t0:t0.toISOString(),
    t72:finEspera.toISOString(),
    restanteMs:0,
  };
}

export async function sincronizarTemporadaTestActual(ahora = new Date()) {
  const ahoraMs = ahora.getTime();
  const { data: config, error: configError } = await supabase.from(TABLAS_TEST.config)
    .select('temporada, temporada_objetivo, jornada_actual, fase_competicion, semana_postemporada, superbowl_final_t0, superbowl_final_t0_temporada').eq('id', 1).maybeSingle();
  if (configError) throw new Error(`TEST: error leyendo app_config_test: ${configError.message}`);
  if (!config) throw new Error('TEST: app_config_test está vacío');

  const temporada = Number(config.temporada);
  const jornada = Number(config.jornada_actual);
  const faseCompeticion = String(config.fase_competicion || 'regular');
  const semanaPostemporada = config.semana_postemporada == null ? null : Number(config.semana_postemporada);
  if (!Number.isInteger(temporada) || temporada < 2000) throw new Error(`TEST: temporada inválida: ${config.temporada}`);

  // Una vez cerrada la temporada deportiva, el cron deja de exigir una jornada
  // activa y entra en el corredor anual TEST: finalizada -> draft -> calendario
  // desde 15 mayo -> pretemporada -> regular a T-125 del primer kickoff de J1.
  if (faseCompeticion === 'finalizada' || faseCompeticion === 'draft' || faseCompeticion === 'pretemporada') {
    return gestionarCicloAnualTest({
      temporada,
      temporadaObjetivo: config.temporada_objetivo == null ? null : Number(config.temporada_objetivo),
      faseCompeticion: faseCompeticion as 'finalizada'|'draft'|'pretemporada',
      ahora,
    });
  }

  const tipoCompeticionPartidos = faseCompeticion === 'regular' ? 'regular' : 'playoffs';
  if (!Number.isInteger(jornada) || jornada < 1) throw new Error(`TEST: jornada inválida: ${config.jornada_actual}`);

  const { data: evento, error: eventoError } = await supabase.from(TABLAS_TEST.jornadas)
    .select('temporada, jornada_test, fase_temporada, inicio_jornada, cierre_pronosticos, early_games, late_games, mnf, fin_jornada, estado, early_games_validado, late_games_validado, mnf_validado')
    .eq('temporada', temporada).eq('jornada_test', jornada).maybeSingle();
  if (eventoError) throw new Error(`TEST: error leyendo jornadas_eventos_test: ${eventoError.message}`);
  if (!evento) throw new Error(`TEST: no existe J${jornada} de ${temporada} en jornadas_eventos_test`);

  const inicioMs = ms(evento.inicio_jornada), cierreMs = ms(evento.cierre_pronosticos), checkpoint1Ms = ms(evento.early_games), checkpoint2Ms = ms(evento.late_games), checkpoint3Ms = ms(evento.mnf), finMs = ms(evento.fin_jornada);
  if (ahoraMs < inicioMs) return { mode:'tr25_test', temporada, jornada, estado:evento.estado, fase:'esperando_inicio', siguienteHito:evento.inicio_jornada };

  if (evento.estado === 'pendiente' && ahoraMs >= cierreMs) {
    const { error } = await supabase.from(TABLAS_TEST.jornadas).update({ estado:'cerrada' }).eq('temporada', temporada).eq('jornada_test', jornada).eq('estado','pendiente');
    if (error) throw new Error(`TEST: error cerrando J${jornada}: ${error.message}`);
  }

  const { data: partidosRaw, error: partidosError } = await supabase.from(TABLAS_TEST.partidos)
    .select('id, jornada, fecha_partido, estado, puntos_local, puntos_visitante, resultado_oficial')
    .eq('temporada', temporada).eq('jornada', jornada).eq('tipo_competicion', tipoCompeticionPartidos)
    .order('fecha_partido',{ascending:true}).order('espn_event_id',{ascending:true});
  if (partidosError) throw new Error(`TEST: error leyendo partidos_test J${jornada}: ${partidosError.message}`);
  const partidos=(partidosRaw||[]) as PartidoTest[];
  if (!partidos.length) throw new Error(`TEST: J${jornada} no tiene partidos_test para tipo_competicion=${tipoCompeticionPartidos}`);

  const finBloque1Ms=inicioMs+4*60_000, finBloque2Ms=inicioMs+6*60_000, finBloque3Ms=inicioMs+8*60_000;
  const bloqueDe=(p:PartidoTest)=>{const o=Math.round((ms(p.fecha_partido)-inicioMs)/60_000); return o<=2?1:o<=5?2:3;};
  const debeFinalizar=(p:PartidoTest)=>bloqueDe(p)===1?ahoraMs>=finBloque1Ms:bloqueDe(p)===2?ahoraMs>=finBloque2Ms:ahoraMs>=finBloque3Ms;

  for (const partido of partidos.filter(debeFinalizar)) {
    const resultado=resultadoDesdeMarcador(partido);
    const {error}=await supabase.from(TABLAS_TEST.partidos).update({estado:'STATUS_FINAL',periodo:4,reloj:'0:00',resultado_oficial:resultado}).eq('id',partido.id).eq('temporada',temporada);
    if(error) throw new Error(`TEST: error finalizando partido ${partido.id}: ${error.message}`);
    const {error:ae}=await supabase.from(TABLAS_TEST.pronosticos).update({acierto:true}).eq('partido_id',partido.id).eq('temporada',temporada).eq('eleccion',resultado);
    if(ae) throw new Error(`TEST: error validando aciertos ${partido.id}: ${ae.message}`);
    const {error:fe}=await supabase.from(TABLAS_TEST.pronosticos).update({acierto:false}).eq('partido_id',partido.id).eq('temporada',temporada).neq('eleccion',resultado);
    if(fe) throw new Error(`TEST: error validando fallos ${partido.id}: ${fe.message}`);
  }

  const cambiosCheckpoints:Record<string,boolean>={};
  if(ahoraMs>=checkpoint1Ms)cambiosCheckpoints.early_games_validado=true;
  if(ahoraMs>=checkpoint2Ms)cambiosCheckpoints.late_games_validado=true;
  if(ahoraMs>=checkpoint3Ms)cambiosCheckpoints.mnf_validado=true;
  if(Object.keys(cambiosCheckpoints).length){const {error}=await supabase.from(TABLAS_TEST.jornadas).update(cambiosCheckpoints).eq('temporada',temporada).eq('jornada_test',jornada);if(error)throw new Error(`TEST: error actualizando checkpoints J${jornada}: ${error.message}`);}

  const {data:partidosVerificados,error:verificarPartidosError}=await supabase.from(TABLAS_TEST.partidos).select('id, estado, resultado_oficial').eq('temporada',temporada).eq('jornada',jornada).eq('tipo_competicion',tipoCompeticionPartidos);
  if(verificarPartidosError)throw new Error(`TEST: error verificando partidos J${jornada}: ${verificarPartidosError.message}`);
  const todosFinalizados=(partidosVerificados||[]).length===partidos.length&&(partidosVerificados||[]).every((p:any)=>p.estado==='STATUS_FINAL'&&p.resultado_oficial!==null);
  const checkpointsOk=ahoraMs>=checkpoint3Ms&&Boolean(cambiosCheckpoints.mnf_validado||evento.mnf_validado)&&Boolean(cambiosCheckpoints.early_games_validado||evento.early_games_validado)&&Boolean(cambiosCheckpoints.late_games_validado||evento.late_games_validado);

  if(ahoraMs>=finMs&&todosFinalizados&&checkpointsOk){
    const {error:finalizarError}=await supabase.from(TABLAS_TEST.jornadas).update({estado:'finalizada'}).eq('temporada',temporada).eq('jornada_test',jornada);
    if(finalizarError)throw new Error(`TEST: error finalizando J${jornada}: ${finalizarError.message}`);

    if(faseCompeticion!=='regular'){
      if(!semanaPostemporada) throw new Error(`TEST: J${jornada} está en ${faseCompeticion} pero semana_postemporada es null`);
      const transicion=await intentarTransicionSiguienteRondaPlayoff({temporada,jornadaActual:jornada,semanaPostemporada});
      if(transicion.transicion) return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'transicion_playoffs',siguienteJornada:transicion.jornadaNueva,faseCompeticion:transicion.faseCompeticion,semanaPostemporada:transicion.semanaPostemporada};

      if(transicion.finPlayoffs && semanaPostemporada===4){
        // T0 nace exactamente en el hito deportivo ya existente: Super Bowl finalizada.
        // No depende del momento en que se proclame o registre CAMPEON_REDZONE.
        const t0Superbowl=await obtenerOCrearT0Superbowl({
          temporada,
          jornada,
          ahora,
          t0Config:config.superbowl_final_t0,
          temporadaT0Config:config.superbowl_final_t0_temporada == null ? null : Number(config.superbowl_final_t0_temporada),
        });

        const desempate=await activarDesempateSuperbowlSiProcede();

        if(desempate.resuelto && !desempate.ganador){
          const rankingFinal=await calcularRankingCompeticion(temporada);
          const campeon=rankingFinal.lideres.length===1 ? rankingFinal.lideres[0] : null;
          if(!campeon) throw new Error('TEST: la Super Bowl terminó sin desempate pero no existe un líder único');

          const cierre=await resolverT72Superbowl({temporada,jornada,ahora,t0:t0Superbowl});
          if(!cierre.finalizada){
            return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'celebracion_t72',faseCompeticion,siguienteJornada:null,campeon:campeon.userId,puntosCampeon:campeon.puntos,ranking:rankingFinal.ranking,desempate,t0Superbowl:cierre.t0,finT72:cierre.t72,restanteMs:cierre.restanteMs,motivo:'Super Bowl finalizada. REDZONE mantiene el cierre deportivo durante T+72 antes de activar Motor 4.'};
          }

          return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'temporada_finalizada',faseCompeticion:'finalizada',siguienteJornada:null,campeon:campeon.userId,puntosCampeon:campeon.puntos,ranking:rankingFinal.ranking,desempate,t0Superbowl:cierre.t0,finT72:cierre.t72,motivo:transicion.motivo};
        }

        if(desempate.resuelto && desempate.ganador){
          const rankingFinal=await calcularRankingCompeticion(temporada);
          const campeon=rankingFinal.lideres.length===1 ? rankingFinal.lideres[0] : null;
          if(!campeon || campeon.userId!==desempate.ganador) throw new Error('TEST: el ganador del desempate no coincide con el líder único del ranking final');

          const cierre=await resolverT72Superbowl({temporada,jornada,ahora,t0:t0Superbowl});
          if(!cierre.finalizada){
            return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'celebracion_t72',faseCompeticion,siguienteJornada:null,campeon:campeon.userId,puntosCampeon:campeon.puntos,ranking:rankingFinal.ranking,desempate,t0Superbowl:cierre.t0,finT72:cierre.t72,restanteMs:cierre.restanteMs,motivo:'Super Bowl finalizada. REDZONE mantiene el cierre deportivo durante T+72 antes de activar Motor 4.'};
          }

          return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'temporada_finalizada',faseCompeticion:'finalizada',siguienteJornada:null,campeon:campeon.userId,puntosCampeon:campeon.puntos,ranking:rankingFinal.ranking,desempate,t0Superbowl:cierre.t0,finT72:cierre.t72,motivo:transicion.motivo};
        }

        return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:desempate.activado?'desempate_superbowl':'postseason_completa',siguienteJornada:null,desempate,t0Superbowl:t0Superbowl.toISOString(),finT72:new Date(t0Superbowl.getTime()+ESPERA_POST_SUPERBOWL_MS).toISOString(),motivo:transicion.motivo};
      }
      return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:transicion.finPlayoffs?'postseason_completa':'esperando_siguiente_ronda',siguienteJornada:null,motivo:transicion.motivo};
    }

    const {data:siguiente,error:siguienteError}=await supabase.from(TABLAS_TEST.jornadas).select('jornada_test, fase_temporada').eq('temporada',temporada).eq('jornada_test',jornada+1).maybeSingle();
    if(siguienteError)throw new Error(`TEST: error buscando J${jornada+1}: ${siguienteError.message}`);
    if(siguiente?.fase_temporada==='postseason'){
      const transicionPlayoffs=await intentarTransicionRegularAWildCard(temporada,jornada);
      if(!transicionPlayoffs.transicion)return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'regular_completa',siguienteJornada:null,motivo:transicionPlayoffs.motivo};
      return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'transicion_playoffs',siguienteJornada:transicionPlayoffs.jornadaNueva,faseCompeticion:transicionPlayoffs.faseCompeticion,semanaPostemporada:transicionPlayoffs.semanaPostemporada};
    }
    if(siguiente?.fase_temporada==='regular'){
      const {error:activarError}=await supabase.from(TABLAS_TEST.config).update({jornada_actual:jornada+1,jornada_test_actual:jornada+1}).eq('id',1).eq('temporada',temporada).eq('jornada_actual',jornada);
      if(activarError)throw new Error(`TEST: error activando J${jornada+1}: ${activarError.message}`);
      return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'transicion',siguienteJornada:jornada+1};
    }
    return {mode:'tr25_test',temporada,jornada,estado:'finalizada',fase:'regular_completa',siguienteJornada:null};
  }

  let fase='jornada_abierta';
  if(ahoraMs>=cierreMs)fase='porra_cerrada';
  if(ahoraMs>=finBloque1Ms)fase='bloque_1_finalizado';
  if(ahoraMs>=checkpoint1Ms)fase='checkpoint_1';
  if(ahoraMs>=finBloque2Ms)fase='bloque_2_finalizado';
  if(ahoraMs>=checkpoint2Ms)fase='checkpoint_2';
  if(ahoraMs>=finBloque3Ms)fase='bloque_3_finalizado';
  if(ahoraMs>=checkpoint3Ms)fase='checkpoint_3';
  if(ahoraMs>=finMs)fase='esperando_validacion_final';
  return {mode:'tr25_test',temporada,jornada,estado:ahoraMs>=cierreMs?'cerrada':'pendiente',fase,faseCompeticion,partidos:partidos.length,finalizados:(partidosVerificados||[]).filter((p:any)=>p.estado==='STATUS_FINAL').length,checkpointsOk};
}
