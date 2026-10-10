"""Betas por sector para Colombia (versión publicable 1.0).

Solo usa fuentes verificables y publicables:
- Damodaran, betas de mercados emergentes (``betaemerg.xls``, ``totalbetaemerg.xls``), corte del archivo.
  Sus reglas de uso piden solo, opcionalmente, citar la fuente.
- Supersociedades, estados financieros NIIF 2016–2025 (datos abiertos del Estado, valores en miles de pesos).
- Mapeo CIIU Rev. 4 ↔ industrias de Damodaran (``data/mappings/ciiu_damodaran.csv``), propio de Mirage.

Método por sector CIIU (división):
1. Ancla: beta desapalancada corregida por caja de la industria emergente equivalente (βu ancla).
2. Estructura de capital colombiana: D/E contable (deuda financiera / patrimonio) de las empresas del
   sector, en total y por tamaño (Ley 905 de 2004: activos en SMMLV).
3. Riesgo operativo propio: βu de cada empresa = βu ancla × (σROA empresa / σROA sector)^w, con el σ de
   cada empresa encogido hacia su sector y w estimado entre sectores (elasticidad del riesgo operativo
   colombiano frente a la beta de mercado de la industria).
4. Re-apalancamiento con Hamada y la tarifa marginal de renta (35 %).
5. Beta total para dueños no diversificados: β apalancada / correlación media con el mercado
   (Damodaran, emergentes).

No se publican datos de empresas individuales: solo medianas y rangos por sector y tamaño, con el
número de empresas detrás de cada cifra.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from mirage.ingest._http import PROCESSED, ROOT
from mirage.ingest import damodaran
from mirage.wacc import unlisted as U
from mirage.wacc.betas import relever

TARIFA = 0.35
SMMLV = {2016: 689_455, 2017: 737_717, 2018: 781_242, 2019: 828_116, 2020: 877_803, 2021: 908_526,
         2022: 1_000_000, 2023: 1_160_000, 2024: 1_300_000, 2025: 1_423_500}
TAMANOS = ["Micro", "Pequeña", "Mediana", "Grande"]


def tamano(activos_miles: pd.Series, anio: pd.Series) -> pd.Series:
    """Ley 905 de 2004 (artículo 2): micro ≤ 500 SMMLV, pequeña 501–5.000, mediana 5.001–30.000, grande > 30.000."""
    s = activos_miles * 1000 / anio.map(SMMLV)
    return pd.cut(s, [-np.inf, 500, 5_000, 30_000, np.inf], labels=TAMANOS)


LATAM = ["Brazil", "Mexico", "Chile", "Colombia", "Peru", "Argentina"]


def representatividad() -> pd.DataFrame:
    """Cuántas empresas de mercados emergentes, de América Latina y de Colombia hay detrás de cada
    industria de Damodaran (lista ``indname.xlsx``)."""
    ind = pd.read_excel(damodaran._get("indname.xlsx"), sheet_name="By industry")
    em = ind[ind["Broad Group"].astype(str).str.contains("Emerging", case=False)]
    g = em.groupby("Industry Group")
    return pd.DataFrame({"n_emergentes": g.size(), "n_latam": g["Country"].apply(lambda s: s.isin(LATAM).sum()),
                         "n_colombia": g["Country"].apply(lambda s: (s == "Colombia").sum())})


def anclas() -> pd.DataFrame:
    emerg = damodaran.industry_betas("emerg").set_index("industria")
    raw = pd.read_excel(damodaran._get("totalbetaemerg.xls"), sheet_name="Industry Averages", header=None)
    h = raw.index[raw[0].astype(str).str.startswith("Industry Name")][0]
    tb = raw.iloc[h + 1:, :7].copy()
    tb.columns = ["industria", "n_tb", "bu_prom", "bl_prom", "correlacion", "bu_total", "bl_total"]
    tb = tb.dropna(subset=["industria"]).set_index("industria")
    mp = pd.read_csv(ROOT / "data" / "mappings" / "ciiu_damodaran.csv", dtype=str).set_index("ciiu_division")
    a = mp.join(emerg[["empresas", "beta", "d_e", "beta_u", "beta_u_ajustada_caja", "corte_damodaran"]], on="industria_damodaran")
    a = a.join(pd.to_numeric(tb["correlacion"]), on="industria_damodaran")
    a = a.join(representatividad(), on="industria_damodaran")
    return a.rename(columns={"empresas": "n_damodaran", "beta": "bl_damodaran", "d_e": "de_damodaran",
                             "beta_u_ajustada_caja": "bu_ancla"})


def firmas(anio: int | None = None) -> tuple[pd.DataFrame, dict]:
    """βu y βL por empresa (insumo interno; no se publica por empresa)."""
    panel = pd.read_parquet(PROCESSED / "supersociedades_panel_2016_2025.parquet")
    anio = anio or int(panel["anio"].max())
    ab = U.shrink_sd(U.accounting_betas(U.roa_panel(panel)))
    ult = panel[(panel["anio"] == anio) & (panel["patrimonio"] > 0)].copy()
    ult["tamano"] = tamano(ult["activos"], ult["anio"])
    ult = ult.merge(ab[["nit", "anios", "sd_roa", "sd_roa_enc", "sd_roa_sector"]], on="nit", how="left")
    a = anclas()
    sector = (ab.groupby("ciiu_division").agg(empresas=("nit", "size"), sd_roa=("sd_roa_sector", "first"))
                .join(a["bu_ancla"].rename("beta_u_mercado")))
    sector = sector[(sector["empresas"] >= 20) & ~sector.index.isin(["64", "65", "66"])]
    el = U.risk_elasticity(sector)
    ult = ult.join(a[["bu_ancla", "industria_damodaran", "correlacion"]], on="ciiu_division")
    ult = ult[ult["bu_ancla"].notna()]
    rel = (ult["sd_roa_enc"] / ult["sd_roa_sector"]).where(lambda s: s > 0, 1.0).fillna(1.0)
    ult["bu_empresa"] = ult["bu_ancla"] * rel ** el["w"]
    ult["de"] = ult["d_e_contable"].clip(0, 10).fillna(0)
    ult["bl_ancla"] = relever(ult["bu_ancla"], ult["de"], TARIFA)
    ult["bl_empresa"] = relever(ult["bu_empresa"], ult["de"], TARIFA)
    return ult, el | {"anio": anio}


def tabla_sectorial(min_empresas: int = 30) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    f, info = firmas()
    a = anclas()
    q = lambda s, p: s.quantile(p)
    g = f.groupby("ciiu_division")
    t = pd.DataFrame({
        "empresas_colombia": g.size(),
        "pct_con_deuda": g["deuda"].apply(lambda s: (s > 0).mean()),
        "de_mediana": g["de"].median(), "de_p25": g["de"].apply(q, p=0.25), "de_p75": g["de"].apply(q, p=0.75),
        "bu_mediana": g["bu_empresa"].median(), "bu_p25": g["bu_empresa"].apply(q, p=0.25), "bu_p75": g["bu_empresa"].apply(q, p=0.75),
        "bl_mediana": g["bl_empresa"].median(), "bl_p25": g["bl_empresa"].apply(q, p=0.25), "bl_p75": g["bl_empresa"].apply(q, p=0.75),
    })
    t = a[["descripcion", "industria_damodaran", "n_damodaran", "n_latam", "n_colombia", "bu_ancla", "bl_damodaran",
           "de_damodaran", "correlacion"]].join(t, how="inner")
    t["pct_latam_en_ancla"] = 100 * t["n_latam"] / t["n_damodaran"]
    t["bl_con_de_damodaran"] = relever(t["bu_ancla"], t["de_damodaran"], TARIFA)
    t["beta_total_mediana"] = t["bl_mediana"] / t["correlacion"]
    t = t[(t["empresas_colombia"] >= min_empresas) & ~t.index.isin(["64", "65", "66"])]
    # Por tamaño: mediana de βL y de D/E
    pt = f.pivot_table(index="ciiu_division", columns="tamano", values=["bl_empresa", "de"], aggfunc="median", observed=False)
    nt = f.pivot_table(index="ciiu_division", columns="tamano", values="nit", aggfunc="count", observed=False)
    por_tam = pd.concat({"bl": pt["bl_empresa"], "de": pt["de"], "n": nt}, axis=1)
    por_tam = por_tam.loc[por_tam.index.intersection(t.index)]
    info["corte_damodaran"] = str(a["corte_damodaran"].dropna().iloc[0])
    return t.reset_index().rename(columns={"index": "ciiu_division"}), por_tam, info


if __name__ == "__main__":
    t, pt, info = tabla_sectorial()
    t.to_csv(ROOT / "reports" / "betas_colombia_sectores_v1.csv", index=False)
    print(info)
    print(t.sort_values("empresas_colombia", ascending=False).head(15).round(2).to_string(index=False))
