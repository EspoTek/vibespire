"""Validate current UI assets; --round2 selects the historical v1-only audit."""
import json
import sys

import numpy as np
from PIL import Image

from ui_audit import DOC, WORK, KINDS, directory, paths
from ui_plan import SELECTED, ledger
from ui_revision import REVISED, validate_round


def validate_icon_fill(image: Image.Image, name: str) -> dict:
    """Reject empty or undersized inventory art using its opaque alpha bbox."""
    from v2_metrics import measurements
    measured = measurements(image)
    if measured['opaque_bbox_long_side'] < 11:
        raise ValueError(f'{name}: opaque bbox long side {measured["opaque_bbox_long_side"]}px < 11px')
    return measured


def validate_new_pixel_quality() -> None:
    """Audit EVERY new asset against the accepted noise median of its kind."""
    from v2_art import ROOT, read_manifest
    from v2_metrics import accepted_metrics, measurements
    from v2_revision import BEFORE, family
    from collections import Counter
    from statistics import median
    m = read_manifest()
    accepted = accepted_metrics(m)
    report_path = ROOT / 'docs/art/v2-new-art-noise-r2.json'
    review = json.loads(report_path.read_text())
    overall = median(a['isolated_pixels'] for group in accepted.values() for a in group['assets'])
    assert overall == review['accepted_overall_isolated_pixels_median'], 'stale accepted overall median'
    editorial = {r['id']: r for r in json.loads((ROOT / 'docs/art/v2-new-art-review.json').read_text())['scores']}
    previous = {r['id']: r for r in review['assets']}
    assert set(previous) == {r['id'] for r in m['new']}, 'incomplete noise ledger'
    audited = []
    for record in m['new']:
        name, kind = record['id'], record['kind']
        image = Image.open(ROOT / record['file']).convert('RGBA')
        measured = validate_icon_fill(image, name) if kind in ('relics', 'potions') else measurements(image)
        limit = accepted[kind]['isolated_pixels_median']
        budget = min(limit, review['accepted_overall_isolated_pixels_median'])
        assert measured['isolated_pixels'] <= budget, (name, 'isolated pixel budget', measured['isolated_pixels'], budget)
        assert measured == previous[name]['after'], (name, 'stale noise/fill ledger')
        assert measurements(Image.open(BEFORE / kind / f'{name}.png')) == previous[name]['before'], (name, 'stale before metrics')
        assert previous[name]['accepted_isolated_pixels_median'] == limit, (name, 'stale accepted median')
        assert previous[name]['noise_budget'] == budget, (name, 'stale noise budget')
        assert editorial[name]['noise']['isolated_pixels_after'] == measured['isolated_pixels'], (name, 'stale editorial noise metric')
        pixels = np.array(image)
        ramps = Counter(family(tuple(c)) for c in np.unique(pixels[pixels[:, :, 3] > 0, :3], axis=0))
        assert max(ramps.values()) <= 3, (name, 'material ramp exceeds three steps', ramps)
        assert dict(ramps) == previous[name]['material_ramp_steps'], (name, 'stale material ramps')
        audited.append({'id': name, 'kind': kind, **measured, 'accepted_isolated_pixels_median': limit})
    # Check each recorded adjacent native/4x image against its exact final pixels.
    layout = json.loads((ROOT / 'docs/art/v2-new-art-coherence-r2.json').read_text())
    sheet = Image.open(ROOT / layout['sheet'])
    paired = {}
    for p in layout['placements']:
        image = Image.open(ROOT / f'public/assets/sprites/{p["kind"]}/{p["id"]}.png').convert('RGBA')
        enlarged = image.resize((image.width*p['scale'], image.height*p['scale']), Image.Resampling.NEAREST)
        expected = Image.new('RGB', enlarged.size, p['background'])
        expected.paste(enlarged, (0, 0), enlarged)
        assert sheet.crop((p['x'], p['y'], p['x']+enlarged.width, p['y']+enlarged.height)).tobytes() == expected.tobytes(), ('stale r2 coherence cell', p)
        assert p['accepted'] == (p['id'] in m['baseline'][p['kind']]['files']), ('mislabelled accepted neighbour', p)
        key = (p['new_id'], p['scale'], p['background'])
        if key not in paired:
            paired[key] = []
        paired[key].append(p)
    for record in m['new']:
        for scale, background in ((1, '#000000'), (1, '#000055'), (4, '#181820')):
            cells = sorted(paired[(record['id'], scale, background)], key=lambda p: p['x'])
            assert [p['accepted'] for p in cells] == [True, False, True], (record['id'], scale, 'missing direct neighbours')
            assert all(p['kind'] == record['kind'] for p in cells), record['id']
    validation_path = ROOT / 'docs/art/v2-new-art-validation.json'
    validation = json.loads(validation_path.read_text())
    validation['pixel_quality_r2'] = audited
    validation['checks'] += ['every new icon opaque bbox long side >= 11px', 'every new asset isolated pixels <= both same-kind and overall accepted medians', 'fresh before/after noise/fill ledger and editorial noise metric', 'maximum three ramp steps per material', 'direct accepted/new/accepted neighbours at 1x on black/navy and 4x, exact pixels']
    validation_path.write_text(json.dumps(validation, indent=2)+'\n')
    icon_count = sum(r['kind'] in ('relics', 'potions') for r in audited)
    print(f'PASS R2: {len(audited)} noise budgets, {icon_count} inventory fill checks, all directly adjacent native/4x coherence cells', flush=True)


