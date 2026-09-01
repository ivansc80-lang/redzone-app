import { NextResponse } from 'next/server';
import { sincronizarTemporadaTestActual } from '@/lib/testSeasonEngine';

export const dynamic = 'force-dynamic';

// EXCLUSIVO DE LA RAMA TEST TR25.
// Simula una pasada de cron sin CRON_SECRET para poder ejecutar la temporada
// comprimida desde local/preview. Nunca debe promocionarse a MAIN.
export async function GET() {
  try {
    const resultado = await sincronizarTemporadaTestActual(new Date());
    return NextResponse.json({ success: true, ...resultado });
  } catch (error: any) {
    console.error('Error en test-season-tick:', error);
    return NextResponse.json(
      { success: false, mode: 'tr25_test', error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
