import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { sincronizarTemporadaCompleta } from '@/lib/syncCalendar';
import { intentarTransicionSiguienteRondaPlayoff } from '@/lib/playoffTransition';
import { activarDesempateSuperbowlSiProcede } from '@/lib/activarDesempateSuperbowl';
import { calcularRankingCompeticion } from '@/lib/rankingCompetition';
import { gestionarCicloAnual } from '@/lib/seasonLifecycle';
import { prepararNuevaTemporadaDesdeEspn } from '@/lib/newSeasonCalendar';

export const dynamic = 'force-dynamic';

type FaseAnual = 'finalizada' | 'draft' | 'pretemporada';

async function finalizarTemporadaSiProcede(
  temporada: number,
  jornada: number,
  desempate: any,
) {
  if (!desempate?.resuelto) {
    return {
      finalizada: false,
      desempate,
    };
  }

  const rankingFinal = await calcularRankingCompeticion(temporada);
  const campeon =
    rankingFinal.lideres.length === 1 ? rankingFinal.lideres[0] : null;

  if (!campeon) {
    throw new Error(
      'La Super Bowl terminó y el desempate figura resuelto, pero no existe un líder único.',
    );
  }

  if (desempate.ganador && campeon.userId !== desempate.ganador) {
    throw new Error(
      'El ganador del desempate no coincide con el líder único del ranking final.',
    );
  }

  const { data: configFinalizada, error } = await supabase
    .from('app_config')
    .update({ fase_competicion: 'finalizada' })
    .eq('id', 1)
    .eq('temporada', temporada)
    .eq('jornada_actual', jornada)
    .select('temporada, jornada_actual, fase_competicion')
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error marcando temporada ${temporada} como finalizada: ${error.message}`,
    );
  }

  if (!configFinalizada || configFinalizada.fase_competicion !== 'finalizada') {
    throw new Error(
      `La temporada ${temporada} debía finalizarse, pero app_config no confirmó la transición.`,
    );
  }

  return {
    finalizada: true,
    campeon: campeon.userId,
    puntosCampeon: campeon.puntos,
    ranking: rankingFinal.ranking,
    desempate,
  };
}

async function ejecutarMotorProductivo(ahora = new Date()) {
  const { data: config, error: configError } = await supabase
    .from('app_config')
    .select(
      'temporada, temporada_objetivo, jornada_actual, fase_competicion, semana_postemporada',
    )
    .eq('id', 1)
    .maybeSingle();

  if (configError) {
    throw new Error(`Error leyendo app_config: ${configError.message}`);
  }

  if (!config) {
    throw new Error('app_config está vacío.');
  }

  const temporada = Number(config.temporada);
  const jornada = Number(config.jornada_actual);
  const faseCompeticion = String(config.fase_competicion || '');

  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida: ${config.temporada}`);
  }

  if (
    faseCompeticion === 'finalizada' ||
    faseCompeticion === 'draft' ||
    faseCompeticion === 'pretemporada'
  ) {
    const ciclo = await gestionarCicloAnual({
      temporada,
      temporadaObjetivo:
        config.temporada_objetivo == null
          ? null
          : Number(config.temporada_objetivo),
      faseCompeticion: faseCompeticion as FaseAnual,
      ahora,
    });

    let calendario = null;

    if (
      ciclo.debeBuscarCalendario &&
      ciclo.temporadaObjetivo !== null &&
      (ciclo.faseActual === 'draft' ||
        ciclo.faseActual === 'pretemporada')
    ) {
      calendario = await prepararNuevaTemporadaDesdeEspn(
        ciclo.temporadaObjetivo,
        ciclo.faseActual,
      );
    }

    return {
      mode: 'production',
      fase: 'ciclo_anual',
      temporada,
      ciclo,
      calendario,
    };
  }

  if (faseCompeticion === 'regular') {
    await sincronizarTemporadaCompleta(temporada);

    return {
      mode: 'production',
      fase: 'regular',
      temporada,
      jornada,
    };
  }

  if (faseCompeticion === 'playoffs') {
    if (!Number.isInteger(jornada) || jornada < 1) {
      throw new Error(`Jornada playoff inválida: ${config.jornada_actual}`);
    }

    const semanaPostemporada =
      config.semana_postemporada == null
        ? null
        : Number(config.semana_postemporada);

    if (
      !Number.isInteger(semanaPostemporada) ||
      semanaPostemporada === null ||
      semanaPostemporada < 1 ||
      semanaPostemporada > 4
    ) {
      throw new Error(
        `semana_postemporada inválida: ${config.semana_postemporada}`,
      );
    }

    const transicion = await intentarTransicionSiguienteRondaPlayoff({
      temporada,
      jornadaActual: jornada,
      semanaPostemporada,
    });

    if (transicion.transicion) {
      return {
        mode: 'production',
        fase: 'transicion_playoffs',
        temporada,
        jornada,
        transicion,
      };
    }

    if (!transicion.finPlayoffs) {
      return {
        mode: 'production',
        fase: 'playoffs',
        temporada,
        jornada,
        transicion,
      };
    }

    const desempate = await activarDesempateSuperbowlSiProcede();
    const final = await finalizarTemporadaSiProcede(
      temporada,
      jornada,
      desempate,
    );

    return {
      mode: 'production',
      fase: final.finalizada
        ? 'temporada_finalizada'
        : desempate.activado
          ? 'desempate_superbowl'
          : 'postseason_completa',
      temporada,
      jornada,
      transicion,
      ...final,
    };
  }

  throw new Error(
    `fase_competicion no soportada por el motor productivo: ${faseCompeticion}`,
  );
}

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

    const resultado = await ejecutarMotorProductivo(new Date());

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error: any) {
    console.error('Error en sync-current-week productivo:', error);

    return NextResponse.json(
      {
        success: false,
        mode: 'production',
        error: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
