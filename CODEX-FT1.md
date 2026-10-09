# Tarea para Codex · FinTarget FT1: que se sienta producto, no demo

FinTarget (`fintarget-mockup.html`, `fintarget-analitica.css/.js`, `fintarget-dx.js`, `fintarget-empresas.js`) ya está en línea en `hypertarget.tech/fintarget`, enlazado desde la landing (`index.html`, `site.css`). El dueño quiere que **se sienta como un producto real, sin decir "demo", "mockup" ni "prototipo"**, y con la misma identidad visual de la landing.

## Reglas duras

1. **Cero cambios de funcionalidad.** Todas las vistas (WACC, CALC, DX, FA, GA, ECO, DOC), los cálculos, la línea de comandos, las exportaciones (CSV, TXT, XLSX), los gráficos y el modo presentación deben funcionar exactamente igual.
2. **No cambies IDs, `data-*` ni las clases que use el JS.** Antes de renombrar una clase, búscala en los cuatro `.js`. Si dudas, no la renombres: cambia solo su estilo.
3. **No renombres archivos.** `fintarget-mockup.html` se queda con ese nombre, porque la URL pública es `/fintarget`. `window.FinTargetMockup` también se queda: es un nombre interno y no se ve.
4. No toques `vercel.json`, `.vercelignore`, `.gitignore`, `.env*`, `.vercel/`, `backups/`, `qa/`, `miracle-*`, `ejemplos/` ni los `.md` (salvo el resultado). No despliegues ni instales nada.
5. **Honestidad de datos (obligatorio).** Quitar la palabra "demo" no significa presentar cifras inventadas como reales. Cada cifra que hoy es de ejemplo debe seguir **identificable como ilustrativa**, pero dicho en lenguaje de producto (como un terminal financiero marca un dato "diferido"), no de prototipo. Usa una sola fórmula en todo el producto: **"Datos ilustrativos"**. Ver §2.

## 1. Identidad visual = la de la landing

Rehaz los tokens del `:root` de `fintarget-mockup.html` y los colores fijos de `fintarget-analitica.css` para alinearlos con `site.css`:

| Token FinTarget | Nuevo valor |
|---|---|
| `--top` / `--top-2` / `--top-ink` | `#1F2124` / `#2A2C30` / `#9EA2A8` |
| `--bg` | `#DADADA` (papel de la landing) |
| `--surface` / `--surface-2` / `--hover` | `#ECECEC` / `#E4E4E4` / `#E0E0E0` (más claros que el papel, para que las tablas respiren) |
| `--ink` / `--sub` / `--mute` | `#1F2124` / `#4A4D52` / `#6E7277` |
| `--line` / `--line-2` | `rgba(31,33,36,.18)` / `rgba(31,33,36,.10)` |
| `--primary` / `--primary-d` / `--link` | `#1F2124` / `#000000` / `#1F2124` (las acciones primarias pasan a carbón, como el botón de la landing) |
| `--accent` | `#C8A24A` sobre fondo oscuro; crea `--accent-ink:#7D5F17` para usarlo sobre fondos claros |
| `--tint` | `#E2E2E2` |
| `--c1…--c5` (rampa de gráficos) | rampa de grises a carbón: `#BFC2C6 #9A9EA4 #73787F #4A4E54 #1F2124`; el valor destacado de cada gráfico va en `--accent-ink` |
| `--warn-bg/--warn`, `--good`, `--bad` | se conservan, solo para estados semánticos |

- Tipografías: cambia `--f-brand`, `--f-head` y `--f-body` a `"Hanken Grotesk"` (pesos 300/400/500/600) y conserva `--f-mono` (IBM Plex Mono). Actualiza el `<link>` de Google Fonts y quita Archivo y Source Serif 4 si ya no se usan.
- Títulos de vista (`h1`/`h2` de cada `.head`): peso 400, `letter-spacing:-0.02em`.
- **Etiquetas entre corchetes**: el código de cada vista en la barra (`.fn`: WACC, CALC, DX…) se muestra como `[ WACC ]` con `::before/::after`, en mono, igual que `.bracket` de la landing. En la cabecera de cada vista, la línea pequeña de contexto (la de "Datos abiertos · Colombia · WACC") pasa al mismo estilo de corchetes.
- Bordes de radio: tarjetas 10 px y botones con radio completo, como "Entrar a FinTarget →" de la landing.
- Barra superior: fondo `--top` y el logo FinTarget igual. El enlace `← HyperTarget` deja de usar estilos inline: muévelos a CSS como `.ht-back` (mono 11 px, mayúsculas) y quita los `onmouseover`/`onmouseout`.
- Revisa contraste AA en tablas, chips y gráficos con los nuevos colores. En particular, cualquier texto dorado sobre fondo claro debe usar `--accent-ink`.

## 2. Lenguaje: de demo a producto

Reemplaza en el HTML y en los textos que generan los `.js` (no en los comentarios de código):

