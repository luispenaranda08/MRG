/**
 * Lectores de Mirage para casi cualquier formato de estados financieros. Todo corre en el navegador (y en Node para las
 * pruebas); ninguno usa servicios externos. Cada lector convierte el archivo en un libro de SheetJS con una cuenta por
 * fila y los años por columnas, que luego interpreta `parseWorkbook` igual que un Excel.
 *
 * Hojas de cálculo (SheetJS): xlsx, xlsm, xlsb, xls, ods, fods, numbers, csv, tsv, dif, sylk, dbf, Lotus, Quattro…
 * Documentos: PDF con texto, docx, pptx, odt, odp, rtf, html, iXBRL, XBRL, SpreadsheetML 2003, json, txt, md.
 * Contenedores: zip con cualquiera de los anteriores; pages/key a través de su vista previa en PDF.
 */
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { decodificarTexto, leerArchivo } from "./leer";
import { parseWorkbook } from "./engine";
import type { Parsed } from "./types";

type Valor = string | number | null;
type Fila = Valor[];

const HOJAS = ["xlsx", "xlsm", "xlsb", "xls", "xlt", "xltx", "xltm", "xla", "xlam", "ods", "fods", "ots", "numbers", "csv", "tsv", "dif", "sylk", "slk", "dbf", "wk1", "wk2", "wk3", "wk4", "123", "wq1", "wq2", "wb1", "wb2", "wb3", "qpw", "xlr", "eth", "prn"];
const DOCUMENTOS = ["pdf", "docx", "docm", "dotx", "pptx", "pptm", "ppsx", "odt", "odp", "ott", "rtf", "html", "htm", "xhtml", "mht", "mhtml", "xml", "xbrl", "json", "txt", "text", "md", "markdown", "asc", "dat", "log", "zip", "pages", "key"];
/** Valor para el atributo accept del selector de archivos. */
export const EXTENSIONES = [...HOJAS, ...DOCUMENTOS].map(e => "." + e).join(",");
export const FORMATOS_ACEPTADOS = HOJAS.length + DOCUMENTOS.length;

