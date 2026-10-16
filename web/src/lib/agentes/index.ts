/**
 * Constructor de agentes de Mirage: fachada pública para la interfaz, la API y el MCP.
 *
 *   CAPACIDADES / DOMINIOS / PERFILES         catálogo de 100 capacidades (certificada = lista para usar)
 *   DEF_BLOQUES / defBloque()                 bloques de las cajas 2 y 3 con sus entradas y salidas
 *   plantilla(codigo)                         agente listo de una capacidad certificada
 *   agenteVacio() / nuevoPaso() / validarAgente() / salidasDisponibles() / duplicarAgente()
 *   prepararEmpresa(archivo, nombre, opciones, datos) / cargarEjemplo()   estados financieros para la caja 1
 *   ejecutarAgente(agente, valores, datos)    cajas 2 y 3: cifras con su origen, tablas y decisión por reglas
 *   instruir(agente, ejecucion)               caja 4: texto del Motor Mirage validado cifra por cifra
 *   planificar(objetivo)                      línea de comando: objetivo en lenguaje natural → agente
 *   validarTexto(texto, ejecucion)            cifras del texto que tienen o no respaldo
 *   listarAgentes() / guardarAgente() / eliminarAgente() / exportarAgente() / importarAgente()
 */
import { CATALOGO, DOMINIOS, PERFILES } from "./catalogo";
import { MAPA_BLOQUES } from "./bloques-def";
import { PLANTILLAS } from "./plantillas";
import type { Capacidad } from "./tipos";

export * from "./tipos";
export { DEF_BLOQUES, MAPA_BLOQUES, defBloque } from "./bloques-def";
export { DOMINIOS, PERFILES } from "./catalogo";
export { plantilla, PLANTILLAS } from "./plantillas";
export { agenteVacio, nuevoPaso, nuevoId, validarAgente, salidasDisponibles, duplicarAgente, claveCifra } from "./receta";
export { ejecutarAgente, formatoCifra } from "./ejecutor";
export { validarTexto } from "./validador";
export { prepararEmpresa, cargarEjemplo, EJEMPLOS } from "./empresa";
export { planificar, instruir } from "./cliente";
export { listarAgentes, guardarAgente, eliminarAgente, exportarAgente, importarAgente } from "./almacen";

export const CAPACIDADES: Capacidad[] = CATALOGO.map(c => ({ ...c, certificada: c.bloques.every(b => b in MAPA_BLOQUES) && c.codigo in PLANTILLAS }));

export const capacidad = (codigo: string) => CAPACIDADES.find(c => c.codigo === codigo.toUpperCase()) ?? null;
export const capacidadesCertificadas = () => CAPACIDADES.filter(c => c.certificada);
export const NOMBRES_DOMINIO = DOMINIOS;
export const NOMBRES_PERFIL = PERFILES;
