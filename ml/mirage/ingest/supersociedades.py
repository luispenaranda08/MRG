"""Supersociedades: estados financieros NIIF de fin de ejercicio, vía datos.gov.co.

Datasets en formato largo (una fila por empresa, concepto y periodo):
- ``pfdp-zks5`` Estado de situación financiera
- ``prwj-nzxa`` Estado de resultado integral
- ``6hqw-m3dm`` Carátula (trae el CIIU Rev. 4 A.C.)

Se arma un panel empresa-año con lo que el costo de capital necesita: deuda financiera, patrimonio,
efectivo, EBIT, costos financieros, ingresos e impuestos, más el CIIU.

Decisiones (documentadas en docs/metodo-betas-kd.md):
- Deuda financiera = otros pasivos financieros corrientes + no corrientes. Es la línea de la
  taxonomía resumida de Supersociedades para préstamos y bonos; no es pasivo total.
- Se usan estados individuales o separados; los consolidados se excluyen para no contar dos veces
  a un mismo grupo.
- El dataset guarda las tildes como el carácter de reemplazo U+FFFD (``p�rdida``). Los conceptos
  se piden con ese carácter literal y coincidencia exacta: con LIKE la consulta tarda más de 10 minutos.
"""
from __future__ import annotations

import json

import numpy as np
import pandas as pd

from ._http import fetch, save

BASE = "https://www.datos.gov.co/resource/{id}.json"
PAGE = 50_000

R = "�"  # así guarda el dataset las letras con tilde

BALANCE = {  # clave interna: nombre exacto del concepto
    "activos": "Total de activos",
    "pasivos": "Total pasivos",
    "patrimonio": "Patrimonio total",
    "efectivo": "Efectivo y equivalentes al efectivo",
    "opf_corriente": "Otros pasivos financieros corrientes",
    "opf_no_corriente": "Otros pasivos financieros no corrientes",
}
RESULTADOS = {
    "ingresos": "Ingresos de actividades ordinarias",
    "ebit": f"Ganancia (p{R}rdida) por actividades de operaci{R}n",
    "costos_financieros": "Costos financieros",
    "ingresos_financieros": "Ingresos financieros",
    "utilidad_antes_impuestos": f"Ganancia (p{R}rdida), antes de impuestos",
    "impuestos": "Ingreso (gasto) por impuestos",
    "utilidad_neta": f"Ganancia (p{R}rdida)",
}


def _pull(dataset: str, year: int, concepts: dict[str, str], periods: tuple[str, ...]) -> pd.DataFrame:
    names = ",".join(f"'{p}'" for p in concepts.values())
    per = ",".join(f"'{p}'" for p in periods)
    where = f"fecha_corte = '{year}-12-31T00:00:00' and periodo in ({per}) and concepto in ({names})"
    rows, offset = [], 0
    while True:
        params = {"$select": "nit,punto_entrada,concepto,periodo,valor", "$where": where,
                  "$order": ":id", "$limit": PAGE, "$offset": offset}
        path = fetch("supersociedades", BASE.format(id=dataset), f"{dataset}_{year}_{offset}.json", params)
        chunk = json.loads(path.read_bytes())
        rows.extend(chunk)
        if len(chunk) < PAGE:
            break
        offset += PAGE
    df = pd.DataFrame(rows)
    df["campo"] = df["concepto"].map({v: k for k, v in concepts.items()})
    df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
    return df.dropna(subset=["campo"])


def _ciiu(year: int) -> pd.DataFrame:
    where = f"fecha_corte = '{year}-12-31T00:00:00' and concepto = 'Clasificaci{R}n Industrial Internacional Uniforme Versi{R}n 4 A.C (CIIU)'"
    params = {"$select": "nit,valor", "$where": where, "$limit": PAGE}
    path = fetch("supersociedades", BASE.format(id="6hqw-m3dm"), f"ciiu_{year}.json", params)
    df = pd.DataFrame(json.loads(path.read_bytes())).drop_duplicates("nit")
    code = df["valor"].str.extract(r"^([A-Z])(\d{4})")
    df["seccion_ciiu"], df["ciiu"] = code[0], code[1]
    df["ciiu_division"] = df["ciiu"].str[:2]
    df["ciiu_descripcion"] = df["valor"].str.split(" - ", n=1).str[1]
    return df.drop(columns="valor")


