import { celda, numero, type Parametros, type Sector, type Celda } from "./api";
export interface Insumos {
    deuda: number;
    patrimonio: number;
    ebit: number;
    gastos: number;
    tarifa: number;
    total: boolean;
}
export function calcular(p: Parametros, s: Sector, tamano: string, i: Insumos): Record<string, Celda> {
    const rf = numero(p.rf_usd), erp = numero(p.erp_maduro), crp = numero(p.crp), cop = numero(p.inflacion_cop), usd = numero(p.inflacion_usd);
    const bu = i.total ? numero(s.beta_total) : numero(s.beta_desapalancada);
    const kd = numero(s.por_tamano[tamano]?.kd || s.kd) ?? numero(s.kd);
    const falta = "Falta un dato de mercado o el patrimonio no es positivo.";
    const valid = i.patrimonio > 0 && i.deuda >= 0 && i.tarifa >= 0 && i.tarifa <= 1 && [rf, erp, crp, cop, usd, bu, kd].every(v => v !== null);
    if (!valid)
        return Object.fromEntries(["β reapalancada", "Ke COP", "Kd observado COP", "WACC COP", "WACC USD", "Cobertura de intereses"].map(k => [k, celda(null, k.startsWith("β") || k.startsWith("Cobertura") ? "x" : "pct", "alerta", falta)]));
    const de = i.deuda / i.patrimonio, bl = bu! * (1 + (1 - i.tarifa) * de), keUSD = rf! + bl * erp! + crp!, keCOP = (1 + keUSD) * (1 + cop!) / (1 + usd!) - 1, wd = i.deuda / (i.deuda + i.patrimonio);
    // El WACC se calcula en pesos (escudo fiscal sobre el Kd observado en pesos) y se pasa a dólares por Fisher,
    // igual que la tabla de sectores (ml/mirage/api.py). Ponderar Ke y Kd ya convertidos daba hasta 0,4 pp de diferencia.
    const waccCOP = (1 - wd) * keCOP + wd * kd! * (1 - i.tarifa);
    return { "β reapalancada": celda(bl, "x"), "Ke COP": celda(keCOP), "Kd observado COP": celda(kd, "pct", "insumo", "Kd observado por tamaño; si falta, se utiliza el del sector."), "WACC COP": celda(waccCOP), "WACC USD": celda((1 + waccCOP) * (1 + usd!) / (1 + cop!) - 1), "Cobertura de intereses": celda(i.gastos > 0 ? i.ebit / i.gastos : null, "x", "nota", "EBIT / gastos financieros. No reemplaza el Kd observado.") };
}
