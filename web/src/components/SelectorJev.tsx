"use client";
import { useRef, useState } from "react";
import { sugerirSector, type SectorJev } from "@/lib/jev";
import type { Sector } from "@/lib/api";
export function SelectorJev({ sectores, elegir }: { sectores: Sector[]; elegir: (s: SectorJev) => void }) {
    const [descripcion, setDescripcion] = useState(""), [ocupado, setOcupado] = useState(false), [motivo, setMotivo] = useState("");
    const revision = useRef(0);
    async function consultar() {
        const actual = ++revision.current;
        setOcupado(true); setMotivo("");
        try {
            const r = await sugerirSector(descripcion.trim(), sectores, [...new Set(sectores.flatMap(s => Object.keys(s.por_tamano)))]);
            if (actual === revision.current) { elegir(r); setMotivo(r.motivo); }
        } catch { /* JEV no interrumpe la selección manual. */ }
        finally { if (actual === revision.current) setOcupado(false); }
    }
    return <div><label>¿A qué se dedica la empresa?<input maxLength={500} value={descripcion} onChange={e => { revision.current++; setDescripcion(e.target.value); setMotivo(""); setOcupado(false); }}/></label><button disabled={ocupado || !descripcion.trim()} onClick={consultar}>{ocupado ? "Buscando…" : "Sugerir sector y tamaño"}</button>{motivo && <p className="tono-nota" role="status">{motivo}</p>}</div>;
}
