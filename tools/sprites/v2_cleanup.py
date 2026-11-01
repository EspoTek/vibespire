"""Final-resolution ramp/edge repairs for NEW generated sprites only.

No accepted sprite is an input or output. Missing outline pixels are repaired
only beside exposed material, never outside an already-black contour.
"""
import json
from collections import deque

import numpy as np
from PIL import Image

from v2_art import MANIFEST, PREVIEW, ROOT, review_contact


def palette(*colors: str) -> np.ndarray:
    return np.array([tuple(bytes.fromhex(c)) for c in ('000000',)+colors],dtype=np.uint8)


STEEL=palette('0055AA','00AAFF','AAAAAA','550000','AA0000','FF0000','AA5500','FFAA00','FFFFFF')
GREEN=palette('005500','00AA00','00FF00','550055','5500AA','AA00FF','AA5500','FFAA00','FFFFAA')
TIME=palette('000055','0055AA','00AAFF','AA5500','FFAA00','FFFF00','AAAAAA','FFFFFF','AA0000')
NEUTRAL=palette('555555','AAAAAA','FFFFFF','AA5500','FFAA00','005555','00AAAA','00FFFF','AA0000')
FIRE=palette('555555','AAAAAA','FFFFFF','AA5500','FFAA00','550000','AA0000','FF5500','FFFF55')


def chosen_palette(r: dict) -> np.ndarray:
    id=r['id']
    if r['kind']=='cards':
        cls=r['cls']
        if cls=='breaker':return STEEL
        if cls=='graft' or id in ('chaff','curse_parasite_vine','status_tangle'):
            return GREEN if cls=='graft' else palette('555555','AAAAAA','FFFFFF','AA5500','FFAA00','005500','00AA00','00FF00','AA0000')
        if cls=='chronist':
            if id=='red_sky':return palette('000055','0055AA','00AAFF','AA5500','FFAA00','FFFF00','550000','AA0000','FF0000')
            return TIME
        if id in ('burn_bright','bait_flare','fuse','vent_plasma','shrapnel_charge','scar_tissue','curse_debt_mark'):return FIRE
        return NEUTRAL
    if r['kind']=='potions':
        if id in ('pot_blood_ampoule','pot_ember_tonic','pot_kiln_salts'):
            return palette('555555','AAAAAA','FFFFFF','AA5500','FFAA00','AA0000','FF5500')
        if id in ('pot_fester_draught','pot_mimic_gel'):
            return palette('005500','00AA00','00FF00','550055','AA00FF','AAAAAA','FFFFFF')
        if id=='pot_hourglass_tonic':return palette('005555','00AAAA','AAFFFF','FFFFFF','AA5500','FFAA00','FFFF55')
        return palette('000055','0055AA','00AAFF','AAAAAA','FFFFFF','AA5500','FFAA00')
    if id in ('blood_mulch','husk_sac','trellis'):
        return palette('550000','AA5500','FFAA00','FFFFAA','005500','00AA00','AA0000')
    if id in ('reapers_sickle','festering_lens'):
        return palette('555555','AAAAAA','FFFFFF','550055','AA00FF','005500','00AA00')
    if id in ('furnace_mantle','slag_bucket','scar_engine','coal_scuttle','spare_fuse','blood_rivets','borrowed_time','momentum_flywheel'):
        return palette('555555','AAAAAA','FFFFFF','AA5500','FFAA00','AA0000','FF5500')
    if id in ('storm_lantern','astrolabe','perpetual_calendar','overture_engine','refrain_pin','kickback_governor','conductors_baton','ash_wick'):
        return palette('AA5500','FFAA00','FFFF55','000055','0055AA','AAAAAA','FFFFFF')
    if id=='triage_locker':return palette('005500','00AA00','555555','AAAAAA','FFFFFF','AA5500','FFAA00')
    if id=='wanderers_compact':return palette('AA5500','FFAA00','AAAAAA','FFFFFF','AA0000','005500','0055AA')
    return palette('555555','AAAAAA','FFFFFF','AA5500','FFAA00','0055AA','00AAFF')