/* ======================= Utilidades comunes ======================= */
const ANIO_LIBRE = /(?:^|[^\d])((?:19|20)\d{2})(?:\s*\(?(?:real|reexpresado|re-expresado|restated|auditado|e|p)\)?)?\s*$/i;
/** Año de un encabezado escrito como sea: 2025, FY2025, 31/12/2025, "31 de diciembre de 2025", "Dic. 2025". */
function anioDe(v: Valor): number | null {
    if (typeof v === "number") return Number.isInteger(v) && v >= 1990 && v <= 2100 ? v : null;
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t || t.length > 34) return null;
    const m = t.match(ANIO_LIBRE);
    if (!m) return null;
    // Fuera del año sólo se aceptan día y mes: "1.234.567" o "2.025" no son encabezados
    if (t.replace(m[1], "").replace(/\d{1,2}/g, "").match(/\d/)) return null;
    return +m[1] >= 1990 && +m[1] <= 2100 ? +m[1] : null;
}
const NUMERO = /^\(?[-–−]?\s*(?:\$|COP|USD|US\$)?\s*\(?[-–−]?\d[\d.,\s]*\)?%?$|^[-–—]+$/i;
const esNumero = (s: string) => NUMERO.test(s.trim()) && !/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(s.trim());
const limpio = (s: string) => s.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();

/** Convierte en número los encabezados de año de las filas que tengan al menos dos, para que el motor los reconozca. */
function normalizarEncabezados(filas: Fila[]): Fila[] {
    return filas.map(f => {
        const anios = f.map(anioDe), n = new Set(anios.filter(Boolean)).size;
        return n >= 2 ? f.map((v, i) => anios[i] ?? v) : f;
    });
}

/** Separa una línea de texto en cuenta + cifras tomando desde el final los elementos numéricos. */
function partirLinea(linea: string): Fila {
    const l = limpio(linea).replace(/^#{1,6}\s+/, "");
    if (!l) return [];
    if (l.includes("|")) return l.replace(/^\||\|$/g, "").split("|").map(x => limpio(x)).filter((x, i, a) => !(i === a.length - 1 && !x)).filter(x => !/^:?-{3,}:?$/.test(x));
    if (linea.includes("\t")) return linea.split("\t").map(limpio);
    const tokens = l.split(" "), cifras: string[] = [];
    while (tokens.length && (esNumero(tokens[tokens.length - 1]) || anioDe(tokens[tokens.length - 1]))) cifras.unshift(tokens.pop()!);
    // Reagrupa números escritos con espacio como separador de miles ("1 234 567")
    const unidas: string[] = [];
    cifras.forEach(c => { const p = unidas[unidas.length - 1]; if (p && /^\d{1,3}$|\d \d{3}$/.test(p) && /^\d{3}\)?$/.test(c) && !anioDe(c)) unidas[unidas.length - 1] = p + " " + c; else unidas.push(c); });
    return [tokens.join(" "), ...unidas];
}

/** Arma un libro: separa bloques por encabezado de años y une los que tengan los mismos años (estados que siguen en otra página). */
function libroDeFilas(filas: Fila[], nombreBase: string): XLSX.WorkBook {
    const norm = normalizarEncabezados(filas.filter(f => f.some(v => v !== null && v !== "")));
    const contexto = norm.filter(f => { const v = f.filter(x => x !== null && x !== ""); return v.length === 1 && typeof v[0] === "string"; }).map(f => [f.find(x => x !== null && x !== "")!]).slice(0, 8);
    const bloques: { anios: string; filas: Fila[] }[] = [];
    let actual: { anios: string; filas: Fila[] } | null = null;
    for (const f of norm) {
        const anios = f.filter(v => typeof v === "number" && anioDe(v));
        if (anios.length >= 2 && new Set(anios).size === anios.length) {
            const clave = anios.join("|"), previo = bloques.find(b => b.anios === clave);
            if (previo) { actual = previo; continue; }
            actual = { anios: clave, filas: [...contexto, f] };
            bloques.push(actual);
        } else if (actual) actual.filas.push(alinear(f, actual.filas.find(x => x.filter(v => typeof v === "number" && anioDe(v)).length >= 2)!));
    }
    const wb = XLSX.utils.book_new();
    if (!bloques.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(norm), nombreHoja(nombreBase, 0));
    bloques.forEach((b, i) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(b.filas), nombreHoja(nombreBase, i)));
    return wb;
}
const nombreHoja = (base: string, i: number) => (base.replace(/[\\/?*[\]:]/g, " ").slice(0, 26) + (i ? " " + (i + 1) : "")).trim() || "Hoja";

/** Si una fila trae más cifras que años (columna de notas), conserva las últimas, que son las de los años. */
function alinear(f: Fila, encabezado: Fila): Fila {
    const cols = encabezado.map((v, i) => (typeof v === "number" && anioDe(v) ? i : -1)).filter(i => i >= 0);
    const textoIdx = f.findIndex(v => typeof v === "string" && v.trim() && !esNumero(v));
    const cifras = f.map((v, i) => ({ v, i })).filter(x => x.i > textoIdx && x.v !== null && x.v !== "" && (typeof x.v === "number" || esNumero(String(x.v))));
    if (textoIdx < 0 || cifras.length <= cols.length || cols.length < 2) return f;
    const out: Fila = Array(Math.max(...cols) + 1).fill(null);
    out[0] = f[textoIdx];
    cifras.slice(-cols.length).forEach((x, j) => { out[cols[j]] = x.v; });
    return out;
}

const textoXml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, "&");

