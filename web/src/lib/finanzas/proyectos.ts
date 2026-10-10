/**
 * Evaluación de proyectos de inversión.
 *
 * Indicadores (Ehrhardt y Brigham, cap. 10; "Model Eval Proyectos" del profesor Félix Gutiérrez): VPN, TIR,
 * TIRM (como MIRR de Excel), índice de rentabilidad, VAE, periodo de recuperación simple y descontado, tasa
 * de cruce y perfil del VPN.
 *
 * Modelo de flujo de caja libre ("Formulación de Proyectos Modelo MFI"): estado de resultados, UODI, FCB,
 * reposición de KTNO y activos fijos, FCL del proyecto y del inversionista, y las tres evaluaciones del
 * profesor: proyecto con financiación a VPN(CK), proyecto sin financiación a VPN(TMRR) e inversionista con
 * financiación a VPN(TMRR). El CK puede venir del WACC sectorial de Mirage.
 */
import { ErrorFinanciero } from "./tasas";
import { cambiosDeSigno, tir, vpn } from "./flujos";
import { amortizar, type Sistema } from "./amortizacion";


/** TIRM como MIRR de Excel: negativos al costo de financiación, positivos reinvertidos a la tasa de reinversión. */
export function tirm(flujos: number[], kFinanciacion: number, kReinversion = kFinanciacion): number | null {
    const n = flujos.length - 1;
    const vpCostos = -flujos.reduce((s, f, t) => s + (f < 0 ? f / Math.pow(1 + kFinanciacion, t) : 0), 0);
    const vfEntradas = flujos.reduce((s, f, t) => s + (f > 0 ? f * Math.pow(1 + kReinversion, n - t) : 0), 0);
    if (vpCostos <= 0 || vfEntradas <= 0 || n < 1) return null;
    return Math.pow(vfEntradas / vpCostos, 1 / n) - 1;
}

/** Periodo de recuperación con fracción lineal dentro del periodo; `null` si no se recupera. */
export function recuperacion(flujos: number[], k = 0): number | null {
    let acumulado = 0;
    for (let t = 0; t < flujos.length; t++) {
        const v = flujos[t] / Math.pow(1 + k, t);
        const antes = acumulado;
        acumulado += v;
        if (t > 0 && antes < 0 && acumulado >= 0) return t - 1 + (-antes / v);
    }
    return null;
}

/** Valor anual equivalente (anualidad del VPN durante la vida del proyecto). */
export function vae(vpnValor: number, k: number, n: number): number {
    if (n <= 0) throw new ErrorFinanciero("La vida del proyecto debe ser positiva.");
    return k === 0 ? vpnValor / n : vpnValor * k / (1 - Math.pow(1 + k, -n));
}

export interface Indicadores {
    vpn: number;
    tir: number | null;
    tirMultiple: boolean;
    tirm: number | null;
    indiceRentabilidad: number | null;
    vae: number;
    recuperacion: number | null;
    recuperacionDescontada: number | null;
    /** Saldo final de la tabla del profesor: −VPN·(1+k)^n. */
    saldoFinal: number;
    decision: "aceptar" | "rechazar" | "indiferente";
}

export function indicadores(flujos: number[], k: number, opciones: { kReinversion?: number } = {}): Indicadores {
    if (flujos.length < 2) throw new ErrorFinanciero("Se necesitan al menos dos flujos (inversión y un periodo).");
    const n = flujos.length - 1;
    const v = vpn(k, flujos);
    const vpCostos = -flujos.reduce((s, f, t) => s + (f < 0 ? f / Math.pow(1 + k, t) : 0), 0);
    const vpEntradas = flujos.reduce((s, f, t) => s + (f > 0 ? f / Math.pow(1 + k, t) : 0), 0);
    return {
        vpn: v,
        tir: tir(flujos),
        tirMultiple: cambiosDeSigno(flujos) > 1,
        tirm: tirm(flujos, k, opciones.kReinversion ?? k),
        indiceRentabilidad: vpCostos > 0 ? vpEntradas / vpCostos : null,
        vae: vae(v, k, n),
        recuperacion: recuperacion(flujos),
        recuperacionDescontada: recuperacion(flujos, k),
        saldoFinal: -v * Math.pow(1 + k, n),
        decision: Math.abs(v) < 1e-9 ? "indiferente" : v > 0 ? "aceptar" : "rechazar",
    };
}