| Hoy | Queda |
|---|---|
| Banner `.demo`: "**Mockup V3** · WACC sectorial, macro y salidas de modelos con cifras de ejemplo. Los estados de Tecnoglass, Ecopetrol y Visa vienen de los talleres de Gerencia Financiera." | Una franja fina en mono 11 px, `--sub` sobre `--surface-2`: `[ DATOS ILUSTRATIVOS · CORTE 30 SEP 2026 ]  Las tasas sectoriales y macro son ilustrativas mientras conectamos las fuentes oficiales. Los estados financieros de Tecnoglass, Ecopetrol y Visa son públicos.` Sin amarillo. Que se pueda cerrar (×) y que recuerde el cierre en `localStorage` con try/catch. |
| Chip "Rango: D/E × 0,6–1,5 · demo" | "Rango: D/E × 0,6–1,5 · sensibilidad" |
| Columna "Rango sensibilidad demo" | "Rango de sensibilidad" |
| Tooltip "Sensibilidad demo: …" | "Sensibilidad: …" |
| Badge "Ejemplo" junto al corte en la cabecera de WACC | `[ ILUSTRATIVO ]` |
| Candado "**Plan Pro** · Prototipo · PDF pendiente" | `[ PRÓXIMAMENTE ]  Memo en PDF` (sin "Plan Pro": FinTarget es de acceso abierto) |
| "XLSX · pendiente" y otros "· pendiente" visibles | `[ PRÓXIMAMENTE ]` |
| "En este prototipo el rango es…" (DOC) | "Por ahora el rango es…" |
| Bloque de historial "Mockup V2 / Mockup V3" en DOC | Renómbralo **"Registro de versiones"** con entradas "Versión 0.2 · 6 oct 2026" y "Versión 0.3 · 7 oct 2026" y el mismo contenido, sin la palabra mockup |
| "Las corridas de skills y modelos son simuladas" (textos visibles en GA) y "salida simulada" | `[ DATOS ILUSTRATIVOS ]` en la tarjeta del modelo o skill |
| Nombres de descarga `fintarget-sectores-DEMO.csv`, `fintarget-memo-DEMO.txt` y la columna `DEMO` del CSV | `fintarget-sectores-2026-09-30.csv`, `fintarget-memo-borrador.txt`; la primera columna del CSV pasa a llamarse `estado` con valor `ilustrativo` |
| Pie del memo exportado: "DEMOSTRACIÓN. Revisión académica pendiente. No usar como tasa…" | "BORRADOR · Datos ilustrativos con corte 30 sep 2026. Metodología en revisión académica. No usar como tasa de descuento definitiva sin validar los insumos." Este aviso **se queda** en los archivos exportados: alguien podría llevarlos a una auditoría. |
| Mensaje de error de `fintarget-dx.js`: "…Abre el mockup desde el servidor local para cargar los ejemplos." | "No pudimos cargar el archivo de ejemplo. Intenta de nuevo o sube tu propio Excel." |
| Avatar "LP" en la barra | Quitarlo (no hay cuentas) y dejar el espacio para el botón de comandos |

Busca también "maqueta", "beta", "prueba" y "taller" en los textos visibles. "Taller" se elimina siempre ("vienen de los talleres de Gerencia Financiera" → "son públicos"). En `ejemplos/` los nombres de archivo no se tocan, pero el texto visible que los presenta debe decir "Archivo de ejemplo: Visa" o "Archivo de ejemplo: pyme de confecciones".

## 3. Landing (`index.html`) para que sea coherente

- Etiqueta de la tarjeta FinTarget: `PROTOTIPO · CIFRAS DE EJEMPLO` → `[ DATOS ILUSTRATIVOS ]` en el mismo estilo `.bracket`.
- Ticker: `[ CIFRAS DE EJEMPLO · CORTE 30 SEP 2026 ]` → `[ DATOS ILUSTRATIVOS · CORTE 30 SEP 2026 ]`.
- Pie: "FinTarget es un prototipo; las cifras de las vistas son de ejemplo salvo donde se indica la fuente." → "Las tasas marcadas como ilustrativas no constituyen una recomendación de tasa de descuento."
- Meta description: quita "nuestro prototipo de costo de capital" → "Conoce FinTarget, la referencia de costo de capital para Colombia."
- No cambies nada más de la landing.

## 4. Verificación

- `node --check` para los cuatro `.js` y `site.js`.
- `grep -noiE "mockup|demo|prototipo|simulad|taller|plan pro" fintarget-mockup.html fintarget-analitica.js fintarget-dx.js fintarget-empresas.js index.html`: los únicos resultados permitidos son `fintarget-mockup.html` en hrefs y nombres de archivo, `FinTargetMockup` (nombre interno de JS), los comentarios de código y la clase CSS `.demo` (si la conservas, que no muestre esas palabras).
- Lista en el resultado cada texto visible que cambiaste (antes → después).
- Escribe `CODEX-FT1-RESULTADO.md`. No abras navegador ni servidor: Claude verifica todas las vistas después.
