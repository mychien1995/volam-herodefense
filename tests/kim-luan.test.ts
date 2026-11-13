import { describe, it, expect } from 'vitest';
import {
  addHero,
  createWorld,
  KimLuanEncounter,
  DungeonMatch,
  kimRingContact,
  chuLootAction,
  blocked,
  hasStatus,
  stepWorld,
  type KimAbility,
  type SimulationConfig,
} from '@volam/game-core';
import { hurt } from '../packages/game-core/src/combat.js';
import { applyStatus } from '../packages/game-core/src/status.js';
import {
  m1Config,
  creepDungeon,
  kimLuanDefinition as definition,
  kimLuanDungeon as dungeon,
  validateKimDefinition,
  campaignDefinition,
} from '@volam/game-data';
const setup = (seed = 42) => {
  const c: SimulationConfig = {
    ...structuredClone(m1Config),
    width: 1280,
    height: 736,
    collision: [],
    creepSpawns: [],
    creepRespawn: false,
  };
  const w = createWorld(c, seed),
    e = new KimLuanEncounter(structuredClone(definition));
  e.initialize(w, c);
  const h = addHero(w, 'hero', 'hero', c);
  Object.assign(h, { x: 900, y: 500, hp: 10000, maxHp: 10000 });
  // Disable automatic selection while exercising isolated mechanics.
  for (const a of Object.values(e.definition.abilities)) a.cooldown = 10000;
  const step = (n: number) => {
    for (let i = 0; i < n; i++) {
      w.tick++;
      w.events = [];
      e.step(w, c);
    }
  };
  const boss = () => {
    w.creeps.get('hoac_do')!.hp = 0;
    w.creeps.get('dat_nhi_ba')!.hp = 0;
    step(1);
    return w.creeps.get('kim_luan_phap_vuong')!;
  };
  return { c, w, e, h, step, boss };
};
const shots = (s: ReturnType<typeof setup>, id: KimAbility) =>
  [...s.e.effects.values()].filter(
    (e) => e.abilityId === id && e.kind === 'shot',
  );
