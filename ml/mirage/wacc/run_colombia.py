"""Corrida completa con datos colombianos de fuente primaria.

Requiere haber descargado: fred, banrep, f351 y el panel de Supersociedades 2016–2025
(``python -m mirage.ingest.supersociedades 2016 2025``). Escribe los resultados en ``reports/``.

    python -m mirage.wacc.run_colombia
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from mirage.ingest import f351, fred
from mirage.ingest._http import PROCESSED, ROOT
from mirage.wacc import betas as B
from mirage.wacc import curves as C
from mirage.wacc import unlisted as U

REPORTS = ROOT / "reports"
BOND_DURATION_10Y = 7.5  # duración aproximada de un bono global a 10 años para pasar Δy a retorno


def _p(name: str) -> pd.DataFrame:
    return pd.read_parquet(PROCESSED / f"{name}.parquet")


def market_inputs() -> dict[str, pd.DataFrame]:
    tes = C.add_ytm(_p("f351_tes"))
    ext = C.add_ytm(_p("f351_externa"))
    bon = C.add_ytm(_p("f351_bonos"))
    ust = C.ust_curve(_p("fred_series"), fred.UST_TENORS)
    br = _p("banrep_series")
    colcap = br[br["nombre"] == "COLCAP"].set_index("fecha")["valor"]
    colcap.index = colcap.index + pd.offsets.MonthEnd(0)
    trm = br[br["nombre"] == "TRM"].set_index("fecha")["valor"].resample("ME").last()

    be = C.breakeven(tes)
    sp, _ = C.sovereign_spread(ext, ust)
    y10 = sp.set_index("fecha")["col_usd_10a"]
    bond_px = (1 - BOND_DURATION_10Y * y10.diff() / 100).cumprod()
    crp = C.country_risk_premium(sp, (colcap / trm).dropna(), bond_px)
    cs = C.corporate_spreads(bon, tes)
    return {"inflacion_implicita": be, "spread_soberano": sp, "prima_pais": crp,
            "spreads_corporativos": cs, "colcap": colcap.to_frame("colcap").reset_index()}


def listed_betas(colcap: pd.Series, months: int = 60, max_stale: float = 0.25) -> pd.DataFrame:
    """Betas mensuales de las acciones del Formato 351 contra el COLCAP, con Dimson y Vasicek."""
    a = _p("f351_acciones")
    meta = a.sort_values("fecha").drop_duplicates("nemotecnico", keep="last").set_index("nemotecnico")
    px = f351.equity_prices(a)
    R, m = px.pct_change(fill_method=None), colcap.pct_change()
    rows = []
    for t in px.columns:
        r = R[t].tail(months)
        stale = float((r == 0).mean())
        d = pd.concat([r, m], axis=1).dropna()
        if len(d) < 36 or stale > max_stale:
            continue
        o, dm = B.ols_beta(d.iloc[:, 0], d.iloc[:, 1]), B.dimson_beta(d.iloc[:, 0], d.iloc[:, 1], lags=1)
        nit = str(meta.at[t, "nro_id_emisor"])[:-1]  # el reporte trae el NIT con dígito de verificación
        rows.append({"accion": t, "emisor": meta.at[t, "razon_social_emisor"], "nit": nit,
                     "ciiu": meta.at[t, "codigo_ciiu"], "meses": o.n, "meses_sin_cambio": stale,
                     "beta": o.beta, "se": o.se, "beta_dimson": dm.beta})
    bt = pd.DataFrame(rows)
    bt["beta_vasicek"] = B.vasicek_cross_section(bt)
    return bt


def unlisted_betas(listed: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    panel = _p("supersociedades_panel_2016_2025")
    ab = U.shrink_sd(U.accounting_betas(U.roa_panel(panel)))
    last = panel.sort_values("anio").drop_duplicates("nit", keep="last")
    ab = ab.merge(last[["nit", "d_e_contable", "tasa_impuesto_efectiva"]], on="nit", how="left")
    mapping = pd.read_csv(ROOT / "data" / "mappings" / "ciiu_damodaran.csv", dtype=str)
    dam = _p("damodaran_betas_emerg").set_index("industria")["beta_u_ajustada_caja"]
    anchor = mapping.set_index("ciiu_division")["industria_damodaran"].map(dam)
    sector = (ab.groupby("ciiu_division").agg(empresas=("nit", "size"), sd_roa=("sd_roa_sector", "first"))
                .join(anchor.rename("beta_u_mercado")))
    sector = sector[(sector["empresas"] >= 20) & ~sector.index.isin(["64", "65", "66"])]
    el = U.risk_elasticity(sector)
    out = []
    for r in ab.itertuples():
        bu_s = anchor.get(r.ciiu_division, np.nan)
        if not np.isfinite(bu_s):
            continue
        de = r.d_e_contable if np.isfinite(r.d_e_contable) else 0.0
        t = r.tasa_impuesto_efectiva
        tax = t if np.isfinite(t) and 0 <= t <= 0.6 else 0.35
        fb = U.firm_beta(bu_s, r.sd_roa_enc, r.sd_roa_sector, el["w"], de, tax)
        out.append({"nit": r.nit, "ciiu_division": r.ciiu_division, "anios": r.anios, "sd_roa": r.sd_roa,
                    "sd_roa_enc": r.sd_roa_enc, "sd_roa_sector": r.sd_roa_sector, "beta_contable": r.beta_contable,
                    "d_e": de, "tasa": tax, "beta_u_sector": bu_s, **fb})
    # Contraste: cotizadas colombianas frente al ancla de su industria
    lb = listed[listed["accion"].isin(U.LISTED_DIVISION)].copy()
    lb["ciiu_division"] = lb["accion"].map(U.LISTED_DIVISION)
    sec = panel[panel["anio"] == panel["anio"].max()].groupby("ciiu_division")
    de_sec, tax_sec = sec["d_e_contable"].median(), sec["tasa_impuesto_efectiva"].median()
    lb["beta_u_mercado_col"] = [B.unlever(b, de_sec.get(d, 0.3), tax_sec.get(d, 0.35))
                                for b, d in zip(lb["beta_vasicek"], lb["ciiu_division"])]
    lb["beta_u_ancla_emergentes"] = lb["ciiu_division"].map(anchor)
    el["contraste_cotizadas"] = lb[["accion", "ciiu_division", "beta_vasicek", "beta_u_mercado_col", "beta_u_ancla_emergentes"]]
    return pd.DataFrame(out), el


def main() -> None:
    REPORTS.mkdir(exist_ok=True)
    mi = market_inputs()
    for k in ("inflacion_implicita", "spread_soberano", "prima_pais"):
        mi[k].to_csv(REPORTS / f"{k}_mensual.csv", index=False)
    cs = mi["spreads_corporativos"]
    rec = cs[cs["fecha"] >= cs["fecha"].max() - pd.DateOffset(months=11)]
    by_rating = (rec.groupby("rating")["spread_pp"].agg(["count", "median"])
                 .reindex(C.RATING_ORDER).dropna())
    by_rating.to_csv(REPORTS / "spread_corporativo_por_calificacion.csv")
    colcap = mi["colcap"].set_index("fecha")["colcap"]
    lb = listed_betas(colcap)
    lb.to_csv(REPORTS / "betas_cotizadas_f351.csv", index=False)
    ub, bridge = unlisted_betas(lb)
    ub.to_parquet(PROCESSED / "betas_no_cotizadas.parquet", index=False)
    sector = ub.groupby("ciiu_division").agg(empresas=("nit", "size"), beta_u_sector=("beta_u_sector", "first"),
                                             beta_u_p25=("beta_u", lambda x: x.quantile(0.25)),
                                             beta_u_mediana=("beta_u", "median"),
                                             beta_u_p75=("beta_u", lambda x: x.quantile(0.75)),
                                             beta_l_mediana=("beta_l", "median"))
    sector.to_csv(REPORTS / "betas_no_cotizadas_por_sector.csv")
    bridge["contraste_cotizadas"].to_csv(REPORTS / "contraste_cotizadas_vs_ancla.csv", index=False)
    print("Inflación implícita 10a:", mi["inflacion_implicita"].iloc[-1][["fecha", "inflacion_implicita_10a"]].to_dict())
    print("Spread soberano y CRP:", mi["prima_pais"].iloc[-1].to_dict())
    print(by_rating.round(2).to_string())
    print(f"Cotizadas con beta: {len(lb)} · no cotizadas con beta: {len(ub)}")
    print({k: round(v, 3) for k, v in bridge.items() if isinstance(v, float)}, "sectores:", bridge["sectores"])


if __name__ == "__main__":
    main()
