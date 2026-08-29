const fs = require('fs');

function patchFile(path, patches) {
  let text = fs.readFileSync(path, 'utf8');
  for (const { oldText, newText, label } of patches) {
    if (!text.includes(oldText)) {
      throw new Error(`${path}: no se encontró ${label}`);
    }
    text = text.replace(oldText, newText);
  }
  fs.writeFileSync(path, text, 'utf8');
}

// 1) PUSH de transición TR -> Wild Card: aislar por temporada.
patchFile('lib/pushAutomatic.ts', [
  {
    label: 'select temporada en resultados/apertura regular',
    oldText: `        partido:partidos!inner (\n          jornada,\n          tipo_competicion\n        )`,
    newText: `        partido:partidos!inner (\n          jornada,\n          temporada,\n          tipo_competicion\n        )`,
  },
  {
    label: 'filtro temporada en resultados/apertura regular',
    oldText: `      .in("user_id", ids)\n      .eq("partido.jornada", jornadaFinalizada)`,
    newText: `      .in("user_id", ids)\n      .eq("partido.temporada", temporada)\n      .eq("partido.jornada", jornadaFinalizada)`,
  },
]);

// 2) La transición de ronda controla también el PUSH y revierte si falla realmente.
patchFile('lib/playoffTransition.ts', [
  {
    label: 'imports push de transición',
    oldText: `import { sincronizarPostemporada } from '@/lib/syncPostseason';`,
    newText: `import { sincronizarPostemporada } from '@/lib/syncPostseason';\nimport { pushResultadosAperturaSiProcede } from '@/lib/pushAutomatic';\nimport { pushResultadosAperturaPlayoffSiProcede } from '@/lib/playoffPush';`,
  },
  {
    label: 'resultado transición incluye push',
    oldText: `  semanaPostemporada: number;\n};`,
    newText: `  semanaPostemporada: number;\n  pushResultadosApertura: any;\n};`,
  },
  {
    label: 'parámetros activar ronda',
    oldText: `async function activarContextoSiguienteRonda(params: {\n  temporada: number;\n  jornadaActual: number;\n  jornadaNueva: number;\n  rondaNueva: RondaPlayoff;\n}): Promise<TransicionPlayoffOk> {\n  const { temporada, jornadaActual, jornadaNueva, rondaNueva } = params;`,
    newText: `async function activarContextoSiguienteRonda(params: {\n  temporada: number;\n  jornadaActual: number;\n  jornadaNueva: number;\n  rondaNueva: RondaPlayoff;\n  origen: 'regular' | 'playoffs';\n  semanaAnterior?: number | null;\n}): Promise<TransicionPlayoffOk> {\n  const { temporada, jornadaActual, jornadaNueva, rondaNueva, origen, semanaAnterior = null } = params;`,
  },
  {
    label: 'bloque final activación con push seguro',
    oldText: `  const { data: configActualizada, error: activarError } = await supabase\n    .from('app_config')\n    .update({\n      fase_competicion: definicionNueva.faseCompeticion,\n      semana_postemporada: indiceNuevo,\n      jornada_actual: jornadaNueva,\n    })\n    .eq('id', 1)\n    .eq('temporada', temporada)\n    .eq('jornada_actual', jornadaActual)\n    .select('id')\n    .maybeSingle();\n\n  if (activarError || !configActualizada) {\n    await supabase\n      .from('jornadas_eventos')\n      .update({ estado: 'cerrada', fin_jornada: null })\n      .eq('temporada', temporada)\n      .eq('jornada', jornadaActual)\n      .eq('estado', 'finalizada');\n\n    throw new Error(\n      \`${definicionNueva.nombre} preparada pero app_config no pudo activarse: \${activarError?.message || 'contexto no coincidente'}\`,\n    );\n  }\n\n  return {\n    transicion: true,\n    jornadaAnterior: jornadaActual,\n    jornadaNueva,\n    rondaNueva,\n    faseCompeticion: definicionNueva.faseCompeticion,\n    semanaPostemporada: indiceNuevo,\n  };`,
    newText: `  const { data: configActualizada, error: activarError } = await supabase\n    .from('app_config')\n    .update({\n      fase_competicion: definicionNueva.faseCompeticion,\n      semana_postemporada: indiceNuevo,\n      jornada_actual: jornadaNueva,\n    })\n    .eq('id', 1)\n    .eq('temporada', temporada)\n    .eq('jornada_actual', jornadaActual)\n    .select('id')\n    .maybeSingle();\n\n  if (activarError || !configActualizada) {\n    await supabase\n      .from('jornadas_eventos')\n      .update({ estado: 'cerrada', fin_jornada: null })\n      .eq('temporada', temporada)\n      .eq('jornada', jornadaActual)\n      .eq('estado', 'finalizada');\n\n    throw new Error(\n      \`${definicionNueva.nombre} preparada pero app_config no pudo activarse: \${activarError?.message || 'contexto no coincidente'}\`,\n    );\n  }\n\n  let pushResultadosApertura: any;\n  try {\n    pushResultadosApertura = origen === 'regular'\n      ? await pushResultadosAperturaSiProcede({\n          temporada,\n          jornadaFinalizada: jornadaActual,\n          jornadaNueva,\n        })\n      : await pushResultadosAperturaPlayoffSiProcede({\n          temporada,\n          jornadaFinalizada: jornadaActual,\n          jornadaNueva,\n        });\n  } catch (error) {\n    await supabase\n      .from('app_config')\n      .update({\n        fase_competicion: origen,\n        semana_postemporada: origen === 'playoffs' ? semanaAnterior : null,\n        jornada_actual: jornadaActual,\n      })\n      .eq('id', 1)\n      .eq('temporada', temporada)\n      .eq('jornada_actual', jornadaNueva);\n\n    await supabase\n      .from('jornadas_eventos')\n      .update({ estado: 'cerrada', fin_jornada: null })\n      .eq('temporada', temporada)\n      .eq('jornada', jornadaActual)\n      .eq('estado', 'finalizada');\n\n    throw error;\n  }\n\n  const falloRealPush =\n    !pushResultadosApertura.enviado &&\n    !pushResultadosApertura.duplicado &&\n    !pushResultadosApertura.sinSuscripciones &&\n    pushResultadosApertura.suscripcionesActivas > 0;\n\n  if (falloRealPush) {\n    const { error: rollbackConfigError } = await supabase\n      .from('app_config')\n      .update({\n        fase_competicion: origen,\n        semana_postemporada: origen === 'playoffs' ? semanaAnterior : null,\n        jornada_actual: jornadaActual,\n      })\n      .eq('id', 1)\n      .eq('temporada', temporada)\n      .eq('jornada_actual', jornadaNueva);\n\n    const { error: rollbackJornadaError } = await supabase\n      .from('jornadas_eventos')\n      .update({ estado: 'cerrada', fin_jornada: null })\n      .eq('temporada', temporada)\n      .eq('jornada', jornadaActual)\n      .eq('estado', 'finalizada');\n\n    if (rollbackConfigError || rollbackJornadaError) {\n      throw new Error(\n        \`Falló el PUSH de transición y también el rollback: \${rollbackConfigError?.message || rollbackJornadaError?.message}\`,\n      );\n    }\n\n    throw new Error(\n      \`Falló el PUSH de transición J\${jornadaActual} → J\${jornadaNueva}; contexto restaurado para reintentar.\`,\n    );\n  }\n\n  return {\n    transicion: true,\n    jornadaAnterior: jornadaActual,\n    jornadaNueva,\n    rondaNueva,\n    faseCompeticion: definicionNueva.faseCompeticion,\n    semanaPostemporada: indiceNuevo,\n    pushResultadosApertura,\n  };`,
  },
  {
    label: 'origen regular a wild card',
    oldText: `    jornadaNueva: jornadaWildCard,\n    rondaNueva: 'wild_card',\n  });`,
    newText: `    jornadaNueva: jornadaWildCard,\n    rondaNueva: 'wild_card',\n    origen: 'regular',\n  });`,
  },
  {
    label: 'origen playoffs a siguiente ronda',
    oldText: `    jornadaNueva,\n    rondaNueva: siguiente,\n  });`,
    newText: `    jornadaNueva,\n    rondaNueva: siguiente,\n    origen: 'playoffs',\n    semanaAnterior: semanaPostemporada,\n  });`,
  },
]);

