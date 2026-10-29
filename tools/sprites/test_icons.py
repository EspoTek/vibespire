"""Regression checks for small icon slicing and the original card default."""
import argparse
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image, ImageDraw

from grid import build, cell_dimensions


class IconGridTests(unittest.TestCase):
    def test_per_cell_auto_pitch_square_outline_and_color_cap(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            sheet = Image.new('RGB', (256, 128), '#ff00ff')
            for i, step in enumerate((6, 8)):
                icon = Image.new('RGB', (16, 16), '#ff00ff')
                draw = ImageDraw.Draw(icon)
                draw.rectangle((3, 2, 12, 13), fill='black')
                for y in range(3, 13):
                    for x in range(4, 12):
                        draw.point((x, y), fill=((x % 4) * 85, (y % 4) * 85, 85))
                icon = icon.resize((16 * step, 16 * step), Image.Resampling.NEAREST)
                sheet.paste(icon, (i * 128 + (128 - icon.width) // 2, (128 - icon.height) // 2))
            sheet.save(root / 'source.png')
            report = build(root / 'source.png', root / 'out', 2, 1, ['a', 'b'], cell_out=(16, 16))
            self.assertNotEqual(report['cells'][0]['pitch'], report['cells'][1]['pitch'])
            for record, expected in zip(report['cells'], (6, 8)):
                self.assertAlmostEqual(record['pitch'], expected, delta=.05)
                self.assertLessEqual(record['colors'], 8)
                with Image.open(record['output']) as icon:
                    self.assertEqual(icon.size, (16, 16))
                    self.assertEqual(icon.getbbox(), (1, 0, 15, 16))
                    self.assertTrue(np.all(np.array(icon)[:, :, :3] % 85 == 0))
            report = build(root / 'source.png', root / 'cards', 2, 1, ['a', 'b'])
            self.assertEqual(report['cells'][0]['size'], [32, 24])
            with Image.open(root / 'cards/a.png') as card:
                self.assertEqual(card.size, (32, 24))
                self.assertIsNotNone(card.getbbox())

    def test_dimensions(self):
        self.assertEqual(cell_dimensions('16x16'), (16, 16))
        self.assertEqual(cell_dimensions('32x24'), (32, 24))
        for value in ('0x16', '16', '-1x16', '2x2'):
            with self.assertRaises(argparse.ArgumentTypeError):
                cell_dimensions(value)


if __name__ == '__main__':
    unittest.main(verbosity=2)
