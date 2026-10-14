/* eslint-disable @typescript-eslint/no-explicit-any -- la entrada JSON se valida dentro del motor, que lanza ErrorFinanciero con mensajes claros. */
/**
 * API HTTP de la calculadora financiera de Mirage (función de Vercel; no depende de ningún equipo local).
 *
 *   GET  /api/calc/              → descripción de las operaciones
 *   POST /api/calc/<operacion>   → cuerpo JSON con la entrada; responde { ok, operacion, resultado }
 *
 * Operaciones: tasas, equivalencias, tvm, ncuotas, amortizacion, comparar, indicadores, cruce, proyecto.
 * El motor es el mismo que usa la página (`src/lib/finanzas`), así que el navegador y la API dan lo mismo.
 */
import * as F from "../../src/lib/finanzas";

const VERSION = "1.0";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" };

const OPERACIONES: Record<string, { descripcion: string; ejemplo: unknown; ejecutar: (e: any) => unknown }> = {
    tasas: {
        descripcion: "Convierte una tasa entre códigos colombianos (EA, EM, NAMV, NATA…).",
        ejemplo: { tasa: 0.14, desde: "NAMV", hacia: "EA" },
        ejecutar: e => ({ tasa: F.convertir(e.tasa, e.desde, e.hacia), desde: e.desde, hacia: e.hacia }),
    },
    equivalencias: {
        descripcion: "Tabla de tasas equivalentes para todas las frecuencias (hoja ICNV ampliada).",
        ejemplo: { tasa: 0.12, codigo: "EA" },
        ejecutar: e => F.equivalencias(e.tasa, e.codigo),
    },
    tvm: {
        descripcion: "Valor del dinero en el tiempo: P, F, A, n, i; la incógnita va en null (hoja TVM).",
        ejemplo: { P: 72000000, F: 0, A: null, n: 72, i: 0.014, anticipada: false },
        ejecutar: e => F.resolver(e),
    },
    ncuotas: {
        descripcion: "Periodo inicial, final o número de cuotas (dos de tres).",
        ejemplo: { inicial: 0, final: 5, cuotas: null },
        ejecutar: e => F.nCuotas(e),
    },
    amortizacion: {
        descripcion: "Tabla de amortización: cuota_fija, abono_constante, bono_cupon o cero_cupon; tasa fija o por periodo, gracia, UVR o USD.",
        ejemplo: { principal: 100000000, cuotas: 240, tasaPeriodica: 0.011666666666655168, sistema: "cuota_fija", periodosPorAnio: 12, desembolso: "2025-09-10" },
        ejecutar: e => F.amortizar(e),
    },
    comparar: {
        descripcion: "Los cuatro sistemas de amortización con los mismos datos.",
        ejemplo: { principal: 1000, cuotas: 4, tasaPeriodica: 0.1, periodosPorAnio: 1 },
        ejecutar: e => F.compararSistemas(e),
    },
    indicadores: {
        descripcion: "VPN, TIR, TIRM, IR, VAE y recuperación de un flujo de caja.",
        ejemplo: { flujos: [-10000, 3000, 3000, 3000, 3000, 3000], k: 0.12 },
        ejecutar: e => ({ ...F.indicadores(e.flujos, e.k, { kReinversion: e.kReinversion }), perfil: F.perfilVPN(e.flujos, 0, e.perfilHasta ?? 0.3, 30) }),
    },
    cruce: {
        descripcion: "Tasa de cruce de Fisher entre dos proyectos.",
        ejemplo: { a: [-10000, 3000, 3000, 3000, 3000, 3000], b: [-25000, 7400, 7400, 7400, 7400, 7400] },
        ejecutar: e => ({ tasaCruce: F.tasaCruce(e.a, e.b) }),
    },
    proyecto: {
        descripcion: "Modelo de flujo de caja libre (plantilla 'Formulación de Proyectos'): FCL del proyecto y del inversionista y sus tres evaluaciones.",
        ejemplo: { horizonte: 5, ventas: 1000000000, crecimiento: 0.05, costoVentas: 0.55, gastosAdmonVentas: 0.15, activos: [{ nombre: "Maquinaria", valor: 520000000, vidaUtil: 10 }], ktnoSobreVentas: 0.1, tasaImpuesto: 0.35, deuda: [{ nombre: "Banco 1", proporcion: 0.3, tasaEA: 0.15, plazo: 5, sistema: "cuota_fija" }], tmrr: 0.2 },
        ejecutar: e => F.modeloProyecto(e),
    },
};

const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

function operacion(request: Request): string {
    const partes = new URL(request.url).pathname.split("/").filter(Boolean);
    return (partes[partes.length - 1] ?? "").toLowerCase();
}

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

export function GET(request: Request) {
    const op = operacion(request);
    if (OPERACIONES[op]) return json({ operacion: op, descripcion: OPERACIONES[op].descripcion, ejemplo: OPERACIONES[op].ejemplo, metodo: "POST" });
    return json({
        api: "Mirage · calculadora financiera", version: VERSION,
        uso: "POST /api/calc/<operacion> con un cuerpo JSON. Tasas como fracción (0,12 = 12 %).",
        operaciones: Object.fromEntries(Object.entries(OPERACIONES).map(([k, v]) => [k, { descripcion: v.descripcion, ejemplo: v.ejemplo }])),
        fuentes: ["Ehrhardt y Brigham, Finanzas Corporativas, cap. 10"],
    });
}

export async function POST(request: Request) {
    const op = operacion(request);
    const def = OPERACIONES[op];
    if (!def) return json({ ok: false, error: `Operación desconocida: "${op}". Opciones: ${Object.keys(OPERACIONES).join(", ")}.` }, 404);
    let entrada: unknown;
    try { entrada = await request.json(); } catch { return json({ ok: false, error: "El cuerpo debe ser JSON válido." }, 400); }
    try {
        return json({ ok: true, operacion: op, version: VERSION, resultado: def.ejecutar(entrada) });
    } catch (err) {
        const mensaje = err instanceof F.ErrorFinanciero ? err.message : "No se pudo calcular con los datos enviados.";
        return json({ ok: false, operacion: op, error: mensaje }, 422);
    }
}
