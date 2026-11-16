import { describe, expect, it } from 'vitest';
import {
  characterStats,
  DungeonMatch,
  hasStatus,
  type BossAbilityId,
} from '@volam/game-core';
import { applyStatus } from '../packages/game-core/src/status.js';
import {
  m1Config,
  creepCombatDefinition,
  creepDungeon,
  coMoDungeon,
  lyMacSauEncounter,
} from '@volam/game-data';

function setup(count = 1, access: 'shared' | 'private' = 'shared', seed = 42) {
  const base = structuredClone(m1Config);
  base.critChance = 0;
  const match = new DungeonMatch(base, creepDungeon, seed, undefined, [
    structuredClone(coMoDungeon),
  ]);
  for (let i = 0; i < count; i++) {
    match.add('p' + i, 'P' + i);
    expect(match.enter('p' + i, access, 'co_mo')).toBeUndefined();
  }
  const zone = match.zoneOf('p0')!;
  const boss = zone.world.creeps.get(zone.world.boss!.actorId)!;
  for (const [i, h] of [...zone.world.heroes.values()].entries()) {
    h.x = 850 + i * 30;
    h.y = 448;
    h.hp = h.maxHp = 10000;
  }
  return { match, zone, boss };
}
function step(match: DungeonMatch, n: number) {
  for (let i = 0; i < n; i++) match.step();
}
function cast(f: ReturnType<typeof setup>, id: BossAbilityId) {
  const runtime = f.zone.world.boss!;
  runtime.cast = undefined;
  runtime.cooldowns = {}; // Isolate geometry/summon tests from real configured cadence.
  runtime.nextActionAt = f.zone.world.tick;
  runtime.rotation = lyMacSauEncounter.rotation.indexOf(id);
  if (id === 'ly_mac_sau_basic') {
    runtime.nextActionAt = Infinity;
    f.zone.world.heroes.get('p0')!.x = f.boss.x + 50;
    f.boss.cooldown = 0;
  }
  if (id === 'phat_tran_cong')
    f.zone.world.heroes.get('p0')!.x = f.boss.x + 100;
  f.match.step();
  expect(f.zone.world.boss!.cast?.id).toBe(id);
  return f.zone.world.boss!.cast!;
}
function exit(match: DungeonMatch, id: string) {
  Object.assign(match.hero(id)!, coMoDungeon.exit);
  expect(match.exit(id)).toBeUndefined();
}

