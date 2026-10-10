"""Evaluación de modelos de regresión siguiendo el capítulo 9 de Rubio, *Machine Learning*
(https://lihkir.github.io/MachineLearning/model_evaluation.html):

- Métricas: R², MAE, MSE, RMSE y MAPE (9.6).
- Diferencias significativas entre modelos (9.9.3): prueba de Diebold y Mariano (1995) sobre las
  pérdidas en el conjunto de prueba, corrección de Bonferroni para comparaciones múltiples
  (Demšar, 2006) e intervalos de confianza bootstrap (Efron, 1979).

En series de tiempo se usa la corrección de muestra pequeña de Harvey, Leybourne y Newbold (1997) y
la varianza de largo plazo con h − 1 rezagos para pronósticos a h pasos.
"""
from __future__ import annotations

import itertools

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, mean_squared_error, r2_score


def metrics(y_true, y_pred) -> dict:
    y, p = np.asarray(y_true, float), np.asarray(y_pred, float)
    ok = np.isfinite(y) & np.isfinite(p)
    y, p = y[ok], p[ok]
    nz = np.abs(y) > 1e-9
    return {"n": int(ok.sum()), "R2": r2_score(y, p), "MAE": mean_absolute_error(y, p),
            "MSE": mean_squared_error(y, p), "RMSE": float(np.sqrt(mean_squared_error(y, p))),
            "MAPE_%": 100 * mean_absolute_percentage_error(y[nz], p[nz]) if nz.any() else np.nan}


def metrics_table(y_true: pd.DataFrame, preds: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Métricas por modelo y por variable objetivo (salidas multivariables)."""
    rows = []
    for model, P in preds.items():
        for col in y_true.columns:
            rows.append({"modelo": model, "objetivo": col, **metrics(y_true[col], P[col])})
    return pd.DataFrame(rows)


def diebold_mariano(e1, e2, h: int = 1, loss: str = "se") -> dict:
    """Prueba DM de igual precisión predictiva. e1, e2: errores (y − ŷ) en las mismas observaciones.

    Estadístico negativo: el modelo 1 tiene menor pérdida. Incluye la corrección HLN (1997).
    """
    e1, e2 = np.asarray(e1, float), np.asarray(e2, float)
    ok = np.isfinite(e1) & np.isfinite(e2)
    e1, e2 = e1[ok], e2[ok]
    L = (lambda e: e ** 2) if loss == "se" else np.abs
    d = L(e1) - L(e2)
    T = len(d)
    if T < 5 or np.allclose(d, 0):
        return {"dm": np.nan, "p": np.nan, "T": T, "dif_media": float(d.mean()) if T else np.nan}
    dc = d - d.mean()
    gamma = [dc @ dc / T] + [dc[k:] @ dc[:-k] / T for k in range(1, h)]
    var = (gamma[0] + 2 * sum(gamma[1:])) / T
    if var <= 0:
        var = gamma[0] / T
    dm = d.mean() / np.sqrt(var)
    hln = np.sqrt((T + 1 - 2 * h + h * (h - 1) / T) / T)
    stat = dm * hln
    p = 2 * stats.t.sf(abs(stat), df=T - 1)
    return {"dm": float(stat), "p": float(p), "T": T, "dif_media": float(d.mean())}


def dm_matrix(y_true, preds: dict[str, np.ndarray], h: int = 1, alpha: float = 0.05) -> pd.DataFrame:
    """Todas las parejas de modelos con DM y p-valor ajustado por Bonferroni."""
    names = list(preds)
    pairs = list(itertools.combinations(names, 2))
    y = np.asarray(y_true, float)
    rows = []
    for a, b in pairs:
        r = diebold_mariano(y - np.asarray(preds[a]), y - np.asarray(preds[b]), h=h)
        rows.append({"modelo_1": a, "modelo_2": b, **r})
    out = pd.DataFrame(rows)
    m = max(len(pairs), 1)
    out["p_bonferroni"] = np.minimum(out["p"] * m, 1.0)
    out["alpha_ajustado"] = alpha / m
    out["significativo"] = out["p"] < out["alpha_ajustado"]
    out["mejor"] = np.where(out["dm"] < 0, out["modelo_1"], out["modelo_2"])
    return out


def bootstrap_ci(y_true, y_pred, metric: str = "RMSE", B: int = 2000, seed: int = 42,
                 block: int = 1) -> tuple[float, float, float]:
    """IC del 95 % por percentiles. ``block`` > 1 usa bootstrap por bloques móviles (series)."""
    y, p = np.asarray(y_true, float), np.asarray(y_pred, float)
    ok = np.isfinite(y) & np.isfinite(p)
    y, p = y[ok], p[ok]
    n = len(y)
    rng = np.random.default_rng(seed)
    f = {"RMSE": lambda a, b: np.sqrt(np.mean((a - b) ** 2)), "MAE": lambda a, b: np.mean(np.abs(a - b)),
         "R2": lambda a, b: r2_score(a, b)}[metric]
    vals = []
    for _ in range(B):
        if block > 1:
            starts = rng.integers(0, max(n - block, 1), size=int(np.ceil(n / block)))
            idx = np.concatenate([np.arange(s, min(s + block, n)) for s in starts])[:n]
        else:
            idx = rng.integers(0, n, n)
        vals.append(f(y[idx], p[idx]))
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return float(f(y, p)), float(lo), float(hi)


def overfitting_gap(train_score: float, test_score: float) -> dict:
    """Brecha entrenamiento–prueba (sección 1 del curso: < 5–10 % aceptable, > 15–20 % sobreajuste)."""
    gap = (train_score - test_score) / abs(train_score) * 100 if train_score else np.nan
    flag = "aceptable" if gap < 10 else ("revisar" if gap < 15 else "sobreajuste")
    return {"brecha_%": gap, "diagnostico": flag}
