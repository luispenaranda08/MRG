# Mirage · checkpoint de conceptos · Fase 6

[Ver lámina de los cinco conceptos y la H de referencia](logos/mirage/concepts.svg) · [Abrir pruebas y comparación con H/FT](logos/mirage/preview.html)

## Brief y supuestos

Mirage es la referencia abierta del costo de capital en Colombia: cifras con método público y origen trazable para analistas, contadores, valoradores, peritos, estudiantes y pymes. El símbolo debe transmitir precisión, sobriedad, confianza, apertura y carácter técnico. La promesa que guía el centro de la M es **separar el dato verificable de su apariencia**.

Modo Design, vía rápida, sin preguntas. Se entregan cinco conceptos e iteraciones hasta el checkpoint; no se construye el kit ni se despliega. Supongo uso prioritario en interfaz, informes y tamaños pequeños; el dueño decide la dirección. La presentación no incluye un wordmark: se diseñan iniciales con geometría propia, sin fuentes.

**Diferencia real entre referencias:** `ht-h.svg` coloca los cuadros en x=40/56 y patas de 40; `ref-ft.svg` los coloca en x=24/40 y usa patas de 36. No es posible conservar ambas posiciones literalmente. Se adopta el patrón exacto de **FT**, también usado por `mi-m-h.svg`: nueve cuadrados de 16, alternancia x=24/40, y=56…184. La letra ocupa x=56…232 y y=56…200. La H se incluye intacta para comparar parentesco, no para imponer una igualdad de peso inexistente entre los originales. No se movió ni modificó ninguna referencia.

Negro #111, pruebas invertidas blancas para carbón #1F2124, lienzo 256. Cuadros solo a la izquierda; remates radio 8. Los arcos del concepto 2 son la geometría específica de su centro. No hay gradientes, efectos ni diagonales centrales en V.

## Investigación y estrategia

Se leyó SKILL.md y las cinco referencias solicitadas: discovery-brief, mark-types, visual-techniques, svg-construction y testing-checklist. Se usaron los scripts por sus rutas completas.

`search_library.py --industry payments-fintech --summary` devuelve 37 ejemplos: azul es el color primario de 11; espacio negativo y contención aparecen en 9 cada uno. Es una muestra de la biblioteca, no un estudio completo del mercado colombiano. Se evitan flechas ascendentes, escudos, monedas, gráficas de barras y el azul genérico como supuestos clichés de categoría; la herencia ajedrezada ya aporta identidad.

Las búsquedas `--subject 'letter m'`, `--query 'letter-m'` y `--query mirror` no dieron coincidencias; esto no demuestra originalidad. Se estudiaron los SVG de Vercel, Patreon, Framer, Pagekit y Kotlin para aprender reducción, figuras geométricas y vacíos; no se copiaron sus contornos. Framer, Patreon y Pagekit se incluyeron como pares de oficio en la hoja de pruebas. No se hizo búsqueda registral ni de imágenes inversa.

Mapa verbal: espejismo → horizonte/reflejo/franjas; precisión → módulo/escalón/dato; trazabilidad → continuidad/origen/contraste; abierto → hueco/canal; confianza → patas firmes/ritmo/una tinta. Las intersecciones elegidas son reflejo medido, recorrido verificable y dato distinguible. Se consideraron letterform y símbolo abstracto con doble lectura; la M y la familia obligatorias descartan una exploración libre de wordmarks o pictogramas.

## 1 — Escalón verificable · letterform · recomendado

**Idea:** una M cuyo centro baja y sube mediante un escalón, como un recorrido que se puede reconstruir.

**Por qué encaja:**

- El centro ortogonal expresa método y precisión sin recurrir a flechas financieras.
- Patas de 36 y radio 8 mantienen el lenguaje de FT.
- Una silueta continua permite reducir sin añadir un detalle narrativo frágil.

**Riesgo:** su centro puede leerse como una U colgada entre patas; la prueba de lectura espontánea de M sigue siendo decisiva.

[SVG](logos/mirage/concept-1.svg) · [v1](logos/mirage/concept-1-v1.svg) · [v2](logos/mirage/concept-1-v2.svg)

## 2 — Doble arco · letterform de caja baja

**Idea:** dos arcos hacen una m geométrica y convierten el centro en una repetición estable, sin vértice diagonal.

**Por qué encaja:**

- La repetición aporta calma y confianza.
- Dos huecos abiertos expresan acceso y claridad.
- Los apoyos exteriores conservan el peso de FT; los arcos ofrecen la alternativa más distinta del grupo.

**Riesgo:** se lee deliberadamente como m minúscula y puede recordar dos portales; si se exige M mayúscula literal, debe descartarse.

[SVG](logos/mirage/concept-2.svg) · [v1](logos/mirage/concept-2-v1.svg) · [v2](logos/mirage/concept-2-v2.svg)

## 3 — Líneas de calor · letterform fragmentada / lectura abstracta

**Idea:** tres niveles horizontales construyen la envolvente de una M como una imagen ordenada entre líneas de calor.

