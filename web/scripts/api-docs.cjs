/* eslint-disable @typescript-eslint/no-require-imports -- Generación local a partir del GET, sin HTTP ni red. */
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
require.extensions[".ts"] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
require("../api/calc/[op].ts").GET(new Request("http://local.invalid/api/calc")).json().then(data => {
    const output = path.resolve(__dirname, "../src/lib/api-calc-docs.ts");
    fs.writeFileSync(output, "// Generado localmente por scripts/api-docs.cjs desde GET /api/calc.\nexport const API_CALC = " + JSON.stringify(data, null, 2) + " as const;\n");
    console.log("API documentada: " + Object.keys(data.operaciones).length + " operaciones; sin solicitudes de red.");
}).catch(e => { console.error(e); process.exitCode = 1; });
