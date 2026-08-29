const fs = require('fs');

function replaceOnce(path, oldText, newText, label) {
  let text = fs.readFileSync(path, 'utf8');
  if (!text.includes(oldText)) {
    throw new Error(path + ': no se encontró ' + label);
  }
  text = text.replace(oldText, newText);
  fs.writeFileSync(path, text, 'utf8');
}

function L(lines) {
  return lines.join('\n');
}

replaceOnce(
  'lib/pushAutomatic.ts',
  L([
    '        partido:partidos!inner (',
    '          jornada,',
    '          tipo_competicion',
    '        )',
  ]),
  L([
    '        partido:partidos!inner (',
    '          jornada,',
    '          temporada,',
    '          tipo_competicion',
    '        )',
  ]),
  'temporada en select resultados/apertura regular',
);

replaceOnce(
  'lib/pushAutomatic.ts',
  L([
    '      .in("user_id", ids)',
    '      .eq("partido.jornada", jornadaFinalizada)',
  ]),
  L([
    '      .in("user_id", ids)',
    '      .eq("partido.temporada", temporada)',
    '      .eq("partido.jornada", jornadaFinalizada)',
  ]),
  'filtro temporada resultados/apertura regular',
);

replaceOnce(
  'lib/playoffTransition.ts',
  "import { sincronizarPostemporada } from '@/lib/syncPostseason';",
  L([
    "import { sincronizarPostemporada } from '@/lib/syncPostseason';",
    "import { pushResultadosAperturaSiProcede } from '@/lib/pushAutomatic';",
    "import { pushResultadosAperturaPlayoffSiProcede } from '@/lib/playoffPush';",
  ]),
  'imports push transición',
);

replaceOnce(
  'lib/playoffTransition.ts',
  L(['  semanaPostemporada: number;', '};']),
  L(['  semanaPostemporada: number;', '  pushResultadosApertura: any;', '};']),
  'push en resultado transición',
);

replaceOnce(
  'lib/playoffTransition.ts',
  L([
    'async function activarContextoSiguienteRonda(params: {',
    '  temporada: number;',
    '  jornadaActual: number;',
    '  jornadaNueva: number;',
    '  rondaNueva: RondaPlayoff;',
    '}): Promise<TransicionPlayoffOk> {',
    '  const { temporada, jornadaActual, jornadaNueva, rondaNueva } = params;',
  ]),
  L([
    'async function activarContextoSiguienteRonda(params: {',
    '  temporada: number;',
    '  jornadaActual: number;',
    '  jornadaNueva: number;',
    '  rondaNueva: RondaPlayoff;',
    "  origen: 'regular' | 'playoffs';",
    '  semanaAnterior?: number | null;',
    '}): Promise<TransicionPlayoffOk> {',
    '  const { temporada, jornadaActual, jornadaNueva, rondaNueva, origen, semanaAnterior = null } = params;',
  ]),
  'parámetros transición',
);

const marker = L([
  '  return {',
  '    transicion: true,',
  '    jornadaAnterior: jornadaActual,',
  '    jornadaNueva,',
  '    rondaNueva,',
  '    faseCompeticion: definicionNueva.faseCompeticion,',
  '    semanaPostemporada: indiceNuevo,',
  '  };',
]);

