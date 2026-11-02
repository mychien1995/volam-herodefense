import { applyStatus } from '../packages/game-core/src/status.js';
import { describe, it, expect } from 'vitest';
import {
  createWorld,
  addHero,
  HongLietEncounter,
  DungeonMatch,
  blocked,
  hasStatus,
  type SimulationConfig,
  type HongLietAbility,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  hongLietDungeon as dungeon,
  validateHongLietDefinition,
  hongLietDefinition as definition,
} from '@volam/game-data';
import { dungeonActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
function setup(seed = 42) {
  const config: SimulationConfig = {
    ...structuredClone(m1Config),
    width: 1600,
    height: 1200,
    collision: [],
    creepRespawn: false,
    critChance: 0,
  };
  const world = createWorld(config, seed),
    encounter = new HongLietEncounter(structuredClone(definition));
  // Isolated mechanic fixture; production scaled map markers are tested separately.
  encounter.definition.spawn = { x: 640, y: 480 };
  encounter.initialize(world, config);
  const hero = addHero(world, 'hero', 'hero', config);
  hero.hp = hero.maxHp = 10000;
  Object.assign(hero, { x: 900, y: 480 });
  encounter.nextActionAt = Number.MAX_SAFE_INTEGER;
  const advance = (n: number) => {
    for (let i = 0; i < n; i++) {
      world.tick++;
      world.events = [];
      encounter.step(world, config);
      if (!encounter.cast) encounter.nextActionAt = Number.MAX_SAFE_INTEGER;
    }
  };
  const begin = (a: HongLietAbility, target = { x: 900, y: 480 }) => {
    encounter.begin(world, config, a, target);
    return encounter.cast!;
  };
  return {
    config,
    world,
    encounter,
    hero,
    advance,
    begin,
    boss: world.creeps.get(encounter.bossId)!,
  };
}
describe('Hong Liet authoritative v04', () => {
  it('A1 emits five simultaneous straight720-range blades from one centre; overlap dedups once per cast', () => {
    const s = setup(),
      c = s.begin('hong_liet_a1'),
      lines = [...s.encounter.effects.values()];
    expect(lines).toHaveLength(5);
    expect(
      lines.map((e) => Math.round((Math.atan2(e.fy, e.fx) * 180) / Math.PI)),
    ).toEqual([-36, -18, 0, 18, 36]);
    expect(
      lines.every(
        (e) =>
          e.length === 720 &&
          e.x === 640 &&
          e.activeAt === c.activeAt &&
          e.kind === 'projectile' &&
          e.speed === 600,
      ),
    ).toBe(true);
    Object.assign(s.hero, { x: 680, y: 480 });
    s.advance(c.activeAt - 1);
    expect(s.hero.hp).toBe(10000);
    s.hero.y = 481;
    s.advance(1);
    expect(
      s.world.events.filter(
        (e) => e.kind === 'hit' && e.targetId === s.hero.id,
      ),
    ).toHaveLength(1);
    expect(s.boss.fx).toBe(1);
    expect(s.boss.fy).toBe(0);
  });
  it.each([
    [-36, 719, true],
    [-18, 720, true],
    [0, 720, true],
    [18, 720, true],
    [36, 720, true],
    [0, 760, false],
    [0, -70, false],
  ] as const)(
    'A1 server boundary angle %s distance %s',
    (degrees, length, hit) => {
      const s = setup(),
        angle = (degrees * Math.PI) / 180;
      s.begin('hong_liet_a1');
      Object.assign(s.hero, {
        x: 640 + Math.cos(angle) * length,
        y: 480 + Math.sin(angle) * length,
      });
      s.advance(60);
      expect(s.hero.hp < 10000).toBe(hit);
    },
  );
  it.each([
    [180, 0, true],
    [0, 180, true],
    [0, -180, true],
    [-10, 0, false],
    [230, 0, true],
    [270, 0, false],
  ] as const)('A2 frontal 180 degrees offset %s,%s', (dx, dy, hit) => {
    const s = setup();
    s.begin('hong_liet_a2');
    Object.assign(s.hero, { x: 640 + dx, y: 480 + dy });
    s.advance(21);
    expect(s.hero.hp < 10000).toBe(hit);
  });
  it('telegraphs before stomp and applies server stun', () => {
    const s = setup();
    Object.assign(s.hero, { x: 800, y: 480 });
    const c = s.begin('dung_nham_liet_dia');
    s.advance(c.activeAt - 1);
    expect(s.hero.hp).toBe(10000);
    expect(hasStatus(s.hero, 'stun', s.world.tick)).toBe(false);
    s.advance(1);
    expect(s.hero.hp).toBeLessThan(10000);
    expect(hasStatus(s.hero, 'stun', s.world.tick)).toBe(true);
    applyStatus(
      s.boss,
      { kind: 'stun', durationTicks: 100, magnitude: 1 },
      'hero',
      'test',
      s.world.tick,
    );
    expect(s.boss.statuses!.at(-1)!.until - s.world.tick).toBe(20);
  });
  it('lava travels over 0.8 seconds, reveals only behind feet, collides and ticks across re-entry until expiry', () => {
    const s = setup();
    s.config.collision = [{ x: 900, y: 200, width: 40, height: 800 }];
    const c = s.begin('liet_diem_phong_toa');
    const lane = () =>
      [...s.encounter.effects.values()].find((e) => e.kind === 'lava')!;
    expect(c.dashLength).toBeLessThan(260);
    Object.assign(s.hero, { x: 850, y: 480 });
    s.advance(c.activeAt);
    expect(s.boss.x).toBeGreaterThan(640);
    expect(s.boss.x).toBeLessThan(660);
    expect(s.hero.hp).toBe(10000);
    expect(lane().length).toBeCloseTo(s.boss.x - 640);
    s.advance(definition.lavaDashTicks - 1);
    expect(s.boss.x).toBeLessThanOrEqual(878);
    expect(
      blocked(s.boss, 22, s.config.width, s.config.height, s.config.collision),
    ).toBe(false);
    Object.assign(s.hero, { x: 700, y: 480 });
    s.advance(15);
    const hp = s.hero.hp;
    expect(hp).toBeLessThan(10000);
    s.hero.y = 650;
    s.advance(30);
    expect(s.hero.hp).toBe(hp);
    s.hero.y = 480;
    s.advance(15);
    expect(s.hero.hp).toBeLessThan(hp);
    s.advance(420);
    expect(
      [...s.encounter.effects.values()].some((e) => e.kind === 'lava'),
    ).toBe(false);
  });
  it('volcano and meteor use deterministic warned points, meteor has more points/larger AOE and staggered waves', () => {
    const a = setup(17),
      b = setup(17);
    a.begin('van_ly_nham_hoa');
    b.begin('van_ly_nham_hoa');
    expect(
      [...a.encounter.effects.values()].map((e) => [e.x, e.y, e.activeAt]),
    ).toEqual(
      [...b.encounter.effects.values()].map((e) => [e.x, e.y, e.activeAt]),
    );
    const meteor = [...a.encounter.effects.values()];
    expect(meteor).toHaveLength(12);
    expect(new Set(meteor.map((e) => e.activeAt)).size).toBe(12);
    expect(meteor.every((e) => e.startedAt < e.activeAt)).toBe(true);
    const v = setup();
    v.begin('hoa_son_bao_phat');
    expect(v.encounter.effects.size).toBe(5);
    expect(meteor[0]!.radius).toBeGreaterThan(
      [...v.encounter.effects.values()][0]!.radius,
    );
  });
  it('16 cannons warn and fire both axes together, traverse whole field then drain before removal', () => {
    const s = setup(),
      c = s.begin('hoa_phao_thien_la');
    expect(
      [...s.encounter.effects.values()].filter((e) => e.kind === 'cannon'),
    ).toHaveLength(16);
    expect(
      new Set([...s.encounter.effects.values()].map((e) => e.activeAt)),
    ).toEqual(new Set([48]));
    s.hero.y = 100;
    s.advance(48);
    const shots = [...s.encounter.effects.values()].filter(
      (e) => e.kind === 'projectile',
    );
    expect(shots).toHaveLength(16);
    expect(shots.filter((e) => e.fx)).toHaveLength(8);
    expect(shots.filter((e) => e.fy)).toHaveLength(8);
    const first = shots.find((e) => e.fx === 1)!;
    const fx = first.fx,
      fy = first.fy;
    s.hero.x = 800;
    s.hero.y = 900;
    s.advance(39);
    expect(first.fx).toBe(fx);
    expect(first.fy).toBe(fy);
    expect(first.x).toBeGreaterThan(1000);
    const stop =
      c.activeAt + definition.abilities.hoa_phao_thien_la.durationTicks;
    s.advance(stop - s.world.tick);
    const ids = new Set(
      [...s.encounter.effects.values()]
        .filter((e) => e.kind === 'projectile')
        .map((e) => e.id),
    );
    expect(ids.size).toBeGreaterThan(0);
    s.advance(5);
    expect(
      [...s.encounter.effects.values()]
        .filter((e) => e.kind === 'projectile')
        .every((e) => ids.has(e.id)),
    ).toBe(true);
    expect(
      [...s.encounter.effects.values()].filter((e) => e.kind === 'cannon'),
    ).toHaveLength(16);
    s.advance(c.endsAt - s.world.tick);
    expect(s.encounter.effects.size).toBe(0);
  });
  it('summon cap/lifetimes, archer fixed heading and boss death cleanup', () => {
    const s = setup();
    for (const ability of [
      'hoa_tien_te_phat',
      'thiet_ky_trieu_binh',
      'hoa_tien_te_phat',
    ] as const) {
      const c = s.begin(ability);
      s.advance(c.endsAt - s.world.tick);
      s.encounter.nextActionAt = Number.MAX_SAFE_INTEGER;
    }
    expect(s.world.creeps.size).toBe(9);
    const arrow = [...s.encounter.effects.values()].find(
      (e) => e.ownerId !== s.boss.id && e.kind === 'projectile',
    );
    expect(arrow).toBeDefined();
    const aim = [arrow!.fx, arrow!.fy];
    s.hero.x = 400;
    s.hero.y = 900;
    s.advance(2);
    expect([arrow!.fx, arrow!.fy]).toEqual(aim);
    s.boss.hp = 0;
    s.advance(1);
    expect(s.encounter.effects.size).toBe(0);
    expect(s.world.creeps.size).toBe(1);
    s.advance(definition.respawnTicks);
    expect(s.boss.hp).toBe(0);
    expect(s.world.creeps.get(s.encounter.bossId)!.hp).toBe(definition.hp);
  });
  it('projectiles stop at walls before a hero behind them', () => {
    const s = setup();
    s.config.collision = [{ x: 225, y: 400, width: 4, height: 60 }];
    s.hero.x = 244;
    s.hero.y = 430;
    const c = s.begin('hoa_phao_thien_la');
    s.advance(c.activeAt);
    expect(s.hero.hp).toBe(10000);
  });
  it('fixed shared/private difficulty, empty30 reset and leaving/disconnect removes transient entities', () => {
    const match = new DungeonMatch(
      structuredClone(m1Config),
      creepDungeon,
      42,
      undefined,
      [dungeon],
    );
    const a = match.add('a', 'a');
    match.enter('a', 'shared', 'hong_liet');
    const z = match.zoneOf('a')!,
      e = z.encounter!,
      boss = z.world.creeps.get(e.bossId)!;
    boss.hp = 200;
    for (let i = 0; i < 5; i++) {
      const id = 'p' + i;
      match.add(id, id);
      match.enter(id, 'shared', 'hong_liet');
    }
    expect(boss.maxHp).toBe(definition.hp);
    expect(boss.archetypeId).toBe('hoan_nhan_hong_liet');
    for (const h of z.world.heroes.values())
      expect(
        blocked(
          h,
          m1Config.radius,
          dungeon.width,
          dungeon.height,
          dungeon.collision,
        ),
      ).toBe(false);
    e.begin(z.world, z.config, 'hoa_phao_thien_la', a);
    expect(e.effects.size).toBe(24);
    for (const id of [...z.world.heroes.keys()]) match.remove(id);
    expect(e.effects.size).toBe(0);
    for (let i = 0; i < 900; i++) match.step();
    expect(boss.hp).toBe(200);
    match.step();
    expect(z.world.creeps.get(e.bossId)!.hp).toBe(definition.hp);
    match.add('b', 'b');
    match.enter('b', 'private', 'hong_liet');
    expect(match.zoneOf('b')!.world.creeps.get(e.bossId)!.maxHp).toBe(
      definition.hp,
    );
    expect(
      dungeonActionSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        action: 'enter',
        destination: 'hong_liet',
        access: 'shared',
      }).success,
    ).toBe(true);
  });
  it('rejects invalid tuning and does not silently shrink the approved geometry', () => {
    const d = structuredClone(definition);
    d.abilities.hong_liet_a1.range = 599;
    expect(() => validateHongLietDefinition(d)).toThrow();
    const e = structuredClone(definition);
    e.cannonRows[1] = e.cannonRows[0]!;
    expect(() => validateHongLietDefinition(e)).toThrow();
  });
  it('reuses the fixed XP/gold assist pool once on death and resets without a second reward', () => {
    const m = new DungeonMatch(
      structuredClone(m1Config),
      creepDungeon,
      42,
      undefined,
      [dungeon],
    );
    const a = m.add('a', 'a'),
      b = m.add('b', 'b');
    m.enter('a', 'shared', 'hong_liet');
    m.enter('b', 'shared', 'hong_liet');
    const z = m.zoneOf('a')!,
      e = z.encounter!,
      boss = z.world.creeps.get(e.bossId)!;
    Object.assign(a, { x: boss.x - 30, y: boss.y, fx: 1, fy: 0 });
    Object.assign(b, { x: boss.x - 30, y: boss.y, fx: 1, fy: 0 });
    m.input('a', 1, { kind: 'basic' });
    m.step();
    expect(boss.hits.a).toBeDefined();
    boss.hp = 1;
    m.input('b', 1, { kind: 'basic' });
    m.step();
    expect(boss.hp).toBe(0);
    expect(a.xp + b.xp).toBe(definition.xp);
    expect(a.gold + b.gold).toBe(definition.gold);
    for (let i = 0; i < definition.respawnTicks + 2; i++) m.step();
    expect(a.gold + b.gold).toBe(definition.gold);
  });

  it('lava cooling remains visible for 1.6 seconds without further DOT', () => {
    const s = setup();
    s.begin('liet_diem_phong_toa');
    s.hero.y = 700;
    s.advance(361);
    const lane = [...s.encounter.effects.values()].find(
      (e) => e.kind === 'lava',
    )!;
    expect(lane).toBeDefined();
    expect(lane.damageUntil).toBe(360);
    s.hero.x = 700;
    s.hero.y = 480;
    const hp = s.hero.hp;
    s.advance(46);
    expect(s.hero.hp).toBe(hp);
    expect(s.encounter.effects.has(lane.id)).toBe(true);
    s.advance(1);
    expect(s.encounter.effects.has(lane.id)).toBe(false);
  });
});
