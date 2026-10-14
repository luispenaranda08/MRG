"""Genera los notebooks autocontenidos del Jupyter Book (se corren con Run All en el ambiente
``deeplearning``). Ejecutar desde ``ml/``: ``python notebooks/generar_notebooks.py``.

Todo lo que se puede ajustar (particiones, modelos, mallas de búsqueda, validación cruzada, pruebas)
queda en celdas visibles. Solo se importan los conectores de descarga (``mirage.ingest``), el cálculo
de curvas (``mirage.wacc.curves``) y las clases de modelos en GPU (``mirage.ml.gpu``)."""
from pathlib import Path

import nbformat as nbf

HERE = Path(__file__).parent
KERNEL = {"name": "deeplearning", "display_name": "deeplearning", "language": "python"}

SETUP = r'''import sys, warnings, json, time
from pathlib import Path
ML = Path.cwd().parent                      # carpeta ml/
sys.path.insert(0, str(ML))
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd, matplotlib.pyplot as plt, seaborn as sns
PROCESSED, REPORTS = ML / "data" / "processed", ML / "reports"
PRED = REPORTS / "predicciones"; PRED.mkdir(parents=True, exist_ok=True)
pd.set_option("display.max_columns", None); pd.set_option("display.width", 200)
sns.set_theme(style="whitegrid", palette="deep")'''


def nb(cells):
    n = nbf.v4.new_notebook()
    n["metadata"]["kernelspec"] = KERNEL
    n["cells"] = [nbf.v4.new_markdown_cell(c) if t == "md" else nbf.v4.new_code_cell(c) for t, c in cells]
    return n


# =============================================================================== 00
N00 = [
("md", r'''# 0. Entorno y GPU

Este libro se corre en el ambiente de Miniconda **`deeplearning`** (Python 3.10, PyTorch con CUDA).
En VS Code: *Select Kernel* → *Jupyter Kernel* → `deeplearning`. En Jupyter: menú *Kernel* →
*Change kernel* → `deeplearning`.

**Uso de la GPU.** En Windows no existe RAPIDS cuML (el scikit-learn en GPU solo corre en Linux o
WSL). Los modelos del curso se ejecutan en la GPU con PyTorch y XGBoost (clases de
`mirage/ml/gpu.py`, con la interfaz de scikit-learn). Lo que queda en CPU: el preprocesamiento
(imputar, escalar, codificar, que tarda milisegundos) y los modelos de series de tiempo ARIMA, VAR y
Prophet, que no tienen versión en GPU y trabajan con 127 datos mensuales.'''),
("code", SETUP),
("code", r'''import subprocess, platform, sklearn, scipy, statsmodels
print("Python", platform.python_version(), "| ejecutable:", sys.executable)
print(subprocess.run(["nvidia-smi", "--query-gpu=name,driver_version,memory.total,utilization.gpu",
                      "--format=csv"], capture_output=True, text=True).stdout)'''),
("code", r'''import torch, xgboost
from mirage.ml import gpu as G
print("PyTorch", torch.__version__, "| CUDA disponible:", torch.cuda.is_available(),
      "|", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "sin GPU")
print("XGBoost", xgboost.__version__, "| scikit-learn", sklearn.__version__, "| statsmodels", statsmodels.__version__)
print("Dispositivo que usarán los modelos:", G.device_disponible())'''),
("code", r'''# Prueba rápida: una multiplicación grande en la GPU y un XGBoost en CUDA
x = torch.randn(4000, 4000, device=G.device_disponible()); t0 = time.time(); (x @ x).sum().item()
print(f"Multiplicación 4000×4000 en {G.device_disponible()}: {time.time()-t0:.3f} s")
Xp = np.random.rand(20000, 30).astype("float32"); yp = Xp @ np.random.rand(30)
m = G.xgb_boost(n_estimators=100).fit(Xp, yp)
print("XGBoost configurado en:", json.loads(m.get_booster().save_config())["learner"]["generic_param"]["device"])'''),
("code", r'''# Prophet necesita encontrar tbb.dll junto a su binario (problema conocido en Windows)
import prophet, shutil
base = Path(prophet.__file__).parent / "stan_model"
if not (base / "tbb.dll").exists():
    src = next(base.glob("cmdstan-*/stan/lib/stan_math/lib/tbb/tbb.dll"))
    shutil.copy(src, base / "tbb.dll"); print("tbb.dll copiada")
print("Prophet", prophet.__version__, "listo")'''),
]

# =============================================================================== 01
N01 = [
("md", r'''# 1. Extracción de datos

Objetivo del libro: estimar con datos colombianos de fuente primaria los insumos de la página
**Costo de capital por sector** de Mirage y evaluar qué modelos los predicen mejor, siguiendo la
metodología del curso aprendizaje automático estándar (validación fuera de muestra y comparación estadística).

| Fuente | Conjunto | Uso |
|---|---|---|
| Superfinanciera, formato 88 (`w9zh-vetq`) | Tasa, monto, CIIU, tamaño, plazo y garantía de cada crédito comercial nuevo, jul-2022 a hoy | P1 · Kd por sector |
| Superfinanciera, Formato 351 (`ur2p-h4yf`) | Portafolio de los fondos de pensiones título a título, 2016 a hoy | P3 · TES, bonos globales |
| Supersociedades NIIF | Balance, resultados y CIIU, ~30.000 empresas por año, 2016–2025 | P2 · estructura de capital |
| Supersociedades, 10.000 más grandes (`6cat-2gcs`) | Empresas de todos los supervisores, 2021–2025 | Representatividad |
| Banco de la República (SDMX) | TES, IBR, tasa de política, TRM, COLCAP | Variables macro |
| FRED | Tesoro 1–30 años, inflación implícita USD, spreads | P3 |
| Damodaran | Betas por industria, primas país | Contraste |

**Configuración.** Con `DESCARGAR = False` se usan los datos ya guardados en `data/processed/`.
Con `True` se vuelven a descargar (la historia completa toma 30–60 minutos).'''),
("code", SETUP),
("code", r'''# ===================== CONFIGURACIÓN =====================
DESCARGAR = {
    "fred": False, "banrep": False, "damodaran": False,
    "superfinanciera_tasas": False,      # formato 88, historia completa
    "f351": False,                       # Formato 351
    "supersociedades": False,            # panel NIIF 2016–2025
    "grandes_empresas": False,
}
ANIOS_SUPERSOCIEDADES = (2016, 2025)'''),
("code", r'''from mirage.ingest import fred, banrep, damodaran, superfinanciera, f351, supersociedades, grandes_empresas
t0 = time.time()
if DESCARGAR["fred"]: fred.download()
if DESCARGAR["banrep"]: banrep.download()
if DESCARGAR["damodaran"]: damodaran.industry_betas(); damodaran.country()
if DESCARGAR["superfinanciera_tasas"]: superfinanciera.rates_detail()
if DESCARGAR["f351"]: f351.run()
if DESCARGAR["supersociedades"]: supersociedades.multi_year(range(ANIOS_SUPERSOCIEDADES[0], ANIOS_SUPERSOCIEDADES[1] + 1))
if DESCARGAR["grandes_empresas"]: grandes_empresas.download()
print(f"Descargas: {time.time()-t0:.0f} s")'''),
("md", "## 1.1 Curvas de TES, inflación implícita y spread soberano (a partir del Formato 351)"),
("code", r'''from mirage.wacc import curves as C
tes = C.add_ytm(pd.read_parquet(PROCESSED / "f351_tes.parquet"))     # tasa desde el precio sucio de valoración
ext = C.add_ytm(pd.read_parquet(PROCESSED / "f351_externa.parquet"))
ust = C.ust_curve(pd.read_parquet(PROCESSED / "fred_series.parquet"), fred.UST_TENORS)
be = C.breakeven(tes); sp, _ = C.sovereign_spread(ext, ust)
be.to_csv(REPORTS / "inflacion_implicita_mensual.csv", index=False); sp.to_csv(REPORTS / "spread_soberano_mensual.csv", index=False)
print(be.tail(3).round(2)); print(sp.tail(3).round(2))'''),
("md", "## 1.2 Inventario"),
("code", r'''inv = []
for p in sorted(PROCESSED.glob("*.parquet")):
    d = pd.read_parquet(p); fc = next((c for c in ("fecha", "mes", "anio") if c in d.columns), None)
    inv.append({"conjunto": p.stem, "filas": len(d), "columnas": d.shape[1],
                "desde": str(d[fc].min())[:10] if fc else "", "hasta": str(d[fc].max())[:10] if fc else ""})
pd.DataFrame(inv)'''),
]

