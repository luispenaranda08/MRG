# Tarea para Codex · Mirage en Next.js (solo lo visual)

Mirage pasa de `mirage.html` (HTML + JS sueltos) a una aplicación **Next.js con exportación estática** que se publicará en **Cloudflare Pages**. Tu trabajo es **todo lo visual**: páginas, componentes, estilos, interacción y descargas. Los datos y los cálculos de mercado ya los produce la API estática (no la modifiques).

## Reglas duras

1. Trabaja solo dentro de `web/`. **No toques** `ml/`, `mirage.html`, `index.html`, `fintarget-*.js`, `fintarget-*.css`, `miracle-*`, `vercel.json`, `.vercelignore`, `backups/`, `qa/` ni los `.md` existentes (salvo tu informe).
2. **No instales nada ni uses la red.** Ya están instalados en `web/`: Next.js 16, React 19, TypeScript, `xlsx` (SheetJS, para **leer** Excel) y `exceljs` (para **escribir** Excel con formato). Si algo falta, avísalo en el informe en vez de instalarlo.
3. **Exportación estática obligatoria.** En `web/next.config.ts`: `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`. Si `cacheComponents` o `partialPrefetching` impiden exportar, quítalos y anótalo. Nada de rutas de API de Next, `getServerSideProps`, server actions ni middleware: todo corre en el navegador.
4. **Ninguna cifra inventada.** Todos los números de mercado salen de `web/public/api/v1/*.json`. Si un valor es `null`, muestra "—" con su nota. Elimina por completo el banner y las etiquetas de "datos ilustrativos".
5. Solo tres vistas, en este orden: **WACC · Costo de capital**, **CALC · Calculadora**, **DX · Tu empresa**. No crees FA, GA, ECO ni DOC.

## 1. La API (léela antes de diseñar)

Archivos en `web/public/api/v1/`:

| Archivo | Contenido |
|---|---|
| `meta.json` | Versión, fecha de corte, corte anterior, aviso legal y lista de fuentes con URL y licencia |
| `estilo.json` | Paleta de Mirage por **tono** y formatos numéricos (web y Excel) |
| `parametros.json` | Rf, ERP, spread soberano, λ, prima país (Mirage y Damodaran), inflación COP y USD, tarifa de renta; cada uno con fuente y corte |
| `sectores.json` | 61 sectores CIIU: empresas, β desapalancada y apalancada con rango p25–p75, D/E, Ke, Kd observado, WACC COP nominal con rango, WACC USD y real, desglose por tamaño (Micro, Pequeña, Mediana, Grande) y comparación con Damodaran (representatividad: cuántas empresas latinoamericanas y colombianas hay en su ancla) |
| `historico/<fecha>/sectores.json` | Copia de cada corte |

Cada cifra es una **celda**: `{ "v": 0.1432, "fmt": "pct", "tono": "clave", "var": {"v": 0.004, "tono": "sube"}, "nota": "..." }`.

- `fmt`: `pct` (fracción → "14,32 %"), `pp`, `x` (β, D/E: "0,59"), `num` ("4.257"), `bn` ("12,3 bn"), `txt`. **Formato colombiano**: coma decimal y punto de miles (`Intl.NumberFormat("es-CO")`).
- `tono` → color, según `estilo.json` (**no copies los colores a mano: léelos de ahí**, y genera variables CSS a partir de ese archivo):
  - `clave`: resultado principal, fondo dorado claro con borde dorado y negrita (WACC, Ke, β apalancada, prima país).
  - `insumo`: supuesto o dato de entrada, fondo arena.
  - `sube` / `baja`: verde `#1F6B45` / rojo `#A3322A` (subidas y bajadas, como en los talleres de Gerencia Financiera).
  - `nota`: gris (fuentes, rangos, conteos). `alerta`: texto ocre con fondo arena y borde dorado, con su nota visible.
  - `encabezado` y `subtotal` para tablas.
- `var`: variación frente al corte anterior. Muéstrala con flecha ▲/▼ y el color de su tono. Hoy no hay corte anterior; el código debe soportarlo igual.

**La API se moverá luego a un repositorio aparte.** El frontend no debe depender de dónde viva: la URL base sale de `process.env.NEXT_PUBLIC_MIRAGE_API` (por defecto `/api/v1`), y ningún componente lee los JSON directamente, solo a través de `api.ts`. Trata `web/public/api/v1/` como un artefacto generado (no lo edites).

Crea en `web/src/lib/api.ts` los tipos TypeScript del contrato, la carga de los JSON (con `fetch` a la URL base) y un formateador único `fmt(celda)`. Crea un componente `<Cifra celda={...} />` que aplique formato, tono, flecha de variación y la nota como tooltip accesible. Úsalo en todas las vistas.

