import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { sincronizarTemporadaCompleta } from '@/lib/syncCalendar';

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

    // Tomamos la primera jornada que todavía no está finalizada.
    // Así, durante la temporada se sincroniza solo la jornada activa
    // y no las 18 jornadas completas cada 15 minutos.
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
        message: 'No hay jornadas pendientes de sincronización.',
      });
    }

    const jornada = Number(jornadaActiva.jornada);

    await sincronizarTemporadaCompleta(2026, jornada, jornada);

    return NextResponse.json({
      success: true,
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
