"""Preserve a native generator PNG and normalize the pipeline input to 1024 square."""

import argparse
from pathlib import Path
import shutil

from PIL import Image


def ingest(source: Path, output: Path) -> None:
    native = output.parent / "native" / output.name
    if source.resolve() in {output.resolve(), native.resolve()}:
        raise ValueError("source must differ from both normalized and native destinations")
    if output.exists() or native.exists():
        raise FileExistsError(f"destination already exists: {output} or {native}; use a new name")
    with Image.open(source) as opened:
        if opened.format != "PNG" or opened.width != opened.height:
            raise ValueError(f"expected a square generator PNG: {source}")
        normalized = opened.convert("RGBA").resize((1024, 1024), Image.Resampling.NEAREST)
        native_size = opened.size
    native.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, native)
    normalized.save(output)
    print(f"preserved {native_size} original: {native}; wrote 1024x1024: {output}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    ingest(args.input, args.output)
