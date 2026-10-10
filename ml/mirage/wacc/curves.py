"""Curvas, inflación implícita, spread soberano, prima país y spreads corporativos con datos
colombianos de fuente primaria (Formato 351 de la Superfinanciera, BanRep y FRED).

- Nelson y Siegel (1987), como BanRep: y(m) = b0 + b1·f1(m/τ) + b2·f2(m/τ).
- Inflación implícita: (1 + y_pesos) / (1 + y_UVR) − 1 al mismo plazo. Incluye primas de liquidez
  y de inflación: es un indicador, no la expectativa pura.
- Spread soberano: rendimiento de los bonos globales de Colombia en USD menos el Tesoro de EE. UU.
  al mismo plazo. Es la versión de mercado del "default spread" que Damodaran toma de Moody's + CDS.
- Prima país del patrimonio: spread soberano × σ(acciones colombianas en USD) / σ(bono global),
  el mismo ajuste de Damodaran, pero con el COLCAP y los bonos de Colombia en lugar de índices
  emergentes genéricos.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

TAUS = np.linspace(0.3, 12, 60)
FREQ = {"ANUAL": 1, "SEMESTRAL": 2, "TRIMESTRAL": 4, "MENSUAL": 12}


def ytm(dirty: float, coupon_pct: float, maturity, valuation, freq: int = 1, nominal_coupon: bool = False) -> float:
    """Rendimiento efectivo anual (%) que iguala el precio sucio (por 100) a los flujos futuros.

    Convención colombiana: el cupón es una tasa efectiva anual pagada en ``freq`` partes
    equivalentes. Con ``nominal_coupon`` (bonos globales en USD) el cupón por periodo es cupón/freq.
    Los flujos se descuentan con (1 + y)^(días/365).
    """
    from scipy.optimize import brentq

    mat, val = pd.Timestamp(maturity), pd.Timestamp(valuation)
    if not (dirty > 0) or mat <= val:
        return np.nan
    step = int(12 / freq)
    dates = []
    d = mat
    while d > val:
        dates.append(d)
        d = d - pd.DateOffset(months=step)
    t = np.array([(x - val).days / 365.0 for x in dates[::-1]])
    c = coupon_pct / 100
    per = c / freq if nominal_coupon else (1 + c) ** (1 / freq) - 1
    cf = np.full(len(t), 100 * per)
    cf[-1] += 100
    f = lambda y: (cf / (1 + y) ** t).sum() - dirty
    try:
        return 100 * brentq(f, -0.5, 2.0)
    except ValueError:
        return np.nan


def add_ytm(df: pd.DataFrame, usd_nominal: bool = True) -> pd.DataFrame:
    """Agrega ``ytm`` (EA, %) calculado desde el precio sucio de valoración. Para bonos en USD
    agrega también ``ytm_bey`` (base semestral, comparable con el Tesoro)."""
    out = df.copy()
    disc = out["tasa_facial"].str.startswith("Tasa de descuento", na=False)
    coupon = np.where(disc, 0.0, out["valor_tasa_o_spread"])
    freq = out["periodicidad"].map(FREQ).fillna(1).astype(int)
    nominal = (out["codigo_moneda"] == "USD") & usd_nominal
    out["ytm"] = [ytm(p, c, m, v, f, n) for p, c, m, v, f, n in
                  zip(out["precio"], coupon, out["fecha_vencim_titulo"], out["fecha"], freq, nominal)]
    out["ytm_bey"] = 200 * ((1 + out["ytm"] / 100) ** 0.5 - 1)
    return out


def _ns_basis(m: np.ndarray, tau: float) -> np.ndarray:
    x = m / tau
    f1 = (1 - np.exp(-x)) / x
    return np.column_stack([np.ones_like(m), f1, f1 - np.exp(-x)])


def fit_ns(maturity: np.ndarray, yld: np.ndarray, min_points: int = 4) -> dict | None:
    """Ajuste por mínimos cuadrados con búsqueda en malla de τ. Devuelve None si faltan puntos."""
    ok = np.isfinite(maturity) & np.isfinite(yld) & (maturity > 0.25)
    m, y = maturity[ok], yld[ok]
    if len(m) < min_points:
        return None
    from scipy.optimize import minimize_scalar

    def solve(tau):
        X = _ns_basis(m, tau)
        b, *_ = np.linalg.lstsq(X, y, rcond=None)
        return b, float(((y - X @ b) ** 2).sum())

    # Malla gruesa de τ y luego refinamiento local alrededor del mejor punto
    t0 = min(TAUS, key=lambda t: solve(t)[1])
    step = TAUS[1] - TAUS[0]
    res = minimize_scalar(lambda t: solve(t)[1], bounds=(max(TAUS[0], t0 - step), t0 + step), method="bounded")
    tau = float(res.x)
    b, sse = solve(tau)
    return {"b0": b[0], "b1": b[1], "b2": b[2], "tau": tau, "sse": sse, "n": len(m), "rmse": np.sqrt(sse / len(m))}


def ns_yield(params: dict, maturity) -> np.ndarray:
    m = np.atleast_1d(np.asarray(maturity, dtype=float))
    return _ns_basis(m, params["tau"]) @ np.array([params["b0"], params["b1"], params["b2"]])


def monthly_curves(bonds: pd.DataFrame, clase: str, max_rmse: float = 0.6) -> pd.DataFrame:
    """Parámetros NS por mes para una clase del Formato 351 (TSTF, TSUV...)."""
    rows = []
    for fecha, g in bonds[bonds["clase_inversion"] == clase].groupby("fecha"):
        g = g[(g["ytm"] > -5) & (g["ytm"] < 40)]
        p = fit_ns(g["anios_al_vto"].to_numpy(), g["ytm"].to_numpy())
        if p and p["rmse"] <= max_rmse:
            rows.append({"fecha": fecha, "clase": clase, **p})
    return pd.DataFrame(rows)


def tenor_table(curves: pd.DataFrame, tenors=(1, 2, 5, 10)) -> pd.DataFrame:
    out = curves[["fecha", "clase"]].copy()
    for t in tenors:
        out[f"y{t}"] = [float(ns_yield(r, t)[0]) for r in curves.to_dict("records")]
    return out


def breakeven(tes: pd.DataFrame, tenors=(2, 5, 10)) -> pd.DataFrame:
    """Inflación implícita mensual a partir de las curvas de TES en pesos y en UVR (en %)."""
    cop = tenor_table(monthly_curves(tes, "TSTF"), tenors).set_index("fecha")
    uvr = tenor_table(monthly_curves(tes, "TSUV"), tenors).set_index("fecha")
    j = cop.join(uvr, lsuffix="_cop", rsuffix="_uvr", how="inner")
    out = pd.DataFrame(index=j.index)
    for t in tenors:
        out[f"tes_cop_{t}a"] = j[f"y{t}_cop"]
        out[f"tes_uvr_{t}a"] = j[f"y{t}_uvr"]
        out[f"inflacion_implicita_{t}a"] = ((1 + j[f"y{t}_cop"] / 100) / (1 + j[f"y{t}_uvr"] / 100) - 1) * 100
    return out.reset_index()


def ust_curve(fred_panel: pd.DataFrame, tenors: dict[int, str]) -> pd.DataFrame:
    """Curva del Tesoro a fin de mes (último dato del mes) por plazo, en %."""
    wide = (fred_panel[fred_panel["serie"].isin(tenors.values())]
            .pivot_table(index="fecha", columns="serie", values="valor"))
    wide = wide.resample("ME").last()
    wide.columns = [k for s in wide.columns for k, v in tenors.items() if v == s]
    return wide.sort_index(axis=1)


def _interp(row: pd.Series, m: float) -> float:
    x = np.array(row.index, dtype=float)
    y = row.to_numpy(dtype=float)
    ok = np.isfinite(y)
    return float(np.interp(m, x[ok], y[ok])) if ok.sum() >= 2 else np.nan


def sovereign_spread(externa: pd.DataFrame, ust: pd.DataFrame, tenor: float = 10.0) -> pd.DataFrame:
    """Spread de los bonos globales de Colombia en USD sobre el Tesoro, por bono y a plazo fijo.

    Por bono: rendimiento − Tesoro interpolado al mismo plazo. A plazo fijo: Nelson-Siegel sobre los
    rendimientos de Colombia evaluado en ``tenor`` menos el Tesoro a ese plazo.
    """
    usd = externa[(externa["codigo_moneda"] == "USD") & (externa["ytm_bey"] > 0)].copy()
    usd["mes"] = usd["fecha"] + pd.offsets.MonthEnd(0)
    usd = usd.merge(ust, left_on="mes", right_index=True, how="inner")
    tcols = list(ust.columns)
    usd["ust_mismo_plazo"] = [_interp(r[tcols], m) for (_, r), m in zip(usd.iterrows(), usd["anios_al_vto"])]
    usd["spread_pp"] = usd["ytm_bey"] - usd["ust_mismo_plazo"]
    rows = []
    for fecha, g in usd.groupby("fecha"):
        p = fit_ns(g["anios_al_vto"].to_numpy(), g["ytm_bey"].to_numpy())
        if not p:
            continue
        y_col = float(ns_yield(p, tenor)[0])
        y_ust = _interp(g.iloc[0][tcols], tenor)
        rows.append({"fecha": fecha, "bonos": len(g), f"col_usd_{tenor:g}a": y_col, f"ust_{tenor:g}a": y_ust,
                     f"spread_soberano_{tenor:g}a_pp": y_col - y_ust, "spread_mediano_bonos_pp": g["spread_pp"].median(),
                     "rmse_ns": p["rmse"]})
    return pd.DataFrame(rows), usd


def country_risk_premium(spread: pd.DataFrame, equity_usd: pd.Series, bond_price: pd.Series,
                         window: int = 60, spread_col: str = "spread_soberano_10a_pp") -> pd.DataFrame:
    """CRP = spread soberano × σ(retorno acciones en USD) / σ(retorno del bono global), ventana móvil
    de ``window`` meses."""
    re = equity_usd.pct_change()
    rb = bond_price.pct_change()
    ratio = re.rolling(window, min_periods=36).std() / rb.rolling(window, min_periods=36).std()
    out = spread.set_index("fecha")[[spread_col]].join(ratio.rename("vol_relativa"), how="left")
    out["crp_pp"] = out[spread_col] * out["vol_relativa"]
    return out.reset_index()


RATING_ORDER = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B", "B-"]


def normalize_rating(s: str) -> str | None:
    """'AA +' → 'AA+'; descarta escalas internacionales mezcladas ('BB +, Ba1') y vacíos."""
    if not isinstance(s, str):
        return None
    s = s.split(",")[0].replace(" ", "").upper()
    return s if s in RATING_ORDER else None


def corporate_spreads(bonos: pd.DataFrame, tes: pd.DataFrame) -> pd.DataFrame:
    """Spread de bonos corporativos en pesos a tasa fija sobre la curva TES en pesos del mismo mes.

    Solo tasa fija en COP: en los bonos indexados al IPC la tasa de valoración del reporte mezcla
    convenciones (nominal o margen real) y queda para una segunda versión.
    """
    curves = monthly_curves(tes, "TSTF").set_index("fecha")
    b = bonos[(bonos["codigo_moneda"] == "COP") & bonos["tasa_facial"].str.startswith("FS", na=False)
              & (bonos["ytm"] > 0) & (bonos["anios_al_vto"] > 0.5)].copy()
    b = b[b["fecha"].isin(curves.index)]
    b["tes_mismo_plazo"] = [float(ns_yield(curves.loc[f].to_dict(), m)[0]) for f, m in zip(b["fecha"], b["anios_al_vto"])]
    b["spread_pp"] = b["ytm"] - b["tes_mismo_plazo"]
    b["rating"] = b["calificacion"].map(normalize_rating)
    return b