// 3) El cron de playoffs ya recibe el PUSH desde la transición segura.
patchFile('app/api/sync-current-week/route.ts', [
  {
    label: 'quitar import push resultados playoffs',
    oldText: `  pushRecordatorioPlayoffSiProcede,\n  pushResultadosAperturaPlayoffSiProcede,\n  pushSuperBowlFinTemporadaSiProcede,`,
    newText: `  pushRecordatorioPlayoffSiProcede,\n  pushSuperBowlFinTemporadaSiProcede,`,
  },
  {
    label: 'usar push retornado por transición',
    oldText: `      const pushResultadosApertura = transicion.transicion\n        ? await pushResultadosAperturaPlayoffSiProcede({\n            temporada,\n            jornadaFinalizada: transicion.jornadaAnterior,\n            jornadaNueva: transicion.jornadaNueva,\n          })\n        : null;`,
    newText: `      const pushResultadosApertura = transicion.transicion\n        ? transicion.pushResultadosApertura\n        : null;`,
  },
]);

// 4) TR -> Wild Card tampoco vuelve a enviar el PUSH después de cambiar contexto.
patchFile('lib/syncCalendar.ts', [
  {
    label: 'quitar import resultados apertura regular',
    oldText: `  pushCierrePorraSiProcede,\n  pushResultadosAperturaSiProcede,\n  pushOnFireSiProcede,`,
    newText: `  pushCierrePorraSiProcede,\n  pushOnFireSiProcede,`,
  },
  {
    label: 'usar push retornado en transición wild card',
    oldText: `        const pushResultadosApertura = await pushResultadosAperturaSiProcede({\n          temporada,\n          jornadaFinalizada: semana,\n          jornadaNueva: transicionPlayoffs.jornadaNueva!,\n        });\n\n        console.log(\`🏁 Transición segura J\${semana} -> WILD CARD\`, {\n          transicionPlayoffs,\n          pushResultadosApertura,\n        });`,
    newText: `        const pushResultadosApertura = transicionPlayoffs.pushResultadosApertura;\n\n        console.log(\`🏁 Transición segura J\${semana} -> WILD CARD\`, {\n          transicionPlayoffs,\n          pushResultadosApertura,\n        });`,
  },
]);
