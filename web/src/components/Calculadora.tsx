"use client";
import { useState } from "react";
import { useDatos } from "./Mirage";
import { Cifra } from "./Cifra";
import { celda, numero } from "@/lib/api";
import { calcular, type Insumos } from "@/lib/calculadora";
import { saveWorkbook } from "@/lib/excel";
import { documentoWorkbook } from "@/lib/documento-excel";
import { nombreArchivo } from "@/lib/nombres";
import { SelectorJev } from "./SelectorJev";
import { type Documento, armarDocumento } from "@/lib/documento";
import { DocumentoMirage } from "./DocumentoMirage";
export function CostoCapital({ empresa = "", sector, setSector, tamano, setTamano }: { empresa?: string; sector: string; setSector: (v: string) => void; tamano: string; setTamano: (v: string) => void }) {
    const d = useDatos(), [inputs, setInputs] = useState({ deuda: String((numero(d.sectores.find(s => s.ciiu_division === sector)!.por_tamano[tamano]?.de || d.sectores.find(s => s.ciiu_division === sector)!.de) ?? numero(d.sectores.find(s => s.ciiu_division === sector)!.de)) ?? ""), patrimonio: "1", ebit: "0", gastos: "0", tarifa: numero(d.parametros.tasa_impuesto) === null ? "" : String(numero(d.parametros.tasa_impuesto)! * 100) }), [total, setTotal] = useState(false), [error, setError] = useState("");
    const [seleccion, setSeleccion] = useState({ sector, tamano });
    const s = d.sectores.find(s => s.ciiu_division === sector)!;
    // También se puede cambiar el sector desde Proyectos. Conserva el campo de JEV
    // y precarga los insumos al cambiar la selección, sin remontar todo el formulario.
    if (seleccion.sector !== sector || seleccion.tamano !== tamano) {
        setSeleccion({ sector, tamano });
        setInputs({ ...inputs, deuda: String((numero(s.por_tamano[tamano]?.de || s.de) ?? numero(s.de)) ?? ""), patrimonio: "1", tarifa: numero(d.parametros.tasa_impuesto) == null ? "" : String(numero(d.parametros.tasa_impuesto)! * 100) });
    }
    const i: Insumos = { deuda: Number(inputs.deuda), patrimonio: Number(inputs.patrimonio), ebit: Number(inputs.ebit), gastos: Number(inputs.gastos), tarifa: Number(inputs.tarifa) / 100, total };
    const result = calcular(d.parametros, s, tamano, i), ready = Object.values(inputs).every(v => v !== "") && i.patrimonio > 0 && i.deuda >= 0 && i.gastos >= 0 && i.tarifa >= 0 && i.tarifa <= 1;
    const rows = Object.entries(result).map(([l, c]) => [l, ready ? c : celda(null, c.fmt, "nota", "Complete los insumos de la empresa.")] as const);
    async function excel(doc: Documento) { try {
        await saveWorkbook(documentoWorkbook(doc), nombreArchivo("Costo-de-capital", empresa));
    }
    catch (e) {
        setError(String(e)); throw e;
    }
 }
    return <><div className="heading"><div><p className="eyebrow">[ CALC ] / HAMADA + CAPM</p><h2>Calculadora de capital</h2><p className="muted">Su estructura financiera, Datos de mercado al {d.meta.corte}.</p></div></div><div className="two-col"><section className="card form"><h2>Insumos de su empresa</h2><p>Deuda, patrimonio, EBIT y gastos en la misma moneda y unidad (COP). Arranca con la estructura típica del sector (patrimonio = 1 y la deuda según el D/E mediano) y la tarifa general de renta; reemplácelos por las cifras de su empresa.</p><SelectorJev sectores={d.sectores} elegir={r => { const sc = r.sector == null ? s : d.sectores[r.sector]; const t = r.tamano && sc.por_tamano[r.tamano] ? r.tamano : sc.por_tamano[tamano] ? tamano : Object.keys(sc.por_tamano)[0]; setSector(sc.ciiu_division); setTamano(t); setInputs({ ...inputs, deuda: String((numero(sc.por_tamano[t]?.de || sc.de) ?? numero(sc.de)) ?? ""), patrimonio: "1" }); }}/><label>Sector<select value={sector} onChange={e => { const sc = d.sectores.find(s => s.ciiu_division === e.target.value)!; setSector(e.target.value); if (!sc.por_tamano[tamano]) setTamano(Object.keys(sc.por_tamano)[0]); setInputs({ ...inputs, deuda: String((numero(sc.por_tamano[tamano]?.de || sc.de) ?? numero(sc.de)) ?? ""), patrimonio: "1", tarifa: numero(d.parametros.tasa_impuesto) == null ? "" : String(numero(d.parametros.tasa_impuesto)! * 100) }); }}>{d.sectores.map(s => <option key={s.ciiu_division} value={s.ciiu_division}>{s.ciiu_division} · {s.nombre}</option>)}</select></label><label>Tamaño<select value={tamano} onChange={e => { setTamano(e.target.value); setInputs({ ...inputs, deuda: String((numero(s.por_tamano[e.target.value]?.de || s.de) ?? numero(s.de)) ?? ""), patrimonio: "1", tarifa: numero(d.parametros.tasa_impuesto) == null ? "" : String(numero(d.parametros.tasa_impuesto)! * 100) }); }}>{Object.keys(s.por_tamano).map(t => <option key={t}>{t}</option>)}</select></label><div className="fields">{([['deuda', 'Deuda financiera'], ['patrimonio', 'Patrimonio'], ['ebit', 'EBIT'], ['gastos', 'Gastos financieros'], ['tarifa', 'Tarifa de renta (%)']] as const).map(([k, l]) => <label key={k}>{l}<input type="number" value={inputs[k]} min={k === "ebit" ? undefined : k === "patrimonio" ? 0.01 : 0} max={k === "tarifa" ? 100 : undefined} step="any" onChange={e => setInputs({ ...inputs, [k]: e.target.value })}/></label>)}</div><details className="beta-total"><summary>Opción para dueños no diversificados</summary><p>La beta total supone que el dueño tiene todo su patrimonio en esta empresa. Divide la beta del sector por su correlación con el mercado y eleva mucho el Ke. No es la tasa que se usa para valorar ante terceros.</p><label className="check"><input type="checkbox" checked={total} onChange={e => setTotal(e.target.checked)}/>Usar beta total</label>{total && <p className="alert">{s.beta_total.nota}</p>}</details></section><section className="card memo"><p className="eyebrow">MIRAGE / MEMO DE CAPITAL</p><h2>{s.nombre}</h2><p>{tamano} · Datos de mercado al {d.meta.corte}</p><div className="results">{rows.map(([l, c]) => <article key={l}><h3>{l}</h3><Cifra celda={c}/></article>)}</div><h3>Cómo se calcula</h3><ol className="steps"><li>Reapalancar la beta del sector con Hamada y su D/E.</li><li>Sumar Rf, beta × ERP y la prima país Mirage, que ya incorpora λ.</li><li>Convertir Ke a COP y Kd observado a USD con Fisher.</li><li>Ponderar Ke y Kd después de impuestos por patrimonio y deuda.</li></ol>{!ready && <p role="status">Complete los insumos; el patrimonio debe ser positivo y la tarifa estar entre 0 y 100.</p>}{error && <p role="alert">{error}</p>}</section></div>{ready && <DocumentoMirage documento={armarDocumento("capital", { mercado: d, entrada: i, sector: `${s.ciiu_division} · ${s.nombre}`, tamano }, result, empresa)} excel={excel}/>}</>;
}

export { Calculadora } from "./CalcSecciones";
