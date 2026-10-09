/* FinTarget V2 · Análisis V/H (FA), Gerencia Analítica (GA), línea de comandos y modo presentación.
   Los estados financieros vienen de fintarget-empresas.js. Las corridas de skills y modelos son simuladas. */
(function(){
"use strict";
const api=window.FinTargetMockup, E=window.FinTargetEmpresas;
const $=id=>document.getElementById(id), fx=api.fx, esc=api.esc;
const attr=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const CO=()=>["TGLS","EC","V"].concat(E.MI?["MI"]:[]);
const LY=c=>c.years.length-1;
const ctx={co:store.get("ft.co","TGLS"),st:"bal",mode:"v",yi:4,aud:"analista",cell:null,tool:store.get("ft.tool","HOME"),cat:"all",q:"",slide:0,crp:[0,1,3,11],shock:1};
if(!E[ctx.co])ctx.co="TGLS";
const C=()=>E[ctx.co];

/* ======================= Datos y métricas ======================= */
const IDX={};
function ix(c){if(!IDX[c.tk]){const m={};["bal","pyg"].forEach(s=>c[s].forEach(r=>{m[s+":"+r.id]=r;if(r.v&&!m[r.id])m[r.id]=r;}));IDX[c.tk]=m;}return IDX[c.tk];}
function gv(c,key,i){const id=c.map[key];if(!id)return null;const r=ix(c)[id];if(!r||!r.v)return null;const v=r.v[i];return v==null?null:v;}
function M(c,i){
  c._m=c._m||[];if(c._m[i])return c._m[i];
  const g=k=>gv(c,k,i);
  const rev=g("rev"),gp=g("gp"),ebit=g("ebit"),ebt=g("ebt"),tax=g("tax"),ni=g("ni");
  const nic=g("nic")!=null?g("nic"):ni;
  const ebitda=g("ebitda");
  let da=g("da");if(da==null&&ebitda!=null)da=ebitda-ebit;
  if(da==null&&c.map.accdep&&i>0)da=-(gv(c,"accdep",i)-gv(c,"accdep",i-1));
  let intr=g("int");intr=intr==null?null:Math.abs(intr);
  const ta=g("ta"),tca=g("tca"),tl=g("tl"),tcl=g("tcl"),eq=g("eq"),mi=g("mi")||0;
  const cash=g("cash")||0,sti=g("sti")||0,ar=g("ar")||0,inv=g("inv")||0,ap=g("ap")||0,ppe=g("ppe")||0,lti=g("lti")||0,re=g("re"),debt=g("debt");
  const cogs=rev-gp,eqA=eq-mi,t=ebt>0?tax/ebt:0,nopat=ebit*(1-t),ic=debt+eq-cash;
  return c._m[i]={rev,cogs,gp,opex:gp-ebit,ebit,nonop:ebt-ebit,ebt,tax,nic,ni,min:ni-nic,ebitda,da,intr,ta,tca,tnca:ta-tca,tl,tcl,eq,eqA,mi,cash,sti,ar,inv,ap,ppe,lti,re,debt,t,nopat,ic,
    gm:gp/rev,em:ebit/rev,nm:ni/rev,roe:ni/eqA,roa:ni/ta,roic:nopat/ic,cr:tca/tcl,quick:(tca-inv)/tcl,de:debt/eq,la:tl/ta,
    cov:intr?ebit/intr:null,nde:ebitda?(debt-cash-sti)/ebitda:null,at:rev/ta,dso:ar/rev*365,dio:inv&&cogs?inv/cogs*365:null,dpo:ap&&cogs?ap/cogs*365:null,
    mult:ta/eqA,wcta:(tca-tcl)/ta,ktno:ar+inv-ap};
}
function nf(v,d){if(v==null||!isFinite(v))return "n/d";const s=Math.abs(v).toLocaleString("es-CO",{minimumFractionDigits:d,maximumFractionDigits:d});return (v<0&&s.replace(/[0.,]/g,"")!==""?"−":"")+s;}
const U=(c,v)=>v==null?"n/d":nf(v/c.div,c.dec);
const Ur=(c,r,v)=>r&&r.ps?nf(v,2):U(c,v);
const P1=(v,d)=>v==null||!isFinite(v)?"n/d":nf(v*100,d==null?1:d)+"%";
const SP=(v,d)=>v==null||!isFinite(v)?"n/d":(v>0?"+":v<0?"−":"")+nf(Math.abs(v)*100,d==null?1:d)+"%";
const PP=(v,d)=>v==null||!isFinite(v)?"n/d":(v>0?"+":v<0?"−":"")+nf(Math.abs(v)*100,d==null?1:d)+" pp";
const X=(v,d)=>v==null||!isFinite(v)?"n/d":nf(v,d==null?2:d)+"x";
const cagr=(a,b,n)=>a>0&&b>0?Math.pow(b/a,1/n)-1:null;
const median=api.median;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const yr=(c,i)=>c.years[i];
const taUSD=(c,i)=>M(c,i).ta*(c.usd!=null?c.usd:(c.cur==="USD"?1/c.div:0.00025)); // a USD millones con TRM ≈ 4.000

/* ======================= Calidad de datos ======================= */
function dq(c){
  if(c._dq)return c._dq;
  const list=[],cells={};
  const add=(st,id,i,sev,msg)=>{const k=st+":"+id+":"+i;(cells[k]=cells[k]||[]).push({sev,msg});};
  const X_=ix(c),ta=X_["bal:ta"],tl=X_["bal:tl"],eq=X_["bal:eq"];
  let ok=0;c.years.forEach((y,i)=>{const d=ta.v[i]-(tl.v[i]+eq.v[i]);if(Math.abs(d)<=c.tol)ok++;else add("bal","ta",i,"alta","Activo ≠ pasivo + patrimonio: diferencia de "+U(c,d)+".");});
  list.push({sev:ok===c.years.length?"ok":"alta",title:"Cuadre contable",msg:"Activo = pasivo + patrimonio en "+ok+" de "+c.years.length+" años.",go:{st:"bal",id:"ta",i:ctx.yi}});
  let nd=0,first=null;
  ["bal","pyg"].forEach(st=>(c.checks[st]||[]).forEach(([tot,parts])=>{
    if(tot==="ta"&&parts[0]==="tl")return;
    c.years.forEach((y,i)=>{let s=0;parts.forEach(p=>{const neg=p[0]==="-",r=X_[st+":"+(neg?p.slice(1):p)];s+=(neg?-1:1)*((r&&r.v[i])||0);});
      const r=X_[st+":"+tot],d=r.v[i]-s;
      if(Math.abs(d)>c.tol){nd++;if(!first)first={st,id:tot,i};add(st,tot,i,"media","El subtotal no coincide con la suma de sus partidas: diferencia de "+U(c,d)+" ("+c.unit+"). Revisar el desglose en la fuente primaria.");}});
  }));
  list.push({sev:nd?"media":"ok",title:"Sumas de subtotales",msg:nd?nd+" subtotales no coinciden con la suma de sus partidas.":"Todos los subtotales cuadran con sus partidas.",go:first});
  let ns=0,fs=null;
  ["bal","pyg"].forEach(st=>c[st].forEach(r=>{
    if(!r.v||r.t==="tot"||r.ps)return;
    r.v.forEach((v,i)=>{if(!v)return;const others=r.v.filter((x,j)=>j!==i&&x).map(Math.abs);if(others.length<2)return;const md=median(others);
      if(Math.abs(v)<md/500){ns++;if(!fs)fs={st,id:r.id,i};add(st,r.id,i,"alta","Posible error de escala en la fuente: el valor es más de 500 veces menor que en los demás años (mediana "+U(c,md)+"). Si venía en miles, sería ≈ "+U(c,v*1000)+".");}});
  }));
  list.push({sev:ns?"alta":"ok",title:"Saltos de escala",msg:ns?ns+" celdas con valores fuera de escala respecto a su propia serie.":"Sin saltos de escala.",go:fs});
  c.flags.forEach(f=>{f.y.forEach(i=>add(f.st,f.id,i,f.sev,f.msg));list.push({sev:f.sev,title:f.sev==="alta"?"Contraste con fuente primaria":"Nota de la fuente",msg:f.msg,go:{st:f.st,id:f.id,i:f.y[0]}});});
  return c._dq={list,cells};
}
const nAlta=c=>{let n=0;Object.values(dq(c).cells).forEach(a=>a.forEach(f=>{if(f.sev==="alta")n++;}));return n;};

/* ======================= Gráficos (SVG) ======================= */
const CL={ink:"#17212B",sub:"#5E6873",grid:"#ECE9E3",axis:"#CFCBC2",tot:"#14273F",sub2:"#45628A",pos:"#2B5797",neg:"#B23A2E",bar:"#26456E",s:["#2B5797","#C8691C","#1E8A6E"],A:["#A9B8CB","#7389A6","#45628A","#26456E","#14273F"],F:["#D2AA7C","#B07A3E","#7E4F1F"]};
const MONO=' font-family="IBM Plex Mono,monospace"';
const r1=v=>Math.round(v*10)/10;
function tx(x,y,s,o){o=o||{};return '<text x="'+r1(x)+'" y="'+r1(y)+'" font-size="'+(o.fs||11)+'" fill="'+(o.fill||CL.sub)+'" text-anchor="'+(o.a||"start")+'"'+(o.mono?MONO:"")+(o.w?' font-weight="'+o.w+'"':"")+'>'+s+'</text>';}
const svg=(w,h,label,inner)=>'<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+attr(label)+'">'+inner+'</svg>';
function nice(lo,hi,n){if(lo===hi){hi=lo+1;}const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),nr=raw/mag,step=(nr<=1?1:nr<=2?2:nr<=2.5?2.5:nr<=5?5:10)*mag;const a=Math.floor(lo/step+1e-9)*step,b=Math.ceil(hi/step-1e-9)*step,t=[];for(let v=a;v<=b+step*1e-6;v+=step)t.push(+v.toPrecision(12));return t;}
function spark(vals,w,h,col){w=w||200;h=h||30;const v=vals.map(x=>x==null||!isFinite(x)?null:x),ok=v.filter(x=>x!=null);if(ok.length<2)return "";const mn=Math.min(...ok),mx=Math.max(...ok),r=mx-mn||1;
  const pts=v.map((y,i)=>y==null?null:[2+i*(w-4)/(v.length-1),h-3-(y-mn)/r*(h-8)]).filter(Boolean);const d=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");const l=pts[pts.length-1];
  return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true" width="100%" height="'+h+'"><path d="'+d+'" fill="none" stroke="'+(col||"#26456E")+'" stroke-width="1.6" vector-effect="non-scaling-stroke"/><circle cx="'+l[0]+'" cy="'+l[1]+'" r="2.4" fill="#14273F"/></svg>';}

function chCada100(c,i){
  const m=M(c,i),k=100/m.rev,W=600,rh=30,L=210,R=W-70;
  const st=[["Ingresos",100,"tot"],["Costo de ventas",-m.cogs*k],["Utilidad bruta",0,"sub"],["Gastos operativos",-m.opex*k],["Utilidad operativa",0,"sub"],["Resultado financiero y otros",m.nonop*k],["Antes de impuestos",0,"sub"],["Impuestos",-m.tax*k]];
  if(Math.abs(m.min*k)>=0.05)st.push(["Interés minoritario",m.min*k]);
  st.push(["Utilidad neta",0,"tot"]);
  let cur=0;const bars=st.map(s=>{if(s[2]){const v=s[0]==="Ingresos"?100:cur;cur=v;return {l:s[0],a:0,b:v,t:s[2],v};}const a=cur,b=cur+s[1];cur=b;return {l:s[0],a,b,t:"d",v:s[1]};});
  const lo=Math.min(0,...bars.map(b=>Math.min(b.a,b.b))),hi=Math.max(100,...bars.map(b=>Math.max(b.a,b.b)));
  const xs=v=>L+(v-lo)/(hi-lo)*(R-L),H=bars.length*rh+26;let g="";
  [0,25,50,75,100].forEach(t=>{g+='<line x1="'+r1(xs(t))+'" x2="'+r1(xs(t))+'" y1="4" y2="'+(H-22)+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(xs(t),H-7,nf(t,0),{a:"middle",fs:10,mono:1});});
  bars.forEach((b,j)=>{const y=6+j*rh,x1=xs(Math.min(b.a,b.b)),x2=xs(Math.max(b.a,b.b)),w=Math.max(x2-x1,1.5);
    const col=b.t==="tot"?CL.tot:b.t==="sub"?CL.sub2:(b.v<0?CL.neg:CL.pos);
    const val=b.t==="d"?(b.v<0?"−":"+")+nf(Math.abs(b.v),1):nf(b.v,1);
    g+=tx(L-10,y+14,esc(b.l),{a:"end",fill:b.t==="d"?CL.sub:CL.ink,w:b.t==="d"?null:600,fs:12});
    g+='<rect x="'+r1(x1)+'" y="'+(y+3)+'" width="'+r1(w)+'" height="'+(rh-12)+'" rx="2" fill="'+col+'" data-tip="'+attr(esc(b.l)+": "+val+" por cada 100 de ingresos<br>"+U(c,b.v/k)+" "+esc(c.unit))+'"/>';
    g+=tx(x2+6,y+14,val,{mono:1,fill:CL.ink,fs:11.5,w:b.t==="d"?null:600});
    if(j<bars.length-1){const xe=r1(xs(b.b));g+='<line x1="'+xe+'" x2="'+xe+'" y1="'+(y+rh-9)+'" y2="'+(y+rh+3)+'" stroke="'+CL.axis+'"/>';}
  });
  return svg(W,H,"De cada 100 de ingresos",g);
}
function structGroups(c,i){const m=M(c,i);
  return {ta:m.ta,A:[["Caja e inversiones CP",m.cash+m.sti],["Cartera e inventarios",m.ar+m.inv],["Otros activos corrientes",m.tca-m.cash-m.sti-m.ar-m.inv],["PP&E e inversiones LP",m.ppe+m.lti],["Intangibles y otros LP",m.tnca-m.ppe-m.lti]],
    F:[["Pasivo corriente",m.tcl],["Pasivo no corriente",m.tl-m.tcl],["Patrimonio",m.eq]]};}
function chEstructura(c){
  const W=600,H=290,mL=42,mR=8,mT=10,mB=42,ys=v=>mT+(1-v)*(H-mT-mB),n=c.years.length,gw=(W-mL-mR)/n,bw=Math.min(30,gw*.3);let g="";
  [0,.25,.5,.75,1].forEach(t=>{g+='<line x1="'+mL+'" x2="'+(W-mR)+'" y1="'+r1(ys(t))+'" y2="'+r1(ys(t))+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(mL-6,ys(t)+4,nf(t*100,0)+"%",{a:"end",fs:10,mono:1});});
  c.years.forEach((y,i)=>{const s=structGroups(c,i),cx=mL+gw*i+gw/2;
    [[s.A,CL.A,"A",cx-bw-2],[s.F,CL.F,"F",cx+2]].forEach(([grp,cols,lab,x])=>{let acc=0;
      for(let j=grp.length-1;j>=0;j--){const p=Math.max(0,grp[j][1]/s.ta),y1=ys(acc+p),y0=ys(acc),h=y0-y1;
        if(h>0.4)g+='<rect x="'+r1(x)+'" y="'+r1(y1+1)+'" width="'+r1(bw)+'" height="'+r1(Math.max(h-2,0.8))+'" fill="'+cols[j]+'" data-tip="'+attr(y+" · "+esc(grp[j][0])+"<br>"+P1(p)+" del activo · "+U(c,grp[j][1])+" "+esc(c.unit))+'"/>';acc+=p;}
      g+=tx(x+bw/2,H-mB+13,lab,{a:"middle",fs:9.5});});
    g+=tx(cx,H-mB+29,y,{a:"middle",fs:11,mono:1,fill:CL.ink});});
  const leg='<div class="ch-legend"><b>A · Activo</b>'+["Caja e inv. CP","Cartera e inventarios","Otros corrientes","PP&amp;E e inv. LP","Intangibles y otros LP"].map((l,j)=>'<span><i style="background:'+CL.A[j]+'"></i>'+l+'</span>').join("")+'</div><div class="ch-legend"><b>F · Financiación</b>'+["Pasivo corriente","Pasivo no corriente","Patrimonio"].map((l,j)=>'<span><i style="background:'+CL.F[j]+'"></i>'+l+'</span>').join("")+'</div>';
  return svg(W,H,"Estructura del balance",g)+leg;
}
function wfall(c,bars,W,H,label){
  const mL=58,mR=8,mT=22,mB=46,lo=Math.min(0,...bars.map(x=>Math.min(x.a,x.b))),hi=Math.max(0,...bars.map(x=>Math.max(x.a,x.b))),tk=nice(lo,hi,5),y0=tk[0],y1=tk[tk.length-1],ys=v=>mT+(1-(v-y0)/(y1-y0))*(H-mT-mB);
  let g="";tk.forEach(t=>{g+='<line x1="'+mL+'" x2="'+(W-mR)+'" y1="'+r1(ys(t))+'" y2="'+r1(ys(t))+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(mL-6,ys(t)+4,U(c,t),{a:"end",fs:10,mono:1});});
  const n=bars.length,gw=(W-mL-mR)/n,bw=gw*.58;
  bars.forEach((x,j)=>{const X0=mL+gw*j+(gw-bw)/2,top=ys(Math.max(x.a,x.b)),bot=ys(Math.min(x.a,x.b)),h=Math.max(bot-top,1.5);
    const col=x.t==="tot"?CL.tot:(x.v<0?CL.neg:CL.pos),val=x.t==="tot"?U(c,x.b):(x.v<0?"−":"+")+U(c,Math.abs(x.v));
    g+='<rect x="'+r1(X0)+'" y="'+r1(top)+'" width="'+r1(bw)+'" height="'+r1(h)+'" rx="2" fill="'+col+'" data-tip="'+attr(esc(x.l)+": "+val+" "+esc(c.unit))+'"/>';
    const above=x.t==="tot"?x.b>=0:x.v>=0;g+=tx(X0+bw/2,above?top-5:bot+12,val,{a:"middle",fs:10.5,mono:1,fill:CL.ink});
    if(j<n-1){const ye=r1(ys(x.b));g+='<line x1="'+r1(X0+bw)+'" x2="'+r1(X0+gw)+'" y1="'+ye+'" y2="'+ye+'" stroke="'+CL.axis+'"/>';}
    const w=x.l.split(" "),h2=x.t!=="tot"&&w.length>1,l1=h2?w.slice(0,Math.ceil(w.length/2)).join(" "):x.l,l2=h2?w.slice(Math.ceil(w.length/2)).join(" "):"";
    g+=tx(X0+bw/2,H-mB+16,esc(l1),{a:"middle",fs:10.5,fill:x.t==="tot"?CL.ink:CL.sub});if(l2)g+=tx(X0+bw/2,H-mB+29,esc(l2),{a:"middle",fs:10.5});
  });
  return svg(W,H,label,g);
}
function chPuente(c,i){
  if(i<1)i=1;const a=M(c,i-1),b=M(c,i);
  const st=[["Ingresos",b.rev-a.rev],["Costo de ventas",-(b.cogs-a.cogs)],["Gastos operativos",-(b.opex-a.opex)],["Financiero y otros",b.nonop-a.nonop],["Impuestos",-(b.tax-a.tax)]];
  if(a.min||b.min)st.push(["Minoritarios",b.min-a.min]);
  const bars=[{l:"Utilidad "+yr(c,i-1),a:0,b:a.ni,t:"tot"}];let cur=a.ni;
  st.forEach(s=>{bars.push({l:s[0],a:cur,b:cur+s[1],t:"d",v:s[1]});cur+=s[1];});
  bars.push({l:"Utilidad "+yr(c,i),a:0,b:b.ni,t:"tot"});
  return wfall(c,bars,600,300,"Puente de la utilidad neta");
}
function chCrec(c){
  const n=c.years.length-1,f=M(c,0),l=M(c,n);
  const it=[["Ingresos","rev"],["Costo de ventas","cogs"],["Gastos operativos","opex"],["Utilidad operativa","ebit"],["Utilidad neta","ni"],["Activo total","ta"],["Deuda financiera","debt"],["Patrimonio","eq"]].map(([lb,k])=>({l:lb,k,g:cagr(f[k],l[k],n)}));
  const gr=it[0].g,vals=it.filter(x=>x.g!=null).map(x=>x.g),tk=nice(Math.min(0,...vals),Math.max(0,...vals),4);
  const W=600,rh=28,L=150,R=W-190,H=it.length*rh+30,xs=v=>L+(v-tk[0])/(tk[tk.length-1]-tk[0])*(R-L);let g="";
  tk.forEach(t=>{g+='<line x1="'+r1(xs(t))+'" x2="'+r1(xs(t))+'" y1="4" y2="'+(H-22)+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(xs(t),H-8,nf(t*100,0)+"%",{a:"middle",fs:10,mono:1});});
  it.forEach((x,j)=>{const y=6+j*rh;g+=tx(L-10,y+14,x.l,{a:"end",fs:12,fill:CL.ink});
    if(x.g==null){g+=tx(xs(0)+6,y+14,"n/a · cambia de signo",{fs:11});return;}
    const fast=(x.k==="cogs"||x.k==="opex")&&gr!=null&&x.g>gr,col=x.k==="rev"?CL.tot:fast?CL.neg:CL.bar,a=xs(Math.min(0,x.g)),b=xs(Math.max(0,x.g));
    g+='<rect x="'+r1(a)+'" y="'+(y+4)+'" width="'+r1(Math.max(b-a,1.5))+'" height="'+(rh-12)+'" rx="2" fill="'+col+'" data-tip="'+attr(x.l+": "+SP(x.g)+" anual<br>"+U(c,f[x.k])+" → "+U(c,l[x.k])+" "+esc(c.unit))+'"/>';
    g+=tx(x.g<0?a-6:b+6,y+14,SP(x.g)+(fast?" · más que ingresos":""),{a:x.g<0?"end":"start",fs:11,mono:1,fill:fast?CL.neg:CL.ink});});
  if(gr!=null){const xr=r1(xs(gr));g+='<line x1="'+xr+'" x2="'+xr+'" y1="2" y2="'+(H-22)+'" stroke="'+CL.tot+'" stroke-dasharray="3 3"/>';}
  return svg(W,H,"Crecimiento compuesto",g);
}
function lineChart(o){ // o:{W,H,xs:[labels],series:[{l,v,col}],fmt,lo,hi,label,mR,tipHead}
  const W=o.W||600,H=o.H||260,mL=46,mR=o.mR||120,mT=12,mB=30,n=o.xs.length,all=o.series.flatMap(s=>s.v).filter(v=>v!=null&&isFinite(v));
  const tk=nice(o.lo!=null?Math.min(o.lo,...all):Math.min(...all),o.hi!=null?Math.max(o.hi,...all):Math.max(...all),4),X0=i=>mL+i*(W-mL-mR)/(n-1),Y=v=>mT+(1-(v-tk[0])/(tk[tk.length-1]-tk[0]))*(H-mT-mB);
  let g="";tk.forEach(t=>{g+='<line x1="'+mL+'" x2="'+(W-mR)+'" y1="'+r1(Y(t))+'" y2="'+r1(Y(t))+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(mL-6,Y(t)+4,(o.afmt||o.fmt)(t),{a:"end",fs:10,mono:1});});
  o.xs.forEach((x,i)=>{g+=tx(X0(i),H-10,x,{a:"middle",fs:11,mono:1});});
  (o.bands||[]).forEach(b=>{g+='<rect x="'+mL+'" y="'+r1(Y(b.hi))+'" width="'+(W-mR-mL)+'" height="'+r1(Y(b.lo)-Y(b.hi))+'" fill="'+b.col+'"/>';});
  o.series.forEach(s=>{const pts=s.v.map((v,i)=>v==null?null:[X0(i),Y(v)]).filter(Boolean);g+='<path d="'+pts.map((p,i)=>(i?"L":"M")+r1(p[0])+" "+r1(p[1])).join(" ")+'" fill="none" stroke="'+s.col+'" stroke-width="2"'+(s.dash?' stroke-dasharray="5 4"':"")+'/>';pts.forEach(p=>{g+='<circle cx="'+r1(p[0])+'" cy="'+r1(p[1])+'" r="3.5" fill="'+s.col+'" stroke="#fff" stroke-width="2"/>';});});
  const ends=o.series.map(s=>{let k=s.v.length-1;while(k>0&&s.v[k]==null)k--;return {s,k,y:Y(s.v[k])};}).sort((a,b)=>a.y-b.y);for(let j=1;j<ends.length;j++)if(ends[j].y-ends[j-1].y<30)ends[j].y=ends[j-1].y+30;
  ends.forEach(e=>{g+=tx(W-mR+10,e.y-1,esc(e.s.l),{fs:11,fill:CL.ink})+tx(W-mR+10,e.y+12,o.fmt(e.s.v[e.k]),{fs:11,mono:1});});
  o.xs.forEach((x,i)=>{const a=i===0?mL:(X0(i-1)+X0(i))/2,b=i===n-1?W-mR:(X0(i)+X0(i+1))/2;
    g+='<g class="yr"><line class="guide" x1="'+r1(X0(i))+'" x2="'+r1(X0(i))+'" y1="'+mT+'" y2="'+(H-mB)+'" stroke="'+CL.ink+'" stroke-opacity=".35"/><rect x="'+r1(a)+'" y="'+mT+'" width="'+r1(b-a)+'" height="'+(H-mT-mB)+'" fill="transparent" data-tip="'+attr("<b>"+x+"</b><br>"+o.series.map(s=>esc(s.l)+": "+o.fmt(s.v[i])).join("<br>"))+'"/></g>';});
  return svg(W,H,o.label,g)+(o.series.length>1?'<div class="ch-legend">'+o.series.map(s=>'<span><i style="background:'+s.col+'"></i>'+esc(s.l)+'</span>').join("")+'</div>':"");
}
function chMarg(c){return lineChart({xs:c.years,series:[["Margen bruto","gm"],["Margen operativo","em"],["Margen neto","nm"]].map(([l,k],j)=>({l,col:CL.s[j],v:c.years.map((y,i)=>M(c,i)[k])})),fmt:v=>P1(v),afmt:v=>P1(v,0),lo:0,label:"Márgenes"});}
function chDupont(c,i){
  const m=M(c,i),W=600,H=252,ser=k=>c.years.map((y,j)=>M(c,j)[k]);let g="";
  const box=(x,y,w,h,lab,val,k,hero)=>{g+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(hero?CL.tot:"#FAF9F6")+'" stroke="'+(hero?CL.tot:"#DFDCD5")+'"/>'+tx(x+12,y+19,lab,{fs:11,fill:hero?"#BFCBDA":CL.sub})+tx(x+12,y+44,val,{fs:20,mono:1,fill:hero?"#FFFFFF":CL.ink});
    const s=ser(k),mn=Math.min(...s),mx=Math.max(...s),r=mx-mn||1,sw=w-24,sx=x+12,sy=y+h-22;g+='<path d="'+s.map((v,j)=>(j?"L":"M")+r1(sx+j*sw/(s.length-1))+" "+r1(sy+16-(v-mn)/r*14)).join(" ")+'" fill="none" stroke="'+(hero?"#A9B8CB":"#45628A")+'" stroke-width="1.5"/>';
    g+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="transparent" data-tip="'+attr(lab+"<br>"+c.years.map((yy,j)=>yy+": "+(k==="nm"||k==="roe"?P1(s[j]):X(s[j]))).join("<br>"))+'"/>';};
  [[95,152],[300,152],[505,152]].forEach(([x,y])=>{g+='<path d="M300 92 L300 120 L'+x+' 120 L'+x+' '+y+'" fill="none" stroke="'+CL.axis+'"/>';});
  box(200,12,200,80,"ROE · "+yr(c,i),P1(m.roe),"roe",1);
  box(10,152,170,90,"Margen neto",P1(m.nm),"nm");box(215,152,170,90,"Rotación del activo",X(m.at),"at");box(420,152,170,90,"Multiplicador (A/P)",X(m.mult),"mult");
  g+=tx(197.5,203,"×",{a:"middle",fs:18,fill:CL.sub})+tx(402.5,203,"×",{a:"middle",fs:18,fill:CL.sub});
  return svg(W,H,"DuPont",g);
}
const card=(title,sub,body,wide)=>'<div class="card chart'+(wide?" wide":"")+'"><h3>'+title+'</h3><div class="sub">'+sub+'</div>'+body+'</div>';

/* ======================= Señales ======================= */
const STT={good:["✓","Bien"],warn:["!","Atención"],crit:["✕","Crítico"],info:["i","Nota"]};
const stt=s=>'<span class="stt '+s+'"><i aria-hidden="true">'+STT[s][0]+'</i>'+STT[s][1]+'</span>';
function signals(c,i){
  const m=M(c,i),p=i>0?M(c,i-1):null,S=[];
  S.push({k:"Liquidez",s:m.cr>=1.5?"good":m.cr>=1?"warn":"crit",t:"Razón corriente "+X(m.cr),d:"Activo corriente "+U(c,m.tca)+" frente a pasivo corriente "+U(c,m.tcl)+(p?". En "+yr(c,i-1)+" era "+X(p.cr)+".":".")});
  S.push({k:"Endeudamiento",s:m.de<0.8?"good":m.de<=1.5?"warn":"crit",t:"Deuda financiera / patrimonio "+X(m.de),d:"Deuda financiera "+U(c,m.debt)+"; patrimonio "+U(c,m.eq)+" ("+c.unit+")."});
  if(m.cov!=null)S.push({k:"Cobertura",s:m.cov>6?"good":m.cov>=3?"warn":"crit",t:"El EBIT cubre "+X(m.cov,1)+" los intereses",d:"EBIT "+U(c,m.ebit)+" frente a intereses "+U(c,m.intr)+(p&&p.cov?". En "+yr(c,i-1)+": "+X(p.cov,1)+".":".")});
  let pk=0;for(let j=0;j<=i;j++)if(M(c,j).em>M(c,pk).em)pk=j;const drop=M(c,pk).em-m.em;
  S.push({k:"Margen operativo",s:drop>0.03?"warn":"good",t:"Margen EBIT "+P1(m.em),d:drop>0.03?nf(drop*100,1)+" pp por debajo del máximo del período ("+P1(M(c,pk).em)+" en "+yr(c,pk)+").":"En el máximo del período o cerca de él ("+P1(M(c,pk).em)+" en "+yr(c,pk)+")."});
  if(p){const gR=m.rev/p.rev-1,gO=m.opex/p.opex-1;S.push({k:"Gastos operativos",s:gO>gR+0.02?"warn":"good",t:"Crecieron "+SP(gO)+" frente a ingresos "+SP(gR),d:gO>gR?"Los gastos operativos crecen más rápido que los ingresos.":"Los ingresos crecen más rápido que los gastos operativos."});}
  if(c.wacc){const sp=m.roic-c.wacc.v/100;S.push({k:"Creación de valor",s:sp>0?"good":"crit",t:"ROIC "+P1(m.roic)+" frente a WACC "+nf(c.wacc.v,2)+"%",d:"EVA ≈ "+U(c,m.nopat-c.wacc.v/100*m.ic)+" "+c.unit+". "+c.wacc.note+"."});}
  const na=nAlta(c);S.push({k:"Calidad de datos",s:na?"warn":"good",t:na?na+" celdas con alerta de alta severidad":"Sin alertas de alta severidad",d:na?"Ver el detalle celda a celda en la vista Analista.":"Cuadre contable y sumas verificados."});
  return S;
}
const sigHTML=S=>'<div class="sig">'+S.map(x=>'<div class="sig-row">'+stt(x.s)+'<div><b>'+esc(x.k)+' · '+esc(x.t)+'</b><p>'+esc(x.d)+'</p></div></div>').join("")+'</div>';

/* ======================= Vista FA ======================= */
const notesKey=c=>"ft.notes."+c.tk;
function coSeg(id){$(id).innerHTML=CO().map(k=>'<button type="button" data-co="'+k+'" aria-pressed="'+(k===ctx.co)+'">'+E[k].short+'</button>').join("");}
function defaultCell(c){return {st:ctx.st,id:ctx.st==="bal"?(ix(c)["bal:inv"]?"inv":"ar"):"ebit",i:ctx.yi};}
function faKPIs(c){
  const i=ctx.yi,m=M(c,i),p=i>0?M(c,i-1):null,ger=ctx.aud==="gerencia",ser=k=>c.years.map((y,j)=>M(c,j)[k]);
  const K=[
    {k:ger?"Ventas del año":"Ingresos",v:U(c,m.rev),dv:p?m.rev/p.rev-1:null,f:SP,up:1,s:"rev",u:1},
    {k:ger?"De cada 100 vendidos, quedan de la operación":"Margen EBIT",v:ger?nf(m.em*100,1):P1(m.em),dv:p?m.em-p.em:null,f:PP,up:1,s:"em"},
    {k:ger?"Utilidad del año":"Utilidad neta",v:U(c,m.ni),dv:p?(m.ni-p.ni)/Math.abs(p.ni):null,f:SP,up:1,s:"ni",u:1},
    {k:ger?"Rentabilidad para el accionista":"ROE",v:P1(m.roe),dv:p?m.roe-p.roe:null,f:PP,up:1,s:"roe"},
    {k:ger?"Deuda por cada 1 de patrimonio":"Deuda fin. / patrimonio",v:X(m.de),dv:p?m.de-p.de:null,f:v=>(v>=0?"+":"−")+nf(Math.abs(v),2)+"x",up:0,s:"de"},
    {k:ger?"Veces que la operación paga los intereses":"Cobertura de intereses",v:X(m.cov,1),dv:p&&m.cov&&p.cov?m.cov-p.cov:null,f:v=>(v>=0?"+":"−")+nf(Math.abs(v),1)+"x",up:1,s:"cov"}];
  $("fa-kpis").innerHTML=K.map(x=>{const good=x.dv==null?null:(x.up?x.dv>=0:x.dv<=0);
    return '<div class="card kpi"><div class="k"><span>'+x.k+'</span></div><div class="v">'+x.v+'</div><div class="d '+(good==null?"neu":good?"pos":"neg")+'">'+(x.dv==null?"Primer año de la serie":(x.dv>=0?"▲ ":"▼ ")+x.f(x.dv)+" vs "+yr(c,i-1))+'</div>'+(x.u?'<div class="s">'+esc(c.unit)+'</div>':"")+spark(ser(x.s))+'</div>';}).join("");
}
function cellInfo(c,st,r,i){
  const base=ix(c)[st+":"+(st==="bal"?"ta":"rev")],v=r.v[i],b=base.v[i],prev=i>0?r.v[i-1]:null,v0=r.v[0];
  return {v,b,prev,vert:r.ps?null:(b?v/b:null),yoy:prev==null||prev===0?null:(v-prev)/Math.abs(prev),index:v0>0&&v>=0?v/v0*100:null};
}
function heat(mode,inf,r){
  let a=0,neg=false;
  if(mode==="v"&&inf.vert!=null&&r.t!=="tot"){a=Math.min(.36,Math.abs(inf.vert)*1.1);neg=inf.vert<0;}
  if(mode==="h"&&inf.yoy!=null){a=Math.min(.3,Math.abs(inf.yoy)*.55);neg=inf.yoy<0;}
  if(mode==="i"&&inf.index!=null){const d=(inf.index-100)/100;a=Math.min(.3,Math.abs(d)*.35);neg=d<0;}
  return a>0.01?' style="background:'+(neg?"rgba(178,58,46,":"rgba(38,69,110,")+a.toFixed(3)+')"':"";
}
function faTable(c){
  const st=ctx.st,rows=c[st],n=c.years.length,mode=ctx.mode,D=dq(c),cell=ctx.cell;
  const yy=" "+String(c.years[0]).slice(2)+"–"+String(c.years[n-1]).slice(2),last={val:"CAGR"+yy,v:"Δ"+yy,h:"CAGR"+yy,i:"CAGR"+yy}[mode];
  $("fa-thead").innerHTML='<tr><th>Cuenta</th>'+c.years.map((y,i)=>'<th class="'+(i===ctx.yi?"yfoc":"")+'">'+y+'</th>').join("")+'<th>'+last+'</th><th style="text-align:left">Tendencia</th></tr>';
  $("fa-rows").innerHTML=rows.map(r=>{
    if(r.t==="hdr")return '<tr class="t-hdr"><td colspan="'+(n+3)+'">'+esc(r.l)+'</td></tr>';
    const tds=r.v.map((v,i)=>{const inf=cellInfo(c,st,r,i),fl=D.cells[st+":"+r.id+":"+i]||[];
      let txt=mode==="val"?Ur(c,r,v):mode==="v"?(inf.vert==null?"—":P1(inf.vert)):mode==="h"?(i===0?"—":inf.yoy==null?"n/a":SP(inf.yoy)):(inf.index==null?"n/a":nf(inf.index,0));
      const on=cell&&cell.st===st&&cell.id===r.id&&cell.i===i,sev=fl.some(f=>f.sev==="alta")?"alta":fl.length?"media":"";
      const tip=esc(r.l)+" · "+c.years[i]+"<br>Valor: "+Ur(c,r,v)+(r.ps?"":" · Vertical: "+P1(inf.vert))+(i?"<br>Variación anual: "+(inf.yoy==null?"n/a":SP(inf.yoy)):"")+fl.map(f=>"<br>⚑ "+esc(f.msg)).join("");
      return '<td class="cell'+(on?" on":"")+(sev?" flag "+sev:"")+'" data-id="'+r.id+'" data-i="'+i+'" tabindex="'+(on?0:-1)+'" data-tip="'+attr(tip)+'"'+heat(mode,inf,r)+'>'+txt+'</td>';}).join("");
    let lastTxt;
    if(mode==="v"){const a=cellInfo(c,st,r,0).vert,b=cellInfo(c,st,r,n-1).vert;lastTxt=a==null||b==null?"—":PP(b-a);}
    else{const g=cagr(r.v[0],r.v[n-1],n-1);lastTxt=g==null?"n/a":SP(g);}
    const trendVals=mode==="v"?r.v.map((v,i)=>cellInfo(c,st,r,i).vert):r.v;
    return '<tr class="t-'+r.t+(r.lv?" lv"+r.lv:"")+'"><td class="lbl">'+esc(r.l)+'</td>'+tds+'<td class="cagr'+(lastTxt==="n/a"||lastTxt==="—"?" na":"")+'">'+lastTxt+'</td><td class="trend">'+spark(trendVals,70,18,"#45628A")+'</td></tr>';
  }).join("");
  $("fa-unit").textContent=c.unit+" · "+{val:"valores",v:"% del "+(st==="bal"?"activo total":"ingreso"),h:"variación anual",i:"índice "+c.years[0]+" = 100"}[mode];
  $("fa-legend").innerHTML=mode==="val"?"Valores tal como los reporta la fuente":mode==="v"?"Color más intenso = mayor peso sobre la base":"Azul = aumento · rojo = disminución · la intensidad sigue la magnitud";
  $("fa-src").innerHTML='Fuente: <a class="src-link" href="'+attr(c.src.url)+'" target="_blank" rel="noopener">'+esc(c.src.name)+' ↗</a>';
}
function faInspector(c){
  let cell=ctx.cell;if(!cell||cell.st!==ctx.st||!ix(c)[cell.st+":"+cell.id])cell=ctx.cell=defaultCell(c);
  const st=cell.st,r=ix(c)[st+":"+cell.id],i=cell.i,inf=cellInfo(c,st,r,i),n=c.years.length,baseL=st==="bal"?"activo total":"ingresos",base=ix(c)[st+":"+(st==="bal"?"ta":"rev")];
  const g=cagr(r.v[0],r.v[n-1],n-1),contrib=i>0&&!r.ps?(r.v[i]-r.v[i-1])/base.v[i-1]:null,fl=dq(c).cells[st+":"+r.id+":"+i]||[];
  const steps=[];
  if(!r.ps)steps.push(["% del "+baseL+" (vertical)",P1(inf.vert)]);
  if(i>0)steps.push(["Variación vs "+c.years[i-1],(inf.v-inf.prev>=0?"+":"−")+Ur(c,r,Math.abs(inf.v-inf.prev))+" ("+(inf.yoy==null?"n/a":SP(inf.yoy))+")"]);
  steps.push(["Índice ("+c.years[0]+" = 100)",inf.index==null?"n/a":nf(inf.index,0)]);
  steps.push(["Crecimiento compuesto "+c.years[0]+"–"+String(c.years[n-1]).slice(2),g==null?"n/a":SP(g)]);
  if(contrib!=null)steps.push(["Aporte a la variación del "+baseL,PP(contrib,2)]);
  const formula=r.ps?r.l+" = dato por acción reportado":"Vertical = "+r.l+" / "+(st==="bal"?"Activo total":"Ingresos totales")+"\n         = "+Ur(c,r,inf.v)+" / "+U(c,inf.b)+" = "+P1(inf.vert)+(i>0?"\nHorizontal = "+Ur(c,r,inf.v)+" / "+Ur(c,r,inf.prev)+" − 1 = "+(inf.yoy==null?"n/a":SP(inf.yoy)):"");
  $("fa-insp").innerHTML='<h3>'+esc(r.l)+'</h3><div class="sub">'+(st==="bal"?"Balance":"Estado de resultados")+' · '+c.years[i]+' · '+esc(c.unit)+'</div>'+
    '<div class="bignum">'+Ur(c,r,inf.v)+'<small>'+(r.ps?"por acción":esc(c.unit))+'</small></div>'+
    '<div class="steps" style="margin-top:12px">'+steps.map(s=>'<div><span>'+s[0]+'</span><b>'+s[1]+'</b></div>').join("")+'</div>'+
    '<div class="insp-k">Fórmula</div><div class="formula">'+esc(formula)+'</div>'+
    (fl.length?'<div class="insp-k">Alertas de la celda</div><div class="dq">'+fl.map(f=>'<div class="dq-item">'+stt(f.sev==="alta"?"crit":f.sev==="media"?"warn":"info").replace(/<\/i>[^<]*<\/span>/,"</i></span>")+'<span>'+esc(f.msg)+'</span></div>').join("")+'</div>':"")+
    '<div class="insp-k">Fuente</div><a class="src-link" href="'+attr(c.src.url)+'" target="_blank" rel="noopener">'+esc(c.src.name)+' ↗</a><div style="font-size:12px;color:var(--sub);margin-top:3px">Primaria: <a class="src-link" href="'+attr(c.src.purl)+'" target="_blank" rel="noopener">'+esc(c.src.primary)+' ↗</a><br>'+esc(c.origin)+'</div>'+
    '<div class="insp-k"><label for="fa-notes">Lectura del analista · '+esc(c.short)+'</label></div><textarea class="notes" id="fa-notes" placeholder="Tu lectura de las cifras. Se guarda en este navegador y aparece en la vista Gerencia y en la presentación.">'+esc(store.get(notesKey(c),""))+'</textarea>';
}
function faDQ(c){
  $("fa-dq").innerHTML='<div class="dq">'+dq(c).list.map((d,k)=>'<div class="dq-item">'+'<span class="stt '+(d.sev==="ok"?"good":d.sev==="alta"?"crit":d.sev==="media"?"warn":"info")+'"><i aria-hidden="true">'+(d.sev==="ok"?"✓":d.sev==="alta"?"✕":d.sev==="media"?"!":"i")+'</i></span><div><b>'+esc(d.title)+'</b><div style="color:var(--sub)">'+esc(d.msg)+'</div>'+(d.go&&d.sev!=="ok"?'<button type="button" data-dq="'+k+'">Ir a la celda →</button>':"")+'</div></div>').join("")+'</div>';
}
function faCharts(c){
  const i=ctx.yi,ip=Math.max(1,i),cur=c.cur;
  $("fa-ch-sub").textContent=c.short+" · "+c.unit+" · pasa el cursor sobre cada barra para ver la cifra";
  $("fa-charts").innerHTML=
    card("De cada 100 "+cur+" de ingresos, "+yr(c,i),"Cómo se reparten las ventas hasta llegar a la utilidad neta",chCada100(c,i))+
    card("Estructura del balance","Activo (A) y su financiación (F) como % del activo total, ordenados por liquidez y exigibilidad",chEstructura(c))+
    card("Qué movió la utilidad neta, "+yr(c,ip-1)+" → "+yr(c,ip),"Aporte de cada rubro a la variación · "+esc(c.unit),chPuente(c,ip))+
    card("Qué creció más rápido","Tasa compuesta anual "+c.years[0]+"–"+c.years[LY(c)]+" · la línea punteada marca el crecimiento de los ingresos",chCrec(c))+
    card("Márgenes","Bruto, operativo y neto sobre ingresos",chMarg(c))+
    card("ROE en tres factores, "+yr(c,i),"Margen neto × rotación del activo × multiplicador del patrimonio",chDupont(c,i));
}
function renderFA(){
  const c=C();coSeg("fa-co");
  $("h-fa").textContent=c.name;$("fa-crumb").textContent=c.tk;
  $("fa-meta").innerHTML='<span class="pill">'+esc(c.tk)+' · '+esc(c.exch)+'</span><span>'+esc(c.activity)+'</span><span>'+esc(c.unit)+' · '+esc(c.fy)+'</span><span>'+esc(c.origin)+'</span>';
  const ys=$("fa-year");ys.innerHTML=c.years.map((y,i)=>'<option value="'+i+'"'+(i===ctx.yi?" selected":"")+'>'+y+'</option>').join("");
  document.querySelectorAll("#fa-st button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.st===ctx.st)));
  document.querySelectorAll("#fa-mode button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.m===ctx.mode)));
  document.querySelectorAll("[data-aud]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.aud===ctx.aud)));
  const ger=ctx.aud==="gerencia";$("fa-analyst").hidden=ger;$("fa-ger").hidden=!ger;
  faKPIs(c);
  if(ger){$("fa-sig-sub").textContent=c.short+" · "+yr(c,ctx.yi)+" · umbrales de referencia generales, no sectoriales";$("fa-sig").innerHTML=sigHTML(signals(c,ctx.yi));const nt=store.get(notesKey(c),"");$("fa-notes-ro").textContent=nt||"Sin lectura todavía. Escríbela en la vista Analista, en el inspector de cualquier cifra.";$("fa-notes-ro").classList.toggle("empty",!nt);}
  else{faTable(c);faInspector(c);faDQ(c);}
  faCharts(c);
}
function selectCell(st,id,i,focus){ctx.st=st;ctx.cell={st,id,i};renderFA();if(focus){const td=document.querySelector('#fa-rows td.cell.on');if(td)td.focus();}}
// eventos FA
$("fa-co").addEventListener("click",e=>{const b=e.target.closest("[data-co]");if(b)setCompany(b.dataset.co);});
$("fa-st").addEventListener("click",e=>{const b=e.target.closest("[data-st]");if(!b)return;ctx.st=b.dataset.st;ctx.cell=null;renderFA();});
$("fa-mode").addEventListener("click",e=>{const b=e.target.closest("[data-m]");if(!b)return;ctx.mode=b.dataset.m;renderFA();});
$("fa-year").addEventListener("change",e=>{ctx.yi=+e.target.value;if(ctx.cell)ctx.cell.i=ctx.yi;renderFA();});
document.querySelectorAll("[data-aud]").forEach(b=>b.addEventListener("click",()=>{ctx.aud=b.dataset.aud;renderFA();}));
$("fa-rows").addEventListener("click",e=>{const td=e.target.closest("td.cell");if(td)selectCell(ctx.st,td.dataset.id,+td.dataset.i,true);});
$("fa-rows").addEventListener("keydown",e=>{
  const td=e.target.closest("td.cell");if(!td)return;const c=C(),ids=c[ctx.st].filter(r=>r.v).map(r=>r.id);let k=ids.indexOf(td.dataset.id),i=+td.dataset.i;
  if(e.key==="ArrowDown")k=Math.min(ids.length-1,k+1);else if(e.key==="ArrowUp")k=Math.max(0,k-1);else if(e.key==="ArrowRight")i=Math.min(c.years.length-1,i+1);else if(e.key==="ArrowLeft")i=Math.max(0,i-1);else return;
  e.preventDefault();selectCell(ctx.st,ids[k],i,true);});
$("fa-insp").addEventListener("input",e=>{if(e.target.id==="fa-notes")store.set(notesKey(C()),e.target.value);});
$("fa-dq").addEventListener("click",e=>{const b=e.target.closest("[data-dq]");if(!b)return;const d=dq(C()).list[+b.dataset.dq];if(d&&d.go){ctx.aud="analista";ctx.mode=ctx.mode;selectCell(d.go.st,d.go.id,d.go.i,true);}});
$("fa-csv").addEventListener("click",()=>{const c=C(),rows=c[ctx.st].filter(r=>r.v),f=v=>v==null||!isFinite(v)?"":String(+v.toFixed(6)).replace(".",",");
  const head=["cuenta"].concat(c.years.map(y=>"valor_"+y),c.years.map(y=>"vertical_"+y),c.years.slice(1).map(y=>"horizontal_"+y)).join(";");
  const body=rows.map(r=>[ '"'+r.l.replace(/"/g,"'")+'"' ].concat(r.v.map(v=>f(r.ps?v:v/c.div)),r.v.map((v,i)=>f(cellInfo(c,ctx.st,r,i).vert)),r.v.slice(1).map((v,i)=>f(cellInfo(c,ctx.st,r,i+1).yoy))).join(";")).join("\n");
  api.download("fintarget-"+c.tk+"-"+(ctx.st==="bal"?"balance":"resultados")+"-VH.csv",head+"\n"+body,"text/csv;charset=utf-8");});
$("fa-pres").addEventListener("click",()=>openPres());

/* ======================= Presentación ======================= */
function slides(c){
  const i=ctx.yi,ip=Math.max(1,i),m=M(c,i),a=M(c,ip-1),b=M(c,ip),n=c.years.length-1,gr=cagr(M(c,0).rev,M(c,n).rev,n),nt=store.get(notesKey(c),"");
  const tiles=[["Ventas del año",U(c,m.rev),c.unit],["De cada 100 vendidos, quedan de la operación",nf(m.em*100,1),"margen EBIT"],["Utilidad del año",U(c,m.ni),c.unit],["Rentabilidad para el accionista",P1(m.roe),"ROE"],["Deuda por cada 1 de patrimonio",X(m.de),"deuda financiera / patrimonio"],["Veces que la operación paga los intereses",X(m.cov,1),"EBIT / intereses"]];
  return [
    {cover:1,kick:"FinTarget · Diagnóstico financiero",h:c.name,p:"Análisis vertical y horizontal "+c.years[0]+"–"+c.years[n]+" · cifras en "+c.unit+" · "+c.fy},
    {kick:"Cifras clave "+yr(c,i),h:c.short+" en "+yr(c,i)+": ventas de "+U(c,m.rev)+" y utilidad de "+U(c,m.ni)+" "+c.unit,body:'<div class="big-tiles">'+tiles.map(t=>'<div class="tile"><div class="k">'+esc(t[0])+'</div><div class="v">'+t[1]+'</div><div class="s">'+esc(t[2])+'</div></div>').join("")+'</div>'},
    {kick:"Del ingreso a la utilidad · "+yr(c,i),h:"De cada 100 "+c.cur+" de ingresos quedaron "+nf(m.nm*100,1)+" de utilidad neta",body:chCada100(c,i)},
    {kick:"Estructura del balance",h:"En "+yr(c,i)+" el patrimonio financia el "+P1(m.eq/m.ta,0)+" del activo",body:chEstructura(c)},
    {kick:"Variación de la utilidad",h:"La utilidad neta pasó de "+U(c,a.ni)+" a "+U(c,b.ni)+" ("+SP((b.ni-a.ni)/Math.abs(a.ni))+") entre "+yr(c,ip-1)+" y "+yr(c,ip),body:chPuente(c,ip)},
    {kick:"Crecimiento "+c.years[0]+"–"+c.years[n],h:"Los ingresos crecieron "+(gr==null?"n/d":SP(gr))+" por año",body:chCrec(c)},
    {kick:"Márgenes",h:"El margen operativo fue "+P1(m.em)+" en "+yr(c,i),body:chMarg(c)},
    {kick:"Señales y lectura del analista",h:"Qué vigilar",body:'<div class="ger-grid" style="align-items:start">'+sigHTML(signals(c,i))+'<div><div class="insp-k">Lectura del analista</div><div class="notes-ro'+(nt?"":" empty")+'">'+esc(nt||"Sin lectura registrada.")+'</div></div></div>'}
  ];
}
function slideHTML(c,s,k,N){
  const foot='<div class="sfoot"><span>FinTarget · '+esc(c.name)+' · Fuente: '+esc(c.src.name)+'</span><span>'+(k+1)+' / '+N+'</span></div>';
  if(s.cover)return '<section class="slide cover"><div><div class="kick">'+esc(s.kick)+'</div><h2>'+esc(s.h)+'</h2><p>'+esc(s.p)+'</p></div><div></div>'+foot+'</section>';
  return '<section class="slide"><div><div class="kick">'+esc(s.kick)+'</div><h2>'+esc(s.h)+'</h2></div><div class="body">'+s.body+'</div>'+foot+'</section>';
}
let presReturn=null;
function drawSlide(){const c=C(),S=slides(c),k=ctx.slide=clamp(ctx.slide,0,S.length-1);$("pres-stage").innerHTML=slideHTML(c,S[k],k,S.length);$("pres-n").textContent=(k+1)+" / "+S.length;$("pres-title").textContent=c.name+" · presentación para gerencia";}
function openPres(){presReturn=document.activeElement;ctx.slide=0;$("pres").hidden=false;document.body.style.overflow="hidden";drawSlide();$("pres-close").focus();}
function closePres(){$("pres").hidden=true;document.body.style.overflow="";if(presReturn&&presReturn.focus)presReturn.focus();}
$("pres-next").addEventListener("click",()=>{ctx.slide++;drawSlide();});
$("pres-prev").addEventListener("click",()=>{ctx.slide--;drawSlide();});
$("pres-close").addEventListener("click",closePres);
$("pres-print").addEventListener("click",()=>{const c=C(),S=slides(c);$("print-deck").innerHTML=S.map((s,k)=>slideHTML(c,s,k,S.length)).join("");document.body.classList.add("print-pres");window.print();setTimeout(()=>document.body.classList.remove("print-pres"),500);});
document.addEventListener("keydown",e=>{if($("pres").hidden)return;if(e.key==="Escape")closePres();else if(e.key==="ArrowRight"||e.key==="PageDown"){ctx.slide++;drawSlide();}else if(e.key==="ArrowLeft"||e.key==="PageUp"){ctx.slide--;drawSlide();}});

/* ======================= Gerencia Analítica ======================= */
const CATS=[["all","Todas"],["diag","Diagnóstico"],["cap","Costo de capital y valor"],["risk","Riesgo y estructura"],["mkt","Mercado y macro"],["model","Modelos FinTarget"],["out","Entregables y monitoreo"]];
const KIND={vista:"Pantalla",calc:"Calcula aquí",skill:"Genera entregable",modelo:"Modelo FinTarget"};
const CAPM={TGLS:{rf:4.67,erp:4.46,crp:2.85,lam:1,src:"Taller TGLS · 28–29 ago 2026"},EC:{rf:4.2,erp:4.3,crp:3.0,lam:1,src:"Parámetros de ejemplo de la portada"},V:{rf:4.72,erp:4.33,crp:0,lam:0,src:"Taller VISA · 29 ago 2026"}};
const CIK={TGLS:"1534675 · 10-K",EC:"1444406 · 20-F",V:"1403161 · 10-K"};
const fld=(id,label,val,step,hint)=>'<div class="field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="number" value="'+val+'" step="'+(step||"any")+'">'+(hint?'<span class="hint">'+hint+'</span>':"")+'</div>';
const nv=id=>{const e=$(id);return e?parseFloat(e.value):NaN;};
const tile=(k,v,s,hero)=>'<div class="tile'+(hero?" hero":"")+'"><div class="k">'+k+'</div><div class="v">'+v+'</div>'+(s?'<div class="s">'+s+'</div>':"")+'</div>';
const money=v=>nf(v,0);
const dU=(c,v)=>+(v/c.div).toFixed(c.dec===0?0:2); // valor para inputs en unidades de presentación
const out=(id,html)=>{const e=$(id);if(e)e.innerHTML=html;};
function runBlock(title,cmd,lines,deliv){
  return '<div class="run"><div class="run-h"><b>'+esc(title)+'</b><button type="button" class="btn ghost" data-replay="1">Ejecutar de nuevo</button></div><div class="cmdline"><span>›</span>'+esc(cmd)+'</div><pre class="run-log" data-lines="'+attr(JSON.stringify(lines))+'"></pre></div>'+
    (deliv?'<div><div class="insp-k">Entregable</div><div class="deliv">'+deliv.map(d=>'<div><code>'+esc(d[0])+'</code><span>'+esc(d[1])+'</span></div>').join("")+'</div></div>':"");
}
function playRuns(){document.querySelectorAll("#ga-work .run-log").forEach(pre=>{const L=JSON.parse(pre.dataset.lines);pre.innerHTML="";let k=0;const step=()=>{if(k>=L.length||!pre.isConnected)return;const l=L[k++],cls=l[0]==="✓"?"ok":l[0]==="!"?"warn":l[0]==="·"?"dim":"";pre.innerHTML+='<span class="'+cls+'">'+esc(l)+'</span>\n';setTimeout(step,170);};step();});}

/* ---------- Herramientas ---------- */
const TOOLS=[
 {code:"FA",name:"Análisis vertical y horizontal",cat:"diag",kind:"vista",go:"fa",sub:"Estados financieros con mapa de calor, inspector y gráficos para comité",origin:"Skill VerticalAnalysis · talleres VISA, TGLS y Ecopetrol"},
 {code:"DX",name:"Diagnóstico de tu empresa",cat:"diag",kind:"vista",go:"dx",sub:"Sube balance y PyG: V/H, WACC, FCL, DCF, apalancamiento y Excel completo",origin:"FinTarget · carga de estados financieros"},
 {code:"RATIO",name:"Indicadores con semáforo",cat:"diag",kind:"calc",sub:"Liquidez, endeudamiento, actividad y rentabilidad en cinco años",origin:"Skill RatioAnalysis"},
 {code:"DUPONT",name:"ROE en tres factores",cat:"diag",kind:"calc",sub:"Margen × rotación × multiplicador y qué explica el cambio",origin:"Skill RatioAnalysis · taller VISA"},
 {code:"DES",name:"Perfil profundo de empresa",cat:"diag",kind:"skill",sub:"Investigación con SEC EDGAR, IR y mercado en un informe",origin:"Skill IncAnalyze"},
 {code:"DOSSIER",name:"Dossier completo",cat:"diag",kind:"skill",sub:"Perfil + V/H + indicadores + múltiplos + WACC en un paquete",origin:"Comando /fintarget-dossier"},
 {code:"WACC",name:"Costo de capital por sector",cat:"cap",kind:"vista",go:"wacc",sub:"WACC por sector CIIU en COP y USD, nominal y real",origin:"FinTarget V1"},
 {code:"CALC",name:"WACC de empresa no cotizada",cat:"cap",kind:"vista",go:"calc",sub:"Tasa con rating sintético y memo para el auditor",origin:"FinTarget Vol. 1.1"},
 {code:"BETA",name:"Betas: Hamada, Blume y pares",cat:"cap",kind:"calc",sub:"Reapalanca, ajusta y contrasta con emisores líquidos",origin:"Skill WaccModel · método del curso"},
 {code:"CRP",name:"Escenario de prima país",cat:"cap",kind:"calc",sub:"Choque a la prima país y efecto en el WACC por sector",origin:"FinTarget"},
 {code:"EVA",name:"EVA y ROIC frente al WACC",cat:"cap",kind:"calc",sub:"Valor económico agregado año a año",origin:"Taller VISA · WACC + EVA"},
 {code:"FCL",name:"Flujo de caja libre y valor",cat:"cap",kind:"calc",sub:"Del NOPAT al FCL y valor por perpetuidad",origin:"Ejercicios 1 y 4 · Gerencia Financiera"},
 {code:"WACCM",name:"Modelo WACC en Excel",cat:"cap",kind:"skill",sub:"Dos betas, libros y mercado, hoja de fuentes celda a celda",origin:"Skill WaccModel"},
 {code:"RV",name:"Múltiplos de mercado",cat:"cap",kind:"skill",sub:"P/E, EV/EBITDA, P/B y rendimientos con fuentes",origin:"Skill MarketRatios"},
 {code:"APAL",name:"Punto de equilibrio y apalancamientos",cat:"risk",kind:"calc",sub:"GAO, GAF y GAT con el caso MARTEX S.A.",origin:"Ejercicios 5 a 8 · Gerencia Financiera"},
 {code:"UPA",name:"UPA–UAII: deuda o acciones",cat:"risk",kind:"calc",sub:"Punto de indiferencia entre financiarse con deuda o con capital",origin:"Ejercicio 9 · Gerencia Financiera"},
 {code:"ALTZ",name:"Altman Z'' y rating implícito",cat:"risk",kind:"calc",sub:"Puntaje para mercados emergentes y equivalencia de rating",origin:"Altman (2005) · FinTarget"},
 {code:"MC",name:"Monte Carlo del valor",cat:"risk",kind:"calc",sub:"Distribución del valor de la empresa con crecimiento, margen y WACC inciertos",origin:"FinTarget · DCF estocástico"},
 {code:"ECO",name:"Macro Colombia",cat:"mkt",kind:"vista",go:"macro",sub:"Series que alimentan el costo de capital",origin:"FinTarget"},
 {code:"DAILY",name:"Reporte de mercado",cat:"mkt",kind:"skill",sub:"Agenda de EE. UU., Desayuno Bancolombia y Russell 2000",origin:"Skill DailyReport"},
 {code:"RATING",name:"Rating crediticio estimado",cat:"model",kind:"modelo",sub:"Calificación implícita con explicación por variable",origin:"Modelo FinTarget · dataset CCRD"},
 {code:"QUIEB",name:"Probabilidad de incumplimiento",cat:"model",kind:"modelo",sub:"Probabilidad a 1 y 3 años con sus factores",origin:"Modelo FinTarget"},
 {code:"VALOR",name:"Creación de valor",cat:"model",kind:"modelo",sub:"Probabilidad de que el ROIC supere al WACC el próximo año",origin:"Modelo FinTarget · etiqueta ROIC > WACC"},
 {code:"PRES",name:"Presentación para gerencia",cat:"out",kind:"calc",sub:"Ocho diapositivas listas para comité, imprimibles en PDF",origin:"FinTarget"},
 {code:"XL",name:"FinTarget en Excel",cat:"out",kind:"calc",sub:"Funciones =FT.WACC, =FT.FA, =FT.BETA en la hoja del analista",origin:"Complemento de Excel"},
 {code:"ALRT",name:"Alertas",cat:"out",kind:"calc",sub:"Reglas que vigilan empresas, sectores y fuentes",origin:"FinTarget"},
 {code:"CLEAN",name:"Limpieza de entregables",cat:"out",kind:"skill",sub:"Deja informes y modelos con voz de analista",origin:"Skill clean-finance"},
 {code:"DOC",name:"Método y fuentes",cat:"out",kind:"vista",go:"method",sub:"Fórmulas, controles de calidad y registro de fuentes",origin:"FinTarget"}
];
const T=code=>TOOLS.find(t=>t.code===code);

/* ---------- Implementaciones ---------- */
const IMPL={};
// Vistas: panel de lanzamiento
const VIEWDESC={
 DX:["Carga de Excel o CSV con balance y estado de resultados","Mapeo automático de cuentas con nivel de confianza","WACC con beta del sector, mercado y país","FCL histórico y proyectado, DCF y sensibilidad","Excel de 13 hojas con fórmulas vivas, informe y presentación"],
 FA:["Balance y resultados de cinco años en valores, vertical, horizontal e índice","Inspector por celda con fórmula, fuente y alertas","Seis gráficos para comité y modo presentación","Controles de calidad de datos sobre la fuente"],
 WACC:["12 sectores CIIU con beta desapalancada, D/E, Ke, Kd y WACC","COP/USD y nominal/real","Inspector del cálculo bottom-up y descarga CSV"],
 CALC:["WACC para empresa no cotizada","Rating sintético por cobertura de intereses","Memo de tasa de descuento para el auditor"],
 ECO:["TRM, tasa de política, inflación, TES, IBR y Brent","Sensibilidad del WACC mediano a cada insumo"],
 DOC:["Fórmulas de cada cálculo","Controles de calidad de datos","Registro de fuentes con estado y límites"]};
TOOLS.filter(t=>t.kind==="vista").forEach(t=>{IMPL[t.code]={render:()=>'<div class="cols2"><div><div class="insp-k">Qué contiene</div><div class="deliv">'+VIEWDESC[t.code].map(x=>'<div><code>·</code><span>'+esc(x)+'</span></div>').join("")+'</div><div class="linkrow"><button type="button" class="btn" data-open="'+t.go+'">Abrir '+esc(t.name.toLowerCase())+' →</button></div></div><div><div class="insp-k">Atajo</div><div class="cmdline"><span>›</span>'+(t.code==="FA"?C().tk+" FA":t.code)+'</div><p class="note">Escríbelo en la línea de comandos de la barra superior (Ctrl K).</p></div></div>'+
  (t.code==="FA"?'<div style="margin-top:16px">'+runBlock("Exportar el análisis a Excel","/FinTech:VerticalAnalysis \""+(C().tk==="TGLS"?"Data - TGLS.xlsx":C().tk==="EC"?"Ecopetrol.xlsx":"Taller - Analisis Financiero VISA.xlsx")+"\"",
    ["· Leyendo Balance y Estado de resultados ("+C().years[0]+"–"+C().years[LY(C())]+")","✓ Clasificación: empresa no financiera · NIC 1","✓ Hoja Análisis Vertical: "+(C().bal.filter(r=>r.v).length+C().pyg.filter(r=>r.v).length)*5+" fórmulas vinculadas","✓ Hoja Análisis Horizontal: variación anual y CAGR","✓ Mapa de calor por materialidad","! "+dq(C()).list.filter(d=>d.sev!=="ok").length+" alertas de calidad documentadas en Metodología","✓ Guardado sin sobrescribir el original"],
    [["Análisis Vertical","% del activo y de los ingresos, con fórmulas"],["Análisis Horizontal","variación anual, índice y CAGR"],["Metodología","estándar NIC 1 + CFA, fuente y alertas"]])+'</div>':"")};});

IMPL.RATIO={render(){const c=C(),defs=ratioDefs(c);
  return '<div class="tbl-scroll"><table class="mini-table"><thead><tr><th>Indicador</th>'+c.years.map((y,i)=>'<th'+(i===ctx.yi?' class="yfoc"':"")+'>'+y+'</th>').join("")+'<th style="text-align:left">'+yr(c,ctx.yi)+'</th></tr></thead><tbody>'+
   defs.map(d=>d.g?'<tr class="t-hdr"><td colspan="'+(c.years.length+2)+'" style="font:600 11px var(--f-body);letter-spacing:.08em;text-transform:uppercase;color:var(--sub);padding-top:12px">'+d.g+'</td></tr>':
     '<tr><td>'+d.l+'<br><small style="color:var(--sub);font-family:var(--f-mono);font-size:10.5px">'+d.f+'</small></td>'+c.years.map((y,i)=>'<td>'+d.fmt(M(c,i)[d.k])+'</td>').join("")+'<td style="text-align:left">'+(d.sem?stt(d.sem(M(c,ctx.yi)[d.k])):'<span class="stt info" style="color:var(--mute)">—</span>')+'</td></tr>').join("")+
   '</tbody></table></div><p class="note">Umbrales de referencia generales para empresa no financiera. La skill RatioAnalysis ajusta los umbrales por sector y deja cada razón como fórmula de Excel.</p>'+
   '<div style="margin-top:14px">'+runBlock("Exportar a Excel","/FinTech:RatioAnalysis "+c.tk,["· Leyendo hojas fuente","✓ 35 razones como fórmulas vinculadas","✓ Semáforos con umbrales del sector","✓ DuPont con chequeo de consistencia (producto = ROE)","✓ Hoja Indicadores agregada"],null)+'</div>';}};
function ratioDefs(c){const g=(lo,mid,inv)=>v=>v==null||!isFinite(v)?"info":inv?(v<=lo?"good":v<=mid?"warn":"crit"):(v>=lo?"good":v>=mid?"warn":"crit");
  const w=c.wacc?c.wacc.v/100:0.1;
  return [{g:"Liquidez"},{l:"Razón corriente",f:"AC / PC",k:"cr",fmt:v=>X(v),sem:g(1.5,1)},{l:"Prueba ácida",f:"(AC − inventarios) / PC",k:"quick",fmt:v=>X(v),sem:g(1,.7)},{l:"Capital de trabajo / activo",f:"(AC − PC) / AT",k:"wcta",fmt:v=>P1(v),sem:g(.1,0)},
   {g:"Endeudamiento"},{l:"Pasivo / activo",f:"PT / AT",k:"la",fmt:v=>P1(v),sem:g(.6,.75,1)},{l:"Deuda financiera / patrimonio",f:"DF / PN",k:"de",fmt:v=>X(v),sem:g(.8,1.5,1)},{l:"Deuda neta / EBITDA",f:"(DF − caja) / EBITDA",k:"nde",fmt:v=>X(v),sem:v=>v==null?"info":g(2,3.5,1)(v)},
   {g:"Cobertura"},{l:"EBIT / intereses",f:"EBIT / gasto por intereses",k:"cov",fmt:v=>X(v,1),sem:g(6,3)},
   {g:"Actividad"},{l:"Rotación del activo",f:"Ingresos / AT",k:"at",fmt:v=>X(v)},{l:"Días de cartera",f:"CxC / ingresos × 365",k:"dso",fmt:v=>nf(v,0),sem:g(60,90,1)},{l:"Días de inventario",f:"Inventario / costo × 365",k:"dio",fmt:v=>v==null?"n/a":nf(v,0)},{l:"Días de proveedores",f:"CxP / costo × 365",k:"dpo",fmt:v=>v==null?"n/a":nf(v,0)},
   {g:"Rentabilidad"},{l:"Margen bruto",f:"Utilidad bruta / ingresos",k:"gm",fmt:v=>P1(v)},{l:"Margen EBIT",f:"EBIT / ingresos",k:"em",fmt:v=>P1(v),sem:g(.15,.08)},{l:"Margen neto",f:"Utilidad neta / ingresos",k:"nm",fmt:v=>P1(v),sem:g(.1,.05)},
   {l:"ROA",f:"Utilidad neta / AT",k:"roa",fmt:v=>P1(v),sem:g(.08,.04)},{l:"ROE",f:"Utilidad neta / patrimonio atribuible",k:"roe",fmt:v=>P1(v),sem:g(.15,.08)},{l:"ROIC",f:"NOPAT / (DF + PN − caja)",k:"roic",fmt:v=>P1(v),sem:v=>v>w?"good":v>w-0.02?"warn":"crit"}];}

IMPL.DUPONT={render(){const c=C(),i=Math.max(1,ctx.yi),a=M(c,i-1),b=M(c,i),tot=Math.log(b.roe/a.roe),d=b.roe-a.roe;
  let dec="";if(a.roe>0&&b.roe>0&&Math.abs(tot)>1e-6){const f=[["Margen neto",Math.log(b.nm/a.nm)],["Rotación del activo",Math.log(b.at/a.at)],["Multiplicador",Math.log(b.mult/a.mult)]].map(x=>[x[0],x[1]/tot*d]);
    dec='<div class="tiles">'+tile("Cambio del ROE "+yr(c,i-1)+"→"+yr(c,i),PP(d),P1(a.roe)+" → "+P1(b.roe),1)+f.map(x=>tile("Aporte: "+x[0],PP(x[1]),"descomposición logarítmica")).join("")+'</div>';}
  return '<div class="gw-out">'+chDupont(c,ctx.yi)+dec+'<div class="tbl-scroll"><table class="mini-table"><thead><tr><th>Factor</th>'+c.years.map(y=>'<th>'+y+'</th>').join("")+'</tr></thead><tbody>'+
   [["Margen neto","nm",P1],["Rotación del activo","at",X],["Multiplicador del patrimonio","mult",X],["ROE = producto","roe",P1]].map(r=>'<tr'+(r[1]==="roe"?' class="hl"':"")+'><td>'+r[0]+'</td>'+c.years.map((y,j)=>'<td>'+r[2](M(c,j)[r[1]])+'</td>').join("")+'</tr>').join("")+'</tbody></table></div><p class="note">ROE sobre patrimonio atribuible a la controladora. La suma de aportes reproduce el cambio total del ROE.</p></div>';}};

IMPL.ALTZ={render(){const c=C(),z=c.years.map((y,i)=>altz(c,i)),k=ctx.yi,Z=z[k],zone=Z.z>5.85?["good","Zona segura"]:Z.z>=4.35?["warn","Zona gris"]:["crit","Zona de riesgo"];
  const comp=[["X1 · Capital de trabajo / activo",6.56*Z.x1],["X2 · Utilidades retenidas / activo",3.26*Z.x2],["X3 · EBIT / activo",6.72*Z.x3],["X4 · Patrimonio / pasivo",1.05*Z.x4]].sort((a,b)=>b[1]-a[1]);
  const W=600,H=64,x=v=>20+clamp(v,0,10)/10*(W-40);
  let g='<rect x="20" y="20" width="'+r1(x(4.35)-20)+'" height="16" fill="#d03b3b" fill-opacity=".22"/><rect x="'+r1(x(4.35))+'" y="20" width="'+r1(x(5.85)-x(4.35))+'" height="16" fill="#fab219" fill-opacity=".3"/><rect x="'+r1(x(5.85))+'" y="20" width="'+r1(x(10)-x(5.85))+'" height="16" fill="#0ca30c" fill-opacity=".2"/>';
  [0,2,4.35,5.85,8,10].forEach(t=>{g+=tx(x(t),54,nf(t,t%1?2:0),{a:"middle",fs:10,mono:1});});
  z.forEach((q,i)=>{g+='<circle cx="'+r1(x(q.z))+'" cy="28" r="'+(i===k?7:4)+'" fill="'+(i===k?CL.tot:"#7389A6")+'" stroke="#fff" stroke-width="2" data-tip="'+attr(c.years[i]+": Z'' "+nf(q.z,2)+" · "+q.r)+'"/>';});
  g+=tx(x(Z.z),12,yr(c,k)+" · "+nf(Z.z,2),{a:"middle",fs:11,mono:1,fill:CL.ink,w:600});
  return '<div class="gw-out"><div class="tiles">'+tile("Z'' "+yr(c,k),nf(Z.z,2),"Altman mercados emergentes",1)+tile("Zona",stt(zone[0]).replace(STT[zone[0]][1],zone[1]),"segura > 5,85 · riesgo < 4,35")+tile("Rating equivalente",Z.r,"tabla de equivalencias de Altman")+tile("Mayor aporte",comp[0][0].split(" · ")[0],nf(comp[0][1],2)+" puntos")+'</div>'+
   card("Dónde cae "+esc(c.short),"Puntaje Z'' por año sobre las tres zonas",svg(W,H,"Altman Z",g))+
   '<div class="tbl-scroll"><table class="mini-table"><thead><tr><th>Componente</th>'+c.years.map(y=>'<th>'+y+'</th>').join("")+'</tr></thead><tbody>'+
   [["X1 · (AC − PC) / AT","x1",P1],["X2 · Utilidades retenidas / AT","x2",P1],["X3 · EBIT / AT","x3",P1],["X4 · Patrimonio contable / pasivo","x4",X],["Z'' = 3,25 + 6,56·X1 + 3,26·X2 + 6,72·X3 + 1,05·X4","z",v=>nf(v,2)],["Rating equivalente","r",v=>v]].map(r=>'<tr'+(r[1]==="z"?' class="hl"':"")+'><td>'+r[0]+'</td>'+z.map(q=>'<td>'+r[2](q[r[1]])+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>'+
   '<p class="note">Usa patrimonio en libros, por eso sirve para empresas no cotizadas. '+(c.tk==="V"?"Las recompras de acciones reducen las utilidades retenidas (X2) y castigan el puntaje de Visa frente a su calificación real.":"Contrastar con la calificación vigente de S&P, Moody's o Fitch.")+'</p></div>';}};
function altz(c,i){const m=M(c,i),x1=(m.tca-m.tcl)/m.ta,x2=m.re/m.ta,x3=m.ebit/m.ta,x4=m.eq/m.tl,z=3.25+6.56*x1+3.26*x2+6.72*x3+1.05*x4;
  const T=[[8.15,"AAA"],[7.6,"AA+"],[7.3,"AA"],[7,"AA−"],[6.85,"A+"],[6.65,"A"],[6.4,"A−"],[6.25,"BBB+"],[5.85,"BBB"],[5.65,"BBB−"],[5.25,"BB+"],[4.95,"BB"],[4.75,"BB−"],[4.5,"B+"],[4.15,"B"],[3.75,"B−"],[3.2,"CCC+"],[2.5,"CCC"],[1.75,"CCC−"],[-99,"D"]];
  return {x1,x2,x3,x4,z,r:T.find(t=>z>=t[0])[1]};}

IMPL.EVA={render(){const c=C(),m=M(c,ctx.yi);
  return '<div class="gw-grid"><form class="gw-form" onsubmit="return false"><h4>'+esc(c.short)+' · '+yr(c,ctx.yi)+' · '+esc(c.unit)+'</h4>'+fld("e-ebit","EBIT",dU(c,m.ebit))+fld("e-t","Tasa efectiva de impuestos (%)",+(m.t*100).toFixed(1),0.1,"Impuesto / utilidad antes de impuestos")+'<div class="row2">'+fld("e-d","Deuda financiera",dU(c,m.debt))+fld("e-e","Patrimonio",dU(c,m.eq))+'</div>'+fld("e-c","Caja",dU(c,m.cash))+fld("e-w","WACC (%)",c.wacc.v,0.01,esc(c.wacc.note))+(c.wacc.alt?'<button type="button" class="btn ghost" data-set="e-w:'+c.wacc.alt+'">Usar escenario empresa '+nf(c.wacc.alt,2)+'%</button>':"")+'</form><div class="gw-out" id="e-out"></div></div>';},
 calc(){const c=C(),ebit=nv("e-ebit"),t=nv("e-t")/100,d=nv("e-d"),e=nv("e-e"),ca=nv("e-c"),w=nv("e-w")/100,nop=ebit*(1-t),ic=d+e-ca,roic=nop/ic,eva=nop-w*ic;
  const unit=c.unit,f=v=>nf(v,c.dec),gold=c.golden&&ctx.yi===LY(c)&&Math.abs(eva-c.golden.eva2025)<10;
  const series=c.years.map((y,i)=>{const q=M(c,i);return {y,eva:(q.nopat-w*q.ic)/c.div,roic:q.roic};});
  const bars=series.map(s=>({l:String(s.y),a:0,b:s.eva*c.div,t:s.eva>=0?"d":"d",v:s.eva*c.div}));
  out("e-out",'<div class="tiles">'+tile("NOPAT",f(nop),"EBIT × (1 − t)")+tile("Capital invertido",f(ic),"deuda + patrimonio − caja")+tile("ROIC",P1(roic),"NOPAT / capital")+tile("Spread",PP(roic-w),"ROIC − WACC")+tile("EVA "+yr(c,ctx.yi),f(eva),unit,1)+'</div>'+
   (gold?'<div><span class="badge ok">✓ Coincide con el taller VISA: EVA 2025 = 18.728 USD mm (prueba de referencia)</span></div>':"")+
   card("EVA por año con WACC de "+nf(w*100,2)+"%","Valor económico agregado · "+esc(unit)+" · pasa el cursor para ver el ROIC",evaBars(c,series,w)));}};
function evaBars(c,series,w){const W=600,H=240,mL=58,mR=8,mT=20,mB=30,vals=series.map(s=>s.eva),tk=nice(Math.min(0,...vals),Math.max(0,...vals),4),ys=v=>mT+(1-(v-tk[0])/(tk[tk.length-1]-tk[0]))*(H-mT-mB),gw=(W-mL-mR)/series.length,bw=gw*.5;let g="";
  tk.forEach(t=>{g+='<line x1="'+mL+'" x2="'+(W-mR)+'" y1="'+r1(ys(t))+'" y2="'+r1(ys(t))+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(mL-6,ys(t)+4,nf(t,0),{a:"end",fs:10,mono:1});});
  series.forEach((s,i)=>{const x=mL+gw*i+(gw-bw)/2,top=ys(Math.max(0,s.eva)),bot=ys(Math.min(0,s.eva));g+='<rect x="'+r1(x)+'" y="'+r1(top)+'" width="'+r1(bw)+'" height="'+r1(Math.max(bot-top,1.5))+'" rx="2" fill="'+(s.eva>=0?CL.pos:CL.neg)+'" data-tip="'+attr(s.y+"<br>EVA: "+nf(s.eva,c.dec)+"<br>ROIC: "+P1(s.roic)+" · WACC: "+P1(w,2))+'"/>'+tx(x+bw/2,s.eva>=0?top-5:bot+12,nf(s.eva,c.dec),{a:"middle",fs:10.5,mono:1,fill:CL.ink})+tx(x+bw/2,H-10,s.y,{a:"middle",fs:11,mono:1});});
  return svg(W,H,"EVA por año",g);}

IMPL.FCL={render(){const c=C(),i=Math.max(1,ctx.yi),m=M(c,i),p=M(c,i-1),da=m.da||0,capex=m.ppe-p.ppe+da,dk=m.ktno-p.ktno;
  return '<div class="gw-grid"><form class="gw-form" onsubmit="return false"><h4>'+esc(c.short)+' · '+yr(c,i)+' · '+esc(c.unit)+'</h4>'+fld("f-ebit","EBIT",dU(c,m.ebit))+fld("f-t","Tasa efectiva (%)",+(m.t*100).toFixed(1),0.1)+fld("f-da","Depreciación y amortización",dU(c,da),"any",c.map.accdep?"Proxy: variación de la depreciación acumulada":c.map.da?"EBITDA − EBIT":"EBITDA − EBIT")+fld("f-capex","CAPEX",dU(c,capex),"any","Proxy: Δ PP&E neto + D&A")+fld("f-dk","Δ capital de trabajo operativo",dU(c,dk),"any","Δ (cartera + inventarios − proveedores)")+'<div class="row2">'+fld("f-w","WACC (%)",c.wacc.v,0.01)+fld("f-g","Crecimiento g (%)",3,0.1)+'</div></form><div class="gw-out" id="f-out"></div></div>';},
 calc(){const c=C(),ebit=nv("f-ebit"),t=nv("f-t")/100,da=nv("f-da"),cx=nv("f-capex"),dk=nv("f-dk"),w=nv("f-w")/100,g=nv("f-g")/100,nop=ebit*(1-t),fcl=nop+da-cx-dk,val=w>g?fcl*(1+g)/(w-g):null,f=v=>nf(v,c.dec),k=c.div;
  const bars=[{l:"NOPAT",a:0,b:nop*k,t:"tot"},{l:"+ D&A",a:nop*k,b:(nop+da)*k,t:"d",v:da*k},{l:"− CAPEX",a:(nop+da)*k,b:(nop+da-cx)*k,t:"d",v:-cx*k},{l:"− Δ capital de trabajo",a:(nop+da-cx)*k,b:fcl*k,t:"d",v:-dk*k},{l:"FCL",a:0,b:fcl*k,t:"tot"}];
  out("f-out",'<div class="tiles">'+tile("NOPAT",f(nop),"EBIT × (1 − t)")+tile("Flujo de caja libre",f(fcl),c.unit,1)+tile("Conversión FCL / NOPAT",P1(fcl/nop),"")+tile("Valor de la operación",val==null?"n/a":f(val),val==null?"g debe ser menor que el WACC":"FCL × (1 + g) / (WACC − g)")+'</div>'+
   card("Del NOPAT al flujo de caja libre",esc(c.unit),wfall(c,bars,600,280,"Flujo de caja libre"))+'<p class="note">La fuente no trae estado de flujos de efectivo: CAPEX y capital de trabajo se aproximan desde el balance. Con el flujo de efectivo del 10-K o del informe anual se reemplazan por las cifras reportadas.</p>');}};

IMPL.APAL={render(){return '<div class="gw-grid"><form class="gw-form" onsubmit="return false"><h4>MARTEX S.A. · camisas · mensual</h4>'+fld("a-p","Precio de venta por unidad",120000,1000)+fld("a-cv","Costo variable unitario",70050,50,"Materia prima 63.800 + mano de obra 6.250")+fld("a-cf","Costos fijos",25000000,100000)+fld("a-q","Unidades vendidas",600,10)+'<div class="row2">'+fld("a-d","Deuda financiera",25000000,100000)+fld("a-r","Tasa de interés E.A. (%)",15,0.5)+'</div><div class="row2">'+fld("a-t","Impuesto (%)",0,1,"El ejercicio llega hasta UAI")+fld("a-n","Acciones",1000,10)+'</div></form><div class="gw-out" id="a-out"></div></div>';},
 calc(){const P=nv("a-p"),cv=nv("a-cv"),cf=nv("a-cf"),Q=nv("a-q"),I=nv("a-d")*nv("a-r")/100,t=nv("a-t")/100,N=nv("a-n"),mcu=P-cv;
  if(!(mcu>0)){out("a-out",'<p class="note">El precio debe superar el costo variable unitario.</p>');return;}
  const qe=cf/mcu,V=P*Q,mc=mcu*Q,ebit=mc-cf,uai=ebit-I,un=uai-Math.max(0,uai)*t,gao=ebit>0?mc/ebit:null,gaf=uai>0?ebit/uai:null,gat=gao&&gaf?gao*gaf:null;
  out("a-out",'<div class="tiles">'+tile("Punto de equilibrio",nf(Math.ceil(qe),0)+" u","ventas de $"+money(qe*P))+tile("Margen de seguridad",P1((Q-qe)/Q),"sobre "+nf(Q,0)+" unidades")+tile("UAII",money(ebit),"utilidad operativa")+tile("GAO",gao?X(gao):"n/a","operativo")+tile("GAF",gaf?X(gaf):"n/a","financiero")+tile("GAT",gat?X(gat):"n/a","GAO × GAF",1)+tile("UPA",money(un/N),"por acción")+'</div>'+
   (gat?'<p style="margin:0">Si las ventas suben 10%, la UAII sube <b class="num">'+nf(gao*10,1)+'%</b> y la utilidad antes de impuestos <b class="num">'+nf(gat*10,1)+'%</b>. Al duplicar las ventas, la UAI crece '+nf(gat*100,0)+'%: la comprobación del ejercicio 8.</p>':"")+
   card("Ingresos y costos según unidades vendidas","Punto de equilibrio y nivel actual de ventas",breakeven(P,cv,cf,Q,qe)));}};
function breakeven(P,cv,cf,Q,qe){const W=600,H=270,mL=70,mR=16,mT=14,mB=32,qmax=Math.max(qe*2,Q*1.4),ymax=P*qmax,tk=nice(0,ymax,4),xs=q=>mL+q/qmax*(W-mL-mR),ys=v=>mT+(1-v/tk[tk.length-1])*(H-mT-mB);let g="";
  tk.forEach(t=>{g+='<line x1="'+mL+'" x2="'+(W-mR)+'" y1="'+r1(ys(t))+'" y2="'+r1(ys(t))+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(mL-6,ys(t)+4,nf(t/1e6,0)+" M",{a:"end",fs:10,mono:1});});
  nice(0,qmax,5).forEach(q=>{if(q<=qmax)g+=tx(xs(q),H-12,nf(q,0),{a:"middle",fs:10,mono:1});});
  g+='<path d="M'+r1(xs(0))+" "+r1(ys(cf))+" L"+r1(xs(qe))+" "+r1(ys(cf+cv*qe))+" L"+r1(xs(qe))+" "+r1(ys(P*qe))+" L"+r1(xs(0))+" "+r1(ys(0))+'Z" fill="#B23A2E" fill-opacity=".08"/>';
  g+='<path d="M'+r1(xs(qe))+" "+r1(ys(P*qe))+" L"+r1(xs(qmax))+" "+r1(ys(P*qmax))+" L"+r1(xs(qmax))+" "+r1(ys(cf+cv*qmax))+'Z" fill="#2B5797" fill-opacity=".08"/>';
  g+='<line x1="'+r1(xs(0))+'" x2="'+r1(xs(qmax))+'" y1="'+r1(ys(cf))+'" y2="'+r1(ys(cf))+'" stroke="#8A9199" stroke-width="1.2"/>'+tx(xs(qmax)-4,ys(cf)-6,"Costo fijo",{a:"end",fs:10.5});
  g+='<line x1="'+r1(xs(0))+'" x2="'+r1(xs(qmax))+'" y1="'+r1(ys(cf))+'" y2="'+r1(ys(cf+cv*qmax))+'" stroke="'+CL.s[1]+'" stroke-width="2"/><line x1="'+r1(xs(0))+'" x2="'+r1(xs(qmax))+'" y1="'+r1(ys(0))+'" y2="'+r1(ys(P*qmax))+'" stroke="'+CL.s[0]+'" stroke-width="2"/>';
  g+=tx(xs(qmax)-4,ys(P*qmax)+16,"Ingresos",{a:"end",fs:11,fill:CL.ink})+tx(xs(qmax)-4,ys(cf+cv*qmax)+16,"Costo total",{a:"end",fs:11,fill:CL.ink});
  g+='<line x1="'+r1(xs(Q))+'" x2="'+r1(xs(Q))+'" y1="'+mT+'" y2="'+(H-mB)+'" stroke="'+CL.tot+'" stroke-dasharray="3 3"/>'+tx(xs(Q)+5,mT+12,"Ventas actuales: "+nf(Q,0)+" u",{fs:10.5,fill:CL.ink});
  g+='<circle cx="'+r1(xs(qe))+'" cy="'+r1(ys(P*qe))+'" r="6" fill="'+CL.tot+'" stroke="#fff" stroke-width="2" data-tip="'+attr("Equilibrio: "+nf(qe,1)+" unidades<br>Ventas: $"+money(qe*P))+'"/>'+tx(xs(qe)+9,ys(P*qe)+16,"Equilibrio "+nf(Math.ceil(qe),0)+" u",{fs:11,mono:1,fill:CL.ink});
  for(let k=0;k<40;k++){const q0=qmax*k/40,q1=qmax*(k+1)/40,qm=(q0+q1)/2;g+='<rect x="'+r1(xs(q0))+'" y="'+mT+'" width="'+r1(xs(q1)-xs(q0))+'" height="'+(H-mT-mB)+'" fill="transparent" data-tip="'+attr(nf(qm,0)+" unidades<br>Ingresos: $"+money(P*qm)+"<br>Costo total: $"+money(cf+cv*qm)+"<br>UAII: $"+money((P-cv)*qm-cf))+'"/>';}
  return svg(W,H,"Punto de equilibrio",g)+'<div class="ch-legend"><span><i style="background:'+CL.s[0]+'"></i>Ingresos</span><span><i style="background:'+CL.s[1]+'"></i>Costo total</span><span><i style="background:#B23A2E;opacity:.35"></i>Zona de pérdida</span><span><i style="background:#2B5797;opacity:.35"></i>Zona de utilidad</span></div>';}

IMPL.UPA={render(){return '<div class="gw-grid"><form class="gw-form" onsubmit="return false"><h4>Financiar $6.000.000 · ejercicio 9</h4><div class="row2">'+fld("u-n","Acciones actuales",4000,100)+fld("u-pa","Precio por acción",1000,10)+'</div>'+fld("u-f","Necesidad de financiación",6000000,100000)+'<div class="row2">'+fld("u-r","Tasa de la deuda E.A. (%)",24,0.5)+fld("u-t","Impuesto (%)",30,1)+'</div><div class="row2">'+fld("u-p","Precio unitario",1500,10)+fld("u-cv","Costo variable unitario",900,10)+'</div><div class="row2">'+fld("u-cf","Costos fijos",4050000,10000)+fld("u-q","Unidades esperadas",11000,100)+'</div></form><div class="gw-out" id="u-out"></div></div>';},
 calc(){const N=nv("u-n"),pa=nv("u-pa"),F=nv("u-f"),r=nv("u-r")/100,t=nv("u-t")/100,P=nv("u-p"),cv=nv("u-cv"),cf=nv("u-cf"),Q=nv("u-q"),I=F*r,nA=N+F/pa,nB=N,ebit=(P-cv)*Q-cf;
  const upa=(e,i,n)=>{const u=e-i;return (u-Math.max(0,u)*t)/n;},es=I*nA/(nA-nB),qs=(es+cf)/(P-cv),A=upa(ebit,0,nA),B=upa(ebit,I,nB);
  out("u-out",'<div class="tiles">'+tile("UAII esperada",money(ebit),nf(Q,0)+" unidades")+tile("UPA · emitir acciones",money(A),nf(nA,0)+" acciones")+tile("UPA · tomar deuda",money(B),"intereses $"+money(I))+tile("UAII de indiferencia",money(es),nf(qs,0)+" unidades",1)+'</div>'+
   '<p style="margin:0">Con una UAII de <b class="num">$'+money(ebit)+'</b>, la opción '+(B>A?"de <b>deuda</b>":"de <b>acciones</b>")+' da la mayor UPA (diferencia de $'+money(Math.abs(B-A))+' por acción). Por encima de $'+money(es)+' de UAII conviene la deuda; por debajo, las acciones.</p>'+
   card("UPA según la UAII","Las dos alternativas de financiación y su punto de indiferencia",upaChart(es,ebit,I,nA,nB,upa))+'<p class="note">Las diapositivas originales calculaban la indiferencia con 2.500 y 1.000 acciones; aquí se usan las acciones de cada opción (10.000 y 4.000), como en la versión corregida del ejercicio.</p>');}};
function upaChart(es,ebit,I,nA,nB,upa){const W=600,H=260,mL=60,mR=16,mT=14,mB=32,xmax=Math.max(es*2,ebit*1.3),fA=e=>upa(e,0,nA),fB=e=>upa(e,I,nB),ylo=Math.min(fA(0),fB(0)),yhi=Math.max(fA(xmax),fB(xmax)),tk=nice(ylo,yhi,4),xs=e=>mL+e/xmax*(W-mL-mR),ys=v=>mT+(1-(v-tk[0])/(tk[tk.length-1]-tk[0]))*(H-mT-mB);let g="";
  tk.forEach(v=>{g+='<line x1="'+mL+'" x2="'+(W-mR)+'" y1="'+r1(ys(v))+'" y2="'+r1(ys(v))+'" stroke="'+(v===0?CL.axis:CL.grid)+'"/>'+tx(mL-6,ys(v)+4,nf(v,0),{a:"end",fs:10,mono:1});});
  nice(0,xmax,5).forEach(e=>{if(e<=xmax)g+=tx(xs(e),H-12,nf(e/1e6,1)+" M",{a:"middle",fs:10,mono:1});});
  const path=f=>{let d="";for(let k=0;k<=60;k++){const e=xmax*k/60;d+=(k?"L":"M")+r1(xs(e))+" "+r1(ys(f(e)));}return d;};
  g+='<path d="'+path(fA)+'" fill="none" stroke="'+CL.s[0]+'" stroke-width="2"/><path d="'+path(fB)+'" fill="none" stroke="'+CL.s[1]+'" stroke-width="2"/>';
  g+=tx(xs(xmax)-4,ys(fA(xmax))+(fA(xmax)>fB(xmax)?-8:16),"Acciones",{a:"end",fs:11,fill:CL.ink})+tx(xs(xmax)-4,ys(fB(xmax))+(fB(xmax)>fA(xmax)?-8:16),"Deuda",{a:"end",fs:11,fill:CL.ink});
  g+='<line x1="'+r1(xs(ebit))+'" x2="'+r1(xs(ebit))+'" y1="'+mT+'" y2="'+(H-mB)+'" stroke="'+CL.tot+'" stroke-dasharray="3 3"/>'+tx(xs(ebit)+5,mT+12,"UAII esperada",{fs:10.5,fill:CL.ink});
  g+='<circle cx="'+r1(xs(es))+'" cy="'+r1(ys(fA(es)))+'" r="6" fill="'+CL.tot+'" stroke="#fff" stroke-width="2" data-tip="'+attr("Indiferencia<br>UAII: $"+money(es)+"<br>UPA: $"+money(fA(es)))+'"/>'+tx(xs(es)+9,ys(fA(es))+16,"Indiferencia $"+nf(es/1e6,2)+" M",{fs:11,mono:1,fill:CL.ink});
  for(let k=0;k<40;k++){const e0=xmax*k/40,e1=xmax*(k+1)/40,em=(e0+e1)/2;g+='<rect x="'+r1(xs(e0))+'" y="'+mT+'" width="'+r1(xs(e1)-xs(e0))+'" height="'+(H-mT-mB)+'" fill="transparent" data-tip="'+attr("UAII $"+money(em)+"<br>UPA acciones: $"+money(fA(em))+"<br>UPA deuda: $"+money(fB(em)))+'"/>';}
  return svg(W,H,"UPA UAII",g)+'<div class="ch-legend"><span><i style="background:'+CL.s[0]+'"></i>Emitir acciones</span><span><i style="background:'+CL.s[1]+'"></i>Tomar deuda</span></div>';}

IMPL.BETA={render(){const c=C(),m=M(c,ctx.yi),q=(CAPM[c.tk]||c.capm||CAPM.EC),b=c.beta||{};
  return '<div class="gw-grid"><form class="gw-form" onsubmit="return false"><h4>Reapalancar (Hamada) · '+esc(c.short)+'</h4>'+fld("b-bu","Beta desapalancada βu",b.bu||0.9,0.01,b.buSrc?esc(b.buSrc):"Comparables del sector")+fld("b-de","D/E de la empresa",+m.de.toFixed(3),0.01,"Deuda financiera / patrimonio "+yr(c,ctx.yi))+fld("b-t","Impuesto (%)",+(m.t*100).toFixed(1),0.1)+'<h4 style="margin-top:6px">CAPM en USD</h4><div class="row2">'+fld("b-rf","Rf (%)",q.rf,0.01)+fld("b-erp","ERP (%)",q.erp,0.01)+'</div><div class="row2">'+fld("b-crp","CRP (%)",q.crp,0.01)+fld("b-l","λ exposición país",q.lam,0.1)+'</div><h4 style="margin-top:6px">Ajuste de Blume</h4>'+fld("b-raw","Beta de regresión (cruda)",b.raw||1,0.001,b.reg?esc(b.reg):"60 meses vs índice")+'<span class="hint">'+esc(q.src)+'</span></form><div class="gw-out" id="b-out"></div></div>';},
 calc(){const c=C(),bu=nv("b-bu"),de=nv("b-de"),t=nv("b-t")/100,rf=nv("b-rf"),erp=nv("b-erp"),crp=nv("b-crp"),l=nv("b-l"),raw=nv("b-raw"),bl=bu*(1+(1-t)*de),blume=0.67*raw+0.33,ke=rf+bl*erp+l*crp,keR=rf+blume*erp+l*crp;
  const peers=[["Ecopetrol",0.62,0.94,"Petróleo y gas"],["ISA",0.38,0.58,"Energía eléctrica"],["GEB",0.41,0.61,"Energía eléctrica"],["Bancolombia",0.71,0.98,"Bancos (Ke)"],["Grupo Argos",0.66,0.89,"Cemento e infraestructura"],["Nutresa",0.44,0.63,"Alimentos"]];
  const W=600,H=40+3*34,xs=v=>150+v/2*(W-180);let g="";[0,0.5,1,1.5,2].forEach(v=>{g+='<line x1="'+r1(xs(v))+'" x2="'+r1(xs(v))+'" y1="10" y2="'+(H-22)+'" stroke="'+CL.grid+'"/>'+tx(xs(v),H-6,nf(v,1),{a:"middle",fs:10,mono:1});});
  [["Regresión cruda",raw],["Blume 0,67·β + 0,33",blume],["Bottom-up reapalancada",bl]].forEach((r,k)=>{const y=24+k*34;g+=tx(140,y+4,r[0],{a:"end",fs:11.5,fill:CL.ink})+'<line x1="'+r1(xs(0))+'" x2="'+r1(xs(r[1]))+'" y1="'+y+'" y2="'+y+'" stroke="'+CL.axis+'"/><circle cx="'+r1(xs(r[1]))+'" cy="'+y+'" r="7" fill="'+CL.s[k]+'" stroke="#fff" stroke-width="2"/>'+tx(xs(r[1])+12,y+4,nf(r[1],3),{fs:11,mono:1,fill:CL.ink});});
  out("b-out",'<div class="tiles">'+tile("β reapalancada",nf(bl,3),"βu × [1 + (1 − t) × D/E]",1)+tile("β Blume",nf(blume,3),"de "+nf(raw,3)+" cruda")+tile("Ke bottom-up (USD)",nf(ke,2)+"%","Rf + β × ERP + λ × CRP")+tile("Ke con regresión",nf(keR,2)+"%","misma fórmula con β Blume")+'</div>'+
   card("Tres betas para "+esc(c.short),"La diferencia entre regresión y bottom-up es la que se discute con el auditor",svg(W,H,"Betas",g))+
   '<div class="insp-k">Validación con emisores líquidos de Colombia</div><div class="tbl-scroll"><table class="mini-table"><thead><tr><th>Emisor</th><th>Sector</th><th>β regresión</th><th>β bottom-up</th><th>Diferencia</th></tr></thead><tbody>'+peers.map(p=>'<tr><td>'+p[0]+'</td><td style="font-family:var(--f-body)">'+p[3]+'</td><td>'+nf(p[1],2)+'</td><td>'+nf(p[2],2)+'</td><td>+'+nf(p[2]-p[1],2)+'</td></tr>').join("")+'</tbody></table></div><p class="note">Con poca liquidez la regresión sesga la beta hacia cero. FinTarget publica la beta bottom-up y deja esta tabla como control de cada corte.</p>');}};

IMPL.CRP={render(){return '<div class="gw-out"><div class="range-row"><label for="crp-s" style="font-size:13px">Cambio en la prima país</label><input id="crp-s" type="range" min="-2" max="4" step="0.1" value="'+ctx.shock+'"><b class="num" id="crp-v"></b></div><div class="sec-pick" id="crp-pick">'+api.S.map((s,i)=>'<button type="button" data-sec="'+i+'" aria-pressed="'+(ctx.crp.indexOf(i)>-1)+'">'+esc(s.n)+'</button>').join("")+'</div><div id="crp-out"></div></div>';},
 calc(){const sh=ctx.shock=nv("crp-s");$("crp-v").textContent=(sh>=0?"+":"−")+nf(Math.abs(sh),1)+" pp";
  const rows=ctx.crp.map(i=>{const s=api.S[i],m=api.calc(s,s.de),delta=api.conv(m.keU+sh)-api.conv(m.keU),w=m.w+m.we*delta;return {n:s.n,base:m.w,w,d:(w-m.w)*100,bl:m.bl,de:s.de};});
  if(!rows.length){out("crp-out",'<p class="note">Selecciona al menos un sector.</p>');return;}
  const W=600,rh=28,L=210,R=W-80,H=rows.length*rh+10,mx=Math.max(1,...rows.map(r=>Math.abs(r.d))),xs=v=>L+(v+(sh<0?mx:0))/(mx*(sh<0?2:1))*(R-L);let g="";
  rows.forEach((r,k)=>{const y=4+k*rh,a=xs(Math.min(0,r.d)),b=xs(Math.max(0,r.d));g+=tx(L-10,y+15,esc(r.n),{a:"end",fs:12,fill:CL.ink})+'<rect x="'+r1(a)+'" y="'+(y+5)+'" width="'+r1(Math.max(b-a,1.5))+'" height="'+(rh-12)+'" rx="2" fill="'+(r.d>=0?CL.neg:CL.pos)+'" data-tip="'+attr(esc(r.n)+"<br>WACC "+nf(r.base,2)+"% → "+nf(r.w,2)+"%")+'"/>'+tx(b+6,y+15,(r.d>=0?"+":"−")+nf(Math.abs(r.d),0)+" pb",{fs:11,mono:1,fill:CL.ink});});
  out("crp-out",'<div class="tbl-scroll"><table class="mini-table"><thead><tr><th>Sector</th><th>WACC base</th><th>Escenario</th><th>Cambio</th><th>βL</th><th>D/E</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.n)+'</td><td>'+nf(r.base,2)+'%</td><td>'+nf(r.w,2)+'%</td><td>'+(r.d>=0?"+":"−")+nf(Math.abs(r.d),0)+' pb</td><td>'+nf(r.bl,2)+'</td><td>'+nf(r.de,2)+'</td></tr>').join("")+'</tbody></table></div>'+
   card("Cambio del WACC por sector","Puntos básicos · "+api.st.cur+" "+(api.st.real?"real":"nominal")+" · λ = 1",svg(W,H,"Cambio del WACC",g))+'<p class="note">El choque entra al Ke en USD con λ = 1; el costo de la deuda queda fijo. Los sectores con menos deuda absorben más el choque porque pesan más en patrimonio.</p>');}};

IMPL.MC={render(){const c=C(),k=LY(c),m=M(c,k),g0=cagr(M(c,0).rev,m.rev,k);
  return '<div class="gw-grid"><form class="gw-form" onsubmit="return false"><h4>'+esc(c.short)+' · base '+yr(c,k)+' · '+esc(c.unit)+'</h4><div class="row2">'+fld("mc-g","Crecimiento medio (%)",+(clamp(g0==null?0.05:g0,0,0.15)*100).toFixed(1),0.1)+fld("mc-gs","Desviación (pp)",3,0.1)+'</div><div class="row2">'+fld("mc-m","Margen EBIT medio (%)",+(m.em*100).toFixed(1),0.1)+fld("mc-ms","Desviación (pp)",2.5,0.1)+'</div><div class="row2">'+fld("mc-w","WACC medio (%)",c.wacc?c.wacc.v:10,0.01)+fld("mc-ws","Desviación (pp)",0.75,0.05)+'</div><div class="row2">'+fld("mc-tg","g perpetuo (%)",3,0.1)+fld("mc-n","Simulaciones",5000,500)+'</div><span class="hint">Tasa de impuestos de la historia de la empresa y conversión FCL / NOPAT de 85%. Semilla fija.</span></form><div class="gw-out" id="mc-out"></div></div>';},
 calc(){const c=C(),k=LY(c),m=M(c,k),g=nv("mc-g")/100,gs=nv("mc-gs")/100,mg=nv("mc-m")/100,ms=nv("mc-ms")/100,w=nv("mc-w")/100,ws=nv("mc-ws")/100,tg=nv("mc-tg")/100,N=clamp(Math.round(nv("mc-n")),500,20000);
  let seed=20261007;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;},gau=()=>Math.sqrt(-2*Math.log(rnd()||1e-9))*Math.cos(2*Math.PI*rnd());
  const conv=0.85,t=m.t,base=x=>{let rev=m.rev,pv=0,f=0;for(let y=1;y<=5;y++){rev*=1+x.g;f=rev*x.m*(1-t)*conv;pv+=f/Math.pow(1+x.w,y);}return pv+f*(1+tg)/(x.w-tg)/Math.pow(1+x.w,5);};
  const ev0=base({g,m:mg,w}),R=[],I=[];for(let s=0;s<N;s++){const x={g:g+gs*gau(),m:Math.max(0.01,mg+ms*gau()),w:Math.max(tg+0.01,w+ws*gau())};const v=base(x);R.push(v);I.push([x.g,x.m,x.w,v]);}
  const so=R.slice().sort((a,b)=>a-b),q=p=>so[Math.floor(p*(so.length-1))],pIC=R.filter(v=>v<m.ic).length/N;
  const corr=j=>{const xs=I.map(r=>r[j]),ys=I.map(r=>r[3]),mx=xs.reduce((a,b)=>a+b,0)/N,my=ys.reduce((a,b)=>a+b,0)/N;let a=0,b=0,d=0;for(let i=0;i<N;i++){a+=(xs[i]-mx)*(ys[i]-my);b+=(xs[i]-mx)**2;d+=(ys[i]-my)**2;}return a/Math.sqrt(b*d);};
  const lo=q(0.005),hi=q(0.995),nb=34,bw=(hi-lo)/nb,bins=new Array(nb).fill(0);R.forEach(v=>{if(v<lo||v>hi)return;bins[Math.min(nb-1,Math.floor((v-lo)/bw))]++;});
  const W=600,H=230,mL=10,mB=34,bm=Math.max(...bins),xs=v=>mL+(v-lo)/(hi-lo)*(W-2*mL);let gx="";
  bins.forEach((b,j)=>{const v=lo+j*bw,h=b/bm*(H-24-mB);gx+='<rect x="'+r1(xs(v)+1)+'" y="'+r1(H-mB-h)+'" width="'+r1((W-2*mL)/nb-2)+'" height="'+r1(h)+'" fill="'+(v+bw<=q(0.05)?CL.neg:v>=q(0.95)?CL.sub2:"#A9B8CB")+'" data-tip="'+attr(U(c,v)+" – "+U(c,v+bw)+"<br>"+P1(b/N,1)+" de las simulaciones")+'"/>';});
  [[q(0.05),"P5","end"],[q(0.5),"P50","middle"],[q(0.95),"P95","start"]].forEach(([v,l,a])=>{gx+='<line x1="'+r1(xs(v))+'" x2="'+r1(xs(v))+'" y1="14" y2="'+(H-mB)+'" stroke="'+CL.tot+'"/>'+tx(xs(v)+(a==="end"?-4:a==="start"?4:0),11,l+" "+U(c,v),{a,fs:10.5,mono:1,fill:CL.ink});});
  gx+='<line x1="'+mL+'" x2="'+(W-mL)+'" y1="'+(H-mB)+'" y2="'+(H-mB)+'" stroke="'+CL.axis+'"/>'+tx(W/2,H-10,"Valor de la operación · "+esc(c.unit),{a:"middle",fs:11});
  const T_=[["Crecimiento de ingresos",corr(0)],["Margen EBIT",corr(1)],["WACC",corr(2)]].sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));let tz="";const W2=600,L2=190,mid=L2+(W2-L2-60)/2,hw=(W2-L2-60)/2;
  tz+='<line x1="'+mid+'" x2="'+mid+'" y1="0" y2="'+T_.length*30+'" stroke="'+CL.axis+'"/>';T_.forEach((f,j)=>{const y=j*30,wd=Math.abs(f[1])*hw;tz+=tx(L2-10,y+19,f[0],{a:"end",fs:12,fill:CL.ink})+'<rect x="'+r1(f[1]>=0?mid:mid-wd)+'" y="'+(y+7)+'" width="'+r1(Math.max(wd,1.5))+'" height="16" rx="2" fill="'+(f[1]>=0?CL.pos:CL.neg)+'"/>'+tx(f[1]>=0?mid+wd+6:mid-wd-6,y+19,nf(f[1],2),{a:f[1]>=0?"start":"end",fs:11,mono:1,fill:CL.ink});});
  out("mc-out",'<div class="tiles">'+tile("Valor mediano (P50)",U(c,q(0.5)),esc(c.unit),1)+tile("Rango P5 – P95",U(c,q(0.05))+" – "+U(c,q(0.95)),"90% de los escenarios")+tile("Valor con supuestos medios",U(c,ev0),"DCF determinista")+tile("P(valor < capital invertido)",P1(pIC,0),"capital invertido "+U(c,m.ic))+'</div>'+
   card("Distribución del valor de la operación",N.toLocaleString("es-CO")+" escenarios · rojo: peor 5% · azul oscuro: mejor 5%",svg(W,H,"Histograma",gx))+card("Qué mueve el valor","Correlación de cada supuesto con el valor simulado · azul sube el valor, rojo lo baja",svg(W2,T_.length*30+4,"Sensibilidad",tz)));}};

/* ---------- Skills (corridas simuladas) ---------- */
function skillPanel(desc,recibe,cmd,lines,deliv,last){return '<div class="cols2" style="margin-bottom:16px"><div><div class="insp-k">Qué hace</div><p style="margin:0">'+desc+'</p></div><div><div class="insp-k">Qué recibe</div><p style="margin:0">'+recibe+'</p>'+(last?'<div class="insp-k">Última corrida real</div><p style="margin:0">'+last+'</p>':"")+'</div></div>'+runBlock("Corrida · "+C().short,cmd,lines,deliv);}
IMPL.DES={render(){const c=C(),m=M(c,LY(c));return skillPanel("Investiga una empresa desde las bases primarias y entrega un informe en Markdown con estados financieros de cinco años, rentabilidad, apalancamiento, valoración, comparables y gráficas.","El nombre de la empresa. Pública o privada, de EE. UU., Colombia o LatAm.","/FinTech:IncAnalyze "+c.short,
  ["· SEC EDGAR companyfacts · CIK "+(CIK[c.tk]||"archivo cargado"),"✓ Estados financieros FY"+c.years[0]+"–FY"+c.years[LY(c)]+" descargados","✓ Yahoo Finance · 60 meses de precios mensuales","✓ stockanalysis.com · múltiplos por año fiscal","✓ Relación con inversionistas · presentación de resultados más reciente",(c.tk==="TGLS"?"! Ingresos 2021–22: Investing difiere del 10-K → se usa el 10-K":"✓ Fuentes reconciliadas sin diferencias materiales"),"✓ Ingresos "+c.years[LY(c)]+": "+U(c,m.rev)+" "+c.unit+" · margen EBIT "+P1(m.em)+" · ROE "+P1(m.roe),"✓ Informe: "+c.short+"_Perfil_2026-10-06.md · 14 secciones · 9 gráficas"],
  [["Resumen y tesis","una página"],["Estados financieros","cinco años con fuente por cifra"],["Rentabilidad y DuPont","márgenes, ROE, ROIC"],["Valoración","múltiplos frente a pares"],["Riesgos","país, moneda, concentración"],["Fuentes","enlace exacto de cada dato"]],"Tesla · 22 ago 2026 · Analisis_Tesla_2026-08-22.md");}};
IMPL.DOSSIER={render(){const c=C();return skillPanel("Orquesta las skills de análisis en un solo paquete: lo escrito de IncAnalyze con lo numérico de VerticalAnalysis, RatioAnalysis, MarketRatios y WaccModel.","El ticker o nombre de la empresa.","/fintarget-dossier "+c.tk,
  ["· 1/5 IncAnalyze · perfil y fuentes primarias","✓ 2/5 VerticalAnalysis · "+(c.bal.filter(r=>r.v).length+c.pyg.filter(r=>r.v).length)+" partidas en vertical y horizontal","✓ 3/5 RatioAnalysis · 35 indicadores, DuPont consistente","✓ 4/5 MarketRatios · múltiplos y hoja Fuentes","✓ 5/5 WaccModel · WACC "+nf(c.wacc.v,2)+"% · EVA "+U(c,M(c,LY(c)).nopat-c.wacc.v/100*M(c,LY(c)).ic),"! "+dq(c).list.filter(d=>d.sev==="alta").length+" alertas de datos llevadas a la portada","✓ Dossier_"+c.tk+"_2026-10-06/ · 1 Excel, 1 informe, 1 presentación"],
  [["Dossier_"+c.tk+".xlsx","Balance, PyG, V/H, Indicadores, Múltiplos, WACC, Fuentes"],["Perfil_"+c.tk+".md","informe escrito con gráficas"],["Comite_"+c.tk+".pdf","las ocho diapositivas de la vista Gerencia"]],null);}};
IMPL.WACCM={render(){const c=C(),m=M(c,LY(c)),q=(CAPM[c.tk]||c.capm||CAPM.EC),b=c.beta||{},bl=(b.bu||0.9)*(1+(1-m.t)*m.de);
  const L=c.tk==="MI"?["✓ Rf "+nf(q.rf,2)+"% · ERP "+nf(q.erp,2)+"% · CRP "+nf(q.crp*q.lam,2)+"%","✓ βu "+nf(b.bu||0.9,2)+" ("+(b.buSrc||"sector")+") → βL "+nf(bl,2),"✓ Kd por rating sintético según cobertura de intereses","✓ WACC "+nf(c.wacc.v,2)+"%","✓ Hoja Fuentes con cada supuesto"]:c.tk==="V"?["✓ Rf UST 10 años 4,72% · ERP Damodaran 4,33% · sin prima país (emisor de EE. UU.)","✓ Beta de regresión 60 meses vs S&P 500: 0,765 (R² 0,38)","✓ βu Information Services 0,74 → βL 1,162 (Hamada, t 17,1%)","✓ Kd 5,0% → 4,15% después de impuestos","✓ Pesos a libros: deuda 40,8% · patrimonio 59,2%","✓ WACC empresa 6,45% · WACC sector 7,47%","✓ EVA 2025: 19.205 (empresa) · 18.728 (sector)"]:
   c.tk==="TGLS"?["✓ Rf UST 10 años 4,67% · ERP 4,46% · CRP Colombia 2,85%","✓ βu Engineering/Construction 1,09 → βL 1,27 (Hamada, t 32,2%)","✓ Beta de regresión 60 meses: 1,385 cruda · 1,250 Blume","✓ Kd 6,98%: tasa efectiva de la deuda en el 10-K (SOFR + 1,25%)","✓ Ke ≈ 13% · Kd(1 − t) ≈ 4,7%","✓ WACC 11,5% a libros · 12,4% a mercado","✓ Hoja Fuentes: 14 enlaces celda a celda"]:
   ["✓ Rf "+nf(q.rf,2)+"% · ERP "+nf(q.erp,2)+"% · CRP "+nf(q.crp,2)+"%","✓ βu Oil/Gas Integrated 0,90 → βL "+nf(0.9*(1+(1-m.t)*m.de),2)+" (Hamada, t "+P1(m.t)+")","✓ Beta de regresión ADR EC 60 meses: 1,12 · Blume 1,08","✓ Kd: rendimiento del bono 2033 en USD 7,6%","✓ Conversión a COP por diferencial de inflación","✓ WACC "+nf(c.wacc.v,1)+"% en USD a libros","✓ Hoja Fuentes: 16 enlaces celda a celda"];
  return skillPanel("Construye el WACC a nivel de banca de inversión: CAPM por dos caminos (beta bottom-up reapalancada y beta de regresión), costo de la deuda después de impuestos, ponderación a libros y a mercado, y tabla de sensibilidad.","Un Excel con balance y resultados, o solo el ticker.","/FinTech:WaccModel "+c.tk,L,
   [["Inputs","cada supuesto con su fuente"],["Beta","regresión, Blume y bottom-up"],["WACC","libros y mercado, sensibilidad D/E × Ke"],["EVA","NOPAT, capital invertido, ROIC − WACC"],["Fuentes","enlace exacto de cada dato web"]],c.tk==="V"?"VISA · 3 sep 2026 · Taller VISA (WACC + EVA).xlsx":c.tk==="TGLS"?"Tecnoglass · 29 ago 2026 · WACC - TGLS.xlsx":null);}};
IMPL.RV={render(){const c=C(),m=M(c,LY(c));
  const L=c.tk==="MI"?["· La empresa no cotiza: se usan múltiplos de comparables del sector","✓ EV/EBITDA mediano del sector 7,8x · P/E 13,5x","✓ Valor implícito por múltiplos frente al DCF de la vista DX","✓ Hoja Fuentes con los comparables usados"]:c.tk==="V"?["✓ Precio US$ 381,60 (28 ago 2026) · 1.840 millones de acciones","✓ Capitalización FY2021–25 alineada al cierre del 30 sep","✓ P/E FY25 32,0x · P/B 16,8x · EV/EBITDA 22,9x","✓ Promedio 5 años: P/E 28,9x · EV/EBITDA 21,4x","✓ Dividend yield 0,7% · FCF yield 3,1%","✓ Hoja Fuentes: 22 enlaces celda a celda"]:
    c.tk==="TGLS"?["✓ Precio US$ 40,01 (28 ago 2026) · 44,74 millones de acciones (portada 10-K)","✓ Capitalización ≈ US$ 1.790 mm","✓ P/E "+nf(40.01/3.42,1)+"x · P/B "+nf(1790/713.05,2)+"x","✓ EV ≈ US$ "+nf(1790+171.63-100.9-3.15,0)+" mm · EV/EBITDA "+nf((1790+171.63-100.9-3.15)/259.09,1)+"x","✓ Dividend yield "+nf(0.6/40.01*100,1)+"%","✓ Hoja Fuentes con enlace de cada dato"]:
    ["✓ Precio de referencia COP 1.950 · 41.117 millones de acciones","✓ Capitalización ≈ COP 80,2 billones","✓ P/E "+nf(80178/9029,1)+"x · P/B "+nf(80178/(109246-25486),2)+"x","✓ EV ≈ COP "+nf(80178+109247-10694-1838,0)+" mil millones · EV/EBIT "+nf((80178+109247-10694-1838)/26506,1)+"x","✓ Dividend yield 9,8%","✓ Hoja Fuentes con enlace de cada dato"];
  return skillPanel("Calcula los múltiplos que mezclan una cifra contable con el precio de la acción, anclados al año fiscal real, y reconcilia acciones, precio, deuda y caja entre varias fuentes.","Un Excel con los fundamentales o el ticker.","/FinTech:MarketRatios "+c.tk,L,[["Ratios de Mercado","P/E, P/B, EV/EBITDA, rendimientos"],["Datos de Mercado","precio, acciones, capitalización por año"],["Fuentes","link de cada dato, celda a celda"]],c.tk==="V"?"VISA · 29 ago 2026":c.tk==="TGLS"?"Tecnoglass · 29 ago 2026 · Data - TGLS.xlsx":null);}};
IMPL.DAILY={render(){return skillPanel("Produce el paquete semanal de inteligencia de mercado: noticias económicas de EE. UU., glosario del último Desayuno con Bancolombia y lectura del Russell 2000.","Nada: busca la última edición de cada fuente.","/FinTech:DailyReport",
  ["✓ Forex Factory · 23 eventos USD de la semana 5–9 oct, 6 de alto impacto","✓ Desayuno con Bancolombia · edición del 6 oct 2026 (PDF)","✓ Russell 2000 · cierre semanal y rango de 52 semanas","✓ 4 gráficas: sorpresas económicas, reacción del mercado, múltiplos, técnico","✓ Informe_Mercado_Semana_05-09_Oct_2026.md"],[["Agenda USD","dato, consenso, resultado y sorpresa"],["Glosario Bancolombia","términos del informe explicados"],["Russell 2000","lectura de small caps"]],"Semana 31 ago – 4 sep 2026 · Informe_Forex_Factory_USD");}};
IMPL.CLEAN={render(){const c=C(),m=M(c,LY(c)),p=M(c,1);return skillPanel("Limpia informes y modelos para que se lean como el trabajo de un analista: quita relleno, adjetivos inflados y notas obvias, y conserva fuentes, supuestos y números.","Un Excel, un informe o un memo.","/clean-finance Informe_"+c.tk+".md",
  ["✓ 42 frases revisadas","✓ 17 adjetivos sin respaldo eliminados","✓ 6 notas de celda que repetían la fórmula, eliminadas","✓ Fuentes y supuestos intactos"],null,null)+
  '<div class="cols2" style="margin-top:16px"><div><div class="insp-k">Antes</div><p class="note" style="font-size:13px">Es importante destacar que la compañía muestra un desempeño robusto y sólido, evidenciando una notable capacidad para generar valor en un entorno desafiante.</p></div><div><div class="insp-k">Después</div><p style="font-size:13px;margin:10px 0 0">El margen EBIT pasó de '+P1(p.em)+' en '+c.years[1]+' a '+P1(m.em)+' en '+c.years[LY(c)]+'; el ROE de '+c.years[LY(c)]+' fue '+P1(m.roe)+'.</p></div></div>';}};

/* ---------- Modelos FinTarget (salidas simuladas) ---------- */
const NOTCH=["AAA","AA+","AA","AA−","A+","A","A−","BBB+","BBB","BBB−","BB+","BB","BB−","B+","B","B−","CCC+","CCC","CCC−"];
const COUNTRY={TGLS:-0.9,EC:-1.2,V:0};
function ratingModel(c,i){const m=M(c,i),lev=m.nde!=null?clamp((2-m.nde)/1.5,-2,2):clamp((1-m.de)/0.6,-2,2);
  const F=[["Cobertura de intereses",.2,m.cov?clamp((Math.log(m.cov)-Math.log(4))/1.2,-2,2):-1,X(m.cov,1)],["Apalancamiento",.15,lev,m.nde!=null?"DN/EBITDA "+X(m.nde,1):"D/E "+X(m.de)],["Margen EBIT",.1,clamp((m.em-.12)/.08,-2,2),P1(m.em)],["ROA",.1,clamp((m.roa-.06)/.05,-2,2),P1(m.roa)],["Tamaño (activo en USD)",.25,clamp((Math.log10(taUSD(c,i))-3.8)/.7,-2,2),"US$ "+nf(taUSD(c,i),0)+" mm"],["Liquidez",.05,clamp((m.cr-1.3)/.5,-2,2),X(m.cr)],["Riesgo país",.3,COUNTRY[c.tk]!=null?COUNTRY[c.tk]:(c.country==="Colombia"?-1.2:0),c.country||(c.tk==="V"?"EE. UU.":"Colombia")]];
  const score=F.reduce((s,f)=>s+f[1]*f[2],0),n=clamp(11.5-5.3*score,1,19),pn=NOTCH.map((x,k)=>{const z=(k+1-n)/1.3;return Math.exp(-z*z/2);}),sum=pn.reduce((a,b)=>a+b,0);
  return {F:F.map(f=>({l:f[0],v:f[3],c:5.3*f[1]*f[2]})),n,r:NOTCH[Math.round(n)-1],p:pn.map(x=>x/sum)};}
IMPL.RATING={render(){const c=C(),R=ratingModel(c,ctx.yi),ig=R.p.slice(0,10).reduce((a,b)=>a+b,0),buckets=[["AAA–AA",0,4],["A",4,7],["BBB",7,10],["BB",10,13],["B",13,16],["CCC o menor",16,19]].map(b=>[b[0],R.p.slice(b[1],b[2]).reduce((a,x)=>a+x,0)]);
  const W=600,H=220,mL=40,mB=30,bw=(W-mL-10)/buckets.length;let g="";[0,.25,.5,.75,1].forEach(t=>{const y=10+(1-t)*(H-10-mB);g+='<line x1="'+mL+'" x2="'+(W-10)+'" y1="'+r1(y)+'" y2="'+r1(y)+'" stroke="'+(t===0?CL.axis:CL.grid)+'"/>'+tx(mL-6,y+4,nf(t*100,0)+"%",{a:"end",fs:10,mono:1});});
  buckets.forEach((b,k)=>{const h=b[1]*(H-10-mB),x=mL+k*bw+bw*.2;g+='<rect x="'+r1(x)+'" y="'+r1(H-mB-h)+'" width="'+r1(bw*.6)+'" height="'+r1(Math.max(h,1))+'" rx="2" fill="'+(k<3?CL.pos:CL.F[1])+'" data-tip="'+attr(b[0]+": "+P1(b[1]))+'"/>'+tx(x+bw*.3,H-mB-h-5,P1(b[1],0),{a:"middle",fs:10.5,mono:1,fill:CL.ink})+tx(x+bw*.3,H-10,b[0],{a:"middle",fs:11,fill:CL.ink});});
  const sh=R.F.slice().sort((a,b)=>Math.abs(b.c)-Math.abs(a.c)),mx=Math.max(...sh.map(f=>Math.abs(f.c))),W2=600,rh=28,L=190,mid=L+(W2-L-90)/2,hw=(W2-L-90)/2;let s="";
  s+='<line x1="'+mid+'" x2="'+mid+'" y1="0" y2="'+(sh.length*rh)+'" stroke="'+CL.axis+'"/>';
  sh.forEach((f,k)=>{const y=k*rh,w=Math.abs(f.c)/mx*hw;s+=tx(L-10,y+16,esc(f.l),{a:"end",fs:12,fill:CL.ink})+tx(L-10,y+27,esc(f.v),{a:"end",fs:10,mono:1})+'<rect x="'+r1(f.c>=0?mid:mid-w)+'" y="'+(y+6)+'" width="'+r1(Math.max(w,1.5))+'" height="'+(rh-12)+'" rx="2" fill="'+(f.c>=0?CL.pos:CL.neg)+'" data-tip="'+attr(esc(f.l)+": "+(f.c>=0?"+":"−")+nf(Math.abs(f.c),2)+" escalones")+'"/>'+tx(f.c>=0?mid+w+6:mid-w-6,y+17,(f.c>=0?"+":"−")+nf(Math.abs(f.c),2),{a:f.c>=0?"start":"end",fs:10.5,mono:1,fill:CL.ink});});
  return '<div class="gw-out"><div class="tiles">'+tile("Rating estimado · "+yr(c,ctx.yi),R.r,"escala S&P, escalón "+nf(R.n,1),1)+tile("Grado de inversión",P1(ig,0),"probabilidad BBB− o mejor")+tile("Z'' de Altman",nf(altz(c,ctx.yi).z,2),"equivale a "+altz(c,ctx.yi).r)+tile("Rating sintético Damodaran",ratingSint(M(c,ctx.yi).cov),"solo cobertura de intereses")+'</div>'+
   card("Distribución de probabilidad","Clase de rating predicha para "+esc(c.short),svg(W,H,"Probabilidades",g))+card("Qué empuja la calificación","Aporte de cada variable, en escalones · azul mejora, rojo empeora",svg(W2,sh.length*rh+4,"Aportes",s))+
   '<div class="cols2"><div><div class="insp-k">Ficha del modelo</div><div class="deliv"><div><code>Algoritmo</code><span>LightGBM multiclase con restricciones de monotonicidad</span></div><div><code>Datos</code><span>CCRD: 5.403 observaciones, 678 emisores, 16 ratios, 2010–2016, con CIK</span></div><div><code>Validación</code><span>Por emisor, fuera de muestra: 47% exacto · 81% a ±1 escalón · 96% IG/HY</span></div><div><code>Explicación</code><span>SHAP por observación</span></div></div></div><div><div class="insp-k">Cómo leerlo</div><p class="note" style="margin-top:0">El modelo estima la calificación que tendría la empresa por sus cifras. No reemplaza la de una agencia: sirve para comparar, detectar emisores fuera de su categoría y explicar qué variable pesa.</p></div></div></div>';}};
function ratingSint(cov){if(cov==null)return "n/d";const T=[[8.5,"AAA"],[6.5,"AA"],[5.5,"A+"],[4.25,"A"],[3,"A−"],[2.5,"BBB"],[2.25,"BB+"],[2,"BB"],[1.75,"B+"],[1.5,"B"],[1.25,"B−"],[0.8,"CCC"],[-1e9,"CC"]];return T.find(t=>cov>=t[0])[1];}
function pdModel(c,i){const m=M(c,i),z=altz(c,i).z,lc=Math.log(Math.max(m.cov||1,0.5)),sz=Math.log10(taUSD(c,i))-4,logit=1.2-0.95*z-0.4*lc-0.6*sz,pd=1/(1+Math.exp(-logit));return {pd,pd3:1-Math.pow(1-pd,3)*0.97,z,lc,sz,F:[["Z'' de Altman",-0.95*(z-5)],["Cobertura de intereses",-0.4*(lc-Math.log(4))],["Tamaño",-0.6*sz]]};}
IMPL.QUIEB={render(){const c=C(),k=ctx.yi,R=pdModel(c,k),ser=c.years.map((y,i)=>pdModel(c,i).pd);
  return '<div class="gw-out"><div class="tiles">'+tile("Probabilidad a 1 año",P1(R.pd,2),yr(c,k),1)+tile("Probabilidad a 3 años",P1(R.pd3,2),"acumulada")+tile("Equivalente de rating",pdRating(R.pd),"tasas históricas de incumplimiento")+tile("Z''",nf(R.z,2),altz(c,k).r)+'</div>'+
   card("Probabilidad de incumplimiento a 1 año","Serie "+c.years[0]+"–"+c.years[LY(c)]+" · "+esc(c.short),lineChart({xs:c.years,series:[{l:"PD 1 año",col:CL.s[0],v:ser}],fmt:v=>P1(v,2),lo:0,mR:90,label:"PD"}))+
   '<div class="insp-k">Factores del año</div><div class="deliv">'+R.F.map(f=>'<div><code>'+(f[1]<=0?"reduce":"aumenta")+'</code><span>'+f[0]+' · '+(f[1]<=0?"−":"+")+nf(Math.abs(f[1]),2)+' en log-odds</span></div>').join("")+'</div><p class="note">Regresión logística sobre Z\'\', cobertura y tamaño, calibrada con incumplimientos de empresas de EE. UU. (UCLA-LoPucki y el dataset de quiebras de Kaggle) y ajustada a las tasas históricas de S&P por rating.</p></div>';}};
function pdRating(pd){const T=[[0.0002,"AAA–AA"],[0.0006,"A"],[0.002,"BBB"],[0.008,"BB"],[0.04,"B"],[1,"CCC o menor"]];return T.find(t=>pd<=t[0])[1];}
IMPL.VALOR={render(){const c=C(),k=ctx.yi,w=c.wacc.v/100,ro=c.years.map((y,i)=>M(c,i).roic),m=M(c,k),sp=m.roic-w,dsp=k>0?(m.roic-M(c,k-1).roic):0,z=(sp+0.5*dsp)/0.04,prob=0.5*(1+erf(z/Math.SQRT2)),next=m.roic+0.5*dsp,ebitStar=w*m.ic/(1-m.t);
  return '<div class="gw-out"><div class="tiles">'+tile("Probabilidad ROIC > WACC",P1(prob,0),"año siguiente",1)+tile("ROIC "+yr(c,k),P1(m.roic),"NOPAT / capital invertido")+tile("WACC",nf(c.wacc.v,2)+"%",c.wacc.demo?"ejemplo":"talleres")+tile("ROIC esperado",P1(next),"tendencia amortiguada")+tile("EBIT de equilibrio",U(c,ebitStar),"EVA = 0 · "+esc(c.unit))+'</div>'+
   card("ROIC frente al WACC","Serie histórica y proyección del año siguiente con banda de ±1 desviación",lineChart({xs:c.years.concat([String(c.years[LY(c)]+1)+"e"]),series:[{l:"ROIC",col:CL.s[0],v:ro.concat([next])},{l:"WACC",col:CL.s[1],v:c.years.map(()=>w).concat([w])}],bands:[{lo:next-0.04,hi:next+0.04,col:"rgba(43,87,151,.08)"}],fmt:v=>P1(v),afmt:v=>P1(v,0),lo:0,label:"ROIC vs WACC"}))+
   '<p class="note">Clasificador de la etiqueta ROIC > WACC entrenado sobre el S&P 500 con features de rentabilidad, inversión y tendencia; la salida está calibrada como probabilidad.</p></div>';}};
function erf(x){const s=Math.sign(x);x=Math.abs(x);const t=1/(1+0.3275911*x),y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y;}

/* ---------- Entregables y monitoreo ---------- */
IMPL.PRES={render(){const c=C();return '<div class="cols2"><div><div class="insp-k">Diapositivas</div><div class="deliv">'+slides(c).map((s,k)=>'<div><code>'+(k+1)+'</code><span>'+esc(s.cover?"Portada · "+s.h:s.h)+'</span></div>').join("")+'</div><div class="linkrow"><button type="button" class="btn" data-pres="1">Abrir presentación de '+esc(c.short)+'</button></div></div><div><div class="insp-k">Para quién</div><p style="margin:0">Comité o junta. Usa los gráficos de la vista FA, los titulares se escriben con las cifras del año foco y la última diapositiva lleva la lectura del analista. Se imprime en PDF horizontal.</p></div></div>';}};
IMPL.XL={render(){const c=C(),r0=api.rowsData()[0],r11=api.rowsData()[11],inv=ix(c)["bal:inv"]||ix(c)["bal:ar"],k=4,m=M(c,k),bt=c.beta&&c.beta.blume;
  const rows=[['=FT.WACC("3511";"COP";"2026-09-30")',nf(r0.m.w,2)+"%"],['=FT.WACC("6201";"USD")',nf(api.calc(api.S[11],api.S[11].de,{cur:"USD",real:false}).w,2)+"%"],['=FT.FA("'+c.tk+'";"'+inv.l+'";'+c.years[k]+';"V")',P1(inv.v[k]/ix(c)["bal:ta"].v[k])],['=FT.RATIO("'+c.tk+'";"ROE";'+c.years[k]+')',P1(m.roe)],['=FT.ALTZ("'+c.tk+'";'+c.years[k]+')',nf(altz(c,k).z,2)],['=FT.BETA("'+c.tk+'";"5A";"BLUME")',bt?nf(bt,3):"1,080"],['=FT.CRP("COL";HOY())',nf(api.P.crp,2)+"%"],['=FT.SERIE("TRM";"2026-01-01";HOY())',"matriz 189 × 2"]];
  return '<div class="xl"><div class="h"><span></span><span>A · fórmula</span><span>B · resultado</span></div>'+rows.map((r,k)=>'<div><span>'+(k+1)+'</span><span>'+esc(r[0])+'</span><span>'+r[1]+'</span></div>').join("")+'</div><p class="note">Cada función devuelve la cifra con su corte y versión, igual que en la plataforma. El analista sigue trabajando en su propio Excel y FinTarget le entrega los datos.</p>';}};
IMPL.ALRT={render(){const A=[];
  CO().forEach(k=>{const c=E[k],m=M(c,LY(c));const sg=signals(c,LY(c)).filter(s=>s.s!=="good"&&s.k!=="Calidad de datos");sg.slice(0,2).forEach(s=>A.push([s.s,c.tk,s.k,s.t,"hoy 06:00"]));const na=nAlta(c);if(na)A.push(["warn",c.tk,"Calidad de datos",na+" celdas fuera de escala o en conflicto con la fuente primaria","hoy 06:00"]);});
  A.push(["warn","Sector","Software y servicios TI","β desapalancada +0,08 en la semana (umbral 0,05)","lun 06:00"]);A.push(["info","Macro","Prima país implícita","+18 pb en cinco días hábiles","ayer 18:00"]);
  const rules=[["Margen EBIT cae más de 3 pp desde el máximo","empresas seguidas","diaria"],["Cobertura de intereses menor a 3x","empresas seguidas","trimestral"],["Beta de un sector cambia más de 0,05","12 sectores","semanal"],["Prima país implícita se mueve más de 15 pb","Colombia","diaria"],["Celda fuera de escala o subtotal sin cuadre","todas las fuentes","en cada carga"]];
  return '<div class="insp-k">Disparadas</div><div class="dq">'+A.map(a=>'<div class="dq-item" style="grid-template-columns:96px 1fr auto">'+stt(a[0])+'<div><b>'+esc(a[1])+' · '+esc(a[2])+'</b><div style="color:var(--sub)">'+esc(a[3])+'</div></div><span class="num" style="font-size:11.5px;color:var(--sub)">'+a[4]+'</span></div>').join("")+'</div>'+
   '<div class="insp-k" style="margin-top:18px">Reglas activas</div><div class="tbl-scroll"><table class="mini-table"><thead><tr><th>Regla</th><th>Alcance</th><th>Frecuencia</th><th>Canal</th></tr></thead><tbody>'+rules.map(r=>'<tr><td>'+r[0]+'</td><td style="font-family:var(--f-body)">'+r[1]+'</td><td style="font-family:var(--f-body)">'+r[2]+'</td><td style="font-family:var(--f-body)">Correo y resumen de las 06:00</td></tr>').join("")+'</tbody></table></div>';}};

/* ---------- Render GA ---------- */
function gaVisible(t){return (ctx.cat==="all"||t.cat===ctx.cat)&&(!ctx.q||(t.code+" "+t.name+" "+t.sub+" "+t.origin).toLowerCase().indexOf(ctx.q)>-1);}
function renderGAList(){
  $("ga-cats").innerHTML=CATS.map(c=>'<button type="button" data-cat="'+c[0]+'" aria-pressed="'+(ctx.cat===c[0])+'">'+c[1]+'</button>').join("");
  let h='<button type="button" class="ga-item" data-tool="HOME" aria-current="'+(ctx.tool==="HOME")+'"><code>GA</code><span>Todas las herramientas<small>vista general</small></span></button>';
  CATS.slice(1).forEach(cat=>{const ts=TOOLS.filter(t=>t.cat===cat[0]&&gaVisible(t));if(!ts.length)return;h+='<div class="ga-grp">'+cat[1]+'</div>'+ts.map(t=>'<button type="button" class="ga-item" data-tool="'+t.code+'" aria-current="'+(ctx.tool===t.code)+'"><code>'+t.code+'</code><span>'+esc(t.name)+'<small>'+KIND[t.kind]+'</small></span></button>').join("");});
  $("ga-list").innerHTML=h;
}
function renderGAWork(){
  const w=$("ga-work");
  if(ctx.tool==="HOME"||!T(ctx.tool)){
    w.innerHTML='<div class="gw-head"><div><div class="gw-code">GA · GERENCIA ANALÍTICA</div><h2>Todas las herramientas en un lugar</h2><p>Cálculos del curso de Gerencia Financiera, skills que generan entregables y modelos de FinTarget. Todas leen la empresa activa ('+esc(C().short)+') y se abren también desde la línea de comandos.</p></div></div>'+
      CATS.slice(1).map(cat=>{const ts=TOOLS.filter(t=>t.cat===cat[0]&&gaVisible(t));return ts.length?'<div class="insp-k">'+cat[1]+'</div><div class="overview">'+ts.map(t=>'<button type="button" class="ov-card" data-tool="'+t.code+'"><code>'+t.code+' · '+KIND[t.kind]+'</code><b>'+esc(t.name)+'</b><span>'+esc(t.sub)+'</span></button>').join("")+'</div>':"";}).join("");
    return;}
  const t=T(ctx.tool),im=IMPL[t.code];
  w.innerHTML='<div class="gw-head"><div><div class="gw-code">'+t.code+' · '+KIND[t.kind].toUpperCase()+'</div><h2>'+esc(t.name)+'</h2><p>'+esc(t.sub)+' · '+esc(t.origin)+'</p></div><div class="actions">'+(["vista","calc","modelo"].indexOf(t.kind)>-1&&t.code!=="CRP"&&t.code!=="APAL"&&t.code!=="UPA"?'<span class="badge gold">'+esc(C().short)+' · '+yr(C(),ctx.yi)+'</span>':"")+'</div></div>'+(im?im.render():"");
  if(im&&im.calc)im.calc();
  playRuns();
}
function renderGA(){coSeg("ga-co");const n={vista:0,calc:0,skill:0,modelo:0};TOOLS.forEach(t=>n[t.kind]++);
  $("ga-meta").innerHTML='<span>'+TOOLS.length+' herramientas</span><span>'+n.calc+' calculan aquí</span><span>'+n.skill+' generan entregables</span><span>'+n.modelo+' modelos FinTarget</span><span>'+n.vista+' pantallas</span>';
  renderGAList();renderGAWork();}
function openTool(code){
  const t=T(code);if(!t&&code!=="HOME")return;
  ctx.tool=code;store.set("ft.tool",code);
  if($("v-ga").hidden)api.show("ga");else renderGA();
}
$("ga-list").addEventListener("click",e=>{const b=e.target.closest("[data-tool]");if(b)openTool(b.dataset.tool);});
$("ga-cats").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;ctx.cat=b.dataset.cat;renderGAList();if(ctx.tool==="HOME")renderGAWork();});
$("ga-q").addEventListener("input",e=>{ctx.q=e.target.value.trim().toLowerCase();renderGAList();if(ctx.tool==="HOME")renderGAWork();});
$("ga-co").addEventListener("click",e=>{const b=e.target.closest("[data-co]");if(b)setCompany(b.dataset.co);});
$("ga-work").addEventListener("input",()=>{const im=IMPL[ctx.tool];if(im&&im.calc)im.calc();});
$("ga-work").addEventListener("click",e=>{
  const t=e.target.closest("[data-tool]");if(t){openTool(t.dataset.tool);return;}
  const o=e.target.closest("[data-open]");if(o){api.show(o.dataset.open);return;}
  const p=e.target.closest("[data-pres]");if(p){openPres();return;}
  const r=e.target.closest("[data-replay]");if(r){playRuns();return;}
  const s=e.target.closest("[data-set]");if(s){const [id,v]=s.dataset.set.split(":");$(id).value=v;IMPL[ctx.tool].calc();return;}
  const sec=e.target.closest("[data-sec]");if(sec){const i=+sec.dataset.sec,k=ctx.crp.indexOf(i);if(k>-1)ctx.crp.splice(k,1);else ctx.crp.push(i);sec.setAttribute("aria-pressed",String(k<0));IMPL.CRP.calc();}
});
document.addEventListener("click",e=>{const b=e.target.closest("[data-tool]");if(b&&!b.closest("#ga-list")&&!b.closest("#ga-work"))openTool(b.dataset.tool);});

/* ======================= Empresa activa ======================= */
function setCompany(tk){if(!E[tk])return;ctx.co=tk;store.set("ft.co",tk);ctx.cell=null;ctx.yi=LY(E[tk]);$("cmd-ctx").textContent=tk;
  if(!$("v-fa").hidden)renderFA();if(!$("v-ga").hidden)renderGA();}

/* ======================= Línea de comandos ======================= */
const TICK={TGLS:"TGLS",TECNOGLASS:"TGLS",EC:"EC",ECOPETROL:"EC",V:"V",VISA:"V",MI:"MI"};
const q=$("q"),list=$("cmd-list");let sugg=[],act=0;
function norm(s){return s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();}
function suggest(text){
  const raw=text.trim(),toks=raw.toUpperCase().split(/\s+/).filter(Boolean),out=[];if(!raw)return [];
  let co=null,rest=[];toks.forEach(t=>{if(!co&&TICK[t])co=TICK[t];else rest.push(t);});
  const fn=rest.join(" ");
  if(co&&!fn)["FA","RATIO","DUPONT","ALTZ","RATING","EVA","FCL","PRES"].forEach(code=>out.push({co,code,label:E[co].short+" · "+T(code).name}));
  if(fn){const nf_=norm(fn);
    TOOLS.forEach(t=>{const hit=t.code.indexOf(fn)===0?2:norm(t.name).indexOf(nf_)>-1||norm(t.sub).indexOf(nf_)>-1?1:0;if(hit)out.push({co,code:t.code,label:(co?E[co].short+" · ":"")+t.name,score:hit});});
    out.sort((a,b)=>(b.score||0)-(a.score||0));
    if(!co)CO().forEach(k=>{if(norm(E[k].name).indexOf(nf_)>-1||k.indexOf(fn)===0)out.push({co:k,code:"FA",label:E[k].name+" · Análisis vertical y horizontal"});});
    const sq=norm(raw.replace(/^wacc\s*/i,""));if(sq.length>1)api.S.forEach((s,i)=>{if(norm(s.n+" "+s.c).indexOf(sq)>-1)out.push({sector:i,code:"WACC",label:"WACC · "+s.n+" · "+s.c});});
  }
  return out.slice(0,9);
}
function drawList(){
  if(!sugg.length){list.hidden=true;q.setAttribute("aria-expanded","false");return;}
  list.innerHTML=sugg.map((s,k)=>'<div class="cmd-item" role="option" id="cmd-o'+k+'" aria-selected="'+(k===act)+'" data-k="'+k+'"><b>'+(s.co?s.co+" ":"")+s.code+'</b><span>'+esc(s.label)+'</span><small>'+(T(s.code)?KIND[T(s.code).kind]:"")+'</small></div>').join("")+'<div class="cmd-help">Enter ejecuta · ↑↓ elige · Esc cierra · ejemplo: <b>EC ALTZ</b></div>';
  list.hidden=false;q.setAttribute("aria-expanded","true");q.setAttribute("aria-activedescendant","cmd-o"+act);
}
function run(s){
  if(!s)return;list.hidden=true;q.value="";q.blur();
  if(s.co)setCompany(s.co);
  if(s.sector!=null){api.st.sel=s.sector;api.st.q="";api.show("wacc");api.renderTable();return;}
  const t=T(s.code);if(!t)return;
  if(t.code==="PRES"){if($("v-fa").hidden)api.show("fa");openPres();return;}
  if(t.kind==="vista")api.show(t.go);else openTool(t.code);
}
q.addEventListener("input",()=>{sugg=suggest(q.value);act=0;drawList();
  if(!$("v-wacc").hidden){const sq=norm(q.value.trim());const any=sq&&api.S.some(s=>norm(s.n+" "+s.c).indexOf(sq)>-1);api.st.q=any?sq:"";api.renderTable();}});
q.addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"){e.preventDefault();act=Math.min(sugg.length-1,act+1);drawList();}
  else if(e.key==="ArrowUp"){e.preventDefault();act=Math.max(0,act-1);drawList();}
  else if(e.key==="Enter"){e.preventDefault();run(sugg[act]);}
  else if(e.key==="Escape"){list.hidden=true;q.blur();}
});
q.addEventListener("focus",()=>{if(q.value){sugg=suggest(q.value);drawList();}});
q.addEventListener("blur",()=>setTimeout(()=>{list.hidden=true;q.setAttribute("aria-expanded","false");},150));
list.addEventListener("mousedown",e=>{const it=e.target.closest("[data-k]");if(it){e.preventDefault();run(sugg[+it.dataset.k]);}});
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();q.focus();q.select();}});

/* ======================= Arranque ======================= */
if(!E[ctx.co])ctx.co="TGLS";ctx.yi=LY(C());if(window.innerWidth<620)ctx.aud="gerencia";
$("cmd-ctx").textContent=ctx.co;
api.hooks.fa=renderFA;api.hooks.ga=renderGA;api.hooks.cur=()=>{if(!$("v-ga").hidden&&ctx.tool==="CRP")IMPL.CRP.calc();};
function registerCompany(obj){E.MI=obj;delete IDX.MI;obj._m=null;obj._dq=null;setCompany("MI");}
window.FinTargetAnalitica={ctx,M,dq,signals,altz,ratingModel,pdModel,openTool,setCompany,openPres,registerCompany,
  lib:{nf,U,Ur,P1,SP,PP,X,cagr,clamp,card,svg,tx,nice,spark,wfall,lineChart,chCada100,chEstructura,chPuente,chCrec,chMarg,chDupont,sigHTML,stt,tile,attr,CL,r1,ratingSint,pdRating,LY,ix,renderFA}};
const h=api.initial;if(h)api.show(h);
})();
