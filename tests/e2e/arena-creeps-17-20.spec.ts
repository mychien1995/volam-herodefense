import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

test('six clients render Waves 17–20 frames, authoritative combat and effects', async () => {
  const started = Date.now();
  const result = await promisify(execFile)(
    process.execPath,
    ['tools/verify-arena-creeps-17-20.mjs'],
    {
      cwd: resolve('.'),
      timeout: 330000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  console.log(result.stdout);
  const reportPath = resolve(
    'docs/evidence/phase1j-integration/integration_verification.json',
  );
  expect(statSync(reportPath).mtimeMs).toBeGreaterThanOrEqual(started);
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  expect(report.status).toBe('PASS');
  expect(Object.keys(report.controlledPoseFrames)).toHaveLength(80);
  expect(Object.values(report.controlledPoseFrames).flat()).toHaveLength(256);
  expect(report.errors).toEqual([]);
  expect(
    report.sixClients &&
      report.networkMovement &&
      report.synchronizedHp &&
      report.rewards,
  ).toBe(true);
});
