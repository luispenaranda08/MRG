import type { Datos } from "../api";
import { numero } from "../api";
import { M } from "./engine";
export function defaultsFor(c: Parameters<typeof M>[0], datos: Datos, sector: number, tamano: string) {
    const p = datos.parametros, sc = datos.sectores[sector], k = c.years.length - 1, m = M(c, k), first = M(c, 0), kd = numero(sc.por_tamano[tamano]?.kd || sc.kd) ?? numero(sc.kd);
    const need = [p.rf_usd, p.erp_maduro, p.crp, p.inflacion_cop, p.inflacion_usd, sc.beta_desapalancada, sc.de];
    if (need.some(x => numero(x) === null) || kd === null)
        throw new Error("Faltan insumos de mercado o Kd observado para este sector.");
    const piCOP = numero(p.inflacion_cop)! * 100, piUSD = numero(p.inflacion_usd)! * 100;
    // Crecimiento: CAGR histórico acotado a [−10 %, 20 %] que converge en cinco años al crecimiento de largo plazo
    // (inflación esperada de la moneda de los estados); margen: el último, o la mediana de los años con EBIT positivo.
    const recortes: string[] = [], gLargo = c.cur === "COP" ? piCOP : piUSD;
    const rate = (Math.pow(m.rev / first.rev, 1 / k) - 1) * 100, cagr = Number.isFinite(rate) ? rate : gLargo;
    const g0 = Math.min(20, Math.max(-10, cagr));
    if (g0 !== cagr) recortes.push(`El crecimiento histórico (${cagr.toFixed(1).replace(".", ",")} % anual) se acotó a ${g0.toFixed(0)} % para proyectar; ajústelo si tiene un plan de negocio que lo respalde.`);
    const growth = Array.from({ length: 5 }, (_, j) => g0 + (gLargo - g0) * j / 4);
    const margenes = c.years.map((_: number, i: number) => M(c, i).em as number).filter((x: number) => Number.isFinite(x) && x > 0).sort((a: number, b: number) => a - b);
    let margin = m.em * 100;
    if (!(m.em > 0) && margenes.length) { margin = margenes[Math.floor(margenes.length / 2)] * 100; recortes.push(`El margen EBIT del último año no es positivo; la proyección parte de la mediana de los años rentables (${margin.toFixed(1).replace(".", ",")} %).`); }
    else if (margin > 60) { margin = 60; recortes.push("El margen EBIT histórico supera 60 %; la proyección lo limita a 60 %."); }
    const da = m.da ?? 0, capex = c.aux.capex?.[k] ?? Math.max(0, m.ppe - M(c, k - 1).ppe + da);
    const shares = c.aux.shares?.[k] ? c.aux.shares[k] * c.um : Math.max(1, Math.round(m.eq * c.um / 1000));
    return { sector, bu: numero(sc.beta_desapalancada)!, rf: numero(p.rf_usd)! * 100, erp: numero(p.erp_maduro)! * 100, crp: c.country === "Colombia" ? numero(p.crp)! * 100 : 0, lam: c.country === "Colombia" ? 1 : 0, size: 0, t: m.t * 100,
        kdMode: "manual", kd: ((1 + kd) * (1 + piUSD / 100) / (1 + piCOP / 100) - 1) * 100, kdFuente: `Kd observado COP, ${sc.nombre} · ${tamano}; conversión Fisher a USD. Corte ${datos.meta.corte}`,
        betaReg: "", waccMode: "bu", waccManual: 0, growth, margin, daPct: da / m.rev * 100, capexPct: capex / m.rev * 100, ktnoPct: m.ktno / m.rev * 100, g: gLargo, recortes, shares, price: "", fixed: 100, finNeed: Math.round(m.ta * 0.05), finRate: null, issuePrice: "", piCOP, piUSD };
}
