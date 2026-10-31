"""Export only the isolated Cái Bang Bổng v2 sample; never registers assets in Phaser."""
from pathlib import Path
import argparse,json,subprocess
from PIL import Image
ROOT=Path(__file__).resolve().parents[6];SRC=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2'
ASEPRITE=Path('C:/Program Files/Aseprite/Aseprite.exe')
parser=argparse.ArgumentParser();parser.add_argument('--assemble',action='store_true');parser.add_argument('--kind',choices=['all','character','vfx'],default='all');args=parser.parse_args();kinds=['character','vfx'] if args.kind=='all' else [args.kind]
def run(cmd):
 p=subprocess.run([str(x) for x in cmd],capture_output=True,text=True,creationflags=subprocess.CREATE_NO_WINDOW)
 if p.stdout:print(p.stdout,flush=True)
 if p.stderr:print(p.stderr,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
if args.assemble:
 for name in kinds:run([ASEPRITE,'-b','--script-param','root='+ROOT.as_posix(),'--script',SRC/'tools'/('assemble_'+name+'.lua')])
for kind in kinds:
 name='cai_bang_bong_combo_v2_'+kind;source=SRC/(name+'.aseprite');png=OUT/(name+'.png');atlas=OUT/(name+'.json')
 assert source.is_file(),source
 run([ASEPRITE,'-b',source,'--sheet-type','rows','--sheet-columns','6','--border-padding','2','--shape-padding','2','--format','json-hash','--list-tags','--list-slices','--filename-format','{tag}_{tagframe}','--sheet',png,'--data',atlas])
 j=json.loads(atlas.read_text(encoding='utf-8'));im=Image.open(png).convert('RGBA');tags=j['meta']['frameTags'];animations=[]
 assert len(j['frames'])==96 and len(tags)==16,(kind,len(j['frames']),len(tags))
 for tag in tags:
  pieces=tag['name'].split('_');beat=pieces[1];direction=pieces[2];names=[tag['name']+'_'+str(i) for i in range(6)]
  assert all(n in j['frames'] for n in names),(kind,names)
  durations=[j['frames'][n]['duration'] for n in names]
  for n in names:
   f=j['frames'][n]['frame'];im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])).save(OUT/(kind+'_frames')/(n+'.png'))
  phases=([{'name':'anticipation','frames':names[:2]},{'name':'contact','frames':[names[2]]},{'name':'follow_through','frames':[names[3]]},{'name':'recovery','frames':[names[4]]},{'name':'handoff','frames':[names[5]]}] if kind=='character' else [{'name':p,'frames':[n]} for p,n in zip(['anticipation','buildup','contact','follow_through','decay','ending'],names)])
  a={'name':tag['name'],'direction':direction,'comboBeat':beat,'frames':names,'frameCount':6,'frameDurationsMs':durations,'durationMsTotal':sum(durations),'loop':False,'repeat':0,'phases':phases,'frameDimensions':[112,100] if kind=='character' else [160,160],'pivot':[56,80] if kind=='character' else [80,80],'origin':[0.5,0.8] if kind=='character' else [0.5,0.5],'displayScale':1,'timingAuthority':'Visual cadence only. Never derive damage, collision, hits, cooldowns or combo authority from these cels.'}
  if kind=='character':
   nextbeat={'thrust':'sweep','sweep':'rising','rising':'overhead','overhead':'thrust'}[beat]
   a['handoffTo']='combo_'+nextbeat+'_'+direction+'_0'
  else:
   fx=json.loads((SRC/'vfx_layout.json').read_text(encoding='utf-8'))
   a.update({'stage':'basic_combo_accent','placement':'owner_feet_plus_authored_offset','effectPlacementOffset':next(f['placementOffsetFromFeet'] for f in fx['frames'] if f['beat']==beat and f['direction']==direction)})
  animations.append(a)
 metadata={'schemaVersion':2,'frameTimingMode':'per_frame_duration_ms','id':name,'status':'PRODUCTION_CANDIDATE_PENDING_RUNTIME_REVIEW','kind':kind,'conceptApproved':True,'runtimeIntegrated':False,'runtimeApproved':False,'source':source.relative_to(ROOT).as_posix(),'sheet':png.relative_to(ROOT).as_posix(),'atlas':atlas.relative_to(ROOT).as_posix(),'frameDimensions':[112,100] if kind=='character' else [160,160],'pivot':[56,80] if kind=='character' else [80,80],'origin':[0.5,0.8] if kind=='character' else [0.5,0.5],'displayScale':1,'animations':animations}
 (OUT/(name+'.animations.json')).write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
 print(kind,'exported',len(j['frames']),'frames',len(tags),'tags',im.size,flush=True)
