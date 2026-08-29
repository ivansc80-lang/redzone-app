import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { sincronizarPostemporada } from '@/lib/syncPostseason';

export async function intentarTransicionRegularAWildCard(
  temporada: number,
  jornadaRegular: number,
) {
  const resultados = await sincronizarPostemporada(temporada, 1, 1);
  const wildCard = resultados.find(
    (resultado: any) => resultado?.ronda === 'wild_card',
  );

  if (!wildCard?.preparada) {
    return {
      transicion: false,
      motivo:
        wildCard?.motivo ||
        'Wild Card todavía no está completamente publicada y validada en ESPN.',
    };
  }

  const jornadaWildCard = Number(wildCard.jornada);

  const { data: jornadaPreparada, error: jornadaPreparadaError } = await supabase
    .from('jornadas_eventos')
    .select('jornada, estado, inicio_jornada, cierre_pronosticos')
    .eq('temporada', temporada)
    .eq('jornada', jornadaWildCard)
    .maybeSingle();

  if (jornadaPreparadaError) {
    throw new Error(
      `Error verificando Wild Card preparada: ${jornadaPreparadaError.message}`,
    );
  }

  if (
    !jornadaPreparada ||
    jornadaPreparada.estado !== 'pendiente' ||
    !jornadaPreparada.inicio_jornada ||
    !jornadaPreparada.cierre_pronosticos
  ) {
    return {
      transicion: false,
      motivo: 'Wild Card no está administrativamente preparada para activarse.',
    };
  }

  const { data: partidosWildCard, error: partidosWildCardError } = await supabase
    .from('partidos')
    .select('id, espn_event_id, equipo_local, equipo_visitante, fecha_partido')
    .eq('temporada', temporada)
    .eq('jornada', jornadaWildCard)
    .eq('tipo_competicion', 'playoffs');

  if (partidosWildCardError) {
    throw new Error(
      `Error verificando partidos Wild Card: ${partidosWildCardError.message}`,
    );
  }

  if (
    partidosWildCard?.length !== 6 ||
    partidosWildCard.some(
      (p: any) =>
        !p.espn_event_id ||
        !p.equipo_local ||
        !p.equipo_visitante ||
        !p.fecha_partido,
    )
  ) {
    return {
      transicion: false,
      motivo: 'Wild Card no contiene exactamente 6 partidos completos y válidos.',
    };
  }

  const ahoraIso = new Date().toISOString();

  const { error: finalizarRegularError } = await supabase
    .from('jornadas_eventos')
    .update({ estado: 'finalizada', fin_jornada: ahoraIso })
    .eq('temporada', temporada)
    .eq('jornada', jornadaRegular)
    .neq('estado', 'finalizada');

  if (finalizarRegularError) {
    throw new Error(
      `Error finalizando J${jornadaRegular}: ${finalizarRegularError.message}`,
    );
  }

  const { data: configActualizada, error: activarError } = await supabase
    .from('app_config')
    .update({
      fase_competicion: 'playoffs',
      semana_postemporada: 1,
      jornada_actual: jornadaWildCard,
    })
    .eq('id', 1)
    .eq('temporada', temporada)
    .eq('jornada_actual', jornadaRegular)
    .select('id')
    .maybeSingle();

  if (activarError || !configActualizada) {
    // Compensación: si el último paso falla, restauramos la jornada regular
    // para evitar dejar REDZONE con una jornada finalizada y contexto antiguo.
    await supabase
      .from('jornadas_eventos')
      .update({ estado: 'cerrada', fin_jornada: null })
      .eq('temporada', temporada)
      .eq('jornada', jornadaRegular)
      .eq('estado', 'finalizada');

    throw new Error(
      `Wild Card preparada pero app_config no pudo activarse: ${activarError?.message || 'contexto no coincidente'}`,
    );
  }

  return {
    transicion: true,
    jornadaAnterior: jornadaRegular,
    jornadaNueva: jornadaWildCard,
    faseCompeticion: 'playoffs' as const,
    semanaPostemporada: 1,
  };
}