# =============================================================================== 02
BUILD = r'''# ===================== CONFIGURACIÓN =====================
P1_MONTO_MINIMO = 1e10          # pesos; celdas sector-tamaño-mes con menos crédito se tratan como faltantes
P2_ACTIVOS_MINIMOS = 500_000    # miles de pesos
P3_DESDE = "2016-01-31"
TAMANOS = ["Gran empresa", "Mediana empresa", "Pequeña empresa", "Microempresa"]
P3_OBJETIVOS = ["spread_soberano", "tes_cop_10a", "tes_uvr_10a", "inflacion_implicita_10a", "tasa_politica", "ust_10a"]'''

MACRO = r'''def macro_mensual():
    br, fr = pd.read_parquet(PROCESSED / "banrep_series.parquet"), pd.read_parquet(PROCESSED / "fred_series.parquet")
    def m(df, key, col, name):
        return df[df[key] == col].set_index("fecha")["valor"].sort_index().resample("ME").last().rename(name)
    out = pd.concat([m(br, "nombre", "Tasa de política", "tasa_politica"), m(br, "nombre", "IBR 3 meses", "ibr_3m"),
                     m(br, "nombre", "TES 1 año", "tes_1a_banrep"), m(br, "nombre", "TES 10 años", "tes_10a_banrep"),
                     m(br, "nombre", "TRM", "trm"), m(br, "nombre", "COLCAP", "colcap"),
                     m(fr, "serie", "DGS10", "ust_10a"), m(fr, "serie", "T10YIE", "bei_usd_10a")], axis=1)
    out.index = out.index + pd.offsets.MonthEnd(0)
    return out
MAC = macro_mensual(); MAC.tail(3)'''

P1B = r'''# P1 · tasa ponderada por monto por (mes, división CIIU, tamaño); objetivo = las 4 tasas del mes siguiente
t = pd.read_parquet(PROCESSED / "superfinanciera_tasas_detalle.parquet")
t = t[t["modalidad"] != "Comercial tesoreria"]
g = t.assign(tm=t["tasa_ea"] * t["monto"]).groupby(["mes", "ciiu_division", "tamano"], as_index=False)[["tm", "monto"]].sum()
g["tasa"] = g["tm"] / g["monto"]; g.loc[g["monto"] < P1_MONTO_MINIMO, "tasa"] = np.nan
w = g.pivot_table(index=["ciiu_division", "mes"], columns="tamano", values="tasa").reindex(columns=TAMANOS)
w.columns = [f"tasa_{c.split()[0].lower()}" for c in w.columns]
w = w.join(g.groupby(["ciiu_division", "mes"])["monto"].sum().rename("monto_total")).reset_index().sort_values(["ciiu_division", "mes"])
TCOLS = [c for c in w.columns if c.startswith("tasa_")]
partes = []
for div, gg in w.groupby("ciiu_division"):
    gg = gg.set_index("mes"); f = pd.DataFrame(index=gg.index)
    for c in TCOLS:
        for k in (0, 1, 2): f[f"{c}_l{k}"] = gg[c].shift(k)        # rezagos 0, 1 y 2 meses
        f[f"y_{c}"] = gg[c].shift(-1)                               # objetivo: mes siguiente
    f["log_monto"] = np.log(gg["monto_total"]); f["ciiu_division"] = div
    partes.append(f.reset_index())
P1 = pd.concat(partes, ignore_index=True)
macm = MAC.copy(); macm.index = macm.index.to_period("M").to_timestamp()
P1 = P1.merge(macm[["tasa_politica", "ibr_3m", "tes_1a_banrep", "tes_10a_banrep"]], left_on="mes", right_index=True, how="left")
P1["mes_del_anio"] = P1["mes"].dt.month
P1_Y = [f"y_{c}" for c in TCOLS]
P1 = P1.dropna(subset=P1_Y)
P1["id"] = P1["ciiu_division"] + "_" + P1["mes"].dt.strftime("%Y-%m")
P1.to_parquet(PROCESSED / "dataset_p1.parquet", index=False)
print(P1.shape, "| divisiones:", P1.ciiu_division.nunique(), "| meses:", P1.mes.nunique())'''

P2B = r'''# P2 · empresas con deuda en t y t+1; objetivos del año siguiente: D/E, cobertura, Kd contable y ROA
p = pd.read_parquet(PROCESSED / "supersociedades_panel_2016_2025.parquet")
p = p[(p["activos"] >= P2_ACTIVOS_MINIMOS) & (p["patrimonio"] > 0)].copy()
p = p.assign(roa=p["ebit"] / p["activos"], cob=p["cobertura_intereses"], kd=p["kd_implicito"], de=p["d_e_contable"])
keep = ["nit", "anio", "ciiu_division", "activos", "ingresos", "deuda", "efectivo", "de", "cob", "kd", "roa", "tasa_impuesto_efectiva", "deuda_ant"]
p = p[keep]
nxt = p[["nit", "anio", "de", "cob", "kd", "roa"]].assign(anio=lambda d: d["anio"] - 1)
nxt.columns = ["nit", "anio", "y_de", "y_cob", "y_kd", "y_roa"]
prev = p[["nit", "anio", "de", "roa"]].assign(anio=lambda d: d["anio"] + 1).rename(columns={"de": "de_l1", "roa": "roa_l1"})
d = p.merge(nxt, on=["nit", "anio"]).merge(prev, on=["nit", "anio"], how="left")
# Acotar errores de registro (en entradas y objetivos) y transformar escalas muy sesgadas
d["y_de"] = np.log1p(d["y_de"].clip(0, 20)); d["y_cob"] = np.arcsinh(d["y_cob"].fillna(0).clip(-50, 50))
d["y_kd"] = d["y_kd"].where(d["y_kd"].between(0.0, 0.6)); d["y_roa"] = d["y_roa"].clip(-1, 1)
d["kd"] = d["kd"].where(d["kd"].between(0.0, 0.6)); d["roa"] = d["roa"].clip(-1, 1); d["roa_l1"] = d["roa_l1"].clip(-1, 1)
d["de"] = np.log1p(d["de"].clip(0, 20)); d["de_l1"] = np.log1p(d["de_l1"].clip(0, 20)); d["cob"] = np.arcsinh(d["cob"].fillna(0).clip(-50, 50))
dic = MAC[MAC.index.month == 12].copy(); dic.index = dic.index.year
d = d.merge(dic[["tasa_politica", "tes_10a_banrep", "ust_10a"]], left_on="anio", right_index=True, how="left")
d["log_activos"] = np.log(d["activos"]); d["margen"] = (d["roa"] * d["activos"] / d["ingresos"].replace(0, np.nan)).clip(-2, 2)
d["caja_activos"] = d["efectivo"].fillna(0) / d["activos"]; d["deuda_activos"] = d["deuda"] / d["activos"]
d["crec_deuda"] = (d["deuda"] / d["deuda_ant"].replace(0, np.nan) - 1).clip(-1, 5)
d = d[d["y_kd"].notna() & (d["deuda"] > 0) & d["y_roa"].notna()]
d["ciiu_division"] = d["ciiu_division"].fillna("NA"); d["anio_objetivo"] = d["anio"] + 1
d["id"] = d["nit"].astype(str) + "_" + d["anio_objetivo"].astype(str)
P2_Y = ["y_de", "y_cob", "y_kd", "y_roa"]
P2 = d; P2.to_parquet(PROCESSED / "dataset_p2.parquet", index=False)
print(P2.shape, "| empresas:", P2.nit.nunique(), "| años objetivo:", sorted(P2.anio_objetivo.unique()))'''

