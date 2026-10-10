# Calculadora financiera y nombre de empresa · Resultado

Trabajo realizado el 10 de octubre de 2026, exclusivamente dentro de `web/`.

## Reglas duras

- No se modificaron `src/lib/finanzas/`, `api/`, `public/api/` ni `vercel.json`. Se compararon los SHA-256 de sus 17 archivos: sin cambios. Los seis JSON de la API 1 también coinciden byte por byte con sus copias en `out/api/`.
- No se instalaron paquetes, no se usó la red, no se desplegó, no se hicieron commits y no se abrió navegador.
- Se mantienen las tres vistas principales WACC, CALC y DX. `/api-docs/` sólo se enlaza desde el pie.
- Los nuevos componentes llaman al índice `@/lib/finanzas`. El costo de capital conserva `lib/calculadora.ts`, como pide la tabla de motores de la tarea. No se agregaron fórmulas financieras al motor ni al renderizado de la interfaz. La interfaz prepara entradas, convierte unidades porcentuales, presenta resultados y agrega importes publicados por el motor para mostrar el total pagado en pesos.
- Los tonos de las cifras, los formularios, las alertas y los Excel proceden de `estilo.json` mediante `api.ts`, `Cifra`, variables CSS y `applyTone`.

## Implementación

### Identidad de los documentos

- DX permite editar «Nombre de la empresa» durante el mapeo y en el informe. Es obligatorio al generar, descargar e imprimir. El título visible e impreso usa ese nombre.
- Las 13 hojas DX incorporan el nombre en A1 y en el encabezado de impresión, sin desplazar celdas ni modificar las referencias financieras existentes.
- Los libros DX tienen `title: Mirage DX · <empresa>`, `creator: Mirage · HyperTarget` y recálculo al abrir. Los archivos se llaman `Mirage-DX-<empresa>-<fecha>.xlsx`.
- La detección automática rechaza títulos de estados y modelos, incluso si incluyen una sigla societaria. Acepta nombres breves con indicios de empresa y utiliza como alternativa el nombre del archivo sin extensión, separadores ni años.
- WACC y CALC tienen «Empresa o proyecto» opcional. Se incluye en memo TXT, títulos y hojas XLSX y nombres de archivo. WACC también lo incorpora en CSV. Créditos y proyectos reciben el nombre común de CALC.
- `lib/nombres.ts` centraliza la propuesta y el saneamiento de nombres; admite acentos y elimina caracteres inválidos para archivos.

### CALC

- Cinco pestañas con `tablist`, `tab`, `tabpanel`, selección ARIA, controles asociados, navegación por flechas/Home/End y desplazamiento horizontal en móvil. La URL conserva `?seccion=capital|tasas|tvm|creditos|proyectos`; se soportan enlaces directos y Atrás/Adelante. Las entradas se conservan al cambiar de pestaña.
- Costo de capital precarga D/E del tamaño con fallback al sector y patrimonio normalizado a 1. La tarifa proviene de `parametros.json`. Todo es editable; cambiar sector o tamaño vuelve a precargar los valores correspondientes. Se identifica claramente que son insumos normalizados, no estados financieros de una empresa real.
- Tasas convierte entre todos los códigos del motor, muestra las ocho frecuencias y las cuatro convenciones, e incluye ayuda de nomenclatura colombiana.
- TVM tiene P, F, A, n, i, una incógnita seleccionada con «?», anualidad vencida/anticipada, signos y campos vacíos como cero. Permite convertir una tasa a i y resolver dos de los tres campos del ayudante `nCuotas`.
- Créditos prepara principal desde activo/cuota inicial, plazo, frecuencia, tasa, sistema, gracia y fecha. Incluye tasa fija, IBR + spread nominal, UVR y USD. IBR admite una trayectoria futura opcional para probar ajuste final o recálculo; sin trayectoria mantiene la referencia del corte. UVR usa la inflación COP como supuesto inicial y muestra su alerta; USD toma la TRM de la API y solicita devaluación.
- Créditos muestra cuota, intereses, pagos y costo EA; para indexados también cuota/pagos/costo en pesos. Incluye controles, tabla completa con los campos del profesor, comparación de cuatro sistemas y SVG de saldos.
- Proyectos Flujos acepta A y B, k y reinversión opcional, indicadores completos, decisiones, alerta de TIR múltiple, cruce y SVG del perfil de VPN. El ejemplo Brigham 10-5 (S y L) se carga mediante un botón.
- Proyectos Modelo admite los supuestos solicitados, activos editables y tramos de deuda. TMRR parte del Ke del sector; CK usa estructura o WACC sectorial. Presenta estructura de capital, estado de resultados, depreciación/amortización y FCL anual, EVA y las tres evaluaciones. Advierte si las proporciones de deuda son inválidas o la deuda supera el horizonte.
- Los errores de entrada y `ErrorFinanciero` se muestran dentro de la interfaz con `role=alert`. Las descargas también capturan errores.

### Excel

- Créditos: hojas Datos, Amortización y Controles. Nombres `Principal`, `nCuotas`, `TasaPer`, `Cuota` y otros supuestos; tabla Excel `Credito` creada con `addTable`, referencias estructuradas, cuota y costo resaltados, FCN negativos en rojo e insumos en arena. Se exportan tasas por periodo e indexación cuando corresponden. Los controles comprueban suma de abonos y saldo final mediante fórmulas.
- Proyectos: Supuestos, FCL, Deuda, Evaluación y Controles, tanto en Flujos como en Modelo. El modelo recalcula ventas, costos, depreciación, diferidos, KTNO, salvamento, estructura, servicio de deuda, FCL y EVA desde los supuestos. La evaluación incluye las tres combinaciones de FCL y tasa del motor.
- Las fórmulas del formato XLSX se almacenan con nombres OOXML ingleses `NPV`, `IRR`, `MIRR`, `PMT`; Excel en español las presenta como `VNA`, `TIR`, `TIRM`, `PAGO`. Se guardan resultados en caché obtenidos del motor y se solicita recálculo al abrir. Una tasa sin solución conserva un error Excel en vez de inventar un cero.

