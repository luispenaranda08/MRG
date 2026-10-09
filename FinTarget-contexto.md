# FinTarget: contexto de trabajo

> Documento para retomar FinTarget en otra sesión. Resume las decisiones, el método, el cronograma y lo pendiente al 6 de octubre de 2026.
> FinTarget es un producto de **HyperTarget** (founder: Luis David Peñaranda). Es independiente de **Miracle**, el proyecto de defensa, que tiene su propio documento y calendario.

---

## 1. Qué es FinTarget

**Una línea:** FinTarget es la referencia del costo de capital en Colombia: WACC por sector, betas locales y prima país, con metodología pública y defendible ante auditores y peritos. Es "el Damodaran de Colombia", con camino a terminal financiera.

**Foco elegido el 6 de octubre:** el producto principal es el **costo de capital**. La macro y las fichas de emisores son secciones de apoyo.

**Por qué este foco:**
- Es el segmento con menos competencia. Damodaran es global y no calibra para Colombia. Los valoradores calculan su WACC internamente y no lo publican. Lo demás son tesis de grado.
- Tiene demanda obligatoria:
  - **Pruebas de deterioro (NIC 36):** toda empresa con plusvalía o activos de larga vida necesita una tasa de descuento cada año, y el auditor la revisa.
  - **Valoraciones** de compraventa de empresas, de participaciones y en peritajes judiciales.
  - **Tarifas reguladas y concesiones:** la CREG remunera con WACC; la ANI y las APP usan tasas de descuento.

**Lo que no es la puerta de entrada (mercados saturados):**
- Estados financieros de empresas privadas: BPR Benchmark (unas 350.000 empresas), EMIS, Informa/eInforma (D&B, unos 4 millones de empresas). Supersociedades publica los mismos datos gratis en datos.gov.co.
- Scoring de riesgo de empresas: BPR, Informa, Experian, TransUnion.
- Macro de Colombia: BanRep y los equipos de investigación de Bancolombia, Corficolombiana, BBVA y Davivienda la publican gratis.
- Screeners de acciones de la BVC: TradingView, Finxard, BVCBOT y los comisionistas. Además es un mercado pequeño.

**Comparables para explicar FinTarget en EE. UU.:**
- **Damodaran Online:** datos gratis con metodología pública generan autoridad.
- **Bloomberg:** la visión de largo plazo.
- **Koyfin / TIKR:** modelo freemium.
- **Economatica:** prueba de que en LatAm se paga por datos fundamentales.

---

## 2. Por qué es difícil calcular el CAPM y el WACC en Colombia (y por qué eso es el negocio)

| Componente | Problema en Colombia | Solución de FinTarget |
|---|---|---|
| Beta | Pocas acciones líquidas: la regresión sesga la beta hacia cero y muchos sectores no tienen empresas listadas | Beta bottom-up de comparables, corregida por caja |
| Sector | Las industrias de Damodaran no corresponden a la CIIU | Mapeo CIIU Rev. 4 ↔ Damodaran, que es propiedad intelectual de FinTarget |
| Estructura de capital | Las empresas no cotizadas no tienen valor de mercado del patrimonio | Re-apalancar (Hamada) con la mediana de D/E del sector en Supersociedades |
| Rf, ERP y prima país | Mezclar TES con bono de EE. UU. más prima país cuenta el riesgo país dos veces; el histórico local de ERP no es confiable | Ke en USD = Rf + βL × ERP maduro + λ × CRP, y paso a COP por diferencial de inflación (Fisher). Publicar las dos vías, local y global ajustada |
| Kd | Las empresas sin bonos no tienen precio de mercado de la deuda | Rating sintético por cobertura de intereses, contrastado con las tasas de crédito comercial de la Superfinanciera |
| Dueño no diversificado | El CAPM supone un inversionista diversificado | Beta total (βL / correlación) y prima de tamaño como parámetros visibles y opcionales |
| Sector financiero | Para bancos y aseguradoras el WACC no aplica bien | Publicar solo el Ke, como hace Damodaran |

**Fórmulas:**
```
βL        = βu × [1 + (1 − t) × D/E]
Ke (USD)  = Rf + βL × ERP + λ × CRP
Kd        = Rf + CRP + spread(rating sintético)
WACC      = E/V × Ke + D/V × Kd × (1 − t)
WACC(COP) = (1 + WACC(USD)) × (1 + π COP) / (1 + π USD) − 1
```

