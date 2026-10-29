"""Centre-crop a landscape, recover its pixel pitch, and export an SMS backdrop."""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from postprocess import detect_grid, edge_histograms, phase, positive, quantize_sms, sample_centres


def crop_box(size: tuple[int, int], width: int, height: int) -> tuple[int, int, int, int]:
    if width < 1 or height < 1:
        raise ValueError("target dimensions must be positive")
    sw, sh = size
    if sw * height > sh * width:
        cw, ch = round(sh * width / height), sh
    else:
        cw, ch = sw, round(sw * height / width)
    x, y = (sw - cw) // 2, (sh - ch) // 2
    return x, y, x + cw, y + ch


def build(source: Path, output: Path, width: int = 640, height: int = 360,
          colors: int = 24, pitch: str = "auto") -> dict:
    preview = output.with_name(f"{output.stem}@2x.png")
    report_path = output.with_suffix(".json")
    if source.resolve() in {output.resolve(), preview.resolve(), report_path.resolve()}:
        raise ValueError("source must differ from outputs")
    if not 1 <= colors <= 24:
        raise ValueError("backdrops allow at most 24 SMS colours")
    with Image.open(source) as opened:
        if opened.format != "PNG":
            raise ValueError("backdrop source must be PNG")
        original = opened.convert("RGBA")
    if original.getchannel("A").getextrema() != (255, 255):
        raise ValueError("backdrops must be fully opaque")
    box = crop_box(original.size, width, height)
    rgba = np.array(original.crop(box))
    print(f"crop: {original.size} -> {box}", flush=True)
    if pitch == "auto":
        step, px, py, score = detect_grid(rgba)
    else:
        step = float(pitch)
        if not np.isfinite(step) or not 1 <= step <= min(rgba.shape[:2]):
            raise ValueError("pitch must be auto or finite and within cropped input size")
        hx, hy = edge_histograms(rgba)
        px, py = (0.0, 0.0) if step == 1 else (phase(hx, step), phase(hy, step))
        score = None
    recovered = sample_centres(rgba, step, px, py)
    result = recovered.resize((width, height), Image.Resampling.NEAREST)
    result, count = quantize_sms(result, colors)
    output.parent.mkdir(parents=True, exist_ok=True)
    result.convert("RGB").save(output)
    result.convert("RGB").resize((width * 2, height * 2), Image.Resampling.NEAREST).save(preview)
    report = {"source": str(source), "source_size": list(original.size), "crop": list(box),
              "pitch": round(step, 3), "phase": [round(px, 3), round(py, 3)], "grid_score": score,
              "recovered_size": list(recovered.size), "size": [width, height], "colors": count,
              "output": str(output), "preview": str(preview)}
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report), flush=True)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--width", type=positive, default=640)
    parser.add_argument("--height", type=positive, default=360)
    parser.add_argument("--colors", type=positive, default=24)
    parser.add_argument("--pitch", default="auto")
    args = parser.parse_args()
    build(args.input, args.output, args.width, args.height, args.colors, args.pitch)
