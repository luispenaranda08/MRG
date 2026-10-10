// Build local sin telemetría ni descargas de fuentes.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const result=spawnSync(process.execPath,[require.resolve("next/dist/bin/next"),"build"],{stdio:"inherit",env:{...process.env,NEXT_TELEMETRY_DISABLED:"1"}});
if(result.error)throw result.error;
process.exitCode=result.status??1;