**Salida:** WACC por sector en COP y USD, nominal y real, publicado como **rango p25–p75**, no como una sola cifra.

**Validación de cada corte:**
- Betas por regresión de las pocas empresas líquidas: Ecopetrol, ISA, GEB y Bancolombia.
- WACC regulatorio de la CREG.
- Tasas de descuento que revelan las empresas colombianas en sus notas de deterioro NIC 36. Recopilarlas también es un producto (Vol. 1.1).

**Revisión académica:** el profesor **Andrés Saavedra** (Gerencia Financiera, Maestría en Finanzas, Uninorte) revisa la metodología antes del lanzamiento. Está pendiente definir cómo entra su "CAPM de dos vías": si es la comparación entre un CAPM local y uno global ajustado, FinTarget puede publicar ambos y mostrar la diferencia.

---

## 3. Alta frecuencia: la gran brecha y oportunidad

Damodaran actualiza las betas y la prima país una vez al año (enero) y no calibra para Colombia. Con datos públicos, FinTarget puede publicar **a diario la parte de mercado** del WACC y **cada semana las betas y el Kd**. Lo único lento es la estructura de capital de las empresas privadas, y tiene solución.

### 3.1 Frecuencia por componente

| Componente | Frecuencia posible | Cómo se calcula | Fuente gratuita |
|---|---|---|---|
| **Rf** (bono del Tesoro de EE. UU. a 10 años) | Diaria | Dato directo | FRED / Tesoro de EE. UU. |
| **Prima país implícita** | **Diaria** | TES 10 años − bono de EE. UU. 10 años − (inflación esperada COP − inflación esperada EE. UU.) | TES: BanRep · Inflación esperada COP: TES en pesos vs. TES en UVR (BanRep) · Inflación esperada EE. UU.: FRED (T10YIE) |
| **Inflación esperada** (para pasar de USD a COP) | **Diaria** | Diferencia entre TES en pesos y TES en UVR del mismo plazo, contrastada con la encuesta mensual de BanRep | BanRep |
| **ERP implícito de Colombia** | Diaria o mensual | Método implícito de Damodaran sobre el COLCAP: nivel del índice, dividendos y crecimiento esperado | Índice: BVC · Dividendos y utilidades: estados financieros de los emisores |
| **Betas** | **Semanal** | Retornos semanales a 2 años, ajuste para acciones poco líquidas, universo de pares de LatAm | Precios diarios de BVC, B3, BMV, Bolsa de Santiago y BVL, más ADR en NYSE |
| **Kd** | **Semanal** | Rating sintético por cobertura de intereses + tasas reales de crédito comercial por modalidad | Superfinanciera: tasas activas semanales (datos.gov.co) · IBR diario: BanRep |
| **D/E de empresas listadas** | Diaria y trimestral | Capitalización diaria (precio × acciones) sobre deuda del último trimestre | Precios: BVC · Estados trimestrales: Superfinanciera |
| **D/E de empresas privadas** | Anual | Mediana por sector CIIU | Supersociedades (datos.gov.co) |

**La pieza más diferencial es la prima país diaria.** Hoy casi todo el mundo usa la cifra anual de Damodaran o un CDS de pago. Calcularla cada día con TES y bonos de EE. UU. es algo que nadie publica abierto para Colombia.

### 3.2 Cómo generar las betas (la parte difícil)

Las betas de la BVC por regresión directa no sirven: hay pocas acciones líquidas y la beta sale sesgada hacia cero. El plan tiene tres capas:

1. **Universo propio de pares de LatAm.** Entre 300 y 500 empresas listadas en Brasil, México, Chile, Perú y Colombia, más los ADR, clasificadas por sector CIIU. Es más representativo para Colombia que la muestra global de mercados emergentes de Damodaran, y nadie lo tiene armado.
2. **Regresión semanal sobre ese universo:**
   - Retornos semanales a 2 años contra un índice regional de LatAm. No contra el COLCAP, porque está concentrado en pocas empresas.
   - Ajuste de Dimson para el sesgo de las acciones poco líquidas.
   - Desapalancar cada beta con su propio D/E de mercado y sacar la mediana por sector, con rango p25–p75.
3. **Re-apalancar con datos colombianos:**
   - D/E sectorial de Supersociedades (anual).
   - Para no esperar al dato anual, un estimado al día del D/E de las privadas a partir de la variación trimestral de las listadas del mismo sector.

