import { describe, expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  BacCaiEncounter,
  blocked,
  createWorld,
  DungeonMatch,
  InvasionDirector,
  MainBossDirector,
  namDeKeys,
  stepWorld,
  submitInput,
  VUONG_ID,
  VuongEncounter,
  vuongCounters,
  vuongSkills,
  type Hero,
  type Point,
  type VuongDefinition,
} from '@volam/game-core';
import {
  bacCaiDefinition,
  createInvasionDefinition,
  creepDungeon,
  m1Config,
  vuongDefinition,
  arenaVariants,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';

function arena(count = 2, seed = 312, tuning: Partial<VuongDefinition> = {}) {
  const config = { ...m1Config, creepSpawns: [], creepRespawn: false };
  const world = createWorld(config, seed);
  const encounter = new VuongEncounter({ ...vuongDefinition, ...tuning });
  const party = Array.from({ length: count }, (_, i) => {
    const h = addHero(world, 'p' + i, 'Peer ' + i, config);
    h.x = 900;
    h.y = 616;
    h.hp = h.maxHp = 10000;
    return h;
  });
  encounter.initialize(world, config);
  const actor = world.creeps.get(VUONG_ID)!;
  const step = () => stepWorld(world, config);
  const view = () => encounter.view(world, config);
  function until(predicate: () => boolean, max = 1600) {
    for (let i = 0; i < max; ++i) {
      if (predicate()) return;
      step();
    }
    throw Error(
      'Timed out at tick ' + world.tick + ': ' + JSON.stringify(view().action),
    );
  }
  function damageBoss(n: number) {
    hurt(world, actor, party[0]!.id, 'fixture_hit', n, config, {
      critChance: 0,
      critMultiplier: 1,
    });
  }
  function phase2() {
    encounter.lightningHits = 3; // Shield is tested separately through real strikes.
    damageBoss(actor.maxHp * 10);
    step();
    expect(view().phase).toBe(2);
  }
  return {
    config,
    world,
    encounter,
    party,
    actor,
    step,
    until,
    view,
    damageBoss,
    phase2,
  };
}

const place = (h: Hero, p: Point) => {
  h.x = p.x;
  h.y = p.y;
};

describe('Vương Trùng Dương server combat', () => {
  it('counts three separate warned lightning strikes while retaining the shield before the third', () => {
    const a = arena(1),
      h = a.party[0]!;
    for (let strike = 1; strike <= 3; strike++) {
      place(h, { x: a.actor.x + 102, y: a.actor.y });
      a.until(() =>
        a
          .view()
          .cues.some((e) => e.kind === 'lightning' && e.at > a.world.tick),
      );
      expect(a.view().shield).toBe(4 - strike);
      const point = a
        .view()
        .cues.find((e) => e.kind === 'lightning' && e.at > a.world.tick)!;
      let sequence = h.lastSequence;
      for (let tick = a.world.tick; tick < point.at; tick++) {
        const dx = point.x + 150 - h.x,
          dy = point.y - h.y;
        const x = Math.abs(dx) > 7 ? Math.sign(dx) : 0;
        const y = Math.abs(dy) > 7 ? Math.sign(dy) : 0;
        submitInput(a.world, h.id, ++sequence, { kind: 'move', x, y });
        a.step();
      }
      expect(a.encounter.lightningHits).toBe(strike);
      expect(a.view().shield).toBe(3 - strike);
      a.step();
      expect(a.encounter.lightningHits).toBe(strike);
    }
    a.damageBoss(1e5);
    a.step();
    expect(a.view().phase).toBe(2);
    expect(a.view().cues.every((e) => e.kind !== 'lightning')).toBe(true);
  });

  it.each(['success', 'wrong', 'timeout'] as const)(
    'settles %s QTE once through validated input and keeps affected heroes alive',
    (result) => {
      const a = arena();
      a.encounter.lightningHits = 3;
      a.until(() => a.encounter.controls.size === 2);
      const before = a.party.map((h) => (h.hp = 27));
      for (const [index, h] of a.party.entries()) {
        const q = a.encounter.controls.get(h.id)!.qte!;
        if (result === 'timeout' && index === 0) continue;
        if (result === 'wrong') {
          const wrong = namDeKeys.find((k) => k !== q.keys[0])!;
          submitInput(a.world, h.id, 1, {
            kind: 'nam-de-key',
            castId: q.id,
            index: 0,
            key: wrong,
          });
          submitInput(a.world, h.id, 2, {
            kind: 'nam-de-key',
            castId: q.id,
            index: 0,
            key: wrong,
          });
        } else {
          q.keys.forEach((key, i) => {
            expect(
              submitInput(a.world, h.id, i + 1, {
                kind: 'nam-de-key',
                castId: q.id,
                index: i,
                key,
              }),
            ).toBe(true);
          });
        }
      }
      a.until(() => a.encounter.controls.size === 0);
      expect(a.party.map((h) => h.hp)).toEqual(
        result === 'success' ? before : [1, 1],
      );
      expect(
        a.world.events.filter(
          (e) => e.kind === 'hit' && e.abilityId === vuongSkills.counter,
        ),
      ).toHaveLength(result === 'success' ? 0 : 2);
      a.step();
      expect(
        a.world.events.some((e) => e.abilityId === vuongSkills.counter),
      ).toBe(false);
    },
  );

  it('drops private QTE state on leave and settles the remaining party once', () => {
    const a = arena();
    a.encounter.lightningHits = 3;
    a.until(() => a.encounter.controls.size === 2);
    const [one, two] = a.party as [Hero, Hero];
    a.encounter.participantLeft(one.id);
    a.world.heroes.delete(one.id);
    two.hp = 17;
    a.step();
    expect(a.encounter.controls.size).toBe(0);
    expect(two.hp).toBe(1);
  });

  it('uses all five counter seals and never damages the occupant of the correct seal', () => {
    const tested = new Set<number>();
    for (let seed = 1; seed <= 100 && tested.size < 5; seed++) {
      const a = arena(3, seed);
      a.encounter.lightningHits = 3;
      a.until(() => a.view().action?.skill === 'elements');
      const v = a.view(),
        index = v.action!.index;
      if (tested.has(index)) continue;
      tested.add(index);
      const [safe, wrong, outside] = a.party as [Hero, Hero, Hero];
      place(safe, v.elements[vuongCounters[index]!]!);
      place(wrong, v.elements[index]!);
      place(outside, { x: 1100, y: 800 });
      const hp = [safe.hp, wrong.hp, outside.hp];
      a.until(() => !a.view().action);
      expect(safe.hp).toBe(hp[0]);
      expect(wrong.hp).toBeLessThan(hp[1]!);
      expect(outside.hp).toBeLessThan(hp[2]!);
      expect(
        a.world.events.some(
          (e) =>
            e.abilityId === vuongSkills.elements && e.targetId === outside.id,
        ),
      ).toBe(true);
      if (index === 1) {
        expect(wrong.statuses?.some((s) => s.kind === 'root')).toBe(true);
        const start = { x: wrong.x, y: wrong.y, charges: wrong.dashCharges };
        submitInput(a.world, wrong.id, 1, { kind: 'move', x: 1, y: 0 });
        submitInput(a.world, wrong.id, 2, { kind: 'dash' });
        submitInput(a.world, wrong.id, 3, { kind: 'basic' });
        a.step();
        expect({ x: wrong.x, y: wrong.y, charges: wrong.dashCharges }).toEqual(
          start,
        );
        expect(
          a.world.events.some(
            (event) => event.kind === 'attack' && event.sourceId === wrong.id,
          ),
        ).toBe(true);
      }
    }
    expect([...tested].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it.each([true, false])(
    'locks Tam Thanh geometry and resolves the eye only when the ray crosses it (%s)',
    (breaks) => {
      const a = arena(1);
      a.phase2();
      a.until(() => a.view().stars.length === 28);
      const stars = a.view().stars;
      place(
        a.party[0]!,
        breaks ? stars[a.view().eyeIndex]! : { x: 955, y: 664 },
      );
      a.until(() =>
        a.view().cues.some((e) => e.kind === 'tam' && e.at > a.world.tick),
      );
      const cue = a.view().cues.find((e) => e.kind === 'tam')!;
      place(a.party[0]!, { x: 810, y: 790 });
      a.until(() => a.world.tick === cue.at);
      expect(a.view().exposedUntil > a.world.tick).toBe(breaks);
      expect(a.view().cues.find((e) => e.id === cue.id)?.end).toEqual(cue.end);
      expect(a.view().cues.some((e) => e.kind === 'rain')).toBe(true);
    },
  );

  it('breaks a Huyền Vũ sword only by a locked boss ray and reduces its periodic damage', () => {
    const a = arena(1);
    a.phase2();
    a.until(() => a.view().swords.length === 3);
    const initial = a.view();
    const sword = initial.swords[0]!;
    expect(a.world.creeps.has(String(sword.id))).toBe(false);
    const h = a.party[0]!;
    place(h, sword.point);
    h.fy = -1;
    submitInput(a.world, h.id, 1, { kind: 'basic' });
    a.step();
    expect(a.view().swords).toHaveLength(3);
    a.until(() =>
      a.view().cues.some((e) => e.kind === 'finger' && e.at > a.world.tick),
    );
    const cue = a.view().cues.find((e) => e.kind === 'finger')!;
    place(h, { x: 852, y: 588 });
    a.until(() => a.world.tick === cue.at);
    expect(a.view().swords).toHaveLength(2);
    expect(a.view().swords.some((s) => s.id === sword.id)).toBe(false);
    a.until(() =>
      a.world.events.some(
        (e) => e.kind === 'hit' && e.abilityId === vuongSkills.swords,
      ),
    );
    expect(
      a.world.events.find(
        (e) => e.kind === 'hit' && e.abilityId === vuongSkills.swords,
      )?.damage,
    ).toBeCloseTo(h.maxHp * 2 * a.encounter.definition.drainPerSword);
  });

  it.each(['correct', 'wrong', 'absent'] as const)(
    'resolves all seven music beats or requests a wipe (%s)',
    (outcome) => {
      const a = arena(2);
      a.phase2();
      a.damageBoss(1e5);
      a.until(() => a.view().action?.skill === 'notes');
      const { notes, noteSeals } = a.view();
      expect(notes).toHaveLength(7);
      expect(new Set(notes).size).toBe(6);
      for (const [i, index] of notes.entries()) {
        a.until(() => a.view().action?.stage === i + 1);
        for (const h of a.party) place(h, noteSeals[index]!);
        if (i === 2 && outcome !== 'correct') {
          place(
            a.party[1]!,
            outcome === 'wrong' ? noteSeals[(index + 1) % 6]! : a.view().center,
          );
          a.until(() => a.encounter.wipeRequested);
          break;
        }
        if (i === notes.length - 1) a.until(() => !a.view().action);
      }
      expect(a.encounter.wipeRequested).toBe(outcome !== 'correct');
      if (outcome === 'correct') {
        a.damageBoss(1e5);
        expect(a.encounter.defeat(a.world, a.config)).toBe(true);
        const rewards = a.party.map((h) => h.gold);
        expect(a.encounter.defeat(a.world, a.config)).toBe(false);
        expect(a.party.map((h) => h.gold)).toEqual(rewards);
        expect(a.view().cues).toHaveLength(0);
      }
    },
  );

  it('uses an actual Bắc Cái death, preserves residual enemies, and spawns the final boss once after rest', () => {
    const { config, world, party } = arena(1);
    world.vuong!.clear(world);
    delete world.vuong;
    const invasion = new InvasionDirector(createInvasionDefinition(), world);
    const director = new MainBossDirector(bacCaiDefinition, {
      ...vuongDefinition,
      restMs: 200,
    });
    const e = new BacCaiEncounter(bacCaiDefinition);
    e.initialize(world, config);
    director.encounter = e;
    expect(director.recordDefeat('bac_cai')).toBe(false);
    for (const id of ['dong_ta', 'tay_doc', 'nam_de'] as const)
      expect(director.recordDefeat(id)).toBe(true);
    addCreep(world, 'survivor', { x: 370, y: 615 }, config);
    const bac = world.creeps.get('bac_cai')!;
    e.phase = 'combat';
    director.step(world, config, invasion);
    expect(world.creeps.has(VUONG_ID)).toBe(false);
    hurt(world, bac, party[0]!.id, 'test_attack', 1e8, config);
    stepWorld(world, config);
    director.step(world, config, invasion);
    expect(director.defeatedBosses.at(-1)).toBe('bac_cai');
    expect(world.creeps.has(VUONG_ID)).toBe(false);
    world.tick += config.tickRate;
    director.step(world, config, invasion);
    const final = world.creeps.get(VUONG_ID);
    expect(final).toBeDefined();
    expect(world.creeps.has('survivor')).toBe(true);
    director.step(world, config, invasion);
    expect(world.creeps.get(VUONG_ID)).toBe(final);
  });
});

function finalMatch() {
  const config = { ...m1Config, creepSpawns: [] };
  const definition = {
    ...vuongDefinition,
    restMs: 200,
    notesReadMs: 400,
    beatMs: 500,
  };
  const m = new DungeonMatch(
    config,
    creepDungeon,
    11,
    createInvasionDefinition(),
    [],
    undefined,
    undefined,
    undefined,
    bacCaiDefinition,
    undefined,
    definition,
  );
  const w = m.arena.world;
  const h = m.add('p', 'Peer');
  for (const id of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'] as const)
    expect(m.mainBosses!.recordDefeat(id)).toBe(true);
  const until = (predicate: () => boolean) => {
    for (let i = 0; i < 1200; i++) {
      if (predicate()) return;
      m.step();
    }
    throw Error('No expected state at tick ' + w.tick);
  };
  until(() => w.vuong !== undefined);
  return { m, w, h, until };
}

it('retries a failed music beat, restores the team, and reconnects within the locked field', () => {
  const { m, w, h, until } = finalMatch();
  const statue = w.statue!.hp;
  const first = w.vuong!;
  expect(m.waveArenaView()?.locked).toBe(true);
  expect(w.statue?.invulnerable).toBe(true);
  m.disconnect(h.id);
  expect(w.heroes.has(h.id)).toBe(false);
  m.reconnect(h.id);
  expect(w.heroes.get(h.id)?.hp).toBe(h.maxHp);
  expect(m.zoneOf(h.id)?.id).toBe('arena');
  first.lightningHits = 3;
  const boss = w.creeps.get(VUONG_ID)!;
  hurt(w, boss, h.id, 'threshold', 1e8, m.arena.config);
  m.step();
  hurt(w, boss, h.id, 'threshold', 1e8, m.arena.config);
  place(h, first.definition.center);
  until(() => m.waveArenaView()?.phase === 'retry');
  expect(w.creeps.has(VUONG_ID)).toBe(false);
  expect(h.hp).toBe(0);
  expect(w.statue?.hp).toBe(statue);
  until(() => m.waveArenaView()?.attempt === 2);
  expect(w.vuong).not.toBe(first);
  expect(w.vuong?.lightningHits).toBe(0);
  expect(h.hp).toBe(h.maxHp);
  expect(m.victory).toBe(false);
});

it('publishes victory and fixed rewards only once when the statue survives the final hit', () => {
  const { m, w, h, until } = finalMatch();
  const e = w.vuong!,
    b = w.creeps.get(VUONG_ID)!;
  const hit = () => hurt(w, b, h.id, 'threshold', 1e8, m.arena.config);
  e.lightningHits = 3;
  hit();
  m.step();
  hit();
  const view = () => e.view(w, m.arena.config);
  until(() => view().action?.skill === 'notes');
  const { notes, noteSeals } = view();
  for (const [i, index] of notes.entries()) {
    until(() => view().action?.stage === i + 1);
    place(h, noteSeals[index]!);
  }
  until(() => !view().action);
  const gold = h.gold;
  hit();
  m.step();
  expect(m.victory).toBe(true);
  expect(w.statue?.hp).toBeGreaterThan(0);
  expect(m.waveArenaView()).toBeUndefined();
  expect(m.mainBosses?.defeatedBosses.at(-1)).toBe(VUONG_ID);
  expect(h.gold - gold).toBe(e.definition.gold);
  const endTick = w.tick;
  m.step();
  expect(w.tick).toBe(endTick);
  expect(h.gold - gold).toBe(e.definition.gold);
});

describe('M4D VTD follow-up', () => {
  it('holds a readable shield chase distance instead of walking into the player', () => {
    const a = arena(1),
      h = a.party[0]!;
    place(h, { x: a.actor.x + 200, y: a.actor.y });
    for (let i = 0; i < 120; i++) a.step();
    expect(Math.hypot(a.actor.x - h.x, a.actor.y - h.y)).toBeGreaterThanOrEqual(
      110,
    );
  });
  it('spreads 28 stars across all four arena quadrants', () => {
    const a = arena(1);
    a.phase2();
    a.until(() => a.view().stars.length > 0);
    const v = a.view();
    expect(v.stars).toHaveLength(28);
    const quadrants = new Set(
      v.stars.map((p) =>
        [Math.sign(p.x - v.center.x), Math.sign(p.y - v.center.y)].join(':'),
      ),
    );
    expect(quadrants.size).toBe(4);
  });
});

it('moves star damage with the bright pulse instead of hitting the whole link at release', () => {
  const a = arena(1);
  a.phase2();
  a.until(() => a.view().cues.some((e) => e.kind === 'starLine'));
  const cue = a.view().cues.find((e) => e.kind === 'starLine')!,
    h = a.party[0]!;
  place(h, cue.end!);
  const hits: any[] = [];
  while (a.world.tick < cue.at + 1) {
    a.step();
    hits.push(
      ...a.world.events.filter(
        (e) =>
          e.abilityId === vuongSkills.stars &&
          e.targetId === h.id &&
          e.kind === 'hit',
      ),
    );
  }
  expect(hits).toHaveLength(0);
  while (a.world.tick < cue.until) {
    a.step();
    hits.push(
      ...a.world.events.filter(
        (e) =>
          e.abilityId === vuongSkills.stars &&
          e.targetId === h.id &&
          e.kind === 'hit',
      ),
    );
  }
  expect(hits.length).toBeGreaterThan(0);
});

it('keeps the expanded stars on walkable stone in every M4D arena', () => {
  for (const variant of Object.values(arenaVariants)) {
    const a = arena(1, 42, { center: { ...variant.circleCenter } });
    a.phase2();
    a.until(() => a.view().stars.length > 0);
    for (const point of a.view().stars)
      expect(
        blocked(point, 12, a.config.width, a.config.height, variant.collision),
      ).toBe(false);
  }
});

it.each([false, true])(
  'checks notes only at the deadline and reports who missed (return before deadline: %s)',
  (returnInTime) => {
    const a = arena(2);
    a.phase2();
    a.damageBoss(1e5);
    a.until(
      () => a.view().action?.skill === 'notes' && a.view().action?.stage === 1,
    );
    const v = a.view(),
      seal = v.noteSeals[v.notes[0]!]!;
    for (const h of a.party) place(h, seal);
    expect(a.view().noteReadyIds).toEqual(a.party.map((h) => h.id));
    const missing = a.party[1]!;
    place(missing, v.center);
    expect(a.view().noteReadyIds).toEqual([a.party[0]!.id]);
    a.until(() => a.world.tick === v.action!.next - 1);
    expect(a.encounter.wipeRequested).toBe(false);
    if (returnInTime) place(missing, seal);
    a.step();
    expect(a.encounter.wipeRequested).toBe(!returnInTime);
    if (returnInTime) {
      expect(a.view().action?.stage).toBe(2);
      expect(a.encounter.notesFailure).toBeUndefined();
    } else
      expect(a.encounter.notesFailure).toEqual({
        beat: 1,
        note: v.notes[0],
        missed: [missing.id],
      });
  },
);
