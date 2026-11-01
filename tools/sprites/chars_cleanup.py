"""Revision 2: conservative native-pixel cleanup of HEAD originals.

Black structural ink and every silhouette pixel are retained. Only redundant
material shades, unsupported highlight pixels and directional shade placement
change. The seven rejected generations never enter this pipeline.
"""
import argparse
import hashlib
import io
import json
import subprocess

import numpy as np
from PIL import Image

from chars_process import components
from chars_review import ROOT

ASSETS = ROOT / 'public/assets/sprites'
ORIGINAL_REVISION = '8ecf0e2d73b4226d12dba8c21c99e482a9cc3eaf'
RESTORED = {'furnace_heart', 'leukarch', 'phage_mother', 'riveter',
            'welded_horror', 'grand_assembler', 'loom_oracle'}
SMALL_REVIEW = ('sporepuff', 'orchid_bud', 'phage', 'void_mote', 'scrap_drone',
                'shardling', 'pollen_wisp', 'flitterfang', 'gnasher')
SMALL_CLEANED = {'sporepuff', 'scrap_drone', 'shardling', 'pollen_wisp'}
FOUNDRY_MERGES = {
    '550055': '550000', 'AA5555': 'AA5500', 'AA55AA': 'AA0000',
    'AAAA55': 'FFAA00', 'AAAA00': 'FFAA00', 'FFAAAA': 'AAAAAA',
    'FFFF55': 'FFFF00', '5555AA': '555555',
}
CROWN_MERGES = {
    '0000AA': '000055', '0000FF': '0055FF', '0055AA': '0055FF',
    '5555FF': '0055FF', '55AAFF': '00AAFF',
    '00FFFF': 'AAFFFF', '55FFFF': 'AAFFFF', '555555': 'AAAAFF',
}
SMALL_MERGES = {
    'sporepuff': {'000055':'0055AA', '550055':'5500AA',
                  '55AAFF':'00AAFF', 'AAFF55':'55FF00'},
    'scrap_drone': {'000055':'005555', '0000AA':'005555', '0055AA':'005555',
                    '00FFFF':'55FFFF', '555555':'005555', '5555AA':'005555',
                    '55AAAA':'00AAFF'},
    'shardling': {'0000FF':'0000AA', '555555':'000055', '5555FF':'0000AA',
                  '55AAFF':'00AAFF', '55FFFF':'AAFFFF',
                  'AAFF55':'FFFF55', 'AAFFAA':'FFFF55'},
    'pollen_wisp': {'0055AA':'0000AA', '0055FF':'0000AA', '5500AA':'550055',
                    '55FFFF':'AAFFFF', 'FFAAFF':'AA55FF'},
}


def head_bytes(name):
    # Pin the HEAD that the lead asked us to restore. A later commit must not
    # silently replace the cleanup's source with its own already-cleaned result.
    return subprocess.check_output(
        ['git', 'show', f'{ORIGINAL_REVISION}:public/assets/sprites/enemies/{name}.png'], cwd=ROOT)


def original(name):
    return Image.open(io.BytesIO(head_bytes(name))).convert('RGBA')


def material_ramps(name):
    if name in {'leukarch', 'phage_mother'}:
        return [('000055','0055FF','00AAFF'), ('AAAAFF','AAFFFF','FFFFFF'),
                ('550055','5500AA'), ('FF5500','FFAA00','FFFF00')]
    if name == 'sporepuff':
        return [('5500AA','5500FF','AA55FF'), ('0055AA','00AAFF','00FFFF'),
                ('005500','00AA00','55FF00')]
    if name == 'scrap_drone':
        return [('005555','00AAFF','55FFFF'), ('005500','00AA00','55FF00')]
    if name == 'shardling':
        return [('000055','0000AA','00AAFF'), ('AAAAFF','AAFFFF','FFFFFF')]
    if name == 'pollen_wisp':
        # The white pollen head is emissive, not reflective metal.
        return [('000055','0000AA','00FFFF'), ('550055','5500FF','AA55FF')]
    if name == 'loom_oracle':
        return [('555555','AAAAAA','FFFFFF'), ('550000','AA0000','FF5500'),
                ('005555','55AAAA'), ('AA5500','FFAA00','FFFFAA')]
    return [('555555','AAAAAA','FFFFFF'), ('550000','AA0000','FF5500'),
            ('555500','AA5500','FFAA00'), ('000055','005555','0055AA')]


