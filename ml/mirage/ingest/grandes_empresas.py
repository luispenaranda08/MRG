"""Supersociedades: las 10.000 empresas más grandes del país, 2021–2025 (datos.gov.co ``6cat-2gcs``).

A diferencia del panel NIIF, incluye empresas de todos los supervisores (Superfinanciera,
Superservicios, Supersociedades), es decir, a las cotizadas y a los servicios públicos que no reportan
estados NIIF a Supersociedades. Trae ingresos, utilidad, activos, pasivos y patrimonio (en billones de
pesos), sin la deuda financiera separada: el D/E que se obtiene es pasivo total / patrimonio y sirve
como contraste de representatividad, no como D/E financiero.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from ._http import fetch, save

DATASET = "https://www.datos.gov.co/resource/6cat-2gcs.json"
MONEY = ["ingresos_operacionales", "ganancia_p_rdida", "total_activos", "total_pasivos", "total_patrimonio"]


def _money(s: pd.Series) -> pd.Series:
    """'$ 100.59' (billones de pesos, punto decimal) → número; maneja negativos '($ 1.20)' y '-$ 1.20'."""
    t = s.astype(str).str.strip()
    neg = t.str.contains(r"^\(|^-", regex=True)
    v = pd.to_numeric(t.str.replace(r"[^\d.]", "", regex=True), errors="coerce")
    return np.where(neg, -v, v)


def download() -> pd.DataFrame:
    path = fetch("supersociedades", DATASET, "grandes_empresas.json", {"$limit": 100_000})
    df = pd.DataFrame(json.loads(path.read_bytes()))
    for c in MONEY:
        df[c] = _money(df[c])
    df["anio"] = pd.to_numeric(df.pop("a_o_de_corte")).astype(int)
    df["nit"] = df["nit"].str.split(".").str[0]
    df["ciiu"] = df["ciiu"].astype(str).str.zfill(4)
    df["ciiu_division"] = df["ciiu"].str[:2]
    df = df.rename(columns={"raz_n_social": "razon_social", "ganancia_p_rdida": "utilidad", "regi_n": "region"})
    df["pasivo_patrimonio"] = np.where(df["total_patrimonio"] > 0, df["total_pasivos"] / df["total_patrimonio"], np.nan)
    df["roa"] = np.where(df["total_activos"] > 0, df["utilidad"] / df["total_activos"], np.nan)
    save(df, "grandes_empresas")
    return df


if __name__ == "__main__":
    d = download()
    print(d.shape, d.groupby(["anio", "supervisor"]).size().unstack().to_string())
