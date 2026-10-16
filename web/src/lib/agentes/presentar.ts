/**
 * El agente en lenguaje claro para la interfaz (cuatro cajas sin jerga técnica) y el paquete descargable (.zip).
 * La interfaz no muestra operadores, conexiones ni códigos de bloque: muestra lo que hace el agente.
 */
import { API_BASE, fmt, type Datos } from "../api";
import { MAPA_BLOQUES } from "./bloques-def";
import { exportarAgente } from "./almacen";
import { formatoCifra } from "./ejecutor";
import { crearZip, type ArchivoZip } from "./zip";
import type { Agente, Campo, EmpresaPreparada, Regla, ValorCampo } from "./tipos";

export interface PasoClaro { nombre: string; descripcion: string }

export interface Cajas {
    /** Caja 1: lo que el usuario entrega (archivo de estados y datos de la operación). */
    documentos: Campo[];
    /** Caja 2: datos de mercado que Mirage aporta. */
    datos: PasoClaro[];
    /** Caja 3: cálculos que hace el agente. */
    calculo: PasoClaro[];
    /** Caja 4: qué entrega y con qué criterios decide. */
    instrucciones: { entrega: string; texto: string; criterios: string[] };
}

const ENTREGAS = { memo: "Memo para comité", decision: "Decisión (sí / no) con motivos", resumen: "Resumen ejecutivo", ninguna: "Solo cifras, sin texto" } as const;
const VERBOS = { negar: "Niega", condicionar: "Pone condiciones", alertar: "Avisa", aprobar: "Aprueba" } as const;
/** La regla dice lo que debe cumplirse; la frase dice cuándo actúa (lo contrario). */
const CONTRARIO = { ">=": "es menor que", ">": "no supera", "<=": "supera", "<": "llega a", "=": "es distinto de" } as const;

function pasos(agente: Agente, caja: "datos" | "calculo"): PasoClaro[] {
    const vistos = new Set<string>();
    return agente.pasos.map(p => MAPA_BLOQUES[p.bloque]).filter(b => b && b.caja === caja && !vistos.has(b.codigo) && vistos.add(b.codigo)).map(b => ({ nombre: b.nombre, descripcion: b.descripcion }));
}

/** «Niega si el DSCR es menor que 1,30 x». */
export function fraseRegla(agente: Agente, r: Regla, valores: Record<string, ValorCampo> = {}): string {
    const [paso, salida] = r.cifra.split(".");
    const p = agente.pasos.find(x => x.id === paso), s = p ? MAPA_BLOQUES[p.bloque]?.salidas.find(x => x.id === salida) : undefined;
    const etiqueta = s?.etiqueta ?? r.cifra;
    const umbral = r.umbralDe && typeof valores[r.umbralDe] === "number" ? valores[r.umbralDe] as number : r.umbral;
    const valor = fmt(formatoCifra({ v: umbral, fmt: s?.fmt ?? "num", etiqueta, origen: { paso: "", bloque: "REGLA", version: "", fuente: "" } }));
    const unidad = s?.unidad && !["COP millones"].includes(s.unidad) ? ` ${s.unidad}` : "";
    return `${VERBOS[r.efecto]} si ${/^.[a-záéíóúñ]/.test(etiqueta) ? etiqueta.charAt(0).toLowerCase() + etiqueta.slice(1) : etiqueta} ${CONTRARIO[r.operador]} ${valor}${s?.fmt === "x" && !unidad ? " veces" : unidad}.`;
}

export function cajas(agente: Agente, valores: Record<string, ValorCampo> = {}): Cajas {
    return {
        documentos: agente.entradas,
        datos: pasos(agente, "datos"),
        calculo: pasos(agente, "calculo"),
        instrucciones: { entrega: ENTREGAS[agente.instruccion.salida], texto: agente.instruccion.texto, criterios: agente.instruccion.reglas.map(r => fraseRegla(agente, r, valores)) },
    };
}

/* ----------------------------- Paquete descargable ----------------------------- */

const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agente";
const esEmpresa = (v: ValorCampo | undefined): v is EmpresaPreparada => !!v && typeof v === "object" && !Array.isArray(v) && (v as EmpresaPreparada).tipo === "empresa";

