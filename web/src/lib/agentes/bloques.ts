/* eslint-disable @typescript-eslint/no-explicit-any -- el motor DX es JavaScript portado sin tipos (ver dx/engine.ts). */
/**
 * Implementación de los bloques. Cada función recibe las entradas ya resueltas por el ejecutor y devuelve cifras
 * crudas por id de salida (el ejecutor les pone formato, unidad y origen). Ningún bloque inventa un dato: si falta
 * algo que la metodología necesita, lanza ErrorBloque y la ejecución se detiene en ese paso.
 */
import * as F from "../finanzas";
import { numero, type Datos } from "../api";
import { runModel, M, dq } from "../dx/engine";
import { defaultsFor } from "../dx/defaults";
import type { EmpresaPreparada } from "./tipos";

export class ErrorBloque extends Error { }

export interface Salidas {
    cifras: Record<string, number | string | null>;
    tablas?: Record<string, { columnas: { id: string; etiqueta: string; fmt: "pct" | "pp" | "x" | "num" | "bn" | "txt" }[]; filas: Record<string, number | string | null>[] }>;
    alertas?: string[];
    /** Unidad del dinero de la empresa ("COP millones"), para las salidas con unidad "empresa". */
    unidad?: string;
    corte?: string;
}

type Impl = (e: Record<string, any>, datos: Datos) => Salidas;

const fin = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : v);
const req = (v: unknown, nombre: string): number => {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new ErrorBloque(`Falta ${nombre}.`);
    return v;
};
const pctAFrac = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : v / 100);

/* ------------------------------ Datos de mercado ------------------------------ */

const MERCADO: Impl = (_e, d) => {
    const p = d.parametros, n = (k: keyof typeof p) => numero(p[k]);
    return { cifras: { rf_usd: n("rf_usd"), erp: n("erp_maduro"), crp: n("crp"), crp_damodaran: n("crp_damodaran"), spread_soberano: n("spread_soberano"), lambda: n("lambda"), inflacion_cop: n("inflacion_cop"), inflacion_usd: n("inflacion_usd"), tasa_impuesto: n("tasa_impuesto") }, corte: d.meta.corte };
};

const INDICADORES: Impl = (_e, d) => {
    const i = d.indicadores ?? {}, n = (k: string) => (i[k] ? numero(i[k]) : null);
    const cortes = Object.values(i).map(x => x.corte).filter(Boolean).sort();
    return { cifras: { trm: n("trm"), tasa_politica: n("tasa_politica"), ibr_overnight: n("ibr_overnight"), ibr_1m: n("ibr_1m"), ibr_3m: n("ibr_3m"), ibr_6m: n("ibr_6m") }, corte: cortes[cortes.length - 1] ?? d.meta.corte };
};

function sectorDe(d: Datos, v: unknown) {
    const i = Number(v);
    const s = Number.isInteger(i) ? d.sectores[i] : undefined;
    if (!s) throw new ErrorBloque("Elija un sector CIIU.");
    return s;
}

const SECTOR: Impl = (e, d) => {
    const emp = e.empresa && (e.empresa as EmpresaPreparada).tipo === "empresa" ? e.empresa as EmpresaPreparada : null;
    if (emp) { e = { ...e, sector: emp.sector, tamano: emp.tamano }; }
    const s = sectorDe(d, e.sector), t = e.tamano && s.por_tamano[e.tamano] ? s.por_tamano[e.tamano] : null;
    const kd = (t && numero(t.kd)) ?? numero(s.kd);
    return {
        cifras: { nombre: `${s.ciiu_division} · ${s.nombre}`, empresas: numero(s.empresas), pct_con_deuda: numero(s.pct_con_deuda), beta_u: numero(s.beta_desapalancada), de: numero(s.de), beta_l: numero(s.beta_apalancada), ke: numero(s.ke), kd, wacc_cop: numero(s.wacc_cop_nominal), wacc_usd: numero(s.wacc_usd_nominal), wacc_cop_real: numero(s.wacc_cop_real) },
        alertas: e.tamano && !t ? [`El sector no publica Kd para el tamaño «${e.tamano}»; se usa el Kd del sector.`] : [],
        corte: d.meta.corte,
    };
};

/* ------------------------------ Costo de capital ------------------------------ */

const fisher = (rUsd: number, piCop: number, piUsd: number) => (1 + rUsd) * (1 + piCop) / (1 + piUsd) - 1;
const desFisher = (rCop: number, piCop: number, piUsd: number) => (1 + rCop) * (1 + piUsd) / (1 + piCop) - 1;

function wacc(bu: number, de: number, t: number, rf: number, erp: number, crp: number, kd: number, piCop: number, piUsd: number, prima = 0) {
    const bl = bu * (1 + (1 - t) * de), keUsd = rf + bl * erp + crp + prima, ke = fisher(keUsd, piCop, piUsd), wd = de / (1 + de), we = 1 - wd;
    const w = we * ke + wd * kd * (1 - t);
    return { bl, keUsd, ke, wd, we, kdDt: kd * (1 - t), w, wUsd: desFisher(w, piCop, piUsd), wReal: (1 + w) / (1 + piCop) - 1 };
}

