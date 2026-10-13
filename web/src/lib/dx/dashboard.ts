/**
 * Hoja «Dashboard» del Excel de diagnóstico: KPI arriba y de 4 a 8 gráficas nativas con su hallazgo.
 * JEV decide qué mostrar (plan); este módulo valida el plan contra el catálogo, completa lo que falte con un plan
 * por defecto y arma la hoja. Las cifras del dashboard son fórmulas a las demás hojas, así que se recalculan.
 */
import type ExcelJS from "exceljs";
import type { GraficaXlsx, TipoGrafica } from "./graficas";

export type FormatoSerie = "num" | "pct" | "x" | "dias" | "z";
export interface SerieCat { id: string; nombre: string; fmt: FormatoSerie; grupo: "hist" | "proy"; f: (i: number) => string | null; v: (i: number) => number | null }
export interface ComposicionCat { id: string; nombre: string; partes: { nombre: string; f: string; v: number }[] }
export interface KpiCat { id: string; nombre: string; fmt: FormatoSerie | "texto"; f: string | null; v: number | string | null; nota?: { f?: string; v?: number | string; z?: string; texto?: string } }
export interface Catalogo { anios: string[]; proyectados: string[]; series: SerieCat[]; composiciones: ComposicionCat[]; kpis: KpiCat[] }
export interface GraficaPlan { tipo: TipoGrafica; titulo: string; series: string[]; secundaria: string[]; hallazgo: string }
export interface PlanDashboard { lectura: string; kpis: string[]; graficas: GraficaPlan[]; origen: "jev" | "mirage" }

const TIPOS: TipoGrafica[] = ["columnas", "barras", "lineas", "area", "columnas_apiladas", "combo", "torta", "anillo"];
export const FORMATOS: Record<FormatoSerie | "texto", string> = { num: "#,##0", pct: "0.0%", x: '0.00"x"', dias: "0", z: "0.00", texto: "@" };

/** Lo que se le envía a JEV: catálogo con ids y cifras, sin fórmulas. */
export function catalogoParaJev(cat: Catalogo) {
    return {
        anios: cat.anios, anios_proyectados: cat.proyectados,
        series: cat.series.map(s => ({ id: s.id, nombre: s.nombre, formato: s.fmt, tipo: s.grupo === "proy" ? "proyección" : "histórico", valores: (s.grupo === "proy" ? cat.proyectados : cat.anios).map((_, i) => redondeo(s.v(i), s.fmt)) })),
        composiciones: cat.composiciones.map(c => ({ id: c.id, nombre: c.nombre, partes: c.partes.map(p => [p.nombre, redondeo(p.v, "num")]) })),
        kpis: cat.kpis.map(k => ({ id: k.id, nombre: k.nombre, valor: typeof k.v === "number" ? redondeo(k.v, k.fmt as FormatoSerie) : k.v })),
    };
}
const redondeo = (v: number | null, f: FormatoSerie) => v == null || !isFinite(v) ? null : f === "pct" ? Math.round(v * 10000) / 10000 : f === "num" ? Math.round(v) : Math.round(v * 100) / 100;

