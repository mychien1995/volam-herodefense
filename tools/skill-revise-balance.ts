import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createWorld,
  addHero,
  initializeProgression,
  gainExperience,
  changeBuild,
  pointAccounting,
  submitInput,
  stepWorld,
  conLuan,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
const rows = [];
const variant = process.env['VOLAM_SKILL_BALANCE_VARIANT'];
for (const school of [
  'cai_bang',
  'thien_son',
  'vo_dang',
  'thieu_lam',
  'con_luan',
  'duong_mon',
])
  for (const basic of m1Config.progression!.schools[school]!.basicIds)
    for (const level of [1, 6, 15, 30])
      for (const players of [1, 6])
        for (const seed of [42, 1337, 9001]) {
          const c = structuredClone(m1Config);
          if (variant === 'thien-su-v07-baseline') {
            delete c.basics[conLuan.monk]!.minIntervalTicks;
            c.basics[conLuan.monk]!.basicPoseTicks = 9;
          }
          if (variant === 'thien-su-v06-baseline')
            c.basics[conLuan.monk]!.basicCombo = c.basics[
              conLuan.monk
            ]!.basicCombo!.filter((step) => step.stage !== 'sweep');
          if (variant === 'thien-su-v05-baseline')
            c.basics[conLuan.monk]!.basicCombo = [
              { stage: 'thrust', damageMultiplier: 1, halfAngle: Math.PI / 5 },
              {
                stage: 'rising',
                damageMultiplier: 1.05,
                halfAngle: Math.PI / 3,
              },
              { stage: 'sweep', damageMultiplier: 1, halfAngle: Math.PI / 2 },
              {
                stage: 'overhead',
                damageMultiplier: 1.2,
                halfAngle: Math.PI / 4,
              },
            ];
          Object.assign(c, {
            width: 1200,
            height: 800,
            collision: [],
            spawn: { x: 300, y: 300 },
            creepSpawns: [
              { x: 380, y: 300 },
              { x: 390, y: 320 },
              { x: 400, y: 280 },
            ],
          });
          Object.assign(c.creep, {
            hp: 1000000,
            defense: 5,
            speed: 0,
            damage: 0,
            detectionRange: 0,
          });
          const w = createWorld(c, seed),
            heroes = [];
          for (let i = 0; i < players; i++) {
            const h = addHero(w, 'bot' + i, school, c);
            h.schoolId = school;
            initializeProgression(h, c, 'fixed', basic);
            gainExperience(h, (level - 1) * c.xpPerLevel, c);
            for (let rank = 0; rank < 4; rank++)
              for (let slot = 0; slot < 5; slot++)
                changeBuild(w, h, c, h.progression!.revision, {
                  action: 'upgrade-slot',
                  slot,
                });
            if (h.level !== level || pointAccounting(h, c).surplus < 0)
              throw Error('Illegal probe build');
            heroes.push(h);
          }
          let damage = 0,
            casts = 0,
            attacks = 0,
            parries = 0;
          const source = [...w.creeps.values()][0]!;
          for (let tick = 0; tick < 360; tick++) {
            for (const h of heroes) {
              if (h.hp <= 0) continue;
              const dx = source.x - h.x,
                dy = source.y - h.y,
                n = Math.hypot(dx, dy);
              submitInput(w, h.id, h.lastSequence + 1, {
                kind: 'move',
                x: n > 80 ? dx / n : 0,
                y: n > 80 ? dy / n : 0,
              });
              if (tick % 6 === 0)
                submitInput(w, h.id, h.lastSequence + 2, { kind: 'basic' });
              if (tick % 24 === 0)
                submitInput(w, h.id, h.lastSequence + 3, {
                  kind: 'cast',
                  slot: Math.floor(tick / 24) % 5,
                });
            }
            stepWorld(w, c);
            if (tick % 30 === 0)
              for (const h of heroes)
                hurt(w, h, source.id, 'probe_direct_skill', 20, c, {
                  critChance: 0,
                  critMultiplier: 1,
                });
            for (const e of w.events) {
              if (e.kind === 'hit' && w.heroes.has(e.sourceId))
                damage += e.damage;
              if (e.kind === 'cast') casts++;
              if (e.kind === 'attack' && w.heroes.has(e.sourceId)) attacks++;
              if (e.stage === 'lightning_parry') parries++;
            }
          }
          rows.push({
            school,
            basic,
            level,
            players,
            seed,
            seconds: 12,
            damage,
            dps: +(damage / 12).toFixed(2),
            dpsPerPlayer: +(damage / 12 / players).toFixed(2),
            casts,
            attacks,
            parries,
            survivors: heroes.filter((h) => h.hp > 0).length,
            hp: heroes.map((h) => +h.hp.toFixed(2)),
            mana: heroes.map((h) => +h.mana.toFixed(2)),
            ranks: heroes[0]!.progression!.ranks,
          });
        }
const folder = fileURLToPath(
  new URL(
    variant?.startsWith('thien-su-v05-') ||
      variant?.startsWith('thien-su-v06-') ||
      variant?.startsWith('thien-su-v07-')
      ? '../docs/evidence/skill-revise-thien-su-' +
          (variant.includes('v07')
            ? 'v07'
            : variant.includes('v06')
              ? 'v06'
              : 'v05') +
          '/' +
          variant +
          '/'
      : '../docs/evidence/skill-revise-game/balance/',
    import.meta.url,
  ),
);
mkdirSync(folder, { recursive: true });
writeFileSync(
  folder + '/balance.json',
  JSON.stringify(
    {
      scope:
        '288 fixed-seed 12-second exposure probes, all twelve revised branches, levels 1/6/15/30, solo/six, seeds 42/1337/9001. Legal fixed builds and normal resources, three stationary armor5 targets, identical raw20 direct skill pressure per second. No gear, boss scaling, economy or human PvP balance claim. Config defaults remain trial tuning.',
      rows,
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(
  folder + '/balance.csv',
  'school,basic,level,players,seed,dps,dpsPerPlayer,survivors,parries\n' +
    rows
      .map((r) =>
        [
          r.school,
          r.basic,
          r.level,
          r.players,
          r.seed,
          r.dps,
          r.dpsPerPlayer,
          r.survivors,
          r.parries,
        ].join(','),
      )
      .join('\n') +
    '\n',
);
console.log(
  JSON.stringify({
    runs: rows.length,
    nonFinite: rows.filter((r) => !Number.isFinite(r.dps)).length,
    allDead: rows.filter((r) => r.survivors === 0).length,
    output: folder,
  }),
);
