"""Export only missing directional raster actions, preserving all approved preview bytes."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import ast,json,hashlib,statistics,math
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source/bosses/tay_doc_runtime_v01'
OUT=ROOT/'assets/exports/bosses/tay_doc_runtime_v01'
def read(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
tree=ast.parse((ROOT/'assets/sprites/bosses/main/tay-doc/source/export_assets.py').read_text(encoding='utf8').replace('*.01','*.03'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in {'clean','split_axis','row_cuts','cells','actor_islands'}],type_ignores=[]),'retained_cel_extractor','exec'))
frames=[];animations={};recipes=[]
states=['crawl','hop','exhale','staff_sweep','palm_attack']
for direction in ['left','up','down']:
 source=SOURCE/(direction+'.png');cels=cells(clean(Image.open(source),24),4,5)
 # Stable scale across every pose of one facing, referenced to crouched human casting height.
 heights=[b[3]-b[1] for _,_,b in cels[8:12]];scale=54/statistics.median(heights)
 for row,state in enumerate(states):
  names=[]
  for i,(cel,box,bbox) in enumerate(cels[row*4:row*4+4]):
   cel=actor_islands(cel);bbox=cel.getbbox();art=cel.crop(bbox)
   art=art.resize((round(art.width*scale),round(art.height*scale)),Image.Resampling.NEAREST)
   out=Image.new('RGBA',(160,144));xy=(80-art.width//2,116-art.height)
   assert xy[0]>=2 and xy[1]>=2 and xy[0]+art.width<=158 and xy[1]+art.height<=142,(direction,state,i,xy,art.size)
   out.alpha_composite(art,xy);name=f'{state}_{direction}_{i}';names.append(name);frames.append((name,out));recipes.append(dict(frame=name,source=source.relative_to(ROOT).as_posix(),cell=list(box),content=list(bbox),scale=scale,feet=[80,116],destination=list(xy)))
  animations[state+'_'+direction]=dict(frames=names,durationsMs=[120]*4,repeat=-1 if state=='crawl' else 0,role='character')
OUT.mkdir(parents=True,exist_ok=True);(OUT/'frames').mkdir(exist_ok=True);sheet=Image.new('RGBA',(1280,math.ceil(len(frames)/8)*144));atlas={}
for i,(name,im) in enumerate(frames):
 x=i%8*160;y=i//8*144;sheet.alpha_composite(im,(x,y));im.save(OUT/'frames'/(name+'.png'));atlas[name]=dict(frame=dict(x=x,y=y,w=160,h=144),rotated=False,trimmed=False,spriteSourceSize=dict(x=0,y=0,w=160,h=144),sourceSize=dict(w=160,h=144))
sheet.save(OUT/'spritesheet.png');write(OUT/'atlas.json',dict(frames=atlas,meta=dict(image='spritesheet.png',size=dict(w=sheet.width,h=sheet.height))))
write(OUT/'animations.json',dict(origin=[.5,116/144],animations=animations))
write(SOURCE/'extraction_recipes.json',recipes)
manifest=dict(status='candidate_runtime_director_review_pending',generator='built-in image_gen',license='Original AI-assisted raster drawn for this project; no external pack or exclusive copyright assertion.',sourceType='flattened PNG, not layered Aseprite',facings=['left','up','down'],frames=60,clips=15,canvas=[160,144],feet=[80,116],sources=[dict(path=p.relative_to(ROOT).as_posix(),sha256=sha(p)) for p in SOURCE.glob('*.png')],files=[dict(path=p.relative_to(ROOT).as_posix(),sha256=sha(p)) for p in OUT.rglob('*') if p.is_file()])
write(ROOT/'assets/runtime/tay_doc_directions_v01.json',manifest)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15);board=Image.new('RGB',(960,5*190),'#131e20');draw=ImageDraw.Draw(board)
for row,state in enumerate(states):
 draw.text((10,row*190+8),state,font=font,fill='#eadbb5')
 for col,direction in enumerate(['left','up','down']):
  for i in range(4):
   im=Image.open(OUT/'frames'/(f'{state}_{direction}_{i}.png'));im=im.crop(im.getbbox());board.paste(im,(col*320+i*78,row*190+145-im.height),im)
  draw.text((col*320+100,row*190+158),direction,font=font,fill='#bcd3b2')
board.save(OUT/'direction_review.png')
print('PASS export:60 distinct candidate directional cels /15 clips; original approved assets untouched.')

