import { describe, it, expect } from 'vitest';
import {
  createWorld,
  blocked,
  addHero,
  stepWorld,
  DungeonMatch,
  spawnChu,
  chuLootAction,
  chuItemAction,
  chuHandContact,
  chuFields,
  chuWaves,
  chuView,
  CHU_BOSS_ID,
  type ChuPhase,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  chuBaThongDungeon,
  chuBaThongTuning,
  hongLietDungeon,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { applyStatus } from '../packages/game-core/src/status.js';
import {
  dungeonActionSchema,
  bossLootActionSchema,
  PROTOCOL_VERSION,
} from '@volam/game-protocol';
const config = () => ({
  ...structuredClone(m1Config),
  creepSpawns: [],
  critChance: 0,
  creepRespawn: false,
  width: chuBaThongDungeon.width,
  height: chuBaThongDungeon.height,
  collision: structuredClone(chuBaThongDungeon.collision),
  spawn: chuBaThongDungeon.spawn,
});
function setup(n = 1) {
  const c = config(),
    w = createWorld(c, 42);
  for (let i = 0; i < n; i++) {
    const h = addHero(w, 'h' + i, 'h' + i, c);
    h.x = 640 + i * 100;
    h.y = 550;
    h.hp = h.maxHp = 10000;
  }
  spawnChu(w, c, structuredClone(chuBaThongTuning));
  return { c, w, b: w.creeps.get(CHU_BOSS_ID)!, h: w.heroes.get('h0')! };
}
function phase(f: ReturnType<typeof setup>, p: ChuPhase) {
  const s = f.w.chu!,
    i = s.definition.phases.findIndex((v) => v.id === p);
  s.phaseIndex =
    (i + s.definition.phases.length - 1) % s.definition.phases.length;
  s.until = f.w.tick;
  stepWorld(f.w, f.c);
}
function steps(f: ReturnType<typeof setup>, n: number) {
  for (let i = 0; i < n; i++) stepWorld(f.w, f.c);
}
describe('Chu Bá Thông authoritative encounter', () => {
  it('validates entry payloads and does not accept damage/coordinates/loot results', () => {
    const base = {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      action: 'enter',
      access: 'private',
      destination: 'chu_ba_thong',
    };
    expect(dungeonActionSchema.safeParse(base).success).toBe(true);
    expect(dungeonActionSchema.safeParse({ ...base, x: 1 }).success).toBe(
      false,
    );
    expect(
      bossLootActionSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 2,
        action: 'roll',
        lootId: 1,
        roll: 100,
      }).success,
    ).toBe(false);
  });
  it('keeps boss power fixed and enforces one shared boss even for legacy private requests', () => {
    const m = new DungeonMatch(config(), creepDungeon, 42, undefined, [
      chuBaThongDungeon,
    ]);
    for (const id of ['a', 'b', 'c']) m.add(id, id);
    expect(m.enter('a', 'private', 'chu_ba_thong')).toBeUndefined();
    expect(m.enter('b', 'shared', 'chu_ba_thong')).toBeUndefined();
    expect(m.enter('c', 'shared', 'chu_ba_thong')).toBeUndefined();
    const a = m.zoneOf('a')!,
      b = m.zoneOf('b')!;
    expect(a).toBe(b);
    expect(b).toBe(m.zoneOf('c'));
    expect(a.world.creeps.size).toBe(1);
    expect(a.world.creeps.get(CHU_BOSS_ID)!.maxHp).toBe(
      b.world.creeps.get(CHU_BOSS_ID)!.maxHp,
    );
  });
  it('keeps both boss controllers and ordinary dungeon waves independent in one match', () => {
    const m = new DungeonMatch(config(), creepDungeon, 42, undefined, [
      chuBaThongDungeon,
      hongLietDungeon,
    ]);
    for (const id of ['chu', 'hong', 'forest']) m.add(id, id);
    expect(m.enter('chu', 'private', 'chu_ba_thong')).toBeUndefined();
    expect(m.enter('hong', 'private', 'hong_liet')).toBeUndefined();
    expect(m.enter('forest', 'shared', 'forest')).toBeUndefined();
    const chu = m.zoneOf('chu')!,
      hong = m.zoneOf('hong')!,
      forest = m.zoneOf('forest')!;
    expect(chu.world.chu).toBeDefined();
    expect(chu.encounter).toBeUndefined();
    expect(hong.encounter).toBeDefined();
    expect(hong.world.chu).toBeUndefined();
    expect(forest.encounter).toBeUndefined();
    expect(forest.world.chu).toBeUndefined();
    chu.world.creeps.get(CHU_BOSS_ID)!.hp = 123;
    hong.world.creeps.get(hong.encounter!.bossId)!.hp = 456;
    for (const id of ['chu', 'hong']) {
      const zone = m.zoneOf(id)!;
      Object.assign(m.hero(id)!, zone.dungeon!.exit);
      expect(m.exit(id)).toBeUndefined();
    }
    for (let i = 0; i < 902; i++) m.step();
    expect(chu.world.creeps.size).toBe(1);
    expect(chu.world.creeps.get(CHU_BOSS_ID)!.hp).toBe(chuBaThongTuning.hp);
    expect(hong.world.creeps.get(hong.encounter!.bossId)!.hp).toBe(
      hongLietDungeon.boss!.hp,
    );
    expect(chu.nextWaveAt).toBeUndefined();
    expect(hong.nextWaveAt).toBeUndefined();
    expect(forest.world.creeps.size).toBeGreaterThan(0);
    expect(chu.world.chu!.loot).toHaveLength(0);
  });
  it('places all six real entrance positions inside the Chu court without wall collisions', () => {
    const m = new DungeonMatch(config(), creepDungeon, 42, undefined, [
      chuBaThongDungeon,
    ]);
    for (let i = 0; i < 6; i++) {
      const id = 'entry' + i;
      m.add(id, id);
      expect(m.enter(id, 'shared', 'chu_ba_thong')).toBeUndefined();
      const z = m.zoneOf(id)!;
      expect(
        blocked(
          m.hero(id)!,
          z.config.radius,
          z.config.width,
          z.config.height,
          z.config.collision,
        ),
      ).toBe(false);
    }
    const heroes = [...m.zoneOf('entry0')!.world.heroes.values()];
    expect(new Set(heroes.map((h) => h.x + ',' + h.y)).size).toBe(6);
  });
  it('wind sweep hits directly beneath boss and has no feet blind spot', () => {
    const f = setup();
    f.h.x = f.b.x;
    f.h.y = f.b.y;
    phase(f, 'sweep');
    const hp = f.h.hp;
    steps(f, 15);
    expect(f.h.hp).toBeLessThan(hp);
  });
  it('alternating fists reach a ranged witness 300px in front, exclude distant side targets', () => {
    const f = setup(2);
    f.h.x = f.b.x;
    f.h.y = f.b.y + 300;
    const side = f.w.heroes.get('h1')!;
    side.x = 1000;
    side.y = f.b.y + 300;
    phase(f, 'fists');
    const hp = side.hp;
    steps(f, 15);
    expect(f.h.hp).toBeLessThan(10000);
    expect(side.hp).toBe(hp);
  });
  it('samples palm aim once and an actual moving player can dodge', () => {
    const f = setup();
    phase(f, 'palm');
    f.h.x += 40;
    steps(f, 15);
    const p = f.w.chu!.missiles[0]!;
    expect(p).toBeDefined();
    const velocity = { x: p.vx, y: p.vy };
    expect(f.b.fx).toBeCloseTo(p.vx / 300);
    expect(f.b.fy).toBeCloseTo(p.vy / 300);
    f.h.x += 160;
    steps(f, 15);
    expect(p.vx).toBe(velocity.x);
    expect(p.vy).toBe(velocity.y);
    expect(f.h.hp).toBe(10000);
  });
  it('gives hands a real warning, then travel/impact/dissipation; excludes transparent corners', () => {
    const f = setup();
    phase(f, 'hands');
    const hp = f.h.hp;
    steps(f, 10);
    expect(f.h.hp).toBe(hp);
    expect(chuView(f.w, f.c)!.hands[0]!.stage).toBe('warning');
    steps(f, 30);
    expect(chuView(f.w, f.c)!.hands[0]!.stage).toBe('travel');
    expect(
      chuHandContact(
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 15, y: 0 },
        1,
        0,
        1.2,
        10,
      ),
    ).toBe(true);
    expect(
      chuHandContact(
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 15, y: 110 },
        1,
        0,
        1.2,
        10,
      ),
    ).toBe(false);
    steps(f, 50);
    expect(f.h.hp).toBeLessThan(hp);
    expect(f.w.chu!.hands.every((h) => h.hitIds.length <= 1)).toBe(true);
  });
  it('confines the chosen player but permits movement inside the formation', () => {
    const f = setup(2);
    phase(f, 'trap');
    const trap = f.w.chu!.trap!,
      target = f.w.heroes.get(trap.targetId)!;
    target.moveX = 1;
    target.lastMoveTick = f.w.tick;
    steps(f, 5);
    expect(target.x).not.toBe(trap.x);
    target.x = 1000;
    steps(f, 1);
    expect(
      Math.hypot(target.x - trap.x, target.y - trap.y),
    ).toBeLessThanOrEqual(52.001);
    expect(trap.released).toBe(false);
  });
  it('rescues when all required players enter; solo is solvable immediately', () => {
    const solo = setup();
    phase(solo, 'trap');
    expect(solo.w.chu!.trap!.released).toBe(true);
    const f = setup(3);
    phase(f, 'trap');
    const tr = f.w.chu!.trap!;
    for (const h of f.w.heroes.values()) {
      h.x = tr.x;
      h.y = tr.y;
    }
    steps(f, 1);
    expect(tr.released).toBe(true);
    expect(tr.reason).toBe('rescued');
  });
  it('death/departure do not softlock rescue and late entrants do not change cast requirements', () => {
    const f = setup(3);
    phase(f, 'trap');
    const tr = f.w.chu!.trap!,
      target = f.w.heroes.get(tr.targetId)!;
    const other = [...f.w.heroes.values()].filter((h) => h !== target);
    f.w.heroes.delete(other[0]!.id);
    other[1]!.hp = 0;
    addHero(f.w, 'late', 'late', f.c);
    steps(f, 1);
    expect(tr.released).toBe(true);
    expect(tr.required).toEqual([target.id]);
  });
  it('releases after exactly 30 seconds even without a rescue', () => {
    const f = setup(2);
    phase(f, 'trap');
    const tr = f.w.chu!.trap!;
    steps(f, 899);
    expect(tr.released).toBe(false);
    steps(f, 1);
    expect(tr.released).toBe(true);
    expect(tr.reason).toBe('timeout');
  });
  it('spins quickly through swept contact, damages around body, and stays inside court', () => {
    const f = setup();
    phase(f, 'spin');
    f.h.x = f.b.x + 70;
    f.h.y = f.b.y;
    const start = { x: f.b.x, y: f.b.y };
    steps(f, 3);
    expect(Math.hypot(f.b.x - start.x, f.b.y - start.y)).toBeGreaterThan(60);
    expect(f.h.hp).toBeLessThan(10000);
    steps(f, 600);
    expect(f.b.x).toBeGreaterThanOrEqual(205);
    expect(f.b.x).toBeLessThanOrEqual(1075);
    expect(f.b.y).toBeLessThanOrEqual(570);
  });
  it('reflects exact actual boss HP loss once without second armor/crit or recursion', () => {
    const f = setup();
    phase(f, 'reflect');
    f.h.hp = f.h.maxHp = 10000;
    const hp = f.b.hp;
    hurt(f.w, f.b, f.h.id, 'test', 130, f.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    const loss = hp - f.b.hp;
    expect(loss).toBe(100);
    expect(10000 - f.h.hp).toBe(loss);
    expect(
      f.w.events.filter(
        (e) => e.abilityId === 'can_khon_phan_chan' && e.kind === 'hit',
      ),
    ).toHaveLength(1);
    const before = f.h.hp;
    hurt(f.w, f.b, f.h.id, 'reactive', 130, f.c, {
      critChance: 0,
      critMultiplier: 1,
      reactive: true,
    });
    expect(f.h.hp).toBe(before);
  });
  it('preserves player mana shield absorption on reflected damage and lets movement outrun pull', () => {
    const f = setup();
    phase(f, 'reflect');
    applyStatus(
      f.h,
      { kind: 'mana_shield', magnitude: 1, secondary: 1, durationTicks: 100 },
      f.h.id,
      'shield',
      f.w.tick,
    );
    f.h.mana = 200;
    const hp = f.h.hp;
    hurt(f.w, f.b, f.h.id, 'test', 130, f.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(f.h.hp).toBe(hp);
    expect(f.h.mana).toBe(100);
    f.h.x = f.b.x + 120;
    f.h.y = f.b.y;
    f.h.moveX = 1;
    f.h.lastMoveTick = f.w.tick;
    const x = f.h.x;
    steps(f, 5);
    expect(f.h.x).toBeGreaterThan(x);
  });
  it('moves every ultimate hazard and damages its server-owned field', () => {
    const a = chuFields(2),
      b = chuFields(2.2);
    expect(a.every((f, i) => f.x !== b[i]!.x || f.y !== b[i]!.y)).toBe(true);
    expect(chuWaves(2)).not.toEqual(chuWaves(2.2));
    const f = setup();
    phase(f, 'ultimate');
    for (let i = 0; i < 60; i++) {
      const point = chuFields(
        (f.w.tick - f.w.chu!.started + 1) / f.c.tickRate,
      )[0]!;
      f.h.x = point.x;
      f.h.y = point.y;
      stepWorld(f.w, f.c);
    }
    expect(f.h.hp).toBeLessThan(10000);
  });
  it('spawns exactly the current dungeon member count of independently positioned wine disciples', () => {
    for (let n = 1; n <= 6; n++) {
      const f = setup(n);
      phase(f, 'drink');
      const view = chuView(f.w, f.c)!;
      expect(view.disciples).toHaveLength(n);
      expect(new Set(view.disciples.map((p) => p.x + ',' + p.y)).size).toBe(n);
      steps(f, 200);
      expect(
        chuView(f.w, f.c)!.disciples.every((d) => d.tag === 'drop_wine'),
      ).toBe(true);
    }
  });
  it('awards one random item per death, presence/hit eligibility, rolls and no duplicate claim', () => {
    const f = setup(3);
    f.b.hits = { h0: 0, h1: 0 };
    f.b.hp = 1;
    hurt(f.w, f.b, 'h0', 'test', 100, f.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    steps(f, 1);
    const loot = f.w.chu!.loot[0]!;
    expect(f.w.chu!.loot).toHaveLength(1);
    expect(loot.eligible).toEqual(['h0', 'h1']);
    expect(f.w.heroes.get('h2')!.xp).toBe(0);
    expect(chuLootAction(f.w, 'h2', loot.id, 'roll')).toBeDefined();
    expect(chuLootAction(f.w, 'h0', loot.id, 'roll')).toBeUndefined();
    expect(chuLootAction(f.w, 'h0', loot.id, 'roll')).toBeDefined();
    expect(chuLootAction(f.w, 'h1', loot.id, 'pass')).toBeUndefined();
    expect(f.h.bossItems).toHaveLength(1);
    steps(f, 5);
    expect(f.h.bossItems).toHaveLength(1);
    expect(f.w.chu!.loot).toHaveLength(1);
    expect(f.h.xp).toBe(450);
  });
  it('owns duplicate item slots, server sell price, drop/pickup and single removal', () => {
    const f = setup();
    f.h.bossItems = ['toan_chan_tien_tuu', 'toan_chan_tien_tuu'];
    const item = chuBaThongTuning.loot[0]!;
    expect(chuItemAction(f.w, 'h0', 9, item.id, 'sell', item)).toBeDefined();
    expect(chuItemAction(f.w, 'h0', 0, item.id, 'drop', item)).toBeUndefined();
    expect(f.h.bossItems).toHaveLength(1);
    const loot = f.w.chu!.loot[0]!;
    expect(chuLootAction(f.w, 'h0', loot.id, 'pickup')).toBeUndefined();
    expect(chuLootAction(f.w, 'h0', loot.id, 'pickup')).toBeDefined();
    expect(f.h.bossItems).toHaveLength(2);
    const gold = f.h.gold;
    expect(chuItemAction(f.w, 'h0', 1, item.id, 'sell', item)).toBeUndefined();
    expect(f.h.gold - gold).toBe(item.sellGold);
  });
  it('resets living boss after 30 empty match-clock seconds and does not duplicate drops', () => {
    const m = new DungeonMatch(config(), creepDungeon, 42, undefined, [
      chuBaThongDungeon,
    ]);
    m.add('a', 'a');
    m.enter('a', 'private', 'chu_ba_thong');
    const z = m.zoneOf('a')!,
      boss = z.world.creeps.get(CHU_BOSS_ID)!;
    boss.hp = 123;
    Object.assign(m.hero('a')!, chuBaThongDungeon.exit);
    expect(m.exit('a')).toBeUndefined();
    for (let i = 0; i < 900; i++) m.step();
    expect(boss.hp).toBe(123);
    m.step();
    expect(z.world.creeps.get(CHU_BOSS_ID)!.hp).toBe(chuBaThongTuning.hp);
    expect(z.world.chu!.loot).toHaveLength(0);
  });
  it('respawns dead boss on its cooldown while empty, without using living reset rule', () => {
    const m = new DungeonMatch(config(), creepDungeon, 42, undefined, [
      chuBaThongDungeon,
    ]);
    m.add('a', 'a');
    m.enter('a', 'private', 'chu_ba_thong');
    const z = m.zoneOf('a')!;
    z.world.creeps.get(CHU_BOSS_ID)!.hp = 0;
    m.step();
    m.hero('a')!.x = 640;
    m.hero('a')!.y = 610;
    m.exit('a');
    for (let i = 0; i < 1349; i++) m.step();
    expect(z.world.creeps.get(CHU_BOSS_ID)!.hp).toBe(0);
    m.step();
    expect(z.world.creeps.get(CHU_BOSS_ID)!.hp).toBe(chuBaThongTuning.hp);
    expect(z.world.chu!.loot).toHaveLength(1);
  });
  it('resists stun/forced displacement and replay is deterministic for fixed seed', () => {
    const a = setup(2),
      b = setup(2);
    applyStatus(
      a.b,
      { kind: 'stun', magnitude: 1, durationTicks: 100 },
      'h0',
      'stun',
      0,
    );
    for (const kind of ['silence', 'disarm'] as const)
      applyStatus(
        a.b,
        { kind, magnitude: 1, durationTicks: 100 },
        'h0',
        kind,
        0,
      );
    expect(a.b.statuses ?? []).toHaveLength(0);
    for (const f of [a, b]) steps(f, 500);
    expect(chuView(a.w, a.c)).toEqual(chuView(b.w, b.c));
  });
});
