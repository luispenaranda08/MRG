/**
 * Conversión de tasas de interés con la nomenclatura colombiana.
 *
 * Basado en la "Calculadora Financiera v9" (hoja ICNV) y la tabla TPERIODOS de "Sistemas de Amortización"
 * de referencia, ampliado a tasas anticipadas.
 *
 * Códigos aceptados:
 * - Efectiva anual: `EA`.
 * - Efectiva periódica vencida: `EM`, `EB`, `ET`, `ES`, `EQ`, `EW`, `ED`.
 * - Nominal anual vencida: `NAMV`, `NABV`, `NATV`, `NASV`, `NAQV`, `NAWV`, `NADV`, `NA` (= EA).
 * - Nominal anual anticipada: `NAMA`, `NABA`, `NATA`, `NASA`, `NAQA`, `NAWA`, `NAA`.
 * - Periódica anticipada: `MA`, `BA`, `TA`, `SA`, `QA`, `WA`, `AA`.
 *
 * Todas las tasas se manejan como fracción (0,12 = 12 %).
 */

export interface Frecuencia {
    frecuencia: string;
    plural: string;
    adjetivo: string;
    m: number;
    efectiva: string;
    nominalVencida: string;
    nominalAnticipada: string;
    periodicaAnticipada: string;
}

/** Tabla TPERIODOS de referencia (más la columna de tasa periódica anticipada). */
export const PERIODOS: Frecuencia[] = [
    { frecuencia: "Año", plural: "Años", adjetivo: "Anual", m: 1, efectiva: "EA", nominalVencida: "NA", nominalAnticipada: "NAA", periodicaAnticipada: "AA" },
    { frecuencia: "Semestre", plural: "Semestres", adjetivo: "Semestral", m: 2, efectiva: "ES", nominalVencida: "NASV", nominalAnticipada: "NASA", periodicaAnticipada: "SA" },
    { frecuencia: "Trimestre", plural: "Trimestres", adjetivo: "Trimestral", m: 4, efectiva: "ET", nominalVencida: "NATV", nominalAnticipada: "NATA", periodicaAnticipada: "TA" },
    { frecuencia: "Bimestre", plural: "Bimestres", adjetivo: "Bimestral", m: 6, efectiva: "EB", nominalVencida: "NABV", nominalAnticipada: "NABA", periodicaAnticipada: "BA" },
    { frecuencia: "Mes", plural: "Meses", adjetivo: "Mensual", m: 12, efectiva: "EM", nominalVencida: "NAMV", nominalAnticipada: "NAMA", periodicaAnticipada: "MA" },
    { frecuencia: "Quincena", plural: "Quincenas", adjetivo: "Quincenal", m: 24, efectiva: "EQ", nominalVencida: "NAQV", nominalAnticipada: "NAQA", periodicaAnticipada: "QA" },
    { frecuencia: "Semana", plural: "Semanas", adjetivo: "Semanal", m: 52, efectiva: "EW", nominalVencida: "NAWV", nominalAnticipada: "NAWA", periodicaAnticipada: "WA" },
    { frecuencia: "Día", plural: "Días", adjetivo: "Diaria", m: 365, efectiva: "ED", nominalVencida: "NADV", nominalAnticipada: "NADA", periodicaAnticipada: "DA" },
];

export type Clase = "efectiva" | "nominal_vencida" | "nominal_anticipada" | "periodica_anticipada";

export interface TipoTasa { codigo: string; clase: Clase; m: number; frecuencia: Frecuencia }

export class ErrorFinanciero extends Error {
    constructor(mensaje: string) { super(mensaje); this.name = "ErrorFinanciero"; }
}

/** Interpreta un código de tasa (`NAMV`, `EA`, `ET`, `NATA`…). */
export function tipoTasa(codigo: string): TipoTasa {
    const c = codigo.trim().toUpperCase().replace(/[\s.%]/g, "");
    for (const f of PERIODOS) {
        if (c === f.efectiva) return { codigo: c, clase: "efectiva", m: f.m, frecuencia: f };
        if (c === f.nominalVencida) return { codigo: c, clase: "nominal_vencida", m: f.m, frecuencia: f };
        if (c === f.nominalAnticipada) return { codigo: c, clase: "nominal_anticipada", m: f.m, frecuencia: f };
        if (c === f.periodicaAnticipada) return { codigo: c, clase: "periodica_anticipada", m: f.m, frecuencia: f };
    }
    throw new ErrorFinanciero(`Código de tasa desconocido: "${codigo}". Use, por ejemplo, EA, EM, NAMV, NATV o NAMA.`);
}

