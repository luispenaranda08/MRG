# Tarea para Codex · Landing V2: menos presentación, más sitio web

Editas `index.html`, `site.css` y `site.js`. Las reglas duras de `CODEX-LANDING.md` siguen vigentes: no toques FinTarget, ni la configuración, ni Miracle, ni los `.md` (salvo el resumen final), y no despliegues nada.

## Diagnóstico del dueño

"Me encanta el diseño, pero parece una presentación." Se conservan la paleta (carbón, papel y dorado), las tipografías y el tono del texto. Cambia la **composición**: hoy cada sección es una diapositiva (píldora + titular + una caja grande centrada). Hay que llevarla al lenguaje de un sitio web editorial y técnico, en la línea de xAI/Grok company y products en Mobbin: etiquetas mono entre corchetes, líneas finas de 1 px como estructura, contenido que respira a ras del fondo y pocas cajas.

## 1. Corchetes como recurso de atención

Crea un componente `.bracket`: texto en IBM Plex Mono, 12 px, mayúsculas, `letter-spacing: .08em`, con los corchetes `[` y `]` añadidos por CSS (`::before` / `::after`) en `--light-soft` o `--ink-soft`, separados del texto por un espacio fino. Úsalo **solo** en estos lugares:

- **Etiquetas de sección**: reemplaza TODAS las píldoras de dos segmentos (`.section-tag`) por `[ 01 · PRODUCTOS ]`, `[ 02 · PROBLEMA ]`, `[ 03 · MÉTODO ]`, `[ 04 · VALIDACIÓN ]`, `[ 05 · PLANES ]` y `[ 06 · CONTACTO ]`. Van alineadas a la izquierda, encima del titular, sin fondo.
- **Hero**: la palabra clave del titular entre corchetes grandes en dorado: `Cifras que resisten [una auditoría].` Los corchetes van en `--accent` y peso 300, y el texto interior sigue en `--light`. Es el único corchete grande de la página.
- **Estado de producto**: `[ EN LÍNEA ]` en la tarjeta de FinTarget, con un punto dorado de 6 px que pulsa suavemente (desactivado con `prefers-reduced-motion`), y `[ PRÓXIMAMENTE ]` en la otra tarjeta.
- **CTA secundario**: "Cómo calculamos" se convierte en `[ CÓMO CALCULAMOS ]` en mono, sin subrayado. Con hover, los corchetes se separan 4 px (transición de 200 ms).
- **El nodo "Resultado"** del método y **la cifra 47,5 %** de validación llevan su etiqueta entre corchetes.

En ningún otro lugar. Si dudas, sin corchetes.

## 2. Eliminar todo marcador `[por confirmar]`

- Tarjeta Próximamente: quita el `<p>[por confirmar]</p>`. Debe quedar `[ PRÓXIMAMENTE ]` + "Acceso institucional" + una línea: "Licencias para entidades y equipos. Escríbenos para conocer el piloto." Enlaza esa línea a `#contacto`.
- Contacto: elimina el `mailto:` vacío y el texto `[correo por confirmar]`. Deja en su lugar un elemento `<a class="contact-email" href="#" data-email hidden>` vacío (el dueño pondrá el correo después) y, visible, el botón principal "Entrar a FinTarget →" a `fintarget-mockup.html`.
- Pie: "© 2026 HyperTarget · Colombia" (sin Barranquilla ni `[por confirmar]`).
- Al terminar, `grep -n "por confirmar" index.html` debe devolver cero resultados.

## 3. Hero: de portada de diapositiva a primera pantalla de sitio

- Quita la banda 1 (la "HT" gigante y "© 2026 HyperTarget") y los cuatro círculos. Son motivos de portada de presentación.
- El hero pasa a ser una sección carbón a sangre completa, sin márgenes laterales ni radio (`border-radius: 0`) y de altura mínima `min(88vh, 820px)`. El contenido se alinea con el container.
- Arriba a la izquierda va `[ HYPERTARGET · 2026 ]` como `.bracket`.
- Titular grande con el corchete dorado (ver §1). Debajo, la bajada actual y los dos CTA en línea.
- Abajo del hero, separada por una línea de 1 px `--line-dark`, va una **franja de datos** en mono, a modo de ticker estático: `WACC MEDIANO COP 10,9 %` · `RF EE. UU. 10A 4,2 %` · `PRIMA PAÍS 3,0 %` · `ERP 4,3 %` · `INFLACIÓN ESPERADA 3,6 %`. Al final, en `--light-soft`: `[ CIFRAS DE EJEMPLO · CORTE 30 SEP 2026 ]`. En móvil se desplaza horizontalmente dentro de su contenedor (`overflow-x:auto`, sin provocar scroll de la página). Esos valores son los del prototipo de FinTarget: no los cambies.

