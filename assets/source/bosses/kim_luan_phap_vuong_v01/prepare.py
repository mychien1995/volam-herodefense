"""Export retained rasters through the existing boss extractor; compose layered review map.
No raster painting, runtime/game rules, network or approved asset edits.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[4]
BASE=Path(__file__).resolve().parent
OUT=ROOT/'assets/exports/bosses/kim_luan_phap_vuong_v01'
REVIEW=ROOT/'assets/reviews/bosses/kim_luan_phap_vuong_v01'
def dump(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
def rel(p):return p.relative_to(ROOT).as_posix()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
cfg=json.loads((BASE/'generation.json').read_text(encoding='utf8'))
# The same retained extractor handles all boss batches; no second gutter detector.
subprocess.run([sys.executable,str(ROOT/'assets/source/bosses/hoan_nhan_hong_liet_v01/package_assets.py'),'--base',str(BASE),'--out',str(OUT)],check=True,cwd=ROOT)
manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf8'))
bundles={}
names={'kim_luan':'Kim Luân Pháp Vương','hoac_do':'Hoắc Đô','dat_nhi_ba':'Đạt Nhĩ Ba'}
for item in manifest['assets']:
 key=item['id'];atlas=json.loads((ROOT/item['atlas']).read_text(encoding='utf8'))
 sheet=Image.open(ROOT/item['sheet']).convert('RGBA')
 folder=OUT/'frames'/key;folder.mkdir(parents=True,exist_ok=True)
 for fn,f in atlas['frames'].items():
  b=f['frame'];cel=sheet.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
  # Clean hidden RGB in fully transparent areas, keeping genuine alpha unchanged.
  cel.save(folder/(fn+'.png'))
 clips=[]
 if key.endswith('_base'):
  for direction in ['down','left','right','up']:
   for state,columns,fps in [('idle',['idle_a','idle_b'],1000/350),('walk',['walk_a','walk_b','walk_c','walk_d'],1000/120)]:
    clips.append(dict(name=state+'_'+direction,frames=[direction+'_'+c for c in columns],fps=fps,repeat=-1))
  # Baseline two-pose attacks are kept as source evidence, not falsely counted as four-direction action clips.
 elif key.endswith('_actions'):
  for row in item['groups']:clips.append(dict(name=row,frames=[row+'_'+c for c in item['columns']],fps=10,repeat=0))
 elif key.endswith('_fx') or key in ['elephant','elephant_up']:
  for row in item['groups']:clips.append(dict(name=row,frames=[row+'_'+c for c in item['columns']],fps=10,repeat=-1))
 bundles[key]=dict(image=item['sheet'],atlas=item['atlas'],frames=atlas['frames'],origin=item['origin'],clips=clips)
# Each scenery prop is a separate authored object; crop only its alpha bounds.
props={}
raw=bundles.pop('tuong_duong_props')
src=Image.open(ROOT/raw['image']).convert('RGBA')
prop_names=['gatehouse','wall_horizontal','watchtower','wall_vertical','barracks','banners','drum','brazier','rock_large','rock_small','crates','rubble']
for index,(_,fr) in enumerate(raw['frames'].items()):
 name=prop_names[index]
 b=fr['frame'];im=src.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']))
 bb=im.getchannel('A').point(lambda a:255 if a>180 else 0).getbbox()
 assert bb,name
 im=im.crop(bb);path=OUT/(name+'.png');im.save(path)
 props[name]=dict(image=rel(path),size=list(im.size),origin=[.5,1],sha256=sha(path))
# Materials are authored reusable patches, not a flattened scene screenshot.
terrain=Image.open(BASE/'generated/tuong_duong_terrain.png').convert('RGBA')
tiles=Image.new('RGBA',(512,512));patches=[]
for row in range(4):
 for col in range(4):
  box=(round(col*terrain.width/4),round(row*terrain.height/4),round((col+1)*terrain.width/4),round((row+1)*terrain.height/4))
  patch=terrain.crop(box).resize((128,128),Image.Resampling.NEAREST)
  patches.append(dict(row=row,col=col,sourceRect=box))
  tiles.paste(patch,(col*128,row*128))
tiles.save(OUT/'terrain.png')
W,H=40,23;data=[]
for y in range(H):
 for x in range(W):
  mx,my=x//4,y//4
  patch=(12+((mx+my)%2)) if x<3 or x>=37 or y>=21 else ([0,0,1,0,2,0,4,0][(mx+my*3)%8])
  if y==6 and x in range(4,36):patch=8
  px,py=patch%4,patch//4
  data.append((py*4+y%4)*16+px*4+x%4+1)
objects=[]
def prop(asset,x,y):objects.append(dict(name=asset,x=x,y=y,type='scenery'))
for x in [210,410,870,1070]:prop('wall_horizontal',x,212)
prop('gatehouse',640,226)
for x in [88,1192]:
 prop('watchtower',x,258)
 for y in [398,538,678]:prop('wall_vertical',x,y)
prop('barracks',185,344);prop('crates',1100,375)
for x in [345,935]:
 prop('banners',x,265);prop('drum',x,325)
for x,y in [(280,330),(1000,330),(170,600),(1110,600)]:prop('brazier',x,y)
prop('rubble',210,665);prop('rubble',1090,660)
mapdata=dict(type='map',orientation='orthogonal',renderorder='right-down',version='1.10',width=W,height=H,tilewidth=32,tileheight=32,infinite=False,
 tilesets=[dict(firstgid=1,name='tuong_duong',tilewidth=32,tileheight=32,tilecount=256,columns=16,image='terrain.png',imagewidth=512,imageheight=512)],
 layers=[dict(id=1,name='ground',type='tilelayer',width=W,height=H,data=data),
 dict(id=2,name='scenery',type='objectgroup',objects=[dict(o,id=i+1,width=0,height=0,rotation=0,visible=True) for i,o in enumerate(objects)]),
 dict(id=3,name='markers',type='objectgroup',objects=[dict(id=100,name='hero_spawn',x=640,y=565,type='spawn'),dict(id=101,name='boss_spawn',x=640,y=410,type='spawn'),dict(id=102,name='hoac_do_spawn',x=540,y=350,type='spawn'),dict(id=103,name='dat_nhi_ba_spawn',x=735,y=370,type='spawn'),dict(id=104,name='exit',x=640,y=670,type='exit')]),
 dict(id=4,name='collision_proposals',type='objectgroup',objects=[dict(id=200,name='north_wall',x=0,y=0,width=1280,height=250,type='solid'),dict(id=201,name='west_wall',x=0,y=250,width=130,height=486,type='solid'),dict(id=202,name='east_wall',x=1150,y=250,width=130,height=486,type='solid')])],
 properties=[dict(name='status',type='string',value='art_review_proposal_only_not_authoritative_collision')])
dump(OUT/'tuong_duong.tmj',mapdata)
hero='assets/exports/characters/hero_vo_dang'
hj=json.loads((ROOT/(hero+'.json')).read_text(encoding='utf8'))
hclips=[]
for direction in ['down','left','right','up']:
 for state,fps in [('idle',1000/350),('walk',1000/120),('basic_attack',1000/75)]:
  frames=[n for n in hj['frames'] if n.startswith(state+'_'+direction+'_')]
  if frames:hclips.append(dict(name=state+'_'+direction,frames=frames,fps=fps,repeat=-1 if state!='basic_attack' else 0))
bundles['hero']=dict(image=hero+'.png',atlas=hero+'.json',frames=hj['frames'],origin=[.5,.8],clips=hclips)
stomp={}
for name,f in bundles['kim_stomp_fx']['frames'].items():
 b=f['frame'];im=Image.open(ROOT/bundles['kim_stomp_fx']['image']).crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h']));bb=im.getchannel('A').point(lambda a:255 if a>180 else 0).getbbox();stomp[name]=dict(origin=[(bb[0]+bb[2])/2/b['w'],(bb[1]+bb[3])/2/b['h']],radius=(bb[2]-bb[0])/2)
reviewdata=dict(stompFrames=stomp,bundles=bundles,props=props,map=mapdata,terrain=rel(OUT/'terrain.png'),names=names)
dump(REVIEW/'data.json',reviewdata)
# Deliverable contact sheets at native pixels and 2x; no recordings.
contact=Image.new('RGB',(800,520),'#203331')
draw=ImageDraw.Draw(contact)
for row,who in enumerate(names):
 sheet=Image.open(ROOT/bundles[who+'_base']['image']).convert('RGBA')
 for col,direction in enumerate(['down','left','right','up']):
  f=bundles[who+'_base']['frames'][direction+'_idle_a']['frame']
  cel=sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
  contact.paste(cel,(col*190,row*160+20),cel)
 draw.text((15,row*160+7),who,fill='#ffe1ac')
contact.save(REVIEW/'characters_native.png')
contact.resize((1600,1040),Image.Resampling.NEAREST).save(REVIEW/'characters_2x.png')
references=['vo_dang_character_reference.png','cai_bang_character_reference.png','in_game_world_reference.png','current_game_2026_10_29_placeholder_anti_reference.png','central_arena_hub_reference.png','arena_battle_reference.png']
inputs=[ROOT/item['source'] for item in manifest['assets']]+[BASE/'generated/tuong_duong_terrain.png',ROOT/(hero+'.png'),ROOT/(hero+'.json')]
manifest.update(id='kim_luan_phap_vuong_art_v01',date='2026-11-01',branch='wip/m3d/kim-luan-phap-vuong',status='prototype_pending_director_review',
 provenance='Original AI-assisted project rasters produced with built-in OpenAI image_gen; retained sources are flattened PNGs, no layered/Aseprite authorship claimed. Approved hero reused without modification. No third-party game pixels sampled.',
 phaserReview=True,gameRuntimeIntegrated=False,serverMechanicsImplemented=False,directorApproved=False,
 extraction='Existing Hoan Nhan boss alpha-gutter exporter, shared source-group scales, nearest sampling, recorded source rectangles/anchors; separate props and composed Tiled map.',
 retainedInputHashes={rel(p):sha(p) for p in inputs},referenceHashes={str(Path('assets/references')/n).replace('\\','/'):sha(ROOT/'assets/references'/n) for n in references},
 environment=dict(tiles=256,patches=patches,props=props,map=rel(OUT/'tuong_duong.tmj'),collision='Proposed markers only; not installed in game-data.'),
 limitations=['Idle/walk: four facings. Dedicated active casts: front/down only except four-pose Hoac Do spin.','Baseline side attack candidates which turn toward camera are excluded from playback; no false four-facing attack claim.','No new authored hurt/death clips. Encounter review uses standing/exit choreography, not fake death animation.','Preview choreography has no HP damage, AI, network, loot or authoritative collisions. Six heroes are readability figures, not six clients.','Source style is detailed AI-assisted raster sampled to gameplay pixels; fine cleanup/final director approval remains pending.'])
dump(OUT/'manifest.json',manifest)
print(json.dumps(dict(exportedBundles=len(bundles)-1,productionCels=sum(len(b['frames']) for k,b in bundles.items() if k!='hero'),reviewClips=sum(len(b['clips']) for k,b in bundles.items() if k!='hero'),props=len(props),tiles=256)))
