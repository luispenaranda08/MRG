"use client";
import { useRef, useState } from "react";
import { useDatos } from "./Mirage";
import { Cifra } from "./Cifra";
import { celda, numero, type Formato, type Tono } from "@/lib/api";
import { buildCompany, buildWorkbook, runModel, catalogoDashboard, FI, M, dq } from "@/lib/dx/engine";
import { leerEstados, EXTENSIONES, FORMATOS_ACEPTADOS } from "@/lib/dx/formatos";
import { revisarConJev, planConJev, decisionesConJev } from "@/lib/dx/jev-dx";
import { defaultsFor } from "@/lib/dx/defaults";
import { aplicar, disponibles, ETIQUETAS, POR_DEFECTO, resumenParaJev, type Decision, type Clave } from "@/lib/dx/decisiones";
import { agregarHojaDecisiones } from "@/lib/dx/decisiones-excel";
import { tamanoPorActivos } from "@/lib/dx/tamano";
import { nombreArchivo } from "@/lib/nombres";
import { saveWorkbook } from "@/lib/excel";
import type { Parsed } from "@/lib/dx/types";
import { textoClaro } from "@/lib/textos";
type Supuestos = ReturnType<typeof defaultsFor>;
type Company = ReturnType<typeof buildCompany>;
type Model = ReturnType<typeof runModel>;
const metricLabels = [['rev', 'Ingresos', 'num'], ['gm', 'Margen bruto', 'pct'], ['em', 'Margen EBIT', 'pct'], ['nm', 'Margen neto', 'pct'], ['cr', 'Razón corriente', 'x'], ['quick', 'Prueba ácida', 'x'], ['la', 'Pasivo / activo', 'pct'], ['de', 'D/E', 'x'], ['cov', 'Cobertura de intereses', 'x'], ['at', 'Rotación del activo', 'x'], ['dso', 'Días de cartera', 'num'], ['dio', 'Días de inventario', 'num'], ['dpo', 'Días de proveedores', 'num'], ['roa', 'ROA', 'pct'], ['roe', 'ROE', 'pct'], ['roic', 'ROIC', 'pct'], ['mult', 'Multiplicador patrimonial', 'x']] as const;
const trm = (d: ReturnType<typeof useDatos>) => { const v = d.indicadores?.trm ? numero(d.indicadores.trm) : null; return v ? String(v) : ""; };
export function Diagnostico() {
    const d = useDatos(), [step, setStep] = useState(1), [parsed, setParsed] = useState<Parsed | null>(null), [company, setCompany] = useState<Company | null>(null), [sup, setSup] = useState<Supuestos | null>(null), [baseSup, setBaseSup] = useState<Supuestos | null>(null), [decisiones, setDecisiones] = useState<Decision[]>([]), [jevDecidiendo, setJevDecidiendo] = useState(false), [sector, setSector] = useState(d.sectores.findIndex(x => x.ciiu_division === '63') >= 0 ? d.sectores.findIndex(x => x.ciiu_division === '63') : 0), [tamano, setTamano] = useState("Grande"), [tamanoElegido, setTamanoElegido] = useState(false), [sectorTocado, setSectorTocado] = useState(false), [ejemploFijaSector, setEjemploFijaSector] = useState(false), [meta, setMeta] = useState({ name: "", cur: "COP", unit: "millones", country: "Colombia", fx: trm(d) }), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const archivo = useRef<HTMLInputElement>(null);
    const edicionManual = useRef<Partial<Record<"crecimiento" | "margen" | "kd", boolean>>>({});
    const decisionBloqueada = useRef<Partial<Record<Clave, boolean>>>({});
    const decisionElegida = useRef<Partial<Record<Clave, string>>>({});
    const sectorTocadoRef = useRef(false);
    const generateId = useRef(0);
    const [arrastrando, setArrastrando] = useState(false), [nombreCarga, setNombreCarga] = useState("");
    const [revisando, setRevisando] = useState(false), [sugSector, setSugSector] = useState<number | null>(null), [avance, setAvance] = useState("");
    let R: Model | null = null;
    let modelError = "";
    if (company && sup) {
        try {
            R = runModel(company, sup, d);
        }
        catch (e) {
            modelError = String(e);
        }
    }
    async function load(buffer: ArrayBuffer, name: string, example?: string) { setError(""); try {
        const p = await leerEstados(buffer, name);
        setParsed(p);
        setSectorTocado(false);
        sectorTocadoRef.current = false;
        setEjemploFijaSector(example === "pyme");
        setMeta({ name: p.name, cur: p.cur, unit: p.unit, country: example === 'visa' ? "Estados Unidos" : p.cur === 'COP' ? "Colombia" : "Estados Unidos", fx: trm(d) });
        if (example === 'pyme') {
            const idx = d.sectores.findIndex(x => x.ciiu_division === '14');
            if (idx >= 0)
                setSector(idx);
            setSectorTocado(true);
            sectorTocadoRef.current = true;
            setTamano("Pequeña");
        }
        setTamanoElegido(false);
        setStep(2);
        setCompany(null);
        setSup(null);
        void revisar(p, example === "pyme");
    }
    catch (e) {
        setError(String(e));
    } }
    /** JEV revisa la tabla plana: qué filas presentar y qué campo es cada una. Si no responde, queda el mapeo por reglas. */
    async function revisar(p: Parsed, preservarSector = false) {
        setRevisando(true); setSugSector(null);
        try {
            const { parsed: q, sugerencias } = await revisarConJev(p, d.sectores);
            setParsed(actual => actual === p ? q : actual);
            setMeta(m => ({ ...m, ...(sugerencias.nombre && m.name === p.name ? { name: sugerencias.nombre } : {}), ...(sugerencias.unidad && m.unit === p.unit ? { unit: sugerencias.unidad } : {}), ...(sugerencias.moneda && m.cur === p.cur ? { cur: sugerencias.moneda } : {}) }));
            if (sugerencias.sector != null) {
                setSugSector(sugerencias.sector);
                if (!sectorTocadoRef.current && !preservarSector) setSector(sugerencias.sector);
            }
        }
        catch { /* sigue el mapeo por reglas */ }
        finally { setRevisando(false); }
    }
    async function file(f: File) { if (busy) return; setNombreCarga(f.name); setBusy(true); try {
        await load(await f.arrayBuffer(), f.name);
    }
    catch (e) {
        setError(String(e));
    }
    finally {
        setBusy(false);
    } }
    async function example(key: string) { setBusy(true); try {
        const name = key === 'visa' ? "Visa-2021-2025.xlsx" : "PYME-Confecciones-del-Caribe.xlsx", r = await fetch(`/ejemplos/${name}`);
        if (!r.ok)
            throw new Error("No se pudo leer el archivo de ejemplo.");
        await load(await r.arrayBuffer(), name, key);
    }
    catch (e) {
        setError(String(e));
    }
    finally {
        setBusy(false);
    } }
    async function generate() { if (!parsed)
        return; setError(""); try {
        const fields = parsed.rows.filter(r => r.field).map(r => r.field);
        if (new Set(fields).size !== fields.length)
            throw new Error("Una cuenta Mirage está asignada a varias filas. Revise el mapeo.");
        if (!meta.name.trim())
            throw new Error("Ingrese el nombre de la empresa.");
        const id = ++generateId.current;
        const sc = d.sectores[sector], c = buildCompany(parsed, { ...meta, fx: Number(meta.fx), sectorName: sc.nombre, bu: numero(sc.beta_desapalancada), listed: false });
        // Si el usuario no eligió el tamaño, se toma de los activos del último año con la regla de las tablas (Ley 905)
        const k = c.years.length - 1, activosCOP = M(c, k).ta * c.um * (meta.cur === "USD" ? Number(meta.fx) : 1);
        const sugerido = tamanoPorActivos(activosCOP, Number(c.years[k]));
        const tam = !tamanoElegido && sugerido && sc.por_tamano[sugerido] ? sugerido : tamano;
        if (tam !== tamano) setTamano(tam);
        const s = defaultsFor(c, d, sector, tam);
        if (c.years.some((_: number, i: number) => M(c, i).eq <= 0 || M(c, i).rev <= 0))
            throw new Error("Para calcular capital y proyecciones se requiere patrimonio e ingresos positivos. Revise las cuentas.");
        setCompany(c);
        setBaseSup(s);
        setSup(s);
        setDecisiones((Object.keys(POR_DEFECTO) as Clave[]).map(clave => ({ clave, opcion: POR_DEFECTO[clave], motivo: "Valor por defecto de Mirage.", origen: "mirage" })) as Decision[]);
        edicionManual.current = {};
        decisionBloqueada.current = {};
        decisionElegida.current = {};
        setStep(3);
        setJevDecidiendo(true);
        const resumen = resumenParaJev(c, s, `${sc.ciiu_division} · ${sc.nombre}`, tam);
        const respuesta = await decisionesConJev(c, resumen);
        if (id !== generateId.current) return;
        setDecisiones(prev => respuesta.map(decision => edicionManual.current[decision.clave] || decisionBloqueada.current[decision.clave] ? (prev.find(x => x.clave === decision.clave) ?? decision) : decision));
        setSup(prev => {
            if (!prev) return prev;
            const seleccion = Object.fromEntries(respuesta.map(x => [x.clave, edicionManual.current[x.clave] || decisionBloqueada.current[x.clave] ? (decisionElegida.current[x.clave] ?? POR_DEFECTO[x.clave]) : x.opcion])) as Record<Clave, never>;
            const next = aplicar(c, s, seleccion);
            if (edicionManual.current.crecimiento) next.growth = prev.growth;
            if (edicionManual.current.margen) next.margin = prev.margin;
            if (edicionManual.current.kd) { next.kd = prev.kd; next.kdFuente = prev.kdFuente; }
            return next;
        });
        setJevDecidiendo(false);
    }
    catch (e) {
        setError(String(e));
    } }
    function update<K extends keyof Supuestos>(k: K, v: Supuestos[K]) { const clave = k === "growth" ? "crecimiento" : k === "margin" ? "margen" : null; if (clave) { edicionManual.current[clave] = true; setDecisiones(xs => xs.map(x => x.clave === clave ? { ...x, origen: "usuario", motivo: "Supuesto editado por usted." } : x)); } if (sup)
        setSup({ ...sup, [k]: v, ...(k === "betaReg" && (v === "" || Number(v) <= 0) && sup.waccMode === "reg" ? { waccMode: "bu" } : {}) }); }
    function elegirDecision<K extends Clave>(clave: K, opcion: Decision<K>["opcion"]) {
        if (!company || !baseSup) return;
        edicionManual.current[clave] = false;
        decisionBloqueada.current[clave] = true;
        decisionElegida.current[clave] = opcion;
        const siguiente = decisiones.map(x => x.clave === clave ? { ...x, opcion, motivo: "Opción elegida por usted.", origen: "usuario" as const } : x);
        setDecisiones(siguiente);
        const dmap = Object.fromEntries(siguiente.map(x => [x.clave, x.opcion])) as Record<Clave, never>;
        setSup(prev => {
            const next = aplicar(company, baseSup, dmap);
            if (prev && edicionManual.current.crecimiento && clave !== "crecimiento") next.growth = prev.growth;
            if (prev && edicionManual.current.margen && clave !== "margen") next.margin = prev.margin;
            if (prev && edicionManual.current.kd && clave !== "kd") { next.kd = prev.kd; next.kdFuente = prev.kdFuente; }
            return next;
        });
    }
    async function excel() { if (!company || !sup || !parsed || !R)
        return; setError(""); setBusy(true); try {
        if (!meta.name.trim()) throw new Error("Ingrese el nombre de la empresa antes de descargar.");
        const empresa = { ...company, name: meta.name.trim() };
        let plan = null;
        setAvance("Armando el dashboard…");
        try { plan = await planConJev(catalogoDashboard(empresa, R), { nombre: empresa.name, moneda: company.cur, unidad: company.unit, sector: d.sectores[sector].nombre, alertas: (R.alertas ?? []).map((a: { msg: string }) => a.msg) }); }
        catch { /* dashboard con el plan de Mirage */ }
        setAvance("Preparando Excel…");
        const w = buildWorkbook(empresa, sup, R, parsed, d, plan);
        agregarHojaDecisiones(w, decisiones, { sector: `${d.sectores[sector].ciiu_division} · ${d.sectores[sector].nombre}`, sectorOrigen: sectorTocado ? "Usted" : sugSector != null && !ejemploFijaSector ? "Recomendado" : "Valor base", tamano, tamanoOrigen: tamanoElegido ? "Usted" : "regla de activos Ley 905" });
        await saveWorkbook(w, nombreArchivo("DX", meta.name));
    }
    catch (e) {
        setError(String(e));
    }
    finally {
        setBusy(false); setAvance("");
    } }
    const ocultas = parsed ? parsed.rows.filter(r => r.oculta).length : 0;
    return <><div className="heading"><div><p className="eyebrow">[ DX ] / DIAGNÓSTICO FINANCIERO</p><h1>Tu empresa</h1><p className="muted">Del balance y PyG al costo de capital, flujo de caja y valor.</p></div></div><ol className="dx-steps">{['Cargar archivo', 'Revisar cuentas', 'Informe y documentos'].map((l, i) => <li key={l} aria-current={step === i + 1 ? 'step' : undefined}>{i + 1}. {l}</li>)}</ol>{error && <p role="alert" className="alert">{textoClaro(error)}</p>}{step === 1 && <section className="card"><h2>Cargue balance y estado de resultados</h2><p>Balance y estado de resultados con al menos dos años, en una o varias hojas o páginas.</p><p className="muted">Acepta {FORMATOS_ACEPTADOS} formatos: Excel (xlsx, xls, xlsb, xlsm), CSV y TSV, OpenDocument, Numbers, PDF con texto, Word, PowerPoint, RTF, XBRL e iXBRL, HTML, JSON, texto o Markdown, y archivos comprimidos (zip) que los contengan.</p><div className={`drop${arrastrando ? " drop-active" : ""}`} onDragOver={e => { e.preventDefault(); if (!busy) setArrastrando(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastrando(false); }} onDrop={e => { e.preventDefault(); setArrastrando(false); const f = e.dataTransfer.files[0]; if (f && !busy) void file(f); }}><label className="sr-only" htmlFor="dx-archivo">Elegir archivo de estados financieros</label><input ref={archivo} id="dx-archivo" aria-describedby="dx-nombre-archivo" className="sr-only" type="file" accept={EXTENSIONES} disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void file(f); e.target.value = ""; }}/><button disabled={busy} onClick={() => archivo.current?.click()}>Elegir archivo</button><p id="dx-nombre-archivo" role="status">{nombreCarga || "Arrastre aquí su archivo"}</p></div><h3>Explore un archivo de ejemplo</h3><div className="actions"><button disabled={busy} onClick={() => example('visa')}>Visa · 2021–2025</button><button disabled={busy} onClick={() => example('pyme')}>Confecciones del Caribe</button></div><p className="muted">También puede descargar los ejemplos: <a href="/ejemplos/Visa-2021-2025.xlsx" download>Visa</a> · <a href="/ejemplos/PYME-Confecciones-del-Caribe.xlsx" download>PYME</a>.</p>{busy && step === 1 && <p role="status">Leyendo archivo…</p>}</section>}{step === 2 && parsed && <section className="card form"><h2>Revise el mapeo de cuentas</h2><p>{parsed.fname} · {parsed.years.join(' / ')}. Una asignación por campo; las filas sin asignar se conservan en los estados.</p>{(revisando || parsed.revision || (sugSector != null && sugSector !== sector)) && <div className="rec-revision" role="status" aria-live="polite">{revisando ? <p className="tono-nota">Revisando el archivo…</p> : parsed.revision && <><p className="rec-titulo"><strong>Revisión del archivo</strong>{parsed.revision.formato ? ` · ${parsed.revision.formato}` : ""}</p><p>{parsed.revision.veredicto}</p>{parsed.revision.alertas.map((a, i) => <p key={i} className="tono-alerta">{a}</p>)}{ocultas > 0 && <p className="muted">{ocultas === 1 ? "1 fila no se presenta" : `${ocultas} filas no se presentan`} en los estados del informe. Puede volver a mostrarlas en la columna «Mostrar».</p>}</>}{sugSector != null && sugSector !== sector && <p>Sector sugerido: {d.sectores[sugSector].ciiu_division} · {d.sectores[sugSector].nombre}. <button type="button" className="rec-usar" onClick={() => { setSector(sugSector); setSectorTocado(false); sectorTocadoRef.current = false; }}>Usar este sector</button></p>}</div>}<div className="fields"><label>Nombre de la empresa<input required value={meta.name} onChange={e => setMeta({ ...meta, name: e.target.value })}/></label><label>País de operación<select value={meta.country} onChange={e => setMeta({ ...meta, country: e.target.value })}><option>Colombia</option><option>Estados Unidos</option><option>Otro</option></select></label><label>Moneda<select value={meta.cur} onChange={e => setMeta({ ...meta, cur: e.target.value })}><option>COP</option><option>USD</option></select></label><label>Unidades<select value={meta.unit} onChange={e => setMeta({ ...meta, unit: e.target.value })}><option>unidades</option><option>miles</option><option>millones</option></select></label><label>Sector<select value={sector} onChange={e => { setSector(Number(e.target.value)); setSectorTocado(true); }}>{d.sectores.map((s, i) => <option key={s.ciiu_division} value={i}>{s.ciiu_division} · {s.nombre}</option>)}</select>{sugSector != null && !sectorTocado && !ejemploFijaSector && <small className="source">Sector sugerido: {d.sectores[sugSector].ciiu_division} · {d.sectores[sugSector].nombre}{parsed?.revision?.veredicto ? ` · ${parsed.revision.veredicto}` : ""}</small>}</label><label>Tamaño<select value={tamano} onChange={e => { setTamano(e.target.value); setTamanoElegido(true); }}>{Object.keys(d.sectores[sector].por_tamano).map(t => <option key={t}>{t}</option>)}</select><small className="source">{tamanoElegido ? "Elegido por usted" : "Sugerido por activos · Ley 905"}</small></label>{meta.cur === 'COP' && <label>Tipo de cambio COP/USD (opcional)<input value={meta.fx} type="number" min="0" step="any" onChange={e => setMeta({ ...meta, fx: e.target.value })}/><small>Precargada con la TRM del Banco de la República ({d.indicadores?.trm?.corte ?? "sin dato"}); se usa para expresar el tamaño en USD.</small></label>}</div><div className="table-scroll mapping" tabIndex={0}><table><caption className="sr-only">Mapeo de cuentas del archivo</caption><thead><tr><th scope="col">Cuenta original / hoja</th><th scope="col">Estado</th><th scope="col">Campo Mirage</th><th scope="col">Mostrar</th>{parsed.years.map(y => <th key={y} scope="col">{y}</th>)}</tr></thead><tbody>{parsed.rows.map((r, i) => <tr key={i} className={r.oculta ? "fila-oculta" : undefined}><th scope="row">{r.label}<small className="source"> · {r.sheet}</small>{r.motivo && <small className="source rec-motivo">{r.motivo}</small>}</th><td><select aria-label={`Estado para ${r.label}`} value={r.st} onChange={e => setParsed({ ...parsed, rows: parsed.rows.map((x, j) => j === i ? { ...x, st: e.target.value, field: null } : x) })}><option value="bal">Balance</option><option value="pyg">PyG</option></select></td><td>{!r.hdr && <select aria-label={`Mapear ${r.label}`} value={r.field || ''} onChange={e => setParsed({ ...parsed, rows: parsed.rows.map((x, j) => j === i ? { ...x, field: e.target.value || null, conf: e.target.value ? 1 : 0 } : x) })}><option value="">Sin asignar</option>{Object.keys(FI).filter(k => FI[k].st === r.st).map(k => <option key={k} value={k}>{FI[k].l}</option>)}</select>}</td><td>{!r.hdr && <input type="checkbox" aria-label={`Mostrar ${r.label} en los estados`} checked={!r.oculta} onChange={e => setParsed({ ...parsed, rows: parsed.rows.map((x, j) => j === i ? { ...x, oculta: !e.target.checked } : x) })}/>}</td>{r.v.map((v, j) => <td key={j}><Cifra celda={celda(v, 'num', 'insumo', v === null ? 'Sin dato en el archivo; se toma como cero.' : undefined)}/></td>)}</tr>)}</tbody></table></div><div className="actions"><button onClick={generate}>Generar informe</button><button onClick={() => { setStep(1); setError(''); }}>Cargar otro archivo</button></div></section>}{step === 3 && company && sup && R && <div className="dx-report"><section className="card"><p className="eyebrow">{company.unit} / {company.years.join(' · ')}</p><h2>Informe financiero · {meta.name}</h2><label className="company-field no-print">Nombre de la empresa<input required value={meta.name} onChange={e => setMeta({ ...meta, name: e.target.value })}/></label><p>{d.sectores[sector].nombre} · Datos de mercado al {d.meta.corte} · {tamano}</p><div className="actions"><button disabled={busy} onClick={excel}>{busy ? (avance || 'Preparando Excel…') : '↓ Excel · 15 hojas con dashboard'}</button><button onClick={() => { if (!meta.name.trim()) setError("Ingrese el nombre de la empresa antes de imprimir."); else window.print(); }}>Imprimir informe</button><button onClick={() => setStep(2)}>Revisar cuentas</button></div>{R.alertas?.length > 0 && <div className="alertas" role="alert" aria-label="Advertencias sobre los resultados">{R.alertas.map((a: { sev: string; msg: string }, i: number) => <p key={i} className={a.sev === "info" ? "tono-nota" : "tono-alerta"}>{a.sev === "alta" ? "Importante: " : ""}{textoClaro(a.msg)}</p>)}</div>}<div className="results">{[['Ingresos', R.m.rev, 'num'], ['WACC', R.w, 'pct'], ['GAO', R.lev.gao, 'x'], ['GAF', R.lev.gaf, 'x'], ['EBIT de indiferencia', R.upa.ebitStar, 'num'], [`EVA ${company.years[R.k]}`, R.EV[R.k].eva, 'num'], ['Valor empresa (DCF)', R.V?.ev ?? null, 'num'], ['Valor por acción', R.ps, 'x']].map(([l, v, f]) => <article key={String(l)}><h3>{l}</h3><Cifra celda={celda(v as number | null, f as Formato, 'clave', v === null ? 'Valor no calculable con estos supuestos.' : undefined)}/></article>)}</div><section className="rec-decisions" aria-labelledby="rec-decisions-title"><h3 id="rec-decisions-title">Supuestos recomendados</h3>{jevDecidiendo && <p role="status" className="muted">Revisando los supuestos…</p>}<div className="rec-decision-list">{decisiones.map(decision => { const etiqueta = ETIQUETAS[decision.clave]; const opciones = disponibles(company)[decision.clave] as readonly string[]; return <div className="rec-decision" key={decision.clave}><div><strong>{etiqueta.titulo}</strong><p>{etiqueta.opciones[decision.opcion as never]}</p>{decision.motivo && <small>{decision.motivo}</small>}<span className="rec-origen">{decision.origen === "auto" ? "Recomendado" : decision.origen === "usuario" ? "Usted" : "Valor base"}</span></div><label>Opción<select aria-label={`Opción para ${etiqueta.titulo}`} value={decision.opcion} onChange={e => elegirDecision(decision.clave, e.target.value as never)}>{opciones.map(o => <option key={o} value={o}>{etiqueta.opciones[o as never]}</option>)}</select></label></div>; })}</div><button type="button" onClick={() => { if (!company || !baseSup) return; edicionManual.current = {}; decisionBloqueada.current = {}; decisionElegida.current = {}; (Object.keys(POR_DEFECTO) as Clave[]).forEach(clave => { decisionBloqueada.current[clave] = true; decisionElegida.current[clave] = POR_DEFECTO[clave]; }); const ds = (Object.keys(POR_DEFECTO) as Clave[]).map(clave => ({ clave, opcion: POR_DEFECTO[clave], motivo: "Valor por defecto de Mirage.", origen: "mirage" as const })) as Decision[]; setDecisiones(ds); setSup(aplicar(company, baseSup, POR_DEFECTO)); }}>Volver a los valores de Mirage</button></section><details className="dx-options form"><summary>Supuestos y escenarios editables</summary><p>Los insumos de mercado (tasa libre de riesgo, prima de mercado, prima país, inflación, Kd y beta del sector) vienen de Mirage. Los valores siguientes son supuestos de la empresa y de la proyección: al cambiarlos se recalculan el informe y el Excel.</p><div className="fields">{([['t', 'Tarifa de renta (%)'], ['fixed', 'Gastos operativos fijos (%)'], ['margin', 'Margen EBIT proyectado (%)'], ['daPct', 'D&A / ingresos (%)'], ['capexPct', 'CAPEX / ingresos (%)'], ['ktnoPct', 'KTNO / ingresos (%)'], ['g', 'Crecimiento perpetuo (%)'], ['shares', 'Acciones en circulación'], ['finNeed', 'Financiación adicional'], ['price', 'Precio por acción'], ['issuePrice', 'Precio de emisión'], ['finRate', 'Interés deuda nueva (%)'], ['betaReg', 'Beta de regresión'], ['waccManual', 'WACC manual (%)'], ['size', 'Prima tamaño del usuario (pp)']] as const).map(([k, l]) => <label key={k}>{l}<input type="number" step="any" value={sup[k] ?? ''} onChange={e => update(k, (e.target.value === '' ? k === 'finRate' ? null : '' : Number(e.target.value)) as never)}/></label>)}{sup.growth.map((v, j) => <label key={j}>Crecimiento año {j + 1} (%)<input type="number" step="any" value={v} onChange={e => update('growth', sup.growth.map((x, k) => k === j ? Number(e.target.value) : x))}/></label>)}<label>WACC para valorar<select value={sup.waccMode} onChange={e => update('waccMode', e.target.value)}><option value="bu">Beta del sector</option><option value="reg" disabled={sup.betaReg === "" || Number(sup.betaReg) <= 0}>Beta de regresión</option><option value="manual">WACC manual</option></select></label><label>Kd USD (%) · observado / escenario<input type="number" step="any" value={sup.kd} onChange={e => { edicionManual.current.kd = true; setDecisiones(xs => xs.map(x => x.clave === "kd" ? { ...x, origen: "usuario", motivo: "Supuesto editado por usted." } : x)); setSup({ ...sup, kd: Number(e.target.value), kdFuente: 'Supuesto explícito del usuario (USD)' }); }}/></label></div><p className="alert">Prima por tamaño: Mirage aún no publica una verificable para Colombia. Se aplica cero, salvo que usted ingrese una como escenario propio.</p></details></section><Report title="Calidad de datos"><ul>{dq(company).list.map((x: {
        title: string;
        msg: string;
    }, i: number) => <li key={i}><strong>{x.title}</strong>: {x.msg}</li>)}</ul></Report><Statement company={company} kind="bal"/><Statement company={company} kind="pyg"/><Report title="Indicadores y DuPont"><Matrix years={company.years} rows={metricLabels.map(([k, l, f]) => ({ l, values: company.years.map((_: number, i: number) => M(company, i)[k]), fmt: f }))}/><p className="formula">ROE = margen neto × rotación del activo × multiplicador patrimonial.</p></Report><Report title="Costo de capital"><div className="results">{[['βu', R.bu, 'x'], ['βL', R.bl, 'x'], ['D/E', R.de, 'x'], ['Ke USD', R.keU / 100, 'pct'], [`Ke en ${company.cur}`, R.ke / 100, 'pct'], [`Kd en ${company.cur}`, R.kd / 100, 'pct'], ['Peso deuda', R.wD, 'pct'], ['Peso patrimonio', R.wE, 'pct']].map(([l, v, f]) => <article key={String(l)}><h3>{l}</h3><Cifra celda={celda(v as number, f as Formato)}/></article>)}</div><p>{textoClaro(sup.kdFuente)}</p><p>La prima país Mirage ya incluye la volatilidad relativa λ. La exposición país es {sup.lam}; fuera de Colombia no se suma la prima colombiana.</p></Report><Report title="Flujo de caja libre histórico"><Matrix years={company.years} rows={([['ebit', 'EBIT'], ['uodi', 'UODI'], ['da', 'D&A'], ['ktno', 'KTNO'], ['dk', 'Δ KTNO'], ['capex', 'CAPEX'], ['fcl', 'FCL']] as const).map(([k, l]) => ({ l, values: R.H.map((p: Record<string, number | null>) => p[k]), fmt: 'num' }))}/></Report><Report title="Proyección, DCF y sensibilidad"><Matrix years={R.Pj.map((p: {
        y: number;
    }) => p.y)} rows={([['g', 'Crecimiento'], ['rev', 'Ingresos'], ['ebit', 'EBIT'], ['uodi', 'UODI'], ['da', 'D&A'], ['dk', 'Δ KTNO'], ['cx', 'CAPEX'], ['fcl', 'FCL']] as const).map(([k, l]) => ({ l, values: R.Pj.map((p: Record<string, number>) => p[k]), fmt: k === 'g' ? 'pct' : 'num' }))}/><h3>Sensibilidad: valor por acción por WACC y crecimiento perpetuo</h3><div className="table-scroll"><table><thead><tr><th scope="col">WACC / g</th>{R.SG.map((g: number) => <th key={g} scope="col"><Cifra celda={celda(R.g + g / 100)}/></th>)}</tr></thead><tbody>{R.sens.map((row: (number | null)[], i: number) => <tr key={i}><th scope="row"><Cifra celda={celda(R.w + R.SW[i] / 100)}/></th>{row.map((v, j) => <td key={j}><Cifra celda={celda(v, 'x')}/></td>)}</tr>)}</tbody></table></div></Report><Report title="Apalancamiento y UPA"><div className="results">{[['Punto de equilibrio', R.lev.pe, 'num'], ['Margen de seguridad', R.lev.ms, 'pct'], ['GAT', R.lev.gat, 'x'], ['UPA con acciones', R.upa.A, 'x'], ['UPA con deuda', R.upa.B, 'x']].map(([l, v, f]) => <article key={String(l)}><h3>{l}</h3><Cifra celda={celda(v as number, f as Formato)}/></article>)}</div><p className="formula">GAO = margen de contribución / EBIT. GAF = EBIT / (EBIT − intereses). GAT = GAO × GAF.</p></Report><Report title="EVA y riesgo"><Matrix years={company.years} rows={([['nopat', 'NOPAT'], ['ic', 'Capital invertido'], ['roic', 'ROIC'], ['eva', 'EVA']] as const).map(([k, l]) => ({ l, values: R.EV.map((p: Record<string, number>) => p[k]), fmt: k === 'roic' ? 'pct' : 'num' }))}/><div className="results"><article><h3>Altman Z″</h3><Cifra celda={celda(R.az.z, 'x')}/><p>Rating equivalente {R.az.r}</p></article><article><h3>Rating por cobertura</h3><Cifra celda={celda(R.rt![1], 'txt')}/></article><article><h3>Rating estimado</h3><Cifra celda={celda(Number.isFinite(R.rm.n) ? R.rm.r : null, 'txt', 'nota', 'Estimación analítica, no un modelo entrenado; usa el tamaño en USD (con la TRM).')}/></article><article><h3>Probabilidad de incumplimiento</h3><Cifra celda={celda(R.pd.pd, 'pct', 'nota', 'Estimación del modelo analítico original. Si falta TRM, no se calcula tamaño USD.')}/></article></div><p>Altman Z″ usa los coeficientes publicados para mercados emergentes; el rating y la probabilidad de incumplimiento son estimaciones analíticas de referencia, no calificaciones oficiales.</p></Report></div>}{modelError && <p role="alert">{textoClaro(modelError)}</p>}</>;
}
function Report({ title, children }: {
    title: string;
    children: React.ReactNode;
}) { return <section className="card report-block"><h2>{title}</h2>{children}</section>; }
function Matrix({ years, rows }: {
    years: number[];
    rows: {
        l: string;
        values: (number | null)[];
        fmt: Formato;
    }[];
}) { return <div className="table-scroll" tabIndex={0}><table><thead><tr><th scope="col" className="texto">Concepto</th>{years.map(y => <th scope="col" key={y}>{y}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.l}><th scope="row">{r.l}</th>{r.values.map((v, i) => <td key={i}><Cifra celda={celda(v, r.fmt, r.l === 'EVA' || r.l === 'FCL' ? 'clave' : 'neutro', v === null ? 'No disponible para este período.' : undefined)}/></td>)}</tr>)}</tbody></table></div>; }
function Statement({ company: c, kind }: {
    company: Company;
    kind: 'bal' | 'pyg';
}) { const [mode, setMode] = useState('val'), base = kind === 'bal' ? 'ta' : 'rev'; return <Report title={kind === 'bal' ? 'Balance · vertical y horizontal' : 'PyG · vertical y horizontal'}><div className="switch" role="group" aria-label="Análisis de estados">{[['val', 'Valores'], ['v', 'Vertical'], ['h', 'Horizontal'], ['idx', 'Índice'], ['cagr', 'CAGR']].map(([k, l]) => <button key={k} aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>)}</div><div className="table-scroll" tabIndex={0}><table><thead><tr><th scope="col" className="texto">Cuenta</th>{(mode === 'cagr' ? [c.years[c.years.length - 1]] : c.years).map((y: number) => <th scope="col" key={y}>{y}</th>)}</tr></thead><tbody>{c[kind].filter((r: {
    v?: number[];
}) => r.v).map((r: {
    id: string;
    l: string;
    v: number[];
}) => <tr key={r.id}><th scope="row">{r.l}</th>{(mode === 'cagr' ? [c.years.length - 1] : c.years.map((_: number, i: number) => i)).map((i: number) => { const val = mode === 'val' ? r.v[i] : mode === 'v' ? r.v[i] / M(c, i)[base] : mode === 'h' ? i && r.v[i - 1] ? r.v[i] / r.v[i - 1] - 1 : null : mode === 'idx' ? r.v[0] ? r.v[i] / r.v[0] : null : r.v[0] > 0 && r.v[i] > 0 ? Math.pow(r.v[i] / r.v[0], 1 / i) - 1 : null; const tone: Tono = mode === 'val' ? 'insumo' : mode === 'h' ? val === null ? 'nota' : val >= 0 ? 'sube' : 'baja' : 'neutro'; return <td key={i}><Cifra celda={celda(val, mode === 'val' ? 'num' : mode === 'idx' ? 'x' : 'pct', tone)}/></td>; })}</tr>)}</tbody></table></div></Report>; }