**Por qué encaja:**

- Las franjas conectan con el nombre sin efectos ópticos ni degradados.
- La organización modular comunica un producto técnico.
- La alternancia de masa y vacío prolonga el ritmo del ajedrezado izquierdo.

**Riesgo:** la barra central puede dominar y sugerir H; es la propuesta más experimental para lectura inmediata de M.

[SVG](logos/mirage/concept-3.svg) · [v1](logos/mirage/concept-3-v1.svg) · [v2](logos/mirage/concept-3-v2.svg)

## 4 — Dato contrastado · letterform con espacio negativo

**Idea:** un único dato cuadrado queda aislado en el centro de la M, separando la cifra verificable de la masa que la rodea.

**Por qué encaja:**

- El vacío deriva del mismo cuadrado de la familia visual.
- La doble lectura vincula precisión y trazabilidad.
- El hueco es real y funciona al invertir el símbolo.

**Riesgo:** la masa central es más pesada y el dato de 1.5 px a tamaño 16 puede cerrarse por rasterización; no depende del relato para justificar ese riesgo.

[SVG](logos/mirage/concept-4.svg) · [v1](logos/mirage/concept-4-v1.svg) · [v2](logos/mirage/concept-4-v2.svg)

## 5 — Reflejo medido · letterform con lectura abstracta de reflejo

**Idea:** el centro de la M reaparece debajo en dos franjas cada vez más cortas, como un reflejo que pierde presencia.

**Por qué encaja:**

- Es la relación más directa con el significado de Mirage.
- La pérdida de presencia se consigue con longitud y una sola tinta.
- La M principal conserva sus patas y su centro de escalón, mientras el eco aporta una firma propia.

**Riesgo:** los ecos pueden convertir el interior en una escalera o una E; añade complejidad y su lectura a 16 px necesita inspección raster.

[SVG](logos/mirage/concept-5.svg) · [v1](logos/mirage/concept-5-v1.svg) · [v2](logos/mirage/concept-5-v2.svg)

**Recomendación:** avanzar con **Escalón verificable** por su continuidad, peso y centro sin V. **Reflejo medido** es la alternativa si prima la relación con el nombre; **Doble arco** permite comparar una solución con lenguaje radicalmente distinto. Es una recomendación basada en concepto y geometría, pendiente de lectura visual.

**Checkpoint:** elegir una dirección o combinar preferencias es el siguiente paso. La Fase 7 queda fuera del encargo; no se prepararon lockups, favicon, app icons, paleta extendida ni kit.

## Longlist y selección

Puntajes de diseño, escala 1–5; estimaciones previas a la construcción, no resultados de tests con usuarios. C=claridad, D=distinción, S=simplicidad, P=pertinencia, T=fuerza pequeña.

| Dirección e idea en una frase | Tipo | C | D | S | P | T | Total | Decisión |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Escalón verificable: el centro baja y sube en un único recorrido ortogonal. | Letterform | 5 | 4 | 5 | 5 | 5 | 24 | Concepto 1 |
| Doble arco: dos arcos convierten la m en una repetición abierta y estable. | Letterform | 4 | 5 | 4 | 4 | 5 | 22 | Concepto 2 |
| Líneas de calor: franjas horizontales dejan emerger una M escalonada. | Letterform/abstracto | 3 | 5 | 4 | 5 | 3 | 20 | Concepto 3 |
| Dato contrastado: un cuadrado negativo distingue el dato dentro de la M. | Espacio negativo | 4 | 5 | 4 | 5 | 3 | 21 | Concepto 4 |
| Reflejo medido: el centro de la M genera dos ecos que se acortan. | Letterform/abstracto | 4 | 5 | 4 | 5 | 5 | 23 | Concepto 5; T se revisa al construir |
| Horizonte partido: una interrupción horizontal separa la M de su imagen inferior. | Letterform/abstracto | 3 | 4 | 4 | 5 | 3 | 19 | Menos distinta de franjas/reflejo |
| Doble registro: dos centros ortogonales desplazados sugieren comparar original y copia. | Abstracto con M | 3 | 4 | 3 | 5 | 3 | 18 | Riesgo de uniones confusas |
| Canal de origen: un hueco central vertical enlaza los dos hombros de la M con su base. | Espacio negativo | 3 | 4 | 4 | 4 | 3 | 18 | Puede convertirse en H |
| Cifra implícita: los vacíos centrales sugieren un 1 entre dos patas. | Letterform/negativo | 3 | 4 | 3 | 5 | 3 | 18 | Segunda lectura demasiado frágil |
| Horizonte sostenido: un centro plano flotante alinea ambas patas sobre una referencia común. | Abstracto con M | 3 | 3 | 5 | 4 | 4 | 19 | Menor reconocimiento de M |

Se construyeron solo las cinco de mayor puntuación. Tras concretar la geometría, T de Reflejo medido se estima en 3, no 5: los ecos son más frágiles de lo previsto; Escalón sigue primero. Se conserva el puntaje inicial para hacer visible la revisión, sin presentar el ranking como evidencia empírica.

