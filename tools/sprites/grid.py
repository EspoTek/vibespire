"""Slice a generated icon grid, recover pixels, and export crop-safe card art or sized icons."""

import argparse
import json
from pathlib import Path
import re
import tempfile

import numpy as np
from PIL import Image, ImageDraw

from postprocess import positive, process, quantize_sms
from preview import checker


def axis_cells(key: np.ndarray, count: int, axis: int) -> tuple[list[tuple[int, int]], str]:
    """Find near-nominal full-length gutters; equal division is an explicit fallback.

    A gutter is fully keyed along its length. Search within 20% of a cell of
    each expected divider. Outer margins stay in the cells for chroma keying.
    """
    length = key.shape[axis]
    if length < count * 8:
        raise ValueError("grid cells must be at least 8 source pixels wide/high")
    coverage = key.mean(axis=1 - axis)
    flat = coverage == 1
    changes = np.diff(np.pad(flat.astype(int), (1, 1)))
    runs = list(zip(np.flatnonzero(changes == 1), np.flatnonzero(changes == -1)))
    dividers = []
    for index in range(1, count):
        expected = length * index / count
        radius = length / count * 0.2
        candidates = [(int(a), int(b)) for a, b in runs
                      if b - a >= 2 and abs((a + b) / 2 - expected) <= radius]
        if not candidates:
            edges = [round(length * i / count) for i in range(count + 1)]
            return list(zip(edges[:-1], edges[1:])), "equal"
        dividers.append(min(candidates, key=lambda ab: abs(sum(ab) / 2 - expected)))
    starts = [0] + [b for _, b in dividers]
    ends = [a for a, _ in dividers] + [length]
    if any(b - a < 8 for a, b in zip(starts, ends)):
        raise ValueError("overlapping gutters leave an empty or tiny cell")
    return list(zip(starts, ends)), "magenta-gutters"


