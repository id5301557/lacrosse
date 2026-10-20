from pathlib import Path
from PIL import Image, ImageChops
import json
root=Path(__file__).resolve().parents[1]
names=[('keegan-mercer','키건'),('august-caldwell','어거스트'),('juno-han','주노'),('alfred-chadwick','알피'),('bastian-hartmann','바스티안'),('tamoi-reo','레오'),('lachlan-fraser','라키'),('grant-westcott','그랜트')]
report=[]
for slug,name in names:
    source=next(p for p in (root/'_development/source-assets/uniforms').iterdir() if p.stem.startswith(name))
    with Image.open(source) as original:
        rgb=original.convert('RGB')
        unit=min(rgb.width//13,rgb.height//19)
        w,h=13*unit,19*unit
        left=(rgb.width-w)//2
        crop=rgb.crop((left,0,left+w,h))
        with Image.open(root/'assets'/f'{slug}-uniform.webp') as actual:
            decoded=actual.convert('RGB')
            assert decoded.size==(w,h)
            assert ImageChops.difference(crop,decoded).getbbox() is None
        report.append({'id':slug,'size':[w,h],'ratio':'13:19','nativePixelsIdentical':True})
(root/'_development/asset-quality-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('PASS: all 8 uniform crops retain native dimensions and identical source pixels.')
