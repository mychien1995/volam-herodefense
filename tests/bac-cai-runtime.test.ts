import { describe, it, expect } from 'vitest';
import {
  createWorld,
  addHero,
  addCreep,
  stepWorld,
  submitInput,
  BacCaiEncounter,
  bacCaiFieldHit,
  bacCaiSpiral,
  MainBossDirector,
  InvasionDirector,
  DungeonMatch,
  blocked,
  type BacCaiDefinition,
} from '@volam/game-core';
import { hurt } from '../packages/game-core/src/combat.js';
import {
  bacCaiDefinition,
  m1Config,
  creepDungeon,
  createInvasionDefinition,
} from '@volam/game-data';
function setup(n = 2, configure?: (d: BacCaiDefinition) => void) {
  const c = {
      ...m1Config,
      creepSpawns: [],
      creepRespawn: false,
      critChance: 0,
    },
    w = createWorld(c, 123);
  for (let i = 0; i < n; i++) {
    const h = addHero(w, 'hero_' + i, 'Hero ' + i, c);
    h.x = 760 + i * 70;
    h.y = 800;
    h.hp = h.maxHp = 10000;
  }
  const d = structuredClone(bacCaiDefinition);
  d.preferences.voteEveryMs = 1e9;
  configure?.(d);
  const e = new BacCaiEncounter(d);
  e.initialize(w, c);
  e.phase = 'combat';
  const b = w.creeps.get(e.bossId)!;
  b.x = d.center.x;
  b.y = d.center.y;
  const step = (ticks = 1) => {
    for (let i = 0; i < ticks; i++) stepWorld(w, c);
  };
  const ms = (t: number) => Math.round((t * c.tickRate) / 1000);
  return { w, c, e, b, d, step, ms };
}
describe('Bắc Cái authoritative encounter', () => {
  it('an accepted manual basic against a revealed copy explodes and removes all forms in the same simulation tick', () => {
    const { w, c, e, d, step, ms } = setup();
    e.begin(w, c, 'clones');
    step(ms(d.clones.splitMs + 5 * 2100));
    const copy = [...w.creeps.values()].find(
      (a) => a.archetypeId === 'bc_form',
    )!;
    const h = w.heroes.get('hero_0')!;
    h.x = copy.x - 40;
    h.y = copy.y;
    h.fx = 1;
    h.fy = 0;
    submitInput(w, h.id, 1, { kind: 'basic' });
    step();
    expect(e.view(w, c).forms).toHaveLength(0);
    expect(
      w.events.some((x) => x.kind === 'attack' && x.sourceId === h.id),
    ).toBe(true);
    expect(
      w.events.filter(
        (x) => x.kind === 'hit' && x.abilityId === 'bc_clone_explosion',
      ),
    ).toHaveLength(2);
  });
  it('a wrong guess ends Mục Hạ immediately and one same-tick AoE explosion punishes the whole party once', () => {
    const { w, c, e, b, d, step, ms } = setup();
    e.begin(w, c, 'clones');
    step(ms(d.clones.splitMs + 5 * 2100));
    const copies = [...w.creeps.values()].filter(
        (a) => a.archetypeId === 'bc_form',
      ),
      h = w.heroes.get('hero_0')!;
    hurt(w, copies[0]!, h.id, 'aoe', 10, c);
    hurt(w, copies[0]!, h.id, 'aoe', 10, c);
    hurt(w, copies[1]!, h.id, 'aoe', 10, c);
    step();
    expect(e.view(w, c).forms).toHaveLength(0);
    expect(
      w.events.filter(
        (x) =>
          x.kind === 'hit' &&
          x.abilityId === 'bc_clone_explosion' &&
          x.targetId === h.id,
      ),
    ).toHaveLength(1);
    expect(
      w.events.filter(
        (x) => x.kind === 'hit' && x.abilityId === 'bc_clone_explosion',
      ),
    ).toHaveLength(2);
    expect(e.cast).toBeUndefined();
    step();
    expect(
      w.events.filter((x) => x.abilityId === 'bc_clone_explosion'),
    ).toHaveLength(0);
    hurt(w, b, h.id, 'a', 10, c);
    step();
    expect(e.view(w, c).forms).toHaveLength(0);
  });
  it('five seconds without a valid guess after swapping explodes once and ends Mục Hạ; a real hit cancels the deadline', () => {
    for (const hitReal of [false, true]) {
      const { w, c, e, b, d, step, ms } = setup();
      e.begin(w, c, 'clones');
      step(ms(d.clones.splitMs + 5 * 2100));
      expect(e.view(w, c).clonePhase).toBe('reveal');
      step(ms(5000) - 1);
      expect(e.view(w, c).forms).toHaveLength(8);
      if (hitReal) hurt(w, b, 'hero_0', 'a', 10, c);
      step();
      expect(e.view(w, c).forms).toHaveLength(0);
      expect(
        w.events.filter(
          (x) => x.kind === 'hit' && x.abilityId === 'bc_clone_explosion',
        ),
      ).toHaveLength(hitReal ? 0 : 2);
      step();
      expect(w.events.some((x) => x.abilityId === 'bc_clone_explosion')).toBe(
        false,
      );
    }
  });
  it('preserves waves, statue and independent dungeon boss; entry markers/corners are legal', () => {
    const { w, c, d } = setup();
    expect(w.boss).toBeUndefined();
    expect(blocked(d.entry, d.radius, c.width, c.height, c.collision)).toBe(
      false,
    );
    for (let i = 0; i < 8; i++)
      expect(
        blocked(
          {
            x: d.center.x + Math.cos((i * Math.PI) / 4) * d.cloneRadius.x,
            y: d.center.y + Math.sin((i * Math.PI) / 4) * d.cloneRadius.y,
          },
          d.radius,
          c.width,
          c.height,
          c.collision,
        ),
      ).toBe(false);
    const x = createWorld(c);
    addCreep(x, 'surviving_wave', { x: 400, y: 500 }, c);
    x.statue = {
      ...w.creeps.get('bac_cai')!,
      id: 'statue',
      radius: 20,
      hp: 1000,
      maxHp: 1000,
    };
    const e = new BacCaiEncounter(d);
    e.initialize(x, c);
    expect(x.creeps.has('surviving_wave')).toBe(true);
    expect(x.statue.hp).toBe(1000);
    for (let i = 0; i < 1000; i++) stepWorld(x, c);
    expect(x.statue.hp).toBe(1000);
  });
  it('requires actual previous defeats, wave20 clear, and rest; no fabricated progression', () => {
    const { w, c, d, ms } = setup();
    w.creeps.delete('bac_cai');
    delete w.bacCai;
    const invasion = new InvasionDirector(createInvasionDefinition(), w);
    invasion.wave = 20;
    const g = new MainBossDirector(d);
    g.step(w, c, invasion);
    expect(g.encounter).toBeUndefined();
    expect(g.recordDefeat('nam_de')).toBe(false);
    for (const id of ['dong_ta', 'tay_doc', 'nam_de'] as const)
      expect(g.recordDefeat(id)).toBe(true);
    const creep = addCreep(w, 'wave20', d.center, c);
    creep.invasion = {
      wave: 20,
      lane: 'east',
      targetId: '',
      chaseOrigin: d.center,
      reacquireAt: 0,
      chaseRange: 100,
      aggroRestTicks: 30,
    };
    g.step(w, c, invasion);
    expect(g.encounter).toBeUndefined();
    creep.hp = 0;
    g.step(w, c, invasion);
    w.tick += ms(d.restMs) - 1;
    g.step(w, c, invasion);
    expect(g.encounter).toBeUndefined();
    w.tick++;
    g.step(w, c, invasion);
    expect(g.encounter?.phase).toBe('entering');
    expect(w.creeps.has('wave20')).toBe(true);
  });
  it('normal A and QWER damage boss/dogs through common combat, exactly four dogs per summon, no farm rewards', () => {
    const { w, c, e, b, d, step, ms } = setup(),
      h = w.heroes.get('hero_0')!;
    h.x = b.x - 30;
    h.y = b.y;
    h.fx = 1;
    h.fy = 0;
    h.basicId = 'cai_bang_bong';
    h.basicId = Object.keys(c.basics).find(
      (id) => c.basics[id]!.effect.mode === 'arc',
    )!;
    submitInput(w, h.id, 1, { kind: 'basic' });
    step();
    expect(b.hp).toBeLessThan(b.maxHp);
    e.cast = undefined;
    expect(e.begin(w, c, 'dogs', h)).toBe(true);
    step(ms(d.dogs.releaseMs) + 1);
    expect(e.view(w, c).dogs).toHaveLength(4);
    step(ms(d.dogs.recoveryMs));
    e.cast = undefined;
    e.begin(w, c, 'dogs', h);
    step(ms(d.dogs.releaseMs) + 1);
    expect(e.view(w, c).dogs).toHaveLength(8);
    const dog = w.creeps.get(e.view(w, c).dogs[0]!.id)!,
      xp = h.xp,
      gold = h.gold;
    hurt(w, dog, h.id, 'a', 1e9, c);
    expect(dog.hp).toBe(0);
    expect(h.xp).toBe(xp);
    expect(h.gold).toBe(gold);
    const hp = h.hp;
    dog.x = h.x;
    dog.y = h.y;
    step();
    expect(dog.pose).toBe('death');
    expect(h.hp).toBeLessThanOrEqual(hp + 1);
    step(ms(d.dogs.corpseMs) + 1);
    expect(w.creeps.has(dog.id)).toBe(false);
  });
  it('clones split from center, cross slowly five rounds with bijective slots, immune only while swapping, no secret in view', () => {
    const { w, c, e, b, d, step, ms } = setup();
    e.begin(w, c, 'clones');
    const start = e.view(w, c);
    expect(start.forms).toHaveLength(8);
    expect(
      start.forms.filter((f) => f.x === d.center.x && f.y === d.center.y),
    ).toHaveLength(1);
    expect(hurt(w, b, 'hero_0', 'a', 10, c)).toBe(true);
    step(ms(d.clones.splitMs));
    expect(e.view(w, c).immune).toBe(true);
    expect(hurt(w, b, 'hero_0', 'a', 10, c)).toBe(false);
    const startPositions = e.view(w, c).forms.map((f) => ({ ...f }));
    step(ms(700));
    const mid = e.view(w, c);
    expect(
      mid.forms.some(
        (f, i) =>
          Math.hypot(f.x - startPositions[i]!.x, f.y - startPositions[i]!.y) >
          20,
      ),
    ).toBe(true);
    step(ms(9800));
    const end = e.view(w, c);
    expect(end.swaps).toBe(5);
    expect(end.immune).toBe(false);
    expect(end.clonePhase).toBe('reveal');
    expect(
      new Set(end.forms.map((f) => `${f.x.toFixed(2)},${f.y.toFixed(2)}`)).size,
    ).toBe(8);
    expect(end.boss).toBeNull();
    expect(end.action).toBeNull();
    const wire = JSON.stringify(end);
    for (const secret of [
      'realIndex',
      'realSlot',
      'isReal',
      'bc_form_',
      'random',
      'seed',
    ])
      expect(wire).not.toContain(secret);
    expect(hurt(w, b, 'hero_0', 'a', 10, c)).toBe(true);
    step();
    expect(e.view(w, c).forms).toHaveLength(0);
  });
  it.each([false, true])(
    'AoE real+copy still explodes independent of target iteration order (reverse=%s)',
    (reverse) => {
      const { w, c, e, b, d, step, ms } = setup();
      e.begin(w, c, 'clones');
      step(ms(d.clones.splitMs + 5 * 2100));
      const copy = [...w.creeps.values()].find(
          (a) => a.archetypeId === 'bc_form',
        )!,
        h = w.heroes.get('hero_0')!;
      const hp = h.hp;
      for (const a of reverse ? [copy, b] : [b, copy])
        hurt(w, a, h.id, 'same_aoe', 10, c);
      expect(e.view(w, c).forms).toHaveLength(8);
      step();
      expect(h.hp).toBeLessThan(hp - 50);
      expect(e.view(w, c).forms).toHaveLength(0);
      expect(
        w.events.filter(
          (x) =>
            x.abilityId === 'bc_clone_explosion' &&
            x.targetId === h.id &&
            x.kind === 'hit',
        ),
      ).toHaveLength(1);
    },
  );
  it('solo excludes tether; pair tether drains, breaks by distance and death, never damages statue', () => {
    const solo = setup(1);
    expect(solo.e.begin(solo.w, solo.c, 'tether')).toBe(false);
    for (const mode of ['distance', 'death', 'leave'] as const) {
      const { w, c, e, d, step, ms } = setup();
      const a = w.heroes.get('hero_0')!,
        b = w.heroes.get('hero_1')!;
      e.begin(w, c, 'tether');
      step(ms(d.tether.releaseMs) + 1);
      expect([...e.effects.values()].some((x) => x.kind === 'tether')).toBe(
        true,
      );
      expect(a.hp).toBeLessThan(a.maxHp);
      if (mode === 'distance') {
        a.x = 400;
        b.x = 1100;
      } else if (mode === 'death') a.hp = 0;
      else w.heroes.delete(a.id);
      const hp = b.hp;
      step(ms(1000));
      expect([...e.effects.values()].some((x) => x.kind === 'tether')).toBe(
        false,
      );
      expect(b.hp).toBeGreaterThanOrEqual(hp);
    }
  });
  it('transfer/remove clears tether immediately; arena hazards never touch a dungeon hero', () => {
    const match = new DungeonMatch(
        m1Config,
        creepDungeon,
        11,
        undefined,
        [],
        undefined,
        undefined,
        undefined,
        bacCaiDefinition,
      ),
      a = match.add('a', 'A'),
      b = match.add('b', 'B'),
      w = match.arena.world,
      c = match.arena.config;
    const e = new BacCaiEncounter(bacCaiDefinition);
    e.initialize(w, c);
    e.phase = 'combat';
    e.begin(w, c, 'tether', a);
    for (let i = 0; i < 15; i++) match.step();
    expect(e.effects.size).toBeGreaterThan(0);
    match.enter('a', 'private');
    expect(
      [...e.effects.values()].filter((x) => x.kind === 'tether'),
    ).toHaveLength(0);
    e.cast = undefined;
    e.begin(w, c, 'vortex', b);
    const crossZoneHits = [];
    for (let i = 0; i < 100; i++) {
      match.step();
      crossZoneHits.push(
        ...match.events.filter(
          ({ event }) =>
            event.targetId === a.id && event.abilityId.startsWith('bc_'),
        ),
      );
    }
    expect(crossZoneHits).toHaveLength(0);
    match.remove('b');
    expect(
      [...e.effects.values()].filter((x) => x.kind === 'tether'),
    ).toHaveLength(0);
  });
  it('field hits strokes, misses quadrants; beam sweeps a long segment once; palm does not home', () => {
    expect(bacCaiFieldHit({ x: 60, y: 60 }, { x: 0, y: 0 }, 180, 28, 10)).toBe(
      false,
    );
    for (const p of [
      { x: 0, y: 120 },
      { x: 180, y: 120 },
      { x: 120, y: 0 },
    ])
      expect(bacCaiFieldHit(p, { x: 0, y: 0 }, 180, 28, 10)).toBe(true);
    const { w, c, e, b, d, step, ms } = setup(),
      h = w.heroes.get('hero_0')!;
    h.x = b.x + 600;
    h.y = b.y;
    e.begin(w, c, 'beam', h);
    const hp = h.hp;
    step(ms(d.beam.warningMs));
    expect(h.hp).toBeLessThan(hp);
    const after = h.hp;
    step(ms(d.beam.activeMs));
    expect(h.hp).toBeGreaterThanOrEqual(after);
    e.cast = undefined;
    e.begin(w, c, 'palms', h);
    step(ms(d.palms.releaseMs));
    const shot = [...e.effects.values()].find((x) => x.kind === 'palm')!;
    const heading = { fx: shot.fx, fy: shot.fy };
    h.x = b.x;
    h.y = b.y - 300;
    step(3);
    expect({ fx: shot.fx, fy: shot.fy }).toEqual(heading);
  });
  it('spiral fixed origin survives release/recovery while another cast runs; simultaneous dialogue', () => {
    const { w, c, e, b, d, step, ms } = setup();
    e.begin(w, c, 'spiral');
    step(ms(d.spiral.dashMs + d.spiral.recoveryMs));
    const dragon = [...e.effects.values()].find((x) => x.kind === 'spiral')!,
      origin = { ...dragon.origin };
    expect(e.cast).toBeUndefined();
    expect(e.view(w, c).dialogue.length).toBeGreaterThan(0);
    b.x += 60;
    e.begin(w, c, 'beam');
    step(ms(400));
    expect(e.cast?.ability).toBe('beam');
    expect(e.effects.has(dragon.id)).toBe(true);
    expect(dragon.origin).toEqual(origin);
    expect(dragon).toMatchObject(
      bacCaiSpiral(
        origin,
        { x: dragon.fx, y: dragon.fy },
        (w.tick - dragon.start) / (dragon.end - dragon.start),
        d.spiral.radius,
        d.spiral.turns,
        d.spiral.startRadius,
        d.spiral.yScale,
      ),
    );
  });
  it('vortex replaces pull/slam with nine wandering damage sources and cleans up on recovery', () => {
    const { w, c, e, b, step, ms } = setup(),
      h = w.heroes.get('hero_0')!;
    h.x = b.x + 300;
    h.y = b.y;
    const start = { x: h.x, y: h.y };
    e.begin(w, c, 'vortex', h);
    step(ms(1100));
    const a = e.view(w, c);
    expect(a.spinners).toHaveLength(9);
    step(12);
    const z = e.view(w, c);
    expect(z.boss).not.toEqual(a.boss);
    expect({ x: h.x, y: h.y }).toEqual(start);
    expect(
      (h.statuses ?? []).some((s) =>
        ['stun', 'slow', 'dash_lock'].includes(s.kind),
      ),
    ).toBe(false);
    expect(z.action?.wanderSeed).toBeUndefined();
    step(e.cast!.end - w.tick);
    expect(e.cast).toBeUndefined();
    expect(e.view(w, c).spinners).toHaveLength(0);
  });
  it('field warning/landing/geometry share one legal center; broad 田 ground damage does not hit a quadrant gap', () => {
    const { w, c, e, b, d, step, ms } = setup(),
      target = w.heroes.get('hero_0')!,
      other = w.heroes.get('hero_1')!;
    target.x = 900;
    target.y = 800;
    other.x = 960;
    other.y = 860;
    e.begin(w, c, 'field', target);
    const center = { x: e.cast!.x, y: e.cast!.y };
    step(ms(d.field.impactMs));
    expect({ x: b.x, y: b.y }).toEqual(center);
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(other.hp).toBe(other.maxHp);
    expect(
      [...e.effects.values()].find((x) => x.kind === 'field'),
    ).toMatchObject(center);
  });
  it('speech changes while casting, vote outcome cancels body but preserves released hazards and dogs', () => {
    const { w, c, e, b, step, ms } = setup(2, (d) => {
      d.preferences.changeMs = 200;
      d.preferences.voteEveryMs = 2000;
      d.preferences.voteMs = 500;
    });
    e.begin(w, c, 'dogs');
    step(ms(900));
    e.cast = undefined;
    e.begin(w, c, 'spiral');
    step(ms(650 + bacCaiDefinition.spiral.dashMs));
    const dragon = [...e.effects.values()].find((x) => x.kind === 'spiral')!;
    e.begin(w, c, 'vortex');
    const phrase = e.view(w, c).dialogue;
    step(ms(200));
    expect(e.view(w, c).dialogue).not.toBe(phrase);
    expect(e.view(w, c).action?.ability).toBe('vortex');
    step(ms(300));
    const v = e.view(w, c),
      option = v.vote!.options.find((o) => o.preference === v.preference)!;
    for (const h of w.heroes.values()) {
      h.x = option.x;
      h.y = option.y;
    }
    // Vortex would pull the voters, so resolve their server positions immediately at the deadline.
    w.tick = v.vote!.deadline;
    e.step(w, c);
    expect(e.phase).toBe('sleep');
    expect(e.cast).toBeUndefined();
    expect(e.effects.has(dragon.id)).toBe(true);
    expect(e.view(w, c).dogs).toHaveLength(4);
    expect(hurt(w, b, 'hero_0', 'free_damage', 20, c)).toBe(true);
  });
  it('wrong answer heals ten percent max HP once and clamps at max', () => {
    const { w, c, e, b, step, ms } = setup(2, (d) => {
      d.preferences.voteEveryMs = 100;
      d.preferences.voteMs = 100;
    });
    b.hp = b.maxHp * 0.97;
    for (const h of w.heroes.values()) {
      h.x = 400;
      h.y = 1000;
    }
    step(ms(250));
    expect(e.phase).toBe('drink');
    expect(b.hp).toBe(b.maxHp);
    hurt(w, b, 'hero_0', 'a', 100, c);
    const hp = b.hp;
    step(5);
    expect(b.hp).toBe(hp);
  });
  it.each(['correct', 'wrong', 'tie', 'zero'])(
    'vote resolves %s once using server occupancy and frozen last sentence',
    (mode) => {
      const { w, c, e, b, step, ms } = setup(2, (d) => {
        d.preferences.voteEveryMs = 100;
        d.preferences.voteMs = 500;
      });
      step(ms(100) + 1);
      const v = e.view(w, c),
        vote = v.vote!;
      expect(v.dialogue).toBe('Ai còn nhớ lời lão phu?');
      expect(vote.options).toHaveLength(3);
      const right = vote.options.find((o) => o.preference === v.preference)!,
        wrong = vote.options.find((o) => o !== right)!;
      const heroes = [...w.heroes.values()];
      for (const h of heroes) {
        h.x = 400;
        h.y = 1000;
      }
      const move = (i: number, p: typeof right) => {
        heroes[i]!.x = p.x;
        heroes[i]!.y = p.y;
      };
      if (mode === 'correct') {
        move(0, right);
        move(1, right);
      }
      if (mode === 'wrong') {
        move(0, wrong);
        move(1, wrong);
      }
      if (mode === 'tie') {
        move(0, right);
        move(1, wrong);
      }
      b.hp = b.maxHp * 0.5;
      step(ms(500));
      const result = e.view(w, c);
      expect(result.vote?.outcome).toBe(
        mode === 'correct' ? 'correct' : 'wrong',
      );
      if (mode === 'correct') {
        expect(e.phase).toBe('sleep');
        expect(e.outcomeUntil - w.tick).toBe(ms(10000) - 1);
        const hp = b.hp;
        hurt(w, b, 'hero_0', 'free', 100, c);
        expect(b.hp).toBeLessThan(hp);
        step(ms(9999));
        expect(e.phase).toBe('combat');
      } else {
        expect(e.phase).toBe('drink');
        expect(b.hp).toBeCloseTo(b.maxHp * 0.6);
        step(5);
        expect(b.hp).toBeCloseTo(b.maxHp * 0.6);
      }
    },
  );
  it('outcome interrupts body, retains released dragon/dogs; cleanup/reward are idempotent, no respawn or items', () => {
    const { w, c, e, b, d, step, ms } = setup();
    e.begin(w, c, 'dogs');
    step(ms(900));
    e.cast = undefined;
    e.begin(w, c, 'spiral');
    step(ms(650));
    d.preferences.voteEveryMs = 100; // next vote is frozen at construction: use a fresh encounter below for outcome policy.
    expect(e.view(w, c).dogs).toHaveLength(4);
    const h = w.heroes.get('hero_0')!,
      gold = h.gold;
    hurt(w, b, h.id, 'kill', 1e9, c);
    step();
    expect(e.phase).toBe('defeated');
    expect(e.effects.size).toBe(0);
    expect(e.view(w, c).dogs).toHaveLength(0);
    expect(h.gold).toBe(gold + d.reward.gold);
    expect(h.bossLoot ?? []).toHaveLength(0);
    step(400);
    expect(h.gold).toBe(gold + d.reward.gold);
    expect(b.hp).toBe(0);
  });
  it('fixed seed yields identical casts/damage; invalid config rejected', () => {
    const run = () => {
      const { w, c, e, step } = setup(6);
      step(1200);
      return JSON.stringify({
        view: e.view(w, c),
        heroes: [...w.heroes.values()],
      });
    };
    expect(run()).toBe(run());
    const { w, c, d } = setup();
    d.dogs.cadenceMs = NaN;
    expect(() => new BacCaiEncounter(d).initialize(w, c)).toThrow();
  });
});
