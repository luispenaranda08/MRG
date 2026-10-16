import { useState, type ReactNode } from "react";
import { Cifra } from "@/components/Cifra";
import { defBloque, formatoCifra, validarTexto, type Cifra as CifraDato, type Ejecucion, type TextoMotor } from "@/lib/agentes";
import { Numero, Valor, descargar } from "./Comun";
const EFECTOS = { aprobar: "Aprobar", condicionar: "Condicionar", negar: "Negar", sin_reglas: "Sin reglas" };

export function Resultado({ ejecucion: e, texto, cambiarTexto }: { ejecucion: Ejecucion; texto: TextoMotor | null; cambiarTexto: (t: TextoMotor) => void }) {
    const [editando, setEditando] = useState(false);
    function cifraRegla(clave: string, v: number | null): CifraDato { const original = e.cifras[clave]; return original ? { ...original, v } : { v, fmt: "num", etiqueta: clave, origen: { paso: "regla", bloque: "AGT", version: "1", fuente: "Reglas del agente" } }; }
    return <section className="agt-result" aria-labelledby="agt-resultado"><h2 className="no-print" id="agt-resultado">Resultado</h2><div className="agt-metrics no-print"><article className="card"><h3>Decisión</h3><strong>{EFECTOS[e.decision.efecto]}</strong></article><article className="card"><h3>Cifras calculadas</h3><Numero valor={Object.values(e.cifras).filter(c => c.origen.bloque !== "ENTRADA" && c.origen.bloque !== "REGLA").length} etiqueta="Cifras calculadas" /></article><article className="card"><h3>Cifras sin respaldo</h3>{texto ? <><Numero valor={texto.validacion.sinRespaldo.length} etiqueta="Cifras sin respaldo" /> de <Numero valor={texto.validacion.total} etiqueta="Cifras en el texto" /></> : <span>{e.estado === "detenida" ? "Ejecución detenida" : "Sin texto validado"}</span>}</article><article className="card"><h3>Identificador de la ejecución</h3><code>{e.id}</code></article></div>
        {e.estado === "detenida" && <p className="alert no-print" role="alert">{e.detenida?.motivo ?? "La ejecución se detuvo."}</p>}{e.alertas.length > 0 && <div className="no-print">{e.alertas.map((a, i) => <p key={i} className="alert">{a}</p>)}</div>}
        {texto && <article className="card memo agt-text"><div className="agt-section-heading"><h2>Texto del Motor Mirage</h2><button className="no-print" onClick={() => setEditando(!editando)}>{editando ? "Ver texto" : "Editar texto"}</button></div>{editando && <label className="no-print">Texto del resultado<textarea rows={16} value={texto.texto} onChange={ev => cambiarTexto({ ...texto, texto: ev.target.value, validacion: validarTexto(ev.target.value, e) })} /></label>}<div className={editando ? "agt-text-preview" : ""}><TextoValidado texto={texto} ejecucion={e} /></div>{texto.validacion.sinRespaldo.length > 0 && <p className="alert no-print" role="status">El texto contiene cifras sin respaldo en la ejecución; revise los valores resaltados.</p>}</article>}
        <section className="card agt-rule-results"><h2>Reglas</h2>{!e.decision.reglas.length ? <p>El agente no tiene reglas de decisión.</p> : <div className="table-scroll"><table><caption className="sr-only">Evaluación de las reglas del agente</caption><thead><tr><th scope="col">Cifra</th><th scope="col">Valor</th><th scope="col">Condición</th><th scope="col">Umbral</th><th scope="col">Resultado</th><th scope="col">Mensaje</th></tr></thead><tbody>{e.decision.reglas.map(({ regla: r, valor, cumple }) => <tr key={r.id}><th scope="row">{e.cifras[r.cifra]?.etiqueta ?? r.cifra}</th><td><Valor cifra={cifraRegla(r.cifra, valor)} /></td><td>{r.operador}</td><td><Valor cifra={cifraRegla(r.cifra, r.umbral)} /></td><td>{cumple ? "Cumple" : "No cumple"}</td><td className="agt-wrap">{cumple ? "—" : valor === null ? `${r.mensaje.replace(/\.$/, "")} (la cifra no se pudo calcular).` : r.mensaje}</td></tr>)}</tbody></table></div>}</section>
        <section className="card agt-figures"><h2>Cifras por paso</h2>{e.pasos.map(p => <div key={p.paso} className="agt-figure-group"><h3><span className="agt-code">[ {p.bloque} ]</span> {defBloque(p.bloque)?.nombre ?? p.bloque} <small className="source">{p.paso}</small></h3><div className="table-scroll"><table><caption className="sr-only">Cifras de {p.paso}</caption><thead><tr><th scope="col">Cifra</th><th scope="col">Valor</th></tr></thead><tbody>{p.cifras.map(k => e.cifras[k] && <tr key={k}><th scope="row">{e.cifras[k].etiqueta}</th><td><Valor cifra={e.cifras[k]} /></td></tr>)}</tbody></table></div></div>)}</section>
        {Object.entries(e.tablas).map(([id, t]) => <details className="card agt-output-table no-print" key={id}><summary>{t.etiqueta}</summary><div className="table-scroll"><table><caption className="sr-only">{t.etiqueta}</caption><thead><tr>{t.columnas.map(c => <th key={c.id} scope="col">{c.etiqueta}</th>)}</tr></thead><tbody>{t.filas.map((f, i) => <tr key={i}>{t.columnas.map(c => <td key={c.id}><Valor cifra={{ v: f[c.id] ?? null, fmt: c.fmt, etiqueta: c.etiqueta, origen: t.origen }} /></td>)}</tr>)}</tbody></table></div></details>)}
        <details className="card agt-trace no-print"><summary>Traza de ejecución</summary>{e.pasos.map((p, i) => <details key={p.paso}><summary><Numero valor={i + 1} etiqueta="Orden de ejecución" /> <span className="agt-code">[ {p.bloque} ]</span> · {p.paso} · versión {p.version} · <Numero valor={p.ms} etiqueta="Duración del paso en milisegundos" /> ms</summary><h3>Entradas efectivas</h3><dl>{Object.entries(p.entrada).map(([k, v]) => <div key={k}><dt>{k}</dt><dd><EntradaTraza valor={v} /></dd></div>)}</dl>{p.alertas.map((a, j) => <p className="alert" key={j}>{a}</p>)}</details>)}<button onClick={() => descargar(`traza-${e.id}.json`, JSON.stringify(e, null, 2))}>Descargar traza (JSON)</button></details><div className="actions no-print"><button onClick={() => window.print()}>Imprimir</button></div>
    </section>;
}
function EntradaTraza({ valor }: { valor: unknown }): ReactNode {
    if (typeof valor === "number") return <Numero valor={valor} etiqueta="Entrada efectiva del paso" />;
    if (valor == null) return <span>Sin valor</span>;
    if (typeof valor === "boolean") return <span>{valor ? "Sí" : "No"}</span>;
    if (Array.isArray(valor)) return <span>{valor.map((v, i) => <span key={i}>{i > 0 ? "; " : ""}<EntradaTraza valor={v} /></span>)}</span>;
    if (typeof valor === "object") return <dl>{Object.entries(valor).map(([k, v]) => <div key={k}><dt>{k}</dt><dd><EntradaTraza valor={v} /></dd></div>)}</dl>;
    return <span>{String(valor)}</span>;
}

