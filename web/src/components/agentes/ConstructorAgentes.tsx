import { useCallback, useEffect, useRef, useState } from "react";
import { useDatos } from "@/components/Mirage";
import { cajas, planificar, paqueteAgente, ejecutarAgente, instruir, validarAgente, listarAgentes, guardarAgente, eliminarAgente, importarAgente, type Agente, type ValorCampo, type Ejecucion, type TextoMotor } from "@/lib/agentes";
import { CampoEntrada } from "./CampoEntrada";
import { Resultado } from "./Resultado";
import { FlujoAgente } from "./FlujoAgente";
import { CargaArchivos, mensajeError } from "./Comun";

const EJEMPLOS = ["Memo de crédito para una pyme con DSCR mínimo de 1,3", "WACC del sector con sensibilidad a la beta", "Valoración por flujo de caja descontado de una empresa"];
function valoresIniciales(a: Agente, anteriores: Record<string, ValorCampo> = {}) {
    return Object.fromEntries(a.entradas.map(c => [c.id, Object.hasOwn(anteriores, c.id) ? anteriores[c.id] : c.defecto ?? null]));
}
export function ConstructorAgentes() {
    const datos = useDatos();
    const [agente, setAgente] = useState<Agente | null>(null), [valores, setValores] = useState<Record<string, ValorCampo>>({});
    const [ejecucion, setEjecucion] = useState<Ejecucion | null>(null), [texto, setTexto] = useState<TextoMotor | null>(null);
    const [guardados, setGuardados] = useState<Agente[]>([]);
    const [comando, setComando] = useState(""), [cambio, setCambio] = useState(""), [explicacion, setExplicacion] = useState("");
    const [estado, setEstado] = useState(""), [error, setError] = useState(""), [aviso, setAviso] = useState("");
    const [eliminar, setEliminar] = useState<string | null>(null), [cargas, setCargas] = useState(0);
    const seccionRef = useRef<HTMLElement>(null), formularioRef = useRef<HTMLFormElement>(null);
    const importarRef = useRef<HTMLInputElement>(null), comandoRef = useRef<HTMLTextAreaElement>(null), ocupada = useRef(false);
    const controlarCarga = useCallback((cargando: boolean) => setCargas(n => Math.max(0, n + (cargando ? 1 : -1))), []);
    const busy = !!estado || cargas > 0;
    const contenido = agente ? cajas(agente, valores) : null;
    const faltantes = contenido?.documentos.filter(c => {
        if (!c.requerido) return false;
        const v = valores[c.id];
        return v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);
    }) ?? [];
    const faltaParaEjecutar = faltantes.some(c => c.tipo === "estados")
        ? "Cargue los estados financieros en la caja 1 para ejecutar."
        : faltantes.length ? `Complete en la caja 1: ${faltantes.map(c => c.etiqueta).join(", ")}.` : "";
    useEffect(() => {
        const cargar = () => {
            try { setGuardados(listarAgentes()); } catch (e) { setError(mensajeError(e)); }
        };
        const frame = requestAnimationFrame(cargar);
        window.addEventListener("storage", cargar);
        return () => { cancelAnimationFrame(frame); window.removeEventListener("storage", cargar); };
    }, []);
    function limpiar() { setEjecucion(null); setTexto(null); setError(""); setAviso(""); }
    function mostrar(a: Agente, descripcion: string, anteriores?: Record<string, ValorCampo>) {
        limpiar(); setAgente(a); setValores(valoresIniciales(a, anteriores)); setExplicacion(descripcion); setCambio("");
        requestAnimationFrame(() => { seccionRef.current?.scrollIntoView({ block: "start" }); seccionRef.current?.focus({ preventScroll: true }); });
    }
    async function armar(ajustar = false) {
        const pedido = (ajustar ? cambio : comando).trim();
        if (!pedido || busy || ocupada.current || (ajustar && !agente)) return;
        ocupada.current = true; setEstado(ajustar ? "Aplicando el cambio…" : "Armando el agente…"); setError(""); setAviso("");
        try {
            const plan = await planificar(pedido, ajustar ? agente! : undefined);
            if (validarAgente(plan.agente).length) throw new Error("No se pudo armar el agente. Precise la tarea e inténtelo de nuevo.");
            mostrar(plan.agente, plan.explicacion, ajustar ? valores : undefined);
        } catch (e) { setError(mensajeError(e)); }
        finally { ocupada.current = false; setEstado(""); }
    }
    async function ejecutar() {
        if (!agente || busy || ocupada.current || faltantes.length || !formularioRef.current?.reportValidity()) return;
        if (validarAgente(agente).length) { setError("El agente necesita un ajuste. Describa el cambio para poder ejecutarlo."); return; }
        ocupada.current = true; limpiar(); setEstado("Calculando…");
        try {
            await new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
            const resultado = ejecutarAgente(agente, valores, datos); setEjecucion(resultado);
            if (resultado.estado === "completa" && agente.instruccion.salida !== "ninguna") {
                setEstado("Redactando con el Motor Mirage…"); setTexto(await instruir(agente, resultado));
            }
        } catch (e) { setError(mensajeError(e)); }
        finally { ocupada.current = false; setEstado(""); }
    }
    async function descargar() {
        if (!agente || busy || ocupada.current) return;
        ocupada.current = true; setEstado("Preparando la descarga…"); setError("");
        try {
            const paquete = await paqueteAgente(agente, valores, datos), url = URL.createObjectURL(paquete.zip);
            const enlace = document.createElement("a"); enlace.href = url; enlace.download = paquete.nombre;
            document.body.appendChild(enlace); enlace.click(); enlace.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) { setError(mensajeError(e)); }
        finally { ocupada.current = false; setEstado(""); }
    }
    function guardar() {
        if (!agente) return;
        try { setAgente(guardarAgente(agente)); setGuardados(listarAgentes()); setAviso("Agente guardado en este navegador."); }
        catch (e) { setError(mensajeError(e)); }
    }
    return <CargaArchivos.Provider value={controlarCarga}><div className="agentes">
        <header className="agt-heading no-print"><h1>Agentes</h1><p>Describa la tarea y Mirage arma el agente. Usted revisa, lo ejecuta o se lo lleva.</p></header>
        <section className="card agt-command no-print" aria-label="Crear agente">
            <form onSubmit={e => { e.preventDefault(); void armar(); }}>
                <label htmlFor="agt-comando">¿Qué debe hacer su agente?</label>
                <textarea ref={comandoRef} id="agt-comando" rows={4} required maxLength={1500} value={comando} disabled={busy} onChange={e => setComando(e.target.value)} placeholder="Ej.: Evalúe si le presto 800 millones a 5 años a una pyme. No apruebe si el DSCR es menor a 1,3 y entrégueme un memo para el comité." />
                <button className="agt-primary" disabled={busy || !comando.trim()}>Crear agente</button>
            </form>
            <ul className="agt-prompt-examples" aria-label="Ejemplos de tareas">{EJEMPLOS.map(ejemplo => <li key={ejemplo}><button type="button" className="agt-link" disabled={busy} onClick={() => { setComando(ejemplo); comandoRef.current?.focus(); }}>{ejemplo}</button></li>)}</ul>
        </section>
        <p className="agt-status no-print" role="status" aria-live="polite" aria-atomic="true">{estado || (cargas ? "Leyendo estados financieros…" : aviso)}</p>
        {error && <p className="alert no-print" role="alert">{error}</p>}
        {agente && contenido && <section className="agt-agent no-print" ref={seccionRef} tabIndex={-1} aria-labelledby="agt-nombre">
            <h2 id="agt-nombre">{agente.nombre}</h2><p className="source agt-description">{explicacion || agente.descripcion}</p>
            <form ref={formularioRef} onSubmit={e => { e.preventDefault(); void ejecutar(); }}><div className="agt-boxes">
                <section className="card agt-box" aria-labelledby="agt-documentos"><header><span className="agt-box-number" aria-hidden="true">1</span><div><h3 id="agt-documentos">Documentos</h3><p>Lo que usted entrega</p></div></header><div className="agt-box-body">
                    {[...contenido.documentos].sort((a, b) => Number(b.tipo === "estados") - Number(a.tipo === "estados")).map(c => <CampoEntrada key={`${agente.id}-${c.id}`} campo={c} valor={valores[c.id]} campos={contenido.documentos} valores={valores} disabled={busy || agente.instruccion.reglas.some(r => r.umbralDe === c.id)} cambiar={v => { limpiar(); setValores(actual => ({ ...actual, [c.id]: v })); }} />)}
                </div></section>
                {(["datos", "calculo"] as const).map((tipo, i) => <section key={tipo} className="card agt-box" aria-labelledby={`agt-${tipo}`}><header><span className="agt-box-number" aria-hidden="true">{i + 2}</span><div><h3 id={`agt-${tipo}`}>{tipo === "datos" ? "Datos Mirage" : "Cálculo"}</h3><p>{tipo === "datos" ? "Lo que aporta Mirage" : "Lo que calcula"}</p></div></header><div className="agt-box-body"><ul className="agt-plain-list">{contenido[tipo].map(item => <li key={item.nombre}><strong>{item.nombre}</strong><p className="source">{item.descripcion}</p></li>)}</ul>{tipo === "datos" && <p className="source agt-cutoff">Datos con fecha de corte {datos.meta.corte}</p>}</div></section>)}
                <section className="card agt-box" aria-labelledby="agt-instrucciones"><header><span className="agt-box-number" aria-hidden="true">4</span><div><h3 id="agt-instrucciones">Instrucciones</h3><p>Lo que entrega y cómo decide</p></div></header><div className="agt-box-body"><strong>{contenido.instrucciones.entrega}</strong><p>{contenido.instrucciones.texto}</p><h4>Criterios</h4>{contenido.instrucciones.criterios.length ? <ul>{contenido.instrucciones.criterios.map((criterio, i) => <li key={i}>{criterio}</li>)}</ul> : <p className="source">Sin criterios de decisión.</p>}</div></section>
            </div></form>
            <FlujoAgente agente={agente} />
            <form className="agt-adjust" onSubmit={e => { e.preventDefault(); void armar(true); }}><label htmlFor="agt-cambio">Pida un cambio<input id="agt-cambio" required maxLength={1500} disabled={busy} value={cambio} onChange={e => setCambio(e.target.value)} placeholder="Ej.: que también niegue si la deuda neta / EBITDA supera 3 veces" /></label><button disabled={busy || !cambio.trim()}>Aplicar</button></form>
            <div className="agt-actions"><button className="agt-primary" disabled={busy || !!faltantes.length} aria-describedby={faltaParaEjecutar ? "agt-faltantes" : undefined} onClick={() => void ejecutar()}>Ejecutar</button><button disabled={busy} onClick={() => void descargar()}>Descargar agente (.zip)</button><button disabled={busy} onClick={guardar}>Guardar</button>{faltaParaEjecutar && <span id="agt-faltantes" className="source agt-missing" role="status">{faltaParaEjecutar}</span>}</div>
            <p className="source agt-package-note">Incluye el programa, sus datos y las instrucciones para usarlo en su equipo.</p>
        </section>}
        <div aria-busy={!!estado}>{ejecucion && <Resultado key={ejecucion.id} ejecucion={ejecucion} texto={texto} cambiarTexto={setTexto} criterios={contenido?.instrucciones.criterios ?? []} />}</div>
        <section className="card agt-saved no-print" aria-labelledby="agt-mis-agentes"><h2 id="agt-mis-agentes">Mis agentes</h2>
            {!guardados.length && <p className="source">Guarde un agente para volver a usarlo desde este navegador.</p>}
            <ul>{guardados.map(a => <li key={a.id}><div><strong>{a.nombre}</strong><p className="source">{a.descripcion}</p></div><div className="agt-saved-actions"><button disabled={busy} onClick={() => mostrar(a, a.descripcion)}>Abrir</button><button disabled={busy} onClick={() => setEliminar(a.id)}>Eliminar</button></div>{eliminar === a.id && <div className="alert" role="alert"><p>¿Eliminar «{a.nombre}» de este navegador?</p><button disabled={busy} onClick={() => { try { eliminarAgente(a.id); setGuardados(listarAgentes()); setEliminar(null); setAviso("Agente eliminado."); } catch (e) { setError(mensajeError(e)); } }}>Confirmar eliminación</button> <button onClick={() => setEliminar(null)}>Cancelar</button></div>}</li>)}</ul>
            <button className="agt-link" disabled={busy} onClick={() => importarRef.current?.click()}>Importar agente</button>
            <label className="sr-only" htmlFor="agt-importar">Archivo del agente</label><input className="sr-only" id="agt-importar" ref={importarRef} type="file" accept=".json,application/json" disabled={busy} onChange={async e => {
                const archivo = e.target.files?.[0]; e.target.value = "";
                if (!archivo || busy || ocupada.current) return;
                ocupada.current = true; setEstado("Abriendo el agente…"); setError("");
                try { mostrar(importarAgente(await archivo.text()), ""); setAviso("Agente importado."); }
                catch (err) { setError(mensajeError(err)); }
                finally { ocupada.current = false; setEstado(""); }
            }} />
        </section>
    </div></CargaArchivos.Provider>;
}
