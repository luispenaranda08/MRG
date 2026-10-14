/* eslint-disable @typescript-eslint/no-require-imports -- Prueba de la hoja de supuestos recomendados. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
const ExcelJS = require('exceljs');
const { agregarHojaDecisiones, filasDecisiones } = require('../decisiones-excel.ts');
const { POR_DEFECTO } = require('../decisiones.ts');
(async () => {
  const decisiones = Object.keys(POR_DEFECTO).map(clave => ({ clave, opcion: POR_DEFECTO[clave], motivo: `Motivo ${clave}`, origen: clave === 'crecimiento' ? 'auto' : clave === 'margen' ? 'usuario' : 'mirage' }));
  const seleccion = { sector: '14 · Confección', sectorOrigen: 'Recomendado', tamano: 'Pequeña', tamanoOrigen: 'regla de activos Ley 905' };
  const filas = filasDecisiones(decisiones, seleccion);
  assert.deepEqual(filas[0], ['Decisión', 'Opción elegida', 'Alternativas', 'Motivo', 'Origen']);
  assert.equal(filas.length, decisiones.length + 3);
  assert.deepEqual(filas.slice(-2).map(x => [x[0], x[1], x[4]]), [['Sector', seleccion.sector, 'Recomendado'], ['Tamaño', seleccion.tamano, 'regla de activos Ley 905']]);
  assert.deepEqual(filas.slice(1, 4).map(x => x[4]), ['Recomendado', 'Usted', 'Valor base']);
  assert.ok(filas.slice(1, 4).every(x => x[2].length > 0 && x[3].startsWith('Motivo')));
  const wb = new ExcelJS.Workbook();
  const ws = agregarHojaDecisiones(wb, decisiones, seleccion);
  assert.equal(ws.name, 'Supuestos recomendados');
  assert.deepEqual(ws.getRow(1).values.slice(1), filas[0]);
  console.log('OK hoja Supuestos recomendados: columnas, alternativas, motivos y orígenes (recomendado, valor base, usuario), sector y tamaño.');
})().catch(e => { console.error(e); process.exitCode = 1; });
