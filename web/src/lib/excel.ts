import { nombreArchivo } from "./nombres";
import ExcelJS from "exceljs";
import { fmt, type Celda, type Datos, type Estilo, type Tono } from "./api";
export function applyTone(c: ExcelJS.Cell, estilo: Estilo, tono: Tono) { const t = estilo.tonos[tono]; c.font = { name: estilo.fuentes_tipograficas.cifras, color: { argb: t.texto.replace("#", "FF") }, bold: t.negrita }; if (t.fondo)
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: t.fondo.replace("#", "FF") } }; if (t.borde)
    c.border = { bottom: { style: "thin", color: { argb: t.borde.replace("#", "FF") } } }; }
export function putCell(c: ExcelJS.Cell, v: Celda, e: Estilo) { c.value = v.v; c.numFmt = e.formatos[v.fmt]; applyTone(c, e, v.tono); if (v.nota || v.fuente)
    c.note = [v.nota, v.fuente, v.corte].filter(Boolean).join(" · "); }
export function download(content: BlobPart, filename: string, mime: string) { const url = URL.createObjectURL(new Blob([content], { type: mime })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export async function saveWorkbook(w: ExcelJS.Workbook, name: string) { const buf = await w.xlsx.writeBuffer(); download(new Uint8Array(buf).buffer, name, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); }
export function sources(w: ExcelJS.Workbook, d: Datos) { const f = w.addWorksheet("Fuentes"); f.addRow(["Fuente", "URL", "Licencia"]); f.addRow([d.meta.aviso, d.meta.corte, d.meta.version]); d.meta.fuentes.forEach(x => f.addRow([x.nombre, x.url, x.licencia])); const m = w.addWorksheet("Método"); m.addRow(["Pasos del método"]); d.metodo.pasos.forEach(p => m.addRow([p])); for (const s of [f, m]) {
    s.columns.forEach(c => c.width = 55);
    s.getRow(1).eachCell(c => applyTone(c, d.estilo, "encabezado"));
    s.eachRow(r => r.eachCell(c => c.alignment = { wrapText: true, vertical: "top" }));
} }
export function tableWorkbook(d: Datos, headers: string[], rows: (string | Celda)[][], name: string, empresa = "") { const w = new ExcelJS.Workbook(), s = w.addWorksheet(name); s.addRow(headers).eachCell(c => applyTone(c, d.estilo, "encabezado")); rows.forEach(r => { const row = s.addRow([]); r.forEach((v, i) => { const c = row.getCell(i + 1); if (typeof v === "string")
    c.value = v;
else
    putCell(c, v, d.estilo); }); }); s.views = [{ state: "frozen", ySplit: 1 }]; s.columns.forEach((c, i) => c.width = i === 1 ? 48 : 20); const vs = w.addWorksheet("Variaciones"); vs.addRow(["Fila", "Columna", "Variación frente al corte anterior"]); rows.forEach((r, j) => r.forEach((v, i) => { if (typeof v !== "string" && v.var?.v != null) {
    const row = vs.addRow([j + 1, headers[i], v.var.v]);
    putCell(row.getCell(3), { ...v, v: v.var.v, tono: v.var.tono }, d.estilo);
} })); if (vs.rowCount === 1)
    vs.addRow(["Sin corte anterior disponible"]); vs.getRow(1).eachCell(c => applyTone(c, d.estilo, "encabezado")); sources(w, d); w.creator = "Mirage · HyperTarget"; w.title = `${name}${empresa.trim() ? ` · ${empresa.trim()}` : ""}`; if (empresa.trim()) w.eachSheet(ws => { ws.headerFooter.oddHeader = `&L${empresa.replace(/&/g, "&&")}`; ws.addRow(["Empresa o proyecto", empresa.trim()]); }); return w; }
export async function exportTable(d: Datos, headers: string[], rows: (string | Celda)[][], name: string, empresa = "") { await saveWorkbook(tableWorkbook(d, headers, rows, name, empresa), nombreArchivo(name, empresa)); }
export function exportCSV(headers: string[], rows: (string | Celda)[][], empresa = "") { const q = (v: string) => '"' + v.replace(/"/g, '""') + '"'; download("\uFEFF" + [...(empresa.trim() ? [["Empresa o proyecto", empresa.trim()]] : []), headers, ...rows.map(r => r.map(v => typeof v === "string" ? v : fmt(v)))].map(r => r.map(v => q(/^[=+@-]/.test(v) ? "'" + v : v)).join(";")).join("\r\n"), nombreArchivo("WACC", empresa, undefined, "csv"), "text/csv;charset=utf-8"); }
