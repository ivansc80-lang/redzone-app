import { supabaseServer as supabase } from '@/lib/supabaseServer';

type PartidoNuevo = {
  espn_event_id: string;
  temporada: number;
  jornada: number;
  semana_competicion: number;
  tipo_competicion: 'regular';
  equipo_local: string;
  equipo_visitante: string;
  fecha_partido: string;
  estado: string;
  puntos_local: number;
  puntos_visitante: number;
  periodo: number | null;
  reloj: string | null;
  resultado_oficial: null;
};

const TOTAL_EQUIPOS_NFL = 32;
const MIN_PARTIDOS_POR_EQUIPO = 17;
const MIN_JORNADAS_REGULAR = 18;
const MAX_JORNADAS_EXPLORACION = 24;
const SEMANAS_VACIAS_PARA_CERRAR = 2;

function fechaValida(valor: unknown) {
  if (typeof valor !== 'string' || !valor) return false;
  return !Number.isNaN(new Date(valor).getTime());
}

export async function prepararNuevaTemporadaDesdeEspn(
  temporadaObjetivo: number,
  faseActual: 'draft' | 'pretemporada'
) {
  if (!Number.isInteger(temporadaObjetivo) || temporadaObjetivo < 2000) {
    throw new Error(`Temporada objetivo inválida: ${temporadaObjetivo}`);
  }

  const partidos: PartidoNuevo[] = [];
  const jornadas = new Map<number, PartidoNuevo[]>();
  const ids = new Set<string>();
  const partidosPorEquipo = new Map<string, number>();

  let semanasVaciasConsecutivas = 0;
  let ultimaJornadaConPartidos = 0;

  // No asumimos que la NFL vaya a mantener para siempre 18 jornadas / 17 partidos.
  // Exploramos la temporada regular de ESPN hasta encontrar dos weeks vacías
  // consecutivas después de haber localizado al menos la estructura mínima actual.
  for (let jornada = 1; jornada <= MAX_JORNADAS_EXPLORACION; jornada++) {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporadaObjetivo}&seasontype=2&week=${jornada}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      return {
        validado: false,
        activado: false,
        temporadaObjetivo,
        motivo: `ESPN HTTP ${res.status} en jornada ${jornada}`,
      };
    }

    const data = await res.json();
    const eventos = Array.isArray(data?.events) ? data.events : [];

    if (eventos.length === 0) {
      semanasVaciasConsecutivas += 1;

      if (
        ultimaJornadaConPartidos >= MIN_JORNADAS_REGULAR &&
        semanasVaciasConsecutivas >= SEMANAS_VACIAS_PARA_CERRAR
      ) {
        break;
      }

      // Antes de completar el mínimo actual, una week vacía significa que
      // ESPN todavía no tiene publicado un calendario regular completo.
      if (ultimaJornadaConPartidos < MIN_JORNADAS_REGULAR) {
        return {
          validado: false,
          activado: false,
          temporadaObjetivo,
          motivo: `ESPN todavía no devuelve un calendario completo; week ${jornada} está vacía`,
        };
      }

      continue;
    }

    if (semanasVaciasConsecutivas > 0) {
      return {
        validado: false,
        activado: false,
        temporadaObjetivo,
        motivo: `Calendario ESPN discontinuo: aparecen partidos después de una week vacía antes de cerrar la TR`,
      };
    }

    ultimaJornadaConPartidos = jornada;
    const partidosJornada: PartidoNuevo[] = [];

    for (const evento of eventos) {
      const comp = evento?.competitions?.[0];
      const local = comp?.competitors?.find((c: any) => c.homeAway === 'home');
      const visitante = comp?.competitors?.find((c: any) => c.homeAway === 'away');

      const id = String(evento?.id || '');
      const localAbrev = String(local?.team?.abbreviation || '');
      const visitanteAbrev = String(visitante?.team?.abbreviation || '');

      if (!id || !localAbrev || !visitanteAbrev || !fechaValida(evento?.date)) {
        return {
          validado: false,
          activado: false,
          temporadaObjetivo,
          motivo: `Jornada ${jornada} contiene un partido sin id, equipos o fecha/hora válidos`,
        };
      }

      if (localAbrev === visitanteAbrev) {
        return {
          validado: false,
          activado: false,
          temporadaObjetivo,
          motivo: `ESPN devuelve el mismo equipo como local y visitante en ${id}`,
        };
      }

      if (ids.has(id)) {
        return {
          validado: false,
          activado: false,
          temporadaObjetivo,
          motivo: `espn_event_id duplicado en el calendario: ${id}`,
        };
      }

      ids.add(id);
      partidosPorEquipo.set(localAbrev, (partidosPorEquipo.get(localAbrev) || 0) + 1);
      partidosPorEquipo.set(visitanteAbrev, (partidosPorEquipo.get(visitanteAbrev) || 0) + 1);

      const partido: PartidoNuevo = {
        espn_event_id: id,
        temporada: temporadaObjetivo,
        jornada,
        semana_competicion: jornada,
        tipo_competicion: 'regular',
        equipo_local: localAbrev,
        equipo_visitante: visitanteAbrev,
        fecha_partido: new Date(evento.date).toISOString(),
        estado: comp?.status?.type?.name || 'STATUS_SCHEDULED',
        puntos_local: 0,
        puntos_visitante: 0,
        periodo: null,
        reloj: null,
        resultado_oficial: null,
      };

      partidos.push(partido);
      partidosJornada.push(partido);
    }

    partidosJornada.sort(
      (a, b) => new Date(a.fecha_partido).getTime() - new Date(b.fecha_partido).getTime()
    );
    jornadas.set(jornada, partidosJornada);
  }

  const totalJornadas = jornadas.size;

  if (totalJornadas < MIN_JORNADAS_REGULAR) {
    return {
      validado: false,
      activado: false,
      temporadaObjetivo,
      motivo: `Calendario incompleto: ESPN solo devuelve ${totalJornadas} jornadas regulares`,
    };
  }

  if (partidosPorEquipo.size !== TOTAL_EQUIPOS_NFL) {
    return {
      validado: false,
      activado: false,
      temporadaObjetivo,
      motivo: `Número de equipos incorrecto: ESPN=${partidosPorEquipo.size}, esperado=${TOTAL_EQUIPOS_NFL}`,
    };
  }

  const cantidadesPorEquipo = [...partidosPorEquipo.values()];
  const partidosPorEquipoEsperados = cantidadesPorEquipo[0] || 0;

  if (partidosPorEquipoEsperados < MIN_PARTIDOS_POR_EQUIPO) {
    return {
      validado: false,
      activado: false,
      temporadaObjetivo,
      motivo: `Calendario incompleto: cada equipo aparece con menos de ${MIN_PARTIDOS_POR_EQUIPO} partidos`,
    };
  }

  const equiposConCalendarioIncorrecto = [...partidosPorEquipo.entries()].filter(
    ([, total]) => total !== partidosPorEquipoEsperados
  );

  if (equiposConCalendarioIncorrecto.length > 0) {
    return {
      validado: false,
      activado: false,
      temporadaObjetivo,
      motivo: `Los 32 equipos no tienen el mismo número de partidos de temporada regular`,
      partidosPorEquipoEsperados,
      equiposConCalendarioIncorrecto,
    };
  }

  const totalPartidosEsperados =
    (TOTAL_EQUIPOS_NFL * partidosPorEquipoEsperados) / 2;

  if (!Number.isInteger(totalPartidosEsperados) || partidos.length !== totalPartidosEsperados) {
    return {
      validado: false,
      activado: false,
      temporadaObjetivo,
      motivo: `Número total de partidos incoherente: ESPN=${partidos.length}, calculado=${totalPartidosEsperados}`,
    };
  }

  const jornadasEventos = [...jornadas.entries()].map(([jornada, lista]) => {
    const primerPartido = new Date(lista[0].fecha_partido);
    const ultimoPartido = new Date(lista[lista.length - 1].fecha_partido);
    const cierre = new Date(primerPartido.getTime() - 30 * 60 * 1000);
    const fin = new Date(ultimoPartido.getTime() + 8 * 60 * 60 * 1000);

    return {
      temporada: temporadaObjetivo,
      jornada,
      inicio_jornada: primerPartido.toISOString(),
      cierre_pronosticos: cierre.toISOString(),
      fin_jornada: fin.toISOString(),
      estado: 'pendiente',
      tnf: null,
      friday_games: null,
      saturday_games: null,
      early_games: null,
      late_games: null,
      snf: null,
      mnf: null,
      tnf_validado: null,
      friday_games_validado: null,
      saturday_games_validado: null,
      early_games_validado: null,
      late_games_validado: null,
      snf_validado: null,
      mnf_validado: null,
    };
  });

  // Guardamos primero la temporada objetivo. Mientras app_config.temporada
  // siga apuntando a la anterior, estos datos todavía no son visibles en GAMES.
  const { error: partidosError } = await supabase
    .from('partidos')
    .upsert(partidos, { onConflict: 'espn_event_id' });

  if (partidosError) {
    throw new Error(`Error guardando calendario ${temporadaObjetivo}: ${partidosError.message}`);
  }

  const { error: jornadasError } = await supabase
    .from('jornadas_eventos')
    .upsert(jornadasEventos, { onConflict: 'temporada,jornada' });

  if (jornadasError) {
    throw new Error(`Error guardando jornadas ${temporadaObjetivo}: ${jornadasError.message}`);
  }

  const { data: verificacionPartidos, error: verificarPartidosError } = await supabase
    .from('partidos')
    .select('id, jornada, espn_event_id')
    .eq('temporada', temporadaObjetivo)
    .eq('tipo_competicion', 'regular');

  if (verificarPartidosError) {
    throw new Error(`Error verificando partidos ${temporadaObjetivo}: ${verificarPartidosError.message}`);
  }

  const { data: verificacionJornadas, error: verificarJornadasError } = await supabase
    .from('jornadas_eventos')
    .select('jornada')
    .eq('temporada', temporadaObjetivo);

  if (verificarJornadasError) {
    throw new Error(`Error verificando jornadas ${temporadaObjetivo}: ${verificarJornadasError.message}`);
  }

  if (
    verificacionPartidos?.length !== totalPartidosEsperados ||
    verificacionJornadas?.length !== totalJornadas
  ) {
    return {
      validado: false,
      activado: false,
      temporadaObjetivo,
      motivo: `Escritura incompleta en BBDD: partidos=${verificacionPartidos?.length || 0}/${totalPartidosEsperados}, jornadas=${verificacionJornadas?.length || 0}/${totalJornadas}`,
    };
  }

  const idsBbdd = new Set((verificacionPartidos || []).map((p: any) => String(p.espn_event_id)));
  const faltanIds = partidos.some((p) => !idsBbdd.has(p.espn_event_id));

  if (faltanIds) {
    return {
      validado: false,
      activado: false,
      temporadaObjetivo,
      motivo: 'La verificación final detectó espn_event_id ausentes en BBDD',
    };
  }

  // El cambio visible es el último paso. Si algo falla antes, GAMES mantiene
  // la temporada anterior y la siguiente ejecución del cron puede reintentar.
  const { error: activarError } = await supabase
    .from('app_config')
    .update({
      temporada: temporadaObjetivo,
      temporada_objetivo: null,
      jornada_actual: 1,
      semana_postemporada: null,
      fase_competicion: faseActual,
    })
    .eq('id', 1);

  if (activarError) {
    throw new Error(
      `Calendario ${temporadaObjetivo} validado, pero no pudo activarse: ${activarError.message}`
    );
  }

  return {
    validado: true,
    activado: true,
    temporadaObjetivo,
    jornadas: totalJornadas,
    partidos: totalPartidosEsperados,
    equipos: TOTAL_EQUIPOS_NFL,
    partidosPorEquipo: partidosPorEquipoEsperados,
  };
}
