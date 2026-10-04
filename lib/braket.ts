import { supabaseServer } from '@/lib/supabaseServer';

export type ConferenciaBraket = 'AFC' | 'NFC';

export interface EquipoBraket {
  seed: number;
  equipo: string;
  conferencia: ConferenciaBraket;
  temporada: number;
  eliminada: boolean;
}

export interface EstadoBraket {
  temporada: number;
  afc: EquipoBraket[];
  nfc: EquipoBraket[];
  vivosAfc: EquipoBraket[];
  vivosNfc: EquipoBraket[];
}

export async function obtenerBraket(
  temporada: number,
): Promise<EstadoBraket> {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida para braket: ${temporada}`);
  }

  const { data, error } = await supabaseServer
    .from('braket')
    .select('seed, equipo, conferencia, temporada, eliminada')
    .eq('temporada', temporada)
    .order('conferencia', { ascending: true })
    .order('seed', { ascending: true });

  if (error) {
    throw new Error(`Error leyendo braket: ${error.message}`);
  }

  const equipos = (data ?? []) as EquipoBraket[];

  const afc = equipos.filter((equipo) => equipo.conferencia === 'AFC');
  const nfc = equipos.filter((equipo) => equipo.conferencia === 'NFC');

  return {
    temporada,
    afc,
    nfc,
    vivosAfc: afc.filter((equipo) => !equipo.eliminada),
    vivosNfc: nfc.filter((equipo) => !equipo.eliminada),
  };
}
