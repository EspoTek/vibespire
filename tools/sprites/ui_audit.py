"""V2 UI art inventory, immutable before snapshot, contacts and atlas validation.

Run with uv from tools/sprites. Only UI-owned assets and docs/art/ui-* outputs
are written; the baseline and intermediate reports live in /private/tmp.
"""
import argparse
import json
from math import ceil
from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from atlas import pack

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DOC = ROOT / "docs/art"
WORK = Path("/private/tmp/vibespire-ui-art")
KINDS = ("cards", "relics", "potions", "backdrops")


def directory(kind: str) -> Path:
    return ROOT / "public/assets" / (kind if kind == "backdrops" else f"sprites/{kind}")


def paths(kind: str, base: Path | None = None) -> list[Path]:
    folder = directory(kind) if base is None else base / kind
    return sorted(p for p in folder.glob("*.png") if "@" not in p.name)


def cards() -> dict:
    result = {}
    for name, cls in (("prompts_cards.json", "graft"),
                      ("prompts_cards_breaker.json", "breaker"),
                      ("prompts_cards_chronist.json", "chronist")):
        for card in json.loads((HERE / name).read_text())["cards"]:
            result[card["id"]] = dict(card, **{"class": card.get("class", cls)})
    # The content team renamed this existing frame before the v2 art audit.
    result["cinder_heart"] = dict(result["furnace_heart"], id="cinder_heart")
    return result


def inventory() -> dict:
    result = {}
    for kind in KINDS:
        rows = []
        for path in paths(kind):
            a = np.array(Image.open(path).convert("RGBA"))
            visible = a[:, :, 3] > 0
            rgb = a[visible, :3]
            y, x = np.where(visible)
            colors = np.unique(rgb, axis=0)
            rows.append({"id": path.stem, "size": [a.shape[1], a.shape[0]],
                         "colors": len(colors), "sms": bool(np.all(rgb % 85 == 0)),
                         "alpha": np.unique(a[:, :, 3]).tolist(),
                         "bbox": [int(x.min()), int(y.min()), int(x.max()+1), int(y.max()+1)],
                         "coverage": round(float(visible.mean()), 3)})
        result[kind] = rows
        print(f"inventory: {kind}: {len(rows)} assets", flush=True)
    return result


