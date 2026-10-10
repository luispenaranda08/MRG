"""MinHacienda, oficina de relación con inversionistas (irc.gov.co): Informe Diario de Deuda Pública.

Un PDF por día hábil, 2020–2025, con cada referencia de TES en pesos (TFIT, TCO) y en UVR (TUVT):
vencimiento, cupón, precio limpio y sucio, duración y tasa de cierre con su fuente (SEN, MEC o VAL).
Las tasas marcadas VAL son la valoración de Precia (proveedor con licencia); por defecto se usan solo
las negociadas en SEN o MEC.

Términos del informe: uso público; toda cita debe remitir a sus términos y condiciones (no constituye
oferta ni asesoría del Ministerio). En 2026 el informe diario ya no se publica en irc.gov.co; para
2026 la serie mensual sale del Formato 351 (``f351.py``).
"""
from __future__ import annotations

import datetime as dt
import io
import re

import pandas as pd

from ._http import fetch, save

URL = "https://www.irc.gov.co/documents/d/guest/{slug}?download=true"
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre",
         "octubre", "noviembre", "diciembre"]
ROW = re.compile(r"(?P<vto>\d{1,2}-[a-z]{3}-\d{2})\*?\s+(?P<nemo>(TFIT|TFVT|TUVT|TCO)\w+)\s+[\d,]+\s+"
                 r"(?P<cupon>[\d.]+)\s+(?P<limpio>[\d.]+)\s+(?P<sucio>[\d.]+)\s+(?P<dur>[\d.]+)\s+"
                 r"(?P<tasa>[\d.]+)\s+(?P<fuente>SEN|MEC|VAL)")


def _slugs(d: dt.date) -> list[str]:
    m = MESES[d.month - 1]
    return [f"informe-diario-{d.day}-de-{m}-de-{d.year}", f"informe-diario-{d.day:02d}-de-{m}-de-{d.year}",
            f"informe-diario-tes-{d.day}-de-{m}-de-{d.year}"]


def parse(pdf_bytes: bytes, fecha: dt.date) -> pd.DataFrame:
    import pdfplumber

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        text = pdf.pages[0].extract_text() or ""
    rows = [m.groupdict() for m in ROW.finditer(text)]
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    for c in ("cupon", "limpio", "sucio", "dur", "tasa"):
        df[c] = pd.to_numeric(df[c])
    df["fecha"] = pd.Timestamp(fecha)
    df["curva"] = df["nemo"].str[:4].map({"TFIT": "COP", "TFVT": "COP", "TCO3": "COP", "TUVT": "UVR"})
    return df


def day(d: dt.date) -> pd.DataFrame:
    for slug in _slugs(d):
        try:
            path = fetch("minhacienda_irc", URL.format(slug=slug), f"{slug}.pdf", retries=1)
            return parse(path.read_bytes(), d)
        except RuntimeError:
            continue
    return pd.DataFrame()


def history(start: str = "2020-01-01", end: str = "2025-12-31", weekday: int = 4) -> pd.DataFrame:
    """Un informe por semana (viernes por defecto) para no cargar el servidor."""
    days = pd.date_range(start, end, freq="D")
    frames = [day(x.date()) for x in days if x.weekday() == weekday]
    out = pd.concat([f for f in frames if not f.empty], ignore_index=True)
    save(out, "irc_tes_diario")
    return out


if __name__ == "__main__":
    d = day(dt.date(2025, 12, 30))
    print(d.to_string(index=False))
