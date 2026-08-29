export type RondaPlayoff = 'wild_card' | 'divisional' | 'conference' | 'super_bowl';

export type FaseCompeticionPlayoff = 'playoffs' | 'superbowl';

export interface DefinicionRondaPlayoff {
  ronda: RondaPlayoff;
  nombre: 'WILD CARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPER BOWL';
  partidosEsperados: number;
  faseCompeticion: FaseCompeticionPlayoff;
  semanaEspnInicial: number;
}

export const RONDAS_PLAYOFF: Record<RondaPlayoff, DefinicionRondaPlayoff> = {
  wild_card: {
    ronda: 'wild_card',
    nombre: 'WILD CARD',
    partidosEsperados: 6,
    faseCompeticion: 'playoffs',
    semanaEspnInicial: 1,
  },
  divisional: {
    ronda: 'divisional',
    nombre: 'DIVISIONAL',
    partidosEsperados: 4,
    faseCompeticion: 'playoffs',
    semanaEspnInicial: 2,
  },
  conference: {
    ronda: 'conference',
    nombre: 'CONFERENCE',
    partidosEsperados: 2,
    faseCompeticion: 'playoffs',
    semanaEspnInicial: 3,
  },
  super_bowl: {
    ronda: 'super_bowl',
    nombre: 'SUPER BOWL',
    partidosEsperados: 1,
    faseCompeticion: 'superbowl',
    semanaEspnInicial: 4,
  },
};

export function siguienteRondaPlayoff(ronda: RondaPlayoff): RondaPlayoff | null {
  switch (ronda) {
    case 'wild_card':
      return 'divisional';
    case 'divisional':
      return 'conference';
    case 'conference':
      return 'super_bowl';
    case 'super_bowl':
      return null;
  }
}

export function jornadaRedzoneParaRonda(
  ultimaJornadaRegular: number,
  ronda: RondaPlayoff,
) {
  switch (ronda) {
    case 'wild_card':
      return ultimaJornadaRegular + 1;
    case 'divisional':
      return ultimaJornadaRegular + 2;
    case 'conference':
      return ultimaJornadaRegular + 3;
    case 'super_bowl':
      return ultimaJornadaRegular + 4;
  }
}

function textoEventoEspn(evento: any) {
  const valores = [
    evento?.name,
    evento?.shortName,
    evento?.season?.slug,
    evento?.competitions?.[0]?.notes?.map((n: any) => n?.headline).join(' '),
    evento?.competitions?.[0]?.type?.text,
  ];

  return valores
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function eventoEsSuperBowl(evento: any) {
  const texto = textoEventoEspn(evento);
  return texto.includes('super bowl');
}

async function obtenerEventosPostseason(temporada: number, week: number) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporada}&seasontype=3&week=${week}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(`ESPN respondió HTTP ${res.status} para postseason Week ${week}`);
  }

  const data = await res.json();
  return Array.isArray(data?.events) ? data.events : [];
}

export async function localizarSemanaEspnDeRonda(
  temporada: number,
  ronda: RondaPlayoff,
) {
  const definicion = RONDAS_PLAYOFF[ronda];

  if (ronda !== 'super_bowl') {
    const eventos = await obtenerEventosPostseason(
      temporada,
      definicion.semanaEspnInicial,
    );

    return {
      week: definicion.semanaEspnInicial,
      eventos,
      encontrada: eventos.length > 0,
    };
  }

  // La Super Bowl no se fija eternamente a Week 5. Empezamos en Week 4
  // y avanzamos hasta encontrar un evento identificado explícitamente como
  // "Super Bowl". Week 4 puede ser Pro Bowl y debe ignorarse.
  for (let week = definicion.semanaEspnInicial; week <= 8; week++) {
    const eventos = await obtenerEventosPostseason(temporada, week);
    const eventosSuperBowl = eventos.filter(eventoEsSuperBowl);

    if (eventosSuperBowl.length > 0) {
      return {
        week,
        eventos: eventosSuperBowl,
        encontrada: true,
      };
    }
  }

  return {
    week: null,
    eventos: [],
    encontrada: false,
  };
}
