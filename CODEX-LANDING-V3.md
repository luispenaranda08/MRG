# Tarea para Codex · Landing V3: restaurar el hero original y poner el correo

Editas solo `index.html`, `site.css` y `site.js`. Las reglas duras de `CODEX-LANDING.md` siguen vigentes.

## 1. Restaurar la primera vista de la V1 (al dueño le parece hermosa)

La V2 eliminó el hero en bandas. Hay que restaurarlo **tal cual estaba** en `backups/2026-10-08-landing-v1/index.html` y `backups/2026-10-08-landing-v1/site.css`:

- El panel carbón con radio grande que sangra a la derecha, dividido en 4 bandas por líneas de 1 px.
- Banda 1: "HT" gigante a la izquierda y "© 2026 HyperTarget" a la derecha.
- Banda 2: logo H + "HyperTarget" a la izquierda y "2026" en mono a la derecha.
- Banda 3: el titular y la bajada.
- Banda 4: los dos CTA a la izquierda y los cuatro círculos a la derecha, con su animación al pasar el cursor.
- Copia del backup el HTML del hero y todas sus reglas CSS y JS (incluida la de los círculos), con las mismas medidas, tipografías y comportamiento responsive.

Solo se permiten dos cambios respecto a la V1:
1. El titular conserva los corchetes dorados de la V2: `Cifras que resisten [una auditoría].`
2. El CTA secundario conserva el estilo `[ CÓMO CALCULAMOS ]` de la V2.

La franja de datos (ticker) de la V2 sale del hero y se coloca **justo debajo del panel del hero**, como una franja propia sobre fondo papel. Va en mono, en tinta, con línea de 1 px arriba y abajo y alineada al container. Su comportamiento en móvil se mantiene (scroll horizontal interno, sin scroll de página).

Todo lo demás de la V2 (corchetes de sección, método en trazo vertical, validación en fila y ritmo de secciones) se conserva sin cambios.

## 2. Correo de contacto

- En la sección de contacto, el correo **founder@hypertarget.tech** va visible y grande, en el estilo de `.contact-email`, como `<a href="mailto:founder@hypertarget.tech">`. Quita el atributo `hidden` y `data-email`.
- Encima del correo va la etiqueta `.bracket` `[ ESCRÍBENOS ]`. No añadas tiempos de respuesta ni otros compromisos.
- La tarjeta "Próximamente" ("Escríbenos para conocer el piloto.") sigue enlazando a `#contacto`.
- Añade `founder@hypertarget.tech` también en el pie, junto a "© 2026 HyperTarget · Colombia".

## 3. Verificación

- `node --check site.js`
- `grep -c "por confirmar" index.html` debe dar 0.
- `grep -c "founder@hypertarget.tech" index.html` debe dar 2 o más.
- Compara el bloque del hero con el backup: el HTML debe ser idéntico salvo los dos cambios permitidos.
- Añade una sección "V3" a `CODEX-LANDING-RESULTADO.md`. No abras navegador ni servidor; Claude verifica.
