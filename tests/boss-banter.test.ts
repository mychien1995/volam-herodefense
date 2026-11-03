import { expect, it } from 'vitest';
import { addCreep, addHero, createWorld, stepWorld } from '@volam/game-core';
import { stepBossBanter } from '../packages/game-core/src/boss-banter.js';
import { bossBanterLines, bossBanterPools, m1Config } from '@volam/game-data';

function setup(seed = 90) {
  const c = {
    ...structuredClone(m1Config),
    creepSpawns: [],
    collision: [],
    bossBanter: {
      ...structuredClone(m1Config.bossBanter!),
      openingTicks: 1,
      intervalTicks: 1,
      jitterTicks: 0,
    },
  };
  const w = createWorld(c, seed);
  addHero(w, 'p', 'P', c);
  for (const id of ['dong_ta', 'tay_doc_boss', 'boss_nam_de', 'bac_cai']) {
    const a = addCreep(w, id, { x: 800, y: 616 }, c);
    a.controlled = true;
  }
  // Nam's phase belongs to its encounter, not a generic creep. Other encounter tests cover it.
  w.namDe = { phase: 'idle' } as NonNullable<typeof w.namDe>;
  return { w, c };
}
it('has exactly twenty unique original Vietnamese lines per requested boss and no Bắc Cái pool', () => {
  expect(Object.keys(bossBanterPools).sort()).toEqual([
    'boss_nam_de',
    'dong_ta',
    'tay_doc_boss',
  ]);
  expect(Object.keys(bossBanterLines)).toHaveLength(60);
  for (const lines of Object.values(bossBanterPools)) {
    expect(new Set(lines).size).toBe(20);
    expect(lines.every((s) => s.length > 25 && s.length < 110)).toBe(true);
  }
});
it('server-seeded decks exhaust all twenty without repetition, never repeat across decks, and synchronize stable line IDs', () => {
  const run = () => {
    const { w, c } = setup();
    const lines: Record<string, string[]> = {};
    for (let i = 0; i < 43; i++) {
      w.tick++;
      w.events = [];
      stepBossBanter(w, c);
      for (const e of w.events) {
        expect(e.stage).toBe('boss_banter');
        expect(bossBanterLines[e.abilityId]).toBeTruthy();
        (lines[e.sourceId] ??= []).push(e.abilityId);
      }
    }
    for (const pool of Object.values(lines)) {
      expect(new Set(pool.slice(0, 20)).size).toBe(20);
      expect(new Set(pool.slice(20, 40)).size).toBe(20);
      expect(pool[19]).not.toBe(pool[20]);
    }
    expect(Object.keys(lines)).toHaveLength(3);
    return lines;
  };
  expect(run()).toEqual(run());
});
it('defers chat during cast, suppresses dead bosses/empty fights and resets on respawn', () => {
  const { w, c } = setup();
  stepBossBanter(w, c);
  const a = w.creeps.get('dong_ta')!;
  a.pose = 'cast';
  w.tick = 5;
  stepBossBanter(w, c);
  expect(w.events.some((e) => e.sourceId === a.id)).toBe(false);
  a.pose = 'idle';
  a.hp = 0;
  stepBossBanter(w, c);
  expect(w.bossBanter!.has(a.id)).toBe(false);
  w.heroes.get('p')!.hp = 0;
  w.events = [];
  w.tick++;
  stepBossBanter(w, c);
  expect(w.events).toHaveLength(0);
  const respawn = addCreep(w, a.id, a, c);
  w.heroes.get('p')!.hp = 100;
  stepBossBanter(w, c);
  expect(w.bossBanter!.get(a.id)!.actor).toBe(respawn);
  expect(w.events).toHaveLength(0);
});
it('normal world stepping actually emits combat banter without client messages', () => {
  const c = { ...structuredClone(m1Config), creepSpawns: [], collision: [] };
  const w = createWorld(c);
  const h = addHero(w, 'p', 'P', c);
  h.hp = h.maxHp = 100000;
  const b = addCreep(w, 'dong_ta', { x: h.x, y: h.y - 200 }, c);
  b.controlled = true;
  const heard = [];
  for (let i = 0; i <= c.bossBanter!.openingTicks; i++) {
    stepWorld(w, c);
    heard.push(...w.events.filter((e) => e.stage === 'boss_banter'));
  }
  expect(heard).toHaveLength(1);
  expect(heard[0]!.sourceId).toBe(b.id);
});
it('cosmetic banter does not consume or perturb authoritative combat RNG', () => {
  const { w, c } = setup();
  const reference = createWorld(c, 90);
  for (let i = 0; i < 50; i++) {
    w.tick++;
    stepBossBanter(w, c);
  }
  expect(Array.from({ length: 20 }, () => w.random())).toEqual(
    Array.from({ length: 20 }, () => reference.random()),
  );
});
