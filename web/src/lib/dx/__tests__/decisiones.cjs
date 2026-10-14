/* eslint-disable @typescript-eslint/no-require-imports -- Decisiones de JEV dentro del harness: menú cerrado, cálculo de Mirage. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),XLSX=require('xlsx');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
const {parseWorkbook,buildCompany,runModel,M}=require('../engine.ts');const {defaultsFor}=require('../defaults.ts');
const D=require('../decisiones.ts');
const read=n=>JSON.parse(fs.readFileSync(path.join('public/api/v1',n+'.json'),'utf8'));
const datos={meta:read('meta'),estilo:read('estilo'),parametros:read('parametros').parametros,...read('sectores')};
const si=datos.sectores.findIndex(s=>s.ciiu_division==='14');
const pyme=parseWorkbook(XLSX.read(fs.readFileSync('public/ejemplos/PYME-Confecciones-del-Caribe.xlsx'),{type:'buffer'}),'PYME.xlsx');
const c=buildCompany(pyme,{name:'PYME',cur:'COP',unit:'miles',country:'Colombia',fx:4000,sectorName:datos.sectores[si].nombre,bu:datos.sectores[si].beta_desapalancada.v,listed:false});
const base=defaultsFor(c,datos,si,'Mediana');
// 1. Por defecto = comportamiento anterior (las decisiones de Mirage no cambian nada)
const s0=D.aplicar(c,base,D.POR_DEFECTO);
assert.deepEqual(s0.growth,base.growth);assert.equal(s0.margin,base.margin);assert.equal(s0.kd,base.kd);
// 2. Cada opción produce el cálculo esperado
assert.ok(D.aplicar(c,base,{...D.POR_DEFECTO,crecimiento:'inflacion_largo_plazo'}).growth.every(g=>g===base.g));
const mid=D.aplicar(c,base,{...D.POR_DEFECTO,crecimiento:'intermedio'}).growth;mid.forEach((g,i)=>assert.ok(Math.abs(g-(base.growth[i]+base.g)/2)<1e-9));
const n=c.years.length,p3=[0,1,2].map(j=>M(c,n-1-j).em).reduce((a,b)=>a+b)/3*100;
assert.ok(Math.abs(D.aplicar(c,base,{...D.POR_DEFECTO,margen:'promedio_3'}).margin-Math.min(60,p3))<1e-9);
const kdi=D.kdImplicito(c);
if(kdi!=null){const s=D.aplicar(c,base,{...D.POR_DEFECTO,kd:'implicito_empresa'});assert.notEqual(s.kd,base.kd);assert.match(s.kdFuente,/Kd propio/);}
// 3. Validación: lo que está fuera del menú o no disponible cae al valor por defecto de Mirage
const v=D.validar(c,{crecimiento:{opcion:'inventado',motivo:'x'},margen:{opcion:'mediana_rentables',motivo:'Año con pérdida'},kd:{opcion:'implicito_empresa',motivo:'y'}});
assert.equal(v[0].opcion,'historico_acotado');assert.equal(v[0].origen,'mirage');
assert.equal(v[1].opcion,'mediana_rentables');assert.equal(v[1].origen,'auto');
assert.equal(v[2].opcion,kdi==null?'observado_sector_tamano':'implicito_empresa');
assert.ok(D.validar(c,null).every(d=>d.origen==='mirage'));
// 4. El modelo corre con los supuestos decididos y el resumen para JEV no lleva datos de identificación
const dec=Object.fromEntries(v.map(d=>[d.clave,d.opcion]));const r=runModel(c,D.aplicar(c,base,dec),datos);assert.ok(Number.isFinite(r.EV.at(-1).eva));
const res=D.resumenParaJev(c,base,'14 · Confección','Mediana');assert.ok(!JSON.stringify(res).includes('PYME.xlsx'));assert.ok(res.opciones.margen.length===3);
console.log(`OK decisiones JEV: por defecto = anterior; ${Object.values(D.MENU).flat().length} opciones calculadas por Mirage; validación del menú; Kd implícito ${kdi==null?'no disponible':(kdi*100).toFixed(2)+' %'}.`);