/* ======================= PDF ======================= */
type Pieza = { s: string; x: number; x1: number; y: number; h: number };
async function filasPdf(bytes: Uint8Array): Promise<Fila[]> {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (typeof window !== "undefined") pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
    const filas: Fila[] = [];
    let columnas: number[] | null = null, letras = 0;
    for (let p = 1; p <= Math.min(doc.numPages, 60); p++) {
        const page = await doc.getPage(p), tc = await page.getTextContent();
        const piezas: Pieza[] = [];
        for (const it of tc.items as { str?: string; transform: number[]; width: number; height: number }[]) {
            if (!it.str || !it.str.trim()) continue;
            letras += it.str.length;
            piezas.push({ s: it.str, x: it.transform[4], x1: it.transform[4] + it.width, y: it.transform[5], h: Math.abs(it.height || it.transform[3] || 8) });
        }
        // Renglones por coordenada vertical
        piezas.sort((a, b) => b.y - a.y || a.x - b.x);
        const renglones: Pieza[][] = [];
        for (const pz of piezas) {
            const r = renglones.find(r => Math.abs(r[0].y - pz.y) <= Math.max(2, Math.min(r[0].h, pz.h) * 0.45));
            if (r) r.push(pz); else renglones.push([pz]);
        }
        renglones.sort((a, b) => b[0].y - a[0].y);
        for (const r of renglones) {
            r.sort((a, b) => a.x - b.x);
            // Une las piezas cercanas en celdas
            const celdas: { s: string; x: number; x1: number }[] = [];
            for (const pz of r) {
                const u = celdas[celdas.length - 1], ancho = pz.s.length ? (pz.x1 - pz.x) / pz.s.length : 4;
                if (u && pz.x - u.x1 < Math.max(2.5, ancho * 1.1)) { u.s += (pz.x - u.x1 > ancho * 0.25 ? " " : "") + pz.s; u.x1 = pz.x1; }
                else celdas.push({ s: pz.s, x: pz.x, x1: pz.x1 });
            }
            const textos = celdas.map(c => limpio(c.s));
            const anios = textos.map(anioDe);
            if (new Set(anios.filter(Boolean)).size >= 2) {
                const idx = anios.map((a, i) => (a ? i : -1)).filter(i => i >= 0);
                columnas = idx.map(i => (celdas[i].x + celdas[i].x1) / 2);
                filas.push(["Cuenta", ...idx.map(i => anios[i]!)]);
                continue;
            }
            if (!columnas) { filas.push([textos.join(" ")]); continue; }
            const sep = columnas.length > 1 ? Math.min(...columnas.slice(1).map((c, i) => c - columnas![i])) : 80;
            const fila: Fila = [null, ...columnas.map(() => null)];
            const etiqueta: string[] = [];
            celdas.forEach((c, i) => {
                const t = textos[i], centro = (c.x + c.x1) / 2, der = c.x1;
                if (!esNumero(t)) { if (c.x1 < columnas![0] - sep * 0.3 || !etiqueta.length) etiqueta.push(t); return; }
                // Cifras alineadas a la derecha: se asignan a la columna de año más cercana; las lejanas (notas) se descartan
                let mejor = -1, dist = Infinity;
                columnas!.forEach((col, j) => { const d = Math.min(Math.abs(col - centro), Math.abs(col - der) * 1.2); if (d < dist) { dist = d; mejor = j; } });
                if (dist <= Math.max(sep * 0.6, 30)) fila[mejor + 1] = t;
            });
            fila[0] = etiqueta.join(" ") || null;
            if (fila.slice(1).every(v => v === null)) filas.push(fila[0] ? [fila[0]] : []);
            else filas.push(fila);
        }
    }
    if (letras < 40) throw new Error("El PDF no tiene texto seleccionable (parece una imagen escaneada). Cárguelo en Excel, CSV o un PDF exportado desde el software contable.");
    return filas;
}

