/**
 * Agente descargable de Mirage: el programa que va dentro del .zip.
 *
 *   node ejecutar.mjs                     usa entradas.json y el archivo de estados que allí se indica
 *   node ejecutar.mjs estados.xlsx        cambia el archivo de estados
 *
 * Lee agente.json y entradas.json de su propia carpeta, toma los datos de mercado vigentes del servicio de Mirage
 * (o la copia de la carpeta datos/ si no hay red), calcula en este equipo y pide la redacción al Motor Mirage
 * enviando solo cifras ya calculadas. Deja resultado.md y resultado.json en la carpeta.
 * Se empaqueta con scripts/agente-paquete.mjs en public/agentes/ejecutar.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fmt, type Datos } from "../../api";
import { ejecutarAgente, formatoCifra } from "../ejecutor";
import { prepararEmpresa } from "../empresa";
import { paqueteInstruccion } from "../cliente";
import { validarTexto } from "../validador";
import { MAPA_BLOQUES } from "../bloques-def";
import type { Agente, Ejecucion, ValorCampo } from "../tipos";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVICIO = (process.env.MIRAGE_URL || "https://mirage.hypertarget.tech").replace(/\/$/, "");
const ARCHIVOS = ["meta", "estilo", "parametros", "sectores", "indicadores"] as const;
const EFECTOS: Record<string, string> = { aprobar: "Aprobado", condicionar: "Aprobado con condiciones", negar: "Negado", sin_reglas: "Sin reglas de decisión" };

const leerJson = (f: string) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function armar(j: Record<string, any>): Datos {
    return { meta: j.meta, estilo: j.estilo, parametros: j.parametros.parametros, sectores: j.sectores.sectores, metodo: j.sectores.metodo, indicadores: j.indicadores.indicadores } as Datos;
}

async function cargarDatos(): Promise<{ datos: Datos; origen: string }> {
    try {
        const pares = await Promise.all(ARCHIVOS.map(async a => {
            const r = await fetch(`${SERVICIO}/api/v1/${a}.json`, { signal: AbortSignal.timeout(8000) });
            if (!r.ok) throw new Error(String(r.status));
            return [a, await r.json()] as const;
        }));
        return { datos: armar(Object.fromEntries(pares)), origen: "servicio de Mirage" };
    } catch {
        return { datos: armar(Object.fromEntries(ARCHIVOS.map(a => [a, leerJson(`datos/${a}.json`)]))), origen: "copia incluida en el agente (sin conexión)" };
    }
}

/** entradas.json usa valores legibles: tasas en porcentaje (16 = 16 %), sector por código CIIU y el estado financiero por nombre de archivo. */
async function valoresDe(agente: Agente, crudos: Record<string, unknown>, datos: Datos, archivoCli?: string) {
    const valores: Record<string, ValorCampo> = {};
    const sectorCampo = agente.entradas.find(c => c.tipo === "sector"), tamanoCampo = agente.entradas.find(c => c.tipo === "tamano");
    const indiceSector = (v: unknown) => { const i = datos.sectores.findIndex(s => String(s.ciiu_division) === String(v)); if (i < 0) throw new Error(`No existe el sector CIIU «${v}».`); return i; };
    for (const c of agente.entradas) {
        const v = crudos[c.id];
        if (c.tipo === "estados") continue;
        if (v === undefined || v === null || v === "") { valores[c.id] = c.defecto ?? null; continue; }
        if (c.tipo === "tasa") valores[c.id] = Number(v) / 100;
        else if (c.tipo === "sector") valores[c.id] = indiceSector(v);
        else valores[c.id] = v as ValorCampo;
    }
    for (const c of agente.entradas.filter(c => c.tipo === "estados")) {
        const nombre = archivoCli ?? String(crudos[c.id] ?? "");
        if (!nombre) throw new Error(`Falta el archivo de estados financieros («${c.etiqueta}»). Indíquelo en entradas.json o como argumento.`);
        const ruta = path.resolve(DIR, nombre);
        if (!fs.existsSync(ruta)) throw new Error(`No se encontró el archivo ${ruta}.`);
        const sector = sectorCampo ? Number(valores[sectorCampo.id] ?? 0) : indiceSector(crudos.sector ?? datos.sectores[0].ciiu_division);
        const tamanos = Object.keys(datos.sectores[sector]?.por_tamano ?? {});
        const tamano = String((tamanoCampo ? valores[tamanoCampo.id] : crudos.tamano) ?? tamanos[0]);
        valores[c.id] = await prepararEmpresa(fs.readFileSync(ruta), path.basename(ruta), { sector, tamano }, datos);
    }
    return valores;
}

