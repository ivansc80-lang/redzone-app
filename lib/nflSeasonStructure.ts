const MAX_WEEKS_REGULAR = 30;
const MAX_WEEKS_PLAYOFF = 10;

async function eventosEspn(temporada: number, seasontype: 2 | 3, week: number) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${temporada}&seasontype=${seasontype}&week=${week}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(`ESPN HTTP ${res.status}: seasontype=${seasontype}, week=${week}`);
  }

  const data = await res.json();
  return Array.isArray(data?.events) ? data.events : [];
}

function contieneSuperBowl(eventos: any[]) {
  return eventos.some((evento: any) => {
    const textos = [
      evento?.name,
      evento?.shortName,
      evento?.season?.slug,
      evento?.competitions?.[0]?.notes?.map((n: any) => n?.headline).join(' '),
      evento?.competitions?.[0]?.type?.text,
      evento?.competitions?.[0]?.type?.abbreviation,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return textos.includes('super bowl');
  });
}

export async function descubrirEstructuraTemporadaNFL(temporada: number) {
  if (!Number.isInteger(temporada) || temporada < 2000) {
    throw new Error(`Temporada inválida: ${temporada}`);
  }

  let ultimaJornadaRegular = 0;
  let vaciasConsecutivas = 0;

  for (let week = 1; week <= MAX_WEEKS_REGULAR; week++) {
    const eventos = await eventosEspn(temporada, 2, week);

    if (eventos.length > 0) {
      if (vaciasConsecutivas > 0) {
        throw new Error(
          `Calendario regular ESPN discontinuo: aparecen partidos en week ${week} después de una week vacía`,
        );
      }
      ultimaJornadaRegular = week;
      continue;
    }

    if (ultimaJornadaRegular > 0) {
      vaciasConsecutivas += 1;
      if (vaciasConsecutivas >= 2) break;
    }
  }

  if (ultimaJornadaRegular === 0) {
    throw new Error(`ESPN no devuelve temporada regular para ${temporada}`);
  }

  // Confirmación adicional del final de campaña: buscamos en postseason desde
  // Week 1 hasta encontrar un evento identificado explícitamente como Super Bowl.
  // No suponemos que vaya a ser siempre Week 5.
  let semanaSuperBowl: number | null = null;

  for (let week = 1; week <= MAX_WEEKS_PLAYOFF; week++) {
    const eventos = await eventosEspn(temporada, 3, week);
    if (contieneSuperBowl(eventos)) {
      semanaSuperBowl = week;
      break;
    }
  }

  return {
    temporada,
    ultimaJornadaRegular,
    semanaSuperBowl,
    superBowlLocalizada: semanaSuperBowl !== null,
  };
}
