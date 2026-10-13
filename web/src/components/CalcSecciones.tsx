"use client";
import { useEffect, useRef, useState } from "react";
import { useDatos } from "./Mirage";
import { CostoCapital } from "./Calculadora";
import { Tasas, ValorDinero } from "./CalcTasas";
import { Creditos } from "./CalcCreditos";
import { Proyectos } from "./CalcProyectos";
export const SECCIONES = [["capital", "Costo de capital"], ["tasas", "Tasas"], ["tvm", "Valor del dinero"], ["creditos", "Créditos"], ["proyectos", "Proyectos"]] as const;
export type Seccion = typeof SECCIONES[number][0];
export function leerSeccion(search: string): Seccion {
    const valor = new URLSearchParams(search).get("seccion");
    return SECCIONES.some(([k]) => k === valor) ? valor as Seccion : "capital";
}
export function Calculadora({ inicial = "capital" }: { inicial?: Seccion }) {
    const d = useDatos(), [seccion, setSeccion] = useState<Seccion>(inicial), [empresa, setEmpresa] = useState(""), [sector, setSector] = useState(d.sectores[0].ciiu_division), [tamano, setTamano] = useState("Mediana"), tabs = useRef<(HTMLButtonElement | null)[]>([]);
    useEffect(() => {
        const sync = () => setSeccion(leerSeccion(window.location.search));
        sync(); window.addEventListener("popstate", sync);
        return () => window.removeEventListener("popstate", sync);
    }, []);
    function elegir(k: Seccion) {
        setSeccion(k); const url = new URL(window.location.href); url.searchParams.set("seccion", k); window.history.pushState(null, "", url);
    }
    return <><div className="heading"><div><p className="eyebrow">[ CALC ] / CALCULADORA FINANCIERA</p><h1>Calculadora financiera</h1></div></div><label className="company-field">Empresa o proyecto (opcional)<input value={empresa} onChange={e => setEmpresa(e.target.value)}/></label><div className="calc-tabs" role="tablist" aria-label="Subsecciones de CALC">{SECCIONES.map(([k, l], j) => <button key={k} ref={el => { tabs.current[j] = el; }} id={`tab-${k}`} role="tab" aria-selected={seccion === k} aria-controls={`panel-${k}`} tabIndex={seccion === k ? 0 : -1} onClick={() => elegir(k)} onKeyDown={e => {
        const i = e.key === "ArrowRight" ? (j + 1) % SECCIONES.length : e.key === "ArrowLeft" ? (j + SECCIONES.length - 1) % SECCIONES.length : e.key === "Home" ? 0 : e.key === "End" ? SECCIONES.length - 1 : -1;
        if (i >= 0) { e.preventDefault(); elegir(SECCIONES[i][0]); tabs.current[i]?.focus(); }
    }}>{l}</button>)}</div>{SECCIONES.map(([k]) => <div key={k} role="tabpanel" id={`panel-${k}`} aria-labelledby={`tab-${k}`} hidden={seccion !== k} tabIndex={0}>{/* Mantener las entradas al cambiar de pestaña. */}{k === "capital" ? <CostoCapital empresa={empresa} sector={sector} tamano={tamano} setSector={setSector} setTamano={setTamano}/> : k === "tasas" ? <Tasas empresa={empresa}/> : k === "tvm" ? <ValorDinero empresa={empresa}/> : k === "creditos" ? <Creditos empresa={empresa}/> : <><section className="card form"><label>Sector para TMRR y CK<select value={sector} onChange={e => setSector(e.target.value)}>{d.sectores.map(s => <option key={s.ciiu_division} value={s.ciiu_division}>{s.ciiu_division} · {s.nombre}</option>)}</select></label></section><Proyectos empresa={empresa} sector={d.sectores.find(s => s.ciiu_division === sector)!}/></>}</div>)}</>;
}
