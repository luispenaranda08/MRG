# Tarea para Codex · Landing de HyperTarget (fase 1)

Lee primero `CODEX-BRIEF.md` (contexto general), `FinTarget-contexto.md` §1, §2, §7 y `MAPA-Y-EVOLUCION.md` (adendas V2 y V3). Las imágenes de `referencias/palantir/` muestran el lenguaje visual que hay que adaptar. En esta tarea **solo construyes la landing** (`index.html`). La presentación `/presentacion` es una tarea posterior: no la crees todavía.

## Reglas duras

1. Crea solo estos archivos: `index.html`, `site.css`, `site.js` (si de verdad hace falta) y `favicon.svg`.
2. En `fintarget-mockup.html` haz un único cambio: dentro de la barra superior `.top`, antes del logo, añade un enlace `<a class="ht-back" href="index.html">← HyperTarget</a>` con estilo discreto (11–12 px, color `var(--top-ink)`, hover blanco). No cambies nada más de FinTarget.
3. No toques `vercel.json`, `.vercelignore`, `.gitignore`, `.env*`, `.vercel/`, `backups/`, `qa/`, `miracle-*` ni los `.md`. No despliegues nada. No instales paquetes.
4. HTML/CSS/JS estático, sin build ni frameworks. Fuentes de Google Fonts. Si usas alguna librería, que venga de cdnjs con versión fija (en principio no hace falta ninguna).
5. Todo el texto en español de Colombia, en tono sobrio y concreto. Nada de "revolucionario", "potencia", "de vanguardia" ni "transforma". No inventes cifras, clientes ni alianzas. Si falta un dato, escribe `[por confirmar]` visible.
6. No uses el nombre, el logo, las fotos ni los textos de Palantir. Se toma el sistema visual, no el contenido.
7. Miracle no se muestra. Como mucho, una tarjeta "Próximamente · acceso institucional" sin nombre de producto, sin enlace y sin descripción de defensa.

## Mensaje

- Titular principal (hero): **"Cifras que resisten una auditoría."**
- Bajada: "HyperTarget construye referencias financieras para Colombia con fuentes públicas, método versionado y cada número trazable hasta su origen. Empezamos por el costo de capital."
- Si el titular se rompe mal en móvil, puedes usar una de estas alternativas, en este orden: "Cada cifra, con su origen." · "El número correcto, y por qué."
- CTA primario: **"Entrar a FinTarget →"**, que enlaza a `fintarget-mockup.html`. Es el botón más visible de la página y también aparece fijo en la barra de navegación.
- CTA secundario: "Cómo calculamos", ancla a la sección de método.

## Sistema visual (tokens en `:root` de `site.css`)

```
--carbon:#1F2124; --carbon-2:#2A2C30; --paper:#DADADA; --paper-2:#C9C9C9;
--ink:#1F2124; --ink-soft:#4A4D52; --light:#E6E6E6; --light-soft:#9EA2A8;
--line-dark:rgba(230,230,230,.28); --line-light:rgba(31,33,36,.18);
--accent:#C8A24A;   /* dorado de FinTarget, más vivo; solo en UNA cifra o detalle por sección */
--radius-xl:28px; --radius-md:14px;
--f-sans:"Hanken Grotesk",system-ui,sans-serif;   /* 300/400/500 */
--f-mono:"IBM Plex Mono",ui-monospace,monospace;  /* 400/500 */
```
- Titulares con peso 300–400, `letter-spacing:-0.03em`, `line-height:1.0–1.05`. Hero entre `clamp(44px,7vw,112px)`.
- Cifras, años y códigos en mono con `font-variant-numeric: tabular-nums`.
- Líneas de 1 px como estructura, sin sombras, sin degradados de colores, sin glassmorphism.
- Fondo de la página `--paper`. Los bloques carbón son paneles con `--radius-xl` que sangran hasta el borde derecho del viewport (en escritorio el margen izquierdo es de 64 px y el derecho es 0). Ver `slide-16` y `slide-19`.
- Etiqueta de sección tipo píldora de dos segmentos, arriba a la izquierda de cada sección: `[ HT | Productos ]`, fondo carbón, texto 13 px claro, un separador de 1 px. Sobre fondo carbón se invierte (fondo claro). Ver `slide-4`.
- Modo oscuro: no hace falta, la página ya es bicolor. Define `color-scheme: light` y un `background` explícito en `body`.

