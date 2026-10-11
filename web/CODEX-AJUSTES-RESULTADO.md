# Ajustes visuales y documentos de Mirage · Resultado

Trabajo realizado el 10 de octubre de 2026, exclusivamente dentro de `web/`.

## Reglas duras

- Se compararon SHA-256 antes y después: los 20 archivos de `src/lib/finanzas/`, `api/`, `public/api/`, los tres módulos protegidos de DX y `vercel.json` no cambiaron.
- No se instalaron dependencias, no se usó la red, no se desplegó ni se hicieron commits. Se utilizaron jsPDF y autoTable ya instalados.
- Se conservan las tres vistas principales y las cinco subsecciones de la calculadora. La documentación auxiliar existente sigue en su ruta; se ajustó su redacción y sus enlaces visibles para respetar el lenguaje claro.
- Se respetaron los cambios previos del usuario fuera de `web/` y la instalación previa registrada en `package-lock.json`.
- Los módulos de documentos presentan resultados recibidos. No se añadieron ni quitaron cálculos financieros.

## Qué cambió

### Tu empresa

- La zona de carga es un bloque con borde punteado, entrada de archivo oculta de forma accesible, botón «Elegir archivo», nombre anunciado mediante una región de estado y conexión accesible entre nombre y entrada.
- Se admite arrastrar y soltar con estado activo; se impide una nueva lectura durante otra carga. Se limpia la entrada después de elegir para permitir volver a seleccionar el mismo archivo. La zona muestra foco visible.
- Estado tiene ancho mínimo de 110 px y Campo Mirage de 230 px. Los encabezados de texto se alinean a la izquierda, las cifras a la derecha. La cuenta original se mantiene fija a la izquierda al desplazar la tabla.
- «Ke en COP/USD» y «Kd en COP/USD» identifican la moneda de los estados; «Ke USD» mantiene su identificación de referencia.
- Las advertencias aparecen antes de los resultados, dentro de un bloque destacado. Severidad alta/media usa el tono alerta e información usa nota.
- Se usa «Datos de mercado al <fecha>»; las referencias técnicas de notas y mensajes se traducen en la presentación sin modificar los datos ni los módulos protegidos.

### Calculadora

- `DocumentoMirage` recupera la hoja blanca, sombra, tamaño y jerarquía de la referencia `.paper` de `mirage.html`. Ancho máximo de 780 px y adaptación móvil.
- Encabezado con símbolo Mirage negro, nombre, número MRG-AAAAMMDD-XXXX y fecha de datos; título de cada subsección, empresa opcional, conclusión, supuestos, resultados, tablas adicionales, método, fuentes y aviso obligatorio.
- Pie exclusivo de estos documentos: símbolo HyperTarget negro, «Mirage by HyperTarget», dominio, fecha y paginación.
- Las cinco subsecciones ofrecen «↓ PDF» y «↓ Excel». El memo TXT se retiró.
- Se centralizó `armarDocumento` y `pdfDocumento` en `src/lib/documento.ts`. React y PDF consumen la misma estructura y las mismas conclusiones. Un identificador se conserva mientras la vista previa está montada y se utiliza al descargar.
- PDF real en el navegador: jsPDF, tamaño carta, márgenes de 18 mm, Helvetica, tablas autoTable, encabezados oscuros, insumos arena y resultados principales dorados con borde. Se reservó espacio para impedir que el cuerpo invada el pie.
- Los dos SVG locales se rasterizan a PNG mediante canvas de 512 × 512 (base 128 × 128, escala 4). No se invierten los símbolos.
- Pie y número real de página en todas las páginas del PDF; nombre de archivo generado con `lib/nombres.ts`.
- En créditos se muestran las primeras cuatro y últimas cuatro filas cuando el cuadro es largo, y se informa cuántas filas completas incluye el Excel. Se mantienen en el documento las tasas variables, indexación y resultados en pesos cuando aplican.
- Proyectos contempla Flujos A/B, cruce y Modelo con sus tres evaluaciones, supuestos, FCL y EVA.
- Todos los Excel de la calculadora tienen la fila final «Mirage by HyperTarget» en cada hoja. Los Excel de créditos y proyectos conservan sus fórmulas, nombres y referencias; el pie se añade después de sus datos.
- Tasas y TVM tienen exportación Excel basada en el documento compartido.

## Hallazgos visuales adicionales y correcciones por código

Se revisaron las reglas que actúan a 375 px y 1280 px; no se abrió navegador ni se afirma una comprobación visual o interacción real.

