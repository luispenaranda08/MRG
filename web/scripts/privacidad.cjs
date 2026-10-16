// Revisa el sitio construido (out/) antes de publicar: ningún texto que vea el usuario ni el código que
// descarga su navegador debe revelar las herramientas internas ni nombres de personas.
const fs = require("node:fs"), path = require("node:path");
const PROHIBIDO = /\bJEV\b|OpenRouter|Haiku|Anthropic|jev-router|Saavedra|Gutiérrez|Gutierrez|Lihki|Rubio\b|Uninorte|profesor/i;
const raiz = path.join(__dirname, "..", "out"), hallazgos = [];
if (!fs.existsSync(raiz)) { console.error("Falta out/: ejecute npm run build antes."); process.exit(1); }
(function recorrer(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) recorrer(f);
        else if (/\.(html|js|mjs|json|txt|css)$/.test(e.name)) {
            const m = fs.readFileSync(f, "utf8").match(PROHIBIDO);
            if (m) hallazgos.push(`${path.relative(raiz, f)}: «${m[0]}»`);
        }
    }
})(raiz);
if (hallazgos.length) { console.error("Se encontró información interna en el sitio:\n" + hallazgos.join("\n")); process.exit(1); }
console.log("OK privacidad: el sitio construido no menciona herramientas internas ni personas.");
