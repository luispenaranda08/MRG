/** ZIP sin compresión (método «store») con nombres UTF-8: suficiente para empaquetar el agente descargable sin dependencias. */

const TABLA_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
})();

function crc32(b: Uint8Array) {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = TABLA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

export interface ArchivoZip { nombre: string; datos: Uint8Array | string }

export function crearZip(archivos: ArchivoZip[], fecha = new Date()): Uint8Array {
    const enc = new TextEncoder();
    const hora = (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (fecha.getSeconds() >> 1);
    const dia = ((fecha.getFullYear() - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate();
    const locales: Uint8Array[] = [], centrales: Uint8Array[] = [];
    let desplazamiento = 0;
    for (const a of archivos) {
        const nombre = enc.encode(a.nombre), datos = typeof a.datos === "string" ? enc.encode(a.datos) : a.datos, crc = crc32(datos);
        const local = new Uint8Array(30 + nombre.length), l = new DataView(local.buffer);
        l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x0800, true); l.setUint16(8, 0, true);
        l.setUint16(10, hora, true); l.setUint16(12, dia, true); l.setUint32(14, crc, true);
        l.setUint32(18, datos.length, true); l.setUint32(22, datos.length, true); l.setUint16(26, nombre.length, true); l.setUint16(28, 0, true);
        local.set(nombre, 30);
        const central = new Uint8Array(46 + nombre.length), c = new DataView(central.buffer);
        c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
        c.setUint16(12, hora, true); c.setUint16(14, dia, true); c.setUint32(16, crc, true);
        c.setUint32(20, datos.length, true); c.setUint32(24, datos.length, true); c.setUint16(28, nombre.length, true);
        c.setUint32(42, desplazamiento, true);
        central.set(nombre, 46);
        locales.push(local, datos); centrales.push(central);
        desplazamiento += local.length + datos.length;
    }
    const tamCentral = centrales.reduce((s, x) => s + x.length, 0);
    const fin = new Uint8Array(22), f = new DataView(fin.buffer);
    f.setUint32(0, 0x06054b50, true); f.setUint16(8, archivos.length, true); f.setUint16(10, archivos.length, true);
    f.setUint32(12, tamCentral, true); f.setUint32(16, desplazamiento, true);
    const partes = [...locales, ...centrales, fin], salida = new Uint8Array(partes.reduce((s, x) => s + x.length, 0));
    let i = 0;
    for (const p of partes) { salida.set(p, i); i += p.length; }
    return salida;
}
