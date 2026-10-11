import ExcelJS from "exceljs";
import { putCell, applyTone, pieCalculadora } from "./excel";
import type { Documento } from "./documento";
export function documentoWorkbook(doc: Documento) {
    const w = new ExcelJS.Workbook(); w.creator = "Mirage · HyperTarget"; w.title = `${doc.titulo} · ${doc.empresa}`;
    const s = w.addWorksheet("Documento");
    for (const texto of [doc.titulo, ...(doc.empresa ? [`Empresa o proyecto: ${doc.empresa}`] : []), `Datos de mercado al ${doc.corte}`, doc.conclusion]) s.addRow([texto]);
    for (const [titulo, filas] of [["Supuestos", doc.supuestos], ["Resultados", doc.resultados]] as const) {
        s.addRow([titulo, "Valor"]).eachCell(c => applyTone(c, doc.estilo, "encabezado"));
        filas.forEach(f => { const r = s.addRow([f.concepto]); putCell(r.getCell(2), f.cifra, doc.estilo); });
    }
    doc.tablas.forEach(t => { s.addRow([t.titulo]); s.addRow(t.columnas).eachCell(c => applyTone(c, doc.estilo, "encabezado")); t.filas.forEach(f => s.addRow(f)); if (t.nota) s.addRow([t.nota]); });
    s.addRow(["Método", doc.metodo]); doc.notas.forEach(n => s.addRow([n])); doc.fuentes.forEach(f => s.addRow([f.nombre, f.url])); s.addRow([doc.aviso]);
    s.columns.forEach((c, i) => c.width = i === 0 ? 50 : 35); s.eachRow(r => r.eachCell(c => c.alignment = { wrapText: true, vertical: "top" }));
    return pieCalculadora(w, doc.estilo);
}
