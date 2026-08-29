import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { evaluarCheckpointsAdministrativos } from '@/lib/nflAdministrativeClock';
import {
  pushCierrePorraSiProcede,
  pushResultadosAperturaSiProcede,
  pushOnFireSiProcede,
  pushMadreMiaSiProcede,
  pushPlenoRedzoneSiProcede,
  pushMenudoBanoSiProcede,
  pushSeEscapaSiProcede,
  pushPlenoMagicoSiProcede,
  pushNoTeComesElTurronSiProcede,
  pushLiderSolidoSiProcede,
  pushRecordatorioPronosticosSiProcede,
} from '@/lib/pushAutomatic';

async function prepararSiguienteJornadaRegular(
  temporada: number,
  jornada: number,
) {
  const { data: partidosEsperados, error: esperadosError } = await supabase
    .from('partidos')
    .select('espn_event_id')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', 'regular');

  if (esperadosError) {
    throw new Error(
      `Error consultando calendario esperado de Jornada ${jornada}: ${esperadosError.message}`,
    );
  }

  if (!partidosEsperados || partidosEsperados.length === 0) {
    throw new Error(
      `No existe calendario regular precargado para Jornada ${jornada} de ${temporada}`,
    );
  }

  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporada}&seasontype=2&week=${jornada}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(
      `ESPN respondió HTTP ${res.status} preparando Jornada ${jornada}`,
    );
  }

  const data = await res.json();
  const eventos = (data.events || []).sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  if (eventos.length === 0) {
    throw new Error(`ESPN no devolvió partidos para preparar Jornada ${jornada}`);
  }

  const idsEsperados = new Set(
    partidosEsperados.map((p: any) => String(p.espn_event_id)),
  );
  const idsEspn = new Set(eventos.map((evento: any) => String(evento.id)));

  if (eventos.length !== idsEsperados.size) {
    throw new Error(
      `Calendario incompleto para Jornada ${jornada}: BBDD espera ${idsEsperados.size} partidos y ESPN devolvió ${eventos.length}`,
    );
  }

  const faltanEnEspn = [...idsEsperados].filter((id) => !idsEspn.has(id));
  const sobranEnEspn = [...idsEspn].filter((id) => !idsEsperados.has(id));

  if (faltanEnEspn.length > 0 || sobranEnEspn.length > 0) {
    throw new Error(
      `Los partidos ESPN no coinciden con Jornada ${jornada}. Faltan: ${faltanEnEspn.join(', ') || 'ninguno'}. Sobran: ${sobranEnEspn.join(', ') || 'ninguno'}.`,
    );
  }

  const { data: jornadaEvento, error: jornadaEventoError } = await supabase
    .from('jornadas_eventos')
    .select('jornada, estado')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .maybeSingle();

  if (jornadaEventoError) {
    throw new Error(
      `Error consultando Jornada ${jornada}: ${jornadaEventoError.message}`,
    );
  }

  if (!jornadaEvento || jornadaEvento.estado !== 'pendiente') {
    throw new Error(
      `La Jornada ${jornada} no existe o no está pendiente`,
    );
  }

  const partidosPreparados = eventos.map((evento: any) => {
    const comp = evento.competitions?.[0];
    if (!comp) throw new Error(`ESPN ${evento.id} no contiene competition válida`);

    const local = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const visitante = comp.competitors?.find((c: any) => c.homeAway === 'away');
    const localAbrev = local?.team?.abbreviation || '';
    const visitanteAbrev = visitante?.team?.abbreviation || '';

    if (!localAbrev || !visitanteAbrev || !evento.date) {
      throw new Error(`ESPN ${evento.id} no contiene equipos/fecha válidos`);
    }

    const puntosLocal = parseInt(local?.score || '0', 10);
    const puntosVisitante = parseInt(visitante?.score || '0', 10);
    const completado = Boolean(comp.status?.type?.completed);

    let resultadoOficial: '1' | 'X' | '2' | null = null;
    if (completado) {
      resultadoOficial =
        puntosLocal > puntosVisitante ? '1' : puntosLocal < puntosVisitante ? '2' : 'X';
    }

    return {
      espn_event_id: evento.id,
      temporada,
      jornada,
      semana_competicion: jornada,
      tipo_competicion: 'regular',
      equipo_local: localAbrev,
      equipo_visitante: visitanteAbrev,
      fecha_partido: new Date(evento.date).toISOString(),
      estado: comp.status?.type?.name || 'STATUS_SCHEDULED',
      puntos_local: puntosLocal,
      puntos_visitante: puntosVisitante,
      periodo: Number(comp.status?.period || 0) || null,
      reloj: comp.status?.displayClock || comp.status?.type?.shortDetail || null,
      resultado_oficial: resultadoOficial,
    };
  });

  const primerPartido = new Date(partidosPreparados[0].fecha_partido);
  const cierrePronosticos = new Date(primerPartido.getTime() - 30 * 60 * 1000);

  const { error: partidosError } = await supabase
    .from('partidos')
    .upsert(partidosPreparados, { onConflict: 'espn_event_id' });

  if (partidosError) {
    throw new Error(
      `Error preparando partidos de Jornada ${jornada}: ${partidosError.message}`,
    );
  }

  const { error: jornadaUpdateError } = await supabase
    .from('jornadas_eventos')
    .update({
      inicio_jornada: primerPartido.toISOString(),
      cierre_pronosticos: cierrePronosticos.toISOString(),
    })
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('estado', 'pendiente');

  if (jornadaUpdateError) {
    throw new Error(
      `Error preparando calendario de Jornada ${jornada}: ${jornadaUpdateError.message}`,
    );
  }

  const { data: partidosVerificados, error: verificarError } = await supabase
    .from('partidos')
    .select('espn_event_id')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', 'regular');

  if (verificarError) {
    throw new Error(`Error verificando Jornada ${jornada}: ${verificarError.message}`);
  }

  const idsVerificados = new Set(
    (partidosVerificados || []).map((p: any) => String(p.espn_event_id)),
  );

  if (
    partidosVerificados?.length !== partidosPreparados.length ||
    partidosPreparados.some((p) => !idsVerificados.has(String(p.espn_event_id)))
  ) {
    throw new Error(`Jornada ${jornada} no quedó completamente verificada en BBDD`);
  }

  return {
    jornada,
    partidos: partidosPreparados.length,
    inicioJornada: primerPartido.toISOString(),
    cierrePronosticos: cierrePronosticos.toISOString(),
  };
}

