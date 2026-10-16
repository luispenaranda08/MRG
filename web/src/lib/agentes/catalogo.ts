/**
 * Las 100 capacidades de finanzas corporativas del constructor. Cada una es una receta de bloques; está certificada
 * cuando todos sus bloques existen y su plantilla pasa las pruebas doradas (ver index.ts).
 */
import type { Dominio, Perfil } from "./tipos";

export const DOMINIOS: Record<Dominio, string> = {
    contabilidad: "Contabilidad y cierre",
    analisis: "Análisis financiero",
    credito: "Crédito y contraparte",
    costo_capital: "Costo de capital",
    valoracion: "Valoración",
    presupuesto: "Presupuesto de capital",
    tesoreria: "Tesorería y liquidez",
    financiacion: "Financiación y estructura de capital",
    riesgo: "Riesgo de mercado y cobertura",
    reportes: "Reportes, gobierno y comité",
};

export const PERFILES: Record<Perfil, string> = {
    contador: "Contador",
    analista: "Analista financiero",
    credito: "Analista de crédito",
    tesoreria: "Tesorería",
    cfo: "Director financiero",
    banca_inversion: "Banca de inversión",
};

type Fila = [numero: number, codigo: string, nombre: string, perfiles: Perfil[], bloques: string[], descripcion: string];

