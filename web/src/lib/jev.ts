/**
 * Cliente de JEV para el navegador. Llama a /api/analisis/<operación> (función de Vercel con la llave en el servidor).
 * Si JEV no responde, quien llama sigue con el resultado de las reglas de Mirage: JEV nunca bloquea un cálculo.
 */
import type { Documento } from "./documento";
import { fmt } from "./api";

export interface RespuestaJev<T> { resultado: T; modelo?: string; uso?: { costo_usd: number | null; entrada: number | null; salida: number | null } }

export async function pedirJev<T>(operacion: string, cuerpo: unknown, espera = 90_000): Promise<RespuestaJev<T>> {
    const r = await fetch(`/api/analisis/${operacion}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(espera) });
    const d = await r.json().catch(() => null) as ({ ok: boolean; error?: string } & RespuestaJev<T>) | null;
    if (!r.ok || !d?.ok) throw new Error(d?.error || "El análisis no está disponible en este momento.");
    return { resultado: d.resultado, modelo: d.modelo, uso: d.uso };
}

/* ------------------------------- Calculadora ------------------------------- */
export interface DecisionJev { decision: string; veredicto: "favorable" | "con_reservas" | "desfavorable" | "informativo"; recomendaciones: string[]; alertas: string[] }

/** Versión plana del documento: lo único que JEV necesita para decidir (sin estilos ni fuentes). */
export function documentoPlano(doc: Documento) {
    const filas = (f: Documento["supuestos"]) => f.map(x => [x.concepto, fmt(x.cifra)]);
    return { seccion: doc.seccion, titulo: doc.titulo, conclusion: doc.conclusion, supuestos: filas(doc.supuestos), resultados: filas(doc.resultados), tablas: doc.tablas.map(t => ({ titulo: t.titulo, columnas: t.columnas, filas: t.filas.slice(0, 24) })), notas: doc.notas, corte: doc.corte };
}

const CACHE = new Map<string, Promise<DecisionJev>>();
/** Decisión de JEV sobre un resultado de la calculadora; la misma entrada no se vuelve a consultar en la sesión. */
export function decidir(doc: Documento): Promise<DecisionJev> {
    const plano = documentoPlano(doc), clave = JSON.stringify(plano);
    if (!CACHE.has(clave)) {
        const p = pedirJev<DecisionJev>("decidir", { documento: plano }, 60_000).then(r => r.resultado);
        p.catch(() => CACHE.delete(clave));
        CACHE.set(clave, p);
    }
    return CACHE.get(clave)!;
}

export interface SectorJev { sector: number | null; tamano: string | null; motivo: string }
/** Sector (índice en la lista) y tamaño sugeridos por JEV a partir de la descripción de la empresa. */
export async function sugerirSector(descripcion: string, sectores: { ciiu_division: string; nombre: string }[], tamanos: string[]): Promise<SectorJev> {
    const r = await pedirJev<SectorJev>("sector", { descripcion, tamanos: tamanos.join(", "), sectores: sectores.map((s, i) => ({ i, ciiu: s.ciiu_division, nombre: s.nombre })) }, 45_000);
    const s = r.resultado;
    return { sector: s.sector != null && s.sector >= 0 && s.sector < sectores.length ? s.sector : null, tamano: s.tamano && tamanos.includes(s.tamano) ? s.tamano : null, motivo: s.motivo };
}

export const VEREDICTO: Record<DecisionJev["veredicto"], string> = { favorable: "Favorable", con_reservas: "Con reservas", desfavorable: "Desfavorable", informativo: "Informativo" };
