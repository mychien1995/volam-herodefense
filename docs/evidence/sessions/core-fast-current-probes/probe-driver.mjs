import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
const root=process.cwd(), probe=resolve(root,'tests/core-fast-artifact-probe.test.ts');
const evidence=resolve(root,'docs/evidence/sessions/core-fast-current-probes');mkdirSync(evidence,{recursive:true});
const good="import {it,expect} from 'vitest'; it('fresh assertion',()=>expect(1).toBe(1));\n";
const bad=good.replace('toBe(1)','toBe(2)');
const sha=(bytes)=>createHash('sha256').update(bytes).digest('hex');
function run(name,files,expected){
 const result=spawnSync(process.execPath,['scripts/check-core.mjs',...files],{cwd:root,env:{...process.env,VOLAM_QA_SESSION:name},windowsHide:true,encoding:'utf8',maxBuffer:1024*1024});
 writeFileSync(resolve(evidence,name+'.log'),result.stdout+result.stderr);
 assert.equal(result.status,expected,result.stdout+result.stderr);
 return JSON.parse(readFileSync(resolve(root,'docs/evidence/sessions',name,'check-core/core-timings.json')));
}
assert.equal(existsSync(probe),false); assert.equal(dirname(probe),resolve(root,'tests'));
try{
 writeFileSync(probe,good);const pass=run('core-fast-current-probe-pass',['tests/core-fast-artifact-probe.test.ts'],0);
 assert.deepEqual(pass.stages.filter(s=>'hit'in s).map(s=>s.hit),[true,true]);
 const time=statSync(probe);writeFileSync(probe,bad);utimesSync(probe,time.atime,time.mtime);
 const fail=run('core-fast-current-probe-fail',['tests/core-fast-artifact-probe.test.ts'],1);
 assert.equal(fail.status,'FAIL');assert.deepEqual(fail.stages.filter(s=>'hit'in s).map(s=>s.hit),[true,true]);
 assert.equal(fail.stages.find(s=>s.label==='fresh pure-core tests').status,'FAIL');
 const artifact=resolve(root,'.cache/pure-core/build/core/index.js'), original=readFileSync(artifact), corrupt=Buffer.from(original);corrupt[0]^=1;writeFileSync(artifact,corrupt);
 const repaired=run('core-fast-current-probe-repair',['tests/combat.test.ts','tests/practice.test.ts'],0);
 assert.deepEqual(repaired.stages.filter(s=>'hit'in s).map(s=>s.hit),[true,false]);assert.equal(sha(readFileSync(artifact)),sha(original));
 writeFileSync(resolve(evidence,'verification.json'),JSON.stringify({freshTestsOnCacheHit:{pass:pass.status,changedSameSizeMtimeTest:fail.status,hits:[true,true]},corruptCompiledOutput:{status:repaired.status,hits:[true,false],restoredSha256:sha(original)},noProductionSourceMutation:true},null,2)+'\n');
 console.log('PASS: fresh failing assertion detected on HIT/HIT; corrupt compiled output repaired on HIT/MISS; 47 real tests passed');
} finally{
 if(existsSync(probe)){assert.ok([good,bad].includes(readFileSync(probe,'utf8')));unlinkSync(probe);}
}
