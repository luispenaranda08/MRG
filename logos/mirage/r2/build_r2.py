#!/usr/bin/env python3
"""Build only the Mirage round-2 checkpoint; no browser or kit exports."""
from pathlib import Path
import argparse
import html
import json

OUT = Path(__file__).resolve().parent
NAMES = ['Horizonte nítido', 'Reflejo desplazado', 'Lente del dato', 'Portal abierto',
         'Dato en reserva', 'Oasis de origen', 'Duna en negativo', 'Ruido resuelto']
NOTES = ['Una forma sólida sobre el horizonte deja dos ecos separados debajo.',
         'Un ángulo firme y su reflejo desplazado distinguen original y apariencia.',
         'Un anillo de peso constante aísla un único dato cuadrado.',
         'Un portal encuadra un horizonte que continúa por una apertura lateral.',
         'Un cuadrado vacío permanece inequívoco dentro de una masa sólida.',
         'Una cuenca geométrica sostiene un dato separado, sin paisaje literal.',
         'Una duna vacía corta un plano sólido sobre un horizonte ajedrezado.',
         'La alternancia de píxeles converge en un bloque sólido de información.']
CONSTRUCTION = [
    '1. Horizonte nítido: ajedrezado FT exacto; semicírculo de radio 72, centro (144,128), desde (72,128) hasta (216,128). Dos franjas independientes de radio 8: 128×24 en (80,144) y 80×16 en (104,184). La imagen inferior se contrae sin degradado. v1: huecos de 8; v2: huecos de 16.',
    '2. Reflejo desplazado: ajedrezado FT; ángulo superior continuo x=72…216, y=56…120, brazo horizontal de 32 y vertical de 40, remates de radio 8. Reflejo vertical inferior x=88…232, y=136…200; desplazamiento horizontal de 16. v1: ángulos sin redondear; v2: remates radio 8, manteniendo el corte central de 16.',
    '3. Lente del dato: ajedrezado FT; anillo centrado (152,128), radio exterior 72 e interior 40, sustraído con evenodd; cuadrado independiente de 32 y radio 8 centrado en el hueco. v1: hueco radio 32 y dato 24; v2: hueco radio 40 y dato 32, distancia mínima al anillo mayor que 17.3 (cota conservadora del cuadrado sin redondear).',
    '4. Portal abierto: ajedrezado FT; arco exterior radio 72 y dos apoyos, y=56…200; hueco interior de radio 36. El apoyo derecho termina en y=144; una línea de horizonte de 32 sale desde x=112 hasta x=224, y=168…200 y se une al apoyo izquierdo. v1: canal lateral 8; v2: canal 24, puerta de 72 de ancho; contornos unidos, sin piezas tocándose.',
    '5. Dato en reserva: ajedrezado FT; bloque de 144×144 en (72,56), radio 8, con hueco de 80×80 en (104,88), también radio 8, mediante evenodd. v1: hueco de 48; v2: hueco de 80, paredes de 32. Contraste figura/fondo sin un color de recorte; menos masa que el primer bloque.',
    '6. Oasis de origen: ajedrezado FT; cuenca inferior entre x=72…216, y=104…200, arco exterior inferior radio 72 e interior radio 24; dos hombros verticales de 48 y remates radio 8. Dato sólido 80×32 en (104,56), radio 8. v1: hueco radio 40, hombros 32 y dato de 32×32; v2: hueco radio 24, hombros 48 y dato de 80×32 para acercar la masa a H/FT.',
    '7. Duna en negativo: excepción de familia, sin columna izquierda. Plano superior x=40…216, y=56…144, radio 8; se sustrae una duna semicircular de radio 48, centro (128,144), abierta por abajo. Horizonte de nueve módulos de 16, x=56…184, alternando y=168/184. v1: duna radio 32 y horizonte separado por 8; v2: radio 48 y corte de 24. Mismo módulo y alternancia trasladados a horizontal; contorno continuo sin recorte blanco.',
    '8. Ruido resuelto: excepción de familia, ajedrezado integrado. Nueve cuadrados 16 alternan x=40/56, y=56…184; segunda frontera usa cuatro cuadrados en x=88, y=72/104/136/168. Masa resuelta continua x=120…216, y=56…200, radio 8. v1: masa empieza en x=104, toca los píxeles; v2: empieza en 120, abre un canal de 16 y deja comparar fragmento y dato sólido.'
]

def box(x,y,w,h,r=8):
    if r == 0:
        return f'M{x} {y}h{w}v{h}h{-w}Z'
    return (f'M{x+r} {y}H{x+w-r}A{r} {r} 0 0 1 {x+w} {y+r}'
            f'V{y+h-r}A{r} {r} 0 0 1 {x+w-r} {y+h}H{x+r}'
            f'A{r} {r} 0 0 1 {x} {y+h-r}V{y+r}A{r} {r} 0 0 1 {x+r} {y}Z')

