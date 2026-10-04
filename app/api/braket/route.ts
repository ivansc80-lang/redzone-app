import { NextRequest, NextResponse } from 'next/server';
import { obtenerBraket } from '@/lib/braket';

export async function GET(request: NextRequest) {
  try {
    const temporadaParam = request.nextUrl.searchParams.get('temporada');
    const temporada = Number(temporadaParam);

    if (!Number.isInteger(temporada) || temporada < 2000) {
      return NextResponse.json(
        { error: 'Temporada inválida' },
        { status: 400 },
      );
    }

    const estado = await obtenerBraket(temporada);

    return NextResponse.json(estado);
  } catch (error) {
    console.error('[braket] Error leyendo bracket:', error);

    return NextResponse.json(
      { error: 'No se pudo cargar el bracket' },
      { status: 500 },
    );
  }
}
