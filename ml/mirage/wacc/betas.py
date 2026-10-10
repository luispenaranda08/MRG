"""Estimadores de beta y ajuste por apalancamiento. Funciones puras, sin descargas.

Referencias (detalle en docs/metodo-betas-kd.md):
- Dimson (1979): suma de coeficientes con rezagos y adelantos del mercado, para acciones poco líquidas.
- Blume (1971): reversión a 1, β_aj = 0,67 β + 0,33.
- Vasicek (1973): encogimiento bayesiano hacia un prior con pesos por precisión.
- Welch (2022), "Simply Better Market Betas", Critical Finance Review 11(1): winsorizar el retorno de
  la acción entre −2·rm y +4·rm y ponderar con decaimiento exponencial.
- Levi y Welch (2017), JFQA 52(2): encoger dos veces, más para empresas pequeñas.
- Hamada (1972): βL = βu · [1 + (1 − t) · D/E].
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class BetaFit:
    beta: float
    se: float
    n: int
    r2: float
    method: str


def returns(prices: pd.DataFrame | pd.Series, freq: str | None = None, log: bool = False):
    """Retornos simples (o logarítmicos). ``freq='W-FRI'`` para semanales, ``'ME'`` mensuales."""
    p = prices.resample(freq).last() if freq else prices
    r = np.log(p).diff() if log else p.pct_change(fill_method=None)
    return r.iloc[1:]


def _wls(y: np.ndarray, X: np.ndarray, w: np.ndarray | None = None):
    w = np.ones(len(y)) if w is None else w
    sw = np.sqrt(w)
    Xw, yw = X * sw[:, None], y * sw
    coef, *_ = np.linalg.lstsq(Xw, yw, rcond=None)
    resid = yw - Xw @ coef
    dof = max(len(y) - X.shape[1], 1)
    s2 = resid @ resid / dof
    cov = s2 * np.linalg.inv(Xw.T @ Xw)
    tss = ((yw - np.average(y, weights=w) * sw) ** 2).sum()
    r2 = 1 - (resid @ resid) / tss if tss > 0 else np.nan
    return coef, cov, r2


def _align(stock: pd.Series, market: pd.Series) -> pd.DataFrame:
    return pd.concat({"s": stock, "m": market}, axis=1).dropna()


def ols_beta(stock: pd.Series, market: pd.Series) -> BetaFit:
    d = _align(stock, market)
    X = np.column_stack([np.ones(len(d)), d["m"].to_numpy()])
    coef, cov, r2 = _wls(d["s"].to_numpy(), X)
    return BetaFit(coef[1], float(np.sqrt(cov[1, 1])), len(d), r2, "ols")


def dimson_beta(stock: pd.Series, market: pd.Series, lags: int = 1, leads: int = 0) -> BetaFit:
    """Beta de Dimson: suma de las pendientes sobre r_m(t−k), k = −leads..lags."""
    d = _align(stock, market)
    cols = {f"m{k:+d}": d["m"].shift(k) for k in range(-leads, lags + 1)}
    D = pd.concat([d["s"], pd.DataFrame(cols)], axis=1).dropna()
    X = np.column_stack([np.ones(len(D)), D.iloc[:, 1:].to_numpy()])
    coef, cov, r2 = _wls(D.iloc[:, 0].to_numpy(), X)
    k = slice(1, None)
    se = float(np.sqrt(cov[k, k].sum()))
    return BetaFit(float(coef[k].sum()), se, len(D), r2, f"dimson({lags},{leads})")


def welch_beta(stock: pd.Series, market: pd.Series, halflife: float | None = 84,
               lower: float = -2.0, upper: float = 4.0) -> BetaFit:
    """Beta winsorizada por pendiente (Welch 2022) con pesos exponenciales opcionales.

    Cada retorno de la acción se recorta al intervalo entre ``lower·rm`` y ``upper·rm`` del mismo día
    (es decir, una beta implícita entre −2 y 4). ``halflife`` en observaciones; 84 días hábiles son
    unos cuatro meses, el valor que sugiere el artículo para datos diarios.
    """
    d = _align(stock, market)
    lo = np.minimum(lower * d["m"], upper * d["m"])
    hi = np.maximum(lower * d["m"], upper * d["m"])
    y = d["s"].clip(lo, hi).to_numpy()
    w = None
    if halflife:
        age = np.arange(len(d))[::-1]
        w = 0.5 ** (age / halflife)
    X = np.column_stack([np.ones(len(d)), d["m"].to_numpy()])
    coef, cov, r2 = _wls(y, X, w)
    return BetaFit(coef[1], float(np.sqrt(cov[1, 1])), len(d), r2, "welch")


def blume(beta: float, weight: float = 2 / 3) -> float:
    return weight * beta + (1 - weight)


def vasicek(beta: float, se: float, prior_mean: float, prior_sd: float) -> float:
    """Media posterior de Vasicek: promedio ponderado por la precisión del dato y del prior."""
    w = prior_sd ** 2 / (prior_sd ** 2 + se ** 2)
    return w * beta + (1 - w) * prior_mean


def vasicek_cross_section(fits: pd.DataFrame, beta_col: str = "beta", se_col: str = "se") -> pd.Series:
    """Encoge cada beta hacia la media del corte transversal (p. ej. el sector)."""
    b, se = fits[beta_col], fits[se_col]
    prior_mean = b.mean()
    prior_var = max(b.var(ddof=1) - (se ** 2).mean(), 1e-4)  # varianza verdadera = observada − ruido
    return pd.Series([vasicek(x, s, prior_mean, np.sqrt(prior_var)) for x, s in zip(b, se)], index=fits.index)


def unlever(beta_l: float, d_e: float, tax: float, cash_to_firm: float = 0.0) -> float:
    """Hamada inverso; si se pasa caja/valor firma, corrige como Damodaran: βu / (1 − caja/V)."""
    bu = beta_l / (1 + (1 - tax) * d_e)
    return bu / (1 - cash_to_firm) if cash_to_firm else bu


def relever(beta_u: float, d_e: float, tax: float) -> float:
    return beta_u * (1 + (1 - tax) * d_e)


def sector_beta(peers: pd.DataFrame, d_e_target: float, tax_target: float) -> dict:
    """Beta bottom-up: mediana y p25–p75 de las betas desapalancadas de los pares, re-apalancada
    con la estructura de capital objetivo (por ejemplo la mediana de D/E del sector en Supersociedades).

    ``peers`` necesita columnas beta, d_e, tasa_impuesto y, opcional, caja_valor_firma.
    """
    cash = peers["caja_valor_firma"] if "caja_valor_firma" in peers else 0.0
    bu = pd.Series([unlever(b, de, t, c) for b, de, t, c in
                    zip(peers["beta"], peers["d_e"], peers["tasa_impuesto"],
                        cash if isinstance(cash, pd.Series) else [0.0] * len(peers))])
    q = bu.quantile([0.25, 0.5, 0.75])
    return {"n_pares": len(bu), "beta_u_p25": q[0.25], "beta_u_mediana": q[0.5], "beta_u_p75": q[0.75],
            "beta_l_p25": relever(q[0.25], d_e_target, tax_target),
            "beta_l_mediana": relever(q[0.5], d_e_target, tax_target),
            "beta_l_p75": relever(q[0.75], d_e_target, tax_target)}


def estimate_all(stock: pd.Series, market: pd.Series) -> pd.DataFrame:
    """Todos los estimadores sobre la misma serie, para comparar."""
    fits = [ols_beta(stock, market), dimson_beta(stock, market, lags=1, leads=1), welch_beta(stock, market)]
    df = pd.DataFrame([f.__dict__ for f in fits])
    ols = fits[0]
    extra = pd.DataFrame([{"beta": blume(ols.beta), "se": np.nan, "n": ols.n, "r2": np.nan, "method": "blume(ols)"}])
    return pd.concat([df, extra], ignore_index=True)
