# Mirage · Modelos de machine learning para el costo de capital en Colombia

Este libro documenta, con la metodología del curso
[*Machine Learning* de Lihki Rubio, Ph.D.](https://lihkir.github.io/MachineLearning/intro.html), la
construcción y evaluación de los modelos que alimentan la página **Costo de capital por sector** de
Mirage: Kd por sector, estructura de capital y los insumos de mercado del WACC.

| Etapa | Notebook |
|---|---|
| 1. Extracción de datos de fuente primaria | `01_extraccion` |
| 2. Análisis exploratorio | `02_eda` |
| 3. Preprocesamiento sin fuga de información | `03_preprocesamiento` |
| 4. Modelos base | `04_modelos_base` |
| 5. Ajuste fino de hiperparámetros | `05_ajuste_fino` |
| 6. Comparación estadística e interpretabilidad | `06_comparacion_estadistica` |

**Problemas.**
- **P1 · Kd por sector:** tasa de los créditos comerciales nuevos por división CIIU para los cuatro
  tamaños de empresa a la vez, un mes adelante (Superfinanciera, formato 88).
- **P2 · Estructura de capital:** D/E, cobertura de intereses, Kd contable y ROA del año siguiente de
  cada empresa con deuda (Supersociedades).
- **P3 · Insumos de mercado:** spread soberano, TES en pesos y en UVR, inflación implícita, tasa de
  política y Tesoro a 10 años, a 1, 3, 6 y 12 meses (Formato 351, BanRep, FRED).

La selección del modelo final queda a cargo del equipo, con base en el capítulo 6.

**Reproducir.** Desde `ml/`:

```bash
python -m mirage.ml.experiments p1 base
python -m mirage.ml.experiments p1 ajuste
python notebooks/ejecutar.py
```
