"""Corridas de los experimentos: modelos base (hiperparámetros por defecto) y ajuste fino
(``GridSearchCV`` con validación cruzada temporal). Las predicciones sobre el conjunto de prueba se
guardan en ``reports/predicciones/`` para la comparación estadística del notebook 06.

Validación cruzada temporal: los pliegues se forman por periodo (mes en P1, año en P2) con la lógica
de ``TimeSeriesSplit``: cada pliegue entrena con el pasado y valida con el periodo siguiente, sin
mezclar observaciones de un mismo periodo entre entrenamiento y validación.
"""
from __future__ import annotations

import json
import time

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit

from mirage.ingest._http import ROOT
from mirage.ml import datasets as D
from mirage.ml import models as M
from mirage.ml.evaluation import metrics_table

OUT = ROOT / "reports" / "predicciones"
OUT.mkdir(parents=True, exist_ok=True)
SVR_MAX_TRAIN = 15_000  # SVR escala O(n²): se entrena con una submuestra fija, documentada


def time_folds(periods: pd.Series, n_splits: int = 4) -> list[tuple[np.ndarray, np.ndarray]]:
    uniq = np.sort(periods.unique())
    folds = []
    for tr, va in TimeSeriesSplit(n_splits=min(n_splits, len(uniq) - 1)).split(uniq):
        folds.append((np.where(periods.isin(uniq[tr]))[0], np.where(periods.isin(uniq[va]))[0]))
    return folds


def load(problem: str):
    if problem == "p1":
        X, Y, meta = D.p1_sector_month()
        period = meta["mes"]
    elif problem == "p2":
        X, Y, meta = D.p2_panel()
        period = meta["anio_objetivo"]
    else:
        raise ValueError(problem)
    cat = ["ciiu_division"]
    num = [c for c in X.columns if c not in cat]
    tr = (meta["split"] == "train").to_numpy()
    return X.reset_index(drop=True), Y.reset_index(drop=True), meta.reset_index(drop=True), period.reset_index(drop=True), num, cat, tr


def _fit_predict(name, est, grid, X, Y, period, num, cat, tr, tune: bool, seed: int = 42):
    pipe = M.pipeline(clone(est), num, cat)
    Xtr, Ytr, ptr = X[tr], Y[tr], period[tr]
    if name == "SVR" and len(Xtr) > SVR_MAX_TRAIN:
        idx = np.random.default_rng(seed).choice(len(Xtr), SVR_MAX_TRAIN, replace=False)
        Xtr, Ytr, ptr = Xtr.iloc[idx], Ytr.iloc[idx], ptr.iloc[idx]
    t0 = time.time()
    info = {}
    if tune and grid:
        gs = GridSearchCV(pipe, grid, cv=time_folds(ptr.reset_index(drop=True)), scoring="neg_mean_squared_error",
                          n_jobs=1 if name in ("Random Forest", "XGBoost") else -1, refit=True)
        gs.fit(Xtr.reset_index(drop=True), Ytr.reset_index(drop=True))
        model = gs.best_estimator_
        info = {"mejores_parametros": {k: str(v) for k, v in gs.best_params_.items()}, "mse_cv": float(-gs.best_score_)}
    else:
        model = pipe.fit(Xtr, Ytr)
    secs = time.time() - t0
    pred_te = pd.DataFrame(model.predict(X[~tr]), columns=Y.columns)
    pred_tr = pd.DataFrame(model.predict(X[tr]), columns=Y.columns)
    return model, pred_tr, pred_te, secs, info


def run(problem: str, tune: bool, only: list[str] | None = None) -> pd.DataFrame:
    X, Y, meta, period, num, cat, tr = load(problem)
    stage = "ajuste_fino" if tune else "base"
    rows, preds = [], {}
    for name, (est, grid) in M.catalog().items():
        if only and name not in only:
            continue
        model, ptr, pte, secs, info = _fit_predict(name, est, grid, X, Y, period, num, cat, tr, tune)
        preds[name] = pte
        mt_tr = metrics_table(Y[tr].reset_index(drop=True), {name: ptr}).assign(conjunto="entrenamiento")
        mt_te = metrics_table(Y[~tr].reset_index(drop=True), {name: pte}).assign(conjunto="prueba")
        r = pd.concat([mt_tr, mt_te])
        r["segundos"] = secs
        r["parametros"] = json.dumps(info.get("mejores_parametros", {}), ensure_ascii=False)
        rows.append(r)
        pte.assign(id=meta.loc[~tr, "id"].to_numpy()).to_parquet(OUT / f"{problem}_{stage}_{name}.parquet", index=False)
        print(f"{problem} {stage} {name}: {secs:.1f}s", flush=True)
    # Persistencia: el valor actual como predicción del siguiente periodo (línea base exigente)
    if not only or "Persistencia" in only:
        lag0 = {"p1": {c: c.replace("y_", "") + "_l0" for c in Y.columns},
                "p2": {"y_de": "de", "y_cob": "cob", "y_kd": "kd", "y_roa": "roa"}}[problem]
        pers = pd.DataFrame({c: X.loc[~tr, src].to_numpy() for c, src in lag0.items()})
        pers = pers.fillna(pd.Series({c: Y.loc[tr, c].median() for c in Y.columns}))
        pers_tr = pd.DataFrame({c: X.loc[tr, src].to_numpy() for c, src in lag0.items()}).fillna(pd.Series({c: Y.loc[tr, c].median() for c in Y.columns}))
        preds["Persistencia"] = pers
        r = pd.concat([metrics_table(Y[tr].reset_index(drop=True), {"Persistencia": pers_tr}).assign(conjunto="entrenamiento"),
                       metrics_table(Y[~tr].reset_index(drop=True), {"Persistencia": pers}).assign(conjunto="prueba")])
        r["segundos"], r["parametros"] = 0.0, "{}"
        rows.append(r)
        pers.assign(id=meta.loc[~tr, "id"].to_numpy()).to_parquet(OUT / f"{problem}_{stage}_Persistencia.parquet", index=False)
    Y[~tr].assign(id=meta.loc[~tr, "id"].to_numpy()).to_parquet(OUT / f"{problem}_real.parquet", index=False)
    res = pd.concat(rows, ignore_index=True)
    res.to_csv(ROOT / "reports" / f"{problem}_{stage}_metricas.csv", index=False)
    return res


