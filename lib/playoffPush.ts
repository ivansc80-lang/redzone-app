import { enviarPushRedzone, PUSH_EVENTOS } from '@/lib/pushNotifications';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

const PARTICIPANTES_REDZONE = [
  { id: '088072d0-0782-409f-b5e4-f8a558f27b4f', nombre: 'CACE' },
  { id: 'dadb359a-8bc1-442e-8202-62fa2f8ddab9', nombre: 'JUANJO' },
  { id: '351a81a5-86f9-4d6d-a567-f49ed5959e57', nombre: 'IVÁN' },
] as const;

export async function pushResultadosAperturaPlayoffSiProcede({
  temporada,
  jornadaFinalizada,
  jornadaNueva,
}: {
  temporada: number;
  jornadaFinalizada: number;
  jornadaNueva: number;
}) {
  const ids = PARTICIPANTES_REDZONE.map((p) => p.id);

  const { data: pronosticos, error: pronosticosError } = await supabase
    .from('pronosticos')
    .select(`
      user_id,
      acierto,
      partido:partidos!inner (
        jornada,
        temporada,
        tipo_competicion
      )
    `)
    .in('user_id', ids)
    .eq('partido.temporada', temporada)
    .eq('partido.jornada', jornadaFinalizada)
    .in('partido.tipo_competicion', ['playoffs', 'superbowl'])
    .not('acierto', 'is', null);

  if (pronosticosError) {
    throw new Error(
      `Error calculando resultados de playoffs J${jornadaFinalizada}: ${pronosticosError.message}`,
    );
  }

  const aciertos: Record<string, number> = {};
  for (const participante of PARTICIPANTES_REDZONE) aciertos[participante.id] = 0;

  for (const pronostico of pronosticos || []) {
    if (pronostico.acierto === true && aciertos[pronostico.user_id] !== undefined) {
      aciertos[pronostico.user_id] += 1;
    }
  }

  const marcador = PARTICIPANTES_REDZONE
    .map((participante) => `${participante.nombre} ${aciertos[participante.id]}`)
    .join(' · ');

  const resultado = await enviarPushRedzone({
    claveEvento: `resultados_apertura_${temporada}_j${jornadaFinalizada}_j${jornadaNueva}`,
    tipoEvento: PUSH_EVENTOS.RESULTADOS_APERTURA,
    temporada,
    jornada: jornadaNueva,
    titulo: `🏁 RESULTADOS J${jornadaFinalizada} · PORRA J${jornadaNueva} ABIERTA`,
    mensaje: `${marcador} · Ya puedes hacer tus pronósticos de la Jornada ${jornadaNueva}.`,
    url: '/',
    metadata: {
      evento: 'resultados_apertura',
      tipo_competicion: 'playoffs',
      jornada_finalizada: jornadaFinalizada,
      jornada_nueva: jornadaNueva,
      resultados: PARTICIPANTES_REDZONE.map((participante) => ({
        user_id: participante.id,
        nombre: participante.nombre,
        aciertos: aciertos[participante.id],
      })),
    },
  });

  return {
    ...resultado,
    marcador,
    motivo: resultado.duplicado
      ? `El PUSH J${jornadaFinalizada} → J${jornadaNueva} ya fue enviado`
      : resultado.enviado
        ? `Resultados J${jornadaFinalizada} y apertura J${jornadaNueva} enviados`
        : 'No existen suscripciones PUSH activas',
  };
}

/**
 * PUSH final de temporada 100% ANTI-SPOILER.
 *
 * REGLA PERMANENTE:
 * Nunca incluir en título, mensaje ni metadata visible del PUSH:
 * - resultado o marcador NFL de la Super Bowl;
 * - ganador/perdedor o nombres de equipos;
 * - elecciones de los participantes;
 * - aciertos/fallos de la Super Bowl;
 * - campeón/clasificación final de REDZONE.
 *
 * El usuario debe entrar voluntariamente en REDZONE para consultar esos datos.
 */
