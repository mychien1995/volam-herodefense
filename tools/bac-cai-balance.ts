import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createWorld,
  addHero,
  initializeProgression,
  gainExperience,
  changeBuild,
  submitInput,
  stepWorld,
  BacCaiEncounter,
  direction,
  pointAccounting,
} from '@volam/game-core';
import { m1Config, bacCaiDefinition } from '@volam/game-data';
const rows: any[] = [];
const started = performance.now();
for (const school of ['cai_bang', 'vo_dang', 'thieu_lam', 'thien_son'])
  for (const basic of m1Config.progression!.schools[school]!.basicIds)
    for (const level of [1, 6, 15, 30])
      for (const players of [1, 2, 6])
        for (const seed of [42, 1337, 9001]) {
          const c = { ...m1Config, creepSpawns: [], creepRespawn: false },
            w = createWorld(c, seed),
            sequences = new Map<string, number>();
          for (let i = 0; i < players; i++) {
            const h = addHero(w, 'bot_' + i, school, c);
            h.schoolId = school;
            initializeProgression(h, c, 'default');
            gainExperience(h, (level - 1) * c.xpPerLevel, c);
            changeBuild(w, h, c, h.progression!.revision, {
              action: 'basic',
              basicId: basic,
            });
            h.x = 700 + i * 40;
            h.y = 890;
            sequences.set(h.id, 0);
            if (pointAccounting(h, c).surplus < 0)
              throw Error('Illegal probe build');
          }
          const e = new BacCaiEncounter(bacCaiDefinition);
          e.initialize(w, c);
          const b = w.creeps.get('bac_cai')!;
          let damage = 0,
            received = 0,
            deaths = 0,
            seconds = 0;
          const abilities = new Set<string>();
          for (let tick = 0; tick < 60 * c.tickRate; tick++) {
            const v = e.view(w, c);
            for (const h of w.heroes.values()) {
              if (h.hp <= 0) continue;
              let target = { x: b.x, y: b.y },
                range =
                  c.basics[basic]!.effect.mode === 'projectile' ? 160 : 42;
              if (v.vote && !v.vote.outcome) {
                target = v.vote.options.find(
                  (o) => o.preference === v.preference,
                )!;
                range = 10;
              }
              const delta = direction(target.x - h.x, target.y - h.y),
                far = Math.hypot(target.x - h.x, target.y - h.y) > range;
              const send = (command: Parameters<typeof submitInput>[3]) => {
                const n = sequences.get(h.id)! + 1;
                sequences.set(h.id, n);
                submitInput(w, h.id, n, command);
              };
              send({
                kind: 'move',
                x: far ? delta.x : 0,
                y: far ? delta.y : 0,
              });
              if (!v.forms.length && !(v.vote && !v.vote.outcome)) {
                if (tick % 6 === 0) send({ kind: 'basic' });
                if (tick % 15 === 0)
                  send({ kind: 'cast', slot: Math.floor(tick / 15) % 4 });
              }
            }
            stepWorld(w, c);
            seconds = (tick + 1) / c.tickRate;
            for (const event of w.events) {
              if (event.kind === 'cast' && event.sourceId === e.bossId)
                abilities.add(event.abilityId);
              if (event.kind === 'hit' && event.targetId === e.bossId)
                damage += event.damage;
              if (event.kind === 'hit' && w.heroes.has(event.targetId))
                received += event.damage;
              if (event.kind === 'death' && w.heroes.has(event.targetId))
                deaths++;
            }
            if (
              e.phase === 'defeated' ||
              [...w.heroes.values()].every((h) => h.hp <= 0)
            )
              break;
          }
          rows.push({
            school,
            basic,
            level,
            players,
            seed,
            seconds,
            bossMaxHp: b.maxHp,
            bossHp: b.hp,
            damage,
            dps: damage / seconds,
            received,
            deaths,
            survivors: [...w.heroes.values()].filter((h) => h.hp > 0).length,
            killed: e.phase === 'defeated',
            abilities: [...abilities],
          });
        }
const report = {
  scope:
    'Trial defaults only; deterministic 60s exposure probes, both default branches of four schools, legal automatic ranks, levels1/6/15/30, solo/2/6, three fixed seeds. Bots remember public preference text and abstain from clone attacks; no dungeon respawn, equipment or human dodge model. This is not final balance approval.',
  elapsedMs: performance.now() - started,
  rows,
};
const output = fileURLToPath(
  new URL('../docs/evidence/bac-cai-runtime/', import.meta.url),
);
mkdirSync(output, { recursive: true });
writeFileSync(
  output + '/balance-probes.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      scenarios: rows.length,
      elapsedMs: report.elapsedMs,
      byPlayers: [1, 2, 6].map((players) => {
        const group = rows.filter((r) => r.players === players);
        return {
          players,
          scenarios: group.length,
          kills: group.filter((r) => r.killed).length,
          wipes: group.filter((r) => r.survivors === 0).length,
          meanDps: group.reduce((s, r) => s + r.dps, 0) / group.length,
        };
      }),
    },
    null,
    2,
  ),
);
