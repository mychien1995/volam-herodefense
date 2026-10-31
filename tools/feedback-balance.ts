import * as currentCore from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { hurt as currentHurt } from '../packages/game-core/src/combat.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const baselineRoot = root + 'artifacts/feedback-baseline/';
const baselineCore = (await import(
  pathToFileURL(baselineRoot + 'packages/game-core/src/index.js').href
)) as typeof currentCore;
const baselineData = (await import(
  pathToFileURL(baselineRoot + 'packages/game-data/src/m1.js').href
)) as { m1Config: typeof m1Config };
const baselineCombat = (await import(
  pathToFileURL(baselineRoot + 'packages/game-core/src/combat.js').href
)) as { hurt: typeof currentHurt };
const builds: Record<string, string[]> = {
  cai_bang: [
    'hoa_van_chuong',
    'hoanh_tao_bong',
    'pha_giap_bong',
    'khang_long_huu_hoi',
  ],
  thien_son: [
    'lien_hoa_phien',
    'truy_hon_dao',
    'liet_phong_dao',
    'chiet_mai_thu',
  ],
  vo_dang: [
    'luong_nghi_thu',
    'duong_khi_kich',
    'that_tinh_kiem',
    'thai_cuc_than_cong',
  ],
  thieu_lam: [
    'la_han_quyen',
    'vi_da_quyen',
    'dai_luc_kim_cuong_chuong',
    'kim_cang_bat_hoai',
  ],
};
const rows: Array<{
  version: string;
  school: string;
  level: number;
  basic: string;
  seed: number;
  scenario: string;
  damage: number;
  dps: number;
  received: number;
  hp: number;
  mana: number;
  deathTick: number | null;
  attacks: number;
  firstHitTick: number | null;
  receivedBeforeFirstHit: number;
  points: ReturnType<typeof currentCore.pointAccounting>;
  ranks: Record<string, number>;
}> = [];
const tuning = {
  basics: Object.keys(m1Config.basics).map((id) => ({
    id,
    before: baselineData.m1Config.basics[id],
    after: m1Config.basics[id],
  })),
  skills: Object.keys(m1Config.skillCatalogue!)
    .filter(
      (id) =>
        JSON.stringify(baselineData.m1Config.skillCatalogue![id]) !==
        JSON.stringify(m1Config.skillCatalogue![id]),
    )
    .map((id) => ({
      id,
      before: baselineData.m1Config.skillCatalogue![id],
      after: m1Config.skillCatalogue![id],
    })),
};
writeFileSync(
  root + 'artifacts/m3c3-feedback-tuning.json',
  JSON.stringify(tuning, null, 2),
);
for (const version of ['before', 'after']) {
  const api = version === 'before' ? baselineCore : currentCore;
  const data = version === 'before' ? baselineData.m1Config : m1Config;
  const hurt = version === 'before' ? baselineCombat.hurt : currentHurt;
  for (const school of Object.keys(builds))
    for (const level of [1, 6, 15, 30])
      for (const basic of data.progression!.schools[school]!.basicIds)
        for (const seed of [42, 1337, 9001])
          for (const scenario of ['stationary', 'approach-pressure']) {
            const config = structuredClone(data);
            Object.assign(config, {
              width: 1400,
              height: 900,
              collision: [],
              spawn: { x: 500, y: 450 },
              creepSpawns:
                scenario === 'stationary'
                  ? [
                      { x: 540, y: 450 },
                      { x: 545, y: 465 },
                      { x: 565, y: 450 },
                    ]
                  : [
                      { x: 620, y: 450 },
                      { x: 650, y: 465 },
                      { x: 680, y: 450 },
                    ],
            });
            Object.assign(config.creep, {
              hp: 1000000,
              speed: scenario === 'stationary' ? 0 : 60,
              detectionRange: scenario === 'stationary' ? 1 : 800,
              damage: 8,
            });
            const world = api.createWorld(config, seed),
              h = api.addHero(world, 'bot', school, config);
            h.schoolId = school;
            api.initializeProgression(h, config);
            api.gainExperience(h, (level - 1) * 60, config);
            const change = (c: Parameters<typeof api.changeBuild>[4]) =>
              api.changeBuild(world, h, config, h.progression!.revision, c);
            change({ action: 'loadout', ids: builds[school]! });
            change({ action: 'basic', basicId: basic });
            for (let r = 0; r < 4; r++)
              for (const skillId of builds[school]!)
                change({ action: 'upgrade', skillId });
            let damage = 0,
              received = 0,
              deathTick: number | null = null,
              attacks = 0,
              firstHitTick: number | null = null,
              receivedBeforeFirstHit = 0;
            for (let t = 0; t < 360; t++) {
              if (scenario === 'approach-pressure') {
                const target = [...world.creeps.values()].sort(
                  (a, b) =>
                    Math.hypot(a.x - h.x, a.y - h.y) -
                    Math.hypot(b.x - h.x, b.y - h.y),
                )[0]!;
                const effect = config.basics[basic]!.effect;
                const desired =
                  'range' in effect
                    ? effect.mode === 'projectile'
                      ? Math.min(140, effect.range * 0.6)
                      : Math.max(32, effect.range - 5)
                    : 50;
                const d = Math.hypot(target.x - h.x, target.y - h.y),
                  sign = d > desired + 8 ? 1 : 0;
                api.submitInput(world, h.id, h.lastSequence + 1, {
                  kind: 'move',
                  x: sign * (target.x >= h.x ? 1 : -1),
                  y: 0,
                });
              }
              if (t % 2 === 0)
                api.submitInput(world, h.id, h.lastSequence + 1, {
                  kind: 'basic',
                });
              const slot =
                t % 120 === 0
                  ? 0
                  : t % 120 === 20
                    ? 1
                    : t % 120 === 40
                      ? 2
                      : t % 120 === 70
                        ? 3
                        : -1;
              if (slot >= 0) {
                const id = h.skillIds?.[slot];
                if (
                  id !== 'thai_cuc_than_cong' ||
                  !h.statuses?.some(
                    (s) => s.kind === 'mana_shield' && s.until > world.tick,
                  )
                )
                  api.submitInput(world, h.id, h.lastSequence + 1, {
                    kind: 'cast',
                    slot,
                  });
              }
              api.stepWorld(world, config);
              if (scenario === 'stationary' && t % 30 === 0)
                hurt(world, h, 'creep_0', 'pressure', 20, config, {
                  critChance: 0,
                  critMultiplier: 1,
                });
              for (const e of world.events) {
                if (e.kind === 'hit' && e.sourceId === h.id) {
                  damage += e.damage;
                  firstHitTick ??= world.tick;
                }
                if (e.kind === 'hit' && e.targetId === h.id) {
                  received += e.damage;
                  if (firstHitTick === null) receivedBeforeFirstHit += e.damage;
                }
                if (e.kind === 'attack' && e.sourceId === h.id) attacks++;
              }
              if (h.hp <= 0 && deathTick === null) deathTick = world.tick;
            }
            rows.push({
              version,
              school,
              level,
              basic,
              seed,
              scenario,
              damage,
              dps: damage / 12,
              received,
              hp: h.hp,
              mana: h.mana,
              deathTick,
              attacks,
              firstHitTick,
              receivedBeforeFirstHit,
              points: api.pointAccounting(h, config),
              ranks: h.progression!.ranks,
            });
          }
}
mkdirSync(root + 'artifacts', { recursive: true });
writeFileSync(
  root + 'artifacts/m3c3-feedback-balance.json',
  JSON.stringify(
    {
      baseline: JSON.parse(
        readFileSync(baselineRoot + 'baseline.json', 'utf8'),
      ),
      scope:
        '12s, three fixed seeds, legal point-funded four-slot builds, no equipment; stationary three-target pressure and simple approach AI. Immortal targets, no optimal-human, campaign, boss, economy or PvP claim.',
      rows,
    },
    null,
    2,
  ),
);
const summary = Object.keys(builds).map((school) => ({
  school,
  levels: [1, 6, 15, 30].map((level) => ({
    level,
    versions: ['before', 'after'].map((version) => {
      const r = rows.filter(
        (x) =>
          x.school === school && x.level === level && x.version === version,
      );
      return {
        version,
        minDps: Math.min(...r.map((x) => x.dps)),
        maxDps: Math.max(...r.map((x) => x.dps)),
        deaths: r.filter((x) => x.deathTick !== null).length,
        minHp: Math.min(...r.map((x) => x.hp)),
      };
    }),
  })),
}));
writeFileSync(
  root + 'artifacts/m3c3-feedback-balance-summary.json',
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify({ runs: rows.length, summary }, null, 2));
