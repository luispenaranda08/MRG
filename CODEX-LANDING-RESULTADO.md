# Resultado · Landing de HyperTarget

Fecha: 8 de octubre de 2026.

La landing está implementada. La revisión estática pasó; la verificación en navegador quedó pendiente por restricciones del entorno. No se desplegó nada ni se instalaron paquetes.

## Archivos

- `index.html`: navegación sticky y las siete secciones solicitadas, metadatos, fuentes Google Fonts y logos SVG inline.
- `site.css`: tokens solicitados, rejillas responsive, paneles carbón, tipografía, estados de foco y reducción de movimiento.
- `site.js`: aparición de secciones con IntersectionObserver. El contenido sigue visible si JavaScript está desactivado.
- `favicon.svg`: H original en `#1F2124`, sobre fondo transparente.
- `fintarget-mockup.html`: única inserción del enlace `← HyperTarget` antes del logo, dentro de `.top`, con estilo discreto de 11 px, color `var(--top-ink)` y hover blanco. Sin cambios en su lógica ni estilos existentes.
- Este resumen, solicitado expresamente, es la única excepción a la prohibición de crear o editar Markdown.

No se creó la presentación. No se modificaron archivos de configuración, documentos existentes, backups, qa ni archivos de otros productos.

## Decisiones de diseño

Se siguió el sistema visual fijado en CODEX-LANDING.md: portada en cuatro bandas, carbón y papel, titulares de peso ligero, líneas estructurales de 1 px y paneles que llegan al borde derecho. Se usaron Hanken Grotesk e IBM Plex Mono, y las marcas originales de HyperTarget y FinTarget; sin imágenes raster, sombras ni gradientes.

El CTA principal está en la barra sticky y en el hero. Los círculos del hero responden al hover y al foco de sus CTA mediante una transición de 300 ms. Las animaciones y el desplazamiento suave se desactivan con `prefers-reduced-motion`.

Los seis problemas usan `details` y `summary` nativos. El método es una lista HTML conectada mediante CSS; cambia a una cadena vertical en móvil. El dorado aparece solo en el borde de Resultado y en la cifra 47,5 %, dentro de secciones distintas. Esta cifra va sobre carbón para conservar contraste. Los planes se presentan como hipótesis, sin precios ni acuerdos atribuidos a las instituciones mencionadas.

Se priorizó el encargo específico de landing frente a los apartados generales del brief que describen una presentación futura. También prevaleció el alcance de archivos del usuario sobre las propuestas de documentación adicional de la skill impeccable.

## Datos pendientes

- Acceso institucional: `[por confirmar]`.
- Correo: `[correo por confirmar]`, con `mailto:` sin destinatario, tal como exige el encargo. Todavía no es un contacto operativo.
- Ubicación: `Barranquilla, Colombia [por confirmar]`.

Las cinco cifras de validación proceden de las adendas V2 y V3 de MAPA-Y-EVOLUCION.md. Se incluyó la nota que limita su alcance a consistencia contra talleres académicos, sin afirmar una validación metodológica externa.

## Verificaciones realizadas

- `node --check site.js`: correcto.
- HTML: un solo h1, IDs únicos, seis componentes desplegables, destinos de archivos existentes y todas las anclas internas resueltas.
- SVG inline y favicon: paths cotejados con las marcas originales; SVG decorativos con `aria-hidden`.
- Sin raster ni librerías nuevas. HTML + CSS: **26.124 bytes**, inferior a 60 KB.
- FinTarget: comprobación byte por byte contra una copia temporal previa. Al retirar únicamente el enlace insertado, se recupera exactamente el archivo original, incluidos sus finales de línea.
- Contrastes calculados desde los colores definidos: claro/carbón 12,93:1; secundario/carbón 6,29:1; tinta/papel 11,54:1; secundario/papel 6,07:1; secundario/papel-2 5,12:1; texto de problema/carbón-2 7,67:1; dorado/carbón 6,70:1. Esto verifica los pares explícitos, no sustituye una auditoría de estilos computados.
- Detector de impeccable ejecutado una vez: sin hallazgos por expresiones regulares. Indicó modo degradado por ausencia de módulos de parsing, por lo que su resultado no certifica accesibilidad.
- Revisión independiente de solo lectura: se corrigieron los paths SVG y el foco de los CTA; la revisión confirmó ambas correcciones y cerró sin bloqueos estáticos pendientes, con verificación dinámica pendiente.

