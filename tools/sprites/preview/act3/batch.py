"""Act 3-only ingestion, previews, review log and contact sheet."""
import argparse
import json
from pathlib import Path
import sys
import time

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[4]
PIPE = ROOT / 'tools/sprites'
sys.path.insert(0, str(PIPE))
from ingest import ingest
from postprocess import process
from preview import checker

IDS = 'void_mote shardling prism_seer echo_cantor lymph_warden pyrexia_node void_geometer mirror_knight phage_mother phage event_horizon tether_sovereign star_archivist leukarch antibody'.split()
OUT = Path(__file__).resolve().parent
ENTRIES = json.loads((ROOT / 'docs/sprites/enemy_prompts.json').read_text())

def prepare(enemy_id, source, attempt):
    name = enemy_id if attempt == 1 else f'{enemy_id}-attempt{attempt}'
    raw = PIPE / 'raw' / f'{name}.png'
    ingest(Path(source), raw)
    report = process(raw, ROOT / 'public/assets/sprites/enemies' / f'{enemy_id}.png', size=ENTRIES[enemy_id]['size'])
    (OUT / f'{enemy_id}.json').write_text(json.dumps(report, indent=2) + '\n')
    sprite = Image.open(report['output']).convert('RGBA')
    sprite.resize((sprite.width * 4, sprite.height * 4), Image.Resampling.NEAREST).save(OUT / f'{enemy_id}@4x.png')

def review(enemy_id, attempt, verdict, change):
    path = OUT / 'reviews.json'
    reviews = json.loads(path.read_text()) if path.exists() else {}
    report = json.loads((OUT / f'{enemy_id}.json').read_text())
    reviews[enemy_id] = dict(attempts=attempt, pitch=report['pitch'], colors=report['colors'], verdict=verdict, prompt_change=change)
    path.write_text(json.dumps(reviews, indent=2) + '\n')
    lines = ['# Act 3 Crown sprite review', '', 'Built-in image generation. First attempts use docs/sprites/enemy_prompts.json verbatim. Native generator outputs preserved in raw/native; pipeline inputs normalized to 1024 square with NEAREST. Each processed preview inspected at exact 4x. No atlas rebuilt.', '', '| id | attempts | pitch | colours | verdict | prompt changes |', '| --- | ---: | ---: | ---: | --- | --- |']
    for key in IDS:
        if key in reviews:
            r = reviews[key]
            lines.append(f"| {key} | {r['attempts']} | {r['pitch']} | {r['colors']} | {r['verdict']} | {r['prompt_change']} |")
    (OUT / 'log.md').write_text('\n'.join(lines) + '\n')
    print(f"{IDS.index(enemy_id)+1}/{len(IDS)} {enemy_id}: {verdict}; elapsed {time.time()-args.started:.1f}s", flush=True)

def contact():
    sheet = Image.new('RGB', (800, 48 + 420 * len(IDS)), '#1e2030')
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 12), 'ACT 3 CROWN | RAW 1024 -> 256 | PROCESSED exact 4x', fill='white')
    for i, enemy_id in enumerate(IDS):
        y = 48 + i * 420
        raw = Image.open(PIPE / 'raw' / f'{enemy_id}.png').convert('RGBA').resize((256,256), Image.Resampling.NEAREST)
        sprite = Image.open(OUT / f'{enemy_id}@4x.png').convert('RGBA')
        sheet.paste(raw.convert('RGB'), (16,y))
        bg = checker(sprite.size)
        bg.alpha_composite(sprite)
        sheet.paste(bg.convert('RGB'), (304,y))
        draw.text((16,y+390), f"{enemy_id} | {ENTRIES[enemy_id]['size']}x{ENTRIES[enemy_id]['size']}", fill='white')
    sheet.save(OUT / 'contact.png')
    print(f'wrote {OUT / "contact.png"}', flush=True)

parser = argparse.ArgumentParser()
parser.add_argument('command', choices=['prepare','review','contact'])
parser.add_argument('--id', choices=IDS)
parser.add_argument('--source')
parser.add_argument('--attempt', type=int, default=1)
parser.add_argument('--verdict')
parser.add_argument('--change', default='None')
parser.add_argument('--started', type=float, default=time.time())
args = parser.parse_args()
if args.command == 'prepare':
    prepare(args.id, args.source, args.attempt)
elif args.command == 'review':
    review(args.id, args.attempt, args.verdict, args.change)
else:
    contact()
