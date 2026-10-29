"""Write the reviewed GDD-derived row-major icon subjects."""
import json
from pathlib import Path

GROUPS = {
'relics_01_forged': '''riven_gauntlet|cracked red iron armored gauntlet
 glass_spurs|cyan glass boot spur
 dampener_coil|blue copper helical spring
 bulwark_rivets|three bronze shield rivets
 stim_patch|red medical adhesive patch
 scrap_magnet|red horseshoe scrap magnet
 notched_buckler|notched round bronze buckler
 chain_wraps|silver chain wrapped fist
 parry_charm|crossed silver swords pendant
 kept_fury|red flame inside iron cage
 crowd_breaker|wide bronze spiked warhammer
 concussion_rig|steel helmet with orange shock pads
 slow_temper|blue silver metal ingot
 hairline_saw|silver serrated hand saw
 duelists_oath|upright silver rapier red ribbon
 bastion_core|bronze shield with red core''',
'relics_02_verdant': '''heartseed|red heart shaped sprouting seed
 seed_pouch|brown seed pouch green sprout
 pollen_sac|yellow hanging pollen pod
 compost_heap|brown compost mound green mushroom
 rot_censer|green smoking bronze censer
 grafting_knife|curved silver knife green handle
 heartwood_ring|coiled green vine wooden ring
 mycelial_net|white fungal web green nodes
 elder_seed|large gold seed branching roots
 hollow_bough|hollow forked brown tree branch
 plague_bloom|purple flower sickly green center
 wild_growth|tangled green thorny sprouting bulb
 nursery_tray|brown rectangular tray three seedlings
 field_dressing|rolled white bandage red clasp
 heavy_heart|dark iron heart bronze chain
 tender_plating|cracked red overlapping armor plates''',
'relics_03_celestial': '''chrono_lens|gold round lens cyan clock hand
 tuning_fork|silver two pronged tuning fork
 sandglass_bead|tiny gold hourglass cyan sand
 star_pip|small cyan four pointed star
 pocket_star_chart|folded navy chart gold constellation
 wayfinder_needle|long gold compass needle
 offbeat_drum|purple drum gold zigzag rim
 timeline_spool|cyan thread bronze spool
 seers_veil|flowing blue veil silver eye
 metronome_heart|gold triangular metronome red pendulum
 prophet_glass|blue crystal ball gold pedestal
 paradox_coil|interlocking cyan violet spiral loops
 void_compass|black diamond compass cyan needle
 cracked_hourglass|cracked silver hourglass blue sand
 fixed_star|gold five pointed star silver pin
 star_atlas|open blue book gold star''',
'relics_04_crystalline': '''cracked_prism|cracked blue triangular prism shard
 geode_heart|purple crystal heart gray shell
 shard_lens|gold handled loupe blue shard
 crystal_spine|vertical jagged cyan crystal spine
 stormbreak_gem|red diamond gem yellow lightning
 shard_crucible|black crucible overflowing cyan crystals
 fracture_engine|split bronze gear red core
 exposed_core|red glowing orb broken silver cage
 stasis_engine|square blue engine frozen cyan core
 ghost_lantern|hanging bronze lantern pale cyan flame
 ascendant_prism|upright gold violet crystal prism
 gravity_loom|purple arch loom cyan hanging threads
 oracle_pebble|smooth cyan pebble white eye
 engine_tooth|single bronze cog tooth
 shard_debt|three cyan shards red chain
 crown_fragment|broken gold crown three points''',
'relics_05_curios': '''surveyor_ink|navy ink bottle gold feather
 tally_stick|brown wooden stick carved notches
 overwatch_drone|silver winged drone red eye
 binding_contract|rolled parchment red wax seal
 shard_writ|flat parchment cyan crystal seal
 vial_rack|wooden rack three colored vials
 practice_dummy|straw training dummy red target
 timeline_clamp|silver C clamp cyan jaws
 alt_mycelial_net|green diamond mesh white fungal knots
 alt_heavy_heart|large iron heart gold shackle
 alt_paradox_coil|cyan figure eight coil gold joint
 alt_gravity_loom|purple rectangular loom silver threads
 alt_fracture_engine|cracked orange gear cyan hub
 alt_shard_debt|cyan crystal bound red padlock
 alt_seers_veil|triangular blue veil white eye
 alt_duelists_oath|broad silver rapier red ribbon''',
'potions_01': '''pot_flare_cell|round red flask orange flame detail
 pot_shield_gel|square cobalt flask white shield detail
 pot_bastion_tonic|wide teal flask bronze battlement stopper
 pot_quicksilver|slender silver flask cyan wing detail
 pot_charge_cell|rectangular yellow flask black lightning detail
 pot_fault_dust|triangular orange flask white crack detail
 pot_concussion_gas|bulbous purple flask gray cloud detail
 pot_shard_tincture|diamond cyan flask gold crystal stopper
 pot_blight_vial|crooked lime flask white spore dots
 pot_seers_draught|oval navy flask white eye detail
 pot_fury_draught|spiked crimson flask gold fang detail
 pot_growth_sap|pear green flask brown thorn collar
 pot_tempo_draught|tall violet flask gold musical beat detail
 pot_mending_ampoule|heart pink flask white bandage detail
 pot_rewind_phial|curved turquoise flask gold counterclockwise arrow
 pot_halt_ampoule|hexagonal amber flask black clock hand'''
}
if __name__ == '__main__':
    result = {}
    for sheet, lines in GROUPS.items():
        result[sheet] = [dict(zip(('id', 'subject'), line.strip().split('|'))) for line in lines.splitlines()]
        assert len(result[sheet]) == 16
    Path(__file__).with_name('prompts_icons.json').write_text(json.dumps(result, indent=2) + '\n')
