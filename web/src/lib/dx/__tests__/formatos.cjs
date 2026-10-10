/* eslint-disable @typescript-eslint/no-require-imports -- Runner CommonJS local para transpilar TypeScript sin instalar nada. */
// Prueba el DX con estados financieros de distintos formatos, como los cargaría un usuario.
// Ejecutar: node src/lib/dx/__tests__/formatos.cjs <carpeta con archivos y esperado.json>
// Por defecto usa src/lib/dx/__tests__/formatos/ (estados reales de Supersociedades y formatos comunes).
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript"), XLSX = require("xlsx");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, f);
require.extensions[".tsx"] = require.extensions[".ts"];
const { parseWorkbook, buildCompany, runModel, buildWorkbook, M } = require("../engine.ts");
const { defaultsFor } = require("../defaults.ts");
const { leerArchivo } = (() => { try { return require("../leer.ts"); } catch { return {}; } })();

const dir = process.argv[2] || path.join(__dirname, "formatos");
const read = n => JSON.parse(fs.readFileSync(path.join("public/api/v1", n + ".json"), "utf8"));
const datos = { meta: read("meta"), estilo: read("estilo"), parametros: read("parametros").parametros, ...read("sectores") };
const esperado = JSON.parse(fs.readFileSync(path.join(dir, "esperado.json"), "utf8"));
const si = Math.max(0, datos.sectores.findIndex(s => s.ciiu_division === "47"));

const filas = [];
let fallas = 0;
for (const f of fs.readdirSync(dir).filter(f => /\.(xlsx|csv)$/i.test(f)).sort()) {
    const clave = f.split("_v")[0];
    const esp = esperado[clave];
    const r = { archivo: f };
    try {
        const buf = fs.readFileSync(path.join(dir, f));
        // La página lee con la misma función (leerArchivo si existe; si no, XLSX.read como hoy)
        const wb = leerArchivo ? leerArchivo(buf, f) : XLSX.read(buf, { type: "buffer" });
        const p = parseWorkbook(wb, f);
        r.anios = p.years.join("–"); r.unidad = p.unit; r.moneda = p.cur; r.nombre = p.name;
        const c = buildCompany(p, { name: p.name || "Empresa", cur: p.cur, unit: p.unit, country: "Colombia", sectorName: datos.sectores[si].nombre, bu: datos.sectores[si].beta_desapalancada.v, fx: 4000 });
        const m = M(c, c.years.length - 1);
        const s = defaultsFor(c, datos, si, "Mediana"), R = runModel(c, s, datos);
        r.wacc = R.w; r.hojas = buildWorkbook(c, s, R, p, datos).worksheets.length;
        const errores = [];
        if (esp) for (const k of ["rev", "ebit", "ni", "ta", "eq", "tl", "debt"]) {
            const e = esp[k] ?? 0, v = m[k === "tl" ? "tl" : k];
            const ok = v != null && Math.abs(Math.abs(v) - Math.abs(e)) <= Math.max(1, Math.abs(e) * 0.005);
            if (!ok) errores.push(`${k}: leído ${v} vs ${e}`);
        }
        if (!Number.isFinite(R.w)) errores.push("WACC no finito");
        if (r.hojas !== 13) errores.push(`Excel con ${r.hojas} hojas`);
        r.resultado = errores.length ? "FALLA" : "OK"; r.detalle = errores.join("; ");
    } catch (e) {
        r.resultado = "ERROR"; r.detalle = e.message;
    }
    if (r.resultado !== "OK") fallas++;
    filas.push(r);
}
for (const r of filas) console.log(`${r.resultado.padEnd(5)} ${r.archivo.padEnd(38)} ${String(r.anios ?? "").padEnd(10)} ${String(r.unidad ?? "").padEnd(9)} ${String(r.moneda ?? "").padEnd(4)} WACC ${r.wacc != null ? (r.wacc * 100).toFixed(2) + " %" : "—"}  ${r.nombre ? "«" + r.nombre + "»" : ""} ${r.detalle ?? ""}`);
console.log(`\n${filas.length - fallas}/${filas.length} archivos leídos correctamente.`);
process.exitCode = fallas ? 1 : 0;