## Estructura, de arriba abajo

### 0. Barra de navegación (sticky, 56 px, fondo `--carbon`)
Logo H (`logos/concepts/ht-h.svg`, inline y en color claro) + "HyperTarget" en mono 14 px. A la derecha van los enlaces Productos · Método · Planes · Contacto (anclas) y el botón **Entrar a FinTarget →** (fondo `--light`, texto `--carbon`, radio completo). En móvil quedan el logo y el botón, y los enlaces se esconden.

### 1. Hero tipo portada en bandas (replica la composición de `slide-1`)
Un panel carbón grande con radio xl, dividido en 4 bandas horizontales con líneas de 1 px `--line-dark`:
- Banda 1: a la izquierda "HT" en sans 300 enorme; a la derecha "© 2026 HyperTarget" en 12 px.
- Banda 2: a la izquierda el logo H y "HyperTarget"; a la derecha **"2026"** en mono grande.
- Banda 3: el titular "Cifras que resisten una auditoría." y debajo la bajada (máximo 60 ch, `--light-soft`).
- Banda 4: a la izquierda los dos CTA; a la derecha cuatro círculos de 1 px de contorno, el último relleno `--light`. Con hover sobre los CTA, el círculo relleno se desplaza (transición de 300 ms). Respeta `prefers-reduced-motion`.
En móvil las bandas se apilan y los círculos bajan de tamaño (40 px).

### 2. Productos (fondo papel)
Píldora `[ HT | Productos ]`. Titular: "Un producto en línea. Otros en camino."
Grid de 2 columnas:
- **FinTarget** (tarjeta carbón grande, ocupa 2/3): símbolo `logos/fintarget-symbol-black.svg` invertido; nombre; la línea "El costo de capital de Colombia: WACC por sector, betas locales y prima país, con metodología pública y defendible ante auditores y peritos."; lista corta con `→` de lo que ya hace el prototipo: Costo de capital por sector (COP/USD, nominal/real) · Calculadora para empresa no cotizada · Análisis vertical y horizontal · Tu empresa: sube tu balance y obtén WACC, DCF y EVA. Enlace "Entrar →" a `fintarget-mockup.html`. Etiqueta pequeña en mono: "PROTOTIPO · CIFRAS DE EJEMPLO".
- **Próximamente** (tarjeta con borde de 1 px, 1/3): "Acceso institucional" y "[por confirmar]". Sin enlace.
En móvil queda en una columna.

### 3. Por qué el costo de capital es difícil en Colombia (panel carbón que sangra a la derecha; ver `slide-4`)
Píldora `[ FT | Problema ]`. A la izquierda va el titular "Damodaran no calibra para Colombia. Los valoradores no publican su WACC." A la derecha, 6 barras carbón-2 de ancho completo con `→`, una por componente, tomadas de la tabla §2 de `FinTarget-contexto.md` (Beta, Sector, Estructura de capital, Rf/ERP/prima país, Kd, Sector financiero). Cada barra lleva el problema en una línea y, al expandirla (`<details>`), la solución de FinTarget en una línea.