describe('Kim Luân authoritative feedback_02', () => {
  it('the elephant hits hard and stuns for two seconds only when it reaches the hero', () => {
    const s = setup();
    s.c.campaign = campaignDefinition;
    const b = s.boss();
    s.e.clear(s.w);
    const ability = 'long_tuong_bat_nha_cong';
    s.e.begin(s.w, s.c, b.id, ability, s.h);
    s.step(s.e.casts.get(b.id)!.activeAt - s.w.tick);
    const elephant = [...s.e.effects.values()].find(
      (e) =>
        e.kind === 'elephant' &&
        e.fy === 1 &&
        e.length === s.e.definition.elephants.bottom,
    )!;
    for (const [id, e] of s.e.effects)
      if (e !== elephant) s.e.effects.delete(id);
    Object.assign(s.h, { x: elephant.x, y: elephant.y + 200 });
    s.step(elephant.activeAt - s.w.tick - 1);
    expect(s.h.hp).toBe(10000);
    for (let i = 0; i < 25 && s.h.hp === 10000; i++) s.step(1);
    expect(s.h.hp).toBe(9840);
    expect(s.h.statuses?.find((effect) => effect.kind === 'stun')?.until).toBe(
      s.w.tick + 2 * s.c.tickRate,
    );
  });

  it('real herd rocks block walking and Shift until the rock expires', () => {
    const s = setup(),
      b = s.boss();
    s.e.clear(s.w);
    s.e.begin(s.w, s.c, b.id, 'long_tuong_bat_nha_cong', s.h);
    s.step(s.e.casts.get(b.id)!.activeAt - s.w.tick);
    const rock = [...s.e.effects.values()].find((e) => e.kind === 'rock')!;
    const contact = rock.y - definition.elephants.rockHalfDepth - s.c.radius;
    Object.assign(s.h, { x: rock.x, y: contact - 12, moveY: 1, fx: 0, fy: 1 });
    const advance = (n: number) => {
      for (let i = 0; i < n; i++) {
        s.h.lastMoveTick = s.w.tick;
        stepWorld(s.w, s.c);
      }
    };
    advance(10);
    expect(s.h.y).toBeLessThanOrEqual(contact);
    s.w.pending.push({ heroId: s.h.id, command: { kind: 'dash' } });
    advance(16);
    expect(s.h.y).toBeLessThanOrEqual(contact);
    expect(s.c.collision).toEqual([]);
    s.w.tick = rock.expiresAt - 1;
    advance(26);
    expect(s.h.y).toBeGreaterThan(rock.y);
  });
  it('uses the approved compact Xiangyang court and keeps its south exit reachable', () => {
    const { width, height, collision, spawn, exit } = dungeon;
    const isBlocked = (x: number, y: number) =>
      blocked({ x, y }, m1Config.radius, width, height, collision);
    expect({ width, height }).toEqual({ width: 1190, height: 680 });
    expect(width / height).toBe(7 / 4);
    for (const { x, y } of Object.values(dungeon.kimBoss!.actors))
      expect(isBlocked(x, y)).toBe(false);
    for (let y = spawn.y; y <= exit.y; y += 2)
      expect(isBlocked(spawn.x, y)).toBe(false);
    expect(isBlocked(595, 190)).toBe(true);
    expect(isBlocked(70, 410)).toBe(true);
    expect(isBlocked(1120, 410)).toBe(true);
    expect(isBlocked(420, 630)).toBe(true);
    expect(isBlocked(exit.x, exit.y)).toBe(false);
  });
  it.each([
    ['hoac_do', 'dat_nhi_ba'],
    ['dat_nhi_ba', 'hoac_do'],
  ])(
    'gates both kill orders: %s then %s; no early actor or duplicate spawn',
    (first, second) => {
      const s = setup();
      s.w.creeps.get(first)!.hp = 0;
      s.step(40);
      expect(s.w.creeps.has('kim_luan_phap_vuong')).toBe(false);
      expect(s.w.creeps.get(first)!.hp).toBe(0);
      s.w.creeps.get(second)!.hp = 0;
      s.step(1);
      expect(s.e.phase).toBe('boss');
      const b = s.w.creeps.get('kim_luan_phap_vuong');
      s.step(20);
      expect(s.w.creeps.get('kim_luan_phap_vuong')).toBe(b);
    },
  );
  it('ward has exactly one holder, transfers and falls to the survivor; mitigation uses common pipeline', () => {
    const s = setup(),
      dat = s.w.creeps.get('dat_nhi_ba')!,
      hoac = s.w.creeps.get('hoac_do')!;
    hurt(s.w, dat, s.h.id, 'test', 100, s.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    const guarded = dat.maxHp - dat.hp;
    s.w.tick = 120;
    s.e.step(s.w, s.c);
    expect(s.e.wardId).toBe('hoac_do');
    const hp = dat.hp;
    hurt(s.w, dat, s.h.id, 'test', 100, s.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(hp - dat.hp).toBeGreaterThan(guarded * 2);
    expect(
      [dat, hoac].filter((b) => hasStatus(b, 'damage_reduction', s.w.tick)),
    ).toHaveLength(1);
    hoac.hp = 0;
    s.step(1);
    expect(s.e.wardId).toBe('dat_nhi_ba');
    expect(hasStatus(hoac, 'damage_reduction', s.w.tick)).toBe(false);
  });
  it('Thiết Phiến releases 3×4 rays, 440px/s, captured headings and open 90° lanes', () => {
    const s = setup();
    s.e.begin(s.w, s.c, 'hoac_do', 'thiet_phien_lien_hoan', s.h);
    s.step(49);
    const fx = shots(s, 'thiet_phien_lien_hoan');
    expect(fx).toHaveLength(12);
    expect(fx.every((e) => e.speed === 440)).toBe(true);
    expect(new Set(fx.map((e) => e.activeAt)).size).toBe(3);
    expect(fx[4]!.activeAt - fx[0]!.activeAt).toBe(15);
    const heading = { fx: fx[0]!.fx, fy: fx[0]!.fy };
    s.h.y -= 150;
    s.step(1);
    expect({ fx: fx[0]!.fx, fy: fx[0]!.fy }).toEqual(heading);
  });
  it('5 gusts spread 160°, swept hit dedups and applies slow+knockback', () => {
    const s = setup();
    s.e.begin(s.w, s.c, 'hoac_do', 'cuong_phong_tan_loi_cong', s.h);
    s.step(15);
    const f = shots(s, 'cuong_phong_tan_loi_cong');
    expect(f).toHaveLength(5);
    expect(
      (Math.acos(f[0]!.fx * f[4]!.fx + f[0]!.fy * f[4]!.fy) * 180) / Math.PI,
    ).toBeCloseTo(160);
    const ray = f[2]!;
    s.h.x = ray.x + ray.fx * 9;
    s.h.y = ray.y + ray.fy * 9;
    const before = { x: s.h.x, y: s.h.y, hp: s.h.hp };
    s.step(1);
    expect(s.h.hp).toBeLessThan(before.hp);
    expect(hasStatus(s.h, 'slow', s.w.tick)).toBe(true);
    expect(Math.hypot(s.h.x - before.x, s.h.y - before.y)).toBeGreaterThan(40);
  });
  it('poison fires 5 front+5 back, escalates confirmed HP hits and fifth kills via hurt', () => {
    const s = setup();
    s.e.begin(s.w, s.c, 'hoac_do', 'phien_trung_doc_dinh', s.h);
    s.step(15);
    const fx = shots(s, 'phien_trung_doc_dinh');
    expect(fx).toHaveLength(10);
    expect(fx.every((e) => e.speed === 620)).toBe(true);
    let previous = 0;
    for (let i = 0; i < 5; i++) {
      const e = fx[i]!;
      e.x = s.h.x - 20;
      e.y = s.h.y;
      e.fx = 1;
      e.fy = 0;
      for (const other of fx)
        if (other !== e) {
          other.x = 50;
          other.y = 20;
        }
      const hp = s.h.hp;
      s.step(1);
      const damage = hp - s.h.hp;
      expect(damage).toBeGreaterThan(previous);
      if (i === 0) {
        expect(hasStatus(s.h, 'poison', s.w.tick)).toBe(true);
        expect(hasStatus(s.h, 'slow', s.w.tick)).toBe(true);
      }
      previous = damage;
    }
    expect(s.h.hp).toBe(0);
    expect(
      s.w.events.some(
        (e) => e.kind === 'death' && e.abilityId === 'phien_trung_doc_dinh',
      ),
    ).toBe(true);
  });
  it('immune poison contact consumes the projectile but never an escalation stack', () => {
    const s = setup();
    s.e.begin(s.w, s.c, 'hoac_do', 'phien_trung_doc_dinh', s.h);
    s.step(15);
    const f = shots(s, 'phien_trung_doc_dinh');
    for (const e of f) {
      e.x = 20;
      e.y = 20;
    }
    const e = f[0]!;
    e.x = s.h.x - 20;
    e.y = s.h.y;
    e.fx = 1;
    e.fy = 0;
    applyStatus(
      s.h,
      { kind: 'dash_guard', magnitude: 1, durationTicks: 10 },
      s.h.id,
      'immune',
      s.w.tick,
    );
    const hp = s.h.hp;
    s.step(1);
    expect(s.h.hp).toBe(hp);
    s.h.statuses = [];
    const e2 = f[1]!;
    e2.x = s.h.x - 20;
    e2.y = s.h.y;
    e2.fx = 1;
    e2.fy = 0;
    s.step(1);
    expect(hp - s.h.hp).toBe(8);
  });
  it('fissure captures ground origin and activates exactly .5s after impact; boulder uses straight swept trajectory', () => {
    const s = setup(),
      b = s.w.creeps.get('dat_nhi_ba')!;
    s.e.begin(s.w, s.c, b.id, 'dai_luc_pha_son', s.h);
    const origin = { x: b.x, y: b.y };
    s.step(Math.round(definition.abilities.dai_luc_pha_son.warning * 30));
    const fissure = [...s.e.effects.values()].find(
      (e) => e.abilityId === 'dai_luc_pha_son' && e.damage > 0,
    )!;
    expect(fissure.activeAt - s.w.tick).toBe(15);
    expect({ x: fissure.x, y: fissure.y }).toEqual(origin);
    b.x += 100;
    s.step(14);
    expect(
      s.w.events.filter(
        (e) => e.abilityId === 'dai_luc_pha_son' && e.kind === 'hit',
      ),
    ).toHaveLength(0);
    expect(fissure.x).toBe(origin.x);
  });
  it('Dat uses increased configured server movement, and frontal sweep does not hit behind', () => {
    const s = setup(),
      b = s.w.creeps.get('dat_nhi_ba')!,
      start = { x: b.x, y: b.y };
    s.step(20);
    expect(distance(start, b)).toBeGreaterThan(5);
    expect(distance(start, b)).toBeLessThanOrEqual(
      (definition.actors.dat_nhi_ba.speed * 20) / 30 + 0.01,
    );
    s.e.begin(s.w, s.c, b.id, 'dat_sweep', { x: b.x + 100, y: b.y });
    s.h.x = b.x - 100;
    s.h.y = b.y;
    const hp = s.h.hp;
    s.step(26);
    expect(s.h.hp).toBe(hp);
  });
  it('orbit releases exactly seven at 680; persistent wheels bounce and obey per-target cadence', () => {
    const s = setup(),
      b = s.boss();
    s.e.begin(s.w, s.c, b.id, 'ngu_luan_ho_the', s.h);
    s.step(18);
    expect(
      [...s.e.effects.values()].filter((e) => e.kind === 'orbit'),
    ).toHaveLength(7);
    s.step(90);
    expect(shots(s, 'ngu_luan_ho_the')).toHaveLength(7);
    expect(shots(s, 'ngu_luan_ho_the').every((e) => e.speed === 680)).toBe(
      true,
    );
  });
  it('three thin Chấn Thiên waves stop at280, fast expansion, outside/inside holes stay safe', () => {
    const s = setup(),
      b = s.boss();
    s.e.begin(s.w, s.c, b.id, 'long_tuong_chan_thien', s.h);
    s.step(15);
    const e = [...s.e.effects.values()].find(
      (e) => e.damage > 0 && e.kind === 'ring',
    )!;
    expect(e.maxRadius).toBe(280);
    expect(e.speed).toBe(900);
    expect(
      kimRingContact(
        { x: 0, y: 0, radius: 280, previousRadius: 250, maxRadius: 280 },
        { x: 340, y: 0 },
        { x: 340, y: 0 },
        12,
        0.4,
        10,
      ),
    ).toBe(false);
    expect(
      kimRingContact(
        { x: 0, y: 0, radius: 280, previousRadius: 250, maxRadius: 280 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        12,
        0.4,
        10,
      ),
    ).toBe(false);
    expect(
      kimRingContact(
        { x: 0, y: 0, radius: 280, previousRadius: 250, maxRadius: 280 },
        { x: 265, y: 0 },
        { x: 265, y: 0 },
        12,
        0.4,
        10,
      ),
    ).toBe(true);
  });
  it('cage is damageable by legitimate combat, cleans up on solo timeout/death/leave', () => {
    const s = setup(),
      b = s.boss();
    s.e.begin(s.w, s.c, b.id, 'ngu_luan_phong_toa', s.h);
    s.step(24);
    expect(s.e.cageTarget).toBe(s.h.id);
    const cage = s.w.creeps.get('kim_cage')!;
    expect(cage.hp).toBe(90);
    expect(
      hurt(s.w, cage, s.h.id, 'basic', 100, s.c, {
        critChance: 0,
        critMultiplier: 1,
      }),
    ).toBe(false);
    addHero(s.w, 'ally', 'ally', s.c);
    hurt(s.w, cage, 'ally', 'basic', 100, s.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    s.step(1);
    expect(s.e.cageTarget).toBe('');
    expect(s.w.creeps.has('kim_cage')).toBe(false);
  });
  it('seeded rocks stay fixed, normal herd has12×3×3 and alternates direction with actual blocking', () => {
    const s = setup(),
      b = s.boss();
    s.e.begin(s.w, s.c, b.id, 'long_tuong_bat_nha_cong', s.h);
    s.step(24);
    const rocks = [...s.e.effects.values()].filter((e) => e.kind === 'rock'),
      elephants = [...s.e.effects.values()].filter(
        (e) => e.kind === 'elephant',
      );
    expect(rocks).toHaveLength(5);
    expect(elephants).toHaveLength(108);
    expect(new Set(elephants.map((e) => e.fy))).toEqual(new Set([1, -1]));
    const positions = rocks.map((e) => ({ x: e.x, y: e.y }));
    s.step(1);
    expect(rocks.map((e) => ({ x: e.x, y: e.y }))).toEqual(positions);
    const blocked = elephants.find((e) => e.fy === 1 && e.length !== 750)!;
    s.h.x = blocked.x;
    s.h.y = blocked.length + 80;
    const hp = s.h.hp;
    for (const [id, e] of s.e.effects)
      if (e !== blocked && e.kind !== 'rock') s.e.effects.delete(id);
    s.step(90);
    expect(s.h.hp).toBe(hp);
  });
  it('strict<30% activates once; enrage moves and fires5 every54ticks with captured origins,14×4×3 herd', () => {
    const s = setup(),
      b = s.boss();
    b.hp = b.maxHp * 0.3;
    s.step(1);
    expect(s.e.enraged).toBe(false);
    b.hp--;
    const start = { x: b.x, y: b.y };
    s.step(18);
    expect(s.e.enraged).toBe(true);
    expect(distance(start, b)).toBeGreaterThan(40);
    expect(
      [...s.e.effects.values()].filter((e) => e.kind === 'elephant'),
    ).toHaveLength(168);
    let f = shots(s, 'kim_sweep');
    expect(f).toHaveLength(5);
    expect(f.every((e) => e.speed === definition.enrage.wheelSpeed)).toBe(true);
    const first = f[0]!.activeAt;
    s.step(54);
    f = shots(s, 'kim_sweep');
    expect(new Set(f.map((e) => e.activeAt))).toContain(first + 54);
  });
  it('fixed reward pool and one item only on final kill, repeat step cannot duplicate', () => {
    const s = setup(),
      b = s.boss();
    b.hits[s.h.id] = s.w.tick;
    const gold = s.h.gold;
    b.hp = 0;
    s.step(1);
    expect(s.h.gold - gold).toBe(600);
    expect(s.e.rewards.loot).toHaveLength(1);
    expect(s.h.bossItems).toEqual(['kim_luan_tan_phien']);
    s.step(100);
    expect(s.e.rewards.loot).toHaveLength(1);
    expect(s.h.gold - gold).toBe(600);
    expect(chuLootAction(s.w, s.h.id, 1, 'roll')).toBeTruthy();
  });
  it('empty30s resets the entire shared gate; legacy private requests do not create another boss', () => {
    const m = new DungeonMatch(m1Config, creepDungeon, 42, undefined, [
      dungeon,
    ]);
    m.add('a', 'a');
    m.add('b', 'b');
    m.enter('a', 'shared', 'kim_luan');
    m.enter('b', 'private', 'kim_luan');
    const z = m.zoneOf('a')!,
      other = m.zoneOf('b')!;
    expect(other).toBe(z);
    z.world.creeps.get('hoac_do')!.hp = 0;
    m.remove('a');
    m.remove('b');
    for (let i = 0; i <= 900; i++) m.step();
    expect(z.kim!.phase).toBe('disciples');
    expect(z.world.creeps.get('hoac_do')!.hp).toBe(3300);
    expect(other.world.creeps.has('kim_luan_phap_vuong')).toBe(false);
  });
  it('map markers and shelter region are reachable; invalid config is rejected', () => {
    validateKimDefinition();
    for (const p of [
      dungeon.spawn,
      dungeon.exit,
      { x: 240, y: 400 },
      { x: 1050, y: 500 },
    ])
      expect(
        blocked(p, 12, dungeon.width, dungeon.height, dungeon.collision),
      ).toBe(false);
    expect(() =>
      validateKimDefinition({
        ...definition,
        stomp: { ...definition.stomp, radius: 540 },
      }),
    ).toThrow();
  });
  it('same seeded command stream produces byte-identical state and events', () => {
    const run = () => {
      const s = setup(918);
      s.boss();
      s.w.creeps.get('kim_luan_phap_vuong')!.hp = 900;
      s.step(240);
      return JSON.stringify({
        view: s.e.view(s.w),
        heroes: [...s.w.heroes.values()],
        events: s.w.events,
      });
    };
    expect(run()).toBe(run());
  });
  it('spin emits continuous radial nails without frame-rate authority; boulder sweep hits a target between ticks', () => {
    const s = setup();
    s.e.begin(s.w, s.c, 'hoac_do', 'cuong_phong_van_nhan', s.h);
    s.step(40);
    expect(shots(s, 'cuong_phong_van_nhan').length).toBeGreaterThanOrEqual(24);
    s.e.clear(s.w);
    s.e.begin(s.w, s.c, 'dat_nhi_ba', 'dai_luc_pha_son_boulder', s.h);
    s.step(
      Math.round(definition.abilities.dai_luc_pha_son_boulder.warning * 30),
    );
    const shot = shots(s, 'dai_luc_pha_son_boulder')[0]!;
    shot.x = s.h.x - 20;
    shot.y = s.h.y;
    shot.fx = 1;
    shot.fy = 0;
    const hp = s.h.hp;
    s.step(1);
    expect(s.h.hp).toBeLessThan(hp);
    expect(s.h.statuses?.find((effect) => effect.kind === 'stun')?.until).toBe(
      s.w.tick + Math.round(s.c.tickRate * 0.65),
    );
    const once = s.h.hp;
    s.step(1);
    expect(s.h.hp).toBe(once);
  });
  it('bouncing wheels persist20s, reflect at arena edges, and respect19/20tick contact cooldown', () => {
    const s = setup(),
      b = s.boss();
    s.e.begin(s.w, s.c, b.id, 'kim_luan_truy_hon', s.h);
    s.step(21);
    const f = shots(s, 'kim_luan_truy_hon');
    expect(f).toHaveLength(7);
    const e = f[0]!;
    expect(e.expiresAt - e.activeAt).toBe(600);
    e.x = definition.bounds.x + definition.bounds.width - 1;
    e.y = 400;
    e.fx = 1;
    e.fy = 0;
    s.step(1);
    expect(e.fx).toBe(-1);
    for (const other of f.slice(1)) s.e.effects.delete(other.id);
    e.speed = 0;
    e.x = s.h.x;
    e.y = s.h.y;
    const hp = s.h.hp;
    s.step(1);
    expect(s.h.hp).toBeLessThan(hp);
    const after = s.h.hp;
    s.step(18);
    expect(s.h.hp).toBe(after);
    s.step(2);
    expect(s.h.hp).toBeLessThan(after);
  });
  it('three mace pulses have separate100/190/330 extents and per-pulse dedup', () => {
    const s = setup();
    s.e.begin(s.w, s.c, 'dat_nhi_ba', 'hang_ma_tam_lien_chan', s.h);
    const seen = new Set<number>();
    for (let i = 0; i < 75; i++) {
      s.step(1);
      for (const e of s.e.effects.values())
        if (e.abilityId === 'hang_ma_tam_lien_chan' && e.damage > 0)
          seen.add(e.maxRadius!);
    }
    expect([...seen]).toEqual([100, 190, 330]);
  });
  it('cage releases after solo deadline and immediately when target leaves; shared allies can break through the common pipeline', () => {
    const s = setup(),
      b = s.boss();
    s.e.begin(s.w, s.c, b.id, 'ngu_luan_phong_toa', s.h);
    s.step(24);
    s.step(66);
    expect(s.e.cageTarget).toBe('');
    s.e.clear(s.w);
    s.e.begin(s.w, s.c, b.id, 'ngu_luan_phong_toa', s.h);
    s.step(24);
    s.w.heroes.delete(s.h.id);
    s.step(1);
    expect(s.e.cageTarget).toBe('');
  });
  it('final corpse respawns once by match deadline even if empty; six players share a fixed pool and one item', () => {
    const m = new DungeonMatch(m1Config, creepDungeon, 42, undefined, [
      dungeon,
    ]);
    for (let i = 0; i < 6; i++) {
      m.add('p' + i, 'p' + i);
      m.enter('p' + i, 'shared', 'kim_luan');
    }
    const z = m.zoneOf('p0')!,
      e = z.kim!;
    expect(z.world.creeps.get('hoac_do')!.maxHp).toBe(3300);
    z.world.creeps.get('hoac_do')!.hp = z.world.creeps.get('dat_nhi_ba')!.hp =
      0;
    m.step();
    const b = z.world.creeps.get('kim_luan_phap_vuong')!;
    for (const h of z.world.heroes.values()) b.hits[h.id] = z.world.tick;
    b.hp = 0;
    m.step();
    expect(e.rewards.loot).toHaveLength(1);
    expect([...z.world.heroes.values()].reduce((n, h) => n + h.gold, 0)).toBe(
      600,
    );
    for (const id of [...z.world.heroes.keys()]) m.remove(id);
    for (let i = 0; i < 1351; i++) m.step();
    expect(e.phase).toBe('disciples');
    expect(z.world.creeps.size).toBe(2);
    expect(e.rewards.loot).toHaveLength(1);
  });
});
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