def period_labels(year: int) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Etiquetas de periodo actual y anterior. Desde 2018 son 'Periodo Actual/Anterior'; en las
    taxonomías 2016–2017 vienen como fecha ('2016-dic-31', '2016-Dec-31') o como el año ('2016')."""
    def lab(y: int) -> tuple[str, ...]:
        return (f"{y}-dic-31", f"{y}-Dec-31", str(y))
    return ("Periodo Actual",) + lab(year), ("Periodo Anterior",) + lab(year - 1)


def panel(year: int) -> pd.DataFrame:
    """Panel empresa-año con métricas de estructura de capital y costo de deuda."""
    actual, anterior = period_labels(year)
    bal = _pull("pfdp-zks5", year, BALANCE, actual + anterior)
    pyg = _pull("prwj-nzxa", year, RESULTADOS, actual)
    raw = pd.concat([bal, pyg])
    raw = raw[~raw["punto_entrada"].str.contains("Consolidado", case=False)]
    raw["campo"] = np.where(raw["periodo"].isin(anterior), raw["campo"] + "_ant", raw["campo"])
    # Una empresa puede presentar individual y separado: se toma el primero en orden de punto de entrada
    raw = raw.sort_values("punto_entrada").drop_duplicates(["nit", "campo"])
    wide = raw.pivot_table(index="nit", columns="campo", values="valor", aggfunc="first").reset_index()
    marco = raw.drop_duplicates("nit")[["nit", "punto_entrada"]]
    try:  # la carátula trae el CIIU desde el corte 2020
        df = marco.merge(wide, on="nit").merge(_ciiu(year), on="nit", how="left")
    except (KeyError, ValueError):
        df = marco.merge(wide, on="nit")
    df.insert(1, "anio", year)
    for c in ("opf_corriente", "opf_no_corriente", "opf_corriente_ant", "opf_no_corriente_ant", "costos_financieros"):
        if c not in df:
            df[c] = np.nan
    df["deuda_reportada"] = df[["opf_corriente", "opf_no_corriente"]].notna().any(axis=1)
    df["deuda"] = df[["opf_corriente", "opf_no_corriente"]].fillna(0).sum(axis=1)
    df["deuda_ant"] = df[["opf_corriente_ant", "opf_no_corriente_ant"]].fillna(0).sum(axis=1)
    df = metrics(df)
    return df


def metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Métricas por empresa. Valores sin sentido económico quedan en NaN con su marca de calidad."""
    out = df.copy()
    pat = out["patrimonio"]
    out["d_e_contable"] = np.where(pat > 0, out["deuda"] / pat, np.nan)
    out["deuda_neta"] = out["deuda"] - out["efectivo"].fillna(0)
    deuda_prom = (out["deuda"] + out["deuda_ant"]) / 2
    cf = out["costos_financieros"].abs()
    out["cobertura_intereses"] = np.where(cf > 0, out["ebit"] / cf, np.nan)
    out["kd_implicito"] = np.where(deuda_prom > 0, cf / deuda_prom, np.nan)
    uai = out.get("utilidad_antes_impuestos")
    # Supersociedades reporta el impuesto de renta como gasto positivo
    out["tasa_impuesto_efectiva"] = np.where(uai > 0, out.get("impuestos", np.nan) / uai, np.nan)
    flags = []
    for _, r in out.iterrows():
        f = []
        if not r["patrimonio"] > 0:
            f.append("patrimonio_no_positivo")
        if r["deuda"] == 0:
            f.append("sin_deuda_financiera")
        if pd.notna(r["kd_implicito"]) and not 0.02 <= r["kd_implicito"] <= 0.60:
            f.append("kd_implicito_atipico")
        if pd.isna(r.get("ciiu")):
            f.append("sin_ciiu")
        flags.append(";".join(f))
    out["calidad"] = flags
    return out


def sector_table(df: pd.DataFrame, by: str = "ciiu_division", min_firms: int = 15) -> pd.DataFrame:
    """Mediana y p25–p75 por sector de D/E, cobertura, Kd implícito y tasa efectiva de impuestos.

    D/E incluye a las empresas sin deuda (D/E = 0) porque forman parte de la estructura del sector;
    la cobertura y el Kd implícito solo se calculan sobre quienes tienen deuda.
    """
    base = df[df["patrimonio"] > 0]

    def q(s: pd.Series) -> pd.Series:
        s = s.dropna()
        return pd.Series({"n": len(s), "p25": s.quantile(0.25), "mediana": s.median(), "p75": s.quantile(0.75)})

    parts = {
        "d_e": base.groupby(by)["d_e_contable"].apply(q).unstack(),
        "d_e_con_deuda": base[base["deuda"] > 0].groupby(by)["d_e_contable"].apply(q).unstack(),
        "cobertura": base[base["deuda"] > 0].groupby(by)["cobertura_intereses"].apply(q).unstack(),
        "kd_implicito": base[base["calidad"].str.contains("kd_implicito_atipico") == False]  # noqa: E712
        .groupby(by)["kd_implicito"].apply(q).unstack(),
        "tasa_impuesto": base[base["tasa_impuesto_efectiva"].between(0, 0.6)].groupby(by)["tasa_impuesto_efectiva"].apply(q).unstack(),
    }
    out = pd.concat(parts, axis=1)
    out.columns = [f"{a}_{b}" for a, b in out.columns]
    out["empresas"] = base.groupby(by).size()
    out["pct_con_deuda"] = base.groupby(by)["deuda"].apply(lambda s: (s > 0).mean())
    return out[out["empresas"] >= min_firms].reset_index()


def multi_year(years: range) -> pd.DataFrame:
    """Panel de varios años; el CIIU de años sin carátula se completa con el último conocido."""
    frames = [panel(y) for y in years]
    df = pd.concat(frames, ignore_index=True)
    last = (df.dropna(subset=["ciiu"]).sort_values("anio")
              .drop_duplicates("nit", keep="last")[["nit", "ciiu", "ciiu_division", "seccion_ciiu", "ciiu_descripcion"]])
    df = df.drop(columns=["ciiu", "ciiu_division", "seccion_ciiu", "ciiu_descripcion"], errors="ignore").merge(last, on="nit", how="left")
    save(df, f"supersociedades_panel_{years.start}_{years.stop - 1}")
    return df


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 2:
        d = multi_year(range(int(sys.argv[1]), int(sys.argv[2]) + 1))
        print(d.groupby("anio").agg(empresas=("nit", "size"), con_ebit=("ebit", "count"), con_ciiu=("ciiu", "count")))
        raise SystemExit
    y = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
    p = panel(y)
    save(p, f"supersociedades_panel_{y}")
    t = sector_table(p)
    save(t, f"supersociedades_sectores_{y}")
    print(p.shape, p["calidad"].str.split(";").explode().value_counts().to_dict())
    print(t.sort_values("empresas", ascending=False).head(15).round(3).to_string(index=False))
