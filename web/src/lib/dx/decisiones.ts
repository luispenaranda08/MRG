/**
 * Decisiones de JEV en «Tu empresa», dentro del harness de Mirage.
 *
 * JEV no calcula ni inventa cifras: elige una opción de un menú cerrado que Mirage define aquí. Cada
 * opción la calcula este módulo de forma determinista a partir de los estados de la empresa y de los
 * datos publicados. El usuario puede revertir cualquier decisión, y el documento registra qué se eligió,
 * qué alternativas había y por qué.
 */
import { M } from "./engine";

type Company = Parameters<typeof M>[0];

export const MENU = {
    crecimiento: ["historico_acotado", "inflacion_largo_plazo", "intermedio"],
    margen: ["ultimo", "mediana_rentables", "promedio_3"],
    kd: ["observado_sector_tamano", "implicito_empresa"],
} as const;
export type Clave = keyof typeof MENU;
export type Opcion<K extends Clave> = (typeof MENU)[K][number];
export type Decisiones = { [K in Clave]: Opcion<K> };
export interface Decision<K extends Clave = Clave> { clave: K; opcion: Opcion<K>; motivo: string; origen: "jev" | "mirage" | "usuario" }

/** Lo que Mirage elige si JEV no responde: el comportamiento actual de defaultsFor. */
export const POR_DEFECTO: Decisiones = { crecimiento: "historico_acotado", margen: "ultimo", kd: "observado_sector_tamano" };

export const ETIQUETAS: { [K in Clave]: { titulo: string; opciones: Record<Opcion<K>, string> } } = {
    crecimiento: { titulo: "Crecimiento de las ventas", opciones: {
        historico_acotado: "Histórico acotado (−10 % a 20 %) que converge al de largo plazo",
        inflacion_largo_plazo: "Inflación de largo plazo de la moneda desde el primer año",
        intermedio: "Punto medio entre el histórico acotado y el de largo plazo",
    } },
    margen: { titulo: "Margen EBIT de la proyección", opciones: {
        ultimo: "Margen del último año",
        mediana_rentables: "Mediana de los años con EBIT positivo",
        promedio_3: "Promedio de los últimos tres años",
    } },
    kd: { titulo: "Costo de la deuda", opciones: {
        observado_sector_tamano: "Kd observado de créditos nuevos del sector y tamaño (formato 88)",
        implicito_empresa: "Kd propio: gastos financieros sobre deuda financiera promedio",
    } },
};

/** Kd implícito de la empresa (fracción, moneda de los estados): intereses / deuda promedio del último año.
 *  Misma regla que el motor para Supersociedades: solo válido entre 2 % y 60 %. */
export function kdImplicito(c: Company): number | null {
    const k = c.years.length - 1, m = M(c, k), prev = k > 0 ? M(c, k - 1) : null;
    const deuda = prev ? (m.debt + prev.debt) / 2 : m.debt;
    if (!(m.intr > 0) || !(deuda > 0)) return null;
    const kd = m.intr / deuda;
    return kd >= 0.02 && kd <= 0.6 ? kd : null;
}

/** Opciones disponibles para esta empresa (se ofrecen a JEV solo las que se pueden calcular). */
export function disponibles(c: Company): { [K in Clave]: Opcion<K>[] } {
    return { crecimiento: [...MENU.crecimiento], margen: [...MENU.margen], kd: kdImplicito(c) == null ? ["observado_sector_tamano"] : [...MENU.kd] };
}

interface SupuestosBase { growth: number[]; margin: number; kd: number; kdMode: string; kdFuente: string; g: number; piCOP: number; piUSD: number; recortes: string[] }

/** Aplica las decisiones a los supuestos que arma defaultsFor. Devuelve supuestos nuevos; no muta. */
export function aplicar<S extends SupuestosBase>(c: Company, base: S, d: Decisiones): S {
    const s = { ...base, growth: [...base.growth] };
    const n = c.years.length, gLargo = base.g;
    if (d.crecimiento === "inflacion_largo_plazo") s.growth = s.growth.map(() => gLargo);
    else if (d.crecimiento === "intermedio") s.growth = base.growth.map(x => (x + gLargo) / 2);
    const em = (i: number) => M(c, i).em as number;
    if (d.margen === "mediana_rentables") {
        const pos = c.years.map((_: unknown, i: number) => em(i)).filter((x: number) => Number.isFinite(x) && x > 0).sort((a: number, b: number) => a - b);
        if (pos.length) s.margin = Math.min(60, pos[Math.floor(pos.length / 2)] * 100);
    } else if (d.margen === "promedio_3") {
        const ult = Array.from({ length: Math.min(3, n) }, (_, j) => em(n - 1 - j)).filter(Number.isFinite);
        if (ult.length) s.margin = Math.min(60, ult.reduce((a, b) => a + b, 0) / ult.length * 100);
    }
    if (d.kd === "implicito_empresa") {
        const k = kdImplicito(c);
        if (k != null) {
            // defaultsFor guarda el Kd en USD (%); si los estados están en COP se pasa por Fisher como el observado
            s.kd = c.cur === "COP" ? ((1 + k) * (1 + base.piUSD / 100) / (1 + base.piCOP / 100) - 1) * 100 : k * 100;
            s.kdFuente = `Kd propio de la empresa: gastos financieros / deuda financiera promedio del último año (${(k * 100).toFixed(2).replace(".", ",")} %).`;
        }
    }
    return s;
}

/** Valida la respuesta de JEV contra el menú y las opciones disponibles; lo inválido cae al valor por defecto. */
export function validar(c: Company, r: Partial<Record<Clave, { opcion?: string; motivo?: string }>> | null): Decision[] {
    const disp = disponibles(c);
    return (Object.keys(MENU) as Clave[]).map(k => {
        const o = r?.[k]?.opcion, ok = !!o && (disp[k] as string[]).includes(o);
        return ok ? { clave: k, opcion: o as Opcion<typeof k>, motivo: (r?.[k]?.motivo || "").slice(0, 300), origen: "jev" as const }
            : { clave: k, opcion: POR_DEFECTO[k], motivo: "Valor por defecto de Mirage.", origen: "mirage" as const };
    });
}

/** Resumen compacto de la empresa para que JEV decida (sin archivo, sin datos de identificación). */
export function resumenParaJev(c: Company, base: SupuestosBase, sector: string, tamano: string) {
    const n = c.years.length, r = (v: number | null | undefined, d = 4) => v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d;
    const anios = c.years.map((y: number | string, i: number) => { const m = M(c, i); return { anio: y, ventas: r(m.rev, 0), margen_ebit: r(m.em), de: r(m.de), cobertura: r(m.cov, 2) }; });
    const crec = n > 1 ? r(Math.pow(M(c, n - 1).rev / M(c, 0).rev, 1 / (n - 1)) - 1) : null;
    return { sector, tamano, moneda: c.cur, anios, crecimiento_historico_anual: crec, crecimiento_largo_plazo_pct: r(base.g, 2),
             kd_observado_sector_tamano_usd_pct: r(base.kd, 2), kd_implicito_empresa: r(kdImplicito(c)), recortes_de_mirage: base.recortes,
             opciones: disponibles(c) };
}