const A: Fila[] = [
    [1, "HOMOL", "Homologar estados NIIF, PUC o US GAAP", ["contador", "analista"], ["DQ", "RAT"], "Lee el archivo en cualquiera de 62 formatos, lo lleva a la plantilla estándar y verifica su calidad."],
    [2, "CUADRE", "Control de cuadre de los estados", ["contador"], ["DQ"], "Activo contra pasivo más patrimonio, sumas de subtotales y saltos de escala."],
    [3, "ATIPICO", "Cuentas mal clasificadas o atípicas", ["contador"], ["DQ", "REVISAR"], "Revisión de cada fila del archivo y del campo que se le asignó."],
    [4, "VH", "Análisis vertical y horizontal", ["contador", "analista"], ["VH"], "Peso de cada cuenta y su variación anual, con las variaciones que más pesan."],
    [5, "CONCIL", "Conciliar consolidado y separado", ["contador"], ["CONCIL"], "Diferencias entre estados consolidados y separados de un mismo emisor."],
    [6, "NOTAS", "Revelaciones de deuda e instrumentos", ["contador"], ["AMORT", "NOTAS"], "Borrador de la nota de obligaciones financieras con vencimientos y tasas."],
    [7, "TAX", "Tasa efectiva e impuesto diferido", ["contador", "cfo"], ["TAX"], "Conciliación de la tarifa nominal con la tasa efectiva."],
    [8, "DEP", "Depreciación por métodos", ["contador"], ["DEP"], "Línea recta, saldos decrecientes y unidades de producción."],
    [9, "ECL", "Pérdida esperada de cartera (NIIF 9)", ["contador", "credito"], ["ECL"], "Provisión por edades con matriz de pérdida."],
    [10, "CIERRE", "Cierre mensual con alertas", ["contador", "cfo"], ["RAT", "MENSUAL"], "Indicadores del mes y alertas frente al mes anterior."],
];
const B: Fila[] = [
    [11, "RAT", "Indicadores financieros", ["analista", "contador", "credito"], ["RAT"], "Rentabilidad, liquidez, endeudamiento, cobertura y actividad."],
    [12, "DUPONT", "DuPont de tres y cinco factores", ["analista", "cfo"], ["DUPONT"], "Qué explica el ROE: margen, rotación, apalancamiento, impuestos e intereses."],
    [13, "CICLO", "Ciclo de conversión de efectivo", ["analista", "tesoreria"], ["CT"], "Días de cartera, inventario y proveedores, y KTNO."],
    [14, "PARES", "Posición frente a pares por percentiles", ["analista", "credito"], ["RAT", "PARES"], "Percentil de cada indicador frente a las empresas del mismo sector."],
    [15, "FCL", "Flujo de caja libre histórico", ["analista", "cfo"], ["FCL"], "UODI, D&A, inversión en KTNO y CAPEX por año."],
    [16, "EVA", "EVA y creación de valor", ["analista", "cfo"], ["EVA"], "ROIC frente a WACC y valor económico agregado por año."],
    [17, "APAL", "Apalancamiento operativo, financiero y total", ["analista"], ["APAL"], "GAO, GAF y GAT del último año."],
    [18, "UPA", "UPA y EBIT de indiferencia", ["analista", "cfo"], ["UPA"], "Acciones o deuda: cuál da más utilidad por acción."],
    [19, "PE", "Punto de equilibrio y margen de seguridad", ["analista", "contador"], ["APAL"], "Ventas de equilibrio con la estructura de costos de la empresa."],
    [20, "DIAG", "Diagnóstico ejecutivo de una página", ["cfo", "analista"], ["DQ", "RAT", "SECTOR", "ZAL", "PD"], "Lectura completa de la empresa frente a su sector en una página."],
];
const C: Fila[] = [
    [21, "CRED", "Spreading y memo de crédito para comité", ["credito"], ["DQ", "RAT", "SECTOR", "RTG", "PD", "AMORT", "CAP"], "Estados del cliente, rating, PD, servicio de la deuda nueva, DSCR y decisión con reglas del comité."],
    [22, "RTG", "Rating sintético", ["credito", "analista"], ["RTG"], "Rating multifactor y rating por cobertura de intereses."],
    [23, "PD", "Probabilidad de incumplimiento", ["credito"], ["PD"], "PD a uno y tres años."],
    [24, "ZALT", "Z'' de Altman", ["credito", "analista"], ["ZAL"], "Puntaje Z'' para emergentes y rating equivalente."],
    [25, "DSCR", "Capacidad de pago (DSCR)", ["credito"], ["RAT", "AMORT", "CAP"], "Cobertura del servicio de la deuda actual y nueva con el flujo disponible."],
    [26, "CUPO", "Cupo máximo de crédito", ["credito"], ["RAT", "CAP", "CUPO"], "Monto máximo que se puede prestar con un DSCR objetivo."],
    [27, "COV", "Seguimiento de covenants", ["credito", "cfo"], ["RAT", "COV"], "Indicadores frente a los covenants del contrato y holgura."],
    [28, "ALERTA", "Alerta temprana de cartera", ["credito"], ["PARES", "PD", "PROGRAMAR"], "Recalcula a cada deudor cuando reporta a Supersociedades y avisa si se deteriora."],
    [29, "CONTRA", "Riesgo de contraparte de clientes y proveedores", ["credito", "tesoreria"], ["RAT", "ZAL", "PD"], "Solidez financiera de un tercero antes de darle plazo o anticiparle."],
    [30, "PRICE", "Precio de un crédito", ["credito"], ["PD", "PRICING"], "Fondeo, pérdida esperada, costo del capital y margen."],
];
const D: Fila[] = [
    [31, "WACCE", "WACC de una empresa no listada", ["cfo", "analista", "banca_inversion"], ["WACCE"], "Beta del sector re-apalancada con la estructura de la empresa."],
    [32, "KE", "Ke por CAPM con riesgo país", ["analista", "banca_inversion"], ["MERCADO", "SECTOR", "WACC"], "Costo del patrimonio en USD y COP."],
    [33, "KD", "Kd observado y rating por cobertura", ["analista", "credito"], ["SECTOR", "RTG"], "Kd del sector por tamaño y rating de la empresa por cobertura."],
    [34, "BETA", "Beta re-apalancada con estructura objetivo", ["analista", "banca_inversion"], ["SECTOR", "WACC"], "Hamada con el D/E que fije el usuario."],
    [35, "WACC", "WACC en COP y USD, nominal y real", ["cfo", "analista", "banca_inversion"], ["MERCADO", "SECTOR", "WACC"], "Costo de capital de un sector o de una estructura objetivo."],
    [36, "WSENS", "Sensibilidad del WACC", ["analista", "cfo"], ["MERCADO", "SECTOR", "WACC"], "WACC según D/E y según la prima país."],
    [37, "PRETAX", "Tasa antes de impuestos para NIC 36", ["contador", "cfo"], ["WACC", "PRETAX"], "Tasa antes de impuestos que da el mismo valor en uso."],
    [38, "PURE", "Tasa por división con pure play", ["banca_inversion", "cfo"], ["PARES", "WACC"], "Beta de comparables puros para una división o proyecto."],
    [39, "KEFIN", "Ke de bancos y aseguradoras", ["banca_inversion"], ["MERCADO", "KEFIN"], "Costo del patrimonio para entidades financieras."],
    [40, "WDOC", "Documento metodológico del costo de capital", ["cfo", "contador"], ["MERCADO", "SECTOR", "WACC"], "Memo con supuestos, fuentes y cálculo, listo para auditoría."],
];
const E: Fila[] = [
    [41, "DCF", "Valoración por DCF", ["banca_inversion", "cfo"], ["DCF"], "FCL proyectado, valor terminal y valor de la empresa."],
    [42, "COMPS", "Valoración por múltiplos", ["banca_inversion"], ["PARES", "COMPS"], "Múltiplos de comparables sobre las cifras de la empresa."],
    [43, "PUENTE", "Del valor de empresa al valor por acción", ["banca_inversion", "cfo"], ["DCF"], "Valor de empresa, deuda neta, patrimonio y valor por acción."],
    [44, "VSENS", "Sensibilidad del valor", ["banca_inversion", "cfo"], ["DCF"], "Valor del patrimonio según WACC y crecimiento perpetuo."],
    [45, "MC", "Simulación Monte Carlo del valor", ["banca_inversion"], ["DCF", "MC"], "Distribución del valor con supuestos inciertos."],
    [46, "NIC36", "Prueba de deterioro NIC 36", ["contador", "cfo"], ["DCF", "PRETAX"], "Valor en uso frente al valor en libros."],
    [47, "MA", "Adquisición con sinergias", ["banca_inversion"], ["DCF", "MA"], "Valor de la combinación y precio máximo."],
    [48, "ACCR", "Efecto de una adquisición en la UPA", ["banca_inversion"], ["UPA", "MA"], "Acreción o dilución de la UPA."],
    [49, "VC", "Valoración de empresa en pérdidas (método VC)", ["banca_inversion"], ["VC"], "Valor de salida descontado a la tasa del inversionista."],
    [50, "VALINF", "Informe de valoración para junta", ["banca_inversion", "cfo"], ["DCF", "COMPS"], "Rango de valor por métodos y conclusión."],
];
const F: Fila[] = [
    [51, "FLU", "VPN, TIR, TIRM y recuperación", ["analista", "cfo"], ["FLU"], "Evaluación completa de un flujo de caja."],
    [52, "EXCL", "Proyectos excluyentes", ["analista", "cfo"], ["CRUCE", "FLU"], "VPN de cada uno, tasa de cruce y VAE."],
    [53, "PERFIL", "Perfil del VPN", ["analista"], ["FLU"], "VPN según la tasa de descuento."],
    [54, "PROY", "Modelo de proyecto de inversión", ["analista", "cfo"], ["PROYECTO"], "FCL del proyecto y del inversionista con impuestos, KTNO y deuda."],
    [55, "PSENS", "Escenarios de un proyecto", ["analista", "cfo"], ["PROYECTO", "SENS"], "VPN en escenarios y sensibilidad a cada supuesto."],
    [56, "LEASE", "Comprar o arrendar", ["cfo", "tesoreria"], ["FLU", "LEASE"], "Valor presente del arrendamiento frente a la compra financiada."],
    [57, "REEMP", "Reemplazo de activos", ["analista", "cfo"], ["FLU"], "Comparación por valor anual equivalente."],
    [58, "KNAP", "Selección de proyectos con presupuesto limitado", ["cfo"], ["FLU", "KNAP"], "Cartera de proyectos que maximiza el VPN."],
    [59, "PROYFX", "Proyecto con inversión en USD", ["analista", "cfo"], ["MERCADO", "INDICADORES", "REAL", "PROYECTO"], "Tasa en otra moneda y evaluación del proyecto."],
    [60, "FICHA", "Ficha de inversión para comité", ["cfo"], ["PROYECTO"], "Proyecto evaluado con reglas de aprobación del comité."],
];
const G: Fila[] = [
    [61, "TASA", "Conversión de tasas", ["tesoreria", "contador", "analista"], ["TASA"], "Nominal, efectiva, anticipada y equivalencias."],
    [62, "CAJA13", "Flujo de caja de 13 semanas", ["tesoreria", "cfo"], ["CAJA13"], "Recaudos, pagos y saldo semana a semana."],
    [63, "CAJA12", "Proyección de caja a 12 meses", ["tesoreria", "cfo"], ["CAJA"], "Caja mensual con necesidades de financiación."],
    [64, "EXCED", "Inversión de excedentes", ["tesoreria"], ["CURVA", "CDT"], "CDT, TES y fondos comparados en la misma base."],
    [65, "CDT", "Tasas de CDT frente al mercado", ["tesoreria"], ["CDT"], "Tasas captadas por plazo frente a las del sistema."],
    [66, "DPP", "Costo del descuento por pronto pago", ["tesoreria", "contador"], ["DPP"], "Costo efectivo de no tomar el descuento comercial."],
    [67, "FACT", "Costo de factoring y confirming", ["tesoreria"], ["FACTORING"], "Tasa efectiva de anticipar facturas."],
    [68, "KTNO", "Necesidad de capital de trabajo", ["tesoreria", "cfo"], ["CT", "CAJA"], "KTNO esperado y cupo de línea de crédito."],
    [69, "FXPOS", "Posición neta en moneda extranjera", ["tesoreria"], ["FXPOS"], "Activos y pasivos en divisas y exposición neta."],
    [70, "LIQ", "Alerta de liquidez", ["tesoreria", "cfo"], ["RAT", "CT"], "Razón corriente, prueba ácida y ciclo de caja frente a umbrales."],
];
const H: Fila[] = [
    [71, "AMORT", "Tabla de amortización", ["tesoreria", "contador", "credito"], ["AMORT"], "Cuotas, intereses y saldo por periodo."],
    [72, "SISTEMAS", "Comparación de sistemas de amortización", ["tesoreria", "credito"], ["COMPARAR"], "Cuota fija, abono constante, bono con cupón y cero cupón."],
    [73, "COSTOCR", "Costo efectivo de un crédito con comisiones", ["tesoreria", "cfo"], ["AMORT"], "Tasa que iguala el monto neto recibido con las cuotas."],
    [74, "REFI", "Conveniencia de refinanciar", ["tesoreria", "cfo"], ["FLU", "REFI"], "Ahorro en valor presente de cambiar de crédito."],
    [75, "ESTOPT", "Estructura de capital óptima", ["cfo", "banca_inversion"], ["WACC", "KDRTG"], "D/E que minimiza el WACC con Kd creciente por rating."],
    [76, "BONO", "Bono: precio, rendimiento y duración", ["tesoreria", "banca_inversion"], ["BONO"], "Precio limpio y sucio, TIR, duración y convexidad."],
    [77, "SPREAD", "Spread de emisión frente a la curva", ["banca_inversion", "cfo"], ["CURVA", "RTG"], "Spread esperado para una emisión según su rating."],
    [78, "DIVID", "Dividendos y recompra", ["cfo"], ["UPA", "CAJA"], "Efecto en caja, UPA y apalancamiento."],
    [79, "LEASEF", "Leasing financiero frente a crédito", ["tesoreria", "cfo"], ["AMORT", "LEASE"], "Costo después de impuestos de cada alternativa."],
    [80, "ENDMAX", "Endeudamiento máximo con covenant", ["cfo", "credito"], ["CAP", "COV"], "Deuda adicional que cabe sin romper los covenants."],
];
const I: Fila[] = [
    [81, "FXPYG", "Exposición cambiaria del estado de resultados", ["tesoreria", "cfo"], ["FXPOS", "INDICADORES"], "Efecto de la TRM en ingresos, costos y utilidad."],
    [82, "FWD", "Cobertura con forward", ["tesoreria"], ["FWD", "INDICADORES"], "Tasa forward, costo de la cobertura y resultado."],
    [83, "IBRSENS", "Sensibilidad de la deuda a la IBR", ["tesoreria", "cfo"], ["AMORT", "INDICADORES", "SENS"], "Servicio de la deuda indexada ante cambios de la IBR."],
    [84, "DUR", "Duración y convexidad de un portafolio", ["tesoreria"], ["BONO"], "Riesgo de tasa de un portafolio de renta fija."],
    [85, "VAR", "Valor en riesgo de la tesorería", ["tesoreria"], ["VAR"], "VaR paramétrico e histórico."],
    [86, "MACRO", "Escenarios macro sobre la empresa", ["cfo", "analista"], ["INDICADORES", "DCF", "SENS"], "Inflación, TRM y tasa del Banco de la República sobre resultados y valor."],
    [87, "STRESS", "Prueba de estrés de liquidez", ["tesoreria", "cfo"], ["CAJA", "SENS"], "Meses de caja ante caídas de ventas o cierre de crédito."],
    [88, "COMM", "Riesgo de commodities en costos", ["cfo"], ["COMM"], "Sensibilidad del margen a precios de materias primas."],
    [89, "CICLOEC", "Sensibilidad al ciclo económico", ["analista"], ["PARES", "INDICADORES"], "Relación histórica de la empresa con el PIB y las tasas."],
    [90, "MAPA", "Mapa de riesgos financieros", ["cfo"], ["PD", "FXPOS", "VAR"], "Riesgos de crédito, mercado y liquidez en una página."],
];
const J: Fila[] = [
    [91, "JUNTA", "Informe financiero para junta directiva", ["cfo"], ["RAT", "SECTOR", "EVA", "FCL"], "Desempeño, creación de valor y caja frente al sector."],
    [92, "COMITE", "Memo de comité de crédito", ["credito"], ["DQ", "RAT", "SECTOR", "RTG", "PD", "AMORT", "CAP", "PARES"], "Memo de crédito con posición frente a pares por percentiles."],
    [93, "INV", "Memo de comité de inversión", ["cfo", "banca_inversion"], ["PROYECTO", "FLU"], "Proyecto evaluado y recomendación con reglas."],
    [94, "PPTO", "Presupuesto frente a real", ["cfo", "contador"], ["PPTO"], "Variaciones y sus causas."],
    [95, "ROIC", "Indicadores para remuneración variable", ["cfo"], ["EVA", "RAT"], "EVA, ROIC y spread frente al WACC."],
    [96, "AUDXL", "Revisión de un modelo en Excel", ["analista", "cfo"], ["AUDXL"], "Fórmulas, vínculos rotos y supuestos fijos."],
    [97, "SFC", "Resumen de una empresa vigilada por la SFC", ["analista", "credito"], ["SFC", "RAT"], "Estados reportados a la Superfinanciera e indicadores."],
    [98, "GRANDES", "Comparación con las grandes empresas del país", ["analista", "cfo"], ["RAT", "PARES"], "Posición frente a las mayores empresas por ingresos."],
    [99, "AUDIT", "Supuestos y fuentes de una cifra", ["contador", "cfo"], ["TRAZA"], "Respuesta a un auditor con la traza completa."],
    [100, "MONITOR", "Monitor semanal del mercado colombiano", ["tesoreria", "cfo"], ["MERCADO", "INDICADORES", "PROGRAMAR"], "Tasas, TRM e inflación cada semana."],
];

const DOM: [Dominio, Fila[]][] = [["contabilidad", A], ["analisis", B], ["credito", C], ["costo_capital", D], ["valoracion", E], ["presupuesto", F], ["tesoreria", G], ["financiacion", H], ["riesgo", I], ["reportes", J]];

export interface CapacidadBase { numero: number; codigo: string; nombre: string; dominio: Dominio; perfiles: Perfil[]; bloques: string[]; descripcion: string }

export const CATALOGO: CapacidadBase[] = DOM.flatMap(([dominio, filas]) => filas.map(([numero, codigo, nombre, perfiles, bloques, descripcion]) => ({ numero, codigo, nombre, dominio, perfiles, bloques, descripcion })));