const WACC: Impl = e => {
    const bu = req(e.beta_u, "la beta desapalancada"), de = req(e.de, "el D/E objetivo"), t = req(e.tasa_impuesto, "la tarifa de renta"), rf = req(e.rf, "la tasa libre de riesgo");
    const erp = req(e.erp, "la prima de mercado"), crp = req(e.crp, "la prima de riesgo país"), kd = req(e.kd, "el Kd"), pc = req(e.inflacion_cop, "la inflación COP"), pu = req(e.inflacion_usd, "la inflación USD"), prima = typeof e.prima_tamano === "number" ? e.prima_tamano : 0;
    if (de < 0) throw new ErrorBloque("El D/E no puede ser negativo.");
    const r = wacc(bu, de, t, rf, erp, crp, kd, pc, pu, prima);
    const filasDe = Array.from({ length: 11 }, (_, i) => i * 0.2).map(x => { const q = wacc(bu, x, t, rf, erp, crp, kd, pc, pu, prima); return { de: x, beta_l: q.bl, ke: q.ke, wacc: q.w }; });
    const filasCrp = [-0.01, -0.005, 0, 0.005, 0.01].map(dx => { const q = wacc(bu, de, t, rf, erp, Math.max(0, crp + dx), kd, pc, pu, prima); return { crp: Math.max(0, crp + dx), ke: q.ke, wacc: q.w }; });
    return {
        cifras: { beta_l: r.bl, ke_usd: r.keUsd, ke: r.ke, kd_dt: r.kdDt, peso_deuda: r.wd, peso_patrimonio: r.we, wacc_cop: r.w, wacc_usd: r.wUsd, wacc_cop_real: r.wReal },
        tablas: {
            sens_de: { columnas: [{ id: "de", etiqueta: "D/E", fmt: "x" }, { id: "beta_l", etiqueta: "Beta apalancada", fmt: "x" }, { id: "ke", etiqueta: "Ke COP", fmt: "pct" }, { id: "wacc", etiqueta: "WACC COP", fmt: "pct" }], filas: filasDe },
            sens_crp: { columnas: [{ id: "crp", etiqueta: "Prima país", fmt: "pct" }, { id: "ke", etiqueta: "Ke COP", fmt: "pct" }, { id: "wacc", etiqueta: "WACC COP", fmt: "pct" }], filas: filasCrp },
        },
    };
};

/* ------------------------------ Tasas y valor del dinero ------------------------------ */

const TASA: Impl = e => {
    const t = req(e.tasa, "la tasa"), desde = String(e.desde || ""), hacia = String(e.hacia || "");
    const eq = F.equivalencias(t, desde);
    return {
        cifras: { tasa: F.convertir(t, desde, hacia), ea: eq.ea },
        tablas: { equivalencias: { columnas: [{ id: "frecuencia", etiqueta: "Frecuencia", fmt: "txt" }, { id: "periodica", etiqueta: "Periódica vencida", fmt: "pct" }, { id: "nominal_vencida", etiqueta: "Nominal vencida", fmt: "pct" }, { id: "nominal_anticipada", etiqueta: "Nominal anticipada", fmt: "pct" }], filas: eq.tabla.map(x => ({ frecuencia: x.frecuencia, periodica: x.periodica.tasa, nominal_vencida: x.nominalVencida.tasa, nominal_anticipada: x.nominalAnticipada.tasa })) } },
    };
};

const REAL: Impl = e => {
    const n = req(e.nominal, "la tasa nominal"), pi = req(e.inflacion, "la inflación"), dv = typeof e.devaluacion === "number" ? e.devaluacion : 0;
    return { cifras: { real: F.real(n, pi), otra_moneda: F.enOtraMoneda(n, dv) } };
};

const TVM: Impl = e => {
    const val = (k: string) => (typeof e[k] === "number" && Number.isFinite(e[k]) ? e[k] : null);
    const entrada = { P: val("P"), F: val("F"), A: val("A"), n: val("n"), i: val("i"), anticipada: !!e.anticipada };
    const vacias = (["P", "F", "A", "n", "i"] as const).filter(k => entrada[k] === null);
    if (vacias.length !== 1) throw new ErrorBloque("Deje vacía exactamente una de P, F, A, n o i.");
    const base: F.EntradaTVM = { anticipada: entrada.anticipada };
    for (const k of ["P", "F", "A", "n", "i"] as const) base[k] = entrada[k] === null ? null : entrada[k];
    const r = F.resolver(base);
    return { cifras: { incognita: r.incognita, valor: r.valor, tasa: r.incognita === "i" ? r.valor : null } };
};

