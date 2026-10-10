/** Flujos de caja: VPN y TIR con las convenciones de Excel (VNA con el periodo 0 incluido, TIR). */
import { biseccion } from "./tvm";

/** VPN con el flujo del periodo 0 incluido (FCN0 + VNA de Excel). */
export function vpn(k: number, flujos: number[]): number {
    return flujos.reduce((s, f, t) => s + f / Math.pow(1 + k, t), 0);
}

export const cambiosDeSigno = (f: number[]) => {
    const s = f.filter(x => x !== 0).map(Math.sign);
    let c = 0; for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1]) c++;
    return c;
};

/** TIR (como TIR/IRR de Excel). `null` si no existe. */
export function tir(flujos: number[], estimado = 0.1): number | null {
    if (cambiosDeSigno(flujos) === 0) return null;
    const g = (r: number) => vpn(r, flujos);
    let r = estimado;
    for (let k = 0; k < 100; k++) {
        const y = g(r), d = flujos.reduce((s, f, t) => s - t * f / Math.pow(1 + r, t + 1), 0);
        if (!isFinite(y) || !isFinite(d) || d === 0) break;
        const s = r - y / d;
        if (Math.abs(s - r) < 1e-12) return s;
        r = s <= -1 ? (r - 1) / 2 : s;
    }
    return biseccion(g, -0.9999, 100);
}

