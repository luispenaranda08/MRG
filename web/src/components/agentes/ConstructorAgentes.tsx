import { useCallback, useEffect, useRef, useState } from "react";
import { useDatos } from "@/components/Mirage";
import { capacidadesCertificadas, DOMINIOS, PERFILES, plantilla, agenteVacio, cargarEjemplo, EJEMPLOS, defBloque, validarAgente, ejecutarAgente, instruir, planificar, listarAgentes, guardarAgente, duplicarAgente, eliminarAgente, exportarAgente, importarAgente, type Agente, type ValorCampo, type Ejecucion, type TextoMotor } from "@/lib/agentes";
import { CampoEntrada } from "./CampoEntrada";
import { AgregarEntrada, Pasos, Instruccion } from "./Receta";
import { Resultado } from "./Resultado";
import { CargaArchivos, Numero, descargar, mensajeError } from "./Comun";

const certificadas = capacidadesCertificadas();
const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
function valoresIniciales(a: Agente): Record<string, ValorCampo> { return Object.fromEntries(a.entradas.map(c => [c.id, c.defecto ?? null])); }
export function ConstructorAgentes() {
    const datos = useDatos();
    const [agente, setAgente] = useState<Agente | null>(null), [valores, setValores] = useState<Record<string, ValorCampo>>({});
    const [ejecucion, setEjecucion] = useState<Ejecucion | null>(null), [texto, setTexto] = useState<TextoMotor | null>(null);
    const [guardados, setGuardados] = useState<Agente[]>([]), [estado, setEstado] = useState("Cargando agente…"), [error, setError] = useState(""), [aviso, setAviso] = useState("");
    const [comando, setComando] = useState(""), [explicacion, setExplicacion] = useState(""), [dominio, setDominio] = useState(""), [perfil, setPerfil] = useState(""), [sugerir, setSugerir] = useState(false), [activa, setActiva] = useState(-1);
    const [eliminar, setEliminar] = useState<string | null>(null);
    const recetaRef = useRef<HTMLDivElement>(null), importarRef = useRef<HTMLInputElement>(null), revision = useRef(0), ocupada = useRef(false);
    const sugerencias = certificadas.filter(c => normalizar(`${c.codigo} ${c.nombre}`).includes(normalizar(comando))).slice(0, 8);
    const lista = certificadas.filter(c => (!dominio || c.dominio === dominio) && (!perfil || c.perfiles.includes(perfil as keyof typeof PERFILES)));
    const errores = agente ? validarAgente(agente) : [];
    const [cargas, setCargas] = useState(0);
    const controlarCarga = useCallback((cargando: boolean) => setCargas(n => Math.max(0, n + (cargando ? 1 : -1))), []);
    const busy = !!estado || cargas > 0;
    useEffect(() => {
        let vigente = true;
        async function iniciar() {
            try {
                const a: Agente = plantilla("CRED"), v = valoresIniciales(a);
                const ejemplo = EJEMPLOS.find(e => /pyme/i.test(`${e.id} ${e.etiqueta}`));
                if (ejemplo && a.entradas.some(c => c.tipo === "estados")) {
                    try { const empresa = await cargarEjemplo(ejemplo.id, datos); for (const c of a.entradas) { if (c.tipo === "estados") v[c.id] = empresa; if (c.tipo === "sector") v[c.id] = empresa.sector; if (c.tipo === "tamano") v[c.id] = empresa.tamano; } }
                    catch (e) { if (vigente) setError(mensajeError(e)); }
                }
                if (vigente) { setAgente(a); setValores(v); setGuardados(listarAgentes()); }
            } catch (e) { if (vigente) { setError(mensajeError(e)); setAgente(agenteVacio()); } }
            finally { if (vigente) setEstado(""); }
        }
        void iniciar();
        return () => { vigente = false; };
    }, [datos]);
    function limpiar() { revision.current++; setEjecucion(null); setTexto(null); setError(""); setAviso(""); }
    function editar(a: Agente) { limpiar(); setAgente(a); }
    function abrir(a: Agente, bajar = true) { limpiar(); setAgente(a); setValores(valoresIniciales(a)); if (bajar) requestAnimationFrame(() => { recetaRef.current?.scrollIntoView({ block: "start" }); recetaRef.current?.focus({ preventScroll: true }); }); }
    function cargarPlantilla(codigo: string) { if (busy) return; try { abrir(plantilla(codigo)); setExplicacion(`Agente ${codigo} cargado.`); setSugerir(false); } catch (e) { setError(mensajeError(e)); } }
    async function enviar(codigo?: string) {
        if (ocupada.current || busy || !comando.trim() && !codigo) return;
        const encontrado = certificadas.find(c => c.codigo === (codigo ?? comando.trim()).toUpperCase());
        if (encontrado) { cargarPlantilla(encontrado.codigo); return; }
        ocupada.current = true; setEstado("Armando el agente…"); setError(""); setSugerir(false);
        const ticket = ++revision.current;
        try { const plan = await planificar(comando.trim()); if (revision.current === ticket) { abrir(plan.agente); setExplicacion(plan.explicacion); } }
        catch (e) { setError(mensajeError(e)); } finally { ocupada.current = false; setEstado(""); }
    }
    async function ejecutar() {
        if (!agente || busy || ocupada.current) return;
        const formulario = recetaRef.current?.querySelector("form");
        if (formulario && !formulario.reportValidity()) return;
        if (errores.length) { setError("Revise las conexiones y las reglas antes de ejecutar."); return; }
        ocupada.current = true; setEstado("Calculando…"); setEjecucion(null); setTexto(null); setError(""); setAviso("");
        const ticket = ++revision.current;
        try {
            // Cede un cuadro al navegador para que anuncie el estado antes del cálculo síncrono.
            await new Promise<void>(resolve => requestAnimationFrame(() => { setTimeout(resolve, 0); }));
            const resultado = ejecutarAgente(agente, valores, datos); if (ticket !== revision.current) return;
            setEjecucion(resultado);
            if (resultado.estado === "detenida") { setError(resultado.detenida?.motivo ?? "La ejecución se detuvo."); return; }
            if (agente.instruccion.salida !== "ninguna") { setEstado("Redactando con el Motor Mirage…"); const t = await instruir(agente, resultado); if (ticket === revision.current) setTexto(t); }
        } catch (e) { if (ticket === revision.current) setError(mensajeError(e)); }
        finally { ocupada.current = false; setEstado(""); }
    }
    function guardar() { if (!agente) return; try { const a = guardarAgente(agente); setAgente(a); setGuardados(listarAgentes()); setAviso("Agente guardado en este navegador."); } catch (e) { setError(mensajeError(e)); } }
    return <CargaArchivos.Provider value={controlarCarga}><div className="agentes"><div className="agt-heading no-print"><p className="eyebrow">[ AGT ] / CONSTRUCTOR DE AGENTES</p><h1>Agentes</h1><p>Arme agentes de finanzas corporativas con datos de mercado y cálculos verificados. Cada cifra queda con su fuente.</p></div>
        <section className="agt-command card no-print" aria-label="Línea de comando"><form onSubmit={e => { e.preventDefault(); void enviar(activa >= 0 && sugerir ? sugerencias[activa]?.codigo : undefined); }}><label htmlFor="agt-comando">Tarea o código de capacidad</label><div className="agt-command-row"><span className="agt-code" aria-hidden="true">AGT&gt;</span><input id="agt-comando" role="combobox" aria-autocomplete="list" aria-controls="agt-sugerencias" aria-expanded={sugerir && sugerencias.length > 0} aria-activedescendant={sugerir && activa >= 0 ? `agt-opcion-${activa}` : undefined} autoComplete="off" placeholder="Describa la tarea o escriba un código: CRED, WACC, DCF…" value={comando} disabled={busy} onChange={e => { setComando(e.target.value); setSugerir(true); setActiva(-1); }} onFocus={() => setSugerir(true)} onBlur={e => { if (!e.currentTarget.closest("form")?.contains(e.relatedTarget)) setSugerir(false); }} onKeyDown={e => { if (e.key === "Escape") { setSugerir(false); setActiva(-1); } if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setSugerir(true); setActiva(i => sugerencias.length ? (i < 0 ? (e.key === "ArrowDown" ? 0 : sugerencias.length - 1) : (i + (e.key === "ArrowDown" ? 1 : -1) + sugerencias.length) % sugerencias.length) : -1); } }} /><button disabled={busy || !comando.trim()} type="submit">Armar agente</button></div><ul id="agt-sugerencias" role="listbox" aria-label="Capacidades certificadas" hidden={!sugerir || !sugerencias.length}>{sugerencias.map((c, i) => <li id={`agt-opcion-${i}`} key={c.codigo} role="option" aria-selected={activa === i} onMouseDown={e => e.preventDefault()} onClick={() => cargarPlantilla(c.codigo)}><span className="agt-code">[ {c.codigo} ]</span> {c.nombre}</li>)}</ul></form><p className="source" aria-live="polite">{explicacion}</p></section>
        <section className="agt-catalog no-print" aria-labelledby="agt-catalogo"><div className="agt-section-heading"><h2 id="agt-catalogo">Capacidades certificadas <Numero valor={certificadas.length} etiqueta="Capacidades certificadas" /></h2><label>Perfil<select value={perfil} onChange={e => setPerfil(e.target.value)}><option value="">Todos los perfiles</option>{Object.entries(PERFILES).map(([k, v]) => <option value={k} key={k}>{v}</option>)}</select></label></div><div className="agt-filters" aria-label="Filtrar por dominio"><button aria-pressed={!dominio} onClick={() => setDominio("")}>Todos <Numero valor={certificadas.filter(c => !perfil || c.perfiles.includes(perfil as keyof typeof PERFILES)).length} etiqueta="Capacidades de todos los dominios" /></button>{Object.entries(DOMINIOS).map(([k, v]) => { const cantidad = certificadas.filter(c => c.dominio === k && (!perfil || c.perfiles.includes(perfil as keyof typeof PERFILES))).length; if (!cantidad && dominio !== k) return null; return <button key={k} aria-pressed={dominio === k} onClick={() => setDominio(k)}>{v} <Numero valor={cantidad} etiqueta={`Capacidades de ${v}`} /></button>; })}</div><div className="agt-catalog-grid">{lista.map(c => <button key={c.codigo} className="agt-capacity" disabled={busy} aria-pressed={agente?.capacidad === c.codigo} onClick={() => cargarPlantilla(c.codigo)}><b className="agt-code">[ {c.codigo} ]</b><strong>{c.nombre}</strong><span>{c.descripcion}</span></button>)}</div>{!lista.length && <p role="status">No hay capacidades certificadas para estos filtros.</p>}</section>
        <p className="agt-status no-print" role="status" aria-live="polite" aria-atomic="true">{estado || aviso}</p>{error && <p className="alert no-print" role="alert">{error}</p>}
        {agente && <><div className="agt-recipe no-print" ref={recetaRef} tabIndex={-1} aria-label="Receta del agente"><form onSubmit={e => { e.preventDefault(); void ejecutar(); }}><fieldset className="agt-editor" disabled={busy}><legend className="sr-only">Configuración del agente</legend><div className="agt-boxes">
            <details className="card agt-box" open><summary><span className="agt-box-number">1</span><h2>Entradas</h2><Numero valor={agente.entradas.length} etiqueta="Entradas" /></summary><div className="agt-box-body">{agente.entradas.map(c => <div className="agt-entry" key={c.id}><CampoEntrada campo={c} valor={valores[c.id]} campos={agente.entradas} valores={valores} disabled={busy} cambiar={v => { limpiar(); setValores(actual => ({ ...actual, [c.id]: v })); }} /><button type="button" className="agt-remove" aria-label={`Quitar entrada ${c.etiqueta}`} onClick={() => { editar({ ...agente, entradas: agente.entradas.filter(e => e.id !== c.id) }); setValores(v => { const copia = { ...v }; delete copia[c.id]; return copia; }); }}>Quitar entrada</button></div>)}<AgregarEntrada agregar={c => editar({ ...agente, entradas: [...agente.entradas, c] })} /></div></details>
            {(["datos", "calculo"] as const).map((caja, i) => <details className="card agt-box" key={caja} open><summary><span className="agt-box-number">{i + 2}</span><h2>{caja === "datos" ? "Datos Mirage" : "Cálculo"}</h2><Numero valor={agente.pasos.filter(p => defBloque(p.bloque)?.caja === caja).length} etiqueta={`Pasos de ${caja}`} /></summary><div className="agt-box-body"><Pasos caja={caja} agente={agente} cambiar={editar} valores={valores} ejecucion={ejecucion} /></div></details>)}
            <details className="card agt-box" open><summary><span className="agt-box-number">4</span><h2>Instrucción</h2><Numero valor={agente.instruccion.reglas.length} etiqueta="Reglas" /></summary><div className="agt-box-body"><Instruccion agente={agente} cambiar={editar} /></div></details>
        </div><div className="card agt-identity"><label>Nombre del agente<input required value={agente.nombre} onChange={e => editar({ ...agente, nombre: e.target.value })} /></label><label>Descripción<textarea rows={2} value={agente.descripcion} onChange={e => editar({ ...agente, descripcion: e.target.value })} /></label></div></fieldset></form>{errores.length > 0 && <div className="alert" aria-live="polite"><strong>Revise la receta</strong><ul>{errores.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}</div>
            <div className="actions agt-actions no-print" aria-label="Acciones del agente"><button className="agt-run" disabled={busy || !!errores.length} onClick={() => void ejecutar()}>Ejecutar agente</button><button disabled={busy || !!errores.length} onClick={guardar}>Guardar</button><button disabled={busy} onClick={() => { abrir(duplicarAgente(agente), false); setAviso("Copia creada. Puede editarla y guardarla."); }}>Duplicar</button><button disabled={busy} onClick={() => { try { descargar(`${agente.id}.json`, exportarAgente(agente)); } catch (e) { setError(mensajeError(e)); } }}>Exportar</button><button disabled={busy} onClick={() => importarRef.current?.click()}>Importar</button><button disabled={busy} onClick={() => { abrir(agenteVacio(), false); setExplicacion(""); }}>Nuevo agente</button></div>
        </>}
        <label className="sr-only" htmlFor="agt-importar">Importar agente en formato JSON</label><input className="sr-only" id="agt-importar" ref={importarRef} type="file" accept=".json,application/json" disabled={busy} onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { abrir(importarAgente(await f.text())); setAviso("Agente importado."); } catch (err) { setError(mensajeError(err)); } }} />
        <div aria-live="polite" aria-busy={busy}>{ejecucion && <Resultado ejecucion={ejecucion} texto={texto} cambiarTexto={setTexto} />}</div>
        <section className="card agt-saved no-print" aria-labelledby="agt-mis-agentes"><h2 id="agt-mis-agentes">Mis agentes <Numero valor={guardados.length} etiqueta="Agentes guardados" /></h2>{!guardados.length && <p className="source">Guarde una receta para volver a usarla desde este navegador.</p>}<ul>{guardados.map(a => <li key={a.id}><div><strong>{a.nombre}</strong><p className="source">{a.descripcion}</p></div><div className="agt-saved-actions"><button disabled={busy} onClick={() => abrir(a)}>Abrir</button><button disabled={busy} onClick={() => { abrir(duplicarAgente(a)); setAviso("Copia creada. Puede editarla y guardarla."); }}>Duplicar</button><button disabled={busy} onClick={() => setEliminar(a.id)}>Eliminar</button></div>{eliminar === a.id && <div className="alert" role="alert"><p>¿Eliminar «{a.nombre}» de este navegador?</p><button disabled={busy} onClick={() => { try { eliminarAgente(a.id); setGuardados(listarAgentes()); setEliminar(null); setAviso("Agente eliminado."); } catch (e) { setError(mensajeError(e)); } }}>Confirmar eliminación</button> <button onClick={() => setEliminar(null)}>Cancelar</button></div>}</li>)}</ul></section>
    </div></CargaArchivos.Provider>;
}
