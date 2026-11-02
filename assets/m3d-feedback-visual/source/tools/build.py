"""Art-only adapter of the retained M3C3 raster/Aseprite pipeline. No game imports."""
from pathlib import Path
import sys,json,hashlib,subprocess,math,copy
from PIL import Image,ImageDraw,ImageFont
import numpy as np
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[4]
BASE=ROOT/'assets/m3d-feedback-visual'
SRC=BASE/'source'; OUT=BASE/'exported'; PRE=BASE/'previews'
OLD=ROOT/'assets/source/skills/m3c3_feedback_v2_batches/tools'
sys.path.insert(0,str(OLD))
import measure_characters as mc,measure_effects as me
mc.BASE=SRC;me.BASE=SRC
ASE=Path('C:/Program Files/Aseprite/Aseprite.exe')
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,j):p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def rel(p):return p.relative_to(ROOT).as_posix()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args):
 r=subprocess.run([str(x) for x in args],capture_output=True,text=True,creationflags=subprocess.CREATE_NO_WINDOW)
 if r.returncode:raise RuntimeError(r.stdout+r.stderr)
 return r.stdout
def build():
 config=read(SRC/'plan.json');prepared=[]
 selected=sys.argv[sys.argv.index('--only')+1].split(',') if '--only' in sys.argv else None
 approval=BASE/'approved_visual_r2.lock.json'
 if approval.exists():
  locked={c['id'] for c in read(approval)['components']}
  targets=set(selected) if selected else {c['id'] for c in config['components']}
  if targets & locked:raise RuntimeError('Approved visual r2 export is locked. Use a new revision/ID; do not overwrite approved source or exports.')
 if selected:config['components']=[c for c in config['components'] if c['id'] in selected]
 for sid,s in config['sources'].items():
  if s['kind']=='character':mc.measure('',sid,s['rows'],s['cols'],s.get('bodyHeight',44))
  else:me.measure('',sid,s['rows'],s['cols'])
 chars=read(SRC/'character_measurements.json') if (SRC/'character_measurements.json').exists() else {}
 effects=read(SRC/'effect_measurements.json') if (SRC/'effect_measurements.json').exists() else {}
 for c in config['components']:
  c=copy.deepcopy(c);frames=[];dest=OUT/c['id'];dest.mkdir(exist_ok=True)
  (dest/'frames').mkdir(exist_ok=True)
  for clip in c['clips']:
   specs=[]
   for i,selection in enumerate(clip['selections']):
    sid=selection['source'];s=config['sources'][sid];index=selection['index']
    e=(chars if s['kind']=='character' else effects)[sid]['frames'][index]
    bounds=e.get('bounds');rect=[bounds[0],bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]] if bounds else e['rect']
    if s['kind']=='character':
     anchor=[e['foot'][0]-rect[0],e['foot'][1]-rect[1]]
     ref=(index//s['cols'])*s['cols']+s.get('referenceColumn',0)
     scale=s.get('bodyHeight',44)/chars[sid]['frames'][ref]['bodyHeight']
    else:
     anchor=e['anchor'];scale=s['scale']*selection.get('scale',1)
     if s.get('anchor')=='left':anchor=[0,rect[3]/2]
     if s.get('anchor')=='bottom' or selection.get('anchor')=='bottom':anchor=[rect[2]/2,rect[3]]
     if selection.get('anchor')=='left':anchor=[0,rect[3]/2]
     if selection.get('anchor')=='ground':
      peers=effects[sid]['frames'][(index//s['cols'])*s['cols']:(index//s['cols']+1)*s['cols']]
      baseline=float(np.median([q['rect'][1]+q['rect'][3] for q in peers]));width=float(np.median([q['rect'][2] for q in peers]))
      anchor=[rect[2]/2,baseline-width*.12-rect[1]]
    f={'source':rel(SRC/'generated'/(sid+'.png')),'rect':rect,'runs':e['runs'],'anchor':anchor,'scale':scale,'scaleY':1,'threshold':220,'kind':s['kind'],'pivot':c['pivot'],'name':clip['name']+'_'+str(i),'tag':clip['name'],'durationMs':clip['durations'][i]}
    for key in ['rotation','mirror','scaleY','opacity']:
     if key in selection:f[key]=selection[key]
    frames.append(f);specs.append(f['name'])
   clip['frames']=specs
   clip['frameCount']=len(specs);clip['durationMsTotal']=sum(clip['durations'])
   clip['frameDurationsMs']=clip.pop('durations');clip.pop('selections')
   clip['frameRate']=1000/(sum(clip['frameDurationsMs'])/len(clip['frameDurationsMs']));clip['repeat']=-1 if clip['loop'] else 0;clip['oneShot']=not clip['loop'];clip['origin']=[c['pivot'][0]/c['canvas'][0],c['pivot'][1]/c['canvas'][1]]
  c['frames']=frames;c['sourceFile']=rel(SRC/(c['id']+'.aseprite'));c['individualDirectory']=rel(dest/'frames')
  c['role']=c.get('role','character')
  if c.get('paletteReference'):
   pp=ROOT/c['paletteReference'];pixels=np.asarray(Image.open(pp).convert('RGBA'));colors=pixels[:,:,:3][pixels[:,:,3]>220]
   q=Image.fromarray(colors.reshape(1,-1,3)).quantize(colors=192,method=Image.Quantize.MEDIANCUT);palette=q.getpalette()
   c['palette']=[palette[i:i+3] for i in range(0,576,3)];c['paletteReferenceSha256']=sha(pp)
  prepared.append(c)
 save(SRC/'assembly_plan.json',{'components':prepared,'newCharacterPalette':[]})
 original=(OLD/'assemble.lua').read_text(encoding='utf-8')
 adapted=original.replace("local folder=root..'/assets/source/skills/m3c3_feedback_v2_batches/'..batch","local folder=root..'/assets/m3d-feedback-visual/source'")
 adapted=adapted.replace('plan.newCharacterPalette','component.palette or plan.newCharacterPalette')
 adapted=adapted.replace('#component.palette or plan.newCharacterPalette','#(component.palette or plan.newCharacterPalette)')
 adapted=adapted.replace('and component.palette or plan.newCharacterPalette and','and (component.palette or plan.newCharacterPalette) and')
 adapted=adapted.replace('if not app.params.role or component.role==app.params.role then','if not app.params.role or component.role==app.params.role then\n paletteCache={}')
 adapted=adapted.replace('if f.mirror then canvas:flip(FlipType.HORIZONTAL) end','if f.mirror then canvas:flip(FlipType.HORIZONTAL);local shifted=Image(w,h,ColorMode.RGB);shifted:drawImage(canvas,Point(1,0));canvas=shifted end')
 (SRC/'tools/assemble.lua').write_text(adapted,encoding='utf-8')
 print(run([ASE,'-b','--script-param','root='+ROOT.as_posix(),'--script-param','batch=isolated','--script',SRC/'tools/assemble.lua']))
 manifest={'schemaVersion':1,'status':'exported','directorApproved':False,'productionIntegrated':False,'phaserProductionVerified':False,'components':[]}
 for c in prepared:
  dest=OUT/c['id'];sheet=dest/(c['id']+'.png');atlas=dest/(c['id']+'.json')
  run([ASE,'-b',ROOT/c['sourceFile'],'--sheet-type','rows','--sheet-columns',str(max(4,math.ceil(math.sqrt(len(c['frames'])*c['canvas'][1]/c['canvas'][0])))),'--border-padding','2','--shape-padding','2','--format','json-hash','--list-tags','--list-slices','--filename-format','{tag}_{tagframe}','--sheet',sheet,'--data',atlas])
  meta={k:v for k,v in c.items() if k not in ['frames','clips']}
  meta.update({'frameDimensions':c['canvas'],'displayScale':1,'origin':[c['pivot'][0]/c['canvas'][0],c['pivot'][1]/c['canvas'][1]],'animations':c['clips'],'sheet':rel(sheet),'atlas':rel(atlas),'status':'exported','directorApproved':False,'timingAuthority':'All duration/FPS and anchors are visual suggestions. Never infer damage, hitboxes or cooldowns from frames.'})
  save(dest/(c['id']+'.animations.json'),meta)
  manifest['components'].append(meta)
  contact(c,dest)
 if selected:
  old=read(BASE/'manifest.json');manifest['components']=[c for c in old['components'] if c['id'] not in selected]+manifest['components']
 save(BASE/'manifest.json',manifest)
 validate()
def contact(c,dest):
 font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
 columns=max(len(a['frames']) for a in c['clips']);w,h=c['canvas']
 im=Image.new('RGB',(190+columns*w,38+len(c['clips'])*(h+22)),(25,29,35));d=ImageDraw.Draw(im)
 d.text((8,8),c['id']+' / NATIVE PIXELS / NOT GAME CAPTURE',font=font,fill='#f6deac')
 for row,a in enumerate(c['clips']):
  y=38+row*(h+22);d.text((6,y+8),a['name'],font=font,fill='#ddcaa4')
  for col,n in enumerate(a['frames']):
   f=Image.open(dest/'frames'/(n+'.png')).convert('RGBA');x=190+col*w
   im.paste(f,(x,y),f)
   px,py=c['pivot'];d.line((x+px-2,y+py,x+px+2,y+py),fill='#64857b');d.line((x+px,y+py-2,x+px,y+py+2),fill='#64857b')
   d.text((x+5,y+h+2),str(a['frameDurationsMs'][col])+'ms',font=font,fill='#8fa0ae')
 im.save(PRE/(c['id']+'_contact_1x.png'))
def validate():
 m=read(BASE/'manifest.json');report={'status':'PASS','components':[],'productionIntegrated':False,'phaserProductionVerified':False,'directorApproved':False,'recordingsCreated':False}
 for c in m['components']:
  atlas=read(ROOT/c['atlas']);sheet=Image.open(ROOT/c['sheet']).convert('RGBA');seen=set();bounds={}
  assert list(sheet.size)==[atlas['meta']['size']['w'],atlas['meta']['size']['h']]
  for clip in c['animations']:
   assert clip['phase'] and clip['direction'];assert len(clip['frames'])==len(clip['frameDurationsMs'])
   for name,ms in zip(clip['frames'],clip['frameDurationsMs']):
    assert name not in seen;seen.add(name);assert ms>0
    f=atlas['frames'][name];r=f['frame'];assert not f['rotated'] and not f['trimmed']
    assert r['x']>=0 and r['y']>=0 and r['x']+r['w']<=sheet.width and r['y']+r['h']<=sheet.height
    cel=sheet.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']));a=np.asarray(cel)
    assert cel.size==tuple(c['canvas']);assert a[:,:,3].any(),(c['id'],name,'empty')
    assert not (a[0,:,3].any() or a[-1,:,3].any() or a[:,0,3].any() or a[:,-1,3].any()),(c['id'],name,'edge clipping')
    individual=Image.open(OUT/c['id']/'frames'/(name+'.png')).convert('RGBA')
    assert np.array_equal(a,np.asarray(individual));bounds[name]=list(cel.getbbox())
   assert clip['repeat']==(-1 if clip['loop'] else 0)
  assert seen==set(atlas['frames'])
  assert all(0<=n<=1 for n in c['origin'])
  assert (ROOT/c['sourceFile']).exists()
  report['components'].append({'id':c['id'],'frames':len(seen),'clips':len(c['animations']),'rgba':True,'atlasEquality':True,'noEdgeClipping':True,'frameBounds':bounds,'pivot':c['pivot']})
 report['totalFrames']=sum(c['frames'] for c in report['components'])
 report['totalClips']=sum(c['clips'] for c in report['components'])
 save(PRE/'validation.json',report);print(json.dumps({k:v for k,v in report.items() if k!='components'}))
if __name__=='__main__':
 if '--validate' in sys.argv:validate()
 else:build()
