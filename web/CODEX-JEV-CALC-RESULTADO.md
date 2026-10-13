# Calculadora, documentos y decisiones de JEV · Resultado

Trabajo realizado el 11 de octubre de 2026 en `web/`.

## Implementación

- Se retiró «Empresa o proyecto (opcional)» de Costo de capital y de la calculadora, junto con el estado y las propiedades correspondientes. Ninguna de estas vistas pasa empresa a los documentos ni a las descargas. Se retiró también la línea de empresa de la vista previa, PDF y Excel del documento. `armarDocumento` conserva su argumento opcional para compatibilidad; los nombres PDF no incorporan empresa.
- Tasas inicia con 14 % NAMV a EM (1,17 %); Valor del dinero con P = −1.000, F = 0, cuatro periodos, i = 10 % y cuota como incógnita (315,47); Créditos con 100.000.000, veinte años, doce pagos al año y 14 % NAMV (cuota 1.243.520,81). Proyectos Flujos inicia con Brigham S y L, a 12 % (VPN A 814,33). Proyectos Modelo inicia con ventas de 1.000.000.000, crecimiento 5 %, costos 55 %, gastos 15 %, capital de trabajo 10 % y maquinaria de 520.000.000 con vida útil de diez años. Impuesto y TMRR conservan sus referencias de mercado y sector.
- Todos los ejemplos son editables. Las cinco subsecciones, los dos modos de Proyectos y la página de sectores muestran PDF y Excel desde su primera presentación válida.
- La página Costo de capital incorpora un documento de sectores y su PDF mediante `pdfDocumento`: beta sin deuda/con deuda, D/E, Ke, Kd, WACC, rangos, corte, método y fuentes. El documento y el Excel consumen las mismas filas filtradas y ordenadas de la tabla. Ambos respetan moneda y modalidad; Ke, Kd y rangos se identifican como COP nominal. CSV continúa disponible. Se retiró el memo TXT de esa página.
- `DocumentoMirage` consulta `decidir` después de 1,5 segundos sin cambios. Muestra discretamente «JEV está analizando…» mientras espera. Al cambiar las entradas, oculta la decisión anterior y descarta sus respuestas pendientes. Si la consulta falla, desaparecen el bloque y el estado de espera; el cálculo y las descargas continúan funcionando.
- «Decisión de JEV» muestra veredicto, decisión, recomendaciones y alertas. Los cuatro veredictos usan los tonos solicitados. El documento enriquecido se pasa a la descarga: PDF incluye la sección y Excel incluye una hoja «Decisión de JEV». Créditos y ambos modos de Proyectos conservan sus hojas, fórmulas y controles existentes y agregan la decisión antes de los pies. Si todavía no hay decisión, los archivos se generan sin esa sección.
- «¿A qué se dedica la empresa?» y «Que JEV elija» están disponibles sobre los selectores de la calculadora y en la página de sectores. La calculadora aplica sector y tamaño, actualiza los insumos normalizados y muestra el motivo. La página de sectores filtra por el código sugerido. El usuario conserva los controles manuales. Un fallo no produce mensajes de error; las respuestas correspondientes a una descripción anterior se descartan.
- Se conserva el campo y el motivo de JEV al cambiar sector/tamaño. Si el sector se cambia desde Proyectos, la calculadora de capital vuelve a precargar la estructura correspondiente sin remontar todo su formulario.

## Archivos editados por esta tarea

- `src/components/CalcSecciones.tsx`
- `src/components/Calculadora.tsx`
- `src/components/CalcTasas.tsx`
- `src/components/CalcCreditos.tsx`
- `src/components/CalcProyectos.tsx`
- `src/components/Wacc.tsx`
- `src/components/DocumentoMirage.tsx`
- `src/components/SelectorJev.tsx` (nuevo)
- `src/components/__tests__/calc.cjs`
- `src/lib/documento.ts`
- `src/lib/documento-excel.ts`
- `src/lib/calc-excel.ts`
- `src/lib/wacc-documento.ts` (nuevo)
- `src/lib/__tests__/documento.cjs`
- `src/lib/__tests__/jev.cjs` (nuevo, ejecutado desde `test:documento`)
- `CODEX-JEV-CALC-RESULTADO.md`

## Reglas duras

