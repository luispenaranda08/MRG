"use client";
import Image from "next/image";
import { useState } from "react";
import { fmt } from "@/lib/api";
import { archivoDocumento, identificarDocumento, logosDocumento, pdfDocumento, type Documento, type FilaDocumento } from "@/lib/documento";
import { Descargar } from "./CalcComun";

function Filas({ filas, insumos = false }: { filas: FilaDocumento[]; insumos?: boolean }) {
    return <div className="table-scroll" tabIndex={0}><table><thead><tr><th scope="col">Concepto</th><th scope="col">Valor</th></tr></thead><tbody>{filas.map((f, j) => <tr key={j}><th scope="row">{f.concepto}</th><td><span className={`documento-cifra tono-${insumos ? "insumo" : f.cifra.tono}`}>{fmt(f.cifra)}</span>{f.cifra.nota && <small className="source">{f.cifra.nota}</small>}</td></tr>)}</tbody></table></div>;
}
export function DocumentoMirage({ documento, excel }: { documento: Documento; excel?: () => Promise<void> }) {
    const [identidad] = useState(() => identificarDocumento(documento));
    const doc = { ...documento, numero: identidad.numero, fecha: identidad.fecha };
    return <div className="documento-wrap"><div className="actions"><Descargar run={async () => { const logos = await logosDocumento(); pdfDocumento(doc, logos).save(archivoDocumento(doc)); }}>↓ PDF</Descargar>{excel && <Descargar run={excel}>↓ Excel</Descargar>}</div><article className="documento-mirage" aria-label={`Vista previa: ${doc.titulo}`}>
        <header className="documento-cabecera"><div className="documento-marca"><Image src="/mirage-symbol-black.svg" alt="" width={32} height={32}/>Mirage</div><div>Documento N.º {doc.numero}<br/>Datos de mercado al {doc.corte}</div></header>
        <h2>{doc.titulo}</h2>{doc.empresa && <p>Empresa o proyecto: {doc.empresa}</p>}
        <h4>Conclusión</h4><p className="documento-conclusion">{doc.conclusion}</p>{doc.notas.map((n, j) => <p className="alert" key={j}>{n}</p>)}
        <h4>Supuestos</h4><Filas filas={doc.supuestos} insumos/>
        <h4>Resultados</h4><Filas filas={doc.resultados}/>
        {doc.tablas.map((t, j) => <section key={j}><h4>{t.titulo}</h4><div className="table-scroll" tabIndex={0}><table><thead><tr>{t.columnas.map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{t.filas.map((f, i) => <tr key={i}>{f.map((v, k) => k === 0 ? <th scope="row" key={k}>{v}</th> : <td key={k}>{v}</td>)}</tr>)}</tbody></table></div>{t.nota && <p className="source">{t.nota}</p>}</section>)}
        <h4>Método</h4><p>{doc.metodo}</p><h4>Fuentes</h4>{doc.fuentes.length ? <ul className="documento-fuentes">{doc.fuentes.map(f => <li key={f.id}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre}</a><span>{f.url}</span></li>)}</ul> : <p>Datos ingresados por el usuario. No se utilizan tasas de mercado en este cálculo.</p>}
        <p className="documento-aviso">{doc.aviso}</p>
        <div className="documento-pie"><div><Image src="/hypertarget-symbol-black.svg" alt="" width={25} height={25}/><strong>Mirage by HyperTarget</strong></div><span>mirage.hypertarget.tech · {doc.fecha} · Página 1 de 1</span></div>
    </article></div>;
}
