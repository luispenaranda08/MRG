"""Precios ajustados por dividendos y splits para estimar betas.

PROTOTIPO: usa la API de gráficos de Yahoo Finance. Sus términos no permiten redistribuir precios,
así que aquí solo se usan para calcular betas internamente y validar el método. Antes de publicar
o cobrar hay que pasar a una fuente con licencia (nuam/BVC, EOD Historical Data u otra) sin cambiar
la interfaz de este módulo: ``prices(tickers) -> DataFrame fecha x ticker``.
"""
from __future__ import annotations

import json

import pandas as pd

from ._http import fetch

URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"

# Emisores colombianos líquidos para validar (FinTarget-contexto.md, sección 2) y referencias de mercado
COLOMBIA = {"ECOPETROL.CL": "Ecopetrol", "ISA.CL": "ISA", "GEB.CL": "Grupo Energía Bogotá",
            "CIB": "Bancolombia (ADR)", "EC": "Ecopetrol (ADR)"}
MARKETS = {"ICOLCAP.CL": "ETF COLCAP (COP)", "ILF": "iShares Latin America 40 (USD)",
           "EEM": "iShares MSCI Emerging Markets (USD)", "EMB": "iShares JP Morgan USD EM Bond (USD)",
           "^GSPC": "S&P 500"}


def history(ticker: str, years: int = 5, interval: str = "1d") -> pd.Series:
    path = fetch("yahoo", URL.format(ticker=ticker), f"{ticker.replace('^', '_')}_{interval}_{years}y.json",
                 {"range": f"{years}y", "interval": interval, "events": "div,splits"},
                 headers={"User-Agent": "Mozilla/5.0"})
    res = json.loads(path.read_bytes())["chart"]["result"][0]
    idx = pd.to_datetime(res["timestamp"], unit="s").normalize()
    adj = res["indicators"].get("adjclose", [{}])[0].get("adjclose") or res["indicators"]["quote"][0]["close"]
    s = pd.Series(adj, index=idx, name=ticker, dtype="float64")
    return s[~s.index.duplicated(keep="last")].dropna()


def prices(tickers: list[str], years: int = 5, interval: str = "1d") -> pd.DataFrame:
    return pd.concat([history(t, years, interval) for t in tickers], axis=1).sort_index()
