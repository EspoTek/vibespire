"""Grid drift/crop safety and opaque landscape conversion contracts."""

from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

from backdrop import build as backdrop_build, crop_box
from grid import axis_cells, build as grid_build, card_crop


class ExpansionTests(unittest.TestCase):
    def test_gutters_follow_drift_without_eating_small_particles(self):
        key = np.zeros((60, 60), dtype=bool)
        key[:, 18:25] = True
        key[:, 38:43] = True
        # A single foreground pixel cannot be silently discarded as a gutter.
        key[10, 18] = False
        cells, mode = axis_cells(key, 3, 1)
        self.assertEqual(mode, "magenta-gutters")
        self.assertEqual(cells, [(0, 19), (25, 38), (43, 60)])

    def test_equal_division_when_no_global_gutter_exists(self):
        cells, mode = axis_cells(np.zeros((63, 65), dtype=bool), 4, 1)
        self.assertEqual(mode, "equal")
        self.assertEqual(cells, [(0, 16), (16, 32), (32, 49), (49, 65)])

    def test_tall_icon_survives_centre_crop(self):
        square = Image.new("RGBA", (32, 32))
        square.paste(Image.new("RGBA", (12, 32), "blue"), (10, 0))
        square.paste(Image.new("RGBA", (12, 3), "red"), (10, 0))
        square.paste(Image.new("RGBA", (12, 3), "lime"), (10, 29))
        card = card_crop(square)
        self.assertEqual(card.size, (32, 24))
        self.assertEqual(card.getpixel((16, 0)), (255, 0, 0, 255))
        self.assertEqual(card.getpixel((16, 23)), (0, 255, 0, 255))

    def test_grid_export_and_invalid_names(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = Image.new("RGB", (128, 128), "magenta")
            for x, y, color in ((8, 8, "red"), (80, 8, "blue"),
                                (8, 80, "lime"), (80, 80, "yellow")):
                source.paste(Image.new("RGB", (32, 32), color), (x, y))
            source.save(root / "source.png")
            report = grid_build(root / "source.png", root / "cards", 2, 2,
                                ["a", "b", "c", "d"], pitch="1")
            self.assertEqual(len(report["cells"]), 4)
            for name in ("a", "b", "c", "d"):
                with Image.open(root / f"cards/{name}.png") as card:
                    self.assertEqual(card.size, (32, 24))
            for names in (["a"] * 4, ["../a", "b", "c", "d"], ["contact", "b", "c", "d"]):
                with self.assertRaises(ValueError):
                    grid_build(root / "source.png", root / "cards", 2, 2, names)

    def test_backdrop_crop_palette_and_exact_preview(self):
        self.assertEqual(crop_box((1536, 1024), 640, 360), (0, 80, 1536, 944))
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            array = np.zeros((64, 96, 3), dtype=np.uint8)
            array[:, :48] = (13, 100, 7)
            array[:, 48:] = (7, 18, 130)
            Image.fromarray(array).save(root / "source.png")
            backdrop_build(root / "source.png", root / "out.png", 64, 36, colors=2, pitch="1")
            with Image.open(root / "out.png") as result:
                pixels = np.array(result)
                self.assertEqual(result.size, (64, 36))
                self.assertTrue(np.all(pixels % 85 == 0))
                self.assertLessEqual(len(np.unique(pixels.reshape(-1, 3), axis=0)), 2)
            with Image.open(root / "out@2x.png") as preview:
                np.testing.assert_array_equal(np.array(preview), pixels.repeat(2, 0).repeat(2, 1))
            Image.new("RGBA", (64, 64)).save(root / "alpha.png")
            with self.assertRaisesRegex(ValueError, "opaque"):
                backdrop_build(root / "alpha.png", root / "invalid.png")


if __name__ == "__main__":
    unittest.main(verbosity=2)
