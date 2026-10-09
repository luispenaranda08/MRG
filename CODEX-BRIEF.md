# Brief para Codex · sitio público de HyperTarget (hypertarget.tech)

Fase 1: solo lo visual. Sin backend, sin datos reales nuevos, sin tocar la lógica de FinTarget.

## Qué construir

| Archivo | Ruta pública | Contenido |
|---|---|---|
| `index.html` (+ `site.css`, `site.js` si hace falta) | `/` | Vista general de HyperTarget con un botón principal "Entrar a FinTarget" que lleva a `/fintarget` |
| `presentacion.html` | `/presentacion` | Presentación de HyperTarget en estilo Palantir (ver abajo), navegable con flechas e imprimible a PDF |
| `fintarget-mockup.html` y sus `.js/.css` | `/fintarget` | Ya existe. Solo añadir un enlace "← HyperTarget" en la barra superior que vuelva a `/`. No cambiar nada más |

Las rutas limpias ya están en `vercel.json`. `.vercelignore` deja fuera `backups/`, `qa/`, los `.md` y todo lo de Miracle. **Miracle no aparece en el sitio público** (producto de defensa); en la landing puede figurar solo como "Próximamente · acceso institucional", sin pantallas ni datos.

## Lenguaje visual (tomado de la presentación Q4 2025 de Palantir)

- Dos superficies: carbón `#1F2124` y gris papel `#DADADA`. Texto claro `#E6E6E6` sobre carbón, tinta `#1F2124` sobre gris. Un solo acento para el dato clave (Palantir usa verde menta `#2EE6A6` con anillo punteado; para HyperTarget proponer un acento propio y usarlo solo en una cifra por pantalla).
- Paneles con radio grande (~28 px) que sangran hasta el borde derecho de la pantalla.
- Píldora de sección arriba a la izquierda: dos segmentos `[ FT | Costo de capital ]`, fondo carbón, texto 13 px.
- Titulares grandes, sans grotesca de trazo fino, interlineado apretado (tracking negativo). Cifras en mono (año "2026" en mono como en la portada).
- Portada en rejilla de 4 bandas separadas por líneas finas de 1 px; fila inferior con cuatro círculos de contorno y el último relleno (indica la sección actual).
- Listas como barras carbón de ancho completo con flecha `→` y el número subrayado.
- Gráficos: fondo carbón, líneas blancas de 1,5 px, puntos sólidos, etiqueta del valor sobre cada punto, eje mínimo. Barras: año anterior en contorno, año actual relleno con degradado blanco.
- Diapositivas de caso: texto a la izquierda (titular + párrafo + enlace "Ver más" sobre una línea), imagen o diagrama en panel a la derecha.
- Pie: "© 2026 HyperTarget" en 11 px gris.
- Tipografías sugeridas (Google Fonts): Inter Tight o Hanken Grotesk para titulares y texto; IBM Plex Mono para cifras (ya se usa en FinTarget).
- Logo: `logos/concepts/ht-h.svg` (H de HyperTarget). FinTarget: `logos/fintarget-symbol-black.svg`.

No copiar marcas, logos, fotos ni textos de Palantir. Se toma el sistema visual, no el contenido.

## Estructura de la landing (`/`)

1. **Hero**: ver `CODEX-LANDING.md` (titular "Cifras que resisten una auditoría.").
2. **Productos**: tarjetas en fila. FinTarget (activo, enlace a `/fintarget`): "El costo de capital de Colombia: WACC por sector, betas locales y prima país con metodología pública". Miracle: "Próximamente · acceso institucional", sin enlace.
3. **Cifras** en tarjetas grises grandes (estilo diapositiva 16 de Palantir): 12 sectores, metodología versionada, fuentes públicas, etc. Solo cifras verdaderas del prototipo; nada inventado.
4. **Método / ontología**: diagrama empresa → estado financiero → sector → pares → supuesto → modelo → resultado → memo, con el estilo del diagrama de la diapositiva 13 (cajas negras, borde de acento, líneas punteadas).
5. **Presentación**: bloque que enlaza a `/presentacion`.
6. Pie con contacto.

## Presentación (`/presentacion`), 10–12 diapositivas 16:9

1. Portada en 4 bandas: "HyperTarget" · "2026" en mono · "Presentación" · círculos.
2. Problema: por qué el costo de capital en Colombia es difícil (tabla de `FinTarget-contexto.md` §2, resumida en barras con flecha).
3. FinTarget en una frase + captura del prototipo en panel derecho.
4. Alta frecuencia: componente → frecuencia (§3.1) como barras.
5. Cómo se construye una cifra (ontología, diagrama).
6. Validación: pruebas que el prototipo reproduce (VISA ROIC 47,5 %, EVA 18.727; Ecopetrol Z'' 5,44; Tecnoglass EVA ≈ 62,9). Ver `MAPA-Y-EVOLUCION.md`, adenda V2.
7. Versiones del producto y cronograma (§4–5).
8. Monetización por tier (§7), en tarjetas grises.
9. Hoja de ruta / próximos productos (Miracle solo nombrado).
10. Cierre con portada en bandas y contacto.

Todo texto en español. Si un dato no está en los `.md`, dejar un marcador visible `[por confirmar]` en vez de inventarlo.

## Requisitos técnicos

- HTML/CSS/JS estático, sin build. Dependencias solo de cdnjs/jsdelivr con versión fija.
- Responsive: 375 px sin scroll horizontal; la presentación en móvil pasa a scroll vertical de diapositivas.
- Accesible: contraste AA, foco visible, `prefers-reduced-motion`.
- `<title>`, meta description, Open Graph y favicon con el logo H.
- Presentación: flechas ←/→, número de diapositiva, `@media print` una diapositiva por página.

## Referencias de Mobbin (secciones de sitios)

- Hero oscuro con titular grande: [Grok · company](https://mobbin.com/sites/sections/6857a406-9c8b-4b57-8247-c96e015c140b), [Dovetail](https://mobbin.com/sites/sections/4d16efe4-3ace-4ac0-b2e7-5dd95aa3cfc0), [Figma](https://mobbin.com/sites/sections/dbb9e429-a877-4456-a04f-edc434cd9013)
- Tarjetas de productos: [Grok · products](https://mobbin.com/sites/sections/af82f082-c333-48b4-8601-ca330ec1b109), [Okta](https://mobbin.com/sites/sections/eb552c8b-2e29-4fbb-9f7c-1cdc956a08b6), [Slash](https://mobbin.com/sites/sections/ae961b32-711f-41f1-a5b6-00fc7c6bf5cc)
- Cifras grandes: [Spade](https://mobbin.com/sites/sections/34a2151f-c9b2-4121-b790-8e85202fe9ca), [YLLW](https://mobbin.com/sites/sections/0d46242a-8fae-4e37-8baf-c13ac408bd2e), [Robot.com](https://mobbin.com/sites/sections/f85060f2-e490-4793-b11f-86d41a6a2cd0)

## Cómo verificar

```
python3 -m http.server 8765
```
Abrir `http://localhost:8765/` y `http://localhost:8765/presentacion.html`; el botón debe llevar a FinTarget y FinTarget debe seguir funcionando igual (comparar con `qa/fintarget-inicio.png`).

Nota de enlaces: en el HTML enlazar con rutas relativas a archivo (`fintarget-mockup.html`, `presentacion.html`, `index.html`) para que funcione igual en local y en Vercel. Vercel sirve además `/fintarget` y `/presentacion` por los rewrites.
