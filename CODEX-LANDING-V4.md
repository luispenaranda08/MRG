# Tarea para Codex · Landing V4: método amable, sin planes, acceso abierto

Editas solo `index.html`, `site.css` y `site.js`. Siguen vigentes las reglas duras de `CODEX-LANDING.md`. El hero, el ticker, los corchetes y el estilo visual de la V3 **no se tocan**.

## Visión del dueño (contexto para el texto; no la cites literalmente)

HyperTarget no quiere venderse como una empresa grande con planes de precios. Quiere que **todas las personas tengan acceso**, dominar **un nicho pequeño** mejor que nadie con **tecnología propia**, funcionar igual de bien para una pyme que para una gran empresa, e innovar. La página debe transmitir esto:

- Hacemos **una sola cosa**, mucho mejor que lo que existe hoy.
- Hay algo que nadie más hace para Colombia.
- Sirve a cualquiera, desde un estudiante hasta una firma de auditoría.
- Cuanto más se usa y se cita, más se convierte en la referencia.

**Prohibido** en el texto: "Zero to One", "Peter Thiel", "monopolio", "monopolizar", "dominar el mercado", "disruptivo", "revolucionario", "líder", "el mejor". Tampoco hables de clientes, ventas, precios, planes, tiers, licencias ni de "B2B". El tono es sobrio, seguro y concreto, con frases cortas.

## 1. Método: sin fórmulas, en lenguaje de persona

En el trazo vertical de `#metodo`, **elimina todas las fórmulas y siglas** (βL, Ke, WACC =, Rf, ERP, CRP, NIT, CIIU, NIIF). Cada nodo pasa a tener un nombre corto y, en la columna de nota, una frase amable en **sans 15 px** (ya no en mono) y color `--ink-soft`:

| Nodo | Nota |
|---|---|
| Empresa | Partimos de una empresa real y de lo que hace. |
| Estados financieros | Leemos sus cifras públicas, tal como las reporta. |
| Sector | La ubicamos junto a las empresas que hacen lo mismo. |
| Comparables | Miramos cómo se comportan empresas parecidas en la región. |
| Mercado | Tomamos las tasas del día: Colombia y Estados Unidos. |
| Riesgo | Ajustamos el riesgo según cuánto debe la empresa. |
| `[ RESULTADO ]` | Su costo de capital: cuánto debe rendir una inversión para que valga la pena. |
| Explicación | Te entregamos el número con su explicación, paso a paso, listo para quien lo revise. |

- El nodo Resultado conserva el relleno dorado y el corchete.
- El párrafo de la izquierda cambia a: "No entregamos un número suelto. Cada resultado viene con el camino que lo produjo, para que cualquiera pueda entenderlo, revisarlo y defenderlo."
- Debajo del párrafo agrega un enlace discreto `.bracket`: `[ VER LA METODOLOGÍA COMPLETA ]`, que lleva a `fintarget-mockup.html#method`.
- Elimina el CSS de las fórmulas que quede sin uso.

## 2. Eliminar la sección Planes por completo

- Borra la sección `#planes` (HTML y CSS: `.plans`, `.plan-grid`, `.plan`, `.hypothesis` y cualquier resto).
- En la navegación cambia `PLANES` por `ACCESO`, que enlaza a `#acceso`.
- La tarjeta "Próximamente" de Productos cambia su línea a: "Nuevas referencias para Colombia, con el mismo método. Escríbenos si quieres participar." Sigue enlazando a `#contacto`.

## 3. Nueva sección `[ 05 · POR QUÉ ]`, después de Validación

`id="por-que"`, fondo papel, separada por la línea de 1 px de las secciones de papel. Titular: **"Una sola pregunta, respondida mejor que nadie."**

Bajada: "¿Cuánto cuesta el capital en Colombia? Hoy la respuesta se calcula a mano, una vez al año y con datos que no son de aquí. Empezamos por ahí."

Debajo van cuatro columnas con línea superior de 1 px (la misma composición que tenían los planes, que al dueño visualmente le gustaba). Cada columna lleva un número mono pequeño (`01`–`04`), un título en sans 22 px y un texto de 2–3 líneas:

1. **Hecho para Colombia.** "Conectamos los sectores colombianos con los datos internacionales y calculamos el riesgo con empresas de la región. Es un trabajo que nadie más publica para el país."
2. **Al ritmo del mercado.** "La referencia internacional se actualiza una vez al año. FinTarget está diseñado para mover la parte de mercado cada día."
3. **Del tamaño que necesites.** "Sirve igual para una pyme que sube su balance en Excel que para una empresa que cotiza en bolsa. Mismo método, misma calidad."
4. **Abierto y versionado.** "El método es público y cada cambio queda registrado. Cuanta más gente lo usa y lo cita, más sólida se vuelve la referencia."

Solo la palabra clave de la columna 2 puede ir en dorado oscuro (`--accent-ink`): "cada día". Nada más en dorado en esta sección.

## 4. Nueva sección `[ 06 · ACCESO ]`, antes de Contacto

`id="acceso"`. Es una franja carbón a sangre completa, corta, de una sola idea:

- A la izquierda, un titular grande: **"Abierto para todos."**
- A la derecha, el texto: "La tabla de costo de capital por sector se consulta sin registro y sin costo. Para estudiantes, periodistas, analistas, contadores, peritos y empresas. Úsala, descárgala, cítala." Debajo, el botón principal "Entrar a FinTarget →" (mismo estilo del hero).
- Un detalle en mono, `--light-soft`: `[ SIN REGISTRO · SIN COSTO ]`.

Contacto pasa a ser `[ 07 · CONTACTO ]`. Como Acceso y Contacto son ambas carbón, sepáralas con una línea de 1 px `--line-dark`; deben leerse como dos bloques, no como uno.

## 5. Renumeración y revisión

- Etiquetas finales: 01 Productos · 02 Problema · 03 Método · 04 Validación · 05 Por qué · 06 Acceso · 07 Contacto.
- `grep -ciE "planes|plan-|licencia|hipótesis|zero|thiel|monopol" index.html site.css` debe dar 0.
- `grep -c "βL\|WACC =\|Ke =" index.html` debe dar 0.
- `node --check site.js`.
- Añade una sección "V4" a `CODEX-LANDING-RESULTADO.md`. No abras navegador ni servidor.