const DPP: Impl = e => {
    const d = req(e.descuento, "el descuento"), dd = req(e.dias_descuento, "los días del descuento"), dp = req(e.dias_plazo, "el plazo");
    if (dp <= dd) throw new ErrorBloque("El plazo total debe ser mayor que los días del descuento.");
    if (d <= 0 || d >= 1) throw new ErrorBloque("El descuento debe estar entre 0 % y 100 %.");
    const periodo = d / (1 - d), dias = dp - dd;
    return { cifras: { costo_periodo: periodo, costo_ea: Math.pow(1 + periodo, 365 / dias) - 1, dias_financiados: dias } };
};

const FACTORING: Impl = e => {
    const v = req(e.valor, "el valor de la factura"), i = req(e.tasa_descuento, "la tasa de descuento"), c = typeof e.comision === "number" ? e.comision : 0, dias = req(e.dias, "los días anticipados");
    if (dias <= 0) throw new ErrorBloque("Los días anticipados deben ser positivos.");
    const descuento = v * (1 - Math.pow(1 + i, -dias / 30)), desembolso = v - descuento - v * c;
    if (desembolso <= 0) throw new ErrorBloque("El descuento y la comisión superan el valor de la factura.");
    return { cifras: { desembolso, costo_total: v - desembolso, costo_ea: Math.pow(v / desembolso, 365 / dias) - 1 } };
};

/* ------------------------------ Créditos ------------------------------ */

function credito(e: Record<string, any>) {
    const principal = req(e.principal, "el monto"), anios = req(e.plazo_anios, "el plazo"), tea = req(e.tasa_ea, "la tasa"), m = Number(e.periodos_por_anio || 12);
    if (![1, 2, 3, 4, 6, 12].includes(m)) throw new ErrorBloque("Los pagos por año deben ser 1, 2, 3, 4, 6 o 12.");
    const cuotas = Math.round(anios * m);
    if (cuotas < 1) throw new ErrorBloque("El plazo es demasiado corto para la frecuencia elegida.");
    return { principal, cuotas, m, tasaPeriodica: Math.pow(1 + tea, 1 / m) - 1 };
}

const AMORT: Impl = e => {
    const c = credito(e), sistema = (e.sistema || "cuota_fija") as F.Sistema, gracia = Math.max(0, Math.round(Number(e.gracia) || 0));
    const r = F.amortizar({ principal: c.principal, cuotas: c.cuotas, tasaPeriodica: c.tasaPeriodica, sistema, periodosPorAnio: c.m, gracia });
    const pagos = r.filas.filter(f => f.periodo >= 1);
    const servicio = pagos.filter(f => f.periodo <= c.m).reduce((s, f) => s + f.egreso, 0);
    const comisiones = typeof e.comisiones === "number" && e.comisiones > 0 ? e.comisiones : 0, neto = c.principal - comisiones;
    if (neto <= 0) throw new ErrorBloque("Las comisiones no pueden igualar o superar el monto.");
    const iNeto = comisiones ? F.tir([neto, ...pagos.map(f => -f.egreso)]) : null;
    return {
        cifras: { cuota: r.cuotaInicial, servicio_anio1: servicio, total_intereses: r.totalIntereses, total_pagado: r.totalPagado, costo_ea: fin(r.costoEA), costo_ea_comisiones: comisiones ? (iNeto == null ? null : Math.pow(1 + iNeto, c.m) - 1) : fin(r.costoEA), desembolso_neto: neto, cuotas: c.cuotas },
        tablas: { tabla: { columnas: [{ id: "periodo", etiqueta: "Periodo", fmt: "num" }, { id: "saldo_inicial", etiqueta: "Saldo inicial", fmt: "num" }, { id: "intereses", etiqueta: "Intereses", fmt: "num" }, { id: "abono", etiqueta: "Abono a capital", fmt: "num" }, { id: "cuota", etiqueta: "Cuota", fmt: "num" }, { id: "saldo_final", etiqueta: "Saldo final", fmt: "num" }], filas: pagos.map(f => ({ periodo: f.periodo, saldo_inicial: f.saldoInicial, intereses: f.intereses, abono: f.abonoCapital, cuota: f.egreso, saldo_final: f.saldoFinal })) } },
        alertas: r.controles.saldoFinalCero ? [] : ["El saldo final de la tabla no llega a cero."],
    };
};

const COMPARAR: Impl = e => {
    const c = credito(e), lista = F.compararSistemas({ principal: c.principal, cuotas: c.cuotas, tasaPeriodica: c.tasaPeriodica, periodosPorAnio: c.m });
    const menor = lista.reduce((a, b) => (b.totalIntereses < a.totalIntereses ? b : a));
    const por = (s: F.Sistema) => lista.find(x => x.sistema === s)?.totalIntereses ?? null;
    return {
        cifras: { menor_interes: menor.nombreSistema, intereses_cuota_fija: por("cuota_fija"), intereses_abono_constante: por("abono_constante") },
        tablas: { sistemas: { columnas: [{ id: "sistema", etiqueta: "Sistema", fmt: "txt" }, { id: "primera", etiqueta: "Primera cuota", fmt: "num" }, { id: "intereses", etiqueta: "Total intereses", fmt: "num" }, { id: "pagado", etiqueta: "Total pagado", fmt: "num" }, { id: "costo", etiqueta: "Costo EA", fmt: "pct" }], filas: lista.map(x => ({ sistema: x.nombreSistema, primera: x.cuotaInicial, intereses: x.totalIntereses, pagado: x.totalPagado, costo: fin(x.costoEA) })) } },
    };
};

