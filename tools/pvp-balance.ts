import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { StandaloneLoiDai } from '@volam/game-core';
import { m1Config, creepDungeon, pvpDefinition } from '@volam/game-data';
const rows: unknown[] = [];
const branches = Object.entries(m1Config.progression!.schools).flatMap(
  ([school, s]) => s.basicIds.map((branch) => ({ school, branch })),
);
for (const seed of [11, 42, 193])
  for (const branch of branches) {
    const def = structuredClone(pvpDefinition);
    def.countdownTicks = 1;
    const match = new StandaloneLoiDai(m1Config, creepDungeon, def, seed);
    match.join('host', 'Chủ phòng');
    match.join('a', branch.branch);
    match.join('b', 'Cái Bang Bổng');
    match.choose('a', branch.school, branch.branch);
    match.choose('b', 'cai_bang', 'cai_bang_bong');
    match.assign('host', 'a', 'chinh');
    match.assign('host', 'b', 'ta');
    match.configure('host', 'rung_truc', false);
    match.start('host');
    match.step();
    const a = match.hero('a')!,
      b = match.hero('b')!;
    a.x = 570;
    a.y = 360;
    b.x = 650;
    b.y = 360;
    let sequence = 1,
      damageA = 0,
      damageB = 0;
    const start = match.tick;
    for (let i = 0; i < def.roundTicks && match.phase === 'fighting'; i++) {
      for (const id of ['a', 'b']) {
        match.input(id, sequence++, { kind: 'auto-basic', enabled: true });
        if (i % 15 === 0)
          match.input(id, sequence++, {
            kind: 'cast',
            slot: Math.floor(i / 15) % 5,
          });
      }
      match.step();
      for (const { event: e } of match.events)
        if (e.kind === 'hit') {
          if (e.sourceId === 'a') damageA += e.damage;
          else if (e.sourceId === 'b') damageB += e.damage;
        }
    }
    const seconds = (match.tick - start) / m1Config.tickRate;
    rows.push({
      seed,
      school: branch.school,
      branch: branch.branch,
      seconds,
      result: match.result,
      hpA: a.hp,
      hpB: b.hp,
      damageA,
      damageB,
      dpsA: seconds ? damageA / seconds : 0,
      dpsB: seconds ? damageB / seconds : 0,
      manaA: a.mana,
      manaB: b.mana,
      inventoryAbsent: !a.inventory && !b.inventory,
    });
  }
const folder = fileURLToPath(
  new URL('../docs/evidence/sessions/pvp-headless/', import.meta.url),
);
await mkdir(folder, { recursive: true });
await writeFile(
  folder + '/duels.json',
  JSON.stringify(
    {
      scope:
        'Level 30 / max skills / no items / stationary bots at 80 units / hazards off / 3 seeds; no claim about human PvP balance or optimal rotations',
      rows,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    scenarios: rows.length,
    branches: branches.length,
    seeds: 3,
    report: folder + '/duels.json',
  }),
);
