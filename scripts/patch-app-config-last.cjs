const fs = require('fs');

const path = 'lib/playoffTransition.ts';
let text = fs.readFileSync(path, 'utf8');

const oldBlock = `  const { data: configActualizada, error: activarError } = await supabase
    .from('app_config')
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
      .from('jornadas_eventos')
      .update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada)
      .eq('jornada', jornadaActual)
      .eq('estado', 'finalizada');

    throw new Error(
      \`${definicionNueva.nombre} preparada pero app_config no pudo activarse: \${activarError?.message || 'contexto no coincidente'}\`,
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
    await supabase.from('app_config').update({
      fase_competicion: origen,
      semana_postemporada: origen === 'playoffs' ? semanaAnterior : null,
      jornada_actual: jornadaActual,
    }).eq('id', 1).eq('temporada', temporada).eq('jornada_actual', jornadaNueva);

    await supabase.from('jornadas_eventos').update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada).eq('jornada', jornadaActual).eq('estado', 'finalizada');
    throw error;
  }

  const falloRealPush =
    !pushResultadosApertura.enviado &&
    !pushResultadosApertura.duplicado &&
    !pushResultadosApertura.sinSuscripciones &&
    pushResultadosApertura.suscripcionesActivas > 0;

  if (falloRealPush) {
    const { error: rollbackConfigError } = await supabase.from('app_config').update({
      fase_competicion: origen,
      semana_postemporada: origen === 'playoffs' ? semanaAnterior : null,
      jornada_actual: jornadaActual,
    }).eq('id', 1).eq('temporada', temporada).eq('jornada_actual', jornadaNueva);

    const { error: rollbackJornadaError } = await supabase.from('jornadas_eventos')
      .update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada).eq('jornada', jornadaActual).eq('estado', 'finalizada');

    if (rollbackConfigError || rollbackJornadaError) {
      throw new Error('Falló el PUSH de transición y también el rollback: ' + (rollbackConfigError?.message || rollbackJornadaError?.message));
    }
    throw new Error('Falló el PUSH de transición J' + jornadaActual + ' → J' + jornadaNueva + '; contexto restaurado para reintentar.');
  }
`;

const newBlock = `  let pushResultadosApertura: any;
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
      .from('jornadas_eventos')
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
      .from('jornadas_eventos')
      .update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada)
      .eq('jornada', jornadaActual)
      .eq('estado', 'finalizada');

    if (rollbackJornadaError) {
      throw new Error(
        'Falló el PUSH de transición y también el rollback de la jornada: ' + rollbackJornadaError.message,
      );
    }

    throw new Error(
      'Falló el PUSH de transición J' + jornadaActual + ' → J' + jornadaNueva + '; la jornada fue restaurada y app_config no se modificó.',
    );
  }

  const { data: configActualizada, error: activarError } = await supabase
    .from('app_config')
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
      .from('jornadas_eventos')
      .update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada)
      .eq('jornada', jornadaActual)
      .eq('estado', 'finalizada');

    throw new Error(
      \`${definicionNueva.nombre} preparada y PUSH resuelto, pero app_config no pudo activarse: \${activarError?.message || 'contexto no coincidente'}\`,
    );
  }
`;

if (!text.includes(oldBlock)) {
  throw new Error('No se encontró el bloque esperado de transición playoffs');
}

text = text.replace(oldBlock, newBlock);
fs.writeFileSync(path, text, 'utf8');
