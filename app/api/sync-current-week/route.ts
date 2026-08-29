import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { sincronizarTemporadaCompleta } from '@/lib/syncCalendar';
import { sincronizarPretemporadaTest } from '@/lib/syncPreseasonTest';
import { sincronizarPostemporada } from '@/lib/syncPostseason';
import { intentarTransicionSiguienteRondaPlayoff } from '@/lib/playoffTransition';
import { activarDesempateSuperbowlSiProcede } from '@/lib/activarDesempateSuperbowl';
import { gestionarCicloAnual } from '@/lib/seasonLifecycle';
import { prepararNuevaTemporadaDesdeEspn } from '@/lib/newSeasonCalendar';
import { pushInicioTemporadaSiProcede } from '@/lib/pushAutomatic';
import {
  pushRecordatorioPlayoffSiProcede,
  pushResultadosAperturaPlayoffSiProcede,
  pushSuperBowlFinTemporadaSiProcede,
} from '@/lib/playoffPush';
import {
  prepararCierreSuperBowl,
  finalizarTemporadaTrasSuperBowl,
} from '@/lib/superBowlClosure';

export const dynamic = 'force-dynamic';

function getSafeDebugInfo(config: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let projectRef = 'unknown';

  try {
    projectRef = new URL(supabaseUrl).hostname.split('.')[0] || 'unknown';
  } catch {
    projectRef = 'invalid-url';
  }

  return {
    projectRef,
    temporada: config?.temporada ?? null,
    temporada_objetivo: config?.temporada_objetivo ?? null,
    fase_competicion: config?.fase_competicion ?? null,
    modo_pretemporada_test: config?.modo_pretemporada_test ?? null,
    modo_pretemporada_hasta: config?.modo_pretemporada_hasta ?? null,
  };
}

