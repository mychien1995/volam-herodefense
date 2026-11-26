import {StandaloneLoiDai,submitInput} from '@volam/game-core';
import {m1Config,creepDungeon,pvpDefinition} from '@volam/game-data';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../../../../../',import.meta.url)));
const stats=a=>{a.sort((a,b)=>a-b);return {mean:a.reduce((a,b)=>a+b,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)}};
const report={scope:'Core-only real 1v1 controller on Rừng Trúc, canonical map/hazards and cooldowns, two level30 heroes; extra HP fixture; real accepted inputs and hit counters, no Room/serializer/render/network',rows:[]};
for(let run=0;run<3;run++){
 const p=new StandaloneLoiDai(m1Config,creepDungeon,pvpDefinition,42);
 for(const id of ['host','peer'])p.join(id,id);
 p.choose('host','thien_son','thien_son_dao');p.choose('peer','cai_bang','cai_bang_chuong');
 p.assign('host','host','chinh');p.assign('host','peer','ta');p.configure('host','rung_truc',true);p.start('host');
 while(p.phase!=='fighting')p.step();
 for(const [i,h] of [...p.arena.world.heroes.values()].entries()){h.x=580+i*100;h.y=360;h.fx=i?-1:1;h.fy=0;h.hp=h.maxHp=1e9;}
 const times=[],jsonTimes=[];let accepted=0,casts=0,hits=0,bytes=0;
 for(let tick=0;tick<720;tick++){
  for(const h of p.arena.world.heroes.values()){
   if(tick%18===0)accepted+=Number(submitInput(p.arena.world,h.id,h.lastSequence+1,{kind:'basic'}));
   if(tick%30===0)accepted+=Number(submitInput(p.arena.world,h.id,h.lastSequence+1,{kind:'cast',slot:(tick/30)%5}));
  }
  const t=performance.now();p.step();const elapsed=performance.now()-t;
  for(const e of p.events){if(e.event.kind==='cast')casts++;if(e.event.kind==='hit')hits++;}
  const tj=performance.now();const json=JSON.stringify(p.snapshot());const js=performance.now()-tj;
  if(tick>=120){times.push(elapsed);jsonTimes.push(js);bytes+=Buffer.byteLength(json);}
 }
 const row={run,ticks:times.length,accepted,casts,hits,simulation:stats(times),snapshotStringify:stats(jsonTimes),snapshotMeanBytes:bytes/times.length};report.rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync('docs/evidence/sessions/m4d-performance-investigation-20261127/pvp-core.json',JSON.stringify(report,null,2));
