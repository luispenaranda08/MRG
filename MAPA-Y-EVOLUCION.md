# HyperTarget · mapa y evolución de los mockups
Revisión: 6 de octubre de 2026. Alcance: prototipos HTML locales; sin conexión de datos, entrenamiento, publicación ni modificación de Notion.

## Criterio de producto
FinTarget conserva el inicio como referencia pública del costo de capital colombiano. El resto evoluciona hacia un espacio de trabajo financiero: contexto compartido, exploración de entidades, comparaciones, escenarios, evidencia y resultados reproducibles. “Damodaran de Colombia” define la autoridad metodológica y los datasets; “Bloomberg de Colombia” define la profundidad del trabajo posterior. Son referencias de producto, no afirmaciones de cobertura ya alcanzada.

Miracle conserva sus nueve vistas, identidad y funcionalidades originales. Se añade un laboratorio con preguntas de investigación, modelos candidatos y condiciones de activación. La finalidad sigue siendo prevención agregada y sostenibilidad presupuestal.

La filosofía Palantir se traduce en objetos, relaciones, fuentes y acciones auditables. FinTarget: empresa → estado financiero → sector → pares → supuesto → modelo → resultado → memo. Miracle: plataforma → proveedor → país → contrato → evidencia → escenario → resultado. La interfaz debe poder explicar cómo llegó a una cifra. Referencia primaria: [Ontology de Palantir](https://www.palantir.com/docs/foundry/ontology/overview/). Es una propuesta conceptual, no una integración con Foundry.

## Archivos y dependencias
| Archivo | Responsabilidad |
|---|---|
| fintarget-mockup.html | Inicio original y vistas financieras; ahora incorpora comparador, emisores y datos |
| fintarget-workspace.css / .js | Estilos de espacio de análisis y funciones adicionales |
| miracle-mockup.html | Nueve vistas originales más laboratorio predictivo |
| miracle-modelos.css / .js | Registro interactivo de modelos y escenario financiero |
| fuentes-validacion.js / .json | La misma matriz: JS para funcionar con file://; JSON para análisis futuro |
| miracle-modelos.json | Registro estructurado de candidatos, objetivos y evaluaciones |
| FinTarget-contexto.md / Miracle-contexto.md | Contexto previo más adenda; se conserva el texto histórico |
| backups/2026-10-06/ | Copias originales de los cuatro archivos existentes |

Los prototipos cargan tipografías remotas. Miracle usa d3 y topojson de CDN y geometría mundial remota: el mapa necesita internet. Los módulos nuevos no requieren librerías externas ni servicios de datos. La existencia del registro de fuentes no significa que haya conectores funcionando.

## Mapa de FinTarget
| Vista | Qué había | Qué queda / se amplía | Disponibilidad |
|---|---|---|---|
| Costo de capital | 12 sectores, KPIs, filtros COP/USD y nominal/real, tabla, inspector | Mantiene diseño azul y distribución. CSV de demo funcional; XLSX identificado como pendiente | Todos los valores siguen siendo ejemplos |
| Sector | Selector, sensibilidad D/E, cascada Ke, historia artificial, pares fijos | Estilo de terminal y contexto compartido; vínculos a comparar y fuentes | Historia y pares son ilustrativos; no constituyen validación |
| Calculadora | Hamada, rating sintético, beta total y tamaño fijos, memo | Espacio de trabajo; resultado y memo de ejemplo; exportación de borrador TXT | Insumos del usuario + supuestos ficticios; revisión académica pendiente |
| Macro | Seis tarjetas con series artificiales | Panel de análisis y acceso al registro de series | Fuentes localizadas; ninguna serie conectada |
| Metodología | Fórmulas y versiones | Documento de investigación dentro del terminal; etiquetas de revisión/corte claras | Propuesta, no publicación validada |
| Comparar | No existía | Selección múltiple y sensibilidad interactiva a CRP; moneda/base compartida | Cálculo determinista sobre parámetros demo |
| Emisores | En el contexto, no en el HTML | Lista/detalle de objetos con método según tipo de entidad | Sin estados ni precios ingeridos; verificar entidades y CIK |
| Datos | Fuentes mencionadas sin contrato visible | Registro filtrable con estado, frecuencia, insumos y limitaciones | Revisión documental, no prueba de ingestión |

No basta con aplicar un fondo oscuro. El siguiente incremento debe conectar el universo de pares real al inspector sectorial, permitir contrastar versiones y fechas, y mantener una selección de entidad entre vistas. Ya existe contexto compartido para moneda y base en las vistas calculables. Falta persistencia de proyectos, historial de cortes, ejecución de métodos del backend y permisos.

### Correcciones financieras necesarias
- El prototipo usaba D/E × 0,6 y D/E × 1,5 como si fueran p25 y p75. Se renombran como sensibilidad ilustrativa. Los percentiles deberán salir de una distribución observada, y el rango de WACC de cálculos por percentil de D/E no es automáticamente el rango p25–p75 del WACC.
- La deuda financiera no es pasivo total. D/E contable de privadas es un proxy con supuestos explícitos; ponderaciones de WACC requieren valores de mercado u objetivo defendible. Filtrar patrimonio negativo y distinguir consolidado/separado.
- La conversión monetaria del costo bruto de deuda se hace antes de aplicar el escudo fiscal nominal. La tasa real se obtiene después de construir la tasa nominal en su moneda. El motor de ejemplo se ajusta en esa dirección.
- CRP de equity y spread soberano de deuda son objetos distintos. El mockup mantiene un mismo valor ficticio por simplicidad y lo declara; la implementación debe separarlos.
- TES pesos/UVR permiten calcular breakeven comparable por plazo. No aislan riesgo de crédito, liquidez y prima de inflación. La diferencia TES–Treasury ajustada por inflación queda como indicador experimental hasta justificar un modelo; no se etiqueta CRP validada.
- Una expectativa a 12 meses no debe mezclarse sin explicación con una tasa de descuento a 10 años. Definir horizonte y curva de inflación apropiados.
- Rating sintético: controlar gastos financieros nulos, EBIT negativo, sector financiero y límites de la tabla. No transformar silenciosamente cero en 0,01. Prima de tamaño y correlación de beta total necesitan fuentes y parámetros; +2 pp y 0,45 son ejemplos.
- Bancos y aseguradoras: Ke y métodos de equity. WACC industrial no se aplica mecánicamente.
- NIC 36 requiere coherencia entre flujos, impuestos, moneda y tasa. Un WACC después de impuestos de ejemplo no es un memo listo para auditoría. La versión actual se presenta como borrador y requiere reconciliar la tasa preimpuestos aplicable.
- Las betas de pocos emisores líquidos, CREG y notas NIC 36 son contrastes con contextos distintos, no una verdad universal ni validación ya realizada.

## Mapa de Miracle
| Vista conservada | Profundización vinculada |
|---|---|
| Panorama | Acceso al laboratorio; conservar lectura ejecutiva de los dos productos |
| Sostenimiento | IRS experto separado de probabilidad; panel plataforma–periodo y costos comparables |
| Amenaza dron | Exposición mensual agregada, cobertura de observación, calibración y base de eventos |
| Radar | Evidencia por categoría y teatro; confianza, fuentes y revisión |
| Fichas | Campos estructurados y relaciones con evidencia; evitar texto sin fuente verificable |
| Tendencias | Comparar cohortes, rezagos y cambios de cobertura antes de extrapolar |
| Fuentes | Corrección SIPRI y vínculo a la matriz ampliada |
| Edición 1 | Conservar formato; cifras y fechas del diseño no representan informe publicado |
| Acceso institucional | Conservar flujo visual; no habilita autenticación ni envío real |
| Laboratorio nuevo | Seis fichas, búsqueda, preparación de datos, exportación y escenario financiero |

### Modelos propuestos

#### Exposición mensual
- Pregunta: P(al menos un evento documentado) y conteo por departamento–mes, horizonte 1–3 meses.
- Candidato: LightGBM · binario / Poisson. Captura relaciones no lineales en tablas; si no supera el baseline fuera de muestra, se conserva el baseline.
- Baseline: Logística regularizada / binomial negativa / promedio estacional.
- Datos: Base de eventos con fecha de ocurrencia y publicación, departamento, deduplicación, confianza y meses de cobertura conocida.
- Evaluación: Brier y log-loss para probabilidad; PR-AUC con prevalencia; deviance/MAE para conteo; calibración y cobertura de intervalos.
- Validación: Ventanas temporales móviles, embargo según horizonte y auditoría por departamento. Cero menciones no es cero eventos.
- Estado: Base curada inexistente en esta carpeta; etiquetas y cobertura pendientes. No se entrena ni produce pronóstico.

#### Costo de sostenimiento
- Pregunta: Distribución del costo observable por contrato/plataforma y horizonte presupuestal, cuando sea comparable.
- Candidato: LightGBM / CatBoost · cuantiles. LightGBM trabaja con cuantiles; CatBoost es candidato cuando categorías numerosas son útiles. Comparar ambos sin asumir ganador.
- Baseline: Regresión robusta y escenarios financieros deterministas.
- Datos: SECOP II normalizado; panel propio de plataformas, contratos, moneda y costos adjudicados a componentes comparables.
- Evaluación: Pinball loss, MAE, cobertura e intervalo medio; desempeño por familia de plataforma.
- Validación: Separar por fecha y grupos de contrato/proveedor; impedir que adiciones del mismo contrato crucen train/test.
- Estado: Catálogo SECOP verificado; extracción, moneda y vínculo plataforma–contrato pendientes. Precio de contrato no equivale a costo total.

#### Interrupción de sostenimiento
- Pregunta: Tiempo hasta una interrupción públicamente documentada, horizonte 12–36 meses.
- Candidato: Supervivencia · Cox / AFT / boosting. Permite representar plataformas sin evento observado y seguimientos de distinta duración.
- Baseline: Kaplan–Meier por cohorte y Cox penalizado.
- Datos: Panel plataforma–periodo con inicio, interrupción, observación final y censura; universo histórico más amplio.
- Evaluación: Brier dependiente del tiempo, concordancia, calibración a horizonte e intervalos.
- Validación: Evaluación temporal y por plataforma; casos Mi-17/Israel son estudios retrospectivos, no prueba suficiente de generalización.
- Estado: Diez plataformas y dos casos no bastan. IRS experto continúa separado de una probabilidad aprendida.

#### Difusión tecnológica
- Pregunta: Tiempo hasta primera documentación en Colombia por categoría, con censura derecha.
- Candidato: Supervivencia · modelo jerárquico. La censura y muestra pequeña importan más que la complejidad del algoritmo.
- Baseline: Distribución empírica de rezagos y escenarios de adopción.
- Datos: Fechas contrastadas, fuente y confianza por categoría/teatro; observación censurada para categorías no documentadas.
- Evaluación: Brier de supervivencia, cobertura de intervalos y sensibilidad a fecha incierta.
- Validación: Simular cortes históricos, dejar categorías fuera y presentar sesgo de documentación.
- Estado: Pocas categorías; empezar con rangos y evidencia, no con LightGBM. Primera noticia no prueba primera adopción.

#### Anomalías de importación
- Pregunta: Desviación de volumen/valor de importaciones 8806 frente a patrón estacional.
- Candidato: STL robusto / Isolation Forest. Modelo sin supervisión como apoyo a revisión comercial, no como clasificador de uso ilícito.
- Baseline: Mediana móvil / MAD con ajuste estacional.
- Datos: Microdatos DANE por mes, origen, destino y aduana; homogeneizar cambios arancelarios.
- Evaluación: Estabilidad, falsas alertas revisadas y precision@k solo con etiquetas adjudicadas.
- Validación: Backtest temporal; separar shocks de clasificación y cobertura. No traduce anomalía comercial en amenaza.
- Estado: Catálogo localizado; filas y continuidad recientes pendientes. Aduana de ingreso no representa ubicación final.

#### Extracción de evidencia
- Pregunta: Sugerir evento, fecha, departamento y duplicados para revisión humana.
- Candidato: NLP · clasificación / entidades. Reduce trabajo de curación. No completa datos ausentes ni convierte afirmaciones periodísticas en hechos.
- Baseline: Reglas, diccionarios y búsquedas verificables.
- Datos: Corpus anotado, derechos revisados, fuentes diversas y acuerdos de adjudicación.
- Evaluación: Precision/recall/F1 de entidades y eventos, duplicados y acuerdo entre revisores.
- Validación: Separar fuentes y fechas; impedir que noticias sindicadas aparezcan en ambos conjuntos.
- Estado: Sin corpus ni evaluación. La extracción propone candidatos; un analista confirma cada evento.

LightGBM es un candidato para datos tabulares, con objetivos de clasificación, conteo y cuantiles documentados en su [referencia oficial](https://lightgbm.readthedocs.io/en/stable/Parameters.html). No todos los problemas requieren boosting: supervivencia, escasez de etiquetas y censura pueden requerir otros enfoques. No hay modelos entrenados ni métricas inventadas en este incremento.

### Otras capas cuantitativas de Miracle
- IRS: índice multicriterio de juicio experto. Publicar pesos, sensibilidad, calidad y faltantes. No interpretar 80/100 como 80% de probabilidad.
- HHI: declarar denominador, fecha y criterio de ponderación; unidades heterogéneas, valor contractual y TIV no son intercambiables.
- SeR₉₅: distribución de cambios de costo bajo supuestos, dependencias y exposiciones. Aumentar a 3.000 simulaciones no valida distribuciones ni probabilidades. Hasta reunir evidencia, publicar escenarios y sensibilidad, no precisión aparente.
- Disponibilidad: reconciliar flota adquirida, entregada, vigente y operativa; el contexto contiene 8/25 y 8/20 para Mi-17. No decidir el denominador sin fuente y corte.
- Cobertura y vida media antidron: requieren evidencia de eficacia comparable por categoría y proyección de mezcla; por ahora son hipótesis de escenario.
- Aduanas/importaciones: indicador comercial. No permite identificar el uso final ni inferir exposición táctica local.
- El escenario añadido calcula Δcosto = costo base × exposición neta sin cobertura × shock cambiario. No usa un contrato real ni pretende ser SeR₉₅.

## Registro de disponibilidad
Estados separados: fuente localizada/verificada documentalmente; esquema pendiente; acceso pendiente; curación/etiquetas pendientes; licencia comercial requerida. “Verificada” aquí significa que la página oficial describe el recurso. No certifica filas, continuidad, permisos de redistribución ni exactitud de resultados.


### FT01 · Damodaran
[Fuente](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html)
- Estado: Fuente verificada. Frecuencia: Por dataset; guardar corte.
- Insumos: Betas, ERP, CRP, spreads sintéticos.
- Límite: Mapeo CIIU propio; comprobar términos de cada fichero. No es calibración colombiana.

### FT02 · BanRep · TES
[Fuente](https://www.banrep.gov.co/en/node/50444)
- Estado: Fuente verificada. Frecuencia: Serie de mercado; confirmar calendario en ingestión.
- Insumos: Curvas cero cupón COP / UVR 1, 5, 10 años.
- Límite: Breakeven contiene primas de liquidez e inflación; spread TES–Treasury no es CRP pura.

### FT03 · FRED · DGS10 / T10YIE
[Fuente](https://fred.stlouisfed.org/series/DGS10) · [Serie complementaria](https://fred.stlouisfed.org/series/T10YIE)
- Estado: Fuente verificada. Frecuencia: Diaria, días hábiles.
- Insumos: Treasury e inflación implícita USD a 10 años.
- Límite: DGS10 es constant maturity; alinear plazo y fecha. T10YIE es breakeven, no expectativa pura.

### FT04 · Supersociedades · NIIF
[Fuente](https://www.datos.gov.co/Econom-a-y-Finanzas/Estados-Financieros-NIIF-Estado-de-Situaci-n-Finan/pfdp-zks5)
- Estado: Esquema pendiente. Frecuencia: Anual; comprobar cobertura.
- Insumos: Balances, deuda financiera y patrimonio por empresa/CIIU.
- Límite: Página localizada; API de muestra no accesible en esta revisión. No confundir pasivo total con deuda ni D/E contable con D/E de mercado; resultados requieren otro dataset.

### FT05 · SEC · EDGAR
[Fuente](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- Estado: Fuente verificada. Frecuencia: Al publicarse el filing.
- Insumos: Submissions, companyfacts y XBRL.
- Límite: Verificar CIK actual, moneda, unidad, consolidación, duplicados y extensiones; no garantiza todos los datos trimestrales.

### FT06 · Bolsas / nuam / proveedor
[Fuente](https://www.nuamx.com/)
- Estado: Acceso pendiente. Frecuencia: Según contrato.
- Insumos: Precios ajustados, acciones, dividendos y volúmenes.
- Límite: No se comprobó API ni licencia comercial. Betas LatAm y cotizaciones quedan condicionadas a historia y derechos.

### FT07 · Superfinanciera
[Fuente](https://www.superfinanciera.gov.co/)
- Estado: Esquema pendiente. Frecuencia: Por serie.
- Insumos: Tasas de crédito y estados financieros.
- Límite: Portal localizado; dataset semanal y campos aún sin verificar. Tasa bancaria es contraste, no Kd específico.

### MI01 · SIPRI
[Fuente](https://www.sipri.org/databases/armstransfers)
- Estado: Licencia comercial requerida. Frecuencia: Anual.
- Insumos: Transferencias de armas convencionales principales, 1950–2025.
- Límite: No equivale a inventario operativo; TIV no es precio. Uso comercial requiere autorización y licencia.

### MI02 · SECOP II · contratos
[Fuente](https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h)
- Estado: Fuente verificada. Frecuencia: Catálogo declara diaria; medir rezago real.
- Insumos: ID contrato, proveedor, entidad, objeto, fechas, valor.
- Límite: 85 campos en catálogo; no auditada muestra API. Reservas y contratación fuera de SECOP producen cobertura incompleta; no prueba costo de ciclo de vida.

### MI03 · DANE · importaciones
[Fuente](https://microdatos.dane.gov.co/index.php/catalog/473)
- Estado: Fuente verificada. Frecuencia: Mensual; catálogo consultado 2012–2024.
- Insumos: Partida, país de origen, aduana, departamento destino.
- Límite: Validar ficheros recientes y subpartidas 8806, cambios HS desde 2022. Aduana no es lugar de uso ni importación evidencia de amenaza.

### MI04 · OFAC · SLS
[Fuente](https://ofac.treasury.gov/sanctions-list-service)
- Estado: Fuente verificada. Frecuencia: Al actualizar la lista.
- Insumos: Identificadores, nombres, alias y programas de sanciones.
- Límite: Cruce de entidades y propiedad necesita revisión humana; ausencia en lista no significa ausencia de riesgo.

### MI05 · Base propia de eventos
[Fuente](https://www.gdeltproject.org/)
- Estado: Curación pendiente. Frecuencia: Ingestión propuesta continua; salida mensual.
- Insumos: Evento, fecha de ocurrencia/publicación, departamento, evidencia y confianza.
- Límite: GDELT es descubrimiento de prensa, no verdad de terreno. Deduplicar y adjudicar; cero noticias no equivale a cero eventos. Términos de prensa por verificar.

### MI06 · Panel de sostenimiento
[Fuente](https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h)
- Estado: Etiquetas pendientes. Frecuencia: Según evidencia.
- Insumos: Plataforma–periodo, interrupciones, costos, disponibilidad, contratos.
- Límite: Diez plataformas y dos episodios no sostienen un clasificador fiable. Requiere panel histórico más amplio, censura y costes comparables.

### MI07 · Eficacia / obsolescencia
[Fuente](https://www.sipri.org/databases/armstransfers)
- Estado: Evidencia pendiente. Frecuencia: Por estudio.
- Insumos: Evaluaciones públicas comparables por categoría.
- Límite: SIPRI no aporta eficacia antidron. Cobertura y vida media serán escenarios explícitos hasta reunir evaluaciones; no afirmar eficacia operativa.

## Referencias de interfaz y Mobbin
Se abrió [Discover iOS](https://mobbin.com/discover/apps/ios/latest). La lectura disponible solo devolvió navegación y acceso a cuenta; no se pudo inspeccionar visualmente su catálogo. Se intentaron las tres referencias ya presentes en el contexto y fueron inaccesibles por esta herramienta:
- [Tana](https://mobbin.com/screens/667840c0-0cf6-4ee7-92b7-af4f52f1c979): candidata para documentación y relaciones.
- [Shopify](https://mobbin.com/screens/60c99ad3-212d-4383-9a10-afe66d0facfa): candidata para listas/filtros.
- [Browserbase](https://mobbin.com/screens/a1bce0e8-4c2e-4a90-9483-7815df1359f3): candidata para lista/detalle.

Estas atribuciones proceden del contexto previo, no de pantallas inspeccionadas en esta sesión. No se afirma haber copiado una interfaz Mobbin. Su revisión visual queda pendiente de acceso autenticado.

Como referencias públicas verificables se revisaron [funciones de Koyfin](https://www.koyfin.com/features/) y [TradingView Desktop](https://www.tradingview.com/support/solutions/43000671618-what-is-tradingview-desktop/). De ellas se deriva la propuesta de paneles enlazados, análisis por entidad, listas y contexto sincronizado. La implementación actual es una adaptación de esas ideas al mockup existente.

## Contrato de datos y de modelos
Toda observación futura: source_id, source_record_id, entity_id, economic_date, published_at, ingested_at, currency, unit, scope, raw_hash, license_id, quality_flags. Mantener originales y revisiones; derivaciones con versión y fórmula.

Toda predicción: model_id/version, training_cutoff, as_of, horizon, target, geography_grain, baseline, point_or_probability, interval, calibration_version, feature_snapshot y review_state. Una fuente publicable después del corte no puede usarse en entrenamiento retrospectivo para ese corte.

Cada nueva funcionalidad pasa por: muestra de datos y esquema → validación de licencia → cobertura temporal/granularidad → definición de target → baseline → backtest → revisión → publicación. Si el dato no alcanza, mostrar faltante, escenario o bloqueo de preparación.

## Orden sugerido de implementación real
1. Costo de capital mensual: congelar supuestos y mapping CIIU, verificar ficheros, distribuir con método versionado.
2. Esquema compartido de entidades, observaciones, licencias y resultados; introducir linaje en ambos productos.
3. Miracle: curación y deduplicación de eventos; normalización SECOP y exposición cambiaria; IRS experto y escenarios transparentes.
4. Baselines y evaluación temporal; modelos candidatos solo tras cumplir sus condiciones.
5. Alta frecuencia FinTarget, derivados de precios con derechos y nuevas familias predictivas cuando haya cobertura suficiente.

No se reprograman los calendarios previos ni se convierten candidatos en compromisos de lanzamiento.

---
## Adenda · FinTarget Mockup V2 · 7 oct 2026
Prevalece sobre la tabla "Mapa de FinTarget" para el estado del prototipo. Versión anterior respaldada en `backups/2026-10-06-v1-workspace/`.

**Dirección visual.** Se abandona el azul brillante y el tema oscuro de terminal. Paleta institucional: papel `#F5F4F0`, tinta `#17212B`, barra superior carbón `#121A24`, azul marino `#1F3A5F` para acciones y un dorado apagado `#B8893B` como acento de navegación y línea de comandos. Títulos en Source Serif 4; texto en IBM Plex Sans; cifras en IBM Plex Mono. Paletas de gráficos validadas con el validador de dataviz (rampa ordinal azul para activos, rampa bronce para financiación, trío categórico azul/naranja/verde para márgenes).

**Navegación (códigos tipo Bloomberg).** WACC Costo de capital · CALC Calculadora · FA Análisis V/H · GA Gerencia Analítica · ECO Macro · DOC Método y fuentes. Línea de comandos en la barra superior (Ctrl K): `TGLS FA`, `EC ALTZ`, `V EVA`, `WACC energía`. Las vistas Sector, Comparar, Emisores y Datos se retiran: Comparar pasa a la herramienta CRP, Emisores al selector de empresa de FA y Datos a la sección 9 de Método y fuentes. Los hashes viejos redirigen.

| Vista | Contenido |
|---|---|
| WACC y CALC | Sin cambios de estructura; nueva paleta. Botón "Betas y pares" abre la herramienta BETA |
| FA | Tecnoglass, Ecopetrol y Visa con datos de los talleres (Investing.com). Balance y resultados en valores, vertical, horizontal e índice; inspector por celda con fórmula, fuente y alertas; navegación con flechas; notas del analista; controles de calidad (cuadre, sumas, saltos de escala, contraste con fuente primaria); 6 gráficos para comité; modo Gerencia con señales de semáforo; presentación de 8 diapositivas imprimible |
| GA | 28 herramientas en 6 familias: cálculos del curso (APAL MARTEX, UPA ejercicio 9, FCL, EVA, DuPont, ratios, Altman Z'', betas, prima país), skills con corrida simulada (IncAnalyze, WaccModel, MarketRatios, DailyReport, CDTLive, RiskLive, clean-finance, dossier) y modelos FinTarget con salida simulada (rating con aportes por variable, probabilidad de incumplimiento, creación de valor), más Excel (=FT.*), alertas y presentación |
| ECO | Tarjetas macro + tabla de sensibilidad del WACC mediano a cada insumo |
| DOC | Metodología + análisis V/H + calidad de datos + registro de fuentes |

**Pruebas de referencia que reproduce.** VISA FY2025: NOPAT 22.225, capital invertido 46.829, ROIC 47,5 %, EVA 18.727 (taller 18.728, redondeo). Ecopetrol 2025: ROE 10,8 %, Z'' 5,44 (BB+). Tecnoglass 2025: EVA ≈ 62,9 con WACC 11,5 %.

**Archivos.** `fintarget-mockup.html` (núcleo), `fintarget-analitica.css/.js` (FA, GA, comandos, presentación), `fintarget-empresas.js` (estados financieros de los tres emisores). Servidor local para revisar: `python -m http.server 8765 --directory hypertarget-mockups`.

**Pendiente.** Pasada de referencias de Mobbin (el conector quedó instalado durante la sesión); conectar FA a SEC EDGAR y Supersociedades; reemplazar las salidas simuladas de los modelos por las entrenadas.

---
## Adenda · V3 · 7 oct 2026
Respaldo previo en `backups/2026-10-07-pre-v3/`.

### FinTarget V3
- **Nueva pestaña DX · Tu empresa** (`fintarget-dx.js`). El usuario sube su balance y PyG (Excel o CSV, cualquier tamaño de empresa). SheetJS lo lee en el navegador; un diccionario de ~38 cuentas en español e inglés (Investing, Supersociedades NIIF, exportes contables) mapea cada fila con un nivel de confianza; el usuario corrige el mapeo; FinTarget deriva lo que falte (deuda financiera, utilidad bruta, etc.) y genera: resumen y señales, V/H, indicadores, WACC con beta del sector reapalancada (Hamada), prima país, prima de tamaño y rating sintético, curva WACC vs D/E, FCL histórico, proyección a 5 años con DCF y sensibilidad WACC × g, GAO/GAF/GAT y punto de equilibrio, UPA con punto de indiferencia, EVA, Altman Z'', rating y probabilidad de incumplimiento.
- **Excel de 13 hojas con fórmulas vivas** (Portada, Supuestos, Balance, PyG, Indicadores, WACC, FCL Histórico, FCL Proyectado, Apalancamiento, UPA, EVA, Riesgo, Calidad y mapeo). Verificado en Excel real: 0 errores de fórmula tras recálculo.
- **Prueba con el archivo real del taller** (`ejemplos/Taller-FCL-VISA.xlsx`): FCL histórico y proyectado idénticos al taller; GAO 1,459; EBIT de indiferencia 22.823,5; UPA 10,93 / 10,95; EVA 2025 19.206; WACC sector 7,47 %; valor por acción 434,20 frente a 434,08 del taller (diferencia de WACC de 0,001 pp).
- Ejemplo PYME colombiana en formato Supersociedades: `ejemplos/PYME-Confecciones-del-Caribe.xlsx` (COP miles).
- Gerencia Analítica: se retiró CDT; RiskLive (finanzas personales) se reemplazó por **MC · Monte Carlo del valor** de la empresa. DX entra como herramienta.
- Barra de navegación inferior en móvil; FA abre en modo Gerencia en pantallas pequeñas.

### Miracle V3
- Reconstruido con la lógica de FinTarget (`miracle-mockup.html`, `miracle-v3.css`, `miracle-app.js`, `miracle-datos.js`); se conserva la identidad negro/blanco y Newsreader. Las vistas V1 (Radar, Fichas, Tendencias, Edición, Acceso y Laboratorio) quedan en el respaldo; su contenido se reparte en las nuevas vistas.
- Pitch para el Ministerio de Defensa: Colombia tiene pocos ataques documentados; el mundo tiene más de un millón de eventos. Vistas: BRF Brief (alertas de la semana, tres capacidades, piloto de 90 días), ST Riesgo espaciotemporal (mapa de ~1.000 celdas de ~40 km sobre la geometría real de Colombia y mapa de teselas, horizonte 1/4/12 semanas, cuatro modelos, SHAP, calibración y baselines), TRF Transferencia (similitud por teatro, curva de aprendizaje, ablación, reloj de difusión, vida media de contramedidas), TEA Teatros (nueve teatros con mapa mundial), MNT Sostenimiento (flota, supervivencia a 36 meses, componentes, IRS y backtest Mi-17), LAB 11 modelos con ficha, ONT ontología y linaje, DAT fuentes y calidad, GOV líneas rojas, acceso y auditoría. Presentación de 10 diapositivas imprimible.
- Datos sintéticos, salvo los hechos públicos (Mi-17, Gripen). Se mantienen las líneas rojas: solo agregados, nunca sitios, unidades ni personas.
- Mobbin: el conector requiere plan pago; no se usó.
