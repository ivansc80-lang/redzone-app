import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const partidoId = String(body?.partidoId || '');
    const puntosLocal = Number(body?.puntosLocal);
    const puntosVisitante = Number(body?.puntosVisitante);

    if (
      !partidoId ||
      Number.isNaN(puntosLocal) ||
      Number.isNaN(puntosVisitante)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de prueba no válidos.',
        },
        { status: 400 }
      );
    }

    const resultadoOficial: '1' | 'X' | '2' =
      puntosLocal > puntosVisitante
        ? '1'
        : puntosLocal < puntosVisitante
          ? '2'
          : 'X';

    const { data: partido, error: partidoError } = await supabaseServer
      .from('partidos')
      .update({
        estado: 'STATUS_FINAL_TEST',
        puntos_local: puntosLocal,
        puntos_visitante: puntosVisitante,
        periodo: 4,
        reloj: '0:00',
        resultado_oficial: resultadoOficial,
      })
      .eq('id', partidoId)
      .select(
        'id, equipo_local, equipo_visitante, estado, puntos_local, puntos_visitante, resultado_oficial'
      )
      .single();

    if (partidoError) {
      throw new Error(
        `Error al simular resultado del partido: ${partidoError.message}`
      );
    }

    const { error: aciertosError } = await supabaseServer
      .from('pronosticos')
      .update({ acierto: true })
      .eq('partido_id', partidoId)
      .eq('eleccion', resultadoOficial);

    if (aciertosError) {
      throw new Error(
        `Error al validar aciertos: ${aciertosError.message}`
      );
    }

    const { error: fallosError } = await supabaseServer
      .from('pronosticos')
      .update({ acierto: false })
      .eq('partido_id', partidoId)
      .neq('eleccion', resultadoOficial);

    if (fallosError) {
      throw new Error(
        `Error al validar fallos: ${fallosError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      partido,
      resultadoOficial,
    });
  } catch (error: any) {
    console.error('Error en /api/test-resultado:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido.',
      },
      { status: 500 }
    );
  }
}
