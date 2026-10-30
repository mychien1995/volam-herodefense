import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DungeonMatch } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  createInvasionDefinition,
} from '@volam/game-data';

const seeds = [42, 1337, 9001],
  runs = [];
for (const players of [1, 2, 6])
  for (const strategy of ['unattended', 'ranged_guard'] as const)
    for (const seed of seeds) {
      const base = structuredClone(m1Config);
      base.creepSpawns = [];
      const match = new DungeonMatch(
        base,
        creepDungeon,
        seed,
        createInvasionDefinition(),
      );
      const heroes = Array.from({ length: players }, (_, i) => {
        const hero = match.add(`bot_${i}`, `Guard ${i}`);
        hero.basicId = 'cai_bang_chuong';
        hero.x = 800 + (i % 2 ? 140 : -140);
        hero.y = 650 + Math.floor(i / 2) * 40;
        if (strategy === 'unattended') match.enter(hero.id, 'private');
        return hero;
      });
      let statueDamage = 0,
        kills = 0,
        heroDeaths = 0,
        maxLiving = 0;
      const start = performance.now();
      for (
        let t = 0;
        t < 600 * base.tickRate && !match.invasion!.defeated;
        t++
      ) {
        if (strategy === 'ranged_guard')
          for (const h of heroes) {
            const zone = match.zoneOf(h.id)!;
            if (
              h.hp <= 0 ||
              ![...zone.world.creeps.values()].some(
                (e) => e.hp > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 260,
              )
            )
              continue;
            if (zone.world.tick >= h.cooldown)
              match.input(h.id, h.lastSequence + 1, { kind: 'basic' });
            for (const slot of [0, 1])
              if (zone.world.tick >= (h.skillCooldowns[slot] ?? 0))
                match.input(h.id, h.lastSequence + 1, { kind: 'cast', slot });
          }
        match.step();
        for (const { zoneId, event: e } of match.events) {
          if (zoneId !== 'arena') continue;
          if (e.kind === 'hit' && e.targetId === 'statue')
            statueDamage += e.damage;
          if (e.kind === 'death') {
            if (e.targetId.startsWith('invasion_')) kills++;
            if (e.targetId.startsWith('bot_')) heroDeaths++;
          }
        }
        maxLiving = Math.max(
          maxLiving,
          [...match.arena.world.creeps.values()].filter((e) => e.hp > 0).length,
        );
      }
      runs.push({
        players,
        strategy,
        seed,
        seconds: Number((match.tick / base.tickRate).toFixed(2)),
        wave: match.invasion!.wave,
        defeated: match.invasion!.defeated,
        statueHp: match.arena.world.statue!.hp,
        statueDamage,
        kills,
        heroDeaths,
        maxLiving,
        xp: heroes.reduce((n, h) => n + h.xp, 0),
        gold: heroes.reduce((n, h) => n + h.gold, 0),
        wallMs: Math.round(performance.now() - start),
      });
    }
const output = fileURLToPath(new URL('../artifacts/', import.meta.url));
mkdirSync(output, { recursive: true });
writeFileSync(
  output + 'm2b-balance.json',
  JSON.stringify(
    {
      scope:
        'M2B prototype recipes, production 180-second clock, level-1 Cái Bang start, no gear/passives/PvP/bosses; practice enemies removed from fixture only',
      method:
        '600 simulated seconds; unattended players in private dungeons versus stationary ranged A/Q/W guards; no healing/repair or invincibility; not a human difficulty assessment',
      seeds,
      runs,
    },
    null,
    2,
  ),
);
console.table(runs);
