"""Noise adjacency and alpha bbox regression checks for the art acceptance gate."""
import unittest

from PIL import Image, ImageDraw

from ui_validate import validate_icon_fill
from v2_metrics import measurements


class PixelMetricsTest(unittest.TestCase):
    def test_same_colour_diagonal_run_is_not_isolated(self) -> None:
        image = Image.new('RGBA', (16, 16))
        draw = ImageDraw.Draw(image)
        draw.point((3, 3), fill='white')
        draw.point((4, 4), fill='white')
        draw.point((10, 10), fill='black')
        result = measurements(image)
        self.assertEqual(result['isolated_pixels'], 1)
        self.assertEqual(result['two_pixel_cluster_pixels'], 2)

    def test_different_colour_neighbours_are_both_isolated(self) -> None:
        image = Image.new('RGBA', (16, 16))
        draw = ImageDraw.Draw(image)
        draw.point((3, 3), fill='white')
        draw.point((4, 3), fill='black')
        self.assertEqual(measurements(image)['isolated_pixels'], 2)

    def test_fill_uses_alpha_and_accepts_exactly_eleven(self) -> None:
        # Hidden RGB outside the subject must not inflate the opaque bbox.
        image = Image.new('RGBA', (16, 16), (255, 255, 255, 0))
        draw = ImageDraw.Draw(image)
        draw.rectangle((3, 3, 12, 8), fill='black')
        with self.assertRaisesRegex(ValueError, '10px < 11px'):
            validate_icon_fill(image, 'too_small')
        draw.rectangle((3, 3, 13, 8), fill='black')
        self.assertEqual(validate_icon_fill(image, 'boundary')['opaque_bbox_long_side'], 11)

    def test_empty_sprite_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, 'empty sprite'):
            validate_icon_fill(Image.new('RGBA', (16, 16)), 'empty')


if __name__ == '__main__':
    unittest.main()
