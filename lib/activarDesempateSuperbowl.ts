import { supabaseServer as supabase } from '@/lib/supabaseServer';

const TEMPORADA = 2026;

const PARTICIPANTES = [
  '088072d0-0782-409f-b5e4-f8a558f27b4f', // Cace
  'dadb359a-8bc1-442e-8202-62fa2f8ddab9', // Juanjo
  '351a81a5-86f9-4d6d-a567-f49ed5959e57', // Iván
];

export async function activarDesempateSuperbowlSiProcede() {
  // No reiniciar un desempate que ya esté activo o resuelto.
  const { data: estadoActual, error: estadoError } = await supabase
    .from('desempate_superbowl_estado')
    .select('*')
    .eq('temporada', TEMPORADA)
    .maybeSingle();

  if (estadoError) {
    throw new Error(
      `Error al consultar estado de desempate: ${estadoError.message}`
    );
  }

  if (
    estadoActual &&
    estadoActual.estado !== 'inactivo'
  ) {
    return {
      activado: true,
      estado: estadoActual.estado,
      yaExistia: true,
    };
  }

  // Obtener todos los pronósticos ya validados antes de la Super Bowl.
  const { data: pronosticos, error: pronosticosError } = await supabase
    .from('pronosticos')
    .select(`
      user_id,
      acierto,
      partido:partidos!inner (
        tipo_competicion
      )
    `)
    .in('user_id', PARTICIPANTES)
    .in('partido.tipo_competicion', ['regular', 'playoffs'])
    .not('acierto', 'is', null);

  if (pronosticosError) {
    throw new Error(
      `Error al calcular clasificación previa a Super Bowl: ${pronosticosError.message}`
    );
  }

  const puntos: Record<string, number> = {};

  PARTICIPANTES.forEach((id) => {
    puntos[id] = 0;
  });

  for (const pronostico of pronosticos || []) {
    if (
      pronostico.acierto === true &&
      PARTICIPANTES.includes(pronostico.user_id)
    ) {
      puntos[pronostico.user_id]++;
    }
  }

  const maxPuntos = Math.max(...Object.values(puntos));

  const empatados = PARTICIPANTES.filter(
    (id) => puntos[id] === maxPuntos
  );

  // Un único líder: no hace falta desempate.
  if (empatados.length < 2) {
    await supabase
      .from('desempate_superbowl_estado')
      .upsert({
        temporada: TEMPORADA,
        estado: 'inactivo',
        ronda_actual: 1,
        participantes: [],
        finalista_1: null,
        finalista_2: null,
        ganador_eleccion: null,
        eliminado: null,
        updated_at: new Date().toISOString(),
      });

    return {
      activado: false,
      puntos,
      empatados,
    };
  }

  // Triple empate: primera tirada entre los tres.
  if (empatados.length === 3) {
    const { error: activarError } = await supabase
      .from('desempate_superbowl_estado')
      .upsert({
        temporada: TEMPORADA,
        estado: 'clasificatoria',
        ronda_actual: 1,
        participantes: empatados,
        finalista_1: null,
        finalista_2: null,
        ganador_eleccion: null,
        eliminado: null,
        updated_at: new Date().toISOString(),
      });

    if (activarError) {
      throw new Error(
        `Error al activar triple desempate: ${activarError.message}`
      );
    }

    return {
      activado: true,
      tipo: 'triple',
      puntos,
      participantes: empatados,
    };
  }

  // Doble empate: directamente a la tirada para decidir quién elige.
  const [finalista1, finalista2] = empatados;

  const { error: activarError } = await supabase
    .from('desempate_superbowl_estado')
    .upsert({
      temporada: TEMPORADA,
      estado: 'eleccion_final',
      ronda_actual: 1,
      participantes: empatados,
      finalista_1: finalista1,
      finalista_2: finalista2,
      ganador_eleccion: null,
      eliminado: null,
      updated_at: new Date().toISOString(),
    });

  if (activarError) {
    throw new Error(
      `Error al activar doble desempate: ${activarError.message}`
    );
  }

  return {
    activado: true,
    tipo: 'doble',
    puntos,
    participantes: empatados,
  };
}
