import { expect, it } from 'vitest';
import {
  createWorld,
  addHero,
  stepWorld,
  TayDocEncounter,
} from '@volam/game-core';
import { m1Config, tayDocDefinition } from '@volam/game-data';
function casts(seed: number, phase: 'phase1' | 'phase2', prior: boolean) {
  const c = {
    ...structuredClone(m1Config),
    collision: [],
    creepSpawns: [],
    creepRespawn: false,
  };
  const w = createWorld(c, seed),
    d = structuredClone(tayDocDefinition);
  const ids = [
    'co_doc_khoan_tam',
    'hon_thien_phuc_long_chan',
    'van_doc_bao_phat',
  ] as const;
  if (prior) for (const id of ids) d.attacks[id].cooldown = 180;
  const e = new TayDocEncounter(d);
  e.spawn(w, c);
  e.phase = phase;
  const b = w.creeps.get(e.bossId)!;
  b.x = 800;
  b.y = 616;
  const h = addHero(w, 'h', 'Frequency probe', c);
  h.invulnerable = true;
  h.autoBasic = false;
  const count: Record<string, number> = {};
  for (let i = 0; i < 5400; i++) {
    h.hp = h.maxHp;
    h.x = b.x + 100;
    h.y = b.y;
    stepWorld(w, c);
    e.step(w, c);
    for (const [id, p] of e.pillars)
      if (w.tick - p.at >= 30 && w.creeps.has(id)) w.creeps.get(id)!.hp = 0;
    for (const x of w.events)
      if (x.stage === 'boss_shout')
        count[x.abilityId] = (count[x.abilityId] ?? 0) + 1;
  }
  return count;
}
it.each([17, 42, 137])(
  'reduces poison explosions and Hỗn Thiên frequency over 180 seconds, seed %s',
  (seed) => {
    for (const phase of ['phase1', 'phase2'] as const) {
      const before = casts(seed, phase, true),
        after = casts(seed, phase, false);
      const ids =
        phase === 'phase1'
          ? ['co_doc_khoan_tam', 'hon_thien_phuc_long_chan']
          : ['van_doc_bao_phat'];
      for (const id of ids)
        expect(after[id]!).toBeLessThanOrEqual(before[id]! * 0.75);
    }
  },
);
