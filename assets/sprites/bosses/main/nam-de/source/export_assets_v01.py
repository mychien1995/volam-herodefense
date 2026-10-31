"""Offline Nam De asset export. Reuses retained PNG/atlas helpers; no game writes."""
from pathlib import Path
import json, hashlib, math
ROOT=Path(__file__).resolve().parents[6]
helper=ROOT/'assets/sprites/bosses/main/dong-ta/source/export_assets_v01.py'
code=helper.read_text(encoding='utf-8').split('BOSS=')[0]
code=code.replace("main/dong-ta","main/nam-de")
# Place whole actors at a feet-support anchor instead of preserving source-grid drift.
code=code.replace("x=round(pivot[0]+(rect[0]-(c+.5)*cw)*scale)",
"""aa=np.array(cut.getchannel('A')); fy=max(0,cut.height-max(2,round(cut.height*.06))); foot=np.flatnonzero((aa[fy:,:]>=128).any(0))
  footx=(float(foot[0]+foot[-1])/2) if len(foot) else cut.width/2
  x=round(pivot[0]-footx)""")
exec(compile(code,str(helper),'exec'))
cfg=json.loads((BASE/'source/generation_jobs_v01.json').read_text(encoding='utf-8-sig'))
jobs={j['key']:j for j in cfg['jobs']}
def source(k):return ROOT/jobs[k]['path']
A=['idle','walk','palm_attack','finger_charge','finger_release','rapid_fingers','pressure_point']
B=['defensive_stance','healing_meditation','ultimate_charge','ultimate_release','hurt','death']
states=A+B
cels=[];clips=[];rowlog={}
idle,idle_rows=actor_cells(source('idle_refinement'),['down','up','right','left'],56,(160,112),(80,88))
defense,_=actor_cells(source('defensive_right_refinement'),['first','second'],56,(160,112),(80,88),columns=2)
for d in DIRS:
 ka='actor_up_a_v02' if d=='up' else 'actor_'+d+'_a'
 ca,rows_a=actor_cells(source(ka),A,56,(160,112),(80,88),skip=['idle'])
 cb,rows_b=actor_cells(source('actor_'+d+'_b'),B,56,(160,112),(80,88),skip=['defensive_stance'] if d=='right' else [])
 allcells={**ca,**cb}
 for c in range(4):
  allcells[('idle',c)]=idle[(d,c)]
  if d=='right':allcells[('defensive_stance',c)]=defense[(['first','second'][c//2],c%2)]
 for act in states:
  names=[]
  for c in range(4):
   name=f'{act}_{d}_{c}';names.append(name);im,src=allcells[(act,c)]
   cels.append((name,im,src))
  clips.append({'name':act+'_'+d,'direction':d,'frames':names,'durationMs':300 if act=='idle' else 140 if act=='walk' else 180 if act=='ultimate_charge' else 140 if act=='death' else 100,'repeat':-1 if act in ['idle','walk'] else 0,'placement':'actor'})
 rowlog[d]={'a':rows_a,'b':rows_b}
atlas(BASE,'boss_nam_de',cels,clips,(160,112),(80,88))
dump(BASE/'source/extracted_rows_v01.json',rowlog)

def fxclean(im):
 # Remove nearly invisible colored RGB matte; retain genuine translucent energy.
 a=np.array(im).copy()
 a[:,:,3]=np.where(a[:,:,3]<32,0,a[:,:,3])
 rgb=a[:,:,:3];mx=rgb.max(2);mn=rgb.min(2)
 matte=(mx>248)&(mn<8)&((rgb<8).sum(2)+(rgb>248).sum(2)==3)
 a[matte,3]=0;a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)

telegraph_rows={'line_warning':0,'directional_warning':1,'pressure_warning':2,'shield_warning':3,'healing_warning':4,'multiline_warning':5}
telegraph=load(source('telegraphs'))
fxmap=[]
for skill,category,families,brief in cfg['fxSpecs']:
 folder=ROOT/f'assets/effects/bosses/main/nam-de/{category}/{skill}'
 original=load(source('fx_'+skill));families=families[:]
 if skill=='dai_ly_phong_huyet':families+=['pressure_warning']
 if skill=='kim_cang_ho_the':families+=['shield_warning']
 if skill=='phat_quang_pho_chieu':families+=['healing_warning']
 cels=[];clips=[];size=(192,192) if category=='ultimate' else (160,160);pivot=(size[0]//2,size[1]//2)
 # Source rows are equal nominal cells; use a common scale for all cels in a family.
 for r,fam in enumerate(families):
  warning=fam in telegraph_rows
  src=telegraph if warning else original
  source_key='telegraphs' if warning else 'fx_'+skill
  row=telegraph_rows[fam] if warning else r
  nr=6 if warning else len(jobs[source_key]['rows'])
  cw=src.width/4;ch=src.height/nr;scale=min((size[0]-16)/cw,(size[1]-16)/ch)
  names=[]
  for c in range(4):
   rect=(round(c*cw),round(row*ch),round((c+1)*cw),round((row+1)*ch))
   cut=fxclean(src.crop(rect));cut=cut.resize((round(cut.width*scale),round(cut.height*scale)),Image.Resampling.NEAREST)
   frame=Image.new('RGBA',size);frame.paste(cut,((size[0]-cut.width)//2,(size[1]-cut.height)//2))
   name=fam+'_'+str(c);names.append(name)
   cels.append((name,frame,{'path':rel(source(source_key)),'rect':list(rect),'scale':scale,'method':'fixed source cell; shared family scale; nearest export; true partial alpha retained above matte threshold'}))
  clips.append({'name':fam,'frames':names,'durationMs':120 if warning else 100,'repeat':-1 if fam in ['protective_aura','circular_shield','meditation_aura','permanent_body_aura','stun_status','slow_status'] else 0,'placement':'ground' if warning or any(s in fam for s in ['ground','shockwave']) else 'overlay','telegraph':warning,'role':'warning' if warning else 'healing' if category=='healing' else 'defense' if category=='defense' else 'effect','direction':'right' if any(s in fam for s in ['projectile','beam','palm_trail','line_warning','directional_warning','pressure_warning']) else None})
 aid='vfx_'+skill
 atlas(folder,aid,cels,clips,size,pivot)
 fxmap.append({'skillId':skill,'folder':rel(folder),'atlas':rel(folder/(aid+'.json')),'animations':rel(folder/(aid+'.animations.json')),'groups':families})

icons=load(source('icons'))
# Locate actual authored icon frames rather than slicing uneven presentation gutters.
parts=[b for b in components(icons) if b[4]>10000]
parts=sorted(parts,key=lambda b:b[4],reverse=True)[:9]
parts=sorted(parts,key=lambda b:(round((b[1]+b[3])/2/100),b[0]))
if len(parts)!=9:raise ValueError('Expected nine separate icon borders')
for name,b in zip(cfg['iconNames'],parts):
 rect=tuple(b[:4]);cut=clean(icons.crop(rect))
 for canvas in ([64,256] if name=='portrait_nam_de' else [64]):
  target=canvas-4;sc=min(target/cut.width,target/cut.height)
  scaled=cut.resize((round(cut.width*sc),round(cut.height*sc)),Image.Resampling.NEAREST)
  frame=Image.new('RGBA',(canvas,canvas));frame.paste(scaled,((canvas-scaled.width)//2,(canvas-scaled.height)//2))
  filename=name+('_256' if canvas==256 else '')+'.png'
  write_png(ROOT/'assets/icons/bosses/nam-de'/filename,frame,'portrait' if name.startswith('portrait') else 'icon',{'path':rel(source('icons')),'rect':list(rect)},[.5,.5])

for path in [cfg['masterConcept']['path'],'assets/concepts/main-bosses/nam-de/individual_concept_v01.png']:
 p=ROOT/path
 ASSETS.append({'path':path,'id':p.stem,'kind':'concept','size':list(load(p).size),'sha256':sha(p),'status':'concept_automatically_approved_by_explicit_task_instruction','source':'original built-in image_gen','origin':None})
for j in cfg['jobs']:
 j['size']=list(load(ROOT/j['path']).size);j['sha256']=sha(ROOT/j['path'])
 j['use']='rejected_wrong_facing_retained_only' if j['key']=='actor_up_a' else 'retained_source_with_selected_cels'
manifest={'schemaVersion':1,'id':'nam_de_complete_art_package_v01','bossId':'boss_nam_de','nameVi':'Nam Đế — Nhất Đăng Đại Sư (Đoàn Trí Hưng)','date':cfg['date'],'scope':'asset_production_only','conceptApproval':'automatic_by_explicit_user_instruction','productionStatus':'produced_asset_only_candidate','runtimeIntegrated':False,'runtimeVerified':False,'runtimeApproved':False,'sprite':{'image':rel(BASE/'boss_nam_de.png'),'atlas':rel(BASE/'boss_nam_de.json'),'animations':rel(BASE/'boss_nam_de.animations.json'),'frameSize':[160,112],'feetPivotPx':[80,88],'standingBodyHeightApproxPx':56,'sampling':'nearest'},'provenance':{'generator':'built-in image_gen','license':'Original AI-assisted raster artwork produced for this project brief; no third-party sprite pack or proprietary game pixels copied; no exclusive copyright claim.','sourceKind':'Retained flattened PNG animation sheets; no layered Aseprite source claimed.','prompts':rel(BASE/'source/generation_jobs_v01.json'),'preparation':'Reused existing offline PNG extraction/atlas helpers, actual drawn cels, nearest export, fixed feet canvas; no synthetic idle transforms.'},'assets':ASSETS,'sources':[{'key':j['key'],'path':j['path'],'size':j['size'],'sha256':j['sha256'],'use':j['use']} for j in cfg['jobs']],'animations':CLIPS,'skillVfx':fxmap,'reviewedReferences':[{'path':p,'sha256':sha(ROOT/p)} for p in cfg['referencePaths']],'counts':{'characterFrames':208,'characterAnimationGroups':52,'vfxFrames':sum(len(x['groups'])*4 for x in fxmap),'vfxAnimationGroups':sum(len(x['groups']) for x in fxmap),'iconsAndPortraitVariants':10,'concepts':2},'missingProductionAssets':[],'limitations':['Asset files only: no Phaser loading, live motion, transition or six-player readability verification.','All playback timings are visual proposals, never damage/heal/status/attack timing.','Actors use four cardinal facings; most directional effects are canonical screen-right.','Flattened sources are editable PNGs; no recovered paint layers.']}
dump(BASE/'package_manifest_v01.json',manifest)
dump(BASE/'source/generation_jobs_v01.json',cfg)
print(json.dumps({'pngExports':len(ASSETS),'animationGroups':len(CLIPS),'counts':manifest['counts']}))