async function evaluarRecordatorioPlayoff(params: {
  temporada: number;
  jornada: number;
  tipoCompeticion: 'playoffs' | 'superbowl';
}) {
  const { temporada, jornada, tipoCompeticion } = params;

  const { data: evento, error } = await supabase
    .from('jornadas_eventos')
    .select('estado, cierre_pronosticos')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .maybeSingle();

  if (error) {
    throw new Error(`Error leyendo reloj PUSH J${jornada}: ${error.message}`);
  }

  if (!evento?.cierre_pronosticos || evento.estado !== 'pendiente') {
    return {
      evaluado: false,
      motivo: 'La jornada no está pendiente o no tiene cierre_pronosticos',
      resultados: [],
    };
  }

  return pushRecordatorioPlayoffSiProcede({
    temporada,
    jornada,
    cierrePronosticos: evento.cierre_pronosticos,
    tipoCompeticion,
  });
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');

    if (!cronSecret) {
      console.error('CRON_SECRET no está configurado.');
      return NextResponse.json(
        { success: false, error: 'Configuración de seguridad incompleta.' },
        { status: 500 }
      );
    }

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'No autorizado.' },
        { status: 401 }
      );
    }

    const { data: config, error: configError } = await supabase
      .from('app_config')
      .select('temporada, temporada_objetivo, jornada_actual, modo_pretemporada_test, modo_pretemporada_hasta, fase_competicion, semana_postemporada')
      .eq('id', 1)
      .maybeSingle();

    if (configError) {
      throw new Error(`Error al leer app_config: ${configError.message}`);
    }

    const temporada = Number(config?.temporada);

    if (!Number.isInteger(temporada) || temporada < 2000) {
      throw new Error(
        `Temporada activa inválida en app_config: ${config?.temporada ?? 'null'}`
      );
    }

    const debug = getSafeDebugInfo(config);

    if (config?.modo_pretemporada_test) {
      const resultadoPretemporada = await sincronizarPretemporadaTest();

      if (resultadoPretemporada.active) {
        return NextResponse.json({
          success: true,
          mode: 'pretemporada_test',
          debug,
          ...resultadoPretemporada,
        });
      }
    }

    if (
      config?.fase_competicion === 'finalizada' ||
      config?.fase_competicion === 'draft' ||
      config?.fase_competicion === 'pretemporada'
    ) {
      const cicloAnual = await gestionarCicloAnual({
        temporada,
        temporadaObjetivo:
          config?.temporada_objetivo == null
            ? null
            : Number(config.temporada_objetivo),
        faseCompeticion: config.fase_competicion,
      });

      let calendario = null;

      if (
        cicloAnual.debeBuscarCalendario &&
        cicloAnual.temporadaObjetivo !== null
      ) {
        calendario = await prepararNuevaTemporadaDesdeEspn(
          cicloAnual.temporadaObjetivo,
          cicloAnual.faseActual === 'pretemporada' ? 'pretemporada' : 'draft'
        );
      }

      return NextResponse.json({
        success: true,
        mode: calendario?.activado ? 'nueva_temporada_preparada' : cicloAnual.faseActual,
        debug,
        cicloAnual,
        calendario,
        message: calendario?.activado
          ? `Calendario ${cicloAnual.temporadaObjetivo} validado, guardado y activado.`
          : calendario
            ? `Calendario ${cicloAnual.temporadaObjetivo} todavía no es válido: ${calendario.motivo}`
            : `Ciclo anual en estado ${cicloAnual.faseActual}; la temporada ${temporada} continúa siendo la visible.`,
      });
    }

    if (config?.fase_competicion === 'playoffs') {
      const semanaPostemporada = Number(config.semana_postemporada || 1);
      const jornadaActual = Number(config.jornada_actual);

      await sincronizarPostemporada(
        temporada,
        semanaPostemporada,
        semanaPostemporada
      );

      const pushRecordatorio = await evaluarRecordatorioPlayoff({
        temporada,
        jornada: jornadaActual,
        tipoCompeticion: 'playoffs',
      });

      const transicion = await intentarTransicionSiguienteRondaPlayoff({
        temporada,
        jornadaActual,
        semanaPostemporada,
      });

      const pushResultadosApertura = transicion.transicion
        ? await pushResultadosAperturaPlayoffSiProcede({
            temporada,
            jornadaFinalizada: transicion.jornadaAnterior,
            jornadaNueva: transicion.jornadaNueva,
          })
        : null;

      return NextResponse.json({
        success: true,
        mode: transicion.transicion
          ? transicion.faseCompeticion
          : 'playoffs',
        debug,
        semana: semanaPostemporada,
        pushRecordatorio,
        transicion,
        pushResultadosApertura,
        message: transicion.transicion
          ? `Transición segura completada hacia ${transicion.rondaNueva}.`
          : `Playoffs sincronizados. ${transicion.motivo || 'La ronda actual continúa activa.'}`,
      });
    }

    if (config?.fase_competicion === 'superbowl') {
      const jornadaSuperBowl = Number(config.jornada_actual);
      const desempate = await activarDesempateSuperbowlSiProcede();
      await sincronizarPostemporada(temporada, 4, 4);

      const pushRecordatorio = await evaluarRecordatorioPlayoff({
        temporada,
        jornada: jornadaSuperBowl,
        tipoCompeticion: 'superbowl',
      });

      const cierreSuperBowl = await prepararCierreSuperBowl({
        temporada,
        jornada: jornadaSuperBowl,
      });

      if (!cierreSuperBowl.listaParaCerrar) {
        return NextResponse.json({
          success: true,
          mode: 'superbowl',
          debug,
          semana: config.semana_postemporada,
          desempate,
          pushRecordatorio,
          cierreSuperBowl,
          message: `Super Bowl sincronizada. ${cierreSuperBowl.motivo}`,
        });
      }

      // El PUSH final es deliberadamente anti-spoiler. Se intenta antes de
      // abandonar fase=superbowl para que, si falla, el siguiente cron pueda
      // reintentarlo. La clave_evento lo hace idempotente si ya fue enviado.
      const pushFinTemporada = await pushSuperBowlFinTemporadaSiProcede({
        temporada,
        jornadaSuperBowl,
      });

      const cierreTemporada = await finalizarTemporadaTrasSuperBowl({
        temporada,
        jornada: jornadaSuperBowl,
      });

      return NextResponse.json({
        success: true,
        mode: 'finalizada',
        debug,
        semana: config.semana_postemporada,
        desempate,
        pushRecordatorio,
        cierreSuperBowl,
        pushFinTemporada,
        cierreTemporada,
        message: 'Super Bowl y temporada REDZONE finalizadas correctamente.',
      });
    }

    const { data: jornadaActiva, error: jornadaActivaError } = await supabase
      .from('jornadas_eventos')
      .select('jornada, estado, cierre_pronosticos')
      .eq('temporada', temporada)
      .neq('estado', 'finalizada')
      .order('jornada', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (jornadaActivaError) {
      throw new Error(
        `Error al obtener la jornada activa: ${jornadaActivaError.message}`
      );
    }

    if (!jornadaActiva) {
      return NextResponse.json({
        success: true,
        mode: 'regular',
        debug,
        message: 'No hay jornadas pendientes de sincronización.',
      });
    }

    const jornada = Number(jornadaActiva.jornada);

    const pushInicioTemporada = await pushInicioTemporadaSiProcede({
      temporada,
      jornada,
      estado: jornadaActiva.estado,
      cierrePronosticos: jornadaActiva.cierre_pronosticos,
    });

    await sincronizarTemporadaCompleta(temporada, jornada, jornada);

    return NextResponse.json({
      success: true,
      mode: 'regular',
      debug,
      jornada,
      estado: jornadaActiva.estado,
      pushInicioTemporada,
      message: `Jornada ${jornada} sincronizada correctamente desde ESPN.`,
    });
  } catch (error: any) {
    console.error('Error en sync-current-week:', error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
