# Mirage en Next.js · Resultado

Trabajo realizado el 10 de octubre de 2026. Se modificaron y crearon archivos únicamente dentro de `web/`. No se modificaron la API generada, los archivos originales del sitio ni los Markdown existentes. Los cambios que ya existían fuera de `web/` se dejaron intactos. No se instalaron paquetes, no se desplegó, no se hicieron commits ni se abrió navegador. La implementación y las verificaciones se realizaron con archivos y dependencias locales.

## Implementación

- Tres vistas: `/` (WACC), `/calculadora/` (CALC), `/tu-empresa/` (DX), en ese orden. Las rutas de error que aparecen en el build son internas de Next.js.
- `next.config.ts`: exportación estática, `trailingSlash: true` e imágenes sin optimización. Se quitaron `cacheComponents` y `partialPrefetching` para no interferir con la exportación. No hay API routes, server actions, middleware ni cálculos de mercado en el servidor.
- Contrato TypeScript, carga con `fetch`, URL base `NEXT_PUBLIC_MIRAGE_API` (por defecto `/api/v1`), formateador colombiano único y variables CSS derivadas de `estilo.json` en `src/lib/api.ts`. Sólo este módulo carga los JSON en producción.
- `Cifra`: formato, tono, variación con flecha, nota/fuente/corte accesibles por teclado y tooltip. Los valores ausentes se muestran con raya y explicación. Los tonos de todas las cifras y del Excel proceden de la API.
- Barra oscura, símbolo Mirage, códigos de navegación, pie con HyperTarget, aviso legal y fuentes/licencias. Navegación inferior móvil, foco visible, tablas con encabezados, enlaces para saltar al contenido y panel de sector con control de foco y Escape. CSS con adaptación a 375 px. Se revisó la captura local de `qa/fintarget-inicio.png` como referencia; no se abrió navegador.
- WACC: parámetros con fuentes/cortes, alerta de inflación COP visible, 61 sectores, búsqueda con o sin acentos, ordenamiento de todas las columnas, COP/USD y nominal/real, barras p25–p75, desglose por los cuatro tamaños, representatividad del ancla Damodaran y pasos del método. CSV y ExcelJS con formato, hojas Fuentes, Método y Variaciones.
- CALC: sector, tamaño, deuda, patrimonio, EBIT, gastos financieros y tarifa; Hamada, CAPM, Fisher y WACC COP/USD. Kd observado por tamaño con fallback al sector. Beta total y advertencia de la API. Memo TXT y XLSX con insumos, resultados y parámetros/fuentes.
- DX: SheetJS sólo para lectura local de Excel/CSV; detección de años, mapeo revisable, empresa/moneda/unidades/país/sector/tamaño. Balance y PyG con valores, vertical, horizontal, índice y CAGR; indicadores y DuPont, WACC, FCL histórico/proyectado, DCF y sensibilidad, apalancamiento, UPA, EVA y riesgo. Supuestos de escenarios editables, informe imprimible y aviso de confidencialidad. Los archivos cargados no se transmiten: el único `fetch` de DX lee ejemplos locales.
- Port de las fórmulas del DX original a `src/lib/dx/engine.ts`; escritura reemplazada por ExcelJS, con fórmulas y resultados en caché, 13 hojas, encabezados oscuros, insumos arena, resultados dorados y variaciones horizontales verdes/rojas. Fuentes y método se incorporan a Calidad y mapeo para mantener exactamente 13 hojas.
- Símbolo y los dos ejemplos copiados byte por byte. Los JSON de la API se conservaron byte por byte también en el export.
- `scripts/build.mjs` desactiva la telemetría de Next.js para los builds. No usa fuentes externas ni descargas. `npm run test:dx` ejecuta la regresión sin instalar herramientas.

## Estructura relevante

