"""API estática de Mirage: archivos JSON versionados (por defecto en ``web/public/api/v1/``).

Mirage se publica como sitio estático (Next.js exportado en Cloudflare Pages), así que la API son
archivos que se regeneran con este módulo (localmente o con GitHub Actions) y se sirven como recursos
estáticos. Uso desde ``ml/``: ``python -m mirage.api [--salida DIR]`` (o la variable ``MIRAGE_API_DIR``).
La carpeta de salida es configurable para poder mover la API a su propio repositorio.

Contrato de cada cifra (``Celda``)::

    {"v": 0.1234, "fmt": "pct", "tono": "clave", "var": {"v": 0.004, "tono": "sube"}, "nota": "..."}

- ``fmt``: ``pct`` (fracción mostrada como %), ``pp`` (puntos porcentuales), ``x`` (veces, β, D/E),
  ``num`` (entero), ``bn`` (billones de pesos), ``txt``.
- ``tono``: cómo debe pintarse, siguiendo la convención de los talleres de Gerencia Financiera:
  ``clave`` (resultado principal), ``insumo`` (supuesto editable o dato de entrada), ``sube`` / ``baja``
  (variación frente al corte anterior o frente a Damodaran), ``neutro``, ``nota`` (fuentes, avisos),
  ``alerta`` (cifra que requiere cautela). Los colores de cada tono están en ``estilo.json``.
- ``var``: variación frente al corte anterior publicado (si existe), con su propio tono.

Solo se publican agregados por sector y tamaño, nunca datos de una empresa individual.
"""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd

from mirage.ingest import damodaran
from mirage.ingest._http import PROCESSED, ROOT
from mirage.wacc import betas_colombia as BC
from mirage.wacc.betas import relever

API = Path(os.environ.get("MIRAGE_API_DIR", ROOT.parent / "web" / "public" / "api" / "v1"))
VERSION = "1.0.0"
ESTADO = None  # sin etiqueta de revisión desde la v1.0.0
AVISO = ("Mirage v1.0.0. Cifras agregadas por sector y tamaño, construidas con fuentes públicas verificables y actualizadas "
         "cada semana. No constituyen asesoría de inversión.")
TARIFA = 0.35
UMBRAL_VAR = {"pct": 0.0005, "x": 0.005, "pp": 0.0005}   # variaciones menores se consideran neutras

# Paleta de Mirage y equivalencias con la convención de los talleres de Gerencia Financiera
ESTILO = {
    "version": 1,
    "tonos": {
        "clave":   {"texto": "#1F2124", "fondo": "#F3E9CF", "borde": "#C8A24A", "negrita": True,  "uso": "Resultado principal (WACC, Ke, β apalancada)"},
        "insumo":  {"texto": "#1F2124", "fondo": "#FBF3E2", "borde": None,      "negrita": False, "uso": "Supuesto o dato de entrada editable"},
        "sube":    {"texto": "#1F6B45", "fondo": None,      "borde": None,      "negrita": False, "uso": "Subida frente al corte anterior o a la referencia"},
        "baja":    {"texto": "#A3322A", "fondo": None,      "borde": None,      "negrita": False, "uso": "Bajada frente al corte anterior o a la referencia"},
        "neutro":  {"texto": "#1F2124", "fondo": None,      "borde": None,      "negrita": False, "uso": "Valor sin énfasis"},
        "subtotal": {"texto": "#1F2124", "fondo": "#ECECEC", "borde": None,     "negrita": True,  "uso": "Subtotales y filas de resumen"},
        "encabezado": {"texto": "#FFFFFF", "fondo": "#1F2124", "borde": None,   "negrita": True,  "uso": "Encabezados de tabla y de bloque"},
        "nota":    {"texto": "#6E7277", "fondo": None,      "borde": None,      "negrita": False, "uso": "Fuentes, fechas de corte y aclaraciones"},
        "alerta":  {"texto": "#7A5600", "fondo": "#FBF3E2", "borde": "#C8A24A", "negrita": False, "uso": "Cifra que requiere cautela"},
    },
    "formatos": {"pct": "0.00%", "pp": "0.00\" pp\"", "x": "0.00", "num": "#,##0", "bn": "#,##0.0\" bn\"", "txt": "@"},
    "fuentes_tipograficas": {"texto": "IBM Plex Sans", "cifras": "IBM Plex Mono"},
    "convencion_origen": "Talleres de Gerencia Financiera (Maestría en Finanzas, Uninorte): subidas en verde, bajadas en "
                         "rojo, insumos sobre fondo claro, encabezados oscuros con texto blanco, resultados resaltados.",
}


