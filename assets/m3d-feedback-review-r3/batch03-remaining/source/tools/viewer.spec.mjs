import {test,expect} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const base=new URL('../../',import.meta.url),url='http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch03-remaining/';
test.setTimeout(180000);
test('R3 all remaining: authored cels, recipes, native-scale PNG and lifecycles',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(url);await page.waitForFunction(()=>window.reviewReady,{timeout:30000});
 expect(errors).toEqual([]);expect(await page.evaluate(()=>window.reviewApi.validateRecipes().items)).toBe(22);
 const selected=await page.evaluate(()=>window.reviewApi.selectedRefs()),clips=[];
 for(const {asset,tag} of selected){const r=await page.evaluate(({asset,tag})=>window.reviewApi.playClip(asset,tag),{asset,tag});expect(r.frameOrder.length).toBeGreaterThan(0);clips.push(r);}
 const paths=[];
 for(const [id,v,t] of [['thien_ha_vo_cau',0,2700],['liet_phong_dao',0,500],['vi_da_quyen',0,420],['vo_anh_cuoc',0,900],['toan_phong_thoai',0,900],['nhu_lai_niet_ban',0,730],['nhu_lai_niet_ban',0,1900],['tru_ta',0,700],['kim_quang_ho_tran',0,1500],['su_tu_hong',0,650],['ly_mac_sau_normal',0,500],['ly_mac_sau_normal',1,1000],['co_mo_kiem_phap',2,1450],['hong_liet_a1_a2',0,650],['hong_liet_a1_a2',1,700],['tuy_tien_bo',0,650],['can_khon_phan_chan',0,1000],['am_duong_nghich_chuyen',0,1000],['hoac_do_darts',1,750],['dat_nhi_ba',0,900],['dat_nhi_ba',1,1500],['kim_luan_normal',1,600],['kim_luan_truy_hon',0,700],['ngu_luan_ho_the',0,850],['arena_backgrounds',0,100]]){
  await page.evaluate(({id,v,t})=>{window.reviewApi.select(id,v);window.reviewApi.setFacing('right');window.reviewApi.scrub(t);},{id,v,t});
  const name=id+'-'+v+'-'+t;await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('previews/'+name+'-display-2x.png',base))});
  const png=await page.evaluate(()=>window.reviewApi.nativePng());await writeFile(new URL('previews/'+name+'-native-1x.png',base),Buffer.from(png.split(',')[1],'base64'));paths.push(name);
 }
 await page.evaluate(()=>{window.reviewApi.select('hong_liet_a1_a2');window.reviewApi.scrub(650);});expect(await page.evaluate(()=>window.reviewApi.snapshot().drawn.filter(x=>x.role==='blade-lane'&&x.asset==='r3_hhl_blade_right').length)).toBe(5);
 expect(selected.some(x=>x.asset==='cbt_am_duong_nghich_chuyen'&&x.tag==='large_formation')).toBe(false);
 const ratios=await page.evaluate(()=>{const r=window.reviewApi.recipe;const a=r('thien_ha_vo_cau',0,'right',true),b=r('thien_ha_vo_cau',0,'right',false),loop=x=>{const c=x.actors.find(c=>c.tag==='whirl_right');return c.end-c.start;};return[b.duration/a.duration,loop(b)/loop(a)];});expect(ratios).toEqual([1.3,1.3]);
 for(const d of ['right','down','left','up'])for(const phase of ['anticipation','raise','chop','recovery'])expect(selected.some(x=>x.asset==='r3_kim_hand_chop'&&x.tag===phase+'_'+d)).toBe(true);
 const allRecipes=await page.evaluate(()=>{const api=window.reviewApi,rows=[];for(const item of api.items)for(let v=0;v<item.variants.length;v++)for(const d of ['right','down','left','up']){api.select(item.id,v);api.setFacing(d);const r=api.recipe(item.id,v,d),samples=[];for(const t of [0,200,400,700,1100,1500,2000,2800]){api.scrub(t);samples.push(api.snapshot());}api.stop('cancel');if(api.snapshot().effects!==0)throw Error('leak '+item.id);rows.push({id:item.id,v,d,samples});}return rows;});
 for(const why of ['cancel','death','zone','facing-change','selection-change']){await page.evaluate(()=>{window.reviewApi.select('ngu_luan_ho_the');window.reviewApi.play();window.reviewApi.scrub(800);});expect(await page.evaluate(()=>window.reviewApi.snapshot().effects)).toBeGreaterThan(0);await page.evaluate(why=>window.reviewApi.stop(why),why);expect(await page.evaluate(()=>window.reviewApi.snapshot().effects)).toBe(0);}
 await page.evaluate(()=>{window.reviewApi.select('toan_phong_thoai');window.reviewApi.speed(1);document.activeElement?.blur();});
 const before=await page.evaluate(()=>window.reviewApi.snapshot().castCount);await page.keyboard.down('a');await page.waitForTimeout(300);await page.keyboard.up('a');expect(await page.evaluate(()=>window.reviewApi.snapshot().castCount)).toBe(before+1);await page.waitForFunction(()=>!window.reviewApi.snapshot().active);expect(await page.evaluate(()=>window.reviewApi.snapshot().effects)).toBe(0);await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyA',repeat:true})));expect(await page.evaluate(()=>window.reviewApi.snapshot().castCount)).toBe(before+1);
 await page.evaluate(()=>window.reviewApi.play());await page.keyboard.press('ArrowLeft');expect(await page.evaluate(()=>window.reviewApi.snapshot().active)).toBe(false);expect(await page.evaluate(()=>window.reviewApi.snapshot().facing)).toBe('left');
 await page.evaluate(()=>{window.reviewApi.select('nhu_lai_niet_ban');window.reviewApi.play();});await page.waitForTimeout(350);await page.click('#hold');const held=await page.evaluate(()=>window.reviewApi.snapshot().time);await page.waitForTimeout(120);expect(await page.evaluate(()=>window.reviewApi.snapshot().time)).toBe(held);await page.click('#release');await page.waitForFunction(t=>window.reviewApi.snapshot().time>t,held);await page.click('#cancel');
 await page.evaluate(()=>{window.reviewApi.select('ngu_luan_ho_the');window.reviewApi.scrub(850);});expect(await page.evaluate(()=>window.reviewApi.snapshot().drawn.filter(x=>x.role==='wheel').length)).toBe(7);
 await page.evaluate(()=>{window.reviewApi.select('co_mo_kiem_phap',2);window.reviewApi.scrub(1450);});expect(await page.evaluate(()=>window.reviewApi.snapshot().drawn.filter(x=>x.role==='minion-shot').length)).toBe(7); // eighth has later release; assert all8 recipe instances below
 expect(await page.evaluate(()=>window.reviewApi.recipe('co_mo_kiem_phap',2,'right').effects.filter(x=>x.role==='minion-shot').length)).toBe(8);
 await page.evaluate(()=>window.reviewApi.gallery());await expect(page.locator('#boards')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#boards')).not.toBeVisible();
 expect(errors).toEqual([]);
 await writeFile(new URL('previews/browser-validation.json',base),JSON.stringify({status:'PASS',scope:'Independent Canvas2D review; no Phaser or multiplayer acceptance',directorApproved:false,productionIntegrated:false,video:false,trace:false,items:22,clipsPlayed:clips.length,frameReferences:clips.reduce((s,x)=>s+x.frameOrder.length,0),clips,recipeObservations:allRecipes,png:paths,oneAOneCast:true,cleanup:['cancel','death','zone','facing-change','selection-change','complete'],observations:await page.evaluate(()=>window.reviewApi.observations),errors},null,2)+'\n');
});
test('Review4 director corrections: pivots, melee arcs, restored dogs/spin and moving YinYang',async({page})=>{
 await page.goto(url+'?review=4');await page.waitForFunction(()=>window.reviewReady);
 const checks=await page.evaluate(()=>{
  const api=window.reviewApi,results=[],assert=(v,msg)=>{if(!v)throw Error(msg);results.push(msg);},same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.001;
  assert(!api.items.some(x=>x.id==='phat_tran_cong'),'Phat Tran withdrawn from review');
  for(const d of ['right','down','left','up']){
   const cb=api.recipe('thien_ha_vo_cau',0,d);assert(cb.effects.filter(e=>e.role==='fire-dog').length===4,'four retained fire dogs '+d);assert(cb.effects.find(e=>e.tag==='whirlwind').scale>1,'wider whirl '+d);assert(same(cb.effects.find(e=>e.tag==='final_smash').pivot,[128,174]),'slam contact anchor '+d);
   const lp=api.recipe('liet_phong_dao',0,d);assert(lp.effects.some(e=>e.asset==='ts_ground'),'retained ground-break '+d);assert(lp.effects.filter(e=>e.asset==='ts_dao_fx').every(e=>e.usePlacement),'overhead offset restored '+d);if(d==='left')assert(lp.effects.filter(e=>e.asset==='ts_dao_fx').every(e=>e.mirrorX&&e.tag.endsWith('_right')),'left uses horizontal mirror, never rotated spine-first');
   const va=api.recipe('vo_anh_cuoc',0,d),births=va.effects.filter(e=>e.tag==='birth_'+d),travels=va.effects.filter(e=>e.tag==='travel_'+d);assert(births.length===3&&births[0].start<births[1].start&&births[1].start<births[2].start,'ordered three feet '+d);const mid=[births.reduce((s,e)=>s+e.from[0],0)/3,births.reduce((s,e)=>s+e.from[1],0)/3];assert(same(mid,[va.feet[0],va.feet[1]-22]),'three lanes centred on torso '+d);assert(travels.every(e=>same([e.to[0]-e.from[0],e.to[1]-e.from[1]],[travels[0].to[0]-travels[0].from[0],travels[0].to[1]-travels[0].from[1]])),'parallel foot trajectories '+d);
   const tt=api.recipe('tru_ta',0,d);assert(tt.effects.filter(e=>e.role==='melee-slash').length===1&&tt.effects.every(e=>same(e.from,e.to)),'one fixed enlarged Tru Ta slash '+d);
   const hl=api.recipe('hong_liet_a1_a2',0,d),blades=hl.effects.filter(e=>e.role==='blade-lane');assert(blades.length===5&&blades.every(e=>same(e.from,[hl.feet[0],hl.feet[1]-28])),'five HHL blades share torso centre '+d);
   const a2=api.recipe('hong_liet_a1_a2',1,d).effects.find(e=>e.role==='melee-sweep');assert(a2.frontHalf&&same(a2.from,a2.to),'stationary front180 HHL sweep '+d);
   for(let v=0;v<2;v++){const k=api.recipe('kim_luan_normal',v,d),shot=k.effects.find(e=>e.asset==='r3_round_wheel'||e.tag==='birth_'+d);assert(same(shot.from,[k.feet[0],k.feet[1]-30]),'Kim emission centred '+d+':'+v);}
   const l=api.recipe('ly_mac_sau_normal',1,d),n=l.effects.find(e=>e.role==='poison-needle');assert(same(n.from,[l.feet[0],l.feet[1]-28]),'LMS needle torso origin '+d);assert(Math.hypot(n.to[0]-n.from[0],n.to[1]-n.from[1])>350,'LMS longer needle '+d);
  }
  api.select('kim_quang_ho_tran');for(const t of [600,1500,2400,2700]){api.scrub(t);const s=api.snapshot(),body=s.drawn.find(e=>e.role==='caster'),aura=s.drawn.find(e=>e.asset==='kim_quang_ho_tran_vfx');assert(same(body.at,aura.at),'aura and hero shared moving anchor '+t);}
  const tuy=api.recipe('tuy_tien_bo',0,'right');assert(tuy.actors.filter(a=>a.role==='caster').every(a=>a.asset==='cbt_runtime_actions'&&a.tag==='spin'&&!a.airborne),'original runtime spin body retained');assert(tuy.effects.filter(e=>e.role==='moving-palm').every(e=>same(e.to,e.capturedTarget)),'palms captured at player position');assert(!tuy.actors.some(a=>a.tag.startsWith('basic_palm')),'palms do not replace spinning body');
  api.select('am_duong_nghich_chuyen');api.scrub(400);const a=api.snapshot().drawn.filter(e=>e.role==='moving-yin-yang');api.scrub(1400);const b=api.snapshot().drawn.filter(e=>e.role==='moving-yin-yang');assert(a.length===15&&b.length===15,'15 runtime-style ground circles');assert(a.every((e,i)=>!same(e.at,b[i].at)),'all circle centres change position, no fixed grid');assert(!api.snapshot().selected.some(e=>e.tag==='large_formation'),'only large hazy core excluded');
  assert(api.recipe('ly_mac_sau_normal',0,'right').effects.filter(e=>e.asset==='r3_whisk_ring').every(e=>e.scale===1.2),'whisk360 AOE +20%');
  return results;
 });
 const images=[];
 for(const [id,v,d,t] of [['liet_phong_dao',0,'left',500],['liet_phong_dao',0,'left',900],['liet_phong_dao',0,'right',900],['thien_ha_vo_cau',0,'right',1300],['thien_ha_vo_cau',0,'right',2700],['vo_anh_cuoc',0,'right',900],['vo_anh_cuoc',0,'left',900],['tru_ta',0,'right',450],['tru_ta',0,'left',450],['kim_quang_ho_tran',0,'right',1500],['ly_mac_sau_normal',1,'right',600],['ly_mac_sau_normal',0,'right',500],['hong_liet_a1_a2',0,'right',270],['hong_liet_a1_a2',1,'right',400],['hong_liet_a1_a2',1,'left',400],['hong_liet_a1_a2',1,'down',400],['tuy_tien_bo',0,'right',1100],['am_duong_nghich_chuyen',0,'right',1400],['kim_luan_normal',0,'right',280],['kim_luan_normal',1,'right',340]]){
  await page.evaluate(({id,v,d,t})=>{window.reviewApi.select(id,v);window.reviewApi.setFacing(d);window.reviewApi.scrub(t);},{id,v,d,t});const name=`review4-${id}-${v}-${d}-${t}`;const png=await page.evaluate(()=>window.reviewApi.nativePng());await writeFile(new URL('previews/'+name+'-native-1x.png',base),Buffer.from(png.split(',')[1],'base64'));await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('previews/'+name+'-display-2x.png',base))});images.push(name);
 }
 const playback=[];for(const id of ['thien_ha_vo_cau','liet_phong_dao','vo_anh_cuoc','tru_ta','kim_quang_ho_tran','hong_liet_a1_a2','tuy_tien_bo','am_duong_nghich_chuyen','kim_luan_normal']){await page.evaluate(id=>{window.reviewApi.select(id);window.reviewApi.speed(1);window.reviewApi.play();},id);for(let i=0;i<6;i++){await page.waitForTimeout(170);playback.push(await page.evaluate(()=>window.reviewApi.snapshot()));}await page.evaluate(()=>window.reviewApi.stop('cancel'));expect(await page.evaluate(()=>window.reviewApi.snapshot().effects)).toBe(0);}
 await writeFile(new URL('previews/review4-corrections-validation.json',base),JSON.stringify({status:'PASS',scope:'Director corrections in independent viewer only; not Phaser/gameplay',checks,images,playback,recordingsCreated:false},null,2)+'\n');
});
test('Review5 runtime fidelity: brightness-only darts, seven ricochets, orbit release and arena110%',async({page})=>{
 await page.goto(url+'?review=5');await page.waitForFunction(()=>window.reviewReady);
 const checks=await page.evaluate(()=>{
  const api=window.reviewApi,ok=[],assert=(v,m)=>{if(!v)throw Error(m);ok.push(m);},same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.001;
  for(let v=0;v<2;v++){
   const a=api.recipe('hoac_do_darts',v,'right',true),b=api.recipe('hoac_do_darts',v,'right',false),strip=r=>r.effects.map(e=>({...e,brightness:undefined,framePivots:undefined,frameRotations:undefined,orientationContract:undefined}));assert(JSON.stringify(strip(a))===JSON.stringify(strip(b)),'Hoac shape/scale/pattern unchanged except brightness and review6 axis correction '+v);
   const darts=b.effects.filter(e=>e.role==='poison-dart');assert(darts.every(e=>e.scale===.25&&e.brightness===1.6&&e.brightnessOnly&&e.asset==='hoac_do_fx'&&e.tag==='nail'),'runtime nail scale and brightness only '+v);assert(darts.length===(v?80:10),'runtime emission count preserved '+v);
   if(v)assert(b.actors.find(e=>e.role==='caster').tag==='spin'&&b.effects.find(e=>e.tag==='whirlwind').scale===.9,'Van Nhan runtime spin and whirlwind restored');
  }
  const r=api.recipe('kim_luan_truy_hon',0,'right'),w=r.effects.filter(e=>e.role==='wheel');assert(w.length===7&&w.every(e=>e.motion==='arena-bounce'&&e.end-e.start===20000&&e.speed===260),'seven long-lived runtime-style ricochets');assert(new Set(w.map(e=>e.heading)).size===7,'seven radial directions');
  const samples=[];for(let t=300;t<20300;t+=100)for(const e of w){const p=api.positionAt(e,t),b=e.bounds;assert(p[0]>=b.x+14-.001&&p[0]<=b.x+b.width-14+.001&&p[1]>=b.y+14-.001&&p[1]<=b.y+b.height-14+.001,'inside arena '+t+':'+e.wheelId);samples.push(p);}
  assert(api.positionAt(w[0],1600)[0]<api.positionAt(w[0],1200)[0],'wheel reverses after right-wall contact');const b=w[0].bounds;for(const [sx,sy] of [[0,0],[0,1],[1,0],[1,1]])assert(samples.some(p=>(sx?p[0]>b.x+b.width-85:p[0]<b.x+85)&&(sy?p[1]>b.y+b.height-55:p[1]<b.y+55)),'ricochets cover corner '+sx+sy);
  const h=api.recipe('ngu_luan_ho_the',0,'right'),orbit=h.effects.filter(e=>e.phase==='orbit'),release=h.effects.filter(e=>e.phase==='radial-release');assert(orbit.length===7&&release.length===7,'seven persistent IDs across orbit and release');
  for(let i=0;i<7;i++){assert(orbit[i].wheelId===release[i].wheelId&&same(api.positionAt(orbit[i],orbit[i].end),release[i].from),'no position jump on release '+i);assert(orbit[i].end-orbit[i].start===3000&&orbit[i].orbit.radius===145&&orbit[i].orbit.speed===.006&&release[i].releaseSpeed===680,'existing orbit/release values retained '+i);}
  assert(new Set(release.map(e=>e.heading)).size===7,'seven distinct radial release directions');const ar=api.arenaReview;assert(ar.proposed.width/ar.current.width===1.1&&ar.proposed.height/ar.current.height===1.1&&ar.areaMultiplier===1.21,'arena each axis110%, area121%, current-game basis');return ok.filter(x=>!x.startsWith('inside arena'));
 });
 const captures=[];
 for(const [id,v,t,baseline] of [['hoac_do_darts',0,650,true],['hoac_do_darts',0,650,false],['hoac_do_darts',1,900,true],['hoac_do_darts',1,900,false],['kim_luan_truy_hon',0,1000,false],['kim_luan_truy_hon',0,7500,false],['kim_luan_truy_hon',0,16500,false],['ngu_luan_ho_the',0,1500,false],['ngu_luan_ho_the',0,3299,false],['ngu_luan_ho_the',0,3400,false],['arena_backgrounds',0,100,false]]){
  await page.evaluate(({id,v,t,baseline})=>{window.reviewApi.select(id,v);window.reviewApi.setFacing('right');window.reviewApi.compare(baseline);window.reviewApi.scrub(t);},{id,v,t,baseline});const name=`review5-${id}-${v}-${t}-${baseline?'baseline':'candidate'}`,png=await page.evaluate(()=>window.reviewApi.nativePng());await writeFile(new URL('previews/'+name+'-native-1x.png',base),Buffer.from(png.split(',')[1],'base64'));await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('previews/'+name+'-display-2x.png',base))});captures.push(name);
 }
 const playback=[];for(const id of ['hoac_do_darts','kim_luan_truy_hon','ngu_luan_ho_the']){await page.evaluate(id=>{window.reviewApi.compare(false);window.reviewApi.select(id);window.reviewApi.speed(1);window.reviewApi.play();},id);for(let i=0;i<6;i++){await page.waitForTimeout(180);playback.push(await page.evaluate(()=>window.reviewApi.snapshot()));}await page.evaluate(()=>window.reviewApi.stop('cancel'));expect(await page.evaluate(()=>window.reviewApi.snapshot().effects)).toBe(0);}
 await page.evaluate(()=>{window.reviewApi.select('kim_luan_truy_hon');window.reviewApi.speed(2);window.reviewApi.play();});await page.waitForFunction(()=>!window.reviewApi.snapshot().active,{timeout:20000});expect(await page.evaluate(()=>window.reviewApi.snapshot().effects)).toBe(0);
 await writeFile(new URL('previews/review5-validation.json',base),JSON.stringify({status:'PASS',scope:'Independent viewer only; no gameplay/Phaser acceptance',checks,captures,playback,twentySecondCastCompleted:true,recordingsCreated:false},null,2)+'\n');
});
test('Review6 needle tips follow travel and only accepted ground YinYang remains',async({page})=>{
 await page.goto(url+'?review=6');await page.waitForFunction(()=>window.reviewReady);
 const axis=JSON.parse(await readFile(new URL('source/review6-nail-axis.json',base),'utf8'));
 const old=JSON.parse(await readFile(new URL('history/review5/selected-tags.json',base),'utf8')).scenes.find(s=>s.id==='am_duong_nghich_chuyen'&&s.facing==='right').effects.filter(e=>e.role==='moving-yin-yang');
 const assertions=await page.evaluate(({axis,old})=>{
  const api=window.reviewApi,groups=[],seen=new Set();let darts=0,maxError=0;
  for(let v=0;v<2;v++)for(const d of ['right','down','left','up']){
   api.compare(false);api.select('hoac_do_darts',v);api.setFacing(d);const recipe=api.recipe('hoac_do_darts',v,d);
   for(const t of [320,390,460,530,600,670,740,810]){
    api.scrub(t);const rendered=api.snapshot().drawn.filter(e=>e.role==='poison-dart'),shots=recipe.effects.filter(e=>e.role==='poison-dart'&&e.start<=t&&e.end>t);
    if(rendered.length!==shots.length)throw Error('Unmatched render state');
    rendered.forEach((draw,i)=>{const s=shots[i],target=Math.atan2(s.to[1]-s.from[1],s.to[0]-s.from[0]),actual=draw.rotation+axis.frames[draw.frame].sourceAngleRadians,error=Math.abs(Math.atan2(Math.sin(actual-target),Math.cos(actual-target)));if(error>1e-8)throw Error('Sideways tip '+draw.frame+':'+d);if(draw.scale!==.25)throw Error('Unrequested scale change');seen.add(draw.frame);darts++;maxError=Math.max(maxError,error);});
   }groups.push({v,d});
  }
  if(seen.size!==4)throw Error('Not all nail cels covered');
  const ground=api.recipe('am_duong_nghich_chuyen',0,'right').effects;
  if(JSON.stringify(ground)!==JSON.stringify(old))throw Error('Accepted ground recipe changed');
  api.select('am_duong_nghich_chuyen');api.scrub(1400);const state=api.snapshot();if(state.drawn.filter(e=>e.role==='moving-yin-yang').length!==15||state.drawn.some(e=>['large_formation','rotating_waves'].includes(e.tag)))throw Error('Rejected screen overlay remains');
  return{groups,frames:[...seen],dartsChecked:darts,maxAngleErrorRadians:maxError,groundRecipeUnchanged:true,only15GroundRings:true};
 },{axis,old});
 const captures=[];
 for(const [id,v,d,t,baseline] of [['hoac_do_darts',0,'right',620,true],['hoac_do_darts',0,'right',620,false],['hoac_do_darts',0,'left',620,false],['hoac_do_darts',1,'down',900,false],['am_duong_nghich_chuyen',0,'right',1400,false],['am_duong_nghich_chuyen',0,'right',2800,false]]){
  await page.evaluate(({id,v,d,t,baseline})=>{window.reviewApi.select(id,v);window.reviewApi.setFacing(d);window.reviewApi.compare(baseline);window.reviewApi.scrub(t);},{id,v,d,t,baseline});const name=`review6-${id}-${v}-${d}-${t}-${baseline?'baseline':'candidate'}`,png=await page.evaluate(()=>window.reviewApi.nativePng());await writeFile(new URL('previews/'+name+'-native-1x.png',base),Buffer.from(png.split(',')[1],'base64'));await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('previews/'+name+'-display-2x.png',base))});captures.push(name);
 }
 const playback=[];for(const id of ['hoac_do_darts','am_duong_nghich_chuyen']){await page.evaluate(id=>{window.reviewApi.compare(false);window.reviewApi.select(id,id==='hoac_do_darts'?1:0);window.reviewApi.speed(1);window.reviewApi.play();},id);for(let i=0;i<7;i++){await page.waitForTimeout(170);playback.push(await page.evaluate(()=>window.reviewApi.snapshot()));}await page.evaluate(()=>window.reviewApi.stop('cancel'));expect(await page.evaluate(()=>window.reviewApi.snapshot().effects)).toBe(0);}
 await writeFile(new URL('previews/review6-validation.json',base),JSON.stringify({status:'PASS',scope:'Standalone viewer, not Phaser/gameplay',assertions,captures,playback,recordingsCreated:false},null,2)+'\n');
});
test('R3 normal-speed composite motion and four manual A beats',async({page})=>{
 await page.goto(url);await page.waitForFunction(()=>window.reviewReady);
 const ids=['toan_phong_thoai','nhu_lai_niet_ban','su_tu_hong','tuy_tien_bo','can_khon_phan_chan','ngu_luan_ho_the'],samples=[];
 for(const id of ids){await page.evaluate(id=>{window.reviewApi.select(id);window.reviewApi.speed(1);window.reviewApi.play();},id);for(let i=0;i<5;i++){await page.waitForTimeout(180);samples.push(await page.evaluate(()=>window.reviewApi.snapshot()));}await page.waitForFunction(()=>!window.reviewApi.snapshot().active);}
 await page.evaluate(()=>{window.reviewApi.select('thieu_lam_a');window.reviewApi.speed(1);});
 for(let i=0;i<4;i++){expect(await page.evaluate(()=>window.reviewApi.play())).toBe(true);expect(await page.evaluate(()=>window.reviewApi.snapshot().beat)).toBe(i);if(i===3){await page.waitForTimeout(650);await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('previews/thieu_lam_a-finisher-display-2x.png',base))});const png=await page.evaluate(()=>window.reviewApi.nativePng());await writeFile(new URL('previews/thieu_lam_a-finisher-native-1x.png',base),Buffer.from(png.split(',')[1],'base64'));}await page.waitForFunction(()=>!window.reviewApi.snapshot().active);}
 expect(await page.evaluate(()=>window.reviewApi.snapshot().cooldownRemaining)).toBeGreaterThan(0);expect(await page.evaluate(()=>window.reviewApi.play())).toBe(false);
 await page.waitForTimeout(1050);expect(await page.evaluate(()=>window.reviewApi.play())).toBe(true);await page.waitForFunction(()=>!window.reviewApi.snapshot().active);await page.waitForTimeout(2100);expect(await page.evaluate(()=>window.reviewApi.play())).toBe(false);await page.waitForTimeout(950);expect(await page.evaluate(()=>window.reviewApi.play())).toBe(true);await page.evaluate(()=>window.reviewApi.stop('cancel'));
 await writeFile(new URL('previews/motion-validation.json',base),JSON.stringify({status:'PASS',method:'Actual requestAnimationFrame normal-speed composite playback and sampled render state; no recording',manualCombo:true,finisherCooldown1s:true,partialChain2sThenCooldown1s:true,samples,observations:await page.evaluate(()=>window.reviewApi.observations)},null,2)+'\n');
});
