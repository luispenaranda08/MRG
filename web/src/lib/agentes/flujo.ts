/**
 * Diagrama de flujo del agente (estilo Mermaid, sin la librería): nodos con su columna y fila ya calculadas a partir
 * de las conexiones reales de la receta. La interfaz solo dibuja: cajas y flechas.
 *
 *   Documentos → Datos Mirage → Cálculos (en el orden de sus dependencias) → Criterios → Entrega
 */
import { MAPA_BLOQUES } from "./bloques-def";
import type { Agente } from "./tipos";

export type TipoNodo = "documento" | "datos" | "calculo" | "criterios" | "entrega";
export interface NodoFlujo { id: string; texto: string; tipo: TipoNodo; columna: number; fila: number }
export interface Flujo { nodos: NodoFlujo[]; aristas: { de: string; a: string }[]; columnas: number; filas: number }

const ENTREGAS = { memo: "Memo para comité", decision: "Decisión con motivos", resumen: "Resumen ejecutivo", ninguna: "Cifras" } as const;

export function flujo(agente: Agente): Flujo {
    const nodos: Omit<NodoFlujo, "columna" | "fila">[] = [], aristas = new Set<string>();
    const unir = (de: string, a: string) => { if (de !== a) aristas.add(`${de}>${a}`); };

    // Documentos: los estados por separado; el resto de entradas, agrupadas como «Datos de la operación».
    const docDe = (id: string) => agente.entradas.find(e => e.id === id)?.tipo === "estados" ? `in:${id}` : "in:operacion";
    for (const e of agente.entradas.filter(e => e.tipo === "estados")) nodos.push({ id: `in:${e.id}`, texto: e.etiqueta, tipo: "documento" });
    if (agente.entradas.some(e => e.tipo !== "estados")) nodos.push({ id: "in:operacion", texto: "Datos de la operación", tipo: "documento" });

    for (const p of agente.pasos) {
        const def = MAPA_BLOQUES[p.bloque];
        if (!def) continue;
        nodos.push({ id: p.id, texto: def.nombre, tipo: def.caja === "datos" ? "datos" : "calculo" });
        for (const v of Object.values(p.vinculos)) {
            if (v.de === "entrada") unir(docDe(v.id), p.id);
            if (v.de === "paso") unir(v.paso, p.id);
        }
    }
    const reglas = agente.instruccion.reglas;
    if (reglas.length) {
        nodos.push({ id: "criterios", texto: `Criterios (${reglas.length})`, tipo: "criterios" });
        for (const r of reglas) { unir(r.cifra.split(".")[0], "criterios"); if (r.umbralDe) unir(docDe(r.umbralDe), "criterios"); }
    }
    nodos.push({ id: "entrega", texto: ENTREGAS[agente.instruccion.salida], tipo: "entrega" });
    if (reglas.length) unir("criterios", "entrega");
    // Los cálculos que nadie más usa alimentan la entrega directamente.
    const conSalida = new Set([...aristas].map(a => a.split(">")[0]));
    for (const n of nodos) if ((n.tipo === "calculo" || n.tipo === "datos") && !conSalida.has(n.id)) unir(n.id, "entrega");

    const lista = [...aristas].map(a => { const [de, b] = a.split(">"); return { de, a: b }; }).filter(x => nodos.some(n => n.id === x.de) && nodos.some(n => n.id === x.a));

    // Columna = camino más largo desde los documentos (la receta ya viene en orden de dependencias).
    const col = new Map<string, number>(nodos.map(n => [n.id, n.tipo === "documento" ? 0 : 1]));
    for (let vuelta = 0; vuelta < nodos.length; vuelta++) for (const { de, a } of lista) col.set(a, Math.max(col.get(a)!, col.get(de)! + 1));
    // La entrega queda sola en la última columna y los criterios justo antes.
    const maxCol = Math.max(...col.values());
    if (reglas.length) col.set("criterios", maxCol - 1);

    const filasPorCol = new Map<number, number>();
    const final: NodoFlujo[] = nodos.map(n => { const c = col.get(n.id)!, f = filasPorCol.get(c) ?? 0; filasPorCol.set(c, f + 1); return { ...n, columna: c, fila: f }; });
    return { nodos: final, aristas: lista, columnas: Math.max(...final.map(n => n.columna)) + 1, filas: Math.max(...filasPorCol.values()) };
}
