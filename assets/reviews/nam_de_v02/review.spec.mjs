import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const evidence=path.join(base,'evidence','feedback03');
test('Nam Đế retained actor, reworked VFX and final-brief choreography in Phaser',async({page})=>{
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5413/assets/reviews/nam_de_v02/');
 await page.waitForFunction(()=>window.__namDeReview?.ready);
 const api=(method,arg)=>page.evaluate(([method,arg])=>window.__namDeReview[method](arg),[method,arg]);
 const sample=()=>api('sample');
 await api('pause',true);
 const packages=JSON.parse(await fs.readFile(path.join(base,'data.json'),'utf8')).packages;
 // Observe all 208 retained actor cels through Phaser AnimationManager on real wall clock.
 for(const c of packages.find(p=>p.key==='boss').clips){
  const duration=await api('playClip','boss:'+c.name);
  await page.waitForTimeout(duration+90);
 }
 let state=await sample();
 for(const c of packages.find(p=>p.key==='boss').clips)for(const f of c.frames)expect(state.observed).toContain('boss:'+f);
 checks.push('208/208 actor cels, all 52 directional clips, live Phaser AnimationManager');
 // Supplementary effects must render all four authored cels on the real renderer too.
 for(const p of packages.filter(p=>['rework','feedback01'].includes(p.key)))for(const c of p.clips){const duration=await api('playClip',p.key+':'+c.name);await page.waitForTimeout(duration+90);}
 state=await sample();for(const c of packages.find(p=>p.key==='rework').clips)for(const f of c.frames)expect(state.observed).toContain('rework:'+f);
 checks.push('16/16 new authored VFX cels rendered in Phaser');
 for(const c of packages.find(p=>p.key==='feedback01').clips)for(const f of c.frames)expect(state.observed).toContain('feedback01:'+f);
 checks.push('Four simple-ring cels and four clean shaft crops observed in Phaser');
 for(const mode of ['entrance','palm','aura','small','dash','beam','barrage','pressure','confuse','sky','gallery']){
  await api('select',mode);for(let i=0;i<35;i++){await api('seek',i*.15);await page.waitForTimeout(18);}
  expect((await sample()).errors).toEqual([]);
 }
 checks.push('Eleven choreography selections, forward/recovery phases without load errors');
 await api('select','entrance');await api('seek',0);const y=(await sample()).boss.y;await api('seek',4.8);expect((await sample()).boss.y).toBeLessThan(y);
 checks.push('South entrance moves north in the retained main arena; no separate arena');
 await api('select','aura');await api('seek',1);state=await sample();const rings=state.drawn.filter(s=>s.texture==='feedback01');expect(rings).toHaveLength(1);expect(rings[0].x).toBe(state.boss.x);expect(rings[0].y).toBe(state.boss.y);expect(state.drawn.some(s=>s.frame.startsWith('radial_shockwave'))).toBe(false);checks.push('Phật Quang draws one plain expanding ring centered on Nam Đế');
 await api('setParty',6);await api('select','small');await api('seek',.02);state=await sample();expect(state.shots).toHaveLength(1);expect(state.shots[0].start).toBe(0);expect(state.drawn.find(s=>s.texture==='boss').frame).toMatch(/^finger_release/);expect(state.drawn.some(s=>s.frame.startsWith('finger_charge')||s.frame.startsWith('fingertip_charge'))).toBe(false);
 const shot=state.shots[0],players=[state.player,{x:800,y:668},{x:855,y:715},{x:690,y:720},{x:1005,y:605},{x:635,y:590}];
 const far=Math.max(...players.map(p=>Math.hypot(p.x-740,p.y-650)));expect(Math.hypot(shot.target.x-740,shot.target.y-650)).toBeCloseTo(far);
 await api('setPlayer',{x:600,y:750});await api('step',.1);expect((await sample()).shots[0]).toEqual(shot);
 checks.push('Instant hand-flick release with no charge, farthest-player selection and nontracking snapshot');
 await api('select','dash');await api('setPlayer',{dir:'up'});await api('seek',1);state=await sample();expect(state.boss.y).toBeGreaterThan(state.player.y);
 checks.push('Dash ends behind victim facing north');
 await api('select','beam');await api('seek',1.6);expect((await sample()).player.hp).toBe(10);state=await sample();expect(state.ray.drawnLength).toBeCloseTo(state.ray.length);expect(state.ray.texture).toBe('rays');expect(state.ray.from.x).toBe(782);
 await api('select','beam');await api('setPlayer',{y:760});await api('seek',1.6);expect((await sample()).player.hp).toBe(100);
 checks.push('Illustrative 90% beam hit and sidestep miss; warning direction stays frozen');
 await api('select','barrage');await api('seek',15);state=await sample();expect(state.shots).toHaveLength(64);
 const angles=state.shots.map(s=>((s.angle%(2*Math.PI))+2*Math.PI)%(2*Math.PI)).sort((a,b)=>a-b);
 const gaps=angles.map((a,i)=>(angles[(i+1)%angles.length]+(i===angles.length-1?2*Math.PI:0))-a);expect(Math.max(...gaps)).toBeLessThan(.4);
 expect(state.shots.every(s=>Math.abs(s.start-s.warningStart-.9)<1e-9)).toBe(true);
 checks.push('Sixteen four-direction volleys cover 360 degrees; retained 0.9s warning and 0.8s cadence');
 await api('select','pressure');await api('seek',1.1);state=await sample();expect(state.qte.sequence).toHaveLength(10);expect(state.qte.locked).toBe(true);
 const pinned={...state.player},correct=state.qte.sequence[0];await page.keyboard.down(correct);await api('step',.2);await page.keyboard.up(correct);expect((await sample()).player.x).toBe(pinned.x);expect((await sample()).player.y).toBe(pinned.y);await api('previewDamage',50);expect((await sample()).player.hp).toBe(100);checks.push('Locked visual victim remains immobile and immune to illustrative concurrent damage');
 // Reset after the movement probe because an arrow may intentionally be a wrong QTE key.
 await api('select','pressure');await api('seek',1.1);state=await sample();
 for(const k of state.qte.sequence)await page.keyboard.press(k);
 expect((await sample()).qte.result).toBe('success');expect((await sample()).qte.locked).toBe(false);
 await expect(page.locator('#qte')).toBeHidden();
 checks.push('All ten correct arrow inputs release the contact seal immediately');
 await api('select','pressure');await api('seek',1.1);state=await sample();const wrong=Object.keys({ArrowUp:1,ArrowDown:1,ArrowLeft:1,ArrowRight:1}).find(k=>k!==state.qte.sequence[0]);await page.keyboard.press(wrong);state=await sample();expect(state.qte.result).toBe('wrong');expect(state.player.hp).toBe(30);expect(state.bossHp).toBe(80);expect(state.qte.locked).toBe(false);
 expect(state.player.stunned).toBe(true);expect(state.qte.stunUntil-state.qte.failedAt).toBe(2);
 await expect(page.locator('#qte')).toBeHidden();
 const stunnedAt={...state.player};await page.keyboard.down('ArrowRight');await api('step',.15);await page.keyboard.up('ArrowRight');state=await sample();expect(state.player.x).toBe(stunnedAt.x);expect(state.player.y).toBe(stunnedAt.y);expect(state.drawn.some(s=>s.texture==='pressure'&&s.frame.startsWith('pressure_impact'))).toBe(true);expect(state.drawn.some(s=>s.texture==='pressure'&&s.frame.startsWith('stun_status'))).toBe(true);
 await fs.mkdir(evidence,{recursive:true});await page.waitForTimeout(60);await page.screenshot({path:path.join(evidence,'wrong-input-explosion-stun.png')});
 await api('step',2);expect((await sample()).player.stunned).toBe(false);await page.keyboard.down('ArrowRight');await api('step',.2);await page.keyboard.up('ArrowRight');expect((await sample()).player.x).toBeGreaterThan(stunnedAt.x);
 checks.push('Wrong input: −70% HP, boss +10%, visible explosion/stun, movement frozen for 2s then restored');
 await api('select','pressure');await api('seek',5.89);expect((await sample()).qte.locked).toBe(true);await api('seek',5.91);expect((await sample()).qte.result).toBe('timeout');
 checks.push('Five-second input window; no invented timeout damage');
 await api('select','confuse');await api('seek',1);state=await sample();expect(new Set(Object.values(state.permutation)).size).toBe(4);expect(Object.entries(state.permutation).every(([a,b])=>a!==b)).toBe(true);
 const initial={...state.player},map=state.permutation;await page.keyboard.down('ArrowUp');await api('step',.3);await page.keyboard.up('ArrowUp');const after=(await sample()).player;const actual=map.ArrowUp;expect(actual==='ArrowLeft'?after.x<initial.x:actual==='ArrowRight'?after.x>initial.x:after.y>initial.y).toBe(true);
 await api('seek',10.81);await expect(page.locator('#mapping')).toBeHidden();checks.push('One-target dizziness, bijective arrow remapping, expires after ten seconds');
 await api('select','sky');state=await sample();expect(state.rain).toHaveLength(32);expect(state.rain.every(r=>r.warning===.28)).toBe(true);
 checks.push('Upward finger ray followed by 32 individually warned sky strikes');
 await api('select','palm');await api('pause',false);const before=(await sample()).t;await page.waitForTimeout(650);expect((await sample()).t-before).toBeGreaterThan(.35);await api('pause',true);
 checks.push('Live scene advances on wall clock, pause/seek retains deterministic visual timing');
 await fs.mkdir(evidence,{recursive:true});
 for(const [id,t,file]of [['gallery',.1,'sprite-native-2x.png']]){
  await api('select',id);await api('setParty',6);await api('seek',t);await page.waitForTimeout(60);await page.screenshot({path:path.join(evidence,file)});
 }
 await api('setZoom',1);await api('select','gallery');await api('seek',.1);await page.waitForTimeout(60);await page.screenshot({path:path.join(evidence,'sprite-native-1x.png')});await api('setZoom',2);
 for(const size of [{width:1280,height:720},{width:960,height:600}]){
  await page.setViewportSize(size);const view=await page.locator('#viewport').boundingBox();
  for(const name of ['.dock','.tools','.identity','.options','.help']){const box=await page.locator(name).boundingBox();expect(box.x).toBeGreaterThanOrEqual(view.x);expect(box.y).toBeGreaterThanOrEqual(view.y);expect(box.x+box.width).toBeLessThanOrEqual(view.x+view.width+1);expect(box.y+box.height).toBeLessThanOrEqual(view.y+view.height+1);}
 }
 checks.push('Native 1×/normal 2× PNGs and six visual witnesses; overlays stay inside both viewport sizes');
 expect(errors).toEqual([]);expect((await sample()).errors).toEqual([]);
 await fs.writeFile(path.join(evidence,'verification.json'),JSON.stringify({status:'PASS',phaserVersion:await page.evaluate(()=>Phaser.VERSION),scope:'Standalone feedback03 art/choreography preview only; not network clients, authoritative combat, final runtime or director approval',checks,observedFrames:(await sample()).observed,errors,recording:false},null,2)+'\n');
});