P3B = r'''# P3 · series mensuales de mercado
be = pd.read_csv(REPORTS / "inflacion_implicita_mensual.csv", parse_dates=["fecha"]).set_index("fecha")
sp = pd.read_csv(REPORTS / "spread_soberano_mensual.csv", parse_dates=["fecha"]).set_index("fecha")
P3 = pd.concat([sp["spread_soberano_10a_pp"].rename("spread_soberano"), be[["tes_cop_10a", "tes_uvr_10a", "inflacion_implicita_10a"]]], axis=1)
P3.index = P3.index + pd.offsets.MonthEnd(0)
P3 = P3.join(MAC[["tasa_politica", "ust_10a", "ibr_3m", "trm", "colcap", "bei_usd_10a"]]).loc[P3_DESDE:].sort_index()
P3["imputado"] = P3[P3_OBJETIVOS].isna().any(axis=1)
P3[P3_OBJETIVOS] = P3[P3_OBJETIVOS].interpolate(limit_direction="both")
P3.to_parquet(PROCESSED / "dataset_p3.parquet")
print(P3.shape, P3.index.min().date(), "→", P3.index.max().date(), "| meses imputados:", int(P3.imputado.sum()))'''

UNIV = r'''from scipy import stats
def univariado(df):
    num = df.select_dtypes("number"); q1, q3 = num.quantile(0.25), num.quantile(0.75); iqr = q3 - q1
    return pd.DataFrame({"media": num.mean(), "mediana": num.median(), "desv": num.std(), "min": num.min(), "p25": q1,
                         "p75": q3, "max": num.max(), "IQR": iqr,
                         "%_atipicos_IQR": ((num < q1 - 1.5 * iqr) | (num > q3 + 1.5 * iqr)).mean() * 100,
                         "asimetria": num.skew(), "%_faltantes": num.isna().mean() * 100}).round(3)'''

N02 = [
("md", r'''# 2. Construcción de los conjuntos y análisis exploratorio (EDA)

Primero se arman las tres tablas de modelado a partir de los datos extraídos (código visible y
editable); después, el EDA de la sección 9.10.4.1 del curso: análisis unidimensional, bidimensional,
faltantes y resumen ejecutivo.

- **P1** Kd por sector: tasa de crédito comercial nuevo por división CIIU, 4 tamaños a la vez, un mes adelante.
- **P2** Estructura de capital: D/E, cobertura, Kd contable y ROA del año siguiente de cada empresa con deuda.
- **P3** Insumos de mercado: spread soberano, TES pesos y UVR, inflación implícita, tasa de política y Tesoro.'''),
("code", SETUP),
("code", BUILD),
("code", MACRO),
("md", "## 2.1 Construcción de P1"), ("code", P1B),
("md", "## 2.2 Construcción de P2"), ("code", P2B),
("md", "## 2.3 Construcción de P3"), ("code", P3B),
("md", "## 2.4 EDA · P1"), ("code", UNIV), ("code", "univariado(P1[P1_Y])"),
("code", r'''s = t.assign(tm=t.tasa_ea * t.monto).groupby(["mes", "tamano"])[["tm", "monto"]].sum(); s = (s.tm / s.monto).unstack()
ax = s.plot(figsize=(10, 4), title="Tasa efectiva anual de créditos comerciales nuevos")
macm.loc[s.index.min():, "tasa_politica"].plot(ax=ax, color="black", ls="--", label="Tasa de política"); ax.legend(); plt.show()
fig, ax = plt.subplots(1, 2, figsize=(12, 4)); P1[P1_Y].plot(kind="hist", bins=40, alpha=.5, ax=ax[0]); P1[P1_Y].plot(kind="box", ax=ax[1]); plt.show()
print("Shapiro-Wilk p:", {c: round(stats.shapiro(P1[c])[1], 4) for c in P1_Y})'''),
("code", r'''num1 = P1.select_dtypes("number").drop(columns=["mes_del_anio"])
plt.figure(figsize=(11, 8)); sns.heatmap(num1.corr(), cmap="RdBu_r", center=0); plt.title("Correlaciones de Pearson, P1"); plt.show()
num1.corr()[P1_Y].drop(P1_Y).round(2).sort_values("y_tasa_gran", ascending=False).head(10)'''),
("md", "## 2.5 EDA · P2"), ("code", "univariado(P2[P2_Y + ['log_activos','de','de_l1','cob','kd','roa','margen','caja_activos','crec_deuda']])"),
("code", r'''fig, axes = plt.subplots(1, 4, figsize=(16, 3.5))
for a, c, lab in zip(axes, P2_Y, ["log(1+D/E)", "asinh(cobertura)", "Kd contable", "ROA"]): a.hist(P2[c], bins=60); a.set_title(lab)
plt.show(); P2.groupby("anio_objetivo")[P2_Y].median().plot(subplots=True, layout=(1, 4), figsize=(16, 3)); plt.show()
num2 = P2[P2_Y + ["log_activos", "de", "de_l1", "cob", "kd", "roa", "roa_l1", "margen", "caja_activos", "deuda_activos", "crec_deuda", "tasa_politica", "tes_10a_banrep", "ust_10a"]]
plt.figure(figsize=(11, 8)); sns.heatmap(num2.corr(method="spearman"), cmap="RdBu_r", center=0); plt.title("Spearman, P2"); plt.show()
alta = num2.corr().abs().where(lambda m: np.triu(np.ones(m.shape), 1).astype(bool)).stack(); print(alta[alta > .7].round(2))
print("Faltantes (%):"); print(num2.isna().mean().mul(100).round(1)[lambda s: s > 0])'''),
("md", "## 2.6 EDA · P3"), ("code", "univariado(P3[P3_OBJETIVOS])"),
("code", r'''from statsmodels.tsa.stattools import adfuller
P3[P3_OBJETIVOS].plot(subplots=True, layout=(3, 2), figsize=(13, 9), sharex=True); plt.tight_layout(); plt.show()
pd.DataFrame({c: {"ADF nivel (p)": adfuller(P3[c])[1], "ADF diferencia (p)": adfuller(P3[c].diff().dropna())[1]} for c in P3_OBJETIVOS}).T.round(4)'''),
("md", r'''## 2.7 Resumen ejecutivo del EDA (corrida del 9 de octubre de 2026)

- **Calidad.** P1: 691 sector-meses (47 divisiones, 48 meses) sin faltantes en los objetivos. P2:
  65.739 empresas-año con deuda (18.517 empresas); las entradas tenían errores de registro extremos
  (Kd contable de 49.101, ROA de −326) y se acotan como los objetivos. P3: 127 meses, 5 imputados.
- **Persistencia.** La tasa del mes siguiente se correlaciona 0,85–0,91 con la actual; el D/E del año
  siguiente, 0,82 con el actual. La persistencia es la línea base exigente.
- **Distribuciones.** No normales (Shapiro-Wilk p < 0,001). Pequeña empresa paga la tasa más alta
  (mediana 17,5 %) y gran empresa la más baja (14,8 %).
- **Estacionariedad (P3).** Series no estacionarias en niveles y estacionarias en diferencias (ADF):
  paseo aleatorio como línea base y VAR en diferencias.
- **Problemas.** Multicolinealidad tasa de política–TES–Tesoro (|r| 0,83–0,90); 20 % de faltantes en
  rezagos y 19 % en la tasa efectiva. Se tratan dentro del pipeline (imputación por mediana) y con
  regularización (Ridge, Lasso).'''),
]

