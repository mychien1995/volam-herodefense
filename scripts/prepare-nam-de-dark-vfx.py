"""Prepare only retained Nam De dark VFX rasters. No art generation during builds."""
from pathlib import Path
from PIL import Image
import numpy as np
import hashlib,json,shutil
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'assets/source/effects/nam_de_dark_v01'
OUT=ROOT/'assets/exports/effects/nam_de_dark_v01'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def clean(im,threshold):
 p=np.array(im.convert('RGBA'));p[:,:,3][p[:,:,3]<=threshold]=0
 return Image.fromarray(p)
def main():
 OUT.mkdir(parents=True,exist_ok=True);(SRC/'frames').mkdir(exist_ok=True)
 items=[]
 for source,names,threshold in [
  ('ice-master.png',['blade_right','blade_up_right','blade_up','blade_down','parry','frost'],12),
  ('fist-master.png',['fist_warning','fist_ghost','fist_fall','fist_impact','fist_burst','fist_crack'],3)]:
  im=Image.open(SRC/source).convert('RGBA');assert im.size==(1536,1024)
  for i,name in enumerate(names):
   tile=clean(im.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)),threshold)
   a=np.array(tile)[:,:,3]
   assert max(a[0].max(),a[-1].max(),a[:,0].max(),a[:,-1].max())==0,(source,name,'cut source edge')
   # Restore a truly empty gutter, removing only measured low-alpha generator noise.
   assert (a>24).sum()>200,name
   items.append((name,tile,{'source':source,'cell':i,'alphaNoiseThreshold':threshold}))
 for source,name in [('aura-isolated.png','aura'),('shatter-isolated.png','shatter')]:
  im=clean(Image.open(SRC/source),3);a=np.array(im)[:,:,3]
  assert max(a[0].max(),a[-1].max(),a[:,0].max(),a[:,-1].max())==0,(name,'nonempty outer gutter')
  im=im.resize((512,512),Image.Resampling.LANCZOS)
  items.append((name,im,{'source':source,'alphaNoiseThreshold':3,'sampling':'Lanczos; source alpha preserved above noise'}))
 base={n:im for n,im,_ in items}
 for name,original,mirror in [('blade_left','blade_right',True),('blade_up_left','blade_up_right',True),('blade_down_right','blade_down',False),('blade_down_left','blade_down',True)]:
  tile=base[original].transpose(Image.Transpose.FLIP_LEFT_RIGHT) if mirror else base[original].copy()
  items.append((name,tile,{'derivedFrom':original,'mirror':mirror,'cameraViewReuse':True}))
 # Fixed512 cells with2px outside gutter: no trim-dependent pivot or filtering bleed.
 sheet=Image.new('RGBA',(4*516,((len(items)+3)//4)*516));frames={};records=[]
 for i,(name,im,meta) in enumerate(items):
  x=(i%4)*516+2;y=(i//4)*516+2;sheet.alpha_composite(im,(x,y))
  frames[name]={'frame':{'x':x,'y':y,'w':512,'h':512},'trimmed':False,'rotated':False,'spriteSourceSize':{'x':0,'y':0,'w':512,'h':512},'sourceSize':{'w':512,'h':512}}
  im.save(SRC/'frames'/(name+'.png'))
  records.append({'name':name,**meta,'sha256':hashlib.sha256(im.tobytes()).hexdigest()})
 sheet.save(OUT/'effects.png');(OUT/'effects.json').write_text(json.dumps({'frames':frames,'meta':{'image':'effects.png','size':{'w':sheet.width,'h':sheet.height}}},indent=2)+'\n')
 m={'texture':'nam-de-dark:fx','folder':'nam-de-dark-v1','status':'candidate integration; concept approved','frames':records,'sourceHashes':{n:sha(SRC/n) for n in ['ice-master.png','fist-master.png','aura-isolated.png','shatter-isolated.png']},'exports':{n:sha(OUT/n) for n in ['effects.png','effects.json']}}
 (SRC/'manifest.json').write_text(json.dumps(m,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
 shutil.copytree(OUT,ROOT/'apps/game-client/public/assets/nam-de-dark-v1',dirs_exist_ok=True)
 print('Validated',len(items),'VFX frames;',sheet.size,'atlas; original source alpha and transparent gutters')
if __name__=='__main__':main()
