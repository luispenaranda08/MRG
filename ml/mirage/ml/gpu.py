"""Versiones en GPU (CUDA) de los modelos del curso, con la interfaz de scikit-learn
(``fit``/``predict``/``get_params``) para usarlos dentro de ``Pipeline`` y ``GridSearchCV``.

En Windows no existe RAPIDS cuML (el scikit-learn en GPU solo corre en Linux/WSL), así que cada modelo
se implementa sobre PyTorch o XGBoost con CUDA. Todos admiten salidas multivariables de forma nativa.

| Modelo del curso | Implementación en GPU |
|---|---|
| Regresión lineal, Ridge | Solución cerrada (X'X + αI)⁻¹X'y con ``torch.linalg.solve`` |
| Lasso | FISTA (Beck y Teboulle, 2009): gradiente proximal acelerado |
| k-NN | ``torch.cdist`` + ``topk`` por bloques |
| Árbol de decisión | XGBoost con un solo árbol, sin contracción ni regularización |
| Random Forest | ``XGBRFRegressor`` (bagging de árboles, muestreo de filas y columnas) |
| Gradient Boosting / XGBoost | ``XGBRegressor`` |
| SVR | Núcleo RBF aproximado con random Fourier features (Rahimi y Recht, 2007) y pérdida ε-insensible |
| MLP | Red densa en PyTorch con Adam, decaimiento L2 y parada temprana |

Si no hay GPU, todo corre en CPU con el mismo código (``device="cpu"``).
"""
from __future__ import annotations

import numpy as np
from sklearn.base import BaseEstimator, RegressorMixin

try:
    import torch
except ImportError:  # el módulo sigue sirviendo para XGBoost
    torch = None


def device_disponible() -> str:
    return "cuda" if torch is not None and torch.cuda.is_available() else "cpu"


def _t(a, dev):
    return torch.as_tensor(np.asarray(a, dtype=np.float32), device=dev)


def _2d(y):
    y = np.asarray(y, dtype=np.float32)
    return y.reshape(-1, 1) if y.ndim == 1 else y


class _TorchBase(RegressorMixin, BaseEstimator):
    def _out(self, P):
        P = P.detach().cpu().numpy()
        return P.ravel() if self.n_outputs_ == 1 and self._y1d else P

    def _prep_y(self, y):
        self._y1d = np.asarray(y).ndim == 1
        Y = _2d(y)
        self.n_outputs_ = Y.shape[1]
        return Y


class GPULinear(_TorchBase):
    """Regresión lineal (alpha=0) o Ridge (alpha>0) por solución cerrada en GPU."""

    def __init__(self, alpha: float = 0.0, device: str = "auto"):
        self.alpha = alpha
        self.device = device

    def fit(self, X, y):
        dev = device_disponible() if self.device == "auto" else self.device
        Y = self._prep_y(y)
        Xt, Yt = _t(X, dev).double(), _t(Y, dev).double()
        self.x_mean_, self.y_mean_ = Xt.mean(0), Yt.mean(0)
        Xc, Yc = Xt - self.x_mean_, Yt - self.y_mean_
        A = Xc.T @ Xc + (self.alpha + 1e-8) * torch.eye(Xc.shape[1], device=dev, dtype=torch.float64)
        self.coef_ = torch.linalg.solve(A, Xc.T @ Yc)
        self.dev_ = dev
        return self

    def predict(self, X):
        Xt = _t(X, self.dev_).double()
        return self._out((Xt - self.x_mean_) @ self.coef_ + self.y_mean_)


