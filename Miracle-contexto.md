# Miracle: contexto de trabajo

> Documento para retomar Miracle desde otra cuenta o sesión. Resume decisiones, productos, métricas, datos, cronograma propuesto y pendientes al **6 de octubre de 2026**.
> Miracle es un producto de **HyperTarget** (founder: Luis David Peñaranda, Barranquilla). Es independiente de **FinTarget** (finanzas), que tiene su propio documento: `FinTarget-contexto.md`.
> **Lanzamiento del V1: martes 20 de octubre de 2026.**

---

## 1. Qué es Miracle

Miracle es inteligencia de defensa para Colombia construida con fuentes abiertas. Es semipública: tiene una capa pública y una capa institucional con solicitud de acceso.

**Decisión del 6 de octubre:** Colombia sufre ataques con drones de forma continua, así que **se atacan los dos productos a la vez**:

| | Producto 1 · Índice de Riesgo de Sostenimiento (IRS) | Producto 2 · Riesgo antidron |
|---|---|---|
| Pregunta | ¿Qué plataformas de defensa se nos pueden quedar en tierra, cuánto costaría evitarlo y quién puede resolverlo? | ¿Dónde, cuándo y con qué tecnología evolucionará la amenaza dron en Colombia, y qué contramedidas quedan obsoletas? |
| Horizonte | 1–5 años | 1–24 meses |
| Ventaja del founder | Finanzas aplicadas (Maestría en Finanzas): costo total, tipo de cambio, riesgo de contraparte, concentración | Pronóstico y calibración (Brier score, backtesting), ciencia de datos y NLP |
| Comprador principal | Fabricantes extranjeros que quieren venderle a Colombia, CIAC (mantenimiento), Congreso y MinHacienda | CODALTEC, Policía y Ejército, gobernaciones |
| Competencia | Nadie publica esta métrica para Colombia | Nadie publica difusión ni vida media para Colombia |

**Puente entre los dos:** la vida media de las contramedidas (producto 2) alimenta la dimensión de obsolescencia del IRS (producto 1).

**El radar antidrones y UAV no se descarta.** Pasa a ser la capa de evidencia: fichas de sistemas observados en Ucrania, Irán y región, e Israel–Gaza–Líbano.

### Por qué "sin competencia" (dicho con honestidad)
- **Nadie publica de forma recurrente** un índice de sostenimiento, costo y dependencia del inventario de defensa colombiano, ni métricas de difusión de tácticas dron hacia Colombia.
- **Lo más cercano:**
  - prensa especializada (Infodefensa, Defensa.com, Zona Militar): noticias sin métricas;
  - Janes: inventarios globales sin análisis financiero ni enfoque Colombia;
  - planeación interna del Ministerio y las Fuerzas: no se publica.
- **El sustituto real es el análisis interno del Estado.** Argumento frente a él: una mirada externa, cuantitativa y recurrente, útil también para el debate fiscal (Congreso, Contraloría, MinHacienda).

---

## 2. Hechos públicos que justifican el producto (verificados el 6 oct 2026)

**Mi-17 (helicópteros rusos del Ejército)**
- De 25 comprados a Rusia entre 1996 y 2007, solo 8 seguían operando.
- Las sanciones a Rusia bloquearon el mantenimiento y el proveedor (NASC S.A.) quedó en la lista OFAC.
- En enero de 2025 comenzó un contrato de recuperación con la estadounidense Vertol Systems.
- El 22 de septiembre de 2026, EE. UU. descartó asumir el mantenimiento.
- Fuentes:
  - Infobae: https://www.infobae.com/colombia/2026/09/22/siguen-los-problemas-con-los-helicopteros-mi-17-del-ejercito-colombiano-estados-unidos-descarto-asumir-su-mantenimiento/
  - Swissinfo: https://www.swissinfo.ch/spa/mosc%C3%BA-y-bogot%C3%A1-a%C3%BAn-no-logran-acuerdo-sobre-el-mantenimiento-de-helic%C3%B3pteros-rusos-mi-17/89191194
  - Defensa.com: https://www.defensa.com/colombia/postura-rusa-verdaderas-razones-problemas-mantenimiento-17

