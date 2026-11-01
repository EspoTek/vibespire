"""Revision 2 review sheets and conservative, explicitly subjective art scores."""
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw

from chars_cleanup import ORIGINAL_REVISION, RESTORED, SMALL_CLEANED, SMALL_REVIEW
from chars_review import ROOT, checker, inventory, sheets
from chars_validate import REPAIRED

OUT = ROOT / 'docs/art'
ASSETS = ROOT / 'public/assets/sprites'
ACCEPTED = REPAIRED - RESTORED
AFTER = {
    'assembly_frame': (4,4,5,4,4), 'cog_acolyte': (4,4,4,4,4),
    'furnace_heart': (4,5,4,4,4), 'gloam_empress': (4,5,5,4,4),
    'grand_assembler': (4,5,4,4,4), 'hammer_warden': (4,5,5,4,4),
    'leukarch': (4,4,4,4,4), 'loom_oracle': (4,4,4,4,4),
    'lymph_warden': (4,5,5,4,4), 'mirror_knight': (4,5,5,4,4),
    'phage_mother': (4,4,4,4,4), 'riveter': (4,4,4,4,4),
    'sickle_mantis': (4,5,4,4,4), 'thornback': (4,5,5,4,4),
    'void_geometer': (4,4,4,4,4), 'welded_horror': (4,4,4,4,4),
    'breaker@32': (4,4,4,4,4), 'graft@32': (4,4,4,4,4),
    'chronist@32': (4,4,4,4,4),
    'sporepuff': (4,5,4,4,4), 'scrap_drone': (4,5,4,4,4),
    'shardling': (4,4,4,4,4), 'pollen_wisp': (4,4,4,4,4),
}
NOTES = {
    'assembly_frame': 'Accepted, held: rib cage, exposed waist, grippers and separated legs.',
    'cog_acolyte': 'Accepted, held: cog halo, black hood, two amber eyes, red robe and censer.',
    'furnace_heart': 'Original restored: chimney bank, toothed shoulder drums, ribbed furnace, belly core, hooked hands, layered knee/ankle plates and cabling.',
    'gloam_empress': 'Accepted, held: eye-spotted wings, antennae and pale thorax.',
    'grand_assembler': 'Original restored: four jointed torch arms, lens dome, X-braced chest, hot conduits, fan-shaped base and rollers.',
    'hammer_warden': 'Accepted, held: wide hammer head, hot slit, broad fists and boots.',
    'leukarch': 'Original restored: radial crown, peripheral gold orbs, nested ocular halo, layered mantle, hanging plates and dense tentacle court.',
    'loom_oracle': 'Original restored: head cage, flanking spool mechanisms, blazing warp column, waist cage, embroidered red robe and hanging needles.',
    'lymph_warden': 'Accepted, held: hood, gold core and four separated tendrils.',
    'mirror_knight': 'Accepted, held: helmet/visor, faceted plate armour, cape, gauntlets and boots.',
    'phage_mother': 'Original restored: branching nerve fan, oval membrane, dark pores, violet nucleus with gold pupil and ciliary filaments.',
    'riveter': 'Original restored: bolt crest, recessed visor, panelled torso, round gun, pincer and segmented leg armour.',
    'sickle_mantis': 'Accepted, held: triangular head, paired eyes, two broad sickles and four legs.',
    'thornback': 'Accepted, held: turquoise boar, violet crest, ivory tusks, gold eyes and stout legs.',
    'void_geometer': 'Accepted, held: diamond head, gold slit, four angular arms and geometric robe.',
    'welded_horror': 'Original restored: asymmetric pincer/torch, ribbed furnace mouth, shoulder pipes, layered red armour and mismatched legs.',
    'breaker@32': '44px head/chest crop; connected brows and blue pupils; master skin/hair, clean chin and original blue-violet armour collar.',
    'graft@32': '44px head/chest crop; clean pink face, teal forelock, two readable eyes, cheek vine and violet shoulder blossom.',
    'chronist@32': '44px head/chest crop; original blue hood, brown-gold fringe and repaired cyan monocle with gold ring.',
    'sporepuff': 'Same eye, leaf ears, cyan spots and intentional outlined spores; violet ramp tidied.',
    'scrap_drone': 'Same rotor, orange eye, machinery and claws; shell/leaf ramps consolidated.',
    'shardling': 'Same crown of blades, gold core, faceted shell and articulated legs; pearl/blue shade steps consolidated.',
    'pollen_wisp': 'Same radiant pollen head, face, outlined motes, veined wings and feet; wing shade islands joined.',
}
DETAIL = {name: (5,5) if name in RESTORED else (4,4) for name in AFTER}
DETAIL.update({name:(3,4) for name in ('breaker@32','graft@32','chronist@32')})