describe('Lý Mạc Sầu deterministic encounter', () => {
  it('keeps the aspect ratio and uses 90% of the last reduced arena area', () => {
    const previous = { width: 1408, height: 1056 };
    expect(coMoDungeon.width / coMoDungeon.height).toBeCloseTo(
      previous.width / previous.height,
    );
    expect(coMoDungeon.width * coMoDungeon.height).toBeCloseTo(
      previous.width * previous.height * 0.8 * 0.9,
    );
  });
  it('uses a ready ranged special when the next sweep is out of reach', () => {
    const f = setup();
    const runtime = f.zone.world.boss!;
    Object.assign(f.match.hero('p0')!, { x: f.boss.x + 220, y: f.boss.y });
    runtime.rotation = lyMacSauEncounter.rotation.indexOf('phat_tran_cong');
    runtime.nextActionAt = 0;
    runtime.cooldowns = { bang_phach_ngan_cham: 120 };
    f.boss.cooldown = 120;
    f.match.step();
    expect(runtime.cast?.id).toBe('xich_luyen_chuong');
    expect(f.zone.world.projectiles.size).toBe(0);
  });
  it('settles a finishing burn in the same tick, without delaying or duplicating the item', () => {
    const f = setup();
    f.boss.hp = 1;
    f.boss.hits.p0 = 0;
    f.boss.burnSource = 'p0';
    f.boss.burnDamage = 2;
    f.boss.burnNext = 1;
    f.boss.burnUntil = 30;
    f.match.step();
    expect(f.boss.hp).toBe(0);
    expect(f.match.hero('p0')!.bossLoot).toHaveLength(1);
    f.match.step();
    expect(f.match.hero('p0')!.bossLoot).toHaveLength(1);
  });
  it('keeps boss strength fixed for one/six players and normalizes every boss entry to shared', () => {
    const solo = setup(),
      party = setup(6),
      privateParty = setup(2, 'private');
    expect(solo.boss.maxHp).toBe(party.boss.maxHp);
    expect(party.zone.world.heroes.size).toBe(6);
    expect(privateParty.match.zoneOf('p1')!.world).toBe(
      privateParty.zone.world,
    );
    expect(privateParty.match.enter('p1', 'shared', 'unknown')).toBeTruthy();
    expect(solo.match.zoneOf('p0')!.id).toBe('co_mo_shared');
  });
  it('telegraphs before release and fires exactly one needle at a locked player without homing', () => {
    const f = setup(2);
    const c = cast(f, 'bang_phach_ngan_cham');
    expect(f.zone.world.projectiles.size).toBe(0);
    step(f.match, c.releaseAt - f.zone.world.tick - 1);
    expect(f.zone.world.projectiles.size).toBe(0);
    f.match.step();
    expect(f.zone.world.projectiles.size).toBe(1);
    const shot = [...f.zone.world.projectiles.values()][0]!;
    expect(shot.targetId).toBe('p0');
    const initial = { vx: shot.vx, vy: shot.vy };
    const p = f.match.hero('p0')!;
    p.y += 150;
    step(f.match, 8);
    expect(shot.vx).toBe(initial.vx);
    expect(shot.vy).toBe(initial.vy);
    expect(f.match.hero('p1')!.hp).toBe(10000);
    step(f.match, 70);
    expect(
      [...f.zone.world.projectiles.values()].filter((s) => s.id === shot.id),
    ).toHaveLength(0);
  });
  it('releases eight equal-range radial palms and never targets creeps or the statue', () => {
    const f = setup();
    const c = cast(f, 'xich_luyen_chuong');
    step(f.match, c.releaseAt - f.zone.world.tick);
    const shots = [...f.zone.world.projectiles.values()];
    expect(shots).toHaveLength(8);
    expect(
      new Set(shots.map((s) => Math.atan2(s.vy, s.vx).toFixed(4))).size,
    ).toBe(8);
    expect(
      shots.every(
        (s) => s.hostile && s.remaining === 620 && s.rawDamage === 18,
      ),
    ).toBe(true);
    const hp = f.boss.hp;
    step(f.match, 10);
    expect(f.boss.hp).toBe(hp);
  });
  it('stuns only a landed frontal sweep for 0.6 seconds after its warning', () => {
    const f = setup(3);
    const a = f.match.hero('p0')!,
      b = f.match.hero('p1')!,
      outside = f.match.hero('p2')!;
    Object.assign(a, { x: f.boss.x + 90, y: f.boss.y });
    Object.assign(b, { x: f.boss.x - 80, y: f.boss.y });
    Object.assign(outside, { x: f.boss.x, y: f.boss.y + 200 });
    const c = cast(f, 'phat_tran_cong');
    c.fx = 1;
    c.fy = 0;
    step(f.match, c.releaseAt - f.zone.world.tick - 1);
    expect(hasStatus(a, 'stun', f.zone.world.tick)).toBe(false);
    f.match.step();
    expect(a.hp).toBeLessThan(10000);
    expect(b.hp).toBe(10000);
    expect(outside.hp).toBe(10000);
    expect(a.statuses).toContainEqual(
      expect.objectContaining({
        kind: 'stun',
        abilityId: 'phat_tran_cong',
        until: c.releaseAt + 18,
      }),
    );
    expect(b.statuses).toEqual([]);
    expect(outside.statuses).toEqual([]);
  });
  it.each([
    [0, 4],
    [0.5, 6],
    [0.99, 8],
  ])(
    'draws ranged summons with RNG %s, caps/replaces and expires without rewards',
    (rng, count) => {
      const f = setup();
      f.zone.world.random = () => rng!;
      const hero = f.match.hero('p0')!;
      const spawn = lyMacSauEncounter.summonSpawns[0]!;
      Object.assign(hero, { x: spawn.x + 60, y: spawn.y });
      const c = cast(f, 'co_mo_kiem_phap');
      step(f.match, c.releaseAt - f.zone.world.tick);
      const summons = () =>
        [...f.zone.world.creeps.values()].filter((c) => c.summonedBy);
      expect(summons()).toHaveLength(count!);
      expect(
        summons().every(
          (c) =>
            c.archetypeId === 'co_mo_am_binh' &&
            c.maxHp === 240 &&
            c.stats!.xp === 0 &&
            !!c.rangedAttack,
        ),
      ).toBe(true);
      const summon = summons()[0]!;
      expect(summon.pose).toBe('basic_attack');
      expect([...f.zone.world.projectiles.values()]).toContainEqual(
        expect.objectContaining({
          ownerId: summon.id,
          abilityId: 'co_mo_minion_needle',
        }),
      );
      step(f.match, 9);
      expect(hero.hp).toBeLessThan(10000);
      expect(hero.statuses).toContainEqual(
        expect.objectContaining({
          abilityId: 'co_mo_minion_needle',
          kind: 'slow',
          magnitude: 0.6,
          durationTicks: 45,
        }),
      );
      hero.x = 1000;
      hero.y = 700;
      const second = cast(f, 'co_mo_kiem_phap');
      step(f.match, second.releaseAt - f.zone.world.tick);
      expect(summons()).toHaveLength(count!);
      f.zone.world.boss!.nextActionAt = Infinity;
      f.zone.world.boss!.cast = undefined;
      step(f.match, lyMacSauEncounter.summonLifetimeTicks + 1);
      expect(summons()).toHaveLength(0);
    },
  );
  it('fires three inward lanes from each of four authoritative arena boundaries', () => {
    const f = setup();
    const c = cast(f, 'ngu_doc_chuong');
    step(f.match, c.releaseAt - f.zone.world.tick);
    const shots = [...f.zone.world.projectiles.values()];
    expect(shots).toHaveLength(12);
    for (const p of lyMacSauEncounter.edgeEmitters)
      expect(
        shots.some(
          (s) =>
            s.x === p.x &&
            s.y === p.y &&
            Math.sign(s.vx) === p.fx &&
            Math.sign(s.vy) === p.fy,
        ),
      ).toBe(true);
  });
  it('slows on both Ngân châm and Tam châm hits with the production creep profile', () => {
    const f = setup();
    f.zone.config.creepCombat = creepCombatDefinition;
    f.zone.world.random = () => 0;
    const target = f.match.hero('p0')!;
    const spawn = lyMacSauEncounter.summonSpawns[0]!;
    Object.assign(target, { x: spawn.x + 60, y: spawn.y });
    const c = cast(f, 'co_mo_kiem_phap');
    step(f.match, c.releaseAt - f.zone.world.tick);
    f.zone.world.boss!.nextActionAt = Infinity;
    f.boss.cooldown = Infinity;
    const observed = new Set<string>();
    for (let i = 0; i < 180; i++) {
      f.match.step();
      for (const status of target.statuses ?? [])
        if (
          status.kind === 'slow' &&
          status.magnitude === 0.6 &&
          status.durationTicks === 45
        )
          observed.add(status.abilityId);
    }
    expect(observed).toEqual(
      new Set(['creep_co_mo_am_binh_basic', 'creep_co_mo_am_binh_special']),
    );
  });
  it.each([false, true])(
    'applies Ngũ Độc Chưởng slow only on a damaging projectile hit (invulnerable: %s)',
    (invulnerable) => {
      const f = setup(2);
      const target = f.match.hero('p0')!;
      const outsideLane = f.match.hero('p1')!;
      const west = lyMacSauEncounter.edgeEmitters.find((p) => p.fx === 1)!;
      Object.assign(target, { x: west.x + 65, y: west.y, invulnerable });
      Object.assign(outsideLane, { x: west.x + 65, y: west.y + 50 });
      const speed = characterStats(target, f.zone.config).total.movementSpeed;
      const c = cast(f, 'ngu_doc_chuong');
      step(f.match, c.releaseAt - f.zone.world.tick);
      expect(hasStatus(target, 'slow', f.zone.world.tick)).toBe(false);
      step(f.match, 10);
      expect(hasStatus(outsideLane, 'slow', f.zone.world.tick)).toBe(false);
      if (invulnerable) {
        expect(target.hp).toBe(10000);
        expect(hasStatus(target, 'slow', f.zone.world.tick)).toBe(false);
        return;
      }
      expect(target.hp).toBeLessThan(10000);
      const slow = target.statuses!.find((s) => s.kind === 'slow')!;
      expect(slow).toMatchObject({
        abilityId: 'ngu_doc_chuong',
        magnitude: 0.7,
        durationTicks: 60,
      });
      expect(
        characterStats(target, f.zone.config, f.zone.world.tick).total
          .movementSpeed,
      ).toBeCloseTo(speed * 0.3);
      f.zone.world.boss!.nextActionAt = Infinity;
      f.boss.cooldown = Infinity;
      step(f.match, slow.until - f.zone.world.tick);
      expect(hasStatus(target, 'slow', f.zone.world.tick)).toBe(false);
    },
  );
  it('shows a manual basic attack during the hurt window of a real Ngũ Độc Chưởng hit', () => {
    const f = setup();
    const hero = f.match.hero('p0')!;
    const west = lyMacSauEncounter.edgeEmitters.find((p) => p.fx === 1)!;
    Object.assign(hero, { x: west.x + 65, y: west.y, fx: 1, fy: 0 });
    Object.assign(f.boss, { x: hero.x + 65, y: hero.y });
    const palm = cast(f, 'ngu_doc_chuong');
    step(f.match, palm.releaseAt - f.zone.world.tick);
    for (let i = 0; i < 15 && !hasStatus(hero, 'slow', f.zone.world.tick); i++)
      f.match.step();
    expect(hasStatus(hero, 'slow', f.zone.world.tick)).toBe(true);
    expect(hero.hurtUntil).toBeGreaterThan(f.zone.world.tick + 1);
    const hp = f.boss.hp;
    expect(f.match.input(hero.id, 1, { kind: 'basic' })).toBeUndefined();
    f.match.step();
    expect(f.match.events.map(({ event }) => event)).toContainEqual(
      expect.objectContaining({ kind: 'attack', sourceId: hero.id }),
    );
    expect(f.boss.hp).toBeLessThan(hp);
    expect(hero.pose).toBe('basic_attack');
  });
  it('automatically attacks a boss in range in the absence of regular creeps', () => {
    const f = setup();
    const hero = f.match.hero('p0')!;
    Object.assign(hero, { x: f.boss.x + 65, y: f.boss.y, fx: 1, fy: 0 });
    const hp = f.boss.hp;
    expect(
      f.match.input(hero.id, 1, { kind: 'auto-basic', enabled: true }),
    ).toBeUndefined();
    f.match.step();
    expect(f.match.events.map(({ event }) => event)).toContainEqual(
      expect.objectContaining({ kind: 'attack', sourceId: hero.id }),
    );
    expect(f.boss.hp).toBeLessThan(hp);
  });
  it('resists control while preserving damage and cancels cast when its selected target leaves', () => {
    const f = setup();
    applyStatus(
      f.boss,
      { kind: 'stun', durationTicks: 100, magnitude: 1 },
      'p0',
      'test',
      0,
    );
    expect(f.boss.statuses![0]!.until).toBe(20);
    f.boss.statuses = [];
    const c = cast(f, 'bang_phach_ngan_cham');
    exit(f.match, 'p0');
    f.match.add('p1', 'P1');
    f.match.enter('p1', 'shared', 'co_mo');
    step(f.match, c.releaseAt - f.zone.world.tick);
    expect(f.zone.world.projectiles.size).toBe(0);
  });
  it('resets HP/position at exactly 30 empty seconds; reentry at 29 seconds cancels reset', () => {
    const f = setup();
    f.boss.hp = 100;
    f.boss.x = 500;
    exit(f.match, 'p0');
    step(f.match, 30 * 30 - 1);
    expect(f.boss.hp).toBe(100);
    f.match.step();
    const reset = f.zone.world.creeps.get('boss_ly_mac_sau')!;
    expect(reset.hp).toBe(reset.maxHp);
    expect(reset.x).toBe(lyMacSauEncounter.spawn.x);
    f.match.enter('p0', 'shared', 'co_mo');
    reset.hp = 99;
    exit(f.match, 'p0');
    step(f.match, 29 * 30);
    f.match.enter('p0', 'shared', 'co_mo');
    f.match.step();
    expect(reset.hp).toBe(99);
  });
  it('awards one reproducible rolled pending item per kill, clears summons/projectiles, and respawns only after its cooldown', () => {
    const kill = (seed: number) => {
      const f = setup(2, 'shared', seed);
      f.boss.hp = 1;
      f.boss.hits.p1 = f.zone.world.tick;
      const hero = f.match.hero('p0')!;
      Object.assign(hero, { x: f.boss.x - 24, y: f.boss.y, fx: 1, fy: 0 });
      f.match.input('p0', 1, { kind: 'basic' });
      f.match.step();
      expect(f.boss.hp).toBe(0);
      const claims = [...f.zone.world.heroes.values()].flatMap(
        (h) => h.bossLoot ?? [],
      );
      expect(claims).toHaveLength(1);
      expect(claims[0]!.rolls).toHaveLength(2);
      expect(f.zone.world.projectiles.size).toBe(0);
      step(f.match, lyMacSauEncounter.respawnTicks - 1);
      expect(f.boss.hp).toBe(0);
      f.match.step();
      expect(f.zone.world.creeps.get(f.boss.id)!.hp).toBe(1800);
      expect(
        [...f.zone.world.heroes.values()].flatMap((h) => h.bossLoot ?? []),
      ).toHaveLength(1);
      return claims;
    };
    expect(kill(42)).toEqual(kill(42));
  });
});