/* ======================= Documentos de Office y OpenDocument ======================= */
function celdasDocx(tr: string): Fila {
    const out: Fila = [];
    for (const tc of tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) ?? []) {
        const span = +(tc.match(/<w:gridSpan w:val="(\d+)"/)?.[1] ?? 1);
        const parrafos = (tc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [tc]).map(p => textoXml(p.replace(/<w:tab\/>/g, " ").replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g, "$1§").replace(/<[^>]+>/g, "").replace(/§/g, "")));
        out.push(limpio(parrafos.join(" ")) || null);
        for (let k = 1; k < span; k++) out.push(null);
    }
    return out;
}
function filasDocx(xml: string): Fila[] {
    const cuerpo = xml.replace(/^[\s\S]*?<w:body>/, "");
    const filas: Fila[] = [];
    for (const parte of cuerpo.split(/(<w:tbl>[\s\S]*?<\/w:tbl>)/)) {
        if (parte.startsWith("<w:tbl>")) (parte.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []).forEach(tr => filas.push(celdasDocx(tr)));
        else (parte.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).forEach(p => {
            const t = textoXml(p.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n").replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g, "$1").replace(/<(?!\/?w:t)[^>]+>/g, ""));
            t.split("\n").forEach(l => filas.push(partirLinea(l)));
        });
    }
    return filas;
}
function filasPptx(slides: string[]): Fila[] {
    const filas: Fila[] = [];
    for (const xml of slides) {
        for (const parte of xml.split(/(<a:tbl>[\s\S]*?<\/a:tbl>)/)) {
            if (parte.startsWith("<a:tbl>")) (parte.match(/<a:tr[ >][\s\S]*?<\/a:tr>/g) ?? []).forEach(tr => {
                const f: Fila = [];
                (tr.match(/<a:tc[ >][\s\S]*?<\/a:tc>|<a:tc\/>/g) ?? []).forEach(tc => f.push(limpio(textoXml((tc.match(/<a:t>[^<]*<\/a:t>/g) ?? []).join(" "))) || null));
                filas.push(f);
            });
            else (parte.match(/<a:p>[\s\S]*?<\/a:p>/g) ?? []).forEach(p => filas.push(partirLinea(textoXml((p.match(/<a:t>[^<]*<\/a:t>/g) ?? []).join("")))));
        }
    }
    return filas;
}
function filasOdf(xml: string): Fila[] {
    const filas: Fila[] = [];
    const cuerpo = xml.replace(/^[\s\S]*?<office:body>/, "");
    for (const parte of cuerpo.split(/(<table:table [\s\S]*?<\/table:table>)/)) {
        if (parte.startsWith("<table:table ")) (parte.match(/<table:table-row[ >][\s\S]*?<\/table:table-row>/g) ?? []).forEach(tr => {
            const f: Fila = [];
            (tr.match(/<table:(?:covered-)?table-cell[^>]*?(?:\/>|>[\s\S]*?<\/table:(?:covered-)?table-cell>)/g) ?? []).forEach(tc => {
                const rep = Math.min(+(tc.match(/number-columns-repeated="(\d+)"/)?.[1] ?? 1), 30), val = tc.match(/office:value="([^"]+)"/)?.[1];
                const t = val != null ? +val : limpio(textoXml(tc.replace(/<\/text:p>/g, " ").replace(/<text:(?:s|tab)\/>/g, " "))) || null;
                for (let k = 0; k < rep; k++) f.push(t);
            });
            filas.push(f);
        });
        else (parte.match(/<text:(?:p|h)[ >][\s\S]*?<\/text:(?:p|h)>/g) ?? []).forEach(p => filas.push(partirLinea(textoXml(p.replace(/<text:tab\/>/g, "\t")))));
    }
    return filas;
}
function filasRtf(rtf: string): Fila[] {
    const t = rtf.replace(/\{\\\*[^{}]*\}/g, "").replace(/\\'([0-9a-f]{2})/gi, (_, h) => new TextDecoder("windows-1252").decode(new Uint8Array([parseInt(h, 16)])))
        .replace(/\\cell\b ?/g, "\t").replace(/\\row\b ?/g, "\n").replace(/\\(?:par|line)\b ?/g, "\n").replace(/\\tab\b ?/g, "\t")
        .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(+n < 0 ? +n + 65536 : +n)).replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, "");
    return t.split(/\r?\n/).map(l => (l.includes("\t") ? l.split("\t").map(x => limpio(x) || null).filter((x, i, a) => x !== null || i < a.length - 1) : partirLinea(l)));
}

