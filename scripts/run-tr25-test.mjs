const BASE_URL = process.env.TR25_TEST_URL || 'http://localhost:3000';
const INTERVAL_MS = Number(process.env.TR25_TEST_INTERVAL_MS || 5000);

let running = true;
let lastSignature = '';

process.on('SIGINT', () => {
  running = false;
  console.log('\n[TR25 TEST] Deteniendo simulador...');
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tick() {
  const response = await fetch(`${BASE_URL}/api/test-season-tick`, { cache: 'no-store' });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }

  const signature = JSON.stringify({
    jornada: data.jornada,
    estado: data.estado,
    fase: data.fase,
    finalizados: data.finalizados,
    siguienteJornada: data.siguienteJornada,
  });

  if (signature !== lastSignature) {
    console.log(`[${new Date().toLocaleTimeString('es-ES')}]`, data);
    lastSignature = signature;
  }

  return data;
}

console.log('[TR25 TEST] Simulador iniciado');
console.log(`[TR25 TEST] Endpoint: ${BASE_URL}/api/test-season-tick`);
console.log(`[TR25 TEST] Frecuencia: ${INTERVAL_MS / 1000}s`);
console.log('[TR25 TEST] Ctrl+C para detenerlo.');

while (running) {
  try {
    const data = await tick();
    if (data.fase === 'regular_completa' && data.siguienteJornada == null) {
      console.log('[TR25 TEST] Temporada regular completada. Simulador detenido automáticamente.');
      break;
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString('es-ES')}] [TR25 TEST]`, error?.message || error);
  }

  if (running) await sleep(INTERVAL_MS);
}
