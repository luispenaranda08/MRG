/**
 * Definición pública de los bloques de Mirage: qué reciben, qué entregan y de dónde sale la metodología.
 * Sin implementación ni dependencias pesadas, para que la usen la interfaz, el servidor y el MCP.
 */
import type { Campo, DefBloque, Salida } from "./tipos";

const MIRAGE = "Mirage v1.0.0 · costo de capital sectorial (Damodaran, Superfinanciera f88, BanRep, FRED)";
const PROFE = "Matemática financiera estándar; Ehrhardt y Brigham, Finanzas Corporativas, cap. 10";
const DX = "Motor DX de Mirage sobre los estados financieros del usuario";

const empresa: Campo = { id: "empresa", etiqueta: "Estados financieros", tipo: "estados", requerido: true };
const pct = (id: string, etiqueta: string): Salida => ({ id, etiqueta, fmt: "pct" });
const num = (id: string, etiqueta: string, unidad?: string): Salida => ({ id, etiqueta, fmt: "num", unidad });
const veces = (id: string, etiqueta: string): Salida => ({ id, etiqueta, fmt: "x" });
const txt = (id: string, etiqueta: string): Salida => ({ id, etiqueta, fmt: "txt" });
const dinero = (id: string, etiqueta: string): Salida => ({ id, etiqueta, fmt: "num", unidad: "empresa" });

const SISTEMAS = [
    { v: "cuota_fija", etiqueta: "Cuota fija" },
    { v: "abono_constante", etiqueta: "Abono a capital constante" },
    { v: "bono_cupon", etiqueta: "Bono con cupón" },
    { v: "cero_cupon", etiqueta: "Bono cero cupón" },
];

