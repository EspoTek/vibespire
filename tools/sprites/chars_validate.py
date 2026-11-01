"""Validate production characters and the current mixed-size enemy atlas.

Run: cd tools/sprites && uv run python -m unittest -v chars_validate
The shared test_pipeline suite is also run separately; its historical four-enemy
fixture is outside the character agent's allowed edit scope.
"""
import hashlib
import json
from pathlib import Path
import unittest
import numpy as np
from PIL import Image
from chars_process import components
from chars_review import SNAP
from chars_cleanup import RESTORED, SMALL_CLEANED, original

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/assets/sprites'
REPAIRED={
    'assembly_frame','sickle_mantis','thornback','welded_horror',
    'cog_acolyte','hammer_warden','loom_oracle','riveter',
    'mirror_knight','phage_mother','void_geometer','lymph_warden',
    'gloam_empress','furnace_heart','grand_assembler','leukarch',
}
BOSSES={'bramble_ram','mother_orchid','gloam_empress','grand_assembler','furnace_heart','trihammer','tether_sovereign','star_archivist','leukarch'}


def pixels(path):
    with Image.open(path) as opened:
        if opened.mode!='RGBA':raise ValueError(f'expected RGBA: {path}')
        return np.array(opened)


class CharactersTest(unittest.TestCase):
    def test_all_46_canvases_palette_and_alpha(self):
        paths=sorted((ASSETS/'enemies').glob('*.png'))
        self.assertEqual(len(paths),46)
        for path in paths:
            with self.subTest(enemy=path.stem):
                a=pixels(path);size=96 if path.stem in BOSSES else 64
                self.assertEqual(a.shape,(size,size,4))
                visible=a[:,:,3]>0
                self.assertTrue(visible.any())
                self.assertTrue(np.isin(a[:,:,3],[0,255]).all())
                self.assertTrue(np.all(a[~visible]==0))
                self.assertTrue(np.all(a[visible,:3]%85==0))
                self.assertLessEqual(len(np.unique(a[visible,:3],axis=0)),15 if path.stem in REPAIRED | SMALL_CLEANED else 16)
                self.assertFalse(np.any(np.all(a[visible,:3]==[255,0,255],axis=1)))

    def test_repaired_black_edges_no_orphans_and_baselines(self):
        for name in sorted(REPAIRED | SMALL_CLEANED):
            with self.subTest(enemy=name):
                a=pixels(ASSETS/f'enemies/{name}.png');mask=a[:,:,3]>0
                if name in RESTORED | SMALL_CLEANED:
                    self.assertEqual(Image.fromarray(a).getbbox(),original(name).getbbox())
                else:
                    self.assertTrue(mask[-1].any(),'opaque feet/body must reach canvas baseline')
                self.assertTrue(all(len(c)>2 for c in components(mask)))
                pad=np.pad(mask,1);inside=mask.copy()
                for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)):
                    inside &= pad[1+dy:1+dy+len(mask),1+dx:1+dx+len(mask)]
                self.assertTrue(np.all(a[mask & ~inside,:3]==0),'every exposed edge must be black')

    def test_all_atlas_frames_match_real_source_pixels(self):
        metadata=json.loads((ASSETS/'enemies-atlas.json').read_text())
        self.assertEqual(set(metadata),{'frames','cell'})
        self.assertEqual(metadata['cell'],96)
        paths=sorted((ASSETS/'enemies').glob('*.png'))
        self.assertEqual(set(metadata['frames']),{p.stem for p in paths})
        atlas=Image.open(ASSETS/'enemies-atlas.png')
        for p in paths:
            with self.subTest(enemy=p.stem):
                f=metadata['frames'][p.stem];self.assertEqual(set(f),{'x','y','w','h'})
                size=96 if p.stem in BOSSES else 64
                self.assertEqual((f['w'],f['h']),(size,size))
                self.assertEqual((f['x']%96,f['y']%96),((96-size)//2,96-size))
                crop=atlas.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
                np.testing.assert_array_equal(np.array(crop),pixels(p))

    def test_hud_portraits_are_native_and_within_budget(self):
        for name in ('breaker','graft','chronist'):
            with self.subTest(portrait=name):
                small=pixels(ASSETS/f'portraits/{name}@32.png')
                self.assertEqual(small.shape,(32,32,4))
                visible=small[:,:,3]>0
                self.assertTrue(np.isin(small[:,:,3],[0,255]).all())
                self.assertTrue(np.all(small[visible,:3]%85==0))
                self.assertLessEqual(len(np.unique(small[visible,:3],axis=0)),12)
                self.assertFalse(np.array_equal(small,pixels(ASSETS/f'portraits/{name}.png')[1::2,1::2]))
                master=pixels(ASSETS/f'portraits/{name}.png')
                self.assertLessEqual(set(map(tuple,small[visible,:3])),
                                     set(map(tuple,master[master[:,:,3]>0,:3])))

    def test_cleanup_preserves_original_silhouette_and_structural_ink(self):
        for name in sorted(RESTORED | SMALL_CLEANED):
            with self.subTest(enemy=name):
                before=np.array(original(name));after=pixels(ASSETS/f'enemies/{name}.png')
                np.testing.assert_array_equal(before[:,:,3],after[:,:,3])
                np.testing.assert_array_equal(np.all(before[:,:,:3]==0,axis=2),
                                              np.all(after[:,:,:3]==0,axis=2))

    def test_session_changes_stay_within_selected_characters(self):
        # Baseline comparison is meaningful only while this task's saved
        # pre-edit snapshot exists. Other four checks remain portable.
        if not SNAP.is_dir():self.skipTest('session baseline is no longer available')
        for path in sorted((ASSETS/'enemies').glob('*.png')):
            same=hashlib.sha256(path.read_bytes()).digest()==hashlib.sha256((SNAP/'enemies'/path.name).read_bytes()).digest()
            self.assertEqual(same,path.stem not in REPAIRED | SMALL_CLEANED,path.stem)
        for name in ('breaker','graft','chronist'):
            self.assertEqual((ASSETS/f'portraits/{name}.png').read_bytes(),(SNAP/f'portraits/{name}.png').read_bytes())
        self.assertEqual((ASSETS/'enemies-atlas.json').read_bytes(),(SNAP/'enemies-atlas.json').read_bytes())


if __name__=='__main__':unittest.main(verbosity=2)
