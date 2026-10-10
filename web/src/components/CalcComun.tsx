"use client";
import { useState, type ReactNode } from "react";
import { Cifra } from "./Cifra";
import { celda, type Formato } from "@/lib/api";
import { ErrorFinanciero, PERIODOS } from "@/lib/finanzas";
export const CODIGOS = Array.from(new Set(PERIODOS.flatMap(p => [p.efectiva, p.nominalVencida, p.nominalAnticipada, p.periodicaAnticipada])));
export function intentar<T>(fn: () => T): { valor: T; error?: never } | { valor?: never; error: string } {
    try { return { valor: fn() }; } catch (e) { return { error: e instanceof ErrorFinanciero || e instanceof Error ? e.message : "Revise los datos ingresados." }; }
}
export function numeroEntrada(s: string, vacioCero = true) {
    if (!s.trim() && !vacioCero) throw new ErrorFinanciero("Complete los campos requeridos.");
    const n = Number(s.trim().replace(",", "."));
    if (!Number.isFinite(n)) throw new ErrorFinanciero("Ingrese números finitos; use coma o punto decimal, sin separadores de miles.");
    return n;
}
export function Campo({ label, value, change, type = "number", min, max, disabled = false }: { label: string; value: string; change: (v: string) => void; type?: string; min?: number; max?: number; disabled?: boolean }) {
    return <label>{label}<input type={type} step="any" value={value} min={min} max={max} disabled={disabled} onChange={e => change(e.target.value)}/></label>;
}
export function Codigo({ label = "Código de tasa", value, change }: { label?: string; value: string; change: (v: string) => void }) {
    return <label>{label}<select value={value} onChange={e => change(e.target.value)}>{CODIGOS.map(c => <option key={c}>{c}</option>)}</select></label>;
}
export function Frecuencia({ value, change }: { value: number; change: (v: number) => void }) {
    return <label>Frecuencia de pago<select value={value} onChange={e => change(Number(e.target.value))}>{PERIODOS.map(p => <option key={p.m} value={p.m}>{p.adjetivo}</option>)}</select></label>;
}
export function Resultado({ label, value, fmt = "x", signo = false }: { label: string; value: number | null; fmt?: Formato; signo?: boolean }) {
    return <article><h3>{label}</h3><Cifra celda={celda(value, fmt, signo && value !== null ? value >= 0 ? "sube" : "baja" : "clave")}/></article>;
}
export function ErrorCalculo({ error }: { error?: string }) { return error ? <p className="alert" role="alert">{error}</p> : null; }
export function Descargar({ run, children }: { run: () => Promise<void>; children: ReactNode }) {
    const [busy, setBusy] = useState(false), [error, setError] = useState("");
    return <><button disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await run(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } }}>{busy ? "Preparando…" : children}</button><ErrorCalculo error={error}/></>;
}
export function Grafico({ series, cruce, tasa = false, label }: { series: { nombre: string; puntos: { x: number; y: number }[] }[]; cruce?: number | null; tasa?: boolean; label: string }) {
    const points = series.flatMap(s => s.puntos).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!points.length) return <p>No hay valores finitos para dibujar.</p>;
    const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x)), minY = Math.min(0, ...points.map(p => p.y)), maxY = Math.max(0, ...points.map(p => p.y));
    const x = (v: number) => 72 + (v - minX) / (maxX - minX || 1) * 590, y = (v: number) => 235 - (v - minY) / (maxY - minY || 1) * 200;
    return <figure className="calc-chart"><figcaption>{label}</figcaption><svg role="img" aria-label={label} viewBox="0 0 720 285"><title>{label}</title><path d={`M72 30V235H662 M72 ${y(0)}H662`} fill="none" stroke="var(--nota-texto)"/>{[minY, 0, maxY].map((v, j) => <text key={j} x="67" y={y(v)} textAnchor="end" fontSize="11">{new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(v)}</text>)}{[minX, maxX].map((v, j) => <text key={j} x={x(v)} y="254" textAnchor="middle" fontSize="12">{tasa ? `${Math.round(v * 100)} %` : v}</text>)}{series.map((s, j) => <g key={s.nombre} style={{ color: j % 2 ? "var(--sube-texto)" : "var(--clave-texto)" }}><polyline points={s.puntos.filter(p => Number.isFinite(p.y)).map(p => `${x(p.x)},${y(p.y)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={j > 1 ? "5 4" : undefined}/></g>)}{cruce != null && cruce >= minX && cruce <= maxX && <g><path d={`M${x(cruce)} 30V235`} stroke="var(--alerta-texto)" strokeDasharray="4 4"/><text x={x(cruce)} y="20" textAnchor="middle" fontSize="12">Cruce {(cruce * 100).toFixed(2)} %</text></g>}</svg><ul className="chart-legend">{series.map((s, j) => <li key={s.nombre} style={{ color: j % 2 ? "var(--sube-texto)" : "var(--clave-texto)" }}>{j > 1 ? "┄" : "━"} {s.nombre}</li>)}</ul></figure>;
}
