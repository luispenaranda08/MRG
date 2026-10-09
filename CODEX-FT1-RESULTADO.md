# CODEX-FT1 · Resultado

Implementado el 9 oct 2026. Se leyó CODEX-FT1.md completo y se usaron index.html y site.css como referencia de identidad. No se abrió navegador ni servidor, no se instaló nada y no se desplegó.

## Archivos editados

- fintarget-mockup.html: tokens, fuente, corchetes, estilos, textos, franja cerrable y avisos de exportación.
- fintarget-analitica.css: colores, contraste, tarjetas, comandos y presentación.
- fintarget-analitica.js: textos y colores generados, identificación local de cifras ilustrativas.
- fintarget-dx.js: presentación de archivos de ejemplo, error de carga y avisos en informes y XLSX.
- fintarget-empresas.js: textos de procedencia y aviso del WACC ilustrativo de Ecopetrol.
- index.html: únicamente los cuatro cambios pedidos: meta description, etiqueta FinTarget, ticker y pie.
- CODEX-FT1-RESULTADO.md: este resultado.

site.css, site.js y fuentes-validacion.js se conservaron byte por byte. No se editaron archivos de configuración, backups/, qa/, miracle-*, ejemplos/ ni otros Markdown. El registro automático referencias/codex-ft1.log se actualiza durante la sesión; no se editó como parte del trabajo.

## Identidad y honestidad de datos

Se aplicaron exactamente los tokens pedidos: carbón, papel, superficies grises, rampa de cinco grises y dorado con --accent-ink sobre superficies claras. Hanken Grotesk reemplaza Archivo, Source Serif 4 e IBM Plex Sans; IBM Plex Mono se conserva. Los títulos de .head usan peso 400 y tracking -0.02em. Los códigos de navegación y las líneas de contexto usan corchetes mediante pseudo-elementos; las tarjetas usan 10 px y los botones principales y segmentados, radio completo. El símbolo del logo no cambió. El regreso a HyperTarget usa .ht-back, sin estilos inline ni eventos de ratón inline.

La franja usa mono 11 px sobre --surface-2, tiene un botón × con nombre accesible y recuerda el cierre mediante localStorage; lectura y escritura están protegidas con try/catch. Su cierre no oculta las etiquetas locales de WACC, sus KPIs, CALC, macro, GA ni los avisos de los archivos exportados.

Las corridas, tarjetas de herramientas y salidas de modelos llevan «[ DATOS ILUSTRATIVOS ]». El informe DX distingue los insumos sectoriales y de mercado ilustrativos de los datos cargados; el archivo de la pyme conserva esa identificación también en FA, presentación y XLSX. Los estados financieros públicos mantienen su procedencia, controles y alertas de calidad. No se cambiaron cifras, fechas, fórmulas, fuentes ni alertas existentes para presentarlas como verificadas.

La marca interna de datos wacc.demo se renombró consistentemente a wacc.illustrative en su definición y sus referencias, con el mismo valor y condiciones. Es una propiedad de datos interna, no un ID, atributo data-* ni clase de JS. window.FinTargetMockup, los archivos, los IDs, los data-* y las clases originales utilizadas por JS permanecen.

El CSV sectorial ya tenía la cabecera «estado»; se conservó y sus valores «DEMO» pasan a «ilustrativo». Los demás campos y cifras se conservaron. El TXT mantiene el aviso completo pedido, incluida la prohibición de usar la tasa como definitiva sin validar los insumos.

## Verificación realizada sin navegador