| Hallazgo | Corrección |
| --- | --- |
| Cifras DX con espacio indivisible y tarjetas de cuatro columnas podían desbordar | Cifras limitadas al ancho disponible con salto de línea; una columna de resultados en móvil |
| Nombres de empresa, archivos, cuentas y mensajes extensos podían ensanchar tarjetas | Ajuste de palabras largas y mínimos de ancho cero en contenedores |
| Nombre de cuenta y hoja se perdían al desplazar el mapeo | Primera columna fija, fondo opaco, separación visual y texto que puede partirse |
| Columnas Estado y Campo comprimidas por los años | Anchos mínimos explícitos y desplazamiento propio |
| Análisis vertical/horizontal tenía una fila de botones rígida | Grupo que admite varias líneas |
| Botones de ejemplos y descarga podían exceder el ancho móvil | Acciones flexibles y botones con ancho máximo y texto que puede partirse |
| Supuestos DX de varias columnas dejaban poco espacio para etiquetas y cifras | Una columna móvil; rejilla de formularios adaptada |
| Tablas históricas/proyectadas largas podían crecer con la página | Ancho intrínseco dentro del contenedor con desplazamiento propio |
| Pasos de DX demasiado apretados a 375 px | Lista que admite varias líneas |
| Cabecera y firma del documento no cabían juntas en móvil | Cabecera y pie flexibles con salto de línea; relleno móvil reducido |
| Tablas y direcciones de fuentes del documento podían desbordar | Tablas con desplazamiento propio y direcciones que se parten |

## Decisiones

1. No se duplicaron fórmulas financieras en el generador. Las conclusiones formatean exactamente los resultados recibidos.
2. Se usa el formato colombiano existente. Las cantidades monetarias conservan dos decimales y las tasas se presentan como porcentaje.
3. La vista previa es una hoja continua con «Página 1 de 1»; el PDF pagina físicamente según su contenido y lleva X de Y real. Ambos comparten contenido, cifras, tablas y jerarquía.
4. Los PDF de Tasas y TVM indican que sus entradas son del usuario y no atribuyen sus tasas a fuentes de mercado. En créditos IBR/UVR/USD se cita la fuente de referencia aplicable; capital y modelo conservan las fuentes de los supuestos de mercado.
5. Se mantiene el corte de mercado en todos los encabezados, incluso cuando el cálculo utiliza exclusivamente entradas del usuario.
6. Se conserva el fallback de fuente local del sitio y se usa Helvetica para PDF. No se descargaron fuentes.
7. Se actualizó la comprobación antigua de «Memo TXT» en la regresión DX para exigir PDF, Excel y título de memo, y la ausencia del TXT. El primer intento de la suite detectó esa expectativa obsoleta; las ejecuciones finales pasan.
8. Los errores de carga y notas visibles evitan nombres de archivos de datos y jerga interna. La documentación auxiliar usa etiquetas descriptivas; sus destinos y operaciones se conservan.
9. La revisión solicitada de 375/1280 px se realizó por código. La conversión canvas de los símbolos está implementada para el navegador; las pruebas PDF obligatorias se ejecutaron en Node sin logos ni canvas.

## Verificación final

Todos los comandos terminaron con código 0; lint sin errores ni advertencias.

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Correcto |
| `npm run build` | Compilación, TypeScript y exportación estática correctos |
| `npm test` | DX, 16 formatos, 95 comprobaciones financieras, calculadora y nuevos documentos correctos |

La nueva prueba `src/lib/__tests__/documento.cjs`, incorporada a `npm test`, arma y genera los cinco PDF sin canvas. Busca en `doc.output()` marca, título, conclusión completa (reuniendo líneas PDF), cifra correcta y «Página 1 de»; comprueba número de páginas positivo, tamaño carta y pie en cada página. También revisa la vista previa, nombres saneados, todos los pies Excel, variantes de crédito y proyecto, y paginación extensa.

| Caso obligatorio | Resultado comprobado |
| --- | --- |
| Capital, sector 47, Mediana | WACC COP nominal 15,42 %; conclusión igual al resultado |
| Crédito 100.000.000, 240 cuotas, tasa periódica 0,011666666666655168 | Cuota 1.243.520,81; 241 filas completas en Excel |
| Brigham 10-5, proyecto S (A), k = 12 % | VPN 814,33 |
| Conversión 14 % NAMV a EM | 1,17 %, conservando precisión interna |
| TVM, presente −1.000, 4 periodos, tasa 10 %, incógnita cuota | 315,47 |

### Salida de lint

```text
> web@0.1.0 lint
> eslint
Código de salida: 0. Sin errores ni advertencias.
```

### Salida completa de las pruebas