const CAP: Impl = e => {
    const flujo = req(e.flujo, "el flujo disponible"), actual = typeof e.servicio_actual === "number" ? e.servicio_actual : 0, nuevo = typeof e.servicio_nuevo === "number" ? e.servicio_nuevo : 0, min = typeof e.dscr_minimo === "number" ? e.dscr_minimo : 1.3;
    if (min <= 0) throw new ErrorBloque("El DSCR mínimo debe ser positivo.");
    const total = actual + nuevo, alertas: string[] = [];
    if (total <= 0) alertas.push("Sin servicio de deuda: el DSCR no aplica.");
    if (flujo > 0 && nuevo > 50 * flujo) alertas.push("Revise la unidad del monto: el servicio de la deuda nueva supera 50 veces el flujo disponible. Escriba el monto completo en la moneda de los estados (800000000 = 800 millones).");
    return { cifras: { dscr: total > 0 ? flujo / total : null, servicio_total: total, holgura: flujo - total * min, servicio_maximo_nuevo: flujo / min - actual }, alertas };
};

const CUPO: Impl = e => {
    const s = req(e.servicio_maximo, "el servicio máximo"), i = req(e.tasa_ea, "la tasa"), n = req(e.plazo_anios, "el plazo");
    if (s <= 0) return { cifras: { cupo: 0 }, alertas: ["El flujo no alcanza para servir deuda nueva con el DSCR exigido."] };
    return { cifras: { cupo: F.va(i, Math.round(n), -s) } };
};

/* ------------------------------ Proyectos ------------------------------ */

function flujos(v: unknown, nombre: string): number[] {
    if (!Array.isArray(v) || v.length < 2 || v.some(x => typeof x !== "number" || !Number.isFinite(x))) throw new ErrorBloque(`Faltan ${nombre} (al menos dos periodos).`);
    return v as number[];
}

const FLU: Impl = e => {
    const f = flujos(e.flujos, "los flujos"), k = req(e.k, "la tasa de descuento");
    const r = F.indicadores(f, k, { kReinversion: typeof e.k_reinversion === "number" ? e.k_reinversion : undefined });
    const perfil = F.perfilVPN(f, 0, Math.max(0.3, k * 2), 20);
    return {
        cifras: { vpn: fin(r.vpn), tir: fin(r.tir), tirm: fin(r.tirm), ir: fin(r.indiceRentabilidad), vae: fin(r.vae), recuperacion: fin(r.recuperacion), recuperacion_descontada: fin(r.recuperacionDescontada) },
        tablas: { perfil: { columnas: [{ id: "tasa", etiqueta: "Tasa", fmt: "pct" }, { id: "vpn", etiqueta: "VPN", fmt: "num" }], filas: perfil.map(p => ({ tasa: fin(p.k), vpn: fin(p.vpn) })) } },
        alertas: r.tirMultiple ? ["El flujo cambia de signo más de una vez: puede haber varias TIR; use la TIRM."] : [],
    };
};

const CRUCE: Impl = e => {
    const a = flujos(e.flujos_a, "los flujos de A"), b = flujos(e.flujos_b, "los flujos de B"), k = req(e.k, "la tasa de descuento");
    const va_ = F.vpn(k, a), vb = F.vpn(k, b);
    return { cifras: { vpn_a: va_, vpn_b: vb, tasa_cruce: fin(F.tasaCruce(a, b)), preferido: va_ === vb ? "Indiferente" : va_ > vb ? "Proyecto A" : "Proyecto B" } };
};

