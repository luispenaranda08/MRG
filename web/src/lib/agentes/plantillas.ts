/**
 * Plantillas de las capacidades certificadas: agentes listos con sus entradas, pasos conectados, reglas e instrucción.
 * Solo datos; cada plantilla pasa las pruebas doradas de lib/agentes/__tests__/agentes.cjs.
 */
import { MAPA_BLOQUES } from "./bloques-def";
import { ahora } from "./receta";
import type { Agente, Campo, Efecto, Operador, Paso, Regla, TipoTexto, ValorCampo, Vinculo } from "./tipos";

/** Atajo de vínculo: "@id" = entrada del agente; "paso.salida" = cifra de un paso anterior; otro valor = fijo. */
type Atajo = string | number | boolean | null | number[];

const EST: Campo = { id: "empresa", etiqueta: "Estados financieros", tipo: "estados", requerido: true };
const SECT: Campo = { id: "sector", etiqueta: "Sector CIIU", tipo: "sector", requerido: true, defecto: 0 };
const TAM: Campo = { id: "tamano", etiqueta: "Tamaño de empresa", tipo: "tamano", defecto: "Grande" };
const num = (id: string, etiqueta: string, defecto?: number, extra: Partial<Campo> = {}): Campo => ({ id, etiqueta, tipo: "numero", requerido: true, defecto, ...extra });
const tasa = (id: string, etiqueta: string, defecto?: number, extra: Partial<Campo> = {}): Campo => ({ id, etiqueta, tipo: "tasa", requerido: true, defecto, ...extra });
const dinero = (id: string, etiqueta: string, defecto?: number, extra: Partial<Campo> = {}): Campo => ({ id, etiqueta, tipo: "dinero", requerido: true, defecto, ...extra });
const flujos = (id: string, etiqueta: string, defecto: number[]): Campo => ({ id, etiqueta, tipo: "flujos", requerido: true, defecto });
const PAGOS: Campo = { id: "periodos_por_anio", etiqueta: "Pagos por año", tipo: "opcion", defecto: "12", opciones: [{ v: "12", etiqueta: "Mensual" }, { v: "4", etiqueta: "Trimestral" }, { v: "2", etiqueta: "Semestral" }, { v: "1", etiqueta: "Anual" }] };

const regla = (cifra: string, operador: Operador, umbral: number, efecto: Efecto, mensaje: string, umbralDe?: string): Regla => ({ id: cifra.replace(".", "_"), cifra, operador, umbral, efecto, mensaje, ...(umbralDe ? { umbralDe } : {}) });

function vinculo(v: Atajo, pasos: Set<string>): Vinculo {
    if (typeof v === "string" && v.startsWith("@")) return { de: "entrada", id: v.slice(1) };
    if (typeof v === "string" && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(v) && pasos.has(v.split(".")[0])) { const [paso, salida] = v.split("."); return { de: "paso", paso, salida }; }
    return { de: "valor", v: v as ValorCampo };
}

type DefPaso = [id: string, bloque: string, vinculos?: Record<string, Atajo>];

function agente(codigo: string, nombre: string, descripcion: string, entradas: Campo[], defs: DefPaso[], texto: string, salida: TipoTexto, reglas: Regla[] = []): () => Agente {
    return () => {
        const ids = new Set<string>(), pasos: Paso[] = [];
        for (const [id, bloque, atajos = {}] of defs) {
            const def = MAPA_BLOQUES[bloque], vinculos: Record<string, Vinculo> = {};
            for (const c of def.entradas) {
                if (c.id in atajos) vinculos[c.id] = vinculo(atajos[c.id], ids);
                else if (entradas.some(e => e.id === c.id)) vinculos[c.id] = { de: "entrada", id: c.id };
                else if (c.tipo === "estados" && entradas.some(e => e.tipo === "estados")) vinculos[c.id] = { de: "entrada", id: entradas.find(e => e.tipo === "estados")!.id };
                else if (c.defecto !== undefined) vinculos[c.id] = { de: "valor", v: c.defecto };
            }
            pasos.push({ id, bloque, vinculos });
            ids.add(id);
        }
        const t = ahora();
        return { id: `plantilla_${codigo.toLowerCase()}`, nombre, descripcion, capacidad: codigo, version: 1, creado: t, actualizado: t, entradas: structuredClone(entradas), pasos, instruccion: { texto, salida, reglas } };
    };
}

