"""Pack PNG sprites, sorted by filename, into fixed transparent cells."""

import argparse
import json
from math import ceil, isqrt
from pathlib import Path

from PIL import Image

from postprocess import positive


def pack(directory: Path, output: Path, metadata: Path, cell: int = 64, *,
         cell_w: int | None = None, cell_h: int | None = None) -> dict:
    width = cell if cell_w is None else cell_w
    height = cell if cell_h is None else cell_h
    if min(width, height) < 1:
        raise ValueError("cell dimensions must be positive")
    if not directory.is_dir():
        raise ValueError(f"not a directory: {directory}")
    if output.resolve() == metadata.resolve():
        raise ValueError("atlas PNG and JSON must have different paths")
    # Exclude the destination so reruns cannot accidentally pack their own atlas.
    paths = sorted((p for p in directory.iterdir() if p.suffix.lower() == ".png"
                    and p.resolve() != output.resolve()), key=lambda p: p.name)
    if not paths:
        raise ValueError(f"no PNG sprites in {directory}")
    if len({p.stem for p in paths}) != len(paths):
        raise ValueError("duplicate frame names")
    if metadata.resolve() in {p.resolve() for p in paths}:
        raise ValueError("metadata would overwrite an input sprite")
    columns = isqrt(len(paths) - 1) + 1
    atlas = Image.new("RGBA", (columns * width, ceil(len(paths) / columns) * height))
    frames = {}
    for index, path in enumerate(paths):
        with Image.open(path) as opened:
            if opened.format != "PNG":
                raise ValueError(f"expected PNG: {path}")
            sprite = opened.convert("RGBA")
        if sprite.width > width or sprite.height > height:
            raise ValueError(f"{path}: {sprite.size} exceeds {width}x{height}; postprocess it first")
        x, y = index % columns * width, index // columns * height
        atlas.paste(sprite, (x + (width - sprite.width) // 2, y + height - sprite.height))
        frames[path.stem] = {"x": x, "y": y, "w": width, "h": height}
        print(f"pack {index + 1}/{len(paths)}: {path.name} -> ({x},{y})", flush=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    metadata.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output)
    result = {"frames": frames, "cell": width} if width == height else {
        "frames": frames, "cell_w": width, "cell_h": height}
    metadata.write_text(json.dumps(result, indent=2) + "\n")
    print(f"wrote {output} ({atlas.width}x{atlas.height}) and {metadata}", flush=True)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("metadata", type=Path)
    parser.add_argument("--cell", type=positive, default=64)
    parser.add_argument("--cell-w", type=positive)
    parser.add_argument("--cell-h", type=positive)
    args = parser.parse_args()
    pack(args.directory, args.output, args.metadata, args.cell,
         cell_w=args.cell_w, cell_h=args.cell_h)


if __name__ == "__main__":
    main()
