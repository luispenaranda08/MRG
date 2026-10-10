"""Superfinanciera, Formato 351: portafolio de los fondos de pensiones obligatorias y cesantías,
título por título, cada mes desde enero de 2016 (datos.gov.co ``ur2p-h4yf``).

Los fondos de pensiones tienen buena parte de la deuda pública y corporativa colombiana y de las
acciones locales, y valoran cada título con el precio y la tasa del proveedor de precios oficial.
De este reporte salen, con datos abiertos y de fuente primaria:

- TES en pesos (TSTF) y en UVR (TSUV): precio sucio del proveedor y días al vencimiento → curvas e
  inflación implícita mensual.

Ojo: ``tasa_de_negociacion`` es la tasa a la que cada fondo compró el título, no la vigente. La tasa
de mercado se recalcula desde el precio sucio de valoración (``mirage.wacc.curves.ytm``).
- Bonos de deuda externa de la Nación (TDPE): rendimiento en USD → spread soberano propio frente al
  Tesoro de EE. UU. del mismo plazo, sin CDS de pago.
- Bonos corporativos (BOENVS, BOEVS) con calificación, calificadora y CIIU del emisor → spread
  corporativo local en pesos por calificación.
- Acciones colombianas de alta, media y baja bursatilidad con su precio de valoración → retornos
  mensuales para betas (precio sin dividendos: ver ``equity_prices``).

Un mismo título aparece una vez por fondo; como el precio y la tasa vienen del proveedor de precios,
se deduplica por fecha y nemotécnico.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from ._http import fetch, save

DATASET = "https://www.datos.gov.co/resource/ur2p-h4yf.json"
PAGE = 50_000

CLASSES = {
    "TSTF": "TES tasa fija en pesos",
    "TSUV": "TES en UVR",
    "TDPE": "Deuda pública externa de la Nación",
    "BOENVS": "Bonos de entidades no vigiladas",
    "BOEVS": "Bonos de entidades vigiladas",
    "AAENVS": "Acciones alta bursatilidad, no vigiladas",
    "AAEVS": "Acciones alta bursatilidad, vigiladas",
    "AMENVS": "Acciones media bursatilidad, no vigiladas",
    "AMEVS": "Acciones media bursatilidad, vigiladas",
    "ABENVS": "Acciones baja bursatilidad, no vigiladas",
    "ABEVS": "Acciones baja bursatilidad, vigiladas",
}
EQUITY = [c for c in CLASSES if c.startswith("A")]

FIELDS = ("fecha_de_corte, clase_inversion, nemotecnico, razon_social_emisor, nro_id_emisor, codigo_ciiu, "
          "codigo_moneda, descripcion_tasa_facial_titulo, valor_tasa_o_spread, fecha_vencim_titulo, "
          "d_as_al_v_to, tasa_de_negociacion, precio, nombre_calific_t_tulo_o_emisor, "
          "nombre_entidad_calificadora, nombre_indice_bursatilidad, nombre_period_pago_rendim")


def download(classes: list[str] | None = None, since: str = "2016-01-01") -> pd.DataFrame:
    """Descarga las clases pedidas, una fila por fecha y título (deduplicado entre fondos)."""
    classes = classes or list(CLASSES)
    cls = ",".join(f"'{c}'" for c in classes)
    # Agrupar en el servidor deduplica entre fondos: precio y tasa son los del proveedor de precios
    group = FIELDS.replace("tasa_de_negociacion, ", "")
    where = f"fecha_de_corte >= '{since}' and clase_inversion in ({cls})"
    rows, offset = [], 0
    while True:
        params = {"$select": f"{group}, avg(tasa_de_negociacion) as tasa_de_negociacion, count(*) as fondos", "$where": where, "$group": group,
                  "$order": "fecha_de_corte, nemotecnico", "$limit": PAGE, "$offset": offset}
        path = fetch("superfinanciera", DATASET, f"f351_{'-'.join(classes)[:40]}_{offset}.json", params)
        chunk = json.loads(path.read_bytes())
        rows.extend(chunk)
        if len(chunk) < PAGE:
            break
        offset += PAGE
    df = pd.DataFrame(rows)
    df["fecha"] = pd.to_datetime(df.pop("fecha_de_corte"))
    for c in ("valor_tasa_o_spread", "d_as_al_v_to", "tasa_de_negociacion", "precio", "fondos"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["anios_al_vto"] = df["d_as_al_v_to"] / 365.25
    df = df.rename(columns={"tasa_de_negociacion": "tasa_compra", "nombre_period_pago_rendim": "periodicidad",
                            "nombre_calific_t_tulo_o_emisor": "calificacion",
                            "nombre_entidad_calificadora": "calificadora",
                            "descripcion_tasa_facial_titulo": "tasa_facial",
                            "nombre_indice_bursatilidad": "bursatilidad"})
    # Un título sin nemotécnico ("N/A") se identifica por emisor, cupón y vencimiento
    na = df["nemotecnico"].isin(["N/A", "", None])
    df.loc[na, "nemotecnico"] = (df.loc[na, "razon_social_emisor"].str[:12] + "_" +
                                 df.loc[na, "valor_tasa_o_spread"].astype(str) + "_" +
                                 df.loc[na, "fecha_vencim_titulo"].str[:10])
    df = (df.sort_values("fondos", ascending=False)
            .drop_duplicates(["fecha", "clase_inversion", "nemotecnico"]))
    return df.sort_values(["clase_inversion", "fecha", "anios_al_vto"]).reset_index(drop=True)


def equity_prices(df: pd.DataFrame) -> pd.DataFrame:
    """Precios mensuales por nemotécnico (fecha x acción).

    El precio es el de valoración al cierre de mes y no incluye dividendos: el retorno calculado
    subestima el retorno total en el mes del pago. Para la beta el efecto es pequeño (el dividendo
    no covaría con el mercado), pero se documenta.
    """
    eq = df[df["clase_inversion"].isin(EQUITY) & (df["precio"] > 0)]
    return eq.pivot_table(index="fecha", columns="nemotecnico", values="precio", aggfunc="median").sort_index()


def run(since: str = "2016-01-01") -> dict[str, pd.DataFrame]:
    out = {}
    for name, classes in {"f351_tes": ["TSTF", "TSUV"], "f351_externa": ["TDPE"],
                          "f351_bonos": ["BOENVS", "BOEVS"], "f351_acciones": EQUITY}.items():
        d = download(classes, since)
        save(d, name)
        out[name] = d
    return out


if __name__ == "__main__":
    o = run()
    for k, v in o.items():
        print(k, v.shape, v["fecha"].min().date(), v["fecha"].max().date(), v["nemotecnico"].nunique(), "títulos")
