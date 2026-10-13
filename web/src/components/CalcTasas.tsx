"use client";
import { useState } from "react";
import { convertir, equivalencias, resolver, nCuotas, PERIODOS, type Variable, type EntradaTVM } from "@/lib/finanzas";
import { Cifra } from "./Cifra";
import { celda } from "@/lib/api";
import { Campo, Codigo, Frecuencia, intentar, numeroEntrada, Resultado, ErrorCalculo } from "./CalcComun";
import { useDatos } from "./Mirage";
import { DocumentoMirage } from "./DocumentoMirage";
import { armarDocumento } from "@/lib/documento";
import { documentoWorkbook } from "@/lib/documento-excel";
import { saveWorkbook } from "@/lib/excel";
import { nombreArchivo } from "@/lib/nombres";
export function Tasas({ empresa = "" }: { empresa?: string }) {
    const d = useDatos();
    const [tasa, setTasa] = useState("14"), [desde, setDesde] = useState("NAMV"), [hacia, setHacia] = useState("EM");
    const r = tasa.trim() ? intentar(() => ({ conversion: convertir(numeroEntrada(tasa) / 100, desde, hacia), equivalencias: equivalencias(numeroEntrada(tasa) / 100, desde) })) : { valor: undefined, error: undefined };
    const documento = r.valor ? armarDocumento("tasas", { mercado: d, tasa: numeroEntrada(tasa) / 100, desde, hacia }, r.valor, empresa) : null;
    return <section className="card form"><h2>Tasas</h2><div className="fields"><Campo label="Tasa (%)" value={tasa} change={setTasa}/><Codigo value={desde} change={setDesde}/><Codigo label="Convertir a" value={hacia} change={setHacia}/></div><p className="muted">EA: efectiva anual; E: efectiva periódica; NA: nominal anual; M, B, T, S, Q, W, D: mes, bimestre, trimestre, semestre, quincena, semana, día. V: vencida; A: anticipada. Ejemplos: NAMV y NAMA.</p><ErrorCalculo error={r.error}/>{r.valor && <><div className="results"><Resultado label={`Tasa ${hacia}`} value={r.valor.conversion} fmt="pct"/></div><div className="table-scroll"><table><caption>Equivalencias · 8 frecuencias</caption><thead><tr><th scope="col">Frecuencia</th><th scope="col">Periódica vencida</th><th scope="col">Nominal vencida</th><th scope="col">Nominal anticipada</th><th scope="col">Periódica anticipada</th></tr></thead><tbody>{r.valor.equivalencias.tabla.map(f => <tr key={f.m}><th scope="row">{f.adjetivo}</th>{[f.periodica, f.nominalVencida, f.nominalAnticipada, f.periodicaAnticipada].map(v => <td key={v.codigo}>{v.codigo} <Cifra celda={celda(v.tasa)}/></td>)}</tr>)}</tbody></table></div>{documento && <DocumentoMirage documento={documento} excel={doc => saveWorkbook(documentoWorkbook(doc), nombreArchivo("Tasas", empresa))}/>}</>}</section>;
}
export function ValorDinero({ empresa = "" }: { empresa?: string }) {
    const d = useDatos();
    const [v, setV] = useState({ P: "-1000", F: "0", A: "", n: "4", i: "10" }), [incognita, setIncognita] = useState<Variable>("A"), [anticipada, setAnticipada] = useState(false), [ea, setEa] = useState(""), [codigo, setCodigo] = useState("EA"), [m, setM] = useState(12), [inicio, setInicio] = useState("1"), [fin, setFin] = useState(""), [cuotas, setCuotas] = useState(""), [helper, setHelper] = useState(""), [helperError, setHelperError] = useState("");
    const ready = Object.entries(v).some(([k, s]) => k !== incognita && s !== "");
    const r = ready ? intentar(() => {
        const entrada: EntradaTVM = { anticipada };
        for (const key of ["P", "F", "A", "n", "i"] as Variable[]) entrada[key] = key === incognita ? null : numeroEntrada(v[key]) / (key === "i" ? 100 : 1);
        return resolver(entrada);
    }) : { valor: undefined, error: undefined };
    const documento = r.valor ? armarDocumento("tvm", { mercado: d, entrada: { ...r.valor.entrada, [r.valor.incognita]: null } }, r.valor, empresa) : null;
    function traer() { const q = intentar(() => convertir(numeroEntrada(ea, false) / 100, codigo, PERIODOS.find(p => p.m === m)!.efectiva)); if (q.error) setHelperError(q.error); else { setV({ ...v, i: String(q.valor! * 100) }); setHelperError(""); } }
    function ayudar() {
        const q = intentar(() => { const a = { inicial: inicio.trim() ? numeroEntrada(inicio) : null, final: fin.trim() ? numeroEntrada(fin) : null, cuotas: cuotas.trim() ? numeroEntrada(cuotas) : null }; if (Object.values(a).filter(x => x !== null).length !== 2) throw new Error("Complete exactamente dos valores del ayudante."); return nCuotas(a); });
        if (q.error) setHelperError(q.error); else { setV({ ...v, n: String(q.valor!.cuotas) }); setHelper(`${q.valor!.inicial} a ${q.valor!.final}: ${q.valor!.cuotas} cuotas`); setHelperError(""); }
    }
    return <section className="card form"><h2>Valor del dinero</h2><p>Egreso negativo, ingreso positivo. Un campo vacío vale cero. Marque una incógnita con «?».</p><div className="fields">{([['P', 'P · Valor presente'], ['F', 'F · Valor futuro'], ['A', 'A · Cuota'], ['n', 'n · Periodos'], ['i', 'i · Tasa periódica (%)']] as const).map(([k, l]) => <div key={k} className="tvm-field"><Campo label={l} value={v[k]} change={s => setV({ ...v, [k]: s })} disabled={incognita === k}/><button aria-label={`Resolver ${k}`} aria-pressed={incognita === k} onClick={() => setIncognita(k)}>?</button></div>)}</div><label className="check"><input type="checkbox" checked={anticipada} onChange={e => setAnticipada(e.target.checked)}/>Anualidad anticipada</label><ErrorCalculo error={r.error}/>{r.valor && <div className="results"><Resultado label={`Incógnita ${r.valor.incognita}`} value={r.valor.valor} fmt={incognita === "i" ? "pct" : "x"}/></div>}<details><summary>Traer i desde una tasa</summary><div className="fields"><Campo label="Tasa de origen (%)" value={ea} change={setEa}/><Codigo value={codigo} change={setCodigo}/><Frecuencia value={m} change={setM}/></div><button disabled={incognita === "i"} onClick={traer}>Usar tasa periódica</button></details><details><summary>Ayudante de número de cuotas</summary><div className="fields"><Campo label="Periodo inicial" value={inicio} change={setInicio}/><Campo label="Periodo final" value={fin} change={setFin}/><Campo label="Número de cuotas" value={cuotas} change={setCuotas}/></div><button disabled={incognita === "n"} onClick={ayudar}>Resolver y usar n</button><p role="status">{helper}</p></details><ErrorCalculo error={helperError}/>{documento && <DocumentoMirage documento={documento} excel={doc => saveWorkbook(documentoWorkbook(doc), nombreArchivo("Valor-del-dinero", empresa))}/>}</section>;
}
