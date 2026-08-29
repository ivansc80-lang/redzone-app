import { supabaseServer as supabase } from '@/lib/supabaseServer';

type FasePostemporada = 'playoffs' | 'superbowl';

export async function sincronizarPostemporada(
  temporada: number,
  semanaInicio = 1,
  semanaFin = 4
) {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida para playoffs: ${temporada}`);
  }

  console.log(
    `Iniciando sincronización de playoffs ${temporada}, semanas ${semanaInicio}-${semanaFin}...`
  );

  for (let semana = semanaInicio; semana <= semanaFin; semana++) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporada}&seasontype=3&week=${semana}`,
        { cache: 'no-store' }
      );

      if (!res.ok) {
        throw new Error(`ESPN respondió con HTTP ${res.status}`);
      }

      const data = await res.json();
      const eventos = data.events || [];

      if (eventos.length === 0) {
        continue;
      }

      eventos.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // La identificación definitiva de las rondas y de la Super Bowl
      // se completará en FASE 2. Aquí solo conservamos la lógica actual.
      const tipoCompeticion: FasePostemporada =
        semana === 4 ? 'superbowl' : 'playoffs';

      for (const evento of eventos) {
        const comp = evento.competitions?.[0];
        if (!comp) continue;

        const local = comp.competitors?.find(
          (c: any) => c.homeAway === 'home'
        );

        const visitante = comp.competitors?.find(
          (c: any) => c.homeAway === 'away'
        );

        const localAbrev = local?.team?.abbreviation || '';
        const visitAbrev = visitante?.team?.abbreviation || '';

        if (!localAbrev || !visitAbrev) {
          continue;
        }

        const fechaPartido = new Date(evento.date).toISOString();
        const estado =
          comp.status?.type?.name || 'STATUS_SCHEDULED';

        const puntosLocal = parseInt(local?.score || '0', 10);
        const puntosVisitante = parseInt(visitante?.score || '0', 10);

        const periodo =
          Number(comp.status?.period || 0) || null;

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
                espn_event_id: evento.id,
                temporada,
                jornada: 18 + semana,
                semana_competicion: semana,
                tipo_competicion: tipoCompeticion,
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
            `Error al guardar partido de playoffs ESPN ${evento.id}: ${upsertError.message}`
          );
        }

        if (!partidoGuardado) {
          continue;
        }

        if (
          comp.status?.type?.completed &&
          resultadoOficial
        ) {
          const { error: aciertosError } = await supabase
            .from('pronosticos')
            .update({ acierto: true })
            .eq('partido_id', partidoGuardado.id)
            .eq('eleccion', resultadoOficial);

          if (aciertosError) {
            throw new Error(
              `Error al validar aciertos de playoffs: ${aciertosError.message}`
            );
          }

          const { error: fallosError } = await supabase
            .from('pronosticos')
            .update({ acierto: false })
            .eq('partido_id', partidoGuardado.id)
            .neq('eleccion', resultadoOficial);

          if (fallosError) {
            throw new Error(
              `Error al validar fallos de playoffs: ${fallosError.message}`
            );
          }
        } else {
          const { error: limpiarError } = await supabase
            .from('pronosticos')
            .update({ acierto: null })
            .eq('partido_id', partidoGuardado.id);

          if (limpiarError) {
            throw new Error(
              `Error al limpiar aciertos pendientes de playoffs: ${limpiarError.message}`
            );
          }
        }
      }

      console.log(
        `Playoffs semana ${semana} sincronizada correctamente para temporada ${temporada}.`
      );
    } catch (error) {
      console.error(
        `Error al sincronizar playoffs semana ${semana}:`,
        error
      );
    }
  }
}