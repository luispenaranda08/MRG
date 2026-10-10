"""Banco de la República: servicio web SDMX oficial (totoro.banrep.gov.co).

El sitio web y el portal SUAMECA de BanRep están detrás de un control anti-bots; el servicio SDMX
no. Solo responde en SDMX-ML genérico (XML); el CSV devuelve 406.

Limitación conocida: el flujo de TES es mensual y solo en pesos (1, 5 y 10 años). Las curvas en UVR,
necesarias para la inflación implícita diaria, no están en SDMX y se cargan a mano desde el portal
(ver docs/fuentes-primarias.md).
"""
from __future__ import annotations

import xml.etree.ElementTree as ET

import pandas as pd

from ._http import fetch, save

BASE = "https://totoro.banrep.gov.co/nsi-jax-ws/rest/data/ESTAT,{flow},1.0/all/ALL/"
NS = {"g": "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/generic"}

FLOWS = {
    "DF_TES_MONTHLY_HIST": "TES en pesos, tasa cero cupón (fracción), mensual",
    "DF_IBR_DAILY_HIST": "IBR overnight, 1, 3 y 6 meses (%), diaria",
    "DF_CBR_DAILY_HIST": "Tasa de política monetaria (%), diaria",
    "DF_TRM_DAILY_HIST": "TRM, pesos por dólar, diaria",
    "DF_COLCAP_MONTHLY_HIST": "Índice COLCAP, mensual",
}

SUBJECTS = {
    "IRGBRY01": "TES 1 año", "IRGBRY05": "TES 5 años", "IRGBRY10": "TES 10 años",
    "IRIBRM00": "IBR overnight", "IRIBRM01": "IBR 1 mes", "IRIBRM03": "IBR 3 meses", "IRIBRM06": "IBR 6 meses",
    "IRCBRM01": "Tasa de política", "CCSP": "TRM", "SP": "COLCAP",
}


def parse_generic(xml_bytes: bytes, flow: str) -> pd.DataFrame:
    root = ET.fromstring(xml_bytes)
    rows = []
    for series in root.iter(f"{{{NS['g']}}}Series"):
        key = {v.get("id"): v.get("value") for v in series.find("g:SeriesKey", NS)}
        subject = key.get("SUBJECT")
        for obs in series.findall("g:Obs", NS):
            period = obs.find("g:ObsDimension", NS).get("value")
            value = obs.find("g:ObsValue", NS).get("value")
            rows.append({"flujo": flow, "serie": subject, "nombre": SUBJECTS.get(subject, subject),
                         "periodo": period, "valor": float(value), "unidad": key.get("UNIT_MEASURE"),
                         "frecuencia": key.get("FREQ")})
    df = pd.DataFrame(rows)
    df["fecha"] = pd.to_datetime(df["periodo"])
    return df


def download(flows: list[str] | None = None) -> pd.DataFrame:
    frames = []
    for flow in flows or list(FLOWS):
        path = fetch("banrep", BASE.format(flow=flow), f"{flow}.xml")
        frames.append(parse_generic(path.read_bytes(), flow))
    out = pd.concat(frames, ignore_index=True)
    # Unificar a porcentaje las tasas TES (vienen como fracción)
    tes = out["flujo"].eq("DF_TES_MONTHLY_HIST")
    out.loc[tes, "valor"] = out.loc[tes, "valor"] * 100
    out.loc[tes, "unidad"] = "%"
    save(out, "banrep_series")
    return out


if __name__ == "__main__":
    d = download()
    print(d.sort_values("fecha").groupby("nombre").tail(1)[["nombre", "fecha", "valor"]].to_string(index=False))