def card_crop(square: Image.Image) -> Image.Image:
    """Keep a 4px guard at top/bottom before the required centre crop.

    Tall icons fitted by process() would otherwise lose their tips. Fit the
    recovered outlined subject into a 32x24 safe area on the 32x32 square.
    Wide subjects already in that safe area retain their original pixels.
    """
    bbox = square.getbbox()
    if bbox is None:
        raise ValueError("empty processed card")
    subject = square.crop(bbox)
    scale = min(1, 32 / subject.width, 24 / subject.height)
    subject = subject.resize((max(1, round(subject.width * scale)),
                              max(1, round(subject.height * scale))), Image.Resampling.NEAREST)
    safe = Image.new("RGBA", (32, 32))
    safe.paste(subject, ((32 - subject.width) // 2, (32 - subject.height) // 2))
    cropped, _ = quantize_sms(safe.crop((0, 4, 32, 28)), 16)
    return cropped


def cell_dimensions(value: str) -> tuple[int, int]:
    if not re.fullmatch(r"[1-9][0-9]*[xX][1-9][0-9]*", value):
        raise argparse.ArgumentTypeError("expected positive WxH, e.g. 16x16")
    width, height = map(int, value.lower().split("x"))
    if min(width, height) < 3:
        raise argparse.ArgumentTypeError("cell dimensions must each be at least 3")
    return width, height


def build(source: Path, output: Path, cols: int, rows: int, names: list[str],
          pitch: str = "auto", cell_out: tuple[int, int] = (32, 24)) -> dict:
    width, height = cell_dimensions(f"{cell_out[0]}x{cell_out[1]}")
    icon_output = (width, height) != (32, 24)
    color_limit = 8 if icon_output else 16
    tile_w, tile_h = max(176, width * 4 + width + 24), max(160, height * 4 + 56)
    if cols < 1 or rows < 1 or len(names) != cols * rows:
        raise ValueError("provide exactly cols * rows names, in row-major order")
    if len(set(names)) != len(names) or any(
            not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]*", name)
            or name.lower() == "contact" for name in names):
        raise ValueError("names must be unique safe filename stems; 'contact' is reserved")
    destinations = [output / f"{name}.png" for name in names]
    if source.resolve() in {p.resolve() for p in destinations + [output / "contact.png"]}:
        raise ValueError("source must differ from outputs")
    with Image.open(source) as opened:
        if opened.format != "PNG":
            raise ValueError("grid source must be PNG")
        original = opened.convert("RGBA")
    array = np.array(original)
    key = (np.linalg.norm(array[:, :, :3].astype(float) - (255, 0, 255), axis=2) <= 80)
    key |= array[:, :, 3] == 0
    xs, x_mode = axis_cells(key, cols, 1)
    ys, y_mode = axis_cells(key, rows, 0)
    output.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (cols * tile_w, rows * tile_h), "#1e2030")
    draw = ImageDraw.Draw(sheet)
    records = []
    with tempfile.TemporaryDirectory(prefix="vibespire-grid-") as temp:
        root = Path(temp)
        for index, (name, destination) in enumerate(zip(names, destinations)):
            row, col = divmod(index, cols)
            box = (xs[col][0], ys[row][0], xs[col][1], ys[row][1])
            cell = root / f"{name}-source.png"
            square = root / f"{name}-square.png"
            original.crop(box).save(cell)
            print(f"cell {index + 1}/{len(names)}: {name}, box={box}", flush=True)
            record = process(cell, square, size=max(width, height), pitch=pitch, colors=color_limit)
            with Image.open(square) as opened:
                recovered = opened.convert("RGBA")
                if icon_output:
                    bbox = recovered.getbbox()
                    if bbox is None:
                        raise ValueError(f"empty processed icon: {name}")
                    subject = recovered.crop(bbox)
                    scale = min(1, width / subject.width, height / subject.height)
                    if scale < 1:
                        subject = subject.resize((max(1, round(subject.width * scale)),
                                                  max(1, round(subject.height * scale))),
                                                 Image.Resampling.NEAREST)
                    card = Image.new("RGBA", (width, height))
                    card.paste(subject, ((width - subject.width) // 2,
                                         (height - subject.height) // 2))
                else:
                    card = card_crop(recovered)
            card.save(destination)
            background = checker((width * 4, height * 4))
            background.alpha_composite(card.resize((width * 4, height * 4), Image.Resampling.NEAREST))
            x, y = col * tile_w + 8, row * tile_h + 8
            sheet.paste(background.convert("RGB"), (x, y))
            sheet.paste(card, (x + width * 4 + 8, y + height * 3), card)
            draw.text((x, y + height * 4 + 8), name, fill="white")
            pixels = np.array(card)
            count = len(np.unique(pixels[pixels[:, :, 3] > 0, :3], axis=0))
            records.append({"name": name, "source_box": box, "pitch": record["pitch"],
                            "grid_score": record["grid_score"], "colors": count,
                            "output": str(destination), "size": [width, height]})
    sheet.save(output / "contact.png")
    report = {"source": str(source), "source_size": list(original.size), "cols": cols,
              "rows": rows, "x_detection": x_mode, "y_detection": y_mode, "cells": records}
    (output / "grid.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"wrote {len(names)} cells and {output / 'contact.png'}", flush=True)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--cols", type=positive, required=True)
    parser.add_argument("--rows", type=positive, required=True)
    parser.add_argument("--names", required=True, help="comma-separated row-major filename stems")
    parser.add_argument("--pitch", default="auto", help="auto or explicit per-cell source pixel pitch")
    parser.add_argument("--cell-out", type=cell_dimensions, default=(32, 24),
                        help="32x24 cards (default), or WxH icons such as 16x16 (8 colours)")
    args = parser.parse_args()
    build(args.input, args.output, args.cols, args.rows,
          [name.strip() for name in args.names.split(",")], args.pitch, args.cell_out)
