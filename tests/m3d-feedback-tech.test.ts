import { describe, expect, it } from 'vitest';
import {
  addHero,
  addCreep,
  createWorld,
  stepWorld,
  submitInput,
  DungeonMatch,
  type Command,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  desertDungeon,
  beachDungeon,
  abilitySchema,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { cancelOwnedEffects } from '../packages/game-core/src/status.js';
import { inputSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
function fixture(skill = 'nhan_kiem_hop_nhat', slot = 0) {
  const config = structuredClone(m1Config);
  Object.assign(config, {
    width: 1800,
    height: 1000,
    collision: [],
    spawn: { x: 300, y: 400 },
    creepSpawns: [],
    manaRegen: 0,
    critChance: 0,
  });
  Object.assign(config.creep, {
    hp: 10000,
    defense: 0,
    speed: 0,
    detectionRange: 0,
    damage: 0,
  });
  const world = createWorld(config),
    hero = addHero(world, 'a', 'A', config);
  world.random = () => 0.99;
  hero.skillIds = ['', '', '', ''];
  hero.skillIds[slot] = skill;
  hero.mana = hero.maxMana = 1000;
  const events: typeof world.events = [];
  const steps = (n = 1) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const input = (command: Command) => {
    submitInput(world, hero.id, hero.lastSequence + 1, command);
    steps();
  };
  const cast = () => input({ kind: 'cast', slot });
  const enemy = (id: string, x: number, y = 400) =>
    addCreep(world, id, { x, y }, config);
  return { config, world, hero, events, steps, input, cast, enemy };
}
describe('M3D feedback tech', () => {
  it('recharges two dash charges sequentially at exact eight-second boundaries', () => {
    const f = fixture();
    f.input({ kind: 'dash' });
    const deadline = f.hero.dashRechargeAt!;
    f.steps(5);
    f.input({ kind: 'dash' });
    expect(f.hero.dashCharges).toBe(0);
    expect(f.hero.dashRechargeAt).toBe(deadline);
    f.steps(5);
    const x = f.hero.x;
    f.input({ kind: 'dash' });
    expect(f.hero.x).toBe(x);
    f.steps(deadline - f.world.tick - 1);
    expect(f.hero.dashCharges).toBe(0);
    f.steps();
    expect(f.hero.dashCharges).toBe(1);
    expect(f.hero.dashRechargeAt).toBe(deadline + 240);
    f.steps(240);
    expect(f.hero.dashCharges).toBe(2);
    expect(f.hero.dashRechargeAt).toBeUndefined();
    f.input({ kind: 'dash' });
    expect(f.hero.dashRechargeAt).toBe(f.world.tick + 240);
  });
  it('refills a single used charge; replay, stun, active skill and a third dash do not spend charges', () => {
    const f = fixture('liet_phong_dao');
    f.cast();
    f.input({ kind: 'dash' });
    expect(f.hero.dashCharges).toBe(2);
    f.steps(30);
    f.hero.statuses = [
      {
        kind: 'stun',
        durationTicks: 30,
        until: f.world.tick + 30,
        magnitude: 1,
        sourceId: 'enemy',
        abilityId: 'test',
      },
    ];
    f.input({ kind: 'dash' });
    expect(f.hero.dashCharges).toBe(2);
    f.hero.statuses = [];
    f.input({ kind: 'dash' });
    expect(
      submitInput(f.world, 'a', f.hero.lastSequence, { kind: 'dash' }),
    ).toBe(false);
    f.steps(240);
    expect(f.hero.dashCharges).toBe(2);
  });
  it('uses movement or facing, cannot tunnel through thin terrain, and grants no immunity', () => {
    const f = fixture();
    f.hero.fx = 0;
    f.hero.fy = -1;
    f.input({ kind: 'dash' });
    f.steps(5);
    expect(f.hero.y).toBeCloseTo(280);
    const g = fixture();
    g.config.collision = [{ x: 340, y: 100, width: 4, height: 700 }];
    g.input({ kind: 'dash' });
    g.steps(5);
    expect(g.hero.x).toBeLessThanOrEqual(340 - g.config.radius);
    const h = fixture();
    h.input({ kind: 'move', x: 0, y: 1 });
    h.input({ kind: 'dash' });
    expect(h.hero.y).toBeGreaterThan(400);
    const hp = h.hero.hp;
    expect(hurt(h.world, h.hero, 'enemy', 'test', 10, h.config)).toBe(true);
    expect(h.hero.hp).toBeLessThan(hp);
  });
  it('preserves recharge debt across paused-zone clock transfer, build cancellation and death', () => {
    const config = structuredClone(m1Config);
    config.creepSpawns = [];
    const match = new DungeonMatch(config, creepDungeon);
    const h = match.add('a', 'A');
    match.input('a', 1, { kind: 'dash' });
    match.step();
    for (let i = 0; i < 10; i++) match.step();
    const debt = h.dashRechargeAt! - match.arena.world.tick;
    expect(match.enter('a', 'private')).toBeUndefined();
    const zone = match.zoneOf('a')!;
    expect(h.dashRechargeAt! - zone.world.tick).toBe(debt);
    cancelOwnedEffects(zone.world, 'a');
    expect(h.dashCharges).toBe(1);
    h.hp = 0;
    match.step();
    expect(h.dashCharges).toBe(1);
    for (let i = 0; i < 241; i++) match.step();
    expect(h.dashCharges).toBe(2);
  });
  it.each([0, 1, 2, 3])(
    'recasts the assigned sword slot %i during cooldown with no mana payment',
    (slot) => {
      const f = fixture('nhan_kiem_hop_nhat', slot);
      f.cast();
      f.steps(15);
      const shot = [...f.world.projectiles.values()][0]!;
      const point = { x: shot.x, y: shot.y },
        mana = f.hero.mana,
        cd = f.hero.skillCooldowns[slot];
      f.cast();
      expect(f.hero.x).toBeCloseTo(point.x);
      expect(f.hero.y).toBeCloseTo(point.y);
      expect(f.world.projectiles.size).toBe(0);
      expect(f.hero.mana).toBe(mana);
      expect(f.hero.skillCooldowns[slot]).toBe(cd);
      expect(f.events.some((e) => e.stage === 'blink_depart')).toBe(true);
      expect(f.events.some((e) => e.stage === 'blink_arrive')).toBe(true);
    },
  );
  it('pierces targets once, then lingers damage-free for exactly 1.5 seconds', () => {
    const f = fixture();
    f.enemy('one', 360);
    f.enemy('two', 500);
    f.enemy('end', 840);
    f.cast();
    while (![...f.world.projectiles.values()][0]?.lingerUntil) f.steps();
    const shot = [...f.world.projectiles.values()][0]!,
      deadline = shot.lingerUntil!;
    expect(shot.x).toBeCloseTo(840);
    for (const id of ['one', 'two', 'end'])
      expect(
        f.events.filter((e) => e.kind === 'hit' && e.targetId === id),
      ).toHaveLength(1);
    f.steps(deadline - f.world.tick - 1);
    expect(f.world.projectiles.size).toBe(1);
    f.steps();
    expect(f.world.projectiles.size).toBe(0);
    expect(f.events.filter((e) => e.kind === 'hit')).toHaveLength(3);
  });
  it('can blink in the last linger tick; rejects unsafe points, stun and expired swords', () => {
    const f = fixture();
    f.cast();
    while (![...f.world.projectiles.values()][0]?.lingerUntil) f.steps();
    const end = [...f.world.projectiles.values()][0]!.lingerUntil!;
    f.steps(end - f.world.tick - 2);
    f.cast();
    expect(f.hero.x).toBeCloseTo(840);
    const g = fixture();
    g.cast();
    g.steps(10);
    const shot = [...g.world.projectiles.values()][0]!;
    g.config.collision = [
      { x: shot.x - 5, y: shot.y - 5, width: 10, height: 10 },
    ];
    g.cast();
    expect(g.hero.x).toBe(300);
    const h = fixture();
    h.cast();
    h.hero.statuses = [
      {
        kind: 'stun',
        durationTicks: 30,
        until: 1000,
        magnitude: 1,
        sourceId: 'e',
        abilityId: 'test',
      },
    ];
    h.cast();
    expect(h.hero.x).toBe(300);
  });
  it.each(['death', 'remove', 'cancel'] as const)(
    'cleans up blink sword on %s',
    (mode) => {
      const f = fixture();
      f.cast();
      if (mode === 'death') {
        f.hero.hp = 0;
        f.steps();
      } else if (mode === 'remove') {
        f.world.heroes.delete('a');
        cancelOwnedEffects(f.world, 'a');
      } else cancelOwnedEffects(f.world, 'a');
      expect(f.world.projectiles.size).toBe(0);
    },
  );
  it('emits four accepted monk stages; rejected spam never advances them', () => {
    const f = fixture();
    f.hero.basicId = 'thieu_lam_quyen';
    const e = f.enemy('near', 365);
    e.y = 400;
    for (let n = 0; n < 5; n++) {
      for (let i = 0; i < 8; i++)
        submitInput(f.world, 'a', f.hero.lastSequence + 1, { kind: 'basic' });
      f.steps(n === 3 ? 30 : 28);
    }
    expect(
      f.events.filter((e) => e.kind === 'attack').map((e) => e.stage),
    ).toEqual([
      'left_fist',
      'right_fist',
      'front_kick',
      'roundhouse_kick',
      'left_fist',
    ]);
  });
  it.each(['vo_dang_quyen', 'vo_dang_kiem'])(
    'bounds %s to animation cadence with no automatic queued attacks',
    (id) => {
      const f = fixture();
      f.hero.basicId = id;
      for (let i = 0; i < 8; i++)
        submitInput(f.world, 'a', f.hero.lastSequence + 1, { kind: 'basic' });
      f.steps(30);
      expect(f.events.filter((e) => e.kind === 'attack')).toHaveLength(1);
      f.input({ kind: 'basic' });
      expect(f.hero.cooldown - f.world.tick).toBe(6);
    },
  );
  it('rank4 fire follows the owner every tick, hits only nearby visible enemies and expires', () => {
    const f = fixture('khang_long_huu_hoi');
    const rank = f.config.progression!.skills['khang_long_huu_hoi']!.ranks[3]!;
    f.config.skillCatalogue!['khang_long_huu_hoi'] = rank;
    f.enemy('old', 350);
    f.enemy('new', 650);
    f.cast();
    expect(f.world.areas).toHaveLength(1);
    f.hero.x = 600;
    f.steps(30);
    expect(f.world.areas![0]!.x).toBe(600);
    expect(
      f.events.filter((e) => e.kind === 'hit' && e.targetId === 'old'),
    ).toHaveLength(1);
    expect(
      f.events.filter((e) => e.kind === 'hit' && e.targetId === 'new'),
    ).toHaveLength(1);
    f.steps(300);
    expect(f.world.areas).toHaveLength(0);
    const g = fixture('khang_long_huu_hoi');
    g.cast();
    expect(g.world.areas ?? []).toHaveLength(0);
  });
  it('Liệt Phong has a real windup then one frontal strike with captured facing', () => {
    const f = fixture('liet_phong_dao');
    f.enemy('front', 420);
    f.enemy('back', 190);
    f.cast();
    f.steps(17);
    expect(f.events.filter((e) => e.kind === 'hit')).toHaveLength(0);
    f.hero.fx = -1;
    f.steps();
    expect(
      f.events.filter((e) => e.kind === 'hit').map((e) => e.targetId),
    ).toEqual(['front']);
    f.steps(30);
    expect(f.events.filter((e) => e.kind === 'hit')).toHaveLength(1);
  });
  it('Vi Đà ground origin is forward and does not hit enemies behind its explosion', () => {
    const f = fixture('vi_da_quyen');
    f.enemy('front', 505);
    f.enemy('behind', 280);
    f.cast();
    expect(
      f.events.filter((e) => e.kind === 'hit').map((e) => e.targetId),
    ).toEqual(['front']);
  });
  it.each([creepDungeon, desertDungeon, beachDungeon])(
    'uses global private $id aggro without retargeting a player in another instance',
    (d) => {
      const config = structuredClone(m1Config);
      config.creepSpawns = [];
      config.creep.detectionRange = 1;
      const match = new DungeonMatch(config, d);
      const a = match.add('a', 'A'),
        b = match.add('b', 'B');
      match.enter('a', 'shared');
      match.enter('b', 'shared');
      const z = match.zoneOf('a')!;
      expect(z.world.creeps.size).toBe(6);
      expect(z.config.dungeonAggro).toBe(true);
      z.config.collision = []; // Isolate aggro here; the next test covers solid scenery routing.
      const e = [...z.world.creeps.values()][0]!;
      Object.assign(e, { x: a.x + 100, y: a.y });
      match.step();
      expect(e.x).toBeLessThan(a.x + 100);
      const stopped = { x: e.x, y: e.y };
      a.hp = 0;
      match.step();
      expect({ x: e.x, y: e.y }).toEqual(stopped);
      expect(match.zoneOf('b')).not.toBe(z);
      expect(b.hp).toBeGreaterThan(0);
    },
  );
  it('routes an aggro creep around scenery, keeps terrain solid and reaches attack range', () => {
    const f = fixture();
    f.config.dungeonAggro = true;
    f.config.collision = [{ x: 390, y: 300, width: 30, height: 200 }];
    Object.assign(f.hero, { x: 500, y: 400 });
    const e = f.enemy('chaser', 300);
    f.config.creep.speed = 120;
    f.config.creep.attackRange = 35;
    let attack = false;
    for (let i = 0; i < 300; i++) {
      f.steps();
      expect(e.x < 390 || e.x >= 420 || e.y <= 300 || e.y >= 500).toBe(true);
      attack ||= f.world.events.some(
        (v) => v.kind === 'attack' && v.sourceId === e.id,
      );
    }
    expect(attack).toBe(true);
    expect(e.aggroTargetId).toBe('a');
  });
  it.each(['pha_giap_bong', 'tam_gioi_quy_thien'])(
    'extends %s without adding extra hit damage',
    (id) => {
      const f = fixture(id);
      f.enemy('front', 360);
      f.cast();
      expect(f.events.filter((e) => e.kind === 'hit')).toHaveLength(0);
      f.steps(6);
      expect(f.events.filter((e) => e.kind === 'hit')).toHaveLength(1);
      f.steps(30);
      expect(f.events.filter((e) => e.kind === 'hit')).toHaveLength(1);
    },
  );
  it('validates dash messages, blink shape and arc durations', () => {
    expect(
      inputSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        kind: 'dash',
      }).success,
    ).toBe(true);
    expect(
      inputSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        kind: 'dash',
        x: 999,
      }).success,
    ).toBe(false);
    const a = structuredClone(m1Config.skillCatalogue!['liet_phong_dao']!);
    if (a.effect.mode === 'arc') a.effect.durationTicks = 1;
    expect(abilitySchema.safeParse(a).success).toBe(false);
  });
});