/* ======================= XBRL e iXBRL ======================= */
const IFRS: Record<string, string> = {
    CashAndCashEquivalents: "Efectivo y equivalentes al efectivo", TradeAndOtherCurrentReceivables: "Cuentas comerciales por cobrar y otras cuentas por cobrar corrientes", CurrentTradeReceivables: "Cuentas comerciales por cobrar",
    Inventories: "Inventarios", CurrentInventoriesHeldForSale: "Inventarios", CurrentAssets: "Total activos corrientes", PropertyPlantAndEquipment: "Propiedades, planta y equipo",
    IntangibleAssetsOtherThanGoodwill: "Activos intangibles distintos de la plusvalía", NoncurrentAssets: "Total activos no corrientes", Assets: "Total activos",
    TradeAndOtherCurrentPayables: "Cuentas comerciales por pagar y otras cuentas por pagar corrientes", OtherCurrentFinancialLiabilities: "Otros pasivos financieros corrientes",
    CurrentBorrowings: "Obligaciones financieras corrientes", ShorttermBorrowings: "Préstamos de corto plazo", CurrentLiabilities: "Total pasivos corrientes",
    OtherNoncurrentFinancialLiabilities: "Otros pasivos financieros no corrientes", NoncurrentPortionOfNoncurrentBorrowings: "Obligaciones financieras no corrientes", LongtermBorrowings: "Deuda de largo plazo",
    NoncurrentLeaseLiabilities: "Pasivos por arrendamiento no corrientes", NoncurrentLiabilities: "Total pasivos no corrientes", Liabilities: "Total pasivos", RetainedEarnings: "Ganancias acumuladas",
    NoncontrollingInterests: "Participaciones no controladoras", Equity: "Patrimonio total", EquityAndLiabilities: "Total patrimonio y pasivos",
    Revenue: "Ingresos de actividades ordinarias", RevenueFromContractsWithCustomers: "Ingresos de actividades ordinarias", CostOfSales: "Costo de ventas", GrossProfit: "Ganancia bruta",
    ProfitLossFromOperatingActivities: "Ganancia (pérdida) por actividades de operación", FinanceCosts: "Costos financieros", FinanceIncome: "Ingresos financieros",
    ProfitLossBeforeTax: "Ganancia (pérdida) antes de impuestos", IncomeTaxExpenseContinuingOperations: "Gasto por impuestos", ProfitLoss: "Ganancia (pérdida)",
    DepreciationAndAmortisationExpense: "Depreciación y amortización", AdministrativeExpense: "Gastos de administración", DistributionCosts: "Costos de distribución",
    // US GAAP
    CashAndCashEquivalentsAtCarryingValue: "Cash and cash equivalents", AssetsCurrent: "Total current assets", LiabilitiesCurrent: "Total current liabilities", LiabilitiesAndStockholdersEquity: "Total liabilities and equity",
    StockholdersEquity: "Total equity", Revenues: "Total revenues", RevenueFromContractWithCustomerExcludingAssessedTax: "Total revenues", OperatingIncomeLoss: "Operating income", NetIncomeLoss: "Net income",
    IncomeTaxExpenseBenefit: "Income tax", InterestExpense: "Interest expense", LongTermDebtNoncurrent: "Long-term debt", AccountsPayableCurrent: "Accounts payable", AccountsReceivableNetCurrent: "Accounts receivable", InventoryNet: "Inventory",
    IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest: "Income before income tax", RetainedEarningsAccumulatedDeficit: "Retained earnings", PropertyPlantAndEquipmentNet: "Property, plant and equipment",
};
const humano = (c: string) => c.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/^./, x => x.toUpperCase()).replace(/ (\w)/g, (_, x) => " " + x.toLowerCase());

