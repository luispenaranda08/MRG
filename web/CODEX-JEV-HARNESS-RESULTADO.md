# Decisiones de JEV en «Tu empresa» · Resultado

## Implementación

- El sector sugerido por JEV se selecciona automáticamente si la persona no cambió el selector. Los cambios manuales y el sector 14 del ejemplo PYME se conservan. El selector muestra el sector elegido por JEV y la revisión del archivo cuando está disponible.
- Al generar el informe, Mirage calcula primero los supuestos base y el informe aparece con sus valores por defecto. JEV recibe un resumen sin el archivo y elige únicamente opciones del menú de Mirage. La respuesta se valida y Mirage recalcula los supuestos.
- El paso 3 presenta «Decisiones de JEV» antes de los supuestos editables, con alternativa, motivo, origen y selector. Se puede volver a los valores de Mirage. Si JEV falla, permanecen los valores por defecto sin mensaje de error.
- Las ediciones manuales de crecimiento, margen o Kd prevalecen sobre una respuesta tardía. Las selecciones del menú y la acción para volver a Mirage también quedan protegidas de respuestas pendientes.
- El Excel incorpora «Decisiones de JEV»: Decisión, Opción elegida, Alternativas, Motivo y Origen; incluye además sector y tamaño, con sus orígenes.
- Se ajustaron las reglas de presentación para que el panel use una columna en pantallas estrechas y dos columnas en pantallas amplias.

## Archivos de esta tarea

- `src/components/Diagnostico.tsx`
- `src/app/globals.css`
- `src/lib/dx/decisiones-excel.ts` (nuevo helper de filas y hoja)
- `src/lib/dx/__tests__/decisiones-excel.cjs` (nuevas pruebas de columnas, opciones y orígenes)
- `package.json` (incluye la prueba nueva en `npm test`)

## Verificación

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Correcto, sin errores ni advertencias. |
| `npm run build` | Correcto; TypeScript, compilación y exportación estática. |
| `npm test` | Correcto; todas las suites, incluidas las pruebas nuevas de la hoja de decisiones. |

## No verificado

- No se abrió un navegador para inspeccionar visualmente la interfaz a 375 px y 1280 px; la adaptación se comprobó mediante reglas CSS y la compilación.
- No se hizo una consulta real a JEV; el comportamiento de validación y los orígenes de la hoja se probaron con datos locales.
- No se abrió el archivo en Excel de escritorio. La prueba del helper verifica las columnas y filas generadas con ExcelJS.

No se instalaron dependencias, no se usó la red, no se desplegó ni se hicieron commits. No se modificaron las rutas protegidas por las reglas de la tarea.
