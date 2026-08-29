import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

async function obtenerTemporadaActiva() {
  const { data, error } = await supabaseServer
    .from('app_config')
    .select('temporada')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data?.temporada) {
    throw new Error(
      `No se pudo obtener la temporada activa: ${error?.message || 'app_config vacío'}`,
    );
  }

  return Number(data.temporada);
}

export async function POST(request: Request) {
  try {
    const TEMPORADA = await obtenerTemporadaActiva();
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado.' },
        { status: 401 },
      );
    }

    const token = authorization.slice(7);

    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Sesión no válida.' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const equipoElegido = String(body?.equipo || '').toUpperCase();

    const { data: estado, error: estadoError } = await supabaseServer
      .from('desempate_superbowl_estado')
      .select('*')
      .eq('temporada', TEMPORADA)
      .maybeSingle();

    if (estadoError) {
      throw new Error(`Error al consultar desempate: ${estadoError.message}`);
    }

    if (
      !estado ||
      estado.estado !== 'resuelto' ||
      estado.ganador_eleccion !== user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes derecho a realizar esta elección.',
        },
        { status: 403 },
      );
    }

    const finalistas = [estado.finalista_1, estado.finalista_2].filter(Boolean);

    if (!finalistas.includes(user.id)) {
      return NextResponse.json(
        { success: false, error: 'No eres finalista.' },
        { status: 403 },
      );
    }

    const rivalId = finalistas.find((id: string) => id !== user.id);

    if (!rivalId) {
      throw new Error('No se pudo determinar el rival.');
    }

    const { data: partido, error: partidoError } = await supabaseServer
      .from('partidos')
      .select('id, equipo_local, equipo_visitante, espn_event_id')
      .eq('temporada', TEMPORADA)
      .eq('tipo_competicion', 'superbowl')
      .order('fecha_partido', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (partidoError) {
      throw new Error(`Error al consultar la Super Bowl: ${partidoError.message}`);
    }

    if (!partido || !partido.id || !partido.espn_event_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'La Super Bowl todavía no está cargada o validada.',
        },
        { status: 409 },
      );
    }

    const equipos = [partido.equipo_local, partido.equipo_visitante];

    if (!equipos.includes(equipoElegido)) {
      return NextResponse.json(
        { success: false, error: 'Equipo no válido.' },
        { status: 400 },
      );
    }

    const ganadorEligeLocal = equipoElegido === partido.equipo_local;
    const equipoRival = ganadorEligeLocal
      ? partido.equipo_visitante
      : partido.equipo_local;
    const eleccionGanador: '1' | '2' = ganadorEligeLocal ? '1' : '2';
    const eleccionRival: '1' | '2' = ganadorEligeLocal ? '2' : '1';

    const { data: eleccionesExistentes, error: existentesError } =
      await supabaseServer
        .from('elecciones_superbowl')
        .select('id')
        .eq('temporada', TEMPORADA)
        .limit(1);

    if (existentesError) {
      throw new Error(`Error al comprobar elecciones: ${existentesError.message}`);
    }

    if (eleccionesExistentes && eleccionesExistentes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'La elección de la Super Bowl ya está cerrada.',
        },
        { status: 409 },
      );
    }

    const { error: guardarError } = await supabaseServer
      .from('elecciones_superbowl')
      .insert([
        {
          temporada: TEMPORADA,
          user_id: user.id,
          equipo: equipoElegido,
          tipo_asignacion: 'elegido',
        },
        {
          temporada: TEMPORADA,
          user_id: rivalId,
          equipo: equipoRival,
          tipo_asignacion: 'automatico',
        },
      ]);

    if (guardarError) {
      throw new Error(`Error al guardar elecciones: ${guardarError.message}`);
    }

    const { error: pronosticosError } = await supabaseServer
      .from('pronosticos')
      .upsert(
        [
          {
            partido_id: partido.id,
            user_id: user.id,
            eleccion: eleccionGanador,
            acierto: null,
          },
          {
            partido_id: partido.id,
            user_id: rivalId,
            eleccion: eleccionRival,
            acierto: null,
          },
        ],
        { onConflict: 'partido_id,user_id' },
      );

    if (pronosticosError) {
      // Si no conseguimos trasladar la elección al sistema real de PORRA,
      // revertimos las elecciones auxiliares para permitir un reintento limpio.
      await supabaseServer
        .from('elecciones_superbowl')
        .delete()
        .eq('temporada', TEMPORADA);

      throw new Error(
        `Error al guardar los pronósticos de la Super Bowl: ${pronosticosError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      temporada: TEMPORADA,
      partidoId: partido.id,
      ganadorEleccion: user.id,
      equipoElegido,
      pronosticoGanador: eleccionGanador,
      rival: rivalId,
      equipoAsignadoRival: equipoRival,
      pronosticoRival: eleccionRival,
    });
  } catch (error: any) {
    console.error('Error en /api/desempate/elegir-equipo:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido.',
      },
      { status: 500 },
    );
  }
}
