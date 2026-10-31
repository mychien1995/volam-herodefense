from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[5]
BASE=ROOT/'assets/source/skills/m3c3_feedback_v2_batches'
DIRS=['down','left','right','up']
def load(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def rel(p):return Path(p).relative_to(ROOT).as_posix()
def retained(school,skill,kind,tag):
 folder=ROOT/'assets/exports/skills'/school/skill;name=skill+'_'+kind
 j=load(folder/(name+'.animations.json'));a=next((x for x in j['animations'] if x['name']==tag),None)
 if a is None:raise KeyError((skill,kind,tag,[x['name'] for x in j['animations']]))
 dims=a.get('frameDimensions',j['frameDimensions']);anchor=a.get('pivot',j.get('pivot'))
 if anchor is None:anchor=[dims[0]*a.get('origin',[0.5,0.5])[0],dims[1]*a.get('origin',[0.5,0.5])[1]]
 return [{'kind':'atlas','sheet':j['sheet'],'atlas':j['atlas'],'frame':n,'anchor':anchor,'sourceProvenance':a.get('provenance','retained project raster, no regeneration')} for n in a['frames']]
def basic(hero,direction,state='basic_attack'):
 folder=ROOT/'assets/exports/characters';atlas=folder/(hero+'.json');j=load(atlas);prefix=state+'_'+direction+'_'
 names=sorted([k for k in j['frames'] if k.startswith(prefix)],key=lambda s:int(s.rsplit('_',1)[1]))
 assert names,(hero,direction,state)
 f=j['frames'][names[0]]['sourceSize'];pivot=[f['w']/2,f['h']*0.8]
 return [{'kind':'atlas','sheet':rel(folder/(hero+'.png')),'atlas':rel(atlas),'frame':n,'anchor':pivot,'sourceProvenance':'approved baseline raster, preserved'} for n in names]
def sample(beat,direction,kind='character'):
 folder=ROOT/'assets/exports/skills/cai-bang/cai_bang_bong_a_m3c3_feedback_v2';name='cai_bang_bong_combo_v2_'+kind;j=load(folder/(name+'.animations.json'));a=next(x for x in j['animations'] if x['name']=='combo_'+beat+'_'+direction)
 return [{'kind':'atlas','sheet':j['sheet'],'atlas':j['atlas'],'frame':n,'anchor':j['pivot'],'sourceProvenance':'director-approved Bong sample copied exactly; never regenerated'} for n in a['frames']]
def fx(source,row,scale,rows=4,cols=6,indexes=None,rotation=0,mirror=False,anchor=None):
 return [{'kind':'raw','sourceId':source,'rows':rows,'cols':cols,'row':row,'col':i,'scale':scale,'rotation':rotation,'mirror':mirror,'anchor':anchor or [0.5,0.5],'sourceProvenance':'new original image_gen production raster'} for i in (indexes if indexes is not None else range(cols))]
def character(source,components,mirror=False):
 return [{'kind':'character','sourceId':source,'component':i,'mirror':mirror,'sourceProvenance':'new original image_gen character poses; fixed strip scale and feet'} for i in components]
class Batch:
 def __init__(self,batch):self.batch=batch;self.components={};self.handoff=[];self.reused=[];self.references=[];self.mockup=[]
 def add(self,package,role,name,frames,phase,direction='nondirectional',loop=False,ms=70,contacts=None,offset=None,**extra):
  key=(package,role)
  if key not in self.components:
   self.components[key]={'package':package,'role':role,'canvas':[160,120] if role=='character' else [256,256],'pivot':[80,96] if role=='character' else [128,128],'clips':[]}
  if any(x['name']==name for x in self.components[key]['clips']):raise ValueError('duplicate '+name)
  durations=ms if isinstance(ms,list) else [ms]*len(frames)
  assert len(durations)==len(frames)
  clip={'name':name,'phase':phase,'direction':direction,'loop':loop,'frames':frames,'durations':durations,'contactFrames':contacts or [],'placementOffsetFromFeet':offset or [0,0],'lifetimeAuthority':'server event/state, never frame clock',**extra}
  self.components[key]['clips'].append(clip)
  return package+'_'+role
 def bind(self,skill,stage,asset,tag,binding):
  self.handoff.append({'skill':skill,'stage':stage,'asset':asset,'tag':tag,'binding':binding})
 def mock(self,component,tag,frame=2,label=None):self.mockup.append({'component':component,'tag':tag,'frame':frame,'label':label or tag})
 def save(self):
  data={'batch':self.batch,'components':list(self.components.values()),'handoff':self.handoff,'preservedReferences':self.references,'reusedSources':self.reused,'mockup':self.mockup}
  (BASE/self.batch/'batch_config.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
  print(self.batch,len(data['components']),'components',sum(len(c['clips']) for c in data['components']),'clips',len(self.handoff),'bindings')