def circle(cx,cy,r):
    return f'M{cx-r} {cy}A{r} {r} 0 1 1 {cx+r} {cy}A{r} {r} 0 1 1 {cx-r} {cy}Z'

CHECKER = ''.join(box(24 if i%2==0 else 40,56+16*i,16,16,0) for i in range(9))

def body(i,v):
    if i == 1:
        return [('M72 128A72 72 0 0 1 216 128Z'+box(80,136 if v==1 else 144,128,24)+box(104,168 if v==1 else 184,80,16),False)]
    if i == 2:
        if v == 1:
            return [('M72 56H216V88H112V120H72ZM88 136H128V168H232V200H88Z',False)]
        return [('M80 56H208A8 8 0 0 1 216 64V80A8 8 0 0 1 208 88H120A8 8 0 0 0 112 96V112A8 8 0 0 1 104 120H80A8 8 0 0 1 72 112V64A8 8 0 0 1 80 56Z'
                 'M96 136H120A8 8 0 0 1 128 144V160A8 8 0 0 0 136 168H224A8 8 0 0 1 232 176V192A8 8 0 0 1 224 200H96A8 8 0 0 1 88 192V144A8 8 0 0 1 96 136Z',False)]
    if i == 3:
        inner=32 if v==1 else 40
        size=24 if v==1 else 32
        return [(circle(152,128,72)+circle(152,128,inner),True),(box(152-size/2,128-size/2,size,size),False)]
    if i == 4:
        end=160 if v==1 else 144
        return [(f'M72 192V128A72 72 0 0 1 216 128V{end-8}A8 8 0 0 1 208 {end}H188A8 8 0 0 1 180 {end-8}V128A36 36 0 0 0 108 128V160A8 8 0 0 0 116 168H216A8 8 0 0 1 224 176V192A8 8 0 0 1 216 200H80A8 8 0 0 1 72 192Z',False)]
    if i == 5:
        size=48 if v==1 else 80
        return [(box(72,56,144,144)+box(144-size/2,128-size/2,size,size),True)]
    if i == 6:
        size=32 if v==1 else 80
        inner=40 if v==1 else 24
        left,right=144-inner,144+inner
        return [(f'M80 104H{left-8}A8 8 0 0 1 {left} 112V128A{inner} {inner} 0 0 0 {right} 128V112A8 8 0 0 1 {right+8} 104H208A8 8 0 0 1 216 112V128A72 72 0 0 1 72 128V112A8 8 0 0 1 80 104Z'+box(144-size/2,56,size,32),False)]
    if i == 7:
        top=152 if v==1 else 168
        radius=32 if v==1 else 48
        checker=''.join(box(56+16*j,top+16*(j%2),16,16,0) for j in range(9))
        return [(f'M48 56H208A8 8 0 0 1 216 64V136A8 8 0 0 1 208 144H{128+radius}A{radius} {radius} 0 0 0 {128-radius} 144H48A8 8 0 0 1 40 136V64A8 8 0 0 1 48 56Z'+checker,False)]
    if i == 8:
        checker=''.join(box(40 if j%2==0 else 56,56+16*j,16,16,0) for j in range(9))
        bridge=''.join(box(88,y,16,16,0) for y in (72,104,136,168))
        start=104 if v==1 else 120
        return [(checker+bridge+box(start,56,216-start,144),False)]

def svg(i,v,white=False):
    color='#FFF' if white else '#111'
    paths=[(CHECKER,False)] if i<=6 else []
    paths+=body(i,v)
    drawing='\n'.join(f'<path fill="{color}"'+(' fill-rule="evenodd"' if hole else '')+f' d="{d}"/>' for d,hole in paths)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title">\n<title id="title">Mirage · {NAMES[i-1]}'+(' · invertido' if white else '')+f'</title>\n{drawing}\n</svg>\n'

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--round',choices=['1','2'],required=True)
    args=ap.parse_args()
    # Construction descriptions are saved before any SVG is written.
    (OUT/'CONSTRUCCION.md').write_text('# Mirage r2 · construcción previa\n\n'+'\n\n'.join(CONSTRUCTION)+'\n',encoding='utf-8')
    v=int(args.round)
    for i in range(1,9):
        (OUT/f'r2-{i}-v{v}.svg').write_text(svg(i,v),encoding='utf-8')
        if v==2:
            (OUT/f'r2-{i}.svg').write_text(svg(i,v),encoding='utf-8')
            (OUT/f'r2-{i}-inverted.svg').write_text(svg(i,v,True),encoding='utf-8')
    (OUT/'concepts.json').write_text(json.dumps([{'number':i+1,'name':n,'idea':NOTES[i],'construction':CONSTRUCTION[i]} for i,n in enumerate(NAMES)],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Ronda {v}: ocho símbolos; construcción guardada antes de SVG. Sin render.')

if __name__=='__main__':
    main()
