# Resultado: empresa o proyecto en la calculadora

Fecha: 2026-10-11.

## Cambios realizados

- Restaurado el estado `empresa` y el campo «Empresa o proyecto (opcional)» debajo del título y encima de las pestañas de la Calculadora financiera.
- El nombre se comparte con Costo de capital, Tasas, Valor del dinero, Créditos y Proyectos, tanto Flujos como Modelo. Se pasa a `armarDocumento`, a los libros de crédito y proyecto y a los nombres de PDF y Excel.
- La vista previa, el PDF y el Excel del documento muestran «Empresa o proyecto: …» cuando hay nombre. Con el campo vacío se omite la línea y el nombre de archivo conserva su formato sin empresa.
- El memo de capital conserva la exportación vigente mediante `documentoWorkbook`, que incluye las recomendaciones; se restauró la empresa en ese documento y en su nombre de archivo. No se volvió al antiguo `exportTable`, para conservar la funcionalidad incorporada previamente.
- Conservados los ejemplos precargados, PDF y Excel en todas las pestañas, las recomendaciones y el selector de sector y tamaño.
- `Wacc.tsx` no se modificó: la página independiente de Costo de capital sigue sin campo de empresa y sus descargas siguen sin empresa.

## Pruebas y resultados

Todos los comandos se ejecutaron en `web/` y terminaron con código 0:

- `npm run lint`: sin errores ni advertencias de ESLint.
- `npm run build`: compilación, TypeScript y generación de las siete páginas completados.
- `npm test`: suite completa aprobada, incluidos diagnóstico, lectura de 32/32 formatos, 95 comprobaciones financieras, calculadora y documentos.

Las pruebas actualizadas verifican la posición y unicidad del campo, la propagación a las cinco vistas previas, los callbacks reales de Excel de las seis variantes de cálculo, nombres seguros con acentos y caracteres especiales, conservación de recomendaciones y exportación de WACC sin empresa. También verifican la empresa en PDF y Excel de los cinco documentos y su ausencia cuando el nombre está vacío. La captura de Excel se hace en memoria, sin abrir el navegador ni escribir descargas.

Se corrigieron durante la verificación la codificación de acentos de los nuevos casos de prueba y la simulación de hooks del caso WACC; la ejecución completa final pasó. `git diff --check` pasó para los archivos intervenidos.

## Alcance y reglas

Archivos modificados en esta tarea:

- `src/components/CalcSecciones.tsx`
- `src/components/Calculadora.tsx`
- `src/components/CalcTasas.tsx`
- `src/components/CalcCreditos.tsx`
- `src/components/CalcProyectos.tsx`
- `src/components/DocumentoMirage.tsx`
- `src/lib/documento.ts`
- `src/lib/documento-excel.ts`
- `src/components/__tests__/calc.cjs`
- `src/lib/__tests__/documento.cjs`

Además se creó este informe. Se compararon las huellas SHA-256 de los 416 archivos presentes al iniciar: solo cambiaron los diez archivos anteriores. Los cambios previos ajenos a esta tarea se conservaron. No se modificaron los archivos ni directorios protegidos. No se añadieron textos visibles prohibidos ni avisos sobre envío de datos. No se instalaron dependencias, se usó la red, se desplegó ni se hicieron commits. El build produjo únicamente sus artefactos locales en `web/`.