def contact(kind: str, phase: str, scale: int, subset: str | None = None) -> None:
    items = paths(kind, WORK / "before" if phase == "before" else None)
    if subset is not None:
        manifest = cards()
        items = [p for p in items if manifest[p.stem]["class"] == subset]
    w, h = Image.open(items[0]).size
    cols = 1 if kind == "backdrops" else 8
    cw, ch = max(w * scale + 16, 150), h * scale + 40
    sheet = Image.new("RGB", (cols * cw, ceil(len(items) / cols) * ch), "#181820")
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(items):
        x, y = i % cols * cw, i // cols * ch
        im = Image.open(path).convert("RGBA").resize((w * scale, h * scale), Image.Resampling.NEAREST)
        sheet.paste(im, (x + (cw - im.width)//2, y + 4), im)
        draw.text((x + 4, y + h * scale + 8), path.stem, fill="white", font_size=11)
    suffix = f"-{subset}" if subset else ""
    target = DOC / f"ui-{phase}-{kind}{suffix}-{scale}x.png"
    sheet.save(target)
    print(f"contact: {target.name} ({sheet.width}x{sheet.height})", flush=True)


def snapshot() -> None:
    target = WORK / "before"
    if target.exists():
        raise FileExistsError(f"Immutable baseline already exists: {target}")
    for kind in KINDS:
        (target / kind).mkdir(parents=True)
        for path in paths(kind):
            shutil.copyfile(path, target / kind / path.name)
        if kind != "backdrops":
            for ext in ("json", "png"):
                source = directory(kind).parent / f"{kind}-atlas.{ext}"
                shutil.copyfile(source, target / f"{kind}-atlas.{ext}")
    (WORK / "before-inventory.json").write_text(json.dumps(inventory(), indent=2) + "\n")


def rebuild() -> None:
    for kind in KINDS[:-1]:
        source = directory(kind)
        old = json.loads((WORK / "before" / f"{kind}-atlas.json").read_text())
        packed_path = WORK / f"{kind}-packed.png"
        metadata = pack(source, packed_path, WORK / f"{kind}-packed.json",
                        cell_w=32 if kind == "cards" else 16, cell_h=24 if kind == "cards" else 16)
        assert metadata.keys() == old.keys(), f"Atlas schema changed: {kind}"
        assert metadata["frames"].keys() == old["frames"].keys(), f"Atlas IDs changed: {kind}"
        # The pre-audit Cinder Heart rename retained its earlier physical slot.
        # Use pack() for input validation and pixel packing, then preserve all
        # baseline frame coordinates instead of relocating every following card.
        packed = Image.open(packed_path).convert("RGBA")
        original_size = Image.open(WORK / "before" / f"{kind}-atlas.png").size
        stable = Image.new("RGBA", original_size)
        for name, destination in old["frames"].items():
            origin = metadata["frames"][name]
            assert (origin["w"],origin["h"]) == (destination["w"],destination["h"]), name
            cell = packed.crop((origin["x"],origin["y"],origin["x"]+origin["w"],origin["y"]+origin["h"]))
            stable.paste(cell,(destination["x"],destination["y"]))
        stable.save(source.parent / f"{kind}-atlas.png")
        shutil.copyfile(WORK / "before" / f"{kind}-atlas.json", source.parent / f"{kind}-atlas.json")
        metadata = old
        atlas = Image.open(source.parent / f"{kind}-atlas.png").convert("RGBA")
        for name, f in metadata["frames"].items():
            sprite = Image.open(source / f"{name}.png").convert("RGBA")
            assert atlas.crop((f["x"], f["y"], f["x"]+f["w"], f["y"]+f["h"])).tobytes() == sprite.tobytes(), name
        print(f"verified {kind}: stable atlas contract, exact cell pixels", flush=True)


def comparisons() -> None:
    for group, kinds in (("cards", ("cards",)), ("icons", ("relics", "potions")),
                         ("backdrops", ("backdrops",))):
        changed = [(k, p) for k in kinds for p in paths(k)
                   if Image.open(p).convert("RGBA").tobytes() != Image.open(WORK/"before"/k/p.name).convert("RGBA").tobytes()]
        assert changed, group
        scale = 1 if group == "backdrops" else 4
        w, h = Image.open(changed[0][1]).size
        cw, ch = max(w*scale*2+44, 300), h*scale+44
        cols = 1 if group == "backdrops" else 4
        sheet = Image.new("RGB", (cw*cols, ch*ceil(len(changed)/cols)), "#181820")
        d = ImageDraw.Draw(sheet)
        for i, (kind, p) in enumerate(changed):
            x, y = (i%cols)*cw, (i//cols)*ch
            d.text((x+6, y+3), p.stem + "   BEFORE / AFTER", fill="white", font_size=11)
            for j, source in enumerate((WORK/"before"/kind/p.name, p)):
                im = Image.open(source).convert("RGBA").resize((w*scale, h*scale), Image.Resampling.NEAREST)
                sheet.paste(im, (x+8+j*(w*scale+20), y+23), im)
        sheet.save(DOC/f"ui-before-after-{group}.png")
        print(f"comparison {group}: {len(changed)} changed", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("snapshot", "before", "after", "rebuild", "compare", "inventory"))
    action = parser.parse_args().action
    DOC.mkdir(exist_ok=True)
    WORK.mkdir(exist_ok=True)
    if action == "snapshot":
        snapshot()
    elif action in ("before", "after"):
        for k in KINDS:
            for s in (1, 4):
                contact(k, action, s)
        for cls in ("breaker", "graft", "chronist", "colorless"):
            contact("cards", action, 4, cls)
    elif action == "rebuild":
        rebuild()
    elif action == "compare":
        comparisons()
    else:
        print(json.dumps(inventory(), indent=2))
