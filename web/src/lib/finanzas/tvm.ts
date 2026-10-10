/**
 * Valor del dinero en el tiempo con las convenciones de Excel (VA, VF, PAGO, NPER, TASA).
 *
 * Replica la hoja TVM de la "Calculadora Financiera v9" del profesor Félix Gutiérrez: cinco variables
 * (P, F, A, n, i), se dan cuatro y se resuelve la incógnita. Signos como en Excel: un valor negativo es un
 * egreso y uno positivo un ingreso; un campo vacío es cero. `anticipada` equivale a tipo = 1.
 */
import { ErrorFinanciero } from "./tasas";

const tipo = (anticipada?: boolean) => (anticipada ? 1 : 0);

export function va(i: number, n: number, a = 0, f = 0, anticipada = false): number {
    if (i === 0) return -(a * n + f);
    const q = Math.pow(1 + i, n);
    return -(a * (1 + i * tipo(anticipada)) * (q - 1) / i + f) / q;
}

export function vf(i: number, n: number, a = 0, p = 0, anticipada = false): number {
    if (i === 0) return -(p + a * n);
    const q = Math.pow(1 + i, n);
    return -(p * q + a * (1 + i * tipo(anticipada)) * (q - 1) / i);
}

export function pago(i: number, n: number, p: number, f = 0, anticipada = false): number {
    if (n === 0) throw new ErrorFinanciero("El número de periodos no puede ser cero.");
    if (i === 0) return -(p + f) / n;
    const q = Math.pow(1 + i, n);
    return -(p * q + f) * i / ((1 + i * tipo(anticipada)) * (q - 1));
}

export function nper(i: number, a: number, p: number, f = 0, anticipada = false): number {
    if (i === 0) {
        if (a === 0) throw new ErrorFinanciero("Con tasa cero, la anualidad no puede ser cero.");
        return -(p + f) / a;
    }
    const k = a * (1 + i * tipo(anticipada)) / i;
    const num = k - f, den = p + k;
    if (num / den <= 0) throw new ErrorFinanciero("No existe un número de periodos para estos valores (revise los signos).");
    return Math.log(num / den) / Math.log(1 + i);
}

/** TASA de Excel: Newton-Raphson con respaldo por bisección. */
export function tasa(n: number, a: number, p: number, f = 0, anticipada = false, estimado = 0.1): number {
    const g = (i: number) => {
        if (Math.abs(i) < 1e-12) return p + a * n + f;
        const q = Math.pow(1 + i, n);
        return p * q + a * (1 + i * tipo(anticipada)) * (q - 1) / i + f;
    };
    let i = estimado;
    for (let k = 0; k < 100; k++) {
        const y = g(i), h = Math.max(1e-7, Math.abs(i) * 1e-6), d = (g(i + h) - g(i - h)) / (2 * h);
        if (!isFinite(y) || !isFinite(d) || d === 0) break;
        const s = i - y / d;
        if (Math.abs(s - i) < 1e-12) return s;
        i = s <= -1 ? (i - 1) / 2 : s;
    }
    const r = biseccion(g, -0.9999, 10);
    if (r == null) throw new ErrorFinanciero("No se encontró una tasa que cumpla la ecuación (revise los signos de P, A y F).");
    return r;
}

export function biseccion(g: (x: number) => number, lo: number, hi: number, tol = 1e-12): number | null {
    let a = lo, b = hi, fa = g(a), fb = g(b);
    if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) {
        // busca un cambio de signo en una malla
        const pts = 400;
        let prev = lo, fprev = g(lo), hallado = false;
        for (let k = 1; k <= pts; k++) {
            const x = lo + (hi - lo) * k / pts, fx = g(x);
            if (isFinite(fprev) && isFinite(fx) && fprev * fx <= 0) { a = prev; b = x; fa = fprev; fb = fx; hallado = true; break; }
            prev = x; fprev = fx;
        }
        if (!hallado) return null;
    }
    for (let k = 0; k < 300; k++) {
        const c = (a + b) / 2, fc = g(c);
        if (Math.abs(fc) < tol || (b - a) / 2 < tol) return c;
        if (fa * fc < 0) { b = c; fb = fc; } else { a = c; fa = fc; }
    }
    return (a + b) / 2;
}

export type Variable = "P" | "F" | "A" | "n" | "i";

export interface EntradaTVM {
    P?: number | null; F?: number | null; A?: number | null; n?: number | null; i?: number | null;
    anticipada?: boolean;
}

/**
 * Resuelve la incógnita: exactamente una variable debe venir como `null` (el "?" de la hoja del profesor);
 * las que no vienen (`undefined`) se toman como cero.
 */
export function resolver(e: EntradaTVM): { incognita: Variable; valor: number; entrada: Required<Omit<EntradaTVM, "anticipada">> & { anticipada: boolean } } {
    const vars: Variable[] = ["P", "F", "A", "n", "i"];
    const faltan = vars.filter(v => e[v] === null);
    if (faltan.length !== 1) throw new ErrorFinanciero("Marque exactamente una incógnita (P, F, A, n o i).");
    const x = faltan[0];
    const v = (k: Variable) => (e[k] ?? 0) as number;
    const ant = !!e.anticipada;
    let valor: number;
    switch (x) {
        case "P": valor = va(v("i"), v("n"), v("A"), v("F"), ant); break;
        case "F": valor = vf(v("i"), v("n"), v("A"), v("P"), ant); break;
        case "A": valor = pago(v("i"), v("n"), v("P"), v("F"), ant); break;
        case "n": valor = nper(v("i"), v("A"), v("P"), v("F"), ant); break;
        case "i": valor = tasa(v("n"), v("A"), v("P"), v("F"), ant); break;
    }
    if (!isFinite(valor)) throw new ErrorFinanciero("El resultado no es un número finito; revise los datos.");
    const entrada = { P: v("P"), F: v("F"), A: v("A"), n: v("n"), i: v("i"), anticipada: ant };
    entrada[x] = valor;
    return { incognita: x, valor, entrada };
}

/** Hoja nCuotas del profesor: dos de (periodo inicial, periodo final, número de cuotas). */
export function nCuotas(e: { inicial?: number | null; final?: number | null; cuotas?: number | null }) {
    if (e.inicial == null && e.final != null && e.cuotas != null) return { inicial: e.final - e.cuotas + 1, final: e.final, cuotas: e.cuotas };
    if (e.final == null && e.inicial != null && e.cuotas != null) return { inicial: e.inicial, final: e.cuotas + e.inicial - 1, cuotas: e.cuotas };
    if (e.cuotas == null && e.inicial != null && e.final != null) return { inicial: e.inicial, final: e.final, cuotas: e.final - e.inicial + 1 };
    throw new ErrorFinanciero("Dé dos de los tres valores (periodo inicial, periodo final, número de cuotas).");
}
