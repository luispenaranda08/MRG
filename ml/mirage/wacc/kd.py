"""Costo de la deuda (Kd) por tres vías que se contrastan entre sí.

1. Sintético: cobertura de intereses → calificación (tabla de Damodaran para empresas pequeñas) →
   spread. El spread se toma del mercado (ICE BofA OAS por calificación, FRED), no de la tabla anual.
   Kd(USD) = Rf + spread soberano de deuda + spread corporativo.
2. Observado bancario: tasa efectiva anual ponderada por monto de los créditos comerciales nuevos a
   personas jurídicas, por división CIIU y tamaño (Superfinanciera, formato 88). Es en pesos.
3. Implícito contable: costos financieros / deuda financiera promedio (Supersociedades). Mezcla deuda
   vieja y nueva e incluye otros gastos financieros; sirve de rango, no de punto.

Las tres vías miden objetos distintos (tasa marginal en USD, tasa marginal bancaria en COP, tasa
histórica promedio en COP). La metodología publica la sintética y muestra las otras como contraste.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

# Equivalencia entre las calificaciones de la tabla de Damodaran y las series ICE BofA de FRED.
# Por debajo de CCC no hay serie: se usa CCC y se marca.
RATING_TO_BUCKET = {
    "Aaa/AAA": "AAA", "Aa2/AA": "AA", "A1/A+": "A", "A2/A": "A", "A3/A-": "A",
    "Baa2/BBB": "BBB", "Ba1/BB+": "BB", "Ba2/BB": "BB", "B1/B+": "B", "B2/B": "B", "B3/B-": "B",
    "Caa/CCC": "CCC", "Ca2/CC": "CCC", "C2/C": "CCC", "D2/D": "CCC",
}


def synthetic_rating(coverage: float, table: pd.DataFrame) -> tuple[str, float]:
    """Calificación y spread de la tabla para una cobertura EBIT/intereses.

    Cobertura no definida (sin intereses) devuelve la mejor calificación solo si el EBIT es positivo;
    eso se decide antes de llamar a esta función, aquí NaN devuelve (None, NaN).
    """
    if coverage is None or np.isnan(coverage):
        return None, np.nan
    # Último tramo cuyo límite inferior no supera la cobertura: evita los huecos de redondeo de la
    # tabla original (0,499999 → 0,5) sin que un valor caiga en dos tramos.
    t = table.sort_values("cobertura_desde")
    r = t[t["cobertura_desde"] <= coverage].iloc[-1]
    return r["rating"], float(r["spread"])


def market_spread(rating: str, spreads: pd.DataFrame, col: str = "spread_pp_ma20") -> float:
    """Spread de mercado (fracción) para una calificación de la tabla, desde ``fred.spreads_by_rating``."""
    bucket = RATING_TO_BUCKET.get(rating)
    if bucket is None:
        return np.nan
    v = spreads.loc[spreads["rating"] == bucket, col]
    return float(v.iloc[0]) / 100 if len(v) else np.nan


def kd_usd(rf: float, sovereign_debt_spread: float, corporate_spread: float) -> float:
    """Kd antes de impuestos en USD. Todas las entradas en fracción."""
    return rf + sovereign_debt_spread + corporate_spread


def to_cop(rate_usd: float, infl_cop: float, infl_usd: float) -> float:
    """Paridad de Fisher: (1 + i_COP) = (1 + i_USD) · (1 + π_COP) / (1 + π_USD)."""
    return (1 + rate_usd) * (1 + infl_cop) / (1 + infl_usd) - 1


def sector_kd(sectors: pd.DataFrame, table: pd.DataFrame, spreads: pd.DataFrame, *, rf: float,
              sovereign_debt_spread: float, infl_cop: float, infl_usd: float) -> pd.DataFrame:
    """Kd sintético por sector a partir de la cobertura mediana y sus cuartiles.

    Nota: el p25 de cobertura da el Kd alto y el p75 el bajo.
    """
    out = sectors[["ciiu_division"]].copy()
    for q in ("p25", "mediana", "p75"):
        cov = sectors[f"cobertura_{q}"]
        rs = [synthetic_rating(c, table) for c in cov]
        out[f"rating_{q}"] = [r for r, _ in rs]
        out[f"spread_tabla_{q}"] = [s for _, s in rs]
        out[f"spread_mercado_{q}"] = [market_spread(r, spreads) if r else np.nan for r, _ in rs]
        usd = kd_usd(rf, sovereign_debt_spread, out[f"spread_mercado_{q}"])
        out[f"kd_usd_{q}"] = usd
        out[f"kd_cop_{q}"] = [to_cop(u, infl_cop, infl_usd) for u in usd]
    return out