## 4. Método: el bloque que más parece diapositiva

Elimina el panel carbón con ocho cajas iguales y la tarjeta gris de fórmulas. Sustitúyelo por una composición de dos columnas, a ras del fondo papel:

- **Izquierda (5/12)**: `[ 03 · MÉTODO ]`, el titular "Cómo se construye una cifra." y un párrafo corto: "Cada número de FinTarget guarda la cadena que lo produjo: de qué empresa sale, qué estado financiero, qué pares y qué supuestos. Si un auditor pregunta, la respuesta está a un clic."
- **Derecha (7/12)**: un **trazo de linaje vertical**. Una línea de 1 px `--line-light` con 8 nodos (círculos de 9 px con borde de 1 px). Cada nodo lleva el nombre en sans 18 px y, a su derecha, una nota en mono 12 px `--ink-soft`:
  - Empresa: `NIT · CIIU Rev. 4`
  - Estado financiero: `Supersociedades · NIIF`
  - Sector: `Mapeo CIIU ↔ Damodaran`
  - Pares: `Comparables LatAm`
  - Supuesto: `Rf · ERP · CRP · t`
  - Modelo: `βL = βu × [1 + (1 − t) × D/E]`
  - Resultado: `Ke = Rf + βL × ERP + λ × CRP` y `WACC = E/V × Ke + D/V × Kd × (1 − t)`. Este nodo va relleno en dorado y con el nombre como `[ RESULTADO ]`.
  - Memo: `PDF para el auditor`
- Las fórmulas quedan integradas en el trazo; no hay caja aparte.
- Al entrar en viewport, la línea se "dibuja" de arriba abajo (`scaleY` de 0 a 1 en 900 ms) y los nodos aparecen en secuencia. Sin animación con `prefers-reduced-motion`.
- En móvil, una columna: el texto arriba y el trazo abajo.

## 5. Validación: de tarjetas a fila de cifras

Quita la rejilla de tarjetas grises con fondo. Usa una fila de 5 columnas separadas por líneas verticales de 1 px `--line-light`, con una línea horizontal arriba y otra abajo y sin fondo. En cada columna: la cifra grande en sans 300 (`clamp(40px,5vw,72px)`), debajo el nombre en sans 15 px y el contexto en mono 12 px. El 47,5 % va en dorado y su etiqueta es `[ ROIC DE VISA ]`. En tablet usa 3 + 2 columnas; en móvil, 1 columna con las líneas horizontales entre cifras. Conserva la nota al pie.

## 6. Ritmo general de página

- Los paneles carbón con radio grande que sangran a la derecha se reducen a **uno solo**: la tarjeta FinTarget de Productos (puede conservar su radio de 28 px). El Problema pasa a ser una sección carbón a sangre completa, sin radio, igual que el hero. Contacto también, unida visualmente al pie.
- Alterna fondos así: hero carbón → productos papel → problema carbón → método papel → validación papel → planes papel → contacto carbón.
- Entre secciones de papel, usa una línea de 1 px a todo el ancho del container en lugar de grandes espacios vacíos. Padding vertical de sección: `clamp(72px, 10vw, 128px)`.
- La barra de navegación: los enlaces en mono 12 px en mayúsculas (`PRODUCTOS`, `MÉTODO`, `PLANES`, `CONTACTO`). El botón "Entrar a FinTarget →" se mantiene igual.
- Planes: conserva las 4 columnas con línea superior, pero la etiqueta "Hipótesis por validar" pasa a `[ HIPÓTESIS POR VALIDAR ]` en `.bracket` (cuenta como la etiqueta de la sección; no añadas otra).

## 7. Verificación

- `node --check site.js`.
- `grep -c "por confirmar" index.html` debe dar 0.
- `grep -c "section-tag" index.html site.css` debe dar 0 (sin restos de píldoras).
- Revisa que no quede CSS muerto de los bloques eliminados (`.method-panel`, `.method-chain`, `.formula-card`, `.metric` con fondo, círculos del hero).
- Actualiza `CODEX-LANDING-RESULTADO.md` con una sección "V2" con los cambios. La verificación en navegador la hace Claude después, así que no pierdas tiempo intentando abrir Chrome o servidores.
