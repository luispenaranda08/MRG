"""Damodaran Online: referencia anual para contrastar, no insumo principal.

Qué usa Damodaran como fuente primaria (según sus propios archivos, corte enero 2026):
- Calificación soberana: Moody's (equivalencia desde S&P cuando Moody's no califica).
- Spread por calificación soberana: promedio de CDS soberanos a 10 años por calificación (Bloomberg).
- Volatilidad relativa acciones/bonos: índice S&P de mercados emergentes frente a un ETF de bonos
  soberanos emergentes de iShares.
- Tabla de cobertura de intereses → rating → spread corporativo: estimación propia a partir de
  rendimientos de bonos corporativos por calificación.
- Betas por industria: regresiones de dos y cinco años sobre su universo global de empresas.

FinTarget reconstruye cada pieza desde la fuente primaria disponible (FRED, BanRep, Superfinanciera,
Supersociedades) y usa estos archivos solo para medir la diferencia.
"""
from __future__ import annotations

import pandas as pd

from ._http import fetch, save

BASE = "https://pages.stern.nyu.edu/~adamodar/pc/datasets/"


def _get(name: str):
    return fetch("damodaran", BASE + name, name)


def industry_betas(region: str = "emerg") -> pd.DataFrame:
    """Betas por industria. ``region``: 'emerg' (mercados emergentes) o '' (EE. UU.)."""
    path = _get(f"beta{region}.xls" if region else "betas.xls")
    raw = pd.read_excel(path, sheet_name="Industry Averages", header=None)
    head = raw.index[raw[0].astype(str).str.startswith("Industry Name")][0]
    updated = raw.iloc[0, 1]
    df = raw.iloc[head + 1:, :11].copy()
    df.columns = ["industria", "empresas", "beta", "d_e", "tasa_impuesto", "beta_u",
                  "caja_valor_firma", "beta_u_ajustada_caja", "hilo", "sd_patrimonio", "sd_ebit"]
    df = df.dropna(subset=["industria", "beta"])
    df = df[~df["industria"].astype(str).str.startswith("Total")]
    for c in df.columns[1:]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["region"] = region or "us"
    df["corte_damodaran"] = pd.to_datetime(updated).date()
    save(df, f"damodaran_betas_{region or 'us'}")
    return df.reset_index(drop=True)


def synthetic_rating_table(kind: str = "small") -> pd.DataFrame:
    """Tabla cobertura de intereses → calificación → spread (fracción).

    ``kind``: 'large' (no financieras grandes), 'small' (pequeñas y riesgosas, <5.000 MUSD),
    'financial' (servicios financieros) o 'infra' (infraestructura). Para empresas colombianas que
    no cotizan la tabla aplicable es 'small'.
    """
    raw = pd.read_excel(_get("ratings.xls"), sheet_name=0, header=None)
    starts = {"large": (18, 0), "financial": (18, 5), "small": (37, 0), "infra": (55, 0)}
    r0, c0 = starts[kind]
    rows = []
    for i in range(r0, r0 + 15):
        lo, hi, rating, spread = raw.iloc[i, c0:c0 + 4] if c0 == 0 else raw.iloc[i, [5, 6, 7, 8]]
        if pd.isna(rating):
            break
        rows.append({"cobertura_desde": float(lo), "cobertura_hasta": float(hi),
                     "rating": str(rating), "spread": float(spread)})
    df = pd.DataFrame(rows)
    if len(df) != 15:
        raise ValueError(f"ratings.xls cambió de formato: {len(df)} filas para '{kind}'")
    return df


def country(name: str = "Colombia") -> dict:
    """Fila del país en 'ERPs by country' de ctryprem.xlsx."""
    raw = pd.read_excel(_get("ctryprem.xlsx"), sheet_name="ERPs by country", header=None)
    row = raw[raw[0].astype(str).str.strip().eq(name)].iloc[0]
    return {
        "pais": name,
        "rating_moodys": row[2],
        "spread_soberano_rating": float(row[3]),
        "erp_total_rating": float(row[4]),
        "crp_rating": float(row[5]),
        "cds_neto": float(row[6]),
        "erp_total_cds": float(row[7]),
        "crp_cds": float(row[8]),
    }


if __name__ == "__main__":
    print(country())
    print(synthetic_rating_table("small").to_string(index=False))
    print(industry_betas().head(10).to_string(index=False))
