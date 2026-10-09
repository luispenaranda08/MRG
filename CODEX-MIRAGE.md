# Tarea para Codex · Renombrar FinTarget → Mirage

El producto financiero pasa a llamarse **Mirage**. Cambian el nombre visible, el logo y la URL. La funcionalidad, los cálculos y el diseño no cambian.

## Reglas duras

1. **Cero cambios de funcionalidad.** Los cálculos, las vistas, las exportaciones y la línea de comandos funcionan igual.
2. **Identificadores internos de JS intactos.** `window.FinTargetMockup`, `window.FinTargetAnalitica`, `window.FinTargetEmpresas`, las claves de `localStorage`, los IDs, los `data-*` y las clases usadas por el JS **no se renombran**. Solo cambia el texto que ve el usuario.
3. No toques `vercel.json`, `.vercelignore`, `.gitignore`, `.env*`, `.vercel/`, `backups/`, `qa/`, `miracle-*` (Miracle es otro producto: **no lo confundas con Mirage**), `ejemplos/` ni los `.md` (salvo el resultado). No despliegues ni instales nada.

## 1. Archivo y URL

- Renombra `fintarget-mockup.html` → **`mirage.html`** con `mv` (no hay commits en git).
- Actualiza todos los enlaces que apuntan a `fintarget-mockup.html` (en `index.html`, en los `.js`, en el propio HTML y donde aparezcan) para que apunten a `mirage.html`. En Vercel quedará servido como `/mirage`.
- Los demás archivos (`fintarget-analitica.css/.js`, `fintarget-dx.js`, `fintarget-empresas.js`) **conservan su nombre**: son internos.

## 2. Logo

- El nuevo símbolo está en `logos/mirage-symbol-black.svg`: una M con la columna ajedrezada y las barras redondeadas, en el mismo estilo que el antiguo FT. Copia su `path` tal cual.
- En `mirage.html`, reemplaza el `<symbol id="ft">` por el path de la M. Puedes conservar el id `ft` si el JS lo referencia (búscalo antes); si no, renómbralo a `mi`.
- En `index.html`, la tarjeta del producto usa el SVG inline del FT: cámbialo por la M.
- Si `logos/fintarget-symbol-black.svg` está referenciado en alguna página publicada, cambia la referencia a `logos/mirage-symbol-black.svg`. No borres el archivo viejo.

## 3. Texto visible: FinTarget → Mirage

Cambia **todo texto visible** "FinTarget" por "Mirage" en `mirage.html`, `index.html`, `fintarget-analitica.js`, `fintarget-dx.js`, `fintarget-empresas.js` y `fuentes-validacion.js`, incluido el texto que genera el JS (títulos, ayudas, tarjetas de GA, informes de DX, la presentación imprimible, el Excel generado, los memos y los CSV). Casos concretos:

| Hoy | Queda |
|---|---|
| `<title>FinTarget · Costo de capital Colombia</title>` | `<title>Mirage · Costo de capital Colombia</title>` |
| Logo de texto en la barra "FinTarget" | "Mirage" |
| "Entrar a FinTarget →" (landing, varias veces) | "Entrar a Mirage →" |
| "FinTarget es un producto de HyperTarget" (pie) | "Mirage es un producto de HyperTarget" |
| "Modelos FinTarget", "FinTarget en Excel" | "Modelos Mirage", "Mirage en Excel" |
| Funciones `=FT.WACC`, `=FT.FA`, `=FT.BETA` (texto mostrado en GA) | `=MIRAGE.WACC`, `=MIRAGE.FA`, `=MIRAGE.BETA`. Si alguna de estas funciones existe de verdad en el XLSX generado (nombres definidos o fórmulas), cámbiala de forma coherente en ambos lados o déjala igual y avisa en el resultado. |
| Descargas `fintarget-sectores-2026-09-30.csv`, `fintarget-memo-borrador.txt` y cualquier `fintarget-*.xlsx` | `mirage-sectores-2026-09-30.csv`, `mirage-memo-borrador.txt`, `mirage-*.xlsx` |
| Meta description de la landing: "Conoce FinTarget, la referencia…" | "Conoce Mirage, la referencia…" |
| Landing, método: "Cada número de FinTarget guarda…" | "Cada número de Mirage guarda…" |
| Landing, Por qué: "FinTarget está diseñado para…" | "Mirage está diseñado para…" |
| Placeholder de la línea de comandos | Sin cambios salvo si menciona FinTarget |

- Las etiquetas de sección de la landing que dicen `FT` (si queda alguna) pasan a `MI`.
- No cambies "HyperTarget".
- Los comentarios de código pueden quedar como están.

## 4. Verificación

- `node --check` para todos los `.js`.
- `grep -noi "fintarget" mirage.html index.html fintarget-analitica.js fintarget-dx.js fintarget-empresas.js fuentes-validacion.js site.js`: solo se permiten identificadores JS internos (`FinTargetMockup`, `FinTargetAnalitica`, `FinTargetEmpresas`), nombres de archivo `fintarget-*.js/.css` en `<script>`/`<link>` y comentarios. Pega el resultado en el informe.
- `grep -c "fintarget-mockup" mirage.html index.html *.js` debe dar 0.
- Escribe `CODEX-MIRAGE-RESULTADO.md`. No abras navegador ni servidor.
