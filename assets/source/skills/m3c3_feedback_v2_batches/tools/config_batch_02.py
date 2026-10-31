from config_api import *
b=Batch('02_thien_son')
fan='thien_son_fan_v2';wind='thien_son_wind_actions_v2';dao='thien_son_dao_v2'
angles={'right':0,'down':90,'left':180,'up':270}
def old(skill,kind,tag):return retained('thien-son',skill,kind,tag)
def addcast(pkg,skill,d,tag='cast',ms=70):
 return b.add(pkg,'character',skill+'_'+tag+'_'+d,old(skill,'character',tag+'_'+d),'cast' if tag=='cast' else 'loop',d,loop=tag in ['spin','rapid','whirl','flurry'],ms=ms,contacts=[1] if tag=='cast' else [])
for d in DIRS:
 src='ts_fan_throw_catch_vertical_v2' if d in ['down','up'] else 'ts_fan_throw_catch_horizontal_v2'
 base=0 if d in ['down','right'] else 8
 b.add(fan,'character','throw_'+d,character(src,range(base,base+4)),'cast',d,ms=[60,45,75,120],contacts=[1],framePhases=['anticipation','release','recovery','recovery'],baseAttackMs=300,minAcceptedAttackMs=166.6667,playback='restart on accepted A; fit to server attack interval; no movement or animation lock')
 b.add(fan,'character','catch_'+d,character(src,range(base+4,base+8)),'recovery',d,ms=45,serverStage='projectile_return arrival; may be interrupted by accepted next A',priority='below new accepted A')
 for leg,row in [('outbound',0),('return',1)]:
  b.add(fan,'projectile',leg+'_'+d,fx('ts_fan_projectile_impacts_v2',row,.16,rotation=angles[d] if leg=='outbound' else (angles[d]+180)%360),'travel',d,True,50,arbitraryHeading=True,artAuthoredHeadingDegrees=0 if leg=='outbound' else 180,leg=leg,path='server straight segment; return samples owner once; not homing')
  b.add(fan,'impact',leg+'_hit_'+d,fx('ts_fan_projectile_impacts_v2',2 if leg=='outbound' else 3,.20,rotation=angles[d]),'impact',d,ms=40,contacts=[0],trigger='confirmed hit on this leg only')
 b.add(dao,'character','basic_'+d,basic('hero_thien_son_dao',d),'cast',d,ms=75,contacts=[1],baseAttackMs=300,minAcceptedAttackMs=166.6667,playback='fit accepted server interval; restartable; no animation lock')
 b.add(dao,'aura','basic_cut_'+d,fx('ts_petal_guard_dash_v2',3,.42,rotation=angles[d]),'release',d,ms=50,contacts=[2],offset=[0,-22])
 for skill,tags,pkg in [('lien_hoa_phien',['cast','rapid'],wind),('luc_duong_chuong',['cast','spin'],wind),('luu_phong_bo',['cast'],wind),('chiet_mai_thu',['cast'],wind),('bach_phien_phong_bao',['cast','whirl'],fan),('phi_anh_tram',['cast'],dao),('phong_anh_hoan_vi',['cast','counter'],dao),('truy_hon_dao',['cast'],dao),('bach_liet_thien_kich',['cast','flurry','finish'],dao)]:
  for tag in tags:addcast(pkg,skill,d,tag)
 b.add(wind,'aura','lien_hoa_sustain_'+d,fx('ts_petal_guard_dash_v2',0,.65,rotation=angles[d]),'loop',d,True,55,offset=[0,-18],serverPulses=6,pulseSpacingTicks=5,rangeReferenceOnly=100)
 for phase,ids in [('opening',[0,1]),('ending',[4,5])]:
  b.add(wind,'aura','lien_hoa_'+phase+'_'+d,fx('ts_petal_guard_dash_v2',0,.65,indexes=ids,rotation=angles[d]),phase,d,ms=55,offset=[0,-18])
 b.add(wind,'aura','luu_phong_trail_'+d,old('luu_phong_bo','vfx','trail_'+d),'loop',d,True,55)
 b.add(wind,'impact','crossed_hit_'+d,fx('ts_petal_guard_dash_v2',2,.25,rotation=angles[d]),'impact',d,ms=45,contacts=[2],trigger='once per confirmed crossed target')
 # Actual retained action pixels copied as ephemeral VFX ghosts; no invented character geometry.
 ghost=old('phi_anh_tram','character','cast_'+d)[1:3]
 for f in ghost:f['opacity']=.42
 b.add(dao,'afterimage','moving_ghost_'+d,ghost,'loop',d,True,55,offset=[0,0],trigger='moving dash ticks only; cleanup at dash end; afterimage is not immunity authority')
 for skill,tag in [('phi_anh_tram','trail'),('phong_anh_hoan_vi','step')]:
  b.add(dao,'aura',skill+'_motion_'+d,old(skill,'vfx',tag+'_'+d),'loop',d,True,55,trigger='moving dash ticks only; remove before later counter; DOT still applies')
 b.add(dao,'impact','dash_slash_'+d,old('phi_anh_tram','vfx','slash_'+d),'impact',d,ms=50,contacts=[1])
 b.add(dao,'aura','counter_ready_'+d,old('phong_anh_hoan_vi','vfx','ready_'+d),'loop',d,True,70,immunity=False)
 b.add(dao,'aura','counter_end_'+d,old('phong_anh_hoan_vi','vfx','expiry_'+d),'ending',d,ms=60)
 b.add(dao,'projectile','qi_blade_'+d,fx('ts_dao_blade_flurry_finisher_v2',0,.48,rotation=angles[d]),'travel',d,True,55,arbitraryHeading=True,artAuthoredHeadingDegrees=0,instanceCount=2,launchSpacingTicks=3)
 b.add(dao,'impact','slow_contact_'+d,fx('ts_dao_blade_flurry_finisher_v2',1,.26),'impact',d,ms=55,contacts=[0],trigger='confirmed hit applies slow, not root/freeze')
 for phase,row,loop in [('flurry',2,True),('finisher',3,False)]:
  b.add(dao,'aura','bach_liet_'+phase+'_'+d,fx('ts_dao_blade_flurry_finisher_v2',row,.72,rotation=angles[d]),'loop' if loop else 'impact',d,loop,55,contacts=[] if loop else [2],offset=[0,-18],rangeReferenceOnly=110 if loop else 125)
 b.add(dao,'aura','bach_liet_open_'+d,old('bach_liet_thien_kich','vfx','coil_'+d),'opening',d,ms=55)
 b.add(dao,'aura','bach_liet_end_'+d,fx('ts_dao_blade_flurry_finisher_v2',3,.72,indexes=[4,5],rotation=angles[d]),'ending',d,ms=55,offset=[0,-18])
