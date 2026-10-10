"""WACC por sector CIIU en dos versiones, para medir cuánto cambia el resultado con datos locales.

- "Damodaran puro": lo que haría un analista solo con los archivos de Damodaran: βu de la industria
  emergente re-apalancada con el D/E de esa industria, prima país por calificación, Kd en USD
  (Tesoro + spread soberano por calificación + spread por cobertura) y conversión a pesos por Fisher.
- "FinTarget": misma βu de industria como ancla (la prueba de 2021–2026 mostró que predice mejor que
  la historia propia de las cotizadas), pero re-apalancada con el D/E de las empresas colombianas
  del sector (Supersociedades), prima país desde los bonos globales de Colombia, Kd igual a la tasa
  observada de los créditos comerciales nuevos del sector (Superfinanciera, formato 88) y rango
  p25–p75 de βu de las empresas del sector.

Todo en pesos nominales; el WACC real se obtiene con la inflación implícita de los TES.
Bancos, aseguradoras y auxiliares financieros (CIIU 64–66) se excluyen: para ellos solo aplica Ke.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from mirage.ingest._http import PROCESSED, ROOT
from mirage.ingest.damodaran import country, synthetic_rating_table
from mirage.ingest.superfinanciera import weighted
from mirage.wacc import kd as K
from mirage.wacc.betas import relever

TAX = 0.35  # tarifa general de renta en Colombia


def fisher(r_usd: float, pi_cop: float, pi_usd: float) -> float:
    return (1 + r_usd) * (1 + pi_cop) / (1 + pi_usd) - 1


def inputs() -> dict:
    fr = pd.read_parquet(PROCESSED / "fred_series.parquet")
    last20 = lambda sid: fr[fr["serie"] == sid].sort_values("fecha")["valor"].tail(20).mean() / 100
    crp_m = pd.read_csv(ROOT / "reports" / "prima_pais_mensual.csv").iloc[-1]
    be = pd.read_csv(ROOT / "reports" / "inflacion_implicita_mensual.csv").iloc[-1]
    co = country("Colombia")
    lam_em = co["crp_rating"] / co["spread_soberano_rating"]  # volatilidad relativa que usa Damodaran
    return {
        "rf_usd": last20("DGS10"),
        "pi_usd": last20("T10YIE"),
        "pi_cop": be["inflacion_implicita_10a"] / 100,
        "erp_maduro": co["erp_total_rating"] - co["crp_rating"],
        "crp_damodaran": co["crp_rating"],
        "spread_sov_damodaran": co["spread_soberano_rating"],
        "spread_sov_mercado": crp_m["spread_soberano_10a_pp"] / 100,
        "lambda_em": lam_em,
        "lambda_colombia": crp_m["vol_relativa"],
        "crp_mirage": crp_m["spread_soberano_10a_pp"] / 100 * lam_em,
        "crp_mirage_lambda_col": crp_m["crp_pp"] / 100,
    }


def sector_table(min_firms: int = 30) -> tuple[pd.DataFrame, dict]:
    x = inputs()
    mapping = pd.read_csv(ROOT / "data" / "mappings" / "ciiu_damodaran.csv", dtype=str).set_index("ciiu_division")
    dam = pd.read_parquet(PROCESSED / "damodaran_betas_emerg.parquet").set_index("industria")
    panel = pd.read_parquet(PROCESSED / "supersociedades_panel_2016_2025.parquet")
    last = panel[(panel["anio"] == panel["anio"].max()) & (panel["patrimonio"] > 0)]
    g = last.groupby("ciiu_division")
    de_q = g["d_e_contable"].quantile([0.25, 0.5, 0.75]).unstack()
    cov = g["cobertura_intereses"].median()
    firms = pd.read_parquet(PROCESSED / "betas_no_cotizadas.parquet")
    bu_q = firms.groupby("ciiu_division")["beta_u"].quantile([0.25, 0.5, 0.75]).unstack()
    f88 = pd.read_parquet(PROCESSED / "superfinanciera_tasas_ciiu.parquet")
    obs = weighted(f88[f88["modalidad"] != "Comercial tesoreria"], ["ciiu_division"]).set_index("ciiu_division")
    table = synthetic_rating_table("small")
    spreads = pd.read_parquet(PROCESSED / "fred_series.parquet")
    from mirage.ingest.fred import spreads_by_rating
    mkt_spreads = spreads_by_rating(spreads)

    rows = []
    for div, n in g.size().items():
        if n < min_firms or div in ("64", "65", "66") or div not in mapping.index:
            continue
        ind = mapping.at[div, "industria_damodaran"]
        if ind not in dam.index:
            continue
        d = dam.loc[ind]
        # ---- Damodaran puro
        bl_d = relever(d["beta_u_ajustada_caja"], d["d_e"], TAX)
        ke_d = fisher(x["rf_usd"] + bl_d * x["erp_maduro"] + x["crp_damodaran"], x["pi_cop"], x["pi_usd"])
        rating, syn = K.synthetic_rating(cov.get(div, np.nan), table)
        kd_d = fisher(x["rf_usd"] + x["spread_sov_damodaran"] + (syn if np.isfinite(syn) else 0.03), x["pi_cop"], x["pi_usd"])
        wd = d["d_e"] / (1 + d["d_e"])
        wacc_d = (1 - wd) * ke_d + wd * kd_d * (1 - TAX)
        # ---- FinTarget
        de_med = de_q.at[div, 0.5]
        bu = bu_q.loc[div] if div in bu_q.index else pd.Series({0.25: np.nan, 0.5: d["beta_u_ajustada_caja"], 0.75: np.nan})
        ke = {q: fisher(x["rf_usd"] + relever(bu[q], de_med, TAX) * x["erp_maduro"] + x["crp_mirage"],
                        x["pi_cop"], x["pi_usd"]) for q in (0.25, 0.5, 0.75)}
        kd_obs = obs["tasa_ea"].get(div, np.nan) / 100 if obs["monto"].get(div, 0) > 5e11 else np.nan
        kd_f = kd_obs if np.isfinite(kd_obs) else fisher(x["rf_usd"] + x["spread_sov_mercado"]
                                                          + K.market_spread(rating, mkt_spreads), x["pi_cop"], x["pi_usd"])
        wacc = {}
        for qd, de in (("p25", de_q.at[div, 0.25]), ("mediana", de_med), ("p75", de_q.at[div, 0.75])):
            w = de / (1 + de)
            wacc[qd] = (1 - w) * ke[0.5] + w * kd_f * (1 - TAX)
        w = de_med / (1 + de_med)
        wacc_beta_lo = (1 - w) * ke[0.25] + w * kd_f * (1 - TAX)
        wacc_beta_hi = (1 - w) * ke[0.75] + w * kd_f * (1 - TAX)
        rows.append({
            "ciiu_division": div, "descripcion": mapping.at[div, "descripcion"], "industria_damodaran": ind,
            "empresas": int(n),
            "dam_d_e": d["d_e"], "dam_beta_l": bl_d, "dam_ke": ke_d, "dam_kd": kd_d, "dam_wacc": wacc_d,
            "ft_d_e": de_med, "ft_beta_u": bu[0.5], "ft_beta_l": relever(bu[0.5], de_med, TAX),
            "ft_ke": ke[0.5], "ft_kd": kd_f, "ft_kd_fuente": "Superfinanciera f88" if np.isfinite(kd_obs) else "sintético",
            "ft_wacc": wacc["mediana"], "ft_wacc_p25_beta": wacc_beta_lo, "ft_wacc_p75_beta": wacc_beta_hi,
            "diferencia_pp": 100 * (wacc["mediana"] - wacc_d),
        })
    out = pd.DataFrame(rows)
    g_ = x["pi_cop"]  # crecimiento nominal igual a la inflación (crecimiento real cero)
    out["impacto_valor_pct"] = 100 * ((out["dam_wacc"] - g_) / (out["ft_wacc"] - g_) - 1)
    out["ft_wacc_real"] = (1 + out["ft_wacc"]) / (1 + x["pi_cop"]) - 1
    return out, x


if __name__ == "__main__":
    t, x = sector_table()
    print({k: round(v, 4) for k, v in x.items()})
    cols = ["ciiu_division", "descripcion", "empresas", "dam_d_e", "ft_d_e", "dam_ke", "ft_ke", "dam_kd", "ft_kd",
            "dam_wacc", "ft_wacc", "ft_wacc_p25_beta", "ft_wacc_p75_beta", "diferencia_pp", "impacto_valor_pct"]
    t.to_csv(ROOT / "reports" / "wacc_sectorial.csv", index=False)
    with pd.ExcelWriter(ROOT / "reports" / "wacc_sectorial.xlsx") as xw:
        t.to_excel(xw, sheet_name="WACC por sector", index=False)
        pd.Series(x).to_frame("valor").to_excel(xw, sheet_name="Insumos")
    print(t.sort_values("empresas", ascending=False)[cols].head(20).round(3).to_string(index=False))
    print("\nDiferencia media |FinTarget − Damodaran| (pp):", round(t["diferencia_pp"].abs().mean(), 2),
          "· impacto medio en valor (%):", round(t["impacto_valor_pct"].abs().mean(), 1))
