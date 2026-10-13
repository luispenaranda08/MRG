import ExcelJS from "exceljs";
import { putCell, applyTone, pieCalculadora } from "./excel";
import type { Documento } from "./documento";
import { VEREDICTO, type DecisionJev } from "./jev";
import type { Estilo } from "./api";

export function agregarDecision(w: ExcelJS.Workbook, estilo: Estilo, jev?: DecisionJev) {
    if (!jev) return;
    const s = w.addWorksheet("Recomendación");
    s.addRow(["Recomendación"]).eachCell(c => applyTone(c, estilo, "encabezado"));
    const r = s.addRow(["Veredicto", VEREDICTO[jev.veredicto]]);
    const tonos = { favorable: "sube", desfavorable: "baja", con_reservas: "alerta", informativo: "nota" } as const;
    applyTone(r.getCell(2), estilo, tonos[jev.veredicto]);
    s.addRow(["Decisión", jev.decision]);
    jev.recomendaciones.forEach(t => s.addRow(["Recomendación", t]));
    jev.alertas.forEach(t => s.addRow(["Alerta", t]));
    s.getColumn(1).width = 24; s.getColumn(2).width = 90;
    s.eachRow(r => r.eachCell(c => c.alignment = { wrapText: true, vertical: "top" }));
}
export function documentoWorkbook(doc: Documento) {
    const w = new ExcelJS.Workbook(); w.creator = "Mirage · HyperTarget"; w.title = `${doc.titulo}${doc.empresa ? ` ? ${doc.empresa}` : ""}`;
    const s = w.addWorksheet("Documento");
    for (const texto of [doc.titulo, ...(doc.empresa ? [`Empresa o proyecto: ${doc.empresa}`] : []), `Datos de mercado al ${doc.corte}`, doc.conclusion]) s.addRow([texto]);
    for (const [titulo, filas] of [["Supuestos", doc.supuestos], ["Resultados", doc.resultados]] as const) {
        s.addRow([titulo, "Valor"]).eachCell(c => applyTone(c, doc.estilo, "encabezado"));
        filas.forEach(f => { const r = s.addRow([f.concepto]); putCell(r.getCell(2), f.cifra, doc.estilo); if (f.cifra.tono === "alerta") { applyTone(r.getCell(1), doc.estilo, "alerta"); applyTone(r.getCell(2), doc.estilo, "alerta"); } });
    }
    doc.tablas.forEach(t => { s.addRow([t.titulo]); s.addRow(t.columnas).eachCell(c => applyTone(c, doc.estilo, "encabezado")); t.filas.forEach(f => s.addRow(f)); if (t.nota) s.addRow([t.nota]); });
    s.addRow(["Método", doc.metodo]); doc.notas.forEach(n => s.addRow([n])); doc.fuentes.forEach(f => s.addRow([f.nombre, f.url])); s.addRow([doc.aviso]);
    s.columns.forEach((c, i) => c.width = i === 0 ? 50 : 35); s.eachRow(r => r.eachCell(c => c.alignment = { wrapText: true, vertical: "top" }));
    agregarDecision(w, doc.estilo, doc.jev);
    return pieCalculadora(w, doc.estilo);
}