async function redactar(agente: Agente, ej: Ejecucion) {
    const r = await fetch(`${SERVICIO}/api/agente/instruir`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(paqueteInstruccion(agente, ej)), signal: AbortSignal.timeout(110_000) });
    const d = await r.json().catch(() => null) as { ok?: boolean; resultado?: { texto: string }; error?: string } | null;
    if (!r.ok || !d?.ok || !d.resultado) throw new Error(d?.error || "El Motor Mirage no está disponible en este momento.");
    return d.resultado.texto;
}

function informe(agente: Agente, ej: Ejecucion, texto: string | null, aviso: string, origenDatos: string, corte: string) {
    const valor = (k: string) => { const c = ej.cifras[k]; return c ? fmt(formatoCifra(c)) : "sin dato"; };
    const l: string[] = [`# ${agente.nombre}`, "", `Decisión: **${EFECTOS[ej.decision.efecto] ?? ej.decision.efecto}**`, ""];
    if (texto) l.push(texto, "");
    if (aviso) l.push(`> ${aviso}`, "");
    if (ej.decision.reglas.length) {
        l.push("## Criterios", "");
        for (const r of ej.decision.reglas) l.push(`- ${ej.cifras[r.regla.cifra]?.etiqueta ?? r.regla.cifra}: ${valor(r.regla.cifra)} — ${r.cumple ? "cumple" : `no cumple. ${r.regla.mensaje}`}`);
        l.push("");
    }
    l.push("## Cifras", "");
    for (const p of ej.pasos) {
        if (p.bloque === "ENTRADA") continue;
        l.push(`### ${MAPA_BLOQUES[p.bloque]?.nombre ?? p.bloque}`, "");
        for (const k of p.cifras) if (ej.cifras[k]) l.push(`- ${ej.cifras[k].etiqueta}: ${valor(k)}`);
        l.push("");
    }
    if (ej.alertas.length) l.push("## Alertas", "", ...ej.alertas.map(a => `- ${a}`), "");
    l.push("---", `Datos de mercado: ${origenDatos}, corte ${corte}. Ejecución ${ej.id}, ${ej.fin}.`);
    return l.join("\n");
}

async function principal() {
    const agente: Agente = leerJson("agente.json").agente ?? leerJson("agente.json");
    const crudos = fs.existsSync(path.join(DIR, "entradas.json")) ? leerJson("entradas.json") : {};
    console.log(`Agente: ${agente.nombre}`);
    const { datos, origen } = await cargarDatos();
    const valores = await valoresDe(agente, crudos, datos, process.argv[2]);
    const ej = ejecutarAgente(agente, valores, datos);
    if (ej.estado === "detenida") throw new Error(`La ejecución se detuvo: ${ej.detenida?.motivo ?? "faltan datos"}`);

    let texto: string | null = null, aviso = "";
    if (agente.instruccion.salida !== "ninguna") {
        console.log("Redactando con el Motor Mirage…");
        try {
            texto = await redactar(agente, ej);
            const v = validarTexto(texto, ej);
            if (v.sinRespaldo.length) aviso = `El texto tiene ${v.sinRespaldo.length} cifra(s) sin respaldo en el cálculo: ${v.sinRespaldo.map(x => x.texto).join(", ")}.`;
        } catch (e) { aviso = `Sin texto: ${(e as Error).message} Las cifras y la decisión sí quedaron calculadas.`; }
    }
    const md = informe(agente, ej, texto, aviso, origen, datos.meta.corte);
    fs.writeFileSync(path.join(DIR, "resultado.md"), md);
    fs.writeFileSync(path.join(DIR, "resultado.json"), JSON.stringify({ ejecucion: ej, texto }, null, 2));
    console.log(`\nDecisión: ${EFECTOS[ej.decision.efecto] ?? ej.decision.efecto}`);
    if (aviso) console.log(aviso);
    console.log("Resultado en resultado.md y resultado.json.");
}

principal().catch(e => { console.error(`\nError: ${(e as Error).message}`); process.exitCode = 1; });
