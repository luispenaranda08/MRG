import type ExcelJS from "exceljs";
import { ETIQUETAS, MENU, type Decision } from "./decisiones";

export type SeleccionDocumento = { sector: string; sectorOrigen: string; tamano: string; tamanoOrigen: string };

export function filasDecisiones(decisiones: Decision[], seleccion: SeleccionDocumento) {
    const filas: string[][] = [["Decisión", "Opción elegida", "Alternativas", "Motivo", "Origen"]];
    for (const d of decisiones) {
        const e = ETIQUETAS[d.clave];
        filas.push([e.titulo, e.opciones[d.opcion as never], (MENU[d.clave] as readonly string[]).map(o => e.opciones[o as never]).join("; "), d.motivo, d.origen === "jev" ? "JEV" : d.origen === "usuario" ? "Usted" : "Mirage (por defecto)"]);
    }
    filas.push(["Sector", seleccion.sector, "", "", seleccion.sectorOrigen]);
    filas.push(["Tamaño", seleccion.tamano, "", "", seleccion.tamanoOrigen]);
    return filas;
}

export function agregarHojaDecisiones(wb: ExcelJS.Workbook, decisiones: Decision[], seleccion: SeleccionDocumento) {
    const ws = wb.addWorksheet("Decisiones de JEV");
    filasDecisiones(decisiones, seleccion).forEach((fila, i) => {
        const row = ws.addRow(fila);
        row.eachCell(cell => {
            cell.alignment = { vertical: "top", wrapText: true };
            if (i === 0) cell.font = { bold: true };
        });
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.columns = [{ width: 30 }, { width: 48 }, { width: 78 }, { width: 50 }, { width: 24 }];
    return ws;
}

