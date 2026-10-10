import * as XLSX from "xlsx";

/** Texto de un CSV: UTF-8 (con o sin BOM) o, si no es UTF-8 válido, Windows-1252 (el "CSV" por defecto de Excel en español). */
export function decodificarTexto(bytes: Uint8Array): string {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
    } catch {
        return new TextDecoder("windows-1252").decode(bytes);
    }
}

/**
 * Lee un Excel o CSV como lo hace la página.
 * - Excel: fechas reales como Date, para reconocer encabezados como 31/12/2025.
 * - CSV/TXT: todo como texto, para que el motor interprete el formato colombiano ("82.653" = 82 653,
 *   "(1.234,5)" = −1 234,5) en vez de que la librería lo tome como decimal. Separador , ; o tabulador.
 */
export function leerArchivo(datos: ArrayBuffer | Uint8Array, nombre = ""): XLSX.WorkBook {
    const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
    if (/\.(csv|txt|tsv)$/i.test(nombre)) return XLSX.read(decodificarTexto(bytes), { type: "string", raw: true });
    return XLSX.read(bytes, { type: "array", cellDates: true });
}
