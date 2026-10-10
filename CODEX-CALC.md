# Tarea para Codex · Calculadora financiera y nombre de la empresa (solo lo visual)

Continúa el trabajo de `CODEX-NEXTJS.md` en `web/` (lee también `web/CODEX-NEXTJS-RESULTADO.md`). Mirage ya está publicado. Ahora hay una **segunda API**, la calculadora financiera, y tu trabajo es la interfaz. Los cálculos ya están hechos y validados: tú **no** implementas fórmulas financieras nuevas en la interfaz.

## Reglas duras

1. Trabaja solo en `web/`. **No modifiques**:
   - `web/src/lib/finanzas/` (motor de la API 2, validado con 95 pruebas);
   - `web/api/` (funciones de Vercel);
   - `web/public/api/` (API 1, generada);
   - `web/vercel.json`.

   Si necesitas algo de ellos, anótalo en tu informe.
2. No instales paquetes ni uses la red. No despliegues, no hagas commits, no abras navegador.
3. Las vistas siguen siendo tres: **WACC**, **CALC** y **DX**. La calculadora financiera vive **dentro de CALC** como subsecciones.
4. Todo cálculo sale de `@/lib/finanzas` (importa `index.ts`). La interfaz solo arma la entrada, llama al motor y muestra el resultado. Los errores del motor (`ErrorFinanciero`) se muestran como mensaje en la interfaz, nunca como pantalla rota.
5. Sigue la convención de tonos de `estilo.json`, como en los talleres de Gerencia Financiera:
   - `insumo`: datos que digita el usuario.
   - `clave`: resultado principal.
   - `sube`/`baja`: valores positivos o negativos relevantes (VPN, FCN).
   - `nota`: fuentes.
   - `alerta`: advertencias (por ejemplo TIR múltiple o deuda sin pagar dentro del horizonte).

## 1. Nombre de la empresa en todo lo que se descarga

- **DX:**
  - Campo "Nombre de la empresa" visible y editable antes de generar el informe. Es obligatorio para descargar; si está vacío, se pide.
  - El nombre aparece en:
    - el título del informe en pantalla y en la versión impresa;
    - la portada o encabezado de cada una de las 13 hojas del Excel;
    - las propiedades del archivo (`workbook.title`, `creator: "Mirage · HyperTarget"`);
    - el **nombre del archivo** (`Mirage-DX-<empresa>-<fecha>.xlsx`, sin caracteres inválidos).
- **Detección automática del nombre:** hoy toma títulos de hoja como "SUPUESTOS PARA EL MODELO DE FLUJO DE CAJA LIBRE".
  - Solo propone un nombre si la celda parece un nombre de empresa (no mayúsculas largas con palabras como "SUPUESTOS", "MODELO", "ESTADO", "BALANCE", "FLUJO", "ANÁLISIS", "PYG").
  - Si no, propone el nombre del archivo, limpio.
- **CALC y WACC:** campo opcional "Empresa o proyecto". Si se llena, sale en el memo TXT, en los XLSX y en el nombre de los archivos.

## 2. CALC: subsecciones

Navegación interna con pestañas accesibles (`role="tablist"`), con el estado en la URL (`/calculadora/?seccion=creditos`) para poder compartir enlaces. En móvil, las pestañas se desplazan horizontalmente. Las subsecciones son:

| Subsección | Qué hace | Motor |
|---|---|---|
| **Costo de capital** | La calculadora actual. Al elegir sector y tamaño, precarga **D/E y tarifa típicos del sector** (de `sectores.json`) para que no arranque con resultados vacíos. Los campos se pueden editar. | `calculadora.ts` (ya existe) |
| **Tasas** | Convierte una tasa entre códigos (EA, EM, NAMV, NATV, NAMA…) y muestra la tabla de equivalencias de las 8 frecuencias: periódica vencida, nominal vencida, nominal anticipada y periódica anticipada. Incluye ayuda corta sobre la nomenclatura colombiana. | `convertir`, `equivalencias`, `PERIODOS` |
| **Valor del dinero** | Réplica de la hoja TVM del profesor: cinco campos (P, F, A, n, i), vencida o anticipada. El usuario marca **una** incógnita con un botón "?" y se resuelve. Signos: egreso negativo, ingreso positivo; un campo vacío es cero. Incluye un selector para traer i desde una tasa (EA → periódica) y el ayudante de número de cuotas (`nCuotas`). | `resolver`, `nCuotas`, `convertir` |
| **Créditos** | Ver abajo. | `amortizar`, `compararSistemas` |
| **Proyectos** | Ver abajo. | `indicadores`, `tasaCruce`, `perfilVPN`, `modeloProyecto` |

### Créditos
- **Entradas:**
  - valor del activo, % de cuota inicial (monto = valor × (1 − %));
  - plazo en años y frecuencia de pago (`PERIODOS`);
  - tasa con su código (se convierte a la periódica de la frecuencia con `convertir`);
  - sistema (los 4 de `SISTEMAS`), gracia y fecha de desembolso.
