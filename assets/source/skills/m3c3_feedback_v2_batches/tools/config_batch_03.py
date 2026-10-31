from config_api import *
b=Batch('03_vo_dang');hands='vo_dang_hands_v2';shield='vo_dang_shield_formation_v2'
angles={'right':0,'down':90,'left':180,'up':270}
def old(skill,kind,tag):return retained('vo-dang',skill,kind,tag)
for d in DIRS:
 src='vd_palms_vertical_v2' if d in ['down','up'] else 'vd_palms_horizontal_v2'
 base=0 if d in ['down','right'] else 8
 for hand,row in [('left_palm',1 if d in ['down','up'] else 0),('right_palm',0 if d in ['down','up'] else 1)]:
  # Source column3 is another extension, not recovery: exclude it; return through the drawn guard.
  b.add(hands,'character',hand+'_'+d,character(src,[base+row*4+i for i in [0,1,2,0]]),'cast',d,ms=[60,70,80,90],contacts=[1],framePhases=['anticipation','contact','recovery','guard'],baseAttackMs=300,serverStage=hand,playback='fit accepted interval; visual marker never schedules knockback')
 for skill in ['luong_nghi_thu','huyen_am_chuong','duong_khi_kich']:
  b.add(hands,'character',skill+'_cast_'+d,old(skill,'character','cast_'+d),'cast',d,ms=70,contacts=[1])
 for skill in ['thai_cuc_than_cong','thai_cuc_tran']:
  b.add(shield,'character',skill+'_cast_'+d,old(skill,'character','cast_'+d),'cast',d,ms=70,contacts=[1])
 for skill,row,scale,ids in [('luong_nghi',0,.28,None),('huyen_am',1,.44,[0,1,2,3]),('duong_khi',2,.38,None)]:
  b.add(hands,'projectile',skill+'_travel_'+d,fx('vd_qi_projectiles_v2',row,scale,indexes=ids,rotation=angles[d]),'travel',d,True,60,arbitraryHeading=True,artAuthoredHeadingDegrees=0,rangeReferenceOnly={'luong_nghi':240,'huyen_am':260,'duong_khi':220}[skill])
  b.add(hands,'impact',skill+'_impact_'+d,fx('vd_qi_projectiles_v2',3,.32 if skill!='huyen_am' else .42,rotation=angles[d]),'impact',d,ms=50,contacts=[1],trigger='confirmed hit; mana refund only server refund event')
  b.add(hands,'aura',skill+'_release_'+d,old({'luong_nghi':'luong_nghi_thu','huyen_am':'huyen_am_chuong','duong_khi':'duong_khi_kich'}[skill],'vfx','release_'+d),'release',d,ms=55,offset=[0,-22])
  b.add(hands,'impact',skill+'_end_'+d,fx('vd_qi_projectiles_v2',3,.28,indexes=[4,5],rotation=angles[d]),'ending',d,ms=50)
 b.add(hands,'aura','mana_refund_'+d,old('duong_khi_kich','vfx','mana_return_'+d),'impact',d,ms=55,trigger='server refund only, 7MP once, never auto on release or miss')
 for cut,rev in [('cut_1',False),('cut_2',True)]:
  f=basic('hero_vo_dang_kiem',d);f=f[::-1] if rev else f
  b.add(hands,'character','sword_'+cut+'_'+d,f,'cast',d,ms=100,contacts=[1 if not rev else 2],baseAttackMs=400,sequence='forward source then reversed articulated source, shared endpoint continuity; visual alternation only',provenance='retained approved basic cels, temporal order reversed for returning cut')
  b.add(hands,'aura','sword_'+cut+'_'+d,old('that_tinh_kiem','vfx',('slash_a_' if not rev else 'slash_b_')+d),'release',d,ms=65,contacts=[1],offset=[0,-22],visualOnly=True)
 b.add(hands,'impact','palm_contact_'+d,old('luong_nghi_thu','vfx','impact_'+d),'impact',d,ms=45,contacts=[1])
for phase,row,loop in [('opening',0,False),('loop',1,True),('absorb',2,False),('off',3,False),('depleted',4,False)]:
 b.add(shield,'aura','mana_'+phase,fx('vd_mana_shield_states_v2',row,.34,rows=5),'impact' if phase=='absorb' else 'ending' if phase in ['off','depleted'] else phase,loop=loop,ms=65,offset=[0,-26],trigger='server toggle/status/absorb/depletion only; no invulnerability; zero mana means no absorption')
for phase,row,loop in [('opening',0,False),('loop',1,True),('ending',3,False)]:
 f=fx('vd_formation_border_v2',row,.90)
 for x in f:x['scaleY']=.62
 b.add(shield,'ground','formation_'+phase,f,phase,loop=loop,ms=80,projection='original authored ground raster projected to shallow elevated orthographic ellipse; no character deformation',hitboxAuthority=False)
for d in DIRS:
 f=fx('vd_formation_border_v2',2,.90,rotation=angles[d])
 for x in f:x['scaleY']=.62
 b.add(shield,'ground','inward_response_'+d,f,'impact',d,ms=60,contacts=[2],trigger='only confirmed containment response from targets inside attempting exit',meaning='inward boundary qi; not stun, root, cage or outward knockback')
b.bind('vo_dang_quyen A','left_palm / right_palm',hands,'left_palm_* / right_palm_* / palm_contact_*','accepted A stage; server owns range65 and knockback')
b.bind('vo_dang_kiem A','accepted A; flowing cuts',hands,'sword_cut_1_* / sword_cut_2_*','400ms base; renderer may alternate visuals; existing server proc unchanged')
b.bind('luong_nghi_thu','straight piercing projectile',hands,'luong_nghi_*','range240/speed390 reference only; actual heading from server')
b.bind('huyen_am_chuong','large projectile / confirmed impact',hands,'huyen_am_*','range260/radius30 reference; no art hitbox')
b.bind('duong_khi_kich','projectile / hit / refund',hands,'duong_khi_* / mana_refund_*','white five-digit qi palm; refund7MP once only server refund event')
b.bind('thai_cuc_than_cong','on / active / absorb / off / mana depleted',shield,'mana_opening / mana_loop / mana_absorb / mana_off / mana_depleted','state-driven unlimited loop; free toggle; finite MP cost pays actual absorbed damage; remove at zero mana or cleanup')
b.bind('thai_cuc_tran','activation / confinement loop / inward response / expiry',shield,'formation_* / inward_response_*','boundary keeps existing inside targets in; targets may move and attack within; terrain/forced movement immunity respected; no stun')
b.reused=['Existing Võ Đang cast poses for all five changed skills; approved hero_vo_dang_kiem basic cels preserved and reordered for connected reverse cut; selected existing release, mana refund and sword ribbon frames.']
b.mock(hands+'_character','left_palm_down',1,'ALTERNATING PALMS')
b.mock(hands+'_projectile','duong_khi_travel_right',2,'WHITE QI HAND')
b.mock(shield+'_aura','mana_loop',2,'MANA GUARD LOOP')
b.mock(shield+'_ground','inward_response_right',2,'CONTAINMENT RESPONSE')
b.save()
