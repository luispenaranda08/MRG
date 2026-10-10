"""Modelos de series de tiempo para P3 (insumos de mercado), evaluados con origen móvil:
en cada mes del periodo de prueba se reentrena con toda la historia anterior y se pronostica a h
meses (ventana expansiva, equivalente a ``TimeSeriesSplit`` con un pliegue por mes).

- Paseo aleatorio (persistencia): ŷ(t+h) = y(t). Es la línea base exigente en tasas de interés.
- ARIMA por serie (statsmodels), orden elegido por AIC en una malla pequeña dentro de entrenamiento.
- VAR multivariado (statsmodels) sobre las primeras diferencias, rezagos elegidos por AIC.
- Prophet (Taylor y Letham, 2018) por serie, con crecimiento lineal y cambios de tendencia; se ajusta
  ``changepoint_prior_scale``. Prophet es univariado: la salida multivariable se arma serie por serie.
"""
from __future__ import annotations

import logging
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)


def random_walk(train: pd.DataFrame, h: int) -> pd.Series:
    return train.iloc[-1]


def arima(train: pd.DataFrame, h: int, orders=((1, 1, 0), (0, 1, 1), (1, 1, 1), (2, 1, 0))) -> pd.Series:
    from statsmodels.tsa.arima.model import ARIMA

    out = {}
    for c in train.columns:
        best, best_aic = None, np.inf
        for o in orders:
            try:
                r = ARIMA(train[c].values, order=o).fit()
                if r.aic < best_aic:
                    best, best_aic = r, r.aic
            except Exception:
                continue
        out[c] = best.forecast(h)[-1] if best is not None else train[c].iloc[-1]
    return pd.Series(out)


def var(train: pd.DataFrame, h: int, maxlags: int = 6) -> pd.Series:
    from statsmodels.tsa.api import VAR

    d = train.diff().dropna()
    try:
        r = VAR(d).fit(maxlags=maxlags, ic="aic")
        k = max(r.k_ar, 1)
        steps = r.forecast(d.values[-k:], steps=h)
        return train.iloc[-1] + steps.sum(axis=0)
    except Exception:
        return train.iloc[-1]


def prophet(train: pd.DataFrame, h: int, cps: float = 0.05) -> pd.Series:
    from prophet import Prophet

    out = {}
    for c in train.columns:
        df = pd.DataFrame({"ds": train.index, "y": train[c].values})
        m = Prophet(changepoint_prior_scale=cps, yearly_seasonality=True, weekly_seasonality=False,
                    daily_seasonality=False, uncertainty_samples=0)
        m.fit(df)
        fut = pd.DataFrame({"ds": [train.index[-1] + pd.offsets.MonthEnd(h)]})
        out[c] = float(m.predict(fut)["yhat"].iloc[0])
    return pd.Series(out)


def rolling_forecast(series: pd.DataFrame, model, h: int, test_months: int = 36, min_train: int = 48, **kw) -> pd.DataFrame:
    """Pronósticos con origen móvil: para cada origen t del periodo de prueba, ŷ(t+h | info ≤ t)."""
    idx = series.index
    origins = idx[-(test_months + h):-h] if h > 0 else idx[-test_months:]
    rows = {}
    for t in origins:
        train = series.loc[:t]
        if len(train) < min_train:
            continue
        target_date = idx[idx.get_loc(t) + h]
        rows[target_date] = model(train, h, **kw)
    return pd.DataFrame(rows).T.sort_index()
