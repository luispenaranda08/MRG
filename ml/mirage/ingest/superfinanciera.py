"""Superintendencia Financiera: tasas activas efectivamente cobradas (formato 88), vía datos.gov.co.

Dataset ``w9zh-vetq`` (histórico desde jul-2022, actualización semanal). Cada fila es un grupo de
desembolsos de una entidad en una semana con el CIIU del deudor, el tamaño de la empresa, el plazo,
la garantía y el monto. Ponderar la tasa por monto da el costo de la deuda bancaria nueva por
sector y tamaño: un Kd observado, no sintético.

La agregación se hace en el servidor (SoQL) para no descargar ~100 millones de filas.
"""
from __future__ import annotations

import datetime as dt
import json

import pandas as pd

from ._http import fetch, save

DATASET = "https://www.datos.gov.co/resource/w9zh-vetq.json"
COMERCIALES = ("Comercial ordinario", "Comercial preferencial o corporativo", "Comercial tesoreria")
PAGE = 50_000


def _query(select: str, where: str, group: str, tag: str) -> pd.DataFrame:
    rows, offset = [], 0
    while True:
        params = {"$select": select, "$where": where, "$group": group, "$order": group,
                  "$limit": PAGE, "$offset": offset}
        path = fetch("superfinanciera", DATASET, f"{tag}_{offset}.json", params)
        chunk = json.loads(path.read_bytes())
        rows.extend(chunk)
        if len(chunk) < PAGE:
            break
        offset += PAGE
    return pd.DataFrame(rows)


def rates_detail(since: str = "2022-07-01") -> pd.DataFrame:
    """Historia completa (desde jul-2022) por mes, modalidad, tamaño, plazo, garantía y división CIIU.

    La división CIIU (2 dígitos) se obtiene en el servidor con ``substring`` para que la tabla sea
    manejable; el detalle a 4 dígitos está en ``rates_by_sector``.
    """
    tipos = ",".join(f"'{t}'" for t in COMERCIALES)
    select = ("date_trunc_ym(fecha_corte) as mes, tipo_de_cr_dito as modalidad, tama_o_de_empresa as tamano, "
              "plazo_de_cr_dito as plazo, tipo_de_garant_a as garantia, substring(codigo_ciiu, 1, 2) as ciiu_division, "
              "sum(tasa_efectiva_promedio*montos_desembolsados) as tasa_x_monto, "
              "sum(montos_desembolsados) as monto, sum(numero_de_creditos) as creditos")
    where = (f"fecha_corte >= '{since}' and tipo_de_persona = 'Jurídica' "
             f"and tipo_de_cr_dito in ({tipos}) and montos_desembolsados > 0")
    df = _query(select, where, "mes, modalidad, tamano, plazo, garantia, ciiu_division", f"tasas_detalle_{since[:7]}")
    for c in ("tasa_x_monto", "monto", "creditos"):
        df[c] = pd.to_numeric(df[c])
    df["mes"] = pd.to_datetime(df["mes"])
    df["tasa_ea"] = df["tasa_x_monto"] / df["monto"]
    df = df.drop(columns="tasa_x_monto")
    save(df, "superfinanciera_tasas_detalle")
    return df


def rates_by_sector(months: int = 24, since: dt.date | None = None) -> pd.DataFrame:
    """Tasa efectiva anual ponderada por monto, por mes, modalidad, tamaño y CIIU (4 dígitos).

    Solo personas jurídicas y modalidades comerciales.
    """
    since = since or (dt.date.today().replace(day=1) - pd.DateOffset(months=months)).date()
    tipos = ",".join(f"'{t}'" for t in COMERCIALES)
    select = ("date_trunc_ym(fecha_corte) as mes, tipo_de_cr_dito as modalidad, "
              "tama_o_de_empresa as tamano, codigo_ciiu as ciiu, "
              "sum(tasa_efectiva_promedio*montos_desembolsados) as tasa_x_monto, "
              "sum(montos_desembolsados) as monto, sum(numero_de_creditos) as creditos")
    where = (f"fecha_corte >= '{since.isoformat()}' and tipo_de_persona = 'Jurídica' "
             f"and tipo_de_cr_dito in ({tipos}) and montos_desembolsados > 0")
    df = _query(select, where, "mes, modalidad, tamano, ciiu", f"tasas_ciiu_{since:%Y%m}")
    for c in ("tasa_x_monto", "monto", "creditos"):
        df[c] = pd.to_numeric(df[c])
    df["mes"] = pd.to_datetime(df["mes"])
    df["tasa_ea"] = df["tasa_x_monto"] / df["monto"]
    df["ciiu"] = df["ciiu"].astype(str).str.zfill(4)
    df["ciiu_division"] = df["ciiu"].str[:2]
    df = df.drop(columns="tasa_x_monto")
    save(df, "superfinanciera_tasas_ciiu")
    return df


def weighted(df: pd.DataFrame, by: list[str]) -> pd.DataFrame:
    """Reagrega la tasa ponderada por monto a cualquier nivel (división CIIU, tamaño, mes...)."""
    g = df.assign(tm=df["tasa_ea"] * df["monto"]).groupby(by, as_index=False)
    out = g.agg(tm=("tm", "sum"), monto=("monto", "sum"), creditos=("creditos", "sum"))
    out["tasa_ea"] = out["tm"] / out["monto"]
    return out.drop(columns="tm")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "detalle":
        d = rates_detail()
        print(d.shape, d["mes"].min(), d["mes"].max(), d["ciiu_division"].nunique(), "divisiones")
        raise SystemExit
    d = rates_by_sector(months=6)
    print(weighted(d, ["modalidad", "tamano"]).to_string(index=False))
