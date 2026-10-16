// Build local sin telemetría ni descargas de fuentes.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require=createRequire(import.meta.url);
// Worker de pdf.js para leer PDF en el navegador (se sirve desde /pdf.worker.min.js)
import { copyFileSync } from "node:fs";
copyFileSync(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs"),new URL("../public/pdf.worker.min.js",import.meta.url));
// Programa del agente descargable (.zip de /agentes): se sirve desde /agentes/ejecutar.mjs
const paquete=spawnSync(process.execPath,[fileURLToPath(new URL("./agente-paquete.mjs",import.meta.url))],{stdio:"inherit"});
if(paquete.status!==0){process.exitCode=paquete.status??1;throw new Error("No se pudo empaquetar el agente descargable.");}
const result=spawnSync(process.execPath,[require.resolve("next/dist/bin/next"),"build"],{stdio:"inherit",env:{...process.env,NEXT_TELEMETRY_DISABLED:"1"}});
if(result.error)throw result.error;
process.exitCode=result.status??1;
