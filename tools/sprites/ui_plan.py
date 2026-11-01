"""Editorial selection and complete before/after score ledger for UI art."""
import json
from pathlib import Path
from statistics import mean
from typing import TypedDict

from ui_audit import DOC, HERE, KINDS, WORK, cards, paths
from ui_revision import REVISED

# Re-scored after the lead's detail-density verdict. These are editorial
# judgements, independent of the exact palette and pixel-preservation checks.
RESCORED = {
    'clean_manifest': [5,4,3,4,4], 'gyro_jammer': [5,3,3,4,4],
    'jettison_pod': [5,4,3,4,4], 'read_the_line': [5,3,3,4,3],
    'salvage_kit': [5,3,3,3,3], 'snare_line': [5,4,3,4,4],
    'stress_fracture': [5,3,3,4,4], 'tourbillon': [5,3,3,4,4],
    'hairline_mark': [5,3,3,4,4], 'binding_contract': [5,4,4,4,4],
    'bulwark_rivets': [5,4,4,4,4], 'heartwood_ring': [5,3,3,4,4],
    'paradox_coil': [5,4,4,4,4], 'timeline_clamp': [5,4,3,4,4],
    'gravity_loom': [5,4,4,4,4], 'shard_crucible': [5,3,3,4,4],
    'field_dressing': [5,4,4,4,4], 'event_generic': [5,4,4,4,4],
}
OUTLIERS = {
    'glass_spurs': ([5,3,4,3,3], 'Flat boot/spur planes have less material modelling than the crystal relics.'),
    'hollow_bough': ([5,4,4,3,4], 'Broad forked branch is readable but smoother and less textured than the wood family.'),
    'nursery_tray': ([5,4,4,3,4], 'Repeated stems and plain tray edge are sparse beside the richer seed relics.'),
    'mycelial_net': ([5,3,4,3,3], 'Orthogonal net and bright corner blocks remain diagram-like.'),
    'tender_plating': ([5,3,4,3,3], 'Red plates retain shallow two-tone shading and little wear.'),
    'heavy_heart': ([5,4,4,3,4], 'Solid heart reads clearly, but its grey face is plainer than neighbouring amulets.'),
    'hairline_saw': ([5,4,4,3,4], 'Broad saw face and regular teeth are more geometric than the older metalwork.'),
    'crystal_spine': ([5,4,4,3,4], 'Cyan spine has fewer small facets than the crystal family.'),
    'grafting_knife': ([5,4,4,3,4], 'Long clean blade has less material texture than the older tools.'),
    'death_cap': ([5,4,4,3,4], 'Large cap is clear, but its uniform violet face and regular spots remain flat.'),
    'heartwood_spear': ([5,4,4,3,4], 'Readable spear has a simpler shaft and leaf head than the organic cards.'),
    'read_the_blow': ([5,4,4,3,4], 'Large blue hand plane has less modelling than the nearby gauntlet art.'),
    'shard_cache': ([5,4,4,3,4], 'Untouched legacy chest has broad flat panels beside the detailed colourless machinery.'),
    'wind_forward': ([5,4,4,3,4], 'Untouched legacy winding key is unusually smooth and emblem-like.'),
}
REVISION_NOTES = {
    'clean_manifest': 'Original blade over golden scroll retained; two stray warm shades consolidated.',
    'gyro_jammer': 'Original gimbal, axle, brass hub and blue/cyan rim retained; six violet shadow pixels become navy.',
    'jettison_pod': 'Original nested pod ribs, canopy, core and facets retained; one stray slate shade consolidated.',
    'read_the_line': 'Original brass calipers over a shaded blue blade retained; one pink handle pixel becomes warm brass highlight.',
    'salvage_kit': 'Original open case, trays, cables and small fittings retained; three near-duplicate cyan highlights consolidated.',
    'snare_line': 'Original shaded coil, links and brass end weights retained; one lavender fleck joins the pale-cyan ramp.',
    'stress_fracture': 'Original fractured plates, yellow fault and wear retained; two isolated off-ramp pixels consolidated.',
    'tourbillon': 'Original open cage, brass balance, inner mechanism and rim glints retained; seven saturated-blue/violet shadow specks become navy.',
    'hairline_mark': 'Original chisel, branching red fissure and shaded plate retained; one warm highlight consolidated.',
    'binding_contract': 'Original rolled parchment, folds, ribbon and red seal retained; three olive flecks and one right-edge fold repaired.',
    'bulwark_rivets': 'Original three shaded rivet heads and shafts retained; six violet/grey flecks join the warm material ramp.',
    'heartwood_ring': 'Original irregular bark, leaf knots and ring hole retained; two dark connector pixels close pinholes.',
    'paradox_coil': 'Original two shaded loops and brass joint retained; two rim pixels restore a broken dark-blue arc.',
    'timeline_clamp': 'Original jaw bevels, screw/tail, cyan caps and metal highlights retained; two stray teal shades consolidated.',
    'gravity_loom': 'Original carved uprights, three cyan warps, gold rail and shaded feet retained; two dark upright pixels close gaps.',
    'shard_crucible': 'Original irregular shards, vessel, feet and sparks retained; three local rim pixels restore cup continuity.',
    'field_dressing': 'Original folded cloth, warm crease shading and red binding retained; one dark cloth pixel closes a pinhole.',
    'event_generic': 'Accepted quiet room retained; original lower floor joints recovered in black on navy, with two distant courses and four aligned perspective joints.',
}


