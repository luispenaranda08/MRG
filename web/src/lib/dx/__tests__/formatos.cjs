/* eslint-disable @typescript-eslint/no-require-imports -- Runner CommonJS local para transpilar TypeScript sin instalar nada. */
// Prueba el DX con estados financieros de distintos formatos, como los cargaría un usuario.
// Ejecutar: node src/lib/dx/__tests__/formatos.cjs <carpeta con archivos y esperado.json>
// Por defecto usa src/lib/dx/__tests__/formatos/ (estados reales de Supersociedades y formatos comunes).
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, f);
require.extensions[".tsx"] = require.extensions[".ts"];
const { buildCompany, runModel, buildWorkbook, M } = require("../engine.ts");
const { defaultsFor } = require("../defaults.ts");
const { leerEstados } = require("../formatos.ts");

const dir = process.argv[2] || path.join(__dirname, "formatos");
const read = n => JSON.parse(fs.readFileSync(path.join("public/api/v1", n + ".json"), "utf8"));
const datos = { meta: read("meta"), estilo: read("estilo"), parametros: read("parametros").parametros, ...read("sectores") };
const esperado = JSON.parse(fs.readFileSync(path.join(dir, "esperado.json"), "utf8"));
const si = Math.max(0, datos.sectores.findIndex(s => s.ciiu_division === "47"));

const filas = [];
let fallas = 0;
(async () => {
for (const f of fs.readdirSync(dir).filter(f => f !== "esperado.json" && !f.startsWith(".")).sort()) {
    const clave = f.split("_v")[0];
    const esp = esperado[clave];
    const r = { archivo: f };
    try {
        const buf = fs.readFileSync(path.join(dir, f));
        // La página lee con la misma función: un lector por formato y luego el motor
        const p = await leerEstados(buf, f);
        r.anios = p.years.join("–"); r.unidad = p.unit; r.moneda = p.cur; r.nombre = p.name;
        const c = buildCompany(p, { name: p.name || "Empresa", cur: p.cur, unit: p.unit, country: "Colombia", sectorName: datos.sectores[si].nombre, bu: datos.sectores[si].beta_desapalancada.v, fx: 4000 });
        const m = M(c, c.years.length - 1);
        const s = defaultsFor(c, datos, si, "Mediana"), R = runModel(c, s, datos);
        r.wacc = R.w; r.hojas = buildWorkbook(c, s, R, p, datos).worksheets.length;
        const errores = [];
        if (esp) for (const k of ["rev", "ebit", "ni", "ta", "eq", "tl", "debt"]) {
            const e = esp[k] ?? 0, v = m[k === "tl" ? "tl" : k];
            // XBRL e iXBRL vienen en pesos aunque el original esté en miles
            const cerca = x => Math.abs(Math.abs(x) - Math.abs(e)) <= Math.max(1, Math.abs(e) * 0.005);
            const ok = v != null && (cerca(v) || (p.unit === "unidades" && cerca(v / 1000)));
            if (!ok) errores.push(`${k}: leído ${v} vs ${e}`);
        }
        if (!Number.isFinite(R.w)) errores.push("WACC no finito");
        // Coherencia económica: WACC razonable y advertencias cuando el resultado no aplica
        if (!(R.w > 0.03 && R.w < 0.4)) errores.push(`WACC fuera de rango: ${R.w}`);
        if (!(R.wD >= 0 && R.wD <= 1)) errores.push(`peso de la deuda fuera de [0, 1]: ${R.wD}`);
        if (m.eq <= 0 && !R.alertas.some(a => /Patrimonio/.test(a.msg))) errores.push("sin advertencia de patrimonio negativo");
        if (m.ebit <= 0 && !R.alertas.some(a => /EBIT negativo/.test(a.msg))) errores.push("sin advertencia de EBIT negativo");
        if (s.growth.some(g => g > 20 || g < -10)) errores.push("crecimiento proyectado sin acotar");
        r.alertas = R.alertas.filter(a => a.sev !== "info").length;
        if (r.hojas !== 14) errores.push(`Excel con ${r.hojas} hojas`);
        r.resultado = errores.length ? "FALLA" : "OK"; r.detalle = errores.join("; ");
    } catch (e) {
        r.resultado = "ERROR"; r.detalle = e.message;
    }
    if (r.resultado !== "OK") fallas++;
    filas.push(r);
}
for (const r of filas) console.log(`${r.resultado.padEnd(5)} ${r.archivo.padEnd(38)} ${String(r.anios ?? "").padEnd(10)} ${String(r.unidad ?? "").padEnd(9)} ${String(r.moneda ?? "").padEnd(4)} WACC ${r.wacc != null ? (r.wacc * 100).toFixed(2) + " %" : "—"} alertas ${r.alertas ?? "—"}  ${r.nombre ? "«" + r.nombre + "»" : ""} ${r.detalle ?? ""}`);
console.log(`\n${filas.length - fallas}/${filas.length} archivos leídos correctamente.`);
process.exitCode = fallas ? 1 : 0;
})();
