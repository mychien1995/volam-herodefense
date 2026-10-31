from pathlib import Path
from PIL import Image
import json
root=Path.cwd();base='assets/source/skills/cai-bang'
recipe={'assets':[]}
def row_frames(file,row,rows,scale,rotation=0,anchor_mode='union'):
 im=Image.open(root/file).convert('RGBA');cw=im.width//4;ch=im.height//rows
 bounds=[]
 for col in range(4):
  a=im.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch)).getchannel('A')
  bounds.append(a.point(lambda v:255 if v>=220 else 0).getbbox())
 assert all(bounds),file
 if anchor_mode=='first': b=bounds[0]
 else:b=(min(b[0] for b in bounds),min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds))
 anchor=[round((b[0]+b[2])/2),round((b[1]+b[3])/2)]
 return [{'file':file,'rect':[col*cw,row*ch,cw,ch],'scale':scale,'anchor':anchor,'alphaThreshold':220,'rotation':rotation} for col in range(4)]
def vfx(slug,canvas,rows):
 asset={'id':slug+'_vfx','kind':'vfx','canvas':[canvas,canvas],'pivot':[canvas//2,canvas//2],'sourceFolder':base+'/'+slug+'/vfx','exportFolder':'assets/exports/skills/cai-bang/'+slug,'animations':[]}
 for name,file,row,nrows,scale,duration,loop,directional,stage,placement in rows:
  dirs=[('right',0),('down',90),('left',180),('up',270)] if directional else [('none',0)]
  for direction,rotation in dirs:
   asset['animations'].append({'name':name+('_'+direction if directional else ''),'durationMs':duration,'loop':loop,'direction':direction,'stage':stage,'placement':placement,'frames':row_frames(file,row,nrows,scale,rotation,'first' if name=='impact' else 'union')})
 recipe['assets'].append(asset)
def character(slug,style='chuong'):
 atlasfile='assets/exports/characters/hero_cai_bang'+('_chuong' if style=='chuong' else '')+'.json'
 atlas=json.loads((root/atlasfile).read_text(encoding='utf-8-sig'))
 asset={'id':slug+'_character','kind':'character','canvas':[80,80],'pivot':[40,64],'sourceFolder':base+'/'+slug+'/character','exportFolder':'assets/exports/skills/cai-bang/'+slug,'animations':[],'reusedFrom':atlasfile}
 for d in ['down','left','right','up']:
  names=[n for n in atlas['frames'] if n.startswith('basic_attack_'+d+'_')]
  frames=[]
  for n in names:
   b=atlas['frames'][n]['frame']
   frames.append({'file':atlasfile.replace('.json','.png'),'rect':[b['x'],b['y'],b['w'],b['h']],'scale':1,'anchor':[40,64],'alphaThreshold':1,'reusedFrame':n})
  asset['animations'].append({'name':'cast_'+d,'durationMs':75 if len(names)==4 else 50,'loop':False,'direction':d,'stage':'preparation_attack_followthrough_recovery','placement':'character_feet','frames':frames})
 recipe['assets'].append(asset)
def generated_character(slug,source):
 file=base+'/generated/'+source+'_v1.png'
 asset={'id':slug+'_character','kind':'character','canvas':[80,80],'pivot':[40,64],'sourceFolder':base+'/'+slug+'/character','exportFolder':'assets/exports/skills/cai-bang/'+slug,'animations':[],'originalGenerated':True,'artMethod':'New generated heavy-strike poses; fixed-scale Aseprite alignment' if source=='staff_heavy' else 'New generated staff-held channel poses; localized front arm/staff mirror-band correction in Aseprite'}
 heavyfeet=[[[192,350],[593,350],[955,350],[1335,350]],[[209,668],[592,668],[949,668],[1342,668]],[[204,975],[584,975],[995,975],[1346,975]]]
 channelfeet=[[[192,324],[589,324],[966,324],[1354,324]],[[196,648],[590,648],[976,648],[1352,648]],[[210,970],[593,970],[986,970],[1369,970]]]
 for d,row,mirror in [('down',0,False),('left',2,False),('right',2,True),('up',1,False)]:
  frames=[]
  for col in range(4):
   if source=='staff_heavy':
    y=0 if row==0 else (375 if row==1 and col==1 else 415 if row==1 else 685)
    bottom=(415 if col==2 else 375) if row==0 else 690 if row==1 else 1024
    foot=heavyfeet[row][col];scale=[.19,.205,.195][row]
   else:
    y=[0,341,682][row];bottom=[341,682,1024][row]
    foot=channelfeet[row][col];scale=[.168,.181,.18][row]
   rect=[col*384,y,384,bottom-y]
   frame={'file':file,'rect':rect,'anchor':[foot[0]-rect[0],foot[1]-rect[1]],'scale':scale,'alphaThreshold':220,'mirrorX':mirror}
   if source=='staff_channel' and row==0 and col in [2,3]:frame['armMirrorBand']=[210,287]
   frames.append(frame)
  asset['animations'].append({'name':'cast_'+d,'durationMs':75 if source=='staff_heavy' else 90,'loop':False,'direction':d,'stage':'preparation_attack_followthrough_recovery' if source=='staff_heavy' else 'preparation_channel_pull_recovery','placement':'character_feet','frames':frames})
 recipe['assets'].append(asset)
 return asset
common=base+'/generated/common_v1.png'
vfx('shared_fire',64,[
 ('palm_flash',common,0,3,.125,55,False,True,'release','caster_hand'),
 ('small_impact',common,1,3,.125,60,False,True,'impact','hit_position'),
 ('burn_flecks',common,2,3,.125,90,True,False,'burn','ground')
])
for slug,canvas,scale in [('hoa_van_chuong',64,.125),('cuong_long_loan_vu',128,.14)]:
 file=base+'/generated/'+slug+'_v1.png'
 vfx(slug,canvas,[
 ('projectile',file,0,2,scale,65,True,True,'travel','projectile_world_position'),
 ('impact',file,1,2,.125 if slug=='hoa_van_chuong' else .28,65,False,False,'impact','hit_position')
 ])
 character(slug)
for slug,canvas,scale in [('phi_long_tai_thien',128,.24),('hang_long_hoa_vu',160,.36)]:
 file=base+'/generated/'+slug+('_v2.png' if slug=='phi_long_tai_thien' else '_v1.png')
 vfx(slug,canvas,[
 ('wave',file,0,2,scale,85,False,True,'travel','wave_world_position'),
 ('impact',file,1,2,scale,70,False,True,'impact','hit_position')
 ])
 character(slug)
slug='khang_long_huu_hoi';file=base+'/generated/'+slug+'_v1.png'
vfx(slug,96,[
 ('activation',file,0,2,.17,80,False,False,'buff_activation','caster_body'),
 ('buff',file,1,2,.17,110,True,False,'buff_loop','caster_body')
])
character(slug)
slug='hoanh_tao_bong';file=base+'/generated/'+slug+'_v1.png'
vfx(slug,128,[('sweep',file,0,2,.24,70,False,True,'staff_sweep','caster_front'),('impact',file,1,2,.125,60,False,True,'impact','hit_position')])
character(slug,'bong')
slug='pha_giap_bong';file=base+'/generated/'+slug+'_v1.png'
vfx(slug,96,[('impact',file,0,2,.17,65,False,True,'impact','hit_position'),('defense_break',file,1,2,.075,90,False,False,'debuff','target_above_head')])
generated_character(slug,'staff_heavy')
slug='cam_long_cong';file=base+'/generated/'+slug+'_v1.png'
vfx(slug,128,[('extend',file,0,2,.25,90,False,True,'pull_extension','caster_front'),('retract',file,1,2,.25,85,False,True,'pull_retraction','caster_front')])
for anim in recipe['assets'][-1]['animations']:
 if anim['name'].startswith('retract'):
  for frame in anim['frames']:frame['mirrorX']=True
generated_character(slug,'staff_channel')
slug='truy_phong_bong';file=base+'/generated/'+slug+'_v1.png'
vfx(slug,96,[('speed',file,0,2,.20,75,False,True,'dash_trail','caster_rear'),('stun',file,1,2,.075,85,False,False,'stun_status','target_above_head')])
character(slug,'bong')
atlasfile='assets/exports/characters/hero_cai_bang.json';atlas=json.loads((root/atlasfile).read_text(encoding='utf-8-sig'))
for anim in recipe['assets'][-1]['animations']:
 d=anim['direction'];walk=[]
 for n in atlas['frames']:
  if n.startswith('walk_'+d+'_'):
   b=atlas['frames'][n]['frame'];walk.append({'file':atlasfile.replace('.json','.png'),'rect':[b['x'],b['y'],b['w'],b['h']],'anchor':[40,64],'scale':1,'alphaThreshold':1,'reusedFrame':n})
 anim['frames']=walk+anim['frames'];anim['durationMs']=60;anim['stage']='dash_footwork_then_staff_contact'
slug='thien_ha_vo_cau';file=base+'/generated/'+slug+'_v1.png'
vfx(slug,160,[('whirlwind',file,0,2,.28,80,True,False,'multi_hit_whirlwind','caster_body'),('impact',file,1,2,.20,70,False,False,'finishing_smash','caster_front_ground')])
for anim in recipe['assets'][-1]['animations']:
 if anim['name']=='impact':
  for frame in anim['frames']:frame['anchor']=[200,408]
character(slug,'bong')
sweep=recipe['assets'].pop()
heavy=generated_character(slug,'staff_heavy')
heavy['artMethod']='Reused approved sweep poses followed by newly generated heavy-strike finish'
for anim in heavy['animations']:
 opening=next(a for a in sweep['animations'] if a['direction']==anim['direction'])
 anim['frames']=opening['frames']+anim['frames'];anim['durationMs']=75;anim['stage']='multi_hit_sweeps_then_heavy_smash_recovery'
(root/base/'recipe.json').write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for a in recipe['assets']:
 (root/a['sourceFolder']/'frames').mkdir(parents=True,exist_ok=True)
 (root/a['exportFolder']).mkdir(parents=True,exist_ok=True)
print('Recipe:',len(recipe['assets']),'assets; constant scale and anchor per sequence; approved character frames reused exactly.')