def repair_edges(a: np.ndarray) -> np.ndarray:
    h,w=a.shape[:2];v=a[:,:,3]>0;material=v&np.any(a[:,:,:3]!=0,axis=2)
    # Flood the exterior so narrow internal holes are not clogged by repairs.
    exterior=np.zeros(v.shape,dtype=bool);q=deque([(0,0)])
    while q:
        x,y=q.popleft()
        if not (0<=x<w and 0<=y<h) or exterior[y,x] or v[y,x]:continue
        exterior[y,x]=True;q.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    result=a.copy()
    for y,x in zip(*np.where(material)):
        if x in (1,w-2) or y in (1,h-2):
            result[y,x]=(0,0,0,255)
            continue
        # Do not enlarge an isolated spark. Broad material planes need ink where
        # final sampling skipped their high-resolution source contour.
        adjacent=sum(material[yy,xx] for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
        if adjacent<2:continue
        for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<xx<w-1 and 0<yy<h-1 and exterior[yy,xx]:result[yy,xx]=(0,0,0,255)
    return result


def motif(a: np.ndarray,id: str) -> None:
    def p(x: int,y: int,color: str) -> None:
        a[y,x]=tuple(bytes.fromhex(color))+(255,)
    if id=='static_choir':
        # Three physical fork pylons, steel caps, bronze stems and two arcs.
        for x in (3,7,11):
            for xx in (x,x+2):
                for y in (4,5):p(xx,y,'AAAAAA')
            for xx in range(x,x+3):p(xx,6,'555555')
            for y in range(7,11):p(x+1,y,'AA5500')
            for xx in range(x,x+3):p(xx,11,'FFAA00');p(xx,12,'000000')
        for x,y in ((5,3),(6,2),(9,3),(10,2)):p(x,y,'FFFFFF')
    if id=='blood_rivets':
        for x in (3,7,11):
            p(x,6,'FFFFFF');p(x+1,6,'AAAAAA');p(x,7,'AAAAAA');p(x+1,7,'555555');p(x+1,8,'AA0000');p(x+1,9,'AA0000')
    if id=='reserve_coil':
        for y in (5,7,9,11):p(4,y,'FFAA00');p(3,y,'AA5500');p(11,y,'AA5500')
        for y in (8,9,10):p(8,y,'00AAFF')
        p(8,7,'0055AA')
    if id=='overture_engine':
        for x in (4,6,8,10):p(x,9,'FFAA00');p(x,10,'AA5500')
        p(8,5,'FFFF55');p(8,4,'FFFFFF')
    if id=='ash_wick':
        for y in (2,4,6):p(7,y,'FFFF55');p(8,y,'FFAA00')
        p(7,9,'FFFFFF');p(7,10,'FFFFFF')
    if id=='wanderers_compact':
        p(8,6,'AA0000');p(6,9,'005500');p(10,9,'0055AA');p(8,8,'FFFFFF')
    if id=='salvagers_licence':
        for x,y in ((8,8),(9,8),(8,9),(7,10),(6,11)):p(x,y,'AAAAAA')
        p(7,8,'000000');p(9,10,'555555')
    if id=='pot_blood_ampoule':
        for x,y in ((8,7),(7,8),(8,9),(7,10)):p(x,y,'000000')
        p(6,11,'AA0000');p(9,11,'AA0000')
    if id=='pot_riposte_salts':
        for x,y in ((5,5),(6,6),(7,7),(8,8),(9,5),(8,6),(6,8)) :p(x,y,'FFFFFF')
        p(5,8,'FFAA00');p(9,8,'FFAA00');p(7,6,'000000')
    if id=='pot_fester_draught':
        for y in (8,9,10):
            for x in (6,7,8,9):p(x,y,'AAAAAA')
        p(6,9,'000000');p(9,9,'000000');p(7,11,'AAAAAA');p(9,11,'AAAAAA')
    if id=='pot_fracture_serum':
        for x,y in ((8,6),(7,7),(8,8),(7,9),(6,10),(9,10)):p(x,y,'FFFFFF')
    if id=='pot_echo_draught':
        for x,y in ((7,7),(8,7),(6,8),(9,8),(6,9),(9,9),(6,10),(9,10),(7,11),(8,11)):p(x,y,'00AAFF')
        p(5,7,'FFFFFF');p(5,8,'FFFFFF')
    if id=='pot_hourglass_tonic':
        p(7,7,'FFAA00');p(7,8,'FFFF55');p(7,9,'FFAA00');p(6,12,'FFFF55');p(8,12,'FFAA00')
    if id=='pot_surge_flask':
        p(6,2,'AAAAAA');p(7,2,'FFFFFF');p(8,2,'555555')
        for x,y in ((7,7),(8,8),(7,9),(8,10)):p(x,y,'FFFFFF')
    if id=='pot_ember_tonic':
        p(7,9,'FFAA00');p(8,9,'FF5500');p(7,10,'FF5500');p(8,10,'AA0000')
    if id=='pot_mimic_gel':
        p(6,5,'00FF00');p(7,5,'00AA00');p(10,6,'00FF00');p(11,6,'005500')


def main() -> None:
    m=json.loads(MANIFEST.read_text());evidence=[]
    for r in m['new']:
        s=next(s for s in m['sheets'] if r['id'] in s['slots']);path=PREVIEW/s['name']/f'{r["id"]}.png'
        before=np.array(Image.open(path).convert('RGBA'));a=before.copy();v=a[:,:,3]>0;colors=chosen_palette(r)
        distances=np.sum((a[v,:3,None].astype(float)-colors.T[None,:,:].astype(float))**2,axis=1)
        a[v,:3]=colors[np.argmin(distances,axis=1)]
        a=repair_edges(a)
        motif(a,r['id'])
        a[a[:,:,3]==0]=0
        # Motif repairs can introduce one additional functional colour: merge
        # only the least-used redundant shade, using the existing SMS reducer.
        from postprocess import quantize_sms
        im,count=quantize_sms(Image.fromarray(a),10 if r['kind']=='cards' else 8)
        a=np.array(im);im.save(path)
        evidence.append({'id':r['id'],'native_pixels_changed':int(np.any(before!=a,axis=2).sum()),'colors':count,
                         'treatment':'material ramp alignment; missing contour repairs; native motif repairs where listed in v2_cleanup.py'})
    for s in m['sheets']:review_contact(s,PREVIEW/s['name']/'contact.png')
    (ROOT/'docs/art/v2-new-art-cleanup.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print(f'Cleaned {len(evidence)} new native sprites; accepted set not opened',flush=True)


if __name__=='__main__':main()