```text
web/
  next.config.ts
  package.json
  scripts/build.mjs
  src/
    app/
      layout.tsx
      globals.css
      page.tsx
      calculadora/page.tsx
      tu-empresa/page.tsx
    components/
      Mirage.tsx
      Cifra.tsx
      Wacc.tsx
      Calculadora.tsx
      Diagnostico.tsx
    lib/
      api.ts
      calculadora.ts
      excel.ts
      dx/
        engine.ts
        defaults.ts
        types.ts
        __tests__/regression.cjs
  public/
    api/v1/                 # generado, no editado
    mirage-symbol-black.svg
    ejemplos/
      Visa-2021-2025.xlsx
      PYME-Confecciones-del-Caribe.xlsx
  out/                      # export estático
  build-output.txt
  CODEX-NEXTJS-RESULTADO.md
```

## Decisiones sobre datos y fórmulas

1. La API no contiene WACC USD real. El conmutador sigue disponible y muestra `—` con nota; no se deriva una nueva cifra de mercado. Los rangos p25–p75 publicados sólo corresponden a COP nominal, y se etiquetan así tanto en pantalla como en las descargas. Ke y Kd de la tabla también se etiquetan COP nominal.
2. La API no contiene prima por tamaño. CALC muestra la limitación y resultados ausentes cuando se solicita esa prima. DX usa prima cero como escenario sin prima y permite un supuesto explícito del usuario; no reutiliza la prima fija de la maqueta.
3. CRP Mirage ya incorpora spread × λ. CAPM suma CRP una vez. En DX la variable de exposición país se mantiene como 1 para Colombia y 0 fuera de Colombia; no se vuelve a multiplicar por la volatilidad relativa de mercado.
4. DX toma Kd observado del sector/tamaño, convertido de COP a USD con Fisher, y lo alimenta al canal de Kd del modelo y del Excel original. Se conservan los umbrales de rating por cobertura, pero se eliminan sus spreads fijos como insumo de mercado. Los coeficientes de Altman, rating analítico y probabilidad de incumplimiento se conservan como fórmulas del DX original.
5. Se eliminó la TRM fija de 4.000. Para cifras COP se ofrece una TRM opcional del usuario. Sin ella, los resultados de riesgo que dependen del tamaño en USD quedan sin valor. No se inventa un tipo de cambio ausente de la API.
6. Las proyecciones iniciales parten del CAGR y márgenes del archivo; el crecimiento perpetuo parte de la inflación USD publicada y es editable. Los supuestos de financiación, porcentaje fijo de gastos y estimación de acciones se identifican como escenarios del usuario y conservan las reglas de inicialización empresarial del DX original. No son datos de mercado.
7. El índice de cuentas del motor se cambió a WeakMap por empresa para evitar que cargas sucesivas con el identificador MI compartan datos.
8. Se mantiene la conversión de partidas ausentes a cero del port original; el mapeo muestra una nota cuando falta un valor y el informe incluye los controles de datos. No se alteraron las fórmulas de GAO, GAF, GAT, UPA, EVA, FCL o DCF.

## Verificación y regresión

`npm run lint`: exit 0, sin errores ni advertencias.

`npm run build`: exit 0; TypeScript pasa y se generan `out/index.html`, `out/calculadora/index.html`, `out/tu-empresa/index.html`. Los cuatro JSON principales y el histórico se copiaron al export sin diferencias de bytes. Los ejemplos y el símbolo también coinciden con sus originales.

`npm run test:dx`: exit 0. La prueba no necesita Jest, Vitest ni instalaciones: transpila con el TypeScript ya instalado. Comprueba formato colombiano y null, fallback de Kd, ausencia de prima por tamaño/USD real, dos archivos y aislamiento de empresas, renderizado React de las tres vistas con la API, escritura/lectura ExcelJS, 13 hojas y 934 fórmulas. Evalúa las cadenas de fórmulas vivas de GAO, UPA y EVA, además de comprobar los resultados en caché.

Con la fixture histórica de Visa, limitada a la prueba:

| Resultado | Calculado | Redondeado requerido |
|---|---:|---:|
| GAO | 1,4587436586 | 1,459 |
| EBIT de indiferencia | 22.823,5001 | 22.823,5 |
| EVA 2025 | 19.205,7206 | 19.206 |
| WACC | 6,4477402374 % | Referencia histórica |

