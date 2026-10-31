from pathlib import Path
from PIL import Image
import json, statistics, math
from source_regions import four_regions
root=Path.cwd();base='assets/source/skills/thien-son'
configs=json.loads(r'''{"lien_hoa_phien":{"style":"fan","charVersion":"v02","ms":70,"canvas":96,"stages":[["sweep","frontal_multi_sweep",false,true,0.125,"caster_front",18,18,true],["contact","local_contact",false,true,0.065,"caster_front",25,18,true]]},"luc_duong_chuong":{"style":"fan","charVersion":"v01","ms":90,"canvas":128,"stages":[["gather","spin_activation",false,false,0.18,"caster_body",0,9,false],["spin","moving_close_spin",true,false,0.2,"caster_body",0,9,false],["expiry","spin_expiry",false,false,0.18,"caster_body",0,9,false]]},"luu_phong_bo":{"style":"fan","charVersion":"v01","ms":75,"canvas":96,"stages":[["trail","movement_dash_trail",false,true,0.125,"caster_rear",16,7,true],["settle","movement_settle",false,false,0.065,"ground",0,0,false]]},"chiet_mai_thu":{"style":"fan","charVersion":"v01","ms":100,"canvas":96,"stages":[["wrist_activation","buff_activation_wrist",false,true,0.045,"caster_hand",9,25,false],["heel_activation","buff_activation_heel",false,false,0.05,"ground",0,0,false],["wrist_loop","buff_loop_wrist",true,true,0.055,"caster_hand",9,25,false],["heel_loop","buff_loop_heel",true,false,0.06,"ground",0,0,false]]},"bach_phien_phong_bao":{"style":"fan","charVersion":"v01","ms":90,"canvas":160,"stages":[["gather","whirlwind_activation",false,false,0.24,"caster_body",0,16,false],["whirlwind","moving_fan_whirlwind",true,false,0.25,"caster_body",0,16,false],["expiry","whirlwind_expiry",false,false,0.24,"caster_body",0,16,false]]},"phi_anh_tram":{"style":"dao","charVersion":"v01","ms":80,"canvas":96,"stages":[["trail","offensive_dash_trail",false,true,0.12,"caster_rear",15,8,true],["slash","hard_close_slash",false,true,0.115,"caster_front",19,18,true]]},"truy_hon_dao":{"style":"dao","charVersion":"v01","ms":75,"canvas":96,"stages":[["first_cut","first_close_cut",false,true,0.115,"caster_front",17,18,true],["second_cut","second_close_cut",false,true,0.115,"caster_front",17,18,true]]},"phong_anh_hoan_vi":{"style":"dao","charVersion":"v01","ms":95,"canvas":96,"stages":[["step","evasive_step_trail",false,true,0.075,"caster_rear",10,5,true],["ready","conditional_counter_ready",true,true,0.035,"caster_hand",9,25,false]]},"liet_phong_dao":{"style":"dao","charVersion":"v01","ms":120,"canvas":96,"stages":[["strike","heavy_close_strike",false,true,0.12,"caster_front",18,18,true],["contact","partial_penetration_contact",false,true,0.065,"caster_front",26,16,true]]},"bach_liet_thien_kich":{"style":"dao","charVersion":"v01","ms":65,"canvas":128,"stages":[["coil","flurry_preparation",false,true,0.085,"caster_hand",9,23,true],["flurry","forward_local_melee_flurry",true,true,0.13,"caster_front",19,18,true],["finisher","close_finishing_cut",false,true,0.14,"caster_front",19,18,true]]}}''')
recipe={'schemaVersion':1,'assets':[],'icons':[],'scope':'Production prototypes after explicit all-concept approval; no gameplay changes'}
def readalpha(file):
 im=Image.open(root/file).convert('RGBA')
 values=[]
 for r,g,b,a in im.getdata():
  fringe=max(r,g,b)>180 and min(r,g,b)<55 and max(r,g,b)-min(r,g,b)>170
  values.append(255 if a>=220 and not fringe else 0)
 mask=Image.new('L',im.size);mask.putdata(values)
 return im,mask