# =============================================================================== 03
N03 = [
("md", r'''# 3. Preprocesamiento y particiones

Reglas del curso (capítulo 10 y sección 9.10.4.2):

1. La partición se define **una sola vez, antes de transformar nada**, y se guarda en disco
   (`particion_p*.parquet` con `id` y `split`). Todos los modelos la leen.
2. Partición **temporal**: con datos en el tiempo, mezclar el futuro en el entrenamiento es fuga de
   información.
3. Imputación, escalado y codificación van dentro de un `Pipeline` con `ColumnTransformer`, ajustados
   solo con entrenamiento (en cada pliegue de la validación cruzada).
4. Validación cruzada temporal (`TimeSeriesSplit` por periodo) dentro de `GridSearchCV`.'''),
("code", SETUP),
("code", r'''# ===================== CONFIGURACIÓN =====================
P1_MESES_PRUEBA = 12        # últimos meses reservados para prueba
P2_ULTIMO_ANIO_ENTRENAMIENTO = 2023   # años objetivo posteriores van a prueba
P3_MESES_PRUEBA = 36        # origen móvil en los últimos 36 meses
N_PLIEGUES_CV = 4           # pliegues de la validación cruzada temporal'''),
("code", r'''P1 = pd.read_parquet(PROCESSED / "dataset_p1.parquet"); P2 = pd.read_parquet(PROCESSED / "dataset_p2.parquet")
P3 = pd.read_parquet(PROCESSED / "dataset_p3.parquet")
meses = np.sort(P1["mes"].unique()); corte = meses[-P1_MESES_PRUEBA]
P1["split"] = np.where(P1["mes"] < corte, "train", "test")
P2["split"] = np.where(P2["anio_objetivo"] <= P2_ULTIMO_ANIO_ENTRENAMIENTO, "train", "test")
for nombre, d in (("p1", P1), ("p2", P2)):
    d[["id", "split"]].to_parquet(PROCESSED / f"particion_{nombre}.parquet", index=False)
    print(nombre, d["split"].value_counts().to_dict(), "| ids únicos:", d["id"].is_unique)
print("P1 prueba:", pd.Timestamp(corte).date(), "→", P1.mes.max().date())
print("P3 prueba (origen móvil):", P3.index[-P3_MESES_PRUEBA].date(), "→", P3.index[-1].date())
json.dump({"P1_MESES_PRUEBA": P1_MESES_PRUEBA, "P2_ULTIMO_ANIO_ENTRENAMIENTO": P2_ULTIMO_ANIO_ENTRENAMIENTO,
           "P3_MESES_PRUEBA": P3_MESES_PRUEBA, "N_PLIEGUES_CV": N_PLIEGUES_CV}, open(PROCESSED / "configuracion_particion.json", "w"))'''),
("md", "## 3.1 Pipeline de preprocesamiento"),
("code", r'''from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
def preprocesador(num, cat):
    numerico = Pipeline([("imputar", SimpleImputer(strategy="median")), ("escalar", StandardScaler())])
    categorico = Pipeline([("imputar", SimpleImputer(strategy="most_frequent")),
                           ("codificar", OneHotEncoder(handle_unknown="ignore", min_frequency=20, sparse_output=False))])
    return ColumnTransformer([("num", numerico, num)] + ([("cat", categorico, cat)] if cat else []))
preprocesador(["log_activos", "de"], ["ciiu_division"])'''),
("md", "## 3.2 Validación cruzada temporal"),
("code", r'''from sklearn.model_selection import TimeSeriesSplit
def pliegues_temporales(periodos, n_splits=N_PLIEGUES_CV):
    u = np.sort(pd.Series(periodos).unique())
    return [(np.where(pd.Series(periodos).isin(u[a]))[0], np.where(pd.Series(periodos).isin(u[b]))[0])
            for a, b in TimeSeriesSplit(n_splits=min(n_splits, len(u) - 1)).split(u)]
a = P2.loc[P2.split == "train", "anio_objetivo"].reset_index(drop=True)
for i, (tr, va) in enumerate(pliegues_temporales(a)):
    print(f"P2 pliegue {i+1}: entrena {sorted(a.iloc[tr].unique())} → valida {sorted(a.iloc[va].unique())}")'''),
("md", r'''## 3.3 Transformaciones de los objetivos de P2

| Objetivo | Transformación | Motivo |
|---|---|---|
| D/E | log(1 + D/E), acotado en 20 | Distribución muy sesgada |
| Cobertura | asinh, acotada en ±50; sin intereses = 0 | Valores extremos y negativos |
| Kd contable | Solo valores entre 0 % y 60 % | Elimina errores de registro |
| ROA | Acotado en ±1 | Elimina errores de registro |'''),
]

# =============================================================================== 04 / 05 comunes
COMMON = r'''from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.dummy import DummyRegressor
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, mean_absolute_percentage_error
from mirage.ml import gpu as G
CFG = json.load(open(PROCESSED / "configuracion_particion.json"))
DEV = "cuda" if USAR_GPU else "cpu"
print("Dispositivo de los modelos:", DEV, "| GPU disponible:", G.device_disponible())

def preprocesador(num, cat):
    numerico = Pipeline([("imputar", SimpleImputer(strategy="median")), ("escalar", StandardScaler())])
    categorico = Pipeline([("imputar", SimpleImputer(strategy="most_frequent")),
                           ("codificar", OneHotEncoder(handle_unknown="ignore", min_frequency=20, sparse_output=False))])
    return ColumnTransformer([("num", numerico, num)] + ([("cat", categorico, cat)] if cat else []))

def pipeline(est, num, cat):
    return Pipeline([("prep", preprocesador(num, cat)), ("modelo", est)])

def pliegues_temporales(periodos, n_splits=CFG["N_PLIEGUES_CV"]):
    u = np.sort(pd.Series(periodos).unique())
    return [(np.where(pd.Series(periodos).isin(u[a]))[0], np.where(pd.Series(periodos).isin(u[b]))[0])
            for a, b in TimeSeriesSplit(n_splits=min(n_splits, len(u) - 1)).split(u)]

def metricas(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float); nz = np.abs(y) > 1e-9
    return {"R2": r2_score(y, p), "MAE": mean_absolute_error(y, p), "RMSE": float(np.sqrt(mean_squared_error(y, p))),
            "MAPE_%": 100 * mean_absolute_percentage_error(y[nz], p[nz])}

def cargar(problema):
    """X, Y, periodo, columnas y máscara de entrenamiento de P1 o P2, con la partición guardada."""
    d = pd.read_parquet(PROCESSED / f"dataset_{problema}.parquet")
    d = d.merge(pd.read_parquet(PROCESSED / f"particion_{problema}.parquet"), on="id")
    if problema == "p1":
        Y = d[[c for c in d.columns if c.startswith("y_")]]; periodo = d["mes"]
        X = d.drop(columns=list(Y.columns) + ["split", "id", "mes"])
    else:
        Y = d[["y_de", "y_cob", "y_kd", "y_roa"]]; periodo = d["anio_objetivo"]
        X = d[["ciiu_division", "log_activos", "de", "de_l1", "cob", "kd", "roa", "roa_l1", "margen", "caja_activos",
               "deuda_activos", "crec_deuda", "tasa_impuesto_efectiva", "tasa_politica", "tes_10a_banrep", "ust_10a"]]
    cat = ["ciiu_division"]; num = [c for c in X.columns if c not in cat]
    return X, Y, periodo, num, cat, (d["split"] == "train").to_numpy(), d["id"].to_numpy()

def persistencia(problema, X, Y):
    fuente = {"p1": {c: c.replace("y_", "") + "_l0" for c in Y.columns},
              "p2": {"y_de": "de", "y_cob": "cob", "y_kd": "kd", "y_roa": "roa"}}[problema]
    return pd.DataFrame({c: X[s].to_numpy() for c, s in fuente.items()}).fillna(Y.median())'''

