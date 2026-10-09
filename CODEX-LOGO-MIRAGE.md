# Tarea para Codex · Conceptos de logo para Mirage

Sigue la skill de diseño de logos que está en `referencias/logo-design-skill/` (lee primero su `SKILL.md`; después `references/discovery-brief.md`, `references/mark-types.md`, `references/visual-techniques.md`, `references/svg-construction.md` y `references/testing-checklist.md`). Trabaja en **modo Design, vía rápida**: sin preguntas, con supuestos explícitos, y llega hasta el **checkpoint de la Fase 6**. No construyas el kit (Fase 7).

## Reglas duras

- Solo escribes dentro de `logos/mirage/` y en el resultado `CODEX-LOGO-MIRAGE-RESULTADO.md`. No toques la web, la app ni la configuración, y no despliegues.
- Los scripts de la skill se ejecutan con su ruta completa (`python3 referencias/logo-design-skill/scripts/...`). Si alguno necesita Chrome y el sandbox lo bloquea, no insistas: deja los SVG listos y Claude renderiza después. `svg_audit.py` y `search_library.py` funcionan sin navegador; úsalos.
- Los logos de la biblioteca son de sus dueños. Solo estúdialos; no copies ni calques ninguno.

## Brief

- **Nombre:** Mirage (antes FinTarget). Producto de **HyperTarget**.
- **Qué es:** la referencia del costo de capital en Colombia (WACC por sector, betas locales, prima país), con método público y cada cifra trazable hasta su origen. Acceso abierto. Lo usan analistas, contadores, valoradores, peritos, estudiantes y pymes.
- **Adjetivos:** preciso, sobrio, confiable, abierto, técnico.
- **Lo que significa "Mirage" y cómo lo usamos:** un espejismo es lo que parece real y no lo es. Mirage existe para **separar la cifra real del espejismo**: el número correcto, con su origen. Ideas útiles: reflejo, horizonte, línea de calor, la imagen invertida, la doble lectura. Evita cualquier cosa que sugiera ilusión o engaño en sentido negativo.
- **Familia visual obligatoria (el dueño fue explícito):**
  - Igual que la H de HyperTarget (`logos/mirage/ht-h.svg`) y la FT anterior (`logos/mirage/ref-ft.svg`): **columna de cuadritos ajedrezados solo en el borde izquierdo** (mismo módulo de 16 px y la misma posición y ritmo que en esos archivos), seguida de la letra construida con rectángulos redondeados (radio 8 sobre un lienzo de 256).
  - Un color: negro `#111` sobre claro y versión invertida sobre carbón `#1F2124`. Sin gradientes ni efectos.
  - Lienzo `viewBox="0 0 256 256"`. La letra cabe en la misma caja que la H y la FT (y de 56 a 200).
- **Lo que el dueño ya rechazó:**
  - `logos/mirage/mi-m-c.svg`: cuadritos en ambos lados (solo los quiere a la izquierda) y un centro en V que no le gustó.
  - Una M con V delgada al centro entre dos patas redondeadas.
  - La versión con V ancha sólida (`mi-m-h.svg`) es la última propuesta, todavía sin respuesta. Úsala como **punto de partida que hay que superar**, no como respuesta.
- **El problema real es el centro de la M.** La columna izquierda de cuadritos y las patas redondeadas ya están resueltas. Explora centros distintos que tengan una idea propia.

## Lo que hay que entregar

1. **Longlist** de 8–10 conceptos de una frase (Fase 3), cada uno con un giro propio sobre la M o sobre la idea de espejismo y reflejo, siempre dentro de la familia visual. Ejemplos de direcciones a explorar (no te limites a estas):
   - El centro de la M como **reflejo**: la mitad inferior de la M repetida como franjas horizontales que se desvanecen (el espejismo sobre el horizonte).
   - Una M hecha de **franjas horizontales** (líneas de calor) con los cuadritos a la izquierda.
   - Un centro con **arcos** (dos arcos redondeados, una "m" geométrica) en el lenguaje de radios de la FT.
   - Un centro en **escalón** de rectángulos redondeados que baja y sube, en lugar de una diagonal.
   - El **espacio negativo** del centro formando una cifra, una flecha discreta o un punto de dato.
2. Puntúa la longlist (claridad, distinción, simplicidad, pertinencia, fuerza a tamaño pequeño) y elige **los 5 mejores y más distintos**. El dueño pidió opciones, por eso son 5 en lugar de 3.
3. **Construye los 5 en SVG** (`logos/mirage/concept-1.svg` … `concept-5.svg`), con paths y sin `<text>`, más iteraciones guardadas como `-v1`, `-v2`. Describe la construcción en palabras antes de cada SVG.
4. **Prueba y refina** con `svg_audit.py` (al menos dos vueltas). Revisa la prueba de la letra (que se lea como M de un vistazo), las uniones, el tamaño de 16 px y la coherencia de pesos con la H y la FT.
5. Si el sandbox lo permite, genera `concept_sheet.py` en escala de grises con los 5 junto a la H de referencia. Si no, déjalo indicado.
6. Escribe `CODEX-LOGO-MIRAGE-RESULTADO.md` con el formato de checkpoint de la skill ("Presenting concepts in chat"): por cada concepto, nombre, tipo, la idea en una frase, por qué encaja (2–3 puntos) y un riesgo honesto. Al final, tu recomendación. Añade la longlist con sus puntajes y los resultados de `svg_audit.py`.
