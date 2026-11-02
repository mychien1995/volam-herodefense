import { describe, it, expect } from 'vitest';
import {
  DungeonMatch,
  addCreep,
  insideEllipse,
  blocked,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  coMoDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  dongTaDefinitionSchema,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { displace } from '../packages/game-core/src/status.js';
import type { DongAbility } from '@volam/game-core';

function setup(players = 2, seed = 42) {
  const config = structuredClone(m1Config);
  config.creepSpawns = [];
  config.collision = [];
  config.critChance = 0;
  const d = structuredClone(dongTaDefinition);
  d.restTicks = 2;
  d.entryTicks = 3;
  d.retryTicks = 3;
  d.openingTicks = 10000;
  const invasion = createInvasionDefinition(180, 1000000);
  const match = new DungeonMatch(
    config,
    creepDungeon,
    seed,
    invasion,
    [coMoDungeon],
    d,
  );
  const world = match.arena.world;
  for (let i = 0; i < players; i++) match.add('p' + i, 'P' + i);
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) match.step();
  };
  const start = () => {
    match.invasion!.wave = 5;
    step(8);
    for (const h of world.heroes.values()) {
      h.hp = h.maxHp = 10000;
      h.x = 800;
      h.y = 800;
    }
    return world.creeps.get('dong_ta')!;
  };
  const cast = (id: DongAbility, owner = 'dong_ta', target = 'p0') => {
    match.dongTa!.casts = [];
    match.dongTa!.effects = [];
    for (const a of world.creeps.values())
      if (a.waveBossActor) a.cooldown = world.tick + 10000;
    expect(
      match.dongTa!.beginCast(world, match.arena.config, owner, id, target),
    ).toBe(true);
    step(d.abilities[id].windup + 1);
    for (const a of world.creeps.values())
      if (a.waveBossActor) a.cooldown = world.tick + 10000;
  };
  return { match, world, d, step, start, cast, e: match.dongTa! };
}

