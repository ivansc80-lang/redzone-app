// Pruebas aisladas, sin red ni base de datos.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('lib/regularPickDateGuard.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandbox = { exports: {} };
vm.runInNewContext(js, sandbox, { filename: 'regularPickDateGuard.js' });
const { validarFechaEspnRegular, cierreGuardadoCoincideConEspn, debeCerrarPorra, validarFechasJornadaEspn } = sandbox.exports;
const cierre = '2026-11-20T00:45:00.000Z';
const antes = new Date('2026-11-19T12:00:00Z');
const despues = new Date('2026-11-20T01:00:00Z');

assert.throws(() => validarFechaEspnRegular('1993-01-31T23:30:00Z', 2026, 11, 'x'), /incompatible/);
assert.throws(() => validarFechaEspnRegular('no-es-fecha', 2026, 11, 'x'), /inválida/);
assert.equal(validarFechaEspnRegular('2026-11-20T01:15:00Z', 2026, 11, 'x').getUTCFullYear(), 2026);
assert.equal(validarFechaEspnRegular('2027-01-03T20:00:00Z', 2026, 18, 'x').getUTCFullYear(), 2027);
assert.equal(cierreGuardadoCoincideConEspn('1993-01-31T23:00:00Z', cierre), false);
assert.equal(debeCerrarPorra('pendiente', '1993-01-31T23:00:00Z', cierre, despues), false);
assert.equal(debeCerrarPorra('pendiente', cierre, cierre, antes), false);
assert.equal(debeCerrarPorra('pendiente', cierre, cierre, despues), true);
assert.equal(debeCerrarPorra('cerrada', cierre, cierre, despues), false);
assert.equal(debeCerrarPorra('pendiente', null, cierre, despues), false);
const semana = [
  { id: '1', date: '2026-11-20T01:15:00Z' },
  { id: '2', date: '2026-11-23T01:15:00Z' },
];
assert.doesNotThrow(() => validarFechasJornadaEspn(semana, 2026, 11));
assert.throws(() => validarFechasJornadaEspn([
  ...semana, { id: '3', date: '1993-01-31T23:30:00Z' },
], 2026, 11), /incompatible/);
assert.throws(() => validarFechasJornadaEspn([
  ...semana, { id: '3', date: '2026-12-15T01:15:00Z' },
], 2026, 11), /14 días/);
assert.throws(() => validarFechasJornadaEspn([
  ...semana, { id: '2', date: '2026-11-24T01:15:00Z' },
], 2026, 11), /duplicado/);
console.log('OK: 14 comprobaciones aisladas; ninguna escritura ni llamada de red');
