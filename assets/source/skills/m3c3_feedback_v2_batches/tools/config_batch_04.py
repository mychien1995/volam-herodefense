from config_api import *
b=Batch('04_thieu_lam');hands='thieu_lam_hands_combo_v2';dao='thieu_lam_dao_v2'
angles={'right':0,'down':90,'left':180,'up':270}
def old(skill,kind,tag):return retained('thieu-lam',skill,kind,tag)
for d in DIRS:
 src='sl_basic_fists_vertical_fix_v2' if d in ['down','up'] else 'sl_basic_fists_horizontal_fix_v2'
 base=0 if d in ['down','right'] else 8
 for hand,row in [('left_fist',0),('right_fist',1)]:
  b.add(hands,'character',hand+'_'+d,character(src,range(base+row*4,base+row*4+4)),'cast',d,ms=[160,160,300,313],contacts=[1],framePhases=['anticipation','contact','recovery','guard'],baseAttackMs=933.3333,minAcceptedAttackMs=200,serverStage=hand,playback='fit accepted server interval; no visual hit clock; same-target combo remains server-owned')
 skill_src='sl_actions_'+('right' if d=='left' else d)+'_v2'
 for skill,row in [('la_han_quyen',2),('vi_da_quyen',3),('dai_luc_kim_cuong_chuong',4)]:
  ids=list(range(row*6,row*6+6))
  if d=='up' and skill=='vi_da_quyen':ids[0]=ids[1] # discard isolated accidental front-facing windup
  for variant in ['normal','empowered']:
   b.add(hands,'character',skill+'_'+variant+'_'+d,character(skill_src,ids,mirror=d=='left'),'cast',d,ms=[65,65,60,70,60,80],contacts=[2],framePhases=['anticipation','anticipation','contact','follow-through','recovery','guard'],variant=variant,empoweredMotion='same stance cels; empowered differentiation supplied by separate stronger VFX, no character growth',directionReuse='unarmed left-facing uses exact mirrored right poses; robe/bead design preserved' if d=='left' else 'independently authored source')
  for variant,source in [('normal','sl_three_powers_normal_v2'),('empowered','sl_three_powers_empowered_v2')]:
   rot=0 if row==3 else angles[d]
   scale=({2:.34,3:.43,4:.50}[row])*(1.20 if variant=='empowered' and row==4 else 1.13 if variant=='empowered' else 1)
   source_row=row-2;source_rows=4
   if variant=='normal' and row==4:source='sl_great_palm_normal_fix_v2';source_row=0;source_rows=1
   for phase,ids,role in [('release',[0,1],'aura'),('impact',[2,3],'impact'),('ending',[4,5],'impact')]:
    b.add(hands,role,skill+'_'+variant+'_'+phase+'_'+d,fx(source,source_row,scale,rows=source_rows,indexes=ids,rotation=rot),phase,d,ms=65,contacts=[0] if phase=='impact' else [],variant=variant,offset=[0,-20] if role=='aura' else [0,0],serverOnly='variant follows authoritative empowered/combo_empowered; no automatic empowerment/hit from frame')
 b.add(hands,'impact','basic_contact_'+d,fx('sl_three_powers_normal_v2',3,.16,rotation=angles[d]),'impact',d,ms=45,contacts=[2])
 b.add(dao,'character','basic_'+d,basic('hero_thieu_lam_dao',d),'cast',d,ms=100,contacts=[1],playback='fit authoritative accepted A interval, no hit clock')
 b.add(dao,'character','tru_ta_'+d,old('tru_ta','character','cast_'+d),'cast',d,ms=80,contacts=[1])
 for name,row,scale in [('basic',0,.50),('tru_ta',1,.78)]:
  for phase,ids in [('release',[0,1]),('contact',[2,3]),('ending',[4,5])]:
   b.add(dao,'aura',name+'_'+phase+'_'+d,fx('sl_dao_regen_v2',row,scale,indexes=ids,rotation=angles[d]),'impact' if phase=='contact' else phase,d,ms=65,contacts=[0] if phase=='contact' else [],offset=[0,-20],rangeReferenceOnly=80 if name=='basic' else 115,arcReferenceOnly=234 if name=='tru_ta' else None)
 b.add(dao,'ground','tru_ta_ground_'+d,fx('sl_dao_regen_v2',2,.30),'impact',d,ms=55,contacts=[2],offset={'down':[0,36],'up':[0,-36],'left':[-36,0],'right':[36,0]}[d])
for phase,ids,loop in [('opening',[0,1],False),('loop',list(range(5)),True),('ending',[4],False)]:
 b.add(hands,'aura','gentle_regen_'+phase,fx('sl_dao_regen_v2',3,.13,indexes=ids),phase,loop=loop,ms=110,offset=[0,-8],trigger='existing Dịch Cân Kinh active/passive status; subtle non-numeric cue only',newHealingMechanic=False)
b.add(hands,'ground','empowered_contact',fx('sl_three_powers_empowered_v2',3,.50),'impact',ms=60,contacts=[2],trigger='confirmed empowered contact only; no extra area damage')
b.bind('thieu_lam_quyen A','left_fist / right_fist',hands,'left_fist_* / right_fist_* / basic_contact_*','933.33ms base28ticks, min6ticks; same-target stacks and combo stage from server only')
b.bind('la_han_quyen','normal / empowered / combo_step',hands,'la_han_quyen_{normal,empowered}_*','compact direct punch; no automatic chain advance from contact frame')
b.bind('vi_da_quyen','normal / empowered / combo_step',hands,'vi_da_quyen_{normal,empowered}_*','crouch to rising uppercut; upright pillar does not rotate with camera')
b.bind('dai_luc_kim_cuong_chuong','normal / empowered / combo_empowered',hands,'dai_luc_kim_cuong_chuong_{normal,empowered}_* / empowered_contact','two-palm push, largest silhouette; variant only server-authorized')
b.bind('thieu_lam_dao A','accepted A',dao,'basic_*','server raw38/range80 reference only, no animation damage')
b.bind('tru_ta','cast / confirmed cleave impact',dao,'tru_ta_*','wide forward234-degree art/range115 reference; not full360 or collision geometry')
b.bind('dich_can_kinh','existing passive regeneration',hands,'gentle_regen_*','visual cue only; existing1.2HP/s + level growth unchanged; no active cast or added healing')
b.references=[{'source':'generated/sl_actions_left_v2.png','status':'REJECTED_SOURCE_NOT_EXPORTED','reason':'several poses flip to wrong direction; correct left skill poses derived from consistent right raster, no model regeneration of approved assets'},{'source':'generated/sl_actions_up_v2.png','excludedComponent':18,'reason':'front-facing uppercut windup excluded; use next valid back-facing windup'}]
b.reused=['Existing hero_thieu_lam_dao A and tru_ta cast cels at native scale; no catalogue redraw. New normal/empowered character tags intentionally share the same body motion; separate original empowered effects provide differentiation.']
b.mock(hands+'_character','vi_da_quyen_normal_down',2,'RISING UPPERCUT POSE')
b.mock(hands+'_impact','la_han_quyen_normal_impact_right',0,'LA HAN / COMPACT FIST')
b.mock(hands+'_impact','dai_luc_kim_cuong_chuong_empowered_impact_right',0,'EMPOWERED GREAT PALM')
b.mock(dao+'_aura','tru_ta_contact_right',0,'TRU TA WIDE CLEAVE')
b.save()
