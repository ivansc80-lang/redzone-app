import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { evaluarCheckpointsAdministrativos } from '@/lib/nflAdministrativeClock';

export async function prepararCierreSuperBowl(params: {
  temporada: number;
  jornada: number;
}) {
  const { temporada, jornada } = params;

  const { data: partidos, error: partidosError } = await supabase
    .from('partidos')
    .select('id, estado, resultado_oficial, fecha_partido')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', 'superbowl');

  if (partidosError) {
    throw new Error(`Error comprobando Super Bowl: ${partidosError.message}`);
  }

  if (partidos?.length !== 1) {
    return {
      listaParaCerrar: false,
      motivo: `Super Bowl debe tener exactamente 1 partido; ahora hay ${partidos?.length || 0}.`,
    };
  }

  const partido = partidos[0];
  const checkpoints = evaluarCheckpointsAdministrativos([
    {
      fecha_partido: partido.fecha_partido,
      completado:
        partido.estado === 'STATUS_FINAL' &&
        partido.resultado_oficial !== null,
    },
  ]);

  const { error: checkpointError } = await supabase
    .from('jornadas_eventos')
    .update(checkpoints.cambios)
    .eq('temporada', temporada)
    .eq('jornada', jornada);

  if (checkpointError) {
    throw new Error(
      `Error actualizando checkpoints de Super Bowl: ${checkpointError.message}`,
    );
  }

  if (
    partido.estado !== 'STATUS_FINAL' ||
    partido.resultado_oficial === null
  ) {
    return {
      listaParaCerrar: false,
      motivo: 'La Super Bowl todavía no está FINAL con resultado oficial.',
    };
  }

  const { data: pronosticos, error: pronosticosError } = await supabase
    .from('pronosticos')
    .select('eleccion, acierto')
    .eq('partido_id', partido.id);

  if (pronosticosError) {
    throw new Error(
      `Error verificando pronósticos de Super Bowl: ${pronosticosError.message}`,
    );
  }

  const pronosticosValidados = (pronosticos || [])
    .filter((p: any) => p.eleccion !== null)
    .every((p: any) => typeof p.acierto === 'boolean');

  if (!pronosticosValidados) {
    return {
      listaParaCerrar: false,
      motivo: 'La Super Bowl todavía tiene pronósticos sin validar.',
    };
  }

  if (!checkpoints.todosLosCheckpointsUtilizadosOk) {
    return {
      listaParaCerrar: false,
      motivo: 'La Super Bowl todavía tiene checkpoints administrativos pendientes.',
    };
  }

  const { data: jornadaEvento, error: jornadaError } = await supabase
    .from('jornadas_eventos')
    .select('estado, fin_jornada')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .maybeSingle();

  if (jornadaError || !jornadaEvento) {
    throw new Error(
      `No se pudo verificar la jornada administrativa de Super Bowl: ${jornadaError?.message || 'sin registro'}`,
    );
  }

  if (jornadaEvento.estado !== 'finalizada') {
    const { error: finalizarError } = await supabase
      .from('jornadas_eventos')
      .update({
        estado: 'finalizada',
        fin_jornada: new Date().toISOString(),
      })
      .eq('temporada', temporada)
      .eq('jornada', jornada)
      .neq('estado', 'finalizada');

    if (finalizarError) {
      throw new Error(
        `Error finalizando la jornada de Super Bowl: ${finalizarError.message}`,
      );
    }
  }

  return {
    listaParaCerrar: true,
    motivo: 'Super Bowl completamente finalizada y validada.',
  };
}

export async function finalizarTemporadaTrasSuperBowl(params: {
  temporada: number;
  jornada: number;
}) {
  const { temporada, jornada } = params;

  const { data: actualizada, error } = await supabase
    .from('app_config')
    .update({
      fase_competicion: 'finalizada',
      semana_postemporada: null,
    })
    .eq('id', 1)
    .eq('temporada', temporada)
    .eq('jornada_actual', jornada)
    .eq('fase_competicion', 'superbowl')
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Error cerrando la temporada tras Super Bowl: ${error.message}`);
  }

  if (!actualizada) {
    const { data: config, error: configError } = await supabase
      .from('app_config')
      .select('fase_competicion, temporada, jornada_actual')
      .eq('id', 1)
      .maybeSingle();

    if (configError) {
      throw new Error(`Error verificando cierre de temporada: ${configError.message}`);
    }

    if (
      config?.fase_competicion === 'finalizada' &&
      Number(config?.temporada) === temporada &&
      Number(config?.jornada_actual) === jornada
    ) {
      return { finalizada: true, yaEstabaFinalizada: true };
    }

    throw new Error('El contexto de app_config no coincidía para cerrar la temporada.');
  }

  return { finalizada: true, yaEstabaFinalizada: false };
}
