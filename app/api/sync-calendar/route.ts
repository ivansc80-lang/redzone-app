import { NextRequest, NextResponse } from 'next/server';
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

    // Sincroniza la temporada actual (2026).
    await sincronizarTemporadaCompleta(2026);

    return NextResponse.json({
      success: true,
      message:
        'Las 18 jornadas de la temporada regular se han sincronizado con éxito desde la API de ESPN.',
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