### Documentación de las APIs

- `/api-docs/` explica los seis archivos de API 1, el contrato de celda y la base configurable.
- Explica GET/POST de API 2, respuestas y errores; tiene un ejemplo curl para cada una de sus nueve operaciones.
- `scripts/api-docs.cjs` obtiene las descripciones y ejemplos ejecutando el GET local de `api/calc/[op].ts` y escribe `src/lib/api-calc-docs.ts`. No hace solicitudes HTTP. La prueba compara ese contenido con el GET real para detectar documentación desactualizada.
- La documentación está presente en el HTML exportado y no depende de cargar la API en el navegador.

## Decisiones y limitaciones de datos

1. `sectores.json` no publica una tarifa de impuesto por sector o tamaño. Se utiliza `parametros.tasa_impuesto`, editable y explicado en CALC. Para disponer de tarifas sectoriales, la API tendría que publicarlas; no se modificó el artefacto protegido.
2. No se inventan IBR, TRM, UVR, Ke o WACC. Los IBR y la TRM se cargan exclusivamente desde `api.ts`; la UVR diaria es un dato del usuario con enlace a la serie del Banco de la República. Los datos ausentes se explican y bloquean solamente el cálculo que los necesita.
3. Horizonte inicial, vidas/plazos al añadir filas y valores cero son supuestos editables del formulario. Brigham y las fixtures numéricas son ejemplos académicos o de pruebas, no cifras de mercado.
4. Se encontró `next/font/google` activo en el layout, aunque el informe previo describía un fallback sin descargas. No hay fuentes locales. Se quitó esa descarga para respetar la regla de no usar red; CSS declara IBM Plex con respaldo Arial/Consolas y define las variables para que el fallback funcione.

## Verificación final

Todos los comandos terminaron con código 0:

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Sin errores ni advertencias |
| `npm run build` | Exportación estática; compilación y TypeScript correctos |
| `npm run test:dx` | Regresión Visa, dos empresas, 13 hojas y 934 fórmulas |
| `node src/lib/finanzas/__tests__/finanzas.cjs` | 95 comprobaciones correctas |
| `npm run test:calc` | Cinco subsecciones SSR, Excel de créditos/proyectos, fórmulas vivas, cachés y nombres |
| `npm test` | Ejecuta DX, finanzas y CALC; todos correctos |

`src/components/__tests__/calc.cjs` genera y vuelve a leer los libros con ExcelJS. Comprueba hojas, tabla, nombres y fórmulas; compara cachés con el motor y evalúa referencias vivas sin usar esos cachés. Modifica Principal, un flujo de Brigham y ventas del modelo para comprobar que las fórmulas responden al cambio. Cubre los cuatro sistemas de crédito, gracia, tasas variables, ambos modos de cuota e indexación UVR; compara FCL, FCL del inversionista, capital y EVA del modelo y sus evaluaciones.

Valores obligatorios comprobados:

- Crédito de 1.000, tasa periódica 10 %, cuatro cuotas: **315,47080370609083** (315,4708).
- Brigham S, tasa 12 %: VPN **814,33**, dentro de tolerancia de redondeo.
- Visa y «Empresa manual / Bogotá: SAS»: nombre en propiedades y en A1/encabezado de cada una de las 13 hojas; filename saneado con empresa y fecha.
- Regresión DX histórica: GAO 1,4587436586093703, EBIT de indiferencia 22.823,50009999991 y EVA 2025 19.205,720567104225. Se conservan los resultados previos con API actual: WACC 0,1134309040267494 y EVA 2025 16.913,27703818495.

Salida de las nuevas pruebas:

```text
OK: 95 comprobaciones de la calculadora financiera (tasas, TVM, amortización, proyectos, FCL).
OK: 5 subsecciones React SSR; tasas, TVM y errores; comparación y SVG; créditos (4 sistemas, gracia, tasas variables, UVR); proyectos Flujos y Modelo; fórmulas recalculadas y cachés; cuota 315,4708; VPN S 814,33; DX Visa y nombre manual en 13 hojas; 9 ejemplos API idénticos al GET.
```

Salida del build final:

```text
> web@0.1.0 build
> node scripts/build.mjs

▲ Next.js 16.4.0 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 56ms
  Creating an optimized production build ...
✓ Compiled successfully in 3.6s
  Running TypeScript ...
  Finished TypeScript in 5.4s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7)
  Generating static pages using 8 workers (3/7)
  Generating static pages using 8 workers (5/7)
✓ Generating static pages using 8 workers (7/7) in 2.5s
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /api-docs
├ ○ /calculadora
└ ○ /tu-empresa

○  (Static)  prerendered as static content
```

Se comprobó la existencia de las cuatro rutas HTML, el contenido prerenderizado de API, la identidad de los JSON exportados y los hashes de los archivos protegidos.

## Pendientes

- Para empaquetar IBM Plex hacen falta archivos de fuente locales. No se descargaron por la regla dura de no usar red.
- La tarifa sectorial requiere datos adicionales de la API; mientras tanto se utiliza la tarifa publicada en parámetros.
- No se realizó inspección visual ni interacción en navegador, conforme a la prohibición. Tampoco se abrió Excel de escritorio; se verificó el XLSX con lectura ExcelJS y evaluación de sus fórmulas en las pruebas locales.
- No hay instalación, despliegue o commit pendiente dentro de esta tarea: esas acciones estaban prohibidas.
