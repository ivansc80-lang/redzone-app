import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { sincronizarTemporadaCompleta } from '@/lib/syncCalendar';
import { sincronizarPretemporadaTest } from '@/lib/syncPreseasonTest';
import { sincronizarPostemporada } from '@/lib/syncPostseason';
import { activarDesempateSuperbowlSiProcede } from '@/lib/activarDesempateSuperbowl';
import {
  pushInicioTemporadaSiProcede,
} from '@/lib/pushAutomatic';

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
    modo_pretemporada_test: config?.modo_pretemporada_test ?? null,
    modo_pretemporada_hasta: config?.modo_pretemporada_hasta ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');

    if (!cronSecret) {
      console.error('CRON_SECRET no está configurado.');

      return NextResponse.json(
        {
          success: false,
          error: 'Configuración de seguridad incompleta.',
        },
        { status: 500 }
      );
    }

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado.',
        },
        { status: 401 }
      );
    }

    const { data: config, error: configError } = await supabase
      .from('app_config')
      .select('temporada, modo_pretemporada_test, modo_pretemporada_hasta, fase_competicion, semana_postemporada')
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

      // Si acaba de caducar, en esta misma ejecución continuamos con
      // temporada regular para que la PWA vuelva a su estado normal.
    }

    if (config?.fase_competicion === 'playoffs') {
      const semanaPostemporada = Number(config.semana_postemporada || 1);

      await sincronizarPostemporada(
        temporada,
        semanaPostemporada,
        semanaPostemporada
      );

      return NextResponse.json({
        success: true,
        mode: 'playoffs',
        debug,
        semana: semanaPostemporada,
        message: `Playoffs semana ${semanaPostemporada} sincronizados correctamente desde ESPN.`,
      });
    }

    if (config?.fase_competicion === 'superbowl') {
      const desempate = await activarDesempateSuperbowlSiProcede();

      await sincronizarPostemporada(temporada, 4, 4);

      return NextResponse.json({
        success: true,
        mode: 'superbowl',
        debug,
        semana: 4,
        desempate,
        message: desempate.activado
          ? 'Super Bowl sincronizada. Desempate activo.'
          : 'Super Bowl sincronizada correctamente desde ESPN.',
      });
    }

    // En temporada regular tomamos la primera jornada que todavía no está
    // finalizada y sincronizamos únicamente esa jornada.
    const { data: jornadaActiva, error: jornadaActivaError } = await supabase
      .from('jornadas_eventos')
      .select('jornada, estado, cierre_pronosticos')
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

    // ========================================================
    // PUSH 1 - INICIO TEMPORADA / APERTURA PORRA J1
    // ========================================================
    //
    // Mientras Modo TEST siga activo nunca llegamos aquí,
    // porque syncPreseasonTest devuelve antes.
    //
    // Cuando REDZONE entra realmente en Temporada Regular,
    // J1 está pendiente y su PORRA abierta.
    //
    const pushInicioTemporada =
      await pushInicioTemporadaSiProcede({
        temporada,
        jornada,
        estado: jornadaActiva.estado,
        cierrePronosticos:
          jornadaActiva.cierre_pronosticos,
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
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
