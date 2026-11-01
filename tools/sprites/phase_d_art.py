"""Native Phase D art, frame-preserving card packing, and measured coherence review.

Run from the repository root:
  UV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run --project tools/sprites tools/sprites/phase_d_art.py
The status grids remain authored in statusIconArt.ts; tsx reads the actual ICONS/ICON_KEYS.
"""
import json
import subprocess
from statistics import median

import numpy as np
from PIL import Image, ImageDraw

from atlas import pack
from v2_art import ROOT, read_manifest
from v2_metrics import accepted_metrics, measurements
from v2_revision import family

DOC = ROOT / 'docs/art'
CARDS = ROOT / 'public/assets/sprites/cards'
NEW_ICONS = ('seething', 'facets', 'frenzy', 'scour_rite', 'seed_bank',
             'white_fever', 'crown_rage', 'reprise_big')
# Each new icon is directly flanked by accepted art with related shapes/materials.
NEIGHBOURS = {
    'seething': ('goaded', 'embers'),
    'facets': ('reflection', 'prism_resonance'),
    'frenzy': ('goaded', 'charge_meter'),
    'scour_rite': ('quickening_sap', 'ripening_rot'),
    'seed_bank': ('inventory', 'ripening'),
    'white_fever': ('replicating', 'soft_underbelly'),
    'crown_rage': ('reads_the_guard', 'embers'),
    'reprise_big': ('reprise', 'guard_hold'),
}
BACKGROUNDS = ('#000000', '#000055')


def second_verse() -> Image.Image:
    """A folded silver score in front of a small shield; gold activates stave two."""
    image = Image.new('RGBA', (32, 24))
    d = ImageDraw.Draw(image)
    ink, shade, silver, white = '#000000', '#555555', '#AAAAAA', '#FFFFFF'
    brass, gold, light = '#AA5500', '#FFAA00', '#FFFF00'
    # Small shield rim behind the page, with a genuinely transparent centre.
    d.polygon([(20, 7), (28, 7), (30, 9), (29, 17), (25, 22), (21, 18)],
              fill=ink)
    d.line([(22, 8), (27, 8), (29, 10), (28, 16), (25, 20), (22, 17)],
           fill=silver, width=1)
    d.line([(29, 11), (28, 17), (25, 21)], fill=shade, width=1)
    # Paper's right-hand and bottom planes give it a crease and a rolled edge.
    d.polygon([(3, 1), (19, 1), (23, 5), (23, 20), (21, 22), (3, 22)],
              fill=silver, outline=ink)
    d.line([(4, 2), (18, 2)], fill=white)
    d.line([(4, 3), (4, 20)], fill=white)
    d.line([(22, 6), (22, 20), (20, 21), (4, 21)], fill=shade)
    d.polygon([(19, 2), (22, 5), (19, 5)], fill=white, outline=ink)
    # Five lines per stave. The repeat's hard gold halo interrupts the lower lines.
    for y in (4, 6, 8, 10, 12):
        d.line((6, y, 17, y), fill=shade)
    for y in (13, 15, 17, 19, 21):
        d.line((6, y, 20, y), fill=shade)
    # Two large quavers joined by their beam, with solid two-pixel note heads.
    d.line((10, 5, 10, 10), fill=ink)
    d.line((16, 4, 16, 8), fill=ink)
    d.line((10, 5, 16, 4), fill=ink, width=2)
    d.rectangle((8, 9, 10, 10), fill=ink)
    d.rectangle((14, 7, 16, 8), fill=ink)
    # Repeat sign: two square dots, one thin bar and one double-width bar.
    d.rectangle((12, 12, 22, 20), fill=brass)
    d.rectangle((13, 13, 21, 19), fill=gold)
    d.rectangle((12, 14, 15, 16), fill=ink)
    d.rectangle((12, 18, 15, 20), fill=ink)
    d.rectangle((13, 14, 14, 15), fill=light)
    d.rectangle((13, 18, 14, 19), fill=light)
    d.rectangle((16, 12, 18, 20), fill=ink)
    d.line((17, 13, 17, 19), fill=light)
    d.rectangle((19, 12, 22, 20), fill=ink)
    d.rectangle((20, 13, 21, 19), fill=gold)
    d.line((20, 13, 20, 18), fill=light)
    return image


