# Resultado · FinTarget → Mirage

Implementación completada sin navegador, servidor, instalaciones, despliegues ni commits.

## Cambios realizados

- `mv fintarget-mockup.html mirage.html`. Los enlaces de la landing, incluido `#method`, apuntan ahora a `mirage.html`. Con `cleanUrls: true` ya presente en Vercel, el archivo corresponde a `/mirage`; no se verificó un despliegue.
- Texto visible, título, meta description, nombres accesibles, ayudas, GA, presentación imprimible, informes DX, memos y contenido del Excel: Mirage. HyperTarget conserva su nombre.
- Path del nuevo símbolo copiado exactamente desde `logos/mirage-symbol-black.svg` en el símbolo `ft` de `mirage.html` y en el SVG de la tarjeta de `index.html`. Se conserva `ft` y sus tres usos para mantener los IDs intactos, como exige la instrucción del usuario. El símbolo viejo no se eliminó.
- Se actualizaron las tres referencias al SVG antiguo y su etiqueta en `logos/concepts/mirage-preview.html`, página que no está excluida de publicación por la configuración actual.
- Descargas: `mirage-sectores-2026-09-30.csv`, `mirage-memo-borrador.txt`, `mirage-<ticker>-<balance/resultados>-VH.csv` y `mirage-Diagnostico-<empresa>.xlsx`.
- Ejemplos mostrados en GA: `MIRAGE.WACC`, `MIRAGE.FA`, `MIRAGE.BETA`, `MIRAGE.RATIO`, `MIRAGE.ALTZ`, `MIRAGE.CRP` y `MIRAGE.SERIE`. Son texto ilustrativo: el generador XLSX no contiene funciones `FT.*` ni nombres definidos de ese tipo. Sus fórmulas de Excel y cálculos quedan intactos.
- La referencia simulada del dossier muestra `/mirage-dossier`; los códigos y la implementación de la línea de comandos permanecen intactos. El placeholder no mencionaba FinTarget y se conservó.
- `fuentes-validacion.js` y `fuentes-validacion.json` usan `product: "Mirage"`; el filtro de `renderSources` usa el mismo valor. Las entradas de Miracle permanecen intactas. No había etiquetas de sección `FT` en la landing.

Archivos de código modificados: `mirage.html` (renombrado), `index.html`, `fintarget-analitica.js`, `fintarget-dx.js`, `fuentes-validacion.js`, `fuentes-validacion.json` y `logos/concepts/mirage-preview.html`. Los archivos internos mantienen sus nombres. `fintarget-empresas.js` y `site.js` no requirieron cambios.

## Preservación y verificaciones

- `node --check`: correcto en los 100 archivos `.js` presentes, incluidos los respaldos, leídos sin modificarlos. También correcto en el script inline de `mirage.html`.
- Comparación exacta con los originales: al revertir exclusivamente las sustituciones de marca, textos, nombres de descarga, referencias y paths SVG autorizados, cada archivo modificado coincide byte por byte con su original. Esto confirma que no se alteraron fórmulas, operaciones, eventos ni lógica de vistas/exportaciones; el filtro de fuentes se actualizó de forma coherente con los datos.
- IDs, atributos `data-*` y clases de los dos HTML: idénticos a los originales. Globals y claves de almacenamiento: idénticos, incluidos `window.FinTargetDX`, `ft.co`, `ft.tool`, `ft.notes.*` y `fintarget-illustrative-notice-dismissed`.
- CSS intacto. Paths de ambos símbolos: coincidencia exacta con el SVG entregado. Registros JS y JSON: equivalentes.
- SHA-256: comprobada la integridad de 1022 archivos protegidos existentes antes del trabajo, incluidos `miracle-*`, configuración prohibida, `.md`, `backups/`, `qa/` y `ejemplos/`.
- El registro externo `referencias/codex-mirage.log` cambió durante la sesión, y aparecieron `logos/concepts/mi-m-c.svg`, `mi-m-d.svg`, `mi-m-e.svg` y `mirage-preview-2.html`. No fueron creados ni editados por esta ejecución y se excluyeron del control del alcance propio.
- Detector estático Impeccable ejecutado una vez: `[]`, en modo degradado por ausencia de `htmlparser2`, `css-select`, `css-tree` y `domutils`. No evalúa contraste computado ni sustituye una revisión visual. No se instalaron módulos ni se abrió navegador.

## Resultado del grep solicitado

Comando:

```sh
grep -noi "fintarget" mirage.html index.html fintarget-analitica.js fintarget-dx.js fintarget-empresas.js fuentes-validacion.js site.js
```

Salida literal:

```text
mirage.html:213:fintarget
mirage.html:502:fintarget
mirage.html:690:FinTarget
mirage.html:694:fintarget
mirage.html:695:fintarget
mirage.html:697:fintarget
index.html:29:fintarget
fintarget-analitica.js:2:fintarget
fintarget-analitica.js:5:FinTarget
fintarget-analitica.js:5:FinTarget
fintarget-analitica.js:705:FinTarget
fintarget-dx.js:7:FinTarget
fintarget-dx.js:7:FinTarget
fintarget-dx.js:7:FinTarget
fintarget-dx.js:506:FinTarget
fintarget-empresas.js:1:FinTarget
fintarget-empresas.js:6:FinTarget
```

No queda texto visible FinTarget. Las coincidencias corresponden a nombres de archivos internos, comentarios, globals, una clave de almacenamiento y una clase CSS interna. La lista de excepciones del grep en el brief omite tres casos existentes: `window.FinTargetDX` (línea 506 de DX), `fintarget-illustrative-notice-dismissed` (línea 502 del HTML) y `fintarget-card` (línea 29 de la landing). Se conservaron para respetar las reglas duras de mantener identificadores, almacenamiento y diseño; por tanto, el grep no cumple literalmente su lista abreviada de excepciones.

Comando:

```sh
grep -c "fintarget-mockup" mirage.html index.html *.js
```

Salida literal:

```text
mirage.html:0
index.html:0
fintarget-analitica.js:0
fintarget-dx.js:0
fintarget-empresas.js:0
fuentes-validacion.js:0
miracle-app.js:0
miracle-datos.js:0
miracle-modelos.js:0
miracle-registro.js:0
site.js:0
```

Todos los conteos son 0. `grep -c` devuelve código 1 cuando no encuentra coincidencias: es el resultado esperado aquí.

## Referencias antiguas fuera de las páginas activas

`vercel.json` conserva el rewrite existente `/fintarget` → `/fintarget-mockup`, por prohibición explícita de modificarlo. Esa ruta antigua apunta al archivo renombrado y no se reparó ni se desplegó. `vercel.json.next` se dejó intacto: sus referencias antiguas son orígenes de redirecciones hacia `/mirage`, no enlaces de páginas. Los documentos y respaldos prohibidos conservan su contenido anterior.