## Verificación bloqueada

Se intentó `python3 -m http.server 8765` en la carpeta. El entorno rechazó la apertura del puerto con `PermissionError: [Errno 1] Operation not permitted`.

Se intentó abrir el HTML local en Chrome headless y en chrome-headless-shell mediante Playwright Core ya instalado. El navegador no pudo iniciar: `bootstrap_check_in ... Permission denied (1100)`.

Por estas restricciones, **no se comprobaron en navegador** las anchuras 1440, 768 y 375 px; no hay medición real de `document.documentElement.scrollWidth <= innerWidth`, pruebas de clic de ida/vuelta ni confirmación de ausencia de errores de consola de FinTarget. El CSS contempla estos tamaños y se revisó estáticamente, pero el comportamiento renderizado no está certificado.

No se generaron capturas ni archivos en `referencias/capturas/`.

Para completar la comprobación en un entorno que permita servidor y navegador:

1. Ejecutar `python3 -m http.server 8765` desde esta carpeta y abrir `http://localhost:8765/`.
2. Probar 1440, 768 y 375 px y evaluar `document.documentElement.scrollWidth <= innerWidth`, también con los componentes desplegables abiertos.
3. Pulsar `Entrar a FinTarget →` y luego `← HyperTarget`; revisar la consola de ambas páginas y el foco con teclado.
4. Revisar movimiento reducido, carga de las fuentes y guardar capturas en `referencias/capturas/` si se desea documentar esa comprobación.

## V2

Fecha: 8 de octubre de 2026. Esta sección describe el estado actual y reemplaza las decisiones y pendientes de V1 que aparecen arriba.

Se editaron únicamente `index.html`, `site.css`, `site.js` y este resumen. FinTarget, favicon, configuración, backups, qa y archivos de otros productos permanecen intactos. No se instalaron paquetes ni se desplegó nada.

### Cambios

- Hero carbón a sangre completa, sin bandas, marca HT gigante, año gigante ni círculos. Altura mínima `min(88vh, 820px)`, titular con corchetes grandes dorados, bajada y CTA en línea cuando hay espacio.
- Etiquetas `.bracket` en mono, mayúsculas y sin fondo; corchetes generados por CSS. En Planes se usa únicamente `HIPÓTESIS POR VALIDAR`, conforme a la instrucción específica de V2 §6.
- Ticker estático con los cinco valores solicitados y aviso del corte de ejemplo. El desplazamiento queda dentro de un contenedor enfocable; no hay animación de marquesina.
- FinTarget conserva la única tarjeta carbón con radio grande. Estado `EN LÍNEA` con punto dorado de 6 px y pulso suave. Acceso institucional muestra `PRÓXIMAMENTE` y el texto solicitado enlazado a contacto, sin marcador pendiente.
- Problema y Contacto pasan a fondos carbón a sangre completa, sin radios. Contacto queda unido al pie, con CTA principal visible y enlace de correo vacío, oculto y preparado con `data-email`. Pie: `© 2026 HyperTarget · Colombia`.
- Método pasa a dos columnas 5/12 y 7/12, con texto y linaje vertical de ocho nodos; fórmulas integradas, Resultado entre corchetes y nodo dorado. La línea se dibuja en 900 ms y los nodos aparecen en secuencia. El contenido permanece visible sin JavaScript, sin IntersectionObserver o con movimiento reducido.
- Validación muestra cinco columnas sin fondo, separadas por líneas; tres más dos en tablet y una en móvil. Se conservan cifras, contextos y nota académica. El 47,5 % conserva el relleno dorado y lleva un contorno fino de tinta suave para mejorar su lectura sobre papel; su contraste renderizado debe revisarse con Claude.
- Separadores entre secciones papel, padding vertical `clamp(72px, 10vw, 128px)`, navegación mono en mayúsculas y cuatro planes conservados.
- Se eliminó el CSS de bandas, círculos, píldoras, cajas del método, tarjeta de fórmulas y fondos de las métricas.

