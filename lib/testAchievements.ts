import { supabaseServer as supabase } from '@/lib/supabaseServer';

export type TipoLogroTest =
  | 'PLENO_MAGICO'
  | 'PLENO_REDZONE'
  | 'CAMPEON_REDZONE';

export async function guardarLogroTest({
  userId,
  temporada,
  jornada,
  tipoCompeticion = 'regular',
  tipoLogro,
  detalle,
  metadata = {},
}: {
  userId: string;
  temporada: number;
  jornada: number;
  tipoCompeticion?: string;
  tipoLogro: TipoLogroTest;
  detalle?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from('logros_test')
    .upsert(
      {
        user_id: userId,
        temporada,
        jornada,
        tipo_competicion: tipoCompeticion,
        tipo_logro: tipoLogro,
        detalle,
        metadata,
      },
      {
        onConflict: 'user_id,temporada,jornada,tipo_competicion,tipo_logro',
      },
    );

  if (error) {
    throw new Error(`TEST: error guardando logro ${tipoLogro}: ${error.message}`);
  }
}

export async function guardarCampeonRedzoneTest({
  userId,
  temporada,
  jornada,
  tipoCompeticion,
}: {
  userId: string;
  temporada: number;
  jornada: number;
  tipoCompeticion: string;
}) {
  await guardarLogroTest({
    userId,
    temporada,
    jornada,
    tipoCompeticion,
    tipoLogro: 'CAMPEON_REDZONE',
    detalle: `Campeón REDZONE ${temporada}`,
    metadata: {
      origen: 'motor_test',
      logro: 'campeon_redzone',
    },
  });
}
