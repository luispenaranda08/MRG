/* eslint-disable @typescript-eslint/no-require-imports -- Runner CommonJS local para transpilar TypeScript sin instalar nada. */
// Ejecutar: node src/lib/agentes/__tests__/agentes.cjs
// Pruebas doradas del constructor de agentes: casos de libro de texto (Ehrhardt y Brigham, hojas de cálculo de referencia del curso),
// coincidencia con el WACC sectorial publicado por Mirage, coherencia con el motor DX, falla cerrada, reglas,
// validador de cifras y ejecución completa de cada plantilla certificada con los dos archivos de ejemplo.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);

const A = require("../index.ts");
const { IMPLEMENTACIONES } = require("../bloques.ts");
const { runModel } = require("../../dx/engine.ts");
const { defaultsFor } = require("../../dx/defaults.ts");
const { fmt } = require("../../api.ts");

const leer = n => JSON.parse(fs.readFileSync(path.join("public/api/v1", n + ".json"), "utf8"));
const s = leer("sectores"), datos = { meta: leer("meta"), estilo: leer("estilo"), parametros: leer("parametros").parametros, sectores: s.sectores, metodo: s.metodo, indicadores: leer("indicadores").indicadores };

let pruebas = 0;
const cerca = (a, b, tol, msg) => { pruebas++; assert.ok(typeof a === "number" && Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b} (tol ${tol})`); };
const ok = (c, msg) => { pruebas++; assert.ok(c, msg); };
const bloque = (codigo, e) => IMPLEMENTACIONES[codigo](e, datos).cifras;

(async () => {
    // ---------- Catálogo ----------
    ok(A.CAPACIDADES.length === 100, "100 capacidades");
    ok(new Set(A.CAPACIDADES.map(c => c.codigo)).size === 100, "códigos únicos");
    ok(A.CAPACIDADES.every((c, i) => c.numero === i + 1), "numeradas de 1 a 100");
    const cert = A.capacidadesCertificadas();
    for (const c of cert) ok(A.validarAgente(A.plantilla(c.codigo)).length === 0, `plantilla ${c.codigo} sin errores: ${A.validarAgente(A.plantilla(c.codigo)).join(" ")}`);
    for (const b of A.DEF_BLOQUES) ok(typeof IMPLEMENTACIONES[b.codigo] === "function", `implementación de ${b.codigo}`);

    // ---------- Casos de libro ----------
    let r = bloque("AMORT", { principal: 1000, plazo_anios: 4, tasa_ea: 0.1, periodos_por_anio: "1", sistema: "cuota_fija" });
    cerca(r.cuota, 315.47080370609083, 1e-9, "AMORT: PAGO(10 %, 4, −1000)");
    cerca(r.costo_ea, 0.1, 1e-9, "AMORT: costo efectivo = tasa pactada sin comisiones");
    cerca(r.servicio_anio1, 315.47080370609083, 1e-9, "AMORT: servicio del primer año con un pago anual");
    r = bloque("AMORT", { principal: 1000, plazo_anios: 4, tasa_ea: 0.1, periodos_por_anio: "1", sistema: "cuota_fija", comisiones: 20 });
    ok(r.costo_ea_comisiones > 0.1 && r.desembolso_neto === 980, "AMORT: las comisiones suben el costo efectivo");
    r = bloque("FLU", { flujos: [-10000, 3000, 3000, 3000, 3000, 3000], k: 0.12 });
    cerca(r.vpn, 3000 * (1 - Math.pow(1.12, -5)) / 0.12 - 10000, 1e-6, "FLU: VPN anualidad");
    cerca(r.tir, 0.15238237, 1e-6, "FLU: TIR");
    r = bloque("DPP", { descuento: 0.02, dias_descuento: 10, dias_plazo: 30 });
    cerca(r.costo_ea, Math.pow(1 + 0.02 / 0.98, 365 / 20) - 1, 1e-12, "DPP: 2/10 neto 30 (Brigham ≈ 44,6 %)");
    cerca(r.costo_ea, 0.446, 0.001, "DPP: 44,6 %");
    r = bloque("CAP", { flujo: 130, servicio_actual: 50, servicio_nuevo: 50, dscr_minimo: 1.3 });
    cerca(r.dscr, 1.3, 1e-12, "CAP: DSCR"); cerca(r.holgura, 0, 1e-9, "CAP: holgura nula en el mínimo"); cerca(r.servicio_maximo_nuevo, 50, 1e-9, "CAP: servicio máximo");
    cerca(bloque("CUPO", { servicio_maximo: 100, tasa_ea: 0.1, plazo_anios: 5 }).cupo, 379.07867694084507, 1e-9, "CUPO: VA anualidad");
    cerca(bloque("TASA", { tasa: 0.14, desde: "NAMV", hacia: "EA" }).tasa, 0.14934202920715767, 1e-12, "TASA: 14 % NAMV → EA");
    cerca(bloque("REAL", { nominal: 0.1432, inflacion: 0.0561 }).real, 1.1432 / 1.0561 - 1, 1e-15, "REAL: Fisher");
    r = bloque("TVM", { P: 1000, F: 0, A: -315.47080370609083, n: 4, i: null });
    cerca(r.tasa, 0.1, 1e-9, "TVM: incógnita i");
    r = bloque("FACTORING", { valor: 1000, tasa_descuento: 0.02, comision: 0, dias: 30 });
    cerca(r.desembolso, 1000 / 1.02, 1e-9, "FACTORING: un mes a 2 %"); cerca(r.costo_ea, Math.pow(1.02, 365 / 30) - 1, 1e-9, "FACTORING: costo EA");

    // ---------- WACC del bloque = WACC sectorial publicado por Mirage ----------
    const p = datos.parametros, n = k => p[k].v;
    let comparados = 0;
    for (const sc of datos.sectores) {
        if ([sc.beta_desapalancada, sc.de, sc.kd, sc.wacc_cop_nominal].some(c => typeof c.v !== "number")) continue;
        const w = bloque("WACC", { beta_u: sc.beta_desapalancada.v, de: sc.de.v, tasa_impuesto: n("tasa_impuesto"), rf: n("rf_usd"), erp: n("erp_maduro"), crp: n("crp"), kd: sc.kd.v, inflacion_cop: n("inflacion_cop"), inflacion_usd: n("inflacion_usd") });
        cerca(w.ke, sc.ke.v, 0.0006, `WACC: Ke de ${sc.nombre}`);
        cerca(w.wacc_cop, sc.wacc_cop_nominal.v, 0.0006, `WACC: WACC COP de ${sc.nombre}`);
        comparados++;
    }
    ok(comparados >= 50, `WACC comparado con ${comparados} sectores publicados`);

    // ---------- Empresas de ejemplo ----------
    const si = d => datos.sectores.findIndex(x => x.ciiu_division === d);
    const pyme = await A.prepararEmpresa(fs.readFileSync("public/ejemplos/PYME-Confecciones-del-Caribe.xlsx"), "PYME-Confecciones-del-Caribe.xlsx", { sector: si("14"), tamano: "Pequeña", pais: "Colombia" }, datos);
    const visa = await A.prepararEmpresa(fs.readFileSync("public/ejemplos/Visa-2021-2025.xlsx"), "Visa-2021-2025.xlsx", { sector: si("63"), tamano: "Grande", pais: "Estados Unidos", nombreEmpresa: "Visa Inc." }, datos);
    ok(pyme.anios.length >= 2 && visa.anios.join() === "2021,2022,2023,2024,2025", "empresas preparadas");

    // Los bloques de empresa entregan exactamente lo que calcula el motor DX con los supuestos de Mirage.
    for (const emp of [pyme, visa]) {
        const R = runModel(emp.interno, defaultsFor(emp.interno, datos, emp.sector, emp.tamano), datos);
        cerca(bloque("WACCE", { empresa: emp }).wacc, R.w, 1e-12, `WACCE = motor DX (${emp.nombre})`);
        cerca(bloque("DCF", { empresa: emp }).valor_empresa, R.V.ev, 1e-6, `DCF = motor DX (${emp.nombre})`);
        cerca(bloque("EVA", { empresa: emp }).eva, R.EV.at(-1).eva, 1e-6, `EVA = motor DX (${emp.nombre})`);
        cerca(bloque("PD", { empresa: emp }).pd_1, R.pd.pd, 1e-12, `PD = motor DX (${emp.nombre})`);
        cerca(bloque("APAL", { empresa: emp, gastos_fijos: 1 }).gao, R.lev.gao, 1e-12, `GAO = motor DX (${emp.nombre})`);
        const d = bloque("DUPONT", { empresa: emp });
        cerca(d.margen_neto * d.rotacion * d.multiplicador, R.m.ni / R.m.eqA, 1e-9, `DuPont reconstruye el ROE (${emp.nombre})`);
        const dq = bloque("DQ", { empresa: emp });
        ok(dq.anios === emp.anios.length && dq.anios_cuadrados <= dq.anios, `DQ cuenta los años (${emp.nombre})`);
    }

    // ---------- Todas las plantillas certificadas se ejecutan completas con sus valores por defecto ----------
    const valoresPara = ag => Object.fromEntries(ag.entradas.map(c => [c.id, c.tipo === "estados" ? pyme : c.tipo === "sector" ? si("14") : c.defecto ?? null]));
    let completas = 0;
    for (const c of cert) {
        const ag = A.plantilla(c.codigo), ej = A.ejecutarAgente(ag, valoresPara(ag), datos);
        ok(ej.estado === "completa", `${c.codigo} se ejecuta completa: ${ej.detenida?.motivo ?? ""}`);
        const def = new Set(ag.pasos.flatMap(p => A.defBloque(p.bloque).salidas.map(x => `${p.id}.${x.id}`)));
        ok([...def].every(k => k in ej.cifras), `${c.codigo} produce todas sus salidas`);
        ok(ej.decision.reglas.length === ag.instruccion.reglas.length, `${c.codigo} evalúa todas sus reglas`);
        for (const ci of Object.values(ej.cifras)) ok(typeof fmt(A.formatoCifra(ci)) === "string", `${c.codigo}: cifra formateable`);
        completas++;
    }
    ok(completas === cert.length, "todas las certificadas completas");

    // ---------- Memo de crédito con Visa: cifras encadenadas y reglas ----------
    const cred = A.plantilla("CRED"), ejv = A.ejecutarAgente(cred, { ...valoresPara(cred), empresa: visa, monto: 5000 }, datos);
    ok(ejv.estado === "completa", "CRED con Visa");
    cerca(ejv.cifras["cap.servicio_total"].v, ejv.cifras["rat.intereses"].v + ejv.cifras["amort.servicio_anio1"].v, 1e-6, "CRED: servicio total = intereses actuales + servicio nuevo");
    cerca(ejv.cifras["cap.dscr"].v, ejv.cifras["rat.flujo_deuda"].v / ejv.cifras["cap.servicio_total"].v, 1e-9, "CRED: DSCR encadenado");
    ok(ejv.cifras["rat.ingresos"].unidad === "USD millones", "CRED: unidad de la empresa en las cifras de dinero");
    ok(["aprobar", "condicionar", "negar"].includes(ejv.decision.efecto), "CRED: decisión por reglas");

    // El umbral del DSCR sale de la entrada «DSCR mínimo».
    const exigente = A.ejecutarAgente(cred, { ...valoresPara(cred), empresa: visa, monto: 5000, dscr_minimo: 1000 }, datos);
    const rd = exigente.decision.reglas.find(x => x.regla.cifra === "cap.dscr");
    ok(rd.regla.umbral === 1000 && !rd.cumple && exigente.decision.efecto !== "aprobar", "CRED: el DSCR mínimo de la entrada fija el umbral de la regla");
    const absurdo = A.ejecutarAgente(cred, { ...valoresPara(cred), empresa: pyme, monto: 8e12 }, datos);
    ok(absurdo.alertas.some(a => /unidad del monto/.test(a)), "CRED: alerta si el monto no está en la unidad de los estados");

    // ---------- Falla cerrada ----------
    let ej = A.ejecutarAgente(cred, { ...valoresPara(cred), empresa: null }, datos);
    ok(ej.estado === "detenida" && /Estados financieros/.test(ej.detenida.motivo), "falla cerrada sin estados");
    ej = A.ejecutarAgente(A.plantilla("FLU"), { flujos: [-1000], k: 0.1 }, datos);
    ok(ej.estado === "detenida" && /al menos dos periodos/.test(ej.detenida.motivo), "falla cerrada con un solo flujo");
    const roto = A.plantilla("RAT"); roto.pasos[0].bloque = "NOEXISTE";
    ok(A.ejecutarAgente(roto, { empresa: pyme }, datos).estado === "detenida", "falla cerrada con bloque inexistente");

    // ---------- Validador de cifras ----------
    const ejw = A.ejecutarAgente(A.plantilla("WACC"), { sector: si("14"), tamano: "Grande" }, datos);
    const w = ejw.cifras["wacc.wacc_cop"], b = ejw.cifras["wacc.beta_l"];
    const txt = `### Costo de capital\nEn 2026 el WACC COP es ${fmt(A.formatoCifra(w))} con beta de ${fmt(A.formatoCifra(b))}x. Según la NIC 36, la tasa es antes de impuestos.\n1. Revisar supuestos.\nUn WACC de 31,7 % no tiene respaldo.`;
    let v = A.validarTexto(txt, ejw);
    ok(v.respaldadas === 2, `validador: dos cifras respaldadas (${JSON.stringify(v.coincidencias.map(x => x.texto))})`);
    ok(v.sinRespaldo.length === 1 && v.sinRespaldo[0].texto.startsWith("31,7"), `validador: una sin respaldo (${JSON.stringify(v.sinRespaldo)})`);
    const ejm = A.ejecutarAgente(cred, { ...valoresPara(cred), empresa: visa, monto: 5000 }, datos), ing = ejm.cifras["rat.ingresos"].v;
    v = A.validarTexto(`Ingresos de USD ${fmt({ v: ing, fmt: "num" })} millones y también ${(ing / 1000).toFixed(1).replace(".", ",")} mil millones.`, ejm);
    ok(v.respaldadas === 2 && v.sinRespaldo.length === 0, `validador: escalas de millones y mil millones (${JSON.stringify(v)})`);

    const conMonto = { cifras: { "entrada.monto": { v: 500000, fmt: "num", etiqueta: "Monto", origen: {} } } };
    ok(["un crédito de 500.000 (COP miles)", "un crédito de 500.000 miles de pesos", "COP 500.000 miles"].every(t => A.validarTexto(t, conMonto).sinRespaldo.length === 0), "validador: monto de entrada seguido de la unidad de los estados");
    v = A.validarTexto("El sector 14 tiene un rating de 31,7 % sin respaldo.", ejw);
    ok(v.coincidencias.some(x => x.texto === "14" && x.clave === "sector.nombre") && v.sinRespaldo.length === 1, `validador: número dentro de una cifra de texto (${JSON.stringify(v)})`);
    const umbral = ejv.cifras["regla.pd_pd_1"];
    ok(umbral && umbral.v === 0.05 && umbral.origen.bloque === "REGLA", "los umbrales de las reglas quedan como cifras citables");

    // ---------- Componer: conexiones automáticas ----------
    // Cada plantilla rehecha solo con su lista de bloques debe ser válida y dar las mismas cifras con la PYME.
    let compuestas = 0;
    for (const c of cert) {
        const t = A.plantilla(c.codigo), ag = A.componer(t.pasos.map(p => p.bloque));
        ok(A.validarAgente(ag).length === 0, `componer ${c.codigo} es válido`);
        if (!t.entradas.some(e => e.tipo === "estados") || t.entradas.some(e => e.requerido && e.tipo !== "estados" && e.defecto === undefined)) continue;
        const vt = { empresa: pyme }, va = { empresa: pyme };
        for (const e of t.entradas) if (e.defecto !== undefined) { vt[e.id] = e.defecto; if (ag.entradas.some(x => x.id === e.id)) va[e.id] = e.defecto; }
        const et = A.ejecutarAgente(t, vt, datos), ea = A.ejecutarAgente(ag, va, datos);
        if (et.estado !== "completa" || ea.estado !== "completa") continue;
        const porBloque = ej => Object.fromEntries(Object.values(ej.cifras).filter(x => x.origen.bloque !== "ENTRADA" && typeof x.v === "number").map(x => [`${x.origen.bloque}.${x.etiqueta}`, x.v]));
        const pt = porBloque(et), pa = porBloque(ea), comunes = Object.keys(pt).filter(k => k in pa);
        const distintas = comunes.filter(k => Math.abs(pt[k] - pa[k]) > 1e-9 * Math.max(1, Math.abs(pt[k])));
        if (!distintas.length) compuestas++;
        else console.log(`  componer ${c.codigo}: ${distintas.length} cifras distintas, p. ej. ${distintas.slice(0, 3).join(", ")}`);
    }
    console.log(`  componer: ${compuestas} plantillas con estados dan las mismas cifras`);
    const wacc = A.componer(["SECTOR", "WACC", "RAT", "EVA"]);
    ok(wacc.pasos[0].bloque === "MERCADO" || wacc.pasos.some(p => p.bloque === "MERCADO"), "componer agrega Parámetros de mercado como dependencia del WACC");
    ok(A.ejecutarAgente(wacc, { empresa: pyme }, datos).estado === "completa", "WACC + indicadores + EVA compuesto corre con la PYME");
    const waccE = A.componer(["SECTOR", "WACCE", "EVA", "RAT"]), ejwe = A.ejecutarAgente(waccE, { empresa: pyme }, datos);
    ok(ejwe.estado === "completa" && Object.values(ejwe.cifras).some(c => c.origen.bloque === "WACCE" && typeof c.v === "number"), `WACC de la empresa compuesto corre con la PYME (${ejwe.detenida?.motivo ?? "ok"})`);

    // ---------- Montos completos → unidad de los estados ----------
    const principal = ej => ej.pasos.find(p => p.paso === "amort")?.entrada.principal;
    const ejmc = A.ejecutarAgente(A.plantilla("CRED"), { empresa: pyme, monto: 800_000_000 }, datos);
    ok(ejmc.estado === "completa" && principal(ejmc) === 800_000, `800 millones con estados en miles → 800.000 (${principal(ejmc)})`);
    ok(ejmc.cifras["entrada.monto"]?.v === 800_000_000 && ejmc.cifras["entrada.monto"]?.unidad === "COP", "la cifra de entrada conserva el monto escrito y su moneda");
    const ejmv = A.ejecutarAgente(A.plantilla("CRED"), { empresa: visa, monto: 800_000_000 }, datos);
    ok(principal(ejmv) === 800, `800 millones con estados en millones → 800 (${principal(ejmv)})`);

    // ---------- Almacén y receta ----------
    const copia = A.importarAgente(A.exportarAgente(cred));
    ok(copia.pasos.length === cred.pasos.length && A.validarAgente(copia).length === 0, "exportar e importar un agente");
    const nuevo = A.agenteVacio("Prueba"); nuevo.entradas.push({ id: "empresa", etiqueta: "Estados", tipo: "estados", requerido: true });
    nuevo.pasos.push(A.nuevoPaso("RAT", nuevo));
    ok(nuevo.pasos[0].vinculos.empresa?.de === "entrada", "nuevoPaso conecta los estados del agente");

    console.log(JSON.stringify({ pruebas, certificadas: cert.length, bloques: A.DEF_BLOQUES.length, wacc_sectores: comparados, decision_cred_visa: ejv.decision.efecto }, null, 2));
    console.log("OK: constructor de agentes.");
})().catch(e => { console.error(e); process.exit(1); });
