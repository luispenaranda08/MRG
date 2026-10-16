/**
 * Validador de cifras: cada número del texto del Motor Mirage debe existir en la ejecución (dentro del redondeo con
 * que está escrito). No cuenta años, numerales de listas, normas (NIC 36, Ley 1581…) ni enteros pequeños sin unidad.
 */
import type { Cifra, Ejecucion, Validacion } from "./tipos";

const ESCALAS: [RegExp, number][] = [
    [/^(?:mil\s+millones|miles\s+de\s+millones|mm)\b/i, 1e9],
    [/^(?:billones|billón|bn)\b/i, 1e12],
    [/^(?:millones|millón|mill\.?|mn)\b/i, 1e6],
    [/^(?:miles|mil)\b/i, 1e3],
];
const NORMAS = /(?:NIC|NIIF|IFRS|IAS|CIIU|Ley|Decreto|art(?:ículo|\.)|Circular|NIT|Resolución|paso|regla|anexo|nota|sección|cap(?:ítulo|\.))\s*$/i;

function escalaDeUnidad(u?: string) {
    if (!u) return 1;
    if (/miles de millones/i.test(u)) return 1e9;
    if (/millones/i.test(u)) return 1e6;
    if (/miles/i.test(u)) return 1e3;
    return 1;
}

/** "1.234.567,8" → 1234567.8 y decimales escritos; acepta también "1,35" y "12.5" (punto decimal si no son miles). */
function leerNumero(t: string): { x: number; d: number } | null {
    const s = t.replace(/[−–]/g, "-").replace(/\s/g, "");
    let entero = s, dec = "";
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) { [entero, dec = ""] = s.split(","); entero = entero.replace(/\./g, ""); }
    else if (/^-?\d+,\d+$/.test(s)) [entero, dec] = s.split(",");
    else if (/^-?\d+\.\d+$/.test(s) && !/^-?\d{1,3}\.\d{3}$/.test(s)) [entero, dec] = s.split(".");
    else if (/^-?\d{1,3}\.\d{3}$/.test(s)) entero = s.replace(".", "");
    else if (!/^-?\d+$/.test(s)) return null;
    const x = Number(`${entero}.${dec || 0}`);
    return Number.isFinite(x) ? { x, d: dec.length } : null;
}

const NUMERO = /(?<![\w.,])[-−–]?\d{1,3}(?:\.\d{3})+(?:,\d+)?(?![\d])|(?<![\w.,])[-−–]?\d+(?:[.,]\d+)?(?![\d])/g;

export function validarTexto(texto: string, ejecucion: Pick<Ejecucion, "cifras">): Validacion {
    const candidatas = Object.entries(ejecucion.cifras).filter(([, c]) => typeof c.v === "number" && Number.isFinite(c.v)) as [string, Cifra & { v: number }][];
    const textos = Object.entries(ejecucion.cifras).filter(([, c]) => typeof c.v === "string").map(([k, c]) => [k, c.v as string] as const);
    const coincidencias: Validacion["coincidencias"] = [], sinRespaldo: Validacion["sinRespaldo"] = [];
    for (const m of texto.matchAll(NUMERO)) {
        const bruto = m[0], inicio = m.index!, antes = texto.slice(Math.max(0, inicio - 24), inicio), despues = texto.slice(inicio + bruto.length);
        const n = leerNumero(bruto);
        if (!n) continue;
        const suf = despues.match(/^\s*(%|pp\b|puntos?\s+porcentuales|p\.\s?p\.|x\b|veces\b)/i), sufijo = suf?.[1]?.toLowerCase();
        const esPct = sufijo === "%", esPp = !!sufijo && (sufijo.startsWith("pp") || sufijo.startsWith("punto") || sufijo.startsWith("p.")), esX = sufijo === "x" || sufijo === "veces";
        const escTexto = ESCALAS.find(([re]) => re.test(despues.replace(/^\s+/, "")))?.[1] ?? 1;
        const lineaAntes = texto.slice(texto.lastIndexOf("\n", inicio - 1) + 1, inicio);
        // Lo que no es una cifra financiera: años, numerales de lista, normas, fechas y enteros pequeños sin unidad.
        if (!sufijo && escTexto === 1) {
            if (n.d === 0 && Number.isInteger(n.x) && n.x >= 1900 && n.x <= 2100) continue;
            if (/^\s*$/.test(lineaAntes) && /^[.)]\s/.test(despues)) continue;
            if (n.d === 0 && Math.abs(n.x) <= 10) continue;
        }
        if (NORMAS.test(antes)) continue;
        if (/^[/-]\d/.test(despues) || /\d[/-]$/.test(antes)) continue;

        const tolTexto = 0.5 * Math.pow(10, -n.d);
        let mejor: { clave: string; err: number } | null = null;
        // Números que vienen dentro de una cifra de texto (código CIIU del sector, rating, año): tienen respaldo literal.
        if (!sufijo && escTexto === 1) {
            const literal = textos.find(([, t]) => new RegExp(`(?<![\\d.,])${bruto.replace(/[.\-−–]/g, m => `\\${m}`)}(?![\\d])`).test(t));
            if (literal) mejor = { clave: literal[0], err: 0 };
        }
        for (const [clave, c] of mejor ? [] : candidatas) {
            const v = c.v, ops: number[] = [];
            if (esPct || esPp) { if (c.fmt === "pct" || c.fmt === "pp") ops.push(Math.abs(Math.abs(n.x) - Math.abs(v * 100)) - tolTexto); }
            else if (esX) ops.push(Math.abs(Math.abs(n.x) - Math.abs(v)) - tolTexto);
            else {
                if (c.fmt === "pct") continue;
                const escU = escalaDeUnidad(c.unidad);
                ops.push(Math.abs(Math.abs(n.x * escTexto) - Math.abs(v * escU)) - tolTexto * escTexto);
                if (escTexto === 1) ops.push(Math.abs(Math.abs(n.x) - Math.abs(v)) - tolTexto);
                if (escTexto !== 1 && escU === 1) ops.push(Math.abs(Math.abs(n.x * escTexto) - Math.abs(v)) - tolTexto * escTexto);
            }
            const ok = ops.filter(o => o <= 1e-9);
            if (ok.length) { const err = Math.min(...ok); if (!mejor || err < mejor.err) mejor = { clave, err }; }
        }
        const fin = inicio + bruto.length + (suf ? suf[0].length : 0);
        const fragmento = texto.slice(inicio, fin);
        if (mejor) coincidencias.push({ texto: fragmento, inicio, fin, clave: mejor.clave });
        else sinRespaldo.push({ texto: fragmento, inicio, fin });
    }
    return { total: coincidencias.length + sinRespaldo.length, respaldadas: coincidencias.length, coincidencias, sinRespaldo };
}
