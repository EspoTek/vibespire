"""Crop the accepted 64px identities, sample their features and clean at 32px.

Every output colour belongs to its own 64px master. No invented skin, hair,
stubble or costume shapes. Coordinates below are deliberate native-pixel edits.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/sprites/portraits'
LANDMARK_CROPS = {
    'breaker': (6, 2, 58, 54),
    'graft': (6, 2, 58, 54),
    'chronist': (6, 4, 58, 56),
}
CROPS = {kind: (10, 6, 54, 50) for kind in LANDMARK_CROPS}
# Keep the reference's flat skin midtone, original hair ramp and class materials.
MERGES = {
    'breaker': {'550055': '5500AA', '555500': 'AA5500',
                'AAAA00': 'AAAA55', 'AA5555': 'AA5500'},
    'graft': {'5500AA': '5500FF', '00AA00': '005500',
              '55FF00': '00FF00', '55FFFF': '00FFFF'},
    'chronist': {'550000': 'AA5500', 'FFFF55': 'FFFF00',
                 'AAFFFF': 'FFFFFF', '00AAFF': '00FFFF'},
}


class FeaturePen:
    """Place reviewed landmarks on the tighter crop, rounded to native pixels.

    Coordinates were first reviewed on the 52px crop. Reprojecting those
    landmarks preserves feature placement while the source is sampled once,
    directly from the tighter 44px master crop. Art is never double-resized.
    """
    def __init__(self, image, kind):
        self.draw = ImageDraw.Draw(image)
        self.old = LANDMARK_CROPS[kind]
        self.new = CROPS[kind]

    def point_xy(self, point):
        return tuple(round((self.old[i]+(point[i]+0.5)*52/32-self.new[i])*32/44-0.5)
                     for i in (0,1))

    def polygon(self, points, fill):
        self.draw.polygon([self.point_xy(p) for p in points], fill=fill)

    def line(self, points, fill):
        self.draw.line([self.point_xy(p) for p in points], fill=fill, width=1)

    def rectangle(self, box, fill):
        self.draw.rectangle([self.point_xy(box[:2]),self.point_xy(box[2:])], fill=fill)

    def point(self, point, fill):
        self.draw.point(self.point_xy(point), fill=fill)


def draw_portrait(kind):
    master = Image.open(OUT / f'{kind}.png').convert('RGBA')
    small = master.crop(CROPS[kind]).resize((32, 32), Image.Resampling.NEAREST)
    a = np.array(small)
    source = a.copy()
    for old, new in MERGES[kind].items():
        match = np.all(source[:, :, :3] == tuple(bytes.fromhex(old)), axis=2)
        a[match, :3] = tuple(bytes.fromhex(new))
    small = Image.fromarray(a)
    # Feature edits follow the cropped master's landmarks, not a shared face.
    d = FeaturePen(small,kind)
    ink = '#000000'
    if kind == 'breaker':
        skin = '#FFAA55'
        d.polygon([(11,21),(21,21),(21,24),(17,27),(12,25)], fill=skin)
        d.polygon([(10,11),(14,10),(17,9),(22,11),(22,17),
                   (22,19),(20,22),(17,24),(14,23),(11,20),(10,16)], fill=skin)
        d.rectangle((7,12,8,15), fill=skin)
        d.line([(9,12),(9,16)], fill='#AA5500')
        d.rectangle((11,11,14,11), fill=ink)
        d.rectangle((19,11,22,11), fill=ink)
        for x, pupil, iris in ((11,13,12),(19,20,21)):
            d.rectangle((x,12,x+3,13), fill='#FFFFFF')
            d.line([(iris,12),(iris,13)], fill='#0055AA')
            d.line([(pupil,12),(pupil,13)], fill=ink)
        d.point((22,10), fill='#FF5555')  # same small temple scar as the master
        d.line([(16,14),(16,16),(17,16)], fill='#AA5500')
        d.line([(14,19),(18,19)], fill=ink)
        d.line([(16,20),(17,20)], fill='#AA5500')
        # One neck shadow below a continuous clean chin, as in the reference.
        d.line([(12,25),(16,27),(20,25)], fill='#AA5500')
    elif kind == 'graft':
        skin = '#FFAAAA'
        d.polygon([(13,22),(21,22),(21,26),(18,29),(14,27)], fill=skin)
        d.polygon([(10,14),(13,14),(14,15),(17,13),(20,12),
                   (23,13),(23,18),(21,22),(18,24),(14,23),
                   (11,20),(10,18)], fill=skin)
        for x, pupil in ((10,12),(20,21)):
            d.line([(x,14),(x+3,14)], fill=ink)
            d.rectangle((x,15,x+3,16), fill='#FFFFFF')
            d.line([(pupil,15),(pupil,16)], fill=ink)
        d.line([(16,18),(16,19),(17,19)], fill='#FFAA55')
        d.line([(15,21),(18,21)], fill=ink)
        # Living vine follows the master's right cheek, never skin shading.
        d.line([(23,17),(22,18),(23,19),(22,20),(22,22)], fill='#005500')
        d.line([(23,17),(23,18)], fill='#00FF00')
        # Restore the teal forelock across the forehead, clear of the eye row.
        d.polygon([(14,10),(17,8),(17,11),(16,14),(15,13)], fill='#005555')
        d.line([(15,10),(16,9)], fill='#00AAAA')
    elif kind == 'chronist':
        skin = '#FFAA55'
        d.polygon([(10,11),(13,11),(15,12),(18,10),(22,11),
                   (24,15),(23,20),(20,23),(16,25),(12,23),
                   (10,20),(9,16)], fill=skin)
        d.line([(10,12),(13,12)], fill=ink)
        d.rectangle((10,13,13,14), fill='#FFFFFF')
        d.line([(12,13),(12,14)], fill='#000055')
        d.line([(16,15),(16,17),(17,17)], fill='#AA5500')
        d.line([(14,20),(18,20)], fill=ink)
        d.line([(16,21),(17,21)], fill='#AA5500')
        # Native ring repairs the cropped master's broken sampling phase.
        d.polygon([(20,12),(23,12),(24,13),(24,16),
                   (23,17),(20,17),(19,16),(19,13)], fill='#FFFF00')
        d.rectangle((20,13,23,16), fill='#00FFFF')
        d.line([(20,13),(21,13)], fill='#FFFFFF')
        d.line([(22,14),(22,15)], fill='#000055')
        d.line([(24,18),(24,21)], fill='#FFAA00')
        d.line([(18,11),(21,11)], fill=ink)
    else:
        raise ValueError(f'unknown portrait: {kind}')
    a = np.array(small)
    if kind == 'chronist':
        # The sampled lower jaw retained brown/olive shade islands that read
        # as stubble. Keep this native-pixel repair below the accepted mouth
        # and use the master's flat skin tone, preserving every other pixel.
        jaw = a[25:31, 7:23]
        stubble = (np.all(jaw[:, :, :3] == (170, 85, 0), axis=2)
                   | np.all(jaw[:, :, :3] == (85, 85, 0), axis=2))
        jaw[stubble, :3] = (255, 170, 85)
    a[a[:, :, 3] == 0] = 0
    result = Image.fromarray(a)
    master_colours = set(map(tuple, np.array(master).reshape(-1, 4)))
    if not set(map(tuple, a.reshape(-1, 4))) <= master_colours:
        raise ValueError(f'{kind}: HUD introduced a colour absent from its master')
    return result


def main():
    for kind in CROPS:
        im = draw_portrait(kind)
        im.save(OUT / f'{kind}@32.png')
        print(f'{kind}: master crop {CROPS[kind]} -> feature-cleaned 32px', flush=True)


if __name__ == '__main__':
    main()