/* ------------------------------ Plan por defecto ------------------------------ */
const pct = (v: number | null) => v == null || !isFinite(v) ? "n/d" : (v * 100).toFixed(1).replace(".", ",") + " %";
export function planPorDefecto(cat: Catalogo, empresa: string): PlanDashboard {
    const s = (id: string) => cat.series.find(x => x.id === id), n = cat.anios.length - 1;
    const v = (id: string, i = n) => s(id)?.v(i) ?? null;
    const crec = n > 0 && v("rev", n - 1) ? (v("rev")! / v("rev", n - 1)! - 1) : null;
    const g: GraficaPlan[] = [
        { tipo: "combo", titulo: "Ingresos y margen EBIT", series: ["rev"], secundaria: ["em"], hallazgo: `Ingresos ${crec == null ? "" : (crec >= 0 ? "crecen " : "caen ") + pct(Math.abs(crec)) + " en " + cat.anios[n] + "; "}margen EBIT de ${pct(v("em"))}.` },
        { tipo: "lineas", titulo: "Márgenes", series: ["gm", "em", "nm"], secundaria: [], hallazgo: `Margen bruto ${pct(v("gm"))}, operativo ${pct(v("em"))} y neto ${pct(v("nm"))} en ${cat.anios[n]}.` },
        { tipo: "lineas", titulo: "ROIC frente a WACC", series: ["roic", "wacc"], secundaria: [], hallazgo: (v("roic") ?? 0) > (v("wacc") ?? 0) ? `El ROIC (${pct(v("roic"))}) supera el WACC (${pct(v("wacc"))}): la empresa crea valor.` : `El ROIC (${pct(v("roic"))}) está por debajo del WACC (${pct(v("wacc"))}): la empresa destruye valor.` },
        { tipo: "columnas", titulo: "Valor económico agregado", series: ["eva"], secundaria: [], hallazgo: `EVA de ${Math.round(v("eva") ?? 0).toLocaleString("es-CO")} en ${cat.anios[n]}.` },
        { tipo: "anillo", titulo: "Cómo se financia", series: ["estructura_financiacion"], secundaria: [], hallazgo: `Pasivo sobre activo de ${pct(v("la"))} en ${cat.anios[n]}.` },
        { tipo: "columnas", titulo: "Deuda financiera y patrimonio", series: ["debt", "eq"], secundaria: [], hallazgo: `Deuda financiera / patrimonio de ${(v("de") ?? 0).toFixed(2).replace(".", ",")} veces.` },
        { tipo: "lineas", titulo: "Ciclo de caja", series: ["dso", "dio", "dpo"], secundaria: [], hallazgo: `Cartera a ${Math.round(v("dso") ?? 0)} días${v("dpo") != null ? ` y proveedores a ${Math.round(v("dpo")!)} días` : ""}.` },
        { tipo: "columnas", titulo: "Flujo de caja libre proyectado", series: ["proy_fcl"], secundaria: [], hallazgo: "Flujo de caja libre de los cinco años de la valoración." },
    ];
    return { origen: "mirage", lectura: `${empresa}: ingresos de ${Math.round(v("rev") ?? 0).toLocaleString("es-CO")} en ${cat.anios[n]}, margen EBIT de ${pct(v("em"))} y ROIC de ${pct(v("roic"))} frente a un WACC de ${pct(v("wacc"))}.`, kpis: ["rev", "em", "roic", "wacc", "eva", "ev"], graficas: g };
}

/* ------------------------------ Validación del plan de JEV ------------------------------ */
export function validarPlan(plan: Partial<PlanDashboard> | null | undefined, cat: Catalogo, empresa: string): PlanDashboard {
    const base = planPorDefecto(cat, empresa);
    if (!plan) return base;
    const S = new Map(cat.series.map(s => [s.id, s])), C = new Map(cat.composiciones.map(c => [c.id, c]));
    const graficas: GraficaPlan[] = [];
    for (const g of plan.graficas ?? []) {
        if (!g || !TIPOS.includes(g.tipo)) continue;
        let tipo = g.tipo;
        const comp = (g.series ?? []).find(id => C.has(id));
        if (tipo === "torta" || tipo === "anillo" || comp) {
            if (!comp) continue;
            // Una torta con partes negativas no se puede leer: pasa a columnas
            if ((tipo === "torta" || tipo === "anillo") && C.get(comp)!.partes.some(p => p.v < 0)) tipo = "columnas";
            if (!["torta", "anillo", "columnas", "barras"].includes(tipo)) tipo = "columnas";
            graficas.push({ tipo, titulo: limpiar(g.titulo, 60) || C.get(comp)!.nombre, series: [comp], secundaria: [], hallazgo: limpiar(g.hallazgo, 260) });
            continue;
        }
        let series = [...new Set((g.series ?? []).filter(id => S.has(id)))];
        let secundaria = tipo === "combo" ? [...new Set((g.secundaria ?? []).filter(id => S.has(id) && !series.includes(id)))] : [];
        if (!series.length) { if (!secundaria.length) continue; series = secundaria; secundaria = []; }
        const grupo = S.get(series[0])!.grupo, fmt = S.get(series[0])!.fmt;
        series = series.filter(id => S.get(id)!.grupo === grupo && (tipo === "combo" || S.get(id)!.fmt === fmt)).slice(0, 4);
        secundaria = secundaria.filter(id => S.get(id)!.grupo === grupo).slice(0, 2);
        if (tipo === "combo") {
            const montos = series.filter(id => S.get(id)!.fmt === "num"), otros = [...series.filter(id => S.get(id)!.fmt !== "num"), ...secundaria];
            if (!montos.length || !otros.length) { tipo = montos.length ? "columnas" : "lineas"; series = montos.length ? montos : otros; secundaria = []; }
            else { series = montos; secundaria = otros.filter(id => S.get(id)!.fmt === S.get(otros[0])!.fmt).slice(0, 2); }
        }
        if (series.every(id => [...Array(grupo === "proy" ? cat.proyectados.length : cat.anios.length)].every((_, i) => S.get(id)!.v(i) == null))) continue;
        graficas.push({ tipo, titulo: limpiar(g.titulo, 60) || S.get(series[0])!.nombre, series, secundaria, hallazgo: limpiar(g.hallazgo, 260) });
    }
    const usadas = new Set(graficas.map(g => g.series.join("|")));
    for (const g of base.graficas) { if (graficas.length >= 6) break; if (!usadas.has(g.series.join("|"))) graficas.push(g); }
    const K = new Set(cat.kpis.map(k => k.id)), kpis = [...new Set((plan.kpis ?? []).filter(id => K.has(id)))].slice(0, 6);
    for (const id of base.kpis) { if (kpis.length >= 4) break; if (!kpis.includes(id)) kpis.push(id); }
    return { origen: "jev", lectura: limpiar(plan.lectura, 600) || base.lectura, kpis, graficas: graficas.slice(0, 8) };
}
const limpiar = (s: unknown, n: number) => typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "";

