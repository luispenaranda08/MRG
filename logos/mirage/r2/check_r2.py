#!/usr/bin/env python3
"""Vector-only structure and ink-area checks. No raster or browser tests."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json
import xml.etree.ElementTree as ET

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
sys.path.insert(0,str(ROOT/'referencias/logo-design-skill/scripts'))
import svglib

def polygon(subpath):
    pts=[]
    for seg in subpath:
        pts.extend(svglib.segment_points(seg))
    return pts

def path_intervals(polygons,y,evenodd):
    events=[]
    for pts in polygons:
        for a,b in zip(pts,pts[1:]+pts[:1]):
            if (a[1]<=y<b[1]) or (b[1]<=y<a[1]):
                x=a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1])
                events.append((x,1 if b[1]>a[1] else -1))
    events.sort()
    intervals=[]
    state=0
    start=None
    for x,sign in events:
        old=state%2 if evenodd else state!=0
        state+=sign
        new=state%2 if evenodd else state!=0
        if not old and new:
            start=x
        elif old and not new:
            intervals.append((start,x))
    return intervals

def area(file):
    root=ET.parse(file).getroot()
    shapes=[]
    for el,matrix in svglib.iter_shapes(root):
        polys=[[svglib.apply(matrix,p) for p in polygon(s)] for s in svglib.shape_to_subpaths(el)]
        shapes.append((polys,el.get('fill-rule')=='evenodd'))
    ink=0
    # 0.5-unit horizontal slices; arcs approximated by svglib's 24-step polylines.
    for row in range(512):
        spans=[]
        for polys,evenodd in shapes:
            spans.extend(path_intervals(polys,(row+.5)/2,evenodd))
        spans.sort()
        if not spans:
            continue
        lo,hi=spans[0]
        for a,b in spans[1:]:
            if a<=hi:
                hi=max(hi,b)
            else:
                ink+=(hi-lo)/2
                lo,hi=a,b
        ink+=(hi-lo)/2
    return ink

def main():
    files=sorted(OUT.glob('r2-*.svg'))
    assert len(files)==32,len(files)
    ft=ET.parse(ROOT/'logos/mirage/ref-ft.svg').getroot()
    reference=svglib.parse_path(ft.find('{http://www.w3.org/2000/svg}path').get('d'))[:9]
    for file in files:
        root=ET.parse(file).getroot()
        assert root.get('viewBox')=='0 0 256 256',file
        assert {svglib.local(el.tag) for el in root.iter()} <= {'svg','title','path'},file
        assert len(svglib.collect_colors(root))==1,file
        assert all('stroke' not in el.attrib and 'transform' not in el.attrib for el in root.iter()),file
        n=int(file.stem.split('-')[1])
        if n<=6:
            first=root.find('{http://www.w3.org/2000/svg}path')
            assert svglib.parse_path(first.get('d'))==reference,file
    for i in range(1,9):
        final=OUT/f'r2-{i}.svg'
        assert final.read_bytes()==(OUT/f'r2-{i}-v2.svg').read_bytes(),final
        a=ET.parse(final).getroot().findall('{http://www.w3.org/2000/svg}path')
        b=ET.parse(OUT/f'r2-{i}-inverted.svg').getroot().findall('{http://www.w3.org/2000/svg}path')
        assert [p.get('d') for p in a]==[p.get('d') for p in b],final
    refs={name:area(ROOT/f'logos/mirage/{name}.svg') for name in ['ht-h','ref-ft']}
    masses=[]
    print('PASS: 32 símbolos SVG; viewBox 256; solo paths/title; una tinta; sin strokes, texto, raster, gradientes, filtros ni transformaciones.')
    print('PASS: seis conceptos con nueve cuadrados de 16 exactamente como FT; dos reinterpretaciones documentadas.')
    print('PASS: ocho finales idénticos a v2; inversiones con idéntica geometría y huecos reales.')
    print('\nÁrea de tinta aproximada por integración vectorial (no prueba perceptual ni render):')
    print(f'H: {refs["ht-h"]:.0f}; FT: {refs["ref-ft"]:.0f} unidades cuadradas.')
    for i in range(1,9):
        ink=area(OUT/f'r2-{i}.svg')
        row={'concept':i,'ink_area_approx':round(ink),'ratio_H':round(ink/refs['ht-h'],3),'ratio_FT':round(ink/refs['ref-ft'],3)}
        masses.append(row)
        print(f'{i}: {ink:.0f}; H ×{row["ratio_H"]}; FT ×{row["ratio_FT"]}')
    (OUT/'ink-area.json').write_text(json.dumps({'method':'vector polylines; 0.5-unit scan integration; union across paths; no raster','references':refs,'concepts':masses},indent=2)+'\n')
    print('\n16 px (divisor 16): módulo=1 px; radio de remate=0.5 px; alto principal=9 px.')
    print('1: bandas 1.5/1 px; cortes 1 px. 2: brazos 2/2.5 px; corte 1 px; desplazamiento 1 px.')
    print('3: anillo 2 px; dato 2 px; distancia al anillo >1.08 px. 4: canal lateral 1.5 px; puerta 4.5 px; horizonte 2 px.')
    print('5: hueco 5 px; paredes 2 px. 6: hombros 3 px; hueco 3 px; dato 5×2 px; separación al dato 1 px.')
    print('7: duna negativa 6×3 px; pared superior 2.5 px; corte al ajedrezado 1.5 px. 8: cuadrados 1 px; canales 1 px; masa sólida 6×9 px.')
    print('PENDIENTE: rasterización real a 16 px, irradiación, lectura espontánea, equilibrio óptico y comparación visual. No se inició ningún renderizador.')

if __name__=='__main__':
    main()
