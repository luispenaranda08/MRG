# Calculadora de capital sin opciones que confunden · Resultado

Trabajo realizado el 13 de octubre de 2026 en `web/`.

## Cambios

- Se quitó la casilla de prima por tamaño y su aviso. Se eliminó `primaTamano` del estado, del tipo de insumos y de la validación del cálculo. La prima ya no bloquea Ke ni WACC.
- Se movió «Usar beta total» al bloque plegable cerrado por defecto «Opción para dueños no diversificados». El bloque incluye el párrafo solicitado; al activar la casilla sigue apareciendo la nota publicada para el sector.
- El supuesto «Beta total: Sí» solo se agrega al documento cuando se activa. PDF y Excel presentan ese supuesto en tono de alerta. Se quitó la fila de prima por tamaño.
- Se actualizaron las pruebas para exigir el cálculo disponible sin prima y la advertencia de beta total en documentos.
- Revisión de rejilla por código: el `<details>` está dentro de la tarjeta del formulario y no introduce columnas propias. A 375 px, la media query existente deja los campos en una columna; a 1280 px se mantienen las dos columnas de `.two-col` y los campos internos en dos columnas.

## Archivos editados

- `src/components/Calculadora.tsx`
- `src/components/__tests__/calc.cjs`
- `src/lib/calculadora.ts`
- `src/lib/documento.ts`
- `src/lib/documento-excel.ts`
- `src/lib/wacc-documento.ts`
- `src/lib/__tests__/documento.cjs`
- `src/lib/dx/__tests__/regression.cjs` (se reemplazó la aserción que esperaba que la prima deshabilitara WACC)

## Verificación

- `npm run lint`: correcto, sin errores ni advertencias.
- `npm run build`: correcto; compilación, TypeScript y exportación estática completados.
- `npm test`: correcto; regresión DX, 32 formatos, 95 comprobaciones financieras, pruebas CALC y pruebas de documentos/JEV.
- Las pruebas comprueban la ausencia de las opciones retiradas en la vista y en los documentos, y comprueban el tono de alerta de beta total en PDF y Excel.

No se abrió un navegador: la revisión a 375 px y 1280 px fue por la estructura JSX y las reglas CSS responsivas existentes. No se modificaron archivos fuera de `web/`; se dejaron intactos los cambios preexistentes fuera de esta tarea. No se instaló nada, no se usó la red, no se desplegó ni se hicieron commits.
