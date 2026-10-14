# Tarea para Codex · La ficha de sector como anatomía del Ke, y el Ke por tamaño en la tabla

Trabajas en `web/` (Next.js, exportación estática). Lee antes `web/CODEX-NEXTJS-RESULTADO.md`, `web/CODEX-AJUSTES-RESULTADO.md` y `web/CODEX-JEV-CALC-RESULTADO.md`. La vista a modificar es `src/components/Wacc.tsx` (página principal, "Costo de capital").

## Por qué

Mirage se va a mostrar a profesores de finanzas y a auditores. Su activo es la calidad del Ke. Hoy la tabla muestra cifras y la ficha de sector ("Ver sector →") las repite. Esta tarea convierte la ficha en **evidencia**: que cualquiera vea de dónde sale cada punto del Ke. Y deja que una pyme vea **su** tasa según su tamaño. No es una función nueva de cálculo: todos los datos ya vienen en la API.

## Datos nuevos en la API (ya generados en `public/api/v1/sectores.json`)

Cada sector trae:

- `ke_anatomia`: `rf`, `beta_por_erp`, `crp`, `ke_usd`, `ajuste_fisher` (en pp, formato `pp`) y `ke_cop`. Se cumple `rf + beta_por_erp + crp = ke_usd` y `ke_usd` + Fisher = `ke_cop`. Ejemplo, CIIU 62: 5,13 % + 7,01 % + 3,20 % = 15,34 %; +3,68 pp; Ke COP 19,02 %.
- `por_tamano[Micro|Pequeña|Mediana|Grande]`: además de `empresas`, `beta_apalancada`, `de`, `kd`, ahora `ke` y `wacc_cop_nominal`. Son `null` cuando el tamaño tiene menos de 10 empresas.

Actualiza los tipos en `src/lib/api.ts` (campos nuevos; `ke_anatomia` y los nuevos de `Tamano` opcionales, para no romper cortes viejos del histórico).

## 1. Ficha de sector = anatomía del Ke

Al abrir un sector, la ficha debe mostrar, en este orden:

1. **Encabezado:** CIIU, nombre, número de empresas colombianas detrás y el Ke COP del sector como cifra protagonista.
2. **Anatomía del Ke a escala:** una barra horizontal apilada con cuatro segmentos (Rf, βL × ERP, prima país, ajuste de Fisher), cada ancho proporcional a su valor sobre el Ke COP. Debajo, una fila por pieza con valor, fuente y fecha de corte (tómalas de `parametros`: cada celda trae `fuente` y `corte`). Para βL × ERP muestra "βL 1,6573 × ERP 4,23 %". Cierra con la fila del Ke COP. Hazlo con HTML/CSS (flex), sin librerías nuevas; que se lea en modo claro y oscuro con los tonos de `estilo.json`.
3. **De dónde sale la beta:** βu del sector (ancla Damodaran, industria `damodaran.industria`), D/E mediano colombiano con su rango p25–p75 (`de_rango`), βL resultante, y la comparación con Damodaran: "Con la deuda de las emergentes de Damodaran, la βL sería X" (usa `damodaran.beta_apalancada`) y la diferencia (`damodaran.diferencia_mirage_vs_damodaran`). Muestra cuántas empresas tiene el ancla y qué porcentaje es de América Latina (`damodaran.pct_latam`); si la celda trae tono `alerta`, muéstralo como alerta con su nota.
4. **Por tamaño:** tabla Micro / Pequeña / Mediana / Grande con empresas, βL, D/E, Kd, Ke y WACC. Las celdas `null` se muestran como "—" con la nota "menos de 10 empresas".
5. **Kd:** Kd del sector, monto desembolsado (`kd_monto_desembolsado`) y la ventana (`metodo.ventana_kd`).
6. Conserva lo que ya tiene la ficha (fuentes, método, descargas) debajo.

No muestres la beta total ni el rango de la beta desapalancada (es un solo valor repetido).

## 2. Ke por tamaño en la tabla principal

Agrega un selector "Tamaño" junto a los de moneda (COP/USD) y modalidad (nominal/real), con: "Todo el sector" (por defecto), "Micro", "Pequeña", "Mediana", "Grande".

