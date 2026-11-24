import {test,expect} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
const run=promisify(execFile);
test('composed skill review renders complete actions, directional hammer combos and clears effects',async()=>{
 test.setTimeout(300_000);
 await run('python',['-X','utf8','assets/source/skill-revise-feedback-v02/verify.py'],{cwd:process.cwd(),windowsHide:true,timeout:60_000});
 await run('python',['-X','utf8','assets/source/skill-revise-sweep-v03/verify.py'],{cwd:process.cwd(),windowsHide:true,timeout:60_000});
 await run(process.execPath,['tools/verify-skill-revise-end-to-end.mjs'],{cwd:process.cwd(),windowsHide:true,timeout:280_000,maxBuffer:2_000_000});
 const report=JSON.parse(await readFile('docs/evidence/skill-revise-sweep-v03/playback.json','utf8'));
 expect(report.status).toBe('PASS');expect(report.scenarios).toBe(17);expect(report.continuousTakes).toBe(24);expect(report.errors).toEqual([]);
});