**Resultado:** betas sectoriales actualizadas cada lunes, con historia acumulada semana a semana. **Esa serie histórica es el foso:** cada semana que pasa es más difícil de copiar.

**Control de calidad automático:**
- Si la beta de un sector cambia más de cierto umbral en una semana, se marca para revisión antes de publicarla.
- Cada corte se compara con la regresión de Ecopetrol, ISA, GEB y Bancolombia, y con el WACC de la CREG.

### 3.3 Qué datos hay para Colombia

**Gratis y frecuentes**
- **BanRep:**
  - diarios: TES en pesos y en UVR, TRM, IBR y tasa de política;
  - mensuales: encuesta de expectativas e IPC.
- **BVC:** precios diarios de cierre, índices (COLCAP) y volúmenes. *Hay que confirmar si la descarga histórica es libre o requiere el servicio de información de mercado.*
- **Superfinanciera:**
  - semanal: tasas de interés de crédito por modalidad;
  - mensual: estados financieros de bancos, aseguradoras y fiduciarias;
  - trimestral: estados financieros de los emisores de valores inscritos.
- **SEC EDGAR:** estados trimestrales y anuales de Ecopetrol, Bancolombia, Grupo Aval y Tecnoglass en XBRL. Los 20-F vienen en taxonomía `ifrs-full`, así que `ingest/edgar.py` se reutiliza.
- **FRED / Tesoro de EE. UU.:** tasas e inflación esperada de EE. UU., diarias.
- **DANE:** IPC mensual y PIB trimestral.

**Gratis pero lentos**
- **Supersociedades:** estados financieros de miles de empresas privadas, anuales y con unos meses de rezago. Sigue siendo la mejor fuente de estructura de capital por sector que existe en Colombia. Dataset: https://www.datos.gov.co/Econom-a-y-Finanzas/Estados-Financieros-NIIF-Estado-de-Situaci-n-Finan/pfdp-zks5
- **Damodaran:** referencia anual para contrastar. Datos: https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html

**De pago, para más adelante**
- **Precia:** proveedor oficial de precios en Colombia, con curvas diarias más finas.
- **CDS de Colombia:** Bloomberg o LSEG.
- **Precios de LatAm con licencia de redistribución:** EOD Historical Data, Polygon o similares, desde unos pocos cientos de dólares al año.

### 3.4 Dos riesgos

1. **Licencias de precios.** Yahoo Finance sirve para prototipar, pero sus términos no permiten redistribuir datos. Publicar betas derivadas es menos riesgoso que publicar precios, pero antes de cobrar conviene un proveedor con licencia o acuerdos directos con las bolsas. La BVC también tiene términos propios de uso de su información.
2. **Ruido por alta frecuencia.** Una prima país diaria se mueve mucho. Publica el dato diario como "indicador" y el WACC oficial como promedio móvil de 20 días, con su fecha de corte. Un auditor necesita estabilidad y trazabilidad, no volatilidad.

### 3.5 Arquitectura de actualización

```
Diario (18:00):   BanRep + FRED + BVC  →  Rf, prima país implícita, inflación esperada, ERP  →  "WACC flash"
Semanal (lunes):  precios LatAm (5 bolsas)  →  betas por sector + tasas de crédito  →  WACC oficial v.semana
Trimestral:       Superfinanciera + EDGAR  →  D/E de empresas listadas y estimado al día de las privadas
Anual:            Supersociedades  →  recalibración completa del D/E por sector
Todo en GitHub Actions, con versión, fecha de corte y prueba de validación en cada corrida.
```

**Encaje en el plan:** para el V1 del 12 de octubre basta la versión mensual. Lo diario y lo semanal es el **Vol. 1.2**, y es lo que diferencia el pitch: *"el único WACC de Colombia actualizado cada semana, con prima país diaria".*

**Verificar antes de construir el Vol. 1.2:**
- [ ] Que BanRep publica a diario la serie de TES en UVR con los plazos necesarios para la inflación esperada.
- [ ] Las condiciones de descarga histórica de la BVC.
- [ ] Que las tasas semanales de la Superfinanciera siguen actualizándose en datos.gov.co.

---

## 4. Versiones del producto

