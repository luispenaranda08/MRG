import ExcelJS from "exceljs";
import { amortizar, indicadores, modeloProyecto, type EntradaCredito, type EntradaProyecto, type ResultadoCredito } from "@/lib/finanzas";
import type { Estilo } from "./api";
import { applyTone, pieCalculadora } from "./excel";
import { agregarDecision } from "./documento-excel";
import type { DecisionJev } from "./jev";

function libro(titulo: string, empresa: string) {
    const w = new ExcelJS.Workbook();
    w.creator = "Mirage · HyperTarget"; w.title = `${titulo}${empresa.trim() ? ` · ${empresa.trim()}` : ""}`;
    w.calcProperties.fullCalcOnLoad = true;
    return w;
}
function hoja(w: ExcelJS.Workbook, nombre: string, estilo: Estilo, empresa: string) {
    const s = w.addWorksheet(nombre);
    s.addRow([`${nombre} · ${empresa.trim() || "Mirage"}`]).eachCell(c => applyTone(c, estilo, "encabezado"));
    s.headerFooter.oddHeader = `&L${empresa.replace(/&/g, "&&")}&R${nombre}`;
    s.views = [{ state: "frozen", ySplit: 3 }]; s.getColumn(1).width = 32;
    return s;
}
function formula(s: ExcelJS.Worksheet, address: string, f: string, valor: number | boolean | null, estilo: Estilo, pct = false) {
    const c = s.getCell(address);
    c.value = { formula: f.replace(/^=/, ""), result: valor ?? { error: "#NUM!" } };
    c.numFmt = pct ? estilo.formatos.pct : "#,##0.00"; applyTone(c, estilo, "clave");
}
function dato(s: ExcelJS.Worksheet, nombre: string, valor: number | string, estilo: Estilo, w?: ExcelJS.Workbook, rango?: string) {
    const r = s.addRow([nombre, valor]); applyTone(r.getCell(2), estilo, "insumo");
    if (w && rango) w.definedNames.add(`'${s.name}'!$B$${r.number}`, rango);
    return r.number;
}
const columnasCredito = ["Periodo", "Fecha", "Ingreso", "Egreso", "FCN", "Saldo Inicial", "Tasa", "Intereses", "Abono a capital", "Saldo Final", "Índice", "Egreso en pesos", "Saldo en pesos"];

