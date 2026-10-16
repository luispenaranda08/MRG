/** Utilidades sobre la receta de un agente: creación, identificadores y validación estructural. */
import { MAPA_BLOQUES } from "./bloques-def";
import type { Agente, Campo, Paso, Vinculo } from "./tipos";

export function nuevoId(prefijo = "ag"): string {
    const r = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Math.random().toString(36).slice(2, 14);
    return `${prefijo}_${r}`;
}

export const ahora = () => new Date().toISOString();

export function agenteVacio(nombre = "Agente sin nombre"): Agente {
    const t = ahora();
    return { id: nuevoId(), nombre, descripcion: "", version: 1, creado: t, actualizado: t, entradas: [], pasos: [], instruccion: { texto: "", salida: "resumen", reglas: [] } };
}

/** Clave con la que se guarda una cifra en la ejecución: "paso.salida". */
export const claveCifra = (paso: string, salida: string) => `${paso}.${salida}`;

/** Paso nuevo de un bloque, con sus entradas vinculadas a las entradas del agente que tengan el mismo id o al defecto del bloque. */
export function nuevoPaso(bloque: string, agente: Agente, id?: string): Paso {
    const def = MAPA_BLOQUES[bloque];
    if (!def) throw new Error(`Bloque desconocido: ${bloque}.`);
    const usados = new Set(agente.pasos.map(p => p.id));
    let pid = id ?? bloque.toLowerCase(), k = 2;
    while (usados.has(pid)) pid = `${bloque.toLowerCase()}${k++}`;
    const vinculos: Record<string, Vinculo> = {};
    for (const c of def.entradas) {
        const entrada = agente.entradas.find(e => e.id === c.id || (c.tipo === "estados" && e.tipo === "estados"));
        if (entrada) vinculos[c.id] = { de: "entrada", id: entrada.id };
        else if (c.defecto !== undefined) vinculos[c.id] = { de: "valor", v: c.defecto };
    }
    return { id: pid, bloque, vinculos };
}

/** Salidas de los pasos anteriores a `hasta` (para vincular entradas de un paso). */
export function salidasDisponibles(agente: Agente, hasta?: string) {
    const lista: { paso: string; bloque: string; salida: string; etiqueta: string; fmt: string }[] = [];
    for (const p of agente.pasos) {
        if (p.id === hasta) break;
        const def = MAPA_BLOQUES[p.bloque];
        if (def) for (const s of def.salidas) lista.push({ paso: p.id, bloque: p.bloque, salida: s.id, etiqueta: s.etiqueta, fmt: s.fmt });
    }
    return lista;
}

/** Errores de estructura: bloques inexistentes, vínculos rotos, ciclos o reglas sobre cifras que no existen. */
export function validarAgente(agente: Agente): string[] {
    const errores: string[] = [], vistos = new Map<string, Set<string>>(), entradas = new Map<string, Campo>(agente.entradas.map(e => [e.id, e]));
    if (!agente.nombre?.trim()) errores.push("El agente no tiene nombre.");
    if (new Set(agente.entradas.map(e => e.id)).size !== agente.entradas.length) errores.push("Hay entradas con el mismo identificador.");
    for (const p of agente.pasos) {
        const def = MAPA_BLOQUES[p.bloque];
        if (!def) { errores.push(`El paso «${p.id}» usa un bloque que no existe (${p.bloque}).`); continue; }
        if (vistos.has(p.id)) errores.push(`Hay dos pasos con el identificador «${p.id}».`);
        for (const c of def.entradas) {
            const v = p.vinculos[c.id];
            if (!v) { if (c.requerido) errores.push(`«${def.nombre}» necesita «${c.etiqueta}» y no está conectada.`); continue; }
            if (v.de === "entrada" && !entradas.has(v.id)) errores.push(`«${def.nombre}» toma «${c.etiqueta}» de una entrada que no existe (${v.id}).`);
            if (v.de === "paso") {
                const salidas = vistos.get(v.paso);
                if (!salidas) errores.push(`«${def.nombre}» toma «${c.etiqueta}» de un paso posterior o inexistente (${v.paso}).`);
                else if (!salidas.has(v.salida)) errores.push(`«${def.nombre}» toma «${c.etiqueta}» de una salida que no existe (${v.paso}.${v.salida}).`);
            }
        }
        for (const k of Object.keys(p.vinculos)) if (!def.entradas.some(c => c.id === k)) errores.push(`«${def.nombre}» no tiene la entrada «${k}».`);
        vistos.set(p.id, new Set(def.salidas.map(s => s.id)));
    }
    for (const r of agente.instruccion.reglas) {
        const [paso, salida] = r.cifra.split(".");
        if (!vistos.get(paso)?.has(salida)) errores.push(`La regla «${r.mensaje || r.id}» usa una cifra que el agente no calcula (${r.cifra}).`);
        if (!Number.isFinite(r.umbral)) errores.push(`La regla «${r.mensaje || r.id}» no tiene un umbral numérico.`);
        if (r.umbralDe && !entradas.has(r.umbralDe)) errores.push(`La regla «${r.mensaje || r.id}» toma su umbral de una entrada que no existe (${r.umbralDe}).`);
    }
    return errores;
}

/** Copia del agente con identificador y fechas nuevas. */
export function duplicarAgente(agente: Agente): Agente {
    const t = ahora();
    return { ...structuredClone(agente), id: nuevoId(), nombre: `${agente.nombre} (copia)`, version: 1, creado: t, actualizado: t };
}
