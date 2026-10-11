/** Identidad de los documentos; nunca altera los cálculos ni sus referencias. */
/** Fecha local AAAA-MM-DD (en Colombia, de noche toISOString ya marca el día siguiente en UTC). */
export function hoyLocal(f = new Date()) { return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`; }
export function nombreArchivo(tipo: string, empresa = "", fecha = hoyLocal(), extension = "xlsx") {
    const limpio = empresa.trim().normalize("NFKC").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-").replace(/[. -]+$/g, "").slice(0, 100);
    return `Mirage-${tipo}${limpio ? `-${limpio}` : ""}-${fecha}.${extension}`;
}
export function proponerEmpresa(textos: string[], archivo: string) {
    const candidato = textos.map(t => t.trim()).find(t => {
        const n = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return t.length >= 3 && t.length <= 80 && !/SUPUESTOS|MODELO|ESTADO|BALANCE|FLUJO|ANALISIS|PYG|INGRESOS|GASTOS|UTILIDAD|ACTIVOS|PASIVOS|PATRIMONIO|https?:/i.test(n)
            && /\b(?:s\.?a\.?s\.?|s\.a\.|inc\.?|ltda\.?|corp\.?|company|compania|empresa)\b/i.test(n);
    });
    return candidato || archivo.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\b(?:19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}