TS = r'''# ---------- Modelos de series de tiempo (CPU: no tienen versión en GPU) ----------
import logging; logging.getLogger("cmdstanpy").setLevel(logging.ERROR); logging.getLogger("prophet").setLevel(logging.ERROR)
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.api import VAR
from prophet import Prophet

def paseo_aleatorio(train, h, **kw): return train.iloc[-1]

def arima(train, h, ordenes=((1, 1, 0), (0, 1, 1), (1, 1, 1), (2, 1, 0)), **kw):
    out = {}
    for c in train.columns:
        mejor, aic = None, np.inf
        for o in ordenes:
            try:
                r = ARIMA(train[c].values, order=o).fit()
                if r.aic < aic: mejor, aic = r, r.aic
            except Exception: pass
        out[c] = mejor.forecast(h)[-1] if mejor is not None else train[c].iloc[-1]
    return pd.Series(out)

def var(train, h, maxlags=2, **kw):
    d = train.diff().dropna()
    try:
        r = VAR(d).fit(maxlags=maxlags, ic="aic"); k = max(r.k_ar, 1)
        return train.iloc[-1] + r.forecast(d.values[-k:], steps=h).sum(axis=0)
    except Exception:
        return train.iloc[-1]

def prophet(train, h, cps=0.05, **kw):
    out = {}
    for c in train.columns:
        m = Prophet(changepoint_prior_scale=cps, yearly_seasonality=True, weekly_seasonality=False,
                    daily_seasonality=False, uncertainty_samples=0).fit(pd.DataFrame({"ds": train.index, "y": train[c].values}))
        out[c] = float(m.predict(pd.DataFrame({"ds": [train.index[-1] + pd.offsets.MonthEnd(h)]}))["yhat"].iloc[0])
    return pd.Series(out)

def origen_movil(S, modelo, h, meses_prueba, minimo=48, **kw):
    """En cada mes t del periodo de prueba se reentrena con la historia hasta t y se pronostica t+h."""
    idx, filas = S.index, {}
    for t in idx[-(meses_prueba + h):-h]:
        tr = S.loc[:t]
        if len(tr) >= minimo: filas[idx[idx.get_loc(t) + h]] = modelo(tr, h, **kw)
    return pd.DataFrame(filas).T.sort_index()

def supervisado_p3(P3, h, rezagos=3):
    """Estrategia directa: con la información hasta t, predecir el vector de objetivos en t+h."""
    f = {}
    for c in OBJ3 + ["ibr_3m", "bei_usd_10a"]:
        for k in range(rezagos): f[f"{c}_l{k}"] = P3[c].shift(k)
        f[f"{c}_d1"] = P3[c].diff()
    f["colcap_ret"] = P3["colcap"].pct_change(fill_method=None); f["trm_ret"] = P3["trm"].pct_change(fill_method=None)
    X = pd.DataFrame(f, index=P3.index); Y = P3[OBJ3].shift(-h); ok = X.notna().all(1) & Y.notna().all(1)
    return X[ok], Y[ok]

def ml_origen_movil(P3, h, estimador, malla=None, meses_prueba=36):
    """Modelos de ML con rezagos, reentrenados en cada origen (y con GridSearchCV si se pasa malla)."""
    X, Y = supervisado_p3(P3, h); S = P3[OBJ3]; preds = {}
    for t in Y.index[-meses_prueba:]:
        pos = Y.index.get_loc(t); tr = Y.index[:max(pos - h + 1, 0)]   # solo filas cuyo objetivo ya se conoce en t
        if len(tr) < 36: continue
        pipe = pipeline(clone(estimador), list(X.columns), [])
        if malla: pipe = GridSearchCV(pipe, malla, cv=TimeSeriesSplit(n_splits=3), scoring="neg_mean_squared_error")
        pipe.fit(X.loc[tr], Y.loc[tr]); j = S.index.get_loc(t) + h
        if j < len(S): preds[S.index[j]] = pd.Series(np.ravel(pipe.predict(X.loc[[t]]))[:len(OBJ3)], index=OBJ3)
    return pd.DataFrame(preds).T.sort_index()'''

MODELS_BASE = r'''# ===================== MODELOS (hiperparámetros por defecto) =====================
# Editar, quitar o agregar modelos aquí. "dispositivo" indica dónde corre cada uno.
MODELOS = {
    "Base (media)":       (DummyRegressor(strategy="mean"), "cpu"),
    "Regresión lineal":   (G.GPULinear(alpha=0.0, device=DEV), DEV),
    "Ridge":              (G.GPULinear(alpha=1.0, device=DEV), DEV),
    "Lasso":              (G.GPULasso(alpha=1e-3, device=DEV), DEV),
    "k-NN":               (G.GPUKNN(n_neighbors=5, device=DEV), DEV),
    "Árbol de decisión":  (G.xgb_tree(max_depth=8, device=DEV), DEV),
    "Random Forest":      (G.xgb_forest(n_estimators=100, max_depth=12, subsample=0.6, colsample_bynode=0.6, device=DEV), DEV),
    "Gradient Boosting":  (G.xgb_boost(n_estimators=300, max_depth=3, learning_rate=0.1, device=DEV), DEV),
    "XGBoost":            (G.xgb_boost(n_estimators=300, max_depth=6, learning_rate=0.1, subsample=0.8, device=DEV), DEV),
    "SVR":                (G.GPUSVR(C=1.0, epsilon=0.1, n_components=2000, device=DEV), DEV),
    "Red neuronal (MLP)": (G.GPUMLP(hidden_layer_sizes=(64, 32), device=DEV), DEV),
}
pd.DataFrame({"modelo": list(MODELOS), "dispositivo": [v[1] for v in MODELOS.values()]})'''

RUN_PANEL = r'''def correr(problema, modelos, etapa, mallas=None):
    X, Y, periodo, num, cat, tr, ids = cargar(problema)
    filas = []
    for nombre, (est, dev) in modelos.items():
        t0 = time.time(); pipe = pipeline(clone(est), num, cat); info = {}
        malla = (mallas or {}).get(nombre)
        if malla:
            gs = GridSearchCV(pipe, malla, cv=pliegues_temporales(periodo[tr].reset_index(drop=True)),
                              scoring="neg_mean_squared_error", n_jobs=1, refit=True)
            gs.fit(X[tr].reset_index(drop=True), Y[tr].reset_index(drop=True)); modelo = gs.best_estimator_
            info = {"mejores_parametros": {k: str(v) for k, v in gs.best_params_.items()}, "mse_cv": -gs.best_score_}
        else:
            modelo = pipe.fit(X[tr], Y[tr])
        seg = time.time() - t0
        P_tr = pd.DataFrame(np.asarray(modelo.predict(X[tr])).reshape(tr.sum(), -1), columns=Y.columns)
        P_te = pd.DataFrame(np.asarray(modelo.predict(X[~tr])).reshape((~tr).sum(), -1), columns=Y.columns)
        P_te.assign(id=ids[~tr]).to_parquet(PRED / f"{problema}_{etapa}_{nombre}.parquet", index=False)
        for c in Y.columns:
            filas.append({"modelo": nombre, "objetivo": c, "dispositivo": dev, "segundos": seg,
                          "R2_entrenamiento": r2_score(Y.loc[tr, c], P_tr[c]), **metricas(Y.loc[~tr, c], P_te[c]),
                          "parametros": json.dumps(info.get("mejores_parametros", {}), ensure_ascii=False)})
        print(f"{problema} · {nombre:20s} [{dev}] {seg:7.1f} s", flush=True)
    pers = persistencia(problema, X[~tr].reset_index(drop=True), Y[tr])
    pers.assign(id=ids[~tr]).to_parquet(PRED / f"{problema}_{etapa}_Persistencia.parquet", index=False)
    for c in Y.columns:
        filas.append({"modelo": "Persistencia", "objetivo": c, "dispositivo": "-", "segundos": 0, "R2_entrenamiento": np.nan,
                      **metricas(Y.loc[~tr, c], pers[c]), "parametros": "{}"})
    Y[~tr].assign(id=ids[~tr]).to_parquet(PRED / f"{problema}_real.parquet", index=False)
    res = pd.DataFrame(filas); res.to_csv(REPORTS / f"{problema}_{etapa}_metricas.csv", index=False)
    return res

def resumen(res):
    # Tolera tablas de corridas anteriores sin todas las columnas
    for c, v in (("dispositivo", "cpu"), ("segundos", np.nan), ("R2_entrenamiento", np.nan)):
        if c not in res: res[c] = v
    if "conjunto" in res:   # formato de la corrida con scripts: separar entrenamiento y prueba
        tr = res[res.conjunto == "entrenamiento"].set_index(["modelo", "objetivo"])["R2"]
        res = res[res.conjunto == "prueba"].copy(); res["R2_entrenamiento"] = res.set_index(["modelo", "objetivo"]).index.map(tr)
    t = res.groupby("modelo").agg(dispositivo=("dispositivo", "first"), segundos=("segundos", "first"), R2_entrenamiento=("R2_entrenamiento", "mean"),
                                  R2=("R2", "mean"), MAE=("MAE", "mean"), RMSE=("RMSE", "mean"))
    t["brecha_%"] = 100 * (t.R2_entrenamiento - t.R2) / t.R2_entrenamiento.abs()
    t["diagnostico"] = np.select([t["brecha_%"] < 10, t["brecha_%"] < 15], ["aceptable", "revisar"], "sobreajuste")
    return t.sort_values("RMSE").round(3)'''

