# Tarea para Codex · V5b: una ola metálica de diamantes detrás del ticker

Editas solo `index.html`, `site.css` y `site.js`, y solo en la franja `.ticker`. El resto de la página no cambia. Siguen vigentes las reglas duras de `CODEX-LANDING.md`.

## Aclaración del dueño (prevalece sobre la V5)

"Tipo metálico. Imagínate unas olas rellenas de diamantes, o cuadrados en posición diamante. Las olas serían para que se vea mejor visualmente, pero las cifras sí, en esos cuadrados como están ahora."

Interpretación decidida:
- **Las cifras vuelven a verse como antes de la V5**: `NOMBRE  valor` en mono 12 px y separadores de 1 px, dentro de la cinta que se mueve tipo bolsa. Se conserva el movimiento continuo de la V5 (marquee, pausa con hover y foco, máscara de bordes y nota fija `[ CIFRAS DE EJEMPLO · CORTE 30 SEP 2026 ]`).
- **Se eliminan** los mini-gráficos por indicador y las variaciones `▲/▼` de la V5, con todo su HTML, CSS y JS.
- **La ola es decoración de fondo**: un solo canvas que ocupa todo el ancho y alto de la franja, detrás de la cinta (`position:absolute; inset:0; z-index:0`, con la cinta en `z-index:1`).

## La ola metálica de diamantes

1. **Rejilla de rombos al tresbolillo**, con la textura de una placa de acero antideslizante (*diamond plate*). Cada rombo es un cuadrado en posición diamante, dibujado como un path de 4 puntos, de ~8 px de diagonal y 1,5 px de separación. Las filas alternas se desplazan media celda.
2. **Forma**: una ola continua a lo ancho de la franja (suma de 2 o 3 senos con longitudes de onda largas, entre 300 y 600 px, y fases distintas) que avanza lentamente hacia la izquierda, a ~15 px/s, en la misma dirección que la cinta pero más despacio, para dar profundidad. Se rellenan los rombos cuyo centro queda **por debajo** de la curva. La cresta ocupa entre el 35 % y el 85 % de la altura de la franja.
3. **Acabado metálico**:
   - Cada rombo encendido lleva un degradado diagonal de acero cepillado: `#5E636B → #C9CDD2 → #8A9097 → #E9EBED → #6B7077`. Precalcula el sprite del rombo una sola vez en un canvas fuera de pantalla y luego solo `drawImage`.
   - Un **destello** cruza de izquierda a derecha cada ~4 s como una banda diagonal donde los rombos se aclaran (`globalCompositeOperation: 'lighter'` o un segundo sprite más claro).
   - Los rombos de la cresta, la fila superior encendida de cada columna, brillan un poco más.
   - Los rombos apagados se dibujan como contorno de 0,5 px en `--line-light`: el grabado de la placa.
4. **Legibilidad de las cifras (obligatorio)**: la ola nunca compite con el texto. Sobre la ola, detrás de la cinta, va una capa del color `--paper` con opacidad ~0,72. Si hace falta, cada indicador lleva su propio fondo `--paper` con un padding de 4 × 8 px y un radio de 2 px. El contraste del texto con el fondo efectivo debe seguir siendo AA.
5. Altura de la franja: 72 px en escritorio y 64 px en móvil, para que la ola tenga espacio.

## Accesibilidad y rendimiento

- `prefers-reduced-motion`: la ola se dibuja una vez, estática, sin destello, y la cinta queda quieta y desplazable.
- Pausa fuera del viewport y con la pestaña oculta.
- Escala por `devicePixelRatio` (máximo 2) y redimensiona con `ResizeObserver`.
- Un único bucle `requestAnimationFrame`. El JS del ticker queda por debajo de 6 KB.
- El canvas lleva `aria-hidden="true"`.

## Verificación

- `node --check site.js`.
- `grep -c "▲\|▼" index.html site.js` debe dar 0.
- Todo lo ajeno a `.ticker` queda byte a byte igual a `backups/2026-10-08-landing-v4/`.
- Añade una sección "V5b" a `CODEX-LANDING-RESULTADO.md`. No abras navegador ni servidor.
