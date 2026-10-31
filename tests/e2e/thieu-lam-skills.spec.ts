import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
const execute = promisify(execFile);
test('complete Thiếu Lâm skill batch loads and advances in isolated Phaser presentation preview', async () => {
  test.setTimeout(600_000);
  const { stdout, stderr } = await execute(
    process.execPath,
    ['assets/source/skills/thieu-lam/verify_phaser.mjs'],
    { timeout: 570_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
  );
  await writeFile(
    'assets/reviews/skills/thieu-lam/phaser_command_v01.log',
    stdout + stderr,
  );
  const report = JSON.parse(
    await readFile(
      'assets/reviews/skills/thieu-lam/phaser_verification_v01.json',
      'utf8',
    ),
  );
  expect(report.status).toBe('PASS');
  expect(report.allFramesObserved).toBe(true);
  expect(report.icons).toHaveLength(14);
  expect(report.approvalGate).toBe('approval gate waived by user');
  expect(report.errors).toEqual([]);
  expect(report.recordingsGenerated).toBe(false);
});
