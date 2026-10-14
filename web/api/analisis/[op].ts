/**
 * JEV en Mirage (función de Vercel; la llave vive en las variables de entorno del proyecto, no en el navegador).
 *
 *   POST /api/analisis/revisar   → veredicto sobre una tabla de cuentas ya leída: qué filas mostrar, qué campo es cada una
 *   POST /api/analisis/graficas  → qué gráficas y KPI van en el dashboard del Excel, a partir de un resumen de la empresa
 *   POST /api/analisis/decidir   → decisión y recomendaciones sobre el resultado de una sección de la calculadora
 *   POST /api/analisis/sector    → sector CIIU y tamaño a partir de la descripción de la empresa
 *   POST /api/analisis/supuestos → elige opciones de un menú cerrado (crecimiento, margen, Kd) para «Tu empresa»; Mirage las calcula
 *
 * JEV nunca recibe archivos: la extracción la hacen los lectores de Mirage en el navegador y aquí solo llega la tabla
 * plana (cuentas y cifras) o el resumen de indicadores. Así cada archivo cuesta una fracción de centavo de dólar.
 * Modelo: typesafe/jev-router en OpenRouter (cambia con JEV_MODEL). Responde siempre JSON validado contra un esquema.
 */
const MODELO = process.env.JEV_MODEL || "typesafe/jev-router";
const ORIGENES = /^https:\/\/((mirage\.)?hypertarget\.tech|mirage[a-z0-9-]*\.vercel\.app)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const MAX_TEXTO = 40_000;

type Esquema = Record<string, unknown>;
type Mensaje = { role: "system" | "user"; content: string | unknown[] };

/* ----------------------------- Esquemas de salida ----------------------------- */
const str = { type: "string" }, strN = { type: ["string", "null"] }, int = { type: "integer" };
const obj = (properties: Record<string, unknown>): Esquema => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const arr = (items: unknown, extra: Record<string, unknown> = {}) => ({ type: "array", items, ...extra });

const UNIDAD = { type: "string", enum: ["unidades", "miles", "millones"] };
const MONEDA = { type: "string", enum: ["COP", "USD", "otra"] };

const ESQ_REVISAR = obj({
    formato: str,
    veredicto: str,
    unidad: UNIDAD,
    moneda: MONEDA,
    nombre: strN,
    sector: { type: ["integer", "null"] },
    alertas: arr(str),
    filas: arr(obj({ i: int, mostrar: { type: "boolean" }, estado: { type: "string", enum: ["bal", "pyg"] }, campo: strN, motivo: str })),
});

const TIPOS = ["columnas", "barras", "lineas", "area", "columnas_apiladas", "combo", "torta", "anillo"];
const ESQ_GRAFICAS = obj({
    lectura: str,
    kpis: arr(str),
    graficas: arr(obj({ tipo: { type: "string", enum: TIPOS }, titulo: str, series: arr(str), secundaria: arr(str), hallazgo: str })),
});

const ESQ_DECIDIR = obj({
    decision: str,
    veredicto: { type: "string", enum: ["favorable", "con_reservas", "desfavorable", "informativo"] },
    recomendaciones: arr(str),
    alertas: arr(str),
});
const ESQ_SECTOR = obj({ sector: { type: ["integer", "null"] }, tamano: { type: ["string", "null"] }, motivo: str });
// Decisiones dentro del harness: JEV elige una opción de un menú cerrado; Mirage calcula cada opción.
const eleccion = (opciones: string[]) => obj({ opcion: { type: "string", enum: opciones }, motivo: str });
const ESQ_SUPUESTOS = obj({
    crecimiento: eleccion(["historico_acotado", "inflacion_largo_plazo", "intermedio"]),
    margen: eleccion(["ultimo", "mediana_rentables", "promedio_3"]),
    kd: eleccion(["observado_sector_tamano", "implicito_empresa"]),
});

/* ----------------------------- Instrucciones ----------------------------- */
const BASE = "Eres JEV, analista financiero senior de Mirage (HyperTarget). Trabajas con estados financieros de empresas colombianas y extranjeras (NIIF plenas, NIIF pymes, PUC, US GAAP, formatos internos). Escribes en español de Colombia, sobrio y concreto, sin adornos. Respondes solo el JSON pedido.";

