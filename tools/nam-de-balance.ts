import { mkdirSync, writeFileSync } from 'node:fs';
import {
  createWorld,
  addHero,
  initializeProgression,
  gainExperience,
  changeBuild,
  initializeNamDe,
  spawnNamDeIfReady,
  submitInput,
  stepWorld,
  type NamDeKey,
} from '@volam/game-core';
import { m1Config, namDeDefinition } from '@volam/game-data';
const rows = [];
for (const school of ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'])
  for (const level of [1, 6, 15, 30])
    for (const style of [0, 1])
      for (const count of [1, 6])
        for (const seed of [42, 1337, 9001])
          for (const build of ['default', 'mixed'] as const) {
            const c = structuredClone(m1Config);
            c.creepSpawns = [];
            const w = createWorld(c, seed);
            initializeNamDe(w, c, structuredClone(namDeDefinition));
            const heroes = Array.from({ length: count }, (_, i) => {
              const h = addHero(w, 'bot' + i, 'Bot' + i, c);
              h.schoolId = school;
              initializeProgression(h, c, 'default');
              gainExperience(h, (level - 1) * 60, c);
              const ids = c.progression!.schools[school]!.basicIds;
              changeBuild(w, h, c, h.progression!.revision, {
                action: 'branch',
                basicId: ids[style]!,
              });
              if (build === 'mixed') {
                changeBuild(w, h, c, h.progression!.revision, {
                  action: 'mode',
                  mode: 'custom',
                });
                const pool = Object.values(c.progression!.skills).filter(
                  (k) =>
                    k.schoolId === school &&
                    !k.ultimate &&
                    k.levelGates[0]! <= level,
                );
                const styles = [...new Set(pool.map((k) => k.style))];
                const selected = styles.flatMap((k) =>
                  pool
                    .filter((v) => v.style === k)
                    .slice(0, 2)
                    .map((v) => v.id),
                );
                while (selected.length < 4) selected.push('');
                const error = changeBuild(w, h, c, h.progression!.revision, {
                  action: 'loadout',
                  ids: selected.slice(0, 4),
                });
                if (error) throw Error(error);
                for (let rank = 0; rank < 8; rank++)
                  for (const skillId of selected.filter(Boolean))
                    changeBuild(w, h, c, h.progression!.revision, {
                      action: 'upgrade',
                      skillId,
                    });
              }
              h.x = 740 + i * 15;
              h.y = 800;
              h.fx = 1;
              h.fy = 0;
              return h;
            });
            w.namDe!.phase = 'rest';
            spawnNamDeIfReady(w, c, 0);
            const b = w.creeps.get('boss_nam_de')!;
            b.x = 800;
            b.y = 800;
            w.namDe!.phase = 'idle';
            w.namDe!.nextActionAt = 60;
            let dealt = 0,
              taken = 0,
              casts = 0,
              clearSeconds: number | null = null;
            const observed = new Set<string>();
            for (let t = 0; t < 1800; t++) {
              for (const h of heroes) {
                if (h.hp <= 0) continue;
                const q = w.namDe!.controls.get(h.id)?.qte;
                if (q?.state === 'pending') {
                  submitInput(w, h.id, h.lastSequence + 1, {
                    kind: 'nam-de-key',
                    castId: q.id,
                    index: q.index,
                    key: q.keys[q.index] as NamDeKey,
                  });
                  continue;
                }
                if (t % 6 === 0) {
                  submitInput(w, h.id, h.lastSequence + 1, { kind: 'basic' });
                  submitInput(w, h.id, h.lastSequence + 1, {
                    kind: 'cast',
                    slot: Math.floor(t / 6) % 4,
                  });
                }
              }
              stepWorld(w, c);
              for (const e of w.events) {
                if (e.sourceId === 'boss_nam_de' && e.kind === 'hit')
                  taken += e.damage;
                if (e.targetId === 'boss_nam_de' && e.kind === 'hit')
                  dealt += e.damage;
                if (e.sourceId === 'boss_nam_de' && e.kind === 'cast') {
                  casts++;
                  observed.add(e.abilityId);
                }
              }
              if (b.hp <= 0) {
                clearSeconds = (t + 1) / 30;
                break;
              }
            }
            rows.push({
              build,
              school,
              level,
              style,
              count,
              seed,
              seconds: clearSeconds ?? 60,
              dealt,
              dps: dealt / (clearSeconds ?? 60),
              taken,
              survivors: heroes.filter((h) => h.hp > 0).length,
              bossHp: b.hp,
              clearSeconds,
              casts,
              abilities: [...observed],
              gold: heroes.reduce((n, h) => n + h.gold, 0),
              items: heroes.reduce((n, h) => n + (h.bossItems?.length ?? 0), 0),
            });
          }
const directory = new URL('../docs/evidence/nam-de-runtime/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(
  new URL('balance.json', directory),
  JSON.stringify(
    {
      strategy:
        'stationary legal default/mixed-style builds, physical QTE correct, no dodge/chase; diagnostic not human difficulty estimate',
      runs: rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    runs: rows.length,
    clears: rows.filter((r) => r.clearSeconds !== null).length,
    survivingParties: rows.filter((r) => r.survivors > 0).length,
    maxDps: Math.max(...rows.map((r) => r.dps)),
    items: rows.reduce((n, r) => n + r.items, 0),
  }),
);
