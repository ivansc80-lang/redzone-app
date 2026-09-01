import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const TEMPORADA = 2025;
const JORNADA_WILD_CARD = 19;
const WEEK_WILD_CARD = 1;
const PARTIDOS_ESPERADOS = 6;

export async function GET() {
  try {
    const url =
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` +
      `?dates=${TEMPORADA}&seasontype=3&week=${WEEK_WILD_CARD}`;

    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(
        `ESPN respondió HTTP ${res.status} al consultar Wild Card ${TEMPORADA}`,
      );
    }

    const data = await res.json();

    const eventos = Array.isArray(data?.events)
      ? [...data.events].sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        )
      : [];

    if (eventos.length !== PARTIDOS_ESPERADOS) {
      throw new Error(
        `Wild Card incompleta: ESPN devuelve ${eventos.length} partidos y se esperaban ${PARTIDOS_ESPERADOS}.`,
      );
    }

    const partidos = eventos.map((evento: any) => {
      const comp = evento?.competitions?.[0];

      if (!comp) {
        throw new Error(`Evento ESPN ${evento?.id} sin competition válida.`);
      }

      const local = comp.competitors?.find(
        (c: any) => c.homeAway === 'home',
      );

      const visitante = comp.competitors?.find(
        (c: any) => c.homeAway === 'away',
      );

      const localAbrev = local?.team?.abbreviation;
      const visitanteAbrev = visitante?.team?.abbreviation;

      if (!evento?.id || !localAbrev || !visitanteAbrev || !evento?.date) {
        throw new Error(
          `Evento ESPN ${evento?.id || 'sin id'} incompleto.`,
        );
      }

      const puntosLocal = Number.parseInt(local?.score || '0', 10);
      const puntosVisitante = Number.parseInt(visitante?.score || '0', 10);

      const completado = Boolean(comp.status?.type?.completed);

      let resultadoOficial: '1' | 'X' | '2' | null = null;

      if (completado) {
        resultadoOficial =
          puntosLocal > puntosVisitante
            ? '1'
            : puntosLocal < puntosVisitante
              ? '2'
              : 'X';
      }

      return {
        espn_event_id: String(evento.id),
        temporada: TEMPORADA,
        jornada: JORNADA_WILD_CARD,
        semana_competicion: WEEK_WILD_CARD,
        tipo_competicion: 'playoffs',
        equipo_local: localAbrev,
        equipo_visitante: visitanteAbrev,
        fecha_partido: new Date(evento.date).toISOString(),
        estado: comp.status?.type?.name || 'STATUS_SCHEDULED',
        puntos_local: puntosLocal,
        puntos_visitante: puntosVisitante,
        periodo: Number(comp.status?.period || 0) || null,
        reloj:
          comp.status?.displayClock ||
          comp.status?.type?.shortDetail ||
          null,
        resultado_oficial: resultadoOficial,
      };
    });

    const { error: upsertError } = await supabase
      .from('partidos_test')
      .upsert(partidos, {
        onConflict: 'espn_event_id',
      });

    if (upsertError) {
      throw new Error(
        `Error guardando Wild Card en partidos_test: ${upsertError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'test_wildcard_load',
      temporada: TEMPORADA,
      jornada: JORNADA_WILD_CARD,
      semanaEspn: WEEK_WILD_CARD,
      partidosCargados: partidos.length,
      partidos: partidos.map((p) => ({
        espn_event_id: p.espn_event_id,
        visitante: p.equipo_visitante,
        local: p.equipo_local,
      })),
    });
  } catch (error: any) {
    console.error('[TEST WILD CARD LOAD]', error);

    return NextResponse.json(
      {
        success: false,
        mode: 'test_wildcard_load',
        error: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
