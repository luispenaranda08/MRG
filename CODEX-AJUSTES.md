# Tarea para Codex · Ajustes visuales de Tu empresa y documento PDF de la calculadora

Trabajas en `web/` (Next.js, exportación estática). Lee antes `web/CODEX-NEXTJS-RESULTADO.md` y `web/CODEX-CALC-RESULTADO.md`.

## Reglas duras

1. **No modifiques** estas carpetas y archivos:
   - `web/src/lib/finanzas/`
   - `web/src/lib/dx/engine.ts`, `web/src/lib/dx/defaults.ts`, `web/src/lib/dx/leer.ts` (motores validados en Excel)
   - `web/api/`
   - `web/public/api/`
   - `web/vercel.json`
   - nada fuera de `web/`
2. Ya están instalados `jspdf@4.2.1` y `jspdf-autotable@5.0.8`. No instales nada más ni uses la red. No despliegues, no hagas commits.
3. Las vistas siguen siendo tres. No agregues ni quites funciones de cálculo; esto es visual y de documentos.
4. Todo texto que ve el usuario va en español claro, sin jerga interna. No uses palabras como "API", "motor", "port" ni nombres de archivos JSON. Para la fecha de los datos usa "Datos de mercado al <fecha>".

## 1. Tu empresa: errores visuales (revisados en el navegador, escritorio 1280 px y móvil 375 px)

1. **Zona de carga** (`.drop`, paso 1): es un `<label>` sin `display:block`. Por eso su relleno se monta sobre el párrafo de arriba, y en móvil el botón nativo "Seleccionar archivo" queda cortado.
   - Hazla bloque.
   - Oculta el `input type=file` de forma accesible.
   - Muestra un botón propio ("Elegir archivo") con el nombre del archivo elegido.
   - Que se pueda arrastrar y soltar un archivo (`dragover`/`drop`), con borde punteado y estado activo al arrastrar.
2. **Tabla de mapeo** (paso 2):
   - Los `<select>` de "Estado" miden ~43 px y los de "Campo Mirage" ~86 px; el texto queda cortado ("Efecti", "Sin as"). Dales ancho mínimo (Estado ≥ 110 px, Campo ≥ 230 px).
   - El encabezado "Cuenta original / hoja" está alineado a la derecha; las columnas de texto van a la izquierda y las cifras a la derecha.
   - La tabla puede desplazarse horizontalmente, pero la columna de la cuenta debe quedar fija a la izquierda (`position: sticky`) para no perder la referencia.
3. **Informe** (paso 3):
   - En "Costo de capital" aparece dos veces "Ke USD". La segunda es el Ke en la moneda de los estados: rotúlala "Ke en COP" o "Ke en USD" según `company.cur`. Lo mismo para Kd.
   - El texto "Insumos API <fecha>" debe decir "Datos de mercado al <fecha>".
   - La lista de advertencias (`.alertas`) debe verse como un bloque destacado arriba de los resultados. Usa el tono `alerta` para las de severidad alta o media y el tono `nota` para las informativas.
4. Revisa el resto de la vista **Tu empresa** a 375 px y a 1280 px por código. Corrige lo que encuentres:
   - textos que se salen de su caja;
   - tarjetas de resultados con cifras que desbordan;
   - tablas sin desplazamiento propio;
   - botones que no caben.

   Anota cada hallazgo en el informe.

## 2. Calculadora: documento descargable con identidad Mirage, también en PDF

Antes la calculadora mostraba un "memo" en hoja de papel, y al usuario le gustaba más. Está en `mirage.html`: busca `.paper` y el bloque `<article class="paper">`, solo como referencia visual. Recupéralo y aplícalo a **todas** las descargas de la calculadora (Costo de capital, Tasas, Valor del dinero, Créditos, Proyectos).

### 2.1 Vista previa en pantalla
Crea el componente `DocumentoMirage`, que se muestra bajo los resultados de cada subsección como una hoja blanca con sombra (ancho máximo ~780 px). Su estructura:

- **Encabezado:**
  - a la izquierda, el símbolo de Mirage (`/mirage-symbol-black.svg`, sin invertir) y la palabra "Mirage";
  - a la derecha, "Documento N.º MRG-<AAAAMMDD>-<4 caracteres>" y "Datos de mercado al <corte>";
  - línea inferior de 2 px color tinta.
