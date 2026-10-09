
(function(){
"use strict";
const api=window.FinTargetMockup, $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sources=window.HyperTargetSources.filter(s=>s.product==="FinTarget");
const bar=document.createElement("div");bar.className="workbar";bar.hidden=true;
bar.innerHTML='<span class="trail">FINTARGET / RESEARCH WORKSPACE <span class="ws-status">DEMO</span></span><div class="controls"><label>Moneda <select id="ws-currency"><option>COP</option><option>USD</option></select></label><label>Base <select id="ws-base"><option value="0">Nominal</option><option value="1">Real</option></select></label><button type="button" id="ws-save">Guardar escenario</button><button type="button" id="ws-home">Datos públicos ↗</button></div>';
document.querySelector("main").prepend(bar);
function active(){return Array.from(document.querySelectorAll(".view")).find(v=>!v.hidden);}
function sync(){const v=active();if(!v)return;const t=v.id!=="v-wacc";document.body.classList.toggle("terminal",t);if(bar.hidden!==!t)bar.hidden=!t;$("ws-currency").value=api.st.cur;$("ws-base").value=api.st.real?"1":"0";if(v.id==="v-compare")compare();if(v.id==="v-data")renderSources();if(v.id==="v-issuers")issuers();}
new MutationObserver(sync).observe(document.querySelector("main"),{subtree:true,attributes:true,attributeFilter:["hidden"]});
$("ws-home").onclick=()=>api.show("wacc");
function currency(){api.st.cur=$("ws-currency").value;api.st.real=$("ws-base").value==="1";document.querySelectorAll("[data-cur]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.cur===api.st.cur)));document.querySelectorAll("[data-real]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.real===(api.st.real?"1":"0"))));api.renderAll();if(active().id==="v-compare")compare();}
$("ws-currency").onchange=currency;$("ws-base").onchange=currency;
$("ws-save").onclick=()=>{const s={demo:true,savedAt:new Date().toISOString(),currency:api.st.cur,real:api.st.real,sector:api.S[api.st.sel].n,method:"Prototipo; parámetros de ejemplo"};download("fintarget-escenario-demo.json",JSON.stringify(s,null,2),"application/json");};
function download(name,data,type){const u=URL.createObjectURL(new Blob(["\uFEFF",data],{type}));const a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
document.querySelectorAll("#v-wacc .actions button").forEach(b=>{if(b.textContent.trim()==="CSV")b.onclick=()=>download("fintarget-sectores-DEMO.csv","estado;sector;moneda;base;beta;de;ke;kd_neto;wacc;sens_min;sens_max\n"+api.rowsData().map(r=>["DEMO",r.s.n,api.st.cur,api.st.real?"real":"nominal",r.m.bl,r.s.de,r.m.ke,r.m.kd,r.m.w,r.lo,r.hi].join(";")).join("\n"),"text/csv;charset=utf-8");if(b.textContent.includes("XLSX")){b.disabled=true;b.title="Exportación XLSX pendiente de implementación";b.textContent="XLSX · pendiente";}});
function compare(){
const sel=$("compare-sectors");if(!sel.options.length){sel.innerHTML=api.S.map((s,i)=>'<option value="'+i+'" '+([0,3,11].includes(i)?"selected":"")+'>'+esc(s.n)+'</option>').join("");}
const picked=Array.from(sel.selectedOptions).map(x=>+x.value),shock=+$("compare-shock").value;
$("compare-shock-value").textContent=shock.toFixed(1)+" pp";$("compare-currency").textContent=api.st.cur+" · "+(api.st.real?"real":"nominal");
$("compare-rows").innerHTML=picked.map(i=>{const s=api.S[i],m=api.calc(s,s.de),delta=api.conv(m.keU+shock)-api.conv(m.keU);const w=m.w+m.we*delta;return '<tr><td>'+esc(s.n)+'</td><td>'+m.w.toFixed(2)+'%</td><td>'+w.toFixed(2)+'%</td><td>'+((w-m.w)*100).toFixed(0)+' pb</td><td>'+m.bl.toFixed(2)+'</td><td>'+s.de.toFixed(2)+'</td></tr>';}).join("");
if($("compare-empty").hidden!==(picked.length>0))$("compare-empty").hidden=picked.length>0;
}
$("compare-sectors").onchange=compare;$("compare-shock").oninput=compare;
function renderSources(){const q=$("source-query").value.toLowerCase();$("source-rows").innerHTML=sources.filter(s=>(s.name+" "+s.input+" "+s.status).toLowerCase().includes(q)).map(s=>'<tr><td><a href="'+s.url+'" target="_blank" rel="noopener">'+esc(s.name)+' ↗</a></td><td><span class="ws-status">'+esc(s.status)+'</span></td><td>'+esc(s.input)+'</td><td>'+esc(s.frequency)+'</td><td>'+esc(s.limit)+'</td></tr>').join("");}
$("source-query").oninput=renderSources;
const entities=[{n:"Ecopetrol",id:"EC",kind:"No financiero",route:"WACC / FCFF",src:"EDGAR",gate:"Revisar CIK, moneda, deuda y consolidación"},{n:"Grupo financiero colombiano",id:"CIK por confirmar",kind:"Financiero",route:"Ke / FCFE / ingreso residual",src:"EDGAR / SFC",gate:"Confirmar entidad y ticker vigentes; WACC industrial no aplica"},{n:"Grupo Aval",id:"AVAL",kind:"Financiero",route:"Ke / valoración por segmentos",src:"EDGAR / SFC",gate:"Separar holding, bancos y negocios no financieros"},{n:"Tecnoglass",id:"TGLS",kind:"No financiero",route:"WACC / FCFF",src:"EDGAR",gate:"Verificar moneda, perímetro y exposición país"}];
function issuers(){const q=$("issuer-query").value.toLowerCase();$("issuer-rows").innerHTML=entities.filter(e=>(e.n+" "+e.kind).toLowerCase().includes(q)).map((e)=>'<tr><td><button type="button" data-entity="'+esc(e.n)+'">'+esc(e.n)+'</button><br><span class="ws-label">'+esc(e.id)+'</span></td><td>'+e.kind+'</td><td>'+e.route+'</td><td>'+e.src+'</td><td><span class="ws-status">Sin ingesta</span></td></tr>').join("");$("issuer-rows").querySelectorAll("button").forEach(b=>b.onclick=()=>{const e=entities.find(e=>e.n===b.dataset.entity);$("issuer-detail").innerHTML='<span class="ws-label">Objeto / emisor</span><h2>'+e.n+'</h2><p>'+e.route+'</p><div class="ws-note">'+e.gate+'</div><p>Relaciones: emisor → estados financieros → sector CIIU → pares → metodología → resultado versionado.</p><p>Campos previstos: ingresos, EBIT, deuda financiera, caja, acciones, ROIC y costo de capital. Valores: pendientes de ingesta.</p><a href="https://www.sec.gov/search-filings/edgar-application-programming-interfaces" target="_blank" rel="noopener">Consultar fuente ↗</a>';});}
$("issuer-query").oninput=issuers;
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>api.show(b.dataset.open));
document.querySelector("#v-macro .actions button").onclick=()=>api.show("data");
document.querySelectorAll(".ws-snapshot").forEach(b=>b.onclick=()=>download("fintarget-memo-DEMO.txt",document.querySelector(".paper").innerText+"\n\nDEMOSTRACIÓN. Revisión académica pendiente. No usar como tasa validada.","text/plain;charset=utf-8"));
renderSources();issuers();compare();sync();
})();