/** Tasa de cruce de Fisher: TIR de la diferencia de flujos A − B. */
export function tasaCruce(a: number[], b: number[]): number | null {
    const n = Math.max(a.length, b.length);
    return tir(Array.from({ length: n }, (_, t) => (a[t] ?? 0) - (b[t] ?? 0)));
}

/** Perfil del VPN entre dos tasas. */
export function perfilVPN(flujos: number[], desde = 0, hasta = 0.3, pasos = 30) {
    return Array.from({ length: pasos + 1 }, (_, j) => { const k = desde + (hasta - desde) * j / pasos; return { k, vpn: vpn(k, flujos) }; });
}

/* ------------------------------------------------------------------ */
/* Modelo de flujo de caja libre del proyecto                          */
/* ------------------------------------------------------------------ */

export interface Activo { nombre: string; valor: number; vidaUtil: number }

export interface TramoDeuda {
    nombre: string;
    /** Proporción de la inversión inicial financiada con este tramo (0–1). */
    proporcion: number;
    /** Costo efectivo anual antes de impuestos. */
    tasaEA: number;
    /** Plazo en años (el crédito se paga anualmente en el modelo anual). */
    plazo: number;
    sistema: Sistema;
}

export interface EntradaProyecto {
    horizonte: number;
    /** Ventas del año 1. */
    ventas: number;
    /** Crecimiento anual de ventas: un valor o uno por año (desde el año 2). */
    crecimiento: number | number[];
    /** Costo de ventas como fracción de las ventas. */
    costoVentas: number;
    /** Gastos de administración y ventas: fracción de las ventas. */
    gastosAdmonVentas: number;
    /** Gastos fijos anuales adicionales (opcional). */
    gastosFijos?: number;
    activos: Activo[];
    /** Inversión en diferidos (adecuaciones locativas) y años de amortización. */
    diferidos?: { valor: number; anios: number };
    /** KTNO como fracción de las ventas (inverso de la productividad del KTNO). */
    ktnoSobreVentas: number;
    /** KTNO inicial (año 0). Si no se da, se toma ktnoSobreVentas × ventas del año 1. */
    ktnoInicial?: number;
    /** Reposición de activos fijos por año (capex), opcional, longitud = horizonte. */
    reposicionActivos?: number[];
    tasaImpuesto: number;
    /** Valor de mercado de los activos al final; por defecto, el valor en libros. */
    valorSalvamento?: number;
    /** Recuperar el KTNO al final del horizonte (por defecto sí). */
    recuperarKTNO?: boolean;
    /** Financiación con deuda. El resto es patrimonio. */
    deuda?: TramoDeuda[];
    /** Rentabilidad mínima requerida por el inversionista (Ke / TMRR), efectiva anual. */
    tmrr: number;
    /** Costo de capital a usar; si no se da, se calcula con la estructura (deuda después de impuestos y TMRR). */
    costoCapital?: number;
}

export interface AnioProyecto {
    anio: number;
    ventas: number; costoVentas: number; margenBruto: number; gastosAdmonVentas: number;
    depreciacion: number; amortizacionDiferidos: number; uaii: number; impuesto: number; uodi: number;
    fcb: number; ktno: number; inversionKTNO: number; inversionActivos: number;
    valorSalvamento: number; fclProyecto: number;
    intereses: number; abonoCapital: number; escudoFiscal: number; desembolsoDeuda: number; fclInversionista: number;
    capitalInvertido: number; eva: number | null;
}