const PROYECTO: Impl = e => {
    const deudaP = typeof e.deuda_proporcion === "number" ? e.deuda_proporcion : 0;
    const r = F.modeloProyecto({
        horizonte: req(e.horizonte, "el horizonte"), ventas: req(e.ventas, "las ventas"), crecimiento: typeof e.crecimiento === "number" ? e.crecimiento : 0,
        costoVentas: req(e.costo_ventas, "el costo de ventas"), gastosAdmonVentas: req(e.gastos, "los gastos"),
        activos: [{ nombre: "Activos fijos", valor: req(e.inversion, "la inversión"), vidaUtil: Number(e.vida_util) || 10 }],
        ktnoSobreVentas: typeof e.ktno === "number" ? e.ktno : 0.1, tasaImpuesto: typeof e.tasa_impuesto === "number" ? e.tasa_impuesto : 0.35,
        deuda: deudaP > 0 ? [{ nombre: "Deuda", proporcion: deudaP, tasaEA: req(e.deuda_tasa, "la tasa de la deuda"), plazo: Number(e.deuda_plazo) || 5, sistema: "cuota_fija" }] : [],
        tmrr: req(e.tmrr, "la rentabilidad mínima"),
    });
    const p = r.evaluaciones.proyectoConFinanciacion, inv = r.evaluaciones.inversionistaConFinanciacion;
    return {
        cifras: { inversion_inicial: r.inversionInicial, costo_capital: r.costoCapital, vpn: fin(p.vpn), tir: fin(p.tir), vpn_inversionista: fin(inv.vpn), tir_inversionista: fin(inv.tir), recuperacion: fin(p.recuperacion) },
        tablas: { flujo: { columnas: [{ id: "anio", etiqueta: "Año", fmt: "num" }, { id: "ventas", etiqueta: "Ventas", fmt: "num" }, { id: "uodi", etiqueta: "UODI", fmt: "num" }, { id: "fcl", etiqueta: "FCL del proyecto", fmt: "num" }, { id: "fcl_inv", etiqueta: "FCL del inversionista", fmt: "num" }], filas: r.anios.map(a => ({ anio: a.anio, ventas: a.ventas, uodi: a.uodi, fcl: a.fclProyecto, fcl_inv: a.fclInversionista })) } },
        alertas: [r.controles.proporcionesValidas ? "" : "Las proporciones de financiación no suman un valor válido.", r.controles.deudaPagada ? "" : "La deuda no queda pagada dentro del horizonte."].filter(Boolean),
    };
};

/* ------------------------------ Empresa (motor DX) ------------------------------ */

function empresaDe(v: unknown): EmpresaPreparada {
    const emp = v as EmpresaPreparada;
    if (!emp || emp.tipo !== "empresa" || !emp.interno) throw new ErrorBloque("Cargue los estados financieros de la empresa.");
    return emp;
}

const MODELOS = new WeakMap<object, Map<string, any>>();
/** runModel con los supuestos por defecto de Mirage; se memoriza por empresa y ajustes. */
function modelo(emp: EmpresaPreparada, d: Datos, ajustes: Record<string, unknown> = {}) {
    let porEmpresa = MODELOS.get(emp.interno);
    if (!porEmpresa) { porEmpresa = new Map(); MODELOS.set(emp.interno, porEmpresa); }
    const clave = JSON.stringify([emp.sector, emp.tamano, d.meta.corte, ajustes]);
    if (!porEmpresa.has(clave)) {
        const s = { ...defaultsFor(emp.interno, d, emp.sector, emp.tamano), ...ajustes };
        porEmpresa.set(clave, { R: runModel(emp.interno, s, d), s });
    }
    return porEmpresa.get(clave)!;
}

const ebitdaDe = (m: any) => fin(m.ebitda ?? (m.da != null ? m.ebit + m.da : null));

const conEmpresa = (fn: (emp: EmpresaPreparada, R: any, d: Datos, e: Record<string, any>, s: any) => Omit<Salidas, "unidad">): Impl => (e, d) => {
    const emp = empresaDe(e.empresa), { R, s } = modelo(emp, d, ajustesDe(e));
    const r = fn(emp, R, d, e, s);
    return { ...r, unidad: emp.interno.unit, corte: d.meta.corte, alertas: [...(r.alertas ?? [])] };
};

function ajustesDe(e: Record<string, any>) {
    const a: Record<string, unknown> = {};
    if (typeof e.gastos_fijos === "number") a.fixed = e.gastos_fijos * 100;
    if (typeof e.financiacion === "number") a.finNeed = e.financiacion;
    if (typeof e.tasa_deuda === "number") a.finRate = e.tasa_deuda * 100;
    return a;
}

const anios = (emp: EmpresaPreparada) => emp.interno.years as number[];
const serie = (emp: EmpresaPreparada, fn: (m: any, i: number) => Record<string, number | string | null>) => anios(emp).map((y, i) => ({ anio: y, ...fn(M(emp.interno, i), i) }));

const DQ: Impl = conEmpresa(emp => {
    const lista = dq(emp.interno).list as { sev: string; title: string; msg: string }[];
    const cuadre = lista.find(x => x.title === "Cuadre contable"), ok = cuadre ? Number((cuadre.msg.match(/en (\d+) de/) ?? [])[1]) : null;
    const altos = lista.filter(x => x.sev === "alta").length, medios = lista.filter(x => x.sev === "media").length;
    return {
        cifras: { anios_cuadrados: ok, anios: anios(emp).length, hallazgos_altos: altos, hallazgos_medios: medios, veredicto: altos ? "Revisar antes de usar" : medios ? "Usable con salvedades" : "Sin hallazgos" },
        tablas: { hallazgos: { columnas: [{ id: "severidad", etiqueta: "Severidad", fmt: "txt" }, { id: "control", etiqueta: "Control", fmt: "txt" }, { id: "detalle", etiqueta: "Detalle", fmt: "txt" }], filas: lista.map(x => ({ severidad: x.sev, control: x.title, detalle: x.msg })) } },
    };
});

