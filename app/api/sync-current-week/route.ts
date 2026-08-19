import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { sincronizarTemporadaCompleta } from '@/lib/syncCalendar';
import { sincronizarPretemporadaTest } from '@/lib/syncPreseasonTest';

export const dynamic = 'force-dynamic';

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
      .select('modo_pretemporada_test, modo_pretemporada_hasta')
      .eq('id', 1)
      .maybeSingle();

    if (configError) {
      throw new Error(`Error al leer app_config: ${configError.message}`);
    }

    if (config?.modo_pretemporada_test) {
      const resultadoPretemporada = await sincronizarPretemporadaTest();

      if (resultadoPretemporada.active) {
        return NextResponse.json({
          success: true,
          mode: 'pretemporada_test',
          ...resultadoPretemporada,
        });
      }

      // Si acaba de caducar, en esta misma ejecución continuamos con
      // temporada regular para que la PWA vuelva a su estado normal.
    }

    // En temporada regular tomamos la primera jornada que todavía no está
    // finalizada y sincronizamos únicamente esa jornada.
    const { data: jornadaActiva, error: jornadaActivaError } = await supabase
      .from('jornadas_eventos')
      .select('jornada, estado')
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
        message: 'No hay jornadas pendientes de sincronización.',
      });
    }

    const jornada = Number(jornadaActiva.jornada);

    await sincronizarTemporadaCompleta(2026, jornada, jornada);

    return NextResponse.json({
      success: true,
      mode: 'regular',
      jornada,
      estado: jornadaActiva.estado,
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