### Verificación V2

- `node --check site.js`: correcto.
- Cero coincidencias de `por confirmar` en `index.html`; cero de `section-tag` en HTML y CSS.
- Parser estático: etiquetas equilibradas, un h1, IDs únicos, anclas resueltas, destinos locales existentes, seis desplegables, ocho nodos y cinco cifras. Valores del ticker cotejados con el encargo.
- Prueba de `site.js` en VM de Node: activación al intersectar, índices secuenciales de los ocho nodos, desconexión y retiro de clases al activar movimiento reducido, y salida sin observer cuando no está disponible.
- HTML + CSS: **27.745 bytes**, inferior a 60 KB.
- Hashes previos y posteriores: archivos protegidos sin cambios. El registro externo `referencias/codex-landing-v2.log` varió durante la sesión; Codex no lo editó.
- Detector impeccable ejecutado una vez: sin hallazgos por regex, en modo degradado por falta de módulos de parsing. No evalúa contraste computado ni certifica accesibilidad.

No se abrió navegador ni servidor, por instrucción expresa. La verificación visual y de overflow a 1440, 768 y 375 px, clics, consola y contraste renderizado queda a cargo de Claude. No se generaron capturas. El correo sigue sin configurar y permanece oculto; no se inventó una dirección.


## V3

Fecha: 8 de octubre de 2026. Esta sección actualiza el hero y el contacto descritos en V2.

Se editaron `index.html`, `site.css` y este resumen, cuya actualización está expresamente solicitada en V3. `site.js` conserva íntegra la lógica de V2: el respaldo V1 anima los círculos exclusivamente con CSS, sin JavaScript adicional. No se instalaron paquetes ni se desplegó nada.

### Cambios V3

- Hero restaurado desde `backups/2026-10-08-landing-v1/`: panel carbón con radio de 28 px, sangrado derecho, cuatro bandas, HT grande, marca H, año y círculos. Se conservan medidas, fuentes, breakpoints y movimiento reducido de V1.
- Únicas excepciones del hero: corchetes dorados en «una auditoría» y CTA secundario `[ CÓMO CALCULAMOS ]` de V2. El selector de hover/foco de los círculos se adapta a `.bracket-link`; conserva el desplazamiento y los 300 ms de V1. La frase puede envolver siguiendo la tipografía móvil V1.
- Ticker V2 trasladado inmediatamente después del panel: papel, tinta, líneas de 1 px arriba y abajo, alineación al container y scroll horizontal interno enfocable. Datos y reglas de desplazamiento móvil conservados.
- Correo visible en `.contact-email`, sin `hidden` ni `data-email`, con `mailto:founder@hypertarget.tech`; etiqueta `[ ESCRÍBENOS ]` encima. El pie incorpora el mismo enlace junto a «© 2026 HyperTarget · Colombia». No se añaden compromisos ni tiempos de respuesta.
- Productos, Problema, Método, Validación y Planes mantienen el HTML de V2. «Próximamente» sigue enlazando a `#contacto`; se conservan corchetes de sección, linaje vertical, validación en fila y ritmo de secciones.

### Verificación V3

