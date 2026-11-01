"""Ingest generated character sources, run the existing pipeline, and clean native pixels."""
from pathlib import Path
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from ingest import ingest
from postprocess import process
from preview import build

ROOT=Path(__file__).resolve().parents[2]
WORK=Path('/private/tmp/vibespire-chars-v2')
BOSSES={'gloam_empress','furnace_heart','grand_assembler','leukarch'}
FOUNDRY={'assembly_frame','cog_acolyte','hammer_warden','loom_oracle','riveter','welded_horror','furnace_heart','grand_assembler'}
# A material has a two/three-entry ramp. Black is always a separate structural ink.
RAMPS={
    'foundry': [('555555','AAAAAA','FFFFFF'),('0055AA','00AAFF'),('550000','AA0000','FF5500'),('AA5500','FFAA00','FFFF55')],
    'crown': [('000055','0055AA','0055FF'),('00AAAA','55FFFF','FFFFFF'),('5500AA','AA00FF'),('FFAA00','FFFF55')],
    'mantis': [('005500','00AA00','55FF00'),('005555','00AAAA','55FFFF'),('FFFF55',)],
    'thornback': [('005555','00AAAA','55FFFF'),('550055','5500AA','AA55FF'),('AAAA55','FFFFAA','FFFFFF'),('FFAA00',)],
    'moth': [('0000AA','0055FF','00FFFF'),('5500AA','AA00FF','AA55FF'),('AAAAAA','FFFFFF'),('FFAA00','FFFF55')],
}


def ramp_clean(im,name):
    category=('foundry' if name in FOUNDRY else 'mantis' if name=='sickle_mantis' else 'thornback' if name=='thornback' else 'moth' if name=='gloam_empress' else 'crown')
    ramps=RAMPS[category]
    palette=np.array([(0,0,0)]+[tuple(bytes.fromhex(c)) for ramp in ramps for c in ramp],dtype=np.int32)
    a=np.array(im.convert('RGBA'));visible=a[:,:,3]>0
    # Deterministic nearest palette, no interpolation, diffusion or new RGB values.
    rgb=a[visible,:3].astype(np.int32)
    indices=np.sum((rgb[:,None,:]-palette[None,:,:])**2,axis=2).argmin(axis=1)
    a[visible,:3]=palette[indices].astype(np.uint8)
    source=a.copy();tidied=0
    for y in range(1,a.shape[0]-1):
        for x in range(1,a.shape[1]-1):
            pixel=tuple(source[y,x,:3])
            if not source[y,x,3] or pixel==(0,0,0):continue
            neighbourhood=source[y-1:y+2,x-1:x+2].reshape(-1,4)
            if sum(tuple(v[:3])==pixel and v[3]>0 for v in neighbourhood)>2:continue
            # Only merge a tiny highlight into its own material; gold eyes/cores
            # and black ink remain untouched. Require four supporting neighbours.
            for ramp in ramps[:-1]:
                material={tuple(bytes.fromhex(c)) for c in ramp}
                if pixel not in material:continue
                candidates=[tuple(v[:3]) for v in neighbourhood if v[3]>0 and tuple(v[:3]) in material and tuple(v[:3])!=pixel]
                if candidates:
                    best=max(set(candidates),key=lambda c:(candidates.count(c),c))
                    if candidates.count(best)>=4:a[y,x,:3]=best;tidied+=1
    return Image.fromarray(a),tidied


def components(mask):
    visited=np.zeros_like(mask)
    groups=[]
    for y,x in zip(*np.where(mask)):
        if visited[y,x]: continue
        stack=[(y,x)];visited[y,x]=True;group=[]
        while stack:
            yy,xx=stack.pop();group.append((yy,xx))
            for dy,dx in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)):
                ny,nx=yy+dy,xx+dx
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not visited[ny,nx]:
                    visited[ny,nx]=True;stack.append((ny,nx))
        groups.append(group)
    return groups


def clean(im):
    a=np.array(im.convert('RGBA'))
    removed=0
    # Disconnected one/two-pixel scraps are not anatomy in these 16 designs.
    for group in components(a[:,:,3]>0):
        if len(group)<=2:
            for y,x in group:a[y,x]=0;removed+=1
    mask=a[:,:,3]>0
    padded=np.pad(mask,1)
    interior=mask.copy()
    for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)):
        interior &= padded[1+dy:1+dy+mask.shape[0],1+dx:1+dx+mask.shape[1]]
    a[mask & ~interior,:3]=0
    a[~mask]=0
    return Image.fromarray(a),removed


def main():
    p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');args=p.parse_args()
    records=json.loads((ROOT/'docs/art/characters-generation.md').read_text().split('```json\n',1)[1].split('```',1)[0])
    # Revision 2 rejected these regenerations. Their shipping source is the
    # original sprite plus chars_cleanup.py; never overwrite with raw v1 art.
    rejected={'furnace_heart','leukarch','phage_mother','riveter',
              'welded_horror','grand_assembler','loom_oracle'}
    records=[r for r in records if r['id'] not in rejected]
    for i,r in enumerate(records):
        name=r['id'];size=96 if name in BOSSES else 64
        raw=WORK/'raw'/f'{name}.png';output=WORK/'processed'/f'{name}.png'
        if not raw.exists():ingest(Path(r['source']),raw)
        target_extent=48 if name=='assembly_frame' else size-2
        report=process(raw,output,size=target_extent,colors=15,pitch='auto',outline=0)
        fitted=Image.open(output).convert('RGBA')
        canvas=Image.new('RGBA',(size,size))
        canvas.paste(fitted,((size-target_extent)//2,size-target_extent))
        im,tidied=ramp_clean(canvas,name)
        im,removed=clean(im)
        # Native eye repair after palette reduction: tiny eye colours must not be
        # sacrificed to a dominant robe ramp by the generic quantizer.
        draw=ImageDraw.Draw(im)
        if name=='cog_acolyte':
            draw.rectangle((29,16,30,17),fill='#FFAA00')
            draw.rectangle((34,16,35,17),fill='#FFAA00')
        elif name=='sickle_mantis':
            draw.point((27,20),fill='#FFFF55')
            draw.point((36,20),fill='#FFFF55')
        report['final_canvas']=[size,size]
        report['material_highlight_pixels_merged']=tidied
        im.save(output)
        report['orphan_pixels_removed']=removed
        (WORK/f'{name}-report.json').write_text(json.dumps(report,indent=2)+'\n')
        if args.apply:im.save(ROOT/f'public/assets/sprites/enemies/{name}.png')
        print(f'characters {i+1}/{len(records)}: {name}, {size}px, removed {removed} orphan pixels',flush=True)
    # The shared preview builder requires 64px outputs; boss previews are reviewed
    # in chars_review's native-size-aware sheets.
    raw64=WORK/'preview-raw';out64=WORK/'preview-processed'
    raw64.mkdir(exist_ok=True);out64.mkdir(exist_ok=True)
    for r in records:
        if r['id'] not in BOSSES:
            name=r['id']+'.png'
            Image.open(WORK/'raw'/name).save(raw64/name)
            Image.open(WORK/'processed'/name).save(out64/name)
    build(raw64,out64,WORK/'preview')

if __name__=='__main__':main()