**Gripen (reemplazo de los Kfir israelíes)**
- Contrato firmado el 14 de noviembre de 2025: 17 aviones (15 E + 2 F) por €3.135 millones, unos COP 16,5 billones, con entregas entre 2028 y 2032.
- El gobierno de Abelardo de la Espriella lo está revisando (octubre de 2026).
- Fuentes:
  - Portafolio: https://www.portafolio.co/economia/gobierno/colombia-firma-contrato-por-17-cazas-gripen-en-historico-acuerdo-con-saab-483217
  - Infobae, 2 oct 2026: https://www.infobae.com/colombia/2026/10/02/el-millonario-contrato-con-la-empresa-suiza-saab-para-comprar-17-aviones-gripen-no-le-gusta-al-gobierno-de-abelardo-de-la-espriella-se-esta-evaluando-confirmo-el-comandante-de-la-fac/
  - El Colombiano: https://www.elcolombiano.com/colombia/contrato-gripen-colombia-reemplazo-kfir-sigue-revision-DN41804061
- Tasa EUR/COP implícita del contrato: unos 5.263. **Si el pago no está cubierto, cada 10% de movimiento del EUR/COP equivale a unos COP 1,65 billones.** Hay que verificar las cláusulas: Portafolio menciona "protección ante fluctuaciones".

**Industria nacional relevante:**
- CODALTEC: sistemas antidrones.
- CIAC: partes del prototipo SIRTAP (con Airbus) y mantenimiento aeronáutico. *Verificar su rol exacto en el SIRTAP.*
- Cotecmar: naval.
- Indumil: armas y munición; fabrica el Galil bajo licencia.

**Otros datos:**
- Colombia rompió relaciones con Israel en 2024 y tiene alta dependencia histórica de material israelí: Kfir, Galil, Spike y UAV Hermes.

---

## 3. Producto 1 · Índice de Riesgo de Sostenimiento (IRS)

### Métricas (las marcadas como *nuestra* no existen hoy)

**1. IRS por plataforma (0–100)**
```
IRS = Σ wᵢ · sᵢ   (cada sᵢ en 0–100)
  s₁ Dependencia del proveedor       peso inicial 25%
  s₂ Riesgo de sanciones (OFAC/UE)   20%
  s₃ Distancia geopolítica           15%
  s₄ Exposición cambiaria            10%
  s₅ Obsolescencia                   15%   ← alimentada por la vida media del producto 2
  s₆ Falta de alternativa nacional   15%
Niveles: alto ≥ 65 · medio 40–64 · bajo < 40
```
Los pesos iniciales salen de juicio experto y se publican. Después se recalibran con backtesting.

**2. HHI de dependencia del inventario.** Índice de Herfindahl-Hirschman por país de origen, en total y por Fuerza (0 a 1). *Existe en economía; aplicarlo así es nuestro.*

**3. Distancia geopolítica con el proveedor.** Mide qué tan parecido vota Colombia con cada país proveedor en la Asamblea General de la ONU, con los "puntos ideales" de Bailey, Strezhnev y Voeten (base académica pública). Se combina con eventos diplomáticos de GDELT. *Nuestra para este uso.*

**4. Sostenimiento en Riesgo (SeR₉₅).** Análogo del VaR. Es el percentil 95 del cambio en el costo de sostenimiento a 12 meses. *Nuestra; es el corazón financiero.*
```
Monte Carlo (≥ 3.000 escenarios):
Δcosto = shock_cambiario · exposición + 1[sanción] · costo_cambio_proveedor + 1[ruptura] · sobrecosto + …
SeR₉₅ = percentil 95 de Δcosto
```

**5. Disponibilidad en riesgo.** Porcentaje de la flota operativa según fuentes públicas. Ejemplo: Mi-17, 8 de 20, es decir 40%.

**6. Costo de salida.** Costo de reemplazar una flota dependiente como porcentaje del presupuesto de inversión de defensa (como pasó con Kfir → Gripen).