- Con "Todo el sector" la tabla es la de hoy.
- Con un tamaño, las columnas βL, D/E, Kd, Ke y WACC muestran los valores de `por_tamano[tamaño]`, y la columna "Empresas" el número de ese tamaño. Las filas sin dato muestran "—", se ordenan al final y el contador ("61 de 61 sectores") dice cuántos sectores tienen dato para ese tamaño.
- Para el WACC por tamaño en USD o en real, conviértelo con las mismas fórmulas que ya usa la tabla para el sector (Fisher con `inflacion_cop` e `inflacion_usd`). No dupliques fórmulas: reutiliza la función existente.
- El rango p25–p75 solo se muestra con "Todo el sector".
- El CSV, el Excel y el documento PDF de la tabla deben respetar el tamaño elegido y decirlo en el título y en los supuestos ("Tamaño: Pequeña").
- La frase bajo los filtros debe decir qué se está viendo, por ejemplo: "Pequeñas empresas: βL, D/E, Kd, Ke y WACC de la mediana de su tamaño."

## Reglas duras

1. **No modifiques**: `src/lib/finanzas/`, `src/lib/dx/` (salvo pruebas si una exige el comportamiento anterior), `api/`, `public/api/`, `vercel.json`, nada fuera de `web/`.
2. No instales nada, no uses la red, no despliegues, no hagas commits.
3. Texto visible en español claro, sin jerga interna ("API", "JSON", "motor"). Fechas como "Datos de mercado al <fecha>".
4. Accesible: la barra de la anatomía lleva `role="img"` y un `aria-label` con las cifras; el selector tiene etiqueta; foco visible.
5. Debe verse bien a 375 px y a 1280 px (revisa por código; la barra no puede desbordar; la tabla por tamaño con desplazamiento propio).
6. `npm run lint`, `npm run build` y `npm test` deben pasar. Agrega pruebas: la suma de la anatomía coincide con `ke_cop` (tolerancia 0,0002) para los 61 sectores; el selector de tamaño cambia los valores; el documento dice el tamaño.

## Entrega

Escribe `web/CODEX-FICHA-KE-RESULTADO.md` con: archivos tocados, decisiones, resultado de lint/build/test y lo que no pudiste verificar.

## Corrección tras la revisión (13-oct)

Revisado en el navegador con el sitio construido: la barra de la anatomía no está a escala. En CIIU 62 los segmentos miden 7, 9, 4 y 477 px de 497 px. Causa: `rf`, `beta_por_erp` y `crp` vienen como fracción (0,0513) y `ajuste_fisher` viene en puntos porcentuales (3,68, formato `pp`). Para los anchos, convierte el ajuste a fracción (÷100) antes de calcular las proporciones; los cuatro anchos deben sumar el Ke COP. Agrega a `src/components/__tests__/wacc.cjs` una prueba de que cada ancho relativo coincide con su pieza (Rf/Ke ≈ 0,27 en CIIU 62). Además, en "βL × ERP" muestra la βL con 4 decimales (1,6573), como en el resto de la ficha. Actualiza `web/CODEX-FICHA-KE-RESULTADO.md` con esta corrección.

## Segunda revisión (13-oct, navegador sobre el build)

La barra ya está a escala (CIIU 62: 134/183/84/96 px de 497). Quedan tres errores:

1. **Plural.** Con "Pequeña" la frase dice "Pequeñass empresas: …". Usa un mapa explícito de etiquetas: Micro → "Microempresas", Pequeña → "Pequeñas empresas", Mediana → "Medianas empresas", Grande → "Grandes empresas". No concatenes "s".
2. **Rango con tamaño.** Con un tamaño elegido, la columna WACC de la tabla todavía muestra el rango del sector (CIIU 62 con Pequeña: "18,80 %–18,94 %"). Con tamaño elegido no se muestra ningún rango, ni en pantalla ni en CSV/Excel/PDF. Agrega la aserción a `wacc.cjs`.
3. **Variación en cero.** En la ficha, "Kd del sector: 20,78 %" se acompaña de "▲ Sube 0,00 %", pero la celda trae `var: {v: 0.0, tono: "neutro"}`. Cuando `var.tono` es `neutro` (o `|var.v|` es 0), no muestres flecha ni "Sube/Baja"; como máximo "Sin cambio frente al corte anterior". Revisa dónde se pinta la variación (probablemente `Cifra.tsx`) y que aplique igual en tabla y ficha.

Mismas reglas duras. Esta vez ejecuta `npm run lint`, `npm run build` y `npm test` antes de terminar y reporta el resultado en `web/CODEX-FICHA-KE-RESULTADO.md`.