## 2. Diseño

- Conserva la identidad actual de Mirage (`mirage.html`): barra superior oscura, tipografías IBM Plex Sans (texto) e IBM Plex Mono (cifras), el símbolo de Mirage (`logos/mirage-symbol-black.svg`; cópialo a `web/public/`), los códigos `[ WACC ]`, `[ CALC ]`, `[ DX ]` en la navegación. Las fuentes se cargan con `next/font/google`.
- Estética de terminal financiera sobria, sin el azul brillante "IA". Mira las capturas de `qa/` como referencia.
- Responsive hasta 375 px con barra de navegación inferior en móvil. Accesible: contraste AA, foco visible, tablas con encabezados reales.
- Pie con "Mirage es un producto de HyperTarget", el **aviso** de `meta.json` y el enlace a las fuentes.

## 3. Vistas

### WACC · Costo de capital (`/`)
- Encabezado con fecha de corte, versión de la metodología y número de sectores.
- Tarjetas con los parámetros de mercado (`parametros.json`), cada una con fuente y corte en tooltip. La inflación COP lleva su alerta visible.
- Tabla de los 61 sectores: CIIU, nombre, empresas, β desapalancada, D/E, β apalancada, Ke, Kd, WACC (y su rango p25–p75 como mini barra). Ordenable por columna, buscador por nombre o CIIU, conmutadores COP/USD y nominal/real (usando los campos ya calculados en la API).
- Al seleccionar un sector, panel lateral con:
  - el desglose por tamaño (tabla de 4 columnas);
  - la comparación con Damodaran: cuántas empresas hay en su ancla, cuántas latinoamericanas y colombianas, y la diferencia de β con su tono;
  - los pasos del método (`metodo.pasos`).
- Descargas: **CSV** y **XLSX con formato**. El XLSX se genera con `exceljs` y aplica `estilo.json`:
  - encabezado oscuro con texto blanco;
  - celdas clave resaltadas;
  - variaciones en verde o rojo;
  - hoja "Fuentes" con `meta.json`;
  - hoja "Método".

### CALC · Calculadora (`/calculadora/`)
- Porta la calculadora actual de `mirage.html`: el usuario elige sector y tamaño, ingresa deuda, patrimonio, EBIT, gastos financieros y tarifa.
- Calcula β re-apalancada (Hamada), Ke, Kd (el observado del sector y tamaño de la API; si es `null`, el del sector), WACC COP y USD.
- Los insumos van con tono `insumo` y los resultados con `clave`.
- Opciones: beta total (con la advertencia de la API) y prima por tamaño.
- Descarga del memo en TXT y XLSX con formato. No uses cifras fijas: todo sale de `parametros.json` y `sectores.json`.

### DX · Tu empresa (`/tu-empresa/`)
- Porta la funcionalidad de `fintarget-dx.js`: carga de balance y PyG (Excel/CSV con SheetJS en el navegador), mapeo de cuentas, informe y **Excel de 13 hojas con fórmulas vivas**.
- Mueve la lógica de cálculo a `web/src/lib/dx/` (TypeScript), **sin cambiar las fórmulas**.
- Conecta los insumos de mercado y del sector a la API, en vez de los valores fijos de hoy.
- Reemplaza la escritura del Excel por `exceljs`, para que las hojas lleven la convención de colores:
  - insumos con fondo arena;
  - resultados clave en dorado;
  - variaciones horizontales en verde o rojo;
  - encabezados oscuros.
- El archivo del usuario **nunca sale del navegador**. Muéstralo como aviso de confidencialidad.
- Copia `ejemplos/Visa-2021-2025.xlsx` y `ejemplos/PYME-Confecciones-del-Caribe.xlsx` a `web/public/ejemplos/` como archivos de ejemplo.

## 4. Verificación (obligatoria)

1. `npm run lint` y `npm run build` sin errores; el build debe producir `web/out/` con las tres rutas y `out/api/v1/*.json`.
2. Prueba de regresión del DX con `ejemplos/Visa-2021-2025.xlsx`: el Excel generado debe reproducir, como antes, GAO 1,459, EBIT de indiferencia 22.823,5 y EVA 2025 19.206 (si cambian por usar insumos de la API, documenta la diferencia y la causa). Escribe la prueba en `web/src/lib/dx/__tests__/` si puedes ejecutarla sin instalar nada.
3. Ninguna cifra de mercado escrita a mano en los componentes: busca con `grep` porcentajes fijos y explica los que queden.
4. Escribe `CODEX-NEXTJS-RESULTADO.md` con:
   - qué hiciste;
   - la estructura de carpetas;
   - las decisiones que tomaste;
   - qué quedó pendiente;
   - la salida de `npm run build`.

No despliegues, no hagas commits y no abras navegador.