- `node --check site.js`: correcto.
- `grep -c "por confirmar" index.html`: **0**.
- `grep -c "founder@hypertarget.tech" index.html`: **2** líneas; cuatro apariciones entre texto visible y atributos de los dos enlaces.
- Comparación exacta del HTML del hero contra V1, revirtiendo únicamente las dos excepciones permitidas: coincide.
- 46 reglas CSS del hero cotejadas con V1 en sus respectivos media queries; comprobada también la tipografía móvil. Se excluye el tamaño del antiguo CTA secundario por la excepción de estilo V2.
- Parser estático: etiquetas equilibradas, un h1, IDs únicos, anclas resueltas y destinos locales existentes. Ticker fuera del hero y enlaces de correo visibles.
- HTML + CSS: **30937 bytes**, inferior a 60 KB.
- Hashes de archivos protegidos: sin cambios salvo el registro externo `referencias/codex-landing-v3.log`, que varió durante la sesión y no fue editado por Codex. FinTarget, backups, qa, configuración, favicon y demás documentos permanecen intactos.
- Detector impeccable ejecutado una vez: sin hallazgos por regex; modo degradado por falta de módulos de parsing. No certifica contraste ni accesibilidad renderizados.

No se abrió navegador ni servidor y no se generaron capturas. La comprobación visual, overflow a 1440, 768 y 375 px, interacción real, consola y contraste renderizado queda a cargo de Claude, según V3.


## V4

Fecha: 8 de octubre de 2026. Esta sección reemplaza la descripción de Método y la antigua oferta de acceso de las versiones anteriores.

Se editaron únicamente `index.html`, `site.css` y este resumen, cuya actualización está expresamente solicitada por V4. `site.js` permanece idéntico al estado previo. No se abrió navegador ni servidor, no se instalaron paquetes y no se desplegó nada.

### Cambios V4

- Método conserva el trazo vertical, los ocho nodos, la animación y Resultado con punto dorado y corchetes. Se sustituyeron fórmulas y siglas por los nombres y explicaciones exactos del encargo; notas en Hanken Grotesk a 15 px y `--ink-soft`. Se actualizó el párrafo y se añadió `[ VER LA METODOLOGÍA COMPLETA ]` hacia `fintarget-mockup.html#method`. Se retiraron los estilos exclusivos de las fórmulas.
- Se eliminaron íntegramente Planes y su CSS, incluidas las reglas responsive. Navegación actualizada a Acceso y texto de Próximamente sustituido por la invitación solicitada, conservando `#contacto`.
- Nueva sección `[ 05 · POR QUÉ ]` después de Validación: papel, separador de 1 px, titular y bajada solicitados, cuatro columnas numeradas con línea superior. Títulos sans de 22 px, cuatro columnas en escritorio, dos hasta 1100 px y una hasta 540 px. Solo «cada día» usa `--accent-ink`.
- Nueva franja carbón a sangre completa `[ 06 · ACCESO ]`: «Abierto para todos.», explicación del acceso público, CTA con el mismo estilo y destino del hero y detalle `[ SIN REGISTRO · SIN COSTO ]`. Dos columnas en escritorio, una hasta 800 px y padding vertical más corto que las otras secciones.
- Contacto pasa a `[ 07 · CONTACTO ]`, separado de Acceso por una línea de 1 px `--line-dark`. Se conservan correo, pie y demás contenido de V3.
- Hero, ticker, sistema de corchetes, Productos (salvo la línea solicitada), Problema y Validación conservan su implementación de V3.

### Verificación V4

- `node --check site.js`: correcto.
- `grep -ciE "planes|plan-|licencia|hipótesis|zero|thiel|monopol" index.html site.css`: **0 en ambos archivos**.
- Conteo de `βL`, `WACC =` y `Ke =` en `index.html`: **0**. No quedan las siglas prohibidas en el texto de Método.
- Parser estático: etiquetas equilibradas, un solo h1, IDs únicos, referencias `aria-labelledby` válidas, anclas internas resueltas, destinos locales existentes, seis desplegables, ocho nodos del método, cuatro columnas de Por qué y etiquetas 01–07 en el orden solicitado.
- Hero y ticker: comparación exacta de su HTML con una copia temporal previa; idénticos. Diff CSS limitado a Método, retiro de estilos anteriores y nuevas secciones; estilos compartidos, corchetes, hero y ticker intactos.
- El destino `#method` está reconocido por el enrutador existente de FinTarget: toma el hash inicial y muestra `#v-method`. Comprobación estática, sin ejecutar FinTarget ni modificarlo.
- CSS con llaves equilibradas; HTML + CSS: **32.786 bytes**, inferior a 60 KB.
- Hashes de archivos del proyecto registrados antes de editar: los únicos archivos editados por Codex son `index.html`, `site.css` y este resumen. El registro externo `referencias/codex-landing-v4.log` también varió durante la sesión; Codex no lo editó. FinTarget, favicon, configuración, backups, qa y otros documentos permanecen intactos.
- Detector impeccable ejecutado una vez: sin hallazgos por regex, en modo degradado por ausencia de módulos de parsing. No certifica accesibilidad ni contraste renderizado.