function contextosXbrl(xml: string) {
    const ctx: Record<string, number> = {};
    for (const m of xml.matchAll(/<(?:[\w-]+:)?context\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?context>/g)) {
        const cuerpo = m[2];
        if (/<(?:[\w-]+:)?(?:segment|scenario)\b/.test(cuerpo)) continue;
        const inst = cuerpo.match(/<(?:[\w-]+:)?instant>\s*(\d{4})-(\d{2})-(\d{2})/), ini = cuerpo.match(/<(?:[\w-]+:)?startDate>\s*(\d{4}-\d{2}-\d{2})/), fin = cuerpo.match(/<(?:[\w-]+:)?endDate>\s*(\d{4})-(\d{2})-(\d{2})/);
        if (inst) ctx[m[1]] = +inst[1] - (+inst[2] === 1 && +inst[3] <= 15 ? 1 : 0);
        else if (ini && fin) {
            const dias = (Date.parse(`${fin[1]}-${fin[2]}-${fin[3]}`) - Date.parse(ini[1])) / 864e5;
            if (dias > 300 && dias < 400) ctx[m[1]] = +fin[1] - (+fin[2] === 1 && +fin[3] <= 15 ? 1 : 0);
        }
    }
    return ctx;
}
function filasXbrl(xml: string, inline: boolean): Fila[] {
    const ctx = contextosXbrl(xml), datos = new Map<string, Map<number, number>>();
    const poner = (concepto: string, ref: string, v: number) => {
        const y = ctx[ref];
        if (y == null || !isFinite(v)) return;
        if (!datos.has(concepto)) datos.set(concepto, new Map());
        if (!datos.get(concepto)!.has(y)) datos.get(concepto)!.set(y, v);
    };
    if (inline) {
        for (const m of xml.matchAll(/<ix:nonFraction\b([^>]*)>([\s\S]*?)<\/ix:nonFraction>/gi)) {
            const at = m[1], nombre = at.match(/\bname="([^"]+)"/)?.[1], ref = at.match(/\bcontextRef="([^"]+)"/i)?.[1];
            if (!nombre || !ref) continue;
            const formato = at.match(/\bformat="([^"]+)"/)?.[1] ?? "", escala = +(at.match(/\bscale="(-?\d+)"/)?.[1] ?? 0), negativo = /\bsign="-"/.test(at);
            let s = textoXml(m[2]).replace(/\s/g, "");
            if (/zerodash|fixed-zero/i.test(formato) || /^[-–—]$/.test(s)) s = "0";
            s = /comma-?decimal|numcommadecimal/i.test(formato) ? s.replace(/[.\s]/g, "").replace(",", ".") : s.replace(/[,\s]/g, "");
            poner(nombre.split(":").pop()!, ref, (negativo ? -1 : 1) * parseFloat(s) * Math.pow(10, escala));
        }
    } else {
        for (const m of xml.matchAll(/<([\w-]+):(\w+)\b([^>]*\bcontextRef="([^"]+)"[^>]*)>\s*(-?[\d.]+(?:[eE][-+]?\d+)?)\s*<\/\1:\2>/g)) {
            if (/^(xbrli|link|xlink)$/.test(m[1])) continue;
            poner(m[2], m[4], parseFloat(m[5]));
        }
    }
    const anios = [...new Set([...datos.values()].flatMap(v => [...v.keys()]))].sort();
    if (anios.length < 2 || !datos.size) throw new Error("El XBRL no trae cifras de al menos dos años sin dimensiones.");
    const entidad = xml.match(/<(?:[\w-]+:)?(?:NameOfReportingEntityOrOtherMeansOfIdentification|EntityRegistrantName)\b[^>]*>([^<]+)</)?.[1];
    const moneda = /iso4217:COP/i.test(xml) ? "Cifras en pesos colombianos (COP)" : /iso4217:USD/i.test(xml) ? "Amounts in US$" : "";
    const filas: Fila[] = [];
    if (entidad) filas.push([limpio(textoXml(entidad))]);
    if (moneda) filas.push([moneda]);
    filas.push(["Cuenta", ...anios]);
    // Primero los conceptos conocidos en el orden del diccionario (balance, luego resultados), después el resto
    const conocidos = Object.keys(IFRS).filter(k => datos.has(k)), otros = [...datos.keys()].filter(k => !IFRS[k]).sort();
    for (const k of [...conocidos, ...otros]) filas.push([IFRS[k] ?? humano(k), ...anios.map(y => datos.get(k)!.get(y) ?? null)]);
    return filas;
}

