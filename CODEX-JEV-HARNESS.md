# Tarea para Codex · Decisiones de JEV en «Tu empresa», dentro del harness

Trabajas en `web/`. Lee antes `web/CODEX-JEV-CALC-RESULTADO.md`, `src/lib/dx/decisiones.ts` y `src/lib/dx/jev-dx.ts`.

## Principio (no negociable)

JEV **elige** opciones de un menú cerrado que define Mirage (`MENU` en `src/lib/dx/decisiones.ts`); **Mirage calcula** cada opción (`aplicar`). JEV nunca escribe cifras. Todo lo que decide JEV es visible, explicable y reversible por el usuario, y queda registrado en los documentos. Si JEV falla o tarda, la app funciona igual con los valores por defecto de Mirage.

## Ya hecho (no lo modifiques)

- `src/lib/dx/decisiones.ts`: `MENU`, `POR_DEFECTO`, `ETIQUETAS`, `disponibles(c)`, `aplicar(c, base, decisiones)`, `validar(c, respuesta)`, `kdImplicito(c)`, `resumenParaJev(c, base, sector, tamano)`.
- `src/lib/dx/jev-dx.ts`: `decisionesConJev(c, resumen)` → `Decision[]` (`{clave, opcion, motivo, origen: "jev" | "mirage" | "usuario"}`), nunca lanza error.
- Servidor: `POST /api/analisis/supuestos` con esquema de enums.

## Qué hacer en `src/components/Diagnostico.tsx` (y estilos en `globals.css`)

1. **Sector elegido por JEV.** Hoy JEV sugiere el sector (`sugSector`) y el usuario debe aplicarlo con un botón. Haz que, si el usuario no ha tocado el selector de sector desde que cargó el archivo, el sector sugerido se aplique solo (igual que ya se hace con el tamaño: ver `tamanoElegido`). Muestra junto al selector: "Elegido por JEV: 14 · Confección de prendas" con el motivo si existe. Si el usuario cambia el sector, manda lo suyo. Con los ejemplos que fijan sector (PYME → 14) no lo sobreescribas.
2. **Decisiones sobre los supuestos.** Al generar el informe (`generate`), guarda los supuestos de Mirage como base (`defaultsFor`). Muestra el informe de inmediato con `POR_DEFECTO`, y en paralelo llama `decisionesConJev(c, resumenParaJev(c, base, "CIIU · nombre", tamaño))`. Cuando responda, aplica `aplicar(c, base, decisiones)` y recalcula (como ya se recalcula al editar supuestos con `update`).
3. **Panel "Decisiones de JEV"** en el paso 3, arriba de los supuestos:
   - Una fila por decisión (`ETIQUETAS[clave].titulo`): la opción elegida (`ETIQUETAS[clave].opciones[opcion]`), el motivo y una marca de origen: "JEV", "Mirage (por defecto)" o "Usted".
   - Un selector por fila con las opciones de `disponibles(c)`. Cambiarla recalcula con `aplicar` sobre la **base** y marca origen "usuario".
   - Un botón "Volver a los valores de Mirage" que aplica `POR_DEFECTO`.
   - Mientras JEV decide: "JEV está revisando los supuestos…" (discreto, `role="status"`). Si falla, no muestres error: queda "Mirage (por defecto)".
   - Si el usuario ya editó a mano un supuesto afectado (crecimiento, margen o Kd) en el formulario de supuestos, la respuesta tardía de JEV no lo pisa.
4. **Documentos.** El Excel que se descarga (se arma con `buildWorkbook`; no modifiques el motor: agrega la hoja desde el componente o desde un helper nuevo en `src/lib/dx/`) lleva una hoja "Decisiones de JEV" con columnas: Decisión, Opción elegida, Alternativas, Motivo, Origen. Agrega también el sector y el tamaño con su origen ("JEV", "regla de activos Ley 905" o "Usted").

## Reglas duras

1. No modifiques `src/lib/dx/engine.ts`, `defaults.ts`, `leer.ts`, `decisiones.ts`, `src/lib/finanzas/`, `api/`, `public/api/`, `vercel.json`, nada fuera de `web/`.
2. No instales nada, no uses la red, no despliegues, no hagas commits.
3. Texto visible en español claro, sin jerga ("API", "JSON", "harness", "enum").
4. Accesible y correcto a 375 px y 1280 px.
5. Agrega pruebas en `src/lib/dx/__tests__/` para el helper de la hoja del Excel (columnas y orígenes). `npm run lint`, `npm run build` y `npm test` deben pasar: ejecútalos y reporta.

## Entrega

`web/CODEX-JEV-HARNESS-RESULTADO.md` con archivos tocados, decisiones, resultados de lint/build/test y lo no verificado.
