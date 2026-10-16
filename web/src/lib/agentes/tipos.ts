/**
 * Contrato del constructor de agentes de Mirage.
 *
 * Un agente tiene cuatro cajas: 1) entradas que da el usuario, 2) datos de mercado de Mirage, 3) cálculos verificados
 * y 4) una instrucción particular para el Motor Mirage. Las cajas 2 y 3 son pasos deterministas: con las mismas
 * entradas dan las mismas cifras. El texto de la caja 4 solo puede citar cifras que existan en la ejecución.
 */
import type { Formato } from "../api";

export type Caja = "entradas" | "datos" | "calculo" | "instruccion";

export type Dominio = "contabilidad" | "analisis" | "credito" | "costo_capital" | "valoracion" | "presupuesto" | "tesoreria" | "financiacion" | "riesgo" | "reportes";

export type Perfil = "contador" | "analista" | "credito" | "tesoreria" | "cfo" | "banca_inversion";

/** Tipos de campo de la caja 1 y de las entradas de cada bloque. Las tasas se guardan como fracción (0,12 = 12 %). */
export type TipoCampo =
    | "numero" | "entero" | "tasa" | "dinero" | "texto" | "booleano"
    | "opcion"        // lista cerrada en `opciones`
    | "codigo_tasa"   // EA, NAMV, NATA… (ver finanzas/tasas)
    | "flujos"        // lista de números: flujo del periodo 0 en adelante
    | "estados"       // estados financieros ya leídos con prepararEmpresa()
    | "sector"        // índice en datos.sectores
    | "tamano";       // Micro, Pequeña, Mediana, Grande

export interface Opcion { v: string; etiqueta: string }

export interface Campo {
    id: string;
    etiqueta: string;
    tipo: TipoCampo;
    requerido?: boolean;
    defecto?: ValorCampo;
    opciones?: Opcion[];
    ayuda?: string;
    min?: number;
    max?: number;
}

/** Estados financieros leídos y homologados por el motor DX, listos para los bloques de empresa. */
export interface EmpresaPreparada {
    tipo: "empresa";
    nombre: string;
    archivo: string;
    anios: number[];
    moneda: string;
    unidad: string;
    pais: string;
    sector: number;
    tamano: string;
    /** Objeto interno del motor DX (buildCompany). No se serializa al guardar el agente. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interno: any;
    alertas: string[];
}

export type ValorCampo = number | string | boolean | number[] | EmpresaPreparada | null;

export interface Salida {
    id: string;
    etiqueta: string;
    fmt: Formato;
    /** "COP millones", "años", "veces"… Para dinero de empresa la fija la ejecución con la unidad del archivo. */
    unidad?: string;
}

/** Definición pública de un bloque (sin implementación): la usan la interfaz, el servidor y el MCP. */
export interface DefBloque {
    codigo: string;
    nombre: string;
    caja: "datos" | "calculo";
    dominio: Dominio;
    descripcion: string;
    version: string;
    /** Fuente metodológica o de datos. */
    fuente: string;
    entradas: Campo[];
    salidas: Salida[];
    /** Tablas que produce además de las cifras (amortización, FCL proyectado…). */
    tablas?: { id: string; etiqueta: string }[];
}

/** De dónde toma un bloque cada una de sus entradas. */
export type Vinculo =
    | { de: "entrada"; id: string }
    | { de: "paso"; paso: string; salida: string }
    | { de: "valor"; v: ValorCampo };

export interface Paso {
    id: string;
    bloque: string;
    vinculos: Record<string, Vinculo>;
    nota?: string;
}

export type Operador = ">=" | ">" | "<=" | "<" | "=";
export type Efecto = "aprobar" | "condicionar" | "negar" | "alertar";

/** Regla de decisión sobre una cifra calculada; `cifra` es la clave "paso.salida". */
export interface Regla {
    id: string;
    cifra: string;
    operador: Operador;
    umbral: number;
    /** Si se indica, el umbral es el valor de esta entrada del agente (por ejemplo, el DSCR mínimo que fija el usuario). */
    umbralDe?: string;
    /** Qué pasa si la regla NO se cumple. */
    efecto: Efecto;
    mensaje: string;
}

export type TipoTexto = "memo" | "decision" | "resumen" | "ninguna";

export interface Instruccion {
    texto: string;
    salida: TipoTexto;
    reglas: Regla[];
}

export interface Agente {
    id: string;
    nombre: string;
    descripcion: string;
    /** Código de la capacidad del catálogo de la que salió, si aplica. */
    capacidad?: string;
    version: number;
    creado: string;
    actualizado: string;
    entradas: Campo[];
    pasos: Paso[];
    instruccion: Instruccion;
}

export interface Origen {
    paso: string;
    bloque: string;
    version: string;
    fuente: string;
    corte?: string;
}

export interface Cifra {
    v: number | string | null;
    fmt: Formato;
    etiqueta: string;
    unidad?: string;
    nota?: string;
    origen: Origen;
}

export interface Columna { id: string; etiqueta: string; fmt: Formato }

export interface Tabla {
    etiqueta: string;
    columnas: Columna[];
    filas: Record<string, number | string | null>[];
    origen: Origen;
}

export interface PasoEjecutado {
    paso: string;
    bloque: string;
    version: string;
    ms: number;
    /** Entradas efectivas (las empresas se resumen con su nombre). */
    entrada: Record<string, unknown>;
    /** Claves "paso.salida" que produjo. */
    cifras: string[];
    tablas: string[];
    alertas: string[];
}

export interface ResultadoRegla { regla: Regla; valor: number | null; cumple: boolean }

export interface Decision {
    efecto: "aprobar" | "condicionar" | "negar" | "sin_reglas";
    reglas: ResultadoRegla[];
}

export interface Ejecucion {
    id: string;
    agente: { id: string; nombre: string; version: number };
    inicio: string;
    fin: string;
    estado: "completa" | "detenida";
    /** Falla cerrada: qué faltó y en qué paso. */
    detenida?: { paso?: string; motivo: string };
    pasos: PasoEjecutado[];
    cifras: Record<string, Cifra>;
    tablas: Record<string, Tabla>;
    decision: Decision;
    alertas: string[];
}

export interface Coincidencia { texto: string; inicio: number; fin: number; clave: string }

export interface Validacion {
    /** Cifras encontradas en el texto (sin contar años, normas ni numerales). */
    total: number;
    respaldadas: number;
    coincidencias: Coincidencia[];
    sinRespaldo: { texto: string; inicio: number; fin: number }[];
}

export interface TextoMotor {
    texto: string;
    validacion: Validacion;
    /** El servidor reintenta una vez si el primer texto trae cifras sin respaldo. */
    intentos: number;
}

export interface Capacidad {
    numero: number;
    codigo: string;
    nombre: string;
    dominio: Dominio;
    perfiles: Perfil[];
    /** Bloques que usa. Está certificada cuando todos existen y su plantilla pasa las pruebas doradas. */
    bloques: string[];
    certificada: boolean;
    descripcion: string;
}

export interface Plan {
    agente: Agente;
    capacidad: string | null;
    explicacion: string;
}
