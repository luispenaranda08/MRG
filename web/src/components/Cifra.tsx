import { useId } from "react";
import { fmt, type Celda } from "@/lib/api";
import { textoClaro } from "@/lib/textos";
export function Cifra({ celda: c }: {
    celda: Celda;
}) { const id = useId(); const note = [c.nota, c.fuente, c.corte ? `Datos de mercado al ${c.corte}` : null, c.v === null && !c.nota ? "Valor no publicado en este corte." : null].filter(Boolean).join(" · "); const variation = c.var?.v != null && c.var.tono !== "neutro" && Math.abs(c.var.v) > 0 ? c.var : null; const variationValue = variation?.v ?? 0; const unchanged = c.var?.v != null && !variation; return <span className={`cifra tono-${c.tono}`} tabIndex={note ? 0 : undefined} aria-describedby={note ? id : undefined}>{fmt(c)}{variation && <small className={`variacion tono-${variation.tono}`}><span aria-hidden="true">{variationValue >= 0 ? "▲" : "▼"}</span><span className="sr-only">{variationValue >= 0 ? "Sube" : "Baja"} </span>{fmt({ ...c, v: Math.abs(variationValue), tono: variation.tono })}</small>}{unchanged && <small className="variacion tono-neutro">Sin cambio frente al corte anterior</small>}{note && <span role="tooltip" id={id} className="tooltip">{textoClaro(note)}</span>}</span>; }