## Construcción e iteraciones

[Construcción descrita antes de generar los SVG](logos/mirage/CONSTRUCCION.md) · [Generador reproducible](logos/mirage/build_concepts.py).

| Concepto | Refinamiento de v1 a v2 | Comprobación geométrica a 16 px |
|---|---|---|
| 1 | Hueco superior 32→48; cinta 40→32. | Hueco 3 px; cinta 2 px; patas 2.25 px. |
| 2 | Patas exteriores 40→36; huecos 32→36. | Patas 2.25 px; huecos 2.25 px; apoyo central 2 px. |
| 3 | Cortes entre franjas 8→16. | Cortes 1 px; barra 2 px; radios 0.5 px. |
| 4 | Dato negativo 12→24. | Dato 1.5 px; paredes arriba/abajo 1 px. |
| 5 | Primer hueco de eco 8→24; segundo 8→16. | Ecos 1 px de alto; separación 1.5/1 px. |

Se mantuvieron los remates de radio 8 y y=56…200; no se hizo overshoot fuera de la caja obligatoria. Los perfiles del escalón se dibujan con un contorno continuo, sin piezas superpuestas ni juntas diagonales. El dato se sustrae con `evenodd` y los cuadros usan un path independiente para que no se anulen al tocar el cuerpo. Cada final coincide exactamente con su v2.

La versión blanca conserva la geometría en esta fase para comparar inversión; el ajuste óptico de irradiación de una dirección aprobada queda pendiente. Ninguna puntuación estructural certifica lectura, equilibrio óptico, originalidad o aprobación.

## Auditorías y pruebas

Se ejecutó `svg_audit.py` en **dos vueltas**, sobre cinco v1 y cinco v2; después sobre los cinco finales y las cinco inversiones.

| Concepto | v1 | v2/final | Invertido sobre carbón | Hallazgos |
|---|---:|---:|---:|---|
| 1 | 100/100 | 100/100 | 100/100 | Sin avisos. |
| 2 | 100/100 | 100/100 | 100/100 | Sin avisos. |
| 3 | 100/100 | 100/100 | 100/100 | Sin avisos. |
| 4 | 100/100 | 100/100 | 100/100 | Sin avisos. |
| 5 | 99/100 | 99/100 | 99/100 | INFO complejidad: 96 puntos; mediana de biblioteca 53, p75 95.5. |

No hubo WARN ni FAIL. Los puntos del concepto 5 corresponden al escalón, nueve cuadrados y dos rectángulos redondeados de eco; se conserva esa complejidad porque es la idea de esta variante.

Registros completos: [v1](logos/mirage/audit-v1.txt), [v2](logos/mirage/audit-v2.txt), [final JSON](logos/mirage/audit-final.json), [inversiones](logos/mirage/audit-reversed.txt), [invariantes de geometría](logos/mirage/geometry-check.txt), [investigación](logos/mirage/research-library.txt).

**Verificado automáticamente:** 20 SVG, lienzo 256, ajedrezado idéntico a FT, una tinta, únicamente paths de dibujo, sin texto vivo/raster/filtros/máscaras; finales idénticos a v2. Revisión por coordenadas de continuidad de contornos, paredes del dato y separación de ecos.

**Preparado para inspección visual:** hoja HTML con escalas, inversión, espejo, rotación, desenfoque de prueba, contextos de uso y comparación con H/FT y tres pares de biblioteca. Esos tratamientos pertenecen a la hoja de test, no a los logos. No se da por ejecutada una prueba perceptual por generar una hoja. La interpretación inicial de M, las uniones rasterizadas, el equilibrio óptico con H/FT y la semejanza visual con los pares necesitan revisar los renders; tampoco hubo participantes externos para lectura espontánea.

**Render y límite del entorno:** se ejecutó `concept_sheet.py --greyscale` con los cinco finales y la H intacta. Produjo `logos/mirage/concepts.svg`; no produjo `concepts.png`. El log informa `PNG skipped (no renderer; see render_png.py --which)`. El inventario inicial ofrecía Chrome y Quick Look, pero el intento del script no obtuvo un render usable en este entorno. No se reintentó ni se pidió elevar permisos. No se pudo abrir una imagen raster ni confirmar visualmente el test de letra o píxeles; Claude debe renderizar y revisar después, tal como permite el encargo. La lámina SVG contiene texto de presentación; los veinte símbolos no contienen `<text>`.

Para revisar sin herramientas de exportación: abrir [concepts.html](logos/mirage/concepts.html), que muestra la lámina generada y las cinco pruebas blancas sobre #1F2124; después abrir preview.html para tamaños pequeños y pares. La lectura de M es especialmente pendiente en Doble arco y Líneas de calor.

**Alcance cumplido de archivos:** toda escritura propia está dentro de `logos/mirage/` y de este resultado. Las referencias originales se conservaron. No se modificó web, app ni configuración; no hubo despliegue ni Fase 7.
