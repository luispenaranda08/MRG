import { celda, fmt, waccSector, convertirWaccCopNominal, type Datos, type Sector } from "./api";
import { armarDocumento, type Documento } from "./documento";
import { tableWorkbook, pieCalculadora } from "./excel";
import { agregarDecision } from "./documento-excel";
export const columnasWacc = ["CIIU", "Sector", "Empresas", "Beta sin deuda", "D/E", "Beta con deuda", "Ke COP", "Kd COP"];
export function filasWacc(sectores: Sector[], moneda: string, modalidad: string, tamano = "Todo el sector", d?: Datos) {
    return sectores.map(s => { const t = s.por_tamano[tamano], missing = celda(null,"pct","nota","Menos de 10 empresas."); return tamano === "Todo el sector" ? [s.ciiu_division, s.nombre, s.empresas, s.beta_desapalancada, s.de, s.beta_apalancada, s.ke, s.kd, waccSector(s, moneda, modalidad), ...s.wacc_rango] : [s.ciiu_division, s.nombre, t?.empresas || celda(null,"num","nota","Menos de 10 empresas."), celda(null,"x","nota"), t?.de || celda(null,"x","nota","Menos de 10 empresas."), t?.beta_apalancada || celda(null,"x","nota","Menos de 10 empresas."), t?.ke || missing, t?.kd || celda(null,"pct","nota","Menos de 10 empresas."), convertirWaccCopNominal(t?.wacc_cop_nominal, moneda, modalidad, d!.parametros)]; });
}
export function documentoWacc(d: Datos, sectores: Sector[], moneda: string, modalidad: string, tamano = "Todo el sector"): Documento {
    const doc = armarDocumento("capital", { mercado: d, entrada: { deuda: 0, patrimonio: 1, ebit: 0, gastos: 0, tarifa: 0, total: false }, sector: "", tamano: "" }, {});
    return { ...doc, titulo: `Costo de capital por sector${tamano === "Todo el sector" ? "" : ` · ${tamano}`}`, conclusion: `${sectores.length} sectores con WACC en ${moneda}, tasa ${modalidad}. Tamaño: ${tamano}.`,
        supuestos: [{ concepto: "Moneda", cifra: celda(moneda, "txt", "insumo") }, { concepto: "Modalidad", cifra: celda(modalidad, "txt", "insumo") }, { concepto: "Tamaño", cifra: celda(tamano, "txt", "insumo") }], resultados: [], notas: [],
        tablas: [{ titulo: "Sectores seleccionados", columnas: [...columnasWacc, `WACC ${moneda} ${modalidad}`, ...(tamano === "Todo el sector" ? ["p25 COP nominal", "p75 COP nominal"] : [])], filas: filasWacc(sectores, moneda, modalidad, tamano, d).map(r => r.map(v => typeof v === "string" ? v : fmt(v))) }],
        metodo: d.metodo.pasos.join(" ") };
}
export function waccWorkbook(d: Datos, sectores: Sector[], moneda: string, modalidad: string, doc: Documento, tamano = "Todo el sector") {
    const w = tableWorkbook(d, [...columnasWacc, `WACC ${moneda} ${modalidad}`, ...(tamano === "Todo el sector" ? ["p25 COP nominal", "p75 COP nominal"] : [])], filasWacc(sectores, moneda, modalidad, tamano, d), "WACC");
    agregarDecision(w, d.estilo, doc.jev);
    return pieCalculadora(w, d.estilo);
}
