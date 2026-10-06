import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  obtenerPlayoffPictureEspn,
  persistirPlayoffPicture,
  type MomentoPlayoffPicture,
} from '@/lib/playoffPicture';

const MOMENTOS_VALIDOS = new Set<MomentoPlayoffPicture>([
  'APERTURA',
  'SABADO',
  'LUNES',
]);

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');

    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          mode: 'production',
          error: 'CRON_SECRET no configurado.',
        },
        { status: 500 },
      );
    }

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          mode: 'production',
          error: 'No autorizado.',
        },
        { status: 401 },
      );
    }

    const momentoRaw = request.nextUrl.searchParams
      .get('momento')
      ?.trim()
      .toUpperCase();

    if (
      !momentoRaw ||
      !MOMENTOS_VALIDOS.has(momentoRaw as MomentoPlayoffPicture)
    ) {
      return NextResponse.json(
        {
          success: false,
          mode: 'production',
          error: 'momento debe ser APERTURA, SABADO o LUNES.',
        },
        { status: 400 },
      );
    }

    const momento = momentoRaw as MomentoPlayoffPicture;

    const { data: config, error: configError } = await supabaseServer
      .from('app_config')
      .select('temporada, jornada_actual, fase_competicion')
      .eq('id', 1)
      .maybeSingle();

    if (configError) {
      throw new Error(
        `error leyendo app_config: ${configError.message}`,
      );
    }

    if (!config) {
      throw new Error('app_config está vacío.');
    }

    const temporada = Number(config.temporada);
    const jornada = Number(config.jornada_actual);
    const faseCompeticion = String(config.fase_competicion || '');

    if (!Number.isInteger(temporada) || temporada < 2000) {
      throw new Error(
        `temporada inválida en app_config: ${config.temporada}`,
      );
    }

    if (faseCompeticion !== 'regular') {
      return NextResponse.json({
        success: true,
        mode: 'production',
        ejecutado: false,
        motivo: 'Playoff Picture solo se captura durante temporada regular.',
        temporada,
        jornada,
        faseCompeticion,
        momento,
      });
    }

    if (!Number.isInteger(jornada) || jornada < 5 || jornada > 18) {
      return NextResponse.json({
        success: true,
        mode: 'production',
        ejecutado: false,
        motivo: 'Playoff Picture activo entre J5 y J18.',
        temporada,
        jornada,
        faseCompeticion,
        momento,
      });
    }

    const { count: filasExistentes, error: existentesError } =
      await supabaseServer
        .from('playoff_picture')
        .select('equipo', { count: 'exact', head: true })
        .eq('temporada', temporada)
        .eq('jornada', jornada)
        .eq('momento', momento);

    if (existentesError) {
      throw new Error(
        `error comprobando Playoff Picture existente: ${existentesError.message}`,
      );
    }

    if (filasExistentes === 32) {
      return NextResponse.json({
        success: true,
        mode: 'production',
        ejecutado: false,
        motivo: 'Playoff Picture ya capturado.',
        temporada,
        jornada,
        faseCompeticion,
        momento,
        filas: filasExistentes,
      });
    }

    if (filasExistentes !== null && filasExistentes > 32) {
      throw new Error(
        `fotografía inválida: existen ${filasExistentes} filas para ${temporada} J${jornada} ${momento}.`,
      );
    }

    const equipos = await obtenerPlayoffPictureEspn(temporada);

    const resultado = await persistirPlayoffPicture(
      temporada,
      jornada,
      momento,
      equipos,
    );

    return NextResponse.json({
      success: true,
      mode: 'production',
      ejecutado: true,
      ...resultado,
    });
  } catch (error: any) {
    console.error('Error en playoff-picture:', error);

    return NextResponse.json(
      {
        success: false,
        mode: 'production',
        error:
          error instanceof Error
            ? error.message
            : 'Error desconocido en Playoff Picture.',
      },
      { status: 500 },
    );
  }
}
