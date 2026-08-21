import { supabaseServer as supabase } from '@/lib/supabaseServer';

const PRESEASON_TEST_END = new Date('2026-08-25T12:00:00.000Z');
const PRESEASON_WEEK = 3;
const PICK_CLOSE_MINUTES = 30;
// Ventana temporal SOLO para comprobar el cierre automático el 21/08/2026.
// Después de la prueba hay que eliminar estas dos constantes y volver a usar la hora ESPN.
const TEST_FIRST_GAME = new Date('2026-08-21T07:20:00.000Z'); // 09:20 España
const TEST_PICK_CLOSE = new Date('2026-08-21T06:50:00.000Z'); // 08:50 España

export interface PreseasonSyncResult {
  active: boolean;
  expired?: boolean;
  games?: number;
  estado?: 'pendiente' | 'cerrada' | 'finalizada';
  message: string;
}

export async function sincronizarPretemporadaTest(): Promise<PreseasonSyncResult> {
  const ahora = new Date();

  const { data: config, error: configError } = await supabase
    .from('app_config')
    .select('modo_pretemporada_test, modo_pretemporada_hasta')
    .eq('id', 1)
    .maybeSingle();

  if (configError) throw new Error(`Error al leer app_config: ${configError.message}`);

  if (!config?.modo_pretemporada_test) {
    return { active: false, message: 'El modo de pretemporada de prueba no está activo.' };
  }

  const limite = config.modo_pretemporada_hasta
    ? new Date(config.modo_pretemporada_hasta)
    : PRESEASON_TEST_END;

  if (ahora >= limite) {
    const { error: desactivarError } = await supabase
      .from('app_config')
      .update({ modo_pretemporada_test: false })
      .eq('id', 1);

    if (desactivarError) {
      throw new Error(`Error al desactivar el modo de pretemporada: ${desactivarError.message}`);
    }

    const { error: restaurarJornadaError } = await supabase
      .from('jornadas_eventos')
      .update({ estado: 'pendiente' })
      .eq('jornada', 1);

    if (restaurarJornadaError) {
      throw new Error(`Error al restaurar la jornada 1: ${restaurarJornadaError.message}`);
    }

    return { active: false, expired: true, message: 'Modo de pretemporada finalizado automáticamente.' };
  }

  const res = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100&dates=2026&seasontype=1&week=3',
    { cache: 'no-store' }
  );

  if (!res.ok) throw new Error(`ESPN respondió con HTTP ${res.status}`);

  const data = await res.json();
  const eventos = (data.events || [])
    .filter((evento: any) => {
      const fecha = new Date(evento.date);
      return fecha >= new Date('2026-08-20T00:00:00.000Z') && fecha < new Date('2026-08-25T00:00:00.000Z');
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (eventos.length === 0) {
    throw new Error('ESPN no devolvió partidos de pretemporada para la semana 3 de 2026.');
  }

  const primerPartidoFecha = TEST_FIRST_GAME;
  const ultimoPartidoFecha = new Date(eventos[eventos.length - 1].date);
  const cierrePronosticos = TEST_PICK_CLOSE;

  let todosFinalizados = true;

  for (const evento of eventos) {
    const comp = evento.competitions?.[0];
    if (!comp) continue;

    const local = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const visitante = comp.competitors?.find((c: any) => c.homeAway === 'away');
    const localAbrev = local?.team?.abbreviation || '';
    const visitAbrev = visitante?.team?.abbreviation || '';

    if (!localAbrev || !visitAbrev) continue;

    const estado = comp.status?.type?.name || 'STATUS_SCHEDULED';
    const completado = Boolean(comp.status?.type?.completed);
    const puntosLocal = parseInt(local?.score || '0', 10);
    const puntosVisitante = parseInt(visitante?.score || '0', 10);

    if (!completado) todosFinalizados = false;

    let resultadoOficial: '1' | 'X' | '2' | null = null;
    if (completado) {
      resultadoOficial = puntosLocal > puntosVisitante ? '1' : puntosLocal < puntosVisitante ? '2' : 'X';
    }

    const { data: partidoGuardado, error: upsertError } = await supabase
      .from('partidos')
      .upsert(
        {
          espn_event_id: evento.id,
          jornada: 1,
          semana_competicion: PRESEASON_WEEK,
          tipo_competicion: 'pretemporada_test',
          equipo_local: localAbrev,
          equipo_visitante: visitAbrev,
          fecha_partido: localAbrev === 'HOU' && visitAbrev === 'LV'
            ? TEST_FIRST_GAME.toISOString()
            : new Date(evento.date).toISOString(),
          estado,
          puntos_local: puntosLocal,
          puntos_visitante: puntosVisitante,
          resultado_oficial: resultadoOficial,
        },
        { onConflict: 'espn_event_id' }
      )
      .select('id')
      .single();

    if (upsertError) {
      throw new Error(`Error al guardar partido de pretemporada ESPN ${evento.id}: ${upsertError.message}`);
    }

    if (completado && resultadoOficial && partidoGuardado) {
      const { error: aciertosError } = await supabase
        .from('pronosticos')
        .update({ acierto: true })
        .eq('partido_id', partidoGuardado.id)
        .eq('eleccion', resultadoOficial);

      if (aciertosError) throw new Error(`Error al validar aciertos de pretemporada: ${aciertosError.message}`);

      const { error: fallosError } = await supabase
        .from('pronosticos')
        .update({ acierto: false })
        .eq('partido_id', partidoGuardado.id)
        .neq('eleccion', resultadoOficial);

      if (fallosError) throw new Error(`Error al validar fallos de pretemporada: ${fallosError.message}`);
    }
  }

  const estadoPretemporada: 'pendiente' | 'cerrada' | 'finalizada' =
    todosFinalizados ? 'finalizada' : ahora >= cierrePronosticos ? 'cerrada' : 'pendiente';

  const { error: configUpdateError } = await supabase
    .from('app_config')
    .update({
      semana_pretemporada_test: PRESEASON_WEEK,
      pretemporada_estado: estadoPretemporada,
      pretemporada_inicio: primerPartidoFecha.toISOString(),
      pretemporada_cierre_pronosticos: cierrePronosticos.toISOString(),
      pretemporada_fin: ultimoPartidoFecha.toISOString(),
      modo_pretemporada_hasta: PRESEASON_TEST_END.toISOString(),
    })
    .eq('id', 1);

  if (configUpdateError) {
    throw new Error(`Error al actualizar app_config de pretemporada: ${configUpdateError.message}`);
  }

  const { error: jornadaError } = await supabase
    .from('jornadas_eventos')
    .update({
      inicio_jornada: primerPartidoFecha.toISOString(),
      cierre_pronosticos: cierrePronosticos.toISOString(),
      fin_jornada: ultimoPartidoFecha.toISOString(),
      estado: estadoPretemporada,
    })
    .eq('jornada', 1);

  if (jornadaError) {
    throw new Error(`Error al preparar jornada 1 para la prueba de pretemporada: ${jornadaError.message}`);
  }

  return {
    active: true,
    games: eventos.length,
    estado: estadoPretemporada,
    message: `Pretemporada de prueba sincronizada: ${eventos.length} partidos. Cierre de pronósticos ${PICK_CLOSE_MINUTES} minutos antes del primer partido.`,
  };
}
