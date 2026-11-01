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
  hongLietDungeon,
  hongLietDefinition,
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
          undefined,
          [hongLietDungeon],
        );
        const bots = Array.from({ length: players }, (_, i) => {
          const h = match.add('bot' + i, 'bot' + i);
          h.schoolId = branch.schoolId;
          initializeProgression(h, match.base);
          gainExperience(h, (level - 1) * 60, match.base);
          const ids = [
            'luong_nghi_thu',
            'hoa_van_chuong',
            'kim_quang_ho_tran',
            'luu_phong_bo',
          ];
          changeBuild(
            match.arena.world,
            h,
            match.base,
            h.progression!.revision,
            { action: 'basic', basicId: basic },
          );
          changeBuild(
            match.arena.world,
            h,
            match.base,
            h.progression!.revision,
            { action: 'loadout', ids },
          );
          for (let n = 0; n < 30; n++)
            for (const skillId of ids)
              changeBuild(
                match.arena.world,
                h,
                match.base,
                h.progression!.revision,
                { action: 'upgrade', skillId },
              );
          match.enter(h.id, 'shared', 'hong_liet');
          return h;
        });
        const zone = match.zoneOf(bots[0]!.id)!,
          encounter = zone.encounter!;
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
            if (match.zoneOf(h.id)?.access === 'arena') {
              match.enter(h.id, 'shared', 'hong_liet');
              continue;
            }
            if (tick % 6 === 0) {
              const dx = boss.x - h.x,
                dy = boss.y - h.y,
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
                d < 230
              ) {
                mx = -Math.sign(dy || 1);
                my = Math.sign(dx || 1);
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
          match.step();
          for (const e of zone.world.events) {
            if (e.kind === 'cast' && e.sourceId === encounter.bossId)
              actions.add(e.abilityId);
            if (e.kind === 'hit') {
              if (e.targetId === encounter.bossId) {
                damage += e.damage;
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
  new URL('../docs/evidence/hong-liet-runtime/', import.meta.url),
);
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  outputDir + 'balance.json',
  JSON.stringify(
    {
      fixture:
        '60-second input-driven bots; three seeds; eight basic styles; legal mixed four-slot builds; normal respawn/re-entry; no HP/position overrides in combat',
      tuning: hongLietDefinition,
      summary,
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(summary, null, 2));
