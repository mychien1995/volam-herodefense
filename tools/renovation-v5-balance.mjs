import {
  createWorld,
  addHero,
  addCreep,
  initializeProgression,
  refreshCharacter,
  submitInput,
  stepWorld,
  rankedAbility,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { mkdirSync, writeFileSync } from 'node:fs';
const rows = [];
for (const level of [1, 6, 15, 30])
  for (const seed of [42, 137, 2026])
    for (const skill of ['that_tinh_kiem', 'hang_long_hoa_vu'])
      for (const defense of [0, 15])
        for (const variant of ['m3d', 'v5']) {
          const c = structuredClone(m1Config);
          Object.assign(c, {
            collision: [],
            creepSpawns: [],
            creepRespawn: false,
            critChance: 0,
            manaRegen: 0,
          });
          const data = c.progression.skills[skill],
            rank = Math.min(
              level,
              data.levelGates.filter((g) => g <= level).length,
            );
          if (!rank) continue;
          const w = createWorld(c, seed),
            h = addHero(w, 'h', 'h', c);
          Object.assign(h, {
            schoolId: skill === 'that_tinh_kiem' ? 'vo_dang' : 'cai_bang',
            level,
            x: 400,
            y: 400,
            fx: 1,
            fy: 0,
          });
          initializeProgression(h, c, 'custom');
          Object.assign(h.progression, {
            ranks: { [skill]: rank },
            branchId:
              skill === 'that_tinh_kiem' ? 'vo_dang_kiem' : 'cai_bang_chuong',
          });
          h.skillIds = [skill, '', '', ''];
          refreshCharacter(h, c);
          h.mana = h.maxMana = 10000;
          const ability = structuredClone(rankedAbility(h, skill, c));
          if (variant === 'm3d') {
            if (skill === 'that_tinh_kiem') {
              ability.effect.hits = 4;
              ability.effect.spacingTicks = 5;
              ability.effect.damage *= 7 / 4;
              delete ability.effect.attackPowerScale;
            } else delete ability.effect.dragonDive;
          }
          // Compare exact mechanics at the same legal rank/stats, equipment and target composition.
          h.progression = undefined;
          c.skillCatalogue[skill] = ability;
          c.skills = [ability];
          const positions =
            skill === 'that_tinh_kiem' ? [440] : [600, 660, 800];
          for (const [i, x] of positions.entries()) {
            const e = addCreep(w, 't' + i, { x, y: 400 }, c);
            Object.assign(e, {
              controlled: true,
              hp: 100000,
              maxHp: 100000,
              stats: { ...c.creep, hp: 100000, speed: 0, damage: 0, defense },
            });
          }
          submitInput(w, h.id, 1, { kind: 'cast', slot: 0 });
          const hits = [];
          for (let t = 0; t < 160; t++) {
            stepWorld(w, c);
            hits.push(
              ...w.events.filter(
                (e) => e.kind === 'hit' && e.sourceId === h.id,
              ),
            );
          }
          rows.push({
            level,
            rank,
            seed,
            skill,
            defense,
            variant,
            damage: hits.reduce((s, e) => s + e.damage, 0),
            hits: hits.length,
            targets: new Set(hits.map((e) => e.targetId)).size,
            firstHitTick: hits[0]?.tick ?? null,
            lastHitTick: hits.at(-1)?.tick ?? null,
          });
        }
mkdirSync('docs/evidence/renovation-v5', { recursive: true });
writeFileSync(
  'docs/evidence/renovation-v5/balance.json',
  JSON.stringify(
    {
      scope:
        'Controlled deterministic before/after ability casts. Levels1/6/15/30, seeds42/137/2026, zero crit, defense0/15; exact rank/stats, one sword target or three collinear dragon targets. Not a whole-game DPS/survival/economy retune.',
      rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    rows.filter((r) => r.seed === 42),
    null,
    2,
  ),
);
