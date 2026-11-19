import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),out=resolve(root,'docs/evidence/sessions/core-fast-accepted-measurements');mkdirSync(out,{recursive:true});
const old=JSON.parse(readFileSync(resolve(root,'docs/evidence/sessions/core-fast-measurements/benchmark.json')));
const samples=old.samples.filter(s=>s.mode==='quick');
let cold;
for(let trial=0;trial<=3;trial++){
 const session=trial===0?'core-fast-accepted-cold':`core-fast-accepted-warm-${trial}`,start=performance.now();
 const result=spawnSync(process.execPath,['scripts/check-core.mjs',...old.tests],{cwd:root,env:{...process.env,VOLAM_QA_SESSION:session},windowsHide:true,encoding:'utf8',maxBuffer:1024*1024});
 writeFileSync(resolve(out,session+'-driver.log'),result.stdout+result.stderr);
 if(result.status!==0)throw Error(result.stdout+result.stderr);
 const reportPath=resolve(root,'docs/evidence/sessions',session,'check-core/core-timings.json'),report=JSON.parse(readFileSync(reportPath));
 const testStage=report.stages.find(s=>s.label==='fresh pure-core tests'),log=readFileSync(testStage.logPath,'utf8');
 if(!/Tests\s+47 passed/.test(log))throw Error('Changed test scope');
 const hits=report.stages.filter(s=>'hit'in s).map(s=>s.hit);
 if(trial>0&&(hits.length!==2||hits.some(v=>!v)))throw Error('Expected two HITs');
 const sample={mode:'core',trial,session,status:report.status,wallSeconds:Number(((performance.now()-start)/1000).toFixed(3)),reportedSeconds:report.totalSeconds,testsSeconds:testStage.seconds,tests:47,files:2,hits,reportPath};
 if(trial===0)cold=sample;else samples.push(sample);
 const sourceSha256=Object.fromEntries(['tools/core-test-cache.mjs','scripts/check-core.mjs','vitest.core.config.ts'].map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));
 writeFileSync(resolve(out,'benchmark.json'),JSON.stringify({scenario:'Final missing-JSON fix: warm baseline samples retained from balanced six-run comparison; final candidate warm measurements repeated; same 47 tests and toolchain. Cache-cold sample separate; OS caches/load uncontrolled.',tests:old.tests,sourceSha256,cold,samples},null,2)+'\n');
 console.log(JSON.stringify(sample));
}
