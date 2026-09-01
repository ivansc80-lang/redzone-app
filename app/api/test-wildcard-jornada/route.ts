import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { calcularRelojAdministrativo } from '@/lib/nflAdministrativeClock';

export const dynamic = 'force-dynamic';

const TEMPORADA = 2025;
const JORNADA_WILD_CARD = 19;
const WEEK_WILD_CARD = 1;
const PARTIDOS_ESPERADOS = 6;

export async function GET() {
  try {
    const { data: partidos, error: partidosError } = await supabase
      .from('partidos_test')
      .select('espn_event_id, fecha_partido, equipo_local, equipo_visitante')
      .eq('temporada', TEMPORADA)
      .eq('jornada', JORNADA_WILD_CARD)
      .eq('tipo_competicion', 'playoffs')
      .eq('semana_competicion', WEEK_WILD_CARD)
      .order('fecha_partido', { ascending: true });

    if (partidosError) {
      throw new Error(
        `Error leyendo partidos_test J${JORNADA_WILD_CARD}: ${partidosError.message}`,
      );
    }

    if (!partidos || partidos.length !== PARTIDOS_ESPERADOS) {
      throw new Error(
        `J${JORNADA_WILD_CARD} no está preparada: existen ${partidos?.length || 0} partidos y se esperaban ${PARTIDOS_ESPERADOS}.`,
      );
    }

    for (const partido of partidos) {
      if (
        !partido.espn_event_id ||
        !partido.fecha_partido ||
        !partido.equipo_local ||
        !partido.equipo_visitante
      ) {
        throw new Error(
          `J${JORNADA_WILD_CARD} contiene un partido sin id, fecha o equipos válidos.`,
        );
      }
    }

    const relojAdministrativo = calcularRelojAdministrativo(
      partidos.map((partido) => ({
        fecha_partido: partido.fecha_partido,
      })),
    );

    const { data: existente, error: existenteError } = await supabase
      .from('jornadas_eventos_test')
      .select('jornada_test, estado')
      .eq('temporada', TEMPORADA)
      .eq('jornada_test', JORNADA_WILD_CARD)
      .maybeSingle();

    if (existenteError) {
      throw new Error(
        `Error comprobando jornadas_eventos_test J${JORNADA_WILD_CARD}: ${existenteError.message}`,
      );
    }

    if (!existente) {
      const { error: insertError } = await supabase
        .from('jornadas_eventos_test')
        .insert({
          temporada: TEMPORADA,
          jornada_test: JORNADA_WILD_CARD,
          semana_espn: WEEK_WILD_CARD,
          ...relojAdministrativo,
          estado: 'pendiente',
        });

      if (insertError) {
        throw new Error(
          `Error creando jornadas_eventos_test J${JORNADA_WILD_CARD}: ${insertError.message}`,
        );
      }
    } else {
      const { error: updateError } = await supabase
        .from('jornadas_eventos_test')
        .update({
          semana_espn: WEEK_WILD_CARD,
          ...relojAdministrativo,
        })
        .eq('temporada', TEMPORADA)
        .eq('jornada_test', JORNADA_WILD_CARD)
        .eq('estado', 'pendiente');

      if (updateError) {
        throw new Error(
          `Error actualizando jornadas_eventos_test J${JORNADA_WILD_CARD}: ${updateError.message}`,
        );
      }
    }

    const { data: jornada, error: verificarError } = await supabase
      .from('jornadas_eventos_test')
      .select(
        'temporada, jornada_test, semana_espn, inicio_jornada, cierre_pronosticos, fin_jornada, estado',
      )
      .eq('temporada', TEMPORADA)
      .eq('jornada_test', JORNADA_WILD_CARD)
      .maybeSingle();

    if (verificarError || !jornada) {
      throw new Error(
        `No se pudo verificar J${JORNADA_WILD_CARD}: ${verificarError?.message || 'sin registro'}`,
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'test_wildcard_jornada',
      partidosValidados: partidos.length,
      jornada,
      appConfigModificado: false,
      transicionActivada: false,
    });
  } catch (error: any) {
    console.error('[TEST WILD CARD JORNADA]', error);

    return NextResponse.json(
      {
        success: false,
        mode: 'test_wildcard_jornada',
        error: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
