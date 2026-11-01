import { writeFileSync, mkdirSync } from 'node:fs';
import {
  DungeonMatch,
  initializeProgression,
  gainExperience,
} from '@volam/game-core';
import { m1Config, creepDungeon, coMoDungeon } from '@volam/game-data';
const rows = [];
const started = performance.now();
for (const [school, profile] of Object.entries(m1Config.progression.schools))
  for (const basicId of profile.basicIds)
    for (const level of [1, 6, 15, 30])
      for (const players of [1, 6])
        for (const seed of [7, 42, 2026]) {
          const match = new DungeonMatch(
            structuredClone(m1Config),
            creepDungeon,
            seed,
            undefined,
            [structuredClone(coMoDungeon)],
          );
          for (let i = 0; i < players; i++) {
            const id = 'bot' + i,
              h = match.add(id, id);
            h.schoolId = school;
            initializeProgression(h, m1Config, 'default');
            gainExperience(h, (level - 1) * m1Config.xpPerLevel, m1Config);
            const reason = match.modifyBuild(
              id,
              h.lastSequence + 1,
              h.progression.revision,
              { action: 'branch', basicId },
            );
            if (reason) throw Error(reason);
            match.enter(id, 'shared', 'co_mo');
          }
          const z = match.zoneOf('bot0');
          let damageToBoss = 0,
            damageToHeroes = 0,
            dead = new Set(),
            seconds = 0,
            cleared = false;
          const ranged = m1Config.basics[basicId].effect.mode === 'projectile';
          for (let tick = 0; tick < 60 * m1Config.tickRate; tick++) {
            const boss = z.world.creeps.get(z.world.boss.actorId);
            for (const h of z.world.heroes.values())
              if (h.hp > 0) {
                const dx = boss.x - h.x,
                  dy = boss.y - h.y,
                  d = Math.hypot(dx, dy);
                const moving = d > (ranged ? 180 : 45);
                match.input(h.id, h.lastSequence + 1, {
                  kind: 'move',
                  x: moving ? dx / d : 0,
                  y: moving ? dy / d : 0,
                });
                match.input(h.id, h.lastSequence + 1, { kind: 'basic' });
                if (tick % 5 === 0)
                  match.input(h.id, h.lastSequence + 1, {
                    kind: 'cast',
                    slot: Math.floor(tick / 5) % 4,
                  });
              }
            match.step();
            seconds = (tick + 1) / m1Config.tickRate;
            for (const { event } of match.events) {
              if (event.kind === 'hit') {
                if (event.targetId === boss.id) damageToBoss += event.damage;
                if (z.world.heroes.has(event.targetId))
                  damageToHeroes += event.damage;
              }
              if (event.kind === 'death' && event.targetId.startsWith('bot'))
                dead.add(event.targetId);
            }
            if (boss.hp <= 0) {
              cleared = true;
              break;
            }
            if ([...z.world.heroes.values()].every((h) => h.hp <= 0)) break;
          }
          const heroes = [...match.membership.keys()].map((id) =>
            match.hero(id),
          );
          rows.push({
            school,
            basicId,
            level,
            players,
            seed,
            cleared,
            seconds: Number(seconds.toFixed(2)),
            bossDamage: Math.round(damageToBoss),
            damageToHeroes: Math.round(damageToHeroes),
            bossDps: Number((damageToBoss / seconds).toFixed(2)),
            deaths: dead.size,
            remainingHeroHp: Math.round(heroes.reduce((s, h) => s + h.hp, 0)),
            xp: heroes.reduce((s, h) => s + h.xp, 0),
            gold: heroes.reduce((s, h) => s + h.gold, 0),
            items: heroes.reduce((s, h) => s + (h.bossLoot?.length ?? 0), 0),
          });
        }
const summary = {
  scope:
    '192 fixed-seed boss encounter probes; legal Default branch builds, no equipment, approach/hold bots with A and rotating QWER, no dodge tactics or respawn/reentry.',
  scenarios: rows.length,
  cleared: rows.filter((r) => r.cleared).length,
  itemInvariant: rows.every((r) => r.items === (r.cleared ? 1 : 0)),
  seconds: Number(((performance.now() - started) / 1000).toFixed(2)),
  byLevel: [1, 6, 15, 30].map((level) => ({
    level,
    soloClears: rows.filter(
      (r) => r.level === level && r.players === 1 && r.cleared,
    ).length,
    partyClears: rows.filter(
      (r) => r.level === level && r.players === 6 && r.cleared,
    ).length,
  })),
  limitations:
    'Bots do not kite/dodge projectiles or prioritize summons; not final numerical balance or a full player-build/PvP comparison.',
};
mkdirSync('docs/evidence/ly-mac-sau-runtime', { recursive: true });
writeFileSync(
  'docs/evidence/ly-mac-sau-runtime/balance.json',
  JSON.stringify({ summary, rows }, null, 2) + '\n',
);
console.log(JSON.stringify(summary));
if (!summary.itemInvariant) process.exitCode = 1;
