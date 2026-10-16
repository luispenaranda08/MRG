/** Llamadas del navegador a las funciones del servidor: planificar (línea de comando) e instruir (caja 4). */
import { fmt } from "../api";
import { formatoCifra } from "./ejecutor";
import { MAPA_BLOQUES } from "./bloques-def";
import { validarTexto } from "./validador";
import type { Agente, Ejecucion, Plan, TextoMotor } from "./tipos";

const BASE = (process.env.NEXT_PUBLIC_MIRAGE_AGENTE_API || "/api/agente").replace(/\/$/, "");

async function post<T>(op: string, cuerpo: unknown): Promise<T> {
    let r: Response;
    try { r = await fetch(`${BASE}/${op}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) }); }
    catch { throw new Error("El Motor Mirage no está disponible en este momento."); }
    const d = await r.json().catch(() => null) as { ok?: boolean; resultado?: T; error?: string } | null;
    if (!r.ok || !d?.ok) throw new Error(d?.error || "El Motor Mirage no está disponible en este momento.");
    return d.resultado as T;
}

/** Lo que viaja al servidor para redactar: solo cifras ya calculadas y ya formateadas, nunca archivos. */
export function paqueteInstruccion(agente: Agente, ejecucion: Ejecucion) {
    const cifras = Object.entries(ejecucion.cifras).filter(([, c]) => c.v !== null).map(([clave, c]) => ({
        clave, bloque: c.origen.bloque === "ENTRADA" ? "Entrada" : c.origen.bloque === "REGLA" ? "Regla" : MAPA_BLOQUES[c.origen.bloque]?.nombre ?? c.origen.bloque,
        etiqueta: c.etiqueta, valor: fmt(formatoCifra(c)), unidad: c.unidad ?? null, v: c.v, fmt: c.fmt,
    }));
    return {
        agente: { nombre: agente.nombre, descripcion: agente.descripcion, instruccion: agente.instruccion.texto, salida: agente.instruccion.salida },
        cifras,
        decision: {
            efecto: ejecucion.decision.efecto,
            reglas: ejecucion.decision.reglas.map(r => {
                const c = ejecucion.cifras[r.regla.cifra], f = (v: number | null) => (c && v !== null ? fmt(formatoCifra({ ...c, v })) : "sin dato");
                return { condicion: `${c?.etiqueta ?? r.regla.cifra} ${r.regla.operador} ${f(r.regla.umbral)}`, valor: f(r.valor), cumple: r.cumple, efecto: r.regla.efecto, mensaje: r.cumple ? "" : r.regla.mensaje };
            }),
        },
        alertas: ejecucion.alertas.slice(0, 12),
    };
}

export async function instruir(agente: Agente, ejecucion: Ejecucion): Promise<TextoMotor> {
    if (ejecucion.estado !== "completa") throw new Error("La ejecución se detuvo: no hay cifras completas para redactar.");
    if (agente.instruccion.salida === "ninguna") return { texto: "", validacion: { total: 0, respaldadas: 0, coincidencias: [], sinRespaldo: [] }, intentos: 0 };
    const r = await post<{ texto: string; intentos: number }>("instruir", paqueteInstruccion(agente, ejecucion));
    return { texto: r.texto, intentos: r.intentos, validacion: validarTexto(r.texto, ejecucion) };
}

/** Arma un agente a partir de lo que pide el usuario; con `base`, aplica ese pedido como cambio sobre el agente actual. */
export async function planificar(objetivo: string, base?: Agente): Promise<Plan> {
    const texto = objetivo.trim();
    if (!texto) throw new Error("Describa lo que debe hacer el agente.");
    return post<Plan>("planificar", { objetivo: texto.slice(0, 1500), ...(base ? { base } : {}) });
}
