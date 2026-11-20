import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=process.cwd(), output=resolve(root,'docs/evidence/sessions/core-fast-measurements');
mkdirSync(output,{recursive:true});
const tests=['tests/combat.test.ts','tests/practice.test.ts'];
const schedule=[['core',1],['quick',1],['quick',2],['core',2],['core',3],['quick',3]];
const samples=[];
for(const [mode,trial] of schedule){
  const session=`core-fast-${mode}-warm-${trial}`;
  const started=performance.now();
  const result=spawnSync(process.execPath,[mode==='core'?'scripts/check-core.mjs':'scripts/check-workflow.mjs',...(mode==='core'?[]:['quick']),...tests],{cwd:root,env:{...process.env,VOLAM_QA_SESSION:session},encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
  writeFileSync(resolve(output,`${session}-driver.log`),result.stdout+result.stderr);
  if(result.status!==0)throw Error(`${session} failed: ${result.stderr}`);
  const reportPath=resolve(root,'docs/evidence/sessions',session,mode==='core'?'check-core/core-timings.json':'check-workflow/quick-timings.json');
  const report=JSON.parse(readFileSync(reportPath));
  if(report.status!=='PASS')throw Error(`${session} report is not PASS`);
  const testStage=report.stages.find(s=>s.label===(mode==='core'?'fresh pure-core tests':'focused tests'));
  const testLog=readFileSync(testStage.logPath,'utf8');
  if(!/Tests\s+47 passed/.test(testLog)||!/Test Files\s+2 passed/.test(testLog))throw Error('Unequal test scope: '+session);
  const hits=report.stages.filter(s=>'hit'in s).map(s=>s.hit);
  if(mode==='core'&&(hits.length!==2||hits.some(hit=>!hit)))throw Error('Expected verified warm artifact HITs: '+session);
  const sample={mode,trial,session,status:report.status,wallSeconds:Number(((performance.now()-started)/1000).toFixed(3)),reportedSeconds:report.totalSeconds,testsSeconds:testStage.seconds,tests:47,files:2,hits,reportPath};
  samples.push(sample);console.log(JSON.stringify(sample));
  writeFileSync(resolve(output,'benchmark.json'),JSON.stringify({scenario:'same 47 tests in 2 files; same checkout/toolchain; 3 warm samples per runner; alternating order; Node CLI wall time includes startup; no billed-token claim',tests,samples},null,2)+'\n');
}
