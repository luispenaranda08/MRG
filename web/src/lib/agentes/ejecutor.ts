/**
 * Ejecuta las cajas 1 a 3 de un agente. Determinista: con las mismas entradas y el mismo corte de datos da las mismas
 * cifras. Falla cerrada: si falta un dato o un bloque no puede calcular, se detiene en ese paso y dice por qué.
 */
import type { Celda, Datos } from "../api";
import { ErrorFinanciero } from "../finanzas";
import { MAPA_BLOQUES } from "./bloques-def";
import { ErrorBloque, IMPLEMENTACIONES } from "./bloques";
import { claveCifra, nuevoId, validarAgente } from "./receta";
import type { Agente, Campo, Cifra, Decision, Ejecucion, EmpresaPreparada, Operador, PasoEjecutado, Tabla, ValorCampo } from "./tipos";

const UNIDADES_NO_MONETARIAS = new Set(["años", "año", "días", "cuotas", "empresas", "hallazgos", "veces", "COP por USD"]);

/** Cifra del agente → celda para el componente <Cifra> de Mirage, con la fuente en la nota. */
export function formatoCifra(c: Cifra): Celda {
    const nota = [c.etiqueta, c.unidad && !UNIDADES_NO_MONETARIAS.has(c.unidad) ? `Cifras en ${c.unidad}` : c.unidad, c.nota].filter(Boolean).join(" · ");
    const delUsuario = c.origen.bloque === "ENTRADA" || c.origen.bloque === "REGLA";
    const fuente = c.origen.bloque === "ENTRADA" ? "Dato ingresado por el usuario" : c.origen.bloque === "REGLA" ? "Umbral de una regla del agente" : `[ ${c.origen.bloque} ] v${c.origen.version} · ${c.origen.fuente}`;
    return { v: typeof c.v === "number" && !Number.isFinite(c.v) ? null : c.v, fmt: c.fmt, tono: delUsuario ? "insumo" : "clave", nota, fuente, corte: c.origen.corte };
}

const vacio = (v: ValorCampo | undefined) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

function cumple(v: number, op: Operador, u: number) {
    switch (op) {
        case ">=": return v >= u;
        case ">": return v > u;
        case "<=": return v <= u;
        case "<": return v < u;
        case "=": return Math.abs(v - u) <= 1e-9 * Math.max(1, Math.abs(u));
    }
}

function decidir(agente: Agente, cifras: Record<string, Cifra>, entradas: Record<string, ValorCampo>): { decision: Decision; alertas: string[] } {
    const reglas = agente.instruccion.reglas.map(r => {
        const u = r.umbralDe ? entradas[r.umbralDe] : null, regla = typeof u === "number" && Number.isFinite(u) ? { ...r, umbral: u } : r;
        const c = cifras[regla.cifra], valor = typeof c?.v === "number" && Number.isFinite(c.v) ? c.v : null;
        return { regla, valor, cumple: valor !== null && cumple(valor, regla.operador, regla.umbral) };
    });
    const falla = (e: string) => reglas.some(r => !r.cumple && r.regla.efecto === e);
    const efecto = !reglas.length ? "sin_reglas" : falla("negar") ? "negar" : falla("condicionar") ? "condicionar" : "aprobar";
    const alertas = reglas.filter(r => !r.cumple).map(r => r.valor === null ? `${(r.regla.mensaje || r.regla.cifra).replace(/\.$/, "")} (la cifra no se pudo calcular).` : r.regla.mensaje).filter(Boolean);
    return { decision: { efecto, reglas }, alertas };
}

function cifraEntrada(c: Campo, v: ValorCampo): Cifra | null {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    const fmt = c.tipo === "tasa" ? "pct" : c.tipo === "numero" && !Number.isInteger(v) ? "x" : "num";
    return { v, fmt, etiqueta: c.etiqueta, origen: { paso: "entrada", bloque: "ENTRADA", version: "-", fuente: "Dato del usuario" } };
}

function resumenEntrada(v: unknown): unknown {
    if (v && typeof v === "object" && (v as EmpresaPreparada).tipo === "empresa") {
        const e = v as EmpresaPreparada;
        return { empresa: e.nombre, archivo: e.archivo, anios: e.anios, unidad: `${e.moneda} ${e.unidad}`, sector: e.sector, tamano: e.tamano };
    }
    return v;
}