| Versión | Fecha | Contenido |
|---|---|---|
| **V1 (MVP)** | **Lunes 12 oct 2026** (festivo) | WACC por sector como portada: 15–20 sectores CIIU (mínimo 10), betas re-apalancadas, Rf, ERP, prima país, Kd sintético y WACC en COP y USD con rangos. Metodología revisada por el profesor Saavedra. Apoyo: macro y fichas de emisores SEC (EC, CIB, AVAL, TGLS). Descargas CSV/XLSX |
| **Vol. 1.1** | 21 oct – 3 nov | Calculadora de WACC para empresa no cotizada con memo en PDF listo para el auditor + dataset de tasas de descuento NIC 36 de emisores colombianos |
| **Vol. 1.2** | Después de Miracle (por calendarizar) | WACC de alta frecuencia: prima país e inflación esperada diarias, betas y Kd semanales, universo de pares de LatAm |
| **Vol. 2** | Nov–dic | Panel Supersociedades completo: ratios sectoriales y Altman Z'' para empresas privadas |
| **Vol. 3** | Q1 2027 | Capa de ML (rating, quiebra, creación de valor) + API + alertas |

### Definition of Done del V1
- [ ] Sitio público con **Costo de capital Colombia** como protagonista (WACC por sector CIIU en COP y USD con rangos p25–p75). Secciones de apoyo: Macro · Emisores · Metodología
- [ ] Mapeo CIIU Rev. 4 ↔ Damodaran para 15–20 sectores
- [ ] Validación documentada contra betas de regresión de emisores líquidos y contra el WACC de la CREG
- [ ] Metodología revisada por el profesor Saavedra antes del 11 de octubre
- [ ] Tablas descargables (CSV/XLSX) al estilo de la página de datos de Damodaran
- [ ] Pipeline reproducible en `hypertarget/fintarget` con tests (golden tests de VISA + al menos 1 emisor colombiano)
- [ ] Actualización programada (GitHub Actions, semanal)
- [ ] Página de metodología con fórmulas y fuentes citadas
- [ ] Post de lanzamiento en LinkedIn + envío a 10 personas clave

**Regla de recorte:** el costo de capital no se recorta. Si el viernes 9 no llegas, se recortan la macro y las fichas de emisores, y el mínimo baja a 10 sectores. No le quites días a Miracle (13–20 oct).

---

## 5. Cronograma del MVP: una tarea terminada por día

Supuesto de horario: entre semana 06:00–07:00 y 18:30–21:45; fines de semana 08:00–12:30 y 14:00–18:00. Todo termina antes de las 22:00. Las tareas marcadas (H1) son de estrategia.

### Martes 6 oct · FT 1/7 · Arranque y mapeo de sectores (3 h)
- [ ] 18:30–18:45 · Responder las 5 decisiones abiertas (H1)
- [ ] 18:45–19:00 · Crear repo `hypertarget/fintarget` + README con el Definition of Done
- [ ] 19:00–19:45 · Descargar de Damodaran: betas por industria (Emerging Markets y US), ERP y prima país, rating sintético → `data/external/` con fecha en el nombre
- [ ] 19:45–20:00 · Ubicar el dataset de Supersociedades y anotar campos (deuda, patrimonio, gastos financieros, utilidad operativa, CIIU)
- [ ] 20:00–21:15 · Mapeo CIIU ↔ Damodaran (18 sectores) → `data/mappings/ciiu_damodaran.csv` (ciiu, descripcion, industria_damodaran, justificacion)
- [ ] 21:15–21:30 · Cierre: commit y estados actualizados

**Al cerrar el día:** repo + archivos de Damodaran + `ciiu_damodaran.csv`

Sectores sugeridos: energía eléctrica · petróleo y gas · minería · construcción e infraestructura · cemento y materiales · alimentos · bebidas · comercio minorista · telecomunicaciones · transporte y logística · salud · farmacéutica · químicos · software y servicios TI · textil y confección · agroindustria · hoteles y turismo · inmobiliario.

### Miércoles 7 oct · FT 2/7 · Insumos del costo de capital (4,25 h)
- [ ] 06:00–06:15 · Mensaje al profesor Saavedra: borrador el jueves 8, comentarios el sábado 10 (H1)
- [ ] 06:15–06:45 · Verificar nombres FinTarget y Miracle: SIC, dominios, GitHub (H1)
- [ ] 06:45–07:00 · Revisar el contrato con Solvo: exclusividad y propiedad intelectual (H1)
- [ ] 18:30–20:00 · Insumos: Rf, ERP, prima país e inflación esperada → `inputs.parquet`
- [ ] 20:00–21:15 · Macro de apoyo: TRM, tasa de política, IBR, IPC, TES → `macro.parquet`
- [ ] 21:15–21:45 · Tests de insumos + commit