/** Busca la frecuencia por nombre ("Mensual", "Mes", "Meses") o por número de periodos al año. */
export function frecuencia(f: string | number): Frecuencia {
    if (typeof f === "number") {
        const r = PERIODOS.find(p => p.m === f);
        if (!r) throw new ErrorFinanciero(`No hay una frecuencia con ${f} periodos por año.`);
        return r;
    }
    const k = f.trim().toLowerCase();
    const r = PERIODOS.find(p => [p.frecuencia, p.plural, p.adjetivo].some(x => x.toLowerCase() === k));
    if (!r) throw new ErrorFinanciero(`Frecuencia desconocida: "${f}".`);
    return r;
}

/** Tasa periódica vencida equivalente a la tasa dada (en su propio periodo). */
function periodicaVencida(tasa: number, t: TipoTasa): number {
    switch (t.clase) {
        case "efectiva": return tasa;
        case "nominal_vencida": return tasa / t.m;
        case "nominal_anticipada": { const ia = tasa / t.m; if (ia >= 1) throw new ErrorFinanciero("Tasa anticipada mayor o igual al 100 % del periodo."); return ia / (1 - ia); }
        case "periodica_anticipada": { if (tasa >= 1) throw new ErrorFinanciero("Tasa anticipada mayor o igual al 100 % del periodo."); return tasa / (1 - tasa); }
    }
}

/** Tasa efectiva anual equivalente. */
export function efectivaAnual(tasa: number, codigo: string): number {
    const t = tipoTasa(codigo);
    const ip = periodicaVencida(tasa, t);
    if (ip <= -1) throw new ErrorFinanciero("La tasa periódica debe ser mayor que −100 %.");
    return Math.pow(1 + ip, t.m) - 1;
}

/** Convierte una tasa de un tipo a otro: `convertir(0.14, "NAMV", "EA")`. */
export function convertir(tasa: number, desde: string, hacia: string): number {
    const ea = efectivaAnual(tasa, desde);
    const t = tipoTasa(hacia);
    const ip = Math.pow(1 + ea, 1 / t.m) - 1;
    switch (t.clase) {
        case "efectiva": return ip;
        case "nominal_vencida": return ip * t.m;
        case "nominal_anticipada": return (ip / (1 + ip)) * t.m;
        case "periodica_anticipada": return ip / (1 + ip);
    }
}

export interface Equivalencia {
    frecuencia: string;
    adjetivo: string;
    m: number;
    periodica: { codigo: string; tasa: number };
    nominalVencida: { codigo: string; tasa: number };
    nominalAnticipada: { codigo: string; tasa: number };
    periodicaAnticipada: { codigo: string; tasa: number };
}

/** Tabla completa de equivalencias para todas las frecuencias (como la hoja ICNV, ampliada). */
export function equivalencias(tasa: number, codigo: string): { ea: number; tabla: Equivalencia[] } {
    const ea = efectivaAnual(tasa, codigo);
    return {
        ea,
        tabla: PERIODOS.map(f => ({
            frecuencia: f.frecuencia, adjetivo: f.adjetivo, m: f.m,
            periodica: { codigo: f.efectiva, tasa: convertir(ea, "EA", f.efectiva) },
            nominalVencida: { codigo: f.nominalVencida, tasa: convertir(ea, "EA", f.nominalVencida) },
            nominalAnticipada: { codigo: f.nominalAnticipada, tasa: convertir(ea, "EA", f.nominalAnticipada) },
            periodicaAnticipada: { codigo: f.periodicaAnticipada, tasa: convertir(ea, "EA", f.periodicaAnticipada) },
        })),
    };
}

/** Hoja ICNV de referencia: dada la nominal (J) o la efectiva (EFF) y m, devuelve J, EFF e i. */
export function icnv(entrada: { nominal?: number; efectiva?: number; m: number }) {
    const { m } = entrada;
    if (!(m > 0)) throw new ErrorFinanciero("m (periodos de capitalización) debe ser positivo.");
    if (entrada.nominal != null) {
        const ef = Math.pow(1 + entrada.nominal / m, m) - 1;
        return { nominal: entrada.nominal, efectiva: ef, periodica: Math.abs(entrada.nominal / m) };
    }
    if (entrada.efectiva != null) {
        const nom = (Math.pow(1 + entrada.efectiva, 1 / m) - 1) * m;
        return { nominal: nom, efectiva: entrada.efectiva, periodica: Math.abs(nom / m) };
    }
    throw new ErrorFinanciero("Ingrese la tasa nominal o la efectiva.");
}

/** Suma de tasas compuesta (p. ej. IPC + puntos, IBR + spread en EA): (1+a)(1+b)−1. */
export function componer(a: number, b: number): number { return (1 + a) * (1 + b) - 1; }

/** Tasa real con Fisher. */
export function real(nominal: number, inflacion: number): number { return (1 + nominal) / (1 + inflacion) - 1; }

/** Devaluación o paridad: tasa en COP equivalente a una tasa en USD con devaluación esperada. */
export function enOtraMoneda(tasa: number, devaluacion: number): number { return componer(tasa, devaluacion); }