export const DEF_BLOQUES: DefBloque[] = [
    /* ------------------------------ Caja 2 · Datos Mirage ------------------------------ */
    {
        codigo: "MERCADO", nombre: "Parámetros de mercado", caja: "datos", dominio: "costo_capital", version: "1.0.0", fuente: MIRAGE,
        descripcion: "Tasa libre de riesgo, prima de mercado, riesgo país, inflación esperada y tarifa de renta del corte vigente.",
        entradas: [],
        salidas: [pct("rf_usd", "Tasa libre de riesgo USD"), pct("erp", "Prima de mercado madura"), pct("crp", "Prima de riesgo país (Mirage)"), pct("crp_damodaran", "Prima de riesgo país (Damodaran)"), pct("spread_soberano", "Spread soberano"), veces("lambda", "Volatilidad relativa (λ)"), pct("inflacion_cop", "Inflación esperada COP"), pct("inflacion_usd", "Inflación esperada USD"), pct("tasa_impuesto", "Tarifa de renta")],
    },
    {
        codigo: "INDICADORES", nombre: "Indicadores del Banco de la República", caja: "datos", dominio: "tesoreria", version: "1.0.0", fuente: "Banco de la República (series SDMX)",
        descripcion: "TRM, tasa de política monetaria e IBR por plazo.",
        entradas: [],
        salidas: [num("trm", "TRM", "COP por USD"), pct("tasa_politica", "Tasa de política"), pct("ibr_overnight", "IBR overnight"), pct("ibr_1m", "IBR 1 mes"), pct("ibr_3m", "IBR 3 meses"), pct("ibr_6m", "IBR 6 meses")],
    },
    {
        codigo: "SECTOR", nombre: "Referencias del sector", caja: "datos", dominio: "costo_capital", version: "1.0.0", fuente: MIRAGE,
        descripcion: "Beta, estructura de capital, Kd observado, Ke y WACC del sector CIIU, con el Kd por tamaño de empresa.",
        entradas: [{ id: "empresa", etiqueta: "Estados financieros (toma su sector y tamaño)", tipo: "estados" }, { id: "sector", etiqueta: "Sector CIIU", tipo: "sector" }, { id: "tamano", etiqueta: "Tamaño", tipo: "tamano", defecto: "Grande" }],
        salidas: [txt("nombre", "Sector"), num("empresas", "Empresas en la muestra", "empresas"), pct("pct_con_deuda", "Empresas con deuda financiera"), veces("beta_u", "Beta desapalancada"), veces("de", "D/E mediano"), veces("beta_l", "Beta apalancada"), pct("ke", "Ke COP nominal"), pct("kd", "Kd COP observado"), pct("wacc_cop", "WACC COP nominal"), pct("wacc_usd", "WACC USD nominal"), pct("wacc_cop_real", "WACC COP real")],
    },

    /* ------------------------------ Caja 3 · Costo de capital ------------------------------ */
    {
        codigo: "WACC", nombre: "Costo de capital (CAPM con riesgo país)", caja: "calculo", dominio: "costo_capital", version: "1.0.0", fuente: `${MIRAGE}; Hamada; paridad de Fisher`,
        descripcion: "Re-apalanca la beta con la estructura objetivo, calcula Ke en USD y COP, Kd después de impuestos y el WACC nominal y real, con sensibilidad a D/E y a la prima país.",
        entradas: [
            { id: "beta_u", etiqueta: "Beta desapalancada", tipo: "numero", requerido: true },
            { id: "de", etiqueta: "D/E objetivo", tipo: "numero", requerido: true, min: 0 },
            { id: "tasa_impuesto", etiqueta: "Tarifa de renta", tipo: "tasa", requerido: true },
            { id: "rf", etiqueta: "Tasa libre de riesgo USD", tipo: "tasa", requerido: true },
            { id: "erp", etiqueta: "Prima de mercado", tipo: "tasa", requerido: true },
            { id: "crp", etiqueta: "Prima de riesgo país", tipo: "tasa", requerido: true },
            { id: "kd", etiqueta: "Kd COP antes de impuestos", tipo: "tasa", requerido: true },
            { id: "inflacion_cop", etiqueta: "Inflación esperada COP", tipo: "tasa", requerido: true },
            { id: "inflacion_usd", etiqueta: "Inflación esperada USD", tipo: "tasa", requerido: true },
            { id: "prima_tamano", etiqueta: "Prima por tamaño (escenario del usuario)", tipo: "tasa", defecto: 0 },
        ],
        salidas: [veces("beta_l", "Beta apalancada"), pct("ke_usd", "Ke USD"), pct("ke", "Ke COP"), pct("kd_dt", "Kd COP después de impuestos"), pct("peso_deuda", "Peso de la deuda"), pct("peso_patrimonio", "Peso del patrimonio"), pct("wacc_cop", "WACC COP nominal"), pct("wacc_usd", "WACC USD nominal"), pct("wacc_cop_real", "WACC COP real")],
        tablas: [{ id: "sens_de", etiqueta: "WACC según D/E" }, { id: "sens_crp", etiqueta: "WACC según prima país" }],
    },

    /* ------------------------------ Caja 3 · Tasas y valor del dinero ------------------------------ */
    {
        codigo: "TASA", nombre: "Conversión de tasas", caja: "calculo", dominio: "tesoreria", version: "1.0.0", fuente: PROFE,
        descripcion: "Convierte entre códigos colombianos: EA, EM, NAMV, NATV, NATA, NASV…",
        entradas: [{ id: "tasa", etiqueta: "Tasa", tipo: "tasa", requerido: true }, { id: "desde", etiqueta: "Desde", tipo: "codigo_tasa", requerido: true, defecto: "NAMV" }, { id: "hacia", etiqueta: "Hacia", tipo: "codigo_tasa", requerido: true, defecto: "EA" }],
        salidas: [pct("tasa", "Tasa convertida"), pct("ea", "Equivalente efectiva anual")],
        tablas: [{ id: "equivalencias", etiqueta: "Tasas equivalentes" }],
    },
    {
        codigo: "REAL", nombre: "Tasa real y tasa en otra moneda", caja: "calculo", dominio: "tesoreria", version: "1.0.0", fuente: `${PROFE}; paridad de Fisher`,
        descripcion: "Quita la inflación a una tasa nominal y expresa una tasa en otra moneda con la devaluación esperada.",
        entradas: [{ id: "nominal", etiqueta: "Tasa nominal EA", tipo: "tasa", requerido: true }, { id: "inflacion", etiqueta: "Inflación esperada", tipo: "tasa", requerido: true }, { id: "devaluacion", etiqueta: "Devaluación esperada", tipo: "tasa", defecto: 0 }],
        salidas: [pct("real", "Tasa real"), pct("otra_moneda", "Tasa con devaluación")],
    },
    {
        codigo: "TVM", nombre: "Valor del dinero en el tiempo", caja: "calculo", dominio: "tesoreria", version: "1.0.0", fuente: PROFE,
        descripcion: "Resuelve P, F, A, n o i. Deje vacía la incógnita.",
        entradas: [{ id: "P", etiqueta: "Valor presente (P)", tipo: "dinero" }, { id: "F", etiqueta: "Valor futuro (F)", tipo: "dinero" }, { id: "A", etiqueta: "Cuota (A)", tipo: "dinero" }, { id: "n", etiqueta: "Periodos (n)", tipo: "numero" }, { id: "i", etiqueta: "Tasa periódica (i)", tipo: "tasa" }, { id: "anticipada", etiqueta: "Cuota anticipada", tipo: "booleano", defecto: false }],
        salidas: [txt("incognita", "Incógnita"), veces("valor", "Valor de la incógnita"), pct("tasa", "Tasa (si la incógnita es i)")],
    },
    {
        codigo: "DPP", nombre: "Costo del descuento por pronto pago", caja: "calculo", dominio: "tesoreria", version: "1.0.0", fuente: "Ehrhardt y Brigham, crédito comercial",
        descripcion: "Costo efectivo anual de no tomar un descuento comercial (por ejemplo 2/10 neto 30).",
        entradas: [{ id: "descuento", etiqueta: "Descuento", tipo: "tasa", requerido: true }, { id: "dias_descuento", etiqueta: "Días para el descuento", tipo: "entero", requerido: true }, { id: "dias_plazo", etiqueta: "Plazo total en días", tipo: "entero", requerido: true }],
        salidas: [pct("costo_ea", "Costo efectivo anual de no tomarlo"), pct("costo_periodo", "Costo del periodo"), num("dias_financiados", "Días financiados", "días")],
    },
    {
        codigo: "FACTORING", nombre: "Costo efectivo de factoring o confirming", caja: "calculo", dominio: "tesoreria", version: "1.0.0", fuente: PROFE,
        descripcion: "Tasa efectiva anual de anticipar una factura con descuento y comisión.",
        entradas: [{ id: "valor", etiqueta: "Valor de la factura", tipo: "dinero", requerido: true }, { id: "tasa_descuento", etiqueta: "Tasa de descuento mensual", tipo: "tasa", requerido: true }, { id: "comision", etiqueta: "Comisión sobre el valor", tipo: "tasa", defecto: 0 }, { id: "dias", etiqueta: "Días anticipados", tipo: "entero", requerido: true }],
        salidas: [num("desembolso", "Valor recibido"), num("costo_total", "Costo total"), pct("costo_ea", "Costo efectivo anual")],
    },

    /* ------------------------------ Caja 3 · Créditos ------------------------------ */
    {
        codigo: "AMORT", nombre: "Tabla de amortización", caja: "calculo", dominio: "financiacion", version: "1.0.0", fuente: PROFE,
        descripcion: "Cuotas, intereses y saldo por periodo en cuatro sistemas, con costo efectivo y servicio del primer año.",
        entradas: [
            { id: "principal", etiqueta: "Monto", tipo: "dinero", requerido: true },
            { id: "plazo_anios", etiqueta: "Plazo en años", tipo: "numero", requerido: true },
            { id: "tasa_ea", etiqueta: "Tasa efectiva anual", tipo: "tasa", requerido: true },
            { id: "periodos_por_anio", etiqueta: "Pagos por año", tipo: "opcion", defecto: "12", opciones: [{ v: "12", etiqueta: "Mensual" }, { v: "4", etiqueta: "Trimestral" }, { v: "2", etiqueta: "Semestral" }, { v: "1", etiqueta: "Anual" }] },
            { id: "sistema", etiqueta: "Sistema", tipo: "opcion", defecto: "cuota_fija", opciones: SISTEMAS },
            { id: "gracia", etiqueta: "Periodos de gracia", tipo: "entero", defecto: 0 },
            { id: "comisiones", etiqueta: "Comisiones y gastos descontados del desembolso", tipo: "dinero", defecto: 0 },
        ],
        salidas: [num("cuota", "Primera cuota"), num("servicio_anio1", "Servicio de la deuda del primer año"), num("total_intereses", "Total de intereses"), num("total_pagado", "Total pagado"), pct("costo_ea", "Costo efectivo anual"), pct("costo_ea_comisiones", "Costo efectivo anual con comisiones"), num("desembolso_neto", "Desembolso neto"), num("cuotas", "Número de cuotas", "cuotas")],
        tablas: [{ id: "tabla", etiqueta: "Tabla de amortización" }],
    },
    {
        codigo: "COMPARAR", nombre: "Comparación de sistemas de amortización", caja: "calculo", dominio: "financiacion", version: "1.0.0", fuente: PROFE,
        descripcion: "Los cuatro sistemas con el mismo monto, plazo y tasa.",
        entradas: [{ id: "principal", etiqueta: "Monto", tipo: "dinero", requerido: true }, { id: "plazo_anios", etiqueta: "Plazo en años", tipo: "numero", requerido: true }, { id: "tasa_ea", etiqueta: "Tasa efectiva anual", tipo: "tasa", requerido: true }, { id: "periodos_por_anio", etiqueta: "Pagos por año", tipo: "opcion", defecto: "12", opciones: [{ v: "12", etiqueta: "Mensual" }, { v: "4", etiqueta: "Trimestral" }, { v: "2", etiqueta: "Semestral" }, { v: "1", etiqueta: "Anual" }] }],
        salidas: [txt("menor_interes", "Sistema con menos intereses"), num("intereses_cuota_fija", "Intereses con cuota fija"), num("intereses_abono_constante", "Intereses con abono constante")],
        tablas: [{ id: "sistemas", etiqueta: "Sistemas comparados" }],
    },
    {
        codigo: "CAP", nombre: "Capacidad de pago (DSCR)", caja: "calculo", dominio: "credito", version: "1.0.0", fuente: "Práctica bancaria: cobertura del servicio de la deuda",
        descripcion: "Cobertura del servicio de la deuda con el flujo disponible, holgura y servicio máximo admisible para deuda nueva.",
        entradas: [{ id: "flujo", etiqueta: "Flujo disponible para la deuda (anual)", tipo: "dinero", requerido: true }, { id: "servicio_actual", etiqueta: "Servicio de la deuda actual (anual)", tipo: "dinero", defecto: 0 }, { id: "servicio_nuevo", etiqueta: "Servicio de la deuda nueva (anual)", tipo: "dinero", defecto: 0 }, { id: "dscr_minimo", etiqueta: "DSCR mínimo", tipo: "numero", defecto: 1.3 }],
        salidas: [veces("dscr", "DSCR"), num("servicio_total", "Servicio total de la deuda"), num("holgura", "Holgura sobre el DSCR mínimo"), num("servicio_maximo_nuevo", "Servicio anual máximo para deuda nueva")],
    },
    {
        codigo: "CUPO", nombre: "Cupo máximo de crédito", caja: "calculo", dominio: "credito", version: "1.0.0", fuente: PROFE,
        descripcion: "Monto que se puede prestar con un servicio anual máximo, una tasa y un plazo (cuota fija anual).",
        entradas: [{ id: "servicio_maximo", etiqueta: "Servicio anual máximo", tipo: "dinero", requerido: true }, { id: "tasa_ea", etiqueta: "Tasa efectiva anual", tipo: "tasa", requerido: true }, { id: "plazo_anios", etiqueta: "Plazo en años", tipo: "entero", requerido: true }],
        salidas: [num("cupo", "Cupo máximo")],
    },

    /* ------------------------------ Caja 3 · Proyectos ------------------------------ */
    {
        codigo: "FLU", nombre: "Evaluación de un flujo de caja", caja: "calculo", dominio: "presupuesto", version: "1.0.0", fuente: PROFE,
        descripcion: "VPN, TIR, TIRM, índice de rentabilidad, VAE y periodo de recuperación, con el perfil del VPN.",
        entradas: [{ id: "flujos", etiqueta: "Flujos (año 0 en adelante)", tipo: "flujos", requerido: true }, { id: "k", etiqueta: "Tasa de descuento", tipo: "tasa", requerido: true }, { id: "k_reinversion", etiqueta: "Tasa de reinversión (TIRM)", tipo: "tasa" }],
        salidas: [num("vpn", "VPN"), pct("tir", "TIR"), pct("tirm", "TIRM"), veces("ir", "Índice de rentabilidad"), num("vae", "VAE"), { id: "recuperacion", etiqueta: "Periodo de recuperación", fmt: "x", unidad: "años" }, { id: "recuperacion_descontada", etiqueta: "Recuperación descontada", fmt: "x", unidad: "años" }],
        tablas: [{ id: "perfil", etiqueta: "Perfil del VPN" }],
    },
    {
        codigo: "CRUCE", nombre: "Proyectos excluyentes", caja: "calculo", dominio: "presupuesto", version: "1.0.0", fuente: PROFE,
        descripcion: "VPN de dos proyectos y tasa de cruce de Fisher.",
        entradas: [{ id: "flujos_a", etiqueta: "Flujos del proyecto A", tipo: "flujos", requerido: true }, { id: "flujos_b", etiqueta: "Flujos del proyecto B", tipo: "flujos", requerido: true }, { id: "k", etiqueta: "Tasa de descuento", tipo: "tasa", requerido: true }],
        salidas: [num("vpn_a", "VPN de A"), num("vpn_b", "VPN de B"), pct("tasa_cruce", "Tasa de cruce"), txt("preferido", "Proyecto preferido a la tasa dada")],
    },
    {
        codigo: "PROYECTO", nombre: "Modelo de proyecto de inversión", caja: "calculo", dominio: "presupuesto", version: "1.0.0", fuente: `${PROFE} (plantilla «Formulación de Proyectos»)`,
        descripcion: "Flujo de caja libre del proyecto y del inversionista con depreciación, KTNO, impuestos y deuda.",
        entradas: [
            { id: "horizonte", etiqueta: "Horizonte en años", tipo: "entero", requerido: true, defecto: 5 },
            { id: "ventas", etiqueta: "Ventas del año 1", tipo: "dinero", requerido: true },
            { id: "crecimiento", etiqueta: "Crecimiento anual de ventas", tipo: "tasa", defecto: 0.05 },
            { id: "costo_ventas", etiqueta: "Costo de ventas / ventas", tipo: "tasa", requerido: true },
            { id: "gastos", etiqueta: "Gastos de administración y ventas / ventas", tipo: "tasa", requerido: true },
            { id: "inversion", etiqueta: "Inversión en activos fijos", tipo: "dinero", requerido: true },
            { id: "vida_util", etiqueta: "Vida útil de los activos (años)", tipo: "entero", defecto: 10 },
            { id: "ktno", etiqueta: "KTNO / ventas", tipo: "tasa", defecto: 0.1 },
            { id: "tasa_impuesto", etiqueta: "Tarifa de renta", tipo: "tasa", defecto: 0.35 },
            { id: "deuda_proporcion", etiqueta: "Proporción financiada con deuda", tipo: "tasa", defecto: 0 },
            { id: "deuda_tasa", etiqueta: "Tasa de la deuda EA", tipo: "tasa", defecto: 0 },
            { id: "deuda_plazo", etiqueta: "Plazo de la deuda (años)", tipo: "entero", defecto: 5 },
            { id: "tmrr", etiqueta: "Rentabilidad mínima del inversionista", tipo: "tasa", requerido: true },
        ],
        salidas: [num("inversion_inicial", "Inversión inicial"), pct("costo_capital", "Costo de capital"), num("vpn", "VPN del proyecto"), pct("tir", "TIR del proyecto"), num("vpn_inversionista", "VPN del inversionista"), pct("tir_inversionista", "TIR del inversionista"), { id: "recuperacion", etiqueta: "Periodo de recuperación", fmt: "x", unidad: "años" }],
        tablas: [{ id: "flujo", etiqueta: "Flujo de caja proyectado" }],
    },

    /* ------------------------------ Caja 3 · Empresa (estados financieros) ------------------------------ */
    {
        codigo: "DQ", nombre: "Calidad de los estados", caja: "calculo", dominio: "contabilidad", version: "1.0.0", fuente: DX,
        descripcion: "Cuadre del balance, sumas de subtotales y saltos de escala.",
        entradas: [empresa],
        salidas: [num("anios_cuadrados", "Años con balance cuadrado", "años"), num("anios", "Años leídos", "años"), num("hallazgos_altos", "Hallazgos de severidad alta", "hallazgos"), num("hallazgos_medios", "Hallazgos de severidad media", "hallazgos"), txt("veredicto", "Veredicto de calidad")],
        tablas: [{ id: "hallazgos", etiqueta: "Hallazgos de calidad" }],
    },
    {
        codigo: "VH", nombre: "Análisis vertical y horizontal", caja: "calculo", dominio: "contabilidad", version: "1.0.0", fuente: DX,
        descripcion: "Peso de cada cuenta sobre el activo o los ingresos y su variación anual.",
        entradas: [empresa],
        salidas: [txt("mayor_variacion", "Cuenta con mayor variación"), pct("variacion_ingresos", "Variación de ingresos"), pct("variacion_activo", "Variación del activo")],
        tablas: [{ id: "balance", etiqueta: "Balance vertical y horizontal" }, { id: "resultados", etiqueta: "Resultados vertical y horizontal" }],
    },
    {
        codigo: "RAT", nombre: "Indicadores financieros", caja: "calculo", dominio: "analisis", version: "1.0.0", fuente: DX,
        descripcion: "Rentabilidad, liquidez, endeudamiento, cobertura y actividad del último año, con la serie histórica.",
        entradas: [empresa],
        salidas: [txt("anio", "Año analizado"), dinero("ingresos", "Ingresos"), dinero("ebitda", "EBITDA"), dinero("ebit", "EBIT"), dinero("utilidad_neta", "Utilidad neta"), dinero("activo", "Activo total"), dinero("deuda", "Deuda financiera"), dinero("patrimonio", "Patrimonio"), dinero("intereses", "Gasto por intereses"), dinero("impuestos", "Impuesto de renta"), dinero("flujo_deuda", "EBITDA menos impuestos"), pct("crecimiento_ingresos", "Crecimiento de ingresos"), pct("margen_bruto", "Margen bruto"), pct("margen_ebit", "Margen EBIT"), pct("margen_neto", "Margen neto"), pct("roe", "ROE"), pct("roa", "ROA"), pct("roic", "ROIC"), veces("razon_corriente", "Razón corriente"), veces("prueba_acida", "Prueba ácida"), veces("de", "Deuda / patrimonio"), pct("endeudamiento", "Pasivo / activo"), veces("cobertura", "Cobertura de intereses"), veces("deuda_neta_ebitda", "Deuda neta / EBITDA"), veces("rotacion_activos", "Rotación de activos")],
        tablas: [{ id: "serie", etiqueta: "Indicadores por año" }],
    },
    {
        codigo: "DUPONT", nombre: "Análisis DuPont", caja: "calculo", dominio: "analisis", version: "1.0.0", fuente: DX,
        descripcion: "Descompone el ROE en tres y cinco factores.",
        entradas: [empresa],
        salidas: [pct("roe", "ROE"), pct("margen_neto", "Margen neto"), veces("rotacion", "Rotación de activos"), veces("multiplicador", "Multiplicador del patrimonio"), pct("carga_tributaria", "Carga tributaria (UN/UAI)"), pct("carga_intereses", "Carga de intereses (UAI/EBIT)"), pct("margen_ebit", "Margen EBIT")],
        tablas: [{ id: "serie", etiqueta: "DuPont por año" }],
    },
    {
        codigo: "CT", nombre: "Capital de trabajo y ciclo de caja", caja: "calculo", dominio: "analisis", version: "1.0.0", fuente: DX,
        descripcion: "KTNO, días de cartera, inventario y proveedores, y ciclo de conversión de efectivo.",
        entradas: [empresa],
        salidas: [dinero("ktno", "KTNO"), pct("ktno_ventas", "KTNO / ventas"), num("dso", "Días de cartera", "días"), num("dio", "Días de inventario", "días"), num("dpo", "Días de proveedores", "días"), num("ciclo", "Ciclo de conversión de efectivo", "días")],
        tablas: [{ id: "serie", etiqueta: "Capital de trabajo por año" }],
    },
    {
        codigo: "FCL", nombre: "Flujo de caja libre histórico", caja: "calculo", dominio: "analisis", version: "1.0.0", fuente: DX,
        descripcion: "UODI + D&A − inversión en KTNO − CAPEX, año por año.",
        entradas: [empresa],
        salidas: [dinero("fcl", "FCL del último año"), dinero("uodi", "UODI del último año"), dinero("capex", "CAPEX del último año"), dinero("inversion_ktno", "Inversión en KTNO del último año"), dinero("fcl_acumulado", "FCL acumulado")],
        tablas: [{ id: "serie", etiqueta: "FCL por año" }],
    },
    {
        codigo: "WACCE", nombre: "WACC de la empresa", caja: "calculo", dominio: "costo_capital", version: "1.0.0", fuente: `${DX}; ${MIRAGE}`,
        descripcion: "Beta del sector re-apalancada con la estructura de la empresa, Ke, Kd, rating por cobertura y WACC en la moneda de los estados.",
        entradas: [empresa],
        salidas: [veces("beta_l", "Beta apalancada"), veces("de", "D/E de la empresa"), pct("ke", "Ke"), pct("kd", "Kd antes de impuestos"), pct("peso_deuda", "Peso de la deuda"), pct("wacc", "WACC"), pct("wacc_sector", "WACC del sector con la estructura del sector"), txt("rating_cobertura", "Rating por cobertura de intereses")],
        tablas: [{ id: "curva", etiqueta: "WACC según D/E" }],
    },
    {
        codigo: "DCF", nombre: "Valoración por flujo de caja descontado", caja: "calculo", dominio: "valoracion", version: "1.0.0", fuente: DX,
        descripcion: "FCL proyectado a cinco años, valor terminal de Gordon, valor de empresa, puente al patrimonio y sensibilidad WACC × crecimiento.",
        entradas: [empresa],
        salidas: [dinero("valor_empresa", "Valor de la empresa"), dinero("valor_presente_flujos", "Valor presente de los flujos"), dinero("valor_terminal_presente", "Valor presente del valor terminal"), pct("peso_valor_terminal", "Peso del valor terminal"), dinero("deuda_neta", "Deuda neta"), dinero("valor_patrimonio", "Valor del patrimonio"), veces("valor_accion", "Valor por acción"), pct("wacc", "WACC usado"), pct("g", "Crecimiento perpetuo")],
        tablas: [{ id: "proyeccion", etiqueta: "FCL proyectado" }, { id: "sensibilidad", etiqueta: "Valor del patrimonio según WACC y crecimiento" }],
    },
    {
        codigo: "EVA", nombre: "EVA y creación de valor", caja: "calculo", dominio: "analisis", version: "1.0.0", fuente: DX,
        descripcion: "UODI − WACC × capital invertido, con ROIC frente a WACC.",
        entradas: [empresa],
        salidas: [dinero("eva", "EVA del último año"), pct("roic", "ROIC"), pct("wacc", "WACC"), pct("spread", "ROIC − WACC"), dinero("capital_invertido", "Capital invertido"), num("anios_con_eva_positivo", "Años con EVA positivo", "años")],
        tablas: [{ id: "serie", etiqueta: "EVA por año" }],
    },
    {
        codigo: "APAL", nombre: "Apalancamiento y punto de equilibrio", caja: "calculo", dominio: "analisis", version: "1.0.0", fuente: DX,
        descripcion: "Grados de apalancamiento operativo, financiero y total, punto de equilibrio y margen de seguridad.",
        entradas: [empresa, { id: "gastos_fijos", etiqueta: "Gastos operativos fijos", tipo: "tasa", defecto: 1 }],
        salidas: [veces("gao", "GAO"), veces("gaf", "GAF"), veces("gat", "GAT"), dinero("punto_equilibrio", "Punto de equilibrio en ventas"), pct("margen_seguridad", "Margen de seguridad"), dinero("margen_contribucion", "Margen de contribución")],
    },
    {
        codigo: "UPA", nombre: "UPA y EBIT de indiferencia", caja: "calculo", dominio: "financiacion", version: "1.0.0", fuente: DX,
        descripcion: "Utilidad por acción financiando con acciones o con deuda y el EBIT en que ambas se igualan.",
        entradas: [empresa, { id: "financiacion", etiqueta: "Financiación adicional", tipo: "dinero" }, { id: "tasa_deuda", etiqueta: "Tasa de la deuda nueva", tipo: "tasa" }],
        salidas: [dinero("ebit_indiferencia", "EBIT de indiferencia"), veces("upa_acciones", "UPA financiando con acciones"), veces("upa_deuda", "UPA financiando con deuda"), txt("preferida", "Alternativa con mayor UPA")],
    },
    {
        codigo: "ZAL", nombre: "Z'' de Altman", caja: "calculo", dominio: "credito", version: "1.0.0", fuente: "Altman (1995), Z'' para mercados emergentes",
        descripcion: "Puntaje Z'' y rating equivalente.",
        entradas: [empresa],
        salidas: [veces("z", "Z''"), txt("rating", "Rating equivalente"), veces("x1", "Capital de trabajo / activo"), veces("x2", "Utilidades retenidas / activo"), veces("x3", "EBIT / activo"), veces("x4", "Patrimonio / pasivo"), txt("zona", "Zona")],
    },
    {
        codigo: "RTG", nombre: "Rating sintético", caja: "calculo", dominio: "credito", version: "1.0.0", fuente: DX,
        descripcion: "Rating multifactor (cobertura, apalancamiento, márgenes, tamaño, liquidez y riesgo país) y rating por cobertura de intereses.",
        entradas: [empresa],
        salidas: [txt("rating", "Rating sintético"), num("escalon", "Escalón (1 = AAA)"), txt("rating_cobertura", "Rating por cobertura"), veces("cobertura", "Cobertura de intereses")],
        tablas: [{ id: "factores", etiqueta: "Contribución de cada factor" }],
    },
    {
        codigo: "PD", nombre: "Probabilidad de incumplimiento", caja: "calculo", dominio: "credito", version: "1.0.0", fuente: DX,
        descripcion: "Probabilidad de incumplimiento a uno y tres años con Z'', cobertura y tamaño.",
        entradas: [empresa],
        salidas: [pct("pd_1", "PD a un año"), pct("pd_3", "PD a tres años")],
        tablas: [{ id: "factores", etiqueta: "Contribución de cada factor" }],
    },
];

export const MAPA_BLOQUES: Record<string, DefBloque> = Object.fromEntries(DEF_BLOQUES.map(b => [b.codigo, b]));

export function defBloque(codigo: string): DefBloque {
    const b = MAPA_BLOQUES[codigo];
    if (!b) throw new Error(`Bloque desconocido: ${codigo}.`);
    return b;
}
