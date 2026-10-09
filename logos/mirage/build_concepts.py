"""Construcción reproducible; solo escribe dentro de este directorio."""
from pathlib import Path
import math
P=Path(__file__).resolve().parent
names=['Escalón verificable','Doble arco','Líneas de calor','Dato contrastado','Reflejo medido']
checker=''.join(f'M{24 if n%2==0 else 40} {56+16*n}h16v16h-16Z' for n in range(9))
def rr(x,y,w,h,r=8):
 return f'M{x+r} {y}H{x+w-r}A{r} {r} 0 0 1 {x+w} {y+r}V{y+h-r}A{r} {r} 0 0 1 {x+w-r} {y+h}H{x+r}A{r} {r} 0 0 1 {x} {y+h-r}V{y+r}A{r} {r} 0 0 1 {x+r} {y}Z'
def poly(points,r=8):
 turns=[]
 for i,b in enumerate(points):
  a=points[i-1]; c=points[(i+1)%len(points)]
  la=math.dist(a,b); lc=math.dist(b,c); radius=min(r,la/2,lc/2)
  before=(b[0]+(a[0]-b[0])*radius/la,b[1]+(a[1]-b[1])*radius/la)
  after=(b[0]+(c[0]-b[0])*radius/lc,b[1]+(c[1]-b[1])*radius/lc)
  cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])
  turns.append((before,after,radius,1 if cross>0 else 0))
 fmt=lambda p:f'{p[0]:g} {p[1]:g}'
 d='M'+fmt(turns[-1][1])
 for pre,post,rad,sweep in turns:d+=f'L{fmt(pre)}A{rad:g} {rad:g} 0 0 {sweep} {fmt(post)}'
 return d+'Z'
def step(top=96,bottom=128,left=120,right=168):
 return poly([(56,56),(left,56),(left,top),(right,top),(right,56),(232,56),(232,200),(196,200),(196,88),(176,88),(176,bottom),(112,bottom),(112,88),(92,88),(92,200),(56,200)])
def arch(v):
 a,b,r=(96,128,16) if v==1 else (92,128,18)
 c=288-a
 return f'M56 100A44 44 0 0 1 144 100A44 44 0 0 1 232 100V192A8 8 0 0 1 224 200H{c+8}A8 8 0 0 1 {c} 192V106A{r} {r} 0 0 0 160 106V192A8 8 0 0 1 152 200H136A8 8 0 0 1 128 192V106A{r} {r} 0 0 0 {a} 106V192A8 8 0 0 1 {a-8} 200H64A8 8 0 0 1 56 192Z'
def body(i,v):
 if i==1:return step(96,136,128,160) if v==1 else step()
 if i==2:return arch(v)
 if i==3:
  gap=8 if v==1 else 16
  return rr(56,56,64,32)+rr(168,56,64,32)+rr(56,88+gap,176,32)+rr(56,120+2*gap,36,80-2*gap)+rr(196,120+2*gap,36,80-2*gap)
 if i==4:
  s=12 if v==1 else 24
  return step(88,152)+f'M{144-s/2:g} {120-s/2:g}h{s}v{s}h-{s}Z'
 return step()+rr(120,136 if v==1 else 152,48,16)+rr(128,160 if v==1 else 184,32,16)
def svg(i,v,white=False):
 rule=' fill-rule="evenodd"' if i==4 else ''
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-labelledby="title"><title id="title">Mirage — {names[i-1]}</title><path fill="{"#fff" if white else "#111"}" d="{checker}"/><path fill="{"#fff" if white else "#111"}"{rule} d="{body(i,v)}"/></svg>\n'
for i in range(1,6):
 for v in (1,2):(P/f'concept-{i}-v{v}.svg').write_text(svg(i,v))
 (P/f'concept-{i}.svg').write_text(svg(i,2))
 (P/f'concept-{i}-reversed.svg').write_text(svg(i,2,True))
