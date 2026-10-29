"""Parse source card blocks and persist the five-sheet art allocation."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SUBJECTS = '''
lash|curved green thorn whip striking sideways
husk|hollow violet seed husk shield
seed_bite|split carnivorous seed with ivory fangs
graft_hide|stitched green leaf shield with amber seam
thornwhirl|spiralling crescent of sharp emerald thorns
barb_flick|single flying violet barb with cyan trail
grafting_cut|curved amber grafting knife cutting green stem
chitin_ram|heavy beetle horn charging through cyan impact
hivestrike|honeycomb hammer releasing violet stinging darts
shear|crossed silver pruning shears clipping thorn branch
spore_lash|green spore-tipped vine whip lashing
canker_bite|jagged violet insect mandibles dripping green venom
mulch_maul|broad rotten log hammer with mushroom studs
sap_shell|amber sap bubble encasing green shell
blightcap|drooping violet mushroom dripping luminous green poison
tendril_reach|forked cyan tendril unfurling protective broad leaf
root_mesh|interwoven green roots forming round buckler
deep_graft|thick cut root joined by cyan staples
windblown_seed|winged amber seed riding cyan wind curl
spore_haze|violet spore cloud surrounding green fungus stalk
mire_carapace|blue beetle shell crusted with green moss
shed_husk|split empty cicada shell revealing cyan leaf
sap_drip|golden sap droplet falling onto emerald bud
leaf_litter|pile of violet fallen leaves sprouting fungus
twin_thorn|paired emerald thorn daggers crossing outward
canopy_crush|heavy leafy branch smashing with amber impact
miasma_sweep|broad sickle sweeping violet poisonous crescent
uproot|torn green root club with amber soil
prism_thorn|long cyan crystal thorn piercing violet shard
pollen_sting|golden pollen stinger with green barbed tail
thicket_crash|spiked bramble battering log with scattered leaves
patient_thorn|coiled green thorn spring with amber tip
burl_wall|broad knotted tree bark shield with cyan rings
choking_spores|bulbous green pitcher plant exhaling violet spores
excise|silver scalpel beside severed violet infected root
propagate|branching green seedling splitting into twin sprouts
seed_rain|three amber seeds under protective green leaf
puffball|round ivory puffball venting green spore jets
sporeburst|cracked violet spore sac exploding cyan rays
decomposer|glowing mushroom emblem above dissolving amber leaf
dusk_pruning|violet crescent aura surrounding emerald pruning shears
living_hedge|glowing square bramble emblem with amber core
thorn_halo|radiant cyan thorn ring with violet centre
ripening_rot|glowing violet decay spiral around amber fruit
heartwood_spear|long amber wooden spear with emerald blade
death_cap|sharp violet mushroom lance with toxic green droplets
reaping_vine|hooked emerald vine scythe slicing amber arc
verdant_tide|surging emerald leaf wave with cyan crest
humus_rite|cupped root bowl holding glowing amber seed
crystal_graft|cyan crystal joined to living green branch
transplant|amber bulb moving between two violet roots
chitin_cocoon|closed segmented cyan chrysalis with green seams
quickening_sap|radiant amber sap lightning emblem with leaves
fungal_aegis|glowing cyan mushroom shield emblem with violet aura
thresher|radiant emerald toothed wheel with amber hub
hyphal_web|glowing violet mycelium web with cyan nodes
relay_ping|steel antenna tool emitting cyan signal arcs
shardfall|falling cyan crystal spear with golden streak
arc_lattice|crossed steel lightning rods firing cyan bolts
salvage_kit|open steel toolkit with glowing cyan parts
stress_fracture|cracked steel armour plate with golden wedge
gyro_jammer|steel gyroscope caught in cyan magnetic clamp
ballast_lock|heavy steel anchor shield with golden padlock
jettison_pod|steel escape capsule behind curved cyan shield
overdraft_cell|cracked golden battery leaking cyan lightning
star_survey|unrolled blue star chart with golden compass
fault_beacon|steel warning beacon emitting golden concentric pulses
snare_line|looped cyan tether cable with steel hooks
cutting_torch|steel cutting torch with sharp cyan flame
medbay_voucher|golden medical token in steel dispensing tool
clean_manifest|sleek steel blade slicing blank golden card stack
salvage_kiln|radiant golden furnace emblem within steel gear
prism_resonance|glowing cyan prism shield with golden orbit
shard_cache|open steel strongbox bursting with cyan crystals
mirror_tether|silver mirror blade tethered by golden cable
grav_clamp|heavy steel horseshoe clamp trapping cyan orb
'''

def main():
    subjects = dict(line.split('|') for line in SUBJECTS.strip().splitlines())
    cards = []
    for cls, expected in [('graft',56),('colorless',20)]:
        blocks = re.findall(r'```card\n(.*?)```', (ROOT / f'docs/cards/{cls}.md').read_text(), re.S)
        assert len(blocks) == expected
        for i, block in enumerate(blocks):
            fields = {k: re.search(r'^'+k+r': (.*)$', block, re.M)[1].strip('"') for k in ['id','name','type','text']}
            subject = subjects[fields['id']]
            assert 4 <= len(subject.split()) <= 10
            sheet = f'graft_{i//16+1:02}' if cls == 'graft' else ('colorless_01' if i < 16 else 'graft_04')
            cell = i%16+1 if cls == 'graft' or i<16 else i-16+9
            cards.append({**fields, 'class':cls, 'subject':subject, 'sheet':sheet,'cell':cell})
    alternates = [
        ('graft_hide','broad emerald leaf buckler with amber graft stitches'),
        ('deep_graft','split violet root bound by golden grafting clips'),
        ('transplant','glowing amber bulb cradled by cyan root tongs'),
        ('hyphal_web','radiant branching cyan mycelium emblem with violet nodes'),
    ]
    data = {'cell_size':[32,24], 'cell_numbering':'1-based row-major, 4 columns by 4 rows',
            'allocation':'48 Graft in sheets 1–3; sheet 4: 8 Graft, 4 colorless, 4 Graft alternates; colorless sheet: 16 colorless.',
            'cards':cards, 'alternates':[{'id':id+'_alt','alternate_for':id,'class':'graft','subject':s,'sheet':'graft_04','cell':i+13} for i,(id,s) in enumerate(alternates)]}
    (ROOT/'tools/sprites/prompts_cards.json').write_text(json.dumps(data,indent=2)+'\n')
    print('Planned 76 cards + 4 alternates across 5 sheets', flush=True)

if __name__ == '__main__':
    main()