class GPULasso(_TorchBase):
    """Lasso por FISTA en GPU. Objetivo: (1/2n)‖y − Xw‖² + α‖w‖₁ (misma escala que scikit-learn)."""

    def __init__(self, alpha: float = 1e-3, max_iter: int = 3000, tol: float = 1e-6, device: str = "auto"):
        self.alpha, self.max_iter, self.tol, self.device = alpha, max_iter, tol, device

    def fit(self, X, y):
        dev = device_disponible() if self.device == "auto" else self.device
        Y = self._prep_y(y)
        Xt, Yt = _t(X, dev).double(), _t(Y, dev).double()
        self.x_mean_, self.y_mean_ = Xt.mean(0), Yt.mean(0)
        Xc, Yc = Xt - self.x_mean_, Yt - self.y_mean_
        n = Xc.shape[0]
        L = torch.linalg.matrix_norm(Xc, ord=2) ** 2 / n  # constante de Lipschitz del gradiente
        W = torch.zeros(Xc.shape[1], Yc.shape[1], device=dev, dtype=torch.float64)
        Z, t = W.clone(), 1.0
        for _ in range(self.max_iter):
            G = Xc.T @ (Xc @ Z - Yc) / n
            W_new = torch.sign(Z - G / L) * torch.clamp((Z - G / L).abs() - self.alpha / L, min=0)
            t_new = (1 + (1 + 4 * t * t) ** 0.5) / 2
            Z = W_new + ((t - 1) / t_new) * (W_new - W)
            if torch.max((W_new - W).abs()) < self.tol:
                W = W_new
                break
            W, t = W_new, t_new
        self.coef_, self.dev_ = W, dev
        return self

    def predict(self, X):
        Xt = _t(X, self.dev_).double()
        return self._out((Xt - self.x_mean_) @ self.coef_ + self.y_mean_)


class GPUKNN(_TorchBase):
    """k vecinos más cercanos (distancia euclidiana) en GPU, por bloques para no agotar la memoria."""

    def __init__(self, n_neighbors: int = 5, weights: str = "uniform", batch: int = 4096, device: str = "auto"):
        self.n_neighbors, self.weights, self.batch, self.device = n_neighbors, weights, batch, device

    def fit(self, X, y):
        self.dev_ = device_disponible() if self.device == "auto" else self.device
        self.X_ = _t(X, self.dev_)
        self.Y_ = _t(self._prep_y(y), self.dev_)
        return self

    def predict(self, X):
        Xq = _t(X, self.dev_)
        k = min(self.n_neighbors, len(self.X_))
        out = []
        for i in range(0, len(Xq), self.batch):
            D = torch.cdist(Xq[i:i + self.batch], self.X_)
            d, idx = torch.topk(D, k, largest=False)
            Yn = self.Y_[idx]  # (b, k, salidas)
            if self.weights == "distance":
                w = 1.0 / torch.clamp(d, min=1e-8)
                out.append((Yn * w.unsqueeze(-1)).sum(1) / w.sum(1, keepdim=True))
            else:
                out.append(Yn.mean(1))
        return self._out(torch.cat(out))


class GPUMLP(_TorchBase):
    """Red densa (ReLU) con Adam, decaimiento L2 ``alpha`` y parada temprana sobre un 10 % de validación."""

    def __init__(self, hidden_layer_sizes=(64, 32), alpha: float = 1e-4, learning_rate_init: float = 1e-3,
                 max_iter: int = 300, batch_size: int = 512, patience: int = 15, random_state: int = 42, device: str = "auto"):
        self.hidden_layer_sizes, self.alpha, self.learning_rate_init = hidden_layer_sizes, alpha, learning_rate_init
        self.max_iter, self.batch_size, self.patience, self.random_state, self.device = max_iter, batch_size, patience, random_state, device

    def fit(self, X, y):
        dev = device_disponible() if self.device == "auto" else self.device
        torch.manual_seed(self.random_state)
        Y = self._prep_y(y)
        Xt, Yt = _t(X, dev), _t(Y, dev)
        self.y_mean_, self.y_std_ = Yt.mean(0), Yt.std(0) + 1e-8
        Yt = (Yt - self.y_mean_) / self.y_std_
        n = len(Xt)
        perm = torch.randperm(n, device=dev)
        nv = max(int(0.1 * n), 1)
        va, tr = perm[:nv], perm[nv:]
        layers, d_in = [], Xt.shape[1]
        for h in self.hidden_layer_sizes:
            layers += [torch.nn.Linear(d_in, h), torch.nn.ReLU()]
            d_in = h
        layers.append(torch.nn.Linear(d_in, Yt.shape[1]))
        net = torch.nn.Sequential(*layers).to(dev)
        opt = torch.optim.Adam(net.parameters(), lr=self.learning_rate_init, weight_decay=self.alpha)
        best, best_state, wait = np.inf, None, 0
        for _ in range(self.max_iter):
            net.train()
            for i in torch.split(tr[torch.randperm(len(tr), device=dev)], self.batch_size):
                opt.zero_grad()
                loss = torch.nn.functional.mse_loss(net(Xt[i]), Yt[i])
                loss.backward()
                opt.step()
            net.eval()
            with torch.no_grad():
                v = torch.nn.functional.mse_loss(net(Xt[va]), Yt[va]).item()
            if v < best - 1e-6:
                best, wait = v, 0
                best_state = {k: p.detach().clone() for k, p in net.state_dict().items()}
            else:
                wait += 1
                if wait >= self.patience:
                    break
        net.load_state_dict(best_state)
        self.net_, self.dev_ = net, dev
        return self

    def predict(self, X):
        self.net_.eval()
        with torch.no_grad():
            P = self.net_(_t(X, self.dev_)) * self.y_std_ + self.y_mean_
        return self._out(P)


