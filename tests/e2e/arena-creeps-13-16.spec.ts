import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';

const mode = process.env.ARENA_CREEP_QA_MODE ?? 'full';
const players =
  process.env.ARENA_CREEP_QA_PLAYERS ?? (mode === 'frames' ? '2' : '6');
const evidence = process.env.ARENA_CREEP_QA_EVIDENCE ?? 'minimal';

test(`arena creeps: ${mode} profile with ${players} clients`, async () => {
  const started = Date.now();
  const result = await promisify(execFile)(
    process.execPath,
    [
      'tools/verify-arena-creeps-13-16.mjs',
      '--mode',
      mode,
      '--players',
      players,
      '--evidence',
      evidence,
    ],
    {
      cwd: resolve('.'),
      timeout: 330000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  console.log(result.stdout);
  const reportPath = resolve(
    qaEvidenceDirectory(
      `docs/evidence/arena-creep-workflow/${mode}-${players}-players-${evidence}`,
    ),
    'integration_verification.json',
  );
  expect(statSync(reportPath).mtimeMs).toBeGreaterThanOrEqual(started);
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  expect(report.status).toBe('PASS');
  if (process.env.VOLAM_QA_ARENA_PRODUCTION === '1')
    expect(report.production).toBe(true);
  expect(Object.keys(report.controlledPoseFrames)).toHaveLength(80);
  expect(Object.values(report.controlledPoseFrames).flat()).toHaveLength(256);
  expect(report.errors).toEqual([]);
  expect(report.evidence).toBe(evidence);
  if (evidence === 'minimal')
    expect(report.screenshots).toHaveLength(mode === 'frames' ? 0 : 2);
  expect(report.playerCount).toBe(Number(players));
  expect(report.networkMovement && report.synchronizedHp).toBe(true);
  expect(report.naturalCombat).toBe(mode === 'full');
  expect(report.rewards).toBe(mode === 'full');
  expect(report.finalAcceptance).toBe(mode === 'full');
  if (mode === 'full') {
    expect(report.sixClients).toBe(true);
    expect(report.productionContacts.matchedHits).toBeGreaterThan(0);
  }
});
