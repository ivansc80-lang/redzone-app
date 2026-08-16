import { NextResponse } from 'next/server';
import { sincronizarTemporadaCompleta } from '@/lib/syncCalendar';

export async function GET() {
  try {
    // Sincroniza la temporada actual (2026)
    await sincronizarTemporadaCompleta(2026);
    return NextResponse.json({ 
      success: true, 
      message: 'Las 18 jornadas de la temporada regular se han sincronizado con éxito desde la API de ESPN.' 
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}