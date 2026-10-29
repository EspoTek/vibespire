"""Publish reviewed Breaker selections, validate sprites, and rebuild the card atlas."""
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image

from atlas import pack
from build_cards_breaker import contact

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def main():
 manifest_path = HERE/'prompts_cards_breaker.json'
 plan = json.loads(manifest_path.read_text())
 destination = ROOT/'public/assets/sprites/cards'
 destination.mkdir(parents=True, exist_ok=True)
 records = []
 for card in plan['cards']:
  selected = card['selected'] if 'selected' in card else {'sheet': card['sheet'], 'id': card['id']}
  card['selected'] = selected
  source = HERE/f"preview/cards/{selected['sheet']}/{selected['id']}.png"
  target = destination/f"{card['id']}.png"
  shutil.copyfile(source, target)
  with Image.open(target) as sprite:
   assert sprite.size == (32,24) and sprite.mode == 'RGBA', target
   pixels = np.array(sprite)
   visible = pixels[:,:,3] > 0
   assert visible.any() and set(np.unique(pixels[:,:,3])) <= {0,255}, target
   assert set(np.unique(pixels[visible,:3])) <= {0,85,170,255}, target
   assert not np.any(np.all(pixels[visible,:3] == (255,0,255), axis=1)), target
   colors = len(np.unique(pixels[visible,:3],axis=0))
   assert colors <= 16, target
   bbox = sprite.getbbox()
   assert bbox is not None
   records.append({'id': card['id'], 'size': [32,24], 'colors': colors, 'bbox': list(bbox), 'selected': selected})
  print(f"Publish {len(records)}/56: {card['id']}", flush=True)
 contact(plan['cards'], HERE/'preview/cards/breaker-contact.png')
 atlas_path = destination.parent/'cards-atlas.png'
 metadata = pack(destination, atlas_path, destination.parent/'cards-atlas.json', cell_w=32, cell_h=24)
 with Image.open(atlas_path) as atlas:
  for name, frame in metadata['frames'].items():
   with Image.open(destination/f'{name}.png') as sprite:
    x,y = frame['x'],frame['y']
    assert atlas.crop((x,y,x+32,y+24)).tobytes() == sprite.convert('RGBA').tobytes(), name
  atlas_size = list(atlas.size)
 (HERE/'preview/cards/breaker-validation.json').write_text(json.dumps({'cards': records, 'atlas_frames':len(metadata['frames']), 'atlas_size':atlas_size, 'all_atlas_frames_match':True},indent=2)+'\n')
 manifest_path.write_text(json.dumps(plan,indent=2)+'\n')
 print(f"Validated 56 Breaker cards; atlas contains {len(metadata['frames'])} frames, size {atlas_size}",flush=True)


if __name__ == '__main__':
 main()