Por instrucción expresa no se realizó verificación visual, medición real de overflow, prueba de clics ni revisión de consola a 1440, 768 o 375 px. Se revisaron las reglas responsive estáticamente; no se generaron capturas. No se añadieron datos pendientes ni afirmaciones ajenas al encargo.

## V5

Fecha: 8 de octubre de 2026. Cambios limitados a la franja `.ticker` en `index.html`, `site.css` y `site.js`, más esta sección expresamente solicitada por V5.

- Cinta continua de derecha a izquierda mediante `translateX(-50%)`, dos grupos de igual ancho y duración calculada a 40 px/s. La segunda copia lleva `aria-hidden="true"`.
- Olas de 14 × 5 cuadrados de 4 px, separados por 2 px, en canvas de 82 × 28 px escalados por `devicePixelRatio`. Caminata de seno y ruido pequeño, limitada a una fila de diferencia entre columnas, con avance cada 600 ms. Última columna en `--accent-ink`; resto en `--ink`, contornos apagados en `--line-light`.
- Variaciones decorativas en mono de 11 px, con flecha y color según la dirección de la ola; ambas copias permanecen sincronizadas. Las cinco cifras principales y sus nombres se conservan.
- Nota del corte fuera de la cinta, fija a la derecha sobre papel con transición transparente de 48 px; debajo y a la izquierda hasta 800 px. Máscara de 32 px en los bordes de la cinta.
- Pausa de cinta y olas al pasar el cursor, recibir foco, salir del viewport u ocultarse la pestaña. Con movimiento reducido se conserva una sola fila estática desplazable y se dibujan las olas sin animarlas. Sin JavaScript queda disponible la fila desplazable.
- Una sola región accesible, «Indicadores de ejemplo». Canvas y variaciones ocultos a lectores de pantalla; foco visible en la cinta.

### Verificación V5

- `node --check site.js`: correcto.
- Prueba en VM de Node con DOM y APIs simulados: velocidad calculada, escala retina, avance de olas, diferencias máximas de una fila, duplicados sincronizados, dirección de variaciones, pausas por hover/foco/viewport/pestaña y movimiento reducido inicial y dinámico. Esta prueba no equivale a ejecutar un navegador.
- Comparación byte a byte con `backups/2026-10-08-landing-v4/`: HTML completo fuera de `.ticker` idéntico, incluido el hero y todas las demás secciones; CSS previo idéntico al excluir únicamente las reglas de ticker; JS previo conservado íntegramente.
- JS añadido: **3.766 bytes**, inferior a 4 KB. HTML + CSS: **35.719 bytes**, inferior a 60 KB. Sin librerías ni paquetes nuevos.
- Detector impeccable ejecutado una vez: sin hallazgos por regex, en modo degradado por ausencia de módulos de parsing; no certifica contraste ni accesibilidad renderizados.
- Hashes del proyecto cotejados antes y después: Codex editó únicamente los tres archivos de landing y este resumen. También variaron externamente `CODEX-LANDING-V5B.md` y `referencias/codex-landing-v5.log`; Codex no los editó. No se crearon archivos nuevos dentro del proyecto.

No se abrió navegador ni servidor, no se desplegó nada y no se generaron capturas. La revisión visual, la medición real de overflow y la interacción en navegador permanecen sin comprobar por instrucción expresa.

