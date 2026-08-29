const fs = require('fs');

const path = 'app/page.tsx';
let text = fs.readFileSync(path, 'utf8');

function replaceOnce(oldText, newText, label) {
  if (!text.includes(oldText)) {
    throw new Error(`No se encontró el bloque esperado: ${label}`);
  }
  text = text.replace(oldText, newText);
}

// 1. Conservar la semana de competición ESPN en cada partido visual.
replaceOnce(
  `  tipo_competicion: "regular" | "pretemporada_test" | "playoffs" | "superbowl";\n  local: string;`,
  `  tipo_competicion: "regular" | "pretemporada_test" | "playoffs" | "superbowl";\n  semana_competicion?: number | null;\n  local: string;`,
  'interface PronosticoPartido',
);

const mappingOld = `          tipo_competicion: row.tipo_competicion,\n          local: row.equipo_local,`;
const mappingNew = `          tipo_competicion: row.tipo_competicion,\n          semana_competicion: row.semana_competicion ?? null,\n          local: row.equipo_local,`;

const mappingCount = text.split(mappingOld).length - 1;
if (mappingCount < 2) {
  throw new Error(`Se esperaban al menos 2 mapeos de partidos y se encontraron ${mappingCount}`);
}
text = text.replace(mappingOld, mappingNew);
text = text.replace(mappingOld, mappingNew);

// 2. Helper único para nombres visuales de las rondas.
replaceOnce(
  `  const tituloBarraPrincipal =\n    pestanaActiva === "clasificacion"`,
  `  const nombreRondaPlayoff = (partido?: PronosticoPartido | null) => {\n    if (!partido) return "";\n\n    if (partido.tipo_competicion === "superbowl") {\n      return "SUPER BOWL";\n    }\n\n    if (partido.tipo_competicion !== "playoffs") {\n      return "";\n    }\n\n    switch (Number(partido.semana_competicion)) {\n      case 1:\n        return "WILD CARD";\n      case 2:\n        return "DIVISIONAL";\n      case 3:\n        return "CONFERENCE";\n      default:\n        return "PLAYOFFS";\n    }\n  };\n\n  const rondaJornadaActiva = nombreRondaPlayoff(\n    datosUsuarioActual.pronosticos[0] || null,\n  );\n\n  const tituloBarraPrincipal =\n    pestanaActiva === "clasificacion"`,
  'helper nombreRondaPlayoff',
);

// 3. PORRA y JORNADA: nombre de ronda dinámico.
replaceOnce(
  `        ? \`PRONÓSTICOS - JORNADA \${jornadaActual}\`\n        : pestanaActiva === "jornada"\n          ? \`RESULTADOS JORNADA \${jornadaActual}\``,
  `        ? \`PRONÓSTICOS JORNADA \${jornadaActual}\${rondaJornadaActiva ? \` – \${rondaJornadaActiva}\` : ""}\`\n        : pestanaActiva === "jornada"\n          ? \`RESULTADOS JORNADA \${jornadaActual}\${rondaJornadaActiva ? \` – \${rondaJornadaActiva}\` : ""}\``,
  'titulos PORRA/JORNADA',
);

// 4. GAMES: recorrer todas las jornadas reales, no solo 18.
replaceOnce(
  `                    {Array.from({ length: 18 }, (_, i) => i + 1).map((jNum) => {\n                      const partidosJornada = jornadasGames[jNum] || [];`,
  `                    {Object.keys(jornadasGames)\n                      .map(Number)\n                      .filter((j) => Number.isInteger(j) && j > 0)\n                      .sort((a, b) => a - b)\n                      .map((jNum) => {\n                      const partidosJornada = jornadasGames[jNum] || [];`,
  'lista dinámica GAMES',
);

// 5. GAMES: nombre de ronda en cada cabecera histórica.
replaceOnce(
  `                      if (partidosJornada.length === 0) return null;\n\n                      return (`,
  `                      if (partidosJornada.length === 0) return null;\n\n                      const rondaGames = nombreRondaPlayoff(\n                        partidosJornada[0] || null,\n                      );\n\n                      return (`,
  'ronda GAMES',
);

replaceOnce(
  `                              JORNADA {jNum}\n                            </h3>`,
  `                              {rondaGames\n                                ? \`J\${jNum} – \${rondaGames}\`\n                                : \`JORNADA \${jNum}\`}\n                            </h3>`,
  'cabecera GAMES',
);

fs.writeFileSync(path, text, 'utf8');
