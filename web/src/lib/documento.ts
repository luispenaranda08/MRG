import { textoClaro } from "./textos";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { celda, fmt, type Celda, type Datos, type Fuente, type Estilo } from "./api";
import type { Insumos } from "./calculadora";
import type { EntradaCredito, ResultadoCredito, EntradaTVM, Indicadores, ResultadoProyecto, resolver, equivalencias } from "./finanzas";
import type { ExportProyecto } from "./calc-excel";
import { nombreArchivo } from "./nombres";
import { VEREDICTO, type DecisionJev } from "./jev";

export type SeccionDocumento = "capital" | "tasas" | "tvm" | "creditos" | "proyectos";
export type FilaDocumento = { concepto: string; cifra: Celda };
export interface Documento {
    seccion: SeccionDocumento; titulo: string; empresa: string; corte: string;
    numero: string; fecha: string; conclusion: string; supuestos: FilaDocumento[];
    resultados: FilaDocumento[]; metodo: string; fuentes: Fuente[]; estilo: Estilo;
    tablas: { titulo: string; columnas: string[]; filas: string[][]; nota?: string }[];
    notas: string[]; aviso: string; rec?: DecisionJev;
}
interface Entradas {
    capital: { mercado: Datos; entrada: Insumos; sector: string; tamano: string };
    tasas: { mercado: Datos; tasa: number; desde: string; hacia: string };
    tvm: { mercado: Datos; entrada: EntradaTVM };
    creditos: { mercado: Datos; entrada: EntradaCredito; tipo?: string };
    proyectos: { mercado: Datos; entrada: ExportProyecto };
}
interface Resultados {
    capital: Record<string, Celda>;
    tasas: { conversion: number; equivalencias: ReturnType<typeof equivalencias> };
    tvm: ReturnType<typeof resolver>;
    creditos: ResultadoCredito;
    proyectos: { ia: Indicadores; ib?: Indicadores | null; cruce?: number | null } | ResultadoProyecto;
}
const titulos = { capital: "Memo de costo de capital", tasas: "Conversión de tasas", tvm: "Valor del dinero en el tiempo", creditos: "Simulación de crédito", proyectos: "Evaluación de proyecto" };
const tipos = { capital: "Costo-de-capital", tasas: "Tasas", tvm: "Valor-del-dinero", creditos: "Creditos", proyectos: "Proyectos" };
const valor = (v: number | string | null, formato: Celda["fmt"] = "x") => fmt(celda(v, formato));
const decision = (r: Indicadores) => r.decision === "aceptar" ? "se acepta" : r.decision === "rechazar" ? "se rechaza" : "es indiferente";