export async function pushSuperBowlFinTemporadaSiProcede({
  temporada,
  jornadaSuperBowl,
}: {
  temporada: number;
  jornadaSuperBowl: number;
}) {
  const resultado = await enviarPushRedzone({
    claveEvento: `superbowl_fin_temporada_${temporada}`,
    tipoEvento: PUSH_EVENTOS.SUPERBOWL_FIN_TEMPORADA,
    temporada,
    jornada: jornadaSuperBowl,
    titulo: '🏆 SUPER BOWL · FIN DE TEMPORADA',
    mensaje:
      'La temporada de REDZONE ha terminado. Entra para consultar los resultados y la clasificación final.',
    url: '/',
    metadata: {
      evento: 'superbowl_fin_temporada',
      tipo_competicion: 'superbowl',
      anti_spoiler: true,
    },
  });

  return {
    ...resultado,
    motivo: resultado.duplicado
      ? `El PUSH de fin de temporada ${temporada} ya fue enviado`
      : resultado.enviado
        ? `PUSH anti-spoiler de fin de temporada ${temporada} enviado`
        : 'No existen suscripciones PUSH activas',
  };
}

export async function pushRecordatorioPlayoffSiProcede({
  temporada,
  jornada,
  cierrePronosticos,
  tipoCompeticion,
}: {
  temporada: number;
  jornada: number;
  cierrePronosticos: string;
  tipoCompeticion: 'playoffs' | 'superbowl';
}) {
  const ahora = new Date();
  const cierre = new Date(cierrePronosticos);

  if (Number.isNaN(cierre.getTime())) {
    return { evaluado: false, motivo: 'Fecha de cierre no válida', resultados: [] };
  }

  const inicioVentana = new Date(cierre.getTime() - 6 * 60 * 60 * 1000);
  if (ahora < inicioVentana) {
    return { evaluado: false, motivo: 'Todavía no estamos en la ventana de 6 horas', resultados: [] };
  }
  if (ahora >= cierre) {
    return { evaluado: false, motivo: 'La porra ya está cerrada', resultados: [] };
  }

  const { data: partidos, error: partidosError } = await supabase
    .from('partidos')
    .select('id')
    .eq('temporada', temporada)
    .eq('jornada', jornada)
    .eq('tipo_competicion', tipoCompeticion);

  if (partidosError) {
    throw new Error(
      `Error leyendo partidos para RECORDATORIO playoffs J${jornada}: ${partidosError.message}`,
    );
  }

  const idsPartidos = (partidos || []).map((p: any) => p.id);
  if (idsPartidos.length === 0) {
    return { evaluado: false, motivo: 'No hay partidos en la jornada', resultados: [] };
  }

  const { data: pronosticos, error: pronosticosError } = await supabase
    .from('pronosticos')
    .select('user_id, partido_id, eleccion')
    .in('user_id', PARTICIPANTES_REDZONE.map((p) => p.id))
    .in('partido_id', idsPartidos);

  if (pronosticosError) {
    throw new Error(
      `Error leyendo pronósticos para RECORDATORIO playoffs J${jornada}: ${pronosticosError.message}`,
    );
  }

  const resultados: any[] = [];

  for (const participante of PARTICIPANTES_REDZONE) {
    const completados = (pronosticos || []).filter(
      (p: any) => p.user_id === participante.id && p.eleccion !== null,
    ).length;

    if (completados >= idsPartidos.length) {
      resultados.push({
        nombre: participante.nombre,
        enviado: false,
        completos: true,
        completados,
        total: idsPartidos.length,
        motivo: 'Pronósticos completos',
      });
      continue;
    }

    const faltan = idsPartidos.length - completados;
    const resultado = await enviarPushRedzone({
      claveEvento: `recordatorio_pronosticos_${temporada}_j${jornada}_${participante.id}`,
      tipoEvento: PUSH_EVENTOS.RECORDATORIO_PRONOSTICOS,
      temporada,
      jornada,
      userId: participante.id,
      titulo: '⏰ ¡Que se te acaba el tiempo!',
      mensaje: `Te faltan pronósticos de la Jornada ${jornada}. La porra se cierra en unas 6 horas.`,
      url: '/',
      metadata: {
        evento: 'recordatorio_pronosticos',
        tipo_competicion: tipoCompeticion,
        nombre: participante.nombre,
        user_id: participante.id,
        completados,
        faltan,
        total_partidos: idsPartidos.length,
        cierre_pronosticos: cierre.toISOString(),
      },
    });

    resultados.push({ nombre: participante.nombre, completados, faltan, total: idsPartidos.length, ...resultado });
  }

  return {
    evaluado: true,
    jornada,
    cierrePronosticos: cierre.toISOString(),
    resultados,
  };
}
