/**
 * Gráficas nativas de Excel (DrawingML) para el dashboard del diagnóstico. ExcelJS no escribe gráficas, así que se
 * agregan al .xlsx ya generado: un dibujo por hoja y una parte de gráfica por cada una. Las series apuntan a rangos
 * de la hoja, de modo que se recalculan cuando el usuario cambia los supuestos; además llevan los valores en caché
 * para que se vean igual en visores que no recalculan.
 */
import JSZip from "jszip";

export type TipoGrafica = "columnas" | "barras" | "lineas" | "area" | "columnas_apiladas" | "combo" | "torta" | "anillo";
export interface SerieXlsx { nombre: string; refNombre: string; refValores: string; valores: (number | null)[]; secundaria?: boolean }
export interface GraficaXlsx {
    hoja: string;
    tipo: TipoGrafica;
    categorias: string[];
    refCategorias: string;
    series: SerieXlsx[];
    formato: string;
    formatoSecundario?: string;
    /** Celdas de anclaje (base 0): esquina superior izquierda y esquina inferior derecha. */
    desde: [number, number];
    hasta: [number, number];
}

export const PALETA = ["1F2124", "C8A24A", "1F6B45", "8C9196", "A3322A", "7A5600", "4F6D7A", "D9C38C"];
const FUENTE = "IBM Plex Sans";
const NS_C = "http://schemas.openxmlformats.org/drawingml/2006/chart", NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main", NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const REL_DIBUJO = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing", REL_GRAFICA = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart";

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const relleno = (c: string) => `<a:solidFill><a:srgbClr val="${c}"/></a:solidFill>`;
const texto = (tam: number, color = "3C4043", negrita = false) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${tam}" b="${negrita ? 1 : 0}">${relleno(color)}<a:latin typeface="${FUENTE}"/></a:defRPr></a:pPr><a:endParaRPr lang="es-CO"/></a:p></c:txPr>`;
const sinLinea = "<a:ln><a:noFill/></a:ln>";

