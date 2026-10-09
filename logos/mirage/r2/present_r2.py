#!/usr/bin/env python3
"""Checkpoint sheet via the skill, with rendering explicitly disabled by brief."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import runpy
import subprocess
import html

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
SCRIPTS=ROOT/'referencias/logo-design-skill/scripts'
sys.path.insert(0,str(SCRIPTS))
sys.path.insert(0,str(OUT))
import render_png
from build_r2 import NAMES,NOTES

def main():
    # Prevent all rendering backends, including Chrome/Quick Look, from running.
    render_png.render=lambda *args,**kwargs:None
    print('Render desactivado expresamente por CODEX-LOGO-MIRAGE-2.md; solo lámina vectorial.')
    files=[str(OUT/f'r2-{i}.svg') for i in range(1,9)]
    refs=[str(ROOT/'logos/mirage/ht-h.svg'),str(ROOT/'logos/mirage/ref-ft.svg')]
    sys.argv=[str(SCRIPTS/'concept_sheet.py'),*files,*refs,'--names',*NAMES,'HyperTarget H · referencia','FinTarget FT · referencia',
              '--notes',*NOTES,'Referencia de familia intacta.','Referencia exacta del ajedrezado en propuestas 1–6.',
              '--title','Mirage · ronda 2 · símbolos sin M','--subtitle','Ocho direcciones · 64 / 32 / 16 px · H y FT para comparar · revisión raster pendiente',
              '--recommend','1','--greyscale','-o',str(OUT/'concepts.svg')]
    runpy.run_path(str(SCRIPTS/'concept_sheet.py'),run_name='__main__')
    library=ROOT/'referencias/logo-design-skill/assets/library/svg'
    peers=[library/f for f in ['eclipse-icon.svg','vaddy.svg','sendgrid-icon.svg','pagekit.svg','mailgun-icon.svg']]
    command=['python3',str(SCRIPTS/'preview_sheet.py'),*files,'--names',*NAMES,'--name','Mirage r2','--brand-color','#1F2124',
             '--refs',*refs,*map(str,peers),'-o',str(OUT/'preview.html')]
    result=subprocess.run(command,capture_output=True,text=True,check=True)
    print(result.stdout)
    cards=[]
    for i,name in enumerate(NAMES,1):
        scales=''.join(f'<img src="r2-{i}.svg" width="{size}" height="{size}" alt="{html.escape(name)} a {size} px">' for size in [64,32,16])
        cards.append(f'<article><h2>{i} · {html.escape(name)}</h2><p>{html.escape(NOTES[i-1])}</p>'
                     f'<div class="pair"><figure><img src="r2-{i}-v1.svg" width="160" height="160" alt="Primera iteración"><figcaption>v1</figcaption></figure>'
                     f'<figure><img src="r2-{i}.svg" width="160" height="160" alt="Concepto final"><figcaption>v2 / final</figcaption></figure>'
                     f'<figure class="dark"><img src="r2-{i}-inverted.svg" width="160" height="160" alt="Versión invertida"><figcaption>Blanco / #1F2124</figcaption></figure></div>'
                     f'<div class="sizes">{scales}</div><p>Escalas reales: 64 / 32 / 16 px. <a href="r2-{i}.svg">Abrir SVG</a></p></article>')
    page='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mirage r2 · checkpoint</title>
<style>body{margin:0 auto;max-width:1180px;padding:32px;font:16px/1.5 system-ui;color:#111;background:#f5f5f5}h1{font-size:32px}article{padding:24px;margin:24px 0;background:white;border:1px solid #ddd}h2{font-size:22px}.pair,.sizes{display:flex;flex-wrap:wrap;align-items:center;gap:24px}figure{margin:0;padding:12px;text-align:center}.dark{background:#1F2124;color:white}img{display:block}a{color:inherit}object{width:100%;height:1000px;border:1px solid #ddd}</style>
<h1>Mirage · ronda 2</h1><p>Checkpoint de ocho símbolos, sin M. Recomendación provisional: <strong>1 · Horizonte nítido</strong>. Alternativas: 4 · Portal abierto y 8 · Ruido resuelto.</p>
<p>Lámina vectorial y pruebas preparadas para Claude; no se ejecutó render ni inspección raster. Los símbolos no dependen de fuentes.</p>
<p><a href="concepts.svg">Lámina de ocho conceptos + H / FT</a> · <a href="preview.html">Escalas, giros, espejo y pares de biblioteca</a> · <a href="../../../CODEX-LOGO-MIRAGE-2-RESULTADO.md">Resultado completo</a></p>
<object data="concepts.svg" type="image/svg+xml" aria-label="Lámina de conceptos"><a href="concepts.svg">Abrir lámina SVG</a></object>'''
    page+=''.join(cards)+'<p>Fase 6. Sin kit ni despliegue.</p></html>\n'
    (OUT/'concepts.html').write_text(page,encoding='utf-8')
    print('Escritos concepts.svg, concepts.html y preview.html. Ningún renderizador iniciado.')

if __name__=='__main__':
    main()