const safePushBlock = L([
  '  let pushResultadosApertura: any;',
  '  try {',
  "    pushResultadosApertura = origen === 'regular'",
  '      ? await pushResultadosAperturaSiProcede({',
  '          temporada,',
  '          jornadaFinalizada: jornadaActual,',
  '          jornadaNueva,',
  '        })',
  '      : await pushResultadosAperturaPlayoffSiProcede({',
  '          temporada,',
  '          jornadaFinalizada: jornadaActual,',
  '          jornadaNueva,',
  '        });',
  '  } catch (error) {',
  "    await supabase.from('app_config').update({",
  '      fase_competicion: origen,',
  "      semana_postemporada: origen === 'playoffs' ? semanaAnterior : null,",
  '      jornada_actual: jornadaActual,',
  "    }).eq('id', 1).eq('temporada', temporada).eq('jornada_actual', jornadaNueva);",
  '',
  "    await supabase.from('jornadas_eventos').update({ estado: 'cerrada', fin_jornada: null })",
  "      .eq('temporada', temporada).eq('jornada', jornadaActual).eq('estado', 'finalizada');",
  '    throw error;',
  '  }',
  '',
  '  const falloRealPush =',
  '    !pushResultadosApertura.enviado &&',
  '    !pushResultadosApertura.duplicado &&',
  '    !pushResultadosApertura.sinSuscripciones &&',
  '    pushResultadosApertura.suscripcionesActivas > 0;',
  '',
  '  if (falloRealPush) {',
  "    const { error: rollbackConfigError } = await supabase.from('app_config').update({",
  '      fase_competicion: origen,',
  "      semana_postemporada: origen === 'playoffs' ? semanaAnterior : null,",
  '      jornada_actual: jornadaActual,',
  "    }).eq('id', 1).eq('temporada', temporada).eq('jornada_actual', jornadaNueva);",
  '',
  "    const { error: rollbackJornadaError } = await supabase.from('jornadas_eventos')",
  "      .update({ estado: 'cerrada', fin_jornada: null })",
  "      .eq('temporada', temporada).eq('jornada', jornadaActual).eq('estado', 'finalizada');",
  '',
  '    if (rollbackConfigError || rollbackJornadaError) {',
  "      throw new Error('Falló el PUSH de transición y también el rollback: ' + (rollbackConfigError?.message || rollbackJornadaError?.message));",
  '    }',
  "    throw new Error('Falló el PUSH de transición J' + jornadaActual + ' → J' + jornadaNueva + '; contexto restaurado para reintentar.');",
  '  }',
  '',
  '  return {',
  '    transicion: true,',
  '    jornadaAnterior: jornadaActual,',
  '    jornadaNueva,',
  '    rondaNueva,',
  '    faseCompeticion: definicionNueva.faseCompeticion,',
  '    semanaPostemporada: indiceNuevo,',
  '    pushResultadosApertura,',
  '  };',
]);

replaceOnce('lib/playoffTransition.ts', marker, safePushBlock, 'bloque retorno transición');

replaceOnce(
  'lib/playoffTransition.ts',
  L(["    rondaNueva: 'wild_card',", '  });']),
  L(["    rondaNueva: 'wild_card',", "    origen: 'regular',", '  });']),
  'origen regular',
);

replaceOnce(
  'lib/playoffTransition.ts',
  L(['    rondaNueva: siguiente,', '  });']),
  L(['    rondaNueva: siguiente,', "    origen: 'playoffs',", '    semanaAnterior: semanaPostemporada,', '  });']),
  'origen playoffs',
);

replaceOnce(
  'app/api/sync-current-week/route.ts',
  L(['  pushRecordatorioPlayoffSiProcede,', '  pushResultadosAperturaPlayoffSiProcede,', '  pushSuperBowlFinTemporadaSiProcede,']),
  L(['  pushRecordatorioPlayoffSiProcede,', '  pushSuperBowlFinTemporadaSiProcede,']),
  'import push resultados playoffs',
);

replaceOnce(
  'app/api/sync-current-week/route.ts',
  L([
    '      const pushResultadosApertura = transicion.transicion',
    '        ? await pushResultadosAperturaPlayoffSiProcede({',
    '            temporada,',
    '            jornadaFinalizada: transicion.jornadaAnterior,',
    '            jornadaNueva: transicion.jornadaNueva,',
    '          })',
    '        : null;',
  ]),
  L([
    '      const pushResultadosApertura = transicion.transicion',
    '        ? transicion.pushResultadosApertura',
    '        : null;',
  ]),
  'push retornado cron playoffs',
);

replaceOnce(
  'lib/syncCalendar.ts',
  L(['  pushCierrePorraSiProcede,', '  pushResultadosAperturaSiProcede,', '  pushOnFireSiProcede,']),
  L(['  pushCierrePorraSiProcede,', '  pushOnFireSiProcede,']),
  'import push resultados regular',
);

replaceOnce(
  'lib/syncCalendar.ts',
  L([
    '        const pushResultadosApertura = await pushResultadosAperturaSiProcede({',
    '          temporada,',
    '          jornadaFinalizada: semana,',
    '          jornadaNueva: transicionPlayoffs.jornadaNueva!,',
    '        });',
  ]),
  '        const pushResultadosApertura = transicionPlayoffs.pushResultadosApertura;',
  'push retornado TR a Wild Card',
);
