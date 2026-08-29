import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { descubrirEstructuraTemporadaNFL } from '@/lib/nflSeasonStructure';
import {
  jornadaRedzoneParaRonda,
  localizarSemanaEspnDeRonda,
  RONDAS_PLAYOFF,
  type RondaPlayoff,
} from '@/lib/playoffStructure';

function rondaDesdeSemanaSolicitada(semana: number): RondaPlayoff {
  if (semana === 1) return 'wild_card';
  if (semana === 2) return 'divisional';
  if (semana === 3) return 'conference';
  return 'super_bowl';
}

export async function sincronizarPostemporada(
  temporada: number,
  semanaInicio = 1,
  semanaFin = 4
) {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida para playoffs: ${temporada}`);
  }

  const estructura = await descubrirEstructuraTemporadaNFL(temporada);

  console.log(
    `Iniciando sincronización de playoffs ${temporada}, solicitudes ${semanaInicio}-${semanaFin}...`
  );

  for (let semanaSolicitada = semanaInicio; semanaSolicitada <= semanaFin; semanaSolicitada++) {
    try {
      const ronda = rondaDesdeSemanaSolicitada(semanaSolicitada);
      const definicion = RONDAS_PLAYOFF[ronda];
      const localizacion = await localizarSemanaEspnDeRonda(temporada, ronda);

      if (!localizacion.encontrada || localizacion.week === null) {
        console.log(
          `${definicion.nombre}: ESPN todavía no publica una ronda válida para ${temporada}.`
        );
        continue;
      }

      const eventos = [...localizacion.eventos].sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (eventos.length !== definicion.partidosEsperados) {
        throw new Error(
          `${definicion.nombre} incompleta: ESPN devuelve ${eventos.length} partidos y REDZONE espera ${definicion.partidosEsperados}.`
        );
      }

      const ids = new Set<string>();

      for (const evento of eventos) {
        const comp = evento?.competitions?.[0];
        const local = comp?.competitors?.find(
          (c: any) => c.homeAway === 'home'
        );
        const visitante = comp?.competitors?.find(
          (c: any) => c.homeAway === 'away'
        );

        const id = String(evento?.id || '');
        const localAbrev = String(local?.team?.abbreviation || '');
        const visitAbrev = String(visitante?.team?.abbreviation || '');
        const fecha = new Date(evento?.date);

        if (
          !comp ||
          !id ||
          !localAbrev ||
          !visitAbrev ||
          Number.isNaN(fecha.getTime())
        ) {
          throw new Error(
            `${definicion.nombre} contiene un partido sin id, equipos o fecha/hora válidos.`
          );
        }

        if (localAbrev === visitAbrev) {
          throw new Error(
            `${definicion.nombre}: ESPN devuelve el mismo equipo como local y visitante en ${id}.`
          );
        }

        if (ids.has(id)) {
          throw new Error(
            `${definicion.nombre}: espn_event_id duplicado ${id}.`
          );
        }

        ids.add(id);
      }

      const jornada = jornadaRedzoneParaRonda(
        estructura.ultimaJornadaRegular,
        ronda,
      );

      for (const evento of eventos) {
        const comp = evento.competitions[0];
        const local = comp.competitors.find(
          (c: any) => c.homeAway === 'home'
        );
        const visitante = comp.competitors.find(
          (c: any) => c.homeAway === 'away'
        );

        const localAbrev = local.team.abbreviation;
        const visitAbrev = visitante.team.abbreviation;
        const fechaPartido = new Date(evento.date).toISOString();
        const estado = comp.status?.type?.name || 'STATUS_SCHEDULED';
        const puntosLocal = parseInt(local?.score || '0', 10);
        const puntosVisitante = parseInt(visitante?.score || '0', 10);
        const periodo = Number(comp.status?.period || 0) || null;
        const reloj =
          comp.status?.displayClock ||
          comp.status?.type?.shortDetail ||
          null;

        let resultadoOficial: '1' | 'X' | '2' | null = null;

        if (comp.status?.type?.completed) {
          resultadoOficial =
            puntosLocal > puntosVisitante
              ? '1'
              : puntosLocal < puntosVisitante
                ? '2'
                : 'X';
        }

        const { data: partidoGuardado, error: upsertError } =
          await supabase
            .from('partidos')
            .upsert(
              {
                espn_event_id: String(evento.id),
                temporada,
                jornada,
                semana_competicion: localizacion.week,
                tipo_competicion: definicion.faseCompeticion,
                equipo_local: localAbrev,
                equipo_visitante: visitAbrev,
                fecha_partido: fechaPartido,
                estado,
                puntos_local: puntosLocal,
                puntos_visitante: puntosVisitante,
                periodo,
                reloj,
                resultado_oficial: resultadoOficial,
              },
              { onConflict: 'espn_event_id' }
            )
            .select('id')
            .single();

        if (upsertError) {
          throw new Error(
            `Error al guardar partido ${definicion.nombre} ESPN ${evento.id}: ${upsertError.message}`
          );
        }

        if (!partidoGuardado) continue;

        if (comp.status?.type?.completed && resultadoOficial) {
          const { error: aciertosError } = await supabase
            .from('pronosticos')
            .update({ acierto: true })
            .eq('partido_id', partidoGuardado.id)
            .eq('eleccion', resultadoOficial);

          if (aciertosError) {
            throw new Error(
              `Error al validar aciertos de ${definicion.nombre}: ${aciertosError.message}`
            );
          }

          const { error: fallosError } = await supabase
            .from('pronosticos')
            .update({ acierto: false })
            .eq('partido_id', partidoGuardado.id)
            .neq('eleccion', resultadoOficial);

          if (fallosError) {
            throw new Error(
              `Error al validar fallos de ${definicion.nombre}: ${fallosError.message}`
            );
          }
        } else {
          const { error: limpiarError } = await supabase
            .from('pronosticos')
            .update({ acierto: null })
            .eq('partido_id', partidoGuardado.id);

          if (limpiarError) {
            throw new Error(
              `Error al limpiar aciertos pendientes de ${definicion.nombre}: ${limpiarError.message}`
            );
          }
        }
      }

      const { data: verificados, error: verificarError } = await supabase
        .from('partidos')
        .select('espn_event_id')
        .eq('temporada', temporada)
        .eq('jornada', jornada)
        .eq('tipo_competicion', definicion.faseCompeticion);

      if (verificarError) {
        throw new Error(
          `Error verificando ${definicion.nombre}: ${verificarError.message}`
        );
      }

      const idsVerificados = new Set<string>(
        (verificados || []).map((p: any) => String(p.espn_event_id))
      );

      if (
        verificados?.length !== definicion.partidosEsperados ||
        eventos.some((evento: any) => !idsVerificados.has(String(evento.id)))
      ) {
        throw new Error(
          `${definicion.nombre} no quedó completamente verificada en BBDD.`
        );
      }

      console.log(
        `${definicion.nombre} sincronizada: REDZONE J${jornada}, ESPN Week ${localizacion.week}, ${eventos.length}/${definicion.partidosEsperados} partidos.`
      );
    } catch (error) {
      console.error(
        `Error al sincronizar playoffs solicitud ${semanaSolicitada}:`,
        error
      );
    }
  }
}
