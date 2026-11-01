import {
  createWorld,
  addHero,
  initializeProgression,
  gainExperience,
  changeBuild,
  submitInput,
  stepWorld,
  spawnChu,
  characterStats,
} from '@volam/game-core';
import {
  m1Config,
  chuBaThongDungeon,
  chuBaThongTuning,
} from '@volam/game-data';
import { mkdirSync, writeFileSync } from 'node:fs';
const rows = [];
const schools = ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'];
for (const players of [1, 6])
  for (const level of [1, 6, 15, 30])
    for (const school of schools)
      for (const basic of m1Config.progression.schools[school].basicIds)
        for (const seed of [42, 1337, 9001]) {
          const c = {
            ...structuredClone(m1Config),
            width: 1280,
            height: 720,
            collision: structuredClone(chuBaThongDungeon.collision),
            spawn: chuBaThongDungeon.spawn,
            creepSpawns: [],
            creepRespawn: false,
          };
          const w = createWorld(c, seed),
            heroes = [];
          for (let i = 0; i < players; i++) {
            const h = addHero(w, 'probe_' + i, 'probe', c);
            h.schoolId = i === 0 ? school : schools[i % 4];
            initializeProgression(h, c, 'default');
            gainExperience(h, (level - 1) * c.xpPerLevel, c);
            const branch =
              i === 0
                ? basic
                : c.progression.schools[h.schoolId].basicIds[i % 2];
            const error = changeBuild(w, h, c, h.progression.revision, {
              action: 'branch',
              basicId: branch,
            });
            if (error) throw Error(error);
            h.hp = h.maxHp;
            h.mana = h.maxMana;
            const angle = (i * Math.PI * 2) / players;
            h.x = 640 + Math.cos(angle) * 42;
            h.y = 300 + Math.sin(angle) * 42;
            h.fx = -Math.cos(angle);
            h.fy = -Math.sin(angle);
            heroes.push(h);
          }
          spawnChu(w, c, structuredClone(chuBaThongTuning));
          const b = w.creeps.get('chu_ba_thong');
          let sequence = 0,
            damageTaken = 0;
          for (
            let tick = 0;
            tick < 180 * c.tickRate && b.hp > 0 && heroes.some((h) => h.hp > 0);
            tick++
          ) {
            for (const h of heroes) {
              if (h.hp <= 0) continue;
              const avoid = ['reflect', 'spin', 'hands', 'ultimate'].includes(
                w.chu.phase,
              );
              const dx = h.x - b.x,
                dy = h.y - b.y,
                dist = Math.hypot(dx, dy) || 1;
              if (tick % 3 === 0) {
                const movement = avoid
                  ? { x: Math.sign(-dy), y: Math.sign(dx) }
                  : dist > 48
                    ? { x: Math.sign(-dx), y: Math.sign(-dy) }
                    : { x: 0, y: 0 };
                submitInput(w, h.id, ++sequence, { kind: 'move', ...movement });
              }
              if (!avoid && tick % 4 === 0)
                submitInput(w, h.id, ++sequence, { kind: 'basic' });
              if (!avoid && tick % 30 === 0)
                submitInput(w, h.id, ++sequence, {
                  kind: 'cast',
                  slot: Math.floor(tick / 30) % 4,
                });
            }
            stepWorld(w, c);
            damageTaken += w.events
              .filter((e) => e.kind === 'hit' && e.sourceId === 'chu_ba_thong')
              .reduce((n, e) => n + e.damage, 0);
          }
          if (b.hp <= 0) stepWorld(w, c);
          rows.push({
            players,
            school,
            basic,
            level,
            seed,
            seconds: w.tick / c.tickRate,
            bossDamage: chuBaThongTuning.hp - b.hp,
            damageTaken,
            alive: heroes.filter((h) => h.hp > 0).length,
            clear: b.hp <= 0,
            drops: w.chu.loot.length,
            heroStats: characterStats(heroes[0], c, w.tick).total,
          });
        }
const groups = [1, 6].flatMap((players) =>
  [1, 6, 15, 30].map((level) => {
    const r = rows.filter((x) => x.players === players && x.level === level);
    return {
      players,
      level,
      runs: r.length,
      clears: r.filter((x) => x.clear).length,
      meanBossDamage: Math.round(
        r.reduce((n, x) => n + x.bossDamage, 0) / r.length,
      ),
      meanSeconds:
        Math.round((r.reduce((n, x) => n + x.seconds, 0) / r.length) * 10) / 10,
    };
  }),
);
mkdirSync('docs/evidence/chu-ba-thong', { recursive: true });
writeFileSync(
  'docs/evidence/chu-ba-thong/balance-probes.json',
  JSON.stringify(
    {
      scope:
        'Fixed seeds, legal default branch builds, no equipment. Crude tangent-avoidance bot, not final human difficulty or DPS ranking.',
      groups,
      rows,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ runs: rows.length, groups }));