function cat(g: GraficaXlsx) {
    return `<c:cat><c:strRef><c:f>${x(g.refCategorias)}</c:f><c:strCache><c:ptCount val="${g.categorias.length}"/>${g.categorias.map((c, i) => `<c:pt idx="${i}"><c:v>${x(c)}</c:v></c:pt>`).join("")}</c:strCache></c:strRef></c:cat>`;
}
function val(s: SerieXlsx, formato: string) {
    return `<c:val><c:numRef><c:f>${x(s.refValores)}</c:f><c:numCache><c:formatCode>${x(formato)}</c:formatCode><c:ptCount val="${s.valores.length}"/>${s.valores.map((v, i) => (v == null || !isFinite(v) ? "" : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`)).join("")}</c:numCache></c:numRef></c:val>`;
}
const tx = (s: SerieXlsx) => `<c:tx><c:strRef><c:f>${x(s.refNombre)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${x(s.nombre)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;

function serBarra(g: GraficaXlsx, s: SerieXlsx, i: number) {
    return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${tx(s)}<c:spPr>${relleno(PALETA[i % PALETA.length])}${sinLinea}</c:spPr><c:invertIfNegative val="0"/>${cat(g)}${val(s, g.formato)}</c:ser>`;
}
function serLinea(g: GraficaXlsx, s: SerieXlsx, i: number, formato: string) {
    const c = PALETA[i % PALETA.length];
    return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${tx(s)}<c:spPr><a:ln w="28575" cap="rnd">${relleno(c)}<a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr>${relleno(c)}<a:ln w="9525">${relleno("FFFFFF")}</a:ln></c:spPr></c:marker>${cat(g)}${val(s, formato)}<c:smooth val="0"/></c:ser>`;
}
function serArea(g: GraficaXlsx, s: SerieXlsx, i: number) {
    return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${tx(s)}<c:spPr>${relleno(PALETA[i % PALETA.length])}${sinLinea}</c:spPr>${cat(g)}${val(s, g.formato)}</c:ser>`;
}

function ejes(idCat: number, idVal: number, formato: string, opciones: { borrarCat?: boolean; derecha?: boolean; horizontal?: boolean } = {}) {
    const posCat = opciones.horizontal ? "l" : "b", posVal = opciones.derecha ? "r" : opciones.horizontal ? "b" : "l";
    return `<c:catAx><c:axId val="${idCat}"/><c:scaling><c:orientation val="${opciones.horizontal ? "maxMin" : "minMax"}"/></c:scaling><c:delete val="${opciones.borrarCat ? 1 : 0}"/><c:axPos val="${posCat}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:spPr><a:ln w="9525">${relleno("BFC3C7")}</a:ln></c:spPr>${texto(900)}<c:crossAx val="${idVal}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`
        + `<c:valAx><c:axId val="${idVal}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${posVal}"/>${opciones.derecha ? "" : `<c:majorGridlines><c:spPr><a:ln w="6350">${relleno("E6E7E9")}</a:ln></c:spPr></c:majorGridlines>`}<c:numFmt formatCode="${x(formato)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr>${sinLinea}</c:spPr>${texto(900)}<c:crossAx val="${idCat}"/><c:crosses val="${opciones.derecha ? "max" : "autoZero"}"/><c:crossBetween val="between"/></c:valAx>`;
}

function etiquetasTorta() {
    return `<c:dLbls><c:numFmt formatCode="0%" sourceLinked="0"/><c:spPr><a:noFill/>${sinLinea}</c:spPr>${texto(900, "FFFFFF", true)}<c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/></c:dLbls>`;
}

export function xmlGrafica(g: GraficaXlsx): string {
    let area = "";
    const prim = g.series.filter(s => !s.secundaria), sec = g.series.filter(s => s.secundaria);
    switch (g.tipo) {
        case "torta":
        case "anillo": {
            const s = g.series[0], puntos = g.categorias.map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr>${relleno(PALETA[i % PALETA.length])}<a:ln w="12700">${relleno("FFFFFF")}</a:ln></c:spPr></c:dPt>`).join("");
            const ser = `<c:ser><c:idx val="0"/><c:order val="0"/>${tx(s)}${puntos}${etiquetasTorta()}${cat(g)}${val(s, g.formato)}</c:ser>`;
            area = g.tipo === "torta" ? `<c:pieChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/></c:pieChart>` : `<c:doughnutChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/><c:holeSize val="58"/></c:doughnutChart>`;
            break;
        }
        case "lineas":
            area = `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${g.series.map((s, i) => serLinea(g, s, i, g.formato)).join("")}<c:marker val="1"/><c:axId val="101"/><c:axId val="102"/></c:lineChart>${ejes(101, 102, g.formato)}`;
            break;
        case "area":
            area = `<c:areaChart><c:grouping val="stacked"/><c:varyColors val="0"/>${g.series.map((s, i) => serArea(g, s, i)).join("")}<c:axId val="101"/><c:axId val="102"/></c:areaChart>${ejes(101, 102, g.formato)}`;
            break;
        case "combo":
            area = `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${prim.map((s, i) => serBarra(g, s, i)).join("")}<c:gapWidth val="70"/><c:axId val="101"/><c:axId val="102"/></c:barChart>`
                + `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${sec.map((s, i) => serLinea(g, s, prim.length + i, g.formatoSecundario ?? "0.0%")).join("")}<c:marker val="1"/><c:axId val="103"/><c:axId val="104"/></c:lineChart>`
                + ejes(101, 102, g.formato) + ejes(103, 104, g.formatoSecundario ?? "0.0%", { borrarCat: true, derecha: true });
            break;
        default: {
            const apilada = g.tipo === "columnas_apiladas", horizontal = g.tipo === "barras";
            area = `<c:barChart><c:barDir val="${horizontal ? "bar" : "col"}"/><c:grouping val="${apilada ? "stacked" : "clustered"}"/><c:varyColors val="0"/>${g.series.map((s, i) => serBarra(g, s, i)).join("")}<c:gapWidth val="${apilada ? 55 : 70}"/>${apilada ? '<c:overlap val="100"/>' : ""}<c:axId val="101"/><c:axId val="102"/></c:barChart>${ejes(101, 102, g.formato, { horizontal })}`;
        }
    }
    const leyenda = g.series.length > 1 || g.tipo === "torta" || g.tipo === "anillo" ? `<c:legend><c:legendPos val="b"/><c:overlay val="0"/>${texto(900)}</c:legend>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}"><c:date1904 val="0"/><c:lang val="es-CO"/><c:roundedCorners val="0"/><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/>${area}<c:spPr><a:noFill/>${sinLinea}</c:spPr></c:plotArea>${leyenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr>${relleno("FFFFFF")}<a:ln w="9525">${relleno("E6E7E9")}</a:ln></c:spPr>${texto(1000)}</c:chartSpace>`;
}

function xmlDibujo(graficas: GraficaXlsx[], primerId: number) {
    const anclas = graficas.map((g, i) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${g.desde[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${g.desde[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${g.hasta[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${g.hasta[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${primerId + i}" name="Gráfica ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${NS_C}"><c:chart xmlns:c="${NS_C}" r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${NS_A}" xmlns:r="${NS_R}">${anclas}</xdr:wsDr>`;
}

const rels = (items: [string, string, string][]) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, tipo, destino]) => `<Relationship Id="${id}" Type="${tipo}" Target="${destino}"/>`).join("")}</Relationships>`;

/** Ruta de la parte XML de una hoja a partir de su nombre visible. */
async function rutaHoja(zip: JSZip, nombre: string) {
    const wb = await zip.file("xl/workbook.xml")!.async("string"), wbRels = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
    const hoja = [...wb.matchAll(/<sheet\b[^>]*>/g)].map(m => m[0]).find(s => (s.match(/name="([^"]*)"/)?.[1] ?? "").replace(/&amp;/g, "&") === nombre);
    const rid = hoja?.match(/r:id="([^"]+)"/)?.[1];
    const rel = rid && [...wbRels.matchAll(/<Relationship\b[^>]*>/g)].map(m => m[0]).find(r => r.includes(`Id="${rid}"`));
    const destino = rel?.match(/Target="([^"]+)"/)?.[1];
    if (!destino) throw new Error(`No encontré la hoja ${nombre} en el libro.`);
    return destino.startsWith("/") ? destino.slice(1) : "xl/" + destino.replace(/^\.\//, "");
}

/** Agrega las gráficas al .xlsx y devuelve el archivo nuevo. */
export async function insertarGraficas(xlsx: ArrayBuffer | Uint8Array, graficas: GraficaXlsx[]): Promise<Uint8Array> {
    if (!graficas.length) return xlsx instanceof Uint8Array ? xlsx : new Uint8Array(xlsx);
    const zip = await JSZip.loadAsync(xlsx);
    let tipos = await zip.file("[Content_Types].xml")!.async("string");
    const porHoja = new Map<string, GraficaXlsx[]>();
    graficas.forEach(g => porHoja.set(g.hoja, [...(porHoja.get(g.hoja) ?? []), g]));
    let nDibujo = Object.keys(zip.files).filter(f => /^xl\/drawings\/drawing\d+\.xml$/.test(f)).length, nGrafica = Object.keys(zip.files).filter(f => /^xl\/charts\/chart\d+\.xml$/.test(f)).length;
    for (const [hoja, lista] of porHoja) {
        const ruta = await rutaHoja(zip, hoja), carpeta = ruta.replace(/[^/]+$/, ""), archivo = ruta.split("/").pop()!, rutaRels = `${carpeta}_rels/${archivo}.rels`;
        let xml = await zip.file(ruta)!.async("string");
        if (/<drawing\b/.test(xml)) throw new Error(`La hoja ${hoja} ya tiene un dibujo.`);
        nDibujo++;
        const relsDibujo: [string, string, string][] = [];
        lista.forEach((g, i) => {
            nGrafica++;
            zip.file(`xl/charts/chart${nGrafica}.xml`, xmlGrafica(g));
            tipos = tipos.replace("</Types>", `<Override PartName="/xl/charts/chart${nGrafica}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
            relsDibujo.push([`rId${i + 1}`, REL_GRAFICA, `../charts/chart${nGrafica}.xml`]);
        });
        zip.file(`xl/drawings/drawing${nDibujo}.xml`, xmlDibujo(lista, 2));
        zip.file(`xl/drawings/_rels/drawing${nDibujo}.xml.rels`, rels(relsDibujo));
        tipos = tipos.replace("</Types>", `<Override PartName="/xl/drawings/drawing${nDibujo}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
        // Relación hoja → dibujo
        const existente = await zip.file(rutaRels)?.async("string");
        const idDibujo = "rIdMirageDibujo";
        zip.file(rutaRels, existente ? existente.replace("</Relationships>", `<Relationship Id="${idDibujo}" Type="${REL_DIBUJO}" Target="../drawings/drawing${nDibujo}.xml"/></Relationships>`) : rels([[idDibujo, REL_DIBUJO, `../drawings/drawing${nDibujo}.xml`]]));
        if (!/xmlns:r=/.test(xml.slice(0, 600))) xml = xml.replace(/<worksheet\b/, `<worksheet xmlns:r="${NS_R}"`);
        // <drawing> va después de pageSetup/headerFooter/breaks y antes de legacyDrawing, tableParts y extLst
        const corte = xml.search(/<(legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b|<\/worksheet>/);
        xml = xml.slice(0, corte) + `<drawing r:id="${idDibujo}"/>` + xml.slice(corte);
        zip.file(ruta, xml);
    }
    zip.file("[Content_Types].xml", tipos);
    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
