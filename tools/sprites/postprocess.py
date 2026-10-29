"""Recover a generated pixel grid and produce a baseline-aligned SMS sprite."""

import argparse
import json
from pathlib import Path
import time

import numpy as np
from PIL import Image


def log(message: str) -> None:
    print(message, flush=True)


def positive(value: str) -> int:
    result = int(value)
    if result < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return result


def key_rgb(value: str) -> tuple[int, int, int]:
    if len(value) != 6:
        raise argparse.ArgumentTypeError("key must be six hex digits, e.g. FF00FF")
    try:
        channels = bytes.fromhex(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("key must be six hex digits") from error
    if len(channels) != 3:
        raise argparse.ArgumentTypeError("key must be six hex digits without whitespace")
    return channels[0], channels[1], channels[2]


def neighbours(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask, 1)
    return np.sum([padded[y:y + mask.shape[0], x:x + mask.shape[1]]
                   for y in range(3) for x in range(3) if (y, x) != (1, 1)], axis=0)


def chroma_key(rgba: np.ndarray, key: tuple[int, int, int], tolerance: float,
               halo_tolerance: float) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    distance = np.linalg.norm(rgb - np.array(key), axis=2)
    removed = (distance <= tolerance) | (rgba[:, :, 3] == 0)
    # Two source-pixel fringe passes. A loose match alone cannot delete interior
    # purple: at least three already-keyed neighbours must support its removal.
    for _ in range(2):
        removed |= (distance <= halo_tolerance) & (neighbours(removed) >= 3)
    result = rgba.copy()
    result[removed] = 0
    result[~removed, 3] = 255
    if not np.any(~removed):
        raise ValueError("chroma key removed all content; check --key/--tolerance")
    if not np.any(removed):
        raise ValueError("no transparent or keyed background found; check --key/--tolerance")
    log(f"key: removed {removed.sum():,}/{removed.size:,} pixels")
    return result


def edge_histograms(rgba: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    # Snap channels for detection only, suppressing mild generator colour noise.
    colors = np.rint(rgba[:, :, :3].astype(np.float32) / 85) * 85
    colors[rgba[:, :, 3] == 0] = -255
    horizontal = np.linalg.norm(np.diff(colors, axis=1), axis=2) >= 80
    vertical = np.linalg.norm(np.diff(colors, axis=0), axis=2) >= 80
    return np.pad(horizontal.sum(axis=0), (1, 0)), np.pad(vertical.sum(axis=1), (1, 0))


def periodic_scores(hist: np.ndarray, pitches: np.ndarray) -> np.ndarray:
    positions = np.arange(hist.size)
    # Fourier/phase concentration of colour-change positions: periodic boundaries
    # reinforce each other; unstructured noise cancels. Work in bounded batches.
    total = hist.sum()
    if total == 0:
        raise ValueError("no colour-change edges on one axis; cannot detect pitch")
    scores = []
    for batch in np.array_split(pitches, max(1, len(pitches) // 128)):
        waves = np.exp(2j * np.pi * positions[None, :] / batch[:, None])
        scores.extend(np.abs(waves @ hist) / total)
    return np.asarray(scores)


def phase(hist: np.ndarray, pitch: float) -> float:
    wave = np.exp(2j * np.pi * np.arange(hist.size) / pitch) @ hist
    return float((np.angle(wave) / (2 * np.pi) * pitch) % pitch)


def detect_grid(rgba: np.ndarray) -> tuple[float, float, float, float]:
    hx, hy = edge_histograms(rgba)
    candidates = np.arange(2.0, min(32.0, min(rgba.shape[:2]) / 4) + 0.005, 0.01)
    if len(candidates) < 3:
        raise ValueError("image too small for auto pitch; specify --pitch 1")
    scores = (periodic_scores(hx, candidates) + periodic_scores(hy, candidates)) / 2
    peaks = np.flatnonzero((scores[1:-1] >= scores[:-2]) & (scores[1:-1] >= scores[2:])) + 1
    peaks = np.unique(np.concatenate(([int(np.argmax(scores))], peaks)))
    # A half-pitch harmonic may also be strong. Prefer the largest periodic
    # lattice within 90% of the best score, rather than inventing finer pixels.
    selected = peaks[scores[peaks] >= scores.max() * 0.9][-1]
    pitch = float(candidates[selected])
    confidence = float(scores[selected])
    if confidence < 0.12:
        raise ValueError(f"no convincing uniform grid (score {confidence:.3f}); inspect source and use --pitch N")
    px, py = phase(hx, pitch), phase(hy, pitch)
    log(f"auto grid: pitch={pitch:.3f}, phase=({px:.3f},{py:.3f}), score={confidence:.3f}")
    if confidence < 0.3:
        log("WARNING: weak/irregular grid; inspect the preview before accepting")
    return pitch, px, py, confidence


def sample_centres(rgba: np.ndarray, pitch: float, px: float, py: float) -> Image.Image:
    def indices(length: int, offset: float) -> np.ndarray:
        centres = np.arange(offset - pitch / 2, length, pitch)
        return np.floor(centres[(centres >= 0) & (centres < length)]).astype(int)
    xs, ys = indices(rgba.shape[1], px), indices(rgba.shape[0], py)
    return Image.fromarray(rgba[ys[:, None], xs[None, :]])


def quantize_sms(image: Image.Image, limit: int) -> tuple[Image.Image, int]:
    rgba = np.array(image)
    visible = rgba[:, :, 3] > 0
    colors = (np.rint(rgba[visible, :3].astype(np.float32) / 85) * 85).astype(np.uint8)
    unique, inverse, counts = np.unique(colors, axis=0, return_inverse=True, return_counts=True)
    before = len(unique)
    # Merge the least-used colour into its nearest surviving neighbour, then
    # update usage. Preserve black outlines when a very small cap is requested.
    mapping = np.arange(len(unique))
    active = set(range(len(unique)))
    while len(active) > limit:
        removable = [i for i in active if np.any(unique[i] != 0)]
        rare = min(removable, key=lambda i: (counts[i], i))
        targets = sorted(active - {rare})
        distances = np.sum((unique[targets].astype(float) - unique[rare]) ** 2, axis=1)
        target = targets[int(np.argmin(distances))]
        mapping[mapping == rare] = target
        counts[target] += counts[rare]
        active.remove(rare)
    rgba[visible, :3] = unique[mapping[inverse]]
    rgba[~visible] = 0
    count = len(np.unique(rgba[visible, :3], axis=0))
    log(f"palette: {before} SMS colours -> {count} opaque colours (cap {limit})")
    return Image.fromarray(rgba), count


def add_outline(image: Image.Image, width: int) -> Image.Image:
    rgba = np.array(image)
    visible = rgba[:, :, 3] > 0
    expanded = visible.copy()
    for _ in range(width):
        expanded |= neighbours(expanded) > 0
    rgba[expanded & ~visible] = (0, 0, 0, 255)
    return Image.fromarray(rgba)


def process(source: Path, target: Path, *, size: int = 64, key=(255, 0, 255),
            pitch: str = "auto", colors: int = 16, tolerance: float = 80,
            halo_tolerance: float = 160, outline: int = 1) -> dict:
    started = time.monotonic()
    if size < 1 or not 1 <= colors <= 64:
        raise ValueError("size must be positive and colors must be in 1..64")
    if not 0 <= tolerance <= halo_tolerance <= 442:
        raise ValueError("require 0 <= tolerance <= halo_tolerance <=442")
    if outline not in (0, 1, 2) or size <= 2 * outline:
        raise ValueError("outline must be 0, 1 or 2 and size must exceed twice the outline")
    if source.resolve() == target.resolve():
        raise ValueError("input and output must be different files")
    with Image.open(source) as opened:
        if opened.format != "PNG":
            raise ValueError(f"expected PNG input: {source}")
        rgba = np.array(opened.convert("RGBA"))
    log(f"read: {source} ({rgba.shape[1]}x{rgba.shape[0]})")
    keyed = chroma_key(rgba, key, tolerance, halo_tolerance)
    source_bbox = Image.fromarray(keyed).getbbox()
    if pitch == "auto":
        step, px, py, confidence = detect_grid(keyed)
    else:
        step = float(pitch)
        if not np.isfinite(step) or step < 1 or step > min(rgba.shape[:2]):
            raise ValueError("--pitch must be auto or a finite number >=1 and <= input size")
        hx, hy = edge_histograms(keyed)
        px, py = (0.0, 0.0) if step == 1 else (phase(hx, step), phase(hy, step))
        confidence = None  # Explicit pitch has no detection confidence.
        log(f"explicit grid: pitch={step:.3f}, phase=({px:.3f},{py:.3f})")
    sampled = sample_centres(keyed, step, px, py)
    bbox = sampled.getbbox()
    if bbox is None:
        raise ValueError("grid sampling removed all content; check pitch")
    cropped = sampled.crop(bbox)
    interior = size - 2 * outline
    scale = interior / max(cropped.size)
    fitted_size = (max(1, min(interior, round(cropped.width * scale))),
                   max(1, min(interior, round(cropped.height * scale))))
    fitted = cropped.resize(fitted_size, Image.Resampling.NEAREST)
    result = Image.new("RGBA", (size, size))
    result.paste(fitted, ((size - fitted.width) // 2, size - outline - fitted.height))
    result = add_outline(result, outline)
    result, color_count = quantize_sms(result, colors)
    target.parent.mkdir(parents=True, exist_ok=True)
    result.save(target)
    report = {"input": str(source), "output": str(target), "input_size": [rgba.shape[1], rgba.shape[0]],
              "pitch": round(step, 3), "phase": [round(px, 3), round(py, 3)],
              "grid_score": confidence, "source_bbox": source_bbox, "grid_size": list(sampled.size),
              "grid_content_bbox": bbox, "bbox": result.getbbox(), "size": size,
              "colors": color_count, "outline": outline,
              "elapsed_seconds": round(time.monotonic() - started, 3)}
    log(json.dumps(report))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--size", type=positive, default=64)
    parser.add_argument("--key", type=key_rgb, default=(255, 0, 255))
    parser.add_argument("--palette", choices=["sms"], default="sms")
    parser.add_argument("--pitch", default="auto", help="auto or source pixels per logical pixel (fractional accepted)")
    parser.add_argument("--colors", type=positive, default=16, help="opaque colour cap, 1..64; use 64 to disable reduction")
    parser.add_argument("--tolerance", type=float, default=80, help="RGB Euclidean key distance")
    parser.add_argument("--halo-tolerance", type=float, default=160)
    parser.add_argument("--outline", type=int, choices=(0, 1, 2), default=1,
                        help="add a logical-pixel black silhouette outline after fitting; 0 disables")
    parser.add_argument("--report", type=Path, help="also save machine-readable processing report")
    args = parser.parse_args()
    if args.colors > 64 or not 0 <= args.tolerance <= args.halo_tolerance <= 442:
        parser.error("require --colors <=64 and 0 <= tolerance <= halo-tolerance <=442")
    if args.report and args.report.resolve() in {args.input.resolve(), args.output.resolve()}:
        parser.error("--report must differ from both input and output")
    report = process(args.input, args.output, size=args.size, key=args.key, pitch=args.pitch,
                     colors=args.colors, tolerance=args.tolerance, halo_tolerance=args.halo_tolerance,
                     outline=args.outline)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
