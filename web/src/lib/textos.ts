/** Traduce referencias técnicas de los datos sin cambiar sus valores. */
export function textoClaro(texto: string) {
    return texto.replace(/\bAPI\b/g, "datos publicados").replace(/\bmotor(?:es)?\b/gi, "cálculo").replace(/\bport\b/gi, "adaptación").replace(/[\w.-]+\.json\b/gi, "datos de mercado");
}
