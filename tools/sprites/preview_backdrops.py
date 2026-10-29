"""Validate the seven opaque backdrops and stack their exact 1x contact sheet."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


NAMES = (
    "act1_verdant", "act2_foundry", "act3_crown", "title_spire",
    "rest_site", "shop_interior", "event_generic",
)


def build(assets: Path, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    contact = Image.new("RGB", (640, 360 * len(NAMES)))
    rows = []
    for row, name in enumerate(NAMES):
        path = assets / f"{name}.png"
        with Image.open(path) as opened:
            if opened.format != "PNG" or opened.mode != "RGB" or opened.size != (640, 360):
                raise ValueError(f"{path}: expected opaque RGB PNG at 640x360")
            scene = opened.copy()
        pixels = np.array(scene)
        colors = np.unique(pixels.reshape(-1, 3), axis=0)
        if len(colors) > 24 or not np.all(colors % 85 == 0):
            raise ValueError(f"{path}: palette exceeds 24 SMS colours")
        with Image.open(assets / f"{name}@2x.png") as enlarged:
            expected = np.repeat(np.repeat(pixels, 2, axis=0), 2, axis=1)
            if enlarged.mode != "RGB" or not np.array_equal(np.array(enlarged), expected):
                raise ValueError(f"{name}: preview must be exact 2x NEAREST")
        report = json.loads(path.with_suffix(".json").read_text())
        if report["colors"] != len(colors) or report["size"] != [640, 360]:
            raise ValueError(f"{name}: processing report differs from image")
        middle = pixels[130:230, 160:480]
        central_colors, counts = np.unique(middle.reshape(-1, 3), axis=0, return_counts=True)
        dominant = int(np.argmax(counts))
        contact.paste(scene, (0, row * 360))
        rows.append({
            "name": name, "row": row, "y": row * 360,
            "size": [640, 360], "colors": len(colors),
            "palette": ["#" + "".join(f"{int(c):02X}" for c in rgb) for rgb in colors],
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "preview_exact_2x": True,
            "middle_rect": [160, 130, 480, 230],
            "middle_colors": len(central_colors),
            "middle_dominant_color": "#" + "".join(f"{int(c):02X}" for c in central_colors[dominant]),
            "middle_dominant_fraction": round(int(counts[dominant]) / len(middle.reshape(-1, 3)), 4),
            "pitch": report["pitch"], "grid_score": report["grid_score"],
            "recovered_size": report["recovered_size"],
        })
        print(f"validated {row + 1}/{len(NAMES)}: {name}, {len(colors)} colours", flush=True)
    contact.save(output / "contact.png")
    # Rebuild the existing comparison sheet and the Crown's y=200 acceptance view.
    enemies = {}
    for name in ("goblin", "jellyfish-spirit", "stone-golem"):
        with Image.open(assets.parent / "sprites" / "enemies" / f"{name}.png") as sprite:
            if sprite.mode != "RGBA" or sprite.size != (64, 64):
                raise ValueError(f"{name}: expected 64x64 RGBA test sprite")
            enemies[name] = sprite.resize((128, 128), Image.Resampling.NEAREST)
    contrast = contact.convert("RGBA")
    for row in range(len(NAMES)):
        for x, sprite in zip((128, 256, 384), enemies.values(), strict=True):
            contrast.alpha_composite(sprite, (x, row * 360 + 230 - 128))
    contrast.convert("RGB").save(output / "enemy-contrast.png")
    with Image.open(assets / "act3_crown.png") as scene:
        crown = scene.convert("RGBA")
    for x, name in ((176, "stone-golem"), (336, "jellyfish-spirit")):
        crown.alpha_composite(enemies[name], (x, 200 - 128))
    crown.convert("RGB").save(output / "act3-enemy-contrast.png")
    crown.convert("RGB").resize((1280, 720), Image.Resampling.NEAREST).save(
        output / "act3-enemy-contrast@2x.png")
    with Image.open(output / "contact.png") as saved:
        for row, name in enumerate(NAMES):
            with Image.open(assets / f"{name}.png") as scene:
                if saved.crop((0, row * 360, 640, (row + 1) * 360)).tobytes() != scene.tobytes():
                    raise ValueError(f"contact sheet row mismatch: {name}")
    (output / "validation.json").write_text(json.dumps({
        "contact_size": list(contact.size), "rows_match_assets": True,
        "middle_metrics_are_descriptive_not_a_visual_approval": True, "backdrops": rows,
    }, indent=2) + "\n")
    print(f"wrote {output / 'contact.png'} ({contact.width}x{contact.height})", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assets", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.assets, args.output)