- node --check aprobado para fintarget-analitica.js, fintarget-dx.js, fintarget-empresas.js, fuentes-validacion.js y site.js; también se extrajo y comprobó el script inline de FinTarget.
- Comparación contra copias previas guardadas exclusivamente en /private/tmp: 1.344 casos sectoriales (12 sectores, COP/USD, nominal/real, siete niveles D/E, beta total y prima de tamaño) dieron resultados idénticos.
- Tres empresas × cinco años × cuatro funciones (M, altz, ratingModel y pdModel): métricas idénticas.
- 18 escenarios DX (tres empresas, tres modos WACC y dos modos Kd): supuestos y resultados idénticos.
- 18 libros XLSX de 13 hojas: mismas hojas, fórmulas, valores numéricos, formatos numéricos y direcciones de celda. Los avisos se añadieron en textos existentes, sin desplazar filas de fórmulas.
- Se ejecutaron las siete rutas con un DOM simulado en Node. Se ejecutaron las exportaciones CSV y TXT: el CSV conserva las cifras de sus 12 sectores y el TXT contiene el aviso íntegro.
- Cierre de franja, restauración de un cierre guardado y almacenamiento bloqueado comprobados en Node.
- Comparación estructural: IDs originales y data-* del HTML conservados; ningún ID, data-* ni clase original de los JS fue renombrado o retirado. Solo se agregaron etiquetas y clases de la franja.
- La landing equivale exactamente al original más los cuatro reemplazos autorizados. Los archivos protegidos permanecieron intactos.
- Contraste de 20 pares reales de texto/superficie calculado con la fórmula WCAG: mínimo 4,52:1. Dorado claro reservado para fondos oscuros; dorado oscuro sobre superficies claras. El dorado oscuro sobre papel #DADADA da 4,27:1, por lo que los códigos dorados en las cabeceras tienen fondo --surface-2. Los grises claros de gráficos llevan contornos y leyendas con tinta oscura; los elementos transparentes de interacción no reciben contornos.

Se ejecutó una vez el detector de impeccable. Funcionó en modo degradado porque faltan sus módulos de análisis HTML/CSS; no calcula estilos ni contraste en ese modo. Señaló únicamente el borde semántico de error DX de 3 px, preexistente, que se conservó. No se instalaron dependencias.

Estas comprobaciones no sustituyen la revisión visual ni prueban interacción real de navegador, descargas nativas, carga de la fuente remota o impresión. Claude debe verificar las vistas, sus estados y el modo presentación después, tal como pide el encargo.

## Auditoría de palabras prohibidas

Se ejecutó el grep solicitado. Las únicas coincidencias finales son:

- Comentarios de código preexistentes.
- La clase .demo y sus referencias al aviso (sin esos términos en el texto visible).
- window.FinTargetMockup y sus referencias internas.
- Hrefs y nombres de archivos fintarget-mockup.html.
- El nombre intacto del archivo ejemplos/Taller-FCL-VISA.xlsx.

No quedan esas palabras en textos de producto. «Beta» permanece como término financiero (Hamada, regresión, β); «Prueba ácida» como indicador y «Prueba con otro nombre…» como instrucción de búsqueda. No se encontraron usos de «maqueta» ni «beta» como estado de producto. Los estados pendientes del registro de fuentes permanecen, porque expresan límites reales de conexión y verificación.

## Textos cambiados: antes → después

La tabla incluye textos visibles, metadatos, nombres de descarga y fragmentos dinámicos que producen texto. Los fragmentos con concatenaciones conservan las variables del código para identificar el reemplazo con precisión.