for phase,ids,loop in [('opening',[0,1],False),('loop',list(range(6)),True),('ending',[4,5],False)]:
 b.add(wind,'aura','guard_'+phase,fx('ts_petal_guard_dash_v2',1,.60,indexes=ids),phase,loop=loop,ms=65,offset=[0,-20],trigger='only active Lục Dương action, 65% guard follows server state; not persistent shield')
 b.add(fan,'aura','storm_'+phase,fx('ts_plum_storm_states_v2',3,.95,indexes=ids),phase,loop=loop,ms=65,offset=[0,-18],serverPulses=12,pulseSpacingTicks=8,rangeReferenceOnly=150)
for phase,row,loop in [('opening',0,False),('loop',1,True),('ending',2,False)]:
 b.add(wind,'aura','plum_'+phase,fx('ts_plum_storm_states_v2',row,.26),phase,loop=loop,ms=65,offset=[0,-28],trigger='Chiết Mai authoritative buff activation/status/expiry')
for name,angle in [('right',0),('down_right',45),('down',90),('down_left',135),('left',180),('up_left',225),('up',270),('up_right',315)]:
 b.add(fan,'projectile','storm_fan_'+name,fx('ts_fan_projectile_impacts_v2',0,.16,rotation=angle),'travel',name,True,50,artAuthoredHeadingDegrees=0,arbitraryHeading=True,burstCount=4,directionsPerBurst=8,rangeReferenceOnly=210,speedReferenceOnly=340)
b.bind('thien_son_phien A','accepted A / projectile_return / outbound+return hit',fan,'throw_* / catch_* / outbound_* / return_* / *_hit_*','300ms base, scalable down to accepted interval; hits/leg reset/walls server-owned; no hard animation lock')
b.bind('lien_hoa_phien','6 area pulses',wind,'lien_hoa_* / lien_hoa_phien_rapid_*','repeat action and wind sustain through authoritative pulse sequence, then ending')
b.bind('luc_duong_chuong','active action mitigate',wind,'luc_duong_chuong_spin_* / guard_*','65% guard only while authoritative action active; opening-loop-ending')
b.bind('luu_phong_bo','moving dash / crossed target hit',wind,'luu_phong_* / crossed_hit_*','crossed target confirmed hit spawns contact once')
b.bind('chiet_mai_thu','activation / buff loop / expiry',wind,'chiet_mai_thu_cast_* / plum_*','AS/CDR/status duration comes from server; no independent bonus')
b.bind('bach_phien_phong_bao','12 pulses / four 8-way bursts',fan,'bach_phien_* / storm_* / storm_fan_*','8 straight heading instances per server burst; no baked eight-fan fake sheet')
b.bind('thien_son_dao A','accepted A',dao,'basic_* / basic_cut_*','300ms base, speed-adjustable to minimum5ticks')
b.bind('phi_anh_tram + phong_anh_hoan_vi','moving dash / counter',dao,'*_motion_* / moving_ghost_* / counter_*','ghost/immunity cue only moving ticks; counter not immune; DOT not suppressed')
b.bind('truy_hon_dao','two projectile launches + hit slow',dao,'qi_blade_* / slow_contact_*','spawn two independent straight piercing blades 3ticks apart; no targeting/slow authority in art')
b.bind('bach_liet_thien_kich','flurry / finisher',dao,'bach_liet_*','separate sustain, finisher contact and ending, follow server stage')
b.reused=['Thiên Sơn approved hero_thien_son_dao basic poses, all existing dedicated cast/rapid/spin/whirl/dash/counter/flurry/finish source cels, selected trail and coil VFX; no regeneration of retained cels.']
b.mock(fan+'_character','throw_down',2,'FAN RELEASE EMPTY HAND')
b.mock(fan+'_projectile','storm_fan_down_right',2,'FAN PROJECTILE / 8 WAY')
b.mock(wind+'_aura','guard_loop',2,'ACTIVE WIND GUARD')
b.mock(dao+'_aura','bach_liet_finisher_right',2,'DAO FINISHER')
b.save()