const P_REVISAR = `${BASE}
Recibes la tabla de cuentas que el lector de Mirage sacó del archivo de un usuario, con el campo que le asignó por reglas a cada fila. Tu trabajo es dar el veredicto de presentación y corregir el mapeo:
- mostrar=false para filas que no deben aparecer en los estados del informe: duplicados de otra fila, porcentajes, márgenes o razones, datos por acción, notas o referencias, firmas, totales de control repetidos, filas de otro estado (flujo de efectivo, cambios en el patrimonio, ORI) que se colaron, y detalles que repiten un subtotal ya presente.
- campo: el campo Mirage correcto de la fila (id de la lista de campos) o null si no corresponde a ninguno. Cada campo puede ir en una sola fila. Prefiere la fila que representa el total del concepto (por ejemplo, el total de obligaciones financieras corrientes y no las líneas que lo componen).
- estado: bal o pyg.
- Los encabezados de sección sin cifras (Activos corrientes, Patrimonio, Ingresos…) se presentan siempre: no los marques.
- Solo devuelve en "filas" las que cambias (mostrar=false, otro campo u otro estado); las demás quedan como están. motivo: una frase corta.
- unidad y moneda: infiérelas de los textos y de la magnitud de las cifras. nombre: razón social si aparece. sector: índice i de la lista de sectores solo si la razón social o los textos del archivo indican la actividad; si no, null (no adivines por las cifras).
- formato: qué tipo de estado es (p. ej. "NIIF pymes · Supersociedades", "PUC por códigos", "US GAAP 10-K").
- veredicto: dos o tres frases sobre la calidad del archivo y lo que ajustaste. alertas: problemas que el usuario debe revisar (cuadres, años faltantes, signos raros). Lista vacía si no hay.`;

const P_GRAFICAS = `${BASE}
Diseñas el dashboard de la primera hoja del Excel de diagnóstico financiero de una empresa. Recibes un resumen con sus cifras por año, indicadores, valoración, alertas y el catálogo de series, composiciones y KPI disponibles.
- Elige de 6 a 8 gráficas que cuenten la historia de esta empresa en particular: dónde gana o pierde, cómo se financia, si crea valor (ROIC frente a WACC, EVA), liquidez y riesgo. Prioriza lo que cambió o preocupa.
- Usa solo ids del catálogo. Las series de un mismo gráfico deben tener el mismo formato, salvo en "combo": "series" va en columnas (montos) y "secundaria" en línea sobre un eje derecho (porcentajes o veces). En los demás tipos "secundaria" va vacía.
- Las series "proy_*" (proyección) solo se combinan entre sí. "torta" y "anillo" usan exactamente una composición y nada más. Las composiciones también pueden ir en "barras" o "columnas".
- tipo: columnas o barras para comparar montos; lineas para tendencias de márgenes, rentabilidades o días; area o columnas_apiladas para estructura en el tiempo; combo para monto + margen.
- titulo: corto (máx. 6 palabras). hallazgo: una frase con la lectura concreta, citando cifras del resumen.
- kpis: de 4 a 6 ids del catálogo de KPI, los más reveladores para esta empresa.
- lectura: dos o tres frases con el diagnóstico general.
- Las cifras del catálogo están en la unidad de empresa.unidad (por ejemplo «COP miles»): al citarlas usa esa misma unidad, sin convertir a millones ni billones.`;

const P_DECIDIR = `${BASE}
Recibes el documento de resultados de una sección de la calculadora financiera de Mirage (costo de capital, conversión de tasas, valor del dinero, créditos o evaluación de proyectos): supuestos, resultados y tablas, ya calculados. No recalcules; decide.
- decision: dos o tres frases con la decisión concreta que tomarías como analista, citando las cifras. Ejemplos: qué WACC usar para valorar y por qué; si el crédito es conveniente y qué sistema de amortización o plazo conviene; si se acepta o rechaza el proyecto y cuál elegir entre A y B; qué tasa es más barata al comparar en efectiva anual.
- veredicto: favorable, con_reservas, desfavorable o informativo (cuando no hay nada que aprobar).
- recomendaciones: de 2 a 4 acciones concretas (qué supuesto revisar, qué escenario probar, qué negociar).
- alertas: supuestos que parecen fuera de rango o inconsistentes; lista vacía si no hay.`;

