// Empaqueta el programa del agente descargable (src/lib/agentes/paquete/ejecutar.ts) en public/agentes/ejecutar.mjs.
// La interfaz lo mete en el .zip junto con agente.json, entradas.json y la copia de los datos de mercado.
import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = new URL("..", import.meta.url);
mkdirSync(new URL("public/agentes/", raiz), { recursive: true });
await esbuild.build({
    entryPoints: [fileURLToPath(new URL("src/lib/agentes/paquete/ejecutar.ts", raiz))],
    outfile: fileURLToPath(new URL("public/agentes/ejecutar.mjs", raiz)),
    bundle: true, platform: "node", format: "esm", target: "node20", minify: true, legalComments: "none", logLevel: "warning",
    alias: { "@": fileURLToPath(new URL("src", raiz)) },
    // pdf.js solo se usa con archivos PDF; si no está instalado, el agente pide el archivo en Excel o CSV.
    external: ["pdfjs-dist", "pdfjs-dist/*"],
    banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" },
});
console.log("public/agentes/ejecutar.mjs listo.");
