# Tarea para Codex · Calculadora de capital sin opciones que confunden

Trabajas en `web/` (Next.js, exportación estática). Lee antes `web/CODEX-CALC-RESULTADO.md` y `web/CODEX-JEV-CALC-RESULTADO.md`.

Contexto: Mirage se va a mostrar a profesores de finanzas y auditores. Su activo principal es la calidad del Ke. Todo lo que aparece en pantalla debe estar terminado y ser defendible. Esta tarea no agrega funciones: quita ruido.

## Reglas duras

1. **No modifiques**: `web/src/lib/finanzas/`, `web/src/lib/dx/`, `web/api/`, `web/public/api/`, `web/vercel.json`, `web/src/lib/api.ts` (el contrato de datos no cambia) ni nada fuera de `web/`.
2. No instales nada, no uses la red, no despliegues, no hagas commits.
3. Texto visible en español claro, sin jerga interna ("API", "motor", nombres de archivos).
4. Al terminar, `npm run lint`, `npm run build` y `npm test` deben pasar. Si una prueba exige el comportamiento anterior, actualízala para exigir el nuevo y explícalo.

## Cambios (en `src/components/Calculadora.tsx`, `src/lib/calculadora.ts`, `src/lib/documento.ts` y sus pruebas)

1. **Prima por tamaño.** Quita la casilla "Incluir prima por tamaño" y su mensaje. Hoy es una opción que no hace nada. Quita también la fila "Prima por tamaño" de los supuestos del documento (PDF y Excel). Deja el estado interno (`primaTamano` o equivalente) eliminado por completo, no oculto.
2. **Beta total.** La casilla "Usar beta total" sale de la vista principal del formulario. Muévela dentro de un bloque plegable cerrado por defecto (`<details>`), al final del formulario, titulado "Opción para dueños no diversificados". Dentro, antes de la casilla, un párrafo corto: "La beta total supone que el dueño tiene todo su patrimonio en esta empresa. Divide la beta del sector por su correlación con el mercado y eleva mucho el Ke. No es la tasa que se usa para valorar ante terceros." Conserva la nota de la celda (`beta_total.nota`) cuando se activa. El cálculo con beta total no cambia.
3. **Documento.** Si la beta total está activa, el supuesto "Beta total: Sí" debe aparecer en el documento con tono de alerta, para que nadie lo confunda con la tasa estándar. Si no está activa, no muestres la fila.
4. Revisa a 375 px y 1280 px por código que el bloque plegable no rompa la rejilla del formulario.

## Entrega

Escribe `web/CODEX-KE-VISTA-RESULTADO.md` con: archivos tocados, decisiones, resultado de lint/build/test, y cualquier cosa que no pudiste verificar.
