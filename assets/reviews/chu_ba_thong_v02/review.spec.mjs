import {test,expect} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
test('standalone Chu Bá Thông art, frame playback and choreography',async()=>{
 const script=fileURLToPath(new URL('./verify.mjs',import.meta.url));
 const result=await promisify(execFile)(process.execPath,[script],{env:{...process.env,VOLAM_ART_REVIEW_URL:'http://127.0.0.1:5401/assets/reviews/chu_ba_thong_v02/index.html'},timeout:75000});
 expect(result.stdout).toContain('"status":"PASS"');
 const report=JSON.parse(await fs.readFile(new URL('./feedback_01/verification.json',import.meta.url),'utf8'));
 expect(report.errors).toEqual([]);expect(report.recording).toBe(false);expect(report.checks.length).toBe(28);
});