def cleanup(im, name):
    a = np.array(im)
    source = a.copy()
    if name in SMALL_CLEANED:
        merges = SMALL_MERGES[name]
    elif name in {'leukarch', 'phage_mother'}:
        merges = CROWN_MERGES
    elif name == 'loom_oracle':
        merges = {'5555AA':'555555', 'AA5555':'AA0000', 'FFAA55':'FFAA00',
                  'FFAAAA':'FFFFAA'}
    else:
        merges = FOUNDRY_MERGES
    for old, new in merges.items():
        match = np.all(source[:, :, :3] == tuple(bytes.fromhex(old)), axis=2)
        a[match, :3] = tuple(bytes.fromhex(new))
    noise = 0
    relit = 0
    # Process material patches separately. Never filter across a black seam,
    # an eye, a hot core or a material boundary. Seams are the original detail.
    for ramp_hex in material_ramps(name):
        ramp = [tuple(bytes.fromhex(c)) for c in ramp_hex]
        rgb = a[:, :, :3]
        material = np.any(np.stack([np.all(rgb == c, axis=2) for c in ramp]), axis=0)
        material &= a[:, :, 3] > 0
        start = a.copy()
        for y, x in zip(*np.where(material)):
            pixel = tuple(start[y, x, :3])
            # Only a one-pixel shade island surrounded by its OWN material
            # is noise. Tiny eyes, bolts, filaments and black engraving survive.
            y0, y1 = max(0,y-1), min(a.shape[0],y+2)
            x0, x1 = max(0,x-1), min(a.shape[1],x+2)
            neighbours = start[y0:y1, x0:x1, :3].reshape(-1,3)
            same = np.all(neighbours == pixel, axis=1).sum()
            if same != 1:
                continue
            counts = [int(np.all(neighbours == c, axis=1).sum()) for c in ramp]
            best = int(np.argmax(counts))
            if counts[best] >= 5:
                a[y, x, :3] = ramp[best]
                noise += 1
        # Shift existing highlight placement toward 10 o'clock without moving
        # outlines, deleting fittings or flattening whole plates into polygons.
        if len(ramp) < 3:
            continue
        for patch in components(material):
            if len(patch) < 18:
                continue
            ys, xs = np.array(patch).T
            span = int(xs.max()-xs.min()+ys.max()-ys.min())
            if span < 5:
                continue
            for y, x in patch:
                position = (x-xs.min()+y-ys.min()) / span
                pixel = tuple(a[y,x,:3])
                if position > 0.70 and pixel == ramp[-1]:
                    a[y,x,:3] = ramp[-2]
                    relit += 1
                elif position < 0.25 and pixel == ramp[1]:
                    # A supported plane highlight, never a new lonely sparkle.
                    around = material[max(0,y-1):y+2,max(0,x-1):x+2]
                    if int(around.sum()) >= 5:
                        a[y,x,:3] = ramp[-1]
                        relit += 1
    if not np.array_equal(a[:,:,3], source[:,:,3]):
        raise ValueError(f'{name}: cleanup moved the original silhouette')
    old_ink = (source[:,:,3] > 0) & np.all(source[:,:,:3] == 0, axis=2)
    new_ink = (a[:,:,3] > 0) & np.all(a[:,:,:3] == 0, axis=2)
    if not np.array_equal(old_ink, new_ink):
        raise ValueError(f'{name}: cleanup changed structural black ink')
    return Image.fromarray(a), {
        'original_sha256': hashlib.sha256(head_bytes(name)).hexdigest(),
        'silhouette_pixels_retained_percent': 100,
        'structural_ink_retained_percent': 100,
        'redundant_shade_pixels_merged': int(np.any(a[:,:,:3] != source[:,:,:3],axis=2).sum()),
        'isolated_material_highlights_joined': noise,
        'directional_shade_pixels_adjusted': relit,
        'opaque_colours': len(np.unique(a[a[:,:,3]>0,:3],axis=0)),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    results = {}
    for name in sorted(RESTORED | SMALL_CLEANED):
        im, evidence = cleanup(original(name), name)
        if args.apply:
            im.save(ASSETS / f'enemies/{name}.png')
        results[name] = evidence
        print(f'{name}: original outline + ink 100%; '
              f'{evidence["opaque_colours"]} colours; '
              f'{evidence["isolated_material_highlights_joined"]} stray highlights joined; '
              f'{evidence["directional_shade_pixels_adjusted"]} light edits', flush=True)
    if args.apply:
        (ROOT/'docs/art/characters-cleanup-evidence.json').write_text(
            json.dumps(results, indent=2) + '\n')


if __name__ == '__main__':
    main()