No se escribieron archivos de `api/`, `src/lib/dx/`, `src/components/Diagnostico.tsx`, `src/lib/excel.ts`, `src/lib/jev.ts`, `src/lib/finanzas/`, `public/api/`, `vercel.json` ni `package.json`. Tampoco se escribieron archivos fuera de `web/`. Esas rutas tienen cambios de otras personas; no se restauraron ni se atribuyen a este trabajo. No se instalaron dependencias, no se utilizó la red, no se desplegó y no se hicieron commits.

Los nuevos textos visibles están en español y nombran al asistente JEV. No se agregaron avisos sobre envío de datos. La aserción `dx.worksheets.length` permanece intacta, como exige la tarea.

## Verificación

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Código 0, sin errores. Tres advertencias en archivos protegidos de DX: dos variables no utilizadas en `formatos.cjs` y una directiva de ESLint innecesaria en `dashboard.ts`. |
| ESLint sobre los 15 archivos de código y pruebas editados | Sin errores ni advertencias. |
| `npm run build` | Código 0; compilación, TypeScript y exportación estática correctos. Rutas `/`, `/_not-found`, `/api-docs`, `/calculadora` y `/tu-empresa`. |
| `npm run test:finanzas` | Código 0; 95 comprobaciones. |
| `npm run test:calc` | Código 1 en la aserción DX protegida: el libro actual tiene 14 hojas y la prueba espera 13. Las comprobaciones anteriores de calculadora, ejemplos precargados, SSR, créditos/proyectos y fórmulas terminaron sin fallos. |
| `npm run test:documento` | Código 0; cinco documentos y sus PDF, variantes de crédito, proyecto Modelo, paginación y pies; incluye las pruebas nuevas de JEV. |

La primera ejecución de lint/build encontró una cadena sin cerrar en `api/jev/[op].ts`, que estaba siendo editado en paralelo. No se modificó ese archivo. Una ejecución posterior, después de la corrección externa, pasó.

Las pruebas nuevas simulan `fetch` y comprueban:

- El bloque aparece después de una respuesta simulada y de la espera de 1,5 segundos; cambiar antes de la espera cancela la consulta anterior.
- La misma entrada usa la caché y una respuesta pendiente de una entrada anterior no reaparece al cambiar los valores.
- El fallo de `fetch` oculta el bloque y la espera, conserva los botones y permite exportar sin decisión.
- El botón Excel recibe exactamente la decisión que se ve en el documento.
- Los cuatro veredictos muestran sus etiquetas y tonos.
- El selector entrega sector/tamaño y motivo; en un fallo vuelve a habilitar el botón sin mostrar el error. Sector y tamaño fuera de las opciones se descartan.
- Los PDF incluyen veredicto, decisión, recomendaciones y alertas cuando existen; los documentos sin decisión omiten la sección.
- Los Excel de capital, tasas, valor del dinero, créditos, ambos modos de proyectos y sectores se serializan y se vuelven a leer con ExcelJS; la hoja de decisión contiene los cuatro elementos y todos los pies se conservan.
- El documento y el Excel de sectores contienen únicamente el sector filtrado, para las cuatro combinaciones COP/USD y nominal/real, y generan archivos sin error.
- El SSR de cada subsección, del modo Modelo y de Costo de capital contiene ambos botones desde el inicio y no contiene el campo de empresa retirado.

Salida de las pruebas de documentos:

```text
OK PDF Memo de costo de capital: 2 páginas; cifra 15,42 %.
OK PDF Conversión de tasas: 2 páginas; cifra 1,17 %.
OK PDF Valor del dinero en el tiempo: 1 páginas; cifra 315,47.
OK PDF Simulación de crédito: 2 páginas; cifra 1.243.520,81.
OK PDF Evaluación de proyecto: 2 páginas; cifra 814,33.
OK: 5 documentos, cifras exactas del cálculo, vista previa compartida, pies Excel, variantes y PDF multipágina sin canvas ni red.
OK JEV: respuesta simulada, debounce, caché, cambios de entrada, fallo silencioso, cuatro tonos, selector y PDF/Excel con y sin decisión; sectores filtrados en cuatro modalidades.
```

No se abrió un navegador ni Excel de escritorio. La interacción de JEV se comprobó con un ejecutor de hooks con estado y limpieza de efectos, y renderizado SSR real; los PDF se generaron en Node sin canvas ni logos. No se hicieron consultas reales a JEV.

## Pendiente externo

La verificación completa de `test:calc` requiere que la otra persona actualice la aserción de número de hojas de DX, que esta tarea prohíbe tocar. No se omitió ni se alteró esa comprobación. Los cambios funcionales solicitados están implementados; el resultado global de esa prueba sigue pendiente de esa corrección externa.
