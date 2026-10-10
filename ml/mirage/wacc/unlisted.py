"""Beta de empresas que no cotizan, con datos colombianos.

El COLCAP cubre unas pocas decenas de emisores; Supersociedades reporta cerca de 30.000 empresas
por año. La beta de una empresa privada se arma así:

1. Ancla de mercado por sector: beta desapalancada (corregida por caja) de la industria equivalente
   en mercados emergentes, vía el mapeo CIIU-Damodaran (``data/mappings/ciiu_damodaran.csv``).
   Es la regresión de mercado sobre miles de empresas emergentes disponible hoy; se reemplaza por
   el universo propio de pares LatAm cuando haya precios con licencia.
2. Ajuste por riesgo operativo de la empresa: βu = βu(sector) × (σROA empresa / σROA sector)^w.
   w es la elasticidad entre el riesgo operativo de los sectores colombianos (Supersociedades) y su
   beta de mercado, estimada en cada corrida (``risk_elasticity``). El σ de cada empresa se encoge
   hacia su sector porque sale de 6 a 10 años de datos.
3. Re-apalancar con el D/E y la tasa de impuestos de la propia empresa (Hamada).

Lo que se probó y no sirvió (8 oct 2026, 64 sectores): la beta contable de Beaver, Kettler y Scholes
(ROA de la empresa contra el ROA agregado) no tiene relación con la beta de mercado (Spearman 0,00);
el σ del ROA sí (Spearman 0,40, p = 0,001). Tampoco sirve calibrar con las cotizadas colombianas:
solo hay 5 sectores no financieros y no reportan a Supersociedades.

La capa de machine learning (docs/metodo-betas-kd.md, sección 5.2) reemplaza el paso 2 por un modelo
con más variables entrenado sobre cotizadas cuando exista ese universo.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .betas import relever, vasicek


def roa_panel(panel: pd.DataFrame, min_assets: float = 500_000) -> pd.DataFrame:
    """ROA operativo por empresa-año; descarta activos muy pequeños (en miles de pesos) y extremos."""
    p = panel[(panel["activos"] >= min_assets) & panel["ebit"].notna()].copy()
    p["roa"] = p["ebit"] / p["activos"]
    lo, hi = p["roa"].quantile([0.005, 0.995])
    return p[p["roa"].between(lo, hi)]


def market_roa(p: pd.DataFrame) -> pd.Series:
    """Rentabilidad operativa agregada (ponderada por activos) de todas las empresas, por año."""
    g = p.groupby("anio")
    return (g["ebit"].sum() / g["activos"].sum()).rename("roa_mercado")


def accounting_betas(p: pd.DataFrame, min_years: int = 6) -> pd.DataFrame:
    """Beta contable por empresa con su error estándar."""
    m = market_roa(p)
    d = p.merge(m, left_on="anio", right_index=True)
    rows = []
    for nit, g in d.groupby("nit"):
        if len(g) < min_years:
            continue
        x, y = g["roa_mercado"].to_numpy(), g["roa"].to_numpy()
        xc = x - x.mean()
        sxx = (xc ** 2).sum()
        if sxx <= 0:
            continue
        b = (xc * (y - y.mean())).sum() / sxx
        resid = y - y.mean() - b * xc
        se = np.sqrt((resid ** 2).sum() / max(len(g) - 2, 1) / sxx)
        rows.append({"nit": nit, "anios": len(g), "beta_contable": b, "se": se,
                     "sd_roa": y.std(ddof=1), "ciiu_division": g["ciiu_division"].dropna().iloc[-1] if g["ciiu_division"].notna().any() else None})
    return pd.DataFrame(rows)


def shrink_to_sector(ab: pd.DataFrame, min_firms: int = 20) -> pd.DataFrame:
    """Vasicek hacia la media de la división CIIU (o del total si el sector es pequeño)."""
    out = ab.copy()
    overall = (ab["beta_contable"].median(), ab["beta_contable"].std())
    prior = {}
    for div, g in ab.groupby("ciiu_division"):
        if len(g) >= min_firms:
            true_var = max(g["beta_contable"].var(ddof=1) - (g["se"] ** 2).median(), 1e-3)
            prior[div] = (g["beta_contable"].median(), np.sqrt(true_var))
    out["beta_contable_sector"] = [prior.get(d, overall)[0] for d in out["ciiu_division"]]
    out["beta_contable_enc"] = [vasicek(b, s, *prior.get(d, overall)) for b, s, d in
                                zip(out["beta_contable"], out["se"], out["ciiu_division"])]
    return out


# División CIIU Rev. 4 de las cotizadas no financieras del Formato 351 (el reporte mezcla Rev. 3 y 4)
LISTED_DIVISION = {"ECOPETROL": "06", "ISA": "35", "GEB": "35", "CELSIA": "35", "PROMIGAS": "35",
                   "CEMARGOS": "23", "CONCONCRET": "42", "EXITO": "47", "TERPEL": "47", "MINEROS": "07"}


def sector_bridge(listed_bu: pd.DataFrame, sector_bc: pd.Series) -> dict:
    """Elasticidad w entre el riesgo de mercado y el contable, entre sectores.

    ``listed_bu``: columnas ciiu_division y beta_u_mercado (una fila por cotizada).
    ``sector_bc``: beta contable mediana de las empresas privadas por división.
    """
    bu = listed_bu.groupby("ciiu_division")["beta_u_mercado"].median()
    d = pd.concat([bu.rename("bu"), sector_bc.rename("bc")], axis=1, join="inner").dropna()
    d = d[(d["bu"] > 0) & (d["bc"] > 0)]
    if len(d) < 3:
        return {"w": 0.5, "n": len(d), "nota": "menos de 3 sectores con cotizadas; w = 0,5", "sectores": d}
    x, y = np.log(d["bc"] / sector_bc[sector_bc > 0].median()), np.log(d["bu"] / d["bu"].median())
    xc = x - x.mean()
    w = float((xc * (y - y.mean())).sum() / (xc ** 2).sum()) if (xc ** 2).sum() > 0 else 0.0
    return {"w": float(np.clip(w, 0, 1)), "w_sin_recortar": w, "correlacion": float(np.corrcoef(x, y)[0, 1]),
            "n": len(d), "bu_mediana_cotizadas": float(d["bu"].median()), "sectores": d}


def sector_beta_u(div: str, bridge: dict, sector_bc: pd.Series, listed_bu: pd.Series) -> tuple[float, str]:
    """βu del sector: la de sus cotizadas si las hay; si no, la mediana de las cotizadas escalada por
    el riesgo contable relativo del sector."""
    if div in listed_bu.index:
        return float(listed_bu[div]), "cotizadas del sector"
    bc_med = sector_bc[sector_bc > 0].median()
    bc = sector_bc.get(div, np.nan)
    if not (bc > 0):
        return bridge["bu_mediana_cotizadas"], "mediana de cotizadas"
    return bridge["bu_mediana_cotizadas"] * (bc / bc_med) ** bridge["w"], "puente contable"


def risk_elasticity(sector: pd.DataFrame, x: str = "sd_roa", y: str = "beta_u_mercado") -> dict:
    """Elasticidad log-log entre el riesgo operativo del sector y su beta de mercado."""
    from scipy import stats

    d = sector[(sector[x] > 0) & (sector[y] > 0)].dropna(subset=[x, y])
    lr = stats.linregress(np.log(d[x]), np.log(d[y]))
    rho = stats.spearmanr(d[x], d[y])
    return {"w": float(np.clip(lr.slope, 0, 1)), "w_estimado": float(lr.slope), "se": float(lr.stderr),
            "r2": float(lr.rvalue ** 2), "spearman": float(rho.statistic), "p_spearman": float(rho.pvalue),
            "sectores": len(d)}


def shrink_sd(ab: pd.DataFrame, min_firms: int = 20) -> pd.DataFrame:
    """Encoge el log del σROA de cada empresa hacia la mediana de su sector.

    Error estándar aproximado del log de una desviación estándar con n datos: 1/√(2(n−1)).
    """
    out = ab.copy()
    out["log_sd"] = np.log(out["sd_roa"].clip(lower=1e-4))
    se = 1 / np.sqrt(2 * (out["anios"] - 1))
    g = out.groupby("ciiu_division")["log_sd"]
    med, n, var_obs = g.transform("median"), g.transform("size"), g.transform("var")
    noise = float((se ** 2).mean())
    overall_var = max(float(out["log_sd"].var()) - noise, 1e-3)
    big = n >= min_firms
    prior_mean = np.where(big, med, out["log_sd"].median())
    prior_var = np.where(big & (var_obs - noise > 0), var_obs - noise, overall_var)
    wgt = prior_var / (prior_var + se ** 2)
    out["sd_roa_enc"] = np.exp(wgt * out["log_sd"] + (1 - wgt) * prior_mean)
    out["sd_roa_sector"] = np.exp(prior_mean)
    return out


def calibrate_bridge(listed: pd.DataFrame) -> dict:
    """Estima w con las cotizadas: regresión del logaritmo del riesgo relativo de mercado
    (βu / βu mediana) sobre el logaritmo del riesgo relativo contable (βc enc / βc sector).

    ``listed`` necesita beta_u_mercado, beta_contable_enc y beta_contable_sector.
    """
    d = listed.dropna(subset=["beta_u_mercado", "beta_contable_enc", "beta_contable_sector"])
    d = d[(d["beta_u_mercado"] > 0) & (d["beta_contable_enc"] > 0) & (d["beta_contable_sector"] > 0)]
    if len(d) < 5:
        return {"w": 0.5, "n": len(d), "nota": "muy pocas cotizadas para calibrar; w = 0,5 por defecto"}
    y = np.log(d["beta_u_mercado"] / d["beta_u_mercado"].median())
    x = np.log(d["beta_contable_enc"] / d["beta_contable_sector"])
    xc = x - x.mean()
    w = float((xc * (y - y.mean())).sum() / (xc ** 2).sum()) if (xc ** 2).sum() > 0 else 0.0
    corr = float(np.corrcoef(x, y)[0, 1])
    return {"w": float(np.clip(w, 0, 1)), "w_sin_recortar": w, "correlacion": corr, "n": len(d)}


def firm_beta(beta_u_sector: float, risk_firm: float, risk_sector: float, w: float,
              d_e: float, tax: float) -> dict:
    """βu = βu(sector) × (riesgo empresa / riesgo sector)^w, re-apalancada con Hamada."""
    rel = risk_firm / risk_sector if risk_sector and risk_sector > 0 and risk_firm > 0 else 1.0
    bu = beta_u_sector * rel ** w
    return {"beta_u": bu, "beta_l": relever(bu, d_e, tax), "riesgo_relativo": rel}
