import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaCreepQaOptions as optionsFromEnvironment,
  shouldCaptureArenaCreepPng,
  arenaCreepSavedReport,
} from '../../tools/arena-creep-qa-options.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const arenaCreepQaOptions = (args) => optionsFromEnvironment(args, {});

test('keeps final six-client coverage and separates fast evidence from approved history', () => {
  assert.deepEqual(arenaCreepQaOptions([]), {
    mode: 'full',
    players: 6,
    combatOnly: false,
    evidence: 'minimal',
    evidenceDirectory:
      'docs/evidence/arena-creep-workflow/full-6-players-minimal',
  });
  for (const players of [2, 3]) {
    const options = arenaCreepQaOptions(['--players', String(players)]);
    assert.equal(options.mode, 'frames');
    assert.equal(options.players, players);
    assert.match(options.evidenceDirectory, /arena-creep-workflow\/frames-/);
  }
  assert.equal(arenaCreepQaOptions(['--mode', 'frames']).players, 2);
});

test('rejects invalid profiles instead of reporting reduced coverage as final', () => {
  for (const args of [
    ['--players', '2', '--mode', 'full'],
    ['--players', '3', '--combat-only'],
    ['--players', '1'],
    ['--players', '7'],
    ['--players'],
    ['--mode'],
    ['--mode', 'smoke'],
    ['--unknown'],
    ['--evidence'],
    ['--evidence', 'none'],
  ])
    assert.throws(() => arenaCreepQaOptions(args), undefined, args.join(' '));
});

test('minimal capture saves no success PNGs in iteration and exactly two final views', () => {
  const names = [
    'arena-independent-instances.png',
    'arena-native-1x.png',
    'arena-idle-down.png',
    'arena-walk-right.png',
    'arena-projectile-renderer-fixture.png',
    'arena-natural-attacks.png',
    'arena-natural-deaths.png',
  ];
  const quick = arenaCreepQaOptions(['--mode', 'frames']);
  const final = arenaCreepQaOptions([]);
  assert.deepEqual(
    names.filter((n) => shouldCaptureArenaCreepPng(quick, n)),
    [],
  );
  assert.deepEqual(
    names.filter((n) => shouldCaptureArenaCreepPng(final, n)),
    ['arena-idle-down.png', 'arena-natural-attacks.png'],
  );
  for (const options of [quick, final])
    assert.equal(
      shouldCaptureArenaCreepPng(options, 'arena-failure.png'),
      true,
    );
});

test('review capture remains opt-in and preserves the detailed frame report', () => {
  const options = arenaCreepQaOptions([
    '--mode',
    'frames',
    '--evidence',
    'review',
  ]);
  assert.equal(
    shouldCaptureArenaCreepPng(options, 'arena-native-1x.png'),
    true,
  );
  assert.equal(
    shouldCaptureArenaCreepPng(options, 'arena-walk-right.png'),
    false,
  );
  const full = arenaCreepQaOptions(['--evidence', 'review']);
  assert.equal(shouldCaptureArenaCreepPng(full, 'arena-walk-right.png'), true);
  const report = {
    status: 'PASS',
    controlledPoseFrames: { tag: ['frame_0', 'frame_1'] },
    naturalCombat: false,
    finalAcceptance: false,
    poseEvidence: [{ largeActorDump: true }],
    completed: ['complete'],
    effects: { observedFrames: ['fx_0'] },
    impactEvents: ['hit'],
  };
  const compact = arenaCreepSavedReport(report, 'minimal');
  assert.strictEqual(compact.controlledPoseFrames, report.controlledPoseFrames);
  assert.deepEqual(compact.observedEffectFrames, ['fx_0']);
  assert.equal(compact.finalAcceptance, false);
  assert.equal(compact.completedAnimationCount, 1);
  assert.equal(compact.contactEventCount, 1);
  assert.equal('poseEvidence' in compact, false);
  assert.strictEqual(arenaCreepSavedReport(report, 'review'), report);
});

test('final command rejects a reduced browser profile before preparing assets', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/check-workflow.mjs',
      'final',
      '--config',
      'playwright.arena-creeps.config.ts',
    ],
    {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      encoding: 'utf8',
      env: {
        ...process.env,
        ARENA_CREEP_QA_MODE: 'frames',
        ARENA_CREEP_QA_PLAYERS: '2',
      },
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /full six-player profile/);
  assert.doesNotMatch(result.stdout, /prepare assets/);
});

test('a development-client shortcut cannot skip the final production build', () => {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/check-workflow.mjs',
      'final',
      '--dev-client',
      '--config',
      'playwright.arena-creeps.config.ts',
    ],
    {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /final checks always build production/);
  assert.doesNotMatch(result.stdout, /prepare assets/);
});
