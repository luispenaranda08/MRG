# Ajustes a la interfaz de /agentes (sobre lo que ya hiciste en CODEX-AGENTES-V2)

Mismas reglas duras de CODEX-AGENTES-V2.md (solo `web/src/components/agentes/*`; sin commit). Revisado con capturas a 1440 px:

1. **Ejecutar sin documentos.** Hoy se puede pulsar «Ejecutar» sin cargar los estados y sale «Falta la entrada «Estados financieros»» más un «Ver todas las cifras» vacío. Cambia: «Ejecutar» deshabilitado mientras falte un campo requerido de la caja 1 (archivo de estados incluido), y junto al botón una línea corta que diga qué falta: «Cargue los estados financieros en la caja 1 para ejecutar.» Si una ejecución se detiene, muestra solo la alerta: no muestres «Ver todas las cifras» ni «Imprimir».
2. **Caja 1 más simple.** El archivo es lo principal: arriba la zona «Suelte aquí sus estados o elija un archivo» y los ejemplos como enlaces («Usar ejemplo: Confecciones del Caribe · PYME»); debajo, en una línea de dos columnas, Sector y Tamaño; luego los demás campos. Cuando hay archivo cargado, muestra el nombre de la empresa y los años en una línea con un enlace «Cambiar archivo».
3. **Encabezado de las cajas.** Sobra ~50 px de blanco bajo «Lo que usted entrega» / «Lo que aporta Mirage»… Reduce el encabezado a lo justo (número, título y subtítulo en dos líneas, padding normal).
4. **Acciones.** «Ejecutar», «Descargar agente (.zip)» y «Guardar» juntos en una sola fila, sin hueco; la nota «Incluye el programa…» debajo de la fila completa, no bajo un botón.
5. Verifica de nuevo build, eslint y las cuatro cajas iguales (1440, 900, 375). Resultado en CODEX-AGENTES-V2-RESULTADO.md (agrega una sección «Ajustes»).

## 6. Diagrama de flujo del agente (nuevo)

Debajo de las cuatro cajas (antes de «Pida un cambio»), una tarjeta «Flujo del agente» con un diagrama tipo Mermaid **dibujado en SVG propio** (no instales Mermaid ni otra librería):

- Datos: `flujo(agente)` de `@/lib/agentes` → `{ nodos: {id, texto, tipo, columna, fila}[], aristas: {de, a}[], columnas, filas }`. La columna y la fila ya vienen calculadas: no hagas layout propio.
- **Fondo negro** (`#0b0b0b` o `var(--encabezado-fondo)`), **líneas y texto blancos**. Nodos: rectángulos con borde blanco de 1,5 px y esquinas de 4 px; texto blanco en IBM Plex Sans 12 px, centrado, partido en máximo 2 líneas. Distingue el tipo solo con el borde: `documento` y `entrega` con borde doble o más grueso; `criterios` como rombo o con esquinas cortadas; nada de colores.
- Flechas: líneas blancas de 1,5 px con punta de flecha (`marker`), curvas suaves (bezier horizontal) de la derecha de un nodo a la izquierda del otro.
- Flujo de izquierda a derecha. Ancho de columna ~190 px, separación ~60 px; alto de nodo ~44 px, separación ~14 px; centra verticalmente cada columna respecto a la más alta.
- Si no cabe a lo ancho, scroll horizontal dentro de la tarjeta (nunca de la página). En móvil igual, con scroll horizontal.
- Accesible: `<svg role="img" aria-label="Flujo del agente: …">` con un resumen textual; y `<title>` en cada nodo.
- Se actualiza al aplicar un cambio al agente.
