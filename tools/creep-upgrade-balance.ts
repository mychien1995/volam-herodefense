import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createWorld,
  addHero,
  addCreep,
  stepWorld,
  initializeProgression,
  gainExperience,
  changeBuild,
  submitInput,
  pointAccounting,
  InvasionDirector,
} from '@volam/game-core';
import {
  m1Config,
  creepProfiles,
  creepCombatDefinition,
  createInvasionDefinition,
} from '@volam/game-data';
const out = fileURLToPath(
  new URL('../docs/evidence/creep-upgrade', import.meta.url),
);
mkdirSync(out, { recursive: true });
const rows: Record<string, string | number>[] = [];
const start = performance.now();
for (const profile of Object.values(creepProfiles).filter(
  (p) => p.id !== 'chu_wine_disciple',
))
  for (const school of ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'])
    for (const basic of m1Config.progression!.schools[school]!.basicIds)
      for (const level of [1, 6, 15, 30])
        for (const players of [1, 6])
          for (const seed of [42, 1337, 9001]) {
            const c = structuredClone(m1Config);
            c.creepSpawns = [];
            c.collision = [];
            c.creepCombat = creepCombatDefinition;
            c.creepRespawn = false;
            c.dungeonAggro = true;
            const w = createWorld(c, seed),
              e = addCreep(w, 'target', { x: 800, y: 600 }, c);
            e.archetypeId = profile.id;
            e.stats = {
              ...c.creep,
              hp: Math.round(c.creep.hp * (1 + 0.16 * (players - 1))),
              damage: c.creep.damage * (1 + 0.08 * (players - 1)),
            };
            e.hp = e.maxHp = e.stats.hp;
            for (let i = 0; i < players; i++) {
              const h = addHero(w, `bot${i}`, school, c);
              h.schoolId = school;
              initializeProgression(h, c, 'default');
              gainExperience(h, (level - 1) * c.xpPerLevel, c);
              changeBuild(w, h, c, h.progression!.revision, {
                action: 'branch',
                basicId: basic,
              });
              changeBuild(w, h, c, h.progression!.revision, {
                action: 'mode',
                mode: 'custom',
              });
              const pool = Object.values(c.progression!.skills).filter(
                  (k) =>
                    k.schoolId === school &&
                    !k.ultimate &&
                    k.levelGates[0]! <= level,
                ),
                chosen = [...new Set(pool.map((k) => k.style))].flatMap(
                  (style) =>
                    pool
                      .filter((k) => k.style === style)
                      .slice(0, 2)
                      .map((k) => k.id),
                );
              while (chosen.length < 4) chosen.push('');
              const error = changeBuild(w, h, c, h.progression!.revision, {
                action: 'loadout',
                ids: chosen.slice(0, 4),
              });
              if (error) throw Error(error);
              for (let rank = 0; rank < 8; rank++)
                for (const id of chosen.filter(Boolean))
                  changeBuild(w, h, c, h.progression!.revision, {
                    action: 'upgrade',
                    skillId: id,
                  });
              if (pointAccounting(h, c).surplus < 0)
                throw Error('Illegal fixture');
              Object.assign(h, {
                x: 755 - i * 5,
                y: 600 + i * 12,
                fx: 1,
                fy: 0,
                hp: h.maxHp,
                mana: h.maxMana,
              });
            }
            let incoming = 0,
              outgoing = 0,
              ticks = 0;
            for (; ticks < 300; ticks++) {
              for (const h of w.heroes.values())
                if (h.hp > 0) {
                  submitInput(w, h.id, h.lastSequence + 1, { kind: 'basic' });
                  if (ticks % 45 === 0)
                    submitInput(w, h.id, h.lastSequence + 1, {
                      kind: 'cast',
                      slot: Math.floor(ticks / 45) % 4,
                    });
                }
              stepWorld(w, c);
              for (const event of w.events)
                if (event.kind === 'hit') {
                  if (w.heroes.has(event.targetId)) incoming += event.damage;
                  else if (event.targetId === e.id) outgoing += event.damage;
                }
              if (e.hp <= 0 && !profile.death) break;
            }
            rows.push({
              id: profile.id,
              school,
              basic,
              level,
              players,
              seed,
              seconds: (ticks + 1) / 30,
              incoming,
              outgoing,
              living: [...w.heroes.values()].filter((h) => h.hp > 0).length,
              creepHp: e.hp,
              xp: [...w.heroes.values()].reduce((n, h) => n + h.xp, 0),
              gold: [...w.heroes.values()].reduce((n, h) => n + h.gold, 0),
            });
          }
const streams = [];
for (const portals of [2, 3, 4] as const)
  for (const players of [1, 6]) {
    const c = structuredClone(m1Config);
    c.creepCombat = creepCombatDefinition;
    c.creepSpawns = [];
    const w = createWorld(c, 42),
      d = createInvasionDefinition(180, 1e9, { portalCount: portals }),
      director = new InvasionDirector(d, w);
    w.statue!.invulnerable = true;
    const times: number[] = [];
    for (let t = 5400; t <= 7200; t++) {
      const before = performance.now();
      director.beforeStep(w, c, t, players);
      if (portals === 4 && players === 6) stepWorld(w, c);
      times.push(performance.now() - before);
    }
    times.sort((a, b) => a - b);
    streams.push({
      portals,
      players,
      count: w.creeps.size,
      streaming: director.streaming,
      simulatedWorld: portals === 4 && players === 6,
      p95Ms: times[Math.floor(times.length * 0.95)],
      maxMs: times[times.length - 1],
      xpPool: w.creeps.size * c.creep.xp,
      goldPool: w.creeps.size * c.creep.gold,
    });
  }
const summary = {
  cases: rows.length,
  seconds: (performance.now() - start) / 1000,
  scope:
    '48 attacking profiles; 4 schools, both basics, levels 1/6/15/30, solo/six, 3 seeds, legal mixed four-slot builds; static exposure bots, no human dodge model',
  streams,
};
writeFileSync(
  `${out}/balance.json`,
  JSON.stringify({ summary, rows }, null, 2),
);
writeFileSync(
  `${out}/balance.csv`,
  [
    Object.keys(rows[0]!).join(','),
    ...rows.map((r) => Object.values(r).join(',')),
  ].join('\n'),
);
console.log(JSON.stringify(summary));
