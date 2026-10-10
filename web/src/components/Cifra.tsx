import { useId } from "react";
import { fmt, type Celda } from "@/lib/api";
export function Cifra({ celda: c }: {
    celda: Celda;
}) { const id = useId(); const note = [c.nota, c.fuente, c.corte ? `Corte ${c.corte}` : null, c.v === null && !c.nota ? "Valor no publicado en este corte." : null].filter(Boolean).join(" · "); return <span className={`cifra tono-${c.tono}`} tabIndex={note ? 0 : undefined} aria-describedby={note ? id : undefined}>{fmt(c)}{c.var?.v != null && <small className={`variacion tono-${c.var.tono}`}><span aria-hidden="true">{c.var.v >= 0 ? "▲" : "▼"}</span><span className="sr-only">{c.var.v >= 0 ? "Sube" : "Baja"} </span>{fmt({ ...c, v: Math.abs(c.var.v), tono: c.var.tono })}</small>}{note && <span role="tooltip" id={id} className="tooltip">{note}</span>}</span>; }