/** Fórmulas OOXML en inglés: Excel las presenta como PAGO/TIR en español. */
function tablaCredito(s: ExcelJS.Worksheet, e: EntradaCredito, r: ResultadoCredito, estilo: Estilo, tabla: string, refs: { p: string; n: string; i: string; cuota: string; g: string; m: string; idx: string; var: string }) {
    const rows = r.filas.map(f => [f.periodo, f.fecha || "", f.ingreso, f.egreso, f.fcn, f.saldoInicial, f.tasa, f.intereses, f.abonoCapital, f.saldoFinal, f.indice ?? null, f.egresoPesos ?? null, f.saldoFinalPesos ?? null]);
    s.addTable({ name: tabla, ref: "A3", headerRow: true, totalsRow: false, style: { theme: "TableStyleMedium4", showRowStripes: true }, columns: columnasCredito.map(name => ({ name, filterButton: true })), rows });
    // En el archivo, la referencia a la fila actual se guarda como Tabla[[#This Row],[Columna]] (el "@" solo existe en la interfaz de Excel)
    const q = (name: string) => `${tabla}[[#This Row],[${name}]]`;
    r.filas.forEach((f, j) => {
        const row = j + 4, prev = row - 1;
        const write = (col: string, expr: string, v: number | null, pct = false) => formula(s, `${col}${row}`, expr, v, estilo, pct);
        write("C", j === 0 ? refs.p : "0", f.ingreso);
        write("F", j === 0 ? "0" : `J${prev}`, f.saldoInicial);
        write("G", j === 0 ? "0" : Array.isArray(e.tasaPeriodica) ? `'Datos'!D${j + 3}` : refs.i, f.tasa, true);
        write("H", `${q("Saldo Inicial")}*${q("Tasa")}`, f.intereses);
        let pago = refs.cuota;
        if (e.sistema === "cuota_fija" && e.tasaVariable === "recalcular") pago = `IF(${q("Periodo")}=${refs.g}+1,${refs.cuota},IF(${q("Tasa")}<>G${prev},IF(${q("Tasa")}=0,${q("Saldo Inicial")}/(${refs.n}-${q("Periodo")}+1),-PMT(${q("Tasa")},${refs.n}-${q("Periodo")}+1,${q("Saldo Inicial")})),D${prev}))`;
        if (e.sistema === "abono_constante") pago = `${q("Intereses")}+MIN(${refs.p}/(${refs.n}-${refs.g}),${q("Saldo Inicial")})`;
        if (e.sistema === "bono_cupon") pago = q("Intereses");
        if (e.sistema === "cero_cupon") pago = "0";
        write("D", j === 0 ? "0" : `IF(${q("Periodo")}<=${refs.g},${e.sistema === "cero_cupon" ? "0" : q("Intereses")},IF(${q("Periodo")}=${refs.n},${q("Saldo Inicial")}+${q("Intereses")},${pago}))`, f.egreso);
        write("E", `${q("Ingreso")}-${q("Egreso")}`, f.fcn);
        write("I", `${q("Egreso")}-${q("Intereses")}`, f.abonoCapital);
        write("J", `${q("Saldo Inicial")}+${q("Intereses")}-${q("Egreso")}+${q("Ingreso")}`, f.saldoFinal);
        applyTone(s.getCell(`E${row}`), estilo, f.fcn < 0 ? "baja" : "sube");
        if (e.indexacion) {
            write("K", `${refs.idx}*(1+${refs.var})^(${q("Periodo")}/${refs.m})`, f.indice!);
            write("L", `(${q("Egreso")}-${q("Ingreso")})*${q("Índice")}`, f.egresoPesos!);
            write("M", `${q("Saldo Final")}*${q("Índice")}`, f.saldoFinalPesos!);
        }
    });
    s.getRow(3).eachCell(c => applyTone(c, estilo, "encabezado"));
    s.columns.forEach((c, i) => { c.width = i === 1 ? 16 : 20; });
}

