"""Act 1 only: ingest, process, review records, and ordered contact sheet."""
import argparse
import json
from pathlib import Path
import time
from typing import TypedDict

from PIL import Image, ImageDraw

from ingest import ingest
from postprocess import process
from preview import checker

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "tools/sprites"
OUT = HERE / "preview/act1"
IDS = "gnasher sporepuff scrap_drone thornback vinelash flitterfang sickle_mantis pollen_wisp gnasher_alpha dreadcap shellback_titan bramble_ram mother_orchid orchid_bud gloam_empress".split()
ENTRIES = json.loads((ROOT / "docs/sprites/enemy_prompts.json").read_text())


class Record(TypedDict):
    attempts: int
    pitch: float
    colours: int
    verdict: str
    prompt: str
    change: str
    source: str


class State(TypedDict):
    started: float
    records: dict[str, Record]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["ingest", "review", "contact"])
    parser.add_argument("--id", choices=IDS)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--attempt", type=int, default=1)
    parser.add_argument("--verdict")
    parser.add_argument("--change", default="None; verbatim source prompt.")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    state_path = OUT / "run.json"
    state: State = json.loads(state_path.read_text()) if state_path.exists() else {"started": time.time(), "records": {}}
    if args.action == "ingest":
        if args.id is None or args.source is None:
            parser.error("ingest requires --id and --source")
        raw = HERE / "raw" / f"{args.id}.png"
        if raw.exists():
            rejected = HERE / "raw/rejected/act1"
            rejected.mkdir(parents=True, exist_ok=True)
            previous = state["records"][args.id]["attempts"]
            raw.rename(rejected / f"{args.id}-attempt{previous}.png")
            native = raw.parent / "native" / raw.name
            native.rename(rejected / f"{args.id}-attempt{previous}-native.png")
        ingest(args.source, raw)
        target = ROOT / "public/assets/sprites/enemies" / raw.name
        report = process(raw, target, size=ENTRIES[args.id]["size"])
        (OUT / f"{args.id}.json").write_text(json.dumps(report, indent=2) + "\n")
        with Image.open(target) as image:
            image.resize((image.width * 4, image.height * 4), Image.Resampling.NEAREST).save(OUT / f"{args.id}@4x.png")
        state["records"][args.id] = {"attempts": args.attempt, "pitch": report["pitch"], "colours": report["colors"], "verdict": "Pending visual review", "prompt": ENTRIES[args.id]["prompt"], "change": args.change, "source": str(args.source)}
    elif args.action == "review":
        if args.id is None or args.verdict is None:
            parser.error("review requires --id and --verdict")
        state["records"][args.id]["verdict"] = args.verdict
        print(f"{IDS.index(args.id) + 1}/{len(IDS)} {args.id}: {args.verdict}; elapsed {time.time() - state['started']:.0f}s", flush=True)
    else:
        sheet = Image.new("RGB", (840, 52 + 430 * len(IDS)), "#1e2030")
        draw = ImageDraw.Draw(sheet)
        draw.text((16, 12), "ACT 1 VERDANT DECKS | RAW 1024 -> 384 | PROCESSED EXACT 4X", fill="white")
        for index, enemy in enumerate(IDS):
            y = 52 + index * 430
            with Image.open(HERE / "raw" / f"{enemy}.png") as raw:
                sheet.paste(raw.convert("RGB").resize((384, 384), Image.Resampling.NEAREST), (16, y))
            with Image.open(OUT / f"{enemy}@4x.png") as sprite:
                bg = checker((384, 384))
                bg.alpha_composite(sprite, ((384 - sprite.width) // 2, 384 - sprite.height))
                sheet.paste(bg.convert("RGB"), (424, y))
            record = state["records"][enemy]
            draw.text((16, y + 390), f"{enemy} | {ENTRIES[enemy]['size']}px | attempts {record['attempts']} | colours {record['colours']}", fill="white")
            print(f"contact {index + 1}/{len(IDS)}: {enemy}", flush=True)
        sheet.save(OUT / "contact.png")
    state_path.write_text(json.dumps(state, indent=2) + "\n")
    lines = ["# Act 1 Verdant Decks generation log", "", "Built-in imagegen; first attempts use enemy_prompts.json verbatim. Native sources preserved in raw/native; pipeline inputs normalized to 1024 square with NEAREST. No atlas rebuilt.", "", "| id | attempts | pitch | colours | verdict |", "| --- | ---: | ---: | ---: | --- |"]
    for enemy in IDS:
        if enemy in state["records"]:
            record = state["records"][enemy]
            lines.append(f"| {enemy} | {record['attempts']} | {record['pitch']} | {record['colours']} | {record['verdict']} |")
    lines += ["", "## Prompt changes", ""]
    lines += [f"- {enemy}: {state['records'][enemy]['change']}" for enemy in IDS if enemy in state["records"]]
    (OUT / "log.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