/** entradas.json legible: tasas en porcentaje, sector por código CIIU, estados por nombre de archivo. */
function entradasLegibles(agente: Agente, valores: Record<string, ValorCampo>, datos: Datos) {
    const salida: Record<string, unknown> = {};
    for (const c of agente.entradas) {
        const v = valores[c.id] ?? c.defecto ?? null;
        if (c.tipo === "estados") salida[c.id] = esEmpresa(v) ? v.archivo : "estados.xlsx";
        else if (c.tipo === "tasa") salida[c.id] = typeof v === "number" ? Math.round(v * 1e8) / 1e6 : null;
        else if (c.tipo === "sector") salida[c.id] = typeof v === "number" ? datos.sectores[v]?.ciiu_division ?? null : v;
        else salida[c.id] = v;
    }
    const empresa = Object.values(valores).find(esEmpresa);
    if (empresa && !agente.entradas.some(c => c.tipo === "sector")) salida.sector = datos.sectores[empresa.sector]?.ciiu_division ?? null;
    if (empresa && !agente.entradas.some(c => c.tipo === "tamano")) salida.tamano = empresa.tamano;
    return salida;
}

function leame(agente: Agente, c: Cajas, entradas: Record<string, unknown>) {
    const tipo: Record<string, string> = { tasa: "en porcentaje (16 = 16 %)", dinero: "en la misma unidad de los estados financieros", sector: "código CIIU", estados: "nombre del archivo, en esta carpeta", flujos: "lista de flujos desde el año 0" };
    return [
        `# ${agente.nombre}`, "", agente.descripcion, "",
        "## Qué hace", "",
        ...c.datos.map(p => `- Toma ${p.nombre.toLowerCase()} de Mirage.`),
        ...c.calculo.map(p => `- Calcula ${p.nombre.toLowerCase()}.`),
        `- Entrega: ${c.instrucciones.entrega.toLowerCase()}.`,
        ...c.instrucciones.criterios.map(x => `- ${x}`), "",
        "## Cómo usarlo", "",
        "1. Instale Node.js 20 o superior (nodejs.org).",
        "2. Abra una terminal en esta carpeta.",
        "3. Ejecute: `node ejecutar.mjs`",
        "   Para otra empresa: `node ejecutar.mjs otro-archivo.xlsx`", "",
        "El resultado queda en `resultado.md` (texto, decisión y cifras) y `resultado.json` (todo el detalle).", "",
        "## Datos de entrada (`entradas.json`)", "",
        ...agente.entradas.map(e => `- \`${e.id}\`: ${e.etiqueta}${tipo[e.tipo] ? ` — ${tipo[e.tipo]}` : ""}. Valor actual: ${JSON.stringify(entradas[e.id] ?? null)}.`),
        ...("sector" in entradas && !agente.entradas.some(e => e.id === "sector") ? ["- `sector`: sector de la empresa (código CIIU).", "- `tamano`: Micro, Pequeña, Mediana o Grande."] : []), "",
        "## Qué sale de este equipo", "",
        "Los estados financieros se leen y se calculan aquí. Solo para redactar el texto se envían al Motor Mirage las cifras ya calculadas; nunca el archivo.",
        "Los datos de mercado se toman del servicio de Mirage con su fecha de corte; sin conexión se usa la copia de la carpeta `datos/`.", "",
        "`agente.json` es la receta del agente: se puede volver a abrir en Mirage (Agentes → Mis agentes → Importar).",
    ].join("\n");
}

/** Arma el .zip del agente: receta, entradas con los valores actuales, el archivo de estados, el programa y la copia de los datos de mercado. */
export async function paqueteAgente(agente: Agente, valores: Record<string, ValorCampo>, datos: Datos): Promise<{ nombre: string; zip: Blob }> {
    const leer = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error("No se pudo preparar la descarga del agente. Inténtelo de nuevo."); return new Uint8Array(await r.arrayBuffer()); };
    const entradas = entradasLegibles(agente, valores, datos), c = cajas(agente, valores);
    const archivos: ArchivoZip[] = [
        { nombre: "LEAME.md", datos: leame(agente, c, entradas) },
        { nombre: "agente.json", datos: exportarAgente(agente) },
        { nombre: "entradas.json", datos: JSON.stringify(entradas, null, 2) },
        { nombre: "ejecutar.mjs", datos: await leer("/agentes/ejecutar.mjs") },
        ...await Promise.all(["meta", "estilo", "parametros", "sectores", "indicadores"].map(async a => ({ nombre: `datos/${a}.json`, datos: await leer(`${API_BASE}/${a}.json`) }))),
    ];
    for (const v of Object.values(valores)) if (esEmpresa(v) && v.bytes && !archivos.some(a => a.nombre === v.archivo)) archivos.push({ nombre: v.archivo, datos: v.bytes });
    const zip = crearZip(archivos);
    return { nombre: `${slug(agente.nombre)}.zip`, zip: new Blob([zip as BlobPart], { type: "application/zip" }) };
}