### Validación con backtesting
- **Mi-17:** con datos hasta 2021, ¿el IRS habría marcado el riesgo antes de 2022?
- **Israel:** con datos hasta 2023, ¿habría marcado la ruptura de 2024?
- Si "predice" los dos casos, ese es el argumento de venta. Si no, se recalibran los pesos.

### Datos
- **SIPRI Arms Transfers:** origen de cada sistema importado por Colombia, por año.
- **SECOP II:** contratos de mantenimiento (proveedor, valor, plataforma). Ojo: parte del gasto de defensa es reservado.
- **Sanciones OFAC (EE. UU.) y UE:** públicas y diarias.
- **Votaciones en la ONU:** dataset Voeten (anual).
- **GDELT:** eventos diplomáticos.
- **BanRep:** TRM y EUR/COP.
- **Presupuesto de Mindefensa:** portal de Transparencia Económica de MinHacienda.
- **Prensa especializada:** estado operativo de las flotas.

**Límite que se declara:** el IRS trabaja con información pública.

---

## 4. Producto 2 · Riesgo antidron (prevención e identificación de riesgo)

### Métricas

**1. Reloj de difusión de tácticas.** *Nuestra; probablemente la métrica más valiosa de Miracle.*
```
Rezago de difusión = fecha de primera documentación en Colombia − fecha de primera documentación en el teatro externo
```
Tácticas a seguir: dron comercial con explosivo lanzado · ataque coordinado con varios drones · FPV de ataque · FPV con fibra óptica · guiado terminal autónomo · enjambre.

Con los rezagos históricos se estima la llegada de las tácticas que aún no aparecen en Colombia, por ejemplo "¿cuándo llega el FPV con fibra?". Así **Ucrania se vuelve un indicador adelantado para Colombia.**

**2. Cobertura de amenaza de una contramedida**
```
Cobertura(c) = Σₜ mezcla_observada(t) × eficacia(c, t)
  t = tipo de amenaza (radio, fibra, autónomo, …)
  eficacia(c, t) ∈ [0,1] según evidencia abierta
```

**3. Vida media tecnológica.** Año estimado en que la cobertura de una contramedida cae por debajo del 50%, proyectando la mezcla de amenazas con el reloj de difusión. *Nuestra.* Le dice a quien compra: "este equipo te dura 18 meses, este otro 4 años".

**4. Ratio de intercambio de costo.** Costo de neutralizar un dron sobre el costo del dron, en COP con precios colombianos. *Existe en la literatura; la aplicación a Colombia es nuestra.* Órdenes de magnitud: inhibidor portátil < 1 · dron interceptor ≈ 1 · munición antiaérea guiada > 100.

**5. Índice de exposición a amenaza dron, por departamento (mensual).**
- Insumos:
  - tendencia de ataques (base de eventos propia);
  - presencia de grupos armados según informes públicos (Indepaz, FIP);
  - importación de drones comerciales (DANE, partida 8806) por región;
  - menciones en prensa.
- Modelo de conteo: Poisson o binomial negativo.
- Evaluación: **Brier score y curva de calibración**. Es la misma disciplina del artículo de error de encuestas: la credibilidad metodológica del founder.
- *Adaptación nuestra:* existen modelos públicos de pronóstico de conflicto (ViEWS), pero ninguno de amenaza dron para Colombia.

**6. Indicador de materia prima.** Importaciones mensuales de drones comerciales por país de origen y aduana (DANE, partida arancelaria 8806). Genera una alerta cuando un mes supera en más de 2 desviaciones estándar el promedio móvil de 12 meses. *Nadie lo publica.*

### El activo base que hay que construir
**Una base de eventos de ataques con drones en Colombia:** procesamiento de lenguaje sobre prensa colombiana y GDELT, revisión manual y fuente por evento. Sin esta base no se calculan las métricas 1 y 5. *Verificar si FIP, CERAC o ACLED ya tienen algo comparable. ACLED tiene restricciones de uso comercial.*

### Líneas rojas (es un producto de defensa, no de ataque)
- **Capa pública:** solo agregados por departamento y por mes, tendencias y metodología.
- **Nunca, ni en la capa institucional:**
  - vulnerabilidad de sitios específicos (estaciones, bases, infraestructura);
  - cobertura de sensores desplegados;
  - cómo vencer una contramedida concreta.
  Se habla de capacidades a nivel de categoría, que ya son públicas.
