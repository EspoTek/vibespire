"""Process three class busts and derive palette-limited nearest-neighbour 32px art."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

from postprocess import process, quantize_sms
from preview import checker


def build(raw: Path, output: Path, preview: Path) -> None:
    preview.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (672, 3 * 296), "#1e2030")
    draw = ImageDraw.Draw(sheet)
    for index, name in enumerate(("breaker", "graft", "chronist")):
        target = output / f"{name}.png"
        record = process(raw / f"{name}.png", target, size=64, colors=16)
        with Image.open(target) as opened:
            full, _ = quantize_sms(opened.convert("RGBA"), 16)
        small, count = quantize_sms(full.resize((32, 32), Image.Resampling.NEAREST), 16)
        small.save(output / f"{name}@32.png")
        full.resize((256, 256), Image.Resampling.NEAREST).save(preview / f"{name}@4x.png")
        small.resize((256, 256), Image.Resampling.NEAREST).save(preview / f"{name}@32@8x.png")
        record["small_colors"] = count
        (preview / f"{name}.json").write_text(json.dumps(record, indent=2) + "\n")
        y = index * 296
        for x, asset in ((8, full), (280, small)):
            tile = checker((256, 256))
            tile.alpha_composite(asset.resize((256, 256), Image.Resampling.NEAREST))
            sheet.paste(tile.convert("RGB"), (x, y))
        sheet.paste(full, (552, y + 192), full)
        sheet.paste(small, (624, y + 224), small)
        draw.text((8, y + 264), f"{name}: 64x64 at 4x / 32x32 at 8x / native sizes", fill="white")
    sheet.save(preview / "contact.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("preview", type=Path)
    args = parser.parse_args()
    build(args.raw, args.output, args.preview)
