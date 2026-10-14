"""Modelos y espacios de búsqueda.

Todos van dentro de un ``Pipeline`` con ``ColumnTransformer``: imputación por mediana, escalado
estándar para las variables numéricas y ``OneHotEncoder(handle_unknown="ignore")`` para el CIIU,
ajustados solo con los datos de entrenamiento de cada pliegue. Las salidas son multivariables:
los modelos que no las soportan de forma nativa se envuelven en ``MultiOutputRegressor``.
"""
from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Lasso, LinearRegression, Ridge
from sklearn.multioutput import MultiOutputRegressor
from sklearn.neighbors import KNeighborsRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVR
from sklearn.tree import DecisionTreeRegressor
from xgboost import XGBRegressor

SEED = 42


def preprocessor(num_cols: list[str], cat_cols: list[str]) -> ColumnTransformer:
    num = Pipeline([("imputar", SimpleImputer(strategy="median")), ("escalar", StandardScaler())])
    cat = Pipeline([("imputar", SimpleImputer(strategy="most_frequent")),
                    ("codificar", OneHotEncoder(handle_unknown="ignore", min_frequency=20, sparse_output=False))])
    parts = [("num", num, num_cols)] + ([("cat", cat, cat_cols)] if cat_cols else [])
    return ColumnTransformer(parts)


def catalog() -> dict:
    """Nombre → (estimador base, espacio de búsqueda para GridSearchCV). Los parámetros llevan el
    prefijo ``modelo__`` del paso del pipeline; los envueltos, además, ``estimator__``."""
    mo = lambda est: MultiOutputRegressor(est)
    return {
        "Base (media)": (DummyRegressor(strategy="mean"), {}),
        "Regresión lineal": (LinearRegression(), {}),
        "Ridge": (Ridge(random_state=SEED), {"modelo__alpha": [0.01, 0.1, 1, 10, 100]}),
        "Lasso": (Lasso(random_state=SEED, max_iter=5000), {"modelo__alpha": [1e-4, 1e-3, 1e-2, 1e-1]}),
        "k-NN": (KNeighborsRegressor(), {"modelo__n_neighbors": [5, 15, 30, 60], "modelo__weights": ["uniform", "distance"]}),
        "Árbol de decisión": (DecisionTreeRegressor(random_state=SEED), {"modelo__max_depth": [4, 8, 12], "modelo__min_samples_leaf": [20, 100]}),
        # Mallas reducidas por costo (P2 tiene más de 40.000 filas de entrenamiento y 4 salidas): se
        # conservan los hiperparámetros de mayor efecto; max_samples acelera el bosque sin cambiar el método.
        "Random Forest": (RandomForestRegressor(random_state=SEED, n_jobs=-1, max_samples=0.5),
                          {"modelo__n_estimators": [200], "modelo__max_depth": [12, 24], "modelo__min_samples_leaf": [5, 20]}),
        "Gradient Boosting": (mo(HistGradientBoostingRegressor(random_state=SEED)),
                              {"modelo__estimator__learning_rate": [0.03, 0.1], "modelo__estimator__max_depth": [3, 6],
                               "modelo__estimator__max_iter": [300]}),
        "XGBoost": (mo(XGBRegressor(random_state=SEED, n_jobs=-1, tree_method="hist")),
                    {"modelo__estimator__n_estimators": [200, 500], "modelo__estimator__max_depth": [3, 6],
                     "modelo__estimator__learning_rate": [0.03, 0.1], "modelo__estimator__subsample": [0.8, 1.0]}),
        "SVR": (mo(SVR()), {"modelo__estimator__C": [1, 10], "modelo__estimator__epsilon": [0.1],
                            "modelo__estimator__gamma": ["scale"]}),
        "Red neuronal (MLP)": (MLPRegressor(random_state=SEED, max_iter=500, early_stopping=True),
                               {"modelo__hidden_layer_sizes": [(32,), (64, 32)], "modelo__alpha": [1e-4, 1e-2],
                                "modelo__learning_rate_init": [1e-3, 1e-2]}),
    }


def pipeline(estimator, num_cols, cat_cols) -> Pipeline:
    return Pipeline([("prep", preprocessor(num_cols, cat_cols)), ("modelo", estimator)])