- **El pronóstico** apoya la prevención y siempre va con su incertidumbre. Nunca es una alerta táctica.
- **Nunca** material filtrado o hackeado, como las filtraciones de inteligencia militar colombiana de 2026.

---

## 5. Mapas (cada uno con un propósito)

1. **Mapa de dependencia (mundo → Colombia):** flujos por país proveedor, con grosor según el peso en el inventario y tono según el riesgo (ruptura o sanción, en revisión, estable).
2. **Mapa de exposición a amenaza dron por departamento:** mapa de teselas, no a escala, con códigos de 3 letras y escala de 5 clases.
3. **Mapa de importaciones de drones comerciales** por aduana y país de origen (DANE 8806).
4. **Mapa de evidencia de los tres teatros:** eventos con drones agregados en hexágonos por semana. Es capa pública.
5. **Mapa de oportunidades en LatAm** para la industria nacional (más adelante).

**Lo que nunca va en un mapa público:** bases militares, infraestructura vulnerable ni cobertura de sensores en Colombia.

---

## 6. Datos y fuentes (resumen)

| Fuente | Qué aporta | Licencia | Capa |
|---|---|---|---|
| SIPRI (transferencias + gasto militar) | Origen del inventario | Atribución | Pública |
| SECOP II | Contratos de mantenimiento y antidron | Pública | Institucional |
| OFAC / UE | Sanciones | Pública | Pública |
| Votos ONU (Voeten) + GDELT | Distancia geopolítica | Abierta | Institucional |
| DANE comercio exterior (8806) | Importación de drones | Pública | Pública (agregada) |
| UCDP GED + GDELT | Eventos en los 3 teatros | CC BY 4.0 / abierta | Pública |
| ACLED | Eventos curados | Comercial con licencia | Pendiente |
| Oryx | Pérdidas por tipo de sistema | Por verificar | Institucional |
| Kiel Ukraine Support Tracker | Ayuda militar por tipo | Atribución | Pública |
| RUSI · CSIS · ISW · CNA | Lecciones de campo | Cita | Institucional |
| Lens.org · OpenAlex | Patentes y papers | Abierta | Institucional |
| BanRep | TRM, EUR/COP | Pública | Pública |
| Prensa colombiana | Base de eventos dron Colombia | Cita | Agregada |

**Verificar antes de construir:**
- [ ] Nivel de detalle de la partida 8806 en los microdatos del DANE (país de origen, aduana, mes).
- [ ] Calidad del registro SIPRI para Colombia.
- [ ] Qué contratos de mantenimiento y antidron son visibles en SECOP II.
- [ ] Si existe una base pública de ataques con drones en Colombia (FIP, CERAC, ACLED).
- [ ] Términos de uso de Oryx y ACLED.
- [ ] Cláusulas de cobertura cambiaria del contrato Gripen.

---

## 7. Compradores, en orden de velocidad de venta

1. **Fabricantes y proveedores extranjeros** (aviación, helicópteros, mantenimiento) que quieren venderle a Colombia. Pagan inteligencia de mercado y deciden rápido.
2. **Industria nacional (GSED):**
   - CODALTEC: antidron.
   - CIAC: mantenimiento; los Mi-17 son el caso obvio.
   - Cotecmar e Indumil.
   - Varias contratan con régimen de derecho privado. *Verificar el manual de contratación de cada una.*
3. **Control y debate fiscal:** comisiones segundas del Congreso, Contraloría, MinHacienda y DNP.
4. **Ministerio y Fuerzas, ESDEG y centros de doctrina:** el ciclo más largo (6 a 18 meses).

**Riesgo político:** el Gripen es un debate caliente. Miracle presenta cifras y escenarios, nunca posiciones.

---

## 8. Alcance propuesto del V1 (20 de octubre), ambos productos