const P_SECTOR = `${BASE}
Recibes la descripción que un usuario hace de su empresa y la lista de sectores (división CIIU) y tamaños disponibles. Elige el índice i del sector que mejor describe la actividad principal y el tamaño (uno de la lista) con la misma regla que usa Mirage en sus tablas: activos totales en salarios mínimos (Ley 905 de 2004): micro hasta 500 SMMLV, pequeña de 501 a 5.000, mediana de 5.001 a 30.000 y grande más de 30.000 (SMMLV 2025: $1.423.500). Si solo menciona empleados o ventas, úsalos como indicio y dilo en el motivo. null si no hay datos suficientes. motivo: una frase.`;

const P_SUPUESTOS = `${BASE}
Recibes el resumen de una empresa (ventas, margen EBIT, D/E y cobertura por año, crecimiento histórico, Kd observado de su sector y tamaño, Kd implícito propio si existe y los recortes que Mirage ya aplicó) y un menú cerrado de opciones. Mirage calcula cada opción; tú solo eliges, con criterio de valorador prudente:
- crecimiento: "historico_acotado" si la historia es estable y representativa; "inflacion_largo_plazo" si el crecimiento histórico es errático, viene de una base muy pequeña o de un año atípico; "intermedio" si hay señales mixtas.
- margen: "ultimo" si los márgenes son estables o hay una tendencia clara y sostenible; "mediana_rentables" si hay años con pérdidas o saltos; "promedio_3" si el último año parece atípico.
- kd: "implicito_empresa" solo si aparece en "opciones" y la deuda de la empresa es representativa (no marginal frente a sus pasivos); si no, "observado_sector_tamano".
Elige solo entre las opciones disponibles que vienen en el resumen. motivo: una frase con la cifra que te hizo decidir. No recomiendes invertir ni dejar de invertir.`;

/* ----------------------------- Utilidades ----------------------------- */
const CORS_BASE = { "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" };
function cabeceras(origen: string | null) { return origen && ORIGENES.test(origen) ? { ...CORS_BASE, "access-control-allow-origin": origen } : CORS_BASE; }
function json(body: unknown, status: number, origen: string | null) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...cabeceras(origen) } });
}

const VISTAS = new Map<string, number[]>();
function permitido(ip: string) {
    const ahora = Date.now(), lista = (VISTAS.get(ip) ?? []).filter(t => ahora - t < 600_000);
    if (lista.length >= 40) return false;
    lista.push(ahora); VISTAS.set(ip, lista);
    if (VISTAS.size > 5000) VISTAS.clear();
    return true;
}

function recortar(v: unknown, n: number) { const s = typeof v === "string" ? v : JSON.stringify(v ?? ""); return s.length > n ? s.slice(0, n) + "\n[…recortado]" : s; }

