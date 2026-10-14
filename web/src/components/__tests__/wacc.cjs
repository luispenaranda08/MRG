/* eslint-disable @typescript-eslint/no-require-imports -- Regresión local de la tabla WACC. */
const assert = require("node:assert/strict"), fs=require("node:fs"), ts=require("typescript");
require.extensions[".ts"]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const datos = {
  ...require("../../../public/api/v1/meta.json"),
  meta: require("../../../public/api/v1/meta.json"),
  estilo: require("../../../public/api/v1/estilo.json"),
  parametros: require("../../../public/api/v1/parametros.json").parametros,
  ...require("../../../public/api/v1/sectores.json"),
};
const { documentoWacc, filasWacc } = require("../../lib/wacc-documento.ts");
const { numero } = require("../../lib/api.ts");
const waccSource=fs.readFileSync(require.resolve("../Wacc.tsx"),"utf8");
const cifraSource=fs.readFileSync(require.resolve("../Cifra.tsx"),"utf8");
assert.match(waccSource,/name==="Ajuste de Fisher"\?valor\/100:valor/,"La barra convierte Fisher de pp a fracción");
assert.match(waccSource,/toFixed\(4\)\.replace\("\.",","\)/,"βL × ERP muestra cuatro decimales");
assert.match(waccSource,/Micro: "Microempresas", Pequeña: "Pequeñas empresas", Mediana: "Medianas empresas", Grande: "Grandes empresas"/,"La frase usa etiquetas plurales explícitas");
assert.match(waccSource,/size === "Todo el sector" && i === 6 && currency === "COP" && mode === "nominal"/,"El rango visible solo aparece para todo el sector");
assert.match(cifraSource,/c\.var\.tono !== "neutro" && Math\.abs\(c\.var\.v\) > 0/,"Variación neutra o cero no muestra flecha ni subida/bajada");
for (const s of datos.sectores) {
  const a=s.ke_anatomia;
  assert.ok(a, `Falta anatomía CIIU ${s.ciiu_division}`);
  const suma=numero(a.rf)+numero(a.beta_por_erp)+numero(a.crp)+numero(a.ajuste_fisher)/100;
  assert.ok(Math.abs(suma-numero(a.ke_cop)) <= 0.0002, `Anatomía no coincide CIIU ${s.ciiu_division}: ${suma} / ${numero(a.ke_cop)}`);
  const piezas=[numero(a.rf),numero(a.beta_por_erp),numero(a.crp),numero(a.ajuste_fisher)/100];
  const anchos=piezas.map(p=>p/numero(a.ke_cop));
  // Tolerancia relativa coherente con la absoluta de 0,0002: las piezas vienen redondeadas a 4 decimales
  assert.ok(Math.abs(anchos.reduce((x,y)=>x+y,0)-1)<=0.0002/numero(a.ke_cop),`Los anchos no suman Ke COP CIIU ${s.ciiu_division}`);
  anchos.forEach((ancho,i)=>assert.ok(Math.abs(ancho-piezas[i]/numero(a.ke_cop))<1e-12,`Ancho no coincide con pieza ${i} CIIU ${s.ciiu_division}`));
}
const sector62=datos.sectores.find(s=>s.ciiu_division==="62"), rfRelativo=numero(sector62.ke_anatomia.rf)/numero(sector62.ke_anatomia.ke_cop);
assert.ok(Math.abs(rfRelativo-0.27)<0.01,`Rf debe ocupar cerca del 27 % en CIIU 62; obtuvo ${rfRelativo}`);
const index=datos.sectores.findIndex(s=>numero(s.por_tamano.Pequeña.ke||{v:null})!==null && numero(s.por_tamano.Pequeña.beta_apalancada)!==numero(s.beta_apalancada));
assert.ok(index>=0,"Hay sectores con βL distinta por tamaño");
const pequena=filasWacc(datos.sectores,"COP","nominal","Pequeña",datos);
const general=filasWacc(datos.sectores,"COP","nominal","Todo el sector",datos);
assert.notEqual(numero(pequena[index][5]), numero(general[index][5]), "La selección de tamaño cambia βL");
assert.equal(pequena[index][2].v, datos.sectores[index].por_tamano.Pequeña.empresas.v);
const doc=documentoWacc(datos,datos.sectores,"COP","nominal","Pequeña");
assert.match(doc.titulo,/Pequeña/);
assert.ok(doc.supuestos.some(x=>x.concepto==="Tamaño"&&x.cifra.v==="Pequeña"));
assert.match(doc.conclusion,/Tamaño: Pequeña/);
assert.equal(pequena[index].length,9,"Las filas con tamaño elegido no incluyen rango p25–p75");
assert.equal(documentoWacc(datos,datos.sectores,"COP","nominal","Pequeña").tablas[0].filas[0].length,9,"El documento con tamaño no incluye columnas de rango");
assert.ok(!doc.tablas[0].columnas.some(c=>/p25|p75/.test(c)),"PDF/documento no declara rangos al elegir tamaño");
console.log(`OK WACC: anatomía en ${datos.sectores.length} sectores, cambio por tamaño y título/supuesto del documento.`);
