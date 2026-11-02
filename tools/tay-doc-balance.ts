import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  DungeonMatch,
  initializeProgression,
  gainExperience,
  changeBuild,
  pointAccounting,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  tayDocDefinition,
  createInvasionDefinition,
} from '@volam/game-data';
const results: Array<Record<string, unknown>> = [];
for (const seed of [42, 1337, 9001])
  for (const level of [1, 6, 15, 30])
    for (const [basic, branch] of Object.entries(
      m1Config.progression!.defaultBranches!,
    ))
      for (const players of [1, 6]) {
        const match = new DungeonMatch(
          structuredClone(m1Config),
          creepDungeon,
          seed,
          createInvasionDefinition(),
          [],
          undefined,
          tayDocDefinition,
        );
        const bots = Array.from({ length: players }, (_, i) => {
          const h = match.add('bot' + i, 'bot' + i);
          h.schoolId = branch.schoolId;
          initializeProgression(h, match.base, 'default');
          gainExperience(h, (level - 1) * match.base.xpPerLevel, match.base);
          const error = changeBuild(
            match.arena.world,
            h,
            match.base,
            h.progression!.revision,
            { action: 'branch', basicId: basic },
          );
          if (error) throw Error(error);
          return h;
        });
        const zone = match.arena,
          encounter = match.tayDoc!;
        encounter.spawn(zone.world, zone.config);
        let damage = 0,
          received = 0,
          hits = 0,
          clearedAt = 0,
          deaths = 0;
        const actions = new Set<string>(),
          dead = new Set<string>();
        for (let tick = 0; tick < 1800; tick++) {
          const boss = zone.world.creeps.get(encounter.bossId)!;
          if (boss.hp <= 0) {
            clearedAt = tick / 30;
            break;
          }
          for (const h of bots) {
            if (h.hp <= 0) {
              if (!dead.has(h.id)) {
                deaths++;
                dead.add(h.id);
              }
              continue;
            }
            dead.delete(h.id);

            if (tick % 6 === 0) {
              const target =
                [...encounter.pillars.values()]
                  .filter((p) => (zone.world.creeps.get(p.id)?.hp ?? 0) > 0)
                  .sort(
                    (a, b) =>
                      Math.hypot(a.x - h.x, a.y - h.y) -
                      Math.hypot(b.x - h.x, b.y - h.y),
                  )[0] ?? boss;
              const dx = target.x - h.x,
                dy = target.y - h.y,
                d = Math.hypot(dx, dy),
                range =
                  match.base.basics[h.basicId]!.effect.mode === 'projectile'
                    ? 200
                    : 38;
              let mx = d > range ? Math.sign(dx) : 0,
                my = d > range ? Math.sign(dy) : 0;
              if (
                encounter.cast &&
                zone.world.tick < encounter.cast.activeAt &&
                ((encounter.cast.ability === 'tay_doc_staff' && d < 180) ||
                  (encounter.cast.ability === 'cap_mo_chan_kich' && d < 430))
              ) {
                mx = -Math.sign(dy || 1);
                my = Math.sign(dx || 1);
              }
              if (h.x > 1000 && Math.abs(h.y - 616) > 40) {
                mx = 0;
                my = Math.sign(616 - h.y);
              }
              match.input(h.id, h.lastSequence + 1, {
                kind: 'move',
                x: mx,
                y: my,
              });
              match.input(h.id, h.lastSequence + 2, { kind: 'basic' });
              match.input(h.id, h.lastSequence + 3, {
                kind: 'cast',
                slot: Math.floor(tick / 6) % 4,
              });
            }
          }
          const beforeBossHp = boss.hp;
          match.step();
          damage += Math.max(0, beforeBossHp - boss.hp);
          if (encounter.cast) actions.add(encounter.cast.ability);
          for (const e of zone.world.events) {
            if (e.kind === 'cast' && e.sourceId === encounter.bossId)
              actions.add(e.abilityId);
            if (e.kind === 'hit') {
              if (e.targetId === encounter.bossId) {
                hits++;
              }
              if (bots.some((b) => b.id === e.targetId)) received += e.damage;
            }
          }
        }
        results.push({
          seed,
          level,
          basic,
          players,
          seconds: clearedAt || 60,
          cleared: !!clearedAt,
          damage: Math.round(damage),
          dps: Math.round((damage / (clearedAt || 60)) * 100) / 100,
          received: Math.round(received),
          deaths,
          hits,
          bossHp: Math.round(zone.world.creeps.get(encounter.bossId)!.hp),
          statueHp: zone.world.statue!.hp,
          gold: bots.reduce((sum, h) => sum + h.gold, 0),
          xpGained: bots.reduce(
            (sum, h) => sum + h.xp - (level - 1) * match.base.xpPerLevel,
            0,
          ),
          lootRolls: bots.reduce(
            (sum, h) => sum + (h.bossLoot?.length ?? 0),
            0,
          ),
          actions: [...actions],
          points: pointAccounting(bots[0]!, match.base),
        });
      }
const summary = [1, 6, 15, 30].flatMap((level) =>
  [1, 6].map((players) => {
    const rows = results.filter(
      (r) => r.level === level && r.players === players,
    );
    return {
      level,
      players,
      runs: rows.length,
      clears: rows.filter((r) => r.cleared).length,
      meanDps:
        Math.round(
          (rows.reduce((a, r) => a + Number(r.dps), 0) / rows.length) * 100,
        ) / 100,
      meanDeaths:
        Math.round(
          (rows.reduce((a, r) => a + Number(r.deaths), 0) / rows.length) * 100,
        ) / 100,
    };
  }),
);
const outputDir = fileURLToPath(
  new URL('../docs/evidence/tay-doc/', import.meta.url),
);
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  outputDir + 'balance.json',
  JSON.stringify(
    {
      fixture:
        '60-second input-driven bots; three seeds; eight basic styles; legal default school branches with four slots (automatic rank/level gates); real invasion arena/statue with normal 180s clock (no invasion in 60s); normal arena respawn; DEV encounter spawn only; no HP/position overrides in combat',
      tuning: tayDocDefinition,
      summary,
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(summary, null, 2));
