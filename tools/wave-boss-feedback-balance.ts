import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DungeonMatch,
  BacCaiEncounter,
  initializeProgression,
  gainExperience,
  changeBuild,
  submitInput,
  pointAccounting,
  direction,
  NAM_DE_ID,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  tayDocDefinition,
  namDeDefinition,
  bacCaiDefinition,
} from '@volam/game-data';
const rows: Record<string, string | number>[] = [];
const started = performance.now();
for (const boss of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'])
  for (const school of ['cai_bang', 'vo_dang', 'thien_son', 'thieu_lam'])
    for (const basic of m1Config.progression!.schools[school]!.basicIds)
      for (const level of [1, 6, 15, 30])
        for (const players of [1, 6])
          for (const seed of [42, 1337, 9001]) {
            const c = { ...structuredClone(m1Config), creepSpawns: [] };
            const m = new DungeonMatch(
              c,
              creepDungeon,
              seed,
              createInvasionDefinition(180, 1000000),
              [],
              {
                ...structuredClone(dongTaDefinition),
                restTicks: 1,
                entryTicks: 1,
              },
              structuredClone(tayDocDefinition),
              structuredClone(namDeDefinition),
              structuredClone(bacCaiDefinition),
            );
            const w = m.arena.world;
            m.invasion!.nextWaveTick = 1e9;
            for (let i = 0; i < players; i++) {
              const h = m.add('bot' + i, school);
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
              );
              const chosen = [...new Set(pool.map((k) => k.style))].flatMap(
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
                throw Error('Illegal balance fixture build');
            }
            m.dongTa!.phase = 'cleared';
            m.tayDoc!.phase = 'dead';
            m.tayDocGate.spawned = true;
            if (boss === 'dong_ta') {
              m.dongTa!.phase = 'waiting';
              m.invasion!.wave = 5;
              for (let i = 0; i < 4; i++) m.step();
            }
            if (boss === 'tay_doc') {
              m.tayDoc!.reset(w);
              m.tayDoc!.spawn(w, m.arena.config);
              m.tayDoc!.phase = 'phase1';
            }
            if (boss === 'nam_de') {
              w.namDe!.phase = 'rest';
              w.namDe!.spawnAt = w.tick;
              m.step();
              w.namDe!.phase = 'idle';
            }
            if (boss === 'bac_cai') {
              const e = new BacCaiEncounter(structuredClone(bacCaiDefinition));
              e.initialize(w, m.arena.config);
              e.phase = 'combat';
              if (m.mainBosses) m.mainBosses.encounter = e;
            }
            m.step();
            const id =
              boss === 'tay_doc'
                ? 'tay_doc_boss'
                : boss === 'nam_de'
                  ? NAM_DE_ID
                  : boss;
            const b = w.creeps.get(id)!;
            b.x = 800;
            b.y = 616;
            b.invulnerable = false;
            for (const [i, h] of [...w.heroes.values()].entries()) {
              h.x = 740 + i * 10;
              h.y = 680;
              h.hp = h.maxHp;
              h.mana = h.maxMana;
            }
            let dealt = 0,
              taken = 0,
              deaths = 0,
              seconds = 0;
            const abilities = new Set<string>();
            for (let tick = 0; tick < c.tickRate * 20; tick++) {
              const target = w.creeps.get(id);
              for (const h of w.heroes.values()) {
                if (h.hp <= 0 || !target || target.hp <= 0) continue;
                const v = direction(target.x - h.x, target.y - h.y),
                  range =
                    c.basics[h.basicId]!.effect.mode === 'projectile'
                      ? 150
                      : 42,
                  far = Math.hypot(target.x - h.x, target.y - h.y) > range;
                submitInput(w, h.id, h.lastSequence + 1, {
                  kind: 'move',
                  x: far ? v.x : 0,
                  y: far ? v.y : 0,
                });
                const q = w.namDe?.controls.get(h.id)?.qte;
                if (q?.state === 'pending')
                  submitInput(w, h.id, h.lastSequence + 1, {
                    kind: 'nam-de-key',
                    castId: q.id,
                    index: q.index,
                    key: q.keys[q.index]!,
                  });
                else if (tick % 6 === 0) {
                  submitInput(w, h.id, h.lastSequence + 1, { kind: 'basic' });
                  submitInput(w, h.id, h.lastSequence + 1, {
                    kind: 'cast',
                    slot: Math.floor(tick / 6) % 4,
                  });
                }
              }
              m.step();
              seconds = (tick + 1) / c.tickRate;
              for (const { event: e } of m.events) {
                if (e.kind === 'hit' && e.targetId === id) dealt += e.damage;
                if (e.kind === 'hit' && w.heroes.has(e.targetId))
                  taken += e.damage;
                if (e.kind === 'death' && w.heroes.has(e.targetId)) deaths++;
                if (e.kind === 'cast' && e.sourceId === id)
                  abilities.add(e.abilityId);
              }
              if (!w.creeps.get(id) || w.creeps.get(id)!.hp <= 0) break;
            }
            const items = [...w.heroes.values()].reduce(
              (n, h) => n + (h.bossItems?.length ?? 0),
              0,
            );
            if (items) throw Error('Wave boss emitted items');
            rows.push({
              boss,
              school,
              basic,
              level,
              players,
              seed,
              seconds,
              dealt,
              dps: dealt / seconds,
              taken,
              deaths,
              survivors: [...w.heroes.values()].filter((h) => h.hp > 0).length,
              attempt: m.waveArenaView()?.attempt ?? 0,
              statueHp: w.statue!.hp,
              gold: [...w.heroes.values()].reduce((n, h) => n + h.gold, 0),
              items,
              abilities: [...abilities].join('|'),
            });
          }
const folder = fileURLToPath(
  new URL('../docs/evidence/wave-boss-feedback-v03-runtime/', import.meta.url),
);
mkdirSync(folder, { recursive: true });
const report = {
  scope:
    '768 deterministic 20-second exposure probes: four bosses, four schools, both normal branches, legal mixed four-slot builds, levels1/6/15/30, solo/six and three seeds. Real new arena retry/respawn policy; no equipment, god mode or damage injection. Bots pursue and cast, answer Nam De QTE, but do not model human dodge, clone guessing or votes. Diagnostic metrics, not final balance or campaign approval.',
  seconds: (performance.now() - started) / 1000,
  rows,
};
writeFileSync(folder + '/balance.json', JSON.stringify(report, null, 2) + '\n');
const columns = Object.keys(rows[0]!);
writeFileSync(
  folder + '/balance.csv',
  columns.join(',') +
    '\n' +
    rows.map((r) => columns.map((k) => r[k]).join(',')).join('\n') +
    '\n',
);
console.log(
  JSON.stringify({
    runs: rows.length,
    seconds: report.seconds,
    allStatuesProtected: rows.every((r) => r.statueHp === 1000000),
    items: rows.reduce((n, r) => n + Number(r.items), 0),
    dpsRange: [
      Math.min(...rows.map((r) => Number(r.dps))),
      Math.max(...rows.map((r) => Number(r.dps))),
    ],
  }),
);