const VH: Impl = conEmpresa(emp => {
    const c = emp.interno, n = c.years.length, k = n - 1;
    const tabla = (filas: any[], base: (i: number) => number) => filas.filter(r => r.t !== "hdr" && Array.isArray(r.v)).map(r => {
        const fila: Record<string, number | string | null> = { cuenta: r.l };
        c.years.forEach((y: number, i: number) => { fila[`v${y}`] = fin(r.v[i]); fila[`p${y}`] = fin(base(i) ? r.v[i] / base(i) : null); });
        fila.variacion = n > 1 && r.v[k - 1] ? fin(r.v[k] / r.v[k - 1] - 1) : null;
        return fila;
    });
    const col = (pref: string, et: string, fmt: "num" | "pct") => c.years.map((y: number) => ({ id: `${pref}${y}`, etiqueta: `${et} ${y}`, fmt }));
    const columnas = [{ id: "cuenta", etiqueta: "Cuenta", fmt: "txt" as const }, ...col("v", "Valor", "num"), ...col("p", "Peso", "pct"), { id: "variacion", etiqueta: "Variación último año", fmt: "pct" as const }];
    const bal = tabla(c.bal, i => M(c, i).ta), pyg = tabla(c.pyg, i => M(c, i).rev);
    const relevantes = [...bal, ...pyg].filter(f => Math.abs(Number(f[`p${c.years[k]}`]) || 0) >= 0.05 && f.variacion != null);
    const mayor = relevantes.sort((a, b) => Math.abs(Number(b.variacion)) - Math.abs(Number(a.variacion)))[0];
    const m = M(c, k), m0 = n > 1 ? M(c, k - 1) : null;
    return {
        cifras: { mayor_variacion: mayor ? String(mayor.cuenta) : null, variacion_ingresos: m0 ? fin(m.rev / m0.rev - 1) : null, variacion_activo: m0 ? fin(m.ta / m0.ta - 1) : null },
        tablas: { balance: { columnas, filas: bal }, resultados: { columnas, filas: pyg } },
    };
});

const RAT: Impl = conEmpresa((emp, R) => {
    const c = emp.interno, k = c.years.length - 1, m = R.m, m0 = k > 0 ? M(c, k - 1) : null;
    // Sin depreciación ni EBITDA en el archivo, el EBIT es una aproximación conservadora (el DSCR sale más bajo, no más alto).
    const sinDA = ebitdaDe(m) == null && Number.isFinite(m.ebit), ebitda = sinDA ? fin(m.ebit) : ebitdaDe(m);
    return {
        cifras: {
            anio: String(c.years[k]), ingresos: fin(m.rev), ebitda, ebit: fin(m.ebit), utilidad_neta: fin(m.ni), activo: fin(m.ta), deuda: fin(m.debt), patrimonio: fin(m.eq), intereses: fin(m.intr), impuestos: fin(m.tax),
            flujo_deuda: ebitda != null ? ebitda - Math.max(0, m.tax || 0) : null, crecimiento_ingresos: m0 ? fin(m.rev / m0.rev - 1) : null,
            margen_bruto: fin(m.gm), margen_ebit: fin(m.em), margen_neto: fin(m.nm), roe: fin(m.roe), roa: fin(m.roa), roic: fin(m.roic), razon_corriente: fin(m.cr), prueba_acida: fin(m.quick), de: fin(m.de), endeudamiento: fin(m.la), cobertura: fin(m.cov), deuda_neta_ebitda: ebitda ? fin((m.debt - (m.cash || 0) - (m.sti || 0)) / ebitda) : null, rotacion_activos: fin(m.at),
        },
        tablas: { serie: { columnas: [{ id: "anio", etiqueta: "Año", fmt: "num" }, { id: "ingresos", etiqueta: "Ingresos", fmt: "num" }, { id: "margen_ebit", etiqueta: "Margen EBIT", fmt: "pct" }, { id: "margen_neto", etiqueta: "Margen neto", fmt: "pct" }, { id: "roe", etiqueta: "ROE", fmt: "pct" }, { id: "razon_corriente", etiqueta: "Razón corriente", fmt: "x" }, { id: "de", etiqueta: "D/E", fmt: "x" }, { id: "cobertura", etiqueta: "Cobertura", fmt: "x" }], filas: serie(emp, q => ({ ingresos: fin(q.rev), margen_ebit: fin(q.em), margen_neto: fin(q.nm), roe: fin(q.roe), razon_corriente: fin(q.cr), de: fin(q.de), cobertura: fin(q.cov) })) } },
        alertas: [...(R.alertas ?? []).map((a: { msg: string }) => a.msg), ...(sinDA ? ["El archivo no trae depreciación ni EBITDA: se usa el EBIT como aproximación conservadora del EBITDA."] : [])],
    };
});

