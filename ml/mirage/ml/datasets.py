"""Conjuntos de datos de los tres problemas que alimentan la página "Costo de capital por sector".

P1 · Kd por sector (Superfinanciera, formato 88): tasa efectiva anual de los créditos comerciales
     nuevos a personas jurídicas, por división CIIU, para los cuatro tamaños de empresa a la vez
     (salida de 4 variables) en el mes siguiente.
P2 · Estructura de capital por empresa (Supersociedades NIIF): D/E, cobertura de intereses, Kd
     contable y ROA del año siguiente, a la vez (salida de 4 variables). Agregado por sector da el
     D/E y la cobertura actuales sin esperar el año de rezago de Supersociedades.
P3 · Insumos de mercado (Formato 351, BanRep, FRED): spread soberano, TES pesos y UVR, inflación
     implícita, tasa de política y Tesoro a 10 años, pronosticados juntos a 1, 3, 6 y 12 meses.

Cada función devuelve X, Y y una partición temporal fija (``split``: train / test) que se guarda en
``data/processed/particion_<problema>.parquet`` (identificador y split), como pide la metodología:
la partición se define una sola vez y todos los modelos la leen.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from mirage.ingest._http import PROCESSED, ROOT

SIZES = ["Gran empresa", "Mediana empresa", "Pequeña empresa", "Microempresa"]
P3_TARGETS = ["spread_soberano", "tes_cop_10a", "tes_uvr_10a", "inflacion_implicita_10a", "tasa_politica", "ust_10a"]


def _save_split(df: pd.DataFrame, name: str, id_cols: list[str]) -> None:
    df[id_cols + ["split"]].to_parquet(PROCESSED / f"particion_{name}.parquet", index=False)


# ------------------------------------------------------------------ macro mensual
def macro_monthly() -> pd.DataFrame:
    br = pd.read_parquet(PROCESSED / "banrep_series.parquet")
    fr = pd.read_parquet(PROCESSED / "fred_series.parquet")

    def m(df, key, col, name):
        s = df[df[key] == col].set_index("fecha")["valor"].sort_index()
        return s.resample("ME").last().rename(name)

    out = pd.concat([m(br, "nombre", "Tasa de política", "tasa_politica"), m(br, "nombre", "IBR 3 meses", "ibr_3m"),
                     m(br, "nombre", "TES 1 año", "tes_1a_banrep"), m(br, "nombre", "TES 10 años", "tes_10a_banrep"),
                     m(br, "nombre", "TRM", "trm"), m(br, "nombre", "COLCAP", "colcap"),
                     m(fr, "serie", "DGS10", "ust_10a"), m(fr, "serie", "T10YIE", "bei_usd_10a")], axis=1)
    out.index = out.index + pd.offsets.MonthEnd(0)
    return out


# ------------------------------------------------------------------ P3
def p3_series(start: str = "2016-01-31") -> pd.DataFrame:
    be = pd.read_csv(ROOT / "reports" / "inflacion_implicita_mensual.csv", parse_dates=["fecha"]).set_index("fecha")
    sp = pd.read_csv(ROOT / "reports" / "spread_soberano_mensual.csv", parse_dates=["fecha"]).set_index("fecha")
    mac = macro_monthly()
    df = pd.concat([sp["spread_soberano_10a_pp"].rename("spread_soberano"), be[["tes_cop_10a", "tes_uvr_10a", "inflacion_implicita_10a"]]], axis=1)
    df.index = df.index + pd.offsets.MonthEnd(0)
    df = df.join(mac[["tasa_politica", "ust_10a", "ibr_3m", "trm", "colcap", "bei_usd_10a"]], how="left")
    df = df.loc[start:].sort_index()
    # Meses sin curva (el ajuste NS se descartó por error alto): interpolación lineal, marcada
    df["imputado"] = df[P3_TARGETS].isna().any(axis=1)
    df[P3_TARGETS] = df[P3_TARGETS].interpolate(limit_direction="both")
    return df


def p3_supervised(df: pd.DataFrame, h: int, lags: int = 3, test_months: int = 36) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series]:
    """Estrategia directa: con la información hasta t, predecir el vector de objetivos en t+h."""
    feats = {}
    for c in P3_TARGETS + ["ibr_3m", "bei_usd_10a"]:
        for k in range(lags):
            feats[f"{c}_l{k}"] = df[c].shift(k)
        feats[f"{c}_d1"] = df[c].diff()
    feats["colcap_ret"] = df["colcap"].pct_change(fill_method=None)
    feats["trm_ret"] = df["trm"].pct_change(fill_method=None)
    X = pd.DataFrame(feats, index=df.index)
    Y = df[P3_TARGETS].shift(-h)
    ok = X.notna().all(axis=1) & Y.notna().all(axis=1)
    X, Y = X[ok], Y[ok]
    split = pd.Series("train", index=X.index)
    split.iloc[-test_months:] = "test"
    return X, Y, split


# ------------------------------------------------------------------ P2
def p2_panel(solo_con_deuda: bool = True) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Con ``solo_con_deuda`` se conservan las empresas con deuda financiera en t y en t+1: son las
    que tienen Kd contable definido, y la salida de 4 variables necesita las cuatro observadas."""
    p = pd.read_parquet(PROCESSED / "supersociedades_panel_2016_2025.parquet")
    p = p[(p["activos"] >= 500_000) & (p["patrimonio"] > 0)].copy()
    p["roa"] = p["ebit"] / p["activos"]
    p["cob"] = p["cobertura_intereses"]
    p["kd"] = p["kd_implicito"]
    p["de"] = p["d_e_contable"]
    keep = ["nit", "anio", "ciiu_division", "activos", "ingresos", "deuda", "efectivo", "de", "cob", "kd", "roa",
            "tasa_impuesto_efectiva", "deuda_ant"]
    p = p[keep]
    nxt = p[["nit", "anio", "de", "cob", "kd", "roa"]].assign(anio=lambda d: d["anio"] - 1)
    nxt.columns = ["nit", "anio", "y_de", "y_cob", "y_kd", "y_roa"]
    prev = p[["nit", "anio", "de", "roa"]].assign(anio=lambda d: d["anio"] + 1).rename(columns={"de": "de_l1", "roa": "roa_l1"})
    d = p.merge(nxt, on=["nit", "anio"], how="inner").merge(prev, on=["nit", "anio"], how="left")
    # Objetivos acotados y transformados para que los errores sean comparables entre empresas
    d["y_de"] = np.log1p(d["y_de"].clip(0, 20))                # log(1 + D/E)
    d["y_cob"] = np.arcsinh(d["y_cob"].fillna(0).clip(-50, 50))  # cobertura acotada, sin intereses = 0
    d["y_kd"] = d["y_kd"].where(d["y_kd"].between(0.0, 0.6))     # Kd contable plausible
    d["y_roa"] = d["y_roa"].clip(-1, 1)
    mac = macro_monthly()
    dec = mac[mac.index.month == 12]
    dec.index = dec.index.year
    d = d.merge(dec[["tasa_politica", "tes_10a_banrep", "ust_10a"]], left_on="anio", right_index=True, how="left")
    d["log_activos"] = np.log(d["activos"])
    d["margen"] = (d["roa"] * d["activos"] / d["ingresos"].replace(0, np.nan)).clip(-2, 2)
    d["caja_activos"] = d["efectivo"].fillna(0) / d["activos"]
    d["deuda_activos"] = d["deuda"] / d["activos"]
    d["crec_deuda"] = (d["deuda"] / d["deuda_ant"].replace(0, np.nan) - 1).clip(-1, 5)
    # Las variables de entrada se acotan igual que los objetivos (el EDA mostró Kd de 49.101 y ROA de −326)
    d["kd"] = d["kd"].where(d["kd"].between(0.0, 0.6))
    d["roa"] = d["roa"].clip(-1, 1)
    d["roa_l1"] = d["roa_l1"].clip(-1, 1)
    d["de"] = np.log1p(d["de"].clip(0, 20))
    d["de_l1"] = np.log1p(d["de_l1"].clip(0, 20))
    d["cob"] = np.arcsinh(d["cob"].fillna(0).clip(-50, 50))
    if solo_con_deuda:
        d = d[d["y_kd"].notna() & (d["deuda"] > 0) & d["y_roa"].notna()]
    d["ciiu_division"] = d["ciiu_division"].fillna("NA")
    d["anio_objetivo"] = d["anio"] + 1
    d["id"] = d["nit"].astype(str) + "_" + d["anio_objetivo"].astype(str)
    # Partición temporal: entrenamiento hasta 2023, prueba 2024–2025 (años que el modelo no ve)
    d["split"] = np.where(d["anio_objetivo"] <= 2023, "train", "test")
    _save_split(d, "p2", ["id"])
    Y = d[["y_de", "y_cob", "y_kd", "y_roa"]]
    X = d[["ciiu_division", "log_activos", "de", "de_l1", "cob", "kd", "roa", "roa_l1", "margen", "caja_activos",
           "deuda_activos", "crec_deuda", "tasa_impuesto_efectiva", "tasa_politica", "tes_10a_banrep", "ust_10a"]]
    return X, Y, d[["id", "nit", "anio_objetivo", "ciiu_division", "split"]]


