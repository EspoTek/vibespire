"""Build exact nearest-neighbour 4x previews and a raw/processed contact sheet."""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


def checker(size: tuple[int, int]) -> Image.Image:
    background = Image.new("RGBA", size, "#34364a")
    draw = ImageDraw.Draw(background)
    for y in range(0, size[1], 16):
        for x in range(0, size[0], 16):
            if (x // 16 + y // 16) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill="#45485b")
    return background


def build(raw: Path, sprites: Path, output: Path) -> None:
    paths = sorted(sprites.glob("*.png"))
    if not paths:
        raise ValueError(f"no processed sprites in {sprites}")
    output.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (704, 64 + 304 * len(paths)), "#1e2030")
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 12), "VIBESPIRE / SMS sprite pipeline", fill="white")
    draw.text((16, 36), "RAW (1024 -> 256)", fill="#bbbbcc")
    draw.text((288, 36), "PROCESSED (64 -> 256)", fill="#bbbbcc")
    draw.text((576, 36), "NATIVE 64x64", fill="#bbbbcc")
    for index, path in enumerate(paths):
        y = 64 + index * 304
        with Image.open(raw / path.name) as opened:
            if opened.size != (1024, 1024):
                raise ValueError(f"raw input must be 1024x1024: {raw / path.name}")
            original = opened.convert("RGBA").resize((256, 256), Image.Resampling.NEAREST)
        with Image.open(path) as opened:
            if opened.size != (64, 64):
                raise ValueError(f"expected 64x64 processed sprite: {path}")
            sprite = opened.convert("RGBA")
        enlarged = sprite.resize((256, 256), Image.Resampling.NEAREST)
        enlarged.save(output / f"{path.stem}@4x.png")
        sheet.paste(original, (16, y))
        background = checker((256, 256))
        background.alpha_composite(enlarged)
        sheet.paste(background.convert("RGB"), (288, y))
        native = checker((64, 64))
        native.alpha_composite(sprite)
        sheet.paste(native.convert("RGB"), (576, y + 192))
        draw.text((16, y + 268), path.stem, fill="white")
        print(f"preview {index + 1}/{len(paths)}: {path.stem}", flush=True)
    sheet.save(output / "contact.png")
    print(f"wrote {output / 'contact.png'}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", type=Path)
    parser.add_argument("sprites", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.raw, args.sprites, args.output)
