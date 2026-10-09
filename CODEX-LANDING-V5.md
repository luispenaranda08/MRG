# Tarea para Codex · Landing V5: ticker en movimiento tipo bolsa, con olas de cuadraditos

Editas solo `index.html`, `site.css` y `site.js`. Siguen vigentes las reglas duras de `CODEX-LANDING.md`. Solo se toca la franja `.ticker` que va debajo del hero; nada más de la página cambia.

## Lo que pidió el dueño

"Que esto se vaya moviendo tipo bolsa de valores, pero como unas olas en cuadradito moviéndose."

## Comportamiento

1. **Cinta continua (marquee)**: la fila de indicadores se desplaza de derecha a izquierda sin fin, como el ticker de una bolsa. Velocidad lenta y constante, ~40 px/s, para que se pueda leer. Duplica el contenido (el segundo grupo con `aria-hidden="true"`) y anima con `transform: translateX` en CSS, de 0 a -50 %, con `linear infinite`. Pausa al pasar el cursor y al recibir foco.
2. **Mini-gráfico de cuadraditos en cada indicador**: entre el nombre y el valor va una pequeña "ola" hecha de cuadrados, como un sparkline pixelado:
   - 14 columnas × 5 filas de cuadrados de 4 × 4 px con 2 px de separación (aprox. 82 × 28 px). Puedes usar un `<canvas>` por indicador o una rejilla de `<i>`; elige lo que sea más liviano (preferible un canvas por indicador, dibujado con `requestAnimationFrame`).
   - En cada columna se encienden los cuadrados desde abajo hasta la altura de la serie en ese punto; los apagados quedan como un contorno muy tenue (`--line-light`).
   - La serie avanza: cada ~600 ms entra una columna nueva por la derecha y la más vieja sale por la izquierda, de modo que la ola "camina". La altura nueva se genera como una caminata aleatoria suave (seno + ruido pequeño) alrededor del valor, sin saltos bruscos de más de 1 fila entre columnas.
   - Color de los cuadrados encendidos: `--ink`. La columna más reciente (la de la derecha) va en `--accent-ink`, como "último dato".
3. **Variación tipo bolsa**: al lado del valor muestra un cambio pequeño con flecha, en mono 11 px: `▲ 0,02` en `--ink` o `▼ 0,01` en `--ink-soft`. Sin rojo ni verde chillones, para mantener la paleta. El cambio se recalcula cuando entra una columna nueva, en coherencia con la dirección de la ola. **El valor principal (10,9 %, 4,2 %, …) NO cambia**: son las cifras de ejemplo del prototipo. Solo varía la decoración.
4. La nota `[ CIFRAS DE EJEMPLO · CORTE 30 SEP 2026 ]` **sale de la cinta móvil** y queda fija en el extremo derecho de la franja, sobre un fondo `--paper` con un degradado de transparencia hacia la izquierda (máscara de 48 px), para que la cinta pase "por debajo". En móvil, la nota se coloca debajo de la cinta, alineada a la izquierda.
5. Los bordes izquierdo y derecho de la cinta se desvanecen con `mask-image: linear-gradient(...)` de 32 px.

## Accesibilidad y rendimiento

- `prefers-reduced-motion: reduce`: sin marquee (la fila queda estática y desplazable como hoy) y sin animación de olas (se dibujan una vez, estáticas).
- La animación se pausa cuando la franja no está en el viewport (IntersectionObserver) y cuando la pestaña está oculta (`visibilitychange`).
- Para lectores de pantalla, la región se anuncia una sola vez: `role="region"` con `aria-label="Indicadores de ejemplo"`. Los canvas llevan `aria-hidden="true"` y las variaciones `▲/▼` también van ocultas (son decorativas).
- Canvas nítidos en pantallas retina (escala por `devicePixelRatio`).
- Sin librerías. El JS añadido pesa menos de 4 KB.

## Verificación

- `node --check site.js`.
- El hero y el resto de secciones quedan byte a byte iguales (compáralos con `backups/2026-10-08-landing-v4/`).
- Añade una sección "V5" a `CODEX-LANDING-RESULTADO.md`. No abras navegador ni servidor.