/** Presenta los resultados recibidos: no calcula ni sustituye las fórmulas financieras. */
export function armarDocumento<S extends SeccionDocumento>(seccion: S, datos: Entradas[S], resultado: Resultados[S], empresa = ""): Documento {
    const mercado = datos.mercado;
    const doc: Documento = { seccion, titulo: titulos[seccion], empresa: empresa.trim(), corte: mercado.meta.corte,
        numero: "", fecha: "", conclusion: "", supuestos: [], resultados: [], metodo: "", fuentes: [], estilo: mercado.estilo, tablas: [], notas: [],
        aviso: "Las cifras de Mirage no constituyen asesoría de inversión ni una recomendación de tasa de descuento." };
    const supuesto = (concepto: string, v: number | string | null, formato: Celda["fmt"] = "x") => doc.supuestos.push({ concepto, cifra: celda(v, formato, "insumo") });
    const principal = (concepto: string, v: number | string | null, formato: Celda["fmt"] = "x") => doc.resultados.push({ concepto, cifra: celda(v, formato, "clave") });
    const evaluar = (nombre: string, r: Indicadores) => {
        for (const [l, v, f] of [["VPN", r.vpn, "x"], ["TIR", r.tir, "pct"], ["TIRM", r.tirm, "pct"], ["índice de rentabilidad", r.indiceRentabilidad, "x"], ["Valor anual equivalente", r.vae, "x"], ["Recuperación simple (periodos)", r.recuperacion, "x"], ["Recuperación descontada (periodos)", r.recuperacionDescontada, "x"], ["Decisión", decision(r), "txt"]] as const) principal(`${nombre} · ${l}`, v, f);
        if (r.tirMultiple) doc.notas.push(`${nombre}: puede haber varias TIR; decida con el VPN y la TIRM.`);
    };
    if (seccion === "capital") {
        const { entrada: e, sector, tamano } = datos as Entradas["capital"], r = resultado as Resultados["capital"];
        supuesto("Sector", sector, "txt"); supuesto("Tamaño", tamano, "txt");
        supuesto("Deuda financiera (COP)", e.deuda); supuesto("Patrimonio (COP)", e.patrimonio); supuesto("EBIT (COP)", e.ebit); supuesto("Gastos financieros (COP)", e.gastos); supuesto("Tarifa de renta", e.tarifa, "pct");
        if (e.total) doc.supuestos.push({ concepto: "Beta total", cifra: celda("Sí", "txt", "alerta", "Esta beta eleva mucho el Ke; no es la tasa que se usa para valorar ante terceros.") });
        const nombres: Record<string, string> = { rf_usd: "Tasa libre de riesgo USD", erp_maduro: "Prima de mercado", crp: "Prima país", inflacion_cop: "Inflación COP", inflacion_usd: "Inflación USD" };
        for (const [k, l] of Object.entries(nombres)) doc.supuestos.push({ concepto: l, cifra: { ...mercado.parametros[k as keyof Datos["parametros"]], tono: "insumo" } });
        const sc = mercado.sectores.find(s => sector.startsWith(s.ciiu_division));
        if (sc) doc.supuestos.push({ concepto: "Beta del sector utilizada", cifra: { ...(e.total ? sc.beta_total : sc.beta_desapalancada), tono: "insumo" } });
        doc.resultados = Object.entries(r).map(([concepto, cifra]) => ({ concepto, cifra }));
        doc.conclusion = r["WACC COP"]?.v == null ? "No se puede estimar el WACC con los supuestos seleccionados." : `El WACC estimado es ${fmt(r["WACC COP"])} (COP nominal). En USD nominal es ${fmt(r["WACC USD"])}.`;
        doc.notas = Object.values(r).filter(c => c.v == null && c.nota).map(c => c.nota!);
        doc.metodo = "Hamada reapalanca la beta con deuda, patrimonio e impuesto. CAPM suma tasa libre de riesgo, beta por prima de mercado y prima país. Fisher convierte tasas entre COP y USD. El WACC pondera patrimonio y deuda después de impuestos.";
        doc.fuentes = mercado.meta.fuentes;
    } else if (seccion === "tasas") {
        const e = datos as Entradas["tasas"], r = resultado as Resultados["tasas"];
        supuesto(`Tasa de origen (${e.desde})`, e.tasa, "pct"); supuesto("Convención de destino", e.hacia, "txt");
        principal(`Tasa equivalente (${e.hacia})`, r.conversion, "pct");
        doc.conclusion = `La tasa ${valor(e.tasa, "pct")} ${e.desde} equivale a ${valor(r.conversion, "pct")} ${e.hacia}.`;
        doc.tablas.push({ titulo: "Equivalencias", columnas: ["Frecuencia", "Periódica vencida", "Nominal vencida", "Nominal anticipada", "Periódica anticipada"], filas: r.equivalencias.tabla.map(f => [f.adjetivo, ...[f.periodica, f.nominalVencida, f.nominalAnticipada, f.periodicaAnticipada].map(v => `${v.codigo}: ${valor(v.tasa, "pct")}`)]) });
        doc.metodo = "Se obtiene una tasa efectiva anual equivalente y se convierte a la frecuencia y convención elegidas. Las tasas anticipadas descuentan al inicio del periodo y las vencidas al final.";
    } else if (seccion === "tvm") {
        const e = (datos as Entradas["tvm"]).entrada, r = resultado as Resultados["tvm"];
        const etiquetas = { P: "Valor presente", F: "Valor futuro", A: "Cuota", n: "Número de periodos", i: "Tasa periódica" };
        for (const k of ["P", "F", "A", "n", "i"] as const) if (k !== r.incognita) supuesto(etiquetas[k], e[k] ?? 0, k === "i" ? "pct" : "x");
        supuesto("Anualidad", e.anticipada ? "Anticipada" : "Vencida", "txt");
        principal(etiquetas[r.incognita], r.valor, r.incognita === "i" ? "pct" : "x");
        doc.conclusion = `${etiquetas[r.incognita]}: ${valor(r.valor, r.incognita === "i" ? "pct" : "x")}, con anualidad ${e.anticipada ? "anticipada" : "vencida"}.`;
        doc.metodo = "Se igualan los valores presentes y futuros con capitalización compuesta y pagos uniformes. Se conserva la convención de signos: egresos negativos e ingresos positivos; los campos vacíos valen cero.";
    } else if (seccion === "creditos") {
        const { entrada: e, tipo } = datos as Entradas["creditos"], r = resultado as ResultadoCredito, unidad = e.indexacion?.unidad || "COP";
        supuesto(`Principal (${unidad})`, e.principal); supuesto("Cuotas", e.cuotas, "num"); supuesto("Pagos por año", e.periodosPorAnio ?? 12, "num"); supuesto("Gracia (periodos)", e.gracia ?? 0, "num"); supuesto("Sistema", r.nombreSistema, "txt"); supuesto("Tipo de tasa", tipo || "Fija", "txt"); supuesto("Desembolso", e.desembolso || "Sin fecha", "txt");
        const tasas = Array.isArray(e.tasaPeriodica) ? e.tasaPeriodica : [e.tasaPeriodica];
        supuesto("Tasa periódica inicial", tasas[0], "pct");
        if (Array.isArray(e.tasaPeriodica)) { supuesto("Ajuste de cuota", e.tasaVariable === "recalcular" ? "Recalcular cuota" : "Ajuste en la última cuota", "txt"); doc.tablas.push({ titulo: "Tasas por periodo", columnas: ["Periodo", "Tasa"], filas: tasas.map((t, j) => [String(j + 1), valor(t, "pct")]) }); }
        if (e.indexacion) { supuesto(`Valor inicial del índice (${unidad})`, e.indexacion.valorInicial); supuesto("Variación anual del índice", e.indexacion.variacionAnual, "pct"); }
        principal(`Cuota inicial (${unidad})`, r.cuotaInicial); principal(`Total de intereses (${unidad})`, r.totalIntereses); principal(`Total pagado (${unidad})`, r.totalPagado); principal("Costo efectivo anual", r.costoEA, "pct");
        if (e.indexacion) { principal("Cuota inicial en pesos", r.filas.find(f => f.periodo > (e.gracia ?? 0))?.egresoPesos ?? null); principal("Total pagado en pesos", r.filas.slice(1).reduce((s, f) => s + (f.egresoPesos ?? 0), 0)); principal("Costo efectivo anual en pesos", r.costoEAPesos ?? null, "pct"); }
        const fija = e.sistema === "cuota_fija" && !Array.isArray(e.tasaPeriodica) && !(e.gracia ?? 0);
        doc.conclusion = fija ? `La cuota fija es ${unidad === "COP" ? "$" : ""}${valor(r.cuotaInicial)} ${unidad} durante ${e.cuotas} ${e.periodosPorAnio === 12 ? "meses" : "periodos"}.` : `La cuota inicial es ${valor(r.cuotaInicial)} ${unidad}; el sistema es ${r.nombreSistema} y el plazo es ${e.cuotas} periodos.`;
        doc.conclusion += ` El total pagado es ${valor(r.totalPagado)} ${unidad}.`;
        const filas = r.filas.length <= 8 ? r.filas : [...r.filas.slice(0, 4), ...r.filas.slice(-4)];
        doc.tablas.push({ titulo: "Amortización · primeras y últimas filas", columnas: ["Periodo", "Fecha", "Cuota", "Intereses", "Abono", "Saldo", ...(e.indexacion ? ["Pago COP"] : [])], filas: filas.map(f => [String(f.periodo), f.fecha || "—", valor(f.egreso), valor(f.intereses), valor(f.abonoCapital), valor(f.saldoFinal), ...(e.indexacion ? [valor(f.egresoPesos ?? null)] : [])]), nota: `El Excel contiene las ${r.filas.length} filas completas de amortización, incluido el desembolso del periodo 0.` });
        doc.notas.push(`Saldo final cero: ${r.controles.saldoFinalCero ? "Sí" : "No"}. Suma de abonos igual al principal: ${r.controles.sumaAbonosIgualPrincipal ? "Sí" : "No"}.`);
        doc.metodo = "Se aplica el sistema de amortización seleccionado a los saldos y tasas por periodo. El costo efectivo se obtiene de los flujos de caja del crédito. En créditos indexados se proyecta el índice y se expresan también los pagos en pesos.";
        if (tipo && tipo !== "Fija") doc.fuentes = mercado.meta.fuentes.filter(f => f.id === "banrep");
    } else {
        const e = (datos as Entradas["proyectos"]).entrada;
        if (e.modo === "flujos") {
            const r = resultado as { ia: Indicadores; ib?: Indicadores | null; cruce?: number | null };
            supuesto("Tasa de descuento por periodo", e.k, "pct"); supuesto("Tasa de reinversión", e.reinversion ?? e.k, "pct");
            doc.tablas.push({ titulo: "Flujos suministrados", columnas: ["Periodo", "Proyecto A", ...(e.b ? ["Proyecto B"] : [])], filas: Array.from({ length: Math.max(e.a.length, e.b?.length ?? 0) }, (_, j) => [String(j), valor(e.a[j] ?? 0), ...(e.b ? [valor(e.b[j] ?? 0)] : [])]) });
            evaluar("Proyecto A", r.ia); if (r.ib) evaluar("Proyecto B", r.ib); if (r.ib) principal("Tasa de cruce", r.cruce ?? null, "pct");
            doc.conclusion = `El VPN del proyecto A es ${valor(r.ia.vpn)}: ${decision(r.ia)}.${r.ib ? ` El VPN del proyecto B es ${valor(r.ib.vpn)}: ${decision(r.ib)}.` : ""}`;
        } else {
            const i = e.entrada, r = resultado as ResultadoProyecto;
            for (const [l, v, f] of [["Horizonte (años)", i.horizonte, "num"], ["Ventas año 1", i.ventas, "x"], ["Costo de ventas", i.costoVentas, "pct"], ["Gastos de administración y ventas", i.gastosAdmonVentas, "pct"], ["Gastos fijos anuales", i.gastosFijos ?? 0, "x"], ["Diferidos", i.diferidos?.valor ?? 0, "x"], ["Años de amortización de diferidos", i.diferidos?.anios ?? 1, "num"], ["Capital de trabajo / ventas", i.ktnoSobreVentas, "pct"], ["Tarifa de impuesto", i.tasaImpuesto, "pct"], ["Rentabilidad mínima requerida", i.tmrr, "pct"], ["Salvamento bruto", i.valorSalvamento ?? "Valor en libros", "x"]] as const) supuesto(l, v, f);
            (Array.isArray(i.crecimiento) ? i.crecimiento : [i.crecimiento]).forEach((v, j) => supuesto(`Crecimiento ${Array.isArray(i.crecimiento) ? `año ${j + 2}` : "anual"}`, v, "pct"));
            i.activos.forEach(a => { supuesto(`Activo: ${a.nombre}`, a.valor); supuesto(`Vida útil: ${a.nombre} (años)`, a.vidaUtil, "num"); });
            i.deuda?.forEach(t => { supuesto(`Deuda: ${t.nombre} · proporción`, t.proporcion, "pct"); supuesto(`Deuda: ${t.nombre} · tasa anual`, t.tasaEA, "pct"); supuesto(`Deuda: ${t.nombre} · plazo (años)`, t.plazo, "num"); supuesto(`Deuda: ${t.nombre} · sistema`, t.sistema.replaceAll("_", " "), "txt"); });
            principal("Inversión inicial", r.inversionInicial); principal("Costo de capital", r.costoCapital, "pct");
            Object.values(r.evaluaciones).forEach(v => { principal(`${v.descripcion} · tasa`, v.tasa, "pct"); evaluar(v.descripcion, v); });
            doc.conclusion = `El VPN del proyecto con financiación es ${valor(r.evaluaciones.proyectoConFinanciacion.vpn)}: ${decision(r.evaluaciones.proyectoConFinanciacion)}. El costo de capital es ${valor(r.costoCapital, "pct")}.`;
            doc.tablas.push({ titulo: "Flujo de caja y valor económico", columnas: ["Año", "Ventas", "FCL proyecto", "FCL inversionista", "EVA"], filas: r.anios.map(a => [String(a.anio), valor(a.ventas), valor(a.fclProyecto), valor(a.fclInversionista), valor(a.eva)]) });
            if (!r.controles.deudaPagada) doc.notas.push("La deuda no se paga dentro del horizonte."); if (!r.controles.proporcionesValidas) doc.notas.push("Las proporciones de deuda son inválidas.");
            doc.fuentes = mercado.meta.fuentes;
        }
        doc.metodo = "El VPN descuenta los flujos e incluye la inversión inicial. La TIR iguala el VPN a cero; la TIRM usa la tasa de financiación y de reinversión. La decisión se basa en el signo del VPN. El modelo de proyecto incorpora impuestos, depreciación, capital de trabajo y servicio de deuda.";
    }
    for (const fila of [...doc.supuestos, ...doc.resultados]) {
        fila.concepto = textoClaro(fila.concepto).replaceAll("β", "Beta");
        if (fila.cifra.nota) fila.cifra = { ...fila.cifra, nota: textoClaro(fila.cifra.nota) };
    }
    doc.notas = [...new Set(doc.notas.map(textoClaro))];
    return doc;
}