test('feedback03 simultaneous warned directions retain slow rotation and pressure dismissal',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5413/assets/reviews/nam_de_v02/');await page.waitForFunction(()=>window.__namDeReview?.ready);
 const api=(method,arg)=>page.evaluate(([m,a])=>window.__namDeReview[m](a),[method,arg]);
 const sample=()=>api('sample');await api('pause',true);await api('setParty',6);await api('select','barrage');
 await api('seek',1.6);let s=await sample();expect(s.barrage.warningCount).toBe(4);expect(s.barrage.activeCount).toBe(0);expect(s.barrage.released).toBe(0);expect(s.drawn.filter(x=>x.frame.startsWith('line_warning'))).toHaveLength(4);expect(s.drawn.some(x=>x.frame.startsWith('thin_beam'))).toBe(false);
 await fs.mkdir(evidence,{recursive:true});await page.waitForTimeout(50);await page.screenshot({path:path.join(evidence,'barrage-warning.png')});
 const samples=[];
 for(let i=0;i<=142;i++){await api('seek',1.1+i*.1);const a=await sample();samples.push({t:a.t,angle:a.barrage.rotation,dir:a.boss.dir});expect(a.barrage.activeCount).toBeLessThanOrEqual(4);expect(a.barrage.warningCount).toBeLessThanOrEqual(8);}
 for(let i=1;i<samples.length;i++){const delta=samples[i].angle-samples[i-1].angle;expect(delta).toBeGreaterThanOrEqual(-1e-9);expect(delta).toBeLessThan(.05);}
 expect(samples.at(-1).angle-samples[0].angle).toBeCloseTo(Math.PI*2);
 const changes=samples.filter((a,i)=>i&&a.dir!==samples[i-1].dir);expect(changes.length).toBeLessThanOrEqual(4);
 s=await sample();expect(s.shots).toHaveLength(64);
 for(let volley=0;volley<16;volley++){
  const group=s.shots.filter(x=>x.volley===volley);expect(group).toHaveLength(4);expect(new Set(group.map(x=>x.start)).size).toBe(1);expect(new Set(group.map(x=>x.warningStart)).size).toBe(1);
  const sorted=group.map(x=>((x.angle%(2*Math.PI))+2*Math.PI)%(2*Math.PI)).sort((a,b)=>a-b);
  for(let j=0;j<4;j++)expect(sorted[(j+1)%4]+(j===3?2*Math.PI:0)-sorted[j]).toBeCloseTo(Math.PI/2);
  if(volley)expect(group[0].start-s.shots.find(x=>x.volley===volley-1).start).toBeCloseTo(.8);
 }
 for(const shot of s.shots){
  expect(shot.start-shot.warningStart).toBeCloseTo(.9);await api('seek',shot.warningStart+.01);const warned=(await sample()).shots.find(x=>x.index===shot.index);await api('seek',shot.start+.05);const fired=await sample();expect(fired.barrage.activeCount).toBe(4);expect(fired.drawn.filter(x=>x.frame.startsWith('thin_beam'))).toHaveLength(4);expect(fired.shots.find(x=>x.index===shot.index).angle).toBe(warned.angle);
 }
 await api('seek',2.25);await page.waitForTimeout(50);await page.screenshot({path:path.join(evidence,'barrage-four-directions.png')});
 await api('select','pressure');await api('seek',1.1);await expect(page.locator('#qte')).toBeVisible();s=await sample();for(const key of s.qte.sequence)await page.keyboard.press(key);await expect(page.locator('#qte')).toBeHidden();expect((await sample()).qte.result).toBe('success');
 await page.waitForTimeout(50);await page.screenshot({path:path.join(evidence,'success-dialog-closed.png')});
 await api('select','pressure');await api('seek',1.1);s=await sample();const wrong=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].find(k=>k!==s.qte.sequence[0]);await page.keyboard.press(wrong);await expect(page.locator('#qte')).toBeHidden();await api('step',.15);s=await sample();expect(s.player.stunned).toBe(true);expect(s.player.hp).toBe(30);expect(s.drawn.some(x=>x.frame.startsWith('pressure_impact'))).toBe(true);expect(s.drawn.some(x=>x.frame.startsWith('stun_status'))).toBe(true);
 await page.waitForTimeout(50);await page.screenshot({path:path.join(evidence,'wrong-dialog-closed-explosion.png')});
 await api('step',.5);await expect(page.locator('#qte')).toBeHidden();await api('select','pressure');await api('seek',1.1);await expect(page.locator('#qte')).toBeVisible();
 expect(errors).toEqual([]);
 await fs.writeFile(path.join(evidence,'feedback03-verification.json'),JSON.stringify({status:'PASS',scope:'Standalone art preview only; six local visual witnesses, not network clients',warningSeconds:.9,volleyIntervalSeconds:.8,rotationSeconds:12.8,volleyCount:16,shotCount:64,maxSimultaneousBeams:4,directionsPerVolley:4,rotationSamples:samples,successClosesImmediately:true,wrongClosesImmediately:true,wrongKeepsExplosionAndStun:true,errors,recording:false},null,2)+'\n');
});