**Al cerrar el día:** `inputs.parquet` + `macro.parquet` con tests; mensaje al profesor enviado

### Jueves 8 oct · FT 3/7 · Betas y Kd (4,25 h)
- [ ] 06:00–07:00 · Borrador de metodología: estructura, fórmulas (Hamada, CAPM, Fisher, Kd sintético) y supuestos
- [ ] 18:30–20:00 · Supersociedades: mediana y p25–p75 de D/E y de cobertura de intereses por sector
- [ ] 20:00–21:00 · Re-apalancar betas + Kd sintético contrastado con las tasas de la Superfinanciera
- [ ] 21:00–21:45 · Golden tests de `finmetrics.py` + enviar el borrador al profesor

**Al cerrar el día:** betas re-apalancadas + Kd sintético + borrador en manos del profesor

### Viernes 9 oct · FT 4/7 · WACC y validación (4,25 h)
- [ ] 06:00–07:00 · Revisar betas y valores atípicos
- [ ] 18:30–20:00 · WACC por sector en COP y USD, nominal y real, con rangos p25–p75 (financiero: solo Ke)
- [ ] 20:00–21:15 · Validación contra betas de regresión (Ecopetrol, ISA, GEB, Bancolombia) y WACC de la CREG
- [ ] 21:15–21:45 · Fichas de emisores SEC: EC, CIB, AVAL, TGLS (recortable)

**Al cerrar el día:** `wacc_sectorial.xlsx` validado

### Sábado 10 oct · FT 5/7 · Revisión del profesor + sitio (8,5 h)
- [ ] 08:00–09:00 · Revisión de la metodología con el profesor Saavedra (H1)
- [ ] 09:00–12:30 · Frontend: portada de Costo de capital (tabla filtrable + descargas)
- [ ] 14:00–16:00 · Frontend: Macro, Emisores y Metodología
- [ ] 16:00–17:00 · Analítica (Plausible o PostHog) + deploy a staging
- [ ] 17:00–18:00 · Comentarios del profesor: lista de cambios, separando lo obligatorio para el 12

**Al cerrar el día:** sitio en staging + lista de cambios del profesor

### Domingo 11 oct · FT 6/7 · Cierre y QA (8,5 h)
- [ ] 08:00–10:00 · Correcciones del profesor + metodología v1.0 con fecha de corte
- [ ] 10:00–12:30 · QA completo: cada cifra contra su fuente, enlaces, descargas, móvil
- [ ] 14:00–15:00 · GitHub Actions: tests + refresh semanal + deploy automático
- [ ] 15:00–15:30 · One-liner + why now + why us (H1)
- [ ] 15:30–16:30 · Post de LinkedIn + 10 mensajes personalizados en borrador
- [ ] 16:30–17:30 · Deploy a producción + prueba final (sin publicar)
- [ ] 17:30–18:00 · Lista de 10 destinatarios (Saavedra, Jaime Gechen, Antonio Segebre + 7: valoradores, contadores, compañeros de maestría)

**Al cerrar el día:** metodología v1.0 + sitio en producción + post y mensajes listos

### Lunes 12 oct · FT 7/7 · 🚀 LANZAMIENTO FinTarget V1 (6 h, festivo)
- [ ] 08:00–09:00 · Verificación final en producción
- [ ] 09:00–09:30 · Publicar sitio + post ("El costo de capital de Colombia por sector, abierto")
- [ ] 09:30–11:00 · Enviar a los 10 destinatarios
- [ ] 11:00–12:00 · Responder comentarios
- [ ] 14:00–15:00 · Retro + backlog de Vol. 1.1
- [ ] 15:00–16:00 · Crear repo `hypertarget/miracle` (arranque de Miracle)

### Después del lanzamiento (estrategia, Hacer 1)
- 13 oct · Recoger feedback de FinTarget V1 (06:00–06:30)
- 16 oct · Llamadas de validación con Jaime Gechen y Antonio Segebre (12:30–13:30). Preguntar si usan o compran tasas de descuento (NIC 36, valoraciones, peritajes), si pagarían la calculadora y el memo, y a quién te pueden presentar.
- 21 oct – 3 nov · Vol. 1.1
- 22 oct · Tiers y precios · 24 oct · Deck de 10 slides · 29 oct · Decisión legal (SAS ahora, Delaware después) · 31 oct · Elegir un programa (iNNpulsa, MinCiencias, YC o Platanus)
- 15 nov · Checkpoint: horas de cada proyecto para Q1 2027

