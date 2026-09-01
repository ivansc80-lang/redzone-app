import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { evaluarCheckpointsAdministrativos } from '@/lib/nflAdministrativeClock';
import {
  RONDAS_PLAYOFF,
  siguienteRondaPlayoff,
  type FaseCompeticionPlayoff,
  type RondaPlayoff,
} from '@/lib/playoffStructure';
import { sincronizarPostemporada } from '@/lib/syncPostseason';
import { pushResultadosAperturaSiProcede } from '@/lib/pushAutomatic';
import { pushResultadosAperturaPlayoffSiProcede } from '@/lib/playoffPush';

type TransicionPlayoffOk = {
  transicion: true;
  jornadaAnterior: number;
  jornadaNueva: number;
  rondaNueva: RondaPlayoff;
  faseCompeticion: FaseCompeticionPlayoff;
  semanaPostemporada: number;
  pushResultadosApertura: any;
};

type TransicionPlayoffPendiente = {
  transicion: false;
  finPlayoffs?: false;
  motivo: string;
  rondaActual?: RondaPlayoff;
  rondaSiguiente?: RondaPlayoff;
};

type FinPlayoffs = {
  transicion: false;
  finPlayoffs: true;
  motivo: string;
};

export type ResultadoTransicionPlayoff =
  | TransicionPlayoffOk
  | TransicionPlayoffPendiente
  | FinPlayoffs;

function rondaDesdeIndice(indice: number): RondaPlayoff {
  if (indice === 1) return 'wild_card';
  if (indice === 2) return 'divisional';
  if (indice === 3) return 'conference';
  return 'super_bowl';
}

function indiceDesdeRonda(ronda: RondaPlayoff) {
  if (ronda === 'wild_card') return 1;
  if (ronda === 'divisional') return 2;
  if (ronda === 'conference') return 3;
  return 4;
}

async function verificarJornadaPreparada(
  temporada: number,
  jornada: number,
  ronda: RondaPlayoff,
) {
  const definicion = RONDAS_PLAYOFF[ronda];

  const { data: jornadaPreparada, error: jornadaPreparadaError } = await supabase
    .from('jornadas_eventos_test')
    .select('jornada, estado, inicio_jornada, cierre_pronosticos')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .maybeSingle();

  if (jornadaPreparadaError) {
    throw new Error(
      `Error verificando ${definicion.nombre} preparada: ${jornadaPreparadaError.message}`,
    );
  }

  if (
    !jornadaPreparada ||
    jornadaPreparada.estado !== 'pendiente' ||
    !jornadaPreparada.inicio_jornada ||
    !jornadaPreparada.cierre_pronosticos
  ) {
    return false;
  }

  const { data: partidos, error: partidosError } = await supabase
    .from('partidos_test')
    .select('id, espn_event_id, equipo_local, equipo_visitante, fecha_partido')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', definicion.faseCompeticion);

  if (partidosError) {
    throw new Error(
      `Error verificando partidos ${definicion.nombre}: ${partidosError.message}`,
    );
  }

  return Boolean(
    partidos?.length === definicion.partidosEsperados &&
      partidos.every(
        (p: any) =>
          p.espn_event_id &&
          p.equipo_local &&
          p.equipo_visitante &&
          p.fecha_partido,
      ),
  );
}

