/**
 * JEV en «Tu empresa». La extracción la hacen los lectores de Mirage; a JEV solo le llega la tabla plana
 * (cuentas, estado, campo asignado y cifras) para que dé su veredicto, y después un resumen de indicadores
 * para que diseñe el dashboard del Excel.
 */
import { pedirJev } from "../jev";
import { FI } from "./engine";
import { catalogoParaJev, type Catalogo, type PlanDashboard } from "./dashboard";
import type { Parsed, Revision } from "./types";

interface FilaJev { i: number; mostrar: boolean; estado: "bal" | "pyg"; campo: string | null; motivo: string }
export interface RevisionJev { formato: string; veredicto: string; unidad: string; moneda: string; nombre: string | null; sector: number | null; alertas: string[]; filas: FilaJev[] }
export interface Sugerencias { unidad?: string; moneda?: string; nombre?: string; sector?: number }

const CLAVE = ["ta", "tca", "tl", "tcl", "eq", "rev", "ebit", "ni"];
const corto = (v: number | null) => v == null || !isFinite(v) ? null : Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100;

/** Tabla plana que se le muestra a JEV. */
export function tablaPlana(p: Parsed, sectores: { ciiu_division: string; nombre: string }[]) {
    return {
        archivo: p.fname, hojas: p.sheets, anios: p.years, unidad: p.unit, moneda: p.cur, nombre: p.name, textos: p.textos ?? [],
        filas: p.rows.map((r, i) => [i, r.label.slice(0, 90), r.sheet.slice(0, 30), r.st, r.field ?? null, ...(r.hdr ? [] : r.v.map(corto))]),
        campos: Object.values(FI).map(f => ({ id: f.id, st: f.st, l: f.l })),
        sectores: sectores.map((s, i) => ({ i, ciiu: s.ciiu_division, nombre: s.nombre })),
    };
}

/** Aplica el veredicto de JEV sin perder cuentas clave: una cuenta obligatoria solo cambia de fila, nunca desaparece. */
export function aplicarRevision(p: Parsed, r: RevisionJev): Parsed {
    const rows = p.rows.map(x => ({ ...x }));
    let cambios = 0;
    for (const f of r.filas ?? []) {
        const row = Number.isInteger(f.i) ? rows[f.i] : undefined;
        if (!row) continue;
        if ((f.estado === "bal" || f.estado === "pyg") && f.estado !== row.st && !row.field) { row.st = f.estado; cambios++; }
        if (!row.hdr && f.campo !== undefined) {
            const campo = f.campo && FI[f.campo] && FI[f.campo].st === row.st ? f.campo : null;
            if (campo !== (row.field ?? null)) {
                if (campo) rows.forEach((o, j) => { if (j !== f.i && o.field === campo) { o.field = null; o.conf = 0; } });
                row.field = campo; row.conf = campo ? 0.95 : 0; cambios++;
            }
        }
        // Los encabezados de sección ordenan los estados: se presentan siempre
        if (f.mostrar === false && !row.oculta && !row.hdr) { row.oculta = true; cambios++; }
        if (f.mostrar === true) row.oculta = false;
        if (f.motivo) row.motivo = String(f.motivo).slice(0, 200);
    }
    // Cuentas obligatorias que quedaron sin fila: vuelven a la original
    for (const id of CLAVE) {
        if (rows.some(x => x.field === id)) continue;
        const j = p.rows.findIndex(x => x.field === id);
        if (j >= 0 && !rows[j].field) { rows[j].field = id; rows[j].conf = p.rows[j].conf; }
    }
    const revision: Revision = { formato: String(r.formato ?? "").slice(0, 120), veredicto: String(r.veredicto ?? "").slice(0, 800), alertas: (r.alertas ?? []).map(a => String(a).slice(0, 300)).slice(0, 8), cambios };
    return { ...p, rows, revision };
}

// La misma tabla o el mismo catálogo no se vuelven a consultar en la sesión
const CACHE = new Map<string, Promise<unknown>>();
function unaVez<T>(op: string, cuerpo: unknown, espera: number): Promise<T> {
    const clave = op + JSON.stringify(cuerpo);
    if (!CACHE.has(clave)) {
        const p = pedirJev<T>(op, cuerpo, espera).then(r => r.resultado);
        p.catch(() => CACHE.delete(clave));
        CACHE.set(clave, p);
    }
    return CACHE.get(clave) as Promise<T>;
}

export async function revisarConJev(p: Parsed, sectores: { ciiu_division: string; nombre: string }[]): Promise<{ parsed: Parsed; sugerencias: Sugerencias }> {
    const r = await unaVez<RevisionJev>("revisar", tablaPlana(p, sectores), 90_000);
    const sugerencias: Sugerencias = {};
    if (["unidades", "miles", "millones"].includes(r.unidad)) sugerencias.unidad = r.unidad;
    if (r.moneda === "COP" || r.moneda === "USD") sugerencias.moneda = r.moneda;
    if (r.nombre && r.nombre.trim().length > 2) sugerencias.nombre = r.nombre.trim().slice(0, 120);
    if (Number.isInteger(r.sector) && r.sector! >= 0 && r.sector! < sectores.length) sugerencias.sector = r.sector!;
    return { parsed: aplicarRevision(p, r), sugerencias };
}

/** Plan del dashboard según JEV; el motor lo valida contra el catálogo y completa lo que falte. */
export async function planConJev(cat: Catalogo, empresa: { nombre: string; moneda: string; unidad: string; sector: string; alertas: string[] }): Promise<Partial<PlanDashboard>> {
    return unaVez<Partial<PlanDashboard>>("graficas", { empresa, catalogo: catalogoParaJev(cat) }, 60_000);
}