---

## 6. Stack y estructura del repo

```
Python (pandas, requests, pydantic) -> data/processed/*.parquet + CSV/XLSX
finmetrics.py -> ratios, CAPM, WACC, EVA (funciones puras, testeadas)
Sitio estático (template del tablero VISA generalizado o Astro) -> GitHub Pages / Vercel
GitHub Actions: tests + refresh semanal + deploy
Analítica: Plausible o PostHog
```

```
hypertarget/fintarget/
  fintarget/
    ingest/     edgar.py · banrep.py · supersociedades.py · damodaran.py · prices.py
    features/   finmetrics.py (ratios, DuPont, Altman Z, CAPM/WACC, ROIC, EVA)
    wacc/       betas.py · kd.py · crp.py · wacc.py
  data/         external/ (Damodaran con fecha) · mappings/ciiu_damodaran.csv · processed/
  dashboards/   sitio
  tests/        golden tests: VISA 2025 (razón corriente 1,08x · ROIC 47,5% · beta 0,76 · WACC de mercado 7,9% · EVA +18.535)
  docs/         metodologia.md (versionada)
```

Golden tests heredados del análisis de VISA de la maestría. Ver la página de Notion "FinTarget — framework de predicción de indicadores financieros".

---

## 7. Monetización (hipótesis por validar)

| Tier | Para quién | Qué incluye |
|---|---|---|
| Free | Estudiantes, periodistas, analistas | Tabla de WACC por sector con rangos, metodología, macro, fichas básicas |
| Pro | Valoradores, peritos, contadores, banca de inversión boutique | Calculadora para empresa no cotizada + memo PDF para el auditor, histórico, plantilla Excel |
| Institucional / API | Firmas de auditoría y valoración, financieras, fiduciarias, empresas con plusvalía | API, dataset de tasas NIC 36, licencia por equipo |
| Gobierno / academia | MinHacienda, DNP, URF, Superfinanciera, alcaldías, universidades | Licencia institucional + capacitación + tableros a la medida |

- **North Star:** usuarios semanales que descargan la tabla de WACC o usan la calculadora.
- **Señal de pago:** memos PDF generados y solicitudes de firmas de auditoría o valoración.
- **Ruta de gobierno de FinTarget:** gobierno económico (MinHacienda, DNP, URF, Superfinanciera). Ejemplo de piloto con nombre propio: "costo de capital sectorial para evaluar APP". La vía es la contratación directa por ciencia y tecnología (Ley 1150 de 2007), con Uninorte como aliada. No se mezcla con la ruta de defensa de Miracle.

---

## 8. Riesgos

- **Dispersión:** FinTarget + Miracle + servicios + maestría + Solvo. Por eso el V1 va sin ML.
- **Metodología no defendible** ante un auditor o un perito contrario. Mitigación: versión, fecha de corte y fuente en cada cifra, más la revisión del profesor.
- **Licencias:** Yahoo no permite redistribuir; BVC tiene términos propios; los CSV de cnic92 no son redistribuibles.
- **Mercado pequeño:** pensar desde el inicio en replicar en Perú, Chile y Centroamérica.
- **Contrato con Solvo:** verificar exclusividad y propiedad intelectual.
- **Marca:** búsqueda de "FinTarget" en la SIC antes de lanzar.

---

## 9. Marca y mockups (archivos locales)

Carpeta: `hypertarget-mockups/` (dentro de `Naowee-Luis/SLM-T1/`)

- `fintarget-mockup.html`: mockup navegable con 5 pantallas: Costo de capital, Sector, Calculadora, Macro y Metodología. Cifras de ejemplo.
- `logos/fintarget-symbol-black.svg`: **FinTarget A (recomendado)**, la F y la T comparten la barra superior, con el ajedrezado de HyperTarget a la izquierda.
- `logos/fintarget-alt-symbol-black.svg`: alternativa con F y T separadas.
- `logos/concepts.png`: hoja comparativa de los conceptos.
- **Colores:** azul HyperTarget `#128ED6`, azul oscuro `#0B2540`, tinta `#0F2236`, fondo `#F2F7FB`.
- **Tipografías del mockup:** Archivo (marca), IBM Plex Sans (texto), IBM Plex Mono (números).
- **Pendiente:** elegir la dirección del logo y armar el kit (paleta, versiones en negativo y a una tinta, lockups horizontal y apilado, favicon e íconos de app, guía de uso).

