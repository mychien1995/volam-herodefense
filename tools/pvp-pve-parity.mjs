import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import * as current from '@volam/game-core';
import { m1Config } from '@volam/game-data';

// Compare real current PvE execution against a committed core, not against a disabled new rule.
const root = resolve('.'),
  ref = process.argv[2] ?? 'milestone/m4d';
const output = resolve(root, 'artifacts/pvp-1v1/pve-parity.json');
const dir = resolve(root, '.cache/pvp-pve-baseline');
mkdirSync(dir, { recursive: true });
const paths = execFileSync(
  'git',
  ['ls-tree', '-r', '--name-only', ref, 'packages/game-core/src'],
  { encoding: 'utf8' },
)
  .trim()
  .split(/\r?\n/);
for (const path of paths) {
  const dest = resolve(dir, 'src', path.replace('packages/game-core/src/', ''));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, execFileSync('git', ['show', ref + ':' + path]));
}
writeFileSync(
  resolve(dir, 'tsconfig.json'),
  JSON.stringify({
    extends: resolve(root, 'tsconfig.base.json'),
    compilerOptions: { composite: false, rootDir: 'src', outDir: 'dist' },
    include: ['src/**/*.ts'],
  }),
);
const compile = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/typescript/bin/tsc'),
    '-p',
    resolve(dir, 'tsconfig.json'),
  ],
  { encoding: 'utf8', windowsHide: true },
);
if (compile.status !== 0) throw Error(compile.stdout + compile.stderr);
const baseline = await import(
  pathToFileURL(resolve(dir, 'dist/index.js')).href
);
const canonical = JSON.stringify(m1Config),
  rows = [];
const serialize = (w) =>
  JSON.stringify(w, (_k, v) =>
    v instanceof Map
      ? [...v]
      : v instanceof Set
        ? [...v]
        : typeof v === 'function'
          ? undefined
          : v,
  );
function setup(core, school, branch, level, players, seed) {
  const c = structuredClone(m1Config);
  Object.assign(c, {
    width: 1200,
    height: 800,
    collision: [],
    combatCollision: [],
    spawn: { x: 300, y: 300 },
    creepSpawns: [
      { x: 380, y: 300 },
      { x: 390, y: 325 },
      { x: 400, y: 275 },
    ],
  });
  Object.assign(c.creep, {
    hp: 2500,
    damage: 10,
    speed: 60,
    detectionRange: 500,
  });
  const w = core.createWorld(c, seed);
  for (let i = 0; i < players; i++) {
    const h = core.addHero(w, 'bot' + i, 'bot' + i, c);
    h.schoolId = school;
    h.level = level;
    h.xp = core.experienceAtLevel(level, c);
    core.initializeProgression(h, c, 'fixed', branch);
    for (let rank = 0; rank < 4; rank++)
      for (let slot = 0; slot < 5; slot++)
        core.changeBuild(w, h, c, h.progression.revision, {
          action: 'upgrade-slot',
          slot,
        });
    if (h.level !== level || core.pointAccounting(h, c).surplus < 0)
      throw Error('Illegal parity build');
    h.hp = h.maxHp;
    h.mana = h.maxMana;
  }
  return { w, c };
}
function advance(core, { w, c }, tick) {
  for (const h of w.heroes.values()) {
    const target = [...w.creeps.values()].find((e) => e.hp > 0);
    if (h.hp <= 0 || !target) continue;
    core.submitInput(w, h.id, h.lastSequence + 1, {
      kind: 'move',
      x:
        Math.hypot(target.x - h.x, target.y - h.y) > 80
          ? Math.sign(target.x - h.x)
          : 0,
      y: 0,
    });
    if (tick % 6 === 0)
      core.submitInput(w, h.id, h.lastSequence + 1, { kind: 'basic' });
    if (tick % 24 === 0)
      core.submitInput(w, h.id, h.lastSequence + 1, {
        kind: 'cast',
        slot: Math.floor(tick / 24) % 5,
      });
    if (h.basicId === 'con_luan_kiem_ton' && tick % 60 === 0)
      core.submitInput(w, h.id, h.lastSequence + 1, { kind: 'tam-lien-tram' });
  }
  core.stepWorld(w, c);
}
for (const [school, s] of Object.entries(m1Config.progression.schools))
  for (const branch of s.basicIds)
    for (const level of [1, 6, 15, 30])
      for (const players of [1, 6])
        for (const seed of [42, 1337, 9001]) {
          const a = setup(baseline, school, branch, level, players, seed),
            b = setup(current, school, branch, level, players, seed),
            hash = createHash('sha256');
          for (let tick = 0; tick < 240; tick++) {
            advance(baseline, a, tick);
            advance(current, b, tick);
            const old = serialize(a.w),
              now = serialize(b.w);
            if (old !== now) {
              mkdirSync(dirname(output), { recursive: true });
              writeFileSync(
                output,
                JSON.stringify(
                  {
                    status: 'FAIL',
                    ref,
                    school,
                    branch,
                    level,
                    players,
                    seed,
                    tick,
                    baseline: JSON.parse(old),
                    current: JSON.parse(now),
                  },
                  null,
                  2,
                ),
              );
              throw Error(
                'PvE changed: ' +
                  JSON.stringify({ branch, level, players, seed, tick }),
              );
            }
            hash.update(now);
          }
          rows.push({
            school,
            branch,
            level,
            players,
            seed,
            ticks: 240,
            sha256: hash.digest('hex'),
          });
        }
if (JSON.stringify(m1Config) !== canonical)
  throw Error('Canonical config mutated');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  JSON.stringify(
    {
      status: 'PASS',
      baselineRef: ref,
      baselineCommit: execFileSync('git', ['rev-parse', ref], {
        encoding: 'utf8',
      }).trim(),
      scope:
        '14 branches / 4 levels / solo and six / three seeds / 240 ticks; full serialized combat state/events compared each tick. Not a full campaign playthrough.',
      scenarios: rows.length,
      comparedTicks: rows.length * 240,
      canonicalConfigUnchanged: true,
      rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    status: 'PASS',
    scenarios: rows.length,
    comparedTicks: rows.length * 240,
    output,
  }),
);