async function jev(nombre: string, esquema: Esquema, mensajes: Mensaje[], maxTokens: number) {
    const llave = process.env.OPENROUTER_API_KEY;
    if (!llave) throw new ErrorJev("El análisis no está disponible en este momento.", 503);
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${llave}`, "content-type": "application/json", "http-referer": "https://mirage.hypertarget.tech", "x-title": "Mirage" },
        body: JSON.stringify({
            model: MODELO, messages: mensajes, temperature: 0, max_tokens: maxTokens, reasoning: { effort: "low" },
            provider: { data_collection: "deny" },
            response_format: { type: "json_schema", json_schema: { name: nombre, strict: true, schema: esquema } },
        }),
        signal: AbortSignal.timeout(110_000),
    });
    const d = await r.json().catch(() => null) as { error?: { message?: string }; model?: string; usage?: { cost?: number; prompt_tokens?: number; completion_tokens?: number }; choices?: { message?: { content?: string }; finish_reason?: string }[] } | null;
    if (!r.ok || !d?.choices?.[0]) {
        console.error("jev", r.status, d?.error?.message);
        throw new ErrorJev("El análisis no está disponible en este momento.", r.status === 402 ? 402 : 502);
    }
    const texto = (d.choices[0].message?.content ?? "").replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "");
    try { return { resultado: JSON.parse(texto), modelo: d.model, uso: { costo_usd: d.usage?.cost ?? null, entrada: d.usage?.prompt_tokens ?? null, salida: d.usage?.completion_tokens ?? null } }; }
    catch { throw new ErrorJev(d.choices[0].finish_reason === "length" ? "El análisis no se pudo completar." : "El análisis no se pudo completar.", 502); }
}
class ErrorJev extends Error { constructor(m: string, public status = 500) { super(m); } }

/* ----------------------------- Operaciones ----------------------------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entrada = Record<string, any>;
const contexto = (e: Entrada) => `Campos Mirage (id · estado · nombre):\n${recortar((e.campos ?? []).map((c: Entrada) => `${c.id} · ${c.st} · ${c.l}`).join("\n"), 6000)}\n\nSectores (i · CIIU · nombre):\n${recortar((e.sectores ?? []).map((s: Entrada) => `${s.i} · ${s.ciiu} · ${s.nombre}`).join("\n"), 8000)}`;

const OPERACIONES: Record<string, (e: Entrada) => Promise<unknown>> = {
    async revisar(e) {
        const tabla = recortar({ archivo: e.archivo, hojas: e.hojas, anios: e.anios, unidad_leida: e.unidad, moneda_leida: e.moneda, nombre_leido: e.nombre, textos: e.textos, filas: e.filas }, MAX_TEXTO);
        return jev("revision", ESQ_REVISAR, [{ role: "system", content: P_REVISAR }, { role: "user", content: `${contexto(e)}\n\nTabla leída (cada fila: [i, cuenta, hoja, estado, campo asignado o null, valores por año]; sin valores = encabezado):\n${tabla}` }], 8_000);
    },
    async decidir(e) {
        return jev("decision", ESQ_DECIDIR, [{ role: "system", content: P_DECIDIR }, { role: "user", content: recortar(e.documento ?? e, 16_000) }], 3_000);
    },
    async sector(e) {
        const lista = recortar((e.sectores ?? []).map((s: Entrada) => `${s.i} · ${s.ciiu} · ${s.nombre}`).join("\n"), 8000);
        return jev("sector", ESQ_SECTOR, [{ role: "system", content: P_SECTOR }, { role: "user", content: `Sectores (i · CIIU · nombre):\n${lista}\n\nTamaños: ${recortar(e.tamanos, 300)}\n\nDescripción:\n${recortar(e.descripcion, 1500)}` }], 1_500);
    },
    async supuestos(e) {
        return jev("supuestos", ESQ_SUPUESTOS, [{ role: "system", content: P_SUPUESTOS }, { role: "user", content: recortar(e, 6_000) }], 1_500);
    },
    async graficas(e) {
        return jev("dashboard", ESQ_GRAFICAS, [{ role: "system", content: P_GRAFICAS }, { role: "user", content: recortar(e, 20_000) }], 6_000);
    },
};

/* ----------------------------- HTTP ----------------------------- */
export function OPTIONS(request: Request) { return new Response(null, { status: 204, headers: cabeceras(request.headers.get("origin")) }); }

export async function POST(request: Request) {
    const origen = request.headers.get("origin");
    if (!origen || !ORIGENES.test(origen)) return json({ ok: false, error: "Origen no permitido." }, 403, origen);
    const partes = new URL(request.url).pathname.split("/").filter(Boolean), op = (partes[partes.length - 1] ?? "").toLowerCase();
    const ejecutar = OPERACIONES[op];
    if (!ejecutar) return json({ ok: false, error: `Operación desconocida: "${op}".` }, 404, origen);
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
    if (!permitido(ip)) return json({ ok: false, error: "Demasiadas solicitudes; intente en unos minutos." }, 429, origen);
    let entrada: Entrada;
    try { entrada = await request.json(); } catch { return json({ ok: false, error: "El cuerpo debe ser JSON válido." }, 400, origen); }
    try {
        const { resultado, modelo, uso } = await ejecutar(entrada) as { resultado: unknown; modelo?: string; uso?: unknown };
        // Modelo y costo quedan en los registros de Vercel, no en la respuesta pública
        console.log(JSON.stringify({ op, modelo, uso }));
        return json({ ok: true, operacion: op, resultado }, 200, origen);
    } catch (err) {
        const e = err instanceof ErrorJev ? err : new ErrorJev("El análisis no está disponible en este momento.", 502);
        return json({ ok: false, operacion: op, error: e.message }, e.status, origen);
    }
}
