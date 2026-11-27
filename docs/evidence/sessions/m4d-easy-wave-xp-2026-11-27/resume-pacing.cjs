// Continue only the failed/unreached stages of check:final after a test typing fix.
const {spawnSync}=require('node:child_process');
const {readFileSync,writeFileSync,openSync,closeSync,readdirSync}=require('node:fs');
const {resolve,dirname}=require('node:path');
const root=process.cwd(), evidence=__dirname;
const report={startedAt:new Date().toISOString(),reason:'EXP and dungeon browser cases passed; sequential remote reads also missed the 4-second rest. Install passive in-page phase observations before starting a 10-second stream/rest fixture; production timing unchanged.',status:'RUNNING',stages:[]};
function binary(pkg,name) {const path=require.resolve(pkg+'/package.json');const meta=JSON.parse(readFileSync(path));return resolve(dirname(path),typeof meta.bin==='string'?meta.bin:meta.bin[name]);}
function run(label,cmd,args,cwd=root) {
 const log=resolve(evidence,'pacing-observer-'+(report.stages.length+1)+'.log');
 console.log('[resume] '+label);
 const fd=openSync(log,'w'), start=performance.now();
 const result=spawnSync(cmd,args,{cwd,env:process.env,stdio:['ignore',fd,fd],windowsHide:true});closeSync(fd);
 report.stages.push({label,status:result.status===0?'PASS':'FAIL',seconds:Math.round((performance.now()-start)/10)/100,log,exitCode:result.status});
 if(result.status!==0)report.status='FAIL';
 writeFileSync(resolve(evidence,'pacing-observer.json'),JSON.stringify(report,null,2)+'\n');
 if(result.status!==0){console.error(readFileSync(log,'utf8').slice(-12000));process.exit(result.status||1);}
 console.log('[resume] PASS '+label);
}
run('typecheck updated browser fixture',process.execPath,[binary('typescript','tsc'),'-p','tsconfig.tools.json','--noEmit']);
run('browser environment preflight',process.execPath,['tools/qa-preflight.mjs','--mode','browser','--config','playwright.m4d.config.ts']);
run('two-peer pacing browser regression',process.execPath,['tools/run-playwright.mjs','test','--config','playwright.m4d.config.ts','tests/e2e/m4d-wave-pacing.spec.ts','--grep','wave countdown']);
report.status='PASS';report.finishedAt=new Date().toISOString();writeFileSync(resolve(evidence,'pacing-observer.json'),JSON.stringify(report,null,2)+'\n');
