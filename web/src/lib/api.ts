export type Tono = "clave" | "insumo" | "sube" | "baja" | "neutro" | "subtotal" | "encabezado" | "nota" | "alerta";
export type Formato = "pct" | "pp" | "x" | "num" | "bn" | "txt";
export interface Celda {
    v: number | string | null;
    fmt: Formato;
    tono: Tono;
    var?: {
        v: number | null;
        tono: Tono;
    };
    nota?: string;
    fuente?: string;
    corte?: string;
}
export interface Fuente {
    id: string;
    nombre: string;
    url: string;
    licencia: string;
}
export interface Meta {
    version: string;
    estado?: string;
    corte: string;
    generado: string;
    corte_anterior: string | null;
    aviso: string;
    fuentes: Fuente[];
}
export interface Estilo {
    version: number;
    tonos: Record<Tono, {
        texto: string;
        fondo: string | null;
        borde: string | null;
        negrita: boolean;
        uso: string;
    }>;
    formatos: Record<Formato, string>;
    fuentes_tipograficas: {
        texto: string;
        cifras: string;
    };
    convencion_origen: string;
}
export type Parametros = Record<"rf_usd" | "erp_maduro" | "spread_soberano" | "lambda" | "crp" | "crp_damodaran" | "inflacion_cop" | "inflacion_usd" | "tasa_impuesto", Celda>;
export interface Tamano {
    empresas: Celda;
    beta_apalancada: Celda;
    de: Celda;
    kd: Celda;
}
export interface Sector {
    ciiu_division: string;
    nombre: string;
    empresas: Celda;
    pct_con_deuda: Celda;
    beta_desapalancada: Celda;
    beta_desapalancada_rango: [
        Celda,
        Celda
    ];
    de: Celda;
    de_rango: [
        Celda,
        Celda
    ];
    beta_apalancada: Celda;
    beta_apalancada_rango: [
        Celda,
        Celda
    ];
    beta_total: Celda;
    ke: Celda;
    kd: Celda;
    kd_monto_desembolsado: Celda;
    wacc_cop_nominal: Celda;
    wacc_rango: [
        Celda,
        Celda
    ];
    wacc_usd_nominal: Celda;
    wacc_cop_real: Celda;
    wacc_usd_real?: Celda;
    por_tamano: Record<string, Tamano>;
    damodaran: {
        industria: string;
        empresas_emergentes: Celda;
        empresas_latam: Celda;
        empresas_colombia: Celda;
        pct_latam: Celda;
        beta_apalancada: Celda;
        diferencia_mirage_vs_damodaran: Celda;
    };
}
export interface Metodo {
    elasticidad_riesgo_operativo?: number;
    r2_elasticidad?: number;
    anio_estados_financieros: number;
    corte_damodaran: string;
    ventana_kd: string[];
    pasos: string[];
}
export interface Datos {
    meta: Meta;
    estilo: Estilo;
    parametros: Parametros;
    sectores: Sector[];
    metodo: Metodo;
    indicadores?: Record<string, Celda & { codigo_tasa: string | null; nombre: string }>;
}
export const API_BASE = (process.env.NEXT_PUBLIC_MIRAGE_API || "/api/v1").replace(/\/$/, "");
async function json<T>(archivo: string): Promise<T> { const r = await fetch(`${API_BASE}/${archivo}`); if (!r.ok)
    throw new Error(`No se pudo cargar ${archivo} (${r.status}).`); return r.json(); }
export async function cargarDatos(): Promise<Datos> {
    const [meta, estilo, p, s, indicadores] = await Promise.all([json<Meta>("meta.json"), json<Estilo>("estilo.json"), json<{
            parametros: Parametros;
        }>("parametros.json"), json<{
            sectores: Sector[];
            metodo: Metodo;
        }>("sectores.json"), json<{ indicadores: NonNullable<Datos['indicadores']> }>("indicadores.json")]);
    if (!s.sectores.length || !estilo.tonos || !p.parametros)
        throw new Error("Contrato de API incompleto.");
    return { meta, estilo, parametros: p.parametros, sectores: s.sectores, metodo: s.metodo, indicadores: indicadores.indicadores };
}
export function fmt(c: Celda): string { if (c.v === null || (typeof c.v === "number" && !Number.isFinite(c.v)))
    return "—"; if (typeof c.v === "string")
    return c.v; const d = c.fmt === "num" ? 0 : c.fmt === "bn" ? 1 : 2; const v = c.fmt === "pct" ? c.v * 100 : c.v; return new Intl.NumberFormat("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v) + ({ pct: " %", pp: " pp", bn: " bn", x: "", num: "", txt: "" }[c.fmt]); }
export function numero(c: Celda): number | null { return typeof c.v === "number" && Number.isFinite(c.v) ? c.v : null; }
export function celda(v: number | string | null, formato: Formato = "pct", tono: Tono = "clave", nota?: string): Celda { return { v: typeof v === "number" && !Number.isFinite(v) ? null : v, fmt: formato, tono, nota }; }
export function variables(estilo: Estilo): Record<string, string> { const r: Record<string, string> = {}; for (const [k, t] of Object.entries(estilo.tonos)) {
    r[`--${k}-texto`] = t.texto;
    r[`--${k}-fondo`] = t.fondo || "transparent";
    r[`--${k}-borde`] = t.borde || "transparent";
    r[`--${k}-peso`] = t.negrita ? "700" : "400";
} return r; }
export function waccSector(s: Sector, moneda: string, modo: string): Celda { if (moneda === "COP")
    return modo === "real" ? s.wacc_cop_real : s.wacc_cop_nominal; return modo === "real" ? s.wacc_usd_real || celda(null, "pct", "nota", "La API no publica WACC USD real en este corte.") : s.wacc_usd_nominal; }
