import { describe, it, expect } from 'vitest';
import type { SimulationConfig } from '@volam/game-core';
import {
  createWorld,
  addHero,
  stepWorld,
  TayDocEncounter,
  TayDocGate,
  DungeonMatch,
} from '@volam/game-core';
import { hurt } from '../packages/game-core/src/combat.js';
import {
  m1Config,
  tayDocDefinition,
  validateTayDocDefinition,
  creepDungeon,
  createInvasionDefinition,
} from '@volam/game-data';
function fixture() {
  const config: SimulationConfig = {
    ...structuredClone(m1Config),
    collision: [],
    creepSpawns: [],
    creepRespawn: false,
  };
  const world = createWorld(config, 42);
  world.creeps.clear();
  const encounter = new TayDocEncounter(structuredClone(tayDocDefinition));
  encounter.spawn(world, config);
  encounter.phase = 'phase1';
  const boss = world.creeps.get(encounter.bossId)!;
  boss.x = 600;
  boss.y = 650;
  const hero = addHero(world, 'h', 'H', config);
  hero.x = 720;
  hero.y = 650;
  hero.hp = hero.maxHp = 10000;
  const step = (n: number) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      encounter.step(world, config);
      if (!encounter.cast) encounter.nextActionAt = Infinity;
    }
  };
  encounter.nextActionAt = Infinity;
  return { config, world, encounter, boss, hero, step };
}
describe('Tay Doc authoritative arena encounter', () => {
  it('validates locked geometry and trial numbers', () => {
    expect(() =>
      validateTayDocDefinition({ ...tayDocDefinition, hp: NaN }),
    ).toThrow();
    expect(() =>
      validateTayDocDefinition({
        ...tayDocDefinition,
        attacks: {
          ...tayDocDefinition.attacks,
          cap_mo_chan_kich: {
            ...tayDocDefinition.attacks.cap_mo_chan_kich,
            range: 450,
          },
        },
      }),
    ).toThrow();
  });
  it('enters from west along road and never targets/damages statue without living heroes', () => {
    const f = fixture();
    f.encounter.phase = 'enter';
    f.boss.x = 80;
    f.boss.y = 616;
    f.world.statue = {
      ...f.hero,
      id: 'statue',
      x: 400,
      y: 616,
      hp: 1000,
      maxHp: 1000,
      radius: 36,
    };
    f.hero.x = 950;
    f.step(100);
    expect(f.boss.x).toBeGreaterThan(80);
    expect(f.boss.y).toBe(616);
    f.hero.hp = 0;
    const statue = f.world.statue.hp;
    f.step(200);
    expect(f.world.statue.hp).toBe(statue);
    expect(f.encounter.cast).toBeUndefined();
  });
  it('staff is front-only180degrees, range160, one hit per target per cast', () => {
    const f = fixture();
    f.hero.x = 740;
    const back = addHero(f.world, 'back', 'back', f.config);
    back.x = 590;
    back.y = 650;
    back.hp = back.maxHp = 1000;
    expect(f.encounter.begin(f.world, f.config, 'tay_doc_staff', f.hero)).toBe(
      true,
    );
    const hp = f.hero.hp;
    f.step(30);
    const after = f.hero.hp;
    expect(after).toBeLessThan(hp);
    expect(back.hp).toBe(1000);
    f.step(30);
    expect(f.hero.hp).toBe(after);
  });
  it('warning precedes27needle shots; trajectories are captured, swept and inflict slow/poison', () => {
    const f = fixture();
    f.hero.x = 950;
    f.encounter.begin(f.world, f.config, 'van_doc_phi_cham', f.hero);
    f.step(29);
    expect(f.encounter.projectiles.size).toBe(0);
    f.step(1);
    expect(f.encounter.projectiles.size).toBe(9);
    const shot = [...f.encounter.projectiles.values()][4]!;
    const heading = [shot.vx, shot.vy];
    f.hero.y = 850;
    f.step(11);
    expect([shot.vx, shot.vy]).toEqual(heading);
    expect(f.encounter.projectiles.size).toBe(27);
    f.hero.x = shot.x + shot.vx / 30;
    f.hero.y = shot.y;
    f.step(1);
    expect(f.encounter.poisons.has(f.hero.id)).toBe(true);
    expect(f.hero.statuses?.some((s) => s.kind === 'slow')).toBe(true);
  });
  it('creates8valid pools with warning, tick dedup, reentry and expiry', () => {
    const f = fixture();
    f.encounter.begin(f.world, f.config, 'doc_vu_me_hon', f.hero);
    expect(f.encounter.cast?.points).toHaveLength(8);
    f.step(32);
    expect(f.encounter.pools.size).toBe(0);
    f.step(1);
    expect(f.encounter.pools.size).toBe(8);
    const p = [...f.encounter.pools.values()][0]!;
    f.hero.x = p.x;
    f.hero.y = p.y;
    f.step(30);
    expect(f.encounter.poisons.has('h')).toBe(true);
    const hp = f.hero.hp;
    f.step(1);
    expect(hp - f.hero.hp).toBeLessThanOrEqual(
      f.encounter.definition.poisonDamage,
    );
    f.hero.x = 1500;
    f.hero.y = 1000;
    f.step(100);
    const hp2 = f.hero.hp;
    f.step(30);
    expect(f.hero.hp).toBe(hp2);
    f.hero.x = p.x;
    f.hero.y = p.y;
    f.step(30);
    expect(f.hero.hp).toBeLessThan(hp2);
    f.step(100);
    expect(f.encounter.pools.size).toBe(0);
  });
  it('curse takes exactly25%maxHP ignoring shield/defense, no second self-hit or chain mark', () => {
    const f = fixture();
    f.hero.maxHp = 400;
    f.hero.hp = 200;
    f.hero.statuses = [
      {
        kind: 'mana_shield',
        magnitude: 1,
        secondary: 1,
        durationTicks: 500,
        until: 500,
        sourceId: 'h',
        abilityId: 'shield',
      },
      {
        kind: 'damage_reduction',
        magnitude: 0.85,
        durationTicks: 500,
        until: 500,
        sourceId: 'h',
        abilityId: 'guard',
      },
    ];
    const ally = addHero(f.world, 'ally', 'ally', f.config);
    ally.x = 730;
    ally.y = 650;
    ally.hp = ally.maxHp = 1000;
    f.encounter.begin(f.world, f.config, 'co_doc_khoan_tam', f.hero);
    f.step(12);
    expect(f.encounter.marks.size).toBe(1);
    f.step(135);
    expect(f.hero.hp).toBe(100);
    expect(ally.hp).toBeLessThan(1000);
    expect(f.encounter.marks.size).toBe(0);
    expect(f.encounter.poisons.has('h')).toBe(false);
  });
  it('isolated curse does not affect allies; travel settles, death/disconnect cancel before respawn', () => {
    const f = fixture();
    f.encounter.marks.set('h', { id: 'mark', targetId: 'h', at: 0, until: 5 });
    f.encounter.depart(f.world, f.config, 'h', true);
    expect(f.hero.hp).toBe(7500);
    expect(f.encounter.marks.size).toBe(0);
    f.encounter.marks.set('h', { id: 'mark2', targetId: 'h', at: 0, until: 5 });
    f.hero.hp = 0;
    f.step(1);
    f.hero.hp = 10000;
    f.step(10);
    expect(f.hero.hp).toBe(10000);
    f.encounter.marks.set('h', {
      id: 'mark3',
      targetId: 'h',
      at: 0,
      until: 20,
    });
    f.encounter.depart(f.world, f.config, 'h', false);
    expect(f.encounter.marks.size).toBe(0);
  });
  it('six destructible pillars rotate8headings, shoot one ray, stop on death without redirecting old rays', () => {
    const f = fixture();
    f.hero.x = 100;
    f.hero.y = 100;
    f.encounter.begin(f.world, f.config, 'hon_thien_phuc_long_chan', f.hero);
    f.step(27);
    expect(f.encounter.pillars.size).toBe(6);
    const pillar = [...f.encounter.pillars.values()][0]!;
    const observed = new Set<number>();
    for (let i = 0; i < 8; i++) {
      f.step(42);
      observed.add(pillar.heading);
    }
    expect(observed.size).toBe(8);
    const actor = f.world.creeps.get(pillar.id)!;
    const shots = [...f.encounter.projectiles.values()].filter(
      (s) => s.ownerId === pillar.id,
    );
    const before = shots.map((s) => [s.vx, s.vy]);
    hurt(f.world, actor, 'h', 'test', 10000, f.config, {
      critChance: 0,
      critMultiplier: 1,
    });
    f.step(45);
    expect(f.encounter.pillars.has(pillar.id)).toBe(false);
    expect(shots.map((s) => [s.vx, s.vy])).toEqual(before);
  });
  it('strict threshold, one transition, P2-only kit and persistent P1 pools/pillars', () => {
    const f = fixture();
    f.encounter.begin(f.world, f.config, 'doc_vu_me_hon', f.hero);
    f.step(60);
    expect(f.encounter.pools.size).toBe(8);
    f.encounter.begin(f.world, f.config, 'hon_thien_phuc_long_chan', f.hero);
    f.step(45);
    f.boss.hp = f.boss.maxHp / 2;
    f.step(1);
    expect(f.encounter.phase).toBe('phase1');
    f.boss.hp -= 0.01;
    f.step(1);
    expect(f.encounter.phase).toBe('transition');
    expect(f.encounter.pillars.size).toBe(6);
    expect(f.encounter.pools.size).toBe(8);
    f.step(f.encounter.definition.transition);
    expect(f.encounter.phase).toBe('phase2');
    expect(f.encounter.begin(f.world, f.config, 'tay_doc_staff', f.hero)).toBe(
      false,
    );
    const at = f.encounter.transitionAt;
    f.boss.hp = 10;
    f.step(1);
    expect(f.encounter.transitionAt).toBe(at);
  });
  it('P2 radial speed/range, stationary channel, stomp405 and3landing bursts exactly16each', () => {
    for (const ability of [
      'ngu_doc_than_chuong',
      'van_doc_bao_phat',
    ] as const) {
      const f = fixture();
      f.encounter.phase = 'phase2';
      f.hero.x = 100;
      f.hero.y = 100;
      f.encounter.begin(f.world, f.config, ability, f.hero);
      const starts = new Map<number, number>();
      let previous = new Set<string>();
      const origin = { x: f.boss.x, y: f.boss.y };
      for (let n = 0; n < 160; n++) {
        f.step(1);
        if (ability === 'ngu_doc_than_chuong' && f.encounter.cast)
          expect({ x: f.boss.x, y: f.boss.y }).toEqual(origin);
        for (const s of f.encounter.projectiles.values())
          if (!previous.has(s.id)) {
            expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(
              ability === 'ngu_doc_than_chuong' ? 130.05 : 218.025,
              8,
            );
            expect(s.remaining).toBeCloseTo(484.5, 6);
            starts.set(s.startedAt, (starts.get(s.startedAt) ?? 0) + 1);
          }
        previous = new Set(f.encounter.projectiles.keys());
      }
      expect([...starts.values()].every((n) => n === 16)).toBe(true);
      expect(starts.size).toBe(ability === 'ngu_doc_than_chuong' ? 10 : 3);
    }
    const f = fixture();
    f.encounter.phase = 'phase2';
    f.hero.x = 1005;
    f.encounter.begin(f.world, f.config, 'cap_mo_chan_kich', f.hero);
    const hp = f.hero.hp;
    f.step(34);
    expect(f.hero.hp).toBeLessThan(hp);
    expect(f.hero.statuses?.some((s) => s.kind === 'stun')).toBe(true);
  });
  it('rewards once without items; cleanup on boss death and no arena respawn', () => {
    const f = fixture();
    f.encounter.begin(f.world, f.config, 'hon_thien_phuc_long_chan', f.hero);
    f.step(28);
    hurt(f.world, f.boss, 'h', 'test', 999999, f.config, {
      critChance: 0,
      critMultiplier: 1,
    });
    const gold = f.hero.gold;
    expect(gold).toBe(240);
    f.step(1800);
    expect(f.hero.gold).toBe(gold);
    expect(f.hero.bossLoot ?? []).toHaveLength(0);
    expect(f.encounter.phase).toBe('dead');
    expect(
      f.encounter.pillars.size +
        f.encounter.projectiles.size +
        f.encounter.pools.size +
        f.encounter.marks.size,
    ).toBe(0);
    expect(f.world.creeps.has(f.encounter.bossId)).toBe(false);
  });
  it('ordered wave10 hook does not invent Dong Ta completion or alter180s clock', () => {
    const f = fixture(),
      e = new TayDocEncounter(tayDocDefinition),
      gate = new TayDocGate();
    gate.step(f.world, f.config, 10, e);
    expect(e.phase).toBe('waiting');
    gate.completeChapter('dong_ta');
    gate.step(f.world, f.config, 9, e);
    expect(e.phase).toBe('waiting');
    gate.step(f.world, f.config, 10, e);
    f.world.tick += tayDocDefinition.gateRest;
    gate.step(f.world, f.config, 10, e);
    expect(e.phase).toBe('enter');
    expect(gate.spawned).toBe(true);
    const m = new DungeonMatch(
      m1Config,
      creepDungeon,
      42,
      createInvasionDefinition(),
      [],
      tayDocDefinition,
    );
    expect(m.invasion?.definition.intervalTicks).toBe(5400);
  });
  it('sweeps a fast shot through a hero, stops at walls, and expires at exact configured range', () => {
    const f = fixture();
    f.hero.x = 680;
    f.hero.y = 650;
    const shot = {
      id: 'fast',
      ability: 'tay_doc_gas' as const,
      ownerId: f.boss.id,
      x: 600,
      y: 650,
      vx: 6000,
      vy: 0,
      remaining: 500,
      radius: 3,
      damage: 10,
      poison: false,
      slow: false,
      startedAt: 0,
    };
    f.encounter.projectiles.set(shot.id, shot);
    const hp = f.hero.hp;
    f.step(1);
    expect(f.hero.hp).toBeLessThan(hp);
    expect(f.encounter.projectiles.size).toBe(0);
    f.config.collision.push({ x: 630, y: 600, width: 10, height: 100 });
    f.encounter.projectiles.set('wall', { ...shot, id: 'wall' });
    const hp2 = f.hero.hp;
    f.step(1);
    expect(f.hero.hp).toBe(hp2);
    expect(f.encounter.projectiles.size).toBe(0);
    f.config.collision.length = 0;
    f.hero.x = 100;
    f.hero.y = 100;
    f.encounter.projectiles.set('range', {
      ...shot,
      id: 'range',
      vx: 130.05,
      remaining: 484.5,
    });
    f.step(111);
    expect(f.encounter.projectiles.has('range')).toBe(true);
    f.step(1);
    expect(f.encounter.projectiles.has('range')).toBe(false);
  });
  it('unavoidable curse bypasses evasion/counter and remains exact for fractional maxHP, including lethal travel', () => {
    const f = fixture();
    f.hero.maxHp = 403;
    f.hero.hp = 200;
    f.hero.statuses = [
      {
        kind: 'dash_guard',
        magnitude: 1,
        durationTicks: 500,
        until: 500,
        sourceId: 'h',
        abilityId: 'dash',
      },
      {
        kind: 'guard_counter',
        magnitude: 1,
        durationTicks: 500,
        until: 500,
        sourceId: 'h',
        abilityId: 'guard',
      },
    ];
    f.encounter.marks.set('h', {
      id: 'fraction',
      targetId: 'h',
      at: 0,
      until: 1,
    });
    const bossHp = f.boss.hp;
    f.step(1);
    expect(f.hero.hp).toBe(99.25);
    expect(f.boss.hp).toBe(bossHp);
    const m = new DungeonMatch(
        m1Config,
        creepDungeon,
        42,
        undefined,
        [],
        tayDocDefinition,
      ),
      h = m.add('travel', 'Travel');
    h.hp = 1;
    m.tayDoc!.spawn(m.arena.world, m.arena.config);
    m.tayDoc!.marks.set(h.id, {
      id: 'lethal',
      targetId: h.id,
      at: 0,
      until: 100,
    });
    expect(m.enter(h.id, 'private')).toContain('Độc nổ');
    expect(m.zoneOf(h.id)?.access).toBe('arena');
    expect(h.hp).toBe(0);
    expect(m.tayDoc!.marks.size).toBe(0);
  });
  it('gate waits for living invasion and rest, spawns once while later invasion clock continues', () => {
    const f = fixture(),
      e = new TayDocEncounter(tayDocDefinition),
      gate = new TayDocGate();
    gate.completeChapter('dong_ta');
    f.boss.invasion = {
      wave: 10,
      lane: 'west',
      targetId: '',
      chaseOrigin: { x: 0, y: 0 },
      reacquireAt: 0,
      chaseRange: 200,
      aggroRestTicks: 30,
    };
    gate.step(f.world, f.config, 10, e);
    expect(gate.readyAt).toBeUndefined();
    f.boss.hp = 0;
    gate.step(f.world, f.config, 10, e);
    const at = gate.readyAt!;
    f.world.tick = at - 1;
    gate.step(f.world, f.config, 11, e);
    expect(e.phase).toBe('waiting');
    f.world.tick = at;
    gate.step(f.world, f.config, 11, e);
    expect(e.phase).toBe('enter');
    const original = f.world.creeps.get(e.bossId);
    gate.step(f.world, f.config, 12, e);
    expect(f.world.creeps.get(e.bossId)).toBe(original);
  });
  it('match defeat disposes actor, summons, hazards and statuses without rewards', () => {
    const m = new DungeonMatch(
        m1Config,
        creepDungeon,
        42,
        createInvasionDefinition(),
        [],
        tayDocDefinition,
      ),
      h = m.add('h', 'H'),
      e = m.tayDoc!,
      w = m.arena.world;
    e.spawn(w, m.arena.config);
    e.phase = 'phase1';
    e.begin(w, m.arena.config, 'hon_thien_phuc_long_chan', h);
    for (let i = 0; i < 28; i++) m.step();
    expect(e.pillars.size).toBe(6);
    e.marks.set(h.id, {
      id: 'defeat',
      targetId: h.id,
      at: w.tick,
      until: w.tick + 200,
    });
    w.statue!.hp = 0;
    m.step();
    expect(m.invasion!.defeated).toBe(true);
    expect(e.phase).toBe('dead');
    expect(w.creeps.has(e.bossId)).toBe(false);
    expect(
      e.pillars.size +
        e.projectiles.size +
        e.pools.size +
        e.marks.size +
        e.poisons.size,
    ).toBe(0);
    expect(h.gold).toBe(0);
    const hp = h.hp;
    for (let i = 0; i < 200; i++) m.step();
    expect(h.hp).toBe(hp);
  });
  it('respects stun, disarm, silence and slow without turning Cam Long into a movement root', () => {
    const f = fixture();
    f.hero.x = 1000;
    f.boss.statuses = [
      {
        kind: 'silence',
        magnitude: 1,
        durationTicks: 100,
        until: 100,
        sourceId: 'h',
        abilityId: 'cam_long_cong',
      },
      {
        kind: 'disarm',
        magnitude: 1,
        durationTicks: 100,
        until: 100,
        sourceId: 'h',
        abilityId: 'cam_long_cong',
      },
      {
        kind: 'slow',
        magnitude: 0.5,
        durationTicks: 100,
        until: 100,
        sourceId: 'h',
        abilityId: 'slow',
      },
    ];
    expect(f.encounter.begin(f.world, f.config, 'tay_doc_staff', f.hero)).toBe(
      false,
    );
    expect(
      f.encounter.begin(f.world, f.config, 'van_doc_phi_cham', f.hero),
    ).toBe(false);
    f.encounter.nextActionAt = 0;
    const x = f.boss.x;
    f.step(1);
    expect(f.boss.x - x).toBeCloseTo(tayDocDefinition.speed / 60);
    f.boss.statuses.push({
      kind: 'stun',
      magnitude: 1,
      durationTicks: 20,
      until: 20,
      sourceId: 'h',
      abilityId: 'test',
    });
    const x2 = f.boss.x;
    f.step(2);
    expect(f.boss.x).toBe(x2);
    f.boss.statuses = [];
    expect(f.encounter.begin(f.world, f.config, 'tay_doc_staff', f.hero)).toBe(
      true,
    );
    f.boss.statuses = [
      {
        kind: 'stun',
        magnitude: 1,
        durationTicks: 100,
        until: 100,
        sourceId: 'h',
        abilityId: 'test',
      },
    ];
    f.step(25);
    expect(f.encounter.cast?.fired).toBe(true);
  });
});