- **IRS:** 10 a 11 plataformas con sus seis componentes y fuente por dato, HHI, SeR₉₅ Monte Carlo, casos Mi-17 (con backtest a 2021) y Gripen (sensibilidad cambiaria), y mapa de dependencia.
- **Antidron:**
  - base de eventos dron Colombia v0;
  - reloj de difusión con 5 tácticas y fechas verificadas;
  - cobertura y vida media para 3 clases de contramedida;
  - índice de exposición por departamento v0;
  - indicador de importaciones 8806.
- **Evidencia:** unas 10 fichas del radar en lugar de 25.
- **Edición 1 en PDF:** IRS + amenaza dron + "Qué significa para Colombia".
- **Plataforma semipública:** capa pública (agregados, mapas, metodología) + capa institucional (solicitud de acceso, descargas).

### Cronograma propuesto, una tarea terminada por día
> ⚠️ **Todavía no está en Notion.** El calendario de Notion muestra el plan anterior, centrado en el radar (MI 1/8 a MI 8/8). Hay que reemplazarlo por este.

| Día | Tarea del día | Al cerrar debe existir |
|---|---|---|
| Mar 13 · MI 1/8 | Fundaciones de datos | Matriz de licencias + `sipri_colombia.csv` + `imports_8806.parquet` + esquema de datos + repo `hypertarget/miracle` |
| Mié 14 · MI 2/8 | Base de eventos dron Colombia v0 | `events_co.parquet` con eventos 2018–2026 verificados en muestra |
| Jue 15 · MI 3/8 | IRS v0 | `irs.csv`: 10 plataformas, s₁–s₆ con fuente, pesos, OFAC/UE, votos ONU, HHI |
| Vie 16 · MI 4/8 | SeR + casos | `ser.py` (Monte Carlo) + caso Mi-17 con backtest a 2021 + caso Gripen con sensibilidad cambiaria |
| Sáb 17 · MI 5/8 | Métricas antidron | Reloj de difusión (5 tácticas) + cobertura y vida media + índice de exposición v0 + 10 fichas del radar |
| Dom 18 · MI 6/8 | Plataforma | Mapas (dependencia, teselas) + vistas IRS y Amenaza dron + capas pública e institucional en staging |
| Lun 19 · MI 7/8 | Edición 1 + QA + envíos | PDF + revisión de líneas rojas + cartas a CODALTEC, CIAC, Cotecmar, Indumil y 10 destinatarios más |
| Mar 20 · MI 8/8 | 🚀 Lanzamiento | Plataforma pública + Edición 1 enviada |

Horario base (igual que FinTarget): entre semana 06:00–07:00 y 18:30–21:45; fines de semana 08:00–12:30 y 14:00–18:00. Todo termina antes de las 22:00.

**Si no alcanza el tiempo:** se recortan las fichas del radar y el mapa de evidencia de los tres teatros. No se recortan el IRS de las 10 plataformas, el reloj de difusión ni el índice por departamento.

---

## 9. Marca y mockup (archivos locales)

Carpeta: `hypertarget-mockups/` (en `Naowee-Luis/SLM-T1/` del equipo de trabajo).

**`miracle-mockup.html`:** mockup navegable con cifras de ejemplo. Los mapas necesitan internet para cargar d3 y la geometría mundial. Pantallas:
- **Panorama:** los dos productos, el mapa mundial de dependencia y el mapa de teselas.
- **Sostenimiento:** KPIs, mapa de dependencia interactivo, lista de plataformas con IRS y ficha con componentes y distribución SeR, más los casos Mi-17 y Gripen con fuentes reales.
- **Amenaza dron:** teselas por departamento con ranking y detalle, reloj de difusión, cobertura y vida media, importaciones con alertas, ratio de intercambio de costo y líneas rojas.
- **Radar, Fichas, Tendencias, Fuentes, Edición 1 y Acceso institucional.**

**Logos:**
- `logos/miracle-symbol-black.svg`: **Miracle B (recomendado)**, estrella de 4 puntas con la H punteada de HyperTarget en negativo. A 16 px usar la estrella sola.
- `logos/miracle-alt-symbol-black.svg`: alternativa, la estrella con su punta tocando el ajedrezado.
- `logos/concepts.png`: hoja de conceptos.

