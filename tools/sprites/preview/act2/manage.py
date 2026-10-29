"""Act 2-only ingestion, review records and mixed-size contact sheet."""
import json
import shutil
import filecmp
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from ingest import ingest
from postprocess import process
from preview import checker

OUT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
IDS: tuple[str, ...] = tuple('furnace_drone rivet_gnasher cog_acolyte riveter slag_golem loom_oracle the_auditor anvil_warden hammer_warden boiler_tyrant grand_assembler assembly_frame welded_horror furnace_heart trihammer trihammer_arm'.split())
ENTRIES = json.loads((REPO / 'docs/sprites/enemy_prompts.json').read_text())
STATE = OUT / 'records.json'

def records():
    return json.loads(STATE.read_text()) if STATE.exists() else {'started': time.time(), 'sprites': {}}

def save(data):
    STATE.write_text(json.dumps(data, indent=2) + '\n')
    lines = ['# Act 2 Foundry review', '', 'Built-in imagegen; first-attempt prompts copied verbatim from docs/sprites/enemy_prompts.json. Native sources preserved under raw/native; nonsquare native outputs padded with magenta before NEAREST normalization to 1024 square. Canonical raw/<id>.png holds the selected attempt. Atlas untouched.', '', '| id | attempts | pitch | colours | verdict |', '| --- | ---: | ---: | ---: | --- |']
    for ident in IDS:
        if ident in data['sprites']:
            r = data['sprites'][ident]
            lines.append(f"| {ident} | {len(r['attempts'])} | {r['report']['pitch']:.2f} | {r['report']['colors']} | {r['verdict']} |")
    lines += ['', '## Generation records', 'See records.json for exact prompts, source paths and retry changes.', '']
    (OUT / 'log.md').write_text('\n'.join(lines))

mode = sys.argv[1]
data = records()
if mode == 'process':
    ident, source = sys.argv[2:4]
    assert ident in IDS
    entry = ENTRIES[ident]
    previous = data['sprites'][ident]['attempts'] if ident in data['sprites'] else []
    attempt = len(previous) + 1
    raw = ROOT / 'raw' / (f'{ident}.png' if attempt == 1 else f'{ident}-attempt{attempt}.png')
    with Image.open(source) as opened:
        square = opened.width == opened.height
    if raw.exists():
        if not filecmp.cmp(source, raw.parent / 'native' / raw.name, shallow=False):
            raise FileExistsError(raw)
    elif square:
        ingest(Path(source), raw)
    else:
        native = raw.parent / 'native' / raw.name
        if raw.exists() or native.exists():
            raise FileExistsError(raw)
        native.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, native)
        with Image.open(source) as opened:
            side = max(opened.size)
            padded = Image.new('RGBA', (side, side), '#FF00FF')
            padded.paste(opened.convert('RGBA'), ((side-opened.width)//2, (side-opened.height)//2))
            padded.resize((1024, 1024), Image.Resampling.NEAREST).save(raw)
        print(f'Preserved nonsquare native; magenta-padded input: {raw}', flush=True)
    target = REPO / 'public/assets/sprites/enemies' / f'{ident}.png'
    pitch = sys.argv[5] if len(sys.argv) > 5 else 'auto'
    report = process(raw, target, size=entry['size'], key=(255, 0, 255), pitch=pitch, colors=16, tolerance=80, halo_tolerance=160, outline=1)
    (OUT / f'{ident}.json').write_text(json.dumps(report, indent=2) + '\n')
    with Image.open(target) as image:
        image.resize((entry['size'] * 4,) * 2, Image.Resampling.NEAREST).save(OUT / f'{ident}@4x.png')
    change = sys.argv[4] if len(sys.argv) > 4 else ''
    previous.append({'source': source, 'raw': str(raw), 'prompt': entry['prompt'] + change, 'change': change})
    data['sprites'][ident] = {'attempts': previous, 'report': report, 'verdict': 'Awaiting visual review', 'selected_raw': str(raw)}
    save(data)
elif mode == 'review':
    ident, verdict = sys.argv[2:4]
    data['sprites'][ident]['verdict'] = verdict
    save(data)
    print(f"{IDS.index(ident)+1}/{len(IDS)} {ident}: {verdict}; elapsed {time.time()-data['started']:.0f}s", flush=True)
elif mode == 'finalize':
    for ident in IDS:
        r = data['sprites'][ident]
        selected = Path(r['selected_raw'])
        canonical = ROOT / 'raw' / f'{ident}.png'
        if selected != canonical:
            first = ROOT / 'raw' / f'{ident}-attempt1.png'
            if first.exists():
                raise FileExistsError(first)
            shutil.copy2(canonical, first)
            shutil.copy2(canonical.parent / 'native' / canonical.name, first.parent / 'native' / first.name)
            r['attempts'][0]['raw'] = str(first)
            shutil.copy2(selected, canonical)
            shutil.copy2(selected.parent / 'native' / selected.name, canonical.parent / 'native' / canonical.name)
            r['selected_raw'] = str(canonical)
            r['report']['input'] = str(canonical)
            (OUT / f'{ident}.json').write_text(json.dumps(r['report'], indent=2) + '\n')
        r['selected_attempt'] = len(r['attempts'])
        with Image.open(canonical) as raw:
            assert raw.size == (1024, 1024)
        with Image.open(REPO / 'public/assets/sprites/enemies' / f'{ident}.png') as sprite:
            assert sprite.mode == 'RGBA' and sprite.size == (ENTRIES[ident]['size'],) * 2
            pixels = np.asarray(sprite).reshape(-1, 4)
            assert {p[3] for p in pixels} == {0, 255}
            colours = {tuple(p[:3]) for p in pixels if p[3]}
            assert len(colours) == r['report']['colors'] <= 16
            assert all(c in (0, 85, 170, 255) for rgb in colours for c in rgb)
            assert (0, 0, 0) in colours
            assert (255, 0, 255) not in colours
            assert all(np.all(p == 0) for p in pixels if not p[3])
        print(f'validated {ident}: {len(colours)} SMS colours', flush=True)
    save(data)
elif mode == 'contact':
    sheet = Image.new('RGB', (832, 64 + 432 * len(IDS)), '#1e2030')
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 14), 'ACT 2 FOUNDRY | RAW (scaled to 384) vs PROCESSED (exact 4x)', fill='white')
    for index, ident in enumerate(IDS):
        r = data['sprites'][ident]
        y = 64 + 432 * index
        with Image.open(r['selected_raw']) as image:
            sheet.paste(image.convert('RGB').resize((384, 384), Image.Resampling.NEAREST), (16, y))
        with Image.open(OUT / f'{ident}@4x.png') as image:
            tile = checker((384, 384))
            tile.alpha_composite(image.convert('RGBA'), ((384-image.width)//2, 384-image.height))
            sheet.paste(tile.convert('RGB'), (432, y))
        verdict = 'WEAK' if 'Weak:' in r['verdict'] else 'ACCEPT'
        draw.text((16, y+392), f"{ident} | {ENTRIES[ident]['size']}px | {len(r['attempts'])} attempts | {r['report']['colors']} colours | {verdict}", fill='white')
        print(f'contact {index+1}/{len(IDS)} {ident}', flush=True)
    sheet.save(OUT / 'contact.png')
else:
    raise ValueError(mode)
