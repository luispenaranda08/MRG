# Tarea para Codex · Mirage, ronda 2: símbolos sin la M

Sigue la misma skill (`referencias/logo-design-skill/SKILL.md`) y el mismo brief y reglas de `CODEX-LOGO-MIRAGE.md`, con estos cambios. Hasta el checkpoint de la Fase 6; sin kit y sin despliegue. Solo escribes en `logos/mirage/r2/` y en `CODEX-LOGO-MIRAGE-2-RESULTADO.md`.

## Qué cambió

El dueño dijo: **"No necesariamente debe ser con la M, dame más opciones."** Ahora el símbolo puede ser **abstracto o pictórico**, no una letra. De la ronda 1 le gustaron más el 2 (doble arco) y el 4 (dato contrastado), pero quiere ver otras direcciones.

## Se mantiene

- **La firma de familia HyperTarget:** la columna de cuadritos ajedrezados de 16 px a la izquierda (como en `logos/mirage/ref-ft.svg` y `ht-h.svg`) en **la mayoría** de las propuestas, al menos 6 de 8. En 2 propuestas puedes reinterpretar el ajedrezado de otra forma (por ejemplo, que el ajedrezado sea el reflejo o el horizonte), siempre que se reconozca como de la familia.
- Una tinta, sin gradientes, `viewBox 0 0 256 256`, peso visual equivalente a la H y la FT, y construcción con rectángulos redondeados, arcos y radio 8 cuando aplique.
- Nada de clichés financieros: flechas que suben, gráficos de barras, monedas, escudos, globos ni signos de dólar.

## Territorio de ideas: "Mirage"

Un espejismo es una imagen sobre el horizonte que parece real. Mirage existe para **separar la cifra real del espejismo**: el número correcto, con su origen. Direcciones a explorar (genera tu propia longlist de 12–15 y no te limites a estas):

- **Horizonte y reflejo:** una forma simple (semicírculo, sol, cuadrado o duna) sobre una línea de horizonte y su reflejo invertido debajo, cortado en franjas.
- **Sol de calor:** un disco con su mitad inferior en franjas horizontales que vibran (las líneas de calor).
- **Dos lecturas:** una figura que, reflejada, forma otra (por ejemplo, un medio cuadrado que con su reflejo completa un rombo o un diamante, en guiño a los diamantes del ticker de la landing).
- **Lente o punto de enfoque:** la mira que aclara lo borroso; un anillo con un punto sólido (el dato real) y bandas difusas alrededor. Ojo: HyperTarget ya usa la idea de *target*, así que esto puede reforzar la marca madre.
- **Oasis geométrico:** la promesa encontrada en el desierto, abstraída en formas mínimas (no palmeras literales).
- **Píxel que se aclara:** el ajedrezado se vuelve sólido a medida que avanza a la derecha: del ruido a la cifra.
- **Pirámide o duna con eco:** un triángulo y su reflejo como franjas.
- **Ventana o portal:** un arco (en continuidad con el doble arco que gustó) a través del cual se ve una línea de horizonte.

## Entregables

1. Longlist de 12–15 conceptos de una frase, con puntaje (claridad, distinción, simplicidad, pertinencia y fuerza pequeña).
2. **8 conceptos construidos** en SVG (`logos/mirage/r2/r2-1.svg` … `r2-8.svg`), más su versión invertida y al menos una iteración `-v1` por concepto. Que sean **distintos entre sí**, no ocho variaciones de una sola idea. Al menos 2 deben ser de horizonte o reflejo, al menos 1 de lente o target, y al menos 1 del ajedrezado que se transforma.
3. Dos vueltas de `svg_audit.py`. Revisa también el tamaño de 16 px y el parecido con logos existentes: busca en la biblioteca por técnica o tema (`--subject sun`, `--subject eye`, `--technique negative-space`…) para evitar parecidos.
4. `CODEX-LOGO-MIRAGE-2-RESULTADO.md` con el formato de checkpoint de la skill: por concepto, nombre, tipo, idea en una frase, por qué encaja, riesgo honesto y recomendación. No intentes renderizar con Chrome; Claude lo hace después.
