"""Slice icon sheets, select reviewed alternates, pack and verify icon atlases."""
import argparse
import json
from math import ceil
from pathlib import Path
import re
import shutil

import numpy as np
from PIL import Image, ImageDraw

from atlas import pack
from grid import build
from preview import checker

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT.parents[1] / 'public/assets/sprites'


def contact(kind: str, ids: list[str]) -> None:
    sheet = Image.new('RGB', (8 * 160, ceil(len(ids) / 8) * 104), '#202030')
    draw = ImageDraw.Draw(sheet)
    for i, name in enumerate(ids):
        with Image.open(ASSETS / kind / f'{name}.png') as opened:
            icon = opened.convert('RGBA')
        a = np.array(icon)
        visible = a[:, :, 3] > 0
        assert icon.size == (16, 16) and visible.any(), name
        assert set(np.unique(a[:, :, 3])) == {0, 255}, name
        assert np.all(a[visible, :3] % 85 == 0), name
        assert len(np.unique(a[visible, :3], axis=0)) <= 8, name
        assert np.any(np.all(a[visible, :3] == 0, axis=1)), name
        bg = checker((64, 64))
        bg.alpha_composite(icon.resize((64, 64), Image.Resampling.NEAREST))
        x, y = (i % 8) * 160 + 8, (i // 8) * 104 + 4
        sheet.paste(bg.convert('RGB'), (x, y))
        # Two lines keep the complete id legible, including the potion prefix.
        label = name if len(name) <= 23 else name.replace('pot_', 'pot_\n', 1)
        draw.text((x, y + 68), label, fill='white')
    target = ROOT / 'preview' / kind / 'contact.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target)
    print(f'Validated {len(ids)} {kind}; contact: {target}', flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sheet', nargs='?')
    parser.add_argument('--finalize', action='store_true')
    parser.add_argument('--pitch', default='auto', help='per-cell auto detection or inspected explicit source pitch')
    args = parser.parse_args()
    prompts = json.loads((ROOT / 'prompts_icons.json').read_text())
    # Retry prompts are optional when no sheet required a second generation.
    retry = ROOT / 'prompts_icons_retry.json'
    if retry.exists():
        prompts.update(json.loads(retry.read_text()))
    if args.sheet:
        names = [item['id'] for item in prompts[args.sheet]]
        build(ROOT / 'raw/icons' / f'{args.sheet}.png',
              ROOT / 'preview/icons' / args.sheet, 4, 4, names, pitch=args.pitch, cell_out=(16, 16))
    if args.finalize:
        selections = json.loads((ROOT / 'icon_selections.json').read_text())
        for kind in ('relics', 'potions'):
            ids = [item['id'] for key, items in prompts.items() if key.startswith(kind)
                   for item in items if not item['id'].startswith('alt_')]
            assert len(ids) == (72 if kind == 'relics' else 16)
            gdd = (ROOT.parents[1] / 'docs/GDD.md').read_text()
            section = gdd.split('## 5. Relics (72)')[1].split('## 6. Events')[0] if kind == 'relics' else gdd.split('### 7.1 Potions (16)')[1].split('### 7.2')[0]
            assert set(ids) == set(re.findall(r'^\| `([^`]+)`', section, re.M))
            directory = ASSETS / kind
            directory.mkdir(parents=True, exist_ok=True)
            for name in ids:
                source_name = selections['alternates'].get(name, name)
                source_sheet = next(key for key, items in prompts.items()
                                    if any(item['id'] == source_name for item in items))
                shutil.copy2(ROOT / 'preview/icons' / source_sheet / f'{source_name}.png', directory / f'{name}.png')
            assert {p.stem for p in directory.glob('*.png')} == set(ids)
            contact(kind, ids)
            metadata = pack(directory, ASSETS / f'{kind}-atlas.png', ASSETS / f'{kind}-atlas.json', 16)
            with Image.open(ASSETS / f'{kind}-atlas.png') as atlas:
                for name in ids:
                    frame = metadata['frames'][name]
                    with Image.open(directory / f'{name}.png') as sprite:
                        assert atlas.crop((frame['x'], frame['y'], frame['x'] + 16, frame['y'] + 16)).tobytes() == sprite.tobytes()


if __name__ == '__main__':
    main()
