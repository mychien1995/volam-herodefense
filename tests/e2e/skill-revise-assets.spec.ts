import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
const run = promisify(execFile);

test('skill revise raster banks preserve pixels and play every candidate clip in Phaser', async () => {
  test.setTimeout(600_000);
  await run('python', ['-X', 'utf8', 'assets/source/skill-revise-v01/audit.py'], {
    cwd: process.cwd(), windowsHide: true, timeout: 60_000,
  });
  await run(process.execPath, ['tools/verify-skill-revise-review.mjs'], {
    cwd: process.cwd(), windowsHide: true, timeout: 540_000, maxBuffer: 2_000_000,
  });
  const report = JSON.parse(await readFile('docs/evidence/skill-revise-production/playback.json', 'utf8'));
  expect(report.status).toBe('PASS');
  expect(report.packs).toBe(20);
  expect(report.frames).toBe(872);
  expect(report.errors).toEqual([]);
});