def _f(x):
    return None if x is None or (isinstance(x, (float, np.floating)) and not np.isfinite(x)) else float(x)


def celda(v, fmt="x", tono="neutro", nota=None, n=4):
    c = {"v": None if _f(v) is None else round(_f(v), n), "fmt": fmt, "tono": tono}
    if nota:
        c["nota"] = nota
    return c


def con_variacion(c: dict, anterior: float | None) -> dict:
    if anterior is None or c["v"] is None:
        return c
    d = c["v"] - anterior
    tono = "neutro" if abs(d) < UMBRAL_VAR.get(c["fmt"], 0) else ("sube" if d > 0 else "baja")
    c["var"] = {"v": round(d, 4), "tono": tono}
    return c


def fisher(r_usd, pi_cop, pi_usd):
    return (1 + r_usd) * (1 + pi_cop) / (1 + pi_usd) - 1


# --------------------------------------------------------------------------------------------- datos
def parametros() -> tuple[dict, dict]:
    fr = pd.read_parquet(PROCESSED / "fred_series.parquet")
    last20 = lambda sid: fr[fr["serie"] == sid].sort_values("fecha")["valor"].tail(20).mean() / 100
    corte_fred = str(fr["fecha"].max().date())
    sp = pd.read_csv(ROOT / "reports" / "spread_soberano_mensual.csv").iloc[-1]
    be = pd.read_csv(ROOT / "reports" / "inflacion_implicita_mensual.csv").iloc[-1]
    co = damodaran.country("Colombia")
    lam = co["crp_rating"] / co["spread_soberano_rating"]
    v = {"rf_usd": last20("DGS10"), "inflacion_usd": last20("T10YIE"), "inflacion_cop": be["inflacion_implicita_10a"] / 100,
         "erp_maduro": co["erp_total_rating"] - co["crp_rating"], "spread_soberano": sp["spread_soberano_10a_pp"] / 100,
         "lambda": lam, "crp": sp["spread_soberano_10a_pp"] / 100 * lam, "crp_damodaran": co["crp_rating"], "tasa_impuesto": TARIFA}
    corte_f351 = str(sp["fecha"])[:10]
    p = {
        "rf_usd": celda(v["rf_usd"], "pct", "insumo") | {"fuente": "FRED · DGS10 (Tesoro de EE. UU. a 10 años), promedio de 20 días hábiles", "corte": corte_fred},
        "erp_maduro": celda(v["erp_maduro"], "pct", "insumo") | {"fuente": "Damodaran · prima de riesgo de un mercado maduro", "corte": "2026-01-05"},
        "spread_soberano": celda(v["spread_soberano"], "pct", "insumo") | {"fuente": "Superfinanciera Formato 351 · bonos globales de Colombia en USD menos Tesoro, 10 años", "corte": corte_f351},
        "lambda": celda(v["lambda"], "x", "insumo") | {"fuente": "Damodaran · volatilidad relativa acciones/bonos emergentes", "corte": "2026-01-05"},
        "crp": celda(v["crp"], "pct", "clave") | {"fuente": "Mirage · spread soberano de mercado × λ", "corte": corte_f351},
        "crp_damodaran": celda(v["crp_damodaran"], "pct", "nota") | {"fuente": "Damodaran · prima país por calificación (referencia)", "corte": "2026-01-05"},
        "inflacion_cop": celda(v["inflacion_cop"], "pct", "alerta", "Inflación implícita de TES; incluye primas de liquidez e inflación. En validación frente a la encuesta de BanRep.")
                         | {"fuente": "Superfinanciera Formato 351 · TES pesos vs. UVR, 10 años", "corte": str(be["fecha"])[:10]},
        "inflacion_usd": celda(v["inflacion_usd"], "pct", "insumo") | {"fuente": "FRED · T10YIE, promedio de 20 días hábiles", "corte": corte_fred},
        "tasa_impuesto": celda(TARIFA, "pct", "insumo") | {"fuente": "Estatuto Tributario, art. 240 (tarifa general de renta)"},
    }
    return p, v


