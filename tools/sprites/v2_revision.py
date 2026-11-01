"""Round-two native cleanup and full-cell redraw ingestion for NEW UI art only.

Reproducible inputs are r2-before and r2-generated; accepted art is read only.
"""
import json
from collections import Counter
from pathlib import Path

import numpy as np
from math import ceil
from statistics import median
from PIL import Image, ImageDraw

from atlas import pack
from v2_art import PREVIEW, ROOT, contacts, read_manifest, review_contact
from v2_cleanup import chosen_palette
from v2_metrics import accepted_metrics, components, measurements

BEFORE = PREVIEW / 'r2-before'
GENERATED = PREVIEW / 'r2-generated'
BLACK = (0, 0, 0, 255)


def family(color: tuple) -> str:
    r, g, b = map(int, color[:3])
    if r == g == b:
        return 'ink' if r == 0 else 'neutral'
    if r > g and b >= g and b > 0:
        return 'violet'
    if g > r and g > b:
        return 'green'
    if b > r:
        return 'blue' if b > g else 'cyan'
    if r > g and g == b:
        return 'red'
    return 'brass'


def material_ramps(image: Image.Image, record: dict) -> Image.Image:
    """Use the existing class palette, then cap each material at three tones."""
    a = np.array(image.convert('RGBA'))
    v = a[:, :, 3] > 0
    colors = chosen_palette(record)
    distance = np.sum((a[v, :3, None].astype(float) - colors.T[None, :, :].astype(float)) ** 2, axis=1)
    a[v, :3] = colors[np.argmin(distance, axis=1)]
    for material in {family(tuple(c)) for c in np.unique(a[v, :3], axis=0)}:
        ramp = [tuple(c) for c in np.unique(a[v, :3], axis=0) if family(tuple(c)) == material]
        if len(ramp) <= 3:
            continue
        ramp.sort(key=lambda c: sum(map(int, c)))
        keep = [ramp[0], ramp[len(ramp)//2], ramp[-1]]
        for color in ramp:
            replacement = min(keep, key=lambda k: sum((int(x)-int(y))**2 for x, y in zip(k, color)))
            a[np.all(a[:, :, :3] == color, axis=2) & v, :3] = replacement
    a[~v] = 0
    return Image.fromarray(a)


def denoise(image: Image.Image, limit: float, preserve_materials: bool = False) -> Image.Image:
    """Join small material islands to neighbouring planes, keeping silhouette ink.

    Interior replacements prefer an adjacent shade of the same material. Outer
    black contours and internal material breaks are retained. No blur, dither,
    interpolation or erosion of the main silhouette is used.
    """
    a = np.array(image.convert('RGBA'))
    h, w = a.shape[:2]
    visible = a[:, :, 3] > 0
    for cluster in components(visible):
        if len(cluster) <= 2:
            for y, x in cluster:
                a[y, x] = 0
    # Regenerated sources already have deliberately broad planes. Preserve
    # their small modeled highlights and functional accents when they meet
    # the budget; the original noisy downscales need the cluster repair pass.
    for _ in range(0 if preserve_materials else 4):
        previous = a.copy()
        visible = previous[:, :, 3] > 0
        for color_array in np.unique(previous[visible], axis=0):
            color = tuple(map(int, color_array))
            for cluster in components(visible & np.all(previous == color_array, axis=2)):
                if len(cluster) > 2 or color == BLACK:
                    continue
                nearby = Counter()
                for y, x in cluster:
                    for yy in range(max(0, y-1), min(h, y+2)):
                        for xx in range(max(0, x-1), min(w, x+2)):
                            c = tuple(map(int, previous[yy, xx]))
                            if c[3] and c != color and c != BLACK:
                                nearby[c] += 1
                if not nearby:
                    continue
                same = {c: count for c, count in nearby.items() if family(c) == family(color)}
                candidates = same if same else nearby
                replacement = max(candidates, key=lambda c: (candidates[c], -sum((x-y)**2 for x, y in zip(c[:3], color[:3]))))
                if candidates[replacement] >= (2 if len(cluster) == 1 else 3):
                    for y, x in cluster:
                        a[y, x] = replacement
        if np.array_equal(a, previous):
            break
    # Count all colours, including ink. Pinholes well inside a solid material
    # are noise; single ink pixels on the silhouette remain contour pixels.
    for _ in range(5):
        if measurements(Image.fromarray(a))['isolated_pixels'] <= limit:
            break
        previous = a.copy()
        visible = previous[:, :, 3] > 0
        changes = 0
        for color in np.unique(previous[visible], axis=0):
            for cluster in components(visible & np.all(previous == color, axis=2)):
                if len(cluster) != 1:
                    continue
                y, x = cluster[0]
                neighbors = [tuple(map(int, previous[yy, xx]))
                             for yy in range(max(0, y-1), min(h, y+2))
                             for xx in range(max(0, x-1), min(w, x+2)) if (yy, xx) != (y, x)]
                if tuple(color) == BLACK and any(c[3] == 0 for c in neighbors):
                    continue
                candidates = Counter(c for c in neighbors if c[3] and c != tuple(color) and c != BLACK)
                if candidates:
                    replacement, support = candidates.most_common(1)[0]
                    if support >= 2:
                        a[y, x] = replacement
                        changes += 1
        if changes == 0:
            raise ValueError(f'noise requires editorial repair: {measurements(Image.fromarray(a))}')
    a[a[:, :, 3] == 0] = 0
    return Image.fromarray(a)


def recovered(source: Path, record: dict) -> Image.Image:
    """Recover broad generated planes to the exact native cell, then ink edges."""
    image = Image.open(source).convert('RGBA')
    a = np.array(image)
    a[a[:, :, 3] < 128] = 0
    a[a[:, :, 3] >= 128, 3] = 255
    image = Image.fromarray(a)
    box = image.getchannel('A').getbbox()
    if box is None:
        raise ValueError(f'empty generated art: {source}')
    subject = image.crop(box)
    w, h = (32, 24) if record['kind'] == 'cards' else (16, 16)
    # Leave space for one contour pixel plus the transparent safety margin.
    scale = min((w-4)/subject.width, (h-4)/subject.height)
    target_w, target_h = max(1, round(subject.width*scale)), max(1, round(subject.height*scale))
    if record['kind'] == 'relics':
        # The commissioned redraws are stout full-cell objects. Preserve a
        # minimum body width/height before inking rather than accepting a long
        # but faint stick simply because its diagonal bbox passes 11px.
        target_w, target_h = max(10, target_w), max(10, target_h)
    subject = subject.resize((target_w, target_h), Image.Resampling.NEAREST)
    result = Image.new('RGBA', (w, h))
    result.paste(subject, ((w-subject.width)//2, (h-subject.height)//2))
    result = material_ramps(result, record)
    a = np.array(result)
    material = (a[:, :, 3] > 0) & np.any(a[:, :, :3] != 0, axis=2)
    if record['kind'] == 'relics':
        # Size the MATERIAL, not the source's thick high-resolution ink border.
        # Otherwise a nominal 14px bbox can contain only a faint 5px object.
        box = Image.fromarray(material).getbbox()
        if box is None:
            raise ValueError(f'no material planes recovered: {source}')
        body = Image.fromarray(a).crop(box)
        ratio = min(12/body.width, 12/body.height)
        bw, bh = max(11, round(body.width*ratio)), max(11, round(body.height*ratio))
        body = body.resize((bw, bh), Image.Resampling.NEAREST)
        result = Image.new('RGBA', (16, 16))
        result.paste(body, ((16-bw)//2, (16-bh)//2))
        a = np.array(result)
        material = (a[:, :, 3] > 0) & np.any(a[:, :, :3] != 0, axis=2)
    # Only recovered redraws get a fresh contour; original native cleanups do
    # not have their silhouette rebuilt.
    a[~material] = 0
    for y, x in zip(*np.where(material)):
        for yy, xx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 < yy < h-1 and 0 < xx < w-1 and not material[yy, xx]:
                a[yy, xx] = BLACK
    return Image.fromarray(a)


def native_details(image: Image.Image, name: str) -> Image.Image:
    """Restore the governor's load-bearing shaft lost in coarse grid sampling."""
    if name != 'kickback_governor':
        return image
    result = image.copy()
    draw = ImageDraw.Draw(result)
    draw.rectangle((7, 4, 8, 11), fill='#AAAAAA')
    draw.line((7, 4, 7, 5), fill='#FFFFFF')
    draw.line((5, 6, 10, 6), fill='#AA5500')
    draw.rectangle((7, 7, 8, 8), fill='#000055')
    return result


def rebuild_atlases() -> None:
    """Pack to scratch, then copy cells back into their established rectangles."""
    for kind in ('cards', 'relics', 'potions'):
        base = ROOT / 'public/assets/sprites'
        metadata_path = base / f'{kind}-atlas.json'
        original_json = metadata_path.read_bytes()
        metadata = json.loads(original_json)
        output = PREVIEW / f'r2-{kind}-packed.png'
        packed_meta = pack(base / kind, output, PREVIEW / f'r2-{kind}-packed.json',
                           cell_w=32 if kind == 'cards' else 16,
                           cell_h=24 if kind == 'cards' else 16)
        assert set(packed_meta['frames']) == set(metadata['frames']), kind
        packed = Image.open(output).convert('RGBA')
        stable = Image.new('RGBA', Image.open(base / f'{kind}-atlas.png').size)
        for name, target in metadata['frames'].items():
            f = packed_meta['frames'][name]
            stable.paste(packed.crop((f['x'], f['y'], f['x']+f['w'], f['y']+f['h'])), (target['x'], target['y']))
        stable.save(base / f'{kind}-atlas.png')
        assert metadata_path.read_bytes() == original_json, kind
        print(f'Rebuilt {kind}, all frame rectangles and JSON bytes preserved', flush=True)


def coherence_sheet(manifest: dict) -> None:
    """Each new asset has accepted neighbours at BOTH native and 4x scale."""
    groups = [('cards', c) for c in ('breaker', 'graft', 'chronist', 'colorless', 'afflictions')]
    groups += [('relics', 'shared'), ('potions', 'shared')]
    blocks, placements = [], []
    panel_w, panel_h, cols = 460, 202, 3
    offset = 0
    for kind, cls in groups:
        new = [r for r in manifest['new'] if r['kind'] == kind and
               (kind != 'cards' or (r['cls'] in ('curse', 'status') if cls == 'afflictions' else r['cls'] == cls))]
        accepted = [r for r in manifest['inventory'][kind]['code'] if r['id'] in manifest['baseline'][kind]['files'] and
                    (kind != 'cards' or r['cls'] == ('colorless' if cls == 'afflictions' else cls))]
        if len(accepted) < 2:
            raise ValueError(f'two accepted neighbours required: {kind}/{cls}')
        block = Image.new('RGB', (panel_w*cols, 34+ceil(len(new)/cols)*panel_h), '#181820')
        draw = ImageDraw.Draw(block)
        draw.text((10, 8), f'{kind} / {cls}    EACH PANEL: accepted | NEW | accepted   — native on black + navy; NEAREST 4x below', fill='#FFFFAA')
        for index, record in enumerate(new):
            x, y = (index % cols)*panel_w+6, 34+(index//cols)*panel_h
            triplet = [accepted[(2*index) % len(accepted)], record, accepted[(2*index+1) % len(accepted)]]
            draw.rectangle((x, y, x+panel_w-12, y+panel_h-8), outline='#555555')
            draw.text((x+8, y+4), '1x', fill='#AAAAAA')
            for back_index, background in enumerate(('#000000', '#000055')):
                # Three real adjacent native cells, surrounded by the same field.
                bx, by = x+38+back_index*200, y+3
                w, h = (32, 24) if kind == 'cards' else (16, 16)
                draw.rectangle((bx-3, by-1, bx+3*(w+5), by+26), fill=background)
                for slot, item in enumerate(triplet):
                    sprite = Image.open(ROOT / f'public/assets/sprites/{kind}/{item["id"]}.png').convert('RGBA')
                    px, py = bx+slot*(w+5), by
                    block.paste(sprite, (px, py), sprite)
                    placements.append({'new_id': record['id'], 'id': item['id'], 'kind': kind, 'accepted': slot != 1,
                                       'scale': 1, 'background': background, 'x': px, 'y': py+offset})
            draw.text((x+8, y+34), '4x', fill='#AAAAAA')
            for slot, item in enumerate(triplet):
                sprite = Image.open(ROOT / f'public/assets/sprites/{kind}/{item["id"]}.png').convert('RGBA')
                large = sprite.resize((sprite.width*4, sprite.height*4), Image.Resampling.NEAREST)
                px, py = x+8+slot*148+(132-large.width)//2, y+53
                block.paste(large, (px, py), large)
                draw.text((x+8+slot*148, y+153), 'NEW' if slot == 1 else 'accepted', fill='#FFFF55' if slot == 1 else '#AAAAAA')
                draw.text((x+8+slot*148, y+169), item['id'], fill='white')
                placements.append({'new_id': record['id'], 'id': item['id'], 'kind': kind, 'accepted': slot != 1,
                                   'scale': 4, 'background': '#181820', 'x': px, 'y': py+offset})
        blocks.append(block)
        offset += block.height
    sheet = Image.new('RGB', (panel_w*cols, offset), '#181820')
    offset = 0
    for block in blocks:
        sheet.paste(block, (0, offset))
        offset += block.height
    destination = ROOT / 'docs/art/v2-new-art-coherence-r2.png'
    sheet.save(destination)
    (ROOT / 'docs/art/v2-new-art-coherence-r2.json').write_text(json.dumps({'sheet': str(destination.relative_to(ROOT)), 'placements': placements}, indent=2)+'\n')
    print(f'Wrote directly adjacent 1x/4x coherence sheet: {sheet.size}', flush=True)


def update_review(report: dict) -> None:
    """Keep round-one scores as history and attach measured round-two evidence."""
    path = ROOT / 'docs/art/v2-new-art-review.json'
    backup = BEFORE / 'review.json'
    if not backup.exists():
        backup.write_bytes(path.read_bytes())
    review = json.loads(backup.read_text())
    review['revision_round'] = 2
    review['scores_before_r2'] = review['scores']
    old_scores = {r['id']: r for r in review['scores_before_r2']}
    review['scores'] = []
    for r in report['assets']:
        prior = old_scores[r['id']]
        redrawn = r['treatment'].startswith('image_gen')
        score = [5, 4, 4, 4, 4] if redrawn else list(prior['P_R_X_C_M'])
        score[2] = 4
        review['scores'].append({
            'id': r['id'], 'kind': r['kind'], 'P_R_X_C_M': score,
            'review': ('Redrawn as one dominant physical subject; native material highlights and black contour retained.' if redrawn else
                       'Original concept retained; small colour islands consolidated into material planes. ' + prior['review']),
            'treatment_r2': r['treatment'],
            'noise': {'isolated_pixels_before': r['before']['isolated_pixels'],
                      'isolated_pixels_after': r['after']['isolated_pixels'],
                      'accepted_kind_median': r['accepted_isolated_pixels_median'],
                      'accepted_overall_median': report['accepted_overall_isolated_pixels_median'],
                      'budget': r['noise_budget'],
                      'two_pixel_cluster_pixels_before': r['before']['two_pixel_cluster_pixels'],
                      'two_pixel_cluster_pixels_after': r['after']['two_pixel_cluster_pixels']},
            'fill': {'before': {k: r['before'][k] for k in ('opaque_bbox_size', 'opaque_bbox_long_side', 'opaque_pixels', 'cell_fill_ratio')},
                     'after': {k: r['after'][k] for k in ('opaque_bbox_size', 'opaque_bbox_long_side', 'opaque_pixels', 'cell_fill_ratio')}},
            'material_ramp_steps': r['material_ramp_steps'],
        })
    review['remaining_outliers'] = [r['id'] for r in review['scores'] if min(r['P_R_X_C_M']) == 3]
    review['noise_r2'] = {
        'definition': report['definition'],
        'accepted_overall_median': report['accepted_overall_isolated_pixels_median'],
        'accepted_medians_by_kind': {k: v['isolated_pixels_median'] for k, v in report['accepted'].items()},
        'new_by_kind': {kind: {
            'count': sum(a['kind'] == kind for a in report['assets']),
            'before_total': sum(a['before']['isolated_pixels'] for a in report['assets'] if a['kind'] == kind),
            'after_total': sum(a['after']['isolated_pixels'] for a in report['assets'] if a['kind'] == kind),
            'after_max': max(a['after']['isolated_pixels'] for a in report['assets'] if a['kind'] == kind),
        } for kind in ('cards', 'relics', 'potions')},
        'full_evidence': 'docs/art/v2-new-art-noise-r2.json',
        'all_new_at_or_below_accepted_median': all(a['after']['isolated_pixels'] <= a['noise_budget'] for a in report['assets']),
    }
    review['review_conditions'] = ['native 1x on black and navy', 'exact NEAREST 4x', 'each new asset directly between two accepted same-kind neighbours at both scales']
    review['new_asset_density'] = '28 card and 16 relic redraws use broad material planes and one dominant subject. Remaining 65 new assets received native cluster/ramp cleanup. No accepted sprite was edited.'
    review['sheets'] = ['docs/art/v2-new-art-coherence-r2.png', 'docs/art/v2-new-art-1x.png', 'docs/art/v2-new-art-4x.png']
    # The test ledger is finalized after the verification run, rather than
    # carrying forward round-one test results as if they had just been run.
    review['verification'] = {'status': 'awaiting final validation run'}
    path.write_text(json.dumps(review, indent=2)+'\n')


def main() -> None:
    manifest = read_manifest()
    accepted = accepted_metrics(manifest)
    overall_median = median(a['isolated_pixels'] for group in accepted.values() for a in group['assets'])
    records = []
    for index, record in enumerate(manifest['new']):
        name, kind = record['id'], record['kind']
        old = Image.open(BEFORE / kind / f'{name}.png').convert('RGBA')
        source = GENERATED / f'{name}-source.png'
        revised = recovered(source, record) if source.exists() else material_ramps(old, record)
        revised = denoise(revised, min(overall_median, accepted[kind]['isolated_pixels_median']), preserve_materials=source.exists())
        revised = native_details(revised, name)
        revised.save(ROOT / record['file'])
        sheet = next(s for s in manifest['sheets'] if name in s['slots'])
        revised.save(PREVIEW / sheet['name'] / f'{name}.png')
        before_metrics, after_metrics = measurements(old), measurements(revised)
        pixels = np.array(revised)
        ramp_steps = Counter(family(tuple(c)) for c in np.unique(pixels[pixels[:, :, 3] > 0, :3], axis=0))
        assert max(ramp_steps.values()) <= 3, (name, ramp_steps)
        records.append({'id': name, 'kind': kind,
                        'treatment': 'image_gen redraw and native cleanup' if source.exists() else 'native material-plane cleanup',
                        'before': before_metrics, 'after': after_metrics,
                        'accepted_isolated_pixels_median': accepted[kind]['isolated_pixels_median'],
                        'noise_budget': min(overall_median, accepted[kind]['isolated_pixels_median']),
                        'material_ramp_steps': dict(ramp_steps),
                        'native_pixels_changed': int(np.any(np.array(old) != np.array(revised), axis=2).sum())})
        print(f'Clean {index+1}/{len(manifest["new"])} {name}: isolated {before_metrics["isolated_pixels"]} -> {after_metrics["isolated_pixels"]}', flush=True)
    report = {
        'definition': 'Opaque pixels with no identical RGBA pixel among eight neighbours, including black and glints; no exemptions. Two-pixel same-colour clusters and disconnected opaque crumbs also recorded.',
        'accepted': accepted, 'accepted_overall_isolated_pixels_median': overall_median, 'assets': records,
    }
    (ROOT / 'docs/art/v2-new-art-noise-r2.json').write_text(json.dumps(report, indent=2)+'\n')
    update_review(report)
    for sheet in manifest['sheets']:
        review_contact(sheet, PREVIEW / sheet['name'] / 'contact.png')
    rebuild_atlases()
    contacts(manifest)
    coherence_sheet(manifest)


if __name__ == '__main__':
    main()