/* Costo de capital del sector con los parámetros del corte: base de KE, WACC, BETA, WSENS y WDOC. */
const pasosWacc = (de: Atajo = "sector.de"): DefPaso[] => [
    ["mercado", "MERCADO"],
    ["sector", "SECTOR", { empresa: null }],
    ["wacc", "WACC", { beta_u: "sector.beta_u", de, tasa_impuesto: "mercado.tasa_impuesto", rf: "mercado.rf_usd", erp: "mercado.erp", crp: "mercado.crp", kd: "sector.kd", inflacion_cop: "mercado.inflacion_cop", inflacion_usd: "mercado.inflacion_usd" }],
];

export const PLANTILLAS: Record<string, () => Agente> = {
    /* A · Contabilidad */
    HOMOL: agente("HOMOL", "Homologación de estados", "Lleva el archivo a la plantilla estándar de Mirage y verifica su calidad.", [EST], [["dq", "DQ"], ["rat", "RAT"]],
        "Resume en qué quedaron homologados los estados (años, unidad), los hallazgos de calidad y las cifras principales del último año.", "resumen", [regla("dq.hallazgos_altos", "<=", 0, "alertar", "Hay hallazgos de calidad de severidad alta.")]),
    CUADRE: agente("CUADRE", "Control de cuadre", "Cuadre del balance, sumas de subtotales y saltos de escala.", [EST], [["dq", "DQ"]],
        "Informa si los estados cuadran y qué debe corregir el contador antes de usarlos.", "resumen", [regla("dq.hallazgos_altos", "<=", 0, "condicionar", "Corregir los hallazgos de severidad alta antes de usar los estados.")]),
    VH: agente("VH", "Análisis vertical y horizontal", "Peso de cada cuenta y su variación anual.", [EST], [["vh", "VH"]],
        "Explica las variaciones que más pesan en el balance y en resultados del último año.", "resumen"),

    /* B · Análisis financiero */
    RAT: agente("RAT", "Indicadores financieros", "Rentabilidad, liquidez, endeudamiento, cobertura y actividad.", [EST], [["rat", "RAT"]],
        "Lee los indicadores del último año: qué está bien, qué preocupa y qué revisar.", "resumen"),
    DUPONT: agente("DUPONT", "DuPont", "Qué explica el ROE.", [EST], [["dupont", "DUPONT"]],
        "Explica qué factor impulsa o frena el ROE: margen, rotación, apalancamiento, impuestos o intereses.", "resumen"),
    CICLO: agente("CICLO", "Ciclo de conversión de efectivo", "Días de cartera, inventario y proveedores.", [EST], [["ct", "CT"]],
        "Explica el ciclo de caja y dónde está atrapado el capital de trabajo.", "resumen", [regla("ct.ciclo", "<=", 90, "alertar", "Ciclo de conversión de efectivo superior a 90 días.")]),
    FCL: agente("FCL", "Flujo de caja libre histórico", "UODI, D&A, KTNO y CAPEX por año.", [EST], [["fcl", "FCL"]],
        "Explica cuánta caja libre genera la empresa y qué la consume.", "resumen"),
    EVA: agente("EVA", "EVA y creación de valor", "ROIC frente a WACC.", [EST], [["eva", "EVA"]],
        "Dice si la empresa crea valor, con cuánto margen y desde cuándo.", "resumen", [regla("eva.spread", ">", 0, "alertar", "El ROIC no supera el WACC: la empresa destruye valor.")]),
    APAL: agente("APAL", "Apalancamiento operativo y financiero", "GAO, GAF y GAT.", [EST, tasa("gastos_fijos", "Porción fija de los gastos operativos", 1)], [["apal", "APAL"]],
        "Explica la sensibilidad de la utilidad a cambios en ventas y el riesgo que agrega la deuda.", "resumen"),
    UPA: agente("UPA", "UPA y EBIT de indiferencia", "Acciones o deuda.", [EST, dinero("financiacion", "Financiación adicional (valor completo)", undefined, { requerido: false, escala: "estados" }), tasa("tasa_deuda", "Tasa de la deuda nueva", 0.14)], [["upa", "UPA"]],
        "Recomienda cómo financiarse según la UPA y el EBIT de indiferencia.", "decision"),
    PE: agente("PE", "Punto de equilibrio", "Ventas de equilibrio y margen de seguridad.", [EST, tasa("gastos_fijos", "Porción fija de los gastos operativos", 1)], [["apal", "APAL"]],
        "Explica el punto de equilibrio y qué tan lejos están las ventas actuales.", "resumen", [regla("apal.margen_seguridad", ">=", 0.2, "alertar", "Margen de seguridad inferior a 20 %.")]),
    DIAG: agente("DIAG", "Diagnóstico ejecutivo", "La empresa frente a su sector en una página.", [EST], [["dq", "DQ"], ["sector", "SECTOR"], ["rat", "RAT"], ["zal", "ZAL"], ["pd", "PD"]],
        "Escribe el diagnóstico ejecutivo para la gerencia: rentabilidad, liquidez, deuda y riesgo frente a las referencias del sector.", "memo"),

    /* C · Crédito */
    CRED: agente("CRED", "Memo de crédito para comité", "Estados del cliente, rating, PD, servicio de la deuda nueva y DSCR con las reglas del comité. El servicio actual se aproxima con los intereses del último año.",
        [EST, dinero("monto", "Monto solicitado (valor completo)", 500_000_000, { escala: "estados" }), num("plazo_anios", "Plazo en años", 5), tasa("tasa_ea", "Tasa efectiva anual", 0.16), PAGOS, num("dscr_minimo", "DSCR mínimo del comité", 1.3)],
        [["sector", "SECTOR"], ["dq", "DQ"], ["rat", "RAT"], ["rtg", "RTG"], ["pd", "PD"],
            ["amort", "AMORT", { principal: "@monto", plazo_anios: "@plazo_anios", tasa_ea: "@tasa_ea", periodos_por_anio: "@periodos_por_anio" }],
            ["cap", "CAP", { flujo: "rat.flujo_deuda", servicio_actual: "rat.intereses", servicio_nuevo: "amort.servicio_anio1", dscr_minimo: "@dscr_minimo" }],
            ["cupo", "CUPO", { servicio_maximo: "cap.servicio_maximo_nuevo", tasa_ea: "@tasa_ea", plazo_anios: "@plazo_anios" }]],
        "Redacta el memo para el comité de crédito: perfil y calidad de los estados del cliente, capacidad de pago con el crédito solicitado, rating y probabilidad de incumplimiento, cupo máximo y la decisión con sus condiciones.", "memo",
        [regla("cap.dscr", ">=", 1.3, "condicionar", "DSCR por debajo del mínimo del comité con el crédito solicitado.", "dscr_minimo"), regla("pd.pd_1", "<=", 0.05, "negar", "Probabilidad de incumplimiento a un año superior a 5 %."), regla("rat.deuda_neta_ebitda", "<=", 3.5, "condicionar", "Deuda neta / EBITDA superior a 3,5 veces."), regla("rat.cobertura", ">=", 2, "condicionar", "Cobertura de intereses inferior a 2 veces."), regla("dq.hallazgos_altos", "<=", 0, "condicionar", "Los estados tienen hallazgos de calidad de severidad alta.")]),
    RTG: agente("RTG", "Rating sintético", "Rating multifactor y por cobertura.", [EST], [["rtg", "RTG"]],
        "Explica el rating y qué factores lo suben o lo bajan.", "resumen"),
    PD: agente("PD", "Probabilidad de incumplimiento", "PD a uno y tres años.", [EST], [["pd", "PD"], ["zal", "ZAL"]],
        "Explica la probabilidad de incumplimiento y sus causas.", "resumen", [regla("pd.pd_1", "<=", 0.05, "alertar", "PD a un año superior a 5 %.")]),
    ZALT: agente("ZALT", "Z'' de Altman", "Puntaje Z'' y zona.", [EST], [["zal", "ZAL"]],
        "Explica el puntaje Z'' y la zona en que cae la empresa.", "resumen", [regla("zal.z", ">=", 4.15, "alertar", "Z'' en zona de riesgo de insolvencia.")]),
    DSCR: agente("DSCR", "Capacidad de pago", "DSCR con el crédito nuevo.", [EST, dinero("monto", "Monto del crédito (valor completo)", 500_000_000, { escala: "estados" }), num("plazo_anios", "Plazo en años", 5), tasa("tasa_ea", "Tasa efectiva anual", 0.16), PAGOS, num("dscr_minimo", "DSCR mínimo", 1.3)],
        [["rat", "RAT"], ["amort", "AMORT", { principal: "@monto", plazo_anios: "@plazo_anios", tasa_ea: "@tasa_ea", periodos_por_anio: "@periodos_por_anio" }], ["cap", "CAP", { flujo: "rat.flujo_deuda", servicio_actual: "rat.intereses", servicio_nuevo: "amort.servicio_anio1", dscr_minimo: "@dscr_minimo" }]],
        "Concluye si la empresa puede servir el crédito y con qué holgura.", "decision", [regla("cap.dscr", ">=", 1.3, "condicionar", "DSCR por debajo del mínimo.", "dscr_minimo")]),
    CUPO: agente("CUPO", "Cupo máximo de crédito", "Monto máximo con un DSCR objetivo.", [EST, num("plazo_anios", "Plazo en años", 5), tasa("tasa_ea", "Tasa efectiva anual", 0.16), num("dscr_minimo", "DSCR objetivo", 1.3)],
        [["rat", "RAT"], ["cap", "CAP", { flujo: "rat.flujo_deuda", servicio_actual: "rat.intereses", servicio_nuevo: 0, dscr_minimo: "@dscr_minimo" }], ["cupo", "CUPO", { servicio_maximo: "cap.servicio_maximo_nuevo", tasa_ea: "@tasa_ea", plazo_anios: "@plazo_anios" }]],
        "Indica el cupo máximo y los supuestos de los que depende.", "decision"),
    CONTRA: agente("CONTRA", "Riesgo de contraparte", "Solidez de un cliente o proveedor.", [EST], [["rat", "RAT"], ["zal", "ZAL"], ["pd", "PD"]],
        "Recomienda si conviene darle plazo o anticiparle a este tercero y con qué límites.", "decision", [regla("pd.pd_1", "<=", 0.05, "negar", "PD a un año superior a 5 %."), regla("rat.razon_corriente", ">=", 1, "condicionar", "Razón corriente inferior a 1.")]),

    /* D · Costo de capital */
    WACCE: agente("WACCE", "WACC de la empresa", "Beta del sector re-apalancada con la estructura de la empresa.", [EST], [["wacce", "WACCE"]],
        "Explica el WACC de la empresa y la diferencia con el WACC del sector.", "resumen"),
    KE: agente("KE", "Ke por CAPM con riesgo país", "Costo del patrimonio en USD y COP.", [SECT, TAM], pasosWacc(),
        "Explica cómo se construye el Ke del sector y qué parámetros pesan más.", "resumen"),
    KD: agente("KD", "Kd y rating por cobertura", "Kd observado del sector y rating de la empresa.", [EST], [["sector", "SECTOR"], ["rtg", "RTG"]],
        "Explica el Kd de referencia y si el rating por cobertura de la empresa lo respalda.", "resumen"),
    BETA: agente("BETA", "Beta re-apalancada", "Hamada con el D/E que fije el usuario.", [SECT, TAM, num("de", "D/E objetivo", 0.5)], pasosWacc("@de"),
        "Explica la beta apalancada con la estructura objetivo y su efecto en el Ke.", "resumen"),
    WACC: agente("WACC", "Costo de capital del sector", "WACC en COP y USD, nominal y real.", [SECT, TAM], pasosWacc(),
        "Presenta el costo de capital del sector con sus componentes.", "resumen"),
    WSENS: agente("WSENS", "Sensibilidad del WACC", "WACC según D/E y prima país.", [SECT, TAM], pasosWacc(),
        "Explica cómo cambia el WACC con la estructura de capital y con la prima país.", "resumen"),
    WDOC: agente("WDOC", "Documento metodológico del costo de capital", "Memo con supuestos, fuentes y cálculo.", [SECT, TAM], pasosWacc(),
        "Redacta el documento metodológico del costo de capital para auditoría: metodología CAPM con riesgo país, cada supuesto con su fuente y corte, el cálculo y el resultado.", "memo"),

    /* E · Valoración */
    DCF: agente("DCF", "Valoración por DCF", "FCL proyectado y valor terminal.", [EST], [["dcf", "DCF"]],
        "Presenta el valor de la empresa, el peso del valor terminal y los supuestos críticos.", "memo", [regla("dcf.peso_valor_terminal", "<=", 0.8, "alertar", "El valor terminal pesa más de 80 % del valor.")]),
    PUENTE: agente("PUENTE", "Del valor de empresa al valor por acción", "Puente de valor.", [EST], [["dcf", "DCF"]],
        "Explica el paso del valor de la empresa al valor del patrimonio y por acción.", "resumen"),
    VSENS: agente("VSENS", "Sensibilidad del valor", "Valor según WACC y crecimiento.", [EST], [["dcf", "DCF"]],
        "Explica el rango de valor que dejan los escenarios de WACC y crecimiento.", "resumen"),

    /* F · Presupuesto de capital */
    FLU: agente("FLU", "Evaluación de un flujo de caja", "VPN, TIR, TIRM y recuperación.", [flujos("flujos", "Flujos (año 0 en adelante)", [-1000, 300, 350, 400, 450]), tasa("k", "Tasa de descuento", 0.15)], [["flu", "FLU"]],
        "Recomienda aceptar o rechazar con base en los indicadores.", "decision", [regla("flu.vpn", ">", 0, "negar", "El VPN no es positivo.")]),
    EXCL: agente("EXCL", "Proyectos excluyentes", "Tasa de cruce y VAE.", [flujos("flujos_a", "Flujos del proyecto A", [-10000, 3000, 3000, 3000, 3000, 3000]), flujos("flujos_b", "Flujos del proyecto B", [-25000, 7400, 7400, 7400, 7400, 7400]), tasa("k", "Tasa de descuento", 0.12)],
        [["cruce", "CRUCE"], ["fa", "FLU", { flujos: "@flujos_a", k: "@k" }], ["fb", "FLU", { flujos: "@flujos_b", k: "@k" }]],
        "Recomienda qué proyecto elegir y por qué, mencionando la tasa de cruce.", "decision"),
    PERFIL: agente("PERFIL", "Perfil del VPN", "VPN según la tasa.", [flujos("flujos", "Flujos (año 0 en adelante)", [-1000, 300, 350, 400, 450]), tasa("k", "Tasa de descuento", 0.15)], [["flu", "FLU"]],
        "Explica hasta qué tasa el proyecto conserva VPN positivo.", "resumen"),
    PROY: agente("PROY", "Modelo de proyecto de inversión", "FCL del proyecto y del inversionista.",
        [num("horizonte", "Horizonte en años", 5, { tipo: "entero" }), dinero("ventas", "Ventas del año 1", 1000000000), tasa("crecimiento", "Crecimiento anual", 0.05), tasa("costo_ventas", "Costo de ventas / ventas", 0.55), tasa("gastos", "Gastos / ventas", 0.15), dinero("inversion", "Inversión en activos", 520000000), tasa("deuda_proporcion", "Financiado con deuda", 0.3), tasa("deuda_tasa", "Tasa de la deuda", 0.15), tasa("tmrr", "Rentabilidad mínima del inversionista", 0.2)],
        [["proy", "PROYECTO"]], "Evalúa el proyecto para el inversionista y recomienda.", "decision", [regla("proy.vpn", ">", 0, "negar", "El VPN del proyecto no es positivo.")]),
    REEMP: agente("REEMP", "Reemplazo de activos", "Comparación por VAE.", [flujos("flujos_a", "Flujos del activo actual", [-2000, 900, 900, 900]), flujos("flujos_b", "Flujos del activo nuevo", [-5000, 1700, 1700, 1700, 1700, 1700]), tasa("k", "Tasa de descuento", 0.12)],
        [["fa", "FLU", { flujos: "@flujos_a", k: "@k" }], ["fb", "FLU", { flujos: "@flujos_b", k: "@k" }]],
        "Compara las alternativas por valor anual equivalente y recomienda.", "decision"),
    PROYFX: agente("PROYFX", "Proyecto con inversión en USD", "Rentabilidad exigida en USD llevada a COP con la devaluación esperada.",
        [tasa("tmrr_usd", "Rentabilidad mínima en USD", 0.12), tasa("devaluacion", "Devaluación esperada del peso", 0.03), dinero("ventas", "Ventas del año 1 (COP)", 1000000000), tasa("costo_ventas", "Costo de ventas / ventas", 0.55), tasa("gastos", "Gastos / ventas", 0.15), dinero("inversion", "Inversión (COP)", 520000000)],
        [["mercado", "MERCADO"], ["indicadores", "INDICADORES"], ["real", "REAL", { nominal: "@tmrr_usd", inflacion: "mercado.inflacion_usd", devaluacion: "@devaluacion" }], ["proy", "PROYECTO", { tmrr: "real.otra_moneda", horizonte: 5 }]],
        "Evalúa el proyecto con la rentabilidad exigida en pesos y menciona la TRM de referencia.", "decision", [regla("proy.vpn", ">", 0, "negar", "El VPN en pesos no es positivo.")]),
    FICHA: agente("FICHA", "Ficha de inversión para comité", "Proyecto con reglas de aprobación.",
        [num("horizonte", "Horizonte en años", 5, { tipo: "entero" }), dinero("ventas", "Ventas del año 1", 1000000000), tasa("costo_ventas", "Costo de ventas / ventas", 0.55), tasa("gastos", "Gastos / ventas", 0.15), dinero("inversion", "Inversión", 520000000), tasa("tmrr", "Rentabilidad mínima", 0.2)],
        [["proy", "PROYECTO"]], "Redacta la ficha para el comité de inversión con la recomendación.", "memo",
        [regla("proy.vpn", ">", 0, "negar", "El VPN no es positivo."), regla("proy.tir", ">=", 0.2, "condicionar", "La TIR no alcanza la rentabilidad mínima."), regla("proy.recuperacion", "<=", 4, "condicionar", "La inversión se recupera en más de 4 años.")]),

    /* G · Tesorería */
    TASA: agente("TASA", "Conversión de tasas", "Nominal, efectiva y equivalencias.", [tasa("tasa", "Tasa", 0.14), { id: "desde", etiqueta: "Desde", tipo: "codigo_tasa", defecto: "NAMV" }, { id: "hacia", etiqueta: "Hacia", tipo: "codigo_tasa", defecto: "EA" }], [["tasa", "TASA"]],
        "Explica la conversión en una línea.", "resumen"),
    DPP: agente("DPP", "Descuento por pronto pago", "Costo de no tomar el descuento.", [tasa("descuento", "Descuento", 0.02), num("dias_descuento", "Días para el descuento", 10, { tipo: "entero" }), num("dias_plazo", "Plazo total en días", 30, { tipo: "entero" })], [["dpp", "DPP"]],
        "Recomienda si tomar el descuento comparándolo con el costo de financiarse.", "decision"),
    FACT: agente("FACT", "Costo de factoring", "Tasa efectiva de anticipar facturas.", [dinero("valor", "Valor de la factura", 100000000), tasa("tasa_descuento", "Tasa de descuento mensual", 0.018), tasa("comision", "Comisión", 0.005), num("dias", "Días anticipados", 60, { tipo: "entero" })], [["fact", "FACTORING"]],
        "Explica el costo efectivo de la operación.", "resumen"),
    LIQ: agente("LIQ", "Alerta de liquidez", "Liquidez frente a umbrales.", [EST], [["rat", "RAT"], ["ct", "CT"]],
        "Informa el estado de liquidez y las acciones si hay alertas.", "resumen",
        [regla("rat.razon_corriente", ">=", 1.2, "alertar", "Razón corriente inferior a 1,2."), regla("rat.prueba_acida", ">=", 0.8, "alertar", "Prueba ácida inferior a 0,8."), regla("ct.ciclo", "<=", 90, "alertar", "Ciclo de caja superior a 90 días.")]),

    /* H · Financiación */
    AMORT: agente("AMORT", "Tabla de amortización", "Cuotas, intereses y saldo.", [dinero("principal", "Monto", 100000000), num("plazo_anios", "Plazo en años", 5), tasa("tasa_ea", "Tasa efectiva anual", 0.16), PAGOS], [["amort", "AMORT"]],
        "Resume el crédito: cuota, intereses totales y costo efectivo.", "resumen"),
    SISTEMAS: agente("SISTEMAS", "Comparación de sistemas", "Cuatro sistemas con los mismos datos.", [dinero("principal", "Monto", 100000000), num("plazo_anios", "Plazo en años", 5), tasa("tasa_ea", "Tasa efectiva anual", 0.16), PAGOS], [["comparar", "COMPARAR"]],
        "Recomienda el sistema según el flujo de caja de la empresa.", "decision"),
    COSTOCR: agente("COSTOCR", "Costo efectivo con comisiones", "Tasa que iguala el desembolso neto con las cuotas.", [dinero("principal", "Monto", 100000000), dinero("comisiones", "Comisiones y gastos", 1500000), num("plazo_anios", "Plazo en años", 3), tasa("tasa_ea", "Tasa pactada EA", 0.16), PAGOS], [["amort", "AMORT"]],
        "Explica cuánto suben las comisiones el costo efectivo del crédito.", "resumen"),

    /* J · Reportes */
    JUNTA: agente("JUNTA", "Informe para junta directiva", "Desempeño, valor y caja frente al sector.", [EST], [["sector", "SECTOR"], ["rat", "RAT"], ["eva", "EVA"], ["fcl", "FCL"]],
        "Redacta el informe financiero para la junta directiva: resultados, rentabilidad frente al costo de capital, caja y riesgos.", "memo"),
    INV: agente("INV", "Memo de comité de inversión", "Proyecto evaluado con reglas.", [num("horizonte", "Horizonte en años", 5, { tipo: "entero" }), dinero("ventas", "Ventas del año 1", 1000000000), tasa("costo_ventas", "Costo de ventas / ventas", 0.55), tasa("gastos", "Gastos / ventas", 0.15), dinero("inversion", "Inversión", 520000000), tasa("tmrr", "Rentabilidad mínima", 0.2)],
        [["proy", "PROYECTO"]], "Redacta el memo para el comité de inversión con la recomendación y sus condiciones.", "memo", [regla("proy.vpn", ">", 0, "negar", "El VPN no es positivo."), regla("proy.tir_inversionista", ">=", 0.2, "condicionar", "La TIR del inversionista no alcanza la rentabilidad mínima.")]),
    ROIC: agente("ROIC", "Indicadores para remuneración variable", "EVA, ROIC y spread.", [EST], [["eva", "EVA"], ["rat", "RAT"]],
        "Presenta los indicadores de creación de valor para el comité de remuneración.", "resumen"),
};

export function plantilla(codigo: string): Agente {
    const p = PLANTILLAS[codigo.toUpperCase()];
    if (!p) throw new Error(`No hay plantilla para ${codigo}.`);
    return p();
}
