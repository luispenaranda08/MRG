import { celda, fmt, waccSector, type Datos, type Sector } from "./api";
import { armarDocumento, type Documento } from "./documento";
import { tableWorkbook, pieCalculadora } from "./excel";
import { agregarDecision } from "./documento-excel";
export const columnasWacc = ["CIIU", "Sector", "Empresas", "Beta sin deuda", "D/E", "Beta con deuda", "Ke COP", "Kd COP"];
export function filasWacc(sectores: Sector[], moneda: string, modalidad: string) {
    return sectores.map(s => [s.ciiu_division, s.nombre, s.empresas, s.beta_desapalancada, s.de, s.beta_apalancada, s.ke, s.kd, waccSector(s, moneda, modalidad), ...s.wacc_rango]);
}
export function documentoWacc(d: Datos, sectores: Sector[], moneda: string, modalidad: string): Documento {
    const doc = armarDocumento("capital", { mercado: d, entrada: { deuda: 0, patrimonio: 1, ebit: 0, gastos: 0, tarifa: 0, total: false, primaTamano: false }, sector: "", tamano: "" }, {});
    return { ...doc, titulo: "Costo de capital por sector", conclusion: `${sectores.length} sectores con WACC en ${moneda}, tasa ${modalidad}. Ke, Kd y rangos corresponden a COP nominal.`,
        supuestos: [{ concepto: "Moneda", cifra: celda(moneda, "txt", "insumo") }, { concepto: "Modalidad", cifra: celda(modalidad, "txt", "insumo") }], resultados: [], notas: [],
        tablas: [{ titulo: "Sectores seleccionados", columnas: [...columnasWacc, `WACC ${moneda} ${modalidad}`, "p25 COP nominal", "p75 COP nominal"], filas: filasWacc(sectores, moneda, modalidad).map(r => r.map(v => typeof v === "string" ? v : fmt(v))) }],
        metodo: d.metodo.pasos.join(" ") };
}
export function waccWorkbook(d: Datos, sectores: Sector[], moneda: string, modalidad: string, doc: Documento) {
    const w = tableWorkbook(d, [...columnasWacc, `WACC ${moneda} ${modalidad}`, "p25 COP nominal", "p75 COP nominal"], filasWacc(sectores, moneda, modalidad), "WACC");
    agregarDecision(w, d.estilo, doc.jev);
    return pieCalculadora(w, d.estilo);
}