export function creditoWorkbook(e: EntradaCredito, estilo: Estilo, empresa = "", rec?: DecisionJev) {
    const r = amortizar(e), w = libro("Créditos", empresa), d = hoja(w, "Datos", estilo, empresa);
    d.addRow(["Insumo", "Valor"]);
    dato(d, "Principal", e.principal, estilo, w, "Principal"); // B3
    dato(d, "nCuotas", e.cuotas, estilo, w, "nCuotas");
    dato(d, "TasaPer", Array.isArray(e.tasaPeriodica) ? e.tasaPeriodica[e.sistema === "bono_cupon" ? 0 : e.gracia ?? 0] : e.tasaPeriodica, estilo, w, "TasaPer");
    dato(d, "Cuota", r.cuotaInicial, estilo, w, "Cuota");
    dato(d, "Gracia", e.gracia ?? 0, estilo, w, "Gracia");
    dato(d, "PeriodosAnio", e.periodosPorAnio ?? 12, estilo, w, "PeriodosAnio");
    dato(d, "IndiceInicial", e.indexacion?.valorInicial ?? 1, estilo, w, "IndiceInicial");
    dato(d, "VariacionIndice", e.indexacion?.variacionAnual ?? 0, estilo, w, "VariacionIndice");
    dato(d, "Sistema", r.nombreSistema, estilo);
    dato(d, "Desembolso", e.desembolso ?? "", estilo);
    for (const address of ["B5", "B10"]) d.getCell(address).numFmt = estilo.formatos.pct;
    if (Array.isArray(e.tasaPeriodica)) { d.getCell("D3").value = "Tasas por periodo"; e.tasaPeriodica.forEach((v, i) => { d.getCell(`D${i + 4}`).value = v; applyTone(d.getCell(`D${i + 4}`), estilo, "insumo"); }); }
    const cuota = e.sistema === "cuota_fija" ? "IF(TasaPer=0,Principal/(nCuotas-Gracia),-PMT(TasaPer,nCuotas-Gracia,Principal))" : e.sistema === "abono_constante" ? "Principal/(nCuotas-Gracia)+Principal*TasaPer" : e.sistema === "bono_cupon" ? "Principal*TasaPer" : "0";
    formula(d, "B6", cuota, r.cuotaInicial, estilo);
    const a = hoja(w, "Amortización", estilo, empresa);
    tablaCredito(a, e, r, estilo, "Credito", { p: "Principal", n: "nCuotas", i: "TasaPer", cuota: "Cuota", g: "Gracia", m: "PeriodosAnio", idx: "IndiceInicial", var: "VariacionIndice" });
    const last = r.filas.length + 3;
    dato(d, "Total intereses", r.totalIntereses, estilo); formula(d, "B13", "SUM(Credito[Intereses])", r.totalIntereses, estilo);
    dato(d, "Total pagado", r.totalPagado, estilo); formula(d, "B14", "SUM(Credito[Egreso])", r.totalPagado, estilo);
    dato(d, "Costo efectivo anual", r.costoEA ?? "Sin TIR", estilo); formula(d, "B15", "IFERROR((1+IRR(Credito[FCN]))^PeriodosAnio-1,NA())", r.costoEA, estilo, true);
    if (e.indexacion) { dato(d, "Costo EA en pesos", r.costoEAPesos ?? "Sin TIR", estilo); formula(d, "B16", "IFERROR((1+IRR(Credito[Egreso en pesos]))^PeriodosAnio-1,NA())", r.costoEAPesos ?? null, estilo, true); }
    const c = hoja(w, "Controles", estilo, empresa);
    dato(c, "ΣAbonos = Principal", "", estilo);
    formula(c, "B2", "ABS(SUM(Credito[Abono a capital])-Principal)<MAX(1,Principal)*0.000001", Math.abs(r.filas.reduce((s, f) => s + f.abonoCapital, 0) - e.principal) < Math.max(1, e.principal) * 1e-6, estilo);
    dato(c, "Saldo final = 0", "", estilo); formula(c, "B3", `ABS('Amortización'!J${last})<MAX(1,Principal)*0.000001`, r.controles.saldoFinalCero, estilo);
    agregarDecision(w, estilo, rec);
    return pieCalculadora(w, estilo);
}

