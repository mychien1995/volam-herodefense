import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DungeonMatch,
  initializeProgression,
  gainExperience,
  changeBuild,
  pointAccounting,
  type Point,
} from '@volam/game-core';
import { m1Config, creepDungeon, kimLuanDungeon } from '@volam/game-data';
const rows: Array<Record<string, unknown>> = [];
for (const seed of [42, 1337, 9001])
  for (const level of [1, 6, 15, 30])
    for (const [basic, branch] of Object.entries(
      m1Config.progression!.defaultBranches!,
    ))
      for (const players of [1, 6]) {
        const m = new DungeonMatch(
          structuredClone(m1Config),
          creepDungeon,
          seed,
          undefined,
          [kimLuanDungeon],
        );
        const bots = Array.from({ length: players }, (_, i) => {
          const h = m.add('bot' + i, 'bot' + i);
          h.schoolId = branch.schoolId;
          initializeProgression(h, m.base, 'custom');
          gainExperience(h, (level - 1) * m.base.xpPerLevel, m.base);
          const other = Object.values(
            m.base.progression!.defaultBranches!,
          ).find(
            (b) => b.schoolId === branch.schoolId && b.style !== branch.style,
          )!;
          const ids = [
            ...new Set([
              ...branch.skillIds.slice(0, 2),
              ...other.skillIds.slice(0, 2),
            ]),
          ];
          for (const change of [
            { action: 'basic' as const, basicId: basic },
            { action: 'loadout' as const, ids },
          ]) {
            const err = changeBuild(
              m.arena.world,
              h,
              m.base,
              h.progression!.revision,
              change,
            );
            if (err) throw Error(err);
          }
          // Spend only earned points. Stop at the first unavailable upgrade in each pass.
          for (let n = 0; n < 8; n++)
            for (const skillId of ids)
              changeBuild(m.arena.world, h, m.base, h.progression!.revision, {
                action: 'upgrade',
                skillId,
              });
          m.enter(h.id, 'shared', 'kim_luan');
          return h;
        });
        const z = m.zoneOf(bots[0]!.id)!,
          e = z.kim!;
        let damage = 0,
          received = 0,
          deaths = 0,
          clear = 0,
          bossPhase = false,
          enraged = false,
          rangedHits = 0,
          dodges = 0;
        const dead = new Set<string>(),
          actions = new Set<string>();
        for (let tick = 0; tick < 3600; tick++) {
          if (e.phase === 'defeated') {
            clear = tick / 30;
            break;
          }
          bossPhase ||= e.phase === 'boss';
          enraged ||= e.enraged;
          for (const h of bots) {
            if (h.hp <= 0) {
              if (!dead.has(h.id)) {
                deaths++;
                dead.add(h.id);
              }
              continue;
            }
            dead.delete(h.id);
            if (m.zoneOf(h.id)?.access === 'arena') {
              m.enter(h.id, 'shared', 'kim_luan');
              continue;
            }
            if (tick % 6) continue;
            const enemies = [...z.world.creeps.values()]
                .filter((a) => a.hp > 0)
                .sort(
                  (a, b) =>
                    distance(a, h) - distance(b, h) || a.id.localeCompare(b.id),
                ),
              target = enemies[0];
            if (!target) continue;
            const dx = target.x - h.x,
              dy = target.y - h.y,
              dist = distance(h, target),
              ranged = m.base.basics[h.basicId]!.effect.mode === 'projectile',
              range = ranged ? 230 : 45;
            let mx = dist > range ? Math.sign(dx) : 0,
              my = dist > range ? Math.sign(dy) : 0;
            if (ranged && dist < 150) {
              mx = -Math.sign(dx);
              my = -Math.sign(dy);
            }
            const warning = [...e.casts.values()].find(
              (c) =>
                c.activeAt > z.world.tick &&
                [
                  'dat_sweep',
                  'long_tuong_chan_thien',
                  'hang_ma_tam_lien_chan',
                ].includes(c.abilityId) &&
                distance(h, c.origin) < 340,
            );
            if (warning) {
              mx = -Math.sign(dx);
              my = -Math.sign(dy);
              dodges++;
            }
            const incoming = [...e.effects.values()].find(
              (p) =>
                ['shot', 'elephant'].includes(p.kind) &&
                p.activeAt <= z.world.tick &&
                distance(p, h) < 90,
            );
            if (incoming) {
              mx = -Math.sign(incoming.fy);
              my = Math.sign(incoming.fx);
              dodges++;
            }
            m.input(h.id, h.lastSequence + 1, { kind: 'move', x: mx, y: my });
            m.input(h.id, h.lastSequence + 1, { kind: 'basic' });
            m.input(h.id, h.lastSequence + 1, {
              kind: 'cast',
              slot: Math.floor(tick / 6) % 4,
            });
          }
          m.step();
          for (const cast of e.casts.values()) actions.add(cast.abilityId);
          for (const ev of z.world.events)
            if (ev.kind === 'hit') {
              if (bots.some((h) => h.id === ev.targetId)) {
                received += ev.damage;
                const source = z.world.creeps.get(ev.sourceId),
                  hero = bots.find((h) => h.id === ev.targetId)!;
                if (source && distance(source, hero) > 220) rangedHits++;
              } else if (bots.some((h) => h.id === ev.sourceId))
                damage += ev.damage;
            }
        }
        rows.push({
          seed,
          level,
          basic,
          players,
          seconds: clear || 120,
          cleared: !!clear,
          bossPhase,
          enraged,
          damage: Math.round(damage),
          received: Math.round(received),
          deaths,
          rangedHits,
          dodges,
          actions: [...actions],
          points: pointAccounting(bots[0]!, m.base),
        });
      }
const summary = [1, 6, 15, 30].flatMap((level) =>
  [1, 6].map((players) => {
    const r = rows.filter((r) => r.level === level && r.players === players);
    return {
      level,
      players,
      runs: r.length,
      clears: r.filter((r) => r.cleared).length,
      bossPhase: r.filter((r) => r.bossPhase).length,
      enraged: r.filter((r) => r.enraged).length,
      meanDeaths: r.reduce((n, r) => n + Number(r.deaths), 0) / r.length,
      rangedHits: r.reduce((n, r) => n + Number(r.rangedHits), 0),
      dodges: r.reduce((n, r) => n + Number(r.dodges), 0),
    };
  }),
);
const output = fileURLToPath(
  new URL('../docs/evidence/kim-luan-runtime/', import.meta.url),
);
mkdirSync(output, { recursive: true });
writeFileSync(
  output + 'balance.json',
  JSON.stringify(
    {
      policy:
        '120s seeded input-driven bots, legal earned levels/builds, normal death/re-entry, no combat HP overrides; heuristic bots do not establish director balance approval',
      summary,
      rows,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(summary, null, 2));
function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
