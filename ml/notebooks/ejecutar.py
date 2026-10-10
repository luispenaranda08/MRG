"""Ejecuta los notebooks en orden y guarda sus salidas. Uso: python notebooks/ejecutar.py [01 02 ...]"""
import sys
from pathlib import Path

import nbformat
from nbclient import NotebookClient

HERE = Path(__file__).parent
quiero = sys.argv[1:]
for nb_path in sorted(HERE.glob("0*.ipynb")):
    if quiero and nb_path.name[:2] not in quiero:
        continue
    nb = nbformat.read(nb_path, as_version=4)
    NotebookClient(nb, timeout=3600, kernel_name="deeplearning", resources={"metadata": {"path": str(HERE)}}).execute()
    nbformat.write(nb, nb_path)
    print("ejecutado", nb_path.name, flush=True)
