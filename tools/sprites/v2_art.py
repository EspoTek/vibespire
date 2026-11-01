"""Ingest, recover, review and append the new v2 sprites; never touch src/."""
import argparse
import hashlib
import json
from math import ceil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from atlas import pack
from grid import axis_cells
from ingest import ingest
from postprocess import chroma_key, detect_grid, quantize_sms, sample_centres

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MANIFEST = ROOT / 'docs/art/v2-new-art-manifest.json'
PREVIEW = HERE / 'preview/v2'


def read_manifest() -> dict:
    return json.loads(MANIFEST.read_text())


def save_manifest(m: dict) -> None:
    MANIFEST.write_text(json.dumps(m, indent=2)+'\n')


def build(name: str, source: Path) -> None:
    m = read_manifest()
    sheet = next(s for s in m['sheets'] if s['name'] == name)
    normalized = HERE / f'raw/v2/{name}.png'
    if not normalized.exists():
        ingest(source, normalized)
    sheet['generated_source'] = str(source)
    sheet['retained_source'] = str(normalized.relative_to(ROOT))
    native = normalized.parent / 'native' / normalized.name
    original = Image.open(native).convert('RGBA')
    a = np.array(original)
    key = np.linalg.norm(a[:, :, :3].astype(float)-(255, 0, 255), axis=2) <= 80
    xs, xm = axis_cells(key, sheet['cols'], 1)
    ys, ym = axis_cells(key, sheet['rows'], 0)
    sheet['gutters'] = [xm, ym]
    sheet['cells'] = []
    out = PREVIEW / name
    out.mkdir(parents=True, exist_ok=True)
    w, h = (32, 24) if sheet['kind'] == 'cards' else (16, 16)
    for index, id in enumerate(sheet['slots']):
        if id.startswith('empty_'):
            continue
        col, row = index % sheet['cols'], index // sheet['cols']
        box = (xs[col][0], ys[row][0], xs[col][1], ys[row][1])
        print(f'{name}: recover {index+1}/{len(sheet["slots"])} {id}', flush=True)
        source_cell = original.crop(box)
        source_cell.save(out / f'{id}-source.png')
        keyed = chroma_key(np.array(source_cell), (255, 0, 255), 80, 80)
        # These sources were visually inspected at native generator size. Their
        # mixed-size pixels have no single recoverable lattice (ripple scored
        # 0.088). Explicit source sampling avoids inventing a false lattice.
        if name in ('cards_chronist','cards_colorless','cards_afflictions','relics_1','relics_2','relics_3','potions'):
            pitch, px, py, confidence = 1.0, 0.0, 0.0, None
            print('Explicit pitch 1: visually reviewed irregular source; final native cleanup required',flush=True)
        else:
            pitch, px, py, confidence = detect_grid(keyed)
        recovered = sample_centres(keyed, pitch, px, py)
        bbox = recovered.getbbox()
        if bbox is None:
            raise ValueError(f'empty recovered cell: {id}')
        subject = recovered.crop(bbox)
        scale = min((w-2)/subject.width, (h-2)/subject.height)
        subject = subject.resize((max(1, round(subject.width*scale)), max(1, round(subject.height*scale))), Image.Resampling.NEAREST)
        target = Image.new('RGBA', (w, h))
        target.paste(subject, ((w-subject.width)//2, (h-subject.height)//2))
        target, colors = quantize_sms(target, 10 if sheet['kind'] == 'cards' else 8)
        target.save(out / f'{id}.png')
        sheet['cells'].append({'id':id, 'source_box':list(box), 'pitch':pitch, 'grid_score':confidence,
                               'colors':colors, 'size':[w,h], 'raw_pixel_sha256':hashlib.sha256(target.tobytes()).hexdigest()})
    save_manifest(m)
    review_contact(sheet, out / 'contact.png')


def tile(draw: ImageDraw.ImageDraw, canvas: Image.Image, sprite: Image.Image,
         id: str, x: int, y: int, scale: int, label: str = '') -> None:
    enlarged = sprite.resize((sprite.width*scale, sprite.height*scale), Image.Resampling.NEAREST)
    canvas.paste(enlarged, (x, y), enlarged)
    draw.text((x, y+sprite.height*scale+4), id, fill='white')
    if label:
        draw.text((x, y+sprite.height*scale+18), label, fill='#AAAAAA')


def review_contact(sheet: dict, destination: Path) -> None:
    ids = [id for id in sheet['slots'] if not id.startswith('empty_')]
    w,h = (32,24) if sheet['kind']=='cards' else (16,16)
    cw,ch=200, max(132,h*4+36)
    canvas=Image.new('RGB',(sheet['cols']*cw,ceil(len(ids)/sheet['cols'])*ch),'#181820')
    draw=ImageDraw.Draw(canvas)
    for i,id in enumerate(ids):
        sprite=Image.open(PREVIEW/sheet['name']/f'{id}.png').convert('RGBA')
        x,y=i%sheet['cols']*cw+8,i//sheet['cols']*ch+4
        tile(draw,canvas,sprite,id,x,y,4)
        canvas.paste(sprite,(x+w*4+6,y+h*3),sprite)
    canvas.save(destination)


def publish() -> None:
    m=read_manifest()
    for r in m['new']:
        sheet=next(s for s in m['sheets'] if r['id'] in s['slots'])
        source=PREVIEW/sheet['name']/f'{r["id"]}.png'
        dest=ROOT/f'public/assets/sprites/{r["kind"]}/{r["id"]}.png'
        if r['id'] in m['baseline'][r['kind']]['files']:
            raise ValueError(f'would replace accepted art: {dest}')
        dest.write_bytes(source.read_bytes())
        r['file']=str(dest.relative_to(ROOT))
    for kind in ('cards','relics','potions'):
        base=ROOT/'public/assets/sprites'
        w,h=(32,24) if kind=='cards' else (16,16)
        pack(base/kind,base/f'{kind}-atlas.png',base/f'{kind}-atlas.json',
             cell_w=w,cell_h=h,preserve_existing=True)
    save_manifest(m)
    contacts(m)


def contacts(m: dict) -> None:
    for scale in (1,4):
        cw,ch=208,24*scale+38
        canvas=Image.new('RGB',(cw*7,ceil(len(m['new'])/7)*ch),'#181820')
        draw=ImageDraw.Draw(canvas)
        for i,r in enumerate(m['new']):
            sprite=Image.open(ROOT/r['file']).convert('RGBA')
            x,y=i%7*cw+10,i//7*ch+4
            tile(draw,canvas,sprite,r['id'],x,y,scale,r['kind']+' / '+(r['cls'] if 'cls' in r else 'shared'))
        canvas.save(ROOT/f'docs/art/v2-new-art-{scale}x.png')
    groups=[('cards',cls) for cls in ('breaker','graft','chronist','colorless')]+[('cards','afflictions'),('relics',None),('potions',None)]
    blocks=[]
    m['coherence_groups']=[]
    for kind,cls in groups:
        new=[r for r in m['new'] if r['kind']==kind and (kind!='cards' or (r['cls'] in ('curse','status') if cls=='afflictions' else r['cls']==cls))]
        old=[r for r in m['inventory'][kind]['code'] if r['id'] in m['baseline'][kind]['files'] and (kind!='cards' or r['cls']==('colorless' if cls=='afflictions' else cls))][:8]
        cw,ch=192,140
        rows=1+ceil(len(new)/8)
        canvas=Image.new('RGB',(8*cw,28+rows*ch),'#181820'); draw=ImageDraw.Draw(canvas)
        draw.text((8,6),f'{kind} / {cls or "shared"} — accepted row, then new art (4x + native)',fill='#FFFFAA')
        placements=[]
        for i,r in enumerate(old+new):
            yrow=0 if i<8 else 1+(i-8)//8
            col=i if i<8 else (i-8)%8
            sprite=Image.open(ROOT/f'public/assets/sprites/{kind}/{r["id"]}.png').convert('RGBA')
            x,y=col*cw+8,28+yrow*ch
            tile(draw,canvas,sprite,r['id'],x,y,4,'ACCEPTED' if i<8 else 'NEW')
            canvas.paste(sprite,(x+sprite.width*4+4,y+sprite.height*3),sprite)
            placements.append({'id':r['id'],'kind':kind,'accepted':i<8,'x':x,'y':y})
        blocks.append(canvas)
        m['coherence_groups'].append({'kind':kind,'class':cls,'height':canvas.height,'placements':placements})
    combined=Image.new('RGB',(1536,sum(b.height for b in blocks)),'#181820');y=0
    for block in blocks:combined.paste(block,(0,y));y+=block.height
    combined.save(ROOT/'docs/art/v2-new-art-coherence.png')
    save_manifest(m)
    print(f'Published {len(m["new"])} sprites and three review sheets',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=('build','publish'))
    parser.add_argument('name',nargs='?')
    parser.add_argument('source',type=Path,nargs='?')
    args=parser.parse_args()
    if args.action=='publish':publish()
    else:
        if args.name is None or args.source is None:parser.error('build requires a sheet name and source PNG')
        build(args.name,args.source)