### 4. Método: cómo se construye una cifra (ver `slide-13`)
Píldora `[ FT | Método ]`, id `metodo`. Diagrama hecho en HTML/CSS (no imagen) con la cadena: Empresa → Estado financiero → Sector → Pares → Supuesto → Modelo → Resultado → Memo. Las cajas son negras con texto claro, unidas por conectores punteados, y la caja "Resultado" lleva borde `--accent`. Debajo hay tres fórmulas en mono, en una tarjeta clara:
```
βL  = βu × [1 + (1 − t) × D/E]
Ke  = Rf + βL × ERP + λ × CRP
WACC = E/V × Ke + D/V × Kd × (1 − t)
```
En móvil el diagrama pasa a vertical.

### 5. Validación: cifras grandes (ver `slide-16`)
Píldora `[ FT | Validación ]`. Titular: "El prototipo reproduce los talleres de referencia." Grid de tarjetas `--paper-2` con radio md, cada una con una cifra grande en sans 300 y una etiqueta. Usa solo estos datos verificados en `MAPA-Y-EVOLUCION.md`:
- "47,5 %": ROIC de VISA FY2025
- "18.727": EVA de VISA FY2025 (USD millones)
- "5,44": Altman Z'' de Ecopetrol 2025
- "434,20": valor por acción en el DCF del taller de VISA (taller: 434,08)
- "13": hojas del Excel con fórmulas vivas que genera FinTarget
Solo una de las cifras va en `--accent` (sugiero 47,5 %). Agrega una nota al pie de 11 px: "Pruebas de consistencia contra talleres académicos. No constituyen una validación metodológica externa."

### 6. Planes (fondo papel)
Píldora `[ FT | Planes ]`, id `planes`. Cuatro columnas con línea superior de 1 px (estilo de las columnas de `slide-10` del PDF): Free · Pro · Institucional / API · Gobierno y academia. Para cada una, "Para quién" y "Qué incluye", tomados de §7 de `FinTarget-contexto.md`. Sin precios. Arriba va la etiqueta "Hipótesis por validar".

### 7. Contacto y pie (panel carbón)
Píldora `[ HT | Contacto ]`, id `contacto`. Titular "Hablemos." y un enlace `mailto:` con el texto "[correo por confirmar]" (no pongas un correo real). Agrega un enlace secundario "Entrar a FinTarget →". Pie: logo H, "© 2026 HyperTarget · Barranquilla, Colombia [por confirmar]" y el texto "FinTarget es un prototipo; las cifras de las vistas son de ejemplo salvo donde se indica la fuente."

## Detalles técnicos

- `<title>HyperTarget</title>`, `meta description`, Open Graph (`og:title`, `og:description`, `og:type=website`) y `favicon.svg` (la H, `#1F2124` sobre transparente).
- Layout con CSS grid. Container de máximo 1440 px. Gutter de 16 px en móvil, 32 px en tablet y 64 px en escritorio. Sin scroll horizontal a 375 px (comprobarlo).
- Animaciones mínimas: aparición con opacity/translate de 8 px al entrar en viewport (IntersectionObserver), desactivada con `prefers-reduced-motion`.
- Accesibilidad: un solo `h1`, jerarquía h2/h3, contraste AA, `:focus-visible` con un outline de 2 px, enlaces con texto descriptivo, `lang="es"` y SVG decorativos con `aria-hidden`.
- Rendimiento: sin imágenes raster. Todo en SVG y CSS. `index.html` + `site.css` pesan menos de 60 KB.

## Verificación antes de terminar

1. `python3 -m http.server 8765` en la carpeta y abrir `http://localhost:8765/`.
2. Comprobar a 1440, 768 y 375 px de ancho. Sin overflow horizontal: `document.documentElement.scrollWidth <= innerWidth`.
3. Comprobar que "Entrar a FinTarget →" abre FinTarget, que "← HyperTarget" vuelve, y que FinTarget sigue sin errores de consola.
4. Al terminar, escribe un resumen en `CODEX-LANDING-RESULTADO.md`: archivos creados, decisiones de diseño, qué quedó `[por confirmar]` y capturas si pudiste tomarlas (guárdalas en `referencias/capturas/`).
