"""Synthetic grid recovery, transparency, palette, and atlas contract checks."""

import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

from atlas import pack
from postprocess import chroma_key, detect_grid, process, quantize_sms, sample_centres


class PipelineTests(unittest.TestCase):
    def test_recovers_shifted_grid_and_centres(self):
        rng = np.random.default_rng(14)
        logical = rng.integers(0, 4, (24, 24, 3), dtype=np.uint8) * 85
        logical = np.dstack((logical, np.full((24, 24), 255, dtype=np.uint8)))
        enlarged = np.array(Image.fromarray(logical).resize((192, 192), Image.Resampling.NEAREST))
        shifted = np.pad(enlarged, ((3, 0), (5, 0), (0, 0)))
        pitch, px, py, score = detect_grid(shifted)
        self.assertAlmostEqual(pitch, 8, delta=0.03)
        self.assertGreater(score, 0.9)
        recovered = np.array(sample_centres(shifted, pitch, px, py))
        np.testing.assert_array_equal(recovered[-24:, -24:], logical)

    def test_halo_needs_background_neighbours(self):
        rgba = np.full((12, 12, 4), (255, 0, 255, 255), dtype=np.uint8)
        rgba[2:10, 2:10] = (255, 0, 130, 255)
        keyed = chroma_key(rgba, (255, 0, 255), 80, 160)
        self.assertEqual(keyed[2, 2, 3], 0)
        self.assertEqual(keyed[5, 5, 3], 255)
        self.assertEqual(keyed[0, 0, 3], 0)

    def test_palette_and_baseline(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = Image.new("RGB", (80, 80), "magenta")
            source.paste(Image.new("RGB", (40, 60), "#1668b9"), (20, 10))
            source.save(root / "in.png")
            report = process(root / "in.png", root / "out.png", pitch="1", colors=4)
            with Image.open(root / "out.png") as output:
                array = np.array(output)
                self.assertEqual(output.size, (64, 64))
                self.assertEqual(output.getbbox(), (10, 0, 53, 64))
                self.assertTrue(np.all(array[:, :, 3][-1, 10:53] == 255))
                self.assertTrue(np.all(array[:, :, :3] % 85 == 0))
                self.assertEqual(set(np.unique(array[:, :, 3])), {0, 255})
            self.assertEqual(report["colors"], 2)
            self.assertTrue(np.all(array[-1, 10:53, :3] == 0))

    def test_rare_colours_merge_without_losing_black(self):
        rng = np.random.default_rng(9)
        rgba = rng.integers(0, 256, (16, 16, 4), dtype=np.uint8)
        rgba[:, :, 3] = 255
        rgba[0, 0, :3] = 0
        result, count = quantize_sms(Image.fromarray(rgba), 8)
        self.assertLessEqual(count, 8)
        self.assertIn((0, 0, 0), map(tuple, np.array(result)[:, :, :3].reshape(-1, 3)))

    def test_atlas_frames_match_pixels_and_reruns(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            Image.new("RGBA", (64, 64), "red").save(root / "z.png")
            Image.new("RGBA", (32, 32), "blue").save(root / "a.png")
            first = pack(root, root / "atlas.png", root / "atlas.json", 64)
            second = pack(root, root / "atlas.png", root / "atlas.json", 64)
            self.assertEqual(first, second)
            self.assertEqual(first, json.loads((root / "atlas.json").read_text()))
            self.assertEqual(first["frames"]["a"], {"x": 0, "y": 0, "w": 64, "h": 64})
            with Image.open(root / "atlas.png") as atlas:
                self.assertEqual(atlas.getpixel((16, 32)), (0, 0, 255, 255))
                self.assertEqual(atlas.getpixel((64, 0)), (255, 0, 0, 255))

    def test_rejects_empty_keyed_input_and_oversized_atlas_sprite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            Image.new("RGB", (128, 128), "magenta").save(root / "empty.png")
            with self.assertRaisesRegex(ValueError, "all content"):
                process(root / "empty.png", root / "out.png")
            with self.assertRaisesRegex(ValueError, "exceeds"):
                pack(root, root / "atlas.png", root / "atlas.json", 64)

    def test_delivered_assets_and_atlas_contract(self):
        project = Path(__file__).resolve().parent
        assets = project.parents[1] / "public/assets/sprites"
        names = {"armoured-scorpion", "jellyfish-spirit", "goblin", "stone-golem"}
        metadata = json.loads((assets / "enemies-atlas.json").read_text())
        self.assertEqual(set(metadata["frames"]), names)
        self.assertEqual(metadata["cell"], 64)
        with Image.open(assets / "enemies-atlas.png") as atlas:
            for name in sorted(names):
                with Image.open(assets / "enemies" / f"{name}.png") as sprite:
                    self.assertEqual(sprite.mode, "RGBA")
                    self.assertEqual(sprite.size, (64, 64))
                    bbox = sprite.getbbox()
                    assert bbox is not None, f"empty delivered sprite: {name}"
                    self.assertEqual(bbox[3], 64)
                    array = np.array(sprite)
                    visible = array[:, :, 3] > 0
                    self.assertEqual(set(np.unique(array[:, :, 3])), {0, 255})
                    self.assertTrue(np.all(array[~visible] == 0))
                    self.assertTrue(np.all(array[visible, :3] % 85 == 0))
                    self.assertLessEqual(len(np.unique(array[visible, :3], axis=0)), 16)
                    frame = metadata["frames"][name]
                    cell = atlas.crop((frame["x"], frame["y"], frame["x"] + frame["w"], frame["y"] + frame["h"]))
                    np.testing.assert_array_equal(np.array(cell), array)
                    with Image.open(project / "preview" / f"{name}@4x.png") as preview:
                        np.testing.assert_array_equal(np.array(preview), array.repeat(4, axis=0).repeat(4, axis=1))


if __name__ == "__main__":
    unittest.main(verbosity=2)
