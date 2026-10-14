"""Opciones de la metodología 1.1 del Ke (apagadas por defecto: no cambian nada publicado).

Cada opción viene de una práctica documentada en otro país o en la literatura, y se puede activar
por separado para medir su efecto antes de adoptarla:

- ``kd_plazo_largo``: Kd solo con créditos a más de un año. El 30 % del monto del formato 88 son
  créditos a menos de 30 días (sobregiros, cartera rotativa) al ~18,6 %; un Ke de largo plazo debe
  compararse con un Kd del mismo horizonte.
- ``prima_tamano``: diferencial de tasa de crédito frente a la gran empresa, en celdas idénticas de
  sector, plazo, garantía y modalidad (formato 88). Se usa como piso de la prima de tamaño del
  patrimonio (el spread de crédito contiene riesgo sistemático: Campello, Chen y Zhang, 2008;
  Friewald, Wagner y Zechner, 2014).
- ``beta_deuda``: re-apalancamiento con beta de la deuda en lugar de Hamada con βd = 0, como la CNE
  de Chile (2026-2029, Miles-Ezzell con beta de deuda por spread) y Ofgem (RIIO-3, βd 0,075).
  βd = spread corporativo sobre la curva soberana en USD / ERP, recortada a [0, 0,30].
- ``ancla``: grupo de Damodaran del que sale la βu: ``emerg`` (v1.0), ``global`` o ``us``; ``banda``
  devuelve las tres para publicar la incertidumbre del ancla.

Uso: ``tabla(opciones)`` devuelve, por sector y tamaño, βL, Ke, Kd y WACC con las opciones pedidas,
a partir del corte publicado y de los datos procesados del motor.
"""
from __future__ import annotations

import json
from dataclasses import dataclass

import numpy as np
import pandas as pd

from mirage.ingest import damodaran
from mirage.ingest._http import PROCESSED, ROOT

TARIFA = 0.35
TAMANOS = ["Micro", "Pequeña", "Mediana", "Grande"]
TAM_F88 = {"Micro": "Microempresa", "Pequeña": "Pequeña empresa", "Mediana": "Mediana empresa", "Grande": "Gran empresa"}
PLAZOS_LARGOS = ["Más de 1 año y hasta 3 años", "Más de 3 años y hasta 5 años", "Más de 5 años y hasta 7 años", "A más de 7 años"]
BETA_DEUDA_MAX = 0.30


@dataclass(frozen=True)
class Opciones:
    kd_plazo_largo: bool = False
    prima_tamano: bool = False
    beta_deuda: bool = False
    ancla: str = "emerg"          # emerg | global | us
    meses_kd: int = 12


V1_0 = Opciones()
PROPUESTA_1_1 = Opciones(kd_plazo_largo=True, prima_tamano=True, beta_deuda=True)


# --- Datos ---------------------------------------------------------------------------------------

def _f88(meses: int) -> pd.DataFrame:
    t = pd.read_parquet(PROCESSED / "superfinanciera_tasas_detalle.parquet")
    t = t[(t["modalidad"] != "Comercial tesoreria") & (t["mes"] > t["mes"].max() - pd.DateOffset(months=meses))]
    return t.assign(tm=t["tasa_ea"] * t["monto"])


def kd(meses: int = 12, plazo_largo: bool = False) -> tuple[dict, dict]:
    """Kd ponderado por monto (fracción), por división y por (división, tamaño F88)."""
    t = _f88(meses)
    if plazo_largo:
        t = t[t["plazo"].isin(PLAZOS_LARGOS)]
    a = t.groupby("ciiu_division")[["tm", "monto"]].sum()
    b = t.groupby(["ciiu_division", "tamano"])[["tm", "monto"]].sum()
    return (a["tm"] / a["monto"] / 100).to_dict(), (b["tm"] / b["monto"] / 100).to_dict()


def prima_tamano(meses: int = 12) -> dict:
    """Diferencial (fracción) frente a la gran empresa en celdas idénticas de división, plazo,
    garantía y modalidad, ponderado por el monto del tamaño menor."""
    t = _f88(meses)
    k = ["ciiu_division", "plazo", "garantia", "modalidad"]
    p = t.groupby(k + ["tamano"])[["tm", "monto"]].sum()
    tasa, monto = (p["tm"] / p["monto"]).unstack("tamano"), p["monto"].unstack("tamano")
    out = {"Grande": 0.0}
    for tam in ["Micro", "Pequeña", "Mediana"]:
        c = TAM_F88[tam]
        ok = tasa[c].notna() & tasa["Gran empresa"].notna()
        out[tam] = float(np.average((tasa[c] - tasa["Gran empresa"])[ok], weights=monto[c][ok])) / 100
    return out


