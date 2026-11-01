"""Round-two, do-no-harm repairs. Never redraw or re-outline the HEAD sprites.

The rejected files were restored byte-for-byte before this cleanup. Round-one
accepted images are immutable inputs. The saved round-one snapshot is needed
only for reapplying the event edit and the three-way review sheets.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from typing import TypedDict

import numpy as np
from PIL import Image, ImageDraw

from ui_audit import DOC, ROOT, WORK, contact, directory, paths

w = WORK / 'round2'
root = ROOT
# Each change is a local ramp/contour repair on the HEAD sprite; no rescaling,
# recentering, auto-outline, redraw or silhouette simplification.
class Repair(TypedDict):
    map: dict[str, str]
    pixels: list[tuple[int, int, str, str]]


changes: dict[str, Repair] = {
'clean_manifest': {'map': {'#FFAA55':'#FFAA00','#FFFFAA':'#FFFF55'},'pixels':[]},
'gyro_jammer': {'map': {'#550055':'#000055'},'pixels':[]},
'jettison_pod': {'map': {'#5555AA':'#0055AA'},'pixels':[]},
'read_the_line': {'map': {'#FF5555':'#FFAA55'},'pixels':[]},
'salvage_kit': {'map': {'#55FFFF':'#AAFFFF'},'pixels':[]},
'snare_line': {'map': {'#AAAAFF':'#AAFFFF'},'pixels':[]},
'stress_fracture': {'map': {'#55AAFF':'#AAAAFF','#555555':'#005555'},'pixels':[]},
# Replace saturated blue rim specks and purple contamination with navy shadow.
# Keep the existing blue/cyan cage, yellow balance and olive/brass ramp.
'tourbillon': {'map': {'#0000FF':'#000055','#550055':'#000055'},'pixels':[]},
'hairline_mark': {'map': {'#FFAA55':'#FFFFAA'},'pixels':[]},
'binding_contract': {'map': {'#AAAA00':'#FFAA00'},'pixels':[(13,3,'#FFFFAA','#FFAA55')]},
'bulwark_rivets': {'map': {'#550055':'#550000','#555555':'#AA5500'},'pixels':[]},
'heartwood_ring': {'map': {},'pixels':[(4,3,'#000000','#005555'),(9,11,'#000000','#550000')]},
'paradox_coil': {'map': {},'pixels':[(10,4,'#000000','#0055AA'),(9,4,'#000000','#000055')]},
'timeline_clamp': {'map': {'#55AAAA':'#00AAAA'},'pixels':[]},
'gravity_loom': {'map': {},'pixels':[(3,7,'#000000','#550055'),(12,6,'#000000','#550055')]},
'shard_crucible': {'map': {},'pixels':[(5,7,'#000000','#FFFFFF'),(6,7,'#000000','#555555'),(9,7,'#000000','#555555')]},
'field_dressing': {'map': {},'pixels':[(3,6,'#000000','#AAAA55')]},
}
REVISED = {
    'cards': list(changes)[:9],
    'relics': list(changes)[9:],
    'backdrops': ['event_generic'],
}


def rgba(s: str) -> tuple[int, ...]:
    return tuple(bytes.fromhex(s[1:])) + (255,)


def clean_sprite(image: Image.Image, name: str) -> Image.Image:
    old = np.array(image.convert('RGBA'))
    a = old.copy()
    spec = changes[name]
    for src, dst in spec['map'].items():
        mask = np.all(old == rgba(src), axis=2)
        assert mask.any(), (name, src)
        a[mask] = rgba(dst)
    for x, y, src, dst in spec['pixels']:
        assert tuple(a[y, x]) == rgba(src), (name, x, y, src)
        a[y, x] = rgba(dst)
    assert np.array_equal(old[:, :, 3], a[:, :, 3]), name
    assert np.count_nonzero(np.any(a != old, axis=2)) <= 7, name
    return Image.fromarray(a)


def event_floor(original: Image.Image, base: Image.Image) -> Image.Image:
    a = np.array(base.resize((320, 180), Image.Resampling.NEAREST))
    o = np.array(original)
    # Recover thin original joints on the accepted 2x construction grid.
    black = np.all(o == 0, axis=2).reshape(180, 2, 320, 2).sum(axis=(1, 3)) >= 2
    floor = (np.indices((180, 320))[0] >= 79) & np.all(a == (0, 0, 85), axis=2)
    a[floor & black] = (0, 0, 0)
    im = Image.fromarray(a)
    d = ImageDraw.Draw(im)
    for y, x0, x1 in ((92, 48, 271), (112, 31, 288)):
        for x in range(x0, x1 + 1):
            if floor[y, x]:
                d.point((x, y), fill=(0, 0, 0))
    # Match the original lower joints exactly; avoid doubled perspective lines.
    for end in (39, 110, 209, 280):
        line = Image.new('1', (320, 180))
        ImageDraw.Draw(line).line((160, 72, end, 140), fill=1, width=1)
        a = np.array(im)
        a[np.array(line) & floor] = (0, 0, 0)
        im = Image.fromarray(a)
    return im.resize((640, 360), Image.Resampling.NEAREST)


def apply() -> None:
    for kind, names in REVISED.items():
        for name in names:
            path = directory(kind) / f'{name}.png'
            relative = path.relative_to(ROOT)
            # Read-only git operation, limited to this assignment's rejected IDs.
            original = subprocess.check_output(['git', 'show', f'HEAD:{relative}'], cwd=ROOT)
            path.write_bytes(original)
            assert path.read_bytes() == original
            if kind == 'backdrops':
                accepted = w / 'round1' / relative
                result = event_floor(Image.open(path).convert('RGB'), Image.open(accepted).convert('RGB'))
                result.save(path)
                result.resize((1280, 720), Image.Resampling.NEAREST).save(path.with_name(name + '@2x.png'))
                metadata_path = path.with_suffix('.json')
                metadata = json.loads(metadata_path.read_text())
                metadata['final_cleanup'] = 'ui_revision.py: original floor seams restored at low contrast; two distant courses; aligned perspective joints; accepted walls and calm centre preserved'
                colors = result.getcolors(640 * 360)
                assert colors is not None
                metadata['colors'] = len(colors)
                metadata_path.write_text(json.dumps(metadata, indent=2) + '\n')
            else:
                clean_sprite(Image.open(path), name).save(path)
            print(f'restored HEAD and repaired {kind}/{name}', flush=True)


def metrics() -> list[dict]:
    result = []
    for kind in ('cards', 'relics'):
        for name in REVISED[kind]:
            p = directory(kind) / f'{name}.png'
            old = np.array(Image.open(w / 'head' / kind / p.name).convert('RGBA'))
            a = np.array(Image.open(p).convert('RGBA'))
            v = old[:, :, 3] > 0
            count = int(np.any(a != old, axis=2).sum())
            before = int((v & np.any(old[:, :, :3] != 0, axis=2)).sum())
            after = int((v & np.any(a[:, :, :3] != 0, axis=2)).sum())
            assert np.array_equal(old[:, :, 3], a[:, :, 3]), name
            assert after >= before, name
            assert count <= 7, name
            result.append({'kind': kind, 'id': name, 'changed_pixels': count,
                           'opaque_pixels': int(v.sum()),
                           'identical_opaque_percent': round(100 * (int(v.sum()) - count) / int(v.sum()), 2),
                           'material_pixels_before': before, 'material_pixels_after': after,
                           'detail_density_ratio': round(after / before, 4),
                           'silhouette_identical': True, 'recipe': changes[name]})
    (DOC / 'ui-revision-metrics.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def round_sheets() -> None:
    for kind in ('cards', 'relics', 'backdrops'):
        names = REVISED[kind]
        scale = 1 if kind == 'backdrops' else 4
        size = (640, 360) if kind == 'backdrops' else (32, 24) if kind == 'cards' else (16, 16)
        cell_w = max(size[0] * scale + 20, 190)
        cell_h = size[1] * scale + 40
        sheet = Image.new('RGB', (3 * cell_w, len(names) * cell_h + 26), '#181820')
        draw = ImageDraw.Draw(sheet)
        for col, label in enumerate(('Original HEAD', 'Rejected round one', 'Final conservative cleanup')):
            draw.text((col * cell_w + 5, 5), label, fill='white', font_size=12)
        for row, name in enumerate(names):
            for col, base in enumerate((w / 'head' / kind,
                                         w / 'round1' / directory(kind).relative_to(ROOT), directory(kind))):
                im = Image.open(base / f'{name}.png').convert('RGBA').resize((size[0] * scale, size[1] * scale), Image.Resampling.NEAREST)
                x = col * cell_w + (cell_w - im.width) // 2
                y = row * cell_h + 30
                sheet.paste(im, (x, y), im)
                draw.text((col * cell_w + 5, y + im.height + 4), name, fill='white', font_size=11)
        target = DOC / f'ui-round2-{kind}.png'
        sheet.save(target)
        print(f'updated {target.name}', flush=True)
    for kind in ('relics', 'cards'):
        for scale in (1, 4):
            contact(kind, 'final', scale)


def validate_round() -> None:
    stats = metrics()
    # Every accepted image AND its encoding remains byte-identical this round.
    checked = 0
    for kind in ('cards', 'relics', 'potions', 'backdrops'):
        for p in paths(kind):
            if kind in REVISED and p.stem in REVISED[kind]:
                continue
            before = w / 'round1' / p.relative_to(ROOT)
            assert p.read_bytes() == before.read_bytes(), p
            checked += 1
    for name in ('act3_crown', 'shop_interior'):
        for suffix in ('.json', '@2x.png'):
            p = directory('backdrops') / f'{name}{suffix}'
            assert p.read_bytes() == (w / 'round1' / p.relative_to(ROOT)).read_bytes(), p
    for kind in ('cards', 'relics', 'potions'):
        p = directory(kind).parent / f'{kind}-atlas.json'
        assert p.read_bytes() == (w / p.name).read_bytes(), p
    # Concurrency may change unrelated source files, so record differences without
    # overwriting them or treating their contents as this asset pass's work.
    source_hashes = json.loads((w / 'src-hashes.json').read_text())
    concurrent = [name for name, value in source_hashes.items()
                  if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != value]
    low = min(r['identical_opaque_percent'] for r in stats)
    high = max(r['identical_opaque_percent'] for r in stats)
    print(f'PASS round 2: {checked} accepted/untouched images byte-identical; 17 original silhouettes intact; {low:.1f}–{high:.1f}% opaque pixels unchanged; all material coverage >= original; atlas JSON byte-identical', flush=True)
    print(f'Source snapshot: {len(concurrent)} files changed concurrently; this workflow writes no src paths', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('apply', 'sheets', 'validate'))
    action = parser.parse_args().action
    if action == 'apply':
        apply()
        metrics()
    elif action == 'sheets':
        round_sheets()
    else:
        validate_round()
