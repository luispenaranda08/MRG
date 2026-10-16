/** Estados financieros para la caja 1: se leen y homologan en el navegador con el motor DX; nada sale del equipo. */
import { numero, type Datos } from "../api";
import { buildCompany, M } from "../dx/engine";
import { leerEstados } from "../dx/formatos";
import type { EmpresaPreparada } from "./tipos";

export interface OpcionesEmpresa {
    sector: number;
    tamano: string;
    pais?: string;
    moneda?: string;
    unidad?: string;
    nombreEmpresa?: string;
}

export const EJEMPLOS = [
    { id: "pyme", etiqueta: "Confecciones del Caribe · PYME", archivo: "PYME-Confecciones-del-Caribe.xlsx", ciiu: "14", tamano: "Pequeña", pais: "Colombia" },
    { id: "visa", etiqueta: "Visa · 2021–2025", archivo: "Visa-2021-2025.xlsx", ciiu: "63", tamano: "Grande", pais: "Estados Unidos" },
] as const;

export async function prepararEmpresa(archivo: ArrayBuffer | Uint8Array, nombreArchivo: string, opciones: OpcionesEmpresa, datos: Datos): Promise<EmpresaPreparada> {
    const sc = datos.sectores[opciones.sector];
    if (!sc) throw new Error("Elija el sector de la empresa.");
    if (!sc.por_tamano[opciones.tamano]) throw new Error(`El sector no tiene el tamaño «${opciones.tamano}».`);
    const bytes = new Uint8Array(archivo).slice();
    const p = await leerEstados(archivo, nombreArchivo);
    const fields = p.rows.filter(r => r.field).map(r => r.field);
    if (new Set(fields).size !== fields.length) throw new Error("Una cuenta del archivo quedó asignada a dos campos. Revise el archivo en «Tu empresa».");
    const moneda = opciones.moneda ?? p.cur, unidad = opciones.unidad ?? p.unit, pais = opciones.pais ?? (moneda === "COP" ? "Colombia" : "Estados Unidos");
    const nombre = (opciones.nombreEmpresa ?? p.name ?? "").trim() || nombreArchivo.replace(/\.[^.]+$/, "");
    const trm = datos.indicadores?.trm ? numero(datos.indicadores.trm) : null;
    const interno = buildCompany(p, { name: nombre, cur: moneda, unit: unidad, country: pais, fx: trm ?? 0, sectorName: sc.nombre, bu: numero(sc.beta_desapalancada), listed: false });
    if (interno.years.length < 2) throw new Error("Se necesitan al menos dos años de estados financieros.");
    if (interno.years.some((_: number, i: number) => M(interno, i).eq <= 0 || M(interno, i).rev <= 0)) throw new Error("Para calcular capital, flujo y valor se requieren patrimonio e ingresos positivos en todos los años.");
    const alertas = [...(p.revision?.alertas ?? [])];
    if (!trm && moneda === "COP") alertas.push("Sin TRM publicada: el tamaño en USD del rating sintético no se puede calcular.");
    return { tipo: "empresa", nombre, archivo: nombreArchivo, anios: interno.years, moneda, unidad, pais, sector: opciones.sector, tamano: opciones.tamano, interno, alertas, bytes };
}

/** Carga un archivo de ejemplo publicado en /ejemplos con su sector y tamaño. */
export async function cargarEjemplo(id: string, datos: Datos, opciones: Partial<OpcionesEmpresa> = {}): Promise<EmpresaPreparada> {
    const ej = EJEMPLOS.find(e => e.id === id);
    if (!ej) throw new Error("Ejemplo desconocido.");
    const r = await fetch(`/ejemplos/${ej.archivo}`);
    if (!r.ok) throw new Error("No se pudo leer el archivo de ejemplo.");
    const sector = opciones.sector ?? Math.max(0, datos.sectores.findIndex(s => s.ciiu_division === ej.ciiu));
    return prepararEmpresa(await r.arrayBuffer(), ej.archivo, { tamano: ej.tamano, pais: ej.pais, ...opciones, sector }, datos);
}