def cuts(mask,axis,count,lo,hi):
 size=mask.width if axis=='x' else mask.height;out=[0]
 for i in range(1,count):
  ideal=round(size*i/count);options=[]
  for v in range(max(out[-1]+1,ideal-100),min(size,ideal+101)):
   b=mask.crop((v,lo,v+1,hi) if axis=='x' else (lo,v,hi,v+1)).getbbox()
   if b is None:options.append(v)
  if not options:raise ValueError('No transparent separator '+axis+':'+str(i)+' in '+f+' span '+str((lo,hi)))
  out.append(min(options,key=lambda v:abs(v-ideal)))
 out.append(size);return out
def character_frame(file,im,mask,rect,isolation=None):
 cut=mask.crop((rect[0],rect[1],rect[0]+rect[2],rect[1]+rect[3]))
 if isolation is not None:
  cut=Image.new('L',(rect[2],rect[3]))
  for yy,xx,length in isolation:cut.paste(255,(xx,yy,xx+length,yy+1))
 b=cut.getbbox();assert b
 bottom=b[3]-1
 haircounts={};navycounts={};navypoints=[]
 for y in range(b[1],b[3]):
  for x in range(b[0],b[2]):
   if not cut.getpixel((x,y)):continue
   rr,gg,bb,aa=im.getpixel((rect[0]+x,rect[1]+y))
   if 20<rr<160 and rr>gg+10 and rr>bb+8 and gg>=bb-15:haircounts[y]=haircounts.get(y,0)+1
   if rr<95 and gg<105 and bb<130 and bb>=gg and bb>=rr+4:
    navycounts[y]=navycounts.get(y,0)+1;navypoints.append((x,y))
 densehair=[y for y,n in haircounts.items() if n>=max(6,(b[2]-b[0])*.02)]
 hairtop=min(densehair) if densehair else b[1]
 lower=hairtop+(bottom-hairtop)*.45
 shoerows=[y for y,n in navycounts.items() if y>=lower and n>=max(5,(b[2]-b[0])*.025)]
 footy=min(b[3],max(shoerows)+2) if shoerows else b[3]
 band=max(12,round((footy-hairtop)*.16));counts={}
 for x,y in navypoints:
  if footy-band<=y<=footy:counts[x]=counts.get(x,0)+1
 dense=[x for x,n in counts.items() if n>=max(3,band*.12)]
 footx=(min(dense)+max(dense))/2 if dense else (b[0]+b[2])/2
 result={'file':file,'rect':rect,'anchor':[footx,footy],'alphaThreshold':220,'cleanupNeonFringe':True,'sourceBounds':list(b),'bodyTopEstimate':hairtop}
 if isolation is not None:result['isolationRows']=isolation
 return result
def reuse_frame(style,name):
 af='assets/exports/characters/hero_thien_son'+('_dao' if style=='dao' else '')+'.json'
 raw=json.loads((root/af).read_text(encoding='utf-8-sig'));b=raw['frames'][name]['frame']
 sourceim=Image.open(root/af.replace('.json','.png')).convert('RGBA');bounds=sourceim.crop((b['x'],b['y'],b['x']+b['w'],b['y']+b['h'])).getchannel('A').getbbox()
 return {'sourceBounds':list(bounds),'file':af.replace('.json','.png'),'rect':[b['x'],b['y'],b['w'],b['h']],'anchor':[40,64],'scale':1,'alphaThreshold':1,'reusedFrame':name,'reusedFrom':af}