/* ======================= JSON ======================= */
function filasJson(v: unknown): Fila[] {
    const filas: Fila[] = [];
    const esAnioClave = (k: string) => anioDe(k) != null;
    const num = (x: unknown): Valor => (typeof x === "number" ? x : typeof x === "string" ? x : null);
    if (Array.isArray(v) && v.every(Array.isArray)) return (v as unknown[][]).map(f => f.map(num));
    if (Array.isArray(v) && v.length && v.every(x => x && typeof x === "object")) {
        const objs = v as Record<string, unknown>[], claves = [...new Set(objs.flatMap(o => Object.keys(o)))];
        const kAnio = claves.find(k => /^(anio|año|ano|year|periodo|period|fy|ejercicio)$/i.test(k)), kValor = claves.find(k => /^(valor|value|monto|amount|saldo|importe)$/i.test(k)), kCuenta = claves.find(k => /^(cuenta|concepto|account|label|nombre|name|item|partida|rubro)$/i.test(k));
        if (kAnio && kValor && kCuenta) {
            const anios = [...new Set(objs.map(o => anioDe(o[kAnio] as Valor)).filter((y): y is number => y != null))].sort(), cuentas: string[] = [], mapa = new Map<string, Map<number, Valor>>();
            objs.forEach(o => { const c = String(o[kCuenta]), y = anioDe(o[kAnio] as Valor); if (y == null) return; if (!mapa.has(c)) { mapa.set(c, new Map()); cuentas.push(c); } mapa.get(c)!.set(y, num(o[kValor])); });
            return [["Cuenta", ...anios], ...cuentas.map(c => [c, ...anios.map(y => mapa.get(c)!.get(y) ?? null)])];
        }
        return [claves, ...objs.map(o => claves.map(k => num(o[k])))];
    }
    // Objetos anidados: cada hoja cuyo contenido sea {año: valor} es una cuenta
    let anios: number[] = [];
    const recorrer = (o: unknown, etiqueta: string) => {
        if (!o || typeof o !== "object") return;
        const ks = Object.keys(o as object);
        if (ks.length >= 2 && ks.filter(esAnioClave).length >= 2) {
            const ys = ks.map(k => anioDe(k)).filter((y): y is number => y != null);
            if (!anios.length) { anios = [...new Set(ys)].sort(); filas.push(["Cuenta", ...anios]); }
            filas.push([etiqueta, ...anios.map(y => num((o as Record<string, unknown>)[ks.find(k => anioDe(k) === y)!]))]);
            return;
        }
        if (Array.isArray(o)) { const f = filasJson(o); if (f.length > 1) filas.push(...f); return; }
        for (const k of ks) {
            const x = (o as Record<string, unknown>)[k];
            if (typeof x === "string" && /nombre|name|empresa|company|razon|moneda|currency|unidad|unit/i.test(k)) filas.push([/nombre|name|empresa|company|razon/i.test(k) ? x : `${k}: ${x}`]);
            else recorrer(x, k);
        }
    };
    recorrer(v, "");
    return filas;
}

