# Resultado · Constructor de agentes Mirage

Se implementó `/agentes/` como página cliente y se agregó su enlace al final de la navegación principal. No se hizo commit.

## Archivos creados

- `web/src/app/agentes/page.tsx`: entrada de la página cliente y carga de estilos.
- `web/src/components/agentes/ConstructorAgentes.tsx`: encabezado, comando con combobox, catálogo certificado, cuatro cajas, acciones, carga inicial CRED + PYME, ejecución y agentes guardados.
- `web/src/components/agentes/CampoEntrada.tsx`: todos los tipos de entrada, dinero con separadores es-CO, tasas porcentuales, flujos, sector/tamaño, carga por archivo o arrastre y ejemplos de la fachada.
- `web/src/components/agentes/Receta.tsx`: altas de entradas y bloques, búsqueda, conexiones, orden, eliminación e instrucción con reglas.
- `web/src/components/agentes/Resultado.tsx`: métricas, texto con markdown sencillo y cifras validadas, edición con revalidación, reglas, cifras por paso, tablas, traza descargable e impresión.
- `web/src/components/agentes/Comun.tsx`: presentación de cifras mediante `Cifra` + `formatoCifra`, descargas y estado compartido de lectura de archivos.
- `web/src/components/agentes/agentes.css`: estilo institucional, distribución responsive, navegación y ejecución móvil e impresión.
- `CODEX-AGENTES-RESULTADO.md`: este informe.

## Único archivo existente modificado

`web/src/components/Mirage.tsx`: exclusivamente se agregó `["/agentes/", "AGT", "Agentes"]` al arreglo de navegación.

No se creó, modificó ni borró código en `web/src/lib/agentes/` o `web/api/`. Se conservaron los cambios ajenos que ya tenía el repositorio. Toda la integración utiliza la fachada pública; no se escribieron sustitutos de sus funciones.

## Decisiones de interfaz

- Catálogo, filtros, perfiles, sugerencias y conteos se derivan de las capacidades certificadas y de las constantes públicas.
- La primera carga prepara CRED con el ejemplo PYME y no ejecuta el agente automáticamente.
- Las cajas son secciones numeradas plegables: cuatro columnas en escritorio, dos en tableta y una en móvil.
- En móvil los cuatro enlaces inferiores conservan su texto; «Ejecutar agente» queda fijo sobre la navegación y contempla el área segura del dispositivo.
- Todos los campos tienen etiquetas. Hay foco visible y estados de carga/resultados con anuncios accesibles.
- Los resultados numéricos, incluidos los valores de tablas y reglas, se presentan con `Cifra` y `formatoCifra`. El formato es-CO en los controles corresponde a la edición de entradas; las tasas se almacenan como fracciones.
- El contador de cifras calculadas excluye las entradas del usuario que también incluye la ejecución.
- Cambiar receta o valores retira el resultado anterior. No se permite ejecutar mientras se prepara un archivo.
- Los ejemplos conservan su sector y tamaño propios. Para cargar archivos se muestran selectores de sector y tamaño; cambiar esa clasificación requiere volver a seleccionar el archivo para prepararlo con los nuevos parámetros.
- La ejecución detenida muestra su motivo. Si falla la redacción, se conservan las cifras calculadas, reglas, tablas y traza.
- El render de markdown no interpreta HTML. Las marcas de cifras mantienen los desplazamientos del validador y las notas de origen. La edición vuelve a llamar a `validarTexto`.
- El borrado requiere confirmación explícita dentro de la lista.
- La impresión oculta navegación, catálogo, edición, acciones, métricas, tablas adicionales y traza; deja texto, reglas y cifras por paso.

## Verificación realizada

### Compilación y análisis

- `npm run build`: correcto sobre la versión final. Next.js compiló, verificó TypeScript y exportó `/agentes/` como página estática.
- `npx eslint src/app/agentes src/components/agentes`: correcto, sin errores ni advertencias.

### Navegador real

Se sirvió la exportación estática en un servidor local y se usó Chrome headless con un perfil temporal independiente.

| Ancho solicitado | Columnas de las cajas | Desborde horizontal de página | Navegación |
| --- | --- | --- | --- |
| 1440 px | 4 | No | Cuatro enlaces legibles |
| 768 px | 2 | No | Cuatro enlaces legibles |
| 375 px | 1 | No | Cuatro enlaces inferiores legibles |

Se midieron anchos de documento de 1425, 753 y 360 px respectivamente; la diferencia de 15 px corresponde a la barra vertical del navegador. Ningún enlace desbordó su ancho. A 375 px el botón terminó en y=928 y la navegación comenzó en y=944,56, dentro de una ventana de 1000 px de altura: no se superponen.

Se inspeccionaron capturas de los tres tamaños sobre el build final. Las capturas temporales se guardaron en `%TEMP%/mirage-agt-final-1440.png`, `%TEMP%/mirage-agt-final-768.png` y `%TEMP%/mirage-agt-final-375.png`.

Pruebas funcionales realizadas con las implementaciones reales de la fachada:

- Carga inicial de PYME, sector CIIU 14 y ausencia de ejecución automática.
- Ejecución de CRED sin texto: ocho pasos y cinco tablas; decisión disponible sin errores.
- Comando WACC mediante teclado y ejecución completa sin texto.
- Ejecución EXCL con dos listas de flujos: tres pasos, sin desbordes, sin campos sin etiqueta ni identificadores duplicados.
- Guardar, duplicar, cancelar borrado, confirmar borrado y actualizar la lista.
- Descargar un agente como JSON e importarlo mediante el control real de archivos.
- Descargar la traza JSON. Se comprobó que un monto escrito `1.234,5` llegó a AMORT como `1234.5` y una tasa escrita `12` llegó como `0.12`.
- Mover CAP antes de AMORT: `validarAgente` detectó la referencia posterior, deshabilitó ejecución y retiró el resultado. Se restauró el orden.
- Cargar el archivo PYME mediante el control real de archivos, conservando su clasificación.
- Plegar una caja con la barra espaciadora.
- Emulación de impresión: navegación, editor y acciones ocultos; reglas y cifras visibles.
- Fallos de las llamadas de redacción y planificación en el servidor estático: mensaje de indisponibilidad, receta preservada y cifras calculadas conservadas cuando correspondía.
- Ninguna excepción JavaScript de la aplicación en las comprobaciones.

## Lo que no se pudo verificar

El servidor de comprobación sirvió únicamente la exportación estática; no ejecuta las funciones de `web/api/`. Por ello no se verificó una respuesta satisfactoria real de `planificar` o `instruir`, ni la edición y resaltado del texto a partir de una respuesta del Motor Mirage en servicio. Esos caminos están conectados al contrato público y compilan, pero requieren comprobarse con ese servicio disponible. No se añadieron respuestas simuladas ni sustitutos de la fachada.

La revisión accesible incluyó etiquetas, identificadores, foco, teclado y anuncios declarados; no incluyó una sesión con lector de pantalla. La impresión se comprobó con el medio de impresión de Chrome, no con impresora física. El arrastre está implementado, pero la carga comprobada se hizo mediante el selector de archivos.
