# Tarea para Codex · Mirage: interfaz del constructor de agentes (`/agentes/`)

Trabajas en `web/` (Next.js 16, export estático, React 19, TypeScript). Construyes **solo la interfaz**. La lógica (bloques, ejecución, validación de cifras, servidor) la escribe otro agente en paralelo en `web/src/lib/agentes/` y `web/api/agente/`.

## Reglas duras

1. **No crees, borres ni modifiques nada en `web/src/lib/agentes/` ni en `web/api/`.** Si una función de la fachada todavía no compila o no existe, sigue con la interfaz contra el contrato de abajo; el dueño de esa carpeta la completa. No escribas stubs propios de esas funciones en otro lugar.
2. Archivos que puedes crear o editar: `web/src/app/agentes/page.tsx`, `web/src/components/agentes/*.tsx` (los que necesites), `web/src/components/agentes/agentes.css`, y en `web/src/components/Mirage.tsx` **solo** la lista de la navegación para agregar `["/agentes/", "AGT", "Agentes"]` al final.
3. Nunca escribas en la interfaz el nombre de un modelo de IA ni de un proveedor. La IA se llama **«Motor Mirage»**. Nada de «chat», «chatbot», «asistente», «beta», «MVP», «pendiente», «por entrenar» ni avisos de envío de datos.
4. Estilo: el mismo de Mirage (IBM Plex Sans y Mono, las clases y variables de `globals.css`: `.card`, `.cifra`, `.tono-*`, `--clave-*`, `--insumo-*`, `--encabezado-*`, `--nota-texto`, `.eyebrow`, `.actions`, `.alert`). Institucional: papel, tinta, carbón y los tonos de `estilo.json`. Sin azul brillante tipo IA, sin degradados, sin tema oscuro de terminal, sin emojis. Códigos de bloque en mono, como las funciones de Bloomberg: `[ WACC ]`, `[ AMORT ]`.
5. Toda cifra se muestra con el componente existente `Cifra` (`@/components/Cifra`) usando `formatoCifra(cifra)` de la fachada, que ya trae formato y nota con la fuente. No formatees números a mano.
6. Accesible: etiquetas en todos los campos, `aria-live` para estados de carga y resultados, todo operable con teclado, foco visible.
7. Responsive real. En ≤ 700 px la navegación ya pasa abajo (fija); revisa que con 4 ítems no se corte. Las cuatro cajas se apilan en una columna como secciones numeradas plegables; el botón «Ejecutar agente» queda fijo por encima de la navegación inferior.

## Contrato de la fachada (`import { … } from "@/lib/agentes"`)

Tipos en `web/src/lib/agentes/tipos.ts` (léelo completo). Funciones:

| Función | Uso |
|---|---|
| `capacidadesCertificadas(): Capacidad[]`, `CAPACIDADES`, `DOMINIOS`, `PERFILES` | Catálogo. En la interfaz se ofrecen **solo las certificadas**; el conteo se lee de los datos, nunca fijo en el código |
| `plantilla(codigo): Agente` | Agente listo de una capacidad |
| `DEF_BLOQUES`, `defBloque(codigo)` | Bloques. `caja: "datos"` va en la caja 2 y `caja: "calculo"` en la 3 |
| `agenteVacio()`, `nuevoPaso(bloque, agente)`, `validarAgente(agente): string[]`, `salidasDisponibles(agente, hastaPaso)`, `duplicarAgente(agente)` | Edición de la receta |
| `prepararEmpresa(buffer, nombreArchivo, { sector, tamano, pais?, moneda?, unidad?, nombreEmpresa? }, datos): Promise<EmpresaPreparada>` | Campo de tipo `estados` |
| `EJEMPLOS: { id, etiqueta }[]`, `cargarEjemplo(id, datos, opciones?): Promise<EmpresaPreparada>` | Archivos de ejemplo |
| `ejecutarAgente(agente, valores, datos): Ejecucion` | Síncrona. Si `estado === "detenida"`, mostrar `detenida.motivo` (falla cerrada) |
| `instruir(agente, ejecucion): Promise<TextoMotor>` | Texto de la caja 4 con su validación |
| `planificar(objetivo): Promise<Plan>` | Línea de comando en lenguaje natural |
| `validarTexto(texto, ejecucion): Validacion` | Por si el usuario edita el texto |
| `formatoCifra(cifra): Celda` | Para `<Cifra celda={…} />` |
| `listarAgentes()`, `guardarAgente(a)`, `eliminarAgente(id)`, `exportarAgente(a): string`, `importarAgente(texto): Agente` | Mis agentes (navegador) |

`datos` sale de `useDatos()` (`@/components/Mirage`). Los valores de la caja 1 van en un `Record<string, ValorCampo>` por `id` de entrada; las tasas se guardan como fracción (el usuario escribe 12 y se guarda 0,12).

## La página `/agentes/`

Componente cliente. Orden de arriba abajo:

