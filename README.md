# HyperTarget · Mirage

Sitio de HyperTarget (hypertarget.tech) y Mirage, la referencia del costo de capital en Colombia (mirage.hypertarget.tech).

| Archivo | Contenido |
|---|---|
| `index.html`, `site.css`, `site.js` | Landing de HyperTarget |
| `mirage.html`, `fintarget-*.js/.css`, `fuentes-validacion.*` | App Mirage (antes FinTarget) |
| `middleware.js`, `vercel.json` | Despliegue en Vercel: el subdominio mirage sirve la app; redirecciones de URLs antiguas |
| `miracle-*` | Miracle (prototipo aparte; no se publica en el sitio) |
| `logos/` | Logos y conceptos |
| `ejemplos/` | Excel de ejemplo para "Tu empresa" |
| `*-contexto.md`, `MAPA-Y-EVOLUCION.md`, `CODEX-*.md` | Contexto, decisiones y encargos de diseño |
| `ml/` | Motor de datos y modelos de machine learning de Mirage (Jupyter Book; no se publica en el sitio) |
| `backups/`, `qa/` | Versiones anteriores y capturas de revisión |

Desarrollo local: `python3 -m http.server 8765` y abrir http://localhost:8765/.
