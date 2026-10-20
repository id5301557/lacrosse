from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageChops

root = Path(__file__).resolve().parents[1]
source = root / '_development/source-assets'
dest = root / 'assets'
dest.mkdir(exist_ok=True)
names = [('keegan-mercer','키건','KEEGAN'),('august-caldwell','어거스트','AUGUST'),('juno-han','주노','JUNO'),('alfred-chadwick','알피','ALFRED'),('bastian-hartmann','바스티안','BASTIAN'),('tamoi-reo','레오','TAMOI'),('lachlan-fraser','라키','LACHLAN'),('grant-westcott','그랜트','GRANT')]
sheet = Image.new('RGB',(1200,660),'#f3f1e9')
draw=ImageDraw.Draw(sheet)
for i,(slug,ko,en) in enumerate(names):
 for folder,kind in [('headshots','portrait'),('uniforms','uniform')]:
  file=next(p for p in (source/folder).iterdir() if (p.stem.startswith(en) if folder=='records' else p.stem.startswith(ko)))
  im=Image.open(file).convert('RGB')
  if kind=='uniform':
   # All supplied headshots are 832 × 1216 = 13:19. Crop at native pixels.
   unit=min(im.width//13,im.height//19)
   crop_w,crop_h=unit*13,unit*19
   left=(im.width-crop_w)//2
   im=im.crop((left,0,left+crop_w,crop_h))
   output=dest/f'{slug}-{kind}.webp'
   temporary=dest/f'{slug}-{kind}.tmp.webp'
   im.save(temporary,lossless=True,quality=100,method=1,exact=True)
   decoded=Image.open(temporary).convert('RGB')
   assert decoded.size==im.size
   assert ImageChops.difference(im,decoded).getbbox() is None
   decoded.close()
   temporary.replace(output)
   print(f'{slug}: native {im.width} x {im.height}, 13:19, lossless pixels verified')
  else:
   im.thumbnail((1400,2100) if kind=='record' else (900,1200),Image.Resampling.LANCZOS)
   im.save(dest/f'{slug}-{kind}.webp',quality=88)
  if kind=='portrait':
   thumb=ImageOps.fit(im,(280,280),centering=(.5,.25))
   sheet.paste(thumb,((i%4)*300,(i//4)*330))
   draw.text(((i%4)*300+10,(i//4)*330+290),slug,fill='#222222')
sheet.save(root/'_development/asset-contact.jpg')
logo=Image.open(next((source/'logos').iterdir())).convert('RGBA')
w,h=logo.size
print('Logo source:',w,h)
# Coordinates measured against the supplied 1760 × 880 logo sheet.
crops={'aldermere-crest':(8,100,400,594),'aldermere-team':(428,100,864,594),'harrowgate-crest':(904,100,1298,595),'harrowgate-team':(1326,103,1760,592),'aldermere-mark':(228,685,394,858),'harrowgate-mark':(1138,685,1283,858)}
for name,box in crops.items():
 box=tuple(round(v*(w/1760 if i%2==0 else h/880)) for i,v in enumerate(box))
 cropped=logo.crop(box)
 canvas=Image.new('RGBA',(cropped.width+24,cropped.height+24))
 canvas.alpha_composite(cropped,(12,12))
 canvas.save(dest/f'{name}.png')
print('Prepared 16 athlete images and 6 logo crops.')
