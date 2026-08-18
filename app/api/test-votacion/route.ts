import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

const USUARIOS_TEST = [
  {
    idInterno: 'juanjo',
    userId: 'dadb359a-8bc1-442e-8202-62fa2f8ddab9',
  },
  {
    idInterno: 'cace',
    userId: '088072d0-0782-409f-b5e4-f8a558f27b4f',
  },
];

const OPCIONES: ('1' | 'X' | '2')[] = ['1', 'X', '2'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jornada = Number(body?.jornada);

    if (!jornada || jornada < 1 || jornada > 18) {
      return NextResponse.json(
        {
          success: false,
          error: 'Jornada no válida.',
        },
        {
          status: 400,
        }
      );
    }

    const { data: partidos, error: partidosError } = await supabaseServer
      .from('partidos')
      .select('id')
      .eq('jornada', jornada)
      .order('fecha_partido', { ascending: true });

    if (partidosError) {
      throw new Error(
        `Error al obtener partidos de la jornada ${jornada}: ${partidosError.message}`
      );
    }

    if (!partidos || partidos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No hay partidos disponibles para la jornada ${jornada}.`,
        },
        {
          status: 404,
        }
      );
    }

    const filasGuardar = USUARIOS_TEST.flatMap((usuario) =>
      partidos.map((partido) => ({
        user_id: usuario.userId,
        partido_id: partido.id,
        eleccion: OPCIONES[Math.floor(Math.random() * OPCIONES.length)],
        updated_at: new Date().toISOString(),
      }))
    );

    const { error: guardarError } = await supabaseServer
      .from('pronosticos')
      .upsert(filasGuardar, {
        onConflict: 'user_id,partido_id',
      });

    if (guardarError) {
      throw new Error(
        `Error al guardar pronósticos de prueba: ${guardarError.message}`
      );
    }

    return NextResponse.json({
      success: true,
      jornada,
      usuarios: USUARIOS_TEST.map((u) => u.idInterno),
      pronosticosGuardados: filasGuardar.length,
    });
  } catch (error: any) {
    console.error('Error en /api/test-votacion:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error desconocido.',
      },
      {
        status: 500,
      }
    );
  }
}