describe('Đông Tà authoritative V04 encounter', () => {
  it('validates final counts, east entry and independent normal/active identities', () => {
    expect(dongTaDefinitionSchema.safeParse(dongTaDefinition).success).toBe(
      true,
    );
    expect(
      dongTaDefinitionSchema.safeParse({
        ...dongTaDefinition,
        petals: { ...dongTaDefinition.petals, count: 48 },
      }).success,
    ).toBe(false);
    expect(dongTaDefinition.abilities.lac_anh_normal.nameVi).toBe(
      dongTaDefinition.abilities.lac_anh_kiem_phap.nameVi,
    );
  });
  it('gates only corresponding wave5, rests once, enters east along center road', () => {
    const s = setup();
    s.match.invasion!.wave = 4;
    s.match.invasion!.nextWaveTick = 1;
    s.step();
    expect(s.e.phase).toBe('waiting');
    s.step(5);
    expect(s.e.phase).toBe('waiting');
    for (const c of s.world.creeps.values())
      if (c.invasion?.wave === 5) c.hp = 0;
    const later = addCreep(s.world, 'wave6', { x: 100, y: 100 }, s.match.base);
    later.invasion = {
      wave: 6,
      lane: 'west',
      targetId: '',
      chaseOrigin: { x: 100, y: 100 },
      reacquireAt: 0,
      chaseRange: 200,
      aggroRestTicks: 30,
    };
    s.step(3);
    expect(s.e.phase).toBe('entry');
    const boss = s.world.creeps.get('dong_ta')!;
    expect(boss.x).toBeGreaterThan(800);
    expect(boss.y).toBe(616);
    expect(boss.invulnerable).toBe(true);
    s.step(4);
    expect(s.e.phase).toBe('fighting');
    expect(s.e.attempt).toBe(1);
    expect(later.hp).toBeGreaterThan(0);
  });
  it('recalls and revives dungeon/dead heroes preserving progression, economy and cooldown debt', () => {
    const s = setup();
    expect(s.match.enter('p1', 'shared', 'co_mo')).toBeUndefined();
    const hero = s.match.hero('p1')!;
    hero.hp = 0;
    hero.gold = 91;
    hero.xp = 21;
    hero.skillCooldowns[0] = 90;
    s.world.statue!.hp = 4321;
    s.start();
    expect(s.match.zoneOf('p1')?.id).toBe('arena');
    expect(s.match.hero('p1')).toBe(hero);
    expect(hero.gold).toBe(91);
    expect(hero.xp).toBe(21);
    expect(hero.hp).toBeGreaterThan(0);
    expect(hero.skillCooldowns[0]).toBeGreaterThan(s.world.tick);
    expect(s.match.respawns.size).toBe(0);
    expect(s.world.statue!.hp).toBe(4321);
    expect(s.world.statue!.invulnerable).toBe(true);
    expect(s.world.creeps.get('dong_ta')!.maxHp).toBe(
      Math.round(s.d.actors.dong_ta.hp * (1 + s.d.hpPerAdditionalPlayer)),
    );
    expect(s.match.zones.get('co_mo_shared')!.emptyBossResetAt).toBeDefined();
    expect(s.match.enter('p0', 'private')).toBeDefined();
  });
  it('prevents statue damage without repair; preserves clock and overlapping invasions while fighting/retrying', () => {
    const s = setup();
    s.start();
    const hp = s.world.statue!.hp,
      next = s.match.invasion!.nextWaveTick;
    expect(
      hurt(
        s.world,
        s.world.statue!,
        'creep',
        'test',
        100,
        s.match.arena.config,
      ),
    ).toBe(false);
    s.match.invasion!.nextWaveTick = s.match.tick + 1;
    s.step();
    expect(s.match.invasion!.wave).toBe(6);
    expect(s.world.statue!.hp).toBe(hp);
    expect(s.match.invasion!.nextWaveTick).toBe(
      s.match.tick + s.match.invasion!.definition.intervalTicks,
    );
    expect(next).toBe(5400);
  });
  it('clamps normal/diagonal/dash and pull, even with interrupt immunity, and respawns inside field', () => {
    const s = setup();
    s.start();
    const h = s.world.heroes.get('p0')!;
    h.x = 1110;
    h.y = 616;
    s.match.input(h.id, 1, { kind: 'move', x: 1, y: 1 });
    s.step(12);
    expect(insideEllipse(h, s.d.bounds, s.match.base.radius)).toBe(true);
    displace(h, 900, 900, s.match.base.radius, s.match.arena.config);
    expect(insideEllipse(h, s.d.bounds, s.match.base.radius)).toBe(true);
    h.hp = 0;
    s.step(creepDungeon.respawnTicks + 2);
    expect(h.hp).toBeGreaterThan(0);
    expect(insideEllipse(h, s.d.bounds, s.match.base.radius)).toBe(true);
    expect(s.e.attempt).toBe(1);
  });
  it('serial thrusts cover 180 degrees and threaten distant frontal targets but not rear', () => {
    const s = setup();
    const b = s.start();
    b.fx = 1;
    b.fy = 0;
    const [front, rear] = [
      s.world.heroes.get('p0')!,
      s.world.heroes.get('p1')!,
    ];
    Object.assign(front, { x: 1150, y: 616 });
    Object.assign(rear, { x: 500, y: 616 });
    const hp = front.hp;
    s.cast('ta_kiem_lien_kich');
    s.step(s.d.abilities.ta_kiem_lien_kich.duration);
    expect(front.hp).toBeLessThan(hp);
    expect(rear.hp).toBe(10000);
  });
  it('radial bursts roll8–14 directions and preserve captured vectors after target movement', () => {
    const s = setup();
    s.start();
    const counts = new Set<number>();
    for (let i = 0; i < 20; i++) {
      s.cast('dan_chi_than_cong');
      const shots = s.e.effects.filter((e) => e.kind === 'bead');
      counts.add(shots.length);
      expect(shots.length).toBeGreaterThanOrEqual(8);
      expect(shots.length).toBeLessThanOrEqual(14);
      expect(new Set(shots.map((e) => Math.atan2(e.fy, e.fx))).size).toBe(
        shots.length,
      );
      const first = shots[0]!,
        v = [first.fx, first.fy];
      s.world.heroes.get('p0')!.x = 500;
      s.step();
      expect([first.fx, first.fy]).toEqual(v);
    }
    expect(counts.size).toBeGreaterThan(1);
  });
  it('randomly selects exactly four orthogonal plus/X slashes without moving boss', () => {
    const s = setup();
    const b = s.start(),
      patterns = new Set<string>();
    for (let i = 0; i < 18; i++) {
      const from = { x: b.x, y: b.y };
      s.cast('lac_anh_kiem_phap');
      const effects = s.e.effects.filter((e) => e.kind === 'slash');
      expect(effects).toHaveLength(4);
      patterns.add(Math.abs(effects[0]!.fx) > 0.9 ? 'plus' : 'x');
      expect({ x: b.x, y: b.y }).toEqual(from);
      for (let n = 1; n < 4; n++)
        expect(
          effects[n]!.fx * effects[n - 1]!.fx +
            effects[n]!.fy * effects[n - 1]!.fy,
        ).toBeCloseTo(0);
    }
    expect([...patterns].sort()).toEqual(['plus', 'x']);
  });
  it('places40 separated random flower clusters; delayed explosion deduplicates hits', () => {
    const s = setup();
    s.start();
    s.cast('ngoc_tieu_hoi_phong');
    const flowers = s.e.effects.filter((e) => e.kind === 'petal');
    expect(flowers).toHaveLength(40);
    for (const [i, p] of flowers.entries()) {
      expect(insideEllipse(p, s.d.bounds)).toBe(true);
      for (const q of flowers.slice(i + 1))
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(48);
    }
    const p = flowers[0]!,
      h = s.world.heroes.get('p0')!;
    h.x = p.x;
    h.y = p.y;
    const hp = h.hp;
    s.step(p.activeAt - s.world.tick - 1);
    expect(h.hp).toBe(hp);
    s.step();
    expect(h.hp).toBeLessThan(hp);
    const hit = h.hp;
    s.step();
    expect(h.hp).toBe(hit);
  });
  it('summons both exactly once strictly below40%, even across healing; resets only on new attempt', () => {
    const s = setup();
    const b = s.start();
    b.hp = b.maxHp * 0.4;
    s.step();
    expect(s.e.summoned).toBe(false);
    b.hp--;
    s.step();
    expect(s.e.summoned).toBe(true);
    s.step(s.d.abilities.trieu_hon_dong_hai.windup + 1);
    expect(s.world.creeps.has('mai_sieu_phong')).toBe(true);
    expect(s.world.creeps.has('hoang_dung')).toBe(true);
    const mai = s.world.creeps.get('mai_sieu_phong');
    b.hp = b.maxHp;
    s.step();
    b.hp = 1;
    s.step();
    expect(s.world.creeps.get('mai_sieu_phong')).toBe(mai);
  });
  it('cannot permanently lose the scripted one-time dual summon to a stun during its windup', () => {
    const s = setup();
    const b = s.start();
    b.hp = 1;
    b.statuses = [
      {
        kind: 'stun',
        sourceId: 'p0',
        abilityId: 'test',
        durationTicks: 100,
        until: s.world.tick + 100,
        magnitude: 1,
      },
    ];
    s.step(s.d.abilities.trieu_hon_dong_hai.windup + 3);
    expect(s.world.creeps.has('mai_sieu_phong')).toBe(true);
    expect(s.world.creeps.has('hoang_dung')).toBe(true);
  });
  it.each([
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ])('Mai claws hit in front only at facing %s,%s', (fx, fy) => {
    const s = setup();
    const b = s.start();
    b.hp = 1;
    s.step(s.d.abilities.trieu_hon_dong_hai.windup + 2);
    const mai = s.world.creeps.get('mai_sieu_phong')!;
    mai.fx = fx;
    mai.fy = fy;
    const front = s.world.heroes.get('p0')!,
      rear = s.world.heroes.get('p1')!;
    Object.assign(front, { x: mai.x + fx * 65, y: mai.y + fy * 65 });
    Object.assign(rear, { x: mai.x - fx * 65, y: mai.y - fy * 65 });
    s.cast('bach_cot_trao', 'mai_sieu_phong');
    s.step(s.d.claws.gapTicks + 1);
    expect(front.hp).toBeLessThan(10000);
    expect(rear.hp).toBe(10000);
  });
  it('Mai keeps the same living target despite another closer player, retargets on death/disconnect', () => {
    const s = setup();
    const b = s.start();
    b.hp = 1;
    s.step(s.d.abilities.trieu_hon_dong_hai.windup + 3);
    const target = s.e.targetId;
    expect(target).not.toBe('');
    const other = target === 'p0' ? 'p1' : 'p0';
    const mai = s.world.creeps.get('mai_sieu_phong')!;
    Object.assign(s.world.heroes.get(other)!, { x: mai.x, y: mai.y });
    s.step(2);
    expect(s.e.targetId).toBe(target);
    s.match.remove(target);
    s.step(50);
    expect(s.e.targetId).toBe(other);
  });
  it('pull moves the locked player, poison lands then persists/ticks, healing palms restore only living allies', () => {
    const s = setup();
    const b = s.start();
    b.hp = 200;
    s.step(s.d.abilities.trieu_hon_dong_hai.windup + 3);
    const mai = s.world.creeps.get('mai_sieu_phong')!,
      h = s.world.heroes.get('p0')!;
    Object.assign(h, { x: mai.x + 200, y: mai.y });
    const start = h.x;
    s.cast('am_phong_hap_luc', 'mai_sieu_phong');
    s.step(8);
    expect(h.x).toBeLessThan(start);
    s.cast('doc_cot_bao', 'mai_sieu_phong');
    const pouch = s.e.effects.find((e) => e.kind === 'pouch')!;
    h.x = pouch.x;
    h.y = pouch.y;
    const hp = h.hp;
    s.step(s.d.poison.flightTicks + 2);
    expect(h.hp).toBeLessThan(hp);
    expect(s.e.effects.some((e) => e.kind === 'poison')).toBe(true);
    const now = h.hp;
    s.step(s.d.poison.intervalTicks);
    expect(h.hp).toBeLessThan(now);
    s.cast('thanh_am_ho_tro', 'hoang_dung');
    const before = b.hp;
    s.step(20);
    expect(b.hp).toBeGreaterThan(before);
  });
  it('wipes clean attempt effects, retries indefinitely, clears on boss alone and pays once with no items', () => {
    const s = setup();
    s.start();
    for (let i = 1; i <= 3; i++) {
      s.cast('ngoc_tieu_hoi_phong');
      for (const h of s.world.heroes.values()) h.hp = 0;
      s.step();
      expect(s.e.phase).toBe('retry');
      expect(s.e.effects).toHaveLength(0);
      expect(s.world.statue!.invulnerable).toBe(true);
      s.step(s.d.retryTicks + 1);
      expect(s.e.phase).toBe('fighting');
      expect(s.e.attempt).toBe(i + 1);
      const b = s.world.creeps.get('dong_ta')!;
      expect(b.hp).toBe(b.maxHp);
      expect(s.e.summoned).toBe(false);
    }
    const b = s.world.creeps.get('dong_ta')!;
    b.hp = 1;
    s.step(s.d.abilities.trieu_hon_dong_hai.windup + 3);
    b.hits = { p0: s.world.tick, p1: s.world.tick };
    hurt(s.world, b, 'p0', 'test', 1e6, s.match.arena.config);
    s.step();
    expect(s.e.phase).toBe('cleared');
    expect(s.world.creeps.has('mai_sieu_phong')).toBe(false);
    expect(s.world.statue!.invulnerable).toBe(false);
    expect(s.match.arena.config.heroBounds).toBeUndefined();
    const gold = [...s.world.heroes.values()].reduce((n, h) => n + h.gold, 0);
    expect(gold).toBe(s.d.gold);
    s.step(20);
    expect([...s.world.heroes.values()].reduce((n, h) => n + h.gold, 0)).toBe(
      gold,
    );
    expect(
      [...s.world.heroes.values()].every(
        (h) => !(h.bossItems?.length || h.bossLoot?.length),
      ),
    ).toBe(true);
  });
  it('does not create a retry loop after every participant leaves; late join remains inside the active court', () => {
    const s = setup(1);
    s.start();
    s.match.remove('p0');
    s.step(30);
    expect(s.e.attempt).toBe(1);
    expect(s.e.phase).toBe('fighting');
    const h = s.match.add('late', 'Late');
    expect(insideEllipse(h, s.d.bounds, s.match.base.radius)).toBe(true);
    expect(s.match.enter('late', 'private')).toBeDefined();
  });
  it('restores statue collision without trapping a player standing on its hidden base', () => {
    const s = setup();
    const boss = s.start(),
      h = s.world.heroes.get('p0')!;
    h.x = 800;
    h.y = 560;
    const hp = h.hp,
      mana = h.mana;
    expect(
      blocked(
        h,
        s.match.base.radius,
        s.match.base.width,
        s.match.base.height,
        s.match.arena.config.collision,
      ),
    ).toBe(false);
    boss.hp = 0;
    s.step();
    expect(
      blocked(
        h,
        s.match.base.radius,
        s.match.base.width,
        s.match.base.height,
        s.match.arena.config.collision,
      ),
    ).toBe(false);
    expect(Math.hypot(h.x - 800, h.y - 560)).toBeLessThanOrEqual(64);
    expect(h.hp).toBe(hp);
    expect(h.mana).toBe(mana);
    const x = h.x;
    s.match.input(h.id, 1, { kind: 'move', x: 1, y: 0 });
    s.step(10);
    expect(h.x).toBeGreaterThan(x);
  });
});