| Archivo | Antes | Después |
| --- | --- | --- |
| fintarget-mockup.html | LP | (retirado) |
| fintarget-mockup.html | Mockup V3 · WACC sectorial, macro y salidas de modelos con cifras de ejemplo. Los estados de Tecnoglass, Ecopetrol y Visa vienen de los talleres de Gerencia Financiera. | [ DATOS ILUSTRATIVOS · CORTE 30 SEP 2026 ]  Las tasas sectoriales y macro son ilustrativas mientras conectamos las fuentes oficiales. Los estados financieros de Tecnoglass, Ecopetrol y Visa son públicos.× |
| fintarget-mockup.html | Ejemplo | [ ILUSTRATIVO ] |
| fintarget-mockup.html | Exportación XLSX pendiente de implementación | XLSX · [ PRÓXIMAMENTE ] |
| fintarget-mockup.html | XLSX · pendiente | XLSX · [ PRÓXIMAMENTE ] |
| fintarget-mockup.html | Rango: D/E × 0,6–1,5 · demo | Rango: D/E × 0,6–1,5 · sensibilidad |
| fintarget-mockup.html | Rango sensibilidad demo | Rango de sensibilidad |
| fintarget-mockup.html | Borrador · revisión NIC 36 pendiente | Borrador · revisión NIC 36 [ PRÓXIMAMENTE ] |
| fintarget-mockup.html | Plan ProPrototipo · PDF pendiente | [ PRÓXIMAMENTE ]Memo en PDF |
| fintarget-mockup.html | Ejemplo de tasa después de impuestos · reconciliación NIC 36 pendiente | Datos ilustrativos · tasa después de impuestos · reconciliación NIC 36 [ PRÓXIMAMENTE ] |
| fintarget-mockup.html | Propuesta FinTarget v1.0 · revisión académica pendiente | Propuesta FinTarget v1.0 · metodología en revisión académica |
| fintarget-mockup.html | Series que alimentan el costo de capital · últimos 12 meses · cifras de ejemplo | Series que alimentan el costo de capital · últimos 12 meses · Datos ilustrativos |
| fintarget-mockup.html | Historial de versiones | Registro de versiones |
| fintarget-mockup.html | En este prototipo el rango es | Por ahora el rango es |
| fintarget-mockup.html | Planeada · 12 sectores de ejemplo; revisión académica pendiente. | Planeada · 12 sectores · Datos ilustrativos; metodología en revisión académica. |
| fintarget-mockup.html | Mockup V26 oct 2026 · Análisis vertical y horizontal con datos de talleres | Versión 0.2 · 6 oct 2026Análisis vertical y horizontal con estados financieros públicos |
| fintarget-mockup.html | Mockup V37 oct 2026 · Diagnóstico | Versión 0.3 · 7 oct 2026Diagnóstico |
| fintarget-mockup.html | Sensibilidad demo: | Sensibilidad: |
| fintarget-mockup.html | fintarget-sectores-DEMO.csv | fintarget-sectores-2026-09-30.csv |
| fintarget-mockup.html | ["DEMO",r.s.n | ["ilustrativo",r.s.n |
| fintarget-mockup.html | fintarget-memo-DEMO.txt | fintarget-memo-borrador.txt |
| fintarget-mockup.html | DEMOSTRACIÓN. Revisión académica pendiente. No usar como tasa validada. | BORRADOR · Datos ilustrativos con corte 30 sep 2026. Metodología en revisión académica. No usar como tasa de descuento definitiva sin validar los insumos. |
| fintarget-mockup.html | La tasa de ejemplo después de impuestos para la Empresa de ejemplo S.A.S. | Datos ilustrativos · La tasa después de impuestos para la Empresa de ejemplo S.A.S. |
| fintarget-mockup.html | Fuente: '+m[5]+' · ejemplo | Datos ilustrativos · Fuente de referencia: '+m[5] |
| fintarget-mockup.html | Ingresa los datos de la empresa y obtén la tasa con su memo de metodología. | Ingresa los datos de la empresa y obtén la tasa con su memo de metodología. Datos ilustrativos en los insumos sectoriales y de mercado. |
| fintarget-mockup.html | '+x[2]+' | '+x[2]+' · Datos ilustrativos |
| index.html | Conoce FinTarget, nuestro prototipo de costo de capital. | Conoce FinTarget, la referencia de costo de capital para Colombia. |
| index.html | [ CIFRAS DE EJEMPLO · CORTE 30 SEP 2026 ] | [ DATOS ILUSTRATIVOS · CORTE 30 SEP 2026 ] |
| index.html | PROTOTIPO · CIFRAS DE EJEMPLO | Datos ilustrativos |
| index.html | FinTarget es un prototipo; las cifras de las vistas son de ejemplo salvo donde se indica la fuente. | Las tasas marcadas como ilustrativas no constituyen una recomendación de tasa de descuento. |
| fintarget-empresas.js | Data - TGLS.xlsx · taller Gerencia Financiera · 29 ago 2026 | Data - TGLS.xlsx · estados financieros públicos · 29 ago 2026 |
| fintarget-empresas.js | Ecopetrol.xlsx · taller Gerencia Financiera · 22 ago 2026 | Ecopetrol.xlsx · estados financieros públicos · 22 ago 2026 |
| fintarget-empresas.js | WACC 12,0 % de ejemplo: no se calculó en los talleres | WACC 12,0 % · Datos ilustrativos; no calculado a partir de los estados financieros |
| fintarget-empresas.js | El taller usó un proxy con la variación de la depreciación acumulada. | El archivo de referencia usó un proxy con la variación de la depreciación acumulada. |
| fintarget-empresas.js | Investing.com Pro · Balance / PyG (taller VISA) | Investing.com Pro · Balance / PyG (Visa) |
| fintarget-empresas.js | Taller VISA · Gerencia Financiera · cifras finales del 3 sep 2026 | Visa · estados financieros públicos · cifras finales del 3 sep 2026 |
| fintarget-analitica.js | Taller TGLS · 28–29 ago 2026 | Archivo de referencia: Tecnoglass · 28–29 ago 2026 |
| fintarget-analitica.js | Parámetros de ejemplo de la portada | Datos ilustrativos · parámetros de la portada |
| fintarget-analitica.js | Taller VISA · 29 ago 2026 | Archivo de referencia: Visa · 29 ago 2026 |
| fintarget-analitica.js | Skill VerticalAnalysis · talleres VISA, TGLS y Ecopetrol | Skill VerticalAnalysis · estados financieros públicos de Visa, Tecnoglass y Ecopetrol |
| fintarget-analitica.js | Skill RatioAnalysis · taller VISA | Skill RatioAnalysis · Visa |
| fintarget-analitica.js | Taller VISA · WACC + EVA | Archivo de referencia: Visa · WACC + EVA |
| fintarget-analitica.js | Taller - Analisis Financiero VISA.xlsx | Archivo de ejemplo: Visa |
| fintarget-analitica.js | ✓ Coincide con el taller VISA: EVA 2025 = 18.728 USD mm (prueba de referencia) | ✓ Coincide con el archivo de referencia de Visa: EVA 2025 = 18.728 USD mm (control de referencia) |
| fintarget-analitica.js | VISA · 3 sep 2026 · Taller VISA (WACC + EVA).xlsx | Visa · 3 sep 2026 · archivo de referencia WACC + EVA |
| fintarget-analitica.js | Última corrida real | Corrida de referencia · Datos ilustrativos |
| fintarget-analitica.js | c.wacc.demo?"ejemplo":"talleres" | c.wacc.demo?"Datos ilustrativos":esc(c.wacc.note) |
| fintarget-analitica.js | escenarios · rojo: peor 5% · azul oscuro: mejor 5% | escenarios · rojo: peor 5% · carbón: mejor 5% |
| fintarget-analitica.js | Correlación de cada supuesto con el valor simulado · azul sube el valor, rojo lo baja | Correlación de cada supuesto con el valor · Datos ilustrativos · carbón sube el valor, rojo lo baja |
| fintarget-analitica.js | '+esc(title)+'<button | '+esc(title)+'[ DATOS ILUSTRATIVOS ]<button |
| fintarget-analitica.js | '+(["vista","calc","modelo"] | [ DATOS ILUSTRATIVOS ]'+(["vista","calc","modelo"] |
| fintarget-analitica.js | '+n.modelo+' modelos FinTarget | '+n.modelo+' modelos FinTarget[ DATOS ILUSTRATIVOS ] |
| fintarget-analitica.js | Fuente: '+esc(c.src.name)+' | Fuente: '+esc(c.src.name)+(c.wacc&&c.wacc.demo?' · Datos ilustrativos en WACC':'')+' |
| fintarget-dx.js | O prueba con un archivo real | O carga un archivo de ejemplo |
| fintarget-dx.js | Taller FCL y Apalancamiento · VISA | Archivo de ejemplo: Visa |
| fintarget-dx.js | Tu archivo del taller, formato Investing.com, USD millones | Estados financieros públicos, formato Investing.com, USD millones |
| fintarget-dx.js | Confecciones del Caribe S.A.S. | Archivo de ejemplo: pyme de confecciones |
| fintarget-dx.js | PYME colombiana de ejemplo, formato Supersociedades, COP miles | Confecciones del Caribe S.A.S. · Datos ilustrativos, formato Supersociedades, COP miles |
| fintarget-dx.js | label:"Taller FCL y Apalancamiento VISA" | label:"archivo de referencia de Visa: FCL y apalancamiento" |
| fintarget-dx.js | st.err=e.message+" Abre el mockup desde el servidor local para cargar los ejemplos." | st.err="No pudimos cargar el archivo de ejemplo. Intenta de nuevo o sube tu propio Excel." |
| fintarget-dx.js | · taller | · referencia |
| fintarget-dx.js | tile("Rating modelo FinTarget",R.rm.r,"escalón "+nf(R.rm.n,1),1) | tile("Rating modelo FinTarget",R.rm.r,"Datos ilustrativos · escalón "+nf(R.rm.n,1),1) |
| fintarget-dx.js | tile("Prob. de incumplimiento 1 año",P1(R.pd.pd,2),"modelo FinTarget") | tile("Prob. de incumplimiento 1 año",P1(R.pd.pd,2),"modelo FinTarget · Datos ilustrativos") |
| fintarget-analitica.js | de las simulaciones | de los escenarios |
| fintarget-dx.js | origin:"Cargado por el usuario · "+p.fname | origin:"Cargado por el usuario · "+p.fname+(st.preset===PRESETS.pyme?" · Datos ilustrativos":"") |
| fintarget-dx.js | "WACC calculado en DX" | "WACC calculado en DX · Datos ilustrativos en los insumos sectoriales y de mercado" |
| fintarget-dx.js | "% calculado en DX" | "% calculado en DX · Datos ilustrativos en los insumos sectoriales y de mercado" |
| fintarget-dx.js | '+esc(c.activity)+' · '+c.years[0]+'–'+yL+' · '+esc(st.fname)+' | '+esc(c.activity)+' · '+c.years[0]+'–'+yL+' · '+esc(st.fname)+'Datos ilustrativos en los insumos sectoriales y de mercado'+(st.preset===PRESETS.pyme?' y en los estados financieros de este archivo de ejemplo':'')+'. |
| fintarget-dx.js | "Material analítico. No constituye asesoría de inversión." | "Material analítico. Datos ilustrativos en los insumos sectoriales y de mercado y en las salidas de modelos FinTarget. No constituye asesoría de inversión."+(st.preset===PRESETS.pyme?" Datos ilustrativos en los estados financieros del archivo de ejemplo.":"") |
| fintarget-dx.js | RK.push(["Rating estimado modelo FinTarget",R.rm.r]) | RK.push(["Rating estimado modelo FinTarget · Datos ilustrativos",R.rm.r]) |
| fintarget-dx.js | RK.push(["Probabilidad de incumplimiento a 1 año",{v:R.pd.pd,z:PC2}]) | RK.push(["Probabilidad de incumplimiento a 1 año · Datos ilustrativos",{v:R.pd.pd,z:PC2}]) |
| fintarget-analitica.js | Fuente: '+esc(c.src.name)+(c.wacc&&c.wacc.illustrative?' · Datos ilustrativos en WACC':'')+' | Fuente: '+esc(c.src.name)+(c.wacc&&c.wacc.illustrative?' · Datos ilustrativos en WACC':'')+(c.tk==="MI"?' · '+esc(c.origin)+' · '+esc(c.wacc.note):'')+' |


## Etiquetas y textos añadidos

- Franja: botón «×», nombre accesible «Cerrar aviso de datos ilustrativos».
- Cabecera de cada herramienta GA y de cada corrida: «[ DATOS ILUSTRATIVOS ]»; resumen GA: la misma etiqueta.
- KPIs sectoriales: cada descripción conserva su texto y añade «· Datos ilustrativos».
- Presentaciones de Ecopetrol: «Datos ilustrativos en WACC» en el pie, junto a su fuente pública.
- Presentaciones de una empresa importada: procedencia del archivo y nota del WACC en el pie. Para la pyme de ejemplo, la procedencia añade «Datos ilustrativos».
- Informe DX: «Datos ilustrativos en los insumos sectoriales y de mercado»; para la pyme añade «y en los estados financieros de este archivo de ejemplo».
- Portada XLSX: «Material analítico. Datos ilustrativos en los insumos sectoriales y de mercado y en las salidas de modelos FinTarget. No constituye asesoría de inversión.» Para la pyme añade «Datos ilustrativos en los estados financieros del archivo de ejemplo.»

Los corchetes de navegación se generan con CSS; los textos y códigos originales de las vistas se mantienen. El aviso [ ILUSTRATIVO ] de WACC es la excepción literal solicitada a la fórmula «Datos ilustrativos».
