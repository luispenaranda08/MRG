/* Miracle · datos del mockup. Sintéticos salvo los hechos públicos citados en Sostenimiento (Mi-17, Gripen).
   Todo es agregado: departamento, celda de ~40 km, semana o mes. No hay sitios, unidades ni personas. */
window.MiracleData=(function(){
"use strict";
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* Departamentos: nombre, código, columna y fila del mapa de teselas, centroide aproximado (lon, lat), índice base 0–100 */
const DEP=[["San Andrés","SAP",0,0,-81.7,12.55,2],["La Guajira","LAG",4,0,-72.5,11.4,22],["Atlántico","ATL",2,1,-74.9,10.7,8],["Magdalena","MAG",3,1,-74.2,10.2,22],["Cesar","CES",4,1,-73.5,9.6,35],
 ["Córdoba","COR",1,2,-75.8,8.4,40],["Sucre","SUC",2,2,-75.1,9.1,25],["Bolívar","BOL",3,2,-74.4,8.7,52],["Norte de Santander","NSA",4,2,-72.9,8.0,88],["Chocó","CHO",0,3,-76.8,5.7,44],
 ["Antioquia","ANT",1,3,-75.5,7.0,81],["Santander","SAN",2,3,-73.5,6.8,30],["Boyacá","BOY",3,3,-73.0,5.8,15],["Arauca","ARA",4,3,-71.0,6.6,66],["Risaralda","RIS",0,4,-75.9,5.1,18],
 ["Caldas","CAL",1,4,-75.3,5.3,20],["Cundinamarca","CUN",2,4,-74.2,4.9,18],["Casanare","CAS",3,4,-71.8,5.4,20],["Vichada","VIC",4,4,-69.4,4.6,15],["Valle del Cauca","VAC",0,5,-76.5,3.9,62],
 ["Quindío","QUI",1,5,-75.7,4.5,10],["Bogotá","BOG",2,5,-74.1,4.6,12],["Meta","MET",3,5,-72.9,3.4,45],["Guainía","GUA",4,5,-68.5,2.7,10],["Cauca","CAU",0,6,-76.8,2.4,92],
 ["Tolima","TOL",1,6,-75.2,4.0,38],["Huila","HUI",2,6,-75.6,2.6,55],["Guaviare","GUV",3,6,-72.3,2.0,70],["Vaupés","VAU",4,6,-70.5,0.6,8],["Nariño","NAR",0,7,-77.6,1.5,68],
 ["Putumayo","PUT",1,7,-75.9,0.5,48],["Caquetá","CAQ",2,7,-74.1,0.9,50],["Amazonas","AMA",3,7,-71.5,-1.5,6]]
 .map(d=>({n:d[0],c:d[1],col:d[2],row:d[3],lon:d[4],lat:d[5],base:d[6]}));

/* Focos regionales de riesgo agregados (subregiones de conocimiento público) */
const HOT=[["Norte del Cauca",-76.45,2.95,1.0,0.55],["Catatumbo",-73.05,8.6,0.95,0.5],["Arauca",-71.4,6.9,0.7,0.55],["Bajo Cauca y norte de Antioquia",-75.3,7.65,0.75,0.6],
 ["Pacífico nariñense",-78.4,1.9,0.6,0.5],["Guaviare y sur del Meta",-72.6,2.4,0.5,0.7],["Sur de Bolívar",-74.3,7.6,0.55,0.45],["Putumayo",-76.4,0.75,0.45,0.55],
 ["Chocó",-76.9,5.8,0.4,0.6],["Sur del Valle",-76.6,3.3,0.5,0.35],["Sur del Huila",-75.9,2.0,0.35,0.4]]
 .map(h=>({n:h[0],lon:h[1],lat:h[2],w:h[3],s:h[4]}));

/* Serie semanal por foco: 26 semanas observadas y 12 de pronóstico */
const WEEKS=38,NOW=25;
HOT.forEach((h,i)=>{const r=rng(911+i*37);let x=1;h.wk=[];for(let t=0;t<WEEKS;t++){x=Math.max(0.35,Math.min(1.9,x+(r()-0.47)*0.16+(i%3===0?0.006:0)));h.wk.push(x*(1+0.25*Math.sin((t+i)/4.2)));}});

/* Teatros de conflicto: eventos en el almacén Miracle (sintético), mezcla por tipo y similitud con Colombia */
const DIMS=["Actores no estatales","Uso de drones","Selva y montaña","Economías ilícitas","Ataques a infraestructura","Fuerza pública como blanco"];
const TH=[
 {id:"UKR",n:"Ucrania",lon:31.2,lat:48.5,ev:612400,since:2014,mix:[0.36,0.30,0.06,0.18,0.10],sim:[0.15,1.0,0.25,0.10,0.85,0.90],auc:0.83,brier:0.064,
  lessons:["El dron comercial modificado pasó de reconocimiento a ataque en menos de un año","Los enlaces por fibra óptica anulan la interferencia de radio","La defensa por capas combina detección acústica, óptica y de radiofrecuencia"]},
 {id:"RUS",n:"Rusia · frontera y retaguardia",lon:37.5,lat:52.5,ev:38600,since:2022,mix:[0.62,0.18,0.08,0.02,0.10],sim:[0.10,0.95,0.10,0.05,0.90,0.40],auc:0.79,brier:0.052,
  lessons:["Ataques de largo alcance con drones contra infraestructura energética","La saturación con oleadas supera defensas puntuales"]},
 {id:"IRQ",n:"Irán, Irak y Siria",lon:43.7,lat:34.5,ev:214800,since:2016,mix:[0.22,0.14,0.30,0.24,0.10],sim:[0.80,0.75,0.20,0.40,0.70,0.75],auc:0.77,brier:0.071,
  lessons:["Grupos no estatales adoptaron municiones merodeadoras de diseño estatal","El primer uso de drones armados por milicias se documentó en Irak en 2016"]},
 {id:"ISR",n:"Israel, Gaza y Líbano",lon:35.3,lat:32.3,ev:151200,since:2018,mix:[0.40,0.20,0.12,0.18,0.10],sim:[0.70,0.85,0.15,0.20,0.60,0.80],auc:0.81,brier:0.068,
  lessons:["Drones baratos contra puestos fijos y vehículos","La interceptación con misiles es insostenible en costo frente a drones comerciales"]},
 {id:"YEM",n:"Mar Rojo y Yemen",lon:44.2,lat:15.4,ev:63100,since:2015,mix:[0.30,0.34,0.10,0.10,0.16],sim:[0.90,0.80,0.40,0.35,0.85,0.55],auc:0.76,brier:0.074,
  lessons:["Un actor no estatal sostuvo campañas de drones y misiles por años","Ataques a infraestructura logística con drones de bajo costo"]},
 {id:"SDN",n:"Sudán",lon:30.2,lat:13.8,ev:41700,since:2019,mix:[0.18,0.16,0.08,0.50,0.08],sim:[0.95,0.55,0.45,0.70,0.55,0.70],auc:0.74,brier:0.081,
  lessons:["Fuerzas no estatales adquirieron drones de ataque en el mercado comercial","Disputa por recursos mineros y rutas como motor del conflicto"]},
 {id:"SAH",n:"Sahel · Malí, Burkina Faso, Níger",lon:-1.8,lat:14.8,ev:72900,since:2014,mix:[0.08,0.07,0.22,0.55,0.08],sim:[1.0,0.45,0.55,0.85,0.45,0.95],auc:0.75,brier:0.078,
  lessons:["Grupos armados en zonas rurales con presencia estatal débil","Emboscadas y artefactos explosivos contra la fuerza pública en corredores viales"]},
 {id:"MMR",n:"Myanmar",lon:96.0,lat:21.9,ev:88300,since:2021,mix:[0.16,0.24,0.10,0.42,0.08],sim:[1.0,0.85,0.95,0.80,0.50,0.95],auc:0.78,brier:0.069,
  lessons:["Grupos de resistencia en selva y montaña adoptaron drones comerciales armados en 2022","Producción local de drones y munición a bajo costo"]},
 {id:"COL",n:"Colombia",lon:-74.2,lat:4.6,ev:9840,since:2018,mix:[0.05,0.12,0.24,0.47,0.12],sim:[1,1,1,1,1,1],auc:0.47,brier:0.041,
  lessons:["Base escasa de ataques documentados: pocos miles de eventos frente a millones afuera","Los ataques con drones comerciales se aceleran desde 2024"]}
];
const MIX=["Artillería, misiles y cohetes","Drones y municiones merodeadoras","Artefactos explosivos","Enfrentamientos y ataques armados","Ataques a infraestructura"];
TH.forEach((t,i)=>{const r=rng(301+i*17);t.wk=[];let x=1;for(let w=0;w<104;w++){x=Math.max(0.3,x+(r()-0.48)*0.12);const s=t.id==="UKR"?(w>20?1.4:1):1;t.wk.push(Math.round(t.ev/(52*(2026-t.since+1))*x*s));}
  const W=[0.20,0.25,0.15,0.15,0.10,0.15];t.score=t.id==="COL"?1:t.sim.reduce((a,v,j)=>a+v*W[j],0);});

/* Aprendizaje por transferencia */
const LC={n:[100,250,500,1000,2000,4000,8000],solo:[0.18,0.22,0.27,0.32,0.37,0.41,0.44],tr:[0.31,0.35,0.39,0.43,0.46,0.48,0.50],base:0.06};
const ABL=[["Ucrania",-0.041],["Myanmar",-0.033],["Sahel",-0.027],["Irán, Irak y Siria",-0.019],["Yemen",-0.015],["Sudán",-0.012],["Israel, Gaza y Líbano",-0.009],["Rusia",-0.004]];

/* Reloj de difusión de tácticas: año de primera documentación afuera y en Colombia (las abiertas son pronóstico) */
const DIF=[{t:"Dron comercial con explosivo lanzado",ext:2016.8,th:"Irak",col:2018.6},
 {t:"Ataque coordinado con varios drones",ext:2018.0,th:"Siria",col:2024.3},
 {t:"Dron FPV de ataque",ext:2022.6,th:"Ucrania",col:2025.4},
 {t:"FPV guiado por fibra óptica",ext:2024.3,th:"Ucrania",pred:[2026.6,2027.3,2028.1]},
 {t:"Guiado terminal autónomo",ext:2025.2,th:"Ucrania",pred:[2027.4,2028.6,2030.0]},
 {t:"Enjambre coordinado",ext:2025.8,th:"Ucrania",pred:[2028.5,2030.2,2032.5]}];
const CM=[{n:"Inhibidor de radio",y:[0.92,0.90,0.86,0.78,0.66,0.52,0.41,0.33],half:2028.0},{n:"Detección por radiofrecuencia",y:[0.95,0.93,0.89,0.82,0.71,0.58,0.47,0.38],half:2028.6},
 {n:"Detección óptica y acústica en capas",y:[0.70,0.74,0.78,0.80,0.80,0.78,0.75,0.71],half:null}];
const CMY=[2024,2025,2026,2027,2028,2029,2030,2031];

/* Flota y sostenimiento. Mi-17: dato público (8 operativos). Resto: sintético. */
const FLEET=[
 {n:"Helicóptero Mi-17",f:"Ejército",o:"Rusia",tot:20,op:8,age:21,irs:86,p12:0.71,cost:182,ser:96,alert:"Proveedor sancionado; repuestos sin canal",sanc:1,s:[100,95,85,40,70,60]},
 {n:"Kfir C10/C12",f:"Fuerza Aeroespacial",o:"Israel",tot:22,op:11,age:34,irs:79,p12:0.58,cost:240,ser:118,alert:"Ruptura diplomática y fin de vida útil",sanc:0,s:[95,20,90,50,90,70]},
 {n:"UAV Hermes 450/900",f:"Fuerza Aeroespacial",o:"Israel",tot:9,op:6,age:11,irs:67,p12:0.36,cost:64,ser:31,alert:"Soporte del fabricante en revisión",sanc:0,s:[90,15,90,45,55,65]},
 {n:"Submarino Tipo 209",f:"Armada",o:"Alemania",tot:2,op:1,age:50,irs:55,p12:0.42,cost:96,ser:40,alert:"Obsolescencia de componentes",sanc:0,s:[85,5,10,40,85,60]},
 {n:"Gripen E/F (contratado)",f:"Fuerza Aeroespacial",o:"Suecia",tot:17,op:0,age:0,irs:46,p12:null,cost:0,ser:1650,alert:"Exposición cambiaria EUR/COP del contrato",sanc:0,s:[90,10,20,85,10,70]},
 {n:"UH-60 Black Hawk",f:"Ejército y Fuerza Aeroespacial",o:"EE. UU.",tot:61,op:47,age:17,irs:33,p12:0.14,cost:410,ser:72,alert:"Estable",sanc:0,s:[85,5,10,40,30,55]},
 {n:"C-295",f:"Fuerza Aeroespacial",o:"España",tot:6,op:5,age:13,irs:31,p12:0.12,cost:58,ser:14,alert:"Estable",sanc:0,s:[85,5,10,40,25,55]},
 {n:"A-29 Super Tucano",f:"Fuerza Aeroespacial",o:"Brasil",tot:24,op:17,age:19,irs:36,p12:0.19,cost:88,ser:22,alert:"Fatiga estructural en la flota más antigua",sanc:0,s:[80,5,10,35,50,50]},
 {n:"Patrullera OPV",f:"Armada",o:"Colombia · Cotecmar",tot:4,op:4,age:9,irs:13,p12:0.06,cost:31,ser:5,alert:"Estable",sanc:0,s:[20,5,0,25,20,5]}];
const COMP=[["Motor",0.31,"lead time 140 días"],["Transmisión principal",0.24,"lead time 210 días"],["Rotor principal",0.18,"lead time 120 días"],["Aviónica",0.12,"lead time 60 días"],["Tren de aterrizaje",0.07,"lead time 45 días"],["Sistema hidráulico",0.09,"lead time 30 días"]];

/* Modelos */
const MODELS=[
 {id:"MI-ST-01",n:"Riesgo de ataque a 4 semanas por celda",fam:"Ensamble · LightGBM + proceso de Hawkes espaciotemporal",tgt:"P(≥1 ataque documentado) por celda de ~40 km y semana",data:"1,3 millones de eventos de 9 teatros + 9.840 eventos de Colombia",met:[["PR-AUC",0.47,"persistencia 0,29 · promedio estacional 0,24"],["Brier",0.041,"baseline 0,058"],["ECE (calibración)",0.012,""],["Cobertura del intervalo 90%",0.89,""]],ver:"3.2",cal:"5 oct 2026",drift:"Estable",use:"Priorizar recursos de prevención y protección por subregión",lim:"No es una alerta táctica; no identifica personas, unidades ni sitios",val:"Validación temporal móvil 2019–2026 con embargo de 4 semanas"},
 {id:"MI-ST-02",n:"Conteo mensual por departamento",fam:"Binomial negativa jerárquica bayesiana",tgt:"Número de ataques documentados por departamento y mes",data:"Panel departamento–mes 2018–2026",met:[["MAE",1.8,"promedio estacional 2,9"],["Cobertura del intervalo 80%",0.82,""],["CRPS",1.31,"baseline 1,97"]],ver:"2.4",cal:"1 oct 2026",drift:"Estable",use:"Planeación mensual y presupuestal",lim:"Agregado departamental",val:"Origen móvil con 12 cortes"},
 {id:"MI-ST-03",n:"Contagio espacial",fam:"Red neuronal de grafos espaciotemporal (ST-GNN)",tgt:"Propagación de la intensidad entre celdas vecinas por vías, ríos y corredores",data:"Grafo de 1.122 municipios con conectividad vial y fluvial",met:[["PR-AUC",0.44,"sin grafo 0,39"],["Ganancia en el ensamble",0.03,"puntos de PR-AUC"]],ver:"1.6",cal:"28 sep 2026",drift:"Vigilar",use:"Insumo del ensamble MI-ST-01",lim:"Sensible a cambios en la red vial",val:"Validación por bloques espaciales"},
 {id:"MI-TR-01",n:"Preentrenamiento multiteatro",fam:"Transformer de secuencias de eventos con adaptación de dominio",tgt:"Representación de la dinámica de conflicto transferible entre países",data:"Eventos armonizados de 9 teatros en una ontología común",met:[["Ganancia con 500 eventos locales",0.12,"puntos de PR-AUC"],["Distancia de dominio (MMD)",0.08,"antes de adaptar 0,31"]],ver:"1.1",cal:"20 sep 2026",drift:"Estable",use:"Arranque de modelos con pocos datos locales",lim:"Hereda sesgos de cobertura de cada teatro",val:"Ablación por teatro y prueba fuera de dominio"},
 {id:"MI-NLP-01",n:"Extracción de eventos de prensa",fam:"LLM + NER multilingüe (es, en, uk, ru, ar, fa)",tgt:"Evento, fecha, tipo, municipio y fuente desde texto abierto",data:"1.400 notas por día de medios abiertos",met:[["F1 tipo de evento",0.91,""],["Geolocalización a municipio",0.87,""],["Duplicados fusionados",0.96,""]],ver:"4.0",cal:"3 oct 2026",drift:"Estable",use:"Construir la base de eventos de Colombia",lim:"Lo que no publica la prensa no entra",val:"Muestra anotada por dos analistas"},
 {id:"MI-DIF-01",n:"Difusión de tácticas",fam:"Supervivencia jerárquica (Weibull AFT bayesiano)",tgt:"Tiempo hasta la primera documentación de una táctica en Colombia",data:"Fechas de primera documentación en 9 teatros",met:[["C-index",0.78,""],["Cobertura del intervalo 80%",0.83,""]],ver:"1.3",cal:"30 sep 2026",drift:"Estable",use:"Anticipar qué contramedidas quedan obsoletas",lim:"Primera noticia no es primera adopción",val:"Cortes históricos simulados"},
 {id:"MI-MNT-01",n:"Disponibilidad de flota a 12 meses",fam:"Supervivencia con gradient boosting + Cox",tgt:"P(plataforma no disponible en 12 meses)",data:"Órdenes de trabajo, horas de vuelo, SECOP II y sanciones",met:[["C-index",0.81,""],["Brier a 12 meses",0.09,"Kaplan-Meier 0,16"]],ver:"2.0",cal:"2 oct 2026",drift:"Estable",use:"Priorizar contratos de sostenimiento",lim:"Depende del registro de mantenimiento",val:"Retrospectivo Mi-17 (corte 2021) e Israel (corte 2023)"},
 {id:"MI-MNT-02",n:"Falla de componentes",fam:"LightGBM sobre horas, ciclos y órdenes de trabajo",tgt:"P(falla de un componente en 90 días)",data:"Historial de mantenimiento por componente",met:[["PR-AUC",0.62,"por horas 0,38"],["Precisión en el top 10%",0.71,""]],ver:"1.4",cal:"4 oct 2026",drift:"Estable",use:"Pedir repuestos antes de la falla",lim:"Requiere órdenes de trabajo digitalizadas",val:"Validación temporal por flota"},
 {id:"MI-MNT-03",n:"Costo de sostenimiento en riesgo",fam:"Cuantiles LightGBM + Monte Carlo",tgt:"Percentil 95 del costo de sostenimiento a 12 meses (SeR95)",data:"SECOP II, TRM, EUR/COP y sanciones",met:[["Pinball loss p95",0.071,"regresión robusta 0,104"],["Cobertura p95",0.94,""]],ver:"1.2",cal:"1 oct 2026",drift:"Estable",use:"Presupuesto y coberturas cambiarias",lim:"Precio de contrato no es costo total",val:"Origen móvil"},
 {id:"MI-ANO-01",n:"Anomalías de importación de drones",fam:"STL robusto + Isolation Forest",tgt:"Meses con importaciones fuera de patrón (DANE, partida 8806)",data:"Microdatos de comercio exterior",met:[["Precisión en el top 20",0.65,""],["Falsas alertas por año",3,""]],ver:"1.0",cal:"15 sep 2026",drift:"Estable",use:"Señal comercial para revisión",lim:"La aduana no indica el uso final",val:"Revisión manual de alertas"},
 {id:"MI-CHG-01",n:"Cambio de táctica",fam:"Detección bayesiana de puntos de cambio (BOCPD)",tgt:"Cambios en la mezcla de tipos de ataque por subregión",data:"Base de eventos de Colombia y teatros",met:[["Adelanto frente al conteo",9,"días"],["Falsas alarmas por trimestre",1.2,""]],ver:"1.1",cal:"29 sep 2026",drift:"Estable",use:"Avisar cuándo cambia la forma de la amenaza",lim:"Requiere tipificación consistente",val:"Episodios históricos etiquetados"}];

/* Fuentes */
const SRC=[["ACLED","Eventos de conflicto curados, global","Semanal","Licencia comercial","Global y Colombia"],["UCDP GED","Eventos con víctimas fatales, global","Anual + candidatos mensuales","CC BY 4.0","Global"],["GDELT","Eventos y tono desde prensa mundial","15 minutos","Abierta","Global"],
 ["Oryx","Pérdidas de equipo documentadas con imagen","Diaria","Por verificar","Ucrania, Rusia"],["ISW / CTP","Mapas y evaluaciones de campaña","Diaria","Cita","Ucrania, Irán"],["Kiel Ukraine Support Tracker","Ayuda militar por tipo","Mensual","Atribución","Ucrania"],
 ["MinDefensa · logros de la política","Estadísticas oficiales de seguridad","Mensual","Pública","Colombia"],["Policía Nacional · datos abiertos","Delitos y afectaciones","Mensual","Pública","Colombia"],["Prensa colombiana (NLP)","Base propia de eventos dron","Diaria","Cita","Colombia"],
 ["SIMCI · UNODC","Cultivos de coca por municipio","Anual","Pública","Colombia"],["SECOP II","Contratos de mantenimiento y antidron","Diaria","Pública","Colombia"],["DANE · partida 8806","Importación de drones","Mensual","Pública","Colombia"],
 ["OFAC / UE","Sanciones a proveedores","Diaria","Pública","Global"],["IDEAM · ERA5","Clima y nubosidad","Diaria","Abierta","Colombia"],["OpenStreetMap","Vías, ríos y conectividad municipal","Semanal","ODbL","Colombia"]];

return {rng,DEP,HOT,WEEKS,NOW,DIMS,TH,MIX,LC,ABL,DIF,CM,CMY,FLEET,COMP,MODELS,SRC};
})();
