import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { supabaseServer } from '@/lib/supabaseServer';

const TEMPORADA = 2026;

const PARTICIPANTES = [
  '088072d0-0782-409f-b5e4-f8a558f27b4f', // Cace
  'dadb359a-8bc1-442e-8202-62fa2f8ddab9', // Juanjo
  '351a81a5-86f9-4d6d-a567-f49ed5959e57', // Iván
];

export async function POST(request: Request) {
  try {
    // ---------------------------------------------------------
    // 1. IDENTIDAD REAL DEL USUARIO
    // ---------------------------------------------------------
    const authorization = request.headers.get('authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado.' },
        { status: 401 }
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
        { status: 401 }
      );
    }

    if (!PARTICIPANTES.includes(user.id)) {
      return NextResponse.json(
        { success: false, error: 'Usuario no participante.' },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 2. ESTADO ACTUAL DEL DESEMPATE
    // ---------------------------------------------------------
    const { data: estado, error: estadoError } = await supabaseServer
      .from('desempate_superbowl_estado')
      .select('*')
      .eq('temporada', TEMPORADA)
      .maybeSingle();

    if (estadoError) {
      throw new Error(
        `Error al consultar el desempate: ${estadoError.message}`
      );
    }

    if (!estado || estado.estado === 'inactivo' || estado.estado === 'resuelto') {
      return NextResponse.json(
        { success: false, error: 'No hay una tirada activa.' },
        { status: 409 }
      );
    }

    const fase =
      estado.estado === 'clasificatoria'
        ? 'clasificatoria'
        : 'eleccion_final';

    // ---------------------------------------------------------
    // 3. COMPROBAR SI ESTE USUARIO PUEDE PARTICIPAR
    // ---------------------------------------------------------
    const participantes: string[] = estado.participantes || [];
    const ronda = Number(estado.ronda_actual || 1);

    if (!participantes.includes(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No participas en esta ronda del desempate.',
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 4. IMPEDIR UNA SEGUNDA TIRADA
    // ---------------------------------------------------------
    const { data: tiradaExistente, error: tiradaExistenteError } =
      await supabaseServer
        .from('desempates_superbowl')
        .select('id, valor')
        .eq('temporada', TEMPORADA)
        .eq('fase', fase)
        .eq('ronda', ronda)
        .eq('user_id', user.id)
        .maybeSingle();

    if (tiradaExistenteError) {
      throw new Error(
        `Error al comprobar la tirada: ${tiradaExistenteError.message}`
      );
    }

    if (tiradaExistente) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya has realizado tu tirada.',
          valor: tiradaExistente.valor,
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------------
    // 5. NÚMERO ALEATORIO REAL 1 - 100 GENERADO EN SERVIDOR
    // ---------------------------------------------------------
    const valor = randomInt(1, 101);

    const { error: guardarError } = await supabaseServer
      .from('desempates_superbowl')
      .insert({
        temporada: TEMPORADA,
        fase,
        ronda,
        user_id: user.id,
        valor,
      });

    if (guardarError) {
      throw new Error(
        `Error al guardar la tirada: ${guardarError.message}`
      );
    }

    const { data: tiradasData, error: tiradasError } = await supabaseServer
      .from('desempates_superbowl')
      .select('user_id, valor')
      .eq('temporada', TEMPORADA)
      .eq('fase', fase)
      .eq('ronda', ronda)
      .in('user_id', participantes);

    if (tiradasError) {
      throw new Error(
        `Error al leer las tiradas de la ronda: ${tiradasError.message}`
      );
    }

    const tiradas = tiradasData || [];

    if (tiradas.length < participantes.length) {
      return NextResponse.json({
        success: true,
        fase,
        ronda,
        valor,
        rondaCompletada: false,
        faltan: participantes.length - tiradas.length,
      });
    }

    const ordenadas = [...tiradas].sort((a: any, b: any) => b.valor - a.valor);

    if (fase === 'clasificatoria' && participantes.length === 3) {
      const primero = ordenadas[0];
      const segundo = ordenadas[1];
      const tercero = ordenadas[2];

      // Empate triple: repiten los tres.
      if (
        primero.valor === segundo.valor &&
        segundo.valor === tercero.valor
      ) {
        const nuevaRonda = ronda + 1;

        const { error: repetirTripleError } = await supabaseServer
          .from('desempate_superbowl_estado')
          .update({
            ronda_actual: nuevaRonda,
            participantes,
            finalista_1: null,
            finalista_2: null,
            eliminado: null,
            updated_at: new Date().toISOString(),
          })
          .eq('temporada', TEMPORADA);

        if (repetirTripleError) {
          throw new Error(
            `Error al preparar repetición triple: ${repetirTripleError.message}`
          );
        }

        return NextResponse.json({
          success: true,
          fase,
          ronda,
          valor,
          rondaCompletada: true,
          empate: true,
          repetir: participantes,
          nuevaRonda,
        });
      }

      // Empate por la segunda plaza:
      // el primero queda clasificado y repiten solo los otros dos.
      if (segundo.valor === tercero.valor) {
        const nuevaRonda = ronda + 1;
        const empatados = [segundo.user_id, tercero.user_id];

        const { error: repetirSegundaError } = await supabaseServer
          .from('desempate_superbowl_estado')
          .update({
            ronda_actual: nuevaRonda,
            participantes: empatados,
            finalista_1: primero.user_id,
            finalista_2: null,
            eliminado: null,
            updated_at: new Date().toISOString(),
          })
          .eq('temporada', TEMPORADA);

        if (repetirSegundaError) {
          throw new Error(
            `Error al preparar desempate por segunda plaza: ${repetirSegundaError.message}`
          );
        }

        return NextResponse.json({
          success: true,
          fase,
          ronda,
          valor,
          rondaCompletada: true,
          empate: true,
          clasificado: primero.user_id,
          repetir: empatados,
          nuevaRonda,
        });
      }

      // Hay dos clasificados claros.
      const finalista1 = primero.user_id;
      const finalista2 = segundo.user_id;
      const eliminado = tercero.user_id;

      const { error: avanzarError } = await supabaseServer
        .from('desempate_superbowl_estado')
        .update({
          estado: 'eleccion_final',
          ronda_actual: 1,
          participantes: [finalista1, finalista2],
          finalista_1: finalista1,
          finalista_2: finalista2,
          eliminado,
          ganador_eleccion: null,
          updated_at: new Date().toISOString(),
        })
        .eq('temporada', TEMPORADA);

      if (avanzarError) {
        throw new Error(
          `Error al preparar la tirada final: ${avanzarError.message}`
        );
      }

      return NextResponse.json({
        success: true,
        fase,
        ronda,
        valor,
        rondaCompletada: true,
        empate: false,
        finalistas: [finalista1, finalista2],
        eliminado,
        siguienteFase: 'eleccion_final',
      });
    }

    // Desempate entre dos jugadores por la segunda plaza,
    // después de que un primer jugador ya haya quedado clasificado.
    if (
      fase === 'clasificatoria' &&
      participantes.length === 2 &&
      estado.finalista_1
    ) {
      const primero = ordenadas[0];
      const segundo = ordenadas[1];

      // Si vuelven a empatar, repiten únicamente estos dos.
      if (primero.valor === segundo.valor) {
        const nuevaRonda = ronda + 1;

        const { error: repetirSegundaPlazaError } = await supabaseServer
          .from('desempate_superbowl_estado')
          .update({
            ronda_actual: nuevaRonda,
            participantes,
            updated_at: new Date().toISOString(),
          })
          .eq('temporada', TEMPORADA);

        if (repetirSegundaPlazaError) {
          throw new Error(
            `Error al repetir desempate por segunda plaza: ${repetirSegundaPlazaError.message}`
          );
        }

        return NextResponse.json({
          success: true,
          fase,
          ronda,
          valor,
          rondaCompletada: true,
          empate: true,
          repetir: participantes,
          nuevaRonda,
        });
      }

      const finalista1 = estado.finalista_1;
      const finalista2 = primero.user_id;
      const eliminado = segundo.user_id;

      const { error: avanzarFinalError } = await supabaseServer
        .from('desempate_superbowl_estado')
        .update({
          estado: 'eleccion_final',
          ronda_actual: 1,
          participantes: [finalista1, finalista2],
          finalista_1: finalista1,
          finalista_2: finalista2,
          eliminado,
          ganador_eleccion: null,
          updated_at: new Date().toISOString(),
        })
        .eq('temporada', TEMPORADA);

      if (avanzarFinalError) {
        throw new Error(
          `Error al preparar final tras desempate de segunda plaza: ${avanzarFinalError.message}`
        );
      }

      return NextResponse.json({
        success: true,
        fase,
        ronda,
        valor,
        rondaCompletada: true,
        empate: false,
        finalistas: [finalista1, finalista2],
        eliminado,
        siguienteFase: 'eleccion_final',
      });
    }

    if (fase === 'eleccion_final' && participantes.length === 2) {
      const primero = ordenadas[0];
      const segundo = ordenadas[1];

      // Empate: vuelven a tirar únicamente los dos finalistas.
      if (primero.valor === segundo.valor) {
        const nuevaRonda = ronda + 1;

        const { error: repetirFinalError } = await supabaseServer
          .from('desempate_superbowl_estado')
          .update({
            ronda_actual: nuevaRonda,
            participantes,
            updated_at: new Date().toISOString(),
          })
          .eq('temporada', TEMPORADA);

        if (repetirFinalError) {
          throw new Error(
            `Error al preparar repetición final: ${repetirFinalError.message}`
          );
        }

        return NextResponse.json({
          success: true,
          fase,
          ronda,
          valor,
          rondaCompletada: true,
          empate: true,
          repetir: participantes,
          nuevaRonda,
        });
      }

      const ganador = primero.user_id;
      const perdedor = segundo.user_id;

      const { error: resolverFinalError } = await supabaseServer
        .from('desempate_superbowl_estado')
        .update({
          estado: 'resuelto',
          ganador_eleccion: ganador,
          participantes: [ganador, perdedor],
          updated_at: new Date().toISOString(),
        })
        .eq('temporada', TEMPORADA);

      if (resolverFinalError) {
        throw new Error(
          `Error al resolver la tirada final: ${resolverFinalError.message}`
        );
      }

      return NextResponse.json({
        success: true,
        fase,
        ronda,
        valor,
        rondaCompletada: true,
        empate: false,
        ganadorEleccion: ganador,
        perdedor,
        desempateResuelto: true,
      });
    }

    return NextResponse.json({
      success: true,
      fase,
      ronda,
      valor,
      rondaCompletada: true,
      tiradas,
    });
  } catch (error: any) {
    console.error('Error en /api/desempate/tirar:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido.',
      },
      { status: 500 }
    );
  }
}