def main() -> None:
    ledger(after=True)
    scores=json.loads((WORK/"scores.json").read_text())
    for kind in KINDS:
        records=scores[kind]
        assert all(min(r["after"]) >= 3 for r in records), kind
        changed=[]
        before_ids={p.name for p in paths(kind,WORK/"before")}
        assert {p.name for p in paths(kind)} == before_ids,kind
        for p in paths(kind):
            im=Image.open(p)
            expected=(640,360) if kind=="backdrops" else (32,24) if kind=="cards" else (16,16)
            assert im.size==expected,(p,im.size)
            assert im.mode==("RGB" if kind=="backdrops" else "RGBA"),(p,im.mode)
            a=np.array(im.convert("RGBA")); visible=a[:,:,3]>0
            assert np.all(a[visible,:3]%85==0),p
            assert set(np.unique(a[:,:,3])) <= {0,255},p
            assert visible.any(),p
            cap=16 if kind=="cards" else 24 if kind=="backdrops" else 8
            if p.stem in SELECTED[kind]:cap=10 if kind=="cards" else 16 if kind=="backdrops" else 8
            if kind=="cards" and p.stem in REVISED[kind]:cap=16
            assert len(np.unique(a[visible,:3],axis=0))<=cap,p
            if kind!="backdrops":
                assert np.all(a[~visible]==0),p
                assert np.any(np.all(a[visible,:3]==0,axis=1)),p
            else:
                assert np.all(a[:,:,3]==255),p
                preview=Image.open(p.with_name(p.stem+"@2x.png"))
                assert preview.tobytes()==im.resize((1280,720),Image.Resampling.NEAREST).tobytes(),p
            old=Image.open(WORK/"before"/kind/p.name).convert("RGBA")
            if old.tobytes()!=im.convert("RGBA").tobytes():changed.append(p.stem)
        assert set(changed)==set(SELECTED[kind]),(kind,changed)
        if kind!="backdrops":
            metadata_path=directory(kind).parent/f"{kind}-atlas.json"
            assert metadata_path.read_bytes()==(WORK/"before"/f"{kind}-atlas.json").read_bytes(),kind
            atlas=Image.open(directory(kind).parent/f"{kind}-atlas.png").convert("RGBA")
            for name,f in json.loads(metadata_path.read_text())["frames"].items():
                assert atlas.crop((f["x"],f["y"],f["x"]+f["w"],f["y"]+f["h"])).tobytes()==Image.open(directory(kind)/f"{name}.png").convert("RGBA").tobytes(),name
        # Confirm the final full-set sheets are current, at their stated scale.
        items=paths(kind)
        for scale in (1,4):
            sheet_path=DOC/f"ui-after-{kind}-{scale}x.png"
            sheet=Image.open(sheet_path)
            if kind in ("cards", "relics"):
                assert (DOC/f"ui-final-{kind}-{scale}x.png").read_bytes()==sheet_path.read_bytes(), (kind,scale)
            w,h=Image.open(items[0]).size
            cw,ch=max(w*scale+16,150),h*scale+40
            cols=1 if kind=="backdrops" else 8
            for i,p in enumerate(items):
                im=Image.open(p).convert("RGBA").resize((w*scale,h*scale),Image.Resampling.NEAREST)
                expected_tile=Image.new("RGB",im.size,"#181820")
                expected_tile.paste(im,(0,0),im)
                x=(i%cols)*cw+(cw-w*scale)//2;y=(i//cols)*ch+4
                assert sheet.crop((x,y,x+w*scale,y+h*scale)).tobytes()==expected_tile.tobytes(),(p,scale)
        print(f"PASS {kind}: {len(items)} assets, {len(changed)} changed, palette/size/alpha/previews/contacts/atlas verified",flush=True)
    validate_round()
    print("PASS complete score ledger, updated sheets, original detail and atlas contracts",flush=True)


if __name__=="__main__":
    if '--v2' in sys.argv or ((DOC/'v2-new-art-manifest.json').exists() and '--round2' not in sys.argv):
        from v2_validate import validate
        validate()
        validate_new_pixel_quality()
    else:
        main()