N04 = [
("md", r'''# 4. Modelos base

Todos los modelos con hiperparámetros por defecto sobre la partición común. Líneas base:
`DummyRegressor` (la media) y la **persistencia** (el valor actual como predicción del siguiente
periodo), que en tasas de interés es la referencia exigente. La brecha entrenamiento–prueba
diagnostica sobreajuste (sección 1 del curso: < 10 % aceptable, > 15 % sobreajuste).

Las salidas son multivariables: cada modelo predice a la vez las 4 tasas (P1) o los 4 indicadores
(P2). Tiempo aproximado en una RTX 4050: P1 ~1 min, P2 ~5–10 min, P3 ~25 min (Prophet y ARIMA en CPU).'''),
("code", SETUP),
("code", r'''# ===================== CONFIGURACIÓN =====================
USAR_GPU = True
CORRER = {"p1": True, "p2": True, "p3": True}
P3_HORIZONTES = [1, 3, 6, 12]'''),
("code", COMMON), ("code", MODELS_BASE), ("code", RUN_PANEL),
("md", "## 4.1 P1 · Kd por sector y tamaño"),
("code", r'''if CORRER["p1"]: r1 = correr("p1", MODELOS, "base")
r1 = pd.read_csv(REPORTS / "p1_base_metricas.csv"); resumen(r1)'''),
("code", 'r1.pivot_table(index="modelo", columns="objetivo", values="RMSE").round(3).sort_values("y_tasa_gran")'),
("md", "## 4.2 P2 · Estructura de capital por empresa"),
("code", r'''if CORRER["p2"]: r2 = correr("p2", MODELOS, "base")
r2 = pd.read_csv(REPORTS / "p2_base_metricas.csv"); resumen(r2)'''),
("code", 'r2.pivot_table(index="modelo", columns="objetivo", values="R2").round(3).sort_values("y_de", ascending=False)'),
("md", "## 4.3 P3 · Insumos de mercado (origen móvil)"),
("code", r'''P3 = pd.read_parquet(PROCESSED / "dataset_p3.parquet")
OBJ3 = ["spread_soberano", "tes_cop_10a", "tes_uvr_10a", "inflacion_implicita_10a", "tasa_politica", "ust_10a"]'''),
("code", TS),
("code", r'''def correr_p3(etapa, series_modelos, ml_modelos, mallas=None):
    S, filas = P3[OBJ3], []
    for h in P3_HORIZONTES:
        for nombre, (fn, kw) in series_modelos.items():
            t0 = time.time(); f = origen_movil(S, fn, h, CFG["P3_MESES_PRUEBA"], **kw); seg = time.time() - t0
            f.to_parquet(PRED / f"p3_{etapa}_h{h}_{nombre}.parquet")
            for c in OBJ3: filas.append({"modelo": nombre, "h": h, "objetivo": c, "dispositivo": "cpu", "segundos": seg, **metricas(S.loc[f.index, c], f[c])})
            print(f"h={h:2d} {nombre:16s} [cpu] {seg:6.1f} s", flush=True)
        for nombre, (est, dev) in ml_modelos.items():
            t0 = time.time(); f = ml_origen_movil(P3, h, est, (mallas or {}).get(nombre), CFG["P3_MESES_PRUEBA"]); seg = time.time() - t0
            f.to_parquet(PRED / f"p3_{etapa}_h{h}_{nombre}.parquet")
            for c in OBJ3: filas.append({"modelo": nombre, "h": h, "objetivo": c, "dispositivo": dev, "segundos": seg, **metricas(S.loc[f.index, c], f[c])})
            print(f"h={h:2d} {nombre:16s} [{dev}] {seg:6.1f} s", flush=True)
    res = pd.DataFrame(filas); res.to_csv(REPORTS / f"p3_{etapa}_metricas.csv", index=False); return res

SERIES = {"Paseo aleatorio": (paseo_aleatorio, {}), "ARIMA": (arima, {}), "VAR": (var, {"maxlags": 2}), "Prophet": (prophet, {"cps": 0.05})}
ML_P3 = {k: MODELOS[k] for k in ("Ridge", "Random Forest", "XGBoost")}
if CORRER["p3"]: r3 = correr_p3("base", SERIES, ML_P3)
r3 = pd.read_csv(REPORTS / "p3_base_metricas.csv")
r3.pivot_table(index="modelo", columns="h", values="RMSE").round(3).sort_values(1)'''),
("code", r'''ax = r3.pivot_table(index="modelo", columns="h", values="RMSE").T.plot(marker="o", figsize=(9, 4))
ax.set_xlabel("Horizonte (meses)"); ax.set_ylabel("RMSE promedio (pp)"); ax.set_title("P3: error por horizonte"); plt.show()
r3.pivot_table(index=["objetivo", "modelo"], columns="h", values="RMSE").round(3)'''),
]