class GPUSVR(_TorchBase):
    """SVR con núcleo RBF aproximado: random Fourier features (Rahimi y Recht, 2007) y pérdida
    ε-insensible con penalización C, optimizada con Adam en GPU. ``gamma="scale"`` usa 1/(p·var(X)),
    igual que scikit-learn. Es una aproximación del SVR exacto; con ``n_components`` alto converge a él."""

    def __init__(self, C: float = 1.0, epsilon: float = 0.1, gamma="scale", n_components: int = 2000,
                 max_iter: int = 200, batch_size: int = 2048, random_state: int = 42, device: str = "auto"):
        self.C, self.epsilon, self.gamma, self.n_components = C, epsilon, gamma, n_components
        self.max_iter, self.batch_size, self.random_state, self.device = max_iter, batch_size, random_state, device

    def _features(self, Xt):
        return np.sqrt(2.0 / self.n_components) * torch.cos(Xt @ self.W_ + self.b_)

    def fit(self, X, y):
        dev = device_disponible() if self.device == "auto" else self.device
        g = torch.Generator(device="cpu").manual_seed(self.random_state)
        Y = self._prep_y(y)
        Xt, Yt = _t(X, dev), _t(Y, dev)
        p = Xt.shape[1]
        gamma = 1.0 / (p * float(Xt.var())) if self.gamma == "scale" else float(self.gamma)
        self.W_ = (torch.randn(p, self.n_components, generator=g) * np.sqrt(2 * gamma)).to(dev)
        self.b_ = (torch.rand(self.n_components, generator=g) * 2 * np.pi).to(dev)
        self.y_mean_, self.y_std_ = Yt.mean(0), Yt.std(0) + 1e-8
        Ys = (Yt - self.y_mean_) / self.y_std_
        Z = self._features(Xt)
        w = torch.zeros(self.n_components, Ys.shape[1], device=dev, requires_grad=True)
        b = torch.zeros(Ys.shape[1], device=dev, requires_grad=True)
        opt = torch.optim.Adam([w, b], lr=1e-2)
        n = len(Z)
        for _ in range(self.max_iter):
            for i in torch.split(torch.randperm(n, device=dev), self.batch_size):
                opt.zero_grad()
                r = (Z[i] @ w + b - Ys[i]).abs()
                loss = 0.5 * (w * w).sum() / n + self.C * torch.clamp(r - self.epsilon, min=0).mean()
                loss.backward()
                opt.step()
        self.w_, self.bias_, self.dev_ = w.detach(), b.detach(), dev
        return self

    def predict(self, X):
        Z = self._features(_t(X, self.dev_))
        return self._out((Z @ self.w_ + self.bias_) * self.y_std_ + self.y_mean_)


def xgb_tree(**kw):
    """Árbol de decisión único con XGBoost en GPU (sin contracción, sin regularización L2)."""
    from xgboost import XGBRegressor

    dev = kw.pop("device", device_disponible())
    return XGBRegressor(n_estimators=1, learning_rate=1.0, reg_lambda=0.0, subsample=1.0, colsample_bynode=1.0,
                        tree_method="hist", device=dev, multi_strategy="one_output_per_tree", random_state=42, **kw)


def xgb_forest(**kw):
    """Random Forest con XGBoost en GPU."""
    from xgboost import XGBRFRegressor

    dev = kw.pop("device", device_disponible())
    return XGBRFRegressor(tree_method="hist", device=dev, random_state=42, **kw)


def xgb_boost(**kw):
    from xgboost import XGBRegressor

    dev = kw.pop("device", device_disponible())
    return XGBRegressor(tree_method="hist", device=dev, multi_strategy="one_output_per_tree", random_state=42, **kw)