export interface FlujosProyecto { modo: "flujos"; a: number[]; b?: number[]; k: number; reinversion?: number }
export type ExportProyecto = FlujosProyecto | { modo: "modelo"; entrada: EntradaProyecto };
export function proyectoWorkbook(e: ExportProyecto, estilo: Estilo, empresa = "", rec?: DecisionJev) {
    const w = libro("Proyectos", empresa), s = hoja(w, "Supuestos", estilo, empresa), f = hoja(w, "FCL", estilo, empresa), deuda = hoja(w, "Deuda", estilo, empresa), ev = hoja(w, "Evaluación", estilo, empresa), c = hoja(w, "Controles", estilo, empresa);
    if (e.modo === "flujos") {
        dato(s, "k", e.k, estilo, w, "KProyecto"); dato(s, "Reinversión", e.reinversion ?? e.k, estilo, w, "Reinversion");
        s.addRow(["Periodo", "Proyecto A", "Proyecto B"]).eachCell(c => applyTone(c, estilo, "encabezado"));
        const count = Math.max(e.a.length, e.b?.length ?? 0);
        for (let j = 0; j < count; j++) s.addRow([j, e.a[j] ?? 0, e.b?.[j] ?? 0]).eachCell(c => applyTone(c, estilo, "insumo"));
        f.addRow(["Periodo", "FCL A", "FCL B"]);
        for (let j = 0; j < count; j++) {
            const row = j + 3; f.getCell(`A${row}`).value = j;
            formula(f, `B${row}`, `Supuestos!B${j + 5}`, e.a[j] ?? 0, estilo);
            formula(f, `C${row}`, `Supuestos!C${j + 5}`, e.b?.[j] ?? 0, estilo);
        }
        ev.addRow(["Proyecto", "VPN", "TIR", "TIRM"]);
        [e.a, e.b].forEach((flujos, j) => {
            if (!flujos) return;
            const r = indicadores(flujos, e.k, { kReinversion: e.reinversion }), col = j ? "C" : "B", end = flujos.length + 2, row = j + 3;
            ev.getCell(`A${row}`).value = j ? "B" : "A";
            formula(ev, `B${row}`, `NPV(KProyecto,FCL!${col}4:${col}${end})+FCL!${col}3`, r.vpn, estilo);
            formula(ev, `C${row}`, `IFERROR(IRR(FCL!${col}3:${col}${end}),NA())`, r.tir, estilo, true);
            formula(ev, `D${row}`, `IFERROR(MIRR(FCL!${col}3:${col}${end},KProyecto,Reinversion),NA())`, r.tirm, estilo, true);
        });
        deuda.addRow(["Modo Flujos: deuda incorporada en los flujos del usuario."]);
        c.addRow(["Al menos dos flujos", { formula: `COUNT(Supuestos!B5:B${e.a.length + 4})>=2`, result: e.a.length >= 2 }]);
    } else {
        modeloExcel(e.entrada, estilo, w, s, f, deuda, ev, c);
    }
    w.eachSheet(ws => { ws.columns.forEach((col, i) => { col.width = i ? 22 : 34; }); });
    agregarDecision(w, estilo, rec);
    return pieCalculadora(w, estilo);
}

