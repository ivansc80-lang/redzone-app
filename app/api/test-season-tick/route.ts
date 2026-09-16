import { NextResponse } from 'next/server';
import { sincronizarTemporadaTestActual } from '@/lib/testSeasonEngine';
import { guardarCampeonRedzoneTest } from '@/lib/testAchievements';

export const dynamic = 'force-dynamic';

// EXCLUSIVO DE LA RAMA TEST TR25.
// Simula una pasada de cron sin CRON_SECRET para poder ejecutar la temporada
// comprimida desde local/preview. Nunca debe promocionarse a MAIN.
export async function GET() {
  try {
    const resultado = await sincronizarTemporadaTestActual(new Date());

    // Cuando el motor TEST ya ha determinado un campeón único, persistimos
    // CAMPEON_REDZONE exclusivamente en logros_test. El upsert es idempotente.
    // Esta fecha pertenece al logro y NO gobierna el T0/T+72 de la Super Bowl.
    if (
      'campeon' in resultado &&
      typeof resultado.campeon === 'string' &&
      resultado.campeon &&
      'jornada' in resultado &&
      typeof resultado.jornada === 'number'
    ) {
      await guardarCampeonRedzoneTest({
        userId: resultado.campeon,
        temporada: resultado.temporada,
        jornada: resultado.jornada,
        tipoCompeticion: 'playoffs',
      });
    }

    return NextResponse.json({ success: true, ...resultado });
  } catch (error: any) {
    console.error('Error en test-season-tick:', error);
    return NextResponse.json(
      { success: false, mode: 'tr25_test', error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