def read_icons() -> tuple[dict, dict]:
    source = ("import {ICONS,ICON_KEYS} from './src/render/ui/iconArt.ts';"
              "process.stdout.write(JSON.stringify({icons:ICONS,palette:ICON_KEYS}));")
    result = subprocess.run([str(ROOT / 'node_modules/.bin/tsx'), '-e', source],
                            cwd=ROOT, check=True, capture_output=True, text=True)
    data = json.loads(result.stdout)
    return data['icons'], data['palette']


def raster(rows: list[str], palette: dict) -> Image.Image:
    assert len(rows) == 12 and all(len(row) == 12 for row in rows), rows
    image = Image.new('RGBA', (12, 12))
    for y, row in enumerate(rows):
        for x, key in enumerate(row):
            if key != '.':
                color = palette[key]
                image.putpixel((x, y), (color >> 16, (color >> 8) & 255, color & 255, 255))
    return image


def validate(image: Image.Image, cap: int) -> dict:
    a = np.array(image)
    visible = a[:, :, 3] > 0
    colors = np.unique(a[visible, :3], axis=0)
    assert len(colors) <= cap, len(colors)
    assert np.all(colors % 85 == 0), colors
    assert set(np.unique(a[:, :, 3])) <= {0, 255}
    assert np.all(a[~visible] == 0)
    assert not np.any(np.all(colors == (255, 0, 255), axis=1))
    assert np.any(np.all(colors == 0, axis=1))
    ramps = {}
    for c in colors:
        key = family(tuple(c))
        ramps[key] = ramps[key] + 1 if key in ramps else 1
    assert max(ramps.values()) <= 3, ramps
    return {**measurements(image), 'opaque_colours': len(colors), 'material_ramp_steps': ramps}


def coherence(images: dict[str, Image.Image]) -> list[dict]:
    # Separate black/navy panels show exact native sprites above NEAREST 4x copies.
    sheet = Image.new('RGB', (1040, 72 + 136 * 8 + 186), '#181820')
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 12), 'VIBESPIRE / PHASE D / NATIVE 1x + NEAREST 4x', fill='white')
    draw.text((16, 32), 'Accepted / NEW / accepted in every group; native pixels are never resized.', fill='#AAAAAA')
    placements = []
    groups = [(name, (NEIGHBOURS[name][0], name, NEIGHBOURS[name][1])) for name in NEW_ICONS]
    groups.append(('second_verse', ('parry_ledger', 'second_verse', 'encore')))
    for index, (new, names) in enumerate(groups):
        y = 60 + index * 136
        draw.text((16, y + 4), new, fill='#FFFF55')
        for panel, bg in enumerate(BACKGROUNDS):
            x0 = 180 + panel * 428
            draw.rectangle((x0, y, x0 + 411, y + (174 if new == 'second_verse' else 124)), fill=bg)
            for col, name in enumerate(names):
                x = x0 + 10 + col * 135
                image = images[name]
                draw.text((x, y + 5), ('NEW ' if name == new else 'OK ') + name, fill='white')
                for scale, top in ((1, 27), (4, 65)):
                    sprite = image.resize((image.width * scale, image.height * scale), Image.Resampling.NEAREST)
                    sheet.paste(sprite, (x, y + top), sprite)
                    placements.append({'new_id': new, 'id': name, 'accepted': name != new,
                                       'scale': scale, 'background': bg, 'x': x, 'y': y + top})
    sheet.save(DOC / 'pd-art-coherence.png')
    # Verify every review cell, including the real native-size rows, pixel for pixel.
    final = Image.open(DOC / 'pd-art-coherence.png')
    for p in placements:
        image = images[p['id']]
        sprite = image.resize((image.width * p['scale'], image.height * p['scale']), Image.Resampling.NEAREST)
        expected = Image.new('RGB', sprite.size, p['background'])
        expected.paste(sprite, (0, 0), sprite)
        box = (p['x'], p['y'], p['x'] + sprite.width, p['y'] + sprite.height)
        assert final.crop(box).tobytes() == expected.tobytes(), p
    return placements


