"""Install selected Graft/colourless cards, render contacts, validate and pack."""

import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw

from atlas import pack
from preview import checker


def main() -> None:
    root = Path(__file__).resolve().parent
    manifest_path = root / "prompts_cards.json"
    manifest = json.loads(manifest_path.read_text())
    destination = root.parent.parent / "public/assets/sprites/cards"
    preview = root / "preview/cards"
    selections = manifest["review"]["selected_alternates"]
    retries = manifest["review"]["retry_ids"]
    for card in manifest["cards"]:
        name = selections.get(card["id"], card["id"])
        sheet = "graft_04" if card["id"] in selections else card["sheet"]
        if card["id"] in retries:
            sheet = "fillup_01"
        source = preview / sheet / f"{name}.png"
        shutil.copyfile(source, destination / f"{card['id']}.png")
        card["selected"] = {"sheet": sheet, "name": name}
        with Image.open(source) as im:
            assert im.size == (32, 24) and im.mode == "RGBA", source
            pixels = np.array(im)
            opaque = pixels[:, :, 3] == 255
            assert opaque.any() and set(np.unique(pixels[:, :, 3])) <= {0, 255}, source
            assert set(np.unique(pixels[opaque, :3])) <= {0, 85, 170, 255}, source
            assert len(np.unique(pixels[opaque, :3], axis=0)) <= 16, source
    for cls in ("graft", "colorless"):
        cards = [c for c in manifest["cards"] if c["class"] == cls]
        contact = Image.new("RGB", (4 * 192, ((len(cards) + 3) // 4) * 136), "#1e2030")
        draw = ImageDraw.Draw(contact)
        for index, card in enumerate(cards):
            x, y = (index % 4) * 192 + 8, (index // 4) * 136 + 8
            with Image.open(destination / f"{card['id']}.png") as im:
                tile = checker((128, 96))
                tile.alpha_composite(im.resize((128, 96), Image.Resampling.NEAREST))
                contact.paste(tile.convert("RGB"), (x, y))
            draw.text((x, y + 102), card["id"], fill="white")
        contact.save(preview / f"{cls}-contact.png")
        print(f"{cls}: {len(cards)} validated cards and labelled 4x contact", flush=True)
    metadata = pack(destination, destination.parent / "cards-atlas.png",
                    destination.parent / "cards-atlas.json", cell_w=32, cell_h=24)
    with Image.open(destination.parent / "cards-atlas.png") as atlas:
        for name, frame in metadata["frames"].items():
            with Image.open(destination / f"{name}.png") as sprite:
                x, y = frame["x"], frame["y"]
                assert atlas.crop((x, y, x + 32, y + 24)).tobytes() == sprite.convert("RGBA").tobytes(), name
    manifest["review"]["weak_ids"] = ["death_cap", "excise"]
    manifest["review"]["verdict"] = "All six sheet contacts inspected at 4x. Eight retries selected; no gutter bleeding or near-duplicate final icons. Death Cap reads as a spearhead; Excise root remains thin."
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Verified {len(metadata['frames'])} atlas frames pixel-for-pixel", flush=True)


if __name__ == "__main__":
    main()