/* ======================= Selector ======================= */
const extension = (n: string) => (n.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
function firma(b: Uint8Array) {
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf";
    if (b[0] === 0x50 && b[1] === 0x4b) return "zip";
    if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "ole";
    return "texto";
}
const enUnidades = (wb: XLSX.WorkBook) => Object.assign(wb, { mirageUnidad: "unidades" });
const deTexto = (texto: string, nombre: string) => libroDeFilas(texto.split(/\r?\n/).map(partirLinea), nombre);

/** Lee el archivo y devuelve un libro con los estados como tabla. Lanza un error claro si el formato no tiene estados legibles. */
export async function leerCualquiera(datos: ArrayBuffer | Uint8Array, nombre = "", profundidad = 0): Promise<XLSX.WorkBook> {
    const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos), ext = extension(nombre), base = nombre.replace(/\.[^.]+$/, "") || "Estados", tipo = firma(bytes);
    if (tipo === "pdf") return libroDeFilas(await filasPdf(bytes), base);
    if (tipo === "zip") {
        const zip = await JSZip.loadAsync(bytes), txt = (p: string) => zip.file(p)?.async("string");
        const mime = ((await txt("mimetype")) ?? "").trim();
        if (zip.file("xl/workbook.xml") || zip.file("xl/workbook.bin") || /spreadsheet/.test(mime) || zip.file("Index/Document.iwa")) return leerArchivo(bytes, HOJAS.includes(ext) ? nombre : base + ".xlsx");
        if (zip.file("word/document.xml")) return libroDeFilas(filasDocx((await txt("word/document.xml"))!), base);
        const slides = zip.file(/^ppt\/slides\/slide\d+\.xml$/).sort((a, b) => +a.name.match(/\d+/)![0] - +b.name.match(/\d+/)![0]);
        if (slides.length) return libroDeFilas(filasPptx(await Promise.all(slides.map(s => s.async("string")))), base);
        if (/opendocument\.(text|presentation)/.test(mime) && zip.file("content.xml")) return libroDeFilas(filasOdf((await txt("content.xml"))!), base);
        const vista = zip.file(/(^|\/)(QuickLook\/)?Preview\.pdf$/i)[0];
        if (vista) return libroDeFilas(await filasPdf(await vista.async("uint8array")), base);
        if (profundidad < 2) {
            const candidatos = Object.values(zip.files).filter(f => !f.dir && !/(^|\/)(__MACOSX|\.)/.test(f.name) && [...HOJAS, ...DOCUMENTOS].includes(extension(f.name)))
                .sort((a, b) => Number(HOJAS.includes(extension(b.name))) - Number(HOJAS.includes(extension(a.name))));
            for (const f of candidatos) {
                try { const wb = await leerCualquiera(await f.async("uint8array"), f.name.split("/").pop()!, profundidad + 1); parseWorkbook(wb, f.name); return wb; } catch { /* siguiente archivo */ }
            }
        }
        throw new Error("No encontré estados financieros legibles dentro del archivo comprimido.");
    }
    if (tipo === "ole") {
        if (/^(doc|dot|ppt|pps)$/.test(ext)) throw new Error("Los documentos de Word o PowerPoint 97-2003 no se pueden leer. Guárdelo como .docx, .pptx o PDF.");
        return leerArchivo(bytes, HOJAS.includes(ext) ? nombre : base + ".xls");
    }
    if (HOJAS.includes(ext) && ext !== "prn") return leerArchivo(bytes, nombre);
    const texto = decodificarTexto(bytes), cabeza = texto.slice(0, 4000);
    if (/^\s*\{\\rtf/.test(texto)) return libroDeFilas(filasRtf(texto), base);
    // XBRL reporta en la unidad monetaria (pesos o dólares), con la escala ya aplicada
    if (/<ix:nonFraction\b/i.test(texto)) return enUnidades(libroDeFilas(filasXbrl(texto, true), base));
    if (/<(?:[\w-]+:)?xbrl[\s>]/.test(cabeza)) return enUnidades(libroDeFilas(filasXbrl(texto, false), base));
    if (/urn:schemas-microsoft-com:office:spreadsheet|<office:document\b/.test(cabeza) || (/<table[\s>]/i.test(texto) && /<t[dh][\s>]/i.test(texto))) {
        try { const wb = XLSX.read(texto, { type: "string", cellDates: true }); parseWorkbook(wb, nombre); return wb; }
        catch { if (/<html|<body/i.test(cabeza)) return deTexto(textoXml(texto.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<\/t[dh]>/gi, "\t").replace(/<\/(tr|p|div|li|h\d)>|<br\s*\/?>/gi, "\n")), base); }
    }
    if (/^\s*[[{]/.test(texto)) { try { return libroDeFilas(filasJson(JSON.parse(texto)), base); } catch { /* no es JSON */ } }
    if (/^\s*</.test(texto)) return deTexto(textoXml(texto.replace(/>\s*</g, ">\n<")), base);
    // Texto plano: CSV con separador si lo tiene; si no, reporte de texto con columnas por espacios o barras
    const lineas = texto.split(/\r?\n/).slice(0, 50), separador = lineas.filter(l => /[;,]/.test(l) && !/\s{2,}/.test(l)).length > lineas.length / 2;
    if (separador || ext === "csv" || ext === "tsv") return leerArchivo(bytes, base + ".csv");
    return deTexto(texto, base);
}

/** Lee y mapea: primero el libro tal cual; si el motor no encuentra años, reintenta con encabezados de año normalizados. */
export async function leerEstados(datos: ArrayBuffer | Uint8Array, nombre: string): Promise<Parsed> {
    const wb = await leerCualquiera(datos, nombre);
    const unidad = (wb as { mirageUnidad?: string }).mirageUnidad;
    try { const p = parseWorkbook(wb, nombre) as Parsed; if (unidad) p.unit = unidad; return p; }
    catch (e) {
        const norm = XLSX.utils.book_new();
        wb.SheetNames.forEach(n => XLSX.utils.book_append_sheet(norm, XLSX.utils.aoa_to_sheet(normalizarEncabezados(XLSX.utils.sheet_to_json<Fila>(wb.Sheets[n], { header: 1, raw: true, defval: null }))), n));
        try { return parseWorkbook(norm, nombre) as Parsed; } catch { throw e; }
    }
}
