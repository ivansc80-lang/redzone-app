const fs = require('fs');

const path = 'app/page.tsx';
let text = fs.readFileSync(path, 'utf8');

const oldObjGames = `      for (let j = 1; j <= 18; j++) {
        objGames[j] = {`;
const newObjGames = `      const jornadasGamesDisponibles = Object.keys(agrupadasGames)
        .map(Number)
        .filter((j) => Number.isInteger(j) && j > 0)
        .sort((a, b) => a - b);

      for (const j of jornadasGamesDisponibles) {
        objGames[j] = {`;

const oldRanking = `        for (let jNum = 1; jNum <= 18; jNum++) {
          // RANKING y Total Acumulado deben conservar el histórico`;
const newRanking = `        const jornadasRanking = Object.keys(pronosticosGames)
          .map(Number)
          .filter((j) => Number.isInteger(j) && j > 0)
          .sort((a, b) => a - b);

        for (const jNum of jornadasRanking) {
          // RANKING y Total Acumulado deben conservar el histórico`;

if (!text.includes(oldObjGames)) {
  throw new Error('No se encontró el bloque objGames esperado');
}
if (!text.includes(oldRanking)) {
  throw new Error('No se encontró el bloque RANKING esperado');
}

text = text.replace(oldObjGames, newObjGames);
text = text.replace(oldRanking, newRanking);
fs.writeFileSync(path, text, 'utf8');
