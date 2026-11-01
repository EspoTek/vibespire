"""Native-pixel noise and silhouette measurements, shared by review and validation."""
from collections import deque
from statistics import median

import numpy as np
from PIL import Image

from v2_art import ROOT


def components(mask: np.ndarray) -> list[list[tuple[int, int]]]:
    """Eight-connected components. Diagonal runs belong to the same cluster."""
    seen = np.zeros(mask.shape, dtype=bool)
    result = []
    height, width = mask.shape
    for y, x in zip(*np.where(mask)):
        if seen[y, x]:
            continue
        cluster = []
        queue = deque([(int(y), int(x))])
        seen[y, x] = True
        while queue:
            yy, xx = queue.popleft()
            cluster.append((yy, xx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = yy + dy, xx + dx
                    if (0 <= ny < height and 0 <= nx < width
                            and mask[ny, nx] and not seen[ny, nx]):
                        seen[ny, nx] = True
                        queue.append((ny, nx))
        result.append(cluster)
    return result


def measurements(image: Image.Image) -> dict:
    """Count every opaque pixel without an identical RGBA eight-neighbour.

    Includes black and deliberate highlights; no subjective exemptions. Also
    report pixels in two-pixel colour clusters and detached silhouette crumbs.
    Bbox is alpha-only, so transparent RGB cannot inflate the fill check.
    """
    rgba = np.array(image.convert('RGBA'))
    visible = rgba[:, :, 3] > 0
    box = image.convert('RGBA').getchannel('A').getbbox()
    if box is None:
        raise ValueError('cannot measure an empty sprite')
    isolated = pairs = 0
    for color in np.unique(rgba[visible], axis=0):
        for cluster in components(visible & np.all(rgba == color, axis=2)):
            if len(cluster) == 1:
                isolated += 1
            if len(cluster) == 2:
                pairs += 2
    width, height = box[2] - box[0], box[3] - box[1]
    opaque = int(visible.sum())
    return {
        'isolated_pixels': isolated,
        'two_pixel_cluster_pixels': pairs,
        'detached_crumb_pixels': sum(len(c) for c in components(visible) if len(c) <= 2),
        'opaque_bbox': list(box),
        'opaque_bbox_size': [width, height],
        'opaque_bbox_long_side': max(width, height),
        'opaque_pixels': opaque,
        'cell_fill_ratio': opaque / visible.size,
        'bbox_fill_ratio': opaque / (width * height),
    }


def accepted_metrics(manifest: dict) -> dict:
    result = {}
    for kind in ('cards', 'relics', 'potions'):
        assets = [
            {'id': name, **measurements(Image.open(ROOT / f'public/assets/sprites/{kind}/{name}.png'))}
            for name in manifest['baseline'][kind]['files']
        ]
        result[kind] = {
            'isolated_pixels_median': median(a['isolated_pixels'] for a in assets),
            'two_pixel_cluster_pixels_median': median(a['two_pixel_cluster_pixels'] for a in assets),
            'cell_fill_ratio_median': median(a['cell_fill_ratio'] for a in assets),
            'opaque_bbox_long_side_median': median(a['opaque_bbox_long_side'] for a in assets),
            'assets': assets,
        }
    return result
