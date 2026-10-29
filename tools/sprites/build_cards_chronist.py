"""Slice planned Chronist sheets; publish selected card art and review contacts."""
import argparse
import json
from pathlib import Path
import shutil
from PIL import Image, ImageDraw
from grid import build
from preview import checker

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PLAN = HERE/'prompts_cards_chronist.json'


def slots(plan, sheet):
 return sorted([c for c in plan['cards']+plan['alternates']+plan['fill_up'] if c['sheet']==sheet],key=lambda c:c['cell'])


def contact(cards, output):
 cols = 7
 image = Image.new('RGB',(cols*184,((len(cards)+cols-1)//cols)*128),'#1e2030')
 draw = ImageDraw.Draw(image)
 for i,c in enumerate(cards):
  sprite = Image.open(ROOT/f"public/assets/sprites/cards/{c['id']}.png").convert('RGBA')
  bg = checker((128,96))
  bg.alpha_composite(sprite.resize((128,96),Image.Resampling.NEAREST))
  x,y = (i%cols)*184+8,(i//cols)*128+4
  image.paste(bg,(x,y))
  draw.text((x,y+100),c['id'],fill='white')
 image.save(output)


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('sheet',choices=['chronist_01','chronist_02','chronist_03','chronist_04','chronist_fillup','finalize'])
 parser.add_argument('--pitch',default='auto')
 args=parser.parse_args()
 plan=json.loads(PLAN.read_text())
 if args.sheet=='finalize':
  destination=ROOT/'public/assets/sprites/cards'
  destination.mkdir(parents=True,exist_ok=True)
  for c in plan['cards']:
   selected=c['selected'] if 'selected' in c else {'sheet':c['sheet'],'id':c['id']}
   source=HERE/f"preview/cards/{selected['sheet']}/{selected['id']}.png"
   shutil.copyfile(source,destination/f"{c['id']}.png")
  contact(plan['cards'],HERE/'preview/cards/chronist-contact.png')
  print('Published 56 Chronist cards and labelled 4x contact',flush=True)
 else:
  names=[c['id'] for c in slots(plan,args.sheet)]
  print(f'Sheet {args.sheet}: slicing {len(names)} cells',flush=True)
  build(HERE/f'raw/cards/{args.sheet}.png',HERE/f'preview/cards/{args.sheet}',4,4,names,pitch=args.pitch)
  print(f'Sheet {args.sheet}: complete; review preview/cards/{args.sheet}/contact.png',flush=True)

if __name__=='__main__':
 main()
