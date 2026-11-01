"""Archived round-one cleanup recipes; the CLI is disabled after art review.

Uses the existing sprite/backdrop processors for generated art, then explicit
pixel shapes, material ramps and contour repairs. Baseline is ui_audit snapshot.
Only the IDs selected in ui_plan are installed. Never finalizes an old manifest.
Use ui_revision.py for the approved original-preserving round-two workflow.
"""
import argparse
import colorsys
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from backdrop import build as build_backdrop
from grid import card_crop
from postprocess import process, quantize_sms
from ui_audit import WORK, cards, directory
from ui_generation import GENERATIONS
from ui_plan import CARD_IDS, RELIC_IDS, POTION_IDS, BACKDROP_IDS

BLACK = (0, 0, 0, 255)


def recenter(image: Image.Image, margin: int = 0) -> Image.Image:
    box = image.getbbox()
    assert box is not None
    subject = image.crop(box)
    w, h = image.size
    factor = min(1, (w-2*margin)/subject.width, (h-2*margin)/subject.height)
    if factor < 1:
        subject = subject.resize((max(1,round(subject.width*factor)),max(1,round(subject.height*factor))), Image.Resampling.NEAREST)
    result = Image.new("RGBA", image.size)
    result.paste(subject, ((w-subject.width)//2, (h-subject.height)//2))
    return result


def contour(image: Image.Image) -> Image.Image:
    """Rebuild one 4-neighbour black contour without stacking old outlines."""
    a = np.array(image)
    color = (a[:,:,3]>0) & np.any(a[:,:,:3]!=0, axis=2)
    padded = np.pad(color, 1)
    dilated = color.copy()
    for dy, dx in ((0,1),(1,0),(1,2),(2,1)):
        dilated |= padded[dy:dy+color.shape[0], dx:dx+color.shape[1]]
    a[~color] = 0
    a[dilated & ~color] = BLACK
    return Image.fromarray(a)


def material(image: Image.Image, cls: str) -> Image.Image:
    a = np.array(image)
    for c in np.unique(a[a[:,:,3]>0,:3], axis=0):
        r,g,b = map(int,c)
        h,s,v = colorsys.rgb_to_hsv(r/255,g/255,b/255)
        value = .2126*r+.7152*g+.0722*b
        replacement = tuple(c)
        if cls == "breaker":
            if s>.35 and (b>r or (b==r and b>g)):
                if r>g and b>=r:  # violet becomes the restrained red accent
                    replacement = (170,0,0) if v>.65 else (85,0,0)
                else:
                    replacement = (0,85,170) if value<100 else (0,170,255) if value<190 else (170,170,170)
        elif cls == "graft":
            if s>.3 and g>=r and b>=g and b>0:
                replacement = (0,85,0) if value<80 else (0,170,0) if value<170 else (0,255,0)
            elif b>r and b>g:
                replacement = (85,0,85) if v<.5 else (85,0,170) if v<.8 else (170,0,255)
        elif cls == "colorless":
            if s>.25 and b>=r and b>0:
                replacement = (85,85,85) if value<85 else (170,170,170) if value<190 else (255,255,255)
        elif cls == "chronist":
            if s>.3 and b>r:
                replacement = (0,0,85) if value<45 else (0,85,170) if value<110 else (0,170,255) if value<210 else (255,255,255)
        mask = (a[:,:,3]>0) & np.all(a[:,:,:3]==c,axis=2)
        a[mask,:3] = replacement
    result,_ = quantize_sms(Image.fromarray(a),10)
    return result


def generated(name: str, kind: str) -> Image.Image:
    source = Path(GENERATIONS[name]["source"])
    target = WORK / f"{name}-processed.png"
    report = process(source,target,size=32 if kind=="cards" else 16, colors=10 if kind=="cards" else 8,
                     outline=0, pitch="auto")
    WORK.joinpath(f"{name}-processing.json").write_text(json.dumps(report,indent=2)+"\n")
    result = Image.open(target).convert("RGBA")
    return recenter(card_crop(result) if kind=="cards" else result,1)


def drawing(size=(16,16)) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGBA",size)
    return im, ImageDraw.Draw(im)


def icon_recipe(name: str, source: Image.Image) -> Image.Image:
    """Hand-placed 16px repairs: broad bodies, intentional holes and strokes."""
    im,d = drawing()
    gold,bronze,light = "#FFAA00","#AA5500","#FFFF55"
    steel,silver,white = "#0055AA","#AAAAAA","#FFFFFF"
    green,leaf,violet = "#005500","#00AA00","#AA00FF"
    if name == "hollow_bough":
        d.line([(7,13),(7,7),(4,3)],fill=bronze,width=3)
        d.line([(7,8),(11,3)],fill=bronze,width=3)
        d.line([(6,11),(6,7),(3,3)],fill=gold,width=1)
        d.rectangle((9,2,11,3),fill="#550000")
        d.point((10,2),fill=gold)
    elif name == "bulwark_rivets":
        for x,y in ((5,4),(10,4),(7,10)):
            d.rectangle((x-1,y-1,x+2,y+2),fill=bronze)
            d.rectangle((x-1,y-1,x+1,y+1),fill=gold)
            d.point((x-1,y-1),fill=light)
    elif name == "pollen_sac":
        d.line((7,1,7,4),fill=green,width=2)
        d.polygon([(7,4),(11,6),(11,10),(8,13),(4,10),(4,6)],fill=bronze)
        d.polygon([(7,4),(9,6),(8,11),(5,9),(5,6)],fill=gold)
        d.line((6,6,6,8),fill=light)
    elif name == "hairline_saw":
        d.polygon([(2,4),(10,4),(10,9),(8,8),(7,10),(5,8),(4,10),(2,8)],fill=silver)
        d.line((2,4,9,4),fill=white)
        d.polygon([(10,5),(13,5),(13,11),(10,11)],fill=bronze)
        d.line((11,6,12,6),fill=gold)
        d.rectangle((11,8,12,9),fill=BLACK)
    elif name == "grafting_knife":
        d.polygon([(2,3),(4,3),(10,9),(8,11),(3,7)],fill=silver)
        d.line((2,3,9,9),fill=white)
        d.line((10,10,12,12),fill=bronze,width=3)
        d.point((10,10),fill=gold)
    elif name == "binding_contract":
        d.polygon([(3,3),(10,3),(12,5),(12,12),(4,12),(2,10),(2,4)],fill="#FFFFAA")
        d.rectangle((3,4,4,10),fill="#FFAA55")
        d.line((5,5,9,5),fill=bronze)
        d.line((5,7,8,7),fill=bronze)
        d.rectangle((8,9,10,11),fill="#AA0000")
    elif name == "field_dressing":
        d.polygon([(3,3),(6,2),(11,4),(12,7),(10,12),(5,13),(2,10)],fill=silver)
        d.rectangle((4,4,9,10),fill="#FFFFAA")
        d.line((5,4,9,8),fill=white,width=2)
        d.line((3,8,7,12),fill=white,width=2)
        d.rectangle((8,6,11,8),fill="#AA0000")
    elif name == "heartwood_ring":
        d.ellipse((3,3,12,12),fill=bronze)
        d.ellipse((3,3,11,11),fill=gold)
        d.ellipse((6,6,9,9),fill=BLACK)
        d.polygon([(3,6),(2,3),(5,3),(6,5)],fill=leaf)
        d.point((4,3),fill="#00FF00")
    elif name == "mycelial_net":
        for x in (4,8,12): d.line((x,3,x,12),fill=leaf)
        for y in (4,8,12): d.line((3,y,12,y),fill=leaf)
        d.line((3,4,12,12),fill="#AAAAAA")
        d.line((3,12,12,4),fill="#AAAAAA")
        d.rectangle((2,3,4,5),fill="#00FF00")
        d.rectangle((11,11,13,13),fill="#00FF00")
    elif name == "nursery_tray":
        d.rectangle((2,10,13,12),fill=bronze)
        d.line((2,10,13,10),fill=gold)
        for x in (4,8,12):
            d.line((x,6,x,9),fill=leaf)
            d.line((x,7,x-2,5),fill="#00FF00")
            d.point((x+1,5),fill=leaf)
    elif name == "wayfinder_needle":
        d.polygon([(4,11),(9,3),(11,2),(10,7),(5,12)],fill=gold)
        d.line((4,11,10,3),fill=light)
        d.polygon([(4,11),(6,10),(4,13),(2,13)],fill=steel)
    elif name == "tally_stick":
        d.polygon([(3,11),(10,3),(12,4),(5,13)],fill=bronze)
        d.line((3,11,10,3),fill=gold)
        for x,y in ((5,9),(7,7),(9,5)):
            d.line((x,y,x+1,y+1),fill="#550000")
    elif name == "parry_charm":
        d.line((4,3,11,11),fill=silver,width=2)
        d.line((11,3,4,11),fill=silver,width=2)
        d.line((3,9,6,12),fill=gold)
        d.line((9,12,12,9),fill=gold)
        d.line((4,3,7,6),fill=white)
        d.line((11,3,9,5),fill=white)
    elif name == "tender_plating":
        for x,y in ((3,4),(7,3),(9,7)):
            d.polygon([(x,y),(x+3,y),(x+4,y+4),(x+2,y+6),(x,y+4)],fill="#AA0000")
            d.line((x,y,x+2,y),fill="#FF5500")
        d.line((7,5,8,7,7,9,8,11),fill=BLACK)
    elif name == "crystal_spine":
        d.polygon([(7,2),(10,6),(9,12),(6,13),(5,6)],fill=steel)
        d.polygon([(7,2),(8,6),(7,11),(6,7)],fill="#00FFFF")
        d.line((3,5,6,8),fill="#00AAFF",width=2)
        d.line((11,4,9,7),fill="#00AAFF",width=2)
    elif name == "shard_crucible":
        for x,y in ((5,3),(8,2),(11,4)):
            d.polygon([(x,y),(x+1,y+3),(x,y+6),(x-1,y+3)],fill="#00AAFF")
            d.point((x,y+1),fill="#00FFFF")
        d.polygon([(3,8),(12,8),(11,13),(5,13)],fill=bronze)
        d.line((3,8,12,8),fill=gold)
    elif name == "wild_growth":
        d.polygon([(5,13),(3,9),(4,6),(7,8),(7,2),(10,5),(9,8),(13,5),(12,11),(9,13)],fill=green)
        d.line((7,11,7,5),fill="#00FF00",width=2)
        d.line((7,10,4,7),fill=leaf,width=2)
        d.line((8,12,11,8),fill=leaf,width=2)
    elif name == "gravity_loom":
        d.rectangle((3,3,4,12),fill="#5500AA")
        d.rectangle((11,3,12,12),fill="#5500AA")
        d.line((3,3,12,3),fill=violet)
        for x in (6,8,10): d.line((x,5,x,10),fill=silver)
        d.line((2,12,13,12),fill=gold)
    elif name == "paradox_coil":
        d.ellipse((3,2,11,8),outline="#00AAFF",width=2)
        d.ellipse((3,7,11,13),outline="#00AAAA",width=2)
        d.line((5,3,8,3),fill="#00FFFF")
        d.line((8,8,9,10),fill=violet)
    elif name == "glass_spurs":
        d.polygon([(5,2),(8,2),(8,9),(11,9),(11,12),(3,12),(3,9),(5,8)],fill=steel)
        d.line((5,3,5,9),fill="#00FFFF")
        d.polygon([(10,7),(11,9),(14,10),(11,11),(10,13),(9,10)],fill="#00AAFF")
    elif name == "timeline_clamp":
        d.rectangle((3,3,5,12),fill=silver)
        d.rectangle((5,3,11,5),fill=silver)
        d.rectangle((5,10,11,12),fill=silver)
        d.rectangle((10,2,12,4),fill="#00FFFF")
        d.rectangle((10,11,12,13),fill="#00FFFF")
        d.line((3,3,8,3),fill=white)
    elif name == "stormbreak_gem":
        d.polygon([(7,2),(12,7),(8,13),(3,8)],fill="#AA0000")
        d.polygon([(7,3),(10,6),(6,11),(5,7)],fill="#FF5500")
        d.line((8,4,6,7,9,7,7,11),fill="#FFFF55",width=1)
    else:
        # Heavy Heart and Engine Tooth retain their generated material planes.
        assert name in ("heavy_heart","engine_tooth"), name
        return recenter(contour(source),1)
    return recenter(contour(im),1)


def potion_recipe(name: str) -> Image.Image:
    im,d = drawing()
    themes = {"pot_rewind_phial":("#005555","#00AAAA","#00FFFF"),
              "pot_halt_ampoule":("#AA5500","#FFAA00","#FFFF55"),
              "pot_tempo_draught":("#550055","#5500AA","#AA00FF"),
              "pot_fury_draught":("#550000","#AA0000","#FF0000"),
              "pot_seers_draught":("#000055","#0055AA","#00AAFF"),
              "pot_mending_ampoule":("#550055","#AA0055","#FF55AA")}
    shade,body,hi = themes[name]
    if name=="pot_halt_ampoule":
        shape=[(5,5),(10,5),(12,7),(12,13),(3,13),(3,7)]
    elif name=="pot_tempo_draught":
        shape=[(6,5),(9,5),(11,7),(12,11),(10,13),(5,13),(3,11),(4,7)]
    else:
        shape=[(6,5),(9,5),(9,6),(12,8),(13,11),(11,13),(4,13),(2,11),(3,8),(6,6)]
    d.polygon(shape,fill=shade)
    d.polygon([(6,5),(8,5),(8,7),(10,8),(11,11),(9,12),(4,12),(3,10),(4,8),(6,7)],fill=body)
    d.line((4,8,4,10),fill=hi)
    d.rectangle((6,2,9,3),fill="#AA5500")
    d.line((6,2,9,2),fill="#FFAA00")
    d.rectangle((6,4,9,5),fill=hi)
    mark="#FFFFFF"
    if name=="pot_rewind_phial":
        d.polygon([(4,10),(7,7),(7,9),(10,9),(10,11),(7,11),(7,12)],fill=mark)
    elif name=="pot_halt_ampoule":
        d.rectangle((6,8,9,11),fill=mark)
    elif name=="pot_tempo_draught":
        d.rectangle((6,8,6,11),fill=mark)
        d.rectangle((9,7,9,10),fill=mark)
        d.point((7,11),fill=mark)
        d.point((10,10),fill=mark)
    elif name=="pot_fury_draught":
        d.polygon([(7,7),(9,9),(9,11),(7,12),(5,10),(7,11)],fill="#FFAA00")
        d.point((7,10),fill=mark)
    elif name=="pot_seers_draught":
        d.polygon([(4,10),(6,8),(9,8),(11,10),(9,11),(6,11)],fill=mark)
        d.line((8,9,8,10),fill="#000055")
    else:
        d.polygon([(5,8),(6,8),(7,9),(8,8),(9,8),(10,9),(7,12),(4,9)],fill=mark)
    result,_=quantize_sms(recenter(contour(im),1),8)
    return result


def card_recipe(name: str, source: Image.Image) -> Image.Image:
    # Dedicated final-pixel semantic repairs; the other selected cards retain
    # their original illustration with material and contour cleanup.
    if name == "hairline_mark":
        result = source.copy()
        d = ImageDraw.Draw(result)
        # Restore the chisel's silver cutting face after the 24px fit.
        d.line((9,3,14,8),fill="#AAAAAA",width=2)
        d.line((9,3,13,7),fill="#FFFFFF")
        return recenter(contour(result),1)
    if name == "escapement":
        return recenter(contour(source),1)
    im,d=drawing((32,24))
    if name=="heartwood_spear":
        d.line((5,19,23,5),fill="#AA5500",width=3)
        d.line((5,18,22,5),fill="#FFAA00")
        d.polygon([(20,7),(25,2),(28,3),(26,8),(21,10)],fill="#00AA00")
        d.line((22,7,26,3),fill="#00FF00",width=2)
        d.polygon([(15,12),(13,7),(17,8),(18,10)],fill="#5500AA")
    elif name=="read_the_line":
        # Generated calipers read as a bow at 1x. Keep the broad blade and
        # use an unmistakable inspection lens as its final semantic repair.
        d.polygon([(3,17),(8,13),(21,13),(21,18),(7,19)],fill="#0055AA")
        d.line((7,14,21,14),fill="#AAAAAA",width=2)
        d.line((7,14,18,14),fill="#FFFFFF")
        d.rectangle((22,14,27,17),fill="#AA5500")
        d.ellipse((14,3,25,14),fill="#AA5500")
        d.ellipse((14,3,24,13),fill="#FFAA00")
        d.ellipse((17,6,22,11),fill="#0055AA")
        d.line((17,6,20,6),fill="#00AAFF")
        d.line((24,13,28,18),fill="#FFAA00",width=2)
        d.line((24,14,27,18),fill="#AA5500")
        d.line((19,8,21,8),fill="#FF0000")
    elif name=="tourbillon":
        d.ellipse((6,3,25,21),fill="#0055AA")
        d.ellipse((8,5,23,19),fill="#FFAA00")
        d.ellipse((10,7,21,17),fill="#000055")
        d.line((15,8,15,13,20,13),fill="#FFFF00",width=2)
        d.line((5,11,3,14,7,17),fill="#00AAFF",width=2)
        d.line((26,7,28,10,25,12),fill="#00AAFF",width=2)
    elif name=="clean_manifest":
        d.polygon([(7,3),(21,3),(25,7),(25,20),(7,20)],fill="#AAAAAA")
        d.polygon([(21,3),(21,7),(25,7)],fill="#FFFFFF")
        for y in (7,10,13):d.line((10,y,17,y),fill="#555555")
        d.line((16,16,19,19,25,12),fill="#FFAA00",width=3)
    elif name=="salvage_kit":
        d.polygon([(5,10),(26,10),(27,20),(4,20)],fill="#555555")
        d.rectangle((5,11,25,13),fill="#AAAAAA")
        d.line((5,20,26,20),fill="#AAAAAA")
        d.line((8,11,8,5,13,5),fill="#AAAAAA",width=2)
        d.line((18,10,18,3),fill="#FFAA00",width=2)
        d.line((15,3,21,3),fill="#AAAAAA",width=2)
        d.line((23,10,25,4),fill="#AAAAAA",width=2)
        d.rectangle((13,13,17,18),fill="#AA5500")
        d.rectangle((14,14,16,16),fill="#FFAA00")
        d.point((6,12),fill="#FFFFFF")
    elif name=="snare_line":
        d.ellipse((7,3,24,17),outline="#AAAAAA",width=2)
        d.arc((8,4,23,16),180,280,fill="#FFFFFF",width=1)
        d.line((8,14,4,20),fill="#AAAAAA",width=2)
        d.line((23,14,27,20),fill="#AAAAAA",width=2)
        d.rectangle((3,18,6,21),fill="#AA5500")
        d.rectangle((25,18,28,21),fill="#AA5500")
        d.line((4,18,6,18),fill="#FFAA00")
        d.line((25,18,27,18),fill="#FFAA00")
    elif name=="gyro_jammer":
        d.ellipse((6,3,24,21),outline="#555555",width=3)
        d.arc((6,3,24,21),170,280,fill="#AAAAAA",width=2)
        d.ellipse((11,5,19,19),outline="#AAAAAA",width=2)
        d.rectangle((3,11,27,13),fill="#FFAA00")
        d.ellipse((13,9,17,15),fill="#555555")
        d.rectangle((14,10,16,12),fill="#FFFFFF")
    elif name=="jettison_pod":
        d.polygon([(13,3),(18,3),(22,7),(22,16),(18,20),(13,20),(9,16),(9,7)],fill="#555555")
        d.polygon([(13,4),(17,4),(19,7),(19,16),(17,18),(13,18),(11,15),(11,7)],fill="#AAAAAA")
        d.rectangle((14,7,17,12),fill="#005555")
        d.line((14,7,17,7),fill="#00FFFF")
        d.line((23,16,27,12,27,7),fill="#FFAA00",width=2)
        d.polygon([(24,7),(28,3),(30,7)],fill="#FFAA00")
        d.line((13,5,13,7),fill="#FFFFFF")
    elif name=="stress_fracture":
        d.polygon([(7,4),(24,4),(24,14),(16,21),(7,14)],fill="#555555")
        d.polygon([(8,5),(16,5),(16,19),(9,13)],fill="#AAAAAA")
        d.line((9,5,14,5),fill="#FFFFFF")
        d.line((17,5,14,10,18,12,15,19),fill="#FFAA00",width=2)
    else:
        return recenter(contour(source),1)
    return recenter(contour(im),1)


def sprites() -> None:
    for cls, names in CARD_IDS.items():
        for name in names:
            source = generated(name,"cards") if name in GENERATIONS else Image.open(WORK/"before/cards"/f"{name}.png").convert("RGBA")
            result=card_recipe(name,material(source,cls))
            result,_=quantize_sms(result,10)
            result.save(directory("cards")/f"{name}.png")
            print(f"card cleanup: {name}",flush=True)
    for name in RELIC_IDS:
        source = generated(name,"relics") if name in GENERATIONS else Image.open(WORK/"before/relics"/f"{name}.png").convert("RGBA")
        result,_=quantize_sms(icon_recipe(name,source),8)
        result.save(directory("relics")/f"{name}.png")
        print(f"relic pixel cleanup: {name}",flush=True)
    # Rewind's generated prototype was inspected; the final arrow is explicitly
    # hand placed at 16px rather than trusting its 1254px model rendition.
    generated("pot_rewind_phial","potions")
    for name in POTION_IDS:
        potion_recipe(name).save(directory("potions")/f"{name}.png")
        print(f"potion symbol cleanup: {name}",flush=True)


def backdrops() -> None:
    for name in BACKDROP_IDS:
        processed=WORK/f"{name}-backdrop.png"
        # Shop auto-detection chose the 11.95px double-pitch harmonic. Source
        # inspection shows 5.975px blocks; recover that grid before cleanup.
        pitch = "5.975" if name == "shop_interior" else "auto"
        report=build_backdrop(Path(GENERATIONS[name]["source"]),processed,640,360,16,pitch)
        im=Image.open(processed).convert("RGB").resize((320,180),Image.Resampling.NEAREST)
        a=np.array(im)
        # Consolidate the quiet stage into an intentional flat plane, rather
        # than retaining quantized generator gradients or dotted floor seams.
        d=ImageDraw.Draw(im)
        if name=="act3_crown":
            d.rectangle((80,78,239,145),fill="#000055")
        elif name=="event_generic":
            # The side corridor wedges are preserved; centre floor is navy.
            d.rectangle((80,78,239,179),fill="#000055")
            a=np.array(im)
            floor=np.indices(a.shape[:2])[0]>=100
            blue=(a[:,:,2]>a[:,:,0]) & (a[:,:,0]==0) & (a[:,:,1]==0)
            a[floor & blue]=(0,0,85)
            im=Image.fromarray(a)
        else:
            d.rectangle((45,60,275,116),fill="#005555")
            # Close the two cropped lower shelf jars with whole 16px silhouettes.
            for x in (2,294):
                d.rectangle((x,91,x+23,116),fill="#000055")
                d.polygon([(x+4,98),(x+7,95),(x+7,92),(x+15,92),(x+15,95),(x+18,98),(x+18,113),(x+4,113)],fill="#000000")
                d.rectangle((x+6,99,x+16,111),fill="#00AAAA")
                d.rectangle((x+8,93,x+14,95),fill="#0055AA")
                d.line((x+7,100,x+7,108),fill="#00FFFF")
        final=im.resize((640,360),Image.Resampling.NEAREST)
        final.save(directory("backdrops")/f"{name}.png")
        final.resize((1280,720),Image.Resampling.NEAREST).save(directory("backdrops")/f"{name}@2x.png")
        palette = final.getcolors(640*360)
        assert palette is not None
        report.update({"output":str(directory("backdrops")/f"{name}.png"),
                       "preview":str(directory("backdrops")/f"{name}@2x.png"),
                       "final_cleanup":"ui_retouch.py: 320x180 construction grid, flat calm centre and jar repairs",
                       "colors":len(palette),"recovered_size_before_cleanup":report["recovered_size"],
                       "construction_grid":[320,180]})
        directory("backdrops").joinpath(name+".json").write_text(json.dumps(report,indent=2)+"\n")
        print(f"backdrop cleanup: {name}",flush=True)


if __name__=="__main__":
    raise SystemExit("Round-one renderer archived after the lead's rejection. Use ui_revision.py apply; do not reintroduce the rejected recipes.")