export function identificarDocumento(doc: Documento, fecha = new Date()) {
    // Fecha local (Colombia), no UTC: en la noche toISOString ya marca el día siguiente
    const dia = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    const codigo = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 4).toUpperCase() || Math.random().toString(36).slice(2, 6).padEnd(4, "0").toUpperCase();
    return { ...doc, numero: `MRG-${dia.replaceAll("-", "")}-${codigo}`, fecha: dia };
}
export function archivoDocumento(doc: Documento) { return nombreArchivo(tipos[doc.seccion], doc.empresa, doc.fecha || undefined, "pdf"); }
export interface LogosDocumento { mirage?: string; hypertarget?: string }

/** Solo se ejecuta al descargar, nunca durante el prerenderizado estático. */
export async function logosDocumento(): Promise<LogosDocumento> {
    async function png(src: string) {
        const img = new Image(); img.src = src; await img.decode();
        const canvas = document.createElement("canvas"); canvas.width = 128 * 4; canvas.height = 128 * 4;
        const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("No se pudieron preparar los símbolos del documento.");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/png");
    }
    const [mirage, hypertarget] = await Promise.all([png("/mirage-symbol-black.svg"), png("/hypertarget-symbol-black.svg")]);
    return { mirage, hypertarget };
}

/** Devuelve un PDF real y funciona también en Node sin canvas ni logos. */
/** `comprimir: false` solo para pruebas que buscan texto dentro del PDF. */
export function pdfDocumento(original: Documento, logos: LogosDocumento = {}, opciones: { comprimir?: boolean } = {}): jsPDF {
    const doc = original.numero ? original : identificarDocumento(original);
    const pdf = new jsPDF({ unit: "mm", format: "letter", compress: opciones.comprimir ?? true });
    pdf.setProperties({ title: doc.titulo, author: "Mirage by HyperTarget", subject: doc.empresa });
    const width = pdf.internal.pageSize.getWidth(), height = pdf.internal.pageSize.getHeight(), margin = 18, usable = width - margin * 2;
    const tonos = doc.estilo.tonos; let y = margin;
    const color = (hex: string | null) => hex || "#FFFFFF";
    const nueva = () => { pdf.addPage(); y = margin; };
    const espacio = (alto: number) => { if (y + alto > height - 35) nueva(); };
    const texto = (s: string, size = 10, bold = false) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.setTextColor(tonos.neutro.texto);
        // Línea por línea para que incluso notas o URLs extensas respeten el pie.
        const lineas = pdf.splitTextToSize(s, usable) as string[];
        const alto = size * 0.45;
        for (const linea of lineas) { espacio(alto); pdf.text(linea, margin, y + alto); y += alto; }
        y += 3;
    };
    const seccion = (s: string) => { espacio(30); y += 3; pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(tonos.nota.texto); pdf.text(s.toLocaleUpperCase("es-CO"), margin, y + 4); y += 9; };
    const tabla = (columnas: string[], filas: string[][], tono?: "insumo" | "clave", filasTonos?: Celda["tono"][]) => {
        espacio(20);
        autoTable(pdf, { startY: y, margin: { top: margin, left: margin, right: margin, bottom: 35 }, head: [columnas], body: filas,
            styles: { font: "helvetica", fontSize: columnas.length > 5 ? 7 : 9, cellPadding: 2.1, overflow: "linebreak", textColor: tonos.neutro.texto },
            headStyles: { fillColor: color(tonos.encabezado.fondo), textColor: tonos.encabezado.texto, fontStyle: "bold" },
            columnStyles: { 0: { halign: "left" } },
            didParseCell: data => { if (data.section !== "body") return; data.cell.styles.halign = data.column.index === 0 ? "left" : "right";
                const t = tonos[filasTonos?.[data.row.index] || tono || "neutro"];
                data.cell.styles.fillColor = color(t.fondo); data.cell.styles.textColor = t.texto;
                data.cell.styles.fontStyle = t.negrita ? "bold" : "normal";
                if (t.borde) { data.cell.styles.lineColor = t.borde; data.cell.styles.lineWidth = 0.2; }
            }
        });
        y = (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    };
    if (logos.mirage) pdf.addImage(logos.mirage, "PNG", margin, y, 10, 10, "logo-mirage", "FAST");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.setTextColor(tonos.neutro.texto); pdf.text("Mirage", margin + (logos.mirage ? 13 : 0), y + 7);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.text(`Documento N.º ${doc.numero}`, width - margin, y + 3, { align: "right" });
    pdf.text(`Datos de mercado al ${doc.corte}`, width - margin, y + 8, { align: "right" });
    y += 15; pdf.setDrawColor(tonos.neutro.texto); pdf.setLineWidth(0.53); pdf.line(margin, y, width - margin, y); y += 7;
    texto(doc.titulo, 18, true); if (doc.empresa) texto(`Empresa o proyecto: ${doc.empresa}`);
    seccion("Conclusión"); texto(doc.conclusion, 11, true); doc.notas.forEach(n => texto(n, 9));
    if (doc.rec) {
        seccion("Recomendación"); texto(VEREDICTO[doc.rec.veredicto], 11, true); texto(doc.rec.decision);
        if (doc.rec.recomendaciones.length) { texto("Recomendaciones", 10, true); doc.rec.recomendaciones.forEach(r => texto(`• ${r}`)); }
        if (doc.rec.alertas.length) { texto("Alertas", 10, true); doc.rec.alertas.forEach(a => texto(`• ${a}`)); }
    }
    seccion("Supuestos"); tabla(["Concepto", "Valor"], doc.supuestos.map(f => [f.concepto, fmt(f.cifra)]), "insumo", doc.supuestos.map(f => f.cifra.tono));
    seccion("Resultados"); tabla(["Concepto", "Valor"], doc.resultados.map(f => [f.concepto, fmt(f.cifra)]), "clave", doc.resultados.map(f => f.cifra.tono));
    for (const t of doc.tablas) { seccion(t.titulo); tabla(t.columnas, t.filas); if (t.nota) texto(t.nota, 9); }
    seccion("Método"); texto(doc.metodo);
    seccion("Fuentes"); if (!doc.fuentes.length) texto("Datos ingresados por el usuario. No se utilizan tasas de mercado en este cálculo.", 9);
    doc.fuentes.forEach(f => { texto(f.nombre, 9, true); texto(f.url, 8); });
    texto(doc.aviso, 8);
    const pages = pdf.getNumberOfPages();
    for (let n = 1; n <= pages; n++) {
        pdf.setPage(n); pdf.setDrawColor(tonos.nota.texto); pdf.setLineWidth(0.2); pdf.line(margin, height - 28, width - margin, height - 28);
        if (logos.hypertarget) pdf.addImage(logos.hypertarget, "PNG", margin, height - 25, 7, 7, "logo-hypertarget", "FAST");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor("#000000"); pdf.text("Mirage by HyperTarget", margin + (logos.hypertarget ? 9 : 0), height - 20);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
        pdf.text(`mirage.hypertarget.tech · ${doc.fecha}`, width - margin, height - 22, { align: "right" });
        pdf.text(`Página ${n} de ${pages}`, width - margin, height - 18, { align: "right" });
    }
    return pdf;
}
