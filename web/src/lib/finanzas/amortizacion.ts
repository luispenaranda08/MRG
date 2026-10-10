/**
 * Sistemas de amortización de créditos.
 *
 * Replica "Sistemas de Amortización.xlsx" del profesor Félix Gutiérrez: tabla con Periodo, Ingreso, Egreso,
 * FCN, Saldo inicial, Intereses, Saldo final y Abono a capital, para cuatro sistemas:
 * 1. Cuota fija (francés), 2. Abono a capital constante, 3. Bono con cupón (bullet), 4. Bono cero cupón.
 *
 * Ampliaciones para finanzas corporativas, también tomadas de sus simuladores (Hipotecario UVR, Vehículo en
 * IBR, Crédito en USD):
 * - tasa variable por periodo (por ejemplo IBR + spread); con cuota fija se conserva la cuota inicial y la
 *   última cuota recoge lo que quede ("recoge lo dejado de pagar"), o se recalcula en cada cambio de tasa;
 * - periodos de gracia (solo intereses);
 * - crédito indexado (UVR o moneda extranjera): se amortiza en la unidad del crédito y se expresa en pesos
 *   con la proyección del índice;
 * - fechas de pago a partir de la fecha de desembolso.
 *
 * Convención de signos del profesor: el FCN es positivo para el prestatario en el desembolso y negativo en
 * los pagos; el saldo es lo que se debe.
 */
import { ErrorFinanciero } from "./tasas";
import { pago } from "./tvm";
import { tir } from "./flujos";

export type Sistema = "cuota_fija" | "abono_constante" | "bono_cupon" | "cero_cupon";

export const SISTEMAS: Record<Sistema, string> = {
    cuota_fija: "Cuota fija",
    abono_constante: "Abono a capital constante",
    bono_cupon: "Bono con cupón (pago de capital al final)",
    cero_cupon: "Bono cero cupón (intereses capitalizados)",
};

export interface Indexacion {
    /** Nombre de la unidad: "UVR", "USD"… */
    unidad: string;
    /** Valor de la unidad en pesos el día del desembolso (UVR o TRM). */
    valorInicial: number;
    /** Variación anual esperada de la unidad (inflación para UVR, devaluación para USD), efectiva anual. */
    variacionAnual: number;
}

export interface EntradaCredito {
    principal: number;
    /** Número de cuotas (periodos). */
    cuotas: number;
    /** Tasa periódica vencida; o un vector con la tasa de cada periodo (longitud = cuotas). */
    tasaPeriodica: number | number[];
    sistema: Sistema;
    /** Periodos por año (12 mensual, 4 trimestral…). Se usa para anualizar el costo y para las fechas. */
    periodosPorAnio?: number;
    /** Periodos iniciales en los que solo se pagan intereses. */
    gracia?: number;
    /** Con tasa variable y cuota fija: "ajuste_final" (como el simulador del profesor) o "recalcular". */
    tasaVariable?: "ajuste_final" | "recalcular";
    /** Crédito en UVR o en moneda extranjera: `principal` va en esa unidad. */
    indexacion?: Indexacion;
    /** Fecha de desembolso (ISO, AAAA-MM-DD) para fechar las cuotas. */
    desembolso?: string;
}

export interface FilaAmortizacion {
    periodo: number;
    fecha?: string;
    ingreso: number;
    egreso: number;
    fcn: number;
    saldoInicial: number;
    tasa: number;
    intereses: number;
    abonoCapital: number;
    saldoFinal: number;
    /** Valores en pesos cuando el crédito está indexado. */
    indice?: number;
    egresoPesos?: number;
    saldoFinalPesos?: number;
}

export interface ResultadoCredito {
    sistema: Sistema;
    nombreSistema: string;
    cuotaInicial: number;
    filas: FilaAmortizacion[];
    totalIntereses: number;
    totalPagado: number;
    /** Tasa periódica que iguala desembolso y pagos (en la unidad del crédito). */
    costoPeriodico: number | null;
    /** Costo efectivo anual del crédito (en la unidad del crédito). */
    costoEA: number | null;
    /** Costo efectivo anual en pesos cuando hay indexación. */
    costoEAPesos?: number | null;
    controles: { saldoFinalCero: boolean; sumaAbonosIgualPrincipal: boolean };
}