# ------------------------------------------------------------------ P3 · series de tiempo
def run_p3(horizons=(1, 3, 6, 12), tune: bool = False, test_months: int = 36) -> pd.DataFrame:
    from mirage.ml import timeseries as T

    series = D.p3_series()
    S = series[D.P3_TARGETS]
    stage = "ajuste_fino" if tune else "base"
    rows = []
    for h in horizons:
        real = S.shift(0).iloc[-test_months:]
        cand = {"Paseo aleatorio": (T.random_walk, {}), "ARIMA": (T.arima, {}), "VAR": (T.var, {"maxlags": 6 if tune else 2}),
                "Prophet": (T.prophet, {"cps": 0.05})}
        if tune:  # ajuste de Prophet: escala de los cambios de tendencia, elegida en validación (antes de la prueba)
            best, best_err = 0.05, np.inf
            val = S.iloc[:-test_months]
            for cps in (0.01, 0.05, 0.2, 0.5):
                f = T.rolling_forecast(val, T.prophet, h, test_months=12, cps=cps)
                err = ((f - val.loc[f.index]) ** 2).mean().mean()
                if err < best_err:
                    best, best_err = cps, err
            cand["Prophet"] = (T.prophet, {"cps": best})
        for name, (fn, kw) in cand.items():
            t0 = time.time()
            f = T.rolling_forecast(S, fn, h, test_months=test_months, **kw)
            secs = time.time() - t0
            f.to_parquet(OUT / f"p3_{stage}_h{h}_{name}.parquet")
            r = metrics_table(S.loc[f.index], {name: f})
            r["h"], r["segundos"], r["parametros"] = h, secs, json.dumps(kw)
            rows.append(r)
            print(f"p3 {stage} h={h} {name}: {secs:.1f}s", flush=True)
        # Modelos de ML con rezagos (estrategia directa), reentrenados en cada origen
        X, Y, _ = D.p3_supervised(series, h)
        for name in ("Ridge", "Random Forest", "XGBoost"):
            est, grid = M.catalog()[name]
            preds = {}
            for t in Y.index[-test_months:]:
                # Entrenamiento: filas cuyo objetivo (t + h) ya se conoce en el origen t
                pos = Y.index.get_loc(t)
                tr_idx = Y.index[: max(pos - h + 1, 0)]
                if len(tr_idx) < 36:
                    continue
                pipe = M.pipeline(clone(est), list(X.columns), [])
                if tune and grid:
                    pipe = GridSearchCV(pipe, grid, cv=TimeSeriesSplit(n_splits=3), scoring="neg_mean_squared_error", n_jobs=-1)
                pipe.fit(X.loc[tr_idx], Y.loc[tr_idx])
                target_date = S.index[S.index.get_loc(t) + h] if S.index.get_loc(t) + h < len(S) else None
                if target_date is not None:
                    preds[target_date] = pd.Series(pipe.predict(X.loc[[t]])[0], index=Y.columns)
            f = pd.DataFrame(preds).T.sort_index()
            f.to_parquet(OUT / f"p3_{stage}_h{h}_{name}.parquet")
            r = metrics_table(S.loc[f.index], {name: f})
            r["h"], r["segundos"], r["parametros"] = h, np.nan, ""
            rows.append(r)
            print(f"p3 {stage} h={h} {name}", flush=True)
    res = pd.concat(rows, ignore_index=True)
    res.to_csv(ROOT / "reports" / f"p3_{stage}_metricas.csv", index=False)
    return res


if __name__ == "__main__":
    import sys

    prob, stage = sys.argv[1], sys.argv[2]
    tune = stage == "ajuste"
    if prob == "p3":
        run_p3(tune=tune)
    else:
        run(prob, tune)