## V5b

Fecha: 8 de octubre de 2026. Se editaron únicamente las partes de `.ticker` en `index.html`, `site.css` y `site.js`, más esta sección expresamente solicitada por V5b. No se abrió navegador ni servidor, no se instalaron paquetes y no se desplegó nada.

- Se retiraron los mini-gráficos y las variaciones de V5, incluido su HTML, CSS y JS. Las cinco cifras conservan nombres y valores, mono de 12 px y separadores de 1 px. La cinta mantiene movimiento hacia la izquierda a 40 px/s, máscara de bordes, pausa con hover y foco y nota fija del corte. Los grupos tienen como mínimo el ancho visible de la cinta para evitar huecos en pantallas amplias.
- Un solo canvas decorativo, con `aria-hidden="true"`, cubre la franja por detrás de la cinta. Rejilla al tresbolillo de rombos de 8 px de diagonal y paso de 9,5 px. Dos senos de 400 y 550 px forman la ola, con curva entre el 35 % y el 85 % de la altura y avance hacia la izquierda a 15 px/s.
- Acero con las cinco paradas de color solicitadas; sprites de acero, brillo y contorno precalculados una vez fuera de pantalla a resolución 2×. El bucle utiliza `drawImage`, sin crear paths ni degradados por fotograma. Destello diagonal de izquierda a derecha cada 4 s, crestas más claras y contornos de 0,5 px en `--line-light`.
- Capa papel al 72 % entre ola y contenido. Franja de 72 px en escritorio y 64 px hasta 800 px; en ese tamaño la nota queda debajo de la cinta. Contraste calculado conservador: tinta sobre el fondo efectivo más oscuro posible, **5,95:1**; nota secundaria sobre papel opaco, **6,07:1**. Ambos superan AA para texto pequeño; no se midieron estilos renderizados.
- Un único bucle `requestAnimationFrame`; pausa con hover, foco, salida del viewport y pestaña oculta. `prefers-reduced-motion` deja la ola estática sin destello, detiene la cinta y permite desplazarla. Cambios de preferencia durante la sesión contemplados. Escala por DPR limitada a 2 y redimensionado mediante `ResizeObserver` sobre franja y grupo.

### Verificación V5b

- `node --check site.js`: correcto. `grep -c "▲\|▼" index.html site.js`: **0 en ambos archivos**; no quedan mini-gráficos ni clases de variaciones.
- Prueba en VM de Node con DOM y APIs simulados: escala retina limitada, sprites precalculados, redimensionado, un solo RAF activo, animación y destello, pausas por hover/foco/viewport/pestaña, movimiento reducido inicial y dinámico y degradación sin contexto canvas o sin observers. Correcta; no equivale a una prueba en navegador.
- Comparación byte a byte contra `backups/2026-10-08-landing-v4/`: HTML fuera de la línea completa del ticker idéntico; CSS ajeno a reglas de ticker idéntico, incluidos los media queries compartidos; JS de V4 preservado íntegramente como prefijo.
- HTML con etiquetas equilibradas, cinco indicadores originales y copia oculta, un único canvas decorativo; CSS con llaves equilibradas. JS del ticker: **4.332 bytes**, inferior a 6 KB. HTML + CSS: **34.816 bytes**, inferior a 60 KB.
- Detector impeccable ejecutado una vez: sin hallazgos por regex, en modo degradado por ausencia de módulos de parsing. No certifica accesibilidad ni contraste renderizados.
- Hashes previos y posteriores: las únicas ediciones de Codex son los tres archivos de landing y este resumen. También varió el registro externo `referencias/codex-landing-v5b.log`, que Codex no editó. Backups, qa, FinTarget, favicon, configuración y demás documentos intactos; no se crearon archivos nuevos dentro del proyecto.

La revisión visual, el overflow real a 1440/768/375 px, el rendimiento renderizado y la interacción en navegador quedan sin comprobar por instrucción expresa. No se generaron capturas.