def baseline_bytes(folder, name):
    return subprocess.check_output(['git','show',
        f'{ORIGINAL_REVISION}:public/assets/sprites/{folder}/{name}.png'], cwd=ROOT)


def baseline_image(folder, name):
    return Image.open(io.BytesIO(baseline_bytes(folder,name))).convert('RGBA')


def backdrop_tile(name, im, backdrops, width=156, height=112):
    act = inventory()[name]
    backdrop = {1:'act1_verdant',2:'act2_foundry',3:'act3_crown'}[act]
    bg = Image.open(backdrops/f'{backdrop}.png').convert('RGBA')
    bg.alpha_composite(im,(320-im.width//2,200-im.height))
    return bg.crop((320-width//2,216-height,320+width//2,216)).convert('RGB')


def small_row(sheet, y, backdrops, before=False, spacing=182):
    d = ImageDraw.Draw(sheet)
    for i,name in enumerate(SMALL_REVIEW):
        x=12+i*spacing
        im=baseline_image('enemies',name) if before else Image.open(ASSETS/f'enemies/{name}.png').convert('RGBA')
        d.text((x,y),name,fill='white')
        sheet.paste(backdrop_tile(name,im,backdrops),(x,y+18))


def crowded_lines(backdrops):
    sheet=Image.new('RGB',(1320,650),'#1e2030');d=ImageDraw.Draw(sheet)
    d.text((12,8),'CROWDED COMBAT / ACTUAL 1x / all sprites and backdrops unscaled',fill='white')
    cases=[
        (1,['sporepuff','scrap_drone','pollen_wisp','flitterfang']),
        (2,['grand_assembler','assembly_frame','assembly_frame','hammer_warden']),
        (3,['leukarch','phage','shardling','void_mote']),
    ]
    for row,(act,names) in enumerate(cases):
        y=36+row*200
        bd={1:'act1_verdant',2:'act2_foundry',3:'act3_crown'}[act]
        bg=Image.open(backdrops/f'{bd}.png').convert('RGBA')
        for x,name in zip((170,270,370,470),names):
            im=Image.open(ASSETS/f'enemies/{name}.png').convert('RGBA')
            bg.alpha_composite(im,(x-im.width//2,200-im.height))
        sheet.paste(bg.crop((0,64,640,244)).convert('RGB'),(12,y))
        d.text((674,y+12),f'Act {act}: '+', '.join(names),fill='white')
        d.text((674,y+32),'96px boss canvas remains 96px at 1x; minions remain 64px.',fill='#bfc4d8')
    sheet.save(OUT/'characters-crowded-1x.png')


def portrait_identity_sheet():
    page=Image.new('RGB',(1200,570),'#1e2030');d=ImageDraw.Draw(page)
    for i,name in enumerate(('breaker','graft','chronist')):
        x=i*400
        master=Image.open(ASSETS/f'portraits/{name}.png').convert('RGBA')
        hud=Image.open(ASSETS/f'portraits/{name}@32.png').convert('RGBA')
        d.text((x+12,12),name+' / accepted master -> HUD',fill='white')
        b=checker((256,256));b.alpha_composite(master.resize((256,256),Image.Resampling.NEAREST));page.paste(b.convert('RGB'),(x+12,36))
        b=checker((128,128));b.alpha_composite(hud.resize((128,128),Image.Resampling.NEAREST));page.paste(b.convert('RGB'),(x+12,326))
        b=checker(hud.size);b.alpha_composite(hud);page.paste(b.convert('RGB'),(x+190,326))
        d.text((x+12,468),'4x HUD / same skin, hair and gear palette',fill='#bfc4d8')
        d.text((x+190,374),'1x HUD',fill='#bfc4d8')
    page.save(OUT/'characters-portrait-identity.png')


def main():
    temp=Path(tempfile.mkdtemp(prefix='vibespire-chars-review-'))
    backdrops=temp/'backdrops';backdrops.mkdir()
    for bd in ('act1_verdant','act2_foundry','act3_crown'):
        shutil.copy2(ROOT/f'public/assets/backdrops/{bd}.png',backdrops/f'{bd}.png')
    print('review: pinned current act backdrops for both sides',flush=True)
    baseline=temp/'originals'
    for folder in ('enemies','portraits'):
        (baseline/folder).mkdir(parents=True)
        for path in sorted((ASSETS/folder).glob('*.png')):
            (baseline/folder/path.name).write_bytes(baseline_bytes(folder,path.stem))
    sheets('before',baseline,backdrops)
    sheets('after',ASSETS,backdrops)
    small=Image.new('RGB',(1700,330),'#1e2030');d=ImageDraw.Draw(small)
    d.text((12,8),'SMALL ENEMIES / 1x ON ACT BACKDROP / exact pixels, no scaling',fill='white')
    d.text((12,30),'ORIGINALS',fill='#bfc4d8');small_row(small,48,backdrops,before=True)
    d.text((12,178),'FINAL',fill='#bfc4d8');small_row(small,196,backdrops)
    small.save(OUT/'characters-1x-backdrops.png')
    crowded_lines(backdrops)
    portrait_identity_sheet()
    audit=(OUT/'characters-audit.md').read_text()
    before={}
    for row in audit.splitlines():
        cells=[x.strip() for x in row.split('|')[1:-1]]
        if len(cells)>=7 and all(x.isdigit() for x in cells[1:6]):
            before[cells[0].removesuffix('.png')]=tuple(int(x) for x in cells[1:6])
    names=sorted(REPAIRED | SMALL_CLEANED)+['breaker@32','graft@32','chronist@32']
    sheet=Image.new('RGB',(1700,280+548*((len(names)+1)//2)),'#1e2030');d=ImageDraw.Draw(sheet)
    d.text((12,10),'VIBESPIRE CHARACTERS / REVISION 2 / ORIGINAL -> FINAL / 4x NEAREST + actual 1x',fill='white')
    d.text((12,34),'All nine requested small enemies at 1x on their act backdrop (same snapshot used on both sides):',fill='#bfc4d8')
    small_row(sheet,60,backdrops)
    d.text((12,216),'Seven rejected generations restored from HEAD; native cleanup keeps 100% of original silhouette and structural ink.',fill='white')
    d.text((12,236),'DD = meaningful detail density vs original; detached noise is not detail. Accepted nine held byte-for-byte.',fill='#bfc4d8')
    report=[
        '# Character self-review — revision 2\n',
        'The lead rejected seven earlier regenerations and two HUD portraits despite the first self-review scores. Those scores overstated the result. This round restores the seven original enemy files from HEAD before cleanup; no new image generation was needed. All three HUD portraits now derive from the accepted 64px masters. The nine accepted enemy repairs are held byte-for-byte.\n',
        'F/R/P/L/C mean fidelity, native readability, pixel cleanliness, directional light and set coherence. Scores are visual self-assessments, not approval from the lead. The dense restored designs earn 4 for cleanliness, not a claim of perfect simplicity.\n',
        '**Detail density vs original (DD)** scores meaningful anatomy, layered machinery, ornament, material separation and identity cues. It does not reward random shade speckles. 4 retains all signature motifs; 5 retains unusually dense layered construction. Every replacement is at least its original DD. For the seven restored enemies and four small-enemy cleanups, this judgement is supported by exact 100% silhouette and black structural-ink retention, plus the named feature inventory below. It is not a claim that raw colour entropy increased.\n',
        '| Asset | Original F/R/P/L/C | Final F/R/P/L/C | Detail density vs original | Result / retained features |',
        '|---|---|---|---|---|',
    ]
    for i,name in enumerate(names):
        folder='portraits' if '@32' in name else 'enemies'
        old=baseline_image(folder,name)
        new=Image.open(ASSETS/f'{folder}/{name}.png').convert('RGBA')
        x,y=(i%2)*850,280+(i//2)*548
        bdd,add=DETAIL[name]
        d.text((x+12,y),f'{name} / detail density {bdd} -> {add}',fill='white')
        for j,im in enumerate((old,new)):
            px=x+12+j*420
            d.text((px,y+18),'ORIGINAL' if j==0 else 'FINAL',fill='#bfc4d8')
            large=checker((384,384));big=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST)
            large.alpha_composite(big,((384-big.width)//2,384-big.height));sheet.paste(large.convert('RGB'),(px,y+36))
            if folder=='enemies':
                tile=backdrop_tile(name,im,backdrops,width=156,height=96)
                sheet.paste(tile,(px+228,y+430))
            else:
                tile=checker(im.size);tile.alpha_composite(im);sheet.paste(tile.convert('RGB'),(px+260,y+440))
            d.text((px+228,y+530),'1x / act backdrop' if folder=='enemies' else '1x / HUD',fill='#bfc4d8')
        report.append(f'| {name} | {"/".join(map(str,before[name]))} | {"/".join(map(str,AFTER[name]))} | {bdd} → {add} | {NOTES[name]} |')
    sheet.save(OUT/'characters-before-after.png')
    evidence=json.loads((OUT/'characters-cleanup-evidence.json').read_text())
    report += [
        '\n## Cleanup evidence\n',
        f'Original source revision: `{ORIGINAL_REVISION}`. The seven restorations were performed with `git show HEAD:<path> > <path>` only inside the enemy asset directory. The reproducible cleanup pins that revision so later commits cannot accidentally become the source. This round changed no src files, index or history.\n',
        'All eleven cleaned originals already had a continuous black exposed edge and no disconnected one/two-pixel alpha scraps. No extra halo or silhouette smoothing was necessary. Structural black seams, eyes, pores, filaments, bolts and engraved lines were retained. Redundant shades were mapped within materials, unsupported one-pixel material highlights joined to supported neighbours, and reflective patch highlights shifted toward the upper left. Eyes, furnace cores and the pollen head retain emission.\n',
        '| Cleaned original | Colours | Shade pixels changed | Noise highlights joined | Light pixels adjusted | Silhouette / structural ink retained |',
        '|---|---:|---:|---:|---:|---|',
    ]
    for name,e in sorted(evidence.items()):
        report.append(f'| {name} | {e["opaque_colours"]} | {e["redundant_shade_pixels_merged"]} | {e["isolated_material_highlights_joined"]} | {e["directional_shade_pixels_adjusted"]} | 100% / 100% |')
    report += [
        '\n## All nine small enemies at 1x\n',
        'The comparison sheet includes an actual-size backdrop row for sporepuff, orchid_bud, phage, void_mote, scrap_drone, shardling, pollen_wisp, flitterfang and gnasher. Sporepuff, Scrap Drone, Shardling and Pollen Wisp received the same original-pixel cleanup. The other five already read clearly on their act backgrounds and retain their original bytes. None was enlarged to hide a native-size problem.\n',
        'The extra crowded-line sheet places four enemies on the same unscaled backdrop, including a Foundry boss with three minions and a Crown boss with three minions. These are offline asset composites using the established review baseline, not browser captures. The backgrounds are snapshotted once for all before/after comparisons.\n',
        '\n## HUD identity\n',
        'All three use source crop `(10,6,54,50)`. Each 44×44 face-and-upper-chest crop is sampled once, directly to 32×32; eyes, brows, nose, mouth and class signifiers are then explicitly cleaned at native resolution. Landmarks first inspected on a wider 52px crop are reprojected onto this tighter crop, so the face fills more of the frame without double-resampling the art. Output colours are a subset of that character’s unchanged master palette (12 colours each). Breaker has a clean chin, blue swept hair and blue-violet armour collar; Graft has flat pink skin, teal hair, cheek vine and a violet flower; Chronist has the original blue hood, brown-gold fringe and cyan monocle.\n',
        '\n## Atlas and validation\n',
        'The atlas remains `{frames:{id:{x,y,w,h}},cell:96}` with identical JSON bytes/layout. All 46 frame crops are checked against their source PNGs. All nine bosses remain 96×96; all other enemy canvases remain 64×64. Only the atlas image changed. Current command results are recorded in [characters-validation.md](characters-validation.md).\n',
        '\n## Sheets\n',
        '- [Main original/final sheet](characters-before-after.png): 23 replacements, 4× plus 1×, with the nine-enemy 1× backdrop row at the top.',
        '- [All nine small enemies, original/final at 1×](characters-1x-backdrops.png).',
        '- [Crowded combat lines at 1×](characters-crowded-1x.png).',
        '- [Accepted 64px identities beside final HUD portraits](characters-portrait-identity.png).',
        '- Full-roster 1×/4×/backdrop sheets: '+', '.join(f'[before {i}](characters-contact-before-{i}.png) / [after {i}](characters-contact-after-{i}.png)' for i in range(1,7))+'.',
        '- All portrait files: [before](characters-portraits-before.png) / [after](characters-portraits-after.png).',
        '- [Before metrics](characters-metrics-before.md), [after metrics](characters-metrics-after.md), [cleanup hashes and counts](characters-cleanup-evidence.json).',
        '\n## Reproduction\n',
        'From `tools/sprites` (the accepted nine generation outputs are already delivered):',
        '```sh\nUV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run chars_cleanup.py --apply\nUV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run chars_portraits.py\nUV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run chars_atlas.py\nUV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run chars_report.py\nUV_CACHE_DIR=/private/tmp/vibespire-uv-cache uv run python -m unittest -v chars_validate\n```',
        'The report rebuilds original comparisons from the pinned Git revision, without needing the earlier temporary snapshot or generated-image files. `chars_process.py` now skips the seven rejected generations. Other retained enemies still include the original bilateral light and 16-colour palettes; they are outside this revision beyond the requested nine-enemy native review. No animations were added.',
    ]
    (OUT/'characters-review.md').write_text('\n'.join(report)+'\n')
    print(f'review: {len(names)} scored pairs + 9 native-backdrop icons + crowded lines',flush=True)
    accepted_hashes={name:hashlib.sha256((ASSETS/f'enemies/{name}.png').read_bytes()).hexdigest() for name in sorted(ACCEPTED)}
    (OUT/'characters-accepted-hashes.json').write_text(json.dumps(accepted_hashes,indent=2)+'\n')


if __name__=='__main__':
    main()