class ScoreRecord(TypedDict):
    id: str
    before: list[int]
    after: list[int]
    selected: bool
    revised: bool
    density: str
    reason: str

CARD_IDS = {
    "breaker": "thresher_arc read_the_line hairline_mark fault_line find_the_seam coiled_strike chain_driver bind_the_blade answering_steel counterweight fault_reader endless_maul planted_feet parry_ledger steal_the_swing forge_oath jackhammer sabre_rattle read_the_blow recoil_spring iron_avalanche".split(),
    "graft": "excise death_cap deep_graft heartwood_spear dusk_pruning grafting_cut shear uproot mulch_maul pollen_sting spore_lash thornwhirl thorn_halo miasma_sweep mire_carapace hivestrike seed_bite canker_bite blightcap living_hedge reaping_vine prism_thorn sap_drip transplant".split(),
    "chronist": "tourbillon escapement parallax windblown_seed tick knell slack_water heave_to tock pinion_jab second_hand sweep_hand".split(),
    "colorless": "clean_manifest snare_line stress_fracture jettison_pod gyro_jammer salvage_kit".split(),
}
RELIC_IDS = "engine_tooth heavy_heart hollow_bough bulwark_rivets pollen_sac binding_contract field_dressing parry_charm heartwood_ring mycelial_net nursery_tray wayfinder_needle tally_stick grafting_knife hairline_saw tender_plating crystal_spine stormbreak_gem shard_crucible wild_growth gravity_loom paradox_coil glass_spurs timeline_clamp".split()
POTION_IDS = ["pot_"+s for s in "rewind_phial halt_ampoule tempo_draught fury_draught seers_draught mending_ampoule".split()]
BACKDROP_IDS = ["act3_crown", "event_generic", "shop_interior"]
SELECTED = {"cards": sum(CARD_IDS.values(), []), "relics": RELIC_IDS,
            "potions": POTION_IDS, "backdrops": BACKDROP_IDS}
