/* eslint-disable @typescript-eslint/no-require-imports -- Alineación de la calculadora y de Tu empresa con la tabla publicada. */
const assert = require("node:assert/strict"), fs = require("node:fs"), ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const par = require("../../../public/api/v1/parametros.json").parametros, sect = require("../../../public/api/v1/sectores.json").sectores;
const { calcular } = require("../../lib/calculadora.ts"), { numero, convertirWaccCopNominal } = require("../../lib/api.ts"), { tamanoPorActivos } = require("../../lib/dx/tamano.ts");
// La calculadora, con la estructura típica del sector o del tamaño (patrimonio 1, deuda = D/E mediano), debe dar
// el mismo Ke y WACC que la tabla publicada. Tolerancia 0,0002: la API redondea a 4 decimales.
let n = 0;
for (const s of sect) for (const [tam, t] of [["Sector", null], ...Object.entries(s.por_tamano)]) {
    const de = tam === "Sector" ? numero(s.de) : numero(t.de); if (de == null) continue;
    const ref = tam === "Sector" ? { ke: s.ke, w: s.wacc_cop_nominal, wu: s.wacc_usd_nominal } : { ke: t.ke, w: t.wacc_cop_nominal, wu: convertirWaccCopNominal(t.wacc_cop_nominal, "USD", "nominal", par) };
    const r = calcular(par, s, tam === "Sector" ? "—" : tam, { deuda: de, patrimonio: 1, ebit: 0, gastos: 0, tarifa: numero(par.tasa_impuesto), total: false });
    for (const [k, c] of [["Ke COP", ref.ke], ["WACC COP", ref.w], ["WACC USD", ref.wu]])
        assert.ok(Math.abs(numero(r[k]) - numero(c)) <= 0.0002, `${k} de la calculadora ≠ tabla en CIIU ${s.ciiu_division} ${tam}: ${numero(r[k])} / ${numero(c)}`);
    n++;
}
assert.ok(n > 200);
// Regla de tamaño de Tu empresa = regla de las tablas (Ley 905, activos en SMMLV de 2025: 1.423.500)
assert.equal(tamanoPorActivos(500 * 1_423_500, 2025), "Micro");
assert.equal(tamanoPorActivos(501 * 1_423_500, 2025), "Pequeña");
assert.equal(tamanoPorActivos(30_000 * 1_423_500, 2025), "Mediana");
assert.equal(tamanoPorActivos(30_001 * 1_423_500, 2025), "Grande");
assert.equal(tamanoPorActivos(0, 2025), null);
console.log(`OK alineación: calculadora = tabla en ${n} casos (Ke, WACC COP y USD); tamaño por activos según Ley 905.`);