N05 = [
("md", r'''# 5. Ajuste fino de hiperparámetros

`GridSearchCV` con **validación cruzada temporal** sobre el entrenamiento (criterio: MSE),
reentrenamiento del mejor con todo el entrenamiento y evaluación **una sola vez** en la prueba
(capítulo 9.2 del curso). Las mallas están en la celda de configuración: se pueden ampliar o reducir.
En P3, Prophet ajusta `changepoint_prior_scale` en un periodo de validación previo a la prueba y VAR
elige rezagos por AIC; los modelos de ML se reajustan en cada origen con su propia búsqueda.

Tiempo aproximado en una RTX 4050 con las mallas por defecto: P1 ~10 min, P2 ~2 h, P3 ~1 h.'''),
("code", SETUP),
("code", r'''# ===================== CONFIGURACIÓN =====================
USAR_GPU = True
CORRER = {"p1": True, "p2": True, "p3": True}
P3_HORIZONTES = [1, 3, 6, 12]
PROPHET_CPS = [0.01, 0.05, 0.2, 0.5]     # malla de changepoint_prior_scale
VAR_MAXLAGS = 6'''),
("code", COMMON),
("code", r'''# ===================== MODELOS Y MALLAS DE BÚSQUEDA =====================
# Los parámetros llevan el prefijo "modelo__" (nombre del paso en el pipeline).
MODELOS = {
    "Ridge":              (G.GPULinear(device=DEV), DEV),
    "Lasso":              (G.GPULasso(device=DEV), DEV),
    "k-NN":               (G.GPUKNN(device=DEV), DEV),
    "Árbol de decisión":  (G.xgb_tree(device=DEV), DEV),
    "Random Forest":      (G.xgb_forest(device=DEV), DEV),
    "Gradient Boosting":  (G.xgb_boost(learning_rate=0.1, device=DEV), DEV),
    "XGBoost":            (G.xgb_boost(device=DEV), DEV),
    "SVR":                (G.GPUSVR(device=DEV), DEV),
    "Red neuronal (MLP)": (G.GPUMLP(device=DEV), DEV),
}
MALLAS = {
    "Ridge":             {"modelo__alpha": [0.01, 0.1, 1, 10, 100]},
    "Lasso":             {"modelo__alpha": [1e-4, 1e-3, 1e-2, 1e-1]},
    "k-NN":              {"modelo__n_neighbors": [5, 15, 30, 60], "modelo__weights": ["uniform", "distance"]},
    "Árbol de decisión": {"modelo__max_depth": [4, 8, 12], "modelo__min_child_weight": [20, 100]},
    "Random Forest":     {"modelo__n_estimators": [100, 300], "modelo__max_depth": [8, 12, 16],
                          "modelo__subsample": [0.6], "modelo__colsample_bynode": [0.6]},
    "Gradient Boosting": {"modelo__n_estimators": [200, 500], "modelo__max_depth": [3, 6], "modelo__learning_rate": [0.03, 0.1]},
    "XGBoost":           {"modelo__n_estimators": [200, 500], "modelo__max_depth": [3, 6], "modelo__learning_rate": [0.03, 0.1],
                          "modelo__subsample": [0.8, 1.0], "modelo__reg_lambda": [1, 10]},
    "SVR":               {"modelo__C": [0.1, 1, 10], "modelo__epsilon": [0.01, 0.1], "modelo__n_components": [2000]},
    "Red neuronal (MLP)": {"modelo__hidden_layer_sizes": [(32,), (64, 32), (128, 64)], "modelo__alpha": [1e-4, 1e-2],
                           "modelo__learning_rate_init": [1e-3, 1e-2]},
}
# P3 tiene 127 meses y reentrena en cada uno de los 36 meses de prueba × 4 horizontes:
# mallas pequeñas para que la búsqueda sea viable (cada combinación se ajusta 36 × 4 × 3 veces).
MALLAS_P3 = {
    "Ridge":         {"modelo__alpha": [0.1, 1, 10, 100]},
    "Random Forest": {"modelo__n_estimators": [100], "modelo__max_depth": [4, 8]},
    "XGBoost":       {"modelo__n_estimators": [200], "modelo__max_depth": [2, 4], "modelo__learning_rate": [0.03, 0.1]},
}
pd.DataFrame({"modelo": list(MALLAS), "combinaciones": [int(np.prod([len(v) for v in m.values()])) for m in MALLAS.values()],
              "dispositivo": [MODELOS[k][1] for k in MALLAS]})'''),
("code", RUN_PANEL),
("md", "## 5.1 P1 · Kd por sector y tamaño"),
("code", r'''if CORRER["p1"]: a1 = correr("p1", MODELOS, "ajuste_fino", MALLAS)
a1 = pd.read_csv(REPORTS / "p1_ajuste_fino_metricas.csv"); resumen(a1)'''),
("md", "## 5.2 P2 · Estructura de capital por empresa"),
("code", r'''if CORRER["p2"]: a2 = correr("p2", MODELOS, "ajuste_fino", MALLAS)
a2 = pd.read_csv(REPORTS / "p2_ajuste_fino_metricas.csv"); resumen(a2)'''),
("md", "## 5.3 P3 · Insumos de mercado"),
("code", r'''P3 = pd.read_parquet(PROCESSED / "dataset_p3.parquet")
OBJ3 = ["spread_soberano", "tes_cop_10a", "tes_uvr_10a", "inflacion_implicita_10a", "tasa_politica", "ust_10a"]'''),
("code", TS),
("code", r'''def correr_p3_ajuste():
    S, filas = P3[OBJ3], []
    val = S.iloc[:-CFG["P3_MESES_PRUEBA"]]          # validación: antes del periodo de prueba
    for h in P3_HORIZONTES:
        err = {c: ((origen_movil(val, prophet, h, 12, cps=c) - val) ** 2).mean().mean() for c in PROPHET_CPS}
        cps = min(err, key=err.get); print(f"h={h}: Prophet cps elegido {cps}")
        series = {"Paseo aleatorio": (paseo_aleatorio, {}), "ARIMA": (arima, {}), "VAR": (var, {"maxlags": VAR_MAXLAGS}),
                  "Prophet": (prophet, {"cps": cps})}
        for nombre, (fn, kw) in series.items():
            t0 = time.time(); f = origen_movil(S, fn, h, CFG["P3_MESES_PRUEBA"], **kw); seg = time.time() - t0
            f.to_parquet(PRED / f"p3_ajuste_fino_h{h}_{nombre}.parquet")
            for c in OBJ3: filas.append({"modelo": nombre, "h": h, "objetivo": c, "dispositivo": "cpu", "segundos": seg, "parametros": json.dumps(kw), **metricas(S.loc[f.index, c], f[c])})
            print(f"h={h:2d} {nombre:16s} [cpu] {seg:6.1f} s", flush=True)
        for nombre in ("Ridge", "Random Forest", "XGBoost"):
            est, dev = MODELOS[nombre]
            t0 = time.time(); f = ml_origen_movil(P3, h, est, MALLAS_P3[nombre], CFG["P3_MESES_PRUEBA"]); seg = time.time() - t0
            f.to_parquet(PRED / f"p3_ajuste_fino_h{h}_{nombre}.parquet")
            for c in OBJ3: filas.append({"modelo": nombre, "h": h, "objetivo": c, "dispositivo": dev, "segundos": seg, "parametros": "", **metricas(S.loc[f.index, c], f[c])})
            print(f"h={h:2d} {nombre:16s} [{dev}] {seg:6.1f} s", flush=True)
    res = pd.DataFrame(filas); res.to_csv(REPORTS / "p3_ajuste_fino_metricas.csv", index=False); return res
if CORRER["p3"]: a3 = correr_p3_ajuste()
a3 = pd.read_csv(REPORTS / "p3_ajuste_fino_metricas.csv"); a3.pivot_table(index="modelo", columns="h", values="RMSE").round(3).sort_values(1)'''),
("md", "## 5.4 Mejora frente a los modelos base"),
("code", r'''for p in ("p1", "p2"):
    f = lambda r: r.groupby("modelo")["RMSE"].mean()
    b, a = pd.read_csv(REPORTS / f"{p}_base_metricas.csv"), pd.read_csv(REPORTS / f"{p}_ajuste_fino_metricas.csv")
    print(p); print(pd.DataFrame({"base": f(b), "ajuste_fino": f(a)}).assign(mejora_pct=lambda d: 100 * (1 - d.ajuste_fino / d.base)).round(3).sort_values("ajuste_fino"))
for p in ("p1", "p2"):
    a = pd.read_csv(REPORTS / f"{p}_ajuste_fino_metricas.csv").drop_duplicates("modelo")
    print(p); print(a[["modelo", "parametros", "segundos"]].to_string(index=False))'''),
]