```text
> web@0.1.0 test
> npm run test:dx && npm run test:formatos && npm run test:finanzas && npm run test:calc && npm run test:documento


> web@0.1.0 test:dx
> node src/lib/dx/__tests__/regression.cjs

{
  "legacy": {
    "gao": 1.4587436586093703,
    "ebitStar": 22823.50009999991,
    "eva2025": 19205.720567104225,
    "wacc": 0.06447740237351589
  },
  "api": {
    "sector": "Servicios de información",
    "gao": 1.4587436586093703,
    "ebitStar": 6011.230474860344,
    "eva2025": 16913.27703818495,
    "wacc": 0.1134309040267494,
    "kdUSD": 12.642178770949752
  },
  "deltaEVA": -2292.4435289192734,
  "sheets": [
    "Portada",
    "Supuestos",
    "Balance",
    "PyG",
    "Indicadores",
    "WACC",
    "FCL Histórico",
    "FCL Proyectado",
    "Apalancamiento",
    "UPA",
    "EVA",
    "Riesgo",
    "Calidad y mapeo"
  ],
  "formulaCount": 935
}
OK: regresión Visa, dos empresas, ExcelJS 13 hojas, fórmulas, fallback Kd, null y formato.

> web@0.1.0 test:formatos
> node src/lib/dx/__tests__/formatos.cjs

OK    construccion_v1_supersociedades.xlsx   2024–2025  miles     COP  WACC 15.87 % alertas 4  «construccion v1 supersociedades» 
OK    construccion_v2_fechas_excel.xlsx      2024–2025  miles     COP  WACC 15.87 % alertas 4  «construccion v2 fechas excel» 
OK    grande_v1_supersociedades.xlsx         2024–2025  miles     COP  WACC 16.64 % alertas 1  «grande v1 supersociedades» 
OK    grande_v2_fechas_excel.xlsx            2024–2025  miles     COP  WACC 16.64 % alertas 1  «grande v2 fechas excel» 
OK    ingles_v6_usgaap.xlsx                  2024–2025  millones  USD  WACC 12.12 % alertas 0  «ACME Industrial Inc. (US$ millions)» 
OK    perdidas_v1_supersociedades.xlsx       2024–2025  miles     COP  WACC 15.87 % alertas 3  «perdidas v1 supersociedades» 
OK    perdidas_v2_fechas_excel.xlsx          2024–2025  miles     COP  WACC 15.87 % alertas 3  «perdidas v2 fechas excel» 
OK    puc_v5_codigos.xlsx                    2024–2025  miles     COP  WACC 14.51 % alertas 0  «puc v5 codigos» 
OK    pyme_v1_supersociedades.xlsx           2024–2025  miles     COP  WACC 15.64 % alertas 0  «pyme v1 supersociedades» 
OK    pyme_v2_fechas_excel.xlsx              2024–2025  miles     COP  WACC 15.64 % alertas 0  «pyme v2 fechas excel» 
OK    pyme_v3_una_hoja.xlsx                  2024–2025  miles     COP  WACC 15.64 % alertas 0  «COMERCIALIZADORA DEL NORTE S.A.S.» 
OK    pyme_v4.csv                            2024–2025  miles     COP  WACC 15.64 % alertas 0  «pyme v4» 
OK    pyme_v7_ansi.csv                       2024–2025  miles     COP  WACC 15.64 % alertas 0  «pyme v7 ansi» 
OK    pyme_v8_tab.csv                        2024–2025  miles     COP  WACC 15.64 % alertas 0  «pyme v8 tab» 
OK    sin_deuda_v1_supersociedades.xlsx      2024–2025  miles     COP  WACC 15.64 % alertas 1  «sin deuda v1 supersociedades» 
OK    sin_deuda_v2_fechas_excel.xlsx         2024–2025  miles     COP  WACC 15.64 % alertas 1  «sin deuda v2 fechas excel» 

16/16 archivos leídos correctamente.

> web@0.1.0 test:finanzas
> node src/lib/finanzas/__tests__/finanzas.cjs

OK: 95 comprobaciones de la calculadora financiera (tasas, TVM, amortización, proyectos, FCL).

> web@0.1.0 test:calc
> node src/components/__tests__/calc.cjs

OK: 5 subsecciones React SSR; tasas, TVM y errores; comparación y SVG; créditos (4 sistemas, gracia, tasas variables, UVR); proyectos Flujos y Modelo; fórmulas recalculadas y cachés; cuota 315,4708; VPN S 814,33; DX Visa y nombre manual en 13 hojas; 9 ejemplos API idénticos al GET.

> web@0.1.0 test:documento
> node src/lib/__tests__/documento.cjs

OK PDF Memo de costo de capital: 2 páginas; cifra 15,42 %; conclusión completa y pie en todas las páginas.
OK PDF Conversión de tasas: 2 páginas; cifra 1,17 %; conclusión completa y pie en todas las páginas.
OK PDF Valor del dinero en el tiempo: 1 páginas; cifra 315,47; conclusión completa y pie en todas las páginas.
OK PDF Simulación de crédito: 2 páginas; cifra 1.243.520,81; conclusión completa y pie en todas las páginas.
OK PDF Evaluación de proyecto: 2 páginas; cifra 814,33; conclusión completa y pie en todas las páginas.
OK: 5 documentos, cifras exactas del cálculo, vista previa compartida, pies Excel, variantes y PDF multipágina sin canvas ni red.
Código de salida: 0.
```

### Salida del build

```text
> web@0.1.0 build
> node scripts/build.mjs

▲ Next.js 16.4.0 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 57ms

  Creating an optimized production build ...
✓ Compiled successfully in 4.2s
  Running TypeScript ...
  Finished TypeScript in 4.2s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 2.3s
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /api-docs
├ ○ /calculadora
└ ○ /tu-empresa


○  (Static)  prerendered as static content
Código de salida: 0.
```
