import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { sincronizarTemporadaCompleta } from '@/lib/syncCalendar';

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');

    // La ruta solo puede ejecutarse con el secreto configurado en Vercel.
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
      .select('temporada')
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

    // Sincroniza las 18 jornadas de la temporada activa configurada en Supabase.
    await sincronizarTemporadaCompleta(temporada);

    return NextResponse.json({
      success: true,
      temporada,
      message:
        `Las 18 jornadas de la temporada regular ${temporada} se han sincronizado con éxito desde la API de ESPN.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}