"""Descarga desde fuentes primarias con trazabilidad.

Cada archivo crudo se guarda tal como llega en ``data/raw/<fuente>/<AAAA-MM-DD>/`` junto a un
``manifest.jsonl`` con el contrato de datos de FinTarget: fuente, URL, parámetros, fecha de
descarga, hash SHA-256, tamaño y licencia. Nada se transforma aquí.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
USER_AGENT = "FinTarget/0.1 (HyperTarget; investigacion de costo de capital; contacto ludapepe08@gmail.com)"

# Licencia o términos de uso conocidos por fuente (ver docs/fuentes-primarias.md)
LICENSES = {
    "fred": "FRED: datos públicos; las series ICE BofA tienen derechos de ICE y FRED solo expone los últimos 3 años",
    "banrep": "Banco de la República: estadísticas públicas, citar la fuente",
    "superfinanciera": "datos.gov.co: Licencia de uso de datos abiertos del Estado colombiano",
    "supersociedades": "datos.gov.co: Licencia de uso de datos abiertos del Estado colombiano",
    "damodaran": "Damodaran Online: uso libre citando la fuente; solo contraste, no se redistribuye el archivo",
    "sec": "SEC EDGAR: dominio público; respetar 10 solicitudes por segundo",
    "yahoo": "Yahoo Finance: solo prototipo interno, sus términos no permiten redistribuir precios",
}

_session: requests.Session | None = None


def session() -> requests.Session:
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers["User-Agent"] = USER_AGENT
    return _session


def fetch(source: str, url: str, filename: str, params: dict | None = None, *,
          headers: dict | None = None, timeout: int = 300, retries: int = 3,
          as_of: dt.date | None = None) -> Path:
    """Descarga ``url`` y la guarda en ``data/raw/<source>/<fecha>/<filename>`` con su manifiesto."""
    as_of = as_of or dt.date.today()
    folder = RAW / source / as_of.isoformat()
    folder.mkdir(parents=True, exist_ok=True)
    last: Exception | None = None
    for attempt in range(retries):
        try:
            r = session().get(url, params=params, headers=headers, timeout=timeout)
            r.raise_for_status()
            break
        except requests.RequestException as exc:  # reintento con espera creciente
            last = exc
            time.sleep(2 ** attempt)
    else:
        raise RuntimeError(f"{source}: no se pudo descargar {url}") from last
    content = r.content
    if b"perfdrive" in content[:4000] or b"Captcha" in content[:400]:
        raise RuntimeError(f"{source}: la fuente respondió con un control anti-bots; descargar a mano")
    path = folder / filename
    path.write_bytes(content)
    record = {
        "source_id": source,
        "file": filename,
        "url": r.url,
        "params": params or {},
        "ingested_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "sha256": hashlib.sha256(content).hexdigest(),
        "bytes": len(content),
        "license_id": LICENSES.get(source, "por verificar"),
    }
    with open(folder / "manifest.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    return path


def save(df, name: str) -> Path:
    """Guarda un derivado en ``data/processed/<name>.parquet`` (y CSV para revisión manual)."""
    PROCESSED.mkdir(parents=True, exist_ok=True)
    path = PROCESSED / f"{name}.parquet"
    df.to_parquet(path, index=False)
    df.to_csv(PROCESSED / f"{name}.csv", index=False, encoding="utf-8")
    return path
