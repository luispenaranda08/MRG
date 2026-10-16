import { createContext } from "react";
import { Cifra } from "@/components/Cifra";
import { formatoCifra, type Cifra as CifraDato } from "@/lib/agentes";
import { fmt as fmtCelda, type Formato } from "@/lib/api";

export const CargaArchivos = createContext<((cargando: boolean) => void) | null>(null);

// Conteos de la interfaz: mismo formato y aspecto que las cifras, sin nota de fuente (no son datos financieros).
export function Numero({ valor, fmt = "num" }: { valor: number | string | null; etiqueta?: string; fmt?: Formato }) {
    return <span className="cifra tono-clave">{fmtCelda({ v: valor, fmt, tono: "clave" })}</span>;
}
export function Valor({ cifra }: { cifra: CifraDato }) {
    return <Cifra celda={{ ...formatoCifra(cifra), fuente: cifra.origen.fuente }} />;
}
export function descargar(nombre: string, contenido: string) {
    const url = URL.createObjectURL(new Blob([contenido], { type: "application/json;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = nombre; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function mensajeError(e: unknown) { return e instanceof Error ? e.message : "No se pudo completar la operación. Inténtelo de nuevo."; }