# =============================================================================== 06
N06 = [
("md", r'''# 6. Comparación estadística e interpretabilidad

Sección 9.9.3 del curso: además de las métricas, se evalúa si las diferencias son significativas con
la prueba de **Diebold y Mariano (1995)** con la corrección de **Harvey, Leybourne y Newbold (1997)**,
se ajusta por comparaciones múltiples con **Bonferroni** (Demšar, 2006) y se estiman **intervalos de
confianza bootstrap** del RMSE (Efron, 1979). En P1 y P2 la pérdida es conjunta: la norma del vector de
errores estandarizados de las 4 salidas. La interpretabilidad usa **LIME** (sección 9.10.4.7).'''),
("code", SETUP),
("code", r'''# ===================== CONFIGURACIÓN =====================
ETAPA = "ajuste_fino"      # "base" o "ajuste_fino"
ALFA = 0.05
B_BOOTSTRAP = 1000'''),
("code", r'''import itertools
from scipy import stats

def diebold_mariano(e1, e2, h=1):
    """H0: igual precisión. Pérdida cuadrática. Estadístico < 0 → el modelo 1 es más preciso."""
    e1, e2 = np.asarray(e1, float), np.asarray(e2, float); d = e1 ** 2 - e2 ** 2; T = len(d)
    if T < 5 or np.allclose(d, 0): return np.nan, np.nan
    dc = d - d.mean(); g = [dc @ dc / T] + [dc[k:] @ dc[:-k] / T for k in range(1, h)]
    var = max((g[0] + 2 * sum(g[1:])) / T, 1e-12)
    stat = d.mean() / np.sqrt(var) * np.sqrt((T + 1 - 2 * h + h * (h - 1) / T) / T)    # corrección HLN
    return stat, 2 * stats.t.sf(abs(stat), df=T - 1)

def matriz_dm(errores, h=1):
    pares = list(itertools.combinations(errores, 2)); m = len(pares); filas = []
    for a, b in pares:
        s, p = diebold_mariano(errores[a], errores[b], h)
        filas.append({"modelo_1": a, "modelo_2": b, "dm": s, "p": p, "p_bonferroni": min(p * m, 1) if np.isfinite(p) else np.nan,
                      "mejor": a if s < 0 else b})
    out = pd.DataFrame(filas); out["significativo"] = out["p_bonferroni"] < ALFA; return out

def bootstrap_rmse(e, B=B_BOOTSTRAP, bloque=1, semilla=42):
    e = np.asarray(e, float); n = len(e); rng = np.random.default_rng(semilla); v = []
    for _ in range(B):
        idx = (np.concatenate([np.arange(s, min(s + bloque, n)) for s in rng.integers(0, max(n - bloque, 1), int(np.ceil(n / bloque)))])[:n]
               if bloque > 1 else rng.integers(0, n, n))
        v.append(np.sqrt(np.mean(e[idx] ** 2)))
    return np.sqrt(np.mean(e ** 2)), *np.percentile(v, [2.5, 97.5])

def mapa(dm, titulo):
    n = sorted(set(dm.modelo_1) | set(dm.modelo_2)); M = pd.DataFrame(np.nan, index=n, columns=n)
    for r in dm.itertuples(): M.loc[r.modelo_1, r.modelo_2] = M.loc[r.modelo_2, r.modelo_1] = r.p_bonferroni
    plt.figure(figsize=(10, 8)); sns.heatmap(M, annot=True, fmt=".2f", cmap="viridis_r", vmin=0, vmax=0.1, cbar_kws={"label": "p ajustado (Bonferroni)"})
    plt.title(titulo); plt.show()'''),
("code", r'''def comparar(problema):
    real = pd.read_parquet(PRED / f"{problema}_real.parquet").set_index("id")
    preds = {f.stem.replace(f"{problema}_{ETAPA}_", ""): pd.read_parquet(f).set_index("id").loc[real.index]
             for f in PRED.glob(f"{problema}_{ETAPA}_*.parquet")}
    esc = real.std()
    err = {m: np.sqrt((((real - P[real.columns]) / esc) ** 2).sum(axis=1)).to_numpy() for m, P in preds.items()}
    ic = pd.DataFrame({m: dict(zip(["RMSE_conjunto", "IC95_inf", "IC95_sup"], bootstrap_rmse(e))) for m, e in err.items()}).T.sort_values("RMSE_conjunto")
    return matriz_dm(err), ic'''),
("md", "## 6.1 P1 · Kd por sector y tamaño"),
("code", 'dm1, ic1 = comparar("p1"); ic1.round(3)'),
("code", 'mapa(dm1, "P1: Diebold-Mariano (p ajustado por Bonferroni)")\ndm1[dm1.significativo].sort_values("p")[["modelo_1", "modelo_2", "dm", "p_bonferroni", "mejor"]].head(20)'),
("md", "## 6.2 P2 · Estructura de capital por empresa"),
("code", 'dm2, ic2 = comparar("p2"); ic2.round(4)'),
("code", 'mapa(dm2, "P2: Diebold-Mariano (p ajustado por Bonferroni)")\ndm2[dm2.significativo].sort_values("p")[["modelo_1", "modelo_2", "dm", "p_bonferroni", "mejor"]].head(20)'),
("md", "## 6.3 P3 · Insumos de mercado: ¿algún modelo le gana al paseo aleatorio?"),
("code", r'''P3 = pd.read_parquet(PROCESSED / "dataset_p3.parquet")
OBJ3 = ["spread_soberano", "tes_cop_10a", "tes_uvr_10a", "inflacion_implicita_10a", "tasa_politica", "ust_10a"]
filas = []
for h in (1, 3, 6, 12):
    preds = {f.stem.split(f"_h{h}_")[1]: pd.read_parquet(f) for f in PRED.glob(f"p3_{ETAPA}_h{h}_*.parquet")}
    if not preds: continue
    comun = sorted(set.intersection(*[set(P.index) for P in preds.values()])); real = P3.loc[comun, OBJ3]; esc = P3[OBJ3].diff().std()
    err = {m: np.sqrt((((real - P.loc[comun, OBJ3]) / esc) ** 2).sum(axis=1)).to_numpy() for m, P in preds.items()}
    for m, e in err.items():
        if m == "Paseo aleatorio": continue
        s, p = diebold_mariano(e, err["Paseo aleatorio"], h)
        r, lo, hi = bootstrap_rmse(e, bloque=3)
        filas.append({"h": h, "modelo": m, "RMSE_conjunto": r, "IC95": f"[{lo:.2f}, {hi:.2f}]",
                      "RMSE_paseo_aleatorio": bootstrap_rmse(err["Paseo aleatorio"], B=1)[0], "dm": s, "p_bonferroni": min(p * (len(err) - 1), 1),
                      "gana_al_paseo": (s < 0) and (p * (len(err) - 1) < ALFA)})
pd.DataFrame(filas).round(3)'''),
("md", "## 6.4 Interpretabilidad con LIME"),
("code", r'''from lime.lime_tabular import LimeTabularExplainer
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from mirage.ml import gpu as G

def explicar(problema, estimador, objetivo, fila=0, n_variables=8):
    d = pd.read_parquet(PROCESSED / f"dataset_{problema}.parquet").merge(pd.read_parquet(PROCESSED / f"particion_{problema}.parquet"), on="id")
    if problema == "p1":
        Y = d[[c for c in d.columns if c.startswith("y_")]]; X = d.drop(columns=list(Y.columns) + ["split", "id", "mes"])
    else:
        Y = d[["y_de", "y_cob", "y_kd", "y_roa"]]
        X = d[["ciiu_division", "log_activos", "de", "de_l1", "cob", "kd", "roa", "roa_l1", "margen", "caja_activos", "deuda_activos", "crec_deuda", "tasa_impuesto_efectiva", "tasa_politica", "tes_10a_banrep", "ust_10a"]]
    tr = (d.split == "train").to_numpy(); num = [c for c in X.columns if c != "ciiu_division"]
    prep = ColumnTransformer([("num", Pipeline([("i", SimpleImputer(strategy="median")), ("s", StandardScaler())]), num),
                              ("cat", Pipeline([("i", SimpleImputer(strategy="most_frequent")), ("o", OneHotEncoder(handle_unknown="ignore", min_frequency=20, sparse_output=False))]), ["ciiu_division"])])
    Xt = prep.fit_transform(X[tr]); m = clone(estimador).fit(Xt, Y[tr].to_numpy()); j = list(Y.columns).index(objetivo)
    exp = LimeTabularExplainer(Xt, feature_names=list(prep.get_feature_names_out()), mode="regression", random_state=42)
    e = exp.explain_instance(prep.transform(X[~tr].iloc[[fila]])[0], lambda z: np.asarray(m.predict(z)).reshape(len(z), -1)[:, j], num_features=n_variables)
    print(f"{problema} · objetivo {objetivo} · observación {d.loc[~tr, 'id'].iloc[fila]} · predicción {e.predicted_value:.3f}")
    return pd.DataFrame(e.as_list(), columns=["condición", "aporte"])

explicar("p1", G.xgb_boost(n_estimators=300, max_depth=6, learning_rate=0.1), "y_tasa_gran")'''),
("code", 'explicar("p2", G.xgb_boost(n_estimators=300, max_depth=6, learning_rate=0.1), "y_kd")'),
("md", r'''## 6.5 Elección del modelo final

Criterios sugeridos para elegir, por problema:
1. Que el modelo supere a la **persistencia** (P1, P2) o al **paseo aleatorio** (P3) con diferencia
   significativa tras Bonferroni; si ninguno lo hace, la línea base es el modelo a publicar.
2. Entre los que la superan, el de menor RMSE conjunto con intervalo bootstrap que no se traslape.
3. Brecha entrenamiento–prueba aceptable (notebooks 4 y 5).
4. Interpretabilidad (LIME) coherente con la teoría financiera.'''),
]

for name, cells in [("00_entorno_gpu", N00), ("01_extraccion", N01), ("02_construccion_y_eda", N02), ("03_preprocesamiento", N03),
                    ("04_modelos_base", N04), ("05_ajuste_fino", N05), ("06_comparacion_estadistica", N06)]:
    nbf.write(nb(cells), HERE / f"{name}.ipynb")
    print("escrito", name)
