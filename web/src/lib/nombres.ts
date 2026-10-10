/** Identidad de los documentos; nunca altera los cálculos ni sus referencias. */
export function nombreArchivo(tipo: string, empresa = "", fecha = new Date().toISOString().slice(0, 10), extension = "xlsx") {
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