// Conserva los desplazamientos del texto original: las marcas de formato nunca
// cambian las posiciones proporcionadas por el validador. No interpreta HTML.
function TextoValidado({ texto: t, ejecucion: e }: { texto: TextoMotor; ejecucion: Ejecucion }) {
    const marcas = [...t.validacion.coincidencias.map(c => ({ ...c, respaldada: true, clave: c.clave })), ...t.validacion.sinRespaldo.map(c => ({ ...c, respaldada: false, clave: "" }))].sort((a, b) => a.inicio - b.inicio);
    function inline(inicio: number, fin: number, negrita = true): ReactNode[] {
        const partes: ReactNode[] = []; let pos = inicio;
        while (pos < fin) {
            const marca = marcas.find(m => m.inicio <= pos && m.fin > pos);
            if (marca) {
                const hasta = Math.min(fin, marca.fin), c = e.cifras[marca.clave];
                const respaldada = marca.respaldada && !!c;
                const celda = formatoCifra({ ...(c ?? { etiqueta: "Cifra sin respaldo en la ejecución", origen: { paso: "texto", bloque: "AGT", version: "1", fuente: "Cifra sin respaldo en la ejecución" } }), v: t.texto.slice(pos, hasta), fmt: "txt", nota: respaldada ? [c.etiqueta, c.origen.fuente, c.nota].filter(Boolean).join(" · ") : "Cifra sin respaldo en la ejecución" });
                partes.push(<Cifra key={pos} celda={{ ...celda, tono: respaldada ? "clave" : "alerta" }} />); pos = hasta; continue;
            }
            if (negrita && t.texto.slice(pos, pos + 2) === "**") { const cierre = t.texto.indexOf("**", pos + 2); if (cierre >= 0 && cierre < fin) { partes.push(<strong key={pos}>{inline(pos + 2, cierre, false)}</strong>); pos = cierre + 2; continue; } }
            let hasta = pos + 1;
            while (hasta < fin && !marcas.some(m => m.inicio === hasta) && !(negrita && t.texto.slice(hasta, hasta + 2) === "**")) hasta++;
            partes.push(t.texto.slice(pos, hasta)); pos = hasta;
        }
        return partes;
    }
    const nodos: ReactNode[] = []; let offset = 0, parrafo: ReactNode[] = [], lista: ReactNode[] = [];
    function vaciarParrafo() { if (parrafo.length) { nodos.push(<p key={`p-${nodos.length}`}>{parrafo}</p>); parrafo = []; } }
    function vaciarLista() { if (lista.length) { nodos.push(<ul key={`ul-${nodos.length}`}>{lista}</ul>); lista = []; } }
    for (const linea of t.texto.split("\n")) {
        if (!linea.trim()) { vaciarParrafo(); vaciarLista(); }
        else if (linea.startsWith("### ")) { vaciarParrafo(); vaciarLista(); nodos.push(<h3 key={offset}>{inline(offset + 4, offset + linea.length)}</h3>); }
        else if (linea.startsWith("- ")) { vaciarParrafo(); lista.push(<li key={offset}>{inline(offset + 2, offset + linea.length)}</li>); }
        else { vaciarLista(); if (parrafo.length) parrafo.push(" "); parrafo.push(...inline(offset, offset + linea.length)); }
        offset += linea.length + 1;
    }
    vaciarParrafo(); vaciarLista(); return <div className="agt-markdown">{nodos}</div>;
}