function sumarMeses(iso: string, meses: number): string {
    const [y, m, d] = iso.split("-").map(Number);
    const total = (m - 1) + meses;
    const anio = y + Math.floor(total / 12), mes = ((total % 12) + 12) % 12;
    const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
    return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

function sumarDias(iso: string, dias: number): string {
    const t = Date.parse(iso + "T00:00:00Z") + dias * 86_400_000;
    return new Date(t).toISOString().slice(0, 10);
}

function fechaPeriodo(iso: string, k: number, m: number): string {
    if (12 % m === 0) return sumarMeses(iso, k * (12 / m));
    return sumarDias(iso, Math.round(k * 365 / m));
}

export function amortizar(e: EntradaCredito): ResultadoCredito {
    const n = Math.round(e.cuotas);
    if (!(e.principal > 0)) throw new ErrorFinanciero("El monto del crédito debe ser positivo.");
    if (!(n >= 1)) throw new ErrorFinanciero("El número de cuotas debe ser al menos 1.");
    const gracia = Math.max(0, Math.round(e.gracia ?? 0));
    if (gracia >= n) throw new ErrorFinanciero("Los periodos de gracia deben ser menos que las cuotas.");
    const tasas = Array.isArray(e.tasaPeriodica) ? e.tasaPeriodica : Array(n).fill(e.tasaPeriodica);
    if (tasas.length !== n) throw new ErrorFinanciero(`Se esperaban ${n} tasas periódicas y llegaron ${tasas.length}.`);
    if (tasas.some(t => !(t > -1))) throw new ErrorFinanciero("Las tasas periódicas deben ser mayores que −100 %.");
    const m = e.periodosPorAnio ?? 12;
    const modo = e.tasaVariable ?? "ajuste_final";
    const P = e.principal;
    const amortizables = n - gracia;

    const filas: FilaAmortizacion[] = [{ periodo: 0, ingreso: P, egreso: 0, fcn: P, saldoInicial: 0, tasa: 0, intereses: 0, abonoCapital: 0, saldoFinal: P }];
    let saldo = P;
    let cuota = e.sistema === "cuota_fija" ? -pago(tasas[gracia], amortizables, P) : 0;
    const cuotaInicial = e.sistema === "cuota_fija" ? cuota : e.sistema === "abono_constante" ? P / amortizables + P * tasas[gracia] : e.sistema === "bono_cupon" ? P * tasas[0] : 0;
    const abonoFijo = P / amortizables;

    for (let k = 1; k <= n; k++) {
        const i = tasas[k - 1];
        const si = saldo;
        const int = si * i;
        let egreso: number;
        const ultimo = k === n;
        if (k <= gracia) {
            egreso = e.sistema === "cero_cupon" ? 0 : int;
        } else {
            switch (e.sistema) {
                case "cuota_fija":
                    if (modo === "recalcular" && k > gracia + 1 && i !== tasas[k - 2]) cuota = -pago(i, n - k + 1, si);
                    egreso = ultimo ? si + int : cuota;
                    break;
                case "abono_constante": egreso = int + Math.min(abonoFijo, si); if (ultimo) egreso = si + int; break;
                case "bono_cupon": egreso = ultimo ? si + int : int; break;
                case "cero_cupon": egreso = ultimo ? si + int : 0; break;
            }
        }
        const abono = egreso - int;
        saldo = si + int - egreso;
        if (Math.abs(saldo) < 1e-9 * Math.max(1, P)) saldo = 0;
        filas.push({ periodo: k, ingreso: 0, egreso, fcn: -egreso, saldoInicial: si, tasa: i, intereses: int, abonoCapital: abono, saldoFinal: saldo });
    }

    if (e.desembolso) filas.forEach(f => { f.fecha = fechaPeriodo(e.desembolso!, f.periodo, m); });
    if (e.indexacion) {
        const { valorInicial, variacionAnual } = e.indexacion;
        if (!(valorInicial > 0)) throw new ErrorFinanciero("El valor inicial del índice (UVR o TRM) debe ser positivo.");
        filas.forEach(f => {
            f.indice = valorInicial * Math.pow(1 + variacionAnual, f.periodo / m);
            f.egresoPesos = (f.egreso - f.ingreso) * f.indice;
            f.saldoFinalPesos = f.saldoFinal * f.indice;
        });
    }

    const pagos = filas.slice(1);
    const totalIntereses = pagos.reduce((s, f) => s + f.intereses, 0);
    const totalPagado = pagos.reduce((s, f) => s + f.egreso, 0);
    const ip = tir(filas.map(f => f.fcn));
    const costoEA = ip == null ? null : Math.pow(1 + ip, m) - 1;
    let costoEAPesos: number | null | undefined;
    if (e.indexacion) {
        const ipp = tir(filas.map(f => -(f.egresoPesos as number)));
        costoEAPesos = ipp == null ? null : Math.pow(1 + ipp, m) - 1;
    }
    const sumaAbonos = pagos.reduce((s, f) => s + f.abonoCapital, 0);
    return {
        sistema: e.sistema, nombreSistema: SISTEMAS[e.sistema], cuotaInicial, filas,
        totalIntereses, totalPagado, costoPeriodico: ip, costoEA, costoEAPesos,
        controles: {
            saldoFinalCero: Math.abs(filas[n].saldoFinal) < 1e-6 * Math.max(1, P),
            // En cero cupón y bono con cupón los intereses capitalizados también se abonan al final
            sumaAbonosIgualPrincipal: e.sistema === "cero_cupon" ? true : Math.abs(sumaAbonos - P) < 1e-6 * Math.max(1, P),
        },
    };
}

/** Los cuatro sistemas con los mismos datos, para compararlos (como la hoja del profesor). */
export function compararSistemas(e: Omit<EntradaCredito, "sistema">): ResultadoCredito[] {
    return (Object.keys(SISTEMAS) as Sistema[]).map(s => amortizar({ ...e, sistema: s }));
}