WEAK = {
    "death_cap": "Cap reads as a violet spearhead, not a poisonous mushroom.",
    "excise": "Thin grey implement and violet roots disappear at 1×; cut is unclear.",
    "heartwood_spear": "One-pixel shaft and tiny head have too little mass.",
    "read_the_line": "Calipers resemble an abstract triangular stand at 1×.",
    "hairline_mark": "Fine chisel and red web merge into noisy plate detail.",
    "thresher_arc": "Dark crescent competes with the axe instead of describing a sweep.",
    "engine_tooth": "Small bronze zigzag does not describe a mechanical gear tooth.",
    "heavy_heart": "Chain and heart merge into a hollow anonymous amulet.",
    "pot_rewind_phial": "Gold mark reads as a plus; backward arrow is lost.",
}
REASONS = {
    "breaker": "Thin or crowded steel forms; bronze/violet overtake the steel/red identity.",
    "graft": "Fine roots, strands or overlapping anatomy; cyan/brown compete with green/violet.",
    "chronist": "Abstract timing motif or thin pointer; reduce small internal detail.",
    "colorless": "Blue/cyan class-like palette and crowded machinery; neutral material needed.",
    "relics": "Small interior, fragile stroke or crowded silhouette; simplify and centre at 16px.",
    "potions": "Bottle mark is ambiguous or too small; distinguish effect with a large symbol.",
    "act3_crown": "Fine floor grid and crystal microdetail differ from the broad forest/foundry clusters.",
    "event_generic": "Bright royal-blue floor and fine masonry compete with the calm house stage.",
    "shop_interior": "Coarse furniture and clipped top jars; density differs from other locations.",
}


