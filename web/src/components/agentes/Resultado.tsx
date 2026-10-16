import { useState, type ReactNode } from "react";
import { Cifra } from "@/components/Cifra";
import { defBloque, formatoCifra, validarTexto, type Ejecucion, type TextoMotor } from "@/lib/agentes";
import { Valor } from "./Comun";

const DECISIONES = { aprobar: "Aprobado", condicionar: "Aprobado con condiciones", negar: "Negado", sin_reglas: "Sin criterios de decisión" };
export function Resultado({ ejecucion: e, texto, cambiarTexto, criterios }: { ejecucion: Ejecucion; texto: TextoMotor | null; cambiarTexto: (t: TextoMotor) => void; criterios: string[] }) {
    const [editando, setEditando] = useState(false);
    if (e.estado === "detenida") return <section className="agt-result" aria-label="Resultado"><p className="alert" role="alert">{e.detenida?.motivo ?? "La ejecución se detuvo."}</p></section>;
    return <section className="agt-result" aria-labelledby="agt-resultado">
        <h2 id="agt-resultado">Resultado</h2>
        <p className={`agt-decision agt-decision-${e.decision.efecto}`}>{DECISIONES[e.decision.efecto]}</p>
        {e.alertas.map((alerta, i) => <p className="alert" key={i}>{alerta}</p>)}
        {texto && <article className="card memo agt-text"><div className="agt-section-heading"><h3>Texto del Motor Mirage</h3><button className="no-print" onClick={() => setEditando(!editando)}>{editando ? "Ver texto" : "Editar texto"}</button></div>
            {editando && <label className="no-print">Texto del resultado<textarea rows={16} value={texto.texto} onChange={ev => cambiarTexto({ ...texto, texto: ev.target.value, validacion: validarTexto(ev.target.value, e) })} /></label>}
            <div className={editando ? "agt-text-preview" : ""}><TextoValidado texto={texto} ejecucion={e} /></div>
            {texto.validacion.sinRespaldo.length > 0 && <p className="alert" role="status">El texto contiene cifras sin respaldo; revise los valores resaltados.</p>}
        </article>}
        {e.estado === "completa" && <section className="card agt-rule-results"><h3>Criterios</h3>{!e.decision.reglas.length ? <p>Sin criterios de decisión.</p> : <ul>{e.decision.reglas.map(({ regla, valor, cumple }, i) => <li key={regla.id}>
            <p>{criterios[i] ?? regla.mensaje}</p><p>{e.cifras[regla.cifra] ? <Valor cifra={{ ...e.cifras[regla.cifra], v: valor }} /> : "Sin dato"} · {cumple ? "cumple" : `no cumple — ${valor === null ? "La cifra no se pudo calcular. " : ""}${regla.mensaje}`}</p>
        </li>)}</ul>}</section>}
        <details className="card agt-figures"><summary>Ver todas las cifras</summary>
            {e.pasos.map(p => <section key={p.paso} className="agt-figure-group"><h3>{defBloque(p.bloque)?.nombre ?? "Cálculo"}</h3><div className="table-scroll"><table><caption className="sr-only">Cifras de {defBloque(p.bloque)?.nombre ?? "cálculo"}</caption><thead><tr><th scope="col">Cifra</th><th scope="col">Valor</th></tr></thead><tbody>{p.cifras.map(k => e.cifras[k] && <tr key={k}><th scope="row">{e.cifras[k].etiqueta}</th><td><Valor cifra={e.cifras[k]} /></td></tr>)}</tbody></table></div></section>)}
            {Object.entries(e.tablas).map(([id, tabla]) => <section className="agt-figure-group" key={id}><h3>{tabla.etiqueta}</h3><div className="table-scroll"><table><caption className="sr-only">{tabla.etiqueta}</caption><thead><tr>{tabla.columnas.map(c => <th key={c.id} scope="col">{c.etiqueta}</th>)}</tr></thead><tbody>{tabla.filas.map((fila, i) => <tr key={i}>{tabla.columnas.map(c => <td key={c.id}><Valor cifra={{ v: fila[c.id] ?? null, fmt: c.fmt, etiqueta: c.etiqueta, origen: tabla.origen }} /></td>)}</tr>)}</tbody></table></div></section>)}
        </details>
        <div className="actions no-print"><button onClick={() => window.print()}>Imprimir</button></div>
    </section>;
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
                partes.push(<Cifra key={pos} celda={{ ...celda, fuente: c?.origen.fuente ?? "Cifra sin respaldo en la ejecución", tono: respaldada ? "clave" : "alerta" }} />); pos = hasta; continue;
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