async function existeSiguienteJornadaRegular(temporada: number, jornada: number) {
  const { data, error } = await supabase
    .from('jornadas_eventos')
    .select('jornada')
    .eq('temporada', temporada)
    .eq('jornada', jornada + 1)
    .maybeSingle();

  if (error) throw new Error(`Error buscando siguiente jornada: ${error.message}`);
  return Boolean(data);
}

export async function sincronizarTemporadaCompleta(
  temporada: number,
  semanaInicio = 1,
  semanaFin = 18,
) {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada regular inválida: ${temporada}`);
  }

  for (let semana = semanaInicio; semana <= semanaFin; semana++) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporada}&seasontype=2&week=${semana}`,
        { cache: 'no-store' },
      );

      if (!res.ok) throw new Error(`ESPN respondió HTTP ${res.status}`);

      const data = await res.json();
      const eventos = (data.events || []).sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      if (eventos.length === 0) continue;

      const primerPartidoFecha = new Date(eventos[0].date);
      const cierrePronosticos = new Date(
        primerPartidoFecha.getTime() - 30 * 60 * 1000,
      ).toISOString();

      const { data: jornadaEvento, error: jornadaEventoError } = await supabase
        .from('jornadas_eventos')
        .select('jornada, estado, cierre_pronosticos')
        .eq('temporada', temporada)
        .eq('jornada', semana)
        .maybeSingle();

      if (jornadaEventoError) {
        throw new Error(`Error leyendo Jornada ${semana}: ${jornadaEventoError.message}`);
      }

      if (
        jornadaEvento?.estado === 'pendiente' &&
        jornadaEvento.cierre_pronosticos &&
        new Date() >= new Date(jornadaEvento.cierre_pronosticos)
      ) {
        const { error } = await supabase
          .from('jornadas_eventos')
          .update({ estado: 'cerrada' })
          .eq('temporada', temporada)
          .eq('jornada', semana)
          .eq('estado', 'pendiente');
        if (error) throw new Error(`Error cerrando Jornada ${semana}: ${error.message}`);

        await pushCierrePorraSiProcede({ temporada, jornada: semana, estado: 'cerrada' });
      } else if (jornadaEvento?.estado === 'pendiente') {
        if (jornadaEvento.cierre_pronosticos) {
          await pushRecordatorioPronosticosSiProcede({
            temporada,
            jornada: semana,
            cierrePronosticos: jornadaEvento.cierre_pronosticos,
          });
        }

        const { error } = await supabase
          .from('jornadas_eventos')
          .update({
            inicio_jornada: primerPartidoFecha.toISOString(),
            cierre_pronosticos: cierrePronosticos,
          })
          .eq('temporada', temporada)
          .eq('jornada', semana)
          .eq('estado', 'pendiente');
        if (error) throw new Error(`Error actualizando Jornada ${semana}: ${error.message}`);
      }

      for (const evento of eventos) {
        const comp = evento.competitions?.[0];
        if (!comp) continue;

        const local = comp.competitors?.find((c: any) => c.homeAway === 'home');
        const visitante = comp.competitors?.find((c: any) => c.homeAway === 'away');
        const localAbrev = local?.team?.abbreviation || '';
        const visitAbrev = visitante?.team?.abbreviation || '';
        const puntosLocal = parseInt(local?.score || '0', 10);
        const puntosVisitante = parseInt(visitante?.score || '0', 10);
        const completado = Boolean(comp.status?.type?.completed);
        const estado = comp.status?.type?.name || 'STATUS_SCHEDULED';

        let resultadoOficial: '1' | 'X' | '2' | null = null;
        if (completado) {
          resultadoOficial =
            puntosLocal > puntosVisitante ? '1' : puntosLocal < puntosVisitante ? '2' : 'X';
        }

        const { data: partidoGuardado, error: upsertError } = await supabase
          .from('partidos')
          .upsert(
            {
              espn_event_id: evento.id,
              temporada,
              jornada: semana,
              semana_competicion: semana,
              tipo_competicion: 'regular',
              equipo_local: localAbrev,
              equipo_visitante: visitAbrev,
              fecha_partido: new Date(evento.date).toISOString(),
              estado,
              puntos_local: puntosLocal,
              puntos_visitante: puntosVisitante,
              periodo: Number(comp.status?.period || 0) || null,
              reloj: comp.status?.displayClock || comp.status?.type?.shortDetail || null,
              resultado_oficial: resultadoOficial,
            },
            { onConflict: 'espn_event_id' },
          )
          .select('id')
          .single();

        if (upsertError || !partidoGuardado) {
          throw new Error(`Error guardando partido ESPN ${evento.id}: ${upsertError?.message || 'sin id'}`);
        }

        if (completado && resultadoOficial) {
          const { error: aciertosError } = await supabase
            .from('pronosticos')
            .update({ acierto: true })
            .eq('partido_id', partidoGuardado.id)
            .eq('eleccion', resultadoOficial);
          if (aciertosError) throw new Error(`Error validando aciertos: ${aciertosError.message}`);

          const { error: fallosError } = await supabase
            .from('pronosticos')
            .update({ acierto: false })
            .eq('partido_id', partidoGuardado.id)
            .neq('eleccion', resultadoOficial);
          if (fallosError) throw new Error(`Error validando fallos: ${fallosError.message}`);

          await pushOnFireSiProcede({ temporada, jornada: semana });
          await pushMadreMiaSiProcede({ temporada, jornada: semana });
          await pushPlenoRedzoneSiProcede({ temporada, jornada: semana });
          await pushMenudoBanoSiProcede({ temporada, jornada: semana });
          await pushSeEscapaSiProcede({ temporada, jornada: semana });
        } else {
          const { error } = await supabase
            .from('pronosticos')
            .update({ acierto: null })
            .eq('partido_id', partidoGuardado.id);
          if (error) throw new Error(`Error limpiando aciertos: ${error.message}`);
        }
      }

      const partidosCheckpoint = eventos.map((evento: any) => ({
        fecha_partido: new Date(evento.date).toISOString(),
        completado: Boolean(evento.competitions?.[0]?.status?.type?.completed),
      }));

      const checkpoints = evaluarCheckpointsAdministrativos(partidosCheckpoint);
      const { error: checkpointError } = await supabase
        .from('jornadas_eventos')
        .update(checkpoints.cambios)
        .eq('temporada', temporada)
        .eq('jornada', semana);

      if (checkpointError) {
        throw new Error(`Error actualizando checkpoints J${semana}: ${checkpointError.message}`);
      }

      const { data: partidosJornada, error: partidosJornadaError } = await supabase
        .from('partidos')
        .select('id, estado, resultado_oficial')
        .eq('temporada', temporada)
        .eq('jornada', semana)
        .eq('tipo_competicion', 'regular');

      if (partidosJornadaError) {
        throw new Error(`Error comprobando Jornada ${semana}: ${partidosJornadaError.message}`);
      }

      const todosFinalizados =
        Boolean(partidosJornada?.length) &&
        partidosJornada!.every(
          (p: any) => p.estado === 'STATUS_FINAL' && p.resultado_oficial !== null,
        );

      let pronosticosValidados = false;
      if (todosFinalizados) {
        const idsPartidos = (partidosJornada || []).map((p: any) => p.id);
        const { data: pronosticos, error: pronosticosError } = await supabase
          .from('pronosticos')
          .select('eleccion, acierto')
          .in('partido_id', idsPartidos);

        if (pronosticosError) {
          throw new Error(`Error verificando pronósticos J${semana}: ${pronosticosError.message}`);
        }

        pronosticosValidados = (pronosticos || [])
          .filter((p: any) => p.eleccion !== null)
          .every((p: any) => typeof p.acierto === 'boolean');
      }

      const cicloActualCompleto =
        todosFinalizados &&
        checkpoints.todosLosCheckpointsUtilizadosOk &&
        pronosticosValidados;

      if (!cicloActualCompleto) continue;

      await pushPlenoMagicoSiProcede({ temporada, jornada: semana });
      await pushNoTeComesElTurronSiProcede({ temporada, jornada: semana });
      await pushLiderSolidoSiProcede({ temporada, jornada: semana });

      const tieneSiguienteRegular = await existeSiguienteJornadaRegular(temporada, semana);

      // La última jornada regular NO se finaliza aquí: su transición a PLAYOFFS
      // pertenece a la máquina J18/Jn -> Wild Card de FASE 2.
      if (!tieneSiguienteRegular) {
        console.log(
          `J${semana} deportiva y administrativamente resuelta. Esperando transición a PLAYOFFS.`,
        );
        continue;
      }

      const siguienteJornada = semana + 1;
      const preparacion = await prepararSiguienteJornadaRegular(temporada, siguienteJornada);
      const ahoraIso = new Date().toISOString();

      const { error: cerrarJornadaError } = await supabase
        .from('jornadas_eventos')
        .update({ estado: 'finalizada', fin_jornada: ahoraIso })
        .eq('temporada', temporada)
        .eq('jornada', semana)
        .neq('estado', 'finalizada');

      if (cerrarJornadaError) {
        throw new Error(`Error finalizando Jornada ${semana}: ${cerrarJornadaError.message}`);
      }

      const { error: activarJornadaError } = await supabase
        .from('app_config')
        .update({ jornada_actual: siguienteJornada })
        .eq('id', 1)
        .eq('temporada', temporada)
        .eq('jornada_actual', semana);

      if (activarJornadaError) {
        throw new Error(
          `J${siguienteJornada} preparada, pero no pudo activarse: ${activarJornadaError.message}`,
        );
      }

      const pushResultadosApertura = await pushResultadosAperturaSiProcede({
        temporada,
        jornadaFinalizada: semana,
        jornadaNueva: siguienteJornada,
      });

      console.log(`🏁 Transición segura J${semana} -> J${siguienteJornada}`, {
        preparacion,
        pushResultadosApertura,
      });
    } catch (error) {
      console.error(`Error al sincronizar jornada ${semana}:`, error);
    }
  }
}
