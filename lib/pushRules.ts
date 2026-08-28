// ============================================================
// REDZONE - REGLAS BASE DE EVENTOS PUSH
// ============================================================

// 10. NO TE COMES EL TURRÓN
export const esNoTeComesElTurron = (
  aciertos: number,
  totalPartidos: number,
) => {
  if (totalPartidos >= 16) {
    return aciertos <= 4;
  }

  if (totalPartidos === 15) {
    return aciertos <= 4;
  }

  if (totalPartidos === 14) {
    return aciertos <= 3;
  }

  return false;
};


// 9. PLENO MÁGICO
export const esPlenoMagico = (
  aciertos: number,
  totalPartidos: number,
) =>
  totalPartidos > 0 &&
  aciertos === totalPartidos;


// 6. PLENO REDZONE
export const esPlenoRedzone = (
  aciertos: number,
  totalPartidos: number,
) =>
  totalPartidos > 0 &&
  aciertos === totalPartidos;


// 7. MENUDO BAÑO
// Ventaja grande sobre ambos rivales.
export const esMenudoBano = (
  lider: number,
  segundo: number,
  tercero: number,
) =>
  lider - segundo >= 4 &&
  lider - tercero >= 4;


// 8. VAMOS, QUE SE ESCAPA
// Diferencia clara, pero no llega a "MENUDO BAÑO".
export const esSeEscapa = (
  lider: number,
  segundo: number,
  tercero: number,
) =>
  lider - segundo >= 2 &&
  lider - tercero >= 2;


// 4. ON FIRE
// Se evalúa SOLO cuando ya ha comenzado REDZONE,
// pero cuentan TODOS los partidos finalizados de la jornada.
export const esOnFire = (
  aciertos: number,
  partidosFinalizados: number,
) =>
  (partidosFinalizados === 4 ||
    partidosFinalizados === 5) &&
  aciertos === partidosFinalizados;


// 5. MADRE MÍA CÓMO ESTAMOS
// Igual que ON FIRE: solo puede dispararse durante REDZONE,
// pero contabiliza adelantados + domingo.
export const esMadreMia = (
  aciertos: number,
  partidosFinalizados: number,
) =>
  (partidosFinalizados === 4 ||
    partidosFinalizados === 5) &&
  aciertos === 0;


// 11. LÍDER SÓLIDO
// Se notifica cada jornada desde la tercera consecutiva.
export const esLiderSolido = (
  jornadasConsecutivas: number,
) =>
  jornadasConsecutivas >= 3;
