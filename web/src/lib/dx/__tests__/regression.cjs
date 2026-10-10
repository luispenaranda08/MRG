/* eslint-disable @typescript-eslint/no-require-imports -- Runner CommonJS local para transpilar TypeScript sin instalar nada. */
// Ejecutar: node src/lib/dx/__tests__/regression.cjs (sin instalar dependencias).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),XLSX=require('xlsx'),ExcelJS=require('exceljs');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,f);
require.extensions['.tsx']=require.extensions['.ts'];
const {parseWorkbook,buildCompany,runModel,buildWorkbook,M}=require('../engine.ts');
const {defaultsFor}=require('../defaults.ts');const {fmt,celda,waccSector}=require('../../api.ts');const {calcular}=require('../../calculadora.ts');
const read=n=>JSON.parse(fs.readFileSync(path.join('public/api/v1',n+'.json'),'utf8'));
const sectorData=read('sectores'),datos={meta:read('meta'),estilo:read('estilo'),parametros:read('parametros').parametros,...sectorData};
const approx=(a,b,t,msg)=>assert.ok(Math.abs(a-b)<t,`${msg}: ${a} != ${b}`);
const find=(w,sheet,label)=>{const s=w.getWorksheet(sheet);let value; s.eachRow(row=>{if(String(row.getCell(1).value)===label)value=row.getCell(2);});assert.ok(value,`${sheet}: ${label}`);return value;};
// Evalúa las cadenas de fórmulas solicitadas, sin depender de resultados en caché.
function evaluate(w,sheet,address,visiting=new Set()) {
 const key=sheet+'!'+address.replace(/\$/g,''); assert.ok(!visiting.has(key),'Referencia circular '+key);
 const cell=w.getWorksheet(sheet).getCell(address.replace(/\$/g,''));if(!cell.formula)return Number(cell.value)||0;
 const next=new Set(visiting);next.add(key);
 const expression=cell.formula.replace(/(?:(?:'([^']+)'|([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_ ]*))!)?(\$?[A-Z]{1,3}\$?\d+)/g,(_,quoted,named,addr)=>String(evaluate(w,quoted||named||sheet,addr,next))).replace(/\^/g,'**').replace(/(?<![<>=])=(?!=)/g,'===');
 assert.ok(/^[0-9eE+*\/().,<>=! -]+$/.test(expression.replace(/IFERROR|IF|CHOOSE|ABS|MAX/g,'')),'Expresión inesperada '+expression);
 return Function('IFERROR','IF','CHOOSE','ABS','MAX','return ('+expression+')')((v,f)=>Number.isFinite(v)?v:f,(c,a,b)=>c?a:b,(i,...v)=>v[i-1],Math.abs,Math.max);
}
(async()=>{
 assert.equal(datos.sectores.length,61);assert.equal(fmt(celda(null)),'—');assert.equal(fmt(celda(0.1432)),'14,32 %');assert.equal(fmt(celda(4257,'num')),'4.257');
 const si=Math.max(0,datos.sectores.findIndex(s=>s.ciiu_division==='63'));
 const p=parseWorkbook(XLSX.read(fs.readFileSync('public/ejemplos/Visa-2021-2025.xlsx'),{type:'buffer'}),'Visa-2021-2025.xlsx');
 const c=buildCompany(p,{name:'Visa Inc.',cur:'USD',unit:'millones',country:'Estados Unidos',sectorName:datos.sectores[si].nombre,bu:datos.sectores[si].beta_desapalancada.v});
 assert.deepEqual(c.years,[2021,2022,2023,2024,2025]);
 const base=defaultsFor(c,datos,si,'Grande');
 // Fixture histórica explícita: sólo regresión. No se usa en la aplicación.
 const old={...base,bu:0.74,rf:4.72,erp:4.33,crp:0,lam:0,size:0,kdMode:'manual',kd:5,betaReg:0.7649,waccMode:'reg',growth:[11,10.5,9.5,9,8.5],g:3,price:223.647,finNeed:5000,finRate:5,issuePrice:223.647,fixed:100};
 const legacy=runModel(c,old,datos),wb=buildWorkbook(c,old,legacy,p,datos);
 approx(legacy.lev.gao,1.459,0.0005,'GAO');approx(legacy.upa.ebitStar,22823.5,0.001,'EBIT indiferencia');approx(legacy.EV.at(-1).eva,19206,1,'EVA 2025');
 assert.equal(wb.worksheets.length,13);assert.ok(find(wb,'Apalancamiento','GAO = MC / EBIT').formula);approx(find(wb,'UPA','EBIT de indiferencia').result,22823.5,0.001,'UPA Excel');
 const evaRow=wb.getWorksheet('EVA').getRow(10);assert.equal(evaRow.getCell(1).value,'EVA');approx(evaRow.getCell(6).result,19206,1,'EVA Excel');
 approx(evaluate(wb,'Apalancamiento',find(wb,'Apalancamiento','GAO = MC / EBIT').address),legacy.lev.gao,1e-9,'GAO fórmula viva');
 approx(evaluate(wb,'UPA',find(wb,'UPA','EBIT de indiferencia').address),legacy.upa.ebitStar,1e-6,'UPA fórmula viva');
 approx(evaluate(wb,'EVA','F10'),legacy.EV.at(-1).eva,1e-6,'EVA fórmula viva');
 let formulaCount=0;wb.eachSheet(s=>s.eachRow(r=>r.eachCell(c=>{if(c.formula){formulaCount++;assert.ok(!c.formula.includes('undefined'));}})));assert.ok(formulaCount>300);
 const fresh=runModel(c,base,datos),freshBook=buildWorkbook(c,base,fresh,p,datos);approx(evaluate(freshBook,'EVA','F10'),fresh.EV.at(-1).eva,1e-6,'EVA API fórmula viva');const bytes=await freshBook.xlsx.writeBuffer(),roundtrip=new ExcelJS.Workbook();await roundtrip.xlsx.load(bytes);assert.equal(roundtrip.worksheets.length,13);assert.ok(find(roundtrip,'WACC','WACC usado para valorar').formula);
 const inputs={deuda:100,patrimonio:200,ebit:40,gastos:8,tarifa:datos.parametros.tasa_impuesto.v,total:false,primaTamano:false},sc=datos.sectores[si],calc=calcular(datos.parametros,sc,'Grande',inputs);assert.ok(Number.isFinite(calc['WACC COP'].v));
 const noKd={...sc,por_tamano:{...sc.por_tamano,Grande:{...sc.por_tamano.Grande,kd:celda(null)}}};assert.equal(calcular(datos.parametros,noKd,'Grande',inputs)['Kd observado COP'].v,sc.kd.v);
 assert.equal(calcular(datos.parametros,sc,'Grande',{...inputs,primaTamano:true})['WACC COP'].v,null);assert.equal(waccSector(sc,'USD','real').v,sc.wacc_usd_real.v);
 // WeakMap evita compartir cuentas entre cargas sucesivas (ambas tk=MI).
 const pyme=parseWorkbook(XLSX.read(fs.readFileSync('public/ejemplos/PYME-Confecciones-del-Caribe.xlsx'),{type:'buffer'}),'PYME-Confecciones-del-Caribe.xlsx');
 const cs=buildCompany(pyme,{name:pyme.name,cur:'COP',unit:'miles',country:'Colombia',sectorName:sc.nombre,bu:sc.beta_desapalancada.v});assert.notEqual(M(c,0).rev,M(cs,0).rev);
 const sm=defaultsFor(cs,datos,si,'Pequeña'),rm=runModel(cs,sm,datos);assert.ok(Number.isFinite(rm.w));assert.equal(buildWorkbook(cs,sm,rm,pyme,datos).worksheets.length,13);
 const summary={legacy:{gao:legacy.lev.gao,ebitStar:legacy.upa.ebitStar,eva2025:legacy.EV.at(-1).eva,wacc:legacy.w},api:{sector:sc.nombre,gao:fresh.lev.gao,ebitStar:fresh.upa.ebitStar,eva2025:fresh.EV.at(-1).eva,wacc:fresh.w,kdUSD:base.kd},deltaEVA:fresh.EV.at(-1).eva-legacy.EV.at(-1).eva,sheets:roundtrip.worksheets.map(s=>s.name),formulaCount};
 // Renderizado de las vistas con datos API, sin abrir navegador.
 const Module=require('node:module'),originalLoad=Module._load,React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 Module._load=function(request,parent,isMain){
  if(request==='./Mirage'&&parent.filename.includes('components'))return {useDatos:()=>datos};
  if(request.startsWith('@/'))request=path.join(process.cwd(),'src',request.slice(2));
  return originalLoad.call(this,request,parent,isMain);
 };
 try{
  const {Wacc}=require('../../../components/Wacc.tsx'),{Calculadora}=require('../../../components/Calculadora.tsx'),{Diagnostico}=require('../../../components/Diagnostico.tsx');
  const html=renderToStaticMarkup(React.createElement(Wacc));assert.equal((html.match(/class="sector-link"/g)||[]).length,61);assert.ok(html.includes('role="tooltip"'));assert.ok(html.includes('βu'));
  assert.ok(renderToStaticMarkup(React.createElement(Calculadora)).includes('Memo TXT'));
  const dx=renderToStaticMarkup(React.createElement(Diagnostico));assert.ok(dx.includes('type="file"'));assert.ok(dx.includes('nunca se envían a un servidor'));
 }finally{Module._load=originalLoad;}
 console.log(JSON.stringify(summary,null,2));console.log('OK: regresión Visa, dos empresas, ExcelJS 13 hojas, fórmulas, fallback Kd, null y formato.');
})().catch(e=>{console.error(e);process.exitCode=1;});
