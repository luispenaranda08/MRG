"use client";
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cargarDatos, variables, type Datos } from "@/lib/api";
const Context = createContext<Datos | null>(null);
export function useDatos() { const d = useContext(Context); if (!d)
    throw new Error("API sin cargar"); return d; }
export function Mirage({ children }: {
    children: ReactNode;
}) {
    const [datos, setDatos] = useState<Datos | null>(null), [error, setError] = useState(""), [retry, setRetry] = useState(0), path = usePathname();
    useEffect(() => { let active = true; cargarDatos().then(d => { if (active) {
        setDatos(d);
        setError("");
    } }).catch(e => { if (active)
        setError(e.message); }); return () => { active = false; }; }, [retry]);
    return <div style={datos ? variables(datos.estilo) as CSSProperties : undefined}><a className="skip" href="#contenido">Saltar al contenido</a><header className="top"><Link href="/" className="brand"><Image src="/mirage-symbol-black.svg" alt="" width={30} height={30}/>Mirage <span>CAPITAL INTELLIGENCE</span></Link><nav aria-label="Vistas principales">{[["/", "WACC", "Costo de capital"], ["/calculadora/", "CALC", "Calculadora"], ["/tu-empresa/", "DX", "Tu empresa"]].map(([href, code, name]) => <Link key={href} href={href} aria-current={path.replace(/\/$/, "") === href.replace(/\/$/, "") ? "page" : undefined}><b>[ {code} ]</b><span>{name}</span></Link>)}</nav></header><main id="contenido">{path.replace(/\/$/, "") === "/api-docs" ? children : error ? <section role="alert" className="card"><h1>No pudimos cargar la API</h1><p>{error}</p><button onClick={() => setRetry(retry + 1)}>Reintentar</button></section> : !datos ? <p role="status" className="loading">Cargando fuentes y parámetros de Mirage…</p> : <Context.Provider value={datos}>{children}</Context.Provider>}</main>{datos && <footer><strong>Mirage es un producto de HyperTarget</strong> · <Link href="/api-docs/">API</Link>{datos.meta.estado && <p className="estado">{datos.meta.estado} · v{datos.meta.version}</p>}<p>{datos.meta.aviso}</p><details id="fuentes"><summary>Fuentes y licencias · Corte {datos.meta.corte}</summary><ul>{datos.meta.fuentes.map(f => <li key={f.id}><a href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre} ↗</a><span> · {f.licencia}</span></li>)}</ul></details></footer>}</div>;
}
