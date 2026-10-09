
(function(){
"use strict";
const models=window.MiracleModelRegistry,$=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let selected="dron";const src=window.HyperTargetSources.filter(s=>s.product==="Miracle");
function render(){
const q=$("model-search").value.toLowerCase();$("model-list").innerHTML=models.filter(m=>(m.name+" "+m.family).toLowerCase().includes(q)).map(m=>'<button type="button" class="ml-item" aria-pressed="'+(selected===m.id)+'" data-model="'+m.id+'"><span class="ml-tag">DISEÑO / SIN ENTRENAR</span><strong>'+esc(m.name)+'</strong><span>'+esc(m.family)+'</span></button>').join("");
$("model-list").querySelectorAll("button").forEach(b=>b.onclick=()=>{selected=b.dataset.model;render();});
const m=models.find(m=>m.id===selected),s=src.find(s=>s.id===m.source);
$("model-detail").innerHTML='<div class="ml-tag">REGISTRO / '+m.id.toUpperCase()+' / PROPUESTO</div><h2>'+esc(m.name)+'</h2><p class="ml-lead">'+esc(m.target)+'</p><div class="ml-status">Pendiente de datos, entrenamiento y validación</div>'+[["Candidato",m.family],["Por qué este modelo",m.reason],["Baseline obligatorio",m.baseline],["Datos y etiquetas",m.data],["Variables disponibles al corte",m.features],["Condición de activación",m.gate],["Evaluación",m.metrics],["Validación sin fuga de información",m.validation]].map(x=>'<div class="ml-row"><span>'+x[0]+'</span><p>'+esc(x[1])+'</p></div>').join("")+'<div class="ml-row"><span>Fuente / evidencia</span><p><a href="'+s.url+'" target="_blank" rel="noopener">'+esc(s.name)+' ↗</a><br>'+esc(s.limit)+'</p></div>';
$("model-check").onclick=()=>{$("model-readiness").textContent=m.gate+" Resultado: modelo bloqueado para publicación hasta completar los datos y el backtest.";};
$("model-readiness").textContent="Selecciona Revisar preparación para ver el requisito de datos del modelo.";
}
$("model-search").oninput=render;
function scenario(){const base=+$("ml-cost").value,exposure=+$("ml-exposure").value/100,shock=+$("ml-fx").value/100;if(!Number.isFinite(base)||base<0){$("ml-result").textContent="Ingresa un costo base válido.";return;}
const change=base*exposure*shock;$("ml-fx-value").textContent=(shock*100).toFixed(0)+"%";$("ml-exposure-value").textContent=(exposure*100).toFixed(0)+"%";$("ml-result").textContent=change.toLocaleString("es-CO",{maximumFractionDigits:1})+" COP millones";$("ml-total").textContent="Costo bajo el supuesto: "+(base+change).toLocaleString("es-CO",{maximumFractionDigits:1})+" COP millones";}
["ml-cost","ml-exposure","ml-fx"].forEach(id=>$(id).addEventListener("input",scenario));
$("ml-source-rows").innerHTML=src.map(s=>'<tr><td><a href="'+s.url+'" target="_blank" rel="noopener">'+esc(s.name)+' ↗</a></td><td><span class="ml-tag">'+esc(s.status)+'</span></td><td>'+esc(s.input)+'</td><td>'+esc(s.limit)+'</td></tr>').join("");
document.querySelectorAll("[data-model-open]").forEach(b=>b.onclick=()=>{selected=b.dataset.modelOpen;window.MiracleMockup.show("models");render();});
$("ml-export").onclick=()=>{const content={demo:true,generatedAt:new Date().toISOString(),models:models,sources:src,trained:false,predictions:null};const u=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=u;a.download="miracle-registro-modelos-propuestos.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);};
render();scenario();
})();