const dupont = (q: any) => ({ roe: fin(q.roe), margen_neto: fin(q.nm), rotacion: fin(q.at), multiplicador: fin(q.mult), carga_tributaria: fin(q.ebt ? q.ni / q.ebt : null), carga_intereses: fin(q.ebit ? q.ebt / q.ebit : null), margen_ebit: fin(q.em) });
const DUPONT: Impl = conEmpresa((emp, R) => ({
    cifras: dupont(R.m),
    tablas: { serie: { columnas: [{ id: "anio", etiqueta: "Año", fmt: "num" }, { id: "roe", etiqueta: "ROE", fmt: "pct" }, { id: "margen_neto", etiqueta: "Margen neto", fmt: "pct" }, { id: "rotacion", etiqueta: "Rotación", fmt: "x" }, { id: "multiplicador", etiqueta: "Multiplicador", fmt: "x" }, { id: "carga_tributaria", etiqueta: "UN/UAI", fmt: "pct" }, { id: "carga_intereses", etiqueta: "UAI/EBIT", fmt: "pct" }], filas: serie(emp, dupont) } },
}));

const ciclo = (q: any) => ({ ktno: fin(q.ktno), ktno_ventas: fin(q.ktno / q.rev), dso: fin(q.dso), dio: fin(q.dio), dpo: fin(q.dpo), ciclo: fin((q.dso || 0) + (q.dio || 0) - (q.dpo || 0)) });
const CT: Impl = conEmpresa((emp, R) => ({
    cifras: ciclo(R.m),
    tablas: { serie: { columnas: [{ id: "anio", etiqueta: "Año", fmt: "num" }, { id: "ktno", etiqueta: "KTNO", fmt: "num" }, { id: "dso", etiqueta: "Días cartera", fmt: "num" }, { id: "dio", etiqueta: "Días inventario", fmt: "num" }, { id: "dpo", etiqueta: "Días proveedores", fmt: "num" }, { id: "ciclo", etiqueta: "Ciclo", fmt: "num" }], filas: serie(emp, ciclo) } },
}));

const FCL: Impl = conEmpresa((_emp, R) => {
    const H = R.H as any[], ult = H[H.length - 1], conFcl = H.filter(h => h.fcl != null);
    if (!conFcl.length) throw new ErrorBloque("Se necesitan al menos dos años para calcular el flujo de caja libre.");
    return {
        cifras: { fcl: fin(ult.fcl), uodi: fin(ult.uodi), capex: fin(ult.capex), inversion_ktno: fin(ult.dk), fcl_acumulado: conFcl.reduce((s, h) => s + h.fcl, 0) },
        tablas: { serie: { columnas: [{ id: "anio", etiqueta: "Año", fmt: "num" }, { id: "uodi", etiqueta: "UODI", fmt: "num" }, { id: "da", etiqueta: "D&A", fmt: "num" }, { id: "dk", etiqueta: "Inversión KTNO", fmt: "num" }, { id: "capex", etiqueta: "CAPEX", fmt: "num" }, { id: "fcl", etiqueta: "FCL", fmt: "num" }], filas: H.map(h => ({ anio: h.y, uodi: fin(h.uodi), da: fin(h.da), dk: fin(h.dk), capex: fin(h.capex), fcl: fin(h.fcl) })) } },
    };
});

const WACCE: Impl = conEmpresa((_emp, R) => ({
    cifras: { beta_l: fin(R.bl), de: fin(R.de), ke: pctAFrac(R.ke), kd: pctAFrac(R.kd), peso_deuda: fin(R.wD), wacc: fin(R.w), wacc_sector: pctAFrac(R.sW), rating_cobertura: R.rt?.[1] ?? null },
    tablas: { curva: { columnas: [{ id: "de", etiqueta: "D/E", fmt: "x" }, { id: "wacc", etiqueta: "WACC", fmt: "pct" }], filas: (R.curve as [number, number][]).filter((_, i) => i % 4 === 0).map(([de, w]) => ({ de, wacc: w / 100 })) } },
    alertas: (R.alertas ?? []).filter((a: { sev: string }) => a.sev !== "info").map((a: { msg: string }) => a.msg),
}));

const DCF: Impl = conEmpresa((emp, R) => {
    if (!R.V) throw new ErrorBloque("El crecimiento perpetuo no es menor que el WACC: no hay valor terminal.");
    const sens = R.sens as (number | null)[][], w = R.w, g = R.g;
    return {
        cifras: { valor_empresa: fin(R.V.ev), valor_presente_flujos: fin(R.V.pv), valor_terminal_presente: fin(R.V.pvtv), peso_valor_terminal: fin(R.V.pvtv / R.V.ev), deuda_neta: fin(R.netDebt), valor_patrimonio: fin(R.eqv), valor_accion: fin(R.ps), wacc: fin(w), g: fin(g) },
        tablas: {
            proyeccion: { columnas: [{ id: "anio", etiqueta: "Año", fmt: "num" }, { id: "ingresos", etiqueta: "Ingresos", fmt: "num" }, { id: "ebit", etiqueta: "EBIT", fmt: "num" }, { id: "uodi", etiqueta: "UODI", fmt: "num" }, { id: "capex", etiqueta: "CAPEX", fmt: "num" }, { id: "dk", etiqueta: "Inversión KTNO", fmt: "num" }, { id: "fcl", etiqueta: "FCL", fmt: "num" }], filas: (R.Pj as any[]).map(p => ({ anio: p.y, ingresos: p.rev, ebit: p.ebit, uodi: p.uodi, capex: p.cx, dk: p.dk, fcl: p.fcl })) },
            sensibilidad: { columnas: [{ id: "wacc", etiqueta: "WACC", fmt: "pct" }, ...(R.SG as number[]).map((dg, j) => ({ id: `g${j}`, etiqueta: `g ${((g + dg / 100) * 100).toFixed(1).replace(".", ",")} %`, fmt: "num" as const }))], filas: (R.SW as number[]).map((dw, i) => ({ wacc: w + dw / 100, ...Object.fromEntries(sens[i].map((v, j) => [`g${j}`, fin(v)])) })) },
        },
        alertas: (R.alertas ?? []).filter((a: { sev: string }) => a.sev !== "info").map((a: { msg: string }) => a.msg).concat(emp.interno.aux?.shares ? [] : ["Acciones en circulación estimadas: el valor por acción es indicativo."]),
    };
});

const EVA: Impl = conEmpresa((_emp, R) => {
    const EV = R.EV as any[], u = EV[EV.length - 1];
    return {
        cifras: { eva: fin(u.eva), roic: fin(u.roic), wacc: fin(R.w), spread: fin(u.roic - R.w), capital_invertido: fin(u.ic), anios_con_eva_positivo: EV.filter(x => x.eva > 0).length },
        tablas: { serie: { columnas: [{ id: "anio", etiqueta: "Año", fmt: "num" }, { id: "uodi", etiqueta: "UODI", fmt: "num" }, { id: "capital", etiqueta: "Capital invertido", fmt: "num" }, { id: "roic", etiqueta: "ROIC", fmt: "pct" }, { id: "eva", etiqueta: "EVA", fmt: "num" }], filas: EV.map(x => ({ anio: x.y, uodi: fin(x.nopat), capital: fin(x.ic), roic: fin(x.roic), eva: fin(x.eva) })) } },
    };
});

const APAL: Impl = conEmpresa((_emp, R) => ({ cifras: { gao: fin(R.lev.gao), gaf: fin(R.lev.gaf), gat: fin(R.lev.gat), punto_equilibrio: fin(R.lev.pe), margen_seguridad: fin(R.lev.ms), margen_contribucion: fin(R.lev.mc) } }));

const UPA: Impl = conEmpresa((_emp, R) => {
    const a = fin(R.upa.A), b = fin(R.upa.B);
    return { cifras: { ebit_indiferencia: fin(R.upa.ebitStar), upa_acciones: a, upa_deuda: b, preferida: a == null || b == null ? null : a === b ? "Indiferente" : a > b ? "Emitir acciones" : "Tomar deuda" } };
});

const ZAL: Impl = conEmpresa((_emp, R) => {
    const z = fin(R.az.z);
    return { cifras: { z, rating: R.az.r, x1: fin(R.az.x1), x2: fin(R.az.x2), x3: fin(R.az.x3), x4: fin(R.az.x4), zona: z == null ? null : z > 5.85 ? "Segura" : z >= 4.15 ? "Gris" : "Riesgo de insolvencia" } };
});

const RTG: Impl = conEmpresa((_emp, R) => ({
    cifras: { rating: R.rm.r, escalon: fin(R.rm.n), rating_cobertura: R.rt?.[1] ?? null, cobertura: fin(R.m.cov) },
    tablas: { factores: { columnas: [{ id: "factor", etiqueta: "Factor", fmt: "txt" }, { id: "valor", etiqueta: "Valor", fmt: "txt" }, { id: "aporte", etiqueta: "Aporte en escalones", fmt: "x" }], filas: (R.rm.F as { l: string; v: string; c: number }[]).map(f => ({ factor: f.l, valor: f.v, aporte: fin(f.c) })) } },
}));

const PD: Impl = conEmpresa((_emp, R) => ({
    cifras: { pd_1: fin(R.pd.pd), pd_3: fin(R.pd.pd3) },
    tablas: { factores: { columnas: [{ id: "factor", etiqueta: "Factor", fmt: "txt" }, { id: "aporte", etiqueta: "Aporte al logit", fmt: "x" }], filas: (R.pd.F as [string, number][]).map(([factor, aporte]) => ({ factor, aporte: fin(aporte) })) } },
}));

export const IMPLEMENTACIONES: Record<string, Impl> = { MERCADO, INDICADORES, SECTOR, WACC, TASA, REAL, TVM, DPP, FACTORING, AMORT, COMPARAR, CAP, CUPO, FLU, CRUCE, PROYECTO, DQ, VH, RAT, DUPONT, CT, FCL, WACCE, DCF, EVA, APAL, UPA, ZAL, RTG, PD };
