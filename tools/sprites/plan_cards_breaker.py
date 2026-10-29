"""Parse Breaker card blocks and allocate the complete generation run."""
import json
import re
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SUBJECTS = '''hew|broad steel cleaver carving red crescent slash
bulwark|blue tower shield with bronze central boss
shoulder_check|spiked purple pauldron crashing through red sparks
brace|crossed steel forearm braces beneath bronze shield
piston_jab|extended blue piston fist with red impact
chain_driver|steel chain flail swinging bronze spiked weight
overhand_drive|vertical greatsword plunging through purple impact burst
breach_hammer|bronze sledgehammer smashing split blue armour plate
thresher_arc|double crescent poleaxe sweeping wide purple arc
fault_line|steel pickaxe splitting red fissure through armour
rivet_flurry|three bronze rivet darts with blue streaks
counterweight|suspended steel wrecking weight on bronze chain
plate_ram|wedge shaped blue battering ram with bronze spikes
return_stroke|hooked steel sabre reversing red crescent stroke
gauntlet_tap|compact bronze knuckle gauntlet striking blue spark
catch_blade|blue clamp gauntlet gripping incoming steel sword
cool_the_steel|steel shield resting inside blue cooling tongs
find_the_seam|bronze awl probing seam between purple plates
read_the_line|bronze calipers measuring blue sword edge
pivot_sweep|round blue buckler spinning with bronze sweep
rivet_wall|three joined blue armour panels with bronze rivets
planted_feet|heavy blue sabatons anchored by bronze ground spikes
loaded_spring|compressed bronze spring behind square blue shield
sabre_rattle|bronze war horn beside sheathed blue sabre
hammerfall|massive rectangular steel hammer descending red impact
piston_volley|three blue piston punches with bronze knuckles
answering_steel|forked parrying sword deflecting bronze incoming blade
rampart_crash|blue fortress shield falling into bronze shockwave
coiled_strike|curled steel chain whip ending red spearhead
seam_ripper|serrated blue dagger tearing purple armour seam
quake_hammer|round bronze maul splitting blue stone shockwave
prism_edge|faceted cyan broadsword with purple crystal guard
feint_step|blue armoured boot behind purple decoy footprint
bind_the_blade|bronze locking chain wrapped around blue sword
anneal|blue shield held above bronze forge coals
quench|blue sword immersed in bronze cooling trough
ride_the_surge|bronze hand crank releasing blue lightning wheel
hairline_mark|bronze engraving chisel scoring cracked blue shield
read_the_blow|blue inspection lens framing bronze incoming arrow
furnace_heart|glowing red furnace heart within blue armoured emblem
crossed_blades|crossed luminous blue sabres within bronze halo
parry_ledger|glowing blue book emblem with bronze parrying dagger
anvil_heart|radiant purple anvil heart with bronze spark aura
fault_reader|glowing red crack emblem across blue crystal eye
jackhammer|heavy blue pneumatic drill pounding bronze impact rings
steal_the_swing|steel hooked sword trapping red curved blade
iron_avalanche|tumbling blue spiked armour slabs with bronze impacts
endless_maul|steel double headed maul trailing purple echoes
forge_oath|bronze oath seal pressed by blue smithing tongs
en_garde|blue fencing buckler poised beside bronze rapier
vent_pressure|bronze pressure valve releasing broad blue steam jets
iron_rhythm|blue war drum with crossed bronze drumsticks
shed_plating|blue armour shell opening around bronze spring
smouldering_core|glowing orange coal emblem inside purple iron cage
recoil_spring|radiant bronze spiral spring with blue returning aura
reactive_plate|glowing blue spiked shield emblem reflecting red burst'''
ALTERNATES = '''cool_the_steel|blue shield cradled by bronze ice tongs
find_the_seam|bronze armour probe opening blue plate joint
read_the_line|blue sword beneath bronze measuring compass
sabre_rattle|wide bronze war horn with purple tassel
hairline_mark|bronze chisel marking red split in shield
read_the_blow|bronze spyglass behind curved blue shield
parry_ledger|radiant blue folio with crossed bronze guards
fault_reader|purple crystal eye radiating red fracture halo'''

def main():
 subjects: dict[str, str] = {}
 for line in SUBJECTS.splitlines():
  card_id, subject = line.split('|')
  subjects[card_id] = subject
 cards: list[dict[str, Any]] = []
 for i, block in enumerate(re.findall(r'```card\n(.*?)```', (ROOT/'docs/cards/breaker.md').read_text(), re.S)):
  fields = {}
  for key in ('id', 'name', 'type', 'text'):
   match = re.search(r'^'+key+r': (.*)$', block, re.M)
   if match is None:
    raise ValueError(f'Missing {key} in card block {i+1}')
   fields[key] = match[1].strip('"')
  cards.append({**fields, 'subject': subjects[fields['id']], 'sheet': f'breaker_{i//16+1:02}', 'cell': i%16+1})
 assert len(cards) == len(subjects) == 56
 alternates: list[dict[str, Any]] = []
 for i, line in enumerate(ALTERNATES.splitlines()):
  card_id, subject = line.split('|')
  alternates.append({'id': card_id+'_alt', 'alternate_for': card_id, 'subject': subject, 'sheet': 'breaker_04', 'cell': i+9})
 assert all(4 <= len(c['subject'].split()) <= 10 for c in cards+alternates)
 plan = {'class': 'breaker', 'cell_size': [32,24], 'cell_numbering': '1-based row-major, 4 columns and 4 rows', 'allocation': 'Sheets 1–3: sixteen cards each. Sheet 4: eight cards plus eight planned alternatives for abstract or ambiguous subjects.', 'cards': cards, 'alternates': alternates, 'fill_up': []}
 (HERE/'prompts_cards_breaker.json').write_text(json.dumps(plan, indent=2)+'\n')
 print('Breaker: allocated 56 cards + 8 alternate slots across four sheets', flush=True)

if __name__ == '__main__':
 main()