1. **Encabezado**: eyebrow `[ AGT ] / CONSTRUCTOR DE AGENTES`, h1 «Agentes», bajada: «Arme agentes de finanzas corporativas con datos de mercado y cálculos verificados. Cada cifra queda con su fuente.»
2. **Línea de comando** (no es un chat): un campo en mono con el prefijo `AGT>` y el texto de ejemplo «Describa la tarea o escriba un código: CRED, WACC, DCF…». Mientras se escribe, una lista (combobox accesible) sugiere capacidades certificadas por código o nombre. Enter con un código carga `plantilla(codigo)`; con texto libre llama a `planificar(texto)` y muestra «Armando el agente…» y luego `plan.explicacion` en una línea bajo el campo.
3. **Catálogo**: filtros por dominio (chips con conteo) y por perfil (select). Rejilla densa de capacidades: código en mono, nombre, descripción corta. Al elegir una se carga su plantilla en las cajas y la página baja a ellas.
4. **Las cuatro cajas** (rejilla de 4 columnas en escritorio, 2 × 2 en tableta, una columna en móvil). Cada caja: número, título, conteo y «+ Agregar …».
   - **1 · Entradas**: formulario generado de `agente.entradas` según `tipo` (`numero`, `entero`, `dinero` con separadores de miles es-CO, `tasa` en %, `texto`, `booleano`, `opcion`, `codigo_tasa` (EA, EM, ET, ES, NAMV, NATV, NASV, NAMA, NATA), `flujos` (lista editable de números, año 0 primero), `sector` (select de `datos.sectores`: «CIIU · nombre»), `tamano` (claves de `por_tamano` del sector), `estados` (zona para soltar archivo + botones de ejemplo; al cargar muestra nombre, años, moneda, unidad y alertas)). «+ Agregar entrada» abre un formulario corto (etiqueta, tipo) que genera el id.
   - **2 · Datos Mirage** y **3 · Cálculo**: tarjetas de los pasos cuyo bloque es de esa caja, en orden. Cada tarjeta: código en mono, nombre, fuente corta y versión; un desplegable «Conexiones» con un select por entrada del bloque para elegir: una entrada del agente, una salida de un paso anterior (`salidasDisponibles`) o un valor fijo. Botones subir, bajar y quitar. Después de ejecutar, la tarjeta muestra sus 3 cifras principales. «+ Agregar dato» / «+ Agregar cálculo» abre un selector de bloques de esa caja con búsqueda.
   - **4 · Instrucción**: textarea para la instrucción particular; select del tipo de texto (`memo`: «Memo», `decision`: «Decisión», `resumen`: «Resumen ejecutivo», `ninguna`: «Sin texto»); lista de reglas (cifra calculada, operador, umbral, efecto si no se cumple: aprobar / condicionar / negar / alertar, mensaje) con «+ Agregar regla».
   - Debajo de las cajas: nombre y descripción del agente editables, y los errores de `validarAgente` si los hay.
5. **Barra de ejecución**: «Ejecutar agente» (botón principal, fondo `--encabezado-fondo`), «Guardar», «Duplicar», «Exportar», «Importar», «Nuevo agente». Ejecutar = `ejecutarAgente` y, si la salida no es `ninguna` y la ejecución está completa, `instruir`. Estados: «Calculando…», «Redactando con el Motor Mirage…».
6. **Resultado**:
   - Franja de métricas: decisión (`ejecucion.decision.efecto`: Aprobar / Condicionar / Negar / Sin reglas), cifras calculadas (cuántas), «Cifras sin respaldo: X de N» (de `texto.validacion`), identificador de la ejecución.
   - **Texto del Motor Mirage**: render de markdown simple (párrafos, `###` títulos, `- ` viñetas, `**negrita**`). Cada cifra de `validacion.coincidencias` va envuelta con la clase `cifra tono-clave` y un tooltip con la etiqueta y la fuente de la cifra a la que corresponde (`ejecucion.cifras[clave]`). Las de `sinRespaldo` van con `tono-alerta` y el tooltip «Cifra sin respaldo en la ejecución». Si el usuario edita el texto (botón «Editar texto»), se revalida con `validarTexto`.
   - **Reglas**: tabla con cifra, valor, umbral, cumple o no y mensaje.
   - **Cifras por paso**: tabla agrupada por paso (código y nombre del bloque): etiqueta y `<Cifra>`.
   - **Tablas** de la ejecución (`ejecucion.tablas`) en `.table-scroll` plegables.
   - **Traza**: lista plegable de pasos con bloque, versión, milisegundos y entradas efectivas. Botón «Descargar traza (JSON)».
   - Botón «Imprimir» con reglas de impresión que dejan solo el texto, las reglas y las cifras.
7. **Mis agentes**: lista de `listarAgentes()` con abrir, duplicar y eliminar (con confirmación).

Al abrir la página por primera vez se carga la plantilla `CRED` con el ejemplo PYME para que el usuario vea un agente completo; no se ejecuta solo.

## Verificación antes de terminar

- `npm run build` sin errores y `npx eslint src/app/agentes src/components/agentes` sin errores. Si la fachada aún no compila por archivos de `src/lib/agentes` que no son tuyos, dilo en el resultado en vez de tocarlos.
- Revisa la página a 1440, 768 y 375 px de ancho (sin desbordes horizontales, navegación inferior con 4 ítems legible).
- Escribe `CODEX-AGENTES-RESULTADO.md` en la raíz del repo: archivos creados, decisiones de interfaz y lo que no pudiste verificar.
- No hagas commit.
