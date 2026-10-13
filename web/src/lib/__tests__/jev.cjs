/* eslint-disable @typescript-eslint/no-require-imports -- Simulación local sin red ni dependencias adicionales. */
const assert = require("node:assert/strict"), Module = require("node:module"), React = require("react"), ExcelJS = require("exceljs");
const { renderToStaticMarkup } = require("react-dom/server");
const { pdfDocumento } = require("../documento.ts");
const { documentoWorkbook } = require("../documento-excel.ts");
const { creditoWorkbook, proyectoWorkbook } = require("../calc-excel.ts");
const { documentoWacc, waccWorkbook } = require("../wacc-documento.ts");
const { decidir, sugerirSector, VEREDICTO } = require("../jev.ts");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// Ejecuta los hooks del componente con estado persistente y limpieza de efectos.
// El árbol resultante se renderiza con React SSR real. No simula DOM ni navegador.
function montar(Component, hooks) {
    const slots = [], effects = []; let index = 0, pending = [];
    hooks.useState = initial => {
        const i = index++;
        if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
        return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }];
    };
    hooks.useRef = initial => { const i = index++; return slots[i] ?? (slots[i] = { current: initial }); };
    hooks.useEffect = (effect, deps) => {
        const i = index++, previous = effects[i];
        if (!previous || deps.some((d, j) => !Object.is(d, previous.deps[j]))) {
            previous?.cleanup?.();
            pending.push(() => { effects[i] = { deps, cleanup: effect() }; });
        }
    };
    return {
        render(props) { index = 0; pending = []; const tree = Component(props); pending.forEach(f => f()); return tree; },
        unmount() { effects.forEach(e => e?.cleanup?.()); },
    };
}
function buscar(tree, predicate) {
    if (!tree || typeof tree !== "object") return undefined;
    if (predicate(tree)) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) { const found = buscar(child, predicate); if (found) return found; }
}
const html = tree => renderToStaticMarkup(tree);
const decision = { veredicto: "con_reservas", decision: "Compare el costo con su capacidad de pago.", recomendaciones: ["Revise el plazo elegido."], alertas: ["Compruebe los supuestos."] };

