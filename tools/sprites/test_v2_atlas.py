"""Frame-preserving append must not relocate or repaint accepted art."""
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

from atlas import pack


class AppendAtlasTest(unittest.TestCase):
    def test_append_retains_coordinates_pixels_and_schema(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);sprites=base/'cards';sprites.mkdir()
            Image.new('RGBA',(32,24),'red').save(sprites/'z_old.png')
            output=base/'atlas.png';metadata=base/'atlas.json'
            original=pack(sprites,output,metadata,cell_w=32,cell_h=24)
            old_pixels=Image.open(output).tobytes()
            # Sorts BEFORE the accepted frame; a full repack would move it.
            Image.new('RGBA',(32,24),'blue').save(sprites/'a_new.png')
            final=pack(sprites,output,metadata,cell_w=32,cell_h=24,preserve_existing=True)
            self.assertEqual(final['frames']['z_old'],original['frames']['z_old'])
            self.assertEqual(final.keys(),original.keys())
            self.assertEqual(final['frames']['a_new'],{'x':0,'y':24,'w':32,'h':24})
            self.assertEqual(Image.open(output).crop((0,0,32,24)).tobytes(),old_pixels)
            self.assertEqual(json.loads(metadata.read_text()),final)
            png_before=output.read_bytes();json_before=metadata.read_bytes()
            pack(sprites,output,metadata,cell_w=32,cell_h=24,preserve_existing=True)
            self.assertEqual(output.read_bytes(),png_before)
            self.assertEqual(metadata.read_bytes(),json_before)

    def test_refuses_changed_existing_pixels_before_writing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);sprites=base/'icons';sprites.mkdir()
            Image.new('RGBA',(16,16),'red').save(sprites/'old.png')
            output=base/'atlas.png';metadata=base/'atlas.json'
            pack(sprites,output,metadata,cell=16)
            png_before=output.read_bytes();json_before=metadata.read_bytes()
            Image.new('RGBA',(16,16),'blue').save(sprites/'old.png')
            with self.assertRaisesRegex(ValueError,'differs from individual'):
                pack(sprites,output,metadata,cell=16,preserve_existing=True)
            self.assertEqual(output.read_bytes(),png_before)
            self.assertEqual(metadata.read_bytes(),json_before)


if __name__=='__main__':unittest.main()
