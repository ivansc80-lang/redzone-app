import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { sincronizarTemporadaCompleta } from '@/lib/syncCalendar';
import { descubrirEstructuraTemporadaNFL } from '@/lib/nflSeasonStructure';

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');

    if (!cronSecret) {
      console.error('CRON_SECRET no está configurado.');
      return NextResponse.json(
        { success: false, error: 'Configuración de seguridad incompleta.' },
        { status: 500 },
      );
    }

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'No autorizado.' },
        { status: 401 },
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
        `Temporada activa inválida en app_config: ${config?.temporada ?? 'null'}`,
      );
    }

    const estructura = await descubrirEstructuraTemporadaNFL(temporada);

    // La ruta manual ya no presupone 18 jornadas. Sincroniza exactamente
    // hasta la última week que ESPN identifica como temporada regular.
    await sincronizarTemporadaCompleta(
      temporada,
      1,
      estructura.ultimaJornadaRegular,
    );

    return NextResponse.json({
      success: true,
      temporada,
      jornadasRegulares: estructura.ultimaJornadaRegular,
      superBowlLocalizada: estructura.superBowlLocalizada,
      semanaSuperBowl: estructura.semanaSuperBowl,
      message:
        `La temporada regular ${temporada} se ha sincronizado dinámicamente hasta J${estructura.ultimaJornadaRegular}.` +
        (estructura.superBowlLocalizada
          ? ` ESPN identifica la Super Bowl en postseason Week ${estructura.semanaSuperBowl}.`
          : ' La Super Bowl todavía no está publicada/identificada por ESPN.'),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