**Identidad visual:** negro `#0B0B0C`, blanco y grises. Tipografías: Newsreader (titulares tipo informe), IBM Plex Sans (texto), IBM Plex Mono (datos y etiquetas).

**Referencias de interfaz (Mobbin):**
- Documento con referencias de Tana: https://mobbin.com/screens/667840c0-0cf6-4ee7-92b7-af4f52f1c979
- Lista con categorías de Shopify: https://mobbin.com/screens/60c99ad3-212d-4383-9a10-afe66d0facfa
- Lista y detalle de Browserbase: https://mobbin.com/screens/a1bce0e8-4c2e-4a90-9483-7815df1359f3

---

## 10. Notion

Base **🚀 HyperTarget**:
- Calendario principal: entradas "MI 1/8" a "MI 8/8" (13–20 oct). **Desactualizadas:** reflejan el plan centrado en el radar.
- **Hacer 1 — Mapa estratégico** (sección 4: Miracle): https://app.notion.com/p/3f1d865dfe1481fca23ec873ef8b9d18
- **Hacer 2 — Build** (sección 2: Miracle): https://app.notion.com/p/3f1d865dfe148140b348ff9894f18a18
- Tareas de estrategia de Miracle en el calendario de Hacer 1:
  - 14 oct: manuales de contratación de CODALTEC, CIAC, Cotecmar e Indumil.
  - 17 oct: organigramas de CODALTEC y CIAC.
  - 21 oct: reunión con CODALTEC.

---

## 11. Decisiones abiertas

- [ ] Reemplazar en Notion el cronograma MI 1/8–8/8 por el de la sección 8.
- [ ] ¿Logo Miracle A o B?
- [ ] ¿"Miracle" es el nombre público definitivo? En defensa puede sonar poco sobrio; una opción es Miracle como nombre interno y un nombre público más técnico.
- [ ] ¿La capa institucional se cobra desde el inicio o se regala a las primeras 5 entidades a cambio de feedback?
- [ ] Pesos iniciales del IRS: ¿quién los revisa? Idealmente alguien con experiencia en logística militar o en el GSED.
- [ ] Fuente de la presencia de grupos armados para el índice de exposición (Indepaz, FIP u otra) y sus términos de uso.
- [ ] Revisión del contrato con Solvo (proyectos propios).



---
## Adenda · laboratorio de modelos y datos · 6 oct 2026
Esta adenda prevalece para el estado del prototipo sobre afirmaciones anteriores de licencias o predicción. Se conservan las nueve vistas y se añade Laboratorio: LightGBM (probabilidad/conteo y cuantiles), CatBoost como candidato para costo, supervivencia para interrupciones/difusión, anomalías de importación y NLP para curación.
Ningún modelo está entrenado. Cada ficha define target, baseline, datos, evaluación temporal y bloqueo de preparación. El escenario cambiario nuevo es determinista y ficticio; no equivale a SeR₉₅.
Corrección: SIPRI exige autorización/licencia comercial; sus transferencias no son inventario operativo y TIV no es costo. Aduana no representa ubicación de uso. Reconciliar denominadores Mi-17 (8/25 vs. 8/20) antes de calcular disponibilidad. Dos episodios no validan un predictor; IRS experto no es probabilidad.
Mapa y requisitos: [MAPA-Y-EVOLUCION.md](MAPA-Y-EVOLUCION.md). Registro: miracle-modelos.json; matriz: fuentes-validacion.json.

---
## Adenda · Miracle V3 · 7 oct 2026
Objetivo del mockup: mostrarle al Ministerio de Defensa lo que se puede hacer con los datos de conflictos de otros países (Ucrania, Irán, Myanmar, Sahel y otros) para prevenir ataques en Colombia, donde hay pocos datos de ataques pero sí datos de mantenimiento. El mockup se diseña como capacidad de una empresa tier one tipo Palantir: modelos espaciotemporales, LightGBM, Hawkes, ST-GNN, preentrenamiento multiteatro con adaptación de dominio, supervivencia para flota y difusión de tácticas. Los resultados son sintéticos y representan lo que se va a desarrollar. Detalle en [MAPA-Y-EVOLUCION.md](MAPA-Y-EVOLUCION.md), adenda V3.