Con los valores actuales de la API, sector CIIU 63 (Servicios de información), tamaño Grande, país de operación Estados Unidos y los escenarios iniciales derivados del archivo:

| Resultado | Calculado |
|---|---:|
| GAO | 1,4587436586 |
| WACC | 11,3430904027 % |
| EVA 2025 | 16.913,2770 |
| Diferencia EVA frente a referencia | −2.292,4435 |
| Kd observado convertido a USD | 12,6421787709 % |
| EBIT de indiferencia | 6.011,2305 |

La diferencia en EVA obedece al WACC: beta sectorial y Rf/ERP/Kd actuales de la API sustituyen la beta de regresión y tasas de la fixture antigua. La fórmula EVA sigue siendo NOPAT − WACC × capital invertido. El EBIT de indiferencia del escenario inicial también cambia porque usa deuda nueva al Kd observado y los supuestos iniciales de financiación/precio de emisión derivados del archivo; la fixture antigua fijaba financiación, precio e interés. GAO no usa insumos de mercado y se conserva.

Se calculó el contraste de todos los tonos de `estilo.json` sobre sus fondos o el fondo de página: mínimo 4,51:1 (nota), por encima de AA para texto normal. Esto no sustituye una inspección visual del sitio en un navegador.

Búsqueda equivalente a grep con `rg -n '[0-9]+([.,][0-9]+)?\s*%' src/components src/lib --glob '!engine.ts' --glob '!regression.cjs'`: sin coincidencias. No hay porcentajes de mercado literales en los componentes. Los porcentajes históricos sólo aparecen en la fixture de regresión. En el motor quedan formatos Excel (`0.00%`, `0.0%`, `0%`), unidades de conversión, coeficientes de fórmulas, límites de sensibilidad y reglas de escenarios (por ejemplo gastos fijos iniciales y financiación sobre activos), no tasas de mercado. No quedan etiquetas ni banner de datos ilustrativos en `src/`.

## Pendientes y límites

- **IBM Plex con `next/font/google`: pendiente.** No hay archivos IBM Plex locales en el proyecto ni en su caché de build. La guía local de Next explica que `next/font/google` necesita obtener los archivos en el build. Para respetar la regla dura de no usar red, no se ejecutó esa descarga ni se instaló nada. Se declaran IBM Plex Sans/Mono con fallback Arial/Consolas del sistema; no se afirma que estén empaquetadas. Hace falta disponer de sus archivos localmente o cambiar explícitamente la restricción de red para completar este punto del diseño.
- **Tipado estricto completo del port legado:** el motor conserva estructuras dinámicas del original con `@ts-nocheck` y la excepción ESLint limitada a ese archivo. API, calculadora y componentes pasan TypeScript; `Parsed` y el diccionario de cuentas tienen contrato. La regresión ejecutable cubre el motor, pero su tipado profundo queda pendiente como mejora técnica.
- La API debe publicar prima por tamaño y WACC USD real si se quieren cifras en esas opciones; las ausencias se muestran y no bloquean las demás funciones.
- No se hizo QA visual/interactiva en navegador, conforme a la prohibición. Se verificaron renderizado React, CSS responsive, semántica, foco implementado, contrastes, cálculos y artefactos; no se afirma haber probado clics ni la pantalla real a 375 px.

## Salida del build final

```text
> web@0.1.0 build
> node scripts/build.mjs

▲ Next.js 16.4.0 (Turbopack)
✓ Running next.config.ts took 89ms

  Creating an optimized production build ...
✓ Compiled successfully in 5.0s
  Running TypeScript ...
  Finished TypeScript in 7.5s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/6) ...
  Generating static pages using 7 workers (1/6) 
  Generating static pages using 7 workers (2/6) 
  Generating static pages using 7 workers (4/6) 
✓ Generating static pages using 7 workers (6/6) in 2.9s
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /calculadora
└ ○ /tu-empresa


○  (Static)  prerendered as static content
```
