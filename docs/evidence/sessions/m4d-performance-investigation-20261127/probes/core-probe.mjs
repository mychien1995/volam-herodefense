import {createWorld,addHero,addCreep,stepWorld,initializeProgression,gainExperience,submitInput} from '@volam/game-core';
import {m1Config} from '@volam/game-data';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../../../../../',import.meta.url)));
const out=resolve('docs/evidence/sessions/m4d-performance-investigation-20261127/core.json');
const stats=a=>{a.sort((a,b)=>a-b);return {mean:a.reduce((a,b)=>a+b,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)}};
const report={scope:'Isolated core only, canonical arena collision, six level-30 heroes, 0/80/200 wave-1 enemies, 30Hz simulation; synthetic zero-speed zero-damage enemies, no browser/room/projection/GPU/WAN',rows:[]};
for(const n of [0,80,200])for(let run=0;run<3;run++){
 const c=structuredClone(m1Config);c.creepSpawns=[];c.creepRespawn=false;
 const w=createWorld(c,42);
 for(let i=0;i<6;i++){
  const h=addHero(w,'hero'+i,'Perf '+i,c);h.schoolId=i%2?'thien_son':'cai_bang';initializeProgression(h,c,'default');gainExperience(h,1e9,c);h.x=760+i*28;h.y=600;h.hp=h.maxHp=1e9;
 }
 for(let i=0;i<n;i++){
  const p={x:540+(i%20)*24,y:350+Math.floor(i/20)*25};const e=addCreep(w,'enemy'+i,p,c);
  e.hp=e.maxHp=1e9;e.stats={...c.creep,speed:0,damage:0};e.invasion={wave:1,lane:'west',targetId:'',chaseOrigin:{...p},reacquireAt:0,chaseRange:700,aggroRestTicks:30};
 }
 const times=[];
 for(let tick=0;tick<720;tick++){
  if(tick%30===0)for(const h of w.heroes.values())submitInput(w,h.id,tick+1,{kind:'basic'});
  const t=performance.now();stepWorld(w,c);if(tick>=120)times.push(performance.now()-t);
 }
 const row={count:n,run,ticks:times.length,...stats(times)};report.rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync(out,JSON.stringify(report,null,2));
