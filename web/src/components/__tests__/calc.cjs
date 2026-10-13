/* eslint-disable @typescript-eslint/no-require-imports -- Runner local sin instalaciones. */
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), ExcelJS = require("exceljs"), XLSX = require("xlsx"), React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, f);
require.extensions[".tsx"] = require.extensions[".ts"];
const read = n => JSON.parse(fs.readFileSync(`public/api/v1/${n}.json`, "utf8"));
const datos = { meta: read("meta"), estilo: read("estilo"), parametros: read("parametros").parametros, ...read("sectores"), ...read("indicadores") };
const originalLoad = Module._load;
let seed = x => x;
const hooks = { ...React, useState: x => React.useState(seed(x)) };
Module._load = function(request, parent, main) {
    if (request === "./Mirage" && parent.filename.includes("components")) return { useDatos: () => datos };
    if (request === "react" && parent.filename.includes(path.join("src", "components"))) return hooks;
    if (request.startsWith("@/")) request = path.join(process.cwd(), "src", request.slice(2));
    return originalLoad.call(this, request, parent, main);
};
const F = require("../../lib/finanzas/index.ts"), { creditoWorkbook, proyectoWorkbook } = require("../../lib/calc-excel.ts"), { nombreArchivo, proponerEmpresa } = require("../../lib/nombres.ts");
const { Calculadora, SECCIONES, leerSeccion } = require("../CalcSecciones.tsx"), { Tasas, ValorDinero } = require("../CalcTasas.tsx"), { Creditos } = require("../CalcCreditos.tsx"), { ProyectosFlujos, ProyectoModelo, BRIGHAM } = require("../CalcProyectos.tsx");
const { Wacc } = require("../Wacc.tsx");
const approx = (a, b, tolerance = 1e-7) => assert.ok(Number.isFinite(a) && Math.abs(a - b) < tolerance, `${a} != ${b}`);
const roundtrip = async w => { const re = new ExcelJS.Workbook(); await re.xlsx.load(await w.xlsx.writeBuffer()); return re; };
function render(C, props = {}, fixture = x => x) {
    seed = fixture;
    try { return renderToStaticMarkup(React.createElement(C, props)); } finally { seed = x => x; }
}
// Evalúa referencias vivas, incluidos nombres y referencias estructuradas, sin usar cachés.
function evaluar(w, sheet, address, stack = new Set(), cache = new Map()) {
    const key = `${sheet}!${address.replace(/\$/g, "")}`;
    assert.ok(!stack.has(key), "Referencia circular: " + key);
    if (cache.has(key)) return cache.get(key);
    const ws = w.getWorksheet(sheet), cell = ws.getCell(address.replace(/\$/g, ""));
    if (!cell.formula) return typeof cell.value === "number" ? cell.value : cell.value === true ? true : 0;
    const next = new Set(stack); next.add(key);
    const values = [], hold = value => { const k = values.length; values.push(value); return `__${k}__`; };
    const at = (s, a) => evaluar(w, s, a, next, cache);
    const range = (s, a, b) => { const aw = w.getWorksheet(s), ca = aw.getCell(a), cb = aw.getCell(b), vals = []; for (let row = ca.row; row <= cb.row; row++) for (let col = ca.col; col <= cb.col; col++) vals.push(at(s, aw.getCell(row, col).address)); return vals; };
    let expr = cell.formula;
    // Referencias estructuradas de la tabla de amortización.
    expr = expr.replace(/(?:[A-Za-z_][\w.]*\[\[#This Row\],\[([^\]]+)\]\]|\[@\[([^\]]+)\]\])/g, (_, a, b) => { const column = a ?? b;
        const table = Object.values(ws.getTables())[0], col = table.table.columns.findIndex(c => c.name === column) + 1;
        assert.ok(col > 0); return hold(at(sheet, ws.getCell(cell.row, col).address));
    });
    expr = expr.replace(/Credito\[([^\]]+)\]/g, (_, column) => {
        const table = w.getWorksheet("Amortización").getTable("Credito"), col = table.table.columns.findIndex(c => c.name === column) + 1;
        const end = Number(table.table.tableRef.split(":")[1].replace(/^[A-Z]+/, ""));
        assert.ok(col > 0); return hold(Array.from({ length: end - 3 }, (_, j) => at("Amortización", w.getWorksheet("Amortización").getCell(j + 4, col).address)));
    });
    expr = expr.replace(/(?:(?:'([^']+)'|([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_ ]*))!)?(\$?[A-Z]{1,3}\$?\d+):(\$?[A-Z]{1,3}\$?\d+)/g, (_, quoted, named, a, b) => hold(range(quoted || named || sheet, a.replace(/\$/g, ""), b.replace(/\$/g, ""))));
    expr = expr.replace(/(?:(?:'([^']+)'|([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_ ]*))!)?(\$?[A-Z]{1,3}\$?\d+)/g, (_, quoted, named, a) => hold(at(quoted || named || sheet, a)));
    expr = expr.replace(/\b[A-Za-z][A-Za-z0-9_]*\b/g, token => {
        const ranges = w.definedNames.getRanges(token).ranges;
        if (!ranges?.length) return token;
        const match = ranges[0].match(/^(?:'([^']+)'|([^!]+))!(.+)$/);
        assert.ok(match, ranges[0]); return hold(at(match[1] || match[2], match[3]));
    });
    expr = expr.replace(/__(\d+)__/g, (_, i) => `(${JSON.stringify(values[Number(i)])})`).replace(/\^/g, "**").replace(/<>/g, "!==").replace(/(?<![<>=!])=(?!=)/g, "===");
    const funcs = {
        IF: (c, a, b) => c ? a : b, AND: (...v) => v.every(Boolean), ABS: Math.abs, MAX: Math.max, MIN: Math.min,
        SUM: (...v) => v.flat().reduce((s, x) => s + x, 0), COUNT: (...v) => v.flat().filter(x => typeof x === "number").length,
        SUMPRODUCT: (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), PMT: F.pago, IRR: F.tir,
        NPV: (k, a) => F.vpn(k, [0, ...a]), MIRR: F.tirm, TRUE: () => true, NA: () => NaN, IFERROR: (a, b) => Number.isFinite(a) ? a : b,
    };
    assert.ok(/^[0-9eE+*\/().,[\]<>=!_ A-Za-z-]+$/.test(expr), expr);
    const result = Function(...Object.keys(funcs), `return (${expr})`)(...Object.values(funcs));
    cache.set(key, result); return result;
}
(async () => {
    for (const [key, label] of SECCIONES) {
        const html = render(Calculadora, { inicial: key });
        assert.ok(html.includes('role="tablist"')); assert.equal((html.match(/role="tab"/g) || []).length, 5);
        assert.ok(html.includes(`id="tab-${key}" role="tab" aria-selected="true"`), label);
        assert.ok(html.includes(`id="panel-${key}" aria-labelledby="tab-${key}" tabindex="0"`), label);
        assert.equal((html.match(/Empresa o proyecto \(opcional\)/g) || []).length, 1);
        assert.ok(html.indexOf("</h1>") < html.indexOf('class="company-field"'));
        assert.ok(html.indexOf('class="company-field"') < html.indexOf('class="calc-tabs"'));
        let companySeeded = false;
        const named = render(Calculadora, { inicial: key }, x => { if (x === "" && !companySeeded) { companySeeded = true; return "Empresa manual"; } return x; });
        assert.equal((named.match(/Empresa o proyecto: Empresa manual/g) || []).length, 5);
        assert.equal((html.match(/↓ PDF/g) || []).length, 5); assert.equal((html.match(/↓ Excel/g) || []).length, 5);
    }
    // Ejecuta los callbacks reales de Excel sin escribir archivos ni abrir el navegador.
    const { CostoCapital } = require("../Calculadora.tsx"), { DocumentoMirage } = require("../DocumentoMirage.tsx");
    const excel = require("../../lib/excel.ts"), save = excel.saveWorkbook, originalHooks = { useState: hooks.useState, useRef: hooks.useRef, useMemo: hooks.useMemo, useEffect: hooks.useEffect };
    const company = "Empresa / Bogotá: SAS", decision = { veredicto: "informativo", decision: "Revisar supuestos", recomendaciones: ["Comparar escenarios"], alertas: [] };
    const find = tree => {
        if (!tree || typeof tree !== "object") return undefined;
        if (tree.type === DocumentoMirage) return tree;
        for (const child of React.Children.toArray(tree.props?.children)) { const found = find(child); if (found) return found; }
    };
    try {
        hooks.useState = x => [typeof x === "function" ? x() : x, () => {}];
        for (const [component, props] of [[CostoCapital, { sector: datos.sectores[0].ciiu_division, tamano: "Mediana", setSector() {}, setTamano() {} }], [Tasas, {}], [ValorDinero, {}], [Creditos, {}], [ProyectosFlujos, {}], [ProyectoModelo, { sector: datos.sectores[0] }]]) {
            const preview = find(component({ ...props, empresa: company }));
            assert.ok(preview, component.name); assert.equal(preview.props.documento.empresa, company);
            let exported;
            excel.saveWorkbook = async (book, filename) => { exported = { book: await roundtrip(book), filename }; };
            await preview.props.excel({ ...preview.props.documento, jev: decision });
            assert.ok(exported.book.title.includes(company), component.name);
            assert.ok(exported.filename.includes("Empresa---Bogotá--SAS"), exported.filename);
            assert.ok(!/[<>:"/\\|?*]/.test(exported.filename));
            assert.equal(exported.book.getWorksheet("Recomendación").getCell("B3").value, decision.decision);
            const sheet = exported.book.worksheets[0];
            assert.ok(JSON.stringify(sheet.getSheetValues()).includes(company));
        }
        hooks.useRef = x => ({ current: x }); hooks.useMemo = fn => fn(); hooks.useEffect = () => {};
        let exportedWacc;
        excel.saveWorkbook = async (book, filename) => { exportedWacc = { book, filename }; };
        const wacc = find(Wacc()); assert.equal(wacc.props.documento.empresa, "");
        await wacc.props.excel(wacc.props.documento);
        assert.match(exportedWacc.filename, /^Mirage-WACC-\d{4}-\d{2}-\d{2}\.xlsx$/);
        assert.ok(!JSON.stringify(exportedWacc.book.getWorksheet("WACC").getSheetValues()).includes("Empresa o proyecto"));
    } finally { Object.assign(hooks, originalHooks); excel.saveWorkbook = save; }
    assert.equal(leerSeccion("?seccion=creditos"), "creditos"); assert.equal(leerSeccion("?seccion=inexistente"), "capital");
    for (const [component, props, cifra] of [[Tasas, {}, "1,17"], [ValorDinero, {}, "315,47"], [Creditos, {}, "1.243.520,81"], [ProyectosFlujos, {}, "814,33"], [ProyectoModelo, { sector: datos.sectores[0] }, "Inversión inicial"], [Wacc, {}, "Costo de capital por sector"]]) {
        const preview = render(component, props);
        assert.ok(preview.includes("↓ PDF")); assert.ok(preview.includes("↓ Excel")); assert.ok(preview.includes(cifra), cifra);
        assert.ok(!preview.includes("Empresa o proyecto"));
    }
    assert.ok(render(Tasas, {}, x => x === "" ? "12" : x).includes("Equivalencias"));
    assert.ok(render(ValorDinero, {}, x => x && typeof x === "object" && "P" in x ? { P: "1000", F: "0", A: "", n: "4", i: "10" } : x).includes("315,47"));
    const badTVM = render(ValorDinero, {}, x => x && typeof x === "object" && "P" in x ? { P: "1000", F: "0", A: "", n: "0", i: "10" } : x);
    assert.ok(badTVM.includes('role="alert"')); assert.ok(badTVM.includes("no puede ser cero"));
    const creditHtml = render(Creditos, {}, x => x && typeof x === "object" && "activo" in x ? { ...x, activo: "1000", anios: "4", tasa: "10" } : x === 12 ? 1 : x === "NAMV" ? "EA" : x === false ? true : x);
    assert.ok(creditHtml.includes("315,47")); assert.ok(creditHtml.includes("<svg")); assert.ok(creditHtml.includes("Comparación de sistemas"));
    const projectHtml = render(ProyectosFlujos, { ejemplo: true });
    assert.ok(projectHtml.includes("814,33")); assert.ok(projectHtml.includes("Perfil del VPN")); assert.ok(projectHtml.includes("Cruce"));
    const sector = datos.sectores[0];
    assert.ok(render(ProyectoModelo, { sector }).includes("Tramos de deuda"));
    const modelHtml = render(ProyectoModelo, { sector }, x => x && typeof x === "object" && "vidaDiferidos" in x ? { ...x, ventas: "1000000" } : x);
    for (const text of ["Estructura de capital", "FCL del proyecto descontado al costo de capital", "FCL del proyecto descontado a la TMRR", "FCL del inversionista", "EVA"]) assert.ok(modelHtml.includes(text), text);
    const credit = { principal: 1000, cuotas: 4, tasaPeriodica: 0.1, sistema: "cuota_fija", periodosPorAnio: 1, desembolso: "2026-10-10" };
    const cw = await roundtrip(creditoWorkbook(credit, datos.estilo, "Empresa manual"));
    assert.deepEqual(cw.worksheets.map(s => s.name), ["Datos", "Amortización", "Controles"]);
    assert.equal(cw.title, "Créditos · Empresa manual"); assert.equal(cw.creator, "Mirage · HyperTarget");
    for (const name of ["Principal", "nCuotas", "TasaPer", "Cuota"]) assert.equal(cw.definedNames.getRanges(name).ranges.length, 1);
    assert.ok(cw.getWorksheet("Amortización").getTable("Credito"));
    assert.equal(cw.getWorksheet("Amortización").getCell("H5").formula, "Credito[[#This Row],[Saldo Inicial]]*Credito[[#This Row],[Tasa]]");
    approx(cw.getWorksheet("Datos").getCell("B6").result, 315.47080370609083);
    approx(evaluar(cw, "Datos", "B6"), F.amortizar(credit).cuotaInicial);
    assert.equal(cw.getWorksheet("Controles").getCell("B2").result, true); assert.equal(cw.getWorksheet("Controles").getCell("B3").result, true);
    assert.equal(evaluar(cw, "Controles", "B2"), true); assert.equal(evaluar(cw, "Controles", "B3"), true);
    // Cambiar Principal sí recalcula las fórmulas de cuota, sin usar su caché.
    cw.getWorksheet("Datos").getCell("B3").value = 2000; approx(evaluar(cw, "Datos", "B6"), F.amortizar({ ...credit, principal: 2000 }).cuotaInicial);
    for (const sistema of Object.keys(F.SISTEMAS)) for (const tasaVariable of ["ajuste_final", "recalcular"]) {
        const e = { ...credit, sistema, tasaVariable, gracia: 1, tasaPeriodica: [0.1, 0.12, 0.13, 0.14], indexacion: { unidad: "UVR", valorInicial: 400, variacionAnual: 0.05 } }, r = F.amortizar(e), w = await roundtrip(creditoWorkbook(e, datos.estilo, "Empresa manual"));
        r.filas.forEach((f, j) => {
            const row = j + 4;
            for (const [col, v] of [["D", f.egreso], ["H", f.intereses], ["I", f.abonoCapital], ["J", f.saldoFinal], ["K", f.indice], ["L", f.egresoPesos], ["M", f.saldoFinalPesos]]) {
                approx(w.getWorksheet("Amortización").getCell(`${col}${row}`).result, v, 1e-6); approx(evaluar(w, "Amortización", `${col}${row}`), v, 1e-6);
            }
        });
        approx(evaluar(w, "Datos", "B15"), r.costoEA, 1e-6); approx(evaluar(w, "Datos", "B16"), r.costoEAPesos, 1e-6);
        assert.equal(evaluar(w, "Controles", "B2"), true); assert.equal(evaluar(w, "Controles", "B3"), true);
    }
    const pw = await roundtrip(proyectoWorkbook({ modo: "flujos", ...BRIGHAM }, datos.estilo, "Empresa manual"));
    assert.deepEqual(pw.worksheets.map(s => s.name), ["Supuestos", "FCL", "Deuda", "Evaluación", "Controles"]);
    approx(pw.getWorksheet("Evaluación").getCell("B3").result, 814.33, 0.005);
    assert.ok(pw.getWorksheet("Evaluación").getCell("B3").formula.includes("NPV")); assert.ok(pw.getWorksheet("Evaluación").getCell("C3").formula.includes("IRR")); assert.ok(pw.getWorksheet("Evaluación").getCell("D3").formula.includes("MIRR"));
    approx(evaluar(pw, "Evaluación", "B3"), F.indicadores(BRIGHAM.a, BRIGHAM.k).vpn);
    pw.getWorksheet("Supuestos").getCell("B6").value = 6000; approx(evaluar(pw, "Evaluación", "B3"), F.indicadores([-10000, 6000, 3000, 3000, 3000, 3000], BRIGHAM.k).vpn);
    const model = { horizonte: 5, ventas: 1000000, crecimiento: 0.05, costoVentas: 0.55, gastosAdmonVentas: 0.15, gastosFijos: 10000, activos: [{ nombre: "Equipo", valor: 520000, vidaUtil: 3 }], diferidos: { valor: 20000, anios: 2 }, ktnoSobreVentas: 0.1, tasaImpuesto: datos.parametros.tasa_impuesto.v, deuda: [{ nombre: "Banco", proporcion: 0.3, tasaEA: 0.15, plazo: 5, sistema: "cuota_fija" }], tmrr: sector.ke.v };
    const mr = F.modeloProyecto(model), mw = await roundtrip(proyectoWorkbook({ modo: "modelo", entrada: model }, datos.estilo, "Empresa manual"));
    mr.anios.forEach((a, j) => { for (const [col, v] of [["P", a.fclProyecto], ["U", a.fclInversionista], ["V", a.capitalInvertido], ...(j ? [["W", a.eva]] : [])]) { approx(mw.getWorksheet("FCL").getCell(`${col}${j + 3}`).result, v, 1e-6); approx(evaluar(mw, "FCL", `${col}${j + 3}`), v, 1e-6); } });
    Object.values(mr.evaluaciones).forEach((r, j) => { approx(mw.getWorksheet("Evaluación").getCell(`C${j + 3}`).result, r.vpn); approx(evaluar(mw, "Evaluación", `C${j + 3}`), r.vpn); });
    assert.equal(evaluar(mw, "Controles", "B2"), true); assert.equal(evaluar(mw, "Controles", "B3"), true);
    mw.getWorksheet("Supuestos").getCell("B3").value = model.ventas * 2;
    const changed = F.modeloProyecto({ ...model, ventas: model.ventas * 2 });
    approx(evaluar(mw, "FCL", "P8"), changed.anios[5].fclProyecto, 1e-6);
    const { parseWorkbook, buildCompany, runModel, buildWorkbook } = require("../../lib/dx/engine.ts"), { defaultsFor } = require("../../lib/dx/defaults.ts");
    const p = parseWorkbook(XLSX.read(fs.readFileSync("public/ejemplos/Visa-2021-2025.xlsx")), "Visa-2021-2025.xlsx");
    assert.ok(/visa/i.test(p.name), p.name);
    assert.equal(proponerEmpresa(["SUPUESTOS PARA EL MODELO DE FLUJO DE CAJA LIBRE", "BALANCE GENERAL S.A.S.", "ANÁLISIS PYG"], "Mi-Empresa-2021-2025.xlsx"), "Mi Empresa");
    assert.equal(proponerEmpresa(["CONFECCIONES DEL CARIBE S.A.S."], "datos.xlsx"), "CONFECCIONES DEL CARIBE S.A.S.");
    const si = datos.sectores.findIndex(s => s.ciiu_division === "63");
    for (const empresa of ["Visa Inc.", "Empresa manual / Bogotá: SAS"]) {
        const company = buildCompany(p, { name: empresa, cur: "USD", unit: "millones", country: "Estados Unidos", sectorName: datos.sectores[si].nombre, bu: datos.sectores[si].beta_desapalancada.v }), sup = defaultsFor(company, datos, si, "Grande"), dx = await roundtrip(buildWorkbook(company, sup, runModel(company, sup, datos), p, datos));
        assert.equal(dx.worksheets.length, 14); assert.ok(dx.title.includes(empresa)); assert.equal(dx.creator, "Mirage · HyperTarget");
        dx.eachSheet(ws => { assert.ok(String(ws.getCell("A1").value).includes(empresa), ws.name); assert.ok(ws.headerFooter.oddHeader.includes(empresa)); });
        const file = nombreArchivo("DX", empresa, "2026-10-10"); assert.ok(file.startsWith("Mirage-DX-")); assert.ok(file.endsWith("-2026-10-10.xlsx")); assert.ok(!/[<>:"/\\|?*]/.test(file));
    }
    const { API_CALC } = require("../../lib/api-calc-docs.ts"), description = await require("../../../api/calc/[op].ts").GET(new Request("http://local.invalid/api/calc")).json();
    assert.deepEqual(API_CALC, description);
    const { tableWorkbook } = require("../../lib/excel.ts");
    for (const type of ["Memo", "WACC"]) {
        const w = await roundtrip(tableWorkbook(datos, ["Concepto", "Valor"], [["Sector", { v: sector.nombre, fmt: "txt", tono: "nota" }]], type, "Empresa manual"));
        assert.ok(w.title.includes("Empresa manual"));
        w.eachSheet(ws => { assert.ok(ws.headerFooter.oddHeader.includes("Empresa manual")); assert.equal(ws.getRow(ws.rowCount).getCell(2).value, "Empresa manual"); });
    }
    console.log("OK: 5 subsecciones React SSR; tasas, TVM y errores; comparación y SVG; créditos (4 sistemas, gracia, tasas variables, UVR); proyectos Flujos y Modelo; fórmulas recalculadas y cachés; cuota 315,4708; VPN S 814,33; DX Visa y nombre manual en 14 hojas; 9 ejemplos API idénticos al GET.");
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; });
