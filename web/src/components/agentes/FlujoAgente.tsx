import { useId } from "react";
import { flujo, type Agente } from "@/lib/agentes";

const ANCHO = 190, ALTO = 44, PASO_X = 250, PASO_Y = 58, MARGEN = 20;

function lineas(texto: string): string[] {
    const palabras = texto.trim().split(/\s+/);
    const resultado = [""];
    for (const palabra of palabras) {
        const i = resultado.length - 1;
        const siguiente = resultado[i] ? `${resultado[i]} ${palabra}` : palabra;
        if (siguiente.length <= 25) resultado[i] = siguiente;
        else if (i === 0 && resultado[i]) resultado.push(palabra);
        else resultado[i] = siguiente;
    }
    return resultado.map(linea => linea.length > 25 ? `${linea.slice(0, 24).trimEnd()}…` : linea);
}

export function FlujoAgente({ agente }: { agente: Agente }) {
    const id = useId();
    const diagrama = flujo(agente);
    const filasPorColumna = new Map<number, number>();
    for (const nodo of diagrama.nodos) {
        filasPorColumna.set(nodo.columna, Math.max(filasPorColumna.get(nodo.columna) ?? 0, nodo.fila + 1));
    }
    const nodos = diagrama.nodos.map(nodo => ({
        ...nodo,
        // El número de criterios ya aparece en las instrucciones; aquí solo va el nombre.
        texto: nodo.tipo === "criterios" ? "Criterios" : nodo.texto,
        x: MARGEN + nodo.columna * PASO_X,
        y: MARGEN + ((diagrama.filas - (filasPorColumna.get(nodo.columna) ?? 0)) / 2 + nodo.fila) * PASO_Y,
    }));
    const porId = new Map(nodos.map(nodo => [nodo.id, nodo]));
    const ancho = MARGEN * 2 + (diagrama.columnas - 1) * PASO_X + ANCHO;
    const alto = MARGEN * 2 + (diagrama.filas - 1) * PASO_Y + ALTO;
    const resumen = diagrama.aristas.map(arista => `${porId.get(arista.de)?.texto} → ${porId.get(arista.a)?.texto}`).join("; ");

    return <section className="card agt-diagram" aria-labelledby={`${id}-titulo`}>
        <h3 id={`${id}-titulo`}>Flujo del agente</h3>
        <div className="agt-diagram-scroll" tabIndex={0} role="region" aria-label="Diagrama con desplazamiento horizontal">
            <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`Flujo del agente: ${agente.nombre}. ${resumen || nodos.map(n => n.texto).join("; ")}`}>
                <defs><marker id={`${id}-flecha`} viewBox="0 0 8 8" refX={8} refY={4} markerWidth={8} markerHeight={8} markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#fff" /></marker></defs>
                <g fill="none" stroke="#fff" strokeWidth={1.5}>
                    {diagrama.aristas.map(({ de, a }) => {
                        const origen = porId.get(de)!, destino = porId.get(a)!;
                        const x = origen.x + ANCHO, y = origen.y + ALTO / 2, finY = destino.y + ALTO / 2;
                        const control = (destino.x - x) / 2;
                        return <path key={`${de}-${a}`} d={`M${x} ${y} C${x + control} ${y}, ${destino.x - control} ${finY}, ${destino.x} ${finY}`} markerEnd={`url(#${id}-flecha)`} />;
                    })}
                </g>
                {nodos.map(nodo => {
                    const texto = lineas(nodo.texto);
                    return <g key={nodo.id} transform={`translate(${nodo.x} ${nodo.y})`}>
                        <title>{nodo.texto}</title>
                        {nodo.tipo === "criterios"
                            ? <path d={`M10 0 H${ANCHO - 10} L${ANCHO} 10 V${ALTO - 10} L${ANCHO - 10} ${ALTO} H10 L0 ${ALTO - 10} V10 Z`} fill="#0b0b0b" stroke="#fff" strokeWidth={1.5} />
                            : <rect width={ANCHO} height={ALTO} rx={4} fill="#0b0b0b" stroke="#fff" strokeWidth={nodo.tipo === "documento" || nodo.tipo === "entrega" ? 3 : 1.5} />}
                        <text x={ANCHO / 2} y={ALTO / 2 - (texto.length - 1) * 7} textAnchor="middle" dominantBaseline="middle" fill="#fff">
                            {texto.map((linea, i) => <tspan key={i} x={ANCHO / 2} dy={i ? 14 : 0}>{linea}</tspan>)}
                        </text>
                    </g>;
                })}
            </svg>
        </div>
    </section>;
}
