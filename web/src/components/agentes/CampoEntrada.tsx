import { useContext, useEffect, useId, useRef, useState } from "react";
import { useDatos } from "@/components/Mirage";
import { cargarEjemplo, prepararEmpresa, EJEMPLOS, type Campo, type ValorCampo } from "@/lib/agentes";
import { CargaArchivos, Numero, mensajeError } from "./Comun";

export const TIPOS: Record<Campo["tipo"], string> = { numero: "Número", entero: "Entero", dinero: "Dinero", tasa: "Tasa (%)", texto: "Texto", booleano: "Sí / No", opcion: "Opción", codigo_tasa: "Código de tasa", flujos: "Flujos", sector: "Sector", tamano: "Tamaño", estados: "Estados financieros" };
const CODIGOS = ["EA", "EM", "ET", "ES", "NAMV", "NATV", "NASV", "NAMA", "NATA"];

export function CampoEntrada({ campo, valor, cambiar, valores, campos, disabled = false }: { campo: Campo; valor: ValorCampo | undefined; cambiar: (v: ValorCampo) => void; valores: Record<string, ValorCampo>; campos: Campo[]; disabled?: boolean }) {
    const datos = useDatos(), id = useId();
    const sectorId = campos.find(c => c.tipo === "sector")?.id;
    const sector = Number(sectorId ? valores[sectorId] ?? 0 : 0);
    const ayuda = campo.ayuda ? `${id}-ayuda` : undefined;
    const attrs = { id, disabled, "aria-describedby": ayuda, required: campo.requerido };
    let control;
    if (campo.tipo === "estados") control = <Estados valor={valor} cambiar={cambiar} sector={sector} tamano={String(valores[campos.find(c => c.tipo === "tamano")?.id ?? ""] ?? Object.keys(datos.sectores[sector]?.por_tamano ?? {})[0] ?? "Pequeña")} disabled={disabled} />;
    else if (campo.tipo === "booleano") control = <select {...attrs} value={valor == null ? "" : String(valor)} onChange={e => cambiar(e.target.value === "" ? null : e.target.value === "true")}><option value="">Seleccione</option><option value="true">Sí</option><option value="false">No</option></select>;
    else if (["opcion", "codigo_tasa", "sector", "tamano"].includes(campo.tipo)) {
        const opciones = campo.tipo === "sector" ? datos.sectores.map((s, i) => ({ v: String(i), etiqueta: `${s.ciiu_division} · ${s.nombre}` })) : campo.tipo === "tamano" ? Object.keys(datos.sectores[sector]?.por_tamano ?? {}).map(v => ({ v, etiqueta: v })) : campo.tipo === "codigo_tasa" ? CODIGOS.map(v => ({ v, etiqueta: v })) : campo.opciones ?? [];
        control = <select {...attrs} value={valor == null ? "" : String(valor)} onChange={e => cambiar(e.target.value === "" ? null : campo.tipo === "sector" ? Number(e.target.value) : e.target.value)}><option value="">Seleccione</option>{opciones.map(o => <option key={o.v} value={o.v}>{o.etiqueta}</option>)}</select>;
    } else if (campo.tipo === "flujos") control = <Flujos valor={valor} cambiar={cambiar} disabled={disabled} />;
    else if (["numero", "entero", "dinero", "tasa"].includes(campo.tipo)) control = <EntradaNumerica key={campo.tipo} id={id} valor={typeof valor === "number" ? valor : null} tipo={campo.tipo} cambiar={cambiar} disabled={disabled} ayuda={ayuda} requerido={campo.requerido} min={campo.min} max={campo.max} />;
    else control = <input {...attrs} value={typeof valor === "string" ? valor : ""} onChange={e => cambiar(e.target.value)} />;
    return <div className="agt-field">{campo.tipo === "estados" || campo.tipo === "flujos" ? <fieldset disabled={disabled}><legend>{campo.etiqueta}{campo.requerido ? " *" : ""}</legend>{control}</fieldset> : <><label htmlFor={id}>{campo.etiqueta}{campo.requerido ? " *" : ""}</label>{control}</>}{campo.ayuda && <small className="source" id={ayuda}>{campo.ayuda}</small>}</div>;
}
function EntradaNumerica({ id, valor, tipo, cambiar, disabled, ayuda, requerido, min, max }: { id: string; valor: number | null; tipo: string; cambiar: (v: ValorCampo) => void; disabled: boolean; ayuda?: string; requerido?: boolean; min?: number; max?: number }) {
    const [borrador, setBorrador] = useState<string | null>(null);
    const visible = valor == null ? "" : new Intl.NumberFormat("es-CO", { useGrouping: tipo === "dinero", maximumFractionDigits: 12 }).format(tipo === "tasa" ? valor * 100 : valor);
    return <input id={id} type="text" inputMode={tipo === "entero" ? "numeric" : "decimal"} disabled={disabled} required={requerido} aria-describedby={ayuda} value={borrador ?? visible} onFocus={() => setBorrador(visible)} onChange={e => {
        const raw = e.target.value; setBorrador(raw);
        const n = Number(raw.replace(/\./g, "").replace(",", "."));
        const v = tipo === "tasa" ? n / 100 : n;
        const valido = raw.trim() !== "" && Number.isFinite(n) && (tipo !== "entero" || Number.isInteger(n)) && (min == null || v >= min) && (max == null || v <= max);
        e.target.setCustomValidity(raw.trim() && !valido ? "Ingrese un número válido dentro del rango indicado." : "");
        cambiar(valido ? v : null);
    }} onBlur={() => setBorrador(null)} />;
}
function Flujos({ valor, cambiar, disabled }: { valor: ValorCampo | undefined; cambiar: (v: ValorCampo) => void; disabled: boolean }) {
    const flujoId = useId(); const lista = Array.isArray(valor) ? valor : [];
    return <div className="agt-flujos">{lista.map((n, i) => <div className="agt-flow" key={i}><label> Año <Numero valor={i} etiqueta="Año del flujo" /><EntradaNumerica id={`${flujoId}-${i}`} valor={n} tipo="numero" cambiar={v => cambiar(lista.map((x, j) => j === i ? typeof v === "number" ? v : 0 : x))} disabled={disabled} /></label><button type="button" disabled={disabled} aria-label={`Quitar flujo del año ${i}`} onClick={() => cambiar(lista.filter((_, j) => j !== i))}>Quitar</button></div>)}<button type="button" disabled={disabled} onClick={() => cambiar([...lista, 0])}>+ Agregar flujo</button><small className="source">El primer flujo corresponde al año cero.</small></div>;
}
function Estados({ valor, cambiar, sector, tamano, disabled }: { valor: ValorCampo | undefined; cambiar: (v: ValorCampo) => void; sector: number; tamano: string; disabled: boolean }) {
    const datos = useDatos(), [estado, setEstado] = useState(""), [error, setError] = useState(""), [activo, setActivo] = useState(false), ocupada = useRef(false), archivoId = useId(), archivoRef = useRef<HTMLInputElement>(null);
    const empresa = valor && typeof valor === "object" && !Array.isArray(valor) ? valor : null;
    const notificarCarga = useContext(CargaArchivos), vigente = useRef(true);
    const [sectorElegido, setSectorElegido] = useState<number | null>(null), [tamanoElegido, setTamanoElegido] = useState<string | null>(null);
    const sectorActual = sectorElegido ?? empresa?.sector ?? sector, tamanoActual = tamanoElegido ?? empresa?.tamano ?? tamano;
    useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
    async function cargar(archivo?: File, ejemplo?: string) {
        if (disabled || ocupada.current) return;
        ocupada.current = true; notificarCarga?.(true); setEstado("Leyendo estados financieros…"); setError("");
        try { const opciones = { sector: sectorActual, tamano: tamanoActual }; const e = archivo ? await prepararEmpresa(await archivo.arrayBuffer(), archivo.name, opciones, datos) : await cargarEjemplo(ejemplo!, datos); if (vigente.current) { setSectorElegido(e.sector); setTamanoElegido(e.tamano); cambiar(e); } }
        catch (e) { if (vigente.current) setError(mensajeError(e)); } finally { if (vigente.current) setEstado(""); ocupada.current = false; notificarCarga?.(false); }
    }
    return <div aria-busy={!!estado}>
        {empresa ? <div className="agt-company"><strong>{empresa.nombre}</strong><span> · Años: {empresa.anios.join(", ")}</span> <button type="button" className="agt-link" disabled={disabled || !!estado} onClick={() => archivoRef.current?.click()}>Cambiar archivo</button></div> : <div className={`agt-drop ${activo ? "agt-drop-active" : ""}`} onDragOver={e => { e.preventDefault(); setActivo(true); }} onDragLeave={() => setActivo(false)} onDrop={e => { e.preventDefault(); setActivo(false); if (e.dataTransfer.files[0]) void cargar(e.dataTransfer.files[0]); }}><label htmlFor={archivoId}>Suelte aquí sus estados o elija un archivo</label></div>}
        <input ref={archivoRef} className={empresa ? "sr-only" : "agt-file"} aria-label="Archivo de estados financieros" id={archivoId} type="file" disabled={disabled || !!estado} onChange={e => { const f = e.target.files?.[0]; if (f) void cargar(f); e.target.value = ""; }} />
        {!empresa && <div className="agt-examples">{EJEMPLOS.map(e => <button type="button" className="agt-link" disabled={disabled || !!estado} key={e.id} onClick={() => void cargar(undefined, e.id)}>Usar ejemplo: {e.etiqueta}</button>)}</div>}
        <div className="agt-company-options"><label>Sector<select disabled={disabled || !!estado} value={sectorActual} onChange={e => { const n = Number(e.target.value); setSectorElegido(n); setTamanoElegido(Object.keys(datos.sectores[n]?.por_tamano ?? {})[0] ?? ""); cambiar(null); setError("Seleccione de nuevo el archivo para aplicar el sector y el tamaño."); }}>{datos.sectores.map((s, i) => <option key={s.ciiu_division} value={i}>{s.ciiu_division} · {s.nombre}</option>)}</select></label><label>Tamaño<select disabled={disabled || !!estado} value={tamanoActual} onChange={e => { setTamanoElegido(e.target.value); cambiar(null); setError("Seleccione de nuevo el archivo para aplicar el tamaño."); }}>{Object.keys(datos.sectores[sectorActual]?.por_tamano ?? {}).map(t => <option key={t} value={t}>{t}</option>)}</select></label></div>
        <span role="status" aria-live="polite">{estado}</span>{error && <p role="alert" className="alert">{error}</p>}
        {empresa?.alertas.map((a, i) => <p className="alert" key={i}>{a}</p>)}
    </div>;
}
