"""Validate content coverage, native sprites, immutable old frames and sheets."""
import hashlib
import json
import re
import subprocess

import numpy as np
from PIL import Image

from v2_art import ROOT, MANIFEST


def validate() -> None:
    m=json.loads(MANIFEST.read_text())
    current=json.loads(subprocess.check_output(['node',str(ROOT/'tools/sprites/v2_inventory.mjs')],text=True,cwd=ROOT))
    request_text=(ROOT/'docs/v2/art-needed.md').read_text()
    requested={kind:[] for kind in current}
    for line in request_text.splitlines():
        if any(term in line.lower() for term in ('status icon','ui)',', ui', 'portrait','rework')):
            continue
        kind=next((kind for kind,term in (('cards','card icon'),('relics','relic icon'),('potions','potion icon'),('enemies','enemy sprite'),('enemies','boss sprite')) if term in line.lower()),None)
        if kind is not None:
            requested[kind].extend(re.findall(r'`([^`]+)`',line.split('. ',1)[0]))
    results=[]
    for kind,inventory in current.items():
        assert not inventory['missing'],(kind,inventory['missing'])
        base=ROOT/'public/assets/sprites'
        metadata=json.loads((base/f'{kind}-atlas.json').read_text())
        assert set(requested[kind])<=set(metadata['frames']),(kind,'request lines without frames',set(requested[kind])-set(metadata['frames']))
        baseline=m['baseline'][kind]
        assert metadata.keys()==baseline['metadata'].keys(),kind
        atlas=Image.open(base/f'{kind}-atlas.png').convert('RGBA')
        for id,digest in baseline['files'].items():
            p=base/kind/f'{id}.png'
            assert hashlib.sha256(p.read_bytes()).hexdigest()==digest,('accepted sprite changed',kind,id)
        for id,f in baseline['metadata']['frames'].items():
            assert metadata['frames'][id]==f,('existing frame moved',kind,id)
        if kind=='enemies':
            assert metadata==baseline['metadata'],'enemy atlas changed'
        occupied=set()
        for id,f in metadata['frames'].items():
            box=(f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])
            assert box not in occupied,('overlapping frame',id)
            occupied.add(box)
            sprite=Image.open(base/kind/f'{id}.png').convert('RGBA')
            expected=Image.new('RGBA',(f['w'],f['h']))
            expected.paste(sprite,((f['w']-sprite.width)//2,f['h']-sprite.height))
            assert atlas.crop(box).tobytes()==expected.tobytes(),('packed cell differs',kind,id)
        print(f'PASS {kind}: {len(inventory["code"])} code IDs covered, {len(baseline["files"])} accepted files and frame rectangles preserved',flush=True)
    contacts={scale:Image.open(ROOT/f'docs/art/v2-new-art-{scale}x.png') for scale in (1,4)}
    for i,r in enumerate(m['new']):
        im=Image.open(ROOT/r['file']);a=np.array(im);v=a[:,:,3]>0
        expected=(32,24) if r['kind']=='cards' else (96,96) if r['kind']=='enemies' and r['boss'] else (64,64) if r['kind']=='enemies' else (16,16)
        assert im.size==expected and im.mode=='RGBA',r['id']
        assert v.any() and set(np.unique(a[:,:,3]))<={0,255},r['id']
        assert np.all(a[~v]==0) and np.all(a[v,:3]%85==0),r['id']
        assert not np.any(np.all(a[v,:3]==(255,0,255),axis=1)),r['id']
        colors=len(np.unique(a[v,:3],axis=0));cap=10 if r['kind']=='cards' else 15 if r['kind']=='enemies' else 8
        assert colors<=cap,(r['id'],colors)
        black=np.all(a[:,:,:3]==0,axis=2)&v
        assert black.any(),('no black outline',r['id'])
        assert not np.any(v[0,:]) and not np.any(v[-1,:]) and not np.any(v[:,0]) and not np.any(v[:,-1]),('missing transparent safety margin',r['id'])
        results.append({'id':r['id'],'kind':r['kind'],'colors':colors,'opaque_pixels':int(v.sum()),'black_pixels':int(black.sum()),'sha256':hashlib.sha256((ROOT/r['file']).read_bytes()).hexdigest()})
        for scale in (1,4):
            sheet=contacts[scale]
            x,y=i%7*208+10,i//7*(24*scale+38)+4
            resized=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)
            expected_tile=Image.new('RGB',resized.size,'#181820');expected_tile.paste(resized,(0,0),resized)
            assert sheet.crop((x,y,x+resized.width,y+resized.height)).tobytes()==expected_tile.tobytes(),('stale contact',r['id'],scale)
    coherence=Image.open(ROOT/'docs/art/v2-new-art-coherence.png');offset=0
    for group in m['coherence_groups']:
        assert sum(p['accepted'] for p in group['placements'])==8,group
        for p in group['placements']:
            sprite=Image.open(ROOT/f'public/assets/sprites/{p["kind"]}/{p["id"]}.png').convert('RGBA')
            resized=sprite.resize((sprite.width*4,sprite.height*4),Image.Resampling.NEAREST)
            bg=Image.new('RGB',resized.size,'#181820');bg.paste(resized,(0,0),resized)
            x,y=p['x'],p['y']+offset
            assert coherence.crop((x,y,x+resized.width,y+resized.height)).tobytes()==bg.tobytes(),('stale coherence',p['id'])
        offset+=group['height']
    report={'new_counts':{kind:sum(r['kind']==kind for r in results) for kind in current},'results':results,
            'cut_art_left_untouched':{kind:data['cut'] for kind,data in current.items()},'uncovered':{kind:[] for kind in current},
            'art_needed_end_sha256':hashlib.sha256(request_text.encode()).hexdigest(),
            'art_needed_lines_added':[line for line in request_text.splitlines() if line not in m['art_needed_initial'].splitlines()],
            'requested_ids_checked':requested,
            'checks':['current code coverage','SMS channels','palette caps','binary alpha','zero transparent RGB','safety margin','black presence','all existing files SHA256','all old frame rectangles','every packed pixel','1x/4x sheet pixels','8 accepted references per coherence group']}
    (ROOT/'docs/art/v2-new-art-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'PASS {len(results)} new sprites, exact native/4x contacts and mixed coherence sheet',flush=True)


if __name__=='__main__':validate()
