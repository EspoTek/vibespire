"""Parse Chronist card blocks and allocate four production sheets before generation."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUBJECTS = '''
pulse_shot|cyan pulse pistol firing white energy bolt
ward|deep blue kite shield with gold rim
tick|short golden clock needle stabbing cyan spark
tock|blue pendulum shield swinging behind gold pivot
pinion_jab|sharp gold pinion spear piercing blue plate
gear_train|paired blue cog blades with gold teeth
downbeat|heavy gold mallet striking cyan shockwave
slack_water|curved blue harpoon skimming still white wave
parallax|twin offset cyan daggers with gold hilts
noon_gun|stubby blue naval cannon with gold muzzle
afterpeal|gold bell clapper striking cyan echo slash
spring_tide|towering blue tidal claw with white crest
carillon|three gold bell hammers radiating cyan shockwaves
storm_glass|sealed blue storm bottle shielding white lightning
almanac|closed blue calendar folio with gold clasp
ephemeris|unrolled cyan star chart with gold dividers
upbeat|gold tuning fork lifting blue protective arc
weather_eye|brass spyglass beneath curved blue storm shield
balance_wheel|broad blue balance wheel with gold counterweight
detent|gold locking pawl stopping blue toothed gear
dead_reckoning|blue navigation compass under crossed gold rulers
logbook|open blue logbook holding bright cyan crystal
reef_the_sails|furled white sail bound with blue rope
wind_forward|gold winding key trailing cyan forward gust
sweep_hand|long blue clockhand scythe sweeping gold arc
fermata|crescent blue axe held by golden clamp
appointed_hour|gold hourglass bursting into downward cyan spear
knell|huge blue bell striking white shockwave ring
turn_the_tide|curved gold trident reversing blue breaking wave
confluence|three cyan streams merging into gold spearhead
second_hand|thin silver clockhand rapier with blue afterimage
mainspring|coiled gold mainspring inside blue winding tool
quarter_chime|small silver handbell with gold ribbon
hasten|blue winged hourglass with golden winding handle
banked_hours|blue strongbox storing glowing gold sandglass
breakwater|broad blue seawall shield splitting white surf
heave_to|heavy gold anchor braced against blue wave
batten_down|crossed blue hatch braces with gold rivets
mark_the_lull|gold sextant sighting isolated cyan crescent
glance_ahead|blue crystal viewing lens on gold stand
striking_train|radiant blue hammer emblem inside golden gear
tide_table|glowing cyan wave emblem over blue tablet
storm_warning|radiant white lightning emblem inside blue triangle
escapement|glowing gold escapement star with cyan aura
zenith|vertical white star lance with golden wings
syzygy|aligned blue celestial blades piercing golden eclipse
culmination|crowned cyan crystal mace with gold spikes
toll_the_hours|gold clockwork flail with blue bell weights
seen_it_coming|blue crystal shield reflecting golden incoming arrow
star_tithe|gold offering bowl holding bright cyan star
 tourbillon|blue gyroscope tool enclosing coiled gold spring
lighthouse|white lighthouse tool casting broad cyan barrier
polyrhythm|interlocking luminous blue pendulum emblems with gold pivots
portents|radiant cyan comet emblem above golden crescent
watch_bell|glowing gold alarm bell inside blue shield
perpetual_motion|luminous cyan infinity wheel with golden hub
'''
ALTERNATES = [
 ('tick','gold needle dagger bursting through cyan paper fan'),
 ('parallax','crossed cyan throwing blades with offset white echoes'),
 ('almanac','blue hinged calendar case releasing gold star token'),
 ('dead_reckoning','gold navigator dividers braced across blue compass shield'),
 ('fermata','blue crescent cleaver suspended from golden chain'),
 ('mark_the_lull','gold sighting sextant framing blue calm wave'),
 ('syzygy','gold eclipse spear crossing aligned cyan crescent blades'),
 ('polyrhythm','radiant crossed gold pendulums inside twin cyan rings'),
]

def main():
 subjects: dict[str, str] = {}
 for line in SUBJECTS.strip().splitlines():
  card_id, subject = line.strip().split('|')
  assert 4 <= len(subject.split()) <= 10
  subjects[card_id] = subject
 blocks = re.findall(r'```card\n(.*?)```', (ROOT/'docs/cards/chronist.md').read_text(), re.S)
 assert len(blocks) == 56
 cards = []
 for i,b in enumerate(blocks):
  fields = {}
  for key in ('id','name','type','text'):
   match = re.search(r'^'+key+r': (.*)$',b,re.M)
   if match is None:
    raise ValueError(f'Missing {key} in Chronist card block {i+1}')
   fields[key] = match[1].strip('"')
  cards.append({**fields,'subject':subjects[fields['id']], 'sheet':f'chronist_{i//16+1:02}', 'cell':i%16+1})
 alternates = [{'id':id+'_alt','alternate_for':id,'subject':subject,'sheet':'chronist_04','cell':i+9} for i,(id,subject) in enumerate(ALTERNATES)]
 assert all(4 <= len(subject.split()) <= 10 for _,subject in ALTERNATES)
 data = {'class':'chronist','cell_size':[32,24],'cell_numbering':'1-based row-major; 4 columns by 4 rows', 'allocation':'Sheets 1–3: 16 cards each. Sheet 4: final 8 cards plus 8 alternates for initially weakest/most ambiguous silhouettes.', 'cards':cards,'alternates':alternates}
 (ROOT/'tools/sprites/prompts_cards_chronist.json').write_text(json.dumps(data,indent=2)+'\n')
 print('Chronist: allocated 56 cards + 8 alternates = 64 slots across four sheets',flush=True)

if __name__ == '__main__':
 main()
