import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { calcularRelojAdministrativo } from '@/lib/nflAdministrativeClock';
import { descubrirEstructuraTemporadaNFL } from '@/lib/nflSeasonStructure';
import { pushCierrePorraSiProcede } from '@/lib/pushAutomatic';
import {
  jornadaRedzoneParaRonda,
  localizarSemanaEspnDeRonda,
  RONDAS_PLAYOFF,
  type RondaPlayoff,
} from '@/lib/playoffStructure';

const UNA_HORA_MS = 60 * 60 * 1000;

function rondaDesdeSemanaSolicitada(semana: number): RondaPlayoff {
  if (semana === 1) return 'wild_card';
  if (semana === 2) return 'divisional';
  if (semana === 3) return 'conference';
  return 'super_bowl';
}

async function obtenerUltimaJornadaRegularDesdeBbdd(temporada: number) {
  const { data, error } = await supabase
    .from('partidos_test')
    .select('jornada')
    .eq('temporada', temporada)
    .eq('tipo_competicion', 'regular')
    .order('jornada', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Error leyendo última jornada regular: ${error.message}`);
  return data?.jornada ? Number(data.jornada) : null;
}

async function obtenerUltimaJornadaRegular(temporada: number) {
  const desdeBbdd = await obtenerUltimaJornadaRegularDesdeBbdd(temporada);
  const { data: config, error: configError } = await supabase
    .from('app_config_test')
    .select('ultima_comprobacion_estructura_playoffs')
    .eq('id', 1)
    .maybeSingle();
  if (configError) throw new Error(`Error leyendo control horario de playoffs: ${configError.message}`);

  const ultimaComprobacion = config?.ultima_comprobacion_estructura_playoffs
    ? new Date(config.ultima_comprobacion_estructura_playoffs).getTime() : 0;
  const tocaComprobarEspn = !desdeBbdd || !ultimaComprobacion || Date.now() - ultimaComprobacion >= UNA_HORA_MS;
  if (!tocaComprobarEspn && desdeBbdd) return desdeBbdd;

  const estructura = await descubrirEstructuraTemporadaNFL(temporada);
  const { error: marcarError } = await supabase
    .from('app_config_test')
    .update({ ultima_comprobacion_estructura_playoffs: new Date().toISOString() })
    .eq('id', 1);
  if (marcarError) console.warn(`No se pudo guardar la última comprobación de estructura playoffs: ${marcarError.message}`);
  return estructura.ultimaJornadaRegular;
}

async function cerrarPorraPlayoffSiProcede(params: { temporada: number; jornada: number; estado: string | null; cierrePronosticos: string | null; }) {
  const { temporada, jornada, estado, cierrePronosticos } = params;
  if (estado !== 'pendiente' || !cierrePronosticos || Date.now() < new Date(cierrePronosticos).getTime()) return estado;

  const { data: cerrada, error } = await supabase
    .from('jornadas_eventos_test')
    .update({ estado: 'cerrada' })
    .eq('temporada', temporada)
    .eq('jornada_test', jornada)
    .eq('estado', 'pendiente')
    .select('estado')
    .maybeSingle();
  if (error) throw new Error(`Error cerrando PORRA J${jornada} de playoffs: ${error.message}`);
  if (cerrada?.estado === 'cerrada') {
    await pushCierrePorraSiProcede({ temporada, jornada, estado: 'cerrada' });
    return 'cerrada';
  }
  return estado;
}

export async function sincronizarPostemporada(temporada: number, semanaInicio = 1, semanaFin = 4) {
  if (!Number.isInteger(temporada) || temporada < 2000) throw new Error(`Temporada inválida para playoffs: ${temporada}`);
  const ultimaJornadaRegular = await obtenerUltimaJornadaRegular(temporada);
  const resultados: any[] = [];
  console.log(`Iniciando sincronización de playoffs ${temporada}, solicitudes ${semanaInicio}-${semanaFin}...`);

  for (let semanaSolicitada = semanaInicio; semanaSolicitada <= semanaFin; semanaSolicitada++) {
    try {
      const ronda = rondaDesdeSemanaSolicitada(semanaSolicitada);
      const definicion = RONDAS_PLAYOFF[ronda];
      const localizacion = await localizarSemanaEspnDeRonda(temporada, ronda);
      if (!localizacion.encontrada || localizacion.week === null) {
        resultados.push({ ronda, preparada: false, motivo: 'ESPN todavía no publica una ronda válida' });
        continue;
      }

      const eventos = [...localizacion.eventos].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (eventos.length !== definicion.partidosEsperados) throw new Error(`${definicion.nombre} incompleta: ESPN devuelve ${eventos.length} partidos y REDZONE espera ${definicion.partidosEsperados}.`);

      const ids = new Set<string>();
      for (const evento of eventos) {
        const comp = evento?.competitions?.[0];
        const local = comp?.competitors?.find((c: any) => c.homeAway === 'home');
        const visitante = comp?.competitors?.find((c: any) => c.homeAway === 'away');
        const id = String(evento?.id || '');
        const localAbrev = String(local?.team?.abbreviation || '');
        const visitAbrev = String(visitante?.team?.abbreviation || '');
        const fecha = new Date(evento?.date);
        if (!comp || !id || !localAbrev || !visitAbrev || Number.isNaN(fecha.getTime())) throw new Error(`${definicion.nombre} contiene un partido sin id, equipos o fecha/hora válidos.`);
        if (localAbrev === visitAbrev) throw new Error(`${definicion.nombre}: ESPN devuelve el mismo equipo como local y visitante en ${id}.`);
        if (ids.has(id)) throw new Error(`${definicion.nombre}: espn_event_id duplicado ${id}.`);
        ids.add(id);
      }

      const jornada = jornadaRedzoneParaRonda(ultimaJornadaRegular, ronda);
      const partidosParaReloj: Array<{ fecha_partido: string }> = [];

      for (const evento of eventos) {
        const comp = evento.competitions[0];
        const local = comp.competitors.find((c: any) => c.homeAway === 'home');
        const visitante = comp.competitors.find((c: any) => c.homeAway === 'away');
        const fechaPartido = new Date(evento.date).toISOString();
        const estado = comp.status?.type?.name || 'STATUS_SCHEDULED';
        const puntosLocal = parseInt(local?.score || '0', 10);
        const puntosVisitante = parseInt(visitante?.score || '0', 10);
        const periodo = Number(comp.status?.period || 0) || null;
        const reloj = comp.status?.displayClock || comp.status?.type?.shortDetail || null;
        let resultadoOficial: '1' | 'X' | '2' | null = null;
        if (comp.status?.type?.completed) resultadoOficial = puntosLocal > puntosVisitante ? '1' : puntosLocal < puntosVisitante ? '2' : 'X';
        partidosParaReloj.push({ fecha_partido: fechaPartido });

        const { data: partidoGuardado, error: upsertError } = await supabase
          .from('partidos_test')
          .upsert({
            espn_event_id: String(evento.id), temporada, jornada,
            semana_competicion: localizacion.week, tipo_competicion: definicion.faseCompeticion,
            equipo_local: local.team.abbreviation, equipo_visitante: visitante.team.abbreviation,
            fecha_partido: fechaPartido, estado, puntos_local: puntosLocal, puntos_visitante: puntosVisitante,
            periodo, reloj, resultado_oficial: resultadoOficial,
          }, { onConflict: 'espn_event_id' })
          .select('id').single();
        if (upsertError) throw new Error(`Error al guardar partido ${definicion.nombre} ESPN ${evento.id}: ${upsertError.message}`);
        if (!partidoGuardado) continue;

        if (comp.status?.type?.completed && resultadoOficial) {
          const { error: aciertosError } = await supabase.from('pronosticos_test').update({ acierto: true }).eq('partido_id', partidoGuardado.id).eq('eleccion', resultadoOficial);
          if (aciertosError) throw new Error(`Error al validar aciertos de ${definicion.nombre}: ${aciertosError.message}`);
          const { error: fallosError } = await supabase.from('pronosticos_test').update({ acierto: false }).eq('partido_id', partidoGuardado.id).neq('eleccion', resultadoOficial);
          if (fallosError) throw new Error(`Error al validar fallos de ${definicion.nombre}: ${fallosError.message}`);
        } else {
          const { error: limpiarError } = await supabase.from('pronosticos_test').update({ acierto: null }).eq('partido_id', partidoGuardado.id);
          if (limpiarError) throw new Error(`Error al limpiar aciertos pendientes de ${definicion.nombre}: ${limpiarError.message}`);
        }
      }

      const { data: verificados, error: verificarError } = await supabase
        .from('partidos_test').select('espn_event_id')
        .eq('temporada', temporada).eq('jornada', jornada).eq('tipo_competicion', definicion.faseCompeticion);
      if (verificarError) throw new Error(`Error verificando ${definicion.nombre}: ${verificarError.message}`);
      const idsVerificados = new Set<string>((verificados || []).map((p: any) => String(p.espn_event_id)));
      if (verificados?.length !== definicion.partidosEsperados || eventos.some((e: any) => !idsVerificados.has(String(e.id)))) throw new Error(`${definicion.nombre} no quedó completamente verificada en BBDD.`);

      const relojAdministrativo = calcularRelojAdministrativo(partidosParaReloj);
      const { data: jornadaExistente, error: jornadaExistenteError } = await supabase
        .from('jornadas_eventos_test').select('jornada_test, estado, fase_temporada')
        .eq('temporada', temporada).eq('jornada_test', jornada).maybeSingle();
      if (jornadaExistenteError) throw new Error(`Error consultando reloj de ${definicion.nombre}: ${jornadaExistenteError.message}`);

      if (!jornadaExistente) {
        const { error } = await supabase.from('jornadas_eventos_test').insert({
          temporada,
          jornada_test: jornada,
          fase_temporada: 'postseason',
          semana_espn: localizacion.week,
          ...relojAdministrativo,
          estado: 'pendiente',
        });
        if (error) throw new Error(`Error creando jornada administrativa ${definicion.nombre}: ${error.message}`);
      } else if (jornadaExistente.estado === 'pendiente') {
        const { error } = await supabase.from('jornadas_eventos_test')
          .update({ fase_temporada: 'postseason', semana_espn: localizacion.week, ...relojAdministrativo })
          .eq('temporada', temporada).eq('jornada_test', jornada).eq('estado', 'pendiente');
        if (error) throw new Error(`Error actualizando reloj de ${definicion.nombre}: ${error.message}`);
      }

      const { data: jornadaVerificada, error: jornadaVerificadaError } = await supabase
        .from('jornadas_eventos_test')
        .select('jornada_test, fase_temporada, semana_espn, estado, inicio_jornada, cierre_pronosticos')
        .eq('temporada', temporada).eq('jornada_test', jornada).maybeSingle();
      if (jornadaVerificadaError || !jornadaVerificada) throw new Error(`No se pudo verificar la jornada administrativa ${definicion.nombre}: ${jornadaVerificadaError?.message || 'sin registro'}`);
      if (jornadaVerificada.fase_temporada !== 'postseason') throw new Error(`${definicion.nombre} no quedó marcada como postseason.`);
      if (Number(jornadaVerificada.semana_espn) !== Number(localizacion.week)) throw new Error(`${definicion.nombre} no quedó con semana_espn ${localizacion.week}.`);
      if (!jornadaVerificada.inicio_jornada || !jornadaVerificada.cierre_pronosticos) throw new Error(`${definicion.nombre} no quedó con inicio_jornada/cierre_pronosticos válidos.`);

      const estadoFinal = await cerrarPorraPlayoffSiProcede({ temporada, jornada, estado: jornadaVerificada.estado, cierrePronosticos: jornadaVerificada.cierre_pronosticos });
      resultados.push({ ronda, nombre: definicion.nombre, preparada: true, jornada, semanaEspn: localizacion.week, partidos: eventos.length, estado: estadoFinal, inicioJornada: jornadaVerificada.inicio_jornada, cierrePronosticos: jornadaVerificada.cierre_pronosticos });
      console.log(`${definicion.nombre} preparada: REDZONE J${jornada}, ESPN Week ${localizacion.week}, ${eventos.length}/${definicion.partidosEsperados} partidos + reloj administrativo. Estado: ${estadoFinal}.`);
    } catch (error: any) {
      resultados.push({ solicitud: semanaSolicitada, preparada: false, motivo: error?.message || String(error) });
      console.error(`Error al sincronizar playoffs solicitud ${semanaSolicitada}:`, error);
    }
  }
  return resultados;
}
