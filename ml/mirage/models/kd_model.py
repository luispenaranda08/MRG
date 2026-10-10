"""¿Predice mejor el costo de la deuda de las empresas colombianas un modelo con datos locales que
el método sintético de Damodaran? Prueba fuera de muestra.

Objetivo: Kd implícito del año t+1 (costos financieros / deuda financiera promedio, Supersociedades),
con la información disponible al cierre del año t.

Competidores:
- Damodaran en USD: Tesoro 10a (dic t) + spread soberano por calificación de Damodaran (archivo de
  enero t+1) + spread por cobertura de intereses (tabla para empresas pequeñas), pasado a COP por
  Fisher con la inflación implícita de los TES y la del Tesoro.
- Damodaran en COP: TES 10a (dic t) + spread por cobertura (variante local común en la práctica).
- Persistencia: el Kd implícito de la propia empresa en t.
- Tasa de política + spread mediano del sector en t.
- LightGBM con variables de la empresa, del sector y de tasas al cierre de t.

Entrenamiento con años objetivo 2017–2022 y prueba con 2023–2025: el modelo nunca ve los años que
predice. El Kd implícito es ruidoso (incluye comisiones, diferencia en cambio e intereses de
arrendamientos), así que se compara el error de todos contra el mismo objetivo.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from mirage.ingest._http import PROCESSED, ROOT
from mirage.wacc import kd as K

# Spread soberano por calificación de Damodaran para Colombia, archivo de enero de cada año
# (ctryprem de los archivos históricos; 2023 y 2025 no están publicados: se interpolan).
DAMODARAN_SOV = {2017: 0.019518, 2018: 0.021479, 2019: 0.015915, 2020: 0.016822, 2021: 0.016197,
                 2022: 0.023297, 2024: 0.018857, 2026: 0.018678}
DAMODARAN_SOV[2023] = (DAMODARAN_SOV[2022] + DAMODARAN_SOV[2024]) / 2
DAMODARAN_SOV[2025] = (DAMODARAN_SOV[2024] + DAMODARAN_SOV[2026]) / 2

FEATURES = ["kd_t", "log_activos", "d_e", "deuda_activos", "cobertura", "roa", "margen_ebit",
            "caja_activos", "crec_deuda", "tasa_politica", "tes10", "ciiu_division"]


def _macro() -> pd.DataFrame:
    br = pd.read_parquet(PROCESSED / "banrep_series.parquet")
    fr = pd.read_parquet(PROCESSED / "fred_series.parquet")
    be = pd.read_csv(ROOT / "reports" / "inflacion_implicita_mensual.csv", parse_dates=["fecha"])

    def dec(s: pd.Series) -> pd.Series:
        s = s.sort_index()
        s = s[s.index.month == 12]
        return s.groupby(s.index.year).last()

    pol = dec(br[br["nombre"] == "Tasa de política"].set_index("fecha")["valor"])
    tes10 = dec(br[br["nombre"] == "TES 10 años"].set_index("fecha")["valor"])
    ust = dec(fr[fr["serie"] == "DGS10"].set_index("fecha")["valor"])
    bei_us = dec(fr[fr["serie"] == "T10YIE"].set_index("fecha")["valor"])
    bei_co = dec(be.set_index("fecha")["inflacion_implicita_10a"])
    return pd.DataFrame({"tasa_politica": pol, "tes10": tes10, "ust10": ust, "bei_us": bei_us, "bei_co": bei_co})


def dataset() -> pd.DataFrame:
    p = pd.read_parquet(PROCESSED / "supersociedades_panel_2016_2025.parquet")
    p = p[(p["deuda"] > 0) & (p["activos"] > 0) & (p["patrimonio"] > 0)].copy()
    p["kd"] = p["kd_implicito"]
    nxt = p[["nit", "anio", "kd"]].assign(anio=lambda d: d["anio"] - 1).rename(columns={"kd": "kd_t1"})
    d = p.merge(nxt, on=["nit", "anio"], how="inner")
    d = d[d["kd"].between(0.02, 0.40) & d["kd_t1"].between(0.02, 0.40)]
    d["kd_t"] = d["kd"]
    d["log_activos"] = np.log(d["activos"])
    d["d_e"] = d["d_e_contable"].clip(upper=10)
    d["deuda_activos"] = d["deuda"] / d["activos"]
    d["cobertura"] = d["cobertura_intereses"].clip(-20, 50)
    d["roa"] = d["ebit"] / d["activos"]
    d["margen_ebit"] = (d["ebit"] / d["ingresos"]).clip(-2, 2)
    d["caja_activos"] = d["efectivo"].fillna(0) / d["activos"]
    d["crec_deuda"] = (d["deuda"] / d["deuda_ant"].replace(0, np.nan) - 1).clip(-1, 5)
    d = d.merge(_macro(), left_on="anio", right_index=True, how="left")
    d["anio_objetivo"] = d["anio"] + 1
    d["ciiu_division"] = d["ciiu_division"].fillna("NA").astype("category")
    return d


def baselines(d: pd.DataFrame, table: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=d.index)
    syn = np.array([K.synthetic_rating(c, table)[1] if np.isfinite(c) else np.nan for c in d["cobertura"]])
    sov = d["anio_objetivo"].map(DAMODARAN_SOV)
    usd = d["ust10"] / 100 + sov + syn
    out["damodaran_usd_a_cop"] = (1 + usd) * (1 + d["bei_co"] / 100) / (1 + d["bei_us"] / 100) - 1
    out["damodaran_tes_cop"] = d["tes10"] / 100 + syn
    out["persistencia"] = d["kd_t"]
    spread_sector = (d["kd_t"] - d["tasa_politica"] / 100).groupby([d["anio"], d["ciiu_division"]], observed=True).transform("median")
    out["politica_mas_sector"] = d["tasa_politica"] / 100 + spread_sector
    return out


def evaluate(train_until: int = 2022) -> pd.DataFrame:
    import lightgbm as lgb

    from mirage.ingest.damodaran import synthetic_rating_table

    d = dataset()
    table = synthetic_rating_table("small")
    b = baselines(d, table)
    tr, te = d["anio_objetivo"] <= train_until, d["anio_objetivo"] > train_until
    model = lgb.LGBMRegressor(objective="l1", n_estimators=600, learning_rate=0.03, num_leaves=63,
                              min_child_samples=50, subsample=0.8, subsample_freq=1, colsample_bytree=0.8,
                              verbose=-1, random_state=7)
    model.fit(d.loc[tr, FEATURES], d.loc[tr, "kd_t1"], categorical_feature=["ciiu_division"])
    b["lightgbm_local"] = np.nan
    b.loc[te, "lightgbm_local"] = model.predict(d.loc[te, FEATURES])
    y = d["kd_t1"]
    rows = []
    for col in b.columns:
        e = (b.loc[te, col] - y[te]).dropna()
        rows.append({"metodo": col, "n": len(e), "mae_pp": 100 * e.abs().mean(),
                     "mediana_error_abs_pp": 100 * e.abs().median(), "sesgo_pp": 100 * e.mean()})
    res = pd.DataFrame(rows).sort_values("mae_pp")
    imp = pd.Series(model.booster_.feature_importance("gain"), index=FEATURES).sort_values(ascending=False)
    # Error por tamaño (terciles de activos) para el mejor clásico y el modelo
    te_d = d[te].assign(tamano=pd.qcut(d.loc[te, "activos"], 3, labels=["pequeña", "mediana", "grande"]))
    by_size = te_d.groupby("tamano", observed=True).apply(
        lambda g: pd.Series({c: 100 * (b.loc[g.index, c] - y[g.index]).abs().mean() for c in b.columns}))
    return res, imp, by_size, model


if __name__ == "__main__":
    res, imp, by_size, _ = evaluate()
    res.to_csv(ROOT / "reports" / "kd_prueba_fuera_de_muestra.csv", index=False)
    print(res.round(2).to_string(index=False))
    print("\nImportancia (ganancia):\n", (imp / imp.sum()).round(3).to_string())
    print("\nMAE por tamaño (pp):\n", by_size.round(2).to_string())