def anclas_bu() -> pd.DataFrame:
    """βu corregida por caja de la industria equivalente en los tres grupos de Damodaran."""
    def lee(nombre):
        raw = pd.read_excel(damodaran._get(nombre), sheet_name="Industry Averages", header=None)
        h = raw.index[raw[0].astype(str).str.startswith("Industry Name")][0]
        d = raw.iloc[h + 1:, :8].copy()
        d.columns = ["ind", "n", "beta", "de", "t", "bu", "cash", "bu_caja"]
        d = d.dropna(subset=["ind"])
        d = d[~d["ind"].astype(str).str.startswith("Total")].set_index("ind")
        return pd.to_numeric(d["bu_caja"], errors="coerce"), pd.to_numeric(d["n"], errors="coerce")
    mp = pd.read_csv(ROOT / "data" / "mappings" / "ciiu_damodaran.csv", dtype=str).set_index("ciiu_division")
    out = pd.DataFrame({"industria": mp["industria_damodaran"]})
    for g, f in [("emerg", "betaemerg.xls"), ("global", "betaGlobal.xls"), ("us", "betas.xls")]:
        bu, n = lee(f)
        out[f"bu_{g}"], out[f"n_{g}"] = out["industria"].map(bu), out["industria"].map(n)
    return out


# --- Fórmulas ------------------------------------------------------------------------------------

def fisher(r, pi_a, pi_b):
    return (1 + r) * (1 + pi_a) / (1 + pi_b) - 1


def beta_deuda(kd_cop: float, par: dict) -> float:
    """βd = (Kd en USD − Rf − spread soberano) / ERP, recortada a [0, 0,30].

    El exceso sobre la curva soberana en USD es el spread corporativo; dividirlo por la prima de
    mercado da la beta implícita de la deuda (como la CNE de Chile con spreads por calificación).
    Parte del spread es pérdida esperada y no riesgo sistemático: por eso el tope.
    """
    kd_usd = fisher(kd_cop, par["inflacion_usd"], par["inflacion_cop"])
    spread = kd_usd - par["rf_usd"] - par["spread_soberano"]
    return float(np.clip(spread / par["erp_maduro"], 0, BETA_DEUDA_MAX))


def reapalancar(bu: float, de: float, bd: float = 0.0, t: float = TARIFA) -> float:
    """Hamada si βd = 0; con βd > 0, la forma de Hamada con beta de deuda:
    βL = βu + (βu − βd)(1 − t) D/E. Con t = 0 es Harris-Pringle (≈ Miles-Ezzell anual)."""
    return bu + (bu - bd) * (1 - t) * de


# --- Tabla con opciones --------------------------------------------------------------------------

def tabla(o: Opciones = V1_0, api_dir=None) -> pd.DataFrame:
    api_dir = api_dir or ROOT.parent / "web" / "public" / "api" / "v1"
    par = {k: c.get("v") for k, c in json.loads((api_dir / "parametros.json").read_text())["parametros"].items()}
    sectores = json.loads((api_dir / "sectores.json").read_text())["sectores"]
    kd_div, kd_tam = kd(o.meses_kd, o.kd_plazo_largo)
    prima = prima_tamano(o.meses_kd) if o.prima_tamano else {t: 0.0 for t in TAMANOS}
    anc = anclas_bu() if o.ancla != "emerg" else None
    filas = []
    for s in sectores:
        div = s["ciiu_division"]
        bu_pub = s["beta_desapalancada"]["v"]
        bu = bu_pub if anc is None else float(anc.loc[div, f"bu_{o.ancla}"])
        for tam in ["Sector"] + TAMANOS:
            if tam == "Sector":
                de, k = s["de"]["v"], kd_div.get(div)
            else:
                pt = s["por_tamano"].get(tam, {})
                if (pt.get("de") or {}).get("v") is None:
                    continue
                de, k = pt["de"]["v"], kd_tam.get((div, TAM_F88[tam]))
            k = k if k is not None else s["kd"]["v"]
            bd = beta_deuda(k, par) if o.beta_deuda else 0.0
            bl = reapalancar(bu, de, bd)
            ke_usd = par["rf_usd"] + bl * par["erp_maduro"] + par["crp"]
            ke = fisher(ke_usd, par["inflacion_cop"], par["inflacion_usd"]) + (prima.get(tam, 0.0) if tam != "Sector" else 0.0)
            w = de / (1 + de)
            filas.append({"ciiu": div, "sector": s["nombre"], "tamano": tam, "bu": bu, "bd": bd, "de": de,
                          "beta_l": bl, "kd": k, "ke": ke, "wacc": (1 - w) * ke + w * k * (1 - TARIFA)})
    return pd.DataFrame(filas)