- **Tipo de tasa:**
  - **Fija.**
  - **IBR + spread:** toma el IBR de `public/api/v1/indicadores.json` (`ibr_1m`, `ibr_3m`, `ibr_6m`; su `codigo_tasa` dice la convención), le suma el spread nominal y lo pasa a periódica. Ofrece "ajuste en la última cuota" o "recalcular cuota".
  - **UVR:** el usuario da el valor UVR del día (con enlace a la serie del Banco de la República) y la inflación esperada. Por defecto, la `inflacion_cop` de `parametros.json`, con su alerta.
  - **USD:** la TRM se toma de `indicadores.json` y la devaluación esperada la da el usuario.
- **Salida:**
  - cuota, total de intereses, total pagado y costo efectivo anual (y en pesos si está indexado);
  - controles (saldo final cero);
  - la tabla con las columnas del profesor: Periodo, Fecha, Ingreso, Egreso, FCN, Saldo inicial, Tasa, Intereses, Abono a capital, Saldo final (y Índice y valores en pesos si aplica).
- **Botón "Comparar los 4 sistemas":** tabla resumen y gráfico SVG simple del saldo en el tiempo para los 4 sistemas.
- **Excel con exceljs, con fórmulas vivas al estilo del profesor:**
  - hoja "Datos" con celdas con nombre (`Principal`, `nCuotas`, `TasaPer`, `Cuota`);
  - hoja "Amortización" como **tabla de Excel** (`ws.addTable`) con referencias estructuradas, por ejemplo `=[@[Saldo Inicial]]*TasaPer`;
  - valores en caché iguales a los del motor;
  - tonos aplicados: insumos en arena, cuota y costo en dorado, FCN negativos en rojo;
  - una hoja "Controles" con `ΣAbonos = Principal` y saldo final = 0, que devuelvan VERDADERO.

### Proyectos
- **Modo "Flujos":**
  - el usuario pega o escribe los flujos de uno o dos proyectos (A y B), la tasa k y, opcionalmente, una tasa de reinversión;
  - **muestra:**
    - VPN, TIR (con alerta si `tirMultiple`), TIRM, IR, VAE, recuperación simple y descontada, y la decisión;
    - tasa de cruce si hay dos proyectos;
    - perfil del VPN como gráfico SVG con ambos proyectos y la tasa de cruce marcada.
  - Incluye el ejemplo precargado "Brigham 10-5 (S y L)" para probar.
- **Modo "Modelo de flujo de caja"** (plantilla "Formulación de Proyectos" del profesor):
  - **Entradas:** horizonte, ventas año 1, crecimiento, costo de ventas %, gastos de administración y ventas %, gastos fijos, activos (tabla editable nombre/valor/vida útil), diferidos, KTNO % de ventas, impuesto (por defecto `tasa_impuesto` de la API), valor de salvamento y tramos de deuda (nombre, %, tasa EA, plazo, sistema).
  - **TMRR:** por defecto el Ke del sector elegido en `sectores.json`.
  - **CK:** se elige entre "calcular con la estructura" (por defecto) y "usar el WACC del sector (Mirage)".
  - **Salida:**
    - estado de resultados y FCL año por año, con estructura de capital y tabla de depreciación;
    - las **tres evaluaciones** de `evaluaciones`, cada una con VPN, TIR y TIRM;
    - EVA por año, con tonos `sube`/`baja`;
    - controles en `alerta` si la deuda no se paga dentro del horizonte.
- **Excel de proyectos:** hojas "Supuestos", "FCL" (fórmulas vivas que recalculan el FCL desde los supuestos), "Deuda", "Evaluación" (`VNA`, `TIR` y `TIRM` de Excel sobre los rangos del FCL) y "Controles".

## 3. Documentación de la API en la interfaz

- En el pie, un enlace "API" que abre una pequeña página estática `/api-docs/`. No es una cuarta vista de navegación.
- La página explica:
  - la API 1, con los archivos de `/api/v1/` y el contrato de celda;
  - la API 2: `GET /api/calc` lista las operaciones y `POST /api/calc/<operacion>` recibe JSON. Pon un ejemplo con `curl` por operación, tomado del `GET`; lee el archivo `web/api/calc/[op].ts` para sacar las operaciones y sus ejemplos.

## 4. Verificación obligatoria

1. `npm run lint`, `npm run build`, `npm run test:dx` y `node src/lib/finanzas/__tests__/finanzas.cjs` sin errores. Agrega un script `test:finanzas` y un `test` que corra ambos.
2. Escribe `web/src/components/__tests__/calc.cjs`. Debe:
   - renderizar cada subsección con React del servidor, como en la prueba del DX;
   - generar los dos Excel (créditos y proyectos) con exceljs;
   - leerlos de vuelta y comprobar:
     - que las hojas, tablas, nombres y fórmulas existen;
     - que los valores en caché coinciden con el motor: cuota 315,4708 para 1.000 al 10 % en 4 cuotas, y VPN de S 814,33 en Brigham 10-5.
3. Comprueba que el nombre de la empresa aparece en el archivo y en las hojas del DX, con el ejemplo de Visa y un nombre puesto a mano.
4. Escribe `web/CODEX-CALC-RESULTADO.md` con:
   - qué hiciste;
   - las decisiones que tomaste;
   - la salida de las pruebas y del build;
   - los pendientes.