def kd_sectores(meses: int = 12):
    t = pd.read_parquet(PROCESSED / "superfinanciera_tasas_detalle.parquet")
    t = t[(t["modalidad"] != "Comercial tesoreria") & (t["mes"] > t["mes"].max() - pd.DateOffset(months=meses))]
    t = t.assign(tm=t["tasa_ea"] * t["monto"])
    g = t.groupby(["ciiu_division", "tamano"])[["tm", "monto"]].sum()
    por_tam = (g["tm"] / g["monto"] / 100).unstack()
    tot = t.groupby("ciiu_division")[["tm", "monto"]].sum()
    return por_tam, tot["tm"] / tot["monto"] / 100, tot["monto"] / 1e12, (str(t["mes"].min().date()), str(t["mes"].max().date()))


PUBLICABLE = ROOT / "data" / "publicable"


def base_sectorial() -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """Agregados sectoriales de Supersociedades (cambian una vez al año).

    Si está el panel de Supersociedades (equipo local), se recalculan y se guardan en ``data/publicable/``;
    si no (GitHub Actions), se leen de ahí. Solo son medianas, cuartiles y conteos por sector y tamaño:
    no contienen datos de empresas individuales y las celdas con menos de 10 empresas quedan vacías.
    """
    PUBLICABLE.mkdir(parents=True, exist_ok=True)
    f_t, f_pt = PUBLICABLE / "betas_sectoriales.csv", PUBLICABLE / "betas_por_tamano.csv"
    if (PROCESSED / "supersociedades_panel_2016_2025.parquet").exists():
        t, pt, info = BC.tabla_sectorial()
        t.to_csv(f_t, index=False)
        info = {k: (float(x) if isinstance(x, (np.floating, float)) else int(x) if isinstance(x, (np.integer, int)) else x)
                for k, x in info.items() if isinstance(x, (str, int, float, np.integer, np.floating))}
        (PUBLICABLE / "metodo.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
        plano = pt.copy()
        for tam in BC.TAMANOS:
            pocas = plano[("n", tam)].fillna(0) < 10
            plano.loc[pocas, ("bl", tam)] = np.nan
            plano.loc[pocas, ("de", tam)] = np.nan
        plano.columns = [f"{a}|{b}" for a, b in plano.columns]
        plano.rename_axis("ciiu_division").to_csv(f_pt)
        return t, pt, info
    t = pd.read_csv(f_t, dtype={"ciiu_division": str})
    plano = pd.read_csv(f_pt, dtype={"ciiu_division": str}).set_index("ciiu_division")
    plano.columns = pd.MultiIndex.from_tuples([tuple(c.split("|")) for c in plano.columns])
    return t, plano, json.loads((PUBLICABLE / "metodo.json").read_text(encoding="utf-8"))


def indicadores() -> dict:
    """Indicadores del Banco de la República para simular créditos (IBR, TRM, tasa de política)."""
    b = pd.read_parquet(PROCESSED / "banrep_series.parquet")
    b["nombre"] = b["nombre"].str.replace("�", "ñ", regex=False)
    def ultimo(nombre):
        s = b[b["nombre"] == nombre].sort_values("fecha")
        return (None, None) if s.empty else (float(s["valor"].iloc[-1]), str(s["fecha"].iloc[-1].date()))
    fuente = "Banco de la República · servicio SDMX"
    out = {}
    for clave, nombre, fmt, conv, nota in [
        ("trm", "TRM", "num", None, "Pesos por dólar, tasa representativa del mercado."),
        ("tasa_politica", "Tasa de política", "pct", "EA", "Tasa de intervención del Banco de la República."),
        ("ibr_overnight", "IBR overnight", "pct", "NA", "Nominal anual, base 360 días."),
        ("ibr_1m", "IBR 1 mes", "pct", "NAMV", "Nominal anual mes vencido (convención del IBR)."),
        ("ibr_3m", "IBR 3 meses", "pct", "NATV", "Nominal anual trimestre vencido (convención del IBR)."),
        ("ibr_6m", "IBR 6 meses", "pct", "NASV", "Nominal anual semestre vencido (convención del IBR)."),
    ]:
        v, fecha = ultimo(nombre)
        val = None if v is None else (v / 100 if fmt == "pct" else v)
        out[clave] = celda(val, fmt, "insumo", nota, n=6) | {"fuente": fuente, "corte": fecha, "codigo_tasa": conv, "nombre": nombre}
    return out


def sectores(v: dict, anterior: dict | None) -> dict:
    t, pt, info = base_sectorial()
    kd_tam, kd_tot, monto, ventana = kd_sectores()
    prev = {s["ciiu_division"]: s for s in (anterior or {}).get("sectores", [])}
    tam_kd = {"Micro": "Microempresa", "Pequeña": "Pequeña empresa", "Mediana": "Mediana empresa", "Grande": "Gran empresa"}

    def wacc(bl, de, kd):
        ke_usd = v["rf_usd"] + bl * v["erp_maduro"] + v["crp"]
        ke = fisher(ke_usd, v["inflacion_cop"], v["inflacion_usd"])
        w = de / (1 + de)
        wc = (1 - w) * ke + w * kd * (1 - TARIFA)
        return ke, wc, (1 + wc) * (1 + v["inflacion_usd"]) / (1 + v["inflacion_cop"]) - 1, (1 + wc) / (1 + v["inflacion_cop"]) - 1

    filas = []
    for r in t.itertuples():
        d = r.ciiu_division
        p = prev.get(d, {})
        kd = _f(kd_tot.get(d)) if d in kd_tot.index else None
        kd_uso = kd if kd is not None else v["rf_usd"] + v["spread_soberano"] + 0.03
        ke, w_cop, w_usd, w_real = wacc(r.bl_mediana, r.de_mediana, kd_uso)
        # βu es la misma en todo el sector, así que βL p25/p75 son exactamente las de D/E p25/p75:
        # cada extremo del rango se calcula con su propio par (βL, D/E), no con la mediana de D/E.
        _, w_a, _, _ = wacc(r.bl_p25, r.de_p25, kd_uso)
        _, w_b, _, _ = wacc(r.bl_p75, r.de_p75, kd_uso)
        w_lo, w_hi = min(w_a, w_b), max(w_a, w_b)
        dif_dam = r.bl_mediana - relever(r.bu_ancla, r.de_damodaran, TARIFA)
        por_tamano = {}
        for tam in BC.TAMANOS:
            n = int(pt.loc[d, ("n", tam)]) if d in pt.index and np.isfinite(pt.loc[d, ("n", tam)]) else 0
            ok = n >= 10
            kdt = _f(kd_tam.loc[d, tam_kd[tam]]) if d in kd_tam.index and tam_kd[tam] in kd_tam.columns else None
            bl_t, de_t = (pt.loc[d, ("bl", tam)], pt.loc[d, ("de", tam)]) if ok else (None, None)
            ke_t = w_t = None
            if ok and np.isfinite(bl_t) and np.isfinite(de_t):
                ke_t, w_t, _, _ = wacc(bl_t, de_t, kdt if kdt is not None else kd_uso)
            por_tamano[tam] = {"empresas": celda(n, "num"),
                               "beta_apalancada": celda(bl_t, "x"),
                               "de": celda(de_t, "x"),
                               "kd": celda(kdt, "pct"),
                               # Ke y WACC del tamaño con su propia βL, su D/E y su Kd (o el del sector si no hay)
                               "ke": celda(ke_t, "pct", "clave"),
                               "wacc_cop_nominal": celda(w_t, "pct", "clave")}
        ke_usd = v["rf_usd"] + r.bl_mediana * v["erp_maduro"] + v["crp"]
        anatomia = {"rf": celda(v["rf_usd"], "pct", "insumo"),
                    "beta_por_erp": celda(r.bl_mediana * v["erp_maduro"], "pct", "insumo"),
                    "crp": celda(v["crp"], "pct", "insumo"),
                    "ke_usd": celda(ke_usd, "pct"),
                    "ajuste_fisher": celda((ke - ke_usd) * 100, "pp", "nota", "Paso de USD a COP por paridad de Fisher con la inflación implícita de TES y la de EE. UU."),
                    "ke_cop": celda(ke, "pct", "clave")}
        filas.append({
            "ciiu_division": d, "nombre": r.descripcion,
            "ke_anatomia": anatomia,
            "empresas": celda(r.empresas_colombia, "num", "nota"),
            "pct_con_deuda": celda(r.pct_con_deuda, "pct"),
            "beta_desapalancada": celda(r.bu_mediana, "x"),
            "beta_desapalancada_rango": [celda(r.bu_p25, "x", "nota"), celda(r.bu_p75, "x", "nota")],
            "de": celda(r.de_mediana, "x"),
            "de_rango": [celda(r.de_p25, "x", "nota"), celda(r.de_p75, "x", "nota")],
            "beta_apalancada": con_variacion(celda(r.bl_mediana, "x", "clave"), (p.get("beta_apalancada") or {}).get("v")),
            "beta_apalancada_rango": [celda(r.bl_p25, "x", "nota"), celda(r.bl_p75, "x", "nota")],
            "beta_total": celda(r.beta_total_mediana, "x", "alerta",
                                "Para dueños no diversificados (β / correlación con el mercado). La correlación de Damodaran para emergentes es baja y la eleva mucho."),
            "ke": con_variacion(celda(ke, "pct", "clave"), (p.get("ke") or {}).get("v")),
            "kd": con_variacion(celda(kd, "pct", "insumo" if kd is not None else "alerta",
                                      None if kd is not None else "Sin crédito suficiente en el sector: Kd estimado con Rf + spread soberano + 3 pp."),
                                (p.get("kd") or {}).get("v")),
            "kd_monto_desembolsado": celda(_f(monto.get(d)) if d in monto.index else None, "bn", "nota", n=2),
            "wacc_cop_nominal": con_variacion(celda(w_cop, "pct", "clave"), (p.get("wacc_cop_nominal") or {}).get("v")),
            "wacc_rango": [celda(w_lo, "pct", "nota"), celda(w_hi, "pct", "nota")],
            "wacc_usd_nominal": celda(w_usd, "pct"),
            "wacc_cop_real": celda(w_real, "pct"),
            "wacc_usd_real": celda(None if w_usd is None else (1 + w_usd) / (1 + v["inflacion_usd"]) - 1, "pct"),
            "por_tamano": por_tamano,
            "damodaran": {"industria": r.industria_damodaran,
                          "empresas_emergentes": celda(r.n_damodaran, "num", "nota"),
                          "empresas_latam": celda(r.n_latam, "num", "nota"),
                          "empresas_colombia": celda(r.n_colombia, "num", "nota"),
                          "pct_latam": celda(r.pct_latam_en_ancla / 100, "pct", "alerta" if r.pct_latam_en_ancla < 5 else "nota"),
                          "beta_apalancada": celda(r.bl_damodaran, "x", "nota"),
                          "diferencia_mirage_vs_damodaran": celda(dif_dam, "x", "sube" if dif_dam > 0.005 else "baja" if dif_dam < -0.005 else "neutro")},
        })
    metodo = {"version": VERSION, "anio_estados_financieros": info["anio"], "corte_damodaran": info["corte_damodaran"], "ventana_kd": ventana,
              "pasos": ["βu: industria emergente equivalente de Damodaran, corregida por caja (mapeo CIIU Rev. 4 ↔ Damodaran)",
                        "Re-apalancamiento con Hamada y el D/E contable de cada empresa colombiana del sector (Supersociedades); se publican medianas y cuartiles por sector y tamaño",
                        "Kd: tasa efectiva de los créditos comerciales nuevos del sector (Superfinanciera, formato 88)",
                        "Ke en USD = Rf + β × ERP + prima país; paso a COP por paridad de Fisher"]}
    return {"sectores": sorted(filas, key=lambda s: -s["empresas"]["v"]), "metodo": metodo}


# --------------------------------------------------------------------------------------------- salida
def _write(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")


def main() -> None:
    corte = dt.date.today().isoformat()
    hist = sorted((API / "historico").glob("*/sectores.json")) if (API / "historico").exists() else []
    anterior = None
    for h in reversed(hist):
        if h.parent.name != corte:
            anterior = json.loads(h.read_text(encoding="utf-8"))
            break
    p, v = parametros()
    s = sectores(v, anterior)
    meta = {"version": VERSION, **({"estado": ESTADO} if ESTADO else {}), "corte": corte, "generado": dt.datetime.now().isoformat(timespec="seconds"), "aviso": AVISO,
            "corte_anterior": anterior.get("corte") if anterior else None,
            "fuentes": [
                {"id": "supersociedades", "nombre": "Supersociedades · Estados financieros NIIF", "url": "https://www.datos.gov.co/resource/pfdp-zks5", "licencia": "Datos abiertos del Estado colombiano"},
                {"id": "superfinanciera_f88", "nombre": "Superfinanciera · Tasas de interés activas (formato 88)", "url": "https://www.datos.gov.co/resource/w9zh-vetq", "licencia": "Datos abiertos del Estado colombiano"},
                {"id": "superfinanciera_f351", "nombre": "Superfinanciera · Formato 351", "url": "https://www.datos.gov.co/resource/ur2p-h4yf", "licencia": "Datos abiertos del Estado colombiano"},
                {"id": "banrep", "nombre": "Banco de la República · servicio SDMX", "url": "https://totoro.banrep.gov.co/nsi-jax-ws/rest/", "licencia": "Estadísticas públicas"},
                {"id": "fred", "nombre": "FRED · Federal Reserve Bank of St. Louis", "url": "https://fred.stlouisfed.org/", "licencia": "Datos públicos"},
                {"id": "damodaran", "nombre": "Damodaran Online", "url": "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/data.html", "licencia": "Uso libre; se cita la fuente"},
            ]}
    _write(API / "meta.json", meta)
    _write(API / "estilo.json", ESTILO)
    _write(API / "parametros.json", {"corte": corte, "parametros": p})
    _write(API / "indicadores.json", {"corte": corte, "indicadores": indicadores()})
    _write(API / "sectores.json", {"corte": corte} | s)
    _write(API / "historico" / corte / "sectores.json", {"corte": corte} | s)
    print(f"API v1 · corte {corte} · {len(s['sectores'])} sectores · anterior: {meta['corte_anterior']} · salida: {API}")


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Genera la API estática de Mirage")
    ap.add_argument("--salida", type=Path, help="carpeta de salida (por defecto web/public/api/v1 o MIRAGE_API_DIR)")
    a = ap.parse_args()
    if a.salida:
        API = a.salida
    main()
