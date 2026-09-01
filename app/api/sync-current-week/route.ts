import { NextRequest, NextResponse } from 'next/server';
import { sincronizarTemporadaTestActual } from '@/lib/testSeasonEngine';

export const dynamic = 'force-dynamic';

// RAMA TEST TR25 EXCLUSIVAMENTE.
// Este endpoint sustituye temporalmente al cron real de Fase 2.
// No llama a ESPN, playoffs, ciclo anual ni a ninguna tabla de competición real.
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');

    if (!cronSecret) {
      return NextResponse.json(
        { success: false, mode: 'tr25_test', error: 'CRON_SECRET no configurado.' },
        { status: 500 },
      );
    }

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, mode: 'tr25_test', error: 'No autorizado.' },
        { status: 401 },
      );
    }

    const resultado = await sincronizarTemporadaTestActual(new Date());

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error: any) {
    console.error('Error en sync-current-week TR25 TEST:', error);
    return NextResponse.json(
      { success: false, mode: 'tr25_test', error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
