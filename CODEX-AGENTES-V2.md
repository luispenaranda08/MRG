# Tarea: rehacer la interfaz de `/agentes/` (Mirage) — versión simple

La versión actual está rechazada por el dueño del producto: demasiadas casillas, catálogo de "capacidades certificadas", operadores, conexiones, conteos, códigos de bloque. **Nadie entiende cómo crear un agente así.** La nueva regla es: **el usuario escribe lo que quiere y el sistema crea el agente.** Ajustes también por instrucción escrita, nunca con casillas técnicas.

## Reglas duras

1. Solo toca `web/src/components/agentes/*` y `web/src/app/agentes/page.tsx`. No toques `web/src/lib/**`, `web/api/**`, `web/scripts/**` ni nada más. No hagas commit.
2. **Prohibido mostrar**: "capacidades certificadas", catálogo de capacidades, filtros por dominio o perfil, conteos en chips (`<Numero>` junto a títulos), códigos tipo `[ CRED ]` / `[ SECTOR ]` / `AGT>`, operadores (`>=`, `<=`…), umbrales editables, selectores de "Conexiones", "Valor fijo", "Subir/Bajar/Quitar" pasos, "+ Agregar entrada", "+ Agregar regla", identificador de la ejecución, versiones de bloques, traza de ejecución, "Duplicar", "Exportar JSON". Nunca menciones JEV, modelos, proveedores de IA ni tokens.
3. **Las cuatro cajas tienen exactamente el mismo tamaño** (mismo ancho y misma altura). Escritorio ≥1100 px: 4 columnas iguales en una fila. 700–1099 px: 2×2 con `grid-auto-rows: 1fr`. Móvil: una columna. Si el contenido de una caja es largo, la caja hace scroll interno (`overflow:auto`) en vez de crecer más que las otras; altura sugerida en escritorio: `min-height: 360px; max-height: 520px`.
4. Español de Colombia, trato de usted, frases cortas. Estilo institucional del sitio (variables CSS de `globals.css`: `--encabezado-fondo`, `--clave-*`, `--insumo-*`, `--alerta-*`, `--nota-texto`; clases `.card`, `.alert`, `.source`). Nada de azul "IA", nada de degradados, nada de emojis.
5. Accesible: etiquetas en todos los campos, foco visible, `role="status"` para estados de carga.
6. `npm run build` y `npx eslint src/app/agentes src/components/agentes` deben pasar. Escribe el resultado en `CODEX-AGENTES-V2-RESULTADO.md` (corto).

## Lo que ya existe en la fachada `@/lib/agentes` (úsalo, no lo reescribas)

- `planificar(texto, base?)` → `Promise<Plan>` (`plan.agente`, `plan.explicacion`). Sin `base` crea un agente desde cero; con `base` (el agente actual) aplica el texto como **cambio** ("que también niegue si la PD pasa de 4 %").
- `cajas(agente, valores)` → `{ documentos: Campo[], datos: {nombre, descripcion}[], calculo: {nombre, descripcion}[], instrucciones: { entrega, texto, criterios: string[] } }`. Los criterios ya vienen como frases ("Niega si PD a un año supera 5,00 %."). **Pinta exactamente esto**, no derives nada de los pasos.
- `paqueteAgente(agente, valores, datos)` → `Promise<{ nombre, zip: Blob }>`: el .zip descargable. Descárgalo con un `<a download>` y `URL.createObjectURL`.
- `ejecutarAgente(agente, valores, datos)`, `instruir(agente, ejecucion)`, `validarTexto`, `formatoCifra`, `cargarEjemplo`, `EJEMPLOS`, `prepararEmpresa`, `listarAgentes`, `guardarAgente`, `eliminarAgente`, `importarAgente`, `validarAgente` — como hoy.
- `useDatos()` de `@/components/Mirage` para los datos de mercado.
- `CampoEntrada` actual (`CampoEntrada.tsx`) sirve para los campos de la caja 1 (incluye la carga del archivo de estados con sector, tamaño y ejemplos). Puedes simplificar su presentación, pero conserva su lógica de carga.

## Pantalla, de arriba abajo

### 1. Encabezado
- h1 «Agentes». Bajada de una línea: «Describa la tarea y Mirage arma el agente. Usted revisa, lo ejecuta o se lo lleva.»
- Sin eyebrow con códigos.

