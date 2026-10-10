// Generado localmente por scripts/api-docs.cjs desde GET /api/calc.
export const API_CALC = {
  "api": "Mirage · calculadora financiera",
  "version": "1.0",
  "uso": "POST /api/calc/<operacion> con un cuerpo JSON. Tasas como fracción (0,12 = 12 %).",
  "operaciones": {
    "tasas": {
      "descripcion": "Convierte una tasa entre códigos colombianos (EA, EM, NAMV, NATA…).",
      "ejemplo": {
        "tasa": 0.14,
        "desde": "NAMV",
        "hacia": "EA"
      }
    },
    "equivalencias": {
      "descripcion": "Tabla de tasas equivalentes para todas las frecuencias (hoja ICNV ampliada).",
      "ejemplo": {
        "tasa": 0.12,
        "codigo": "EA"
      }
    },
    "tvm": {
      "descripcion": "Valor del dinero en el tiempo: P, F, A, n, i; la incógnita va en null (hoja TVM).",
      "ejemplo": {
        "P": 72000000,
        "F": 0,
        "A": null,
        "n": 72,
        "i": 0.014,
        "anticipada": false
      }
    },
    "ncuotas": {
      "descripcion": "Periodo inicial, final o número de cuotas (dos de tres).",
      "ejemplo": {
        "inicial": 0,
        "final": 5,
        "cuotas": null
      }
    },
    "amortizacion": {
      "descripcion": "Tabla de amortización: cuota_fija, abono_constante, bono_cupon o cero_cupon; tasa fija o por periodo, gracia, UVR o USD.",
      "ejemplo": {
        "principal": 100000000,
        "cuotas": 240,
        "tasaPeriodica": 0.011666666666655168,
        "sistema": "cuota_fija",
        "periodosPorAnio": 12,
        "desembolso": "2025-09-10"
      }
    },
    "comparar": {
      "descripcion": "Los cuatro sistemas de amortización con los mismos datos.",
      "ejemplo": {
        "principal": 1000,
        "cuotas": 4,
        "tasaPeriodica": 0.1,
        "periodosPorAnio": 1
      }
    },
    "indicadores": {
      "descripcion": "VPN, TIR, TIRM, IR, VAE y recuperación de un flujo de caja.",
      "ejemplo": {
        "flujos": [
          -10000,
          3000,
          3000,
          3000,
          3000,
          3000
        ],
        "k": 0.12
      }
    },
    "cruce": {
      "descripcion": "Tasa de cruce de Fisher entre dos proyectos.",
      "ejemplo": {
        "a": [
          -10000,
          3000,
          3000,
          3000,
          3000,
          3000
        ],
        "b": [
          -25000,
          7400,
          7400,
          7400,
          7400,
          7400
        ]
      }
    },
    "proyecto": {
      "descripcion": "Modelo de flujo de caja libre (plantilla 'Formulación de Proyectos'): FCL del proyecto y del inversionista y sus tres evaluaciones.",
      "ejemplo": {
        "horizonte": 5,
        "ventas": 1000000000,
        "crecimiento": 0.05,
        "costoVentas": 0.55,
        "gastosAdmonVentas": 0.15,
        "activos": [
          {
            "nombre": "Maquinaria",
            "valor": 520000000,
            "vidaUtil": 10
          }
        ],
        "ktnoSobreVentas": 0.1,
        "tasaImpuesto": 0.35,
        "deuda": [
          {
            "nombre": "Banco 1",
            "proporcion": 0.3,
            "tasaEA": 0.15,
            "plazo": 5,
            "sistema": "cuota_fija"
          }
        ],
        "tmrr": 0.2
      }
    }
  },
  "fuentes": [
    "Herramientas del curso Planeación Financiera, prof. Félix Gutiérrez (MFi Uninorte)",
    "Ehrhardt y Brigham, Finanzas Corporativas, cap. 10"
  ]
} as const;
