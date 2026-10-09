/* FinTarget · DX · Diagnóstico de la empresa del usuario.
   Lee su balance y estado de resultados (Excel o CSV) en el navegador, mapea las cuentas, calcula V/H, indicadores,
   WACC con beta del sector, FCL histórico y proyectado, DCF, apalancamiento, UPA, EVA y riesgo, y genera un Excel
   con fórmulas vivas. Usa SheetJS (cdnjs). */
(function(){
"use strict";
const api=window.FinTargetMockup,A=window.FinTargetAnalitica,E=window.FinTargetEmpresas,L=A.lib;
const $=id=>document.getElementById(id),esc=api.esc;
const {nf,U,P1,SP,PP,X,cagr,clamp,card,svg,tx,nice,wfall,chCada100,chEstructura,chCrec,chMarg,sigHTML,stt,tile,attr,CL,r1,ratingSint,LY}=L;
const norm=s=>String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const st={step:1,fname:"",parsed:null,rows:[],meta:null,sup:null,R:null,busy:false};

/* ======================= Diccionario de cuentas ======================= */
const F=[
 ["cash","bal","Efectivo y equivalentes","ln",/efectivo y equivalentes|cash and (cash )?equivalents|caja y bancos|^disponible$|^efectivo$/,/restringid|restricted|crecimiento|growth/],
 ["sti","bal","Inversiones de corto plazo","ln",/inversiones (a |de )?corto plazo|short.?term investments|inversiones temporales|inversiones corrientes/],
 ["ar","bal","Cuentas por cobrar","ln",/cuentas (comerciales )?por cobrar|deudores comerciales|receivables?|^cartera|^deudores/,/largo plazo|long.?term|no corriente|other receivables/],
 ["inv","bal","Inventarios","ln",/inventario|inventor(y|ies)|existencias|^mercancias/],
 ["pre","bal","Gastos pagados por anticipado","ln",/pagados por (adelantado|anticipado)|prepaid|gastos anticipados/],
 ["tca","bal","Activo corriente","sub",/total (del |de )?activos? corrientes?|total current assets|activos? corrientes? totales|^activos? corrientes?$|activo corriente total/,/no corriente|non.?current/],
 ["ppe","bal","Propiedad, planta y equipo","ln",/propiedad(es)?,? planta y equipo|planta,? propiedad y equipo|property,? plant|pp&e|inmovilizado material|^activos fijos/,/bruto|gross|acumulad|accumulated/],
 ["lti","bal","Inversiones de largo plazo","ln",/inversiones (a |de )?largo plazo|long.?term investments|inversiones no corrientes|inversiones en (subsidiarias|asociadas)/],
 ["intg","bal","Intangibles","ln",/^activos intangibles|^intangibles?|intangible assets/,/otros intangibles|other intangibles/],
 ["tnca","bal","Activo no corriente","sub",/total (del |de )?activos? no corrientes?|total non.?current assets|^activos? no corrientes?$/],
 ["ta","bal","Activo total","tot",/^total (del |de )?activos?$|^activos? totales$|^total assets$/],
 ["ap","bal","Cuentas por pagar y proveedores","ln",/cuentas (comerciales )?por pagar|^proveedores|accounts payable/,/impuesto|tax|largo plazo|long.?term/],
 ["stb","bal","Obligaciones financieras de corto plazo","ln",/prestamos (a |de )?corto plazo|obligaciones financieras corrientes|obligaciones financieras (a |de )?corto plazo|short.?term borrowings|deuda (a |de )?corto plazo/],
 ["cpltd","bal","Porción corriente de la deuda","ln",/parte (actual|corriente) de la deuda|porcion corriente de (la )?deuda|current portion of long.?term debt/],
 ["tcl","bal","Pasivo corriente","sub",/total (del |de )?pasivos? corrientes?|total current liabilities|^pasivos? corrientes?$/,/no corriente|non.?current/],
 ["ltd","bal","Deuda de largo plazo","ln",/^deuda (a |de )?largo plazo|^long.?term debt$|obligaciones financieras no corrientes|obligaciones financieras (a |de )?largo plazo/,/parte|porcion|current/],
 ["lease","bal","Arrendamientos de largo plazo","ln",/arrendamientos (a |de )?largo plazo|long.?term leases|pasivos por arrendamiento no corrientes/],
 ["tncl","bal","Pasivo no corriente","sub",/total (del |de )?pasivos? no corrientes?|total non.?current liabilities|^pasivos? no corrientes?$/],
 ["tl","bal","Pasivo total","sub",/^total (del |de )?pasivos?$|^pasivos? totales?$|^total liabilities$|^pasivo total$/],
 ["re","bal","Utilidades retenidas","ln",/ganancias (retenidas|acumuladas)|utilidades (retenidas|acumuladas)|retained earnings|resultados acumulados/],
 ["mi","bal","Interés minoritario","ln",/intereses? minoritarios?|minority interest|participaciones? no controladoras?/],
 ["eq","bal","Patrimonio total","sub",/^patrimonio neto$|^total (del |de )?patrimonio( neto)?$|^total equity$|^patrimonio total$|^patrimonio$/,/pasivo|liabilities/],
 ["tle","bal","Pasivo + patrimonio","tot",/total (del |de )?pasivos? y (del |de )?patrimonio|total patrimonio y pasivos|total liabilities and (shareholders.? )?equity/],
 ["debt","bal","Deuda financiera total","memo",/^deuda total$|^total debt$|deuda financiera total|total obligaciones financieras/,/crecimiento|growth/],
 ["rev","pyg","Ingresos totales","tot",/ingresos totales|total revenues?|ingresos de actividades ordinarias|ingresos operacionales|ventas netas|^ventas$|^ingresos$|^revenues?$|^net sales/,/crecimiento|growth|cost|no devengad|intereses|financieros/],
 ["cogs","pyg","Costo de ventas","ln",/cost[eo]s? de (los )?(ingresos|ventas)|cost of (revenues?|goods|sales)|costo de la mercancia/],
 ["gp","pyg","Utilidad bruta","sub",/beneficio bruto|utilidad bruta|ganancia bruta|gross profit/,/crecimiento|growth|margen|margin/],
 ["opx","pyg","Gastos operativos","ln",/total (de )?otros gastos operativos|other operating expenses,? total|total gastos (operacionales|operativos)/],
 ["sga","pyg","Gastos de administración y ventas","ln",/gastos de venta,? generales|selling,? general|^gastos de administracion|administracion y ventas/],
 ["ebit","pyg","Utilidad operativa (EBIT)","sub",/^ebit$|^ebit \(|utilidad operativa|utilidad operacional|ganancia operacional|(ganancia|perdida).*actividades de operacion|operating income|resultado operativo/,/margen|margin|crecimiento/],
 ["iexp","pyg","Gasto por intereses","ln",/total de gastos de intereses|gastos? (por |de )?intereses|interest expense|^costos financieros|^gastos financieros/,/net|neto|ingreso/],
 ["iinc","pyg","Ingresos financieros","ln",/ingresos por intereses|ingresos financieros|interest (and investment )?income/],
 ["ebt","pyg","Utilidad antes de impuestos","sub",/ebt incluyendo|ebt,? incl|antes de impuestos|income before (income )?tax|^ebt$/,/excepto|excl|crecimiento|margen|growth|margin/],
 ["tax","pyg","Impuesto de renta","ln",/impuesto (sobre la |a la |de )?renta|income tax|impuestos? a las ganancias|gasto por impuesto/,/diferido|antes|deferred|before/],
 ["nic","pyg","Utilidad neta consolidada","sub",/beneficios netos para la empresa|net income to company|utilidad neta consolidada/],
 ["ni","pyg","Utilidad neta","tot",/^beneficio neto$|^utilidad neta|^ganancia (\(perdida\) )?neta|^net income$|^resultado neto|^(ganancia|perdida) neta/,/sobre ingresos|crecimiento|margen|growth|margin|common|minorit|por accion/],
 ["ebitda","pyg","EBITDA","memo",/^ebitda$/],
 ["da","pyg","Depreciación y amortización","memo",/depreciacion y amortizacion|^d&a|depreciation (and|&) amortization/,/acumulad/]
];
const FI={};F.forEach(f=>FI[f[0]]={id:f[0],st:f[1],l:f[2],t:f[3],re:f[4],ex:f[5]});
const AUX=[["capex",/capex|inversion en activos fijos|capital expenditures?|adquisicion de propiedades/],["shares",/promedio ponderado diluido|diluted (weighted )?(average )?shares/],["shares",/acciones en circulacion|shares outstanding|promedio ponderado (basico )?de acciones/]];
const EXP=["cogs","sga","opx","tax"];

/* ======================= Lectura ======================= */
const MES=/^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*[\s.\-\/]*((?:19|20)\d{2})$/i;
function yearOf(v){
  if(typeof v==="number"&&Number.isInteger(v)&&v>=1990&&v<=2100)return v;
  if(typeof v!=="string")return null;const t=v.trim();if(t.length>16)return null;
  let m=t.match(/^(?:fy|ay|ejercicio|año)?\s*((?:19|20)\d{2})\s*(?:\(?(?:real|r|e|p|est|estimado)\)?)?$/i);if(m)return +m[1];
  m=t.match(/^(?:\d{1,2}[\/\-.]){1,2}((?:19|20)\d{2})$/);if(m)return +m[1];
  m=t.match(MES);if(m)return +m[2];return null;
}
function num(v){
  if(v==null)return null;if(typeof v==="number")return isFinite(v)?v:null;if(v instanceof Date)return null;
  let s=String(v).trim();if(!s||/^[-–—]+$/.test(s)||/^n\/?[ad]$/i.test(s)||/%$/.test(s))return null;
  const neg=/^\(.*\)$/.test(s)||/^[-–]/.test(s);s=s.replace(/[()\s$€]|COP|USD/gi,"").replace(/^[-–]/,"");
  const lc=s.lastIndexOf(","),ld=s.lastIndexOf(".");
  if(lc>-1&&ld>-1)s=lc>ld?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");
  else if(lc>-1){const p=s.split(",");s=p.length===2&&p[1].length!==3?s.replace(",","."):s.replace(/,/g,"");}
  else if(ld>-1){const p=s.split(".");if(p.length>2||(p.length===2&&p[1].length===3))s=s.replace(/\./g,"");}
  const n=parseFloat(s);return isNaN(n)?null:(neg?-n:n);
}
function headerRow(rows){
  for(let r=0;r<Math.min(rows.length,30);r++){const row=rows[r]||[],seen=new Set(),cols=[];
    for(let c=0;c<row.length;c++){const y=yearOf(row[c]);if(!y)continue;if(seen.has(y))break;seen.add(y);cols.push([c,y]);}
    if(cols.length>=2)return {r,cols};}
  return null;
}
function parseWorkbook(wb,fname){
  const sheets=[],text=[];
  wb.SheetNames.forEach(name=>{
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:null,blankrows:true});
    rows.slice(0,16).forEach(r=>(r||[]).forEach(v=>{if(typeof v==="string")text.push(v);}));
    const h=headerRow(rows);if(!h)return;
    const first=h.cols[0][0],out=[];
    for(let r=h.r+1;r<rows.length;r++){const row=rows[r]||[];let lab=null;
      for(let c=0;c<first;c++){const v=row[c];if(typeof v==="string"&&v.trim()&&!/^https?:/i.test(v.trim())){lab=v.trim();break;}}
      if(!lab)continue;out.push({label:lab,v:h.cols.map(([c])=>num(row[c]))});}
    let years=h.cols.map(x=>x[1]);
    if(years[0]>years[years.length-1]){years=years.slice().reverse();out.forEach(o=>o.v.reverse());}
    const mags=out.flatMap(o=>o.v.filter(v=>v!=null).map(Math.abs)).sort((a,b)=>a-b),med=mags.length?mags[Math.floor(mags.length/2)]:0;
    let nb=0,np=0;out.forEach(o=>{const n=norm(o.label);F.forEach(f=>{if(f[4].test(n)&&!(f[5]&&f[5].test(n))){if(f[1]==="bal")nb++;else np++;}});});
    sheets.push({name,years,rows:out,med,nb,np});
  });
  if(!sheets.length)throw new Error("No encontré columnas con años (por ejemplo 2023, 2024, 2025) en ninguna hoja.");
  const bs=sheets.slice().sort((a,b)=>b.nb-a.nb)[0],ps=sheets.slice().sort((a,b)=>b.np-a.np)[0];
  if(bs.nb<3||ps.np<3)throw new Error("No reconocí suficientes cuentas de balance o de resultados. Revisa que el archivo tenga ambos estados con una cuenta por fila.");
  const years=bs.years.filter(y=>ps.years.indexOf(y)>-1);
  if(years.length<2)throw new Error("El balance y el estado de resultados no comparten al menos dos años.");
  const pick=(sh,o)=>years.map(y=>o.v[sh.years.indexOf(y)]);
  const rows=[],used={};
  const take=(sh,kind)=>{let lastSt=kind==="both"?"bal":kind;
    sh.rows.forEach(o=>{const v=pick(sh,o),n=norm(o.label),vals=v.filter(x=>x!=null),mx=vals.length?Math.max(...vals.map(Math.abs)):0;
      if(!vals.length){if(/^(activos?|pasivos?|patrimonio|activos? (no )?corrientes?|pasivos? (no )?corrientes?|ingresos|gastos)$/.test(n))rows.push({label:o.label,st:lastSt,hdr:1,v:years.map(()=>null),sheet:sh.name});return;}
      if(/por accion|per share|^bpa|eps|dividendo por|promedio ponderado|acciones en circulacion|shares/.test(n))return;
      if((/crecimiento|crecmiento|growth|%|margen|margin|variacion|ratio/.test(n)&&mx<=5)||(mx<2&&sh.med>500))return;
      let field=null,conf=0;
      for(const f of F){if(used[f[0]])continue;if(kind!=="both"&&f[1]!==kind)continue;if(f[5]&&f[5].test(n))continue;const m=n.match(f[4]);if(m){field=f[0];conf=0.74+0.24*Math.min(1,m[0].length/n.length);break;}}
      if(field)used[field]=1;
      const stt_=field?FI[field].st:lastSt;if(field)lastSt=stt_;
      rows.push({label:o.label,st:stt_,field,conf,v,sheet:sh.name});});};
  if(bs===ps)take(bs,"both");else{take(bs,"bal");take(ps,"pyg");}
  const aux={};
  AUX.forEach(([k,re])=>{if(aux[k])return;for(const sh of sheets){const o=sh.rows.find(o=>re.test(norm(o.label))&&years.some(y=>sh.years.indexOf(y)>-1));if(o){aux[k]=years.map(y=>{const j=sh.years.indexOf(y);return j>-1&&o.v[j]!=null?Math.abs(o.v[j]):null;});aux[k+"Src"]=sh.name+" · "+o.label;break;}}});
  const all=norm(text.join(" "));
  let unit=/miles de pesos|cop miles|en miles|thousands/.test(all)?"miles":/millones|millions|\bmm\b|us\$ mm/.test(all)?"millones":null;
  const rev=(rows.find(r=>r.field==="rev")||{v:[0]}).v.filter(x=>x!=null),mr=rev.length?Math.max(...rev.map(Math.abs)):0;
  if(!unit)unit=mr>1e10?"unidades":mr>1e7?"miles":"millones";
  const cur=/us\$|usd|dolares|u\.s\./.test(all)?"USD":/pesos|cop|niif|supersociedades|ingresos de actividades ordinarias/.test(all)?"COP":"USD";
  const name=(text.find(t=>/s\.a\.s|s\.a\.|inc\.|ltda|corp/i.test(t))||fname.replace(/\.[^.]+$/,"")).split(/[·|(]/)[0].trim().slice(0,60);
  return {years,rows,aux,unit,cur,name,sheets:sheets.map(s=>s.name),bs:bs.name,ps:ps.name,fname};
}

/* ======================= Empresa a partir del mapeo ======================= */
const UM={unidades:1,miles:1e3,millones:1e6};
function buildCompany(p,meta){
  const years=p.years,n=years.length,bal=[],pyg=[],flags=[],has={};
  let k=0;
  p.rows.forEach(r=>{
    if(r.hdr){(r.st==="pyg"?pyg:bal).push({id:"h"+(k++),l:r.label,t:"hdr"});return;}
    const f=r.field&&FI[r.field];let v=r.v.map(x=>x==null?0:x);
    if(f&&EXP.indexOf(f.id)>-1&&v.filter(x=>x<0).length>v.length/2)v=v.map(x=>-x);
    const id=f?f.id:"x"+(k++);if(f)has[f.id]=1;
    (r.st==="pyg"?pyg:bal).push({id,l:r.label,t:f?f.t:(/^total/.test(norm(r.label))?"sub":"ln"),lv:f&&f.t!=="ln"?undefined:1,neg:f&&EXP.indexOf(f.id)>-1?1:undefined,v});
  });
  const G=(id)=>{const r=bal.concat(pyg).find(x=>x.id===id&&x.v);return r?r.v:null;};
  const addD=(arr,id,l,t,v,why)=>{arr.push({id,l:l+" (derivada)",t,v});has[id]=1;flags.push({st:arr===bal?"bal":"pyg",id,y:years.map((y,i)=>i),sev:"info",msg:"Partida derivada por FinTarget: "+why+"."});};
  const z=()=>years.map(()=>0),sum=(...a)=>years.map((y,i)=>a.reduce((s,v)=>s+(v?v[i]:0),0));
  let hdr=false;const memo=(arr)=>{if(!hdr){bal.push({id:"hD",l:"Partidas derivadas",t:"hdr"});hdr=true;}};
  if(!has.ta&&has.tle){memo();addD(bal,"ta","Activo total","tot",G("tle").slice(),"igual a pasivo + patrimonio");}
  if(!has.tl&&has.ta&&has.eq){memo();addD(bal,"tl","Pasivo total","sub",years.map((y,i)=>G("ta")[i]-G("eq")[i]),"activo total − patrimonio");}
  if(!has.eq&&has.ta&&has.tl){memo();addD(bal,"eq","Patrimonio total","sub",years.map((y,i)=>G("ta")[i]-G("tl")[i]),"activo total − pasivo total");}
  if(!has.debt){memo();addD(bal,"debt","Deuda financiera total","memo",sum(G("stb"),G("cpltd"),G("ltd"),G("lease")).map(Math.abs),"obligaciones financieras de corto y largo plazo + arrendamientos");}
  if(!has.cash){memo();addD(bal,"cash","Efectivo","memo",z(),"no se encontró en el archivo; se asume 0");}
  ["ta","tca","tl","tcl","eq"].forEach(id=>{if(!has[id])throw new Error("Falta una cuenta clave del balance: "+FI[id].l+". Asígnala en la tabla de cuentas.");});
  let ph=false;const pmemo=()=>{if(!ph){pyg.push({id:"hP",l:"Partidas derivadas",t:"hdr"});ph=true;}};
  if(!has.rev)throw new Error("Falta la cuenta de ingresos. Asígnala en la tabla de cuentas.");
  if(!has.gp&&has.cogs){pmemo();addD(pyg,"gp","Utilidad bruta","sub",years.map((y,i)=>G("rev")[i]-G("cogs")[i]),"ingresos − costo de ventas");}
  if(!has.gp){pmemo();addD(pyg,"gp","Utilidad bruta","sub",G("rev").slice(),"sin costo de ventas en el archivo; se iguala a ingresos");}
  if(!has.ebit&&has.opx){pmemo();addD(pyg,"ebit","Utilidad operativa (EBIT)","sub",years.map((y,i)=>G("gp")[i]-G("opx")[i]),"utilidad bruta − gastos operativos");}
  if(!has.ebit)throw new Error("Falta la utilidad operativa (EBIT). Asígnala en la tabla de cuentas.");
  if(!has.ebt){pmemo();addD(pyg,"ebt","Utilidad antes de impuestos","sub",years.map((y,i)=>G("ebit")[i]-Math.abs((G("iexp")||z())[i])+(G("iinc")||z())[i]),"EBIT − intereses + ingresos financieros");}
  if(!has.tax&&has.ni){pmemo();addD(pyg,"tax","Impuesto de renta","ln",years.map((y,i)=>G("ebt")[i]-G("ni")[i]),"utilidad antes de impuestos − utilidad neta");}
  if(!has.ni&&has.tax){pmemo();addD(pyg,"ni","Utilidad neta","tot",years.map((y,i)=>G("ebt")[i]-G("tax")[i]),"utilidad antes de impuestos − impuesto");}
  if(!has.ni)throw new Error("Falta la utilidad neta. Asígnala en la tabla de cuentas.");
  const map={};["rev","gp","ebit","ebt","tax","ni","ebitda","da","ta","tca","tl","tcl","eq","mi","cash","sti","ar","inv","ap","ppe","lti","re","debt"].forEach(x=>{if(has[x])map[x]=x;});
  if(has.nic)map.nic="nic";if(has.iexp)map.int="iexp";
  const um=UM[meta.unit]||1,usd=meta.cur==="USD"?um/1e6:um/4000/1e6;
  const maxTA=Math.max(...G("ta").map(Math.abs));
  const checks={bal:[["ta",["tl","eq"]]],pyg:[]};
  if(p.rows.some(r=>r.field==="gp")&&p.rows.some(r=>r.field==="cogs"))checks.pyg.push(["gp",["rev","-cogs"]]);
  const dec=Math.max(...G("rev").map(Math.abs))>=1e5?0:1;
  return {tk:"MI",name:meta.name,short:meta.name.split(" ").slice(0,2).join(" ").replace(/[,.]$/,""),exch:meta.listed?"Cotiza":"No cotiza",cur:meta.cur,unit:meta.cur+" "+meta.unit,div:1,dec,usd,um,country:meta.country,
    fy:"años "+years[0]+"–"+years[n-1],activity:meta.sectorName+" · "+meta.country,years,
    src:{name:"Archivo cargado: "+p.fname,url:"#dx",primary:"Estados financieros de la empresa",purl:"#dx"},origin:"Cargado por el usuario · "+p.fname,
    wacc:{v:10,note:"WACC calculado en DX"},beta:{bu:meta.bu,buSrc:meta.sectorName},capm:{rf:meta.rf,erp:meta.erp,crp:meta.crp,lam:meta.lam,src:"Supuestos de DX"},
    bal,pyg,checks,tol:Math.max(1,maxTA*0.0005),flags,map,aux:p.aux};
}

/* ======================= Sectores y supuestos ======================= */
const XS=[{n:"Textil y confección",bu:0.78,de:0.55},{n:"Servicios de información y pagos",bu:0.74,de:0.35},{n:"Farmacéutica",bu:0.85,de:0.35},{n:"Químicos",bu:0.85,de:0.45},{n:"Agroindustria",bu:0.65,de:0.60},{n:"Hoteles y turismo",bu:0.80,de:0.70},{n:"Inmobiliario",bu:0.55,de:0.90}];
const SECT=()=>api.S.map(s=>({n:s.n,bu:s.bu,de:s.de})).concat(XS);
const RT=[[8.5,"AAA",0.7],[6.5,"AA",0.9],[5.5,"A+",1.1],[4.25,"A",1.3],[3,"A−",1.6],[2.5,"BBB",2.0],[2.25,"BB+",2.5],[2,"BB",3.0],[1.75,"B+",3.6],[1.5,"B",4.5],[1.25,"B−",5.5],[0.8,"CCC",8.0],[-1e9,"CC",11]];
const rating=icr=>RT.find(t=>icr>=t[0]);
function defaultsFor(c,preset){
  const k=LY(c),m=A.M(c,k),P=api.P,col=c.country==="Colombia",g0=cagr(A.M(c,0).rev,m.rev,k),revUSD=m.rev*c.usd;
  const da=m.da!=null&&m.da>0?m.da:0,ppeD=k>0?m.ppe-A.M(c,k-1).ppe:0,capex=c.aux&&c.aux.capex&&c.aux.capex[k]!=null?c.aux.capex[k]:Math.max(0,ppeD+da);
  const sh=c.aux&&c.aux.shares&&c.aux.shares[k]?c.aux.shares[k]*c.um:Math.round((m.eq*c.um)/1000);
  const sects=SECT(),si=Math.max(0,sects.findIndex(s=>s.n===preset.sector));
  const start=clamp(g0==null?0.06:g0,0.02,0.12)*100;
  const s={sector:si,bu:sects[si].bu,rf:P.rf,erp:P.erp,crp:col?P.crp:0,lam:col?1:0,size:revUSD<25?3:revUSD<100?2:revUSD<500?1:0,t:+(m.t*100).toFixed(4),
    kdMode:"auto",kd:5,betaReg:"",waccMode:"bu",waccManual:10,growth:[0,1,2,3,4].map(j=>+(start-(start-4)*j/4).toFixed(1)),margin:+(m.em*100).toFixed(2),
    daPct:+(da/m.rev*100).toFixed(4),capexPct:+(capex/m.rev*100).toFixed(4),ktnoPct:+(m.ktno/m.rev*100).toFixed(4),g:col&&c.cur==="COP"?4:3,
    shares:sh,price:"",fixed:100,finNeed:Math.round(m.ta*0.05),finRate:null,issuePrice:"",piCOP:P.piCOP,piUSD:P.piUSD};
  Object.assign(s,preset.over||{});
  if(s.finRate==null)s.finRate=null;
  return s;
}

/* ======================= Modelo ======================= */
function model(c,s){
  const k=LY(c),m=A.M(c,k),n=c.years.length,t=s.t/100,P=api.P,fish=x=>c.cur==="COP"?((1+x/100)*(1+s.piCOP/100)/(1+s.piUSD/100)-1)*100:x;
  const de=m.debt/m.eq,sect=SECT()[s.sector],bu=+s.bu,bl=bu*(1+(1-t)*de);
  const keU=s.rf+bl*s.erp+s.lam*s.crp+s.size,cov=m.cov==null?99:m.cov,rt=rating(cov);
  const kdU=s.kdMode==="manual"?+s.kd:s.rf+s.lam*s.crp+rt[2],ke=fish(keU),kd=fish(kdU),wD=m.debt/(m.debt+m.eq),wE=1-wD;
  const waccBU=wE*ke+wD*kd*(1-t);
  const br=s.betaReg===""||s.betaReg==null?null:+s.betaReg,keReg=br!=null?fish(s.rf+br*s.erp+s.lam*s.crp):null,waccReg=br!=null?wE*keReg+wD*kd*(1-t):null;
  const sDE=sect.de,sBL=sect.bu*(1+(1-t)*sDE),sKe=fish(s.rf+sBL*s.erp+s.lam*s.crp),sW=sKe/(1+sDE)+sDE/(1+sDE)*kd*(1-t);
  const wacc=s.waccMode==="reg"&&waccReg!=null?waccReg:s.waccMode==="manual"?+s.waccManual:waccBU,w=wacc/100;
  const curve=[];for(let d=0;d<=2.0001;d+=0.05){const b=bu*(1+(1-t)*d),kk=fish(s.rf+b*s.erp+s.lam*s.crp+s.size);curve.push([d,kk/(1+d)+d/(1+d)*kd*(1-t)]);}
  // FCL histórico
  const H=c.years.map((y,i)=>{const q=A.M(c,i),da=q.da!=null&&q.da>0?q.da:0,prev=i>0?A.M(c,i-1):null,cx=c.aux&&c.aux.capex&&c.aux.capex[i]!=null?c.aux.capex[i]:(prev?Math.max(0,q.ppe-prev.ppe+da):null);
    const dk=prev?q.ktno-prev.ktno:null,uodi=q.ebit*(1-q.t);return {y,ebit:q.ebit,t:q.t,uodi,da,ktno:q.ktno,dk,capex:cx,fcl:prev&&cx!=null?uodi+da-dk-cx:null,ar:q.ar,inv:q.inv,ap:q.ap};});
  // proyección
  const Pj=[];let rev=m.rev,ktPrev=m.ktno;
  for(let j=0;j<5;j++){rev*=1+s.growth[j]/100;const ebit=rev*s.margin/100,uodi=ebit*(1-t),da=rev*s.daPct/100,kt=rev*s.ktnoPct/100,dk=kt-ktPrev,cx=rev*s.capexPct/100,fcl=uodi+da-dk-cx;ktPrev=kt;Pj.push({y:c.years[k]+j+1,g:s.growth[j]/100,rev,ebit,tax:ebit*t,uodi,da,kt,dk,cx,fcl});}
  const val=(ww,gg)=>{let pv=0;Pj.forEach((p,j)=>{pv+=p.fcl/Math.pow(1+ww,j+1);});const tv=Pj[4].fcl*(1+gg)/(ww-gg);return {pv,tv,pvtv:tv/Math.pow(1+ww,5),ev:pv+tv/Math.pow(1+ww,5)};};
  const g=s.g/100,V=w>g?val(w,g):null,netDebt=m.debt-m.cash,eqv=V?V.ev-netDebt:null,ps=eqv!=null&&s.shares?eqv*c.um/s.shares:null;
  const SW=[-1,-0.5,0,0.5,1],SG=[-0.5,0,0.5],sens=SW.map(dw=>SG.map(dg=>{const ww=w+dw/100,gg=g+dg/100;if(ww<=gg)return null;const v=val(ww,gg).ev-netDebt;return s.shares?v*c.um/s.shares:v;}));
  // apalancamiento
  const fx_=s.fixed/100,cv=m.cogs+m.opex*(1-fx_),cf=m.opex*fx_,mc=m.rev-cv,I=m.intr||0,gao=m.ebit>0?mc/m.ebit:null,gaf=m.ebit-I>0?m.ebit/(m.ebit-I):null,pe=cf/(mc/m.rev);
  const Fin=+s.finNeed,kdNew=(s.finRate==null||s.finRate===""?kd:+s.finRate)/100,price=+(s.issuePrice||(s.price||(m.eq*c.um/s.shares))),nB=+s.shares,nA=nB+Fin*c.um/price,IB=I+Fin*kdNew;
  const ebitStar=(IB*nA-I*nB)/(nA-nB),upa=(e,i,nn)=>{const u=e-i;return (u-Math.max(0,u)*t)*c.um/nn;};
  // EVA y riesgo
  const EV=c.years.map((y,i)=>{const q=A.M(c,i);return {y,nopat:q.nopat,ic:q.ic,roic:q.roic,eva:q.nopat-w*q.ic};});
  const az=A.altz(c,k),rm=A.ratingModel(c,k),pd=A.pdModel(c,k);
  return {k,m,t,de,bu,bl,keU,ke,kdU,kd,rt,cov,wD,wE,waccBU,keReg,waccReg,sW,sDE,sBL,sKe,sect,wacc,w,curve,H,Pj,V,netDebt,eqv,ps,g,sens,SW,SG,
    lev:{cv,cf,mc,I,gao,gaf,gat:gao&&gaf?gao*gaf:null,pe,ms:(m.rev-pe)/m.rev},upa:{Fin,kdNew,price,nA,nB,IB,ebitStar,A:upa(m.ebit,I,nA),B:upa(m.ebit,IB,nB),f:upa},EV,az,rm,pd};
}

/* ======================= Interfaz ======================= */
const STEPS=["Cargar archivo","Revisar cuentas","Informe y documentos"];
function steps(){$("dx-steps").innerHTML=STEPS.map((s,i)=>'<li class="'+(st.step===i+1?"on":st.step>i+1?"done":"")+'"><b>'+(i+1)+'</b>'+s+'</li>').join("");}
function render(){steps();({1:renderLoad,2:renderMap,3:renderReport})[st.step]();const has=!!st.R;document.querySelectorAll(".dx-act").forEach(b=>b.hidden=!has||st.step!==3);}
function renderLoad(){
  $("dx-body").innerHTML='<div class="dx-load"><div><label class="drop" id="dx-drop" for="dx-file"><input type="file" id="dx-file" accept=".xlsx,.xls,.csv" hidden><span class="drop-ico" aria-hidden="true">⇪</span><b>Arrastra aquí el Excel o CSV de tu empresa</b><span>o haz clic para elegirlo · balance y estado de resultados, de 2 a 10 años</span></label>'+
   '<div class="insp-k" style="margin-top:18px">O prueba con un archivo real</div><div class="dx-ex"><button type="button" class="ov-card" data-ex="visa"><code>XLSX · 7 hojas</code><b>Taller FCL y Apalancamiento · VISA</b><span>Tu archivo del taller, formato Investing.com, USD millones</span></button><button type="button" class="ov-card" data-ex="pyme"><code>XLSX · NIIF Pymes</code><b>Confecciones del Caribe S.A.S.</b><span>PYME colombiana de ejemplo, formato Supersociedades, COP miles</span></button></div>'+
   (st.err?'<div class="dx-err" role="alert">'+esc(st.err)+'</div>':"")+'</div>'+
   '<div class="card panel"><h3>Qué recibes</h3><div class="sub">En menos de un minuto, desde dos estados financieros</div><div class="deliv">'+
   [["V/H","análisis vertical, horizontal, índice y CAGR"],["Ratios","liquidez, endeudamiento, actividad, rentabilidad, DuPont"],["WACC","beta del sector reapalancada, prima país, tamaño, rating sintético"],["FCL","histórico y proyectado a cinco años"],["DCF","valor de la empresa, del patrimonio y por acción, con sensibilidad"],["GAO · GAF","punto de equilibrio y apalancamiento total"],["UPA","punto de indiferencia deuda o acciones"],["EVA","ROIC frente al WACC año a año"],["Riesgo","Altman Z'', rating sintético y modelo"],["Excel","13 hojas con fórmulas vivas y fuentes"]].map(d=>'<div><code>'+d[0]+'</code><span>'+d[1]+'</span></div>').join("")+
   '</div><div class="insp-k">Formatos que reconoce</div><p class="note" style="margin-top:0">Exportes de Investing.com y Bloomberg, estados NIIF plenas y Pymes de Supersociedades, exportes de Siigo, World Office y SAP, y cualquier hoja con una cuenta por fila y un año por columna.</p><p class="note">El archivo se procesa en tu navegador.</p></div></div>';
  const inp=$("dx-file"),drop=$("dx-drop");
  inp.addEventListener("change",()=>{if(inp.files[0])readFile(inp.files[0]);});
  ["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add("over");}));
  ["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove("over");}));
  drop.addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f)readFile(f);});
}
const PRESETS={
 visa:{file:"ejemplos/Taller-FCL-VISA.xlsx",meta:{name:"Visa Inc.",country:"Estados Unidos",cur:"USD",unit:"millones",sector:"Servicios de información y pagos"},
   over:{bu:0.74,rf:4.72,erp:4.33,crp:0,lam:0,size:0,kdMode:"manual",kd:5,betaReg:0.7649,waccMode:"reg",growth:[11,10.5,9.5,9,8.5],g:3,price:223.647,finNeed:5000,finRate:5,issuePrice:223.647,fixed:100},
   check:{ps:434.078,gao:1.459,ebitStar:22823.451,label:"Taller FCL y Apalancamiento VISA"}},
 pyme:{file:"ejemplos/PYME-Confecciones-del-Caribe.xlsx",meta:{name:"Confecciones del Caribe S.A.S.",country:"Colombia",cur:"COP",unit:"miles",sector:"Textil y confección"},over:{fixed:75,shares:1500000}}
};
function loadExample(key){const p=PRESETS[key];st.preset=p;st.err=null;
  fetch(p.file).then(r=>{if(!r.ok)throw new Error("No pude abrir el ejemplo ("+r.status+").");return r.arrayBuffer();}).then(b=>parse(b,p.file.split("/").pop())).catch(e=>{st.err=e.message+" Abre el mockup desde el servidor local para cargar los ejemplos.";render();});}
function readFile(f){st.preset=null;st.err=null;f.arrayBuffer().then(b=>parse(b,f.name)).catch(e=>{st.err=e.message;render();});}
function parse(buf,name){
  if(!window.XLSX){st.err="No se cargó el lector de Excel (SheetJS). Revisa la conexión a internet.";render();return;}
  try{const wb=XLSX.read(buf,{type:"array"});st.parsed=parseWorkbook(wb,name);st.fname=name;
    const pm=st.preset?st.preset.meta:{};st.meta={name:pm.name||st.parsed.name,country:pm.country||(st.parsed.cur==="COP"?"Colombia":"Estados Unidos"),cur:pm.cur||st.parsed.cur,unit:pm.unit||st.parsed.unit,sector:pm.sector||(st.parsed.cur==="COP"?"Comercio minorista":"Software y servicios TI"),listed:!!(st.preset&&st.preset.over&&st.preset.over.price)};
    st.step=2;st.err=null;render();window.scrollTo(0,0);}
  catch(e){st.err=e.message;st.step=1;render();}
}
function renderMap(){
  const p=st.parsed,rows=p.rows.filter(r=>!r.hdr),mapped=rows.filter(r=>r.field).length,low=rows.filter(r=>r.field&&r.conf<0.85).length,k=p.years.length-1;
  const opts=(sel,stn)=>'<option value="">— Sin asignar (se conserva) —</option>'+["bal","pyg"].map(s=>'<optgroup label="'+(s==="bal"?"Balance":"Estado de resultados")+'">'+F.filter(f=>f[1]===s).map(f=>'<option value="'+f[0]+'"'+(sel===f[0]?" selected":"")+'>'+f[2]+'</option>').join("")+'</optgroup>').join("");
  const sects=SECT();
  $("dx-body").innerHTML='<div class="tiles" style="margin-bottom:16px">'+tile("Archivo",esc(p.fname.length>26?p.fname.slice(0,24)+"…":p.fname),p.sheets.length+" hojas · balance en «"+esc(p.bs)+"», resultados en «"+esc(p.ps)+"»")+tile("Años",p.years[0]+"–"+p.years[k],p.years.length+" ejercicios")+tile("Cuentas leídas",rows.length,mapped+" reconocidas automáticamente",1)+tile("Para revisar",low+(rows.length-mapped),low+" con confianza media · "+(rows.length-mapped)+" sin asignar")+'</div>'+
   '<div class="card panel" style="margin-bottom:16px"><h3>Datos de la empresa</h3><div class="sub">Detectados del archivo; corrígelos si hace falta</div><div class="dx-grid">'+
   '<div class="field"><label for="dm-name">Nombre</label><input id="dm-name" value="'+attr(st.meta.name)+'"></div>'+
   '<div class="field"><label for="dm-country">País</label><select id="dm-country">'+["Colombia","Estados Unidos","Perú","Chile","México","Otro"].map(x=>'<option'+(x===st.meta.country?" selected":"")+'>'+x+'</option>').join("")+'</select></div>'+
   '<div class="field"><label for="dm-cur">Moneda</label><select id="dm-cur"><option'+(st.meta.cur==="COP"?" selected":"")+'>COP</option><option'+(st.meta.cur==="USD"?" selected":"")+'>USD</option></select></div>'+
   '<div class="field"><label for="dm-unit">Unidad de las cifras</label><select id="dm-unit">'+["unidades","miles","millones"].map(x=>'<option'+(x===st.meta.unit?" selected":"")+'>'+x+'</option>').join("")+'</select></div>'+
   '<div class="field"><label for="dm-sector">Sector</label><select id="dm-sector">'+sects.map(s=>'<option'+(s.n===st.meta.sector?" selected":"")+'>'+esc(s.n)+'</option>').join("")+'</select></div></div></div>'+
   '<div class="card" style="min-width:0"><div class="toolbar"><b style="font-size:14px">Cuentas del archivo</b><span class="note" style="margin:0">Cada fila se conserva en el análisis; el campo FinTarget le dice al motor qué es</span><div class="right"><button type="button" class="btn ghost" id="dx-back">← Otro archivo</button><button type="button" class="btn" id="dx-go">Generar análisis →</button></div></div>'+
   (st.err?'<div class="dx-err" role="alert" style="margin:12px">'+esc(st.err)+'</div>':"")+
   '<div class="tbl-scroll"><table class="mini-table dx-map"><thead><tr><th>Cuenta en el archivo</th><th>Estado</th><th>'+p.years[k]+'</th><th style="text-align:left">Campo FinTarget</th><th style="text-align:left">Confianza</th></tr></thead><tbody>'+
   p.rows.map((r,i)=>r.hdr?'<tr class="t-hdr"><td colspan="5" style="font:600 11px var(--f-body);letter-spacing:.08em;text-transform:uppercase;color:var(--sub);padding-top:12px">'+esc(r.label)+'</td></tr>':
     '<tr><td>'+esc(r.label)+'</td><td style="font-family:var(--f-body)">'+(r.st==="bal"?"Balance":"Resultados")+'</td><td>'+(r.v[k]==null?"—":nf(r.v[k],Math.abs(r.v[k])>=1000?0:1))+'</td><td style="text-align:left"><select data-row="'+i+'" aria-label="Campo para '+attr(r.label)+'">'+opts(r.field)+'</select></td><td style="text-align:left">'+(r.field?(r.conf>=0.85?'<span class="badge ok">'+nf(r.conf*100,0)+'%</span>':'<span class="badge gold">'+nf(r.conf*100,0)+'% · revisar</span>'):'<span class="badge">sin asignar</span>')+'</td></tr>').join("")+
   '</tbody></table></div></div>';
  $("dx-body").querySelectorAll("select[data-row]").forEach(s=>s.addEventListener("change",()=>{const i=+s.dataset.row,v=s.value;p.rows.forEach((r,j)=>{if(j!==i&&r.field===v&&v)r.field=null;});p.rows[i].field=v||null;p.rows[i].conf=v?1:0;if(v)p.rows[i].st=FI[v].st;renderMap();}));
  ["dm-name","dm-country","dm-cur","dm-unit","dm-sector"].forEach(id=>$(id).addEventListener("change",e=>{const k2={"dm-name":"name","dm-country":"country","dm-cur":"cur","dm-unit":"unit","dm-sector":"sector"}[id];st.meta[k2]=e.target.value;}));
  $("dx-back").onclick=()=>{st.step=1;render();};
  $("dx-go").onclick=generate;
}
function generate(){
  try{const sects=SECT(),sec=sects.find(s=>s.n===st.meta.sector)||sects[0],P=api.P,col=st.meta.country==="Colombia";
    const meta=Object.assign({},st.meta,{sectorName:sec.n,bu:sec.bu,rf:P.rf,erp:P.erp,crp:col?P.crp:0,lam:col?1:0});
    const c=buildCompany(st.parsed,meta);A.registerCompany(c);
    const pre=st.preset||{};st.sup=defaultsFor(c,{sector:sec.n,over:Object.assign({},pre.over||{})});
    if(pre.over&&pre.over.bu!=null)st.sup.bu=pre.over.bu;
    st.company=c;st.step=3;st.err=null;recompute();render();window.scrollTo(0,0);}
  catch(e){st.err=e.message;renderMap();}
}
function recompute(){const c=st.company,s=st.sup;c.capm={rf:s.rf,erp:s.erp,crp:s.crp,lam:s.lam,src:"Supuestos de DX"};c.beta={bu:s.bu,buSrc:SECT()[s.sector].n,raw:s.betaReg===""?null:+s.betaReg,blume:s.betaReg===""?null:0.67*s.betaReg+0.33};
  st.R=model(c,s);c.wacc={v:+st.R.wacc.toFixed(2),note:"WACC "+nf(st.R.wacc,2)+"% calculado en DX"};c._dq=null;}

/* ---------- Informe ---------- */
const sec=(id,title,sub,body)=>'<section class="dx-sec" id="'+id+'"><div class="sec-head"><h2>'+title+'</h2><span>'+sub+'</span></div>'+body+'</section>';
function supForm(){const s=st.sup,c=st.company,sects=SECT(),f=(id,l,v,step,h)=>'<div class="field"><label for="ds-'+id+'">'+l+'</label><input id="ds-'+id+'" data-k="'+id+'" type="number" step="'+(step||"any")+'" value="'+(v==null?"":v)+'">'+(h?'<span class="hint">'+h+'</span>':"")+'</div>';
  return '<details class="card dx-sup" open><summary><b>Supuestos</b><span>Cambia cualquier valor y el informe se recalcula</span></summary><div class="dx-sup-g">'+
   '<div><h4>Costo de capital</h4><div class="field"><label for="ds-sector">Sector (beta desapalancada)</label><select id="ds-sector" data-k="sector">'+sects.map((x,i)=>'<option value="'+i+'"'+(i===s.sector?" selected":"")+'>'+esc(x.n)+' · βu '+nf(x.bu,2)+'</option>').join("")+'</select></div>'+
   '<div class="row2">'+f("bu","βu usada",s.bu,0.01,"FinTarget · comparables")+f("t","Impuesto (%)",s.t,0.1,"tasa efectiva "+c.years[LY(c)])+'</div><div class="row2">'+f("rf","Rf (%)",s.rf,0.01,"Tesoro EE. UU. 10a")+f("erp","ERP (%)",s.erp,0.01,"mercado maduro")+'</div><div class="row2">'+f("crp","Prima país (%)",s.crp,0.01,c.country)+f("size","Prima de tamaño (pp)",s.size,0.1,"por ventas en USD")+'</div>'+
   '<div class="row2"><div class="field"><label for="ds-kdMode">Costo de la deuda</label><select id="ds-kdMode" data-k="kdMode"><option value="auto"'+(s.kdMode==="auto"?" selected":"")+'>Rating sintético</option><option value="manual"'+(s.kdMode==="manual"?" selected":"")+'>Manual</option></select></div>'+f("kd","Kd manual antes de impuestos (%)",s.kd,0.01)+'</div>'+
   '<div class="row2">'+f("betaReg","Beta de regresión (si cotiza)",s.betaReg,0.001)+'<div class="field"><label for="ds-waccMode">WACC para valorar</label><select id="ds-waccMode" data-k="waccMode"><option value="bu"'+(s.waccMode==="bu"?" selected":"")+'>Beta del sector</option><option value="reg"'+(s.waccMode==="reg"?" selected":"")+'>Beta de regresión</option><option value="manual"'+(s.waccMode==="manual"?" selected":"")+'>Manual</option></select></div></div>'+f("waccManual","WACC manual (%)",s.waccManual,0.01)+'</div>'+
   '<div><h4>Proyección a cinco años</h4><div class="dx-g5">'+s.growth.map((g,j)=>f("g"+j,"Crec. "+(c.years[LY(c)]+j+1)+" (%)",g,0.1)).join("")+'</div><div class="row2">'+f("margin","Margen EBIT (%)",s.margin,0.1)+f("daPct","D&A / ingresos (%)",s.daPct,0.01)+'</div><div class="row2">'+f("capexPct","CAPEX / ingresos (%)",s.capexPct,0.01,c.aux&&c.aux.capex?"del archivo":"proxy ΔPP&E + D&A")+f("ktnoPct","KTNO / ingresos (%)",s.ktnoPct,0.01)+'</div><div class="row2">'+f("g","g perpetuo (%)",s.g,0.1)+f("shares","Acciones en circulación",s.shares,1)+'</div>'+f("price","Precio por acción (si cotiza)",s.price,0.001)+'</div>'+
   '<div><h4>Apalancamiento y financiación</h4>'+f("fixed","Gastos operativos fijos (%)",s.fixed,1,"el costo de ventas se trata como variable")+f("finNeed","Financiación adicional ("+esc(c.unit)+")",s.finNeed,1)+'<div class="row2">'+f("finRate","Tasa deuda nueva (%)",s.finRate==null?"":s.finRate,0.01,"vacío = Kd")+f("issuePrice","Precio de emisión",s.issuePrice,0.001,"vacío = precio o valor en libros")+'</div><div class="row2">'+f("piCOP","Inflación COP (%)",s.piCOP,0.1)+f("piUSD","Inflación USD (%)",s.piUSD,0.1)+'</div></div></div></details>';}
function bars(c,labels,vals,o){o=o||{};const W=600,H=o.H||230,mL=58,mR=8,mT=20,mB=30,vv=vals.filter(v=>v!=null),tk=nice(Math.min(0,...vv),Math.max(0,...vv),4),ys=v=>mT+(1-(v-tk[0])/(tk[tk.length-1]-tk[0]))*(H-mT-mB),gw=(W-mL-mR)/vals.length,bw=gw*.55;let g="";
  tk.forEach(t=>{g+='<line x1="'+mL+'" x2="'+(W-mR)+'" y1="'+r1(ys(t))+'" y2="'+r1(ys(t))+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(mL-6,ys(t)+4,U(c,t),{a:"end",fs:10,mono:1});});
  vals.forEach((v,i)=>{const x=mL+gw*i+(gw-bw)/2;g+=tx(x+bw/2,H-10,labels[i],{a:"middle",fs:10.5,mono:1});if(v==null)return;const top=ys(Math.max(0,v)),bot=ys(Math.min(0,v));const col=o.colors?o.colors[i]:(v>=0?CL.pos:CL.neg);
    g+='<rect x="'+r1(x)+'" y="'+r1(top)+'" width="'+r1(bw)+'" height="'+r1(Math.max(bot-top,1.5))+'" rx="2" fill="'+col+'" data-tip="'+attr(labels[i]+": "+U(c,v)+" "+esc(c.unit))+'"/>'+tx(x+bw/2,v>=0?top-5:bot+12,U(c,v),{a:"middle",fs:10.5,mono:1,fill:CL.ink});});
  return svg(W,H,o.label||"Barras",g);}
function waccCurve(R){const W=600,H=250,mL=50,mR=16,mT=14,mB=36,ys_=R.curve.map(p=>p[1]),tk=nice(Math.min(...ys_),Math.max(...ys_),4),xs=d=>mL+d/2*(W-mL-mR),ys=v=>mT+(1-(v-tk[0])/(tk[tk.length-1]-tk[0]))*(H-mT-mB);let g="";
  tk.forEach(t=>{g+='<line x1="'+mL+'" x2="'+(W-mR)+'" y1="'+r1(ys(t))+'" y2="'+r1(ys(t))+'" stroke="'+CL.grid+'"/>'+tx(mL-6,ys(t)+4,nf(t,1)+"%",{a:"end",fs:10,mono:1});});
  [0,0.5,1,1.5,2].forEach(d=>{g+=tx(xs(d),H-18,nf(d,1),{a:"middle",fs:10,mono:1});});g+=tx((mL+W-mR)/2,H-3,"Deuda / patrimonio (D/E)",{a:"middle",fs:11});
  g+='<path d="'+R.curve.map((p,i)=>(i?"L":"M")+r1(xs(p[0]))+" "+r1(ys(p[1]))).join(" ")+'" fill="none" stroke="'+CL.s[0]+'" stroke-width="2"/>';
  const dm=Math.min(R.de,2),ws=R.curve.reduce((a,p)=>Math.abs(p[0]-dm)<Math.abs(a[0]-dm)?p:a);
  g+='<circle cx="'+r1(xs(dm))+'" cy="'+r1(ys(ws[1]))+'" r="6" fill="'+CL.tot+'" stroke="#fff" stroke-width="2"/>'+tx(xs(dm)+10,ys(ws[1])-9,"Empresa: D/E "+nf(R.de,2),{fs:11,mono:1,fill:CL.ink});
  const ds=Math.min(R.sDE,2),wsec=R.curve.reduce((a,p)=>Math.abs(p[0]-ds)<Math.abs(a[0]-ds)?p:a);g+='<circle cx="'+r1(xs(ds))+'" cy="'+r1(ys(wsec[1]))+'" r="5" fill="#fff" stroke="'+CL.s[1]+'" stroke-width="2"/>'+tx(xs(ds)+9,ys(wsec[1])+16,"Mediana del sector "+nf(R.sDE,2),{fs:10.5,fill:CL.sub});
  for(let k=0;k<R.curve.length-1;k++){const p=R.curve[k];g+='<rect x="'+r1(xs(p[0]))+'" y="'+mT+'" width="'+r1(xs(R.curve[k+1][0])-xs(p[0]))+'" height="'+(H-mT-mB)+'" fill="transparent" data-tip="'+attr("D/E "+nf(p[0],2)+" → WACC "+nf(p[1],2)+"%")+'"/>';}
  return svg(W,H,"WACC según D/E",g);}
function keBuild(R,s){const comps=[["Rf",s.rf],["β × ERP",R.bl*s.erp]];if(s.lam*s.crp)comps.push(["Prima país",s.lam*s.crp]);if(s.size)comps.push(["Tamaño",s.size]);
  const bars_=[];let acc=0;comps.forEach(cc=>{bars_.push({l:cc[0],a:acc,b:acc+cc[1],t:"d",v:cc[1]});acc+=cc[1];});
  if(Math.abs(R.ke-R.keU)>0.01){bars_.push({l:"A pesos",a:acc,b:R.ke,t:"d",v:R.ke-acc});acc=R.ke;}bars_.push({l:"Ke",a:0,b:R.ke,t:"tot"});
  const pc={tk:"",div:1,dec:2,unit:"%"};return wfall(pc,bars_,600,260,"Construcción del Ke");}
function renderReport(){
  const c=st.company,s=st.sup,R=st.R,k=R.k,m=R.m,cu=c.cur,yL=c.years[k],sigs=A.signals(c,k),pr=st.preset&&st.preset.check;
  const ck=pr?[["Valor por acción (DCF)",R.ps,pr.ps,2],["GAO",R.lev.gao,pr.gao,3],["EBIT de indiferencia UPA",R.upa.ebitStar,pr.ebitStar,1]]:null;
  const lines=[["Ingresos","rev"],["Utilidad bruta","gp"],["Utilidad operativa","ebit"],["Utilidad neta","ni"],["Activo total","ta"],["Activo corriente","tca"],["Pasivo total","tl"],["Deuda financiera","debt"],["Patrimonio","eq"]];
  const ratios=[["Razón corriente","cr",v=>X(v)],["Prueba ácida","quick",v=>X(v)],["Pasivo / activo","la",v=>P1(v)],["Deuda fin. / patrimonio","de",v=>X(v)],["EBIT / intereses","cov",v=>X(v,1)],["Rotación del activo","at",v=>X(v)],["Días de cartera","dso",v=>nf(v,0)],["Margen bruto","gm",v=>P1(v)],["Margen EBIT","em",v=>P1(v)],["Margen neto","nm",v=>P1(v)],["ROA","roa",v=>P1(v)],["ROE","roe",v=>P1(v)],["ROIC","roic",v=>P1(v)]];
  const toc=[["dx-r1","Resumen"],["dx-r2","Vertical y horizontal"],["dx-r3","Indicadores"],["dx-r4","Costo de capital"],["dx-r5","FCL histórico"],["dx-r6","Proyección y valoración"],["dx-r7","Apalancamiento y UPA"],["dx-r8","EVA y riesgo"],["dx-r9","Documentos"]];
  const h='<div class="dx-head card"><div><div class="gw-code">DX · '+esc(c.exch.toUpperCase())+' · '+esc(c.unit)+'</div><h2>'+esc(c.name)+'</h2><p>'+esc(c.activity)+' · '+c.years[0]+'–'+yL+' · '+esc(st.fname)+'</p></div><div class="actions dx-noprint"><button type="button" class="btn ghost" data-dx="fa">Abrir en FA</button><button type="button" class="btn ghost" data-dx="pres">Presentar</button><button type="button" class="btn ghost" data-dx="pdf">Informe PDF</button><button type="button" class="btn" data-dx="xlsx">Descargar Excel · 13 hojas</button></div></div>'+
   (ck?'<div class="dx-check">'+ck.map(x=>{const d=x[1]!=null?Math.abs(x[1]/x[2]-1):1;return '<span class="badge '+(d<0.002?"ok":"gold")+'">'+(d<0.002?"✓ ":"")+x[0]+': '+nf(x[1],x[3])+' · taller '+nf(x[2],x[3])+'</span>';}).join("")+'<span class="note" style="margin:0">Mismo archivo y supuestos que el '+esc(pr.label)+'</span></div>':"");
  const T=(head,rows)=>'<div class="tbl-scroll"><table class="mini-table"><thead><tr>'+head.map((x,i)=>'<th'+(i?"":' style="text-align:left"')+'>'+x+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr'+(r.hl?' class="hl"':"")+'>'+r.c.map((x,i)=>'<td'+(i?"":' style="font-family:var(--f-body)"')+'>'+x+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
  const vh=T(["Partida"].concat(c.years.map(String),["% base "+yL,"Var. "+yL,"CAGR"]),lines.map(([l,kk])=>{const vals=c.years.map((y,i)=>A.M(c,i)[kk]),base=kk==="rev"||kk==="gp"||kk==="ebit"||kk==="ni"?m.rev:m.ta,pv=A.M(c,k-1)[kk];return {c:[l].concat(vals.map(v=>U(c,v)),[P1(m[kk]/base),pv?SP((m[kk]-pv)/Math.abs(pv)):"n/a",(()=>{const g=cagr(vals[0],vals[k],k);return g==null?"n/a":SP(g);})()]),hl:kk==="rev"||kk==="ta"};}));
  const rt=T(["Indicador"].concat(c.years.map(String)),ratios.map(([l,kk,f])=>({c:[l].concat(c.years.map((y,i)=>f(A.M(c,i)[kk])))})));
  const wt=T(["Componente","Valor","Fuente"],[["βu del sector",nf(R.bu,2),esc(R.sect.n)],["D/E de la empresa (libros)",nf(R.de,2),"deuda financiera / patrimonio "+yL],["βL reapalancada (Hamada)",nf(R.bl,3),"βu × [1 + (1 − t) × D/E]"],["Ke en USD",nf(R.keU,2)+"%","Rf + βL × ERP + λ × CRP + tamaño"],["Ke en "+cu,nf(R.ke,2)+"%",cu==="COP"?"diferencial de inflación (Fisher)":"—"],["Cobertura de intereses",X(R.cov,1),"EBIT / gasto por intereses"],["Rating sintético",R.rt[1],"spread "+nf(R.rt[2],2)+" pp"],["Kd antes de impuestos ("+cu+")",nf(R.kd,2)+"%",s.kdMode==="manual"?"manual":"Rf + CRP + spread"],["Pesos deuda / patrimonio",P1(R.wD,1)+" / "+P1(R.wE,1),"valor en libros"]].map(r=>({c:r})).concat([{c:["WACC con beta del sector",nf(R.waccBU,2)+"%",s.waccMode==="bu"?"<b>usado para valorar</b>":""],hl:s.waccMode==="bu"}].concat(R.waccReg!=null?[{c:["WACC con beta de regresión",nf(R.waccReg,2)+"%",s.waccMode==="reg"?"<b>usado para valorar</b>":"β "+nf(+s.betaReg,3)],hl:s.waccMode==="reg"}]:[],s.waccMode==="manual"?[{c:["WACC manual",nf(+s.waccManual,2)+"%","<b>usado para valorar</b>"],hl:1}]:[],[{c:["Referencia: WACC del sector a su D/E mediana",nf(R.sW,2)+"%","D/E sector "+nf(R.sDE,2)]}])));
  const fh=T(["Concepto"].concat(c.years.map(String)),[["EBIT","ebit"],["Tasa efectiva","t",P1],["UODI = EBIT × (1 − t)","uodi"],["(+) D&A","da"],["KTNO = cartera + inventario − proveedores","ktno"],["(−) Variación del KTNO","dk"],["(−) CAPEX","capex"],["Flujo de caja libre","fcl"]].map(([l,kk,f])=>({c:[l].concat(R.H.map(h=>h[kk]==null?"—":(f?f(h[kk]):U(c,h[kk])))),hl:kk==="fcl"})));
  const fp=T(["Concepto",yL+" real"].concat(R.Pj.map(p=>p.y+"e")),[["Crecimiento",null,p=>P1(p.g)],["Ingresos",m.rev,p=>U(c,p.rev)],["EBIT",m.ebit,p=>U(c,p.ebit)],["UODI",R.H[k].uodi,p=>U(c,p.uodi)],["(+) D&A",R.H[k].da,p=>U(c,p.da)],["KTNO",m.ktno,p=>U(c,p.kt)],["(−) Variación del KTNO",null,p=>U(c,p.dk)],["(−) CAPEX",R.H[k].capex,p=>U(c,p.cx)],["FCL",R.H[k].fcl,p=>U(c,p.fcl)]].map(([l,b,f])=>({c:[l,b==null?"—":U(c,b)].concat(R.Pj.map(f)),hl:l==="FCL"})));
  const um=c.um,ps=R.ps,V=R.V;
  const dcf='<div class="tiles">'+tile("Valor de la empresa (EV)",V?U(c,V.ev):"n/a",esc(c.unit),1)+tile("(−) Deuda neta",U(c,R.netDebt),"deuda financiera − caja")+tile("Valor del patrimonio",R.eqv!=null?U(c,R.eqv):"n/a",esc(c.unit))+tile("Valor por acción",ps!=null?nf(ps,2):"n/a",cu+" · "+nf(+s.shares,0)+" acciones")+(s.price?tile("Precio de mercado",nf(+s.price,2),ps!=null?"potencial "+SP(ps/(+s.price)-1):""):tile("Valor terminal / EV",V?P1(V.pvtv/V.ev,0):"n/a","peso del valor terminal"))+'</div>';
  const sens='<div class="tbl-scroll"><table class="mini-table"><thead><tr><th style="text-align:left">WACC \\ g</th>'+R.SG.map(dg=>'<th>'+nf(R.g*100+dg,1)+'%</th>').join("")+'</tr></thead><tbody>'+R.SW.map((dw,i)=>'<tr'+(dw===0?' class="hl"':"")+'><td style="font-family:var(--f-body)">'+nf(R.wacc+dw,2)+'%</td>'+R.sens[i].map(v=>'<td>'+(v==null?"n/a":nf(v,s.shares?2:0))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
  const L=R.lev,u=R.upa;
  const lev='<div class="tiles">'+tile("Punto de equilibrio",U(c,L.pe),"ingresos · "+esc(c.unit))+tile("Margen de seguridad",P1(L.ms),"sobre ingresos "+yL)+tile("GAO",L.gao?X(L.gao,3):"n/a","margen de contribución / EBIT")+tile("GAF",L.gaf?X(L.gaf,3):"n/a","EBIT / (EBIT − intereses)")+tile("GAT",L.gat?X(L.gat,3):"n/a","GAO × GAF",1)+'</div>'+
   '<div class="tiles" style="margin-top:10px">'+tile("Financiación evaluada",U(c,u.Fin),esc(c.unit)+" · deuda al "+nf(u.kdNew*100,2)+"%")+tile("EBIT de indiferencia",U(c,u.ebitStar),"UPA deuda = UPA acciones",1)+tile("UPA con acciones",nf(u.A,2),cu+" por acción")+tile("UPA con deuda",nf(u.B,2),cu+" por acción")+'</div><p style="margin:10px 0 0">El EBIT de '+yL+' ('+U(c,m.ebit)+') está '+(m.ebit>u.ebitStar?"por encima":"por debajo")+' del punto de indiferencia: con estos supuestos conviene financiarse con <b>'+(m.ebit>u.ebitStar?"deuda":"acciones")+'</b>.</p>';
  const ev=R.EV.map(e=>e.eva);
  const risk='<div class="tiles">'+tile("Altman Z''",nf(R.az.z,2),"equivale a "+R.az.r)+tile("Rating sintético",R.rt[1],"cobertura "+X(R.cov,1))+tile("Rating modelo FinTarget",R.rm.r,"escalón "+nf(R.rm.n,1),1)+tile("Prob. de incumplimiento 1 año",P1(R.pd.pd,2),"modelo FinTarget")+'</div>';
  const docs='<div class="deliv">'+[["Portada","empresa, unidades, índice"],["Supuestos","cada supuesto con su fuente"],["Balance","valores + vertical + horizontal con fórmulas"],["PyG","valores + vertical + horizontal con fórmulas"],["Indicadores","13 razones por año"],["WACC","beta, Ke, Kd, pesos y WACC"],["FCL Histórico","UODI, D&A, KTNO, CAPEX, FCL"],["FCL Proyectado","proyección, DCF y sensibilidad WACC × g"],["Apalancamiento","punto de equilibrio, GAO, GAF, GAT y comprobación"],["UPA","punto de indiferencia y tabla por EBIT"],["EVA","NOPAT, capital invertido, ROIC y EVA"],["Riesgo","Altman Z'' y ratings"],["Calidad y mapeo","cuenta original → campo FinTarget, alertas"]].map(d=>'<div><code>'+d[0]+'</code><span>'+d[1]+'</span></div>').join("")+'</div><div class="linkrow dx-noprint"><button type="button" class="btn" data-dx="xlsx">Descargar Excel</button><button type="button" class="btn ghost" data-dx="pdf">Imprimir informe</button><button type="button" class="btn ghost" data-dx="pres">Presentación para gerencia</button></div>';
  const dqh='<div class="dq">'+A.dq(c).list.map(d=>'<div class="dq-item"><span class="stt '+(d.sev==="ok"?"good":d.sev==="alta"?"crit":d.sev==="media"?"warn":"info")+'"><i aria-hidden="true">'+(d.sev==="ok"?"✓":d.sev==="alta"?"✕":d.sev==="media"?"!":"i")+'</i></span><div><b>'+esc(d.title)+'</b><div style="color:var(--sub)">'+esc(d.msg)+'</div></div></div>').join("")+'</div>';
  $("dx-body").innerHTML='<div class="dx-rep"><nav class="dx-toc dx-noprint" aria-label="Secciones del informe">'+toc.map(t=>'<a href="#'+t[0]+'">'+t[1]+'</a>').join("")+'<button type="button" class="btn ghost" id="dx-restart" style="margin-top:12px">Cargar otro archivo</button></div><div class="dx-main">'+h+supForm()+
   sec("dx-r1","Resumen",c.years[0]+"–"+yL+" · "+esc(c.unit),'<div class="tiles">'+tile("Ingresos "+yL,U(c,m.rev),SP(m.rev/A.M(c,k-1).rev-1)+" vs "+c.years[k-1])+tile("Margen EBIT",P1(m.em),"")+tile("Utilidad neta",U(c,m.ni),"margen "+P1(m.nm))+tile("ROE",P1(m.roe),"")+tile("WACC",nf(R.wacc,2)+"%","ROIC "+P1(m.roic))+tile("EVA "+yL,U(c,R.EV[k].eva),esc(c.unit),1)+'</div><div class="ger-grid" style="margin-top:14px"><div class="card panel"><h3>Señales</h3><div class="sub">Umbrales generales de referencia</div>'+sigHTML(sigs)+'</div>'+card("De cada 100 "+cu+" de ingresos, "+yL,"Del ingreso a la utilidad neta",chCada100(c,k))+'</div>')+
   sec("dx-r2","Análisis vertical y horizontal","Partidas clave · la tabla completa está en FA",vh+'<div class="charts" style="margin-top:14px">'+card("Estructura del balance","Activo y financiación como % del activo",chEstructura(c))+card("Qué creció más rápido","Tasa compuesta anual",chCrec(c))+'</div>')+
   sec("dx-r3","Indicadores","Liquidez, endeudamiento, actividad y rentabilidad",rt)+
   sec("dx-r4","Costo de capital","Beta del sector reapalancada con la estructura de la empresa",'<div class="charts">'+card("Del Rf al Ke","Puntos porcentuales · "+cu,keBuild(R,s))+card("WACC según el apalancamiento","Curva con la beta del sector · la empresa y la mediana del sector marcadas",waccCurve(R))+'</div><div style="margin-top:14px">'+wt+'</div>')+
   sec("dx-r5","Flujo de caja libre histórico",esc(c.unit)+(c.aux&&c.aux.capex?" · CAPEX tomado del archivo ("+esc(c.aux.capexSrc||"")+")":" · CAPEX aproximado con ΔPP&E + D&A"),fh+'<div style="margin-top:14px">'+card("Flujo de caja libre","Histórico y proyectado · "+esc(c.unit),bars(c,R.H.slice(1).map(h=>String(h.y)).concat(R.Pj.map(p=>p.y+"e")),R.H.slice(1).map(h=>h.fcl).concat(R.Pj.map(p=>p.fcl)),{colors:R.H.slice(1).map(()=>CL.tot).concat(R.Pj.map(()=>CL.pos)),label:"FCL"}))+'</div>')+
   sec("dx-r6","Proyección y valoración","DCF a cinco años con WACC de "+nf(R.wacc,2)+"% y g de "+nf(R.g*100,1)+"%",fp+'<div style="margin-top:14px">'+dcf+'</div><div class="insp-k">Sensibilidad · '+(s.shares?"valor por acción":"valor del patrimonio")+'</div>'+sens)+
   sec("dx-r7","Apalancamiento y UPA","Costo de ventas variable · "+nf(s.fixed,0)+"% de los gastos operativos fijo",lev)+
   sec("dx-r8","EVA y riesgo crediticio","WACC de "+nf(R.wacc,2)+"%",'<div class="charts">'+card("EVA por año",esc(c.unit),bars(c,c.years.map(String),ev,{label:"EVA"}))+'<div>'+risk+'<div class="card panel" style="margin-top:12px"><h3>Calidad de datos</h3><div class="sub">Controles sobre el archivo cargado</div>'+dqh+'</div></div></div>')+
   sec("dx-r9","Documentos","Excel con fórmulas vivas, informe y presentación",docs)+'</div></div>';
  bindReport();
}
function bindReport(){
  const body=$("dx-body");
  body.querySelectorAll("[data-k]").forEach(el=>el.addEventListener("change",()=>{const k=el.dataset.k,s=st.sup,v=el.value;
    if(/^g\d$/.test(el.id.replace("ds-","")))s.growth[+el.id.slice(-1)]=+v;
    else if(k==="sector"){s.sector=+v;s.bu=SECT()[+v].bu;}
    else if(k==="kdMode"||k==="waccMode")s[k]=v;
    else if(k==="betaReg"||k==="price"||k==="issuePrice"||k==="finRate")s[k]=v===""?(k==="finRate"?null:""):+v;
    else s[k]=+v;
    const y=window.scrollY;recompute();renderReport();window.scrollTo(0,y);}));
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-dx]");if(b){const a=b.dataset.dx;
    if(a==="fa"){A.setCompany("MI");api.show("fa");}
    else if(a==="pres"){A.setCompany("MI");A.openPres();}
    else if(a==="pdf"){document.body.classList.add("print-dx");window.print();setTimeout(()=>document.body.classList.remove("print-dx"),500);}
    else if(a==="xlsx")downloadXLSX();return;}
  const ex=e.target.closest("[data-ex]");if(ex&&!$("v-dx").hidden){loadExample(ex.dataset.ex);return;}
  if(e.target.id==="dx-restart"){st.step=1;st.err=null;render();window.scrollTo(0,0);}
});

/* ======================= Excel con fórmulas vivas ======================= */
function buildXLSX(){
  const c=st.company,s=st.sup,R=st.R,yrs=c.years,n=yrs.length,k=R.k,wb=XLSX.utils.book_new(),C_=i=>XLSX.utils.encode_col(i);
  const NUM="#,##0"+(c.dec?".0":""),PCT="0.0%",PC2="0.00%";
  const add=(name,rows,w)=>{const ws={};let mc=0;rows.forEach((row,ri)=>(row||[]).forEach((cell,ci)=>{if(cell==null||cell==="")return;const a=XLSX.utils.encode_cell({r:ri,c:ci});let o;
      if(typeof cell==="object"){o={};if(cell.f)o.f=cell.f.replace(/^=/,"");const v=cell.v;o.v=v==null||(typeof v==="number"&&!isFinite(v))?(cell.f?0:""):v;o.t=typeof o.v==="string"?"s":"n";if(cell.z)o.z=cell.z;}
      else if(typeof cell==="number")o={t:"n",v:cell,z:NUM};else o={t:"s",v:String(cell)};ws[a]=o;mc=Math.max(mc,ci);}));
    ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(0,rows.length-1),c:mc}});if(w)ws["!cols"]=w.map(x=>({wch:x}));XLSX.utils.book_append_sheet(wb,ws,name);};
  const fv=(f,v,z)=>({f,v,z:z||NUM});
  // Supuestos
  const SU={},sup=[["FinTarget · Supuestos del diagnóstico"],[c.name+" · cifras en "+c.unit],[],["Supuesto","Valor","Fuente"]];
  const putS=(key,l,v,z,src)=>{sup.push([l,{v,z:z||NUM},src||""]);SU[key]="Supuestos!$B$"+sup.length;};
  putS("rf","Tasa libre de riesgo (Rf)",s.rf/100,PC2,"Tesoro EE. UU. 10 años · FinTarget");putS("erp","Prima de mercado (ERP)",s.erp/100,PC2,"Mercado maduro · FinTarget");putS("crp","Prima país (CRP)",s.crp/100,PC2,c.country);putS("lam","Exposición país (λ)",s.lam,"0.00","1 si opera en el país");
  putS("size","Prima de tamaño",s.size/100,PC2,"Según ventas en USD");putS("bu","Beta desapalancada del sector (βu)",+s.bu,"0.000",SECT()[s.sector].n);putS("t","Tasa de impuestos",s.t/100,PC2,"Tasa efectiva "+yrs[k]);
  putS("spread","Spread del rating sintético",R.rt[2]/100,PC2,"Rating "+R.rt[1]+" por cobertura de intereses");putS("kdman","Kd manual (0 = usar rating)",s.kdMode==="manual"?s.kd/100:0,PC2,"Supuesto del usuario");
  putS("beta","Beta de regresión (si cotiza)",s.betaReg===""?0:+s.betaReg,"0.000","Regresión contra el índice");putS("pic","Inflación esperada COP",s.piCOP/100,PC2,"BanRep");putS("piu","Inflación esperada USD",s.piUSD/100,PC2,"FRED");
  putS("cop",'Moneda en pesos (1 = sí)',c.cur==="COP"?1:0,"0","Conversión por diferencial de inflación");putS("wmode","WACC para valorar (1 sector, 2 regresión, 3 manual)",s.waccMode==="bu"?1:s.waccMode==="reg"?2:3,"0","Supuesto del usuario");putS("wman","WACC manual",s.waccManual/100,PC2,"Supuesto del usuario");
  s.growth.forEach((g,j)=>putS("g"+j,"Crecimiento de ingresos "+(yrs[k]+j+1),g/100,PCT,"Supuesto del usuario"));
  putS("mg","Margen EBIT proyectado",s.margin/100,PCT,"Margen "+yrs[k]);putS("dap","D&A / ingresos",s.daPct/100,PC2,"Histórico "+yrs[k]);putS("cxp","CAPEX / ingresos",s.capexPct/100,PC2,c.aux&&c.aux.capex?"Del archivo":"ΔPP&E + D&A");putS("ktp","KTNO / ingresos",s.ktnoPct/100,PC2,"Histórico "+yrs[k]);
  putS("gp","Crecimiento perpetuo (g)",s.g/100,PCT,"Supuesto del usuario");putS("sh","Acciones en circulación",+s.shares,"#,##0","Archivo o supuesto");putS("px","Precio por acción",+s.price||0,"#,##0.00","Mercado");putS("um","Multiplicador de unidades",c.um,"#,##0",c.unit);
  putS("fix","Gastos operativos fijos",s.fixed/100,PCT,"Supuesto del usuario");putS("fin","Financiación adicional",R.upa.Fin,NUM,"Escenario UPA");putS("kdn","Tasa de la deuda nueva",R.upa.kdNew,PC2,"Escenario UPA");putS("ip","Precio de emisión",R.upa.price,"#,##0.00","Escenario UPA");
  add("Portada",[["FinTarget · Diagnóstico financiero"],[c.name],["Archivo de origen",st.fname],["Cifras en",c.unit],["Años",yrs[0]+"–"+yrs[n-1]],["Generado",new Date().toISOString().slice(0,10)],[],["Hoja","Contenido"],["Supuestos","Cada supuesto con su fuente; cambiarlos recalcula todo el libro"],["Balance","Valores, análisis vertical y horizontal"],["PyG","Valores, análisis vertical y horizontal"],["Indicadores","Razones financieras por año"],["WACC","Beta, Ke, Kd, pesos y WACC"],["FCL Histórico","Flujo de caja libre por año"],["FCL Proyectado","Proyección, DCF y sensibilidad"],["Apalancamiento","Punto de equilibrio, GAO, GAF y GAT"],["UPA","Indiferencia entre deuda y acciones"],["EVA","Valor económico agregado"],["Riesgo","Altman Z'' y ratings"],["Calidad y mapeo","Cuentas del archivo y alertas"],[],["Material analítico. No constituye asesoría de inversión."]],[28,70]);
  add("Supuestos",sup,[48,16,48]);
  // Estados
  const RF={bal:{},pyg:{}};
  const stmt=(stn,title,baseId)=>{const rows=[[title],[c.name+" · "+c.unit],[],["Cuenta"].concat(yrs,[""],yrs.map(y=>"V "+y),[""],yrs.slice(1).map(y=>"H "+y))];const list=c[stn].filter(r=>r.t!=="hdr"&&r.v);
    list.forEach((r,j)=>{RF[stn][r.id]=5+j;});const br=RF[stn][baseId];
    list.forEach((r,j)=>{const row=5+j,out=[r.l];r.v.forEach(v=>out.push({v,z:NUM}));out.push("");
      r.v.forEach((v,i)=>{const cl=C_(1+i);out.push(fv("IFERROR("+cl+row+"/"+cl+"$"+br+",0)",c[stn].find(x=>x.id===baseId).v[i]?v/c[stn].find(x=>x.id===baseId).v[i]:0,PCT));});out.push("");
      r.v.slice(1).forEach((v,i)=>{const a=C_(1+i),b=C_(2+i),p=r.v[i];out.push(fv('IFERROR('+b+row+"/"+a+row+'-1,"")',p?v/p-1:"",PCT));});rows.push(out);});
    add(stn==="bal"?"Balance":"PyG",rows,[46].concat(yrs.map(()=>14),[3],yrs.map(()=>10),[3],yrs.map(()=>10)));};
  stmt("bal","Estado de situación financiera","ta");stmt("pyg","Estado de resultados","rev");
  const B=(id,i)=>RF.bal[id]?"Balance!"+C_(1+i)+RF.bal[id]:null,Pq=(id,i)=>RF.pyg[id]?"PyG!"+C_(1+i)+RF.pyg[id]:null;
  const G0=(ref)=>ref||"0";
  const M_=i=>A.M(c,i);
  // Indicadores
  const ind=[["Indicadores financieros"],[c.name],[],["Indicador"].concat(yrs)];
  const IR=[["Razón corriente",i=>B("tca",i)+"/"+B("tcl",i),"cr","0.00"],["Pasivo / activo",i=>B("tl",i)+"/"+B("ta",i),"la",PCT],["Deuda financiera / patrimonio",i=>B("debt",i)+"/"+B("eq",i),"de","0.00"],["Margen bruto",i=>Pq("gp",i)+"/"+Pq("rev",i),"gm",PCT],["Margen EBIT",i=>Pq("ebit",i)+"/"+Pq("rev",i),"em",PCT],["Margen neto",i=>Pq("ni",i)+"/"+Pq("rev",i),"nm",PCT],["ROA",i=>Pq("ni",i)+"/"+B("ta",i),"roa",PCT],["ROE",i=>Pq("ni",i)+"/("+B("eq",i)+(B("mi",i)?"-"+B("mi",i):"")+")","roe",PCT],["Rotación del activo",i=>Pq("rev",i)+"/"+B("ta",i),"at","0.00"],["Días de cartera",i=>B("ar",i)?B("ar",i)+"/"+Pq("rev",i)+"*365":"0","dso","0"]];
  if(Pq("iexp",0))IR.push(["EBIT / intereses",i=>Pq("ebit",i)+"/ABS("+Pq("iexp",i)+")","cov","0.0"]);
  IR.forEach(([l,f,kk,z])=>ind.push([l].concat(yrs.map((y,i)=>fv("IFERROR("+f(i)+",0)",M_(i)[kk],z)))));
  add("Indicadores",ind,[34].concat(yrs.map(()=>12)));
  // WACC
  const L_=k,W=[["Costo de capital (WACC)"],[c.name+" · "+yrs[k]],[],["Concepto","Valor","Fórmula"]],WR={};
  const pw=(key,l,f,v,z,note)=>{W.push([l,fv(f,v,z),note||""]);WR[key]="B"+W.length;};
  pw("D","Deuda financiera",B("debt",L_),R.m.debt,NUM,"Balance");pw("E","Patrimonio",B("eq",L_),R.m.eq,NUM,"Balance");pw("de","D/E (libros)",WR.D+"/"+WR.E,R.de,"0.000","");
  pw("bl","Beta reapalancada (βL)",SU.bu+"*(1+(1-"+SU.t+")*"+WR.de+")",R.bl,"0.000","Hamada");
  pw("keu","Ke en USD",SU.rf+"+"+WR.bl+"*"+SU.erp+"+"+SU.lam+"*"+SU.crp+"+"+SU.size,R.keU/100,PC2,"CAPM con prima país y tamaño");
  pw("kdu","Kd en USD antes de impuestos","IF("+SU.kdman+">0,"+SU.kdman+","+SU.rf+"+"+SU.lam+"*"+SU.crp+"+"+SU.spread+")",R.kdU/100,PC2,"Rating sintético "+R.rt[1]+" o manual");
  pw("fx","Factor de conversión de moneda","IF("+SU.cop+"=1,(1+"+SU.pic+")/(1+"+SU.piu+"),1)",c.cur==="COP"?(1+s.piCOP/100)/(1+s.piUSD/100):1,"0.0000","Fisher");
  pw("ke","Ke en "+c.cur,"(1+"+WR.keu+")*"+WR.fx+"-1",R.ke/100,PC2,"");pw("kd","Kd en "+c.cur,"(1+"+WR.kdu+")*"+WR.fx+"-1",R.kd/100,PC2,"");pw("kdt","Kd después de impuestos",WR.kd+"*(1-"+SU.t+")",R.kd/100*(1-R.t),PC2,"");
  pw("wd","Peso de la deuda",WR.D+"/("+WR.D+"+"+WR.E+")",R.wD,PCT,"Valor en libros");pw("we","Peso del patrimonio","1-"+WR.wd,R.wE,PCT,"");
  pw("wbu","WACC con beta del sector",WR.we+"*"+WR.ke+"+"+WR.wd+"*"+WR.kdt,R.waccBU/100,PC2,"");
  pw("ker","Ke con beta de regresión","IF("+SU.beta+">0,(1+"+SU.rf+"+"+SU.beta+"*"+SU.erp+"+"+SU.lam+"*"+SU.crp+")*"+WR.fx+"-1,0)",R.keReg!=null?R.keReg/100:0,PC2,"");
  pw("wre","WACC con beta de regresión","IF("+SU.beta+">0,"+WR.we+"*"+WR.ker+"+"+WR.wd+"*"+WR.kdt+",0)",R.waccReg!=null?R.waccReg/100:0,PC2,"");
  pw("w","WACC usado para valorar","CHOOSE("+SU.wmode+","+WR.wbu+","+WR.wre+","+SU.wman+")",R.w,PC2,"Según el supuesto elegido");
  add("WACC",W,[38,16,40]);const WACC="WACC!$"+WR.w.replace(/(\D+)(\d+)/,"$1$$$2");
  // FCL histórico
  const H=[["Flujo de caja libre histórico"],[c.name+" · "+c.unit],[],["Concepto"].concat(yrs)],HR={};const ph=(key,l,f,v,z)=>{H.push([l].concat(yrs.map((y,i)=>{const ff=f(i);return ff==null?"":fv(ff,v(i),z);})));HR[key]=H.length;};
  const col=i=>C_(1+i);
  ph("ebit","EBIT",i=>Pq("ebit",i),i=>R.H[i].ebit);ph("t","Tasa efectiva",i=>"IFERROR("+Pq("tax",i)+"/"+Pq("ebt",i)+",0)",i=>R.H[i].t,PCT);
  ph("uodi","UODI = EBIT × (1 − t)",i=>col(i)+HR.ebit+"*(1-"+col(i)+HR.t+")",i=>R.H[i].uodi);
  ph("da","(+) Depreciación y amortización",i=>Pq("da",i)||(Pq("ebitda",i)?Pq("ebitda",i)+"-"+Pq("ebit",i):"0"),i=>R.H[i].da);
  ph("ar","Cuentas por cobrar",i=>G0(B("ar",i)),i=>R.H[i].ar);ph("inv","Inventarios",i=>G0(B("inv",i)),i=>R.H[i].inv);ph("ap","Proveedores",i=>G0(B("ap",i)),i=>R.H[i].ap);
  ph("kt","KTNO",i=>col(i)+HR.ar+"+"+col(i)+HR.inv+"-"+col(i)+HR.ap,i=>R.H[i].ktno);
  ph("dk","(−) Variación del KTNO",i=>i?col(i)+HR.kt+"-"+col(i-1)+HR.kt:null,i=>R.H[i].dk);
  const capexFile=c.aux&&c.aux.capex;ph("cx","(−) CAPEX",i=>i||capexFile?(capexFile&&c.aux.capex[i]!=null?String(c.aux.capex[i]):(i?"MAX(0,"+B("ppe",i)+"-"+B("ppe",i-1)+"+"+col(i)+HR.da+")":null)):null,i=>R.H[i].capex);
  ph("fcl","Flujo de caja libre",i=>i?col(i)+HR.uodi+"+"+col(i)+HR.da+"-"+col(i)+HR.dk+"-"+col(i)+HR.cx:null,i=>R.H[i].fcl);
  add("FCL Histórico",H,[38].concat(yrs.map(()=>14)));
  // FCL proyectado
  const pc=j=>C_(2+j),P_=[["Flujo de caja libre proyectado y valoración"],[c.name+" · "+c.unit],[],["Concepto",yrs[k]+" real"].concat(R.Pj.map(p=>p.y+"e"))],PR={};
  const pp=(key,l,base,f,v,z)=>{P_.push([l,base==null?"":base].concat(R.Pj.map((p,j)=>fv(f(j),v(p,j),z))));PR[key]=P_.length;};
  pp("g","Crecimiento de ingresos",null,j=>SU["g"+j],p=>p.g,PCT);
  P_.push(["Ingresos",fv(Pq("rev",k),R.m.rev)].concat(R.Pj.map((p,j)=>fv((j?pc(j-1):"B")+(P_.length+1)+"*(1+"+pc(j)+PR.g+")",p.rev))));PR.rev=P_.length;
  pp("ebit","EBIT = ingresos × margen",fv(Pq("ebit",k),R.m.ebit),j=>pc(j)+PR.rev+"*"+SU.mg,p=>p.ebit);
  pp("tax","(−) Impuesto",null,j=>pc(j)+PR.ebit+"*"+SU.t,p=>p.tax);
  pp("uodi","UODI",fv("'FCL Histórico'!"+col(k)+HR.uodi,R.H[k].uodi),j=>pc(j)+PR.ebit+"-"+pc(j)+PR.tax,p=>p.uodi);
  pp("da","(+) D&A",fv("'FCL Histórico'!"+col(k)+HR.da,R.H[k].da),j=>pc(j)+PR.rev+"*"+SU.dap,p=>p.da);
  pp("kt","KTNO",fv("'FCL Histórico'!"+col(k)+HR.kt,R.m.ktno),j=>pc(j)+PR.rev+"*"+SU.ktp,p=>p.kt);
  pp("dk","(−) Variación del KTNO",null,j=>pc(j)+PR.kt+"-"+(j?pc(j-1):"B")+PR.kt,p=>p.dk);
  pp("cx","(−) CAPEX",null,j=>pc(j)+PR.rev+"*"+SU.cxp,p=>p.cx);
  pp("fcl","Flujo de caja libre",null,j=>pc(j)+PR.uodi+"+"+pc(j)+PR.da+"-"+pc(j)+PR.dk+"-"+pc(j)+PR.cx,p=>p.fcl);
  pp("fd","Factor de descuento",null,j=>"1/(1+"+WACC+")^"+(j+1),(p,j)=>1/Math.pow(1+R.w,j+1),"0.0000");
  pp("vp","Valor presente del FCL",null,j=>pc(j)+PR.fcl+"*"+pc(j)+PR.fd,(p,j)=>p.fcl/Math.pow(1+R.w,j+1));
  const FR=pc(0)+PR.fcl+":"+pc(4)+PR.fcl,f5=pc(4)+PR.fcl;P_.push([]);
  const pv=(l,f,v,z)=>{P_.push([l,fv(f,v,z)]);return "B"+P_.length;};
  const rW=pv("WACC",WACC,R.w,PC2),rG=pv("Crecimiento perpetuo (g)",SU.gp,R.g,PCT),rSum=pv("Suma VP de los FCL","SUM("+pc(0)+PR.vp+":"+pc(4)+PR.vp+")",R.V?R.V.pv:0),rTV=pv("Valor terminal (Gordon)",f5+"*(1+"+rG+")/("+rW+"-"+rG+")",R.V?R.V.tv:0),rPTV=pv("VP del valor terminal",rTV+"/(1+"+rW+")^5",R.V?R.V.pvtv:0),rEV=pv("Valor de la empresa (EV)",rSum+"+"+rPTV,R.V?R.V.ev:0),rND=pv("(−) Deuda neta",B("debt",k)+"-"+B("cash",k),R.netDebt),rEQ=pv("Valor del patrimonio",rEV+"-"+rND,R.eqv||0),rPS=pv("Valor por acción","IFERROR("+rEQ+"*"+SU.um+"/"+SU.sh+",0)",R.ps||0,"#,##0.00");
  pv("Precio de mercado",SU.px,+s.price||0,"#,##0.00");pv("Potencial frente al precio","IFERROR("+rPS+"/"+SU.px+"-1,0)",s.price&&R.ps?R.ps/s.price-1:0,PCT);
  P_.push([]);P_.push(["Sensibilidad del valor por acción · WACC \\ g"].concat(R.SG.map(dg=>({v:R.g+dg/100,z:PCT}))));const sr=P_.length;
  R.SW.forEach((dw,i)=>{const r_=P_.length+1;P_.push([{f:rW+"+("+dw/100+")",v:R.w+dw/100,z:PC2}].concat(R.SG.map((dg,j)=>{const cc=C_(1+j);return fv("IFERROR((NPV($A"+r_+","+FR+")+"+f5+"*(1+"+cc+"$"+sr+")/($A"+r_+"-"+cc+"$"+sr+")/(1+$A"+r_+")^5-"+rND+")*"+SU.um+"/"+SU.sh+",0)",R.sens[i][j]||0,"#,##0.00");})));});
  add("FCL Proyectado",P_,[40,16].concat(R.Pj.map(()=>14)));
  // Apalancamiento
  const AP=[["Apalancamiento operativo, financiero y total"],[c.name+" · "+yrs[k]],[],["Concepto","Valor"]],AR={};const pa=(key,l,f,v,z)=>{AP.push([l,fv(f,v,z)]);AR[key]="B"+AP.length;};
  pa("v","Ventas",Pq("rev",k),R.m.rev);pa("cogs","Costo de ventas (variable)",Pq("rev",k)+"-"+Pq("gp",k),R.m.cogs);pa("opx","Gastos operativos",Pq("gp",k)+"-"+Pq("ebit",k),R.m.opex);
  pa("cv","Costos variables",AR.cogs+"+"+AR.opx+"*(1-"+SU.fix+")",R.lev.cv);pa("cf","Costos fijos",AR.opx+"*"+SU.fix,R.lev.cf);pa("mc","Margen de contribución",AR.v+"-"+AR.cv,R.lev.mc);pa("pmc","% margen de contribución",AR.mc+"/"+AR.v,R.lev.mc/R.m.rev,PCT);
  pa("ebit","EBIT",AR.mc+"-"+AR.cf,R.m.ebit);pa("pe","Punto de equilibrio en ingresos",AR.cf+"/"+AR.pmc,R.lev.pe);pa("ms","Margen de seguridad","("+AR.v+"-"+AR.pe+")/"+AR.v,R.lev.ms,PCT);
  pa("gao","GAO = MC / EBIT",AR.mc+"/"+AR.ebit,R.lev.gao||0,"0.000");pa("i","Gasto por intereses",Pq("iexp",k)?"ABS("+Pq("iexp",k)+")":"0",R.lev.I);pa("uai","UAI = EBIT − intereses",AR.ebit+"-"+AR.i,R.m.ebit-R.lev.I);
  pa("gaf","GAF = EBIT / UAI",AR.ebit+"/"+AR.uai,R.lev.gaf||0,"0.000");pa("gat","GAT = GAO × GAF",AR.gao+"*"+AR.gaf,R.lev.gat||0,"0.000");
  AP.push([]);AP.push(["Comprobación: ventas × 2","Base","Ventas × 2"]);const b0=AP.length+1;AP.push(["Ventas",fv(AR.v,R.m.rev),fv(AR.v+"*2",R.m.rev*2)]);AP.push(["Costos variables",fv(AR.cv,R.lev.cv),fv(AR.cv+"*2",R.lev.cv*2)]);AP.push(["Costos fijos",fv(AR.cf,R.lev.cf),fv(AR.cf,R.lev.cf)]);
  AP.push(["EBIT",fv("B"+b0+"-B"+(b0+1)+"-B"+(b0+2),R.m.ebit),fv("C"+b0+"-C"+(b0+1)+"-C"+(b0+2),R.m.rev*2-R.lev.cv*2-R.lev.cf)]);AP.push(["GAO verificado = %ΔEBIT / %ΔVentas",fv("(C"+(b0+3)+"/B"+(b0+3)+"-1)/(C"+b0+"/B"+b0+"-1)",R.lev.gao||0,"0.000")]);
  add("Apalancamiento",AP,[40,16,16]);
  // UPA
  const u=R.upa,UP=[["UPA: deuda o emisión de acciones"],[c.name],[],["Concepto","Valor"]],UR={};const pu=(key,l,f,v,z)=>{UP.push([l,fv(f,v,z)]);UR[key]="B"+UP.length;};
  pu("F","Financiación adicional",SU.fin,u.Fin);pu("kd","Tasa de la deuda nueva",SU.kdn,u.kdNew,PC2);pu("px","Precio de emisión",SU.ip,u.price,"#,##0.00");pu("nB","Acciones actuales (opción deuda)",SU.sh,u.nB,"#,##0");
  pu("I","Intereses actuales","Apalancamiento!"+AR.i,u.IB-u.Fin*u.kdNew);pu("t","Tasa de impuestos",SU.t,R.t,PC2);pu("IB","Intereses con deuda nueva",UR.I+"+"+UR.F+"*"+UR.kd,u.IB);pu("nA","Acciones con emisión (opción acciones)",UR.nB+"+"+UR.F+"*"+SU.um+"/"+UR.px,u.nA,"#,##0");
  pu("es","EBIT de indiferencia","("+UR.IB+"*"+UR.nA+"-"+UR.I+"*"+UR.nB+")/("+UR.nA+"-"+UR.nB+")",u.ebitStar);
  UP.push([]);UP.push(["EBIT","UPA con acciones","UPA con deuda"]);
  [0.4,0.6,0.8,1,1.2,1.4,1.6].forEach(fr=>{const e=R.m.ebit*fr,r_=UP.length+1;UP.push([{v:e,z:NUM},fv("(A"+r_+"-"+UR.I+"-MAX(0,A"+r_+"-"+UR.I+")*"+UR.t+")*"+SU.um+"/"+UR.nA,u.f(e,u.IB-u.Fin*u.kdNew,u.nA),"#,##0.00"),fv("(A"+r_+"-"+UR.IB+"-MAX(0,A"+r_+"-"+UR.IB+")*"+UR.t+")*"+SU.um+"/"+UR.nB,u.f(e,u.IB,u.nB),"#,##0.00")]);});
  add("UPA",UP,[38,18,18]);
  // EVA
  const EVs=[["Valor económico agregado (EVA)"],[c.name+" · "+c.unit],[],["Concepto"].concat(yrs)],ER={};const pe=(key,l,f,v,z)=>{EVs.push([l].concat(yrs.map((y,i)=>fv(f(i),v(i),z))));ER[key]=EVs.length;};
  pe("nopat","NOPAT (UODI)",i=>"'FCL Histórico'!"+col(i)+HR.uodi,i=>R.EV[i].nopat);pe("ic","Capital invertido = deuda + patrimonio − caja",i=>B("debt",i)+"+"+B("eq",i)+"-"+B("cash",i),i=>R.EV[i].ic);
  pe("roic","ROIC",i=>col(i)+ER.nopat+"/"+col(i)+ER.ic,i=>R.EV[i].roic,PCT);pe("w","WACC",()=>WACC,()=>R.w,PC2);pe("sp","Spread ROIC − WACC",i=>col(i)+ER.roic+"-"+col(i)+ER.w,i=>R.EV[i].roic-R.w,PCT);pe("eva","EVA",i=>col(i)+ER.nopat+"-"+col(i)+ER.w+"*"+col(i)+ER.ic,i=>R.EV[i].eva);
  add("EVA",EVs,[42].concat(yrs.map(()=>14)));
  // Riesgo
  const RK=[["Riesgo crediticio"],[c.name],[],["Concepto"].concat(yrs)];const az=yrs.map((y,i)=>A.altz(c,i));
  RK.push(["X1 = (AC − PC) / AT"].concat(yrs.map((y,i)=>fv("("+B("tca",i)+"-"+B("tcl",i)+")/"+B("ta",i),az[i].x1,"0.000"))));RK.push(["X2 = utilidades retenidas / AT"].concat(yrs.map((y,i)=>fv(B("re",i)?B("re",i)+"/"+B("ta",i):"0",az[i].x2,"0.000"))));
  RK.push(["X3 = EBIT / AT"].concat(yrs.map((y,i)=>fv(Pq("ebit",i)+"/"+B("ta",i),az[i].x3,"0.000"))));RK.push(["X4 = patrimonio / pasivo"].concat(yrs.map((y,i)=>fv(B("eq",i)+"/"+B("tl",i),az[i].x4,"0.000"))));
  RK.push(["Z'' = 3,25 + 6,56·X1 + 3,26·X2 + 6,72·X3 + 1,05·X4"].concat(yrs.map((y,i)=>{const cl=col(i);return fv("3.25+6.56*"+cl+"5+3.26*"+cl+"6+6.72*"+cl+"7+1.05*"+cl+"8",az[i].z,"0.00");})));
  RK.push(["Rating equivalente (Altman)"].concat(az.map(a=>a.r)));RK.push([]);RK.push(["Rating sintético por cobertura",R.rt[1]]);RK.push(["Rating estimado modelo FinTarget",R.rm.r]);RK.push(["Probabilidad de incumplimiento a 1 año",{v:R.pd.pd,z:PC2}]);
  add("Riesgo",RK,[48].concat(yrs.map(()=>12)));
  // Calidad y mapeo
  const QM=[["Calidad de datos y mapeo de cuentas"],[st.fname],[],["Cuenta en el archivo","Estado","Campo FinTarget","Confianza"]];
  st.parsed.rows.filter(r=>!r.hdr).forEach(r=>QM.push([r.label,r.st==="bal"?"Balance":"Resultados",r.field?FI[r.field].l:"(sin asignar)",r.field?{v:r.conf,z:"0%"}:""]));
  QM.push([]);QM.push(["Control","Resultado"]);A.dq(c).list.forEach(d=>QM.push([d.title,d.msg]));
  add("Calidad y mapeo",QM,[52,14,36,12]);
  return wb;
}
function downloadXLSX(){try{const wb=buildXLSX();XLSX.writeFile(wb,"FinTarget-Diagnostico-"+st.company.name.replace(/[^\w]+/g,"-").slice(0,40)+".xlsx");}catch(e){alert("No se pudo generar el Excel: "+e.message);}}

api.hooks.dx=()=>render();
window.FinTargetDX={st,parseWorkbook,buildCompany,model,buildXLSX,loadExample,F,SECT};
})();