for slug,cfg in configs.items():
 f=base+'/generated/'+slug+'_character_'+cfg['charVersion']+'.png';assert (root/f).exists(),f
 print('Character:',slug,flush=True)
 im,mask=readalpha(f);xc=cuts(mask,'x',4,0,im.height)
 a={'id':slug+'_character','skillId':slug,'kind':'character','canvas':[80,80],'pivot':[40,64],'sourceFolder':base+'/'+slug+'/character','exportFolder':'assets/exports/skills/thien-son/'+slug,'animations':[],'artMethod':'New image-generated skill-specific cels; Aseprite binary-alpha/palette-fringe cleanup, fixed scale per facing and measured shoe anchors. Explicit approved-frame reuse is recorded per cel.'}
 row_data=[[] for _ in range(4)]
 for col in range(4):
  if slug=='bach_phien_phong_bao' and col==2:
   for row in range(4):row_data[row].append(None)
   continue
  regions=four_regions(mask,xc[col],xc[col+1])
  for row in range(4):
   region=regions[row]
   row_data[row].append(character_frame(f,im,mask,region['rect'],region['runs']))
 if slug=='bach_phien_phong_bao':
  pf=base+'/generated/bach_phien_phong_bao_character_peak_v02.png';pi,pm=readalpha(pf);px=cuts(pm,'x',4,0,pi.height)
  for row in range(4):
   fr=character_frame(pf,pi,pm,[px[row],0,px[row+1]-px[row],pi.height]);fr['scale']=44/(fr['anchor'][1]-fr['bodyTopEstimate']);fr['independentScale']=True
   row_data[row][2]=fr
 if slug=='phi_anh_tram':
  lf=base+'/generated/phi_anh_tram_character_left_actions_v03.png';li,lm=readalpha(lf);lx=cuts(lm,'x',2,0,li.height)
  for c in range(2):
   fr=character_frame(lf,li,lm,[lx[c],0,lx[c+1]-lx[c],li.height]);fr['scale']=44/(fr['anchor'][1]-fr['bodyTopEstimate']);fr['independentScale']=True
   row_data[1][c+1]=fr
 for row,d in enumerate(['down','left','right','up']):
  first=row_data[row][0];bh=first['anchor'][1]-first['bodyTopEstimate'];scale=44/bh
  assert .1<scale<.5,(slug,d,scale)
  for frame in row_data[row]:
   if not frame.get('independentScale'):frame['scale']=scale
  if slug=='liet_phong_dao' and d=='down':
   row_data[row][0]=reuse_frame('dao','basic_attack_down_0')
  a['animations'].append({'name':'cast_'+d,'durationMs':cfg['ms'],'loop':False,'direction':d,'stage':'anticipation_action_followthrough_recovery','placement':'character_feet','effectPlacementOffset':[0,0],'frames':row_data[row]})
 if slug=='phong_anh_hoan_vi':
  for d in ['down','left','right','up']:
   a['animations'].append({'name':'counter_'+d,'durationMs':75,'loop':False,'direction':d,'stage':'conditional_counter_reused_basic_attack','placement':'character_feet','effectPlacementOffset':[0,0],'frames':[reuse_frame('dao','basic_attack_'+d+'_'+str(n)) for n in range(4)],'sourceStageReuse':'Approved dao basic attack reused unchanged for conditional visual counter; no new counter gameplay.'})
 # Semantic loops reuse the authored action cels, not new drawings or gameplay hits.
 aliases={'lien_hoa_phien':[('rapid',[1,2],60,True)],'luc_duong_chuong':[('spin',[0,1,2,3],80,True)],'bach_phien_phong_bao':[('whirl',[1,2],90,True)],'bach_liet_thien_kich':[('flurry',[1,2],50,True),('finish',[2,3],85,False)]}
 for prefix,indices,ms,loop in aliases.get(slug,[]):
  for original in list(a['animations']):
   if not original['name'].startswith('cast_'):continue
   a['animations'].append({**original,'name':prefix+'_'+original['direction'],'frames':[original['frames'][i] for i in indices],'durationMs':ms,'loop':loop,'stage':'skill_'+prefix,'sourceStageReuse':'Semantic clip reuses authored skill cels '+str(indices)+'; not additional drawings or a gameplay hit count.'})
 # Enlarge transparent horizontal clearance, never the character or world foot position.
 extent=40
 for anim in a['animations']:
  for fr in anim['frames']:
   bx=fr['sourceBounds'];sc=fr['scale'];ax=math.floor(fr['anchor'][0]*sc+.5)
   lo=math.floor(bx[0]*sc)-ax;hi=math.ceil(bx[2]*sc)-ax
   extent=max(extent,-lo+2,hi+2)
 width=max(80,math.ceil(extent*2/16)*16)
 a['canvas']=[width,80];a['pivot']=[width//2,64]
 a['canvasReason']='Extra transparent horizontal cloth/weapon clearance; body stays approximately44px and world feet unchanged.'
 recipe['assets'].append(a)
 f=base+'/generated/'+slug+'_vfx_v01.png';im,mask=readalpha(f);rows=len(cfg['stages']);yc=cuts(mask,'y',rows,0,im.width)
 a={'id':slug+'_vfx','skillId':slug,'kind':'vfx','canvas':[cfg['canvas']]*2,'pivot':[cfg['canvas']//2]*2,'sourceFolder':base+'/'+slug+'/vfx','exportFolder':'assets/exports/skills/thien-son/'+slug,'animations':[],'artMethod':'Original generated isolated Wind drawings, Aseprite hard-alpha cleanup. Directional wind uses exact quarter turns; ground ellipses remain unrotated; small hand cues reuse the same art with directional placement.'}
 for row,(tag,stage,loop,directional,scale,placement,dist,height,rotate) in enumerate(cfg['stages']):
  xc=cuts(mask,'x',4,yc[row],yc[row+1]);cw=im.width/4
  boxes=[mask.crop((xc[c],yc[row],xc[c+1],yc[row+1])).getbbox() for c in range(4)]
  assert all(boxes),(slug,row)
  cy=statistics.median((b[1]+b[3])/2+yc[row] for b in boxes)
  for d,rotation in ([('right',0),('down',90),('left',180),('up',270)] if directional else [('none',0)]):
   dx,dy={'right':(1,0),'left':(-1,0),'down':(0,1),'up':(0,-1),'none':(0,0)}[d]
   offset=[-dx*dist,-dy*round(dist*.65)-height] if placement=='caster_rear' else [dx*dist,dy*round(dist*.65)-height]
   hand_offsets={'chiet_mai_thu': {'down': [-12, -18], 'left': [-18, -18], 'right': [16, -18], 'up': [15, -22]}, 'phong_anh_hoan_vi': {'down': [-18, -24], 'left': [-18, -24], 'right': [23, -28], 'up': [23, -26]}}
   if placement=='caster_hand' and slug in hand_offsets:offset=hand_offsets[slug][d]
   frames=[]
   for col in range(4):
    rect=[xc[col],yc[row],xc[col+1]-xc[col],yc[row+1]-yc[row]]
    frames.append({'file':f,'rect':rect,'anchor':[cw*(col+.5)-rect[0],cy-rect[1]],'scale':scale,'alphaThreshold':220,'rotation':rotation if rotate else 0})
   a['animations'].append({'name':tag+('_'+d if directional else ''),'durationMs':80 if loop else 65,'loop':loop,'direction':d,'stage':stage,'placement':placement,'effectPlacementOffset':offset,'frames':frames})
 if slug in ['chiet_mai_thu','phong_anh_hoan_vi']:
  original=list(a['animations'])
  for anim in original:
   if (slug=='chiet_mai_thu' and 'activation' in anim['name']) or (slug=='phong_anh_hoan_vi' and anim['name'].startswith('ready')):
    cp={**anim,'name':anim['name'].replace('activation','expiry').replace('ready','expiry'),'frames':anim['frames'][-2:],'loop':False,'stage':'feedback_expiry','sourceStageReuse':'Last two authored stages reused for explicit expiry; preview fades alpha then destroys sprite.'}
    a['animations'].append(cp)
 recipe['assets'].append(a)
concept=json.loads((root/'assets/concepts/skills/thien-son/concept_manifest_v01.json').read_text(encoding='utf-8'))
for e in concept['entries']:
 recipe['icons'].append({'id':e['id'],'name':e['name'],'file':e['iconConceptPath'],'sourceFolder':base+'/'+e['id']+'/icon','exportFolder':'assets/exports/skills/thien-son/'+e['id'],'approvedConcept':e['iconConceptPath']})
for a in recipe['assets']:(root/a['sourceFolder']/'frames').mkdir(parents=True,exist_ok=True);(root/a['exportFolder']).mkdir(parents=True,exist_ok=True)
for a in recipe['icons']:(root/a['sourceFolder']).mkdir(parents=True,exist_ok=True);(root/a['exportFolder']).mkdir(parents=True,exist_ok=True)
(root/base/'recipe_v01.json').write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
records=[json.loads(p.read_text(encoding='utf-8')) for p in sorted((root/base/'generated').glob('*.generation.json'))]
(root/base/'generation_prompts_v01.json').write_text(json.dumps({'schemaVersion':1,'createdOn':'2026-10-31','tool':'OpenAI built-in image_gen.imagegen','records':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Recipe',len(recipe['assets']),'components;',len(recipe['icons']),'approved icons;',len(records),'retained generated sources')
for a in recipe['assets']:
 if a['kind']=='character':print(a['skillId'],[(t['direction'],round(t['frames'][-1]['scale'],3)) for t in a['animations'] if t['name'].startswith('cast')])