def main() -> None:
    print('Phase D: read runtime icon grids and accepted-set measurements', flush=True)
    icons, palette = read_icons()
    accepted = accepted_metrics(read_manifest())
    overall = median(a['isolated_pixels'] for group in accepted.values() for a in group['assets'])
    card_median = accepted['cards']['isolated_pixels_median']
    image = second_verse()
    card_metrics = validate(image, 10)
    assert card_metrics['isolated_pixels'] <= min(card_median, overall), card_metrics
    image.save(CARDS / 'second_verse.png')
    print(f'Phase D: second_verse {card_metrics}', flush=True)
    images = {name: raster(rows, palette) for name, rows in icons.items()}
    metrics = {'second_verse': card_metrics}
    for name in NEW_ICONS:
        metrics[name] = validate(images[name], 8)
        assert 10 <= metrics[name]['opaque_bbox_long_side'] <= 12, (name, metrics[name])
        # All canvas-edge coloured pixels must be protected by the black contour.
        a = np.array(images[name])
        edge = np.concatenate((a[0], a[-1], a[:, 0], a[:, -1]))
        assert all(p[3] == 0 or not any(p[:3]) for p in edge), name
        for y in range(1, 11):
            for x in range(1, 11):
                if a[y, x, 3] and any(a[y, x, :3]):
                    assert all(a[yy, xx, 3] for yy, xx in
                               ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))), (name, x, y)
        print(f'Phase D: {name} noise={metrics[name]["isolated_pixels"]} '
              f'fill={metrics[name]["cell_fill_ratio"]:.1%}', flush=True)
    print('Phase D: rebuild card atlas, preserving all existing cells', flush=True)
    metadata_path = CARDS.parent / 'cards-atlas.json'
    output = CARDS.parent / 'cards-atlas.png'
    old = json.loads(metadata_path.read_text())
    old_pixels = Image.open(output).convert('RGBA')
    if 'second_verse' in old['frames']:
        # Only this job's own frame may be refreshed on a subsequent native-art pass.
        f = old['frames']['second_verse']
        refreshed = old_pixels.copy()
        refreshed.paste(image, (f['x'], f['y']))
        refreshed.save(output)
    new = pack(CARDS, output, metadata_path, cell_w=32, cell_h=24, preserve_existing=True)
    atlas = Image.open(output).convert('RGBA')
    for name, f in new['frames'].items():
        box = (f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h'])
        assert atlas.crop(box).tobytes() == Image.open(CARDS / f'{name}.png').convert('RGBA').tobytes(), name
        if name in old['frames']:
            assert f == old['frames'][name], name
            if name != 'second_verse':
                assert atlas.crop(box).tobytes() == old_pixels.crop(box).tobytes(), name
    for name in ('parry_ledger', 'second_verse', 'encore'):
        images[name] = Image.open(CARDS / f'{name}.png').convert('RGBA')
    print('Phase D: compose and verify coherence sheet', flush=True)
    placements = coherence(images)
    report = {
        'metric': 'v2_metrics.measurements: identical-RGBA eight-connected colour components',
        'accepted_card_isolated_pixels_median': card_median,
        'accepted_overall_isolated_pixels_median': overall,
        'card_noise_budget': min(card_median, overall),
        'assets': metrics,
        'atlas_frames_verified': len(new['frames']),
        'sheet': 'docs/art/pd-art-coherence.png',
        'placements': placements,
        'editorial_review': {
            'score_order': ['SMS palette', '1x readability', 'pixel cleanliness',
                            'coherence', 'communication'],
            'scores': {
                'second_verse': [5, 4, 5, 4, 4],
                'seething': [5, 5, 5, 4, 5],
                'facets': [5, 4, 5, 4, 4],
                'frenzy': [5, 4, 4, 4, 4],
                'scour_rite': [5, 4, 5, 4, 4],
                'seed_bank': [5, 4, 4, 4, 4],
                'white_fever': [5, 5, 5, 4, 5],
                'crown_rage': [5, 5, 5, 4, 4],
                'reprise_big': [5, 5, 5, 5, 5],
            },
        },
    }
    (DOC / 'pd-art-metrics.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'PASS: {len(metrics)} assets; {len(new["frames"])} packed cells; '
          f'{len(placements)} native/4x sheet cells', flush=True)


if __name__ == '__main__':
    main()
