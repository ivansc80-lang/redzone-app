import { supabaseServer as supabase } from '@/lib/supabaseServer';
import {
  calcularRelojAdministrativo,
  CHECKPOINT_MARGIN_HOURS,
} from '@/lib/nflAdministrativeClock';
import { descubrirEstructuraTemporadaNFL } from '@/lib/nflSeasonStructure';
import {
  jornadaRedzoneParaRonda,
  localizarSemanaEspnDeRonda,
  RONDAS_PLAYOFF,
  type RondaPlayoff,
} from '@/lib/playoffStructure';

const UNA_HORA_MS = 60 * 60 * 1000;

function rondaDesdeSemanaSolicitada(semana: number): RondaPlayoff {
  if (semana === 1) return 'wild_card';
  if (semana === 2) return 'divisional';
  if (semana === 3) return 'conference';
  return 'super_bowl';
}

async function obtenerUltimaJornadaRegularDesdeBbdd(temporada: number) {
  const { data, error } = await supabase
    .from('partidos_test')
    .select('jornada')
    .eq('temporada', temporada)
    .eq('tipo_competicion', 'regular')
    .order('jornada', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error leyendo última jornada regular: ${error.message}`);
  }

  return data?.jornada ? Number(data.jornada) : null;
}

async function obtenerUltimaJornadaRegular(temporada: number) {
  const desdeBbdd = await obtenerUltimaJornadaRegularDesdeBbdd(temporada);

  const { data: config, error: configError } = await supabase
    .from('app_config_test')
    .select('ultima_comprobacion_estructura_playoffs')
    .eq('id', 1)
    .maybeSingle();

  if (configError) {
    throw new Error(
      `Error leyendo control horario de playoffs: ${configError.message}`,
    );
  }

  const ultimaComprobacion = config?.ultima_comprobacion_estructura_playoffs
    ? new Date(config.ultima_comprobacion_estructura_playoffs).getTime()
    : 0;

  const tocaComprobarEspn =
    !desdeBbdd ||
    !ultimaComprobacion ||
    Date.now() - ultimaComprobacion >= UNA_HORA_MS;

  if (!tocaComprobarEspn && desdeBbdd) return desdeBbdd;

  const estructura = await descubrirEstructuraTemporadaNFL(temporada);

  const { error: marcarError } = await supabase
    .from('app_config_test')
    .update({ ultima_comprobacion_estructura_playoffs: new Date().toISOString() })
    .eq('id', 1);

  if (marcarError) {
    console.warn(
      `No se pudo guardar la última comprobación de estructura playoffs: ${marcarError.message}`,
    );
  }

  return estructura.ultimaJornadaRegular;
}

async function asegurarJornadaAdministrativa(params: {
  temporada: number;
  jornada: number;
  semanaEspn: number;
  tipoCompeticion: string;
  partidosEsperados: number;
  nombreRonda: string;
}) {
  const {
    temporada,
    jornada,
    semanaEspn,
    tipoCompeticion,
    partidosEsperados,
    nombreRonda,
  } = params;

  // Igual que en la ruta TEST de Wild Card que funcionó:
  // la jornada administrativa nace de los partidos que YA están guardados.
  const { data: partidos, error: partidosError } = await supabase
    .from('partidos_test')
    .select('espn_event_id, fecha_partido, equipo_local, equipo_visitante')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', tipoCompeticion)
    .eq('semana_competicion', semanaEspn)
    .order('fecha_partido', { ascending: true });

  if (partidosError) {
    throw new Error(
      `Error leyendo partidos_test J${jornada}: ${partidosError.message}`,
    );
  }

  if (!partidos || partidos.length !== partidosEsperados) {
    throw new Error(
      `J${jornada} ${nombreRonda} no está preparada: existen ${partidos?.length || 0} partidos y se esperaban ${partidosEsperados}.`,
    );
  }

  const relojBase = calcularRelojAdministrativo(
    partidos.map((partido) => ({ fecha_partido: partido.fecha_partido })),
  );

  const ultimoKickoffMs = Math.max(
    ...partidos.map((partido) =>
      new Date(partido.fecha_partido).getTime(),
    ),
  );

  const relojAdministrativo = {
    ...relojBase,
    fin_jornada: new Date(
      ultimoKickoffMs + CHECKPOINT_MARGIN_HOURS * 60 * 60 * 1000,
    ).toISOString(),
  };

  const { data: existente, error: existenteError } = await supabase
    .from('jornadas_eventos_test')
    .select('jornada_test, estado')
    .eq('temporada', temporada)
    .eq('jornada_test', jornada)
    .maybeSingle();

  if (existenteError) {
    throw new Error(
      `Error comprobando jornadas_eventos_test J${jornada}: ${existenteError.message}`,
    );
  }

  if (!existente) {
    const { error: insertError } = await supabase
      .from('jornadas_eventos_test')
      .insert({
        temporada,
        jornada_test: jornada,
        fase_temporada: 'postseason',
        semana_espn: semanaEspn,
        ...relojAdministrativo,
        estado: 'pendiente',
      });

    if (insertError) {
      throw new Error(
        `Error creando jornadas_eventos_test J${jornada}: ${insertError.message}`,
      );
    }
  } else if (existente.estado === 'pendiente') {
    const { error: updateError } = await supabase
      .from('jornadas_eventos_test')
      .update({
        fase_temporada: 'postseason',
        semana_espn: semanaEspn,
        ...relojAdministrativo,
      })
      .eq('temporada', temporada)
      .eq('jornada_test', jornada)
      .eq('estado', 'pendiente');

    if (updateError) {
      throw new Error(
        `Error actualizando jornadas_eventos_test J${jornada}: ${updateError.message}`,
      );
    }
  }

  // Igual que en a6be86a: comprobación final inmediata.
  const { data: jornadaCreada, error: verificarError } = await supabase
    .from('jornadas_eventos_test')
    .select(
      'temporada, jornada_test, fase_temporada, semana_espn, inicio_jornada, cierre_pronosticos, fin_jornada, estado',
    )
    .eq('temporada', temporada)
    .eq('jornada_test', jornada)
    .maybeSingle();

  if (verificarError || !jornadaCreada) {
    throw new Error(
      `No se pudo verificar J${jornada}: ${verificarError?.message || 'sin registro'}`,
    );
  }

  return jornadaCreada;
}

export async function sincronizarPostemporada(
  temporada: number,
  semanaInicio = 1,
  semanaFin = 4,
) {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida para playoffs: ${temporada}`);
  }

  const ultimaJornadaRegular = await obtenerUltimaJornadaRegular(temporada);
  const resultados: any[] = [];

  console.log(
    `Iniciando sincronización de playoffs ${temporada}, solicitudes ${semanaInicio}-${semanaFin}...`,
  );

  for (
    let semanaSolicitada = semanaInicio;
    semanaSolicitada <= semanaFin;
    semanaSolicitada++
  ) {
    try {
      const ronda = rondaDesdeSemanaSolicitada(semanaSolicitada);
      const definicion = RONDAS_PLAYOFF[ronda];
      const localizacion = await localizarSemanaEspnDeRonda(temporada, ronda);

      if (!localizacion.encontrada || localizacion.week === null) {
        resultados.push({
          ronda,
          preparada: false,
          motivo: 'ESPN todavía no publica una ronda válida',
        });
        continue;
      }

      const eventos = [...localizacion.eventos].sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      if (eventos.length !== definicion.partidosEsperados) {
        throw new Error(
          `${definicion.nombre} incompleta: ESPN devuelve ${eventos.length} partidos y REDZONE espera ${definicion.partidosEsperados}.`,
        );
      }

      const jornada = jornadaRedzoneParaRonda(ultimaJornadaRegular, ronda);

      for (const evento of eventos) {
        const comp = evento?.competitions?.[0];
        const local = comp?.competitors?.find(
          (c: any) => c.homeAway === 'home',
        );
        const visitante = comp?.competitors?.find(
          (c: any) => c.homeAway === 'away',
        );

        if (!comp || !local?.team?.abbreviation || !visitante?.team?.abbreviation) {
          throw new Error(
            `${definicion.nombre} contiene un partido sin equipos válidos.`,
          );
        }

        const fechaPartido = new Date(evento.date).toISOString();
        const estado = comp.status?.type?.name || 'STATUS_SCHEDULED';
        const puntosLocal = parseInt(local?.score || '0', 10);
        const puntosVisitante = parseInt(visitante?.score || '0', 10);
        const periodo = Number(comp.status?.period || 0) || null;
        const reloj =
          comp.status?.displayClock || comp.status?.type?.shortDetail || null;

        let resultadoOficial: '1' | 'X' | '2' | null = null;
        if (comp.status?.type?.completed) {
          resultadoOficial =
            puntosLocal > puntosVisitante
              ? '1'
              : puntosLocal < puntosVisitante
                ? '2'
                : 'X';
        }

        const { data: partidoGuardado, error: upsertError } = await supabase
          .from('partidos_test')
          .upsert(
            {
              espn_event_id: String(evento.id),
              temporada,
              jornada,
              semana_competicion: localizacion.week,
              tipo_competicion: definicion.faseCompeticion,
              equipo_local: local.team.abbreviation,
              equipo_visitante: visitante.team.abbreviation,
              fecha_partido: fechaPartido,
              estado,
              puntos_local: puntosLocal,
              puntos_visitante: puntosVisitante,
              periodo,
              reloj,
              resultado_oficial: resultadoOficial,
            },
            { onConflict: 'espn_event_id' },
          )
          .select('id')
          .single();

        if (upsertError) {
          throw new Error(
            `Error al guardar partido ${definicion.nombre} ESPN ${evento.id}: ${upsertError.message}`,
          );
        }

        if (!partidoGuardado) continue;

        if (comp.status?.type?.completed && resultadoOficial) {
          const { error: aciertosError } = await supabase
            .from('pronosticos_test')
            .update({ acierto: true })
            .eq('partido_id', partidoGuardado.id)
            .eq('eleccion', resultadoOficial);

          if (aciertosError) {
            throw new Error(
              `Error al validar aciertos de ${definicion.nombre}: ${aciertosError.message}`,
            );
          }

          const { error: fallosError } = await supabase
            .from('pronosticos_test')
            .update({ acierto: false })
            .eq('partido_id', partidoGuardado.id)
            .neq('eleccion', resultadoOficial);

          if (fallosError) {
            throw new Error(
              `Error al validar fallos de ${definicion.nombre}: ${fallosError.message}`,
            );
          }
        } else {
          const { error: limpiarError } = await supabase
            .from('pronosticos_test')
            .update({ acierto: null })
            .eq('partido_id', partidoGuardado.id);

          if (limpiarError) {
            throw new Error(
              `Error al limpiar aciertos pendientes de ${definicion.nombre}: ${limpiarError.message}`,
            );
          }
        }
      }

      // Si los partidos existen en BBDD, la jornada administrativa debe existir.
      // No depende de que la jornada anterior esté finalizada.
      const jornadaAdministrativa = await asegurarJornadaAdministrativa({
        temporada,
        jornada,
        semanaEspn: localizacion.week,
        tipoCompeticion: definicion.faseCompeticion,
        partidosEsperados: definicion.partidosEsperados,
        nombreRonda: definicion.nombre,
      });

      resultados.push({
        ronda,
        nombre: definicion.nombre,
        preparada: true,
        jornada,
        semanaEspn: localizacion.week,
        partidos: eventos.length,
        jornadaAdministrativa,
      });

      console.log(
        `${definicion.nombre}: ${eventos.length} partidos J${jornada} y jornada administrativa preparadas.`,
      );
    } catch (error: any) {
      resultados.push({
        solicitud: semanaSolicitada,
        preparada: false,
        motivo: error?.message || String(error),
      });
      console.error(
        `Error al sincronizar playoffs solicitud ${semanaSolicitada}:`,
        error,
      );
    }
  }

  return resultados;
}
