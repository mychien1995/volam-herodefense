import { mkdirSync, writeFileSync } from 'node:fs';
import {
  DungeonMatch,
  initializeProgression,
  type Hero,
} from '@volam/game-core';
import {
  m1Config,
  campaignDefinition,
  creepDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  tayDocDefinition,
  namDeDefinition,
  bacCaiDefinition,
  vuongDefinition,
  arenaVariants,
} from '@volam/game-data';
import { serverWaveBossTestOptions } from '../apps/game-server/src/wave-boss-test-config.js';
import { prepareBossProgressionHero } from '../apps/game-server/src/boss-progression-mode.js';
const branches = [
  'cai_bang_bong',
  'cai_bang_chuong',
  'thien_son_phien',
  'thien_son_dao',
  'vo_dang_quyen',
  'vo_dang_kiem',
  'thieu_lam_quyen',
  'thieu_lam_dao',
];
const rows: unknown[] = [];
for (const branch of branches)
  for (const count of [1, 6])
    for (const seed of [42, 1337, 9001])
      for (const guard of [false, true]) {
        const config = {
          ...structuredClone(m1Config),
          campaign: structuredClone(campaignDefinition),
          creepSpawns: [],
          bossesWaitForHit: true,
        };
        const options = serverWaveBossTestOptions(30, {
          NODE_ENV: 'development',
          VOLAM_DEV_WAVE_BOSSES: '1',
          VOLAM_DEV_BOSS_PROGRESSION: '1',
        })!;
        const match = new DungeonMatch(
          config,
          creepDungeon,
          seed,
          createInvasionDefinition(180, 1e6),
          [],
          structuredClone(dongTaDefinition),
          structuredClone(tayDocDefinition),
          structuredClone(namDeDefinition),
          structuredClone(bacCaiDefinition),
          options,
          structuredClone(vuongDefinition),
        );
        match.registerArenaCenter(arenaVariants.tuong_duong!.circleCenter);
        const w = match.arena.world;
        const heroes: Hero[] = Array.from({ length: count }, (_, i) => {
          const h = match.add('bot' + i, 'Bot' + i);
          h.schoolId = branch.startsWith('cai_bang')
            ? 'cai_bang'
            : branch.startsWith('thien_son')
              ? 'thien_son'
              : branch.startsWith('vo_dang')
                ? 'vo_dang'
                : 'thieu_lam';
          if (!initializeProgression(h, match.base, 'fixed', branch))
            throw Error('Illegal branch ' + branch);
          prepareBossProgressionHero(h, w, match.base, 'nam_de');
          return h;
        });
        const error = match.startNamDeDarkTest();
        if (error) throw Error(error);
        match.step(); // Apply the normal wave-arena player-count HP scaling before measurement.
        const sequences = new Map(heroes.map((h) => [h.id, h.lastSequence]));
        const next = (h: Hero) => {
          const value = (sequences.get(h.id) ?? h.lastSequence) + 1;
          sequences.set(h.id, value);
          return value;
        };
        const boss = w.creeps.get('boss_nam_de')!,
          startBoss = boss.hp,
          initialHp = heroes.map((h) => h.hp),
          startTick = w.tick;
        let healthLoss = 0,
          parries = 0,
          shatters = 0,
          fistHits = 0,
          bladeHits = 0,
          guardInputs = 0;
        for (let tick = 0; tick < 600 && !match.victory; tick++) {
          const before = heroes.map((h) => h.hp);
          for (const h of heroes)
            if (h.hp > 0 && !h.bossSpectator) {
              if (tick % 6 === 0) {
                const dx = boss.x - h.x,
                  dy = boss.y - h.y,
                  dist = Math.hypot(dx, dy);
                match.input(h.id, next(h), {
                  kind: 'move',
                  x: dist > 95 ? Math.sign(dx) : 0,
                  y: dist > 95 ? Math.sign(dy) : 0,
                });
                match.input(h.id, next(h), { kind: 'basic' });
              }
              const dark = w.namDe?.dark;
              if (
                guard &&
                dark &&
                ((dark.cast?.kind === 'blade' &&
                  w.tick >= dark.cast.releaseAt - 6 &&
                  Math.hypot(boss.x - h.x, boss.y - h.y) < 130) ||
                  dark.blades.some(
                    (b) =>
                      !b.reflected && Math.hypot(b.x - h.x, b.y - h.y) < 90,
                  )) &&
                (dark.guards.get(h.id)?.cooldownUntil ?? 0) <= w.tick
              ) {
                match.input(h.id, next(h), { kind: 'nam-de-guard' });
                guardInputs++;
              }
            }
          match.step();
          for (let i = 0; i < heroes.length; i++)
            healthLoss += Math.max(0, before[i]! - heroes[i]!.hp);
          for (const e of w.events) {
            if (e.stage === 'ice_parry') parries++;
            if (e.stage === 'ice_shatter') shatters++;
            if (e.kind === 'hit' && e.abilityId === 'dai_ly_hoang_quyen')
              fistHits++;
            if (
              e.kind === 'hit' &&
              e.abilityId === 'tien_thien_bang_dao' &&
              e.sourceId === 'boss_nam_de'
            )
              bladeHits++;
          }
        }
        rows.push({
          branch,
          count,
          seed,
          guard,
          level: heroes[0]!.level,
          initialHp,
          startBoss,
          maxBoss: boss.maxHp,
          remainingBoss: boss.hp,
          bossDamage: Math.max(0, startBoss - boss.hp),
          healthLoss,
          parries,
          shatters,
          fistHits,
          bladeHits,
          guardInputs,
          alive: heroes.filter((h) => h.hp > 0).length,
          arenaTicks: w.tick - startTick,
          cleared: w.campaign?.cleared.has('nam_de') ?? false,
        });
      }
mkdirSync('docs/evidence/nam-de-dark', { recursive: true });
writeFileSync(
  'docs/evidence/nam-de-dark/balance.json',
  JSON.stringify(
    {
      scope:
        '96 deterministic 20s level18 progression probes:8 legal four-school branches,1/6 heroes,3seeds,with/without an ideal tick-perfect Z bot. Real presets/revivals/skills; no human reaction/dodge model or full campaign/final balance claim.',
      tuning: namDeDefinition.dark,
      rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    probes: rows.length,
    level: 18,
    seeds: [42, 1337, 9001],
    seconds: 20,
  }),
);