async function validarCicloActualPlayoff(
  temporada: number,
  jornada: number,
  ronda: RondaPlayoff,
) {
  const definicion = RONDAS_PLAYOFF[ronda];

  const { data: partidos, error: partidosError } = await supabase
    .from('partidos_test')
    .select('id, estado, resultado_oficial, fecha_partido')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', definicion.faseCompeticion);

  if (partidosError) {
    throw new Error(
      `Error comprobando ${definicion.nombre}: ${partidosError.message}`,
    );
  }

  if (partidos?.length !== definicion.partidosEsperados) {
    return {
      completo: false,
      motivo: `${definicion.nombre} no tiene ${definicion.partidosEsperados} partidos en BBDD.`,
    };
  }

  const checkpoints = evaluarCheckpointsAdministrativos(
    partidos.map((p: any) => ({
      fecha_partido: p.fecha_partido,
      completado: p.estado === 'STATUS_FINAL' && p.resultado_oficial !== null,
    })),
  );

  const { error: checkpointError } = await supabase
    .from('jornadas_eventos_test')
    .update(checkpoints.cambios)
    .eq('temporada', temporada)
    .eq('jornada', jornada);

  if (checkpointError) {
    throw new Error(
      `Error actualizando checkpoints ${definicion.nombre}: ${checkpointError.message}`,
    );
  }

  const todosFinalizados = partidos.every(
    (p: any) => p.estado === 'STATUS_FINAL' && p.resultado_oficial !== null,
  );

  if (!todosFinalizados) {
    return {
      completo: false,
      motivo: `${definicion.nombre} todavía tiene partidos sin FINAL/resultado oficial.`,
    };
  }

  const idsPartidos = partidos.map((p: any) => p.id);
  const { data: pronosticos, error: pronosticosError } = await supabase
    .from('pronosticos_test')
    .select('eleccion, acierto')
    .in('partido_id', idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error verificando pronósticos ${definicion.nombre}: ${pronosticosError.message}`,
    );
  }

  const pronosticosValidados = (pronosticos || [])
    .filter((p: any) => p.eleccion !== null)
    .every((p: any) => typeof p.acierto === 'boolean');

  if (!pronosticosValidados) {
    return {
      completo: false,
      motivo: `${definicion.nombre} todavía tiene pronósticos sin validar.`,
    };
  }

  if (!checkpoints.todosLosCheckpointsUtilizadosOk) {
    return {
      completo: false,
      motivo: `${definicion.nombre} todavía tiene checkpoints pendientes.`,
    };
  }

  return { completo: true, motivo: null };
}

async function activarContextoSiguienteRonda(params: {
  temporada: number;
  jornadaActual: number;
  jornadaNueva: number;
  rondaNueva: RondaPlayoff;
  origen: 'regular' | 'playoffs';
  semanaAnterior?: number | null;
}): Promise<TransicionPlayoffOk> {
  const { temporada, jornadaActual, jornadaNueva, rondaNueva, origen, semanaAnterior = null } = params;
  const definicionNueva = RONDAS_PLAYOFF[rondaNueva];
  const indiceNuevo = indiceDesdeRonda(rondaNueva);
  const ahoraIso = new Date().toISOString();

  const { error: finalizarActualError } = await supabase
    .from('jornadas_eventos_test')
    .update({ estado: 'finalizada', fin_jornada: ahoraIso })
    .eq('temporada', temporada)
    .eq('jornada', jornadaActual)
    .neq('estado', 'finalizada');

  if (finalizarActualError) {
    throw new Error(
      `Error finalizando J${jornadaActual}: ${finalizarActualError.message}`,
    );
  }

  let pushResultadosApertura: any;
  try {
    pushResultadosApertura = origen === 'regular'
      ? await pushResultadosAperturaSiProcede({
          temporada,
          jornadaFinalizada: jornadaActual,
          jornadaNueva,
        })
      : await pushResultadosAperturaPlayoffSiProcede({
          temporada,
          jornadaFinalizada: jornadaActual,
          jornadaNueva,
        });
  } catch (error) {
    await supabase
      .from('jornadas_eventos_test')
      .update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada)
      .eq('jornada', jornadaActual)
      .eq('estado', 'finalizada');
    throw error;
  }

  const falloRealPush =
    !pushResultadosApertura.enviado &&
    !pushResultadosApertura.duplicado &&
    !pushResultadosApertura.sinSuscripciones &&
    pushResultadosApertura.suscripcionesActivas > 0;

  if (falloRealPush) {
    const { error: rollbackJornadaError } = await supabase
      .from('jornadas_eventos_test')
      .update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada)
      .eq('jornada', jornadaActual)
      .eq('estado', 'finalizada');

    if (rollbackJornadaError) {
      throw new Error('Falló el PUSH de transición y también el rollback de la jornada: ' + rollbackJornadaError.message);
    }

    throw new Error('Falló el PUSH de transición J' + jornadaActual + ' → J' + jornadaNueva + '; la jornada fue restaurada y app_config_test no se modificó.');
  }

  const { data: configActualizada, error: activarError } = await supabase
    .from('app_config_test')
    .update({
      fase_competicion: definicionNueva.faseCompeticion,
      semana_postemporada: indiceNuevo,
      jornada_actual: jornadaNueva,
    })
    .eq('id', 1)
    .eq('temporada', temporada)
    .eq('jornada_actual', jornadaActual)
    .select('id')
    .maybeSingle();

  if (activarError || !configActualizada) {
    await supabase
      .from('jornadas_eventos_test')
      .update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada)
      .eq('jornada', jornadaActual)
      .eq('estado', 'finalizada');

    throw new Error(definicionNueva.nombre + ' preparada y PUSH resuelto, pero app_config_test no pudo activarse: ' + (activarError?.message || 'contexto no coincidente'));
  }
  return {
    transicion: true,
    jornadaAnterior: jornadaActual,
    jornadaNueva,
    rondaNueva,
    faseCompeticion: definicionNueva.faseCompeticion,
    semanaPostemporada: indiceNuevo,
    pushResultadosApertura,
  };
}

export async function intentarTransicionRegularAWildCard(
  temporada: number,
  jornadaRegular: number,
): Promise<ResultadoTransicionPlayoff> {
  const resultados = await sincronizarPostemporada(temporada, 1, 1);
  const wildCard = resultados.find(
    (resultado: any) => resultado?.ronda === 'wild_card',
  );

  if (!wildCard?.preparada) {
    return {
      transicion: false,
      motivo:
        wildCard?.motivo ||
        'Wild Card todavía no está completamente publicada y validada en ESPN.',
    };
  }

  const jornadaWildCard = Number(wildCard.jornada);
  const preparada = await verificarJornadaPreparada(
    temporada,
    jornadaWildCard,
    'wild_card',
  );

  if (!preparada) {
    return {
      transicion: false,
      motivo: 'Wild Card no está administrativamente preparada para activarse.',
    };
  }

  return activarContextoSiguienteRonda({
    temporada,
    jornadaActual: jornadaRegular,
    jornadaNueva: jornadaWildCard,
    rondaNueva: 'wild_card',
    origen: 'regular',
  });
}

export async function intentarTransicionSiguienteRondaPlayoff(params: {
  temporada: number;
  jornadaActual: number;
  semanaPostemporada: number;
}): Promise<ResultadoTransicionPlayoff> {
  const { temporada, jornadaActual, semanaPostemporada } = params;
  const rondaActual = rondaDesdeIndice(semanaPostemporada);
  const siguiente = siguienteRondaPlayoff(rondaActual);

  if (!siguiente) {
    return {
      transicion: false,
      finPlayoffs: true,
      motivo: 'Super Bowl es la última ronda de playoffs.',
    };
  }

  await sincronizarPostemporada(
    temporada,
    semanaPostemporada,
    semanaPostemporada,
  );

  const cicloActual = await validarCicloActualPlayoff(
    temporada,
    jornadaActual,
    rondaActual,
  );

  if (!cicloActual.completo) {
    return {
      transicion: false,
      rondaActual,
      motivo: cicloActual.motivo || 'La ronda actual todavía no está completa.',
    };
  }

  const indiceSiguiente = indiceDesdeRonda(siguiente);
  const resultados = await sincronizarPostemporada(
    temporada,
    indiceSiguiente,
    indiceSiguiente,
  );
  const preparada = resultados.find(
    (resultado: any) => resultado?.ronda === siguiente,
  );

  if (!preparada?.preparada) {
    return {
      transicion: false,
      rondaActual,
      rondaSiguiente: siguiente,
      motivo:
        preparada?.motivo ||
        `${RONDAS_PLAYOFF[siguiente].nombre} todavía no está publicada y validada completamente en ESPN.`,
    };
  }

  const jornadaNueva = Number(preparada.jornada);
  const jornadaPreparada = await verificarJornadaPreparada(
    temporada,
    jornadaNueva,
    siguiente,
  );

  if (!jornadaPreparada) {
    return {
      transicion: false,
      rondaActual,
      rondaSiguiente: siguiente,
      motivo: `${RONDAS_PLAYOFF[siguiente].nombre} no está administrativamente preparada.`,
    };
  }

  return activarContextoSiguienteRonda({
    temporada,
    jornadaActual,
    jornadaNueva,
    rondaNueva: siguiente,
    origen: 'playoffs',
    semanaAnterior: semanaPostemporada,
  });
}
