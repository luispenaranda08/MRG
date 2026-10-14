# Ficha del Ke y tasas por tamaño · Resultado

Trabajo realizado el 13 de octubre de 2026, únicamente dentro de `web/`.

## Cambios

- `src/lib/api.ts`: tipos opcionales para la anatomía del Ke y Ke/WACC por tamaño, más conversión común de WACC COP nominal a USD y/o tasa real por Fisher.
- `src/components/Wacc.tsx`: ficha del sector con Ke protagonista, barra apilada accesible, atribución de fuentes y cortes, evidencia de beta, métricas por tamaño y detalle de Kd. La tabla principal permite elegir tamaño, conserva la búsqueda y ordena al final los sectores sin Ke publicado. El conteo refleja sectores con dato.
- `src/lib/wacc-documento.ts`: CSV/Excel y documento siguen el tamaño seleccionado; título, tabla y supuestos identifican el tamaño y excluyen los rangos cuando aplica.
- `src/app/globals.css`: presentación de la anatomía y tabla con desplazamiento propio; selectores, barra y contenido se adaptan al ancho móvil.
- `src/components/__tests__/wacc.cjs` y `package.json`: regresión para los 61 sectores, cambio de valores por tamaño y etiqueta del tamaño en el documento.

La conversión de tasas comparte `convertirWaccCopNominal` entre la tabla y los archivos. Los tamaños sin valores suficientes conservan la raya y la nota «Menos de 10 empresas». La fila de ajuste de Fisher se expresa en puntos porcentuales al sumarla con las tasas porcentuales para comprobar el Ke COP.

## Corrección tras la revisión (13-oct)

La barra convierte el ajuste de Fisher de puntos porcentuales a fracción antes de calcular su ancho, de modo que sus cuatro segmentos suman el Ke COP. βL junto a ERP se presenta con cuatro decimales. La regresión comprueba las proporciones de las piezas en los 61 sectores y que Rf represente aproximadamente 27 % en CIIU 62. Esta corrección no se volvió a ejecutar con lint, build o pruebas.

## Segunda revisión (13-oct)

- La frase bajo los filtros usa etiquetas plurales explícitas: Microempresas, Pequeñas empresas, Medianas empresas y Grandes empresas.
- El rango p25–p75 solo se presenta para «Todo el sector». Con un tamaño elegido no aparece en la tabla ni se exporta en CSV, Excel o PDF. La regresión comprueba el render condicional y que las filas y columnas del documento de tamaño no incluyan rangos.
- `Cifra` omite flecha y «Sube/Baja» cuando la variación es neutra o vale cero; muestra «Sin cambio frente al corte anterior».

Verificación de esta corrección: `npm run lint`, `npm run build` y `npm test` terminaron correctamente. La compilación incluyó TypeScript y exportación estática; las pruebas WACC recorrieron los 61 sectores. No se hizo una nueva inspección manual en navegador.

## Verificación

- `npm run lint`: correcto, sin advertencias.
- `npm run build`: correcto; TypeScript y exportación estática completados.
- `npm test`: correcto, incluidas las regresiones preexistentes y la nueva prueba WACC.
- `npx tsc --noEmit`: correcto.
- Reglas del alcance: no se instalaron paquetes, no se usó la red, no se desplegó ni se hizo commit. No se modificaron `src/lib/finanzas/`, `src/lib/dx/`, `api/`, `public/api/`, `vercel.json` ni archivos fuera de `web/`.

## Límites de revisión

Se revisaron por código los estilos responsive a 375 px y 1280 px, el ancho flexible de la barra y el desplazamiento propio de la tabla de tamaño. No se abrió un navegador; no se verificó visualmente la pantalla ni se hicieron pruebas interactivas manuales.