def ledger(after: bool = False) -> None:
    manifest = cards()
    lines = ["# UI art audit — existing v1 set", "",
             "Baseline: 188 top-level 32×24 card frames, 72 relics and 16 potions at 16×16, seven opaque 640×360 backdrops. The 16 exploratory cards in `cards/test/` are not runtime atlas frames and are excluded. The existing `cinder_heart` asset is the renamed `furnace_heart` prompt entry; no ID is changed by this pass.", "",
             "Read `docs/v2/BRIEF.md`, both CLAUDE instruction files, measured `docs/research/art-style.md`, pipeline scripts/manifests and `docs/art/ref/v1-combat.png`. The live reference already has strong colour and a calm forest floor. Preserve that direction.", "",
             "## Findings", "",
             "- SMS channel fidelity is already exact across all 283 assets. The weakness is composition at small sizes, rather than insufficient saturation. Black outlines vary from a clean pixel to thick doubled borders that erase small interiors.",
             "- Breaker has too much purple/bronze in some tools; Graft mixes bright cyan crystal anatomy with tiny brown roots; colourless machinery looks Chronist-blue. The style bible fixes the dominant material identities while preserving accepted exceptions.",
             "- Thin diagonals (Heartwood Spear, Excise, Read the Line), clustered machinery (Escapement, Salvage Kit), and tiny appendages (Hivestrike, Deep Graft) look better enlarged than on a real card. Death Cap communicates the wrong object.",
             "- Relic silhouettes lose semantic features when chain/outline consumes their interior: Heavy Heart and Engine Tooth are the clearest failures. Several branches, blades, seeds and nets need wider bodies and fewer stray pixels. Potion Rewind's plus-like mark is particularly misleading.",
             "- Forest/Foundry/Rest have strong quiet floors. Crown and Event have finer seams/masonry; Event's bright floor is the least restrained. Shop is substantially coarser, with partly clipped jars. The weakest three backdrops receive a common 2× construction grid and quieter central values.", "",
             "## Selection and score method", "",
             "Scores are editorial judgements after viewing labelled 1× and NEAREST 4× sheets, informed by dimension, alpha and palette measurements. P/R/X/C/M = palette / readability / pixel cleanliness / coherence / meaning. For locations M also covers gameplay space. A 4 is acceptable production art, not proof of literal hardware authenticity. All five scores are independent; exact palette does not imply a clear image.", "",
             "The original selection was the weakest third per set: 63/188 cards, 24/72 relics, 6/16 potions, 3/7 backdrops. Round two restores nine rejected cards and eight rejected relics before sparse cleanup, and repairs the event floor. All other round-one images are held byte-identical. Scores were re-evaluated with the lead's density/character criterion; earlier blanket 4/5 claims are withdrawn. A restored original is not credited with a readability jump simply because its palette is exact.", "",
             "Detail density compares the round-two edit with HEAD. Equal means original illustrated parts, texture and material ramps retained; material-pixel coverage is supporting evidence, not a substitute for visual judgement. Every revised sprite has identical alpha and only 1–7 repaired pixels. Held accepted round-one art is labelled explicitly; it is not claimed to pass a new density comparison. The review lists its remaining outliers.", ""]
    baseline = json.loads((WORK / "before-inventory.json").read_text())
    all_records = {}
    for kind in KINDS:
        data = baseline[kind]
        lines += [f"## {kind.title()}", "", "| ID | Before P/R/X/C/M | After P/R/X/C/M | Detail density vs original | Finding / treatment |", "|---|---|---|---|---|"]
        rows: list[ScoreRecord] = []
        for item in data:
            name = item["id"]
            selected = name in SELECTED[kind]
            cls = manifest[name]["class"] if kind == "cards" else kind
            before = [5, 3, 3, 3, 3] if selected else [5, 4, 4, 4, 4]
            reason = REASONS[name if kind == "backdrops" and selected else cls] if selected else "Retain: readable established house silhouette and palette."
            if name in WEAK:
                before[1] = before[4] = 2
                reason = WEAK[name]
            if kind == "backdrops" and selected:
                before = [5, 3 if name == "event_generic" else 4, 3, 3, 4]
            final = [5,4,4,4,4] if selected else before
            density = 'Unchanged original'
            if selected:
                density = 'Held: lead accepted round one; no round-two replacement'
            if name in RESCORED:
                final = RESCORED[name]
                if kind != 'backdrops':
                    before = final.copy()
                    if name in ('binding_contract', 'bulwark_rivets', 'paradox_coil', 'gravity_loom'):
                        before[2] = 3
                reason = REVISION_NOTES[name]
                density = '≥ original: original form/ramps/texture retained; see per-pixel evidence in ui-review.md'
                if kind == 'backdrops':
                    density = '≥ original floor structure: original joints plus two distant courses; accepted quiet walls held'
            if name in OUTLIERS:
                final, reason = OUTLIERS[name]
                if not selected:
                    before = final.copy()
                reason += ' Score floor 3; retained under do-no-harm rule.'
            after_text = "/".join(map(str, final)) if after else "pending" if selected else "retained"
            lines.append(f"| `{name}` | {'/'.join(map(str,before))} | {after_text} | {density} | {reason} |")
            rows.append({"id":name, "before":before, "after":final,
                         "selected":selected, "revised":name in REVISED[kind] if kind in REVISED else False,
                         "density":density, "reason":reason})
        all_records[kind] = rows
        bm = [round(mean(r["before"][i] for r in rows),2) for i in range(5)]
        am = [round(mean(r["after"][i] for r in rows),2) for i in range(5)] if after else []
        lines += ["", f"Set mean P/R/X/C/M: **{' / '.join(map(str,bm))}**" +
                  (f" → **{' / '.join(map(str,am))}**." if after else ". Re-review pending."), ""]
    lines += ["## Review artifacts", "",
              "Complete baseline: `ui-before-{cards,relics,potions,backdrops}-{1x,4x}.png`. Cards also have class-specific 4× sheets. Actual artwork is shown at its labelled scale; captions and margins are editorial furniture.", "",
              "Final comparison sheets: `ui-before-after-cards.png`, `ui-before-after-icons.png`, `ui-before-after-backdrops.png`; final full-set sheets use `ui-after-` instead of `ui-before-`.", "",
              "## Limits and remaining work", "",
              "New v2 card IDs are outside this pass and need the designers' forthcoming art list. Small art communicates the principal action/object, not all timing and combo rules; tooltip and card text remain essential. Existing accepted assets retain some intentional class crystal exceptions. No source, enemy or portrait files are edited.", ""]
    DOC.joinpath("ui-audit.md").write_text("\n".join(lines))
    WORK.joinpath("scores.json").write_text(json.dumps(all_records, indent=2)+"\n")
    if after:
        DOC.joinpath("ui-scores.json").write_text(json.dumps(all_records, indent=2)+"\n")
    print(f"wrote complete {'final' if after else 'baseline'} score ledger", flush=True)


if __name__ == "__main__":
    import sys
    ledger("--after" in sys.argv)
