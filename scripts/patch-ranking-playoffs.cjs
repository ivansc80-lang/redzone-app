const fs = require('fs');

const path = 'app/page.tsx';
let text = fs.readFileSync(path, 'utf8');

const oldRachas = `      partidos.forEach((p) => {
        const local = String(p.local || "").toUpperCase();`;

const newRachas = `      partidos.forEach((p) => {
        // Las rachas de GAMES pertenecen exclusivamente a la TR.
        // Wild Card, Divisional, Conference y Super Bowl nunca las modifican.
        if (
          p.tipo_competicion === "playoffs" ||
          p.tipo_competicion === "superbowl"
        ) {
          return;
        }

        const local = String(p.local || "").toUpperCase();`;

if (!text.includes(oldRachas)) {
  throw new Error('No se encontró el bloque de RACHAS esperado');
}

text = text.replace(oldRachas, newRachas);
fs.writeFileSync(path, text, 'utf8');