function modeloExcel(e: EntradaProyecto, estilo: Estilo, w: ExcelJS.Workbook, s: ExcelJS.Worksheet, f: ExcelJS.Worksheet, deuda: ExcelJS.Worksheet, ev: ExcelJS.Worksheet, c: ExcelJS.Worksheet) {
    const r = modeloProyecto(e), n = r.anios.length - 1;
    const inputs: [string, number, string][] = [["Horizonte", n, "Horizonte"], ["Ventas año 1", e.ventas, "Ventas"], ["Crecimiento", Array.isArray(e.crecimiento) ? e.crecimiento[0] ?? 0 : e.crecimiento, "Crecimiento"], ["Costo ventas", e.costoVentas, "CostoVentas"], ["Gastos administración", e.gastosAdmonVentas, "GastosAV"], ["Gastos fijos", e.gastosFijos ?? 0, "GastosFijos"], ["Diferidos", e.diferidos?.valor ?? 0, "Diferidos"], ["Vida diferidos", e.diferidos?.anios ?? 1, "VidaDiferidos"], ["KTNO / ventas", e.ktnoSobreVentas, "PctKTNO"], ["Impuesto", e.tasaImpuesto, "Impuesto"], ["TMRR", e.tmrr, "TMRR"], ["Salvamento bruto", e.valorSalvamento ?? 0, "Salvamento"], ["CK", r.costoCapital, "CK"]];
    inputs.forEach(([l, v, name]) => dato(s, l, v, estilo, w, name));
    s.addRow(["Activo", "Valor", "Vida útil"]);
    const firstAsset = s.rowCount + 1;
    e.activos.forEach(a => s.addRow([a.nombre, a.valor, a.vidaUtil]).eachCell(c => applyTone(c, estilo, "insumo")));
    if (!e.activos.length) s.addRow(["Sin activos", 0, 1]);
    const lastAsset = s.rowCount;
    dato(s, "KTNO inicial", e.ktnoInicial ?? e.ktnoSobreVentas * e.ventas, estilo, w, "KTNOInicial");
    if (e.ktnoInicial == null) formula(s, `B${s.rowCount}`, "PctKTNO*Ventas", r.anios[0].ktno, estilo);
    dato(s, "Inversión inicial", r.inversionInicial, estilo, w, "InversionInicial");
    formula(s, `B${s.rowCount}`, `SUM(B${firstAsset}:B${lastAsset})+Diferidos+KTNOInicial`, r.inversionInicial, estilo);
    dato(s, "Valor en libros", 0, estilo, w, "ValorLibros");
    const libros = e.activos.map((a, j) => `MAX(0,B${firstAsset + j}-IF(C${firstAsset + j}>0,B${firstAsset + j}/C${firstAsset + j}*MIN(Horizonte,C${firstAsset + j}),B${firstAsset + j}))`).join("+") || "0";
    const valorLibros = e.activos.reduce((sum, a) => sum + Math.max(0, a.valor - (a.vidaUtil > 0 ? a.valor / a.vidaUtil * Math.min(n, a.vidaUtil) : a.valor)), 0) + (e.reposicionActivos ?? []).reduce((sum, v) => sum + v, 0);
    const bookRow = s.rowCount;
    s.addRow(["Año", "Crecimiento", "Reposición activos"]);
    const yearly = s.rowCount + 1;
    for (let t = 1; t <= n; t++) s.addRow([t, Array.isArray(e.crecimiento) ? e.crecimiento[t - 2] ?? e.crecimiento.at(-1) ?? 0 : e.crecimiento, e.reposicionActivos?.[t - 1] ?? 0]).eachCell(c => applyTone(c, estilo, "insumo"));
    formula(s, `B${bookRow}`, `${libros}+SUM(C${yearly}:C${yearly + n - 1})`, valorLibros, estilo);
    if (e.valorSalvamento == null) formula(s, "B13", "ValorLibros", valorLibros, estilo);
    deuda.addRow(["Tramo", "%", "Tasa EA", "Plazo", "Sistema", "Principal", "Cuota"]);
    const tramos = e.deuda ?? [], debtRows: { start: number; end: number; result: ResultadoCredito }[] = [];
    tramos.forEach((d, j) => {
        const dr = j + 3, credito = amortizar({ principal: d.proporcion * r.inversionInicial || 1e-12, cuotas: Math.max(1, Math.round(d.plazo)), tasaPeriodica: d.tasaEA, sistema: d.sistema, periodosPorAnio: 1 });
        deuda.addRow([d.nombre, d.proporcion, d.tasaEA, d.plazo, d.sistema, d.proporcion * r.inversionInicial, credito.cuotaInicial]).eachCell(c => applyTone(c, estilo, "insumo"));
        formula(deuda, `F${dr}`, `B${dr}*InversionInicial`, d.proporcion * r.inversionInicial, estilo);
        formula(deuda, `G${dr}`, d.sistema === "cuota_fija" ? `IF(C${dr}=0,F${dr}/D${dr},-PMT(C${dr},D${dr},F${dr}))` : d.sistema === "abono_constante" ? `F${dr}/D${dr}+F${dr}*C${dr}` : d.sistema === "bono_cupon" ? `F${dr}*C${dr}` : "0", credito.cuotaInicial, estilo);
    });
    const firstDebt = 3, lastDebt = tramos.length + 2;
    // Sin financiación: rango vacío sustituido por cero para evitar referencias inválidas.
    const debtProp = tramos.length ? `SUM(Deuda!B${firstDebt}:B${lastDebt})` : "0";
    if (e.costoCapital == null) formula(s, "B14", tramos.length ? `SUMPRODUCT(Deuda!B3:B${lastDebt},Deuda!C3:C${lastDebt})*(1-Impuesto)+(1-${debtProp})*TMRR` : "TMRR", r.costoCapital, estilo, true);
    tramos.forEach((d, j) => {
        deuda.addRow([]); deuda.addRow([d.nombre, "Periodo", "Saldo Inicial", "Intereses", "Egreso", "Abono", "Saldo Final"]);
        const dr = j + 3, start = deuda.rowCount + 1;
        const cr = amortizar({ principal: d.proporcion * r.inversionInicial || 1e-12, cuotas: Math.max(1, Math.round(d.plazo)), tasaPeriodica: d.tasaEA, sistema: d.sistema, periodosPorAnio: 1 });
        cr.filas.slice(1).forEach((a, k) => {
            const row = start + k;
            deuda.addRow([d.nombre, a.periodo, a.saldoInicial, a.intereses, a.egreso, a.abonoCapital, a.saldoFinal]);
            formula(deuda, `C${row}`, k ? `G${row - 1}` : `F${dr}`, d.proporcion > 0 ? a.saldoInicial : 0, estilo);
            formula(deuda, `D${row}`, `C${row}*$C$${dr}`, d.proporcion > 0 ? a.intereses : 0, estilo);
            const pago = d.sistema === "cuota_fija" ? `$G$${dr}` : d.sistema === "abono_constante" ? `D${row}+MIN($F$${dr}/$D$${dr},C${row})` : d.sistema === "bono_cupon" ? `D${row}` : "0";
            formula(deuda, `E${row}`, `IF(B${row}=$D$${dr},C${row}+D${row},${pago})`, d.proporcion > 0 ? a.egreso : 0, estilo);
            formula(deuda, `F${row}`, `E${row}-D${row}`, d.proporcion > 0 ? a.abonoCapital : 0, estilo);
            formula(deuda, `G${row}`, `C${row}+D${row}-E${row}`, d.proporcion > 0 ? a.saldoFinal : 0, estilo);
        });
        debtRows.push({ start, end: deuda.rowCount, result: cr });
    });
    const headers = ["Año", "Ventas", "Costo ventas", "Margen bruto", "Gastos AV", "Depreciación", "Amortización diferidos", "UAII", "Impuesto", "UODI", "FCB", "KTNO", "Inversión KTNO", "CAPEX", "Salvamento neto", "FCL proyecto", "Intereses", "Abono capital", "Escudo fiscal", "Desembolso", "FCL inversionista", "Capital invertido", "EVA"];
    f.addRow(headers).eachCell(c => applyTone(c, estilo, "encabezado"));
    r.anios.forEach((a, t) => {
        const row = t + 3, prev = row - 1; f.getCell(`A${row}`).value = t;
        const write = (col: string, expr: string, v: number | null) => formula(f, `${col}${row}`, expr, v, estilo);
        write("B", t === 0 ? "0" : t === 1 ? "Ventas" : `B${prev}*(1+Supuestos!B${yearly + t - 1})`, a.ventas);
        write("C", `B${row}*CostoVentas`, a.costoVentas); write("D", `B${row}-C${row}`, a.margenBruto);
        write("E", t ? `B${row}*GastosAV+GastosFijos` : "0", a.gastosAdmonVentas);
        const dep = e.activos.map((_, j) => `IF(AND(Supuestos!C${firstAsset + j}>0,A${row}<=Supuestos!C${firstAsset + j}),Supuestos!B${firstAsset + j}/Supuestos!C${firstAsset + j},0)`).join("+") || "0";
        write("F", t ? dep : "0", a.depreciacion);
        write("G", t ? `IF(A${row}<=VidaDiferidos,Diferidos/VidaDiferidos,0)` : "0", a.amortizacionDiferidos);
        write("H", `D${row}-E${row}-F${row}-G${row}`, a.uaii); write("I", `H${row}*Impuesto`, a.impuesto); write("J", `H${row}-I${row}`, a.uodi); write("K", `J${row}+F${row}+G${row}`, a.fcb);
        write("L", t === 0 ? "KTNOInicial" : t === n && e.recuperarKTNO !== false ? "0" : `PctKTNO*B${t < n ? row + 1 : row}`, a.ktno);
        write("M", t ? `L${row}-L${prev}` : "0", a.inversionKTNO);
        write("N", t ? `Supuestos!C${yearly + t - 1}` : `InversionInicial-KTNOInicial`, a.inversionActivos);
        write("O", t === n ? "Salvamento-Impuesto*(Salvamento-ValorLibros)" : "0", a.valorSalvamento);
        write("P", t ? `K${row}-M${row}-N${row}+O${row}` : "-InversionInicial", a.fclProyecto);
        for (const [col, dc, value] of [["Q", "D", a.intereses], ["R", "F", a.abonoCapital]] as const) {
            const refs = debtRows.filter(d => t > 0 && t <= d.result.filas.length - 1).map(d => `Deuda!${dc}${d.start + t - 1}`).join("+") || "0";
            write(col, refs, value);
        }
        write("S", `Q${row}*Impuesto`, a.escudoFiscal); write("T", t ? "0" : `${debtProp}*InversionInicial`, a.desembolsoDeuda);
        write("U", `P${row}-Q${row}-R${row}+S${row}+T${row}`, a.fclInversionista);
        write("V", t === 0 ? "InversionInicial" : `SUM(Supuestos!B${firstAsset}:B${lastAsset})-${t > 1 ? `SUM(F4:F${prev})` : "0"}+MAX(0,Diferidos-Diferidos/VidaDiferidos*MIN(A${row}-1,VidaDiferidos))+L${prev}+${t > 1 ? `SUM(N4:N${prev})` : "0"}`, a.capitalInvertido);
        if (t) { write("W", `J${row}-CK*V${row}`, a.eva); applyTone(f.getCell(`W${row}`), estilo, a.eva! >= 0 ? "sube" : "baja"); }
        for (const col of ["P", "U"]) applyTone(f.getCell(`${col}${row}`), estilo, (col === "P" ? a.fclProyecto : a.fclInversionista) >= 0 ? "sube" : "baja");
    });
    ev.addRow(["Evaluación", "Tasa", "VPN", "TIR", "TIRM"]);
    Object.values(r.evaluaciones).forEach((a, j) => {
        const row = j + 3, col = j === 2 ? "U" : "P", tasa = j ? "TMRR" : "CK", end = n + 3;
        ev.getCell(`A${row}`).value = a.descripcion;
        formula(ev, `B${row}`, tasa, a.tasa, estilo, true);
        formula(ev, `C${row}`, `NPV(B${row},FCL!${col}4:${col}${end})+FCL!${col}3`, a.vpn, estilo);
        formula(ev, `D${row}`, `IFERROR(IRR(FCL!${col}3:${col}${end}),NA())`, a.tir, estilo, true);
        formula(ev, `E${row}`, `IFERROR(MIRR(FCL!${col}3:${col}${end},B${row},B${row}),NA())`, a.tirm, estilo, true);
    });
    dato(c, "Proporciones válidas", "", estilo);
    formula(c, "B2", `AND(${debtProp}>=0,${debtProp}<=1${tramos.length ? `,MIN(Deuda!B3:B${lastDebt})>=0` : ""})`, r.controles.proporcionesValidas, estilo);
    dato(c, "Deuda pagada en horizonte", "", estilo);
    formula(c, "B3", tramos.length ? `AND(MAX(Deuda!D3:D${lastDebt})<=Horizonte,${debtRows.map(d => `ABS(Deuda!G${d.end})<MAX(1,InversionInicial)*0.000001`).join(",")})` : "TRUE()", r.controles.deudaPagada, estilo);
    if (!r.controles.deudaPagada) applyTone(c.getCell("B3"), estilo, "alerta");
}