export interface ResultadoProyecto {
    anios: AnioProyecto[];
    inversionInicial: number;
    estructura: { nombre: string; proporcion: number; monto: number; costoDespuesImpuestos: number; ponderado: number }[];
    costoCapital: number;
    evaluaciones: {
        proyectoConFinanciacion: Indicadores & { tasa: number; descripcion: string };
        proyectoSinFinanciacion: Indicadores & { tasa: number; descripcion: string };
        inversionistaConFinanciacion: Indicadores & { tasa: number; descripcion: string };
    };
    controles: { proporcionesValidas: boolean; deudaPagada: boolean };
}

export function modeloProyecto(e: EntradaProyecto): ResultadoProyecto {
    const n = Math.round(e.horizonte);
    if (!(n >= 1 && n <= 50)) throw new ErrorFinanciero("El horizonte debe estar entre 1 y 50 años.");
    if (!(e.ventas >= 0)) throw new ErrorFinanciero("Las ventas del año 1 no pueden ser negativas.");
    const crec = (t: number) => Array.isArray(e.crecimiento) ? (e.crecimiento[t - 2] ?? e.crecimiento[e.crecimiento.length - 1] ?? 0) : e.crecimiento;
    const ventas: number[] = [0];
    for (let t = 1; t <= n; t++) ventas.push(t === 1 ? e.ventas : ventas[t - 1] * (1 + crec(t)));

    const inversionActivosFijos = e.activos.reduce((s, a) => s + a.valor, 0);
    const dif = e.diferidos ?? { valor: 0, anios: 1 };
    const ktno0 = e.ktnoInicial ?? e.ktnoSobreVentas * e.ventas;
    const inversionInicial = inversionActivosFijos + dif.valor + ktno0;

    const depreciacion = (t: number) => e.activos.reduce((s, a) => s + (a.vidaUtil > 0 && t <= a.vidaUtil ? a.valor / a.vidaUtil : 0), 0);
    const libros = e.activos.reduce((s, a) => s + Math.max(0, a.valor - (a.vidaUtil > 0 ? a.valor / a.vidaUtil * Math.min(n, a.vidaUtil) : a.valor)), 0)
        + (e.reposicionActivos ?? []).reduce((s, x) => s + x, 0);
    const salvamentoBruto = e.valorSalvamento ?? libros;
    const salvamentoNeto = salvamentoBruto - e.tasaImpuesto * (salvamentoBruto - libros);

    // Estructura de capital y deuda
    const tramos = e.deuda ?? [];
    const pDeuda = tramos.reduce((s, d) => s + d.proporcion, 0);
    const estructura = [
        ...tramos.map(d => ({ nombre: d.nombre, proporcion: d.proporcion, monto: d.proporcion * inversionInicial, costoDespuesImpuestos: d.tasaEA * (1 - e.tasaImpuesto), ponderado: d.proporcion * d.tasaEA * (1 - e.tasaImpuesto) })),
        { nombre: "Inversionistas", proporcion: 1 - pDeuda, monto: (1 - pDeuda) * inversionInicial, costoDespuesImpuestos: e.tmrr, ponderado: (1 - pDeuda) * e.tmrr },
    ];
    const ck = e.costoCapital ?? estructura.reduce((s, x) => s + x.ponderado, 0);
    const creditos = tramos.map(d => amortizar({ principal: d.proporcion * inversionInicial || 1e-12, cuotas: Math.max(1, Math.round(d.plazo)), tasaPeriodica: d.tasaEA, sistema: d.sistema, periodosPorAnio: 1 }));
    const deudaEn = (t: number, campo: "intereses" | "abonoCapital") => creditos.reduce((s, c, j) => s + (tramos[j].proporcion > 0 ? (c.filas[t]?.[campo] ?? 0) : 0), 0);

    const anios: AnioProyecto[] = [];
    let ktnoPrev = 0;
    for (let t = 0; t <= n; t++) {
        const v = ventas[t];
        const cv = v * e.costoVentas, mb = v - cv, gav = t === 0 ? 0 : v * e.gastosAdmonVentas + (e.gastosFijos ?? 0);
        const dep = t === 0 ? 0 : depreciacion(t);
        const am = t === 0 || t > dif.anios ? 0 : dif.valor / dif.anios;
        const uaii = mb - gav - dep - am;
        const imp = t === 0 ? 0 : uaii * e.tasaImpuesto;
        const uodi = uaii - imp;
        const fcb = uodi + dep + am;
        const ktno = t === 0 ? ktno0 : (t === n && e.recuperarKTNO !== false ? 0 : e.ktnoSobreVentas * (t < n ? ventas[t + 1] : v));
        // KTNO del año t financia las ventas del año t+1 (como en la plantilla); al final se recupera
        const invKTNO = t === 0 ? 0 : ktno - ktnoPrev;
        const invAF = t === 0 ? 0 : (e.reposicionActivos?.[t - 1] ?? 0);
        const salv = t === n ? salvamentoNeto : 0;
        const fclProyecto = t === 0 ? -inversionInicial : fcb - invKTNO - invAF + salv;
        const intereses = t === 0 ? 0 : deudaEn(t, "intereses");
        const abono = t === 0 ? 0 : deudaEn(t, "abonoCapital");
        const escudo = intereses * e.tasaImpuesto;
        const desembolso = t === 0 ? pDeuda * inversionInicial : 0;
        const fclInv = fclProyecto - intereses - abono + escudo + desembolso;
        // Capital invertido al inicio del año: activos netos + diferidos netos + KTNO del año anterior
        const depAcum = (s: number) => { let x = 0; for (let k = 1; k <= s; k++) x += depreciacion(k); return x; };
        const capInicio = t === 0 ? inversionInicial : inversionActivosFijos - depAcum(t - 1) + Math.max(0, dif.valor - (dif.valor / dif.anios) * Math.min(t - 1, dif.anios)) + ktnoPrev + (e.reposicionActivos ?? []).slice(0, t - 1).reduce((s, x) => s + x, 0);
        anios.push({
            anio: t, ventas: v, costoVentas: cv, margenBruto: mb, gastosAdmonVentas: gav, depreciacion: dep, amortizacionDiferidos: am,
            uaii, impuesto: imp, uodi, fcb, ktno, inversionKTNO: invKTNO, inversionActivos: t === 0 ? inversionActivosFijos + dif.valor : invAF,
            valorSalvamento: salv, fclProyecto, intereses, abonoCapital: abono, escudoFiscal: escudo, desembolsoDeuda: desembolso, fclInversionista: fclInv,
            capitalInvertido: capInicio, eva: t === 0 ? null : uodi - ck * capInicio,
        });
        ktnoPrev = ktno;
    }
    const fp = anios.map(a => a.fclProyecto), fi = anios.map(a => a.fclInversionista);
    return {
        anios, inversionInicial, estructura, costoCapital: ck,
        evaluaciones: {
            proyectoConFinanciacion: { ...indicadores(fp, ck), tasa: ck, descripcion: "FCL del proyecto descontado al costo de capital (CK)" },
            proyectoSinFinanciacion: { ...indicadores(fp, e.tmrr), tasa: e.tmrr, descripcion: "FCL del proyecto descontado a la TMRR (todo con recursos propios)" },
            inversionistaConFinanciacion: { ...indicadores(fi, e.tmrr), tasa: e.tmrr, descripcion: "FCL del inversionista (después de deuda) descontado a la TMRR" },
        },
        controles: {
            proporcionesValidas: pDeuda >= 0 && pDeuda <= 1 && tramos.every(d => d.proporcion >= 0),
            deudaPagada: creditos.every(c => c.controles.saldoFinalCero) && tramos.every(d => d.plazo <= n),
        },
    };
}
