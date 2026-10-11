/* eslint-disable @typescript-eslint/no-require-imports -- Prueba local con TypeScript instalado. */
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, f);
require.extensions[".tsx"] = require.extensions[".ts"];
const original = Module._load;
Module._load = function(request, parent, main) { if (request.startsWith("@/")) request = path.join(process.cwd(), "src", request.slice(2)); return original.call(this, request, parent, main); };
const read = n => JSON.parse(fs.readFileSync(`public/api/v1/${n}.json`, "utf8"));
const mercado = { meta: read("meta"), estilo: read("estilo"), parametros: read("parametros").parametros, ...read("sectores"), ...read("indicadores") };
const F = require("../finanzas/index.ts"), { calcular } = require("../calculadora.ts"), { fmt, celda, numero } = require("../api.ts");
const { armarDocumento, pdfDocumento, identificarDocumento, archivoDocumento } = require("../documento.ts");
const { documentoWorkbook } = require("../documento-excel.ts"), { creditoWorkbook, proyectoWorkbook } = require("../calc-excel.ts"), { tableWorkbook, pieCalculadora } = require("../excel.ts");
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server"), { DocumentoMirage } = require("../../components/DocumentoMirage.tsx");
const sector = mercado.sectores.find(s => s.ciiu_division === "47"), tamano = "Mediana";
const capital = { deuda: numero(sector.por_tamano[tamano].de) ?? numero(sector.de), patrimonio: 1, ebit: 20, gastos: 2, tarifa: numero(mercado.parametros.tasa_impuesto), total: false, primaTamano: false };
const rc = calcular(mercado.parametros, sector, tamano, capital);
const tasa = 0.14, desde = "NAMV", hacia = "EM", rt = { conversion: F.convertir(tasa, desde, hacia), equivalencias: F.equivalencias(tasa, desde) };
const entradaTVM = { P: -1000, F: 0, A: null, n: 4, i: 0.1 }, rv = F.resolver(entradaTVM);
const credito = { principal: 100000000, cuotas: 240, tasaPeriodica: 0.011666666666655168, sistema: "cuota_fija", periodosPorAnio: 12, desembolso: "2026-10-10" }, ra = F.amortizar(credito);
const proyecto = { modo: "flujos", a: [-10000,3000,3000,3000,3000,3000], b: [-25000,7400,7400,7400,7400,7400], k: 0.12 };
const rp = { ia: F.indicadores(proyecto.a, proyecto.k), ib: F.indicadores(proyecto.b, proyecto.k), cruce: F.tasaCruce(proyecto.a, proyecto.b) };
assert.equal(fmt(celda(ra.cuotaInicial,"x")), "1.243.520,81");
assert.equal(fmt(celda(rp.ia.vpn,"x")), "814,33");
assert.ok(Math.abs(rt.conversion - credito.tasaPeriodica) < 1e-12);
const docs = [
    [armarDocumento("capital", { mercado, entrada: capital, sector: `${sector.ciiu_division} · ${sector.nombre}`, tamano }, rc, "Empresa / Bogotá: SAS"), fmt(rc["WACC COP"])],
    [armarDocumento("tasas", { mercado, tasa, desde, hacia }, rt, "Empresa"), fmt(celda(rt.conversion))],
    [armarDocumento("tvm", { mercado, entrada: entradaTVM }, rv, "Empresa"), fmt(celda(rv.valor,"x"))],
    [armarDocumento("creditos", { mercado, entrada: credito }, ra, "Empresa"), "1.243.520,81"],
    [armarDocumento("proyectos", { mercado, entrada: proyecto }, rp, "Empresa"), "814,33"]
];
// Extrae las cadenas literales de doc.output(), uniendo las líneas partidas por el ancho carta.
function textoPDF(output) {
    return [...output.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(m => m[1].replace(/\\([()\\])/g, "$1")).join(" ");
}
for (const [neutral, cifra] of docs) {
    assert.ok(neutral.conclusion.includes(cifra));
    const doc = identificarDocumento(neutral, new Date("2026-10-10T17:00:00Z"));
    assert.match(doc.numero, /^MRG-20261010-[A-Z0-9]{4}$/);
    const pdf = pdfDocumento(doc, {}, {comprimir: false}); assert.ok(pdf.getNumberOfPages() > 0);
    const output = pdf.output(), texto = textoPDF(output);
    assert.ok(output.startsWith("%PDF-"));
    assert.ok(output.includes("Mirage by HyperTarget")); assert.ok(output.includes(doc.titulo)); assert.ok(output.includes("Página 1 de"));
    assert.ok(texto.includes(doc.conclusion), doc.seccion + ": conclusión completa en PDF");
    assert.ok(texto.includes(cifra));
    assert.equal((output.match(/Mirage by HyperTarget\) Tj/g) || []).length, pdf.getNumberOfPages());
    for (let page = 1; page <= pdf.getNumberOfPages(); page++) assert.ok(output.includes(`Página ${page} de ${pdf.getNumberOfPages()}`));
    const html = renderToStaticMarkup(React.createElement(DocumentoMirage, { documento: doc, excel: async () => {} }));
    assert.ok(html.includes(doc.titulo)); assert.ok(html.includes(doc.conclusion)); assert.ok(html.includes("↓ PDF")); assert.ok(html.includes("↓ Excel")); assert.ok(html.includes("/hypertarget-symbol-black.svg"));
    assert.ok(!/\bAPI\b|\bmotor\b|\.json/.test(html));
    assert.match(archivoDocumento(doc), /^Mirage-.*-2026-10-10\.pdf$/); assert.ok(!/[<>:"/\\|?*]/.test(archivoDocumento(doc)));
    assert.equal(pdf.internal.pageSize.getWidth().toFixed(1), "215.9"); assert.equal(pdf.internal.pageSize.getHeight().toFixed(1), "279.4");
    console.log(`OK PDF ${doc.titulo}: ${pdf.getNumberOfPages()} páginas; cifra ${cifra}; conclusión completa y pie en todas las páginas.`);
}
assert.equal(docs[3][0].tablas[0].filas.length, 8);
assert.ok(docs[3][0].tablas[0].nota.includes("241 filas completas"));
assert.equal(docs[3][0].tablas[0].filas.at(-1)[0], "240");
for (const w of [pieCalculadora(tableWorkbook(mercado,["Concepto","Valor"],docs[0][0].resultados.map(f => [f.concepto,f.cifra]),"Memo"), mercado.estilo), documentoWorkbook(docs[1][0]), documentoWorkbook(docs[2][0]), creditoWorkbook(credito,mercado.estilo), proyectoWorkbook(proyecto,mercado.estilo)]) {
    w.eachSheet(s => assert.equal(s.getRow(s.rowCount).getCell(1).value, "Mirage by HyperTarget"));
}
// Casos largos y las variantes existentes: paginación, tasa variable, indexación y modelo.
const variable = { ...credito, cuotas: 12, tasaPeriodica: Array(12).fill(0.01), indexacion: { unidad: "UVR", valorInicial: 400, variacionAnual: 0.04 }, tasaVariable: "recalcular" };
const dv = armarDocumento("creditos", { mercado, entrada: variable, tipo: "UVR" }, F.amortizar(variable));
assert.ok(dv.resultados.some(f => f.concepto === "Total pagado en pesos")); assert.ok(dv.tablas.some(t => t.titulo === "Tasas por periodo"));
assert.ok(pdfDocumento(dv, {}, {comprimir: false}).getNumberOfPages() > 0);
const entradaModelo = { horizonte: 5, ventas: 100000, crecimiento: 0.03, costoVentas: 0.4, gastosAdmonVentas: 0.1, activos: [{ nombre: "Equipo", valor: 10000, vidaUtil: 5 }], ktnoSobreVentas: 0.1, tasaImpuesto: 0.35, tmrr: 0.15 };
const rm = F.modeloProyecto(entradaModelo), dm = armarDocumento("proyectos", { mercado, entrada: { modo: "modelo", entrada: entradaModelo } }, rm);
assert.ok(dm.conclusion.includes(fmt(celda(rm.evaluaciones.proyectoConFinanciacion.vpn,"x")))); assert.ok(pdfDocumento(dm, {}, {comprimir: false}).getNumberOfPages() > 0);
const largo = { ...docs[0][0], supuestos: Array.from({ length: 180 }, (_, j) => ({ concepto: `Supuesto ${j} · texto largo repetido para comprobar el salto de página`, cifra: celda(j,"x","insumo") })) };
const pl = pdfDocumento(largo, {}, {comprimir: false}), out = pl.output(); assert.ok(pl.getNumberOfPages() > 4);
for (let n = 1; n <= pl.getNumberOfPages(); n++) assert.ok(out.includes(`Página ${n} de ${pl.getNumberOfPages()}`));
console.log("OK: 5 documentos, cifras exactas del cálculo, vista previa compartida, pies Excel, variantes y PDF multipágina sin canvas ni red.");
