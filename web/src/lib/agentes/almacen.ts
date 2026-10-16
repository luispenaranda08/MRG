/** Agentes del usuario guardados en este navegador. Todo acceso a localStorage tolera que no exista o falle. */
import { validarAgente } from "./receta";
import type { Agente } from "./tipos";

const CLAVE = "mirage.agentes.v1";

function leer(): Agente[] {
    try { const t = globalThis.localStorage?.getItem(CLAVE); return t ? JSON.parse(t) as Agente[] : []; }
    catch { return []; }
}
function escribir(lista: Agente[]) {
    try { globalThis.localStorage?.setItem(CLAVE, JSON.stringify(lista)); } catch { /* sin almacenamiento disponible */ }
}

export function listarAgentes(): Agente[] { return leer().sort((a, b) => b.actualizado.localeCompare(a.actualizado)); }

/** Guarda el agente; si ya existía, sube su versión. Devuelve la copia guardada. */
export function guardarAgente(agente: Agente): Agente {
    const lista = leer(), i = lista.findIndex(a => a.id === agente.id), previo = i >= 0 ? lista[i] : null;
    const guardado: Agente = { ...agente, version: previo ? previo.version + 1 : agente.version, actualizado: new Date().toISOString() };
    if (i >= 0) lista[i] = guardado; else lista.push(guardado);
    escribir(lista);
    return guardado;
}

export function eliminarAgente(id: string) { escribir(leer().filter(a => a.id !== id)); }

export function exportarAgente(agente: Agente): string { return JSON.stringify({ formato: "mirage.agente", version: 1, agente }, null, 2); }

/** Lee un agente exportado; lanza un error claro si el archivo no es un agente válido. */
export function importarAgente(texto: string): Agente {
    let datos: unknown;
    try { datos = JSON.parse(texto); } catch { throw new Error("El archivo no es un JSON válido."); }
    const agente = (datos as { formato?: string; agente?: Agente })?.formato === "mirage.agente" ? (datos as { agente: Agente }).agente : datos as Agente;
    if (!agente || typeof agente !== "object" || !Array.isArray(agente.pasos) || !Array.isArray(agente.entradas) || !agente.instruccion) throw new Error("El archivo no contiene un agente de Mirage.");
    const errores = validarAgente(agente);
    if (errores.length) throw new Error(`El agente tiene errores: ${errores.slice(0, 3).join(" ")}`);
    return agente;
}
