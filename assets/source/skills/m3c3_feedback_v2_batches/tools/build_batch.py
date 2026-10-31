"""Isolated art-only batch packer. Plans/extracts authored pixels; never imports Phaser or game code."""
from pathlib import Path
import json,hashlib,subprocess,sys,math
import numpy as np
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[5]
SRC=ROOT/'assets/source/skills/m3c3_feedback_v2_batches'
OUT=ROOT/'assets/exports/skills/m3c3_feedback_v2_batches'
REVIEW=ROOT/'assets/reviews/skills/m3c3_feedback_v2_batches'
ASEPRITE=Path('C:/Program Files/Aseprite/Aseprite.exe')
STATUS='PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
@lru_cache(maxsize=128)
def load(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def save(p,j):Path(p).write_text(json.dumps(j,ensure_ascii=False,indent=2),encoding='utf-8')
def run(cmd):
 p=subprocess.run([str(x) for x in cmd],capture_output=True,text=True,creationflags=subprocess.CREATE_NO_WINDOW)
 if p.returncode:raise RuntimeError(p.stdout+p.stderr)
 return p.stdout.strip()
def source_frame(spec,batch):
 if spec['kind']=='atlas':
  j=load(ROOT/spec['atlas']);rec=j['frames'][spec['frame']];rect=rec['frame'];raw=ROOT/spec['sheet']
  return {**spec,'rect':[rect['x'],rect['y'],rect['w'],rect['h']],'scale':1,'threshold':0,'source':raw.relative_to(ROOT).as_posix()}
 if spec['kind']=='character':
  j=load(SRC/batch/'character_measurements.json')[spec['sourceId']];e=j['frames'][spec['component']]
  return {**spec,'source':(SRC/batch/j['source']).relative_to(ROOT).as_posix(),'rect':[e['bounds'][0],e['bounds'][1],e['bounds'][2]-e['bounds'][0],e['bounds'][3]-e['bounds'][1]],'runs':e['runs'],'anchor':[e['foot'][0]-e['bounds'][0],e['foot'][1]-e['bounds'][1]],'scale':e.get('scale',j['scale']),'threshold':220}
 raw=SRC/batch/'generated'/(spec['sourceId']+'.png');im=Image.open(raw);cw=im.width/spec['cols'];ch=im.height/spec['rows']
 measured=load(SRC/batch/'effect_measurements.json')[spec['sourceId']]['frames'][spec['row']*spec['cols']+spec['col']]
 assert not measured.get('empty'),(spec['sourceId'],spec['row'],spec['col'],'transparent source phase; exclude from active clips')
 anchor=measured['anchor'][:]
 if spec.get('anchor')!=[0.5,0.5]:anchor=[measured['rect'][2]*spec['anchor'][0],measured['rect'][3]*spec['anchor'][1]]
 return {**spec,'source':raw.relative_to(ROOT).as_posix(),'rect':measured['rect'],'runs':measured['runs'],'anchor':anchor,'scale':spec['scale']*256/cw,'threshold':220}
 x=round(spec['col']*cw);y=round(spec['row']*ch);x1=round((spec['col']+1)*cw);y1=round((spec['row']+1)*ch)
 anchor=spec.get('anchor',[0.5,0.5]);scale=spec['scale']*256/cw
 return {**spec,'source':raw.relative_to(ROOT).as_posix(),'rect':[x,y,x1-x,y1-y],'anchor':[round(anchor[0]*(x1-x)),round(anchor[1]*(y1-y))],'scale':scale,'threshold':220}
def build(batch,characters_only=False):
 config=load(SRC/batch/'batch_config.json');prepared=[];components=[]
 from measure_effects import measure
 rawsources={f['sourceId']:(f['rows'],f['cols']) for c in config['components'] for a in c['clips'] for f in a['frames'] if f['kind']=='raw'}
 for sid,(rows,cols) in rawsources.items():measure(batch,sid,rows,cols)
 for c in config['components']:
  pid=c['package'];role=c['role'];c['id']=pid+'_'+role
  dest=OUT/batch/pid;dest.mkdir(exist_ok=True)
  (dest/(role+'_frames')).mkdir(exist_ok=True)
  frames=[]
  for clip in c['clips']:
   for i,raw in enumerate(clip['frames']):
    spec=source_frame(raw,batch);name=clip['name']+'_'+str(i)
    frames.append({**spec,'name':name,'tag':clip['name'],'durationMs':clip['durations'][i],'canvas':c['canvas'],'pivot':c['pivot']})
  plan={**c,'frames':frames,'sourceFile':(SRC/batch/(c['id']+'.aseprite')).relative_to(ROOT).as_posix(),'individualDirectory':dest.relative_to(ROOT).as_posix()+'/'+role+'_frames'}
  save(SRC/batch/(c['id']+'_frame_plan.json'),plan);prepared.append(plan)
 palettes={'02_thien_son':'hero_thien_son','03_vo_dang':'hero_vo_dang','04_thieu_lam':'hero_thieu_lam'};palette=[]
 if batch in palettes:
  ref=ROOT/'assets/exports/characters'/(palettes[batch]+'.png');pixels=np.asarray(Image.open(ref).convert('RGBA'));colors=pixels[:,:,:3][pixels[:,:,3]>0]
  rgb=Image.fromarray(colors.reshape(1,-1,3));q=rgb.quantize(colors=192,method=Image.Quantize.MEDIANCUT);p=q.getpalette();palette=[p[i:i+3] for i in range(0,192*3,3)]
  save(SRC/batch/'character_palette.json',{'reference':ref.relative_to(ROOT).as_posix(),'referenceSha256':sha(ref),'method':'192-color median-cut over approved foreground; nearest-color mapping of NEW character cels only; retained cels untouched','colorsRGB':palette})
 save(SRC/batch/'assembly_plan.json',{'batch':batch,'components':prepared,'newCharacterPalette':palette})
 args=[ASEPRITE,'-b','--script-param','root='+ROOT.as_posix(),'--script-param','batch='+batch]
 if characters_only:args+=['--script-param','role=character']
 print(run(args+['--script',SRC/'tools/assemble.lua']),flush=True)
 for c in prepared:
  dest=OUT/batch/c['package'];name=c['id'];png=dest/(name+'.png');atlas=dest/(name+'.json');source=ROOT/c['sourceFile']
  if not characters_only or c['role']=='character':
   run([ASEPRITE,'-b',source,'--sheet-type','rows','--sheet-columns',str(max(4,math.ceil(math.sqrt(len(c['frames'])*c['canvas'][1]/c['canvas'][0])))),'--border-padding','2','--shape-padding','2','--format','json-hash','--list-tags','--list-slices','--filename-format','{tag}_{tagframe}','--sheet',png,'--data',atlas])
  j=load(atlas);sheet=Image.open(png).convert('RGBA');animations=[]
  for clip in c['clips']:
   names=[clip['name']+'_'+str(i) for i in range(len(clip['frames']))]
   assert all(n in j['frames'] for n in names),(c['id'],clip['name'])
   a={k:v for k,v in clip.items() if k not in ['frames','durations']}
   if c['role']=='character' and a['phase']=='loop' and not a['loop']:a['phase']='cast'
   if c['role']=='character' and 'framePhases' not in a:
    count=len(names);contact=clip.get('contactFrames',[max(1,count//2)])[0] if clip.get('contactFrames') else max(1,count//2)
    a['framePhases']=[('anticipation' if i<contact else 'release/contact' if i==contact else 'recovery') if not clip['loop'] else 'loop' for i in range(count)]
   a.update({'frames':names,'frameDurationsMs':clip['durations'],'durationMsTotal':sum(clip['durations']),'frameCount':len(names),'pivot':c['pivot'],'origin':[c['pivot'][0]/c['canvas'][0],c['pivot'][1]/c['canvas'][1]],'displayScale':1,'oneShot':not clip['loop'],'repeat':-1 if clip['loop'] else 0,'contactMarkers':[{'frameIndex':i,'frame':names[i],'kind':'visual_contact','serverDriven':True} for i in clip.get('contactFrames',[])],'damageAuthority':'Server only; markers and durations never create hits/damage.'})
   for n in names:
    f=j['frames'][n]['frame'];sheet.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).save(dest/(c['role']+'_frames')/(n+'.png'))
   animations.append(a)
  metadata={'schemaVersion':2,'id':name,'handoffId':c['package'],'role':c['role'],'status':STATUS,'source':c['sourceFile'],'sheet':png.relative_to(ROOT).as_posix(),'atlas':atlas.relative_to(ROOT).as_posix(),'frameDimensions':c['canvas'],'pivot':c['pivot'],'origin':[c['pivot'][0]/c['canvas'][0],c['pivot'][1]/c['canvas'][1]],'displayScale':1,'runtimeIntegrated':False,'runtimeApproved':False,'animations':animations}
  meta=dest/(name+'.animations.json');save(meta,metadata)
  components.append({'id':name,'handoffId':c['package'],'role':c['role'],'source':c['sourceFile'],'sheet':png.relative_to(ROOT).as_posix(),'atlas':atlas.relative_to(ROOT).as_posix(),'metadata':meta.relative_to(ROOT).as_posix(),'sourceSha256':sha(source),'sheetSha256':sha(png),'atlasSha256':sha(atlas),'metadataSha256':sha(meta),'frames':len(j['frames']),'tags':len(animations)})
 manifest={'schemaVersion':2,'batch':batch,'status':STATUS,'contract':'docs/M3C3_FEEDBACK_IMPLEMENTATION.md','contractSha256':sha(ROOT/'docs/M3C3_FEEDBACK_IMPLEMENTATION.md'),'conceptsAndSampleApproved':True,'runtimeIntegrated':False,'runtimeApproved':False,'components':components,'handoff':config['handoff'],'preservedReferences':config.get('preservedReferences',[]),'reusedSources':config.get('reusedSources',[]),'provenance':'Original OpenAI built-in image_gen source pixels plus explicitly listed retained project frames; Aseprite editable RGBA cels, no concept crops or procedural artwork. No exclusive copyright or human hand-pixelled authorship claim.','generatedSources':[{'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'dimensions':list(Image.open(p).size)} for p in sorted((SRC/batch/'generated').glob('*.png'))],'recordingsCreated':False}
 save(SRC/batch/'production_manifest.json',manifest)
 make_reviews(batch,config,manifest)
 validate(batch)
 progress=load(SRC/'progress.json')
 if batch not in progress['completedBatches']:progress['completedBatches'].append(batch)
 remains=[b for b in progress['requestedBatches'] if b not in progress['completedBatches']]
 progress['activeBatch']=remains[0] if remains else None;progress['status']='IN_PRODUCTION' if remains else 'FILES_COMPLETE_PENDING_RUNTIME'
 save(SRC/'progress.json',progress)
def make_reviews(batch,config,manifest):
 folder=REVIEW/batch
 try:font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
 except OSError:font=ImageFont.load_default()
 overview=Image.new('RGB',(1280,1694),(21,23,27));draw=ImageDraw.Draw(overview);draw.text((16,12),batch+' / PRODUCTION PIXELS - PENDING RUNTIME',font=font,fill=(255,220,165))
 entries=[]
 for c in config['components']:
  meta=load(ROOT/next(x['metadata'] for x in manifest['components'] if x['id']==c['id']));clips=meta['animations']
  cellw=max(128,c['canvas'][0]);cellh=max(110,c['canvas'][1])+24;columns=max(6,max(a['frameCount'] for a in clips));w=170+columns*cellw;h=42+len(clips)*cellh
  im=Image.new('RGB',(w,h),(21,23,27));d=ImageDraw.Draw(im);d.text((8,10),c['id']+' | native cells | NO runtime approval',font=font,fill=(246,212,159))
  for row,a in enumerate(clips):
   d.text((6,50+row*cellh),a['name'],font=font,fill=(215,186,145))
   d.text((6,68+row*cellh),a['phase']+(' LOOP' if a['loop'] else ' ONE-SHOT'),font=font,fill=(150,180,185))
   for col,n in enumerate(a['frames']):
    f=Image.open(OUT/batch/c['package']/(c['role']+'_frames')/(n+'.png')).convert('RGBA')
    px=170+col*cellw+(cellw-c['canvas'][0])//2;py=42+row*cellh+18
    im.paste(f,(px,py),f);d.text((px,py+c['canvas'][1]+1),str(a['frameDurationsMs'][col])+'ms',font=font,fill=(145,145,150))
   if a['phase'] in ['travel','loop','release','cast','gallop','impact']:
    n=a['frames'][min(2,len(a['frames'])-1)];f=Image.open(OUT/batch/c['package']/(c['role']+'_frames')/(n+'.png')).convert('RGBA')
    entries.append((c['id'],a['name'],f))
  name=c['id']+'_contact_1x.png';im.save(folder/name)
  # Keep the overview of actual native export pixels; never enlarge concept art.
 # Select diverse roles instead of filling the overview with one component's facings.
 selected=[]
 for cid in dict.fromkeys(e[0] for e in entries):
  options=[e for e in entries if e[0]==cid];selected.append(next((e for e in options if 'right' in e[1]),options[0]))
 selected=(selected+[e for e in entries if e not in selected])[:18]
 for i,(cid,tag,f) in enumerate(selected):
  x=16+(i%4)*318;y=44+(i//4)*326
  draw.text((x,y),cid[:27],font=font,fill=(220,190,150));draw.text((x,y+17),tag[:29],font=font,fill=(165,180,190))
  overview.paste(f,(x+(300-f.width)//2,y+36),f)
 overview.save(folder/'batch_contact_overview_1x.png')
 background=Image.open(ROOT/'docs/evidence/m3c3-feedback/six-player-combat-1280.png').convert('RGB')
 mock=background.copy();d=ImageDraw.Draw(mock);d.rectangle((14,112,500,155),fill=(20,21,25));d.text((22,117),batch+' V2 PIXEL MOCKUP / NOT GAME CAPTURE',font=font,fill=(255,220,155));d.text((22,136),'Export pixels at display2x; server timing is independent',font=font,fill=(225,225,225))
 positions=[(310,310),(600,280),(930,310),(1060,510)]
 for item,(x,y) in zip(config.get('mockup',[]),positions):
  target=next(a for a in config['components'] if a['id']==item['component']);n=item['tag']+'_'+str(item.get('frame',2))
  f=Image.open(OUT/batch/target['package']/(target['role']+'_frames')/(n+'.png')).convert('RGBA')
  f=f.resize((f.width*2,f.height*2),Image.Resampling.NEAREST);pivot=target['pivot']
  mock.paste(f,(x-pivot[0]*2,y-pivot[1]*2),f);d.text((x-60,y+24),item.get('label',item['tag'])[:25],font=font,fill=(255,232,185),stroke_width=1,stroke_fill=(15,15,15))
 mock.save(folder/'gameplay_mockup_2x_1280.png');mock.resize((640,360),Image.Resampling.NEAREST).save(folder/'gameplay_mockup_1x_640.png')
 lines=['# '+batch+' - production handoff','','Status: **'+STATUS+'**. Concept and staff sample approved; not integrated or verified in Phaser.','','[Native contact overview](batch_contact_overview_1x.png) · [Gameplay mockup display2x](gameplay_mockup_2x_1280.png) · [Logical1x](gameplay_mockup_1x_640.png) · [File validation](file_validation.json)','','Mockup uses exact exported pixels over historical gameplay; it is not a new game capture. Character/shadow/runtime authority remain separate.','','| Asset / role | Source | PNG | Atlas | Metadata | Contact sheet |','|---|---|---|---|---|---|']
 import os
 rel=lambda p:Path(os.path.relpath(ROOT/p,folder)).as_posix()
 for c in manifest['components']:
  lines.append('| '+c['id']+' | [ASE]('+rel(c['source'])+') | [PNG]('+rel(c['sheet'])+') | [JSON]('+rel(c['atlas'])+') | [phases]('+rel(c['metadata'])+') | [PNG]('+c['id']+'_contact_1x.png) |')
 lines+=['','## Skill / server-stage handoff','','| Skill/stage | New asset role/tag | Binding/lifetime |','|---|---|---|']
 for h in config['handoff']:lines.append('| '+h['skill']+' / '+h['stage']+' | '+h['asset']+' / '+h['tag']+' | '+h['binding']+' |')
 lines+=['','No game code, Phaser, runtime mapping or approval locks changed. New editable sources have separate character/projectile/impact/ground/aura roles. All contact markers are visual only; server events decide hits. Loops follow authoritative action/status/projectile lifetime and cancel on cleanup.','', 'Reuse/transform details and exact file hashes: source production_manifest.json and *_frame_plan.json. Retained sources are copied as actual pixels, not regenerated. New source is original AI-assisted raster; no concept-sheet crops, geometry-generated art, exclusive-rights or human hand-pixelled authorship claim.','', 'Runtime gate remains: actual four-facing frame playback, feet/Y-depth, timing/cancellation, weapon/hand continuity, normal zoom and six-player readability in Phaser. No GIF/video.']
 (folder/'README.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
def validate(batch):
 manifest=load(SRC/batch/'production_manifest.json');result={'status':'PASS','batch':batch,'runtimeIntegrated':False,'runtimeApproved':False,'phaserChecked':False,'components':[]}
 for c in manifest['components']:
  j=load(ROOT/c['atlas']);meta=load(ROOT/c['metadata']);im=Image.open(ROOT/c['sheet']).convert('RGBA');a=np.asarray(im);binary=set(np.unique(a[:,:,3]))<={0,255};assert binary or c['role']=='afterimage'
  n=0
  for clip in meta['animations']:
   assert clip['frameCount']==len(clip['frames'])==len(clip['frameDurationsMs']) and clip['phase'] and clip['direction']
   for f in clip['frames']:
    rec=j['frames'][f];r=rec['frame'];cel=im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));pix=np.asarray(cel);assert pix[:,:,3].any(),(c['id'],f,'empty');assert not rec['trimmed'] and not rec['rotated']
    path=OUT/batch/c['handoffId']/(c['role']+'_frames')/(f+'.png')
    assert np.array_equal(pix,np.asarray(Image.open(path).convert('RGBA')))
    assert not pix[0,:,3].any() and not pix[-1,:,3].any() and not pix[:,0,3].any() and not pix[:,-1,3].any(),(c['id'],f,'clipping')
    n+=1
  assert n==len(j['frames'])
  result['components'].append({'id':c['id'],'frames':n,'tags':len(meta['animations']),'binaryAlpha':binary,'nonempty':True,'noEdgeClipping':True,'atlasFrameEquality':True})
 snap=load(SRC/'protected_snapshot.json');changed=[p for p,h in snap.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h];assert not changed,changed
 result['protectedFiles']=len(snap);result['protectedHashChanges']=changed;result['totalFrames']=sum(c['frames'] for c in result['components']);result['totalTags']=sum(c['tags'] for c in result['components']);result['recordingsCreated']=False
 save(REVIEW/batch/'file_validation.json',result)
 print(json.dumps({k:v for k,v in result.items() if k!='components'}),flush=True)
if __name__=='__main__':
 if len(sys.argv)<2:raise SystemExit('batch required')
 build(sys.argv[1],'--characters-only' in sys.argv)
