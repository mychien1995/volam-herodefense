"""Focused feedback01 exports. Reuse v02 extractor; never regenerate prior sources."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import ast,json,hashlib,math
HERE=Path(__file__).resolve().parent
BASE=HERE.parent;ROOT=BASE.parents[2]
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
tree=ast.parse((ROOT/'assets/sprites/bosses/main/tay-doc/source/export_assets.py').read_text(encoding='utf8'))
selected=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in {'clean','split_axis','row_cuts','cells'}]
exec(compile(ast.Module(body=selected,type_ignores=[]),'retained_extractor','exec'))
recipes=[]
def pack(folder,frames,animations,size,source,extra):
 folder.mkdir(exist_ok=True);(folder/'frames').mkdir(exist_ok=True)
 sheet=Image.new('RGBA',(size[0]*4,size[1]*math.ceil(len(frames)/4)));atlas={}
 for i,(name,im) in enumerate(frames):
  x=(i%4)*size[0];y=(i//4)*size[1];sheet.alpha_composite(im,(x,y));im.save(folder/'frames'/(name+'.png'))
  atlas[name]=dict(frame=dict(x=x,y=y,w=size[0],h=size[1]),rotated=False,trimmed=False,spriteSourceSize=dict(x=0,y=0,w=size[0],h=size[1]),sourceSize=dict(w=size[0],h=size[1]))
 sheet.save(folder/'spritesheet.png')
 write(folder/'atlas.json',dict(frames=atlas,meta=dict(image='spritesheet.png',size=dict(w=sheet.width,h=sheet.height))))
 write(folder/'animations.json',dict(origin=[.5,.5],animations=animations))
 write(folder/'manifest.json',dict(status='prototype_pending_director_review',source=source.relative_to(ROOT).as_posix(),sourceSha256=sha(source),generator='built-in image_gen',license='Original AI-assisted raster generated for this project; no external pack; no exclusive copyright claim.',canvas=list(size),pivot=[size[0]//2,size[1]//2],runtimeIntegrated=False,directorApproved=False,**extra))
source=HERE/'source/snake_eight_directions.png'
raw=cells(clean(Image.open(source),40),4,2)
scale=80/max(b[3]-b[1] for _,_,b in raw); frames=[];base=None
for i,(cel,box,bbox) in enumerate(raw):
 art=cel.crop(bbox);art=art.resize((round(art.width*scale),round(art.height*scale)),Image.Resampling.NEAREST)
 out=Image.new('RGBA',(256,256));xy=(128-art.width//2,178-art.height);out.alpha_composite(art,xy)
 # Reuse one authored coiled base across all yaw cels. This is raster component assembly,
 # preserving identical feet/base pixels instead of rotating a whole pillar.
 if base is None:base=out.crop((0,148,256,179))
 else:out.paste(base,(0,148))
 name='snake_facing_8_'+str(i);frames.append((name,out))
 recipes.append(dict(frame=name,source=source.relative_to(ROOT).as_posix(),cell=list(box),content=list(bbox),scale=scale,position=list(xy),sharedBaseRect=[0,148,256,179]))
directions=['east','southeast','south','southwest','west','northwest','north','northeast']
pack(HERE/'snakes_8',frames,{'snake_facing_8':dict(frames=[n for n,_ in frames],durationsMs=[1350]*8,repeat=-1,role='facing',directions=directions)},(256,256),source,dict(directions=directions,feet=[128,178],sharedBaseRect=[0,148,256,179]))
source=HERE/'source/staff_semicircle.png';raw=cells(clean(Image.open(source),40),4,2);frames=[];anims={};radius=160
for row,tag in enumerate(['staff_180_warning','staff_180_sweep']):
 ids=[]
 for i,(cel,box,bbox) in enumerate(raw[row*4:row*4+4]):
  art=cel.crop(bbox).resize((radius+12,2*radius),Image.Resampling.NEAREST)
  out=Image.new('RGBA',(512,512));out.alpha_composite(art,(250,256-radius))
  # Fit the authored raster to the declared frontal semicircle; this alpha clipping
  # keeps decorative tips from implying damage behind the caster or beyond range.
  mask=Image.new('L',(512,512));ImageDraw.Draw(mask).pieslice((96,96,416,416),-90,90,fill=255)
  from PIL import ImageChops
  out.putalpha(ImageChops.multiply(out.getchannel('A'),mask))
  name=tag+'_'+str(i);ids.append(name);frames.append((name,out))
  recipes.append(dict(frame=name,source=source.relative_to(ROOT).as_posix(),cell=list(box),content=list(bbox),exportSize=[512,512],pivot=[256,256],radius=radius,arcDegrees=180,canonicalDirection='right',alphaClip='frontal_semicircle'))
 anims[tag]=dict(frames=ids,durationsMs=[120]*4,repeat=-1 if row==0 else 0,role='warning' if row==0 else 'effect')
pack(HERE/'staff_180',frames,anims,(512,512),source,dict(arcDegrees=180,radius=160,canonicalDirection='right',rearPixels=False))
for rec in recipes:
 f=next(HERE.glob('*/frames/'+rec['frame']+'.png'));rec['sha256']=sha(f)
write(HERE/'extraction_recipes.json',recipes)
packages=read(BASE/'packages.json')
for key,folder in [('snake8','snakes_8'),('staff180','staff_180')]:
 packages[key]=dict(path='/'+(HERE/folder).relative_to(ROOT).as_posix(),image='spritesheet.png',atlas='atlas.json',**read(HERE/folder/'animations.json'))
write(BASE/'packages.json',packages)
board=Image.new('RGB',(960,400),'#131e20');d=ImageDraw.Draw(board);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
for i,direction in enumerate(directions):
 im=Image.open(HERE/'snakes_8/frames'/('snake_facing_8_'+str(i)+'.png'));im=im.crop(im.getbbox());im=im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST)
 x=(i%4)*240;y=(i//4)*200;board.paste(im,(x+120-im.width//2,y+170-im.height),im);d.text((x+75,y+175),direction,font=font,fill='#e1d7b4')
board.save(HERE/'snake_8_review.png')
print('Feedback01: 8 fixed-base snake facings + 8 authored 180-degree staff cels exported.')

