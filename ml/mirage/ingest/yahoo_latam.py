"""INTERNO · NO PUBLICABLE. Banco de pruebas de betas de mercado de empresas latinoamericanas con
datos de Yahoo Finance (vía ``yfinance``).

Los términos de Yahoo no permiten uso comercial ni redistribuir sus datos ni datos derivados. Este
módulo solo sirve para investigación interna: medir si el ancla de Damodaran (mercados emergentes)
representa a las empresas de la región y validar el método de Mirage. Ninguna cifra de aquí se
publica; los archivos que produce llevan el prefijo ``INTERNO_``.

Universo: acciones nacionales (no fondos, no BDR ni listados de empresas extranjeras) de Brasil (B3),
México (BMV), Chile (Bolsa de Santiago), Colombia (BVC) y Perú (BVL), con capitalización mayor a
US$ 50 millones. Betas como Damodaran: promedio de la regresión semanal a 2 años y mensual a 5 años,
en dólares, contra el ETF iShares MSCI Emerging Markets (EEM); además Dimson semanal.
"""
from __future__ import annotations

import json
import re
import time

import numpy as np
import pandas as pd

from ._http import PROCESSED, RAW

PAISES = {"Brazil": "BRL=X", "Mexico": "MXN=X", "Chile": "CLP=X", "Colombia": "COP=X", "Peru": "PEN=X"}
BOLSAS = ["SAO", "MEX", "SGO", "BVC", "LMA", "LIM"]
OUT = RAW / "yahoo"


def _screen(exchange: str) -> list[dict]:
    import yfinance as yf
    from yfinance import EquityQuery as Q

    out, off = [], 0
    while True:
        try:
            r = yf.screen(Q("eq", ["exchange", exchange]), offset=off, size=250, sortField="intradaymarketcap", sortAsc=False)
        except Exception:
            return out
        q = r.get("quotes", [])
        out += q
        if len(q) < 250 or off > 3000:
            return out
        off += 250


def candidatos() -> pd.DataFrame:
    rows = []
    for ex in BOLSAS:
        for q in _screen(ex):
            rows.append({"symbol": q.get("symbol"), "exchange": ex, "nombre": q.get("longName") or q.get("shortName"),
                         "tipo": q.get("quoteType"), "mcap": q.get("marketCap")})
    df = pd.DataFrame(rows).drop_duplicates("symbol")
    df = df[df["tipo"] == "EQUITY"]
    # Brasil: fuera fondos (11), BDR de empresas extranjeras (32–35, 39) y recibos
    sa = df["symbol"].str.endswith(".SA")
    df = df[~(sa & df["symbol"].str.contains(r"(?:11|3[2-5]|39)\.SA$", regex=True))]
    return df


def info(symbols: list[str], pausa: float = 0.2) -> pd.DataFrame:
    import yfinance as yf

    rows = []
    for s in symbols:
        try:
            i = yf.Ticker(s).info
        except Exception:
            continue
        rows.append({"symbol": s, "pais": i.get("country"), "sector": i.get("sector"), "industria": i.get("industry"),
                     "nombre": i.get("longName"), "moneda": i.get("currency"), "mcap": i.get("marketCap"),
                     "deuda_total": i.get("totalDebt"), "caja": i.get("totalCash"),
                     "moneda_financiera": i.get("financialCurrency"), "volumen_prom": i.get("averageVolume")})
        time.sleep(pausa)
    return pd.DataFrame(rows)


# El buscador de Yahoo no lista la Bolsa de Valores de Lima: emisoras principales agregadas a mano
PERU = ["ALICORC1.LM", "FERREYC1.LM", "UNACEMC1.LM", "CPACASC1.LM", "CVERDEC1.LM", "VOLCABC1.LM", "MINSURI1.LM",
        "BACKUSI1.LM", "ENGEPEC1.LM", "LUSURC1.LM", "INRETC1.LM", "AENZAC1.LM", "SIDERC1.LM", "CORAREI1.LM",
        "BBVAC1.LM", "CREDITC1.LM", "SCOTIAC1.LM", "ENDISPC1.LM", "BVN", "BAP", "IFS", "SCCO", "PML.LM",
        "HIDRA2C1.LM", "CASAGRC1.LM", "POMALCC1.LM", "LAREDOC1.LM", "TELEFBC1.LM", "MOROCOI1.LM", "PODERC1.LM"]


def universo(min_mcap_usd: float = 50e6) -> pd.DataFrame:
    """Universo con información básica, deduplicado por empresa (se queda la clase más líquida)."""
    c = candidatos()
    inf = info(list(dict.fromkeys(c["symbol"].tolist() + PERU)))
    u = inf[inf["pais"].isin(PAISES)].copy()
    fx = fx_actual()
    u["mcap_usd"] = u["mcap"] / u["moneda"].map(fx)
    u = u[u["mcap_usd"] >= min_mcap_usd]
    u["empresa"] = u["nombre"].str.upper().str.replace(r"[^A-Z0-9 ]", "", regex=True).str.strip()
    u = u.sort_values("volumen_prom", ascending=False).drop_duplicates("empresa")
    OUT.mkdir(parents=True, exist_ok=True)
    u.to_parquet(PROCESSED / "INTERNO_yahoo_universo.parquet", index=False)
    return u


def fx_actual() -> dict:
    import yfinance as yf

    m = {"BRL": "BRL=X", "MXN": "MXN=X", "CLP": "CLP=X", "COP": "COP=X", "PEN": "PEN=X"}
    out = {"USD": 1.0}
    for cur, t in m.items():
        h = yf.Ticker(t).history(period="5d")["Close"]
        out[cur] = float(h.iloc[-1])
    return out


def precios(symbols: list[str], extra=("EEM", "ACWI", "BRL=X", "MXN=X", "CLP=X", "COP=X", "PEN=X"), years: int = 5) -> pd.DataFrame:
    """Precios de cierre ajustados (dividendos y splits), semanales, en moneda local."""
    import yfinance as yf

    tick = list(dict.fromkeys(list(symbols) + list(extra)))
    frames = []
    for i in range(0, len(tick), 100):
        d = yf.download(tick[i:i + 100], period=f"{years}y", interval="1wk", auto_adjust=True, progress=False, threads=True)
        frames.append(d["Close"])
    px = pd.concat(frames, axis=1)
    px = px.loc[:, ~px.columns.duplicated()]
    px.to_parquet(PROCESSED / "INTERNO_yahoo_precios_semanales.parquet")
    return px