### 2. Crear (siempre visible arriba)
- Un `textarea` grande (3–4 líneas) con etiqueta «¿Qué debe hacer su agente?» y placeholder: «Ej.: Evalúe si le presto 800 millones a 5 años a una pyme. No apruebe si el DSCR es menor a 1,3 y entrégueme un memo para el comité.»
- Botón principal «Crear agente».
- Debajo, 3 ejemplos como enlaces de texto sencillos que rellenan el `textarea` (no lo envían):
  - «Memo de crédito para una pyme con DSCR mínimo de 1,3»
  - «WACC del sector con sensibilidad a la beta»
  - «Valoración por flujo de caja descontado de una empresa»
- Mientras crea: estado «Armando el agente…» (puede tardar ~10 s; deshabilita el botón).
- Al terminar: se muestra la sección 3 y se desplaza hasta ella. Si falla: mensaje `.alert` con el error.
- **No** cargues ningún agente al entrar a la página: el usuario empieza por escribir. (Sí puede abrir uno de «Mis agentes».)

### 3. El agente (solo cuando hay agente)
- Título h2 con `agente.nombre` (editable en línea con un botón lápiz pequeño o input sin borde; opcional) y debajo `plan.explicacion` / `agente.descripcion` en una línea.
- **Las cuatro cajas** (mismo tamaño, ver regla 3), cada una con número grande y título:
  1. **Documentos** — «Lo que usted entrega». Los campos de `cajas().documentos` con `CampoEntrada`, ya llenos con sus valores por defecto. El archivo de estados primero.
  2. **Datos Mirage** — «Lo que aporta Mirage». Lista simple de `cajas().datos`: nombre en negrita y descripción en una línea gris. Sin edición. Una nota pequeña al pie: «Datos con fecha de corte {datos.meta.corte}».
  3. **Cálculo** — «Lo que calcula». Lista simple de `cajas().calculo`, igual que la 2. Sin edición.
  4. **Instrucciones** — «Lo que entrega y cómo decide». `entrega` en negrita (ej. «Memo para comité»), luego `texto` como párrafo, luego «Criterios» con la lista de frases. Sin edición directa.
- Debajo de las cajas, una sola línea para ajustar: input «Pida un cambio» con placeholder «Ej.: que también niegue si la deuda neta / EBITDA supera 3 veces» + botón «Aplicar». Llama `planificar(texto, agente)`; conserva los valores de la caja 1 que sigan existiendo (mismo id).
- Acciones (una fila): **«Ejecutar»** (principal) · **«Descargar agente (.zip)»** · «Guardar». Bajo «Descargar», texto pequeño: «Incluye el programa, sus datos y las instrucciones para usarlo en su equipo.»

### 4. Resultado (tras ejecutar)
- Arriba, grande: la decisión («Aprobado», «Aprobado con condiciones», «Negado», o «Sin criterios de decisión»), con el tono del sitio (`--clave-*` para aprobado, `--alerta-*` para negado/condicionado).
- El texto del Motor Mirage con las cifras resaltadas como hoy (`TextoValidado` en `Resultado.tsx` sirve; conserva el marcado de cifras sin respaldo). Botón «Editar texto» puede quedarse.
- «Criterios»: lista con cada criterio y su valor: ✓/✗ en texto («cumple» / «no cumple — mensaje»), sin tabla de operadores ni umbrales.
- Un único `<details>` cerrado «Ver todas las cifras» con las cifras agrupadas por cálculo (nombre del bloque, no su código) y las tablas (amortización, etc.).
- Botón «Imprimir».
- Si la ejecución se detiene: `.alert` con el motivo.

### 5. Mis agentes
- Lista simple al final: nombre + descripción, botones «Abrir» y «Eliminar» (con confirmación). Un enlace «Importar agente» (input file `.json`) discreto.

## Archivos
- Reescribe `ConstructorAgentes.tsx`, `Resultado.tsx`, `agentes.css`. Simplifica `CampoEntrada.tsx` si hace falta. **Borra `Receta.tsx`** (ya no se usa). `Comun.tsx` puede quedarse.
- CSS legible (no minificado en una línea): una regla por línea está bien.

## Verificación que debes hacer
- `npm run build`, eslint.
- Revisa a 1440, 900 y 375 px que las cuatro cajas midan lo mismo (mide con `getBoundingClientRect` en el navegador headless si puedes) y que no haya desborde horizontal.
