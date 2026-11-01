"""Pack 96px cells, then publish frame rectangles for the real 64/96px canvases.

atlas.pack supplies the existing deterministic filename order and pixels. This
wrapper retains the renderer's patched variable-size frame contract.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from atlas import pack

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/assets/sprites'


def main():
    output=ASSETS/'enemies-atlas.png';metadata=ASSETS/'enemies-atlas.json'
    result=pack(ASSETS/'enemies',output,metadata,96)
    with Image.open(output) as opened:atlas=opened.convert('RGBA')
    for path in sorted((ASSETS/'enemies').glob('*.png')):
        with Image.open(path) as opened:sprite=opened.convert('RGBA')
        frame=result['frames'][path.stem]
        frame.update(x=frame['x']+(96-sprite.width)//2,y=frame['y']+96-sprite.height,w=sprite.width,h=sprite.height)
        crop=atlas.crop((frame['x'],frame['y'],frame['x']+frame['w'],frame['y']+frame['h']))
        if not np.array_equal(np.array(crop),np.array(sprite)):
            raise ValueError(f'atlas crop differs from source: {path.stem}')
    # Keep the pre-existing JSON object schema and one-space formatting.
    metadata.write_text(json.dumps(result,indent=1))
    print(f'validated {len(result["frames"])} real-size frames, including all 96px bosses',flush=True)


if __name__=='__main__':main()
