import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';
import { PARTICIPANTES_REDZONE } from '@/lib/rankingCompetition';

async function obtenerTemporadaActiva() {
  const { data, error } = await supabaseServer
    .from('app_config_test')
    .select('temporada, fase_competicion')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data?.temporada) {
    throw new Error(
      `No se pudo obtener la temporada TEST activa: ${error?.message || 'app_config_test vacío'}`,
    );
  }

  return { temporada: Number(data.temporada) };
}

export async function POST(request: Request) {
  try {
    const { temporada } = await obtenerTemporadaActiva();
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });
    }

    const token = authorization.slice(7);
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Sesión no válida.' }, { status: 401 });
    }

    if (!(PARTICIPANTES_REDZONE as readonly string[]).includes(user.id)) {
      return NextResponse.json({ success: false, error: 'Usuario no participante.' }, { status: 403 });
    }

    const { data: estado, error: estadoError } = await supabaseServer
      .from('desempate_superbowl_estado_test')
      .select('*')
      .eq('temporada', temporada)
      .maybeSingle();

    if (estadoError) throw new Error(`Error al consultar el desempate TEST: ${estadoError.message}`);

    if (!estado || estado.estado !== 'clasificatoria') {
      return NextResponse.json(
        { success: false, error: 'No hay una tirada de desempate activa.' },
        { status: 409 },
      );
    }

    const participantes: string[] = Array.isArray(estado.participantes)
      ? estado.participantes
      : [];
    const ronda = Number(estado.ronda_actual || 1);
    const fase = 'clasificatoria';

    if (participantes.length < 2 || participantes.length > 3) {
      throw new Error(`Número inválido de participantes en desempate: ${participantes.length}`);
    }

    if (!participantes.includes(user.id)) {
      return NextResponse.json({ success: false, error: 'No participas en este desempate.' }, { status: 403 });
    }

    const { data: tiradaExistente, error: tiradaExistenteError } = await supabaseServer
      .from('desempates_superbowl_test')
      .select('id, valor')
      .eq('temporada', temporada)
      .eq('fase', fase)
      .eq('ronda', ronda)
      .eq('user_id', user.id)
      .maybeSingle();

    if (tiradaExistenteError) {
      throw new Error(`Error al comprobar la tirada TEST: ${tiradaExistenteError.message}`);
    }

    if (tiradaExistente) {
      return NextResponse.json(
        { success: false, error: 'Ya has realizado tu tirada.', valor: tiradaExistente.valor },
        { status: 409 },
      );
    }

    const valor = randomInt(1, 101);

    const { error: guardarError } = await supabaseServer
      .from('desempates_superbowl_test')
      .insert({ temporada, fase, ronda, user_id: user.id, valor });

    if (guardarError) throw new Error(`Error al guardar la tirada TEST: ${guardarError.message}`);

    const { data: tiradasData, error: tiradasError } = await supabaseServer
      .from('desempates_superbowl_test')
      .select('user_id, valor')
      .eq('temporada', temporada)
      .eq('fase', fase)
      .eq('ronda', ronda)
      .in('user_id', participantes);

    if (tiradasError) {
      throw new Error(`Error al leer las tiradas TEST de la ronda: ${tiradasError.message}`);
    }

    const tiradas = tiradasData || [];

    if (tiradas.length < participantes.length) {
      return NextResponse.json({
        success: true,
        temporada,
        fase,
        ronda,
        valor,
        rondaCompletada: false,
        faltan: participantes.length - tiradas.length,
      });
    }

    const maximo = Math.max(...tiradas.map((t: any) => Number(t.valor)));
    const empatadosMaximo = tiradas
      .filter((t: any) => Number(t.valor) === maximo)
      .map((t: any) => String(t.user_id));

    // Si empatan en el máximo, solo ellos repiten en una nueva ronda.
    if (empatadosMaximo.length > 1) {
      const nuevaRonda = ronda + 1;
      const { error: repetirError } = await supabaseServer
        .from('desempate_superbowl_estado_test')
        .update({
          ronda_actual: nuevaRonda,
          participantes: empatadosMaximo,
          updated_at: new Date().toISOString(),
        })
        .eq('temporada', temporada)
        .eq('estado', 'clasificatoria');

      if (repetirError) {
        throw new Error(`Error preparando repetición TEST del desempate: ${repetirError.message}`);
      }

      return NextResponse.json({
        success: true,
        temporada,
        fase,
        ronda,
        valor,
        rondaCompletada: true,
        empate: true,
        repetir: empatadosMaximo,
        nuevaRonda,
      });
    }

    const ganador = empatadosMaximo[0];

    // El ganador queda almacenado en la tabla TEST. rankingCompetition
    // le sumará exactamente +1 sin modificar validados ni efectividad.
    const { error: resolverError } = await supabaseServer
      .from('desempate_superbowl_estado_test')
      .update({
        estado: 'inactivo',
        participantes,
        ganador_eleccion: ganador,
        updated_at: new Date().toISOString(),
      })
      .eq('temporada', temporada)
      .eq('estado', 'clasificatoria');

    if (resolverError) throw new Error(`Error resolviendo desempate TEST: ${resolverError.message}`);

    return NextResponse.json({
      success: true,
      temporada,
      fase,
      ronda,
      valor,
      rondaCompletada: true,
      empate: false,
      ganador,
      puntoExtra: 1,
      desempateResuelto: true,
    });
  } catch (error: any) {
    console.error('Error en /api/desempate/tirar TEST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error desconocido.' },
      { status: 500 },
    );
  }
}