module.exports = async function probarJev({ docs, mercado, credito, proyecto, entradaModelo }) {
    const fetchOriginal = global.fetch, loadOriginal = Module._load;
    const hooks = { ...React };
    const archivo = require.resolve("../../components/DocumentoMirage.tsx"), selector = require.resolve("../../components/SelectorJev.tsx");
    const cached = require.cache[archivo], cachedSelector = require.cache[selector];
    delete require.cache[archivo]; delete require.cache[selector];
    Module._load = function(request, parent, main) {
        if (request === "react" && [archivo, selector].includes(parent?.filename)) return hooks;
        return loadOriginal.call(this, request, parent, main);
    };
    const { DocumentoMirage } = require(archivo), { SelectorJev } = require(selector);
    Module._load = loadOriginal;
    let mounted, selection;
    try {
        let calls = 0;
        global.fetch = async () => { calls++; return { ok: true, json: async () => ({ ok: true, resultado: decision }) }; };
        mounted = montar(DocumentoMirage, hooks);
        let exported;
        const props = { documento: { ...docs[1][0], conclusion: "Primera entrada de prueba JEV" }, excel: async doc => { exported = doc; } };
        let tree = mounted.render(props);
        assert.ok(!html(tree).includes("Recomendación"));
        assert.equal(calls, 0);
        // Cambiar antes de 1,5 segundos cancela la primera consulta.
        await pause(100);
        props.documento = { ...props.documento, conclusion: "Segunda entrada de prueba JEV" };
        tree = mounted.render(props);
        await pause(1600);
        tree = mounted.render(props);
        assert.equal(calls, 1);
        assert.ok(html(tree).includes("Recomendación")); assert.ok(html(tree).includes(decision.decision)); assert.ok(html(tree).includes("tono-alerta"));
        await buscar(tree, e => e.props?.children === "↓ Excel").props.run();
        assert.deepEqual(exported.jev, decision);
        await decidir(props.documento); assert.equal(calls, 1, "La misma entrada usa la caché");

        // Una respuesta anterior no se muestra después de cambiar la entrada.
        let finish;
        global.fetch = () => new Promise(resolve => { finish = resolve; });
        props.documento = { ...props.documento, conclusion: "Entrada pendiente de prueba JEV" };
        tree = mounted.render(props); assert.ok(!html(tree).includes("Recomendación"));
        await pause(1550);
        tree = mounted.render(props); assert.ok(html(tree).includes("Analizando…"));
        props.documento = { ...props.documento, conclusion: "Entrada fallida de prueba JEV" };
        mounted.render(props);
        finish({ ok: true, json: async () => ({ ok: true, resultado: decision }) });
        global.fetch = async () => { throw new Error("Fallo simulado"); };
        await pause(1600);
        tree = mounted.render(props);
        assert.ok(!html(tree).includes("Recomendación")); assert.ok(!html(tree).includes("Analizando…")); assert.ok(!html(tree).includes("Fallo simulado"));
        assert.ok(html(tree).includes("↓ PDF")); assert.ok(html(tree).includes("↓ Excel"));
        await buscar(tree, e => e.props?.children === "↓ Excel").props.run(); assert.equal(exported.jev, undefined);
        mounted.unmount();

        // El selector fija sector y tamaño; el fallo deja habilitado el botón.
        selection = montar(SelectorJev, hooks);
        let chosen;
        const selectProps = { sectores: mercado.sectores, elegir: r => { chosen = r; } };
        tree = selection.render(selectProps);
        buscar(tree, e => e.type === "input").props.onChange({ target: { value: "Comercio mediano" } });
        tree = selection.render(selectProps);
        global.fetch = async () => ({ ok: true, json: async () => ({ ok: true, resultado: { sector: 0, tamano: "Mediana", motivo: "La actividad corresponde al sector seleccionado." } }) });
        await buscar(tree, e => e.type === "button").props.onClick();
        tree = selection.render(selectProps);
        assert.equal(chosen.sector, 0); assert.equal(chosen.tamano, "Mediana"); assert.ok(html(tree).includes("tono-nota"));
        global.fetch = async () => { throw new Error("Fallo simulado"); };
        await buscar(tree, e => e.type === "button").props.onClick(); tree = selection.render(selectProps);
        assert.equal(buscar(tree, e => e.type === "button").props.disabled, false); assert.ok(!html(tree).includes("Fallo simulado"));
        global.fetch = async () => ({ ok: true, json: async () => ({ ok: true, resultado: { sector: 9999, tamano: "Inexistente", motivo: "Sin coincidencia" } }) });
        const invalid = await sugerirSector("Prueba", mercado.sectores, ["Mediana"]); assert.equal(invalid.sector, null); assert.equal(invalid.tamano, null);

        for (const [veredicto, tono] of [["favorable", "sube"], ["desfavorable", "baja"], ["con_reservas", "alerta"], ["informativo", "nota"]]) {
            mounted = montar(DocumentoMirage, hooks);
            tree = mounted.render({ documento: { ...docs[0][0], jev: { ...decision, veredicto } } });
            assert.ok(html(tree).includes(`tono-${tono}`)); assert.ok(html(tree).includes(VEREDICTO[veredicto])); mounted.unmount();
        }

        for (const [doc] of docs) {
            const plain = pdfDocumento(doc, {}, { comprimir: false }).output(); assert.ok(!plain.includes("RECOMENDACIÓN"));
            const pdf = pdfDocumento({ ...doc, jev: decision }, {}, { comprimir: false }).output();
            for (const text of ["RECOMENDACIÓN", "Con reservas", decision.decision, ...decision.recomendaciones, ...decision.alertas]) assert.ok(pdf.includes(text), text);
        }
        const filtered = mercado.sectores.filter(s => s.ciiu_division === "47");
        assert.equal(filtered.length, 1);
        for (const moneda of ["COP", "USD"]) for (const modalidad of ["nominal", "real"]) {
            const doc = documentoWacc(mercado, filtered, moneda, modalidad);
            assert.equal(doc.tablas[0].filas.length, 1); assert.equal(doc.tablas[0].filas[0][0], "47");
            const pdf = pdfDocumento(doc, {}, { comprimir: false }).output(); assert.ok(pdf.startsWith("%PDF-")); assert.ok(pdf.includes(mercado.meta.corte));
            const book = waccWorkbook(mercado, filtered, moneda, modalidad, doc);
            assert.equal(book.getWorksheet("WACC").getCell("A2").value, "47");
            assert.equal(book.getWorksheet("WACC").getCell("A3").value, null);
            await book.xlsx.writeBuffer();
        }
        const waccDoc = { ...documentoWacc(mercado, filtered, "COP", "nominal"), jev: decision };
        const books = [documentoWorkbook({ ...docs[0][0], jev: decision }), documentoWorkbook({ ...docs[1][0], jev: decision }), documentoWorkbook({ ...docs[2][0], jev: decision }), creditoWorkbook(credito, mercado.estilo, "", decision), proyectoWorkbook(proyecto, mercado.estilo, "", decision), proyectoWorkbook({ modo: "modelo", entrada: entradaModelo }, mercado.estilo, "", decision), waccWorkbook(mercado, filtered, "COP", "nominal", waccDoc)];
        for (const book of books) {
            const copy = new ExcelJS.Workbook(); await copy.xlsx.load(await book.xlsx.writeBuffer());
            const sheet = copy.getWorksheet("Recomendación"); assert.ok(sheet);
            assert.equal(sheet.getCell("B2").value, "Con reservas"); assert.equal(sheet.getCell("B3").value, decision.decision); assert.equal(sheet.getCell("B4").value, decision.recomendaciones[0]); assert.equal(sheet.getCell("B5").value, decision.alertas[0]);
            copy.eachSheet(s => assert.equal(s.getRow(s.rowCount).getCell(1).value, "Mirage by HyperTarget"));
        }
        for (const book of [documentoWorkbook(docs[1][0]), creditoWorkbook(credito, mercado.estilo), proyectoWorkbook(proyecto, mercado.estilo)]) assert.equal(book.getWorksheet("Recomendación"), undefined);
        console.log("OK JEV: respuesta simulada, debounce, caché, cambios de entrada, fallo silencioso, cuatro tonos, selector y PDF/Excel con y sin decisión; sectores filtrados en cuatro modalidades.");
    } finally {
        mounted?.unmount(); selection?.unmount(); global.fetch = fetchOriginal; Module._load = loadOriginal;
        delete require.cache[archivo]; delete require.cache[selector];
        if (cached) require.cache[archivo] = cached; if (cachedSelector) require.cache[selector] = cachedSelector;
    }
};