export function ejecutarAgente(agente: Agente, valores: Record<string, ValorCampo>, datos: Datos): Ejecucion {
    const inicio = new Date().toISOString(), t0 = Date.now();
    const cifras: Record<string, Cifra> = {}, tablas: Record<string, Tabla> = {}, pasos: PasoEjecutado[] = [], alertas: string[] = [];
    const base = { id: nuevoId("ej"), agente: { id: agente.id, nombre: agente.nombre, version: agente.version }, inicio };
    const detener = (motivo: string, paso?: string): Ejecucion => ({ ...base, fin: new Date().toISOString(), estado: "detenida", detenida: { paso, motivo }, pasos, cifras, tablas, decision: { efecto: "sin_reglas", reglas: [] }, alertas });

    const errores = validarAgente(agente);
    if (errores.length) return detener(errores[0]);

    const entradas: Record<string, ValorCampo> = {};
    for (const c of agente.entradas) {
        const v = vacio(valores[c.id]) ? c.defecto ?? null : valores[c.id];
        if (c.requerido && vacio(v)) return detener(`Falta la entrada «${c.etiqueta}».`);
        entradas[c.id] = v ?? null;
        const ce = cifraEntrada(c, entradas[c.id]);
        if (ce) cifras[claveCifra("entrada", c.id)] = ce;
    }

    for (const p of agente.pasos) {
        const def = MAPA_BLOQUES[p.bloque], impl = IMPLEMENTACIONES[p.bloque];
        if (!def || !impl) return detener(`El bloque ${p.bloque} no está disponible.`, p.id);
        const e: Record<string, unknown> = {};
        let unidadHeredada: string | undefined;
        for (const c of def.entradas) {
            const vin = p.vinculos[c.id];
            let v: ValorCampo | undefined;
            if (!vin) v = c.defecto;
            else if (vin.de === "entrada") v = entradas[vin.id];
            else if (vin.de === "valor") v = vin.v;
            else {
                const fuente = cifras[claveCifra(vin.paso, vin.salida)];
                v = fuente ? (fuente.v as ValorCampo) : null;
                if (fuente?.unidad && !UNIDADES_NO_MONETARIAS.has(fuente.unidad) && fuente.fmt === "num") unidadHeredada ??= fuente.unidad;
            }
            if (vacio(v)) v = c.defecto ?? null;
            if (c.requerido && vacio(v)) return detener(`«${def.nombre}» necesita «${c.etiqueta}» y no tiene valor.`, p.id);
            e[c.id] = v;
        }
        const t = Date.now();
        let r;
        try { r = impl(e, datos); }
        catch (err) {
            const msg = err instanceof ErrorBloque || err instanceof ErrorFinanciero ? err.message : `No se pudo calcular: ${err instanceof Error ? err.message : String(err)}`;
            return detener(`«${def.nombre}»: ${msg}`, p.id);
        }
        const origen = { paso: p.id, bloque: def.codigo, version: def.version, fuente: def.fuente, corte: r.corte };
        const claves: string[] = [];
        for (const s of def.salidas) {
            const v = r.cifras[s.id];
            const unidad = s.unidad === "empresa" ? r.unidad : s.unidad ?? (s.fmt === "num" ? unidadHeredada : undefined);
            const k = claveCifra(p.id, s.id);
            cifras[k] = { v: v === undefined ? null : v, fmt: s.fmt, etiqueta: s.etiqueta, unidad, origen };
            claves.push(k);
        }
        const tablasPaso: string[] = [];
        for (const [id, tb] of Object.entries(r.tablas ?? {})) {
            const etiqueta = def.tablas?.find(x => x.id === id)?.etiqueta ?? id, k = claveCifra(p.id, id);
            tablas[k] = { etiqueta, columnas: tb.columnas, filas: tb.filas, origen };
            tablasPaso.push(k);
        }
        const al = (r.alertas ?? []).filter(Boolean);
        alertas.push(...al.map(a => `${def.nombre}: ${a}`));
        pasos.push({ paso: p.id, bloque: def.codigo, version: def.version, ms: Date.now() - t, entrada: Object.fromEntries(Object.entries(e).map(([k, v]) => [k, resumenEntrada(v)])), cifras: claves, tablas: tablasPaso, alertas: al });
    }

    const { decision, alertas: alertasReglas } = decidir(agente, cifras, entradas);
    alertas.push(...alertasReglas);
    // Los umbrales de las reglas son datos del usuario: se registran para que el texto pueda citarlos con respaldo.
    for (const r of decision.reglas) {
        const base = cifras[r.regla.cifra];
        if (base) cifras[claveCifra("regla", r.regla.id)] = { v: r.regla.umbral, fmt: base.fmt, unidad: base.unidad, etiqueta: `Umbral de la regla: ${base.etiqueta}`, origen: { paso: "regla", bloque: "REGLA", version: "-", fuente: "Regla del agente" } };
    }
    void t0;
    return { ...base, fin: new Date().toISOString(), estado: "completa", pasos, cifras, tablas, decision, alertas: [...new Set(alertas)] };
}