Referencias de interfaz (Mobbin):
- Tabla financiera de Perplexity Finance: https://mobbin.com/screens/9403c5aa-9ecf-4e38-828f-7f702ef23448
- Chips y totales de Twenty: https://mobbin.com/screens/35f5c474-ed6a-4c77-a6cb-f2e1d6b12398
- Panel lateral de filtros de Square: https://mobbin.com/screens/515531bc-92ff-4a24-b0fe-4440f32ad471

---

## 10. Notion

Todo vive en la base **🚀 HyperTarget**:
- **Calendario principal:** una entrada por día, de "FT 1/7" a "FT 7/7" (6–12 oct), cada una con su lista de bloques horarios.
- **Hacer 1 — Mapa estratégico** (estrategia, competencia, gobierno, estándar de startup estadounidense): https://app.notion.com/p/3f1d865dfe1481fca23ec873ef8b9d18
- **Hacer 2 — Build** (criterio de terminado, método, fuentes y cronograma detallado): https://app.notion.com/p/3f1d865dfe148140b348ff9894f18a18
- **Plan Operativo 12 meses de HyperTarget:** https://app.notion.com/p/381d865dfe148046bd75eb36eebc4603
- **FinTarget — framework de predicción** (página original de la maestría, con la propuesta al profesor): https://app.notion.com/p/3ced865dfe1481f09f03ddc21589eb2d

---

## 11. Decisiones abiertas

- [ ] ¿Dominio propio para FinTarget o bajo hypertarget (por ejemplo `fintarget.hypertarget.xx`)?
- [ ] ¿Qué logo: FinTarget A o B?
- [ ] ¿Cómo entra el "CAPM de dos vías" del profesor Saavedra en la metodología?
- [ ] ¿Quién ayuda con el QA esta semana?
- [ ] ¿Qué dice el contrato con Solvo sobre proyectos propios?
- [ ] ¿Cuándo se calendariza el Vol. 1.2 (alta frecuencia) y su bloque de verificación de fuentes?



---
## Adenda · evolución del mockup y datos · 6 oct 2026
Esta adenda prevalece para el estado del prototipo sobre afirmaciones anteriores de disponibilidad o validación. Se conserva la portada; las demás vistas adoptan un espacio de análisis financiero y se añaden Comparar, Emisores y Datos. Todos los números permanecen como ejemplos; no hay pipeline conectado ni revisión académica concluida.
Los rangos existentes eran sensibilidades D/E × 0,6–1,5, no percentiles observados. TES–Treasury ajustado por inflación no queda validado como CRP. Separar prima de equity y spread de deuda, D/E contable y mercado, y tasa después de impuestos de la tasa aplicable a NIC 36. XLSX/PDF siguen pendientes; CSV demo y exportación de escenario funcionan.
Mapa, fuentes y límites: [MAPA-Y-EVOLUCION.md](MAPA-Y-EVOLUCION.md). Matriz estructurada: fuentes-validacion.json.

---
## Adenda · Mockup V2 · 7 oct 2026
El mockup pasa de "tabla de WACC con vistas de apoyo" a un espacio de análisis con lógica de terminal: códigos de función y línea de comandos, análisis vertical y horizontal con datos reales de los talleres (Tecnoglass, Ecopetrol, Visa), pestaña Gerencia Analítica con todas las herramientas del curso y las skills, y modo presentación para comité. Paleta institucional (sin el azul brillante). Detalle en [MAPA-Y-EVOLUCION.md](MAPA-Y-EVOLUCION.md), adenda del 7 oct.

---
## Adenda · FinTarget V3 · 7 oct 2026
Nueva capacidad central: cualquier empresa, grande o pequeña, sube su balance y PyG y recibe el análisis completo (V/H, indicadores, WACC con beta del sector, FCL, DCF, apalancamiento, UPA, EVA, riesgo) y un Excel de 13 hojas con fórmulas vivas al nivel del taller de FCL y Apalancamiento de VISA. CDT retirado de Gerencia Analítica. Detalle en [MAPA-Y-EVOLUCION.md](MAPA-Y-EVOLUCION.md), adenda V3.
