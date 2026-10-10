"""Actualización automática de la API de mercado (pensada para GitHub Actions, sin equipo local).

Descarga de fuentes primarias lo que cambia cada semana y regenera ``web/public/api/v1``:

1. FRED (Tesoro de EE. UU. e inflación implícita de EE. UU.).
2. Banco de la República (IBR, TRM, tasa de política, COLCAP, TES).
3. Superfinanciera Formato 351 (TES, bonos globales de Colombia y bonos corporativos).
4. Superfinanciera Formato 88 (tasas de crédito comercial por sector y tamaño).
5. Damodaran (se descarga al consultarlo).

Las betas sectoriales salen de Supersociedades, que publica una vez al año: se recalculan en un equipo con
el panel descargado (``python -m mirage.api``) y quedan en ``data/publicable/`` como agregados.

    python -m mirage.actualizar
"""
from __future__ import annotations

import sys
import time

from mirage import api
from mirage.ingest import banrep, f351, fred, superfinanciera
from mirage.ingest._http import save
from mirage.wacc import run_colombia as RC

F351_DESDE = "2016-01-01"


def paso(nombre: str, fn):
    t0 = time.time()
    print(f"→ {nombre}…", flush=True)
    r = fn()
    print(f"  listo en {time.time() - t0:.0f} s", flush=True)
    return r


def main() -> int:
    paso("FRED", fred.download)
    paso("Banco de la República", banrep.download)
    for nombre, clases in {"f351_tes": ["TSTF", "TSUV"], "f351_externa": ["TDPE"], "f351_bonos": ["BOENVS", "BOEVS"]}.items():
        paso(f"Formato 351 · {nombre}", lambda c=clases, n=nombre: save(f351.download(c, F351_DESDE), n))
    paso("Formato 88 · tasas de crédito comercial", superfinanciera.rates_detail)

    def mercado():
        mi = RC.market_inputs()
        RC.REPORTS.mkdir(exist_ok=True)
        for k in ("inflacion_implicita", "spread_soberano", "prima_pais"):
            mi[k].to_csv(RC.REPORTS / f"{k}_mensual.csv", index=False)
    paso("Curvas: spread soberano, prima país e inflación implícita", mercado)
    paso("API v1", api.main)
    return 0


if __name__ == "__main__":
    sys.exit(main())