/* ------------------------------ Hoja ------------------------------ */
const col = (i: number) => { let s = "", n = i + 1; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const ref = (hoja: string, c: number, r: number, c2?: number, r2?: number) => `'${hoja}'!$${col(c)}$${r}` + (c2 != null ? `:$${col(c2)}$${r2 ?? r}` : "");

export function hojaDashboard(wb: ExcelJS.Workbook, cat: Catalogo, plan: PlanDashboard, empresa: string, tono: (cell: ExcelJS.Cell, t: string) => void): GraficaXlsx[] {
    const NOMBRE = "Dashboard", ws = wb.addWorksheet(NOMBRE, { views: [{ showGridLines: false }], properties: { tabColor: { argb: "FFC8A24A" } } });
    ws.getColumn(1).width = 2;
    for (let c = 2; c <= 15; c++) ws.getColumn(c).width = 12.5;
    ws.getColumn(16).width = 4; ws.getColumn(17).width = 4; ws.getColumn(18).width = 34;
    for (let c = 19; c <= 26; c++) ws.getColumn(c).width = 13;
    const S = new Map(cat.series.map(s => [s.id, s])), C = new Map(cat.composiciones.map(c => [c.id, c])), K = new Map(cat.kpis.map(k => [k.id, k]));
    const fuente = (cell: ExcelJS.Cell, size: number, color = "FF1F2124", bold = false) => { cell.font = { name: "IBM Plex Sans", size, color: { argb: color }, bold }; };

    ws.getCell("A1").value = "Mirage · Dashboard";
    fuente(ws.getCell("A1"), 16, "FF1F2124", true);
    ws.mergeCells("B2:O2");
    ws.getCell("B2").value = plan.lectura;
    ws.getCell("B2").alignment = { wrapText: true, vertical: "top" };
    fuente(ws.getCell("B2"), 10.5, "FF3C4043");
    ws.getRow(2).height = 46;
    ws.getCell("B3").value = plan.origen === "jev" ? "Gráficas, indicadores y lectura elegidos para esta empresa. Las cifras son fórmulas: cambian con la hoja Supuestos." : "Las cifras son fórmulas: cambian con la hoja Supuestos.";
    fuente(ws.getCell("B3"), 8.5, "FF6E7277");

    // KPI: etiqueta, valor y comparación
    plan.kpis.forEach((id, j) => {
        const k = K.get(id)!, c = 2 + j * 2 + Math.floor(j / 6);
        if (c > 14) return;
        [4, 5, 6].forEach(r => ws.mergeCells(r, c, r, c + 1));
        const et = ws.getCell(4, c), va = ws.getCell(5, c), no = ws.getCell(6, c);
        et.value = k.nombre.toUpperCase(); fuente(et, 8, "FF6E7277", true);
        va.value = k.f ? { formula: k.f.replace(/^=/, ""), result: (typeof k.v === "number" && isFinite(k.v) ? k.v : 0) as number } : k.v ?? "n/d";
        va.numFmt = FORMATOS[k.fmt]; fuente(va, 18, "FF1F2124", true);
        if (k.nota?.f) { no.value = { formula: k.nota.f, result: (typeof k.nota.v === "number" ? k.nota.v : 0) }; no.numFmt = k.nota.z ?? "@"; }
        else if (k.nota?.texto) no.value = k.nota.texto;
        fuente(no, 8.5, "FF6E7277");
        for (const r of [4, 5, 6]) for (const cc of [c, c + 1]) {
            const cell = ws.getCell(r, cc);
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBF3E2" } };
            cell.border = { top: r === 4 ? { style: "thin", color: { argb: "FFC8A24A" } } : undefined };
            cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        }
    });
    ws.getRow(5).height = 30;

    // Bloque de datos de las gráficas (columna R en adelante)
    const D0 = 17; // R
    let fila = 4;
    const cabeza = ws.getCell(fila, D0 + 1); cabeza.value = "Datos de las gráficas"; tono(cabeza, "encabezado");
    fila += 2;
    const graficas: GraficaXlsx[] = [];
    const escribirFila = (r: number, etiqueta: string, celdas: { f?: string | null; v: number | string | null }[], z: string, encabezado = false) => {
        const e = ws.getCell(r, D0 + 1); e.value = etiqueta; fuente(e, 9, encabezado ? "FF1F2124" : "FF3C4043", encabezado);
        celdas.forEach((x, i) => {
            const cell = ws.getCell(r, D0 + 2 + i);
            if (x.f) cell.value = { formula: x.f.replace(/^=/, ""), result: (typeof x.v === "number" && isFinite(x.v) ? x.v : 0) as number };
            else cell.value = x.v == null || (typeof x.v === "number" && !isFinite(x.v)) ? null : x.v;
            cell.numFmt = z; fuente(cell, 9, encabezado ? "FF1F2124" : "FF3C4043", encabezado);
            if (encabezado) cell.alignment = { horizontal: "right" };
        });
    };

    plan.graficas.forEach((g, j) => {
        const comp = C.get(g.series[0]);
        let cats: string[], series: GraficaXlsx["series"] = [], formato: string, formato2: string | undefined;
        const filaCats = fila;
        if (comp) {
            cats = comp.partes.map(p => p.nombre);
            escribirFila(fila, comp.nombre, cats.map(v => ({ v })), "@", true);
            fila++;
            escribirFila(fila, comp.nombre + " " + cat.anios[cat.anios.length - 1], comp.partes.map(p => ({ f: p.f, v: p.v })), FORMATOS.num);
            series = [{ nombre: comp.nombre, refNombre: ref(NOMBRE, D0, fila), refValores: ref(NOMBRE, D0 + 1, fila, D0 + cats.length, fila), valores: comp.partes.map(p => p.v) }];
            fila++;
            formato = FORMATOS.num;
        } else {
            const grupo = S.get(g.series[0])!.grupo;
            cats = grupo === "proy" ? cat.proyectados : cat.anios;
            escribirFila(fila, g.titulo, cats.map(v => ({ v })), "@", true);
            fila++;
            for (const id of [...g.series, ...g.secundaria]) {
                const s = S.get(id)!, vals = cats.map((_, i) => s.v(i));
                escribirFila(fila, s.nombre, cats.map((_, i) => ({ f: s.f(i), v: vals[i] })), FORMATOS[s.fmt]);
                series.push({ nombre: s.nombre, refNombre: ref(NOMBRE, D0, fila), refValores: ref(NOMBRE, D0 + 1, fila, D0 + cats.length, fila), valores: vals, secundaria: g.secundaria.includes(id) });
                fila++;
            }
            formato = FORMATOS[S.get(g.series[0])!.fmt];
            formato2 = g.secundaria.length ? FORMATOS[S.get(g.secundaria[0])!.fmt] : undefined;
        }
        fila++;
        // Posición: dos gráficas por fila, título y hallazgo encima
        const c0 = j % 2 === 0 ? 1 : 8, r0 = 8 + Math.floor(j / 2) * 21;
        ws.mergeCells(r0 + 1, c0 + 1, r0 + 1, c0 + 7);
        ws.mergeCells(r0 + 2, c0 + 1, r0 + 2, c0 + 7);
        const t = ws.getCell(r0 + 1, c0 + 1), h = ws.getCell(r0 + 2, c0 + 1);
        t.value = `${j + 1}. ${g.titulo}`; fuente(t, 11, "FF1F2124", true);
        h.value = g.hallazgo; fuente(h, 9, "FF3C4043"); h.alignment = { wrapText: true, vertical: "top" };
        ws.getRow(r0 + 2).height = 30;
        graficas.push({ hoja: NOMBRE, tipo: g.tipo, categorias: cats, refCategorias: ref(NOMBRE, D0 + 1, filaCats, D0 + cats.length, filaCats), series, formato, formatoSecundario: formato2, desde: [c0, r0 + 2], hasta: [c0 + 7, r0 + 19] });
    });
    return graficas;
}
