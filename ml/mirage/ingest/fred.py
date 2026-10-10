"""FRED (Banco de la Reserva Federal de St. Louis): tasa libre de riesgo, inflación implícita y
diferenciales de crédito por calificación.

Los diferenciales ICE BofA por calificación son el dato primario del mercado de bonos que Damodaran
resume una vez al año en su tabla de spreads por rating. Aquí se toman diarios.
Aviso: FRED solo publica los últimos tres años de las series ICE BofA.
"""
from __future__ import annotations

import io

import pandas as pd

from ._http import fetch, save

SERIES = {
    # Tasa libre de riesgo y expectativas de inflación en USD
    "DGS1": "Treasury 1 año (%)", "DGS2": "Treasury 2 años (%)", "DGS3": "Treasury 3 años (%)",
    "DGS5": "Treasury 5 años (%)", "DGS7": "Treasury 7 años (%)",
    "DGS10": "Treasury 10 años, rendimiento a vencimiento constante (%)",
    "DGS20": "Treasury 20 años (%)", "DGS30": "Treasury 30 años (%)",
    "DFII10": "TIPS 10 años, rendimiento real (%)",
    "T10YIE": "Inflación implícita (breakeven) 10 años (%)",
    # Diferenciales ajustados por opciones (OAS) de bonos corporativos en USD por calificación
    "BAMLC0A1CAAA": "ICE BofA OAS corporativo AAA (pp)",
    "BAMLC0A2CAA": "ICE BofA OAS corporativo AA (pp)",
    "BAMLC0A3CA": "ICE BofA OAS corporativo A (pp)",
    "BAMLC0A4CBBB": "ICE BofA OAS corporativo BBB (pp)",
    "BAMLH0A1HYBB": "ICE BofA OAS high yield BB (pp)",
    "BAMLH0A2HYB": "ICE BofA OAS high yield B (pp)",
    "BAMLH0A3HYC": "ICE BofA OAS high yield CCC o inferior (pp)",
    "BAMLEMCBPIOAS": "ICE BofA OAS corporativo de mercados emergentes (pp)",
    "BAMLEMRLCRPILAOAS": "ICE BofA OAS corporativo de América Latina (pp)",
}
# La TRM no está en FRED (la Fed no publica el peso colombiano); se toma de BanRep.

UST_TENORS = {1: "DGS1", 2: "DGS2", 3: "DGS3", 5: "DGS5", 7: "DGS7", 10: "DGS10", 20: "DGS20", 30: "DGS30"}

RATING_SERIES = {"AAA": "BAMLC0A1CAAA", "AA": "BAMLC0A2CAA", "A": "BAMLC0A3CA", "BBB": "BAMLC0A4CBBB",
                 "BB": "BAMLH0A1HYBB", "B": "BAMLH0A2HYB", "CCC": "BAMLH0A3HYC"}


def download(series: list[str] | None = None) -> pd.DataFrame:
    """Devuelve un panel largo: fecha, serie, valor, descripción."""
    frames = []
    for sid in series or list(SERIES):
        path = fetch("fred", "https://fred.stlouisfed.org/graph/fredgraph.csv", f"{sid}.csv", {"id": sid})
        df = pd.read_csv(io.BytesIO(path.read_bytes()), na_values=["."])
        df.columns = ["fecha", "valor"]
        df["fecha"] = pd.to_datetime(df["fecha"])
        df["serie"] = sid
        df["descripcion"] = SERIES.get(sid, "")
        frames.append(df.dropna(subset=["valor"]))
    out = pd.concat(frames, ignore_index=True)
    save(out, "fred_series")
    return out


def spreads_by_rating(panel: pd.DataFrame, window_days: int = 20) -> pd.DataFrame:
    """Diferencial por calificación: último dato y promedio móvil de ``window_days`` días hábiles (pp)."""
    rows = []
    for rating, sid in RATING_SERIES.items():
        s = panel.loc[panel["serie"] == sid].set_index("fecha")["valor"].sort_index()
        if s.empty:
            continue
        rows.append({"rating": rating, "serie": sid, "fecha": s.index[-1].date(),
                     "spread_pp": s.iloc[-1], f"spread_pp_ma{window_days}": s.tail(window_days).mean()})
    return pd.DataFrame(rows)


if __name__ == "__main__":
    p = download()
    print(spreads_by_rating(p).to_string(index=False))