- **Título** según la subsección:
  - "Memo de costo de capital"
  - "Conversión de tasas"
  - "Valor del dinero en el tiempo"
  - "Simulación de crédito"
  - "Evaluación de proyecto"

  Debajo, "Empresa o proyecto: <nombre>" si existe.
- **Secciones** (títulos en versalitas pequeñas, gris):
  - **Conclusión:** una o dos frases con la cifra clave. Ejemplos: "El WACC estimado es 15,42 % (COP nominal)…", "La cuota fija es $1.243.520,81 durante 240 meses…", "El VPN es 814,33: se acepta…".
  - **Supuestos:** tabla, tono `insumo`.
  - **Resultados:** tabla, tono `clave` en las cifras principales.
  - **Método:** texto corto que describe cómo se calcula.
  - **Fuentes:** las de `meta.fuentes` que apliquen.
  - En Créditos, las primeras y últimas filas de la tabla de amortización, con nota de cuántas filas completas trae el Excel.
- **Pie (obligatorio):** línea superior y, a la izquierda, el logo de HyperTarget **en negro** (`/hypertarget-symbol-black.svg`, ya está en `public/`) con el texto **"Mirage by HyperTarget"**. A la derecha, "mirage.hypertarget.tech · <fecha de generación> · Página X de Y".

  Este pie va **solo** en estos documentos descargables de la calculadora, no en el resto del sitio.
- **Aviso** en letra pequeña: "Las cifras de Mirage no constituyen asesoría de inversión ni una recomendación de tasa de descuento."

### 2.2 Descargas
En cada subsección, botones **"↓ PDF"** y **"↓ Excel"**. El Excel ya existe: agrégale una fila de pie "Mirage by HyperTarget" en cada hoja. Elimina el memo TXT; el PDF lo reemplaza.

- **PDF real**, generado en el navegador con `jspdf` + `jspdf-autotable`, no con `window.print`. Debe tener el mismo contenido y la misma jerarquía que la vista previa:
  - tamaño carta, márgenes de 18 mm;
  - los dos logos convertidos de SVG a PNG con un `<canvas>` a 4× para que salgan nítidos;
  - tablas con `autoTable`, en tonos Mirage: encabezado oscuro con texto blanco, insumos en arena, resultados clave en dorado con borde;
  - formato numérico colombiano;
  - pie con logo de HyperTarget, "Mirage by HyperTarget" y "Página X de Y" en **todas** las páginas;
  - nombre de archivo `Mirage-<Subseccion>-<empresa>-<AAAA-MM-DD>.pdf`, saneado con `lib/nombres.ts`.
- Centraliza la generación en `web/src/lib/documento.ts`, con dos funciones:
  - `armarDocumento(seccion, datos, resultado, empresa)`: devuelve una estructura neutral (título, conclusión, filas de supuestos y resultados, método, fuentes).
  - `pdfDocumento(doc, logos)`: dibuja el PDF.

  La vista previa React y el PDF usan **la misma** estructura, para que nunca digan cosas distintas.
- Fuentes del PDF: la tipografía estándar de jsPDF (Helvetica) basta. Si incrustas IBM Plex, toma los archivos locales de `node_modules` o `.next`, sin red.

## 3. Verificación obligatoria

1. `npm run lint`, `npm run build` y `npm test` sin errores.
2. Nueva prueba `web/src/lib/__tests__/documento.cjs`, agregada a `npm test`. Debe:
   - armar los 5 documentos con datos de ejemplo: costo de capital del sector 47 y tamaño Mediana; crédito de 100.000.000 a 240 cuotas; proyecto Brigham 10-5; conversión 14 % NAMV; TVM;
   - generar cada PDF con jsPDF en Node, sin logos si el canvas no existe;
   - comprobar que los textos "Mirage by HyperTarget", el título, la conclusión con la cifra correcta y "Página 1 de" están en el PDF (busca en `doc.output()`);
   - comprobar que el número de páginas es mayor que 0.
3. Comprueba que la cifra de la conclusión es exactamente la del motor: cuota 1.243.520,81 con tasa periódica 0,011666666666655168 y VPN de S 814,33.
4. Escribe `web/CODEX-AJUSTES-RESULTADO.md` con:
   - qué cambió;
   - los hallazgos visuales adicionales;
   - las decisiones que tomaste;
   - la salida de las pruebas y del build.