# ------------------------------------------------------------------ P1
def p1_sector_month(min_amount: float = 1e10, test_months: int = 12) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Tasa ponderada por monto por (mes, división CIIU, tamaño); objetivo = las 4 tasas del mes
    siguiente. Celdas con monto menor a ``min_amount`` (pesos) se tratan como faltantes."""
    t = pd.read_parquet(PROCESSED / "superfinanciera_tasas_detalle.parquet")
    t = t[t["modalidad"] != "Comercial tesoreria"]
    g = t.assign(tm=t["tasa_ea"] * t["monto"]).groupby(["mes", "ciiu_division", "tamano"], as_index=False)[["tm", "monto", "creditos"]].sum()
    g["tasa"] = g["tm"] / g["monto"]
    g.loc[g["monto"] < min_amount, "tasa"] = np.nan
    w = g.pivot_table(index=["ciiu_division", "mes"], columns="tamano", values="tasa").reindex(columns=SIZES)
    w.columns = [f"tasa_{c.split()[0].lower()}" for c in w.columns]
    vol = g.groupby(["ciiu_division", "mes"])["monto"].sum().rename("monto_total")
    w = w.join(vol).reset_index().sort_values(["ciiu_division", "mes"])
    tcols = [c for c in w.columns if c.startswith("tasa_")]
    feats = []
    for div, gg in w.groupby("ciiu_division"):
        gg = gg.set_index("mes").asfreq("MS") if False else gg.set_index("mes")
        f = pd.DataFrame(index=gg.index)
        for c in tcols:
            for k in (0, 1, 2):
                f[f"{c}_l{k}"] = gg[c].shift(k)
            f[f"y_{c}"] = gg[c].shift(-1)
        f["log_monto"] = np.log(gg["monto_total"])
        f["ciiu_division"] = div
        feats.append(f.reset_index())
    d = pd.concat(feats, ignore_index=True)
    mac = macro_monthly()
    mac.index = mac.index.to_period("M").to_timestamp()
    d = d.merge(mac[["tasa_politica", "ibr_3m", "tes_1a_banrep", "tes_10a_banrep"]], left_on="mes", right_index=True, how="left")
    d["mes_del_anio"] = d["mes"].dt.month
    ycols = [f"y_{c}" for c in tcols]
    d = d.dropna(subset=ycols)
    months = np.sort(d["mes"].unique())
    cut = months[-test_months]
    d["split"] = np.where(d["mes"] < cut, "train", "test")
    d["id"] = d["ciiu_division"] + "_" + d["mes"].dt.strftime("%Y-%m")
    _save_split(d, "p1", ["id"])
    X = d.drop(columns=ycols + ["split", "id", "mes"])
    return X, d[ycols], d[["id", "mes", "ciiu_division", "split"]]
