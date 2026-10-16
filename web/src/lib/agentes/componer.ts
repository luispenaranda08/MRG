/**
 * Arma un agente a partir de una lista de bloques, sin que nadie conecte nada a mano.
 *
 * Cada entrada de cada bloque se conecta así, en este orden:
 *   1. Con la salida que usan las plantillas certificadas para esa misma entrada (p. ej. WACC.rf ← MERCADO.rf_usd).
 *      Si el bloque que la produce no está en la lista, se agrega antes (dependencias).
 *   2. Con una salida de un paso anterior que tenga el mismo identificador.
 *   3. Estados financieros → la entrada «Estados financieros» del agente (se crea una sola).
 *   4. Con su valor por defecto.
 *   5. Si es obligatoria y no hay nada, se vuelve una entrada del agente que el usuario llena.
 */
import { MAPA_BLOQUES } from "./bloques-def";
import { PLANTILLAS } from "./plantillas";
import { agenteVacio, validarAgente } from "./receta";
import type { Agente, Campo, Vinculo } from "./tipos";

type Fuente = { bloque: string; salida: string };

/** «BLOQUE.entrada» → de qué bloque y salida la toman las plantillas certificadas (la más usada). */
const CONOCIMIENTO: Map<string, Fuente> = (() => {
    const votos = new Map<string, Map<string, number>>();
    for (const crear of Object.values(PLANTILLAS)) {
        const a = crear(), bloqueDe = new Map(a.pasos.map(p => [p.id, p.bloque]));
        for (const p of a.pasos) for (const [entrada, v] of Object.entries(p.vinculos)) {
            if (v.de !== "paso") continue;
            const k = `${p.bloque}.${entrada}`, f = `${bloqueDe.get(v.paso)}.${v.salida}`, m = votos.get(k) ?? new Map<string, number>();
            m.set(f, (m.get(f) ?? 0) + 1); votos.set(k, m);
        }
    }
    const r = new Map<string, Fuente>();
    for (const [k, m] of votos) { const [f] = [...m].sort((a, b) => b[1] - a[1])[0]; const [bloque, salida] = f.split("."); r.set(k, { bloque, salida }); }
    return r;
})();

const EST: Campo = { id: "empresa", etiqueta: "Estados financieros", tipo: "estados", requerido: true };

export function componer(bloques: string[], nombre = "Agente"): Agente {
    const pedidos = bloques.map(b => b.toUpperCase()).filter(b => b in MAPA_BLOQUES);
    if (!pedidos.length) throw new Error("No hay bloques para armar el agente.");

    // Orden: dependencias primero, luego los pedidos en el orden dado; cada bloque una sola vez.
    const orden: string[] = [];
    const agregar = (b: string, pila: Set<string> = new Set()) => {
        if (orden.includes(b) || pila.has(b)) return;
        pila.add(b);
        for (const c of MAPA_BLOQUES[b].entradas) { const f = CONOCIMIENTO.get(`${b}.${c.id}`); if (f && f.bloque !== b) agregar(f.bloque, pila); }
        orden.push(b);
    };
    // Los bloques de datos van antes que los de cálculo.
    for (const b of [...pedidos.filter(b => MAPA_BLOQUES[b].caja === "datos"), ...pedidos.filter(b => MAPA_BLOQUES[b].caja !== "datos")]) agregar(b);

    const agente = agenteVacio(nombre), idDe = new Map<string, string>();
    const usaEstados = orden.some(b => MAPA_BLOQUES[b].entradas.some(c => c.tipo === "estados" && c.requerido));
    if (usaEstados) agente.entradas.push({ ...EST });

    for (const b of orden) {
        const def = MAPA_BLOQUES[b], id = b.toLowerCase(), vinculos: Record<string, Vinculo> = {};
        for (const c of def.entradas) {
            const f = CONOCIMIENTO.get(`${b}.${c.id}`);
            const previo = [...idDe].reverse().find(([pb]) => MAPA_BLOQUES[pb].salidas.some(s => s.id === c.id));
            if (f && idDe.has(f.bloque)) vinculos[c.id] = { de: "paso", paso: idDe.get(f.bloque)!, salida: f.salida };
            else if (previo) vinculos[c.id] = { de: "paso", paso: previo[1], salida: c.id };
            else if (c.tipo === "estados") { if (usaEstados) vinculos[c.id] = { de: "entrada", id: EST.id }; }
            else if (c.defecto !== undefined) vinculos[c.id] = { de: "valor", v: c.defecto };
            else if (c.requerido) {
                if (!agente.entradas.some(e => e.id === c.id)) agente.entradas.push({ id: c.id, etiqueta: c.etiqueta, tipo: c.tipo, requerido: true, ...(c.opciones ? { opciones: c.opciones } : {}), ...(c.tipo === "dinero" && usaEstados ? { escala: "estados" as const } : {}) });
                vinculos[c.id] = { de: "entrada", id: c.id };
            }
        }
        agente.pasos.push({ id, bloque: b, vinculos });
        idDe.set(b, id);
    }
    const errores = validarAgente(agente);
    if (errores.length) throw new Error(errores[0]);
    return agente;
}
