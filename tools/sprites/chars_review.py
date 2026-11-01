"""Character review sheets; reads production assets and preserves a session baseline."""
from pathlib import Path
import argparse
import json
import re
import shutil
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/art'
SNAP = Path('/private/tmp/vibespire-chars-v2-before')


def inventory():
    groups = {}
    for act in (1, 2, 3):
        text = (ROOT / f'src/content/enemies/act{act}.ts').read_text()
        for enemy in re.findall(r"id: '([^']+)', name: '[^']+', hp:", text):
            groups[enemy] = act
    # Boss order and summons are defined in bosses.ts / docs/ENEMIES.md.
    for act, names in {1: 'bramble_ram mother_orchid orchid_bud gloam_empress', 2: 'grand_assembler assembly_frame welded_horror furnace_heart trihammer trihammer_arm', 3: 'tether_sovereign star_archivist leukarch antibody phage pyrexia_node'}.items():
        groups.update({name: act for name in names.split()})
    return groups


def checker(size):
    im = Image.new('RGBA', size, '#34364a')
    d = ImageDraw.Draw(im)
    for y in range(0,size[1],8):
        for x in range(0,size[0],8):
            if (x//8+y//8)%2: d.rectangle((x,y,x+7,y+7), fill='#45485b')
    return im


def sheets(label, base, backdrops=None):
    OUT.mkdir(exist_ok=True)
    if backdrops is None:
        backdrops=ROOT/'public/assets/backdrops'
    groups = inventory()
    paths = sorted((base/'enemies').glob('*.png'), key=lambda p: (groups[p.stem], p.stem))
    metrics = {}
    for start in range(0,len(paths),8):
        page = Image.new('RGB',(1280,1800),'#1e2030')
        d = ImageDraw.Draw(page)
        d.text((12,10),f'CHARACTERS / {label.upper()} / {start+1}-{min(start+8,len(paths))} | exact 1x and NEAREST 4x; combat crop is unscaled',fill='white')
        for n,path in enumerate(paths[start:start+8]):
            x,y = (n%2)*640, 40+(n//2)*440
            im = Image.open(path).convert('RGBA')
            a=np.array(im); colors = {tuple(c) for c in a[a[:,:,3]>0]}
            box=im.getbbox()
            metrics[path.stem]={'size':im.size,'bbox':box,'colours':len(colors),'sms':all(all(v%85==0 for v in c[:3]) for c in colors),'binary':bool(np.isin(a[:,:,3],[0,255]).all()),'act':groups[path.stem]}
            d.text((x+8,y),f'{path.stem} / act {groups[path.stem]} / {im.width}px / {len(colors)} colours',fill='white')
            large=checker((im.width*4,im.height*4)); large.alpha_composite(im.resize(large.size,Image.Resampling.NEAREST)); page.paste(large.convert('RGB'),(x+8,y+28))
            native=checker(im.size); native.alpha_composite(im); page.paste(native.convert('RGB'),(x+420,y+28)); d.text((x+420,y+130),'1x / checkered',fill='#bbbbcc')
            bdname={1:'act1_verdant',2:'act2_foundry',3:'act3_crown'}[groups[path.stem]]
            bg=Image.open(backdrops/f'{bdname}.png').convert('RGBA')
            bg.alpha_composite(im,(320-im.width//2,200-im.height))
            crop=bg.crop((218,54,422,224))
            page.paste(crop.convert('RGB'),(x+420,y+160));d.text((x+420,y+340),'1x / act backdrop',fill='#bbbbcc')
            d.text((x+8,y+414),'4x NEAREST',fill='#bbbbcc')
        page.save(OUT/f'characters-contact-{label}-{start//8+1}.png')
        print(f'{label}: contact page {start//8+1}, enemies {start+1}-{min(start+8,len(paths))}/{len(paths)}',flush=True)
    portraits=sorted((base/'portraits').glob('*.png'))
    page=Image.new('RGB',(1200,680),'#1e2030');d=ImageDraw.Draw(page)
    for n,path in enumerate(portraits):
        x,y=(n%3)*400,24+(n//3)*330
        im=Image.open(path).convert('RGBA')
        large=checker((im.width*4,im.height*4));large.alpha_composite(im.resize(large.size,Image.Resampling.NEAREST));page.paste(large.convert('RGB'),(x+12,y+25))
        native=checker(im.size);native.alpha_composite(im);page.paste(native.convert('RGB'),(x+300,y+25))
        d.text((x+12,y),path.name+' / 4x + 1x',fill='white')
        a=np.array(im); colors={tuple(c) for c in a[a[:,:,3]>0]};metrics[path.stem]={'size':im.size,'bbox':im.getbbox(),'colours':len(colors),'sms':all(all(v%85==0 for v in c[:3]) for c in colors)}
    page.save(OUT/f'characters-portraits-{label}.png')
    (OUT/f'characters-metrics-{label}.md').write_text('# Character measurements: '+label+'\n\n```json\n'+json.dumps(metrics,indent=2)+'\n```\n')
    print(f'{label}: {len(paths)} enemies and {len(portraits)} portraits reviewed',flush=True)


def main():
    p=argparse.ArgumentParser();p.add_argument('phase',choices=['before','after']);args=p.parse_args()
    production=ROOT/'public/assets/sprites'
    if args.phase=='before':
        if SNAP.exists(): raise FileExistsError(f'baseline already exists: {SNAP}')
        SNAP.mkdir()
        for folder in ('enemies','portraits'):shutil.copytree(production/folder,SNAP/folder)
        for suffix in ('png','json'):shutil.copy2(production/f'enemies-atlas.{suffix}',SNAP/f'enemies-atlas.{suffix}')
        sheets('before',SNAP)
    else:sheets('after',production)

if __name__=='__main__':main()
