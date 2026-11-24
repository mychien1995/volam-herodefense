import { describe, it, expect } from 'vitest';
import {
  addHero,
  addCreep,
  createWorld,
  submitInput,
  stepWorld,
  hasStatus,
  statusValue,
  conLuan,
  duongMon,
  fiveSwordPoints,
  type Command,
  type CombatEvent,
} from '@volam/game-core';
import { m1Config, abilitySchema } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import {
  applyStatus,
  selectableTarget,
  cancelOwnedEffects,
} from '../packages/game-core/src/status.js';
import { targetDirection } from '../packages/game-core/src/skills.js';

function fixture(id = 'hoa_van_chuong', basic = 'cai_bang_chuong') {
  const config = structuredClone(m1Config);
  Object.assign(config, {
    width: 1800,
    height: 1200,
    collision: [],
    creepSpawns: [],
    spawn: { x: 600, y: 500 },
    manaRegen: 0,
    critChance: 0,
  });
  Object.assign(config.creep, {
    hp: 10000,
    defense: 0,
    speed: 0,
    damage: 0,
    detectionRange: 0,
  });
  const world = createWorld(config, 42),
    hero = addHero(world, 'owner', 'Tester', config),
    events: CombatEvent[] = [],
    shots = new Map<
      string,
      { abilityId: string; stage: string | undefined; fx: number; fy: number }
    >();
  hero.basicId = basic;
  hero.skillIds = [id, '', '', ''];
  hero.maxMana = hero.mana = 1000;
  world.random = () => 0.99;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      events.push(...world.events);
      for (const [id, p] of world.projectiles)
        if (!shots.has(id)) {
          const n = Math.hypot(p.vx, p.vy) || 1;
          shots.set(id, {
            abilityId: p.abilityId,
            stage: p.stage,
            fx: p.vx / n,
            fy: p.vy / n,
          });
        }
    }
  };
  const send = (c: Command) => {
    submitInput(world, hero.id, hero.lastSequence + 1, c);
    step();
  };
  const enemy = (id: string, x: number, y = 0) =>
    addCreep(world, id, { x: hero.x + x, y: hero.y + y }, config);
  const cast = () => send({ kind: 'cast', slot: 0 });
  const hits = (id: string) =>
    events.filter((e) => e.kind === 'hit' && e.abilityId === id);
  return { config, world, hero, events, shots, step, send, enemy, cast, hits };
}
describe('Director skill revise: authoritative runtime', () => {
  it('focus keeps facing for coincident targets and locks Hàng Long on targets beside the map edge',()=>{
    const f=fixture('hang_long_hoa_vu');f.hero.x=50;f.hero.y=80;f.hero.fx=-1;f.hero.fy=0;f.enemy('near',-25);f.cast();
    expect([...f.world.projectiles.values()][0]!.dragonFlight!.target).toEqual({x:25,y:80});
    const g=fixture('hang_long_hoa_vu');g.hero.x=50;g.hero.fx=-1;g.hero.fy=0;g.cast();expect([...g.world.projectiles.values()][0]!.dragonFlight!.target.x).toBeLessThan(50);
    const h=fixture();h.hero.fx=0;h.hero.fy=1;h.enemy('same',0);expect(targetDirection(h.world,h.hero,300,h.config)).toEqual({x:0,y:1});
  });
  it('Bát Quái permits movement inside but blocks walking and dashing across its boundary', () => {
    const f = fixture('bat_quai_kiem_tran', 'vo_dang_kiem'),
      p = addHero(f.world, 'enemy', 'Enemy', f.config);
    p.x = 650;
    p.y = 500;
    f.world.duel = new Set([f.hero.id, p.id]);
    f.cast();
    f.step(5);
    const area = f.world.areas![0]!;
    expect(area.trappedIds).toContain(p.id);
    submitInput(f.world, p.id, 1, { kind: 'move', x: 1, y: 0 });
    f.step(15);
    expect(p.x).toBeGreaterThan(650);
    f.step(60);
    expect(Math.hypot(p.x - area.x, p.y - area.y)).toBeLessThanOrEqual(
      area.effect.radius + 0.01,
    );
    submitInput(f.world, p.id, 2, { kind: 'dash' });
    f.step(12);
    expect(Math.hypot(p.x - area.x, p.y - area.y)).toBeLessThanOrEqual(
      area.effect.radius + 0.01,
    );
  });
  it('trap placements never exceed five even after charges recharge', () => {
    const f = fixture(duongMon.trap, duongMon.amKhi);
    const a = m1Config.progression!.skills[duongMon.trap]!.ranks[3]!;
    f.config.skillCatalogue![duongMon.trap] = a;
    for (let i = 0; i < 6; i++) {
      f.cast();
      f.step(a.cooldownTicks + 1);
    }
    expect(
      f.world.areas!.filter((a) => a.abilityId === duongMon.trap).length,
    ).toBeLessThanOrEqual(5);
  });
  it('validates every rank, keeps stable IDs, and exact approved rank values', () => {
    for (const d of Object.values(m1Config.progression!.skills))
      for (const a of d.ranks)
        expect(abilitySchema.safeParse(a).success, a.id).toBe(true);
    expect(m1Config.skillCatalogue!.hoa_van_chuong!.nameVi).toBe(
      'Hỏa Long Xuyên Sơn',
    );
    expect(m1Config.skillCatalogue!.chiet_mai_thu!.nameVi).toBe(
      'Phong Quyển Tàn Vân',
    );
    expect(
      m1Config.progression!.skills.lien_hoa_phien!.ranks.map(
        (a) => a.effect.mode === 'area' && a.effect.ownerDamageReduction,
      ),
    ).toEqual([0.4, 0.47, 0.53, 0.6]);
    expect(
      m1Config.progression!.skills[duongMon.trap]!.ranks.map((a) => a.charges),
    ).toEqual([3, 4, 5, 5]);
    expect(m1Config.basics.vo_dang_kiem!.effect).toMatchObject({
      projectileProc: { chance: 0.15 },
    });
  });
  it.each([
    'cuong_long_loan_vu',
    'phi_long_tai_thien',
    'luong_nghi_thu',
    'huyen_am_chuong',
    duongMon.arrows,
    duongMon.knives,
  ])('%s locks nearest direction once and falls back forward', (id) => {
    const f = fixture(id);
    f.hero.fx = -1;
    f.hero.fy = 0;
    const e = f.enemy('nearest', 0, 100);
    f.enemy('far', 180, 0);
    f.cast();
    expect(f.hero.fx).toBeCloseTo(0);
    expect(f.hero.fy).toBeCloseTo(1);
    e.x += 300;
    f.step(30);
    const shots = [...f.shots.values()].filter((e) => e.abilityId === id);
    expect(shots.length).toBeGreaterThan(0);
    expect(shots[0]!.fx).toBeCloseTo(0);
    expect(shots[0]!.fy).toBeCloseTo(1);
    const g = fixture(id);
    g.hero.fx = -1;
    g.hero.fy = 0;
    g.cast();
    expect(g.hero.fx).toBe(-1);
    expect(g.hero.fy).toBe(0);
  });
  it('fire dash crosses targets, bursts once at actual endpoint, and has no damaging trail', () => {
    const f = fixture();
    f.hero.fx = 1;
    f.hero.fy = 0;
    const crossed = f.enemy('cross', 80),
      end = f.enemy('end', 210),
      sideA = f.enemy('side-a', 210, 50),
      sideB = f.enemy('side-b', 210, -50),
      off = f.enemy('off', 80, 95);
    f.cast();
    f.step(30);
    expect(f.hero.x).toBeCloseTo(810);
    expect(crossed.hp).toBeLessThan(10000);
    expect(end.hp).toBeLessThan(10000);
    expect(sideA.hp).toBeLessThan(10000);
    expect(sideB.hp).toBeLessThan(10000);
    expect(off.hp).toBe(10000);
    expect(f.events.filter((e) => e.stage === 'dash_impact')).toMatchObject([
      { x: 810, y: 500 },
    ]);
    expect(f.world.areas).toEqual([]);
    expect(f.world.projectiles.size).toBe(0);
    const hp = crossed.hp;
    f.step(60);
    expect(crossed.hp).toBe(hp);
  });
  it('fire endpoint is clipped by a wall and movement locks reject cast without spending mana', () => {
    const f = fixture();
    f.config.collision = [{ x: 710, y: 400, width: 25, height: 200 }];
    f.cast();
    f.step(30);
    expect(f.hero.x).toBeLessThan(710);
    expect(f.events.filter((e) => e.stage === 'dash_impact')).toHaveLength(1);
    const g = fixture();
    applyStatus(
      g.hero,
      { kind: 'root', durationTicks: 30, magnitude: 1 },
      'x',
      'root',
      0,
    );
    g.cast();
    expect(g.hero.mana).toBe(1000);
    expect(g.world.actions ?? []).toHaveLength(0);
  });
  it('only successful staff A main-target hits stack, swapping target resets, and missed Phá Giáp consumes all', () => {
    const f = fixture('pha_giap_bong', 'cai_bang_bong'),
      a = f.enemy('a', 50),
      b = f.enemy('b', 65, 20);
    for (let i = 0; i < 5; i++) {
      f.send({ kind: 'basic' });
      f.step(25);
    }
    expect(f.hero.staffCharges).toEqual({ targetId: a.id, count: 4 });
    a.x = 1100;
    f.send({ kind: 'basic' });
    f.step(25);
    expect(f.hero.staffCharges).toEqual({ targetId: b.id, count: 1 });
    b.x = 1500;
    f.cast();
    expect(f.hero.staffCharges).toBeUndefined();
    f.step(25);
    expect(f.hits('pha_giap_bong')).toHaveLength(0);
    expect(hasStatus(f.hero, 'staff_charge', f.world.tick)).toBe(false);
  });
  it('Phá Giáp auto-focuses, bonus scales with four charges, stun lasts two seconds', () => {
    const damage = (charged: boolean) => {
      const f = fixture('pha_giap_bong', 'cai_bang_bong'),
        a = f.enemy('target', 0, 75);
      f.hero.fx = -1;
      if (charged) f.hero.staffCharges = { targetId: a.id, count: 4 };
      f.cast();
      f.step(12);
      expect(hasStatus(a, 'stun', f.world.tick)).toBe(true);
      expect(
        a.statuses!.find((s) => s.kind === 'stun')!.until - f.world.tick,
      ).toBeGreaterThan(40);
      return f.hits('pha_giap_bong')[0]!.damage;
    };
    expect(damage(true)).toBeGreaterThan(damage(false));
  });
  it('retreat gathers concurrently, then releases a straight piercing crescent after retreat', () => {
    const f = fixture('chiet_mai_thu', 'thien_son_phien'),
      a = f.enemy('a', 290, 30),
      b = f.enemy('b', 330, -35);
    const ax = a.x;
    f.cast();
    expect(f.hero.x).toBeLessThan(600);
    expect(a.x).toBeLessThan(ax);
    expect(f.world.projectiles.size).toBe(0);
    f.step(8);
    expect(f.hero.x).toBeCloseTo(522);
    expect(a.x).toBeCloseTo(780);
    expect(b.x).toBeCloseTo(780);
    f.step(10);
    expect(
      [...f.shots.values()].filter((e) => e.stage === 'wind_gust'),
    ).toHaveLength(1);
    f.step(30);
    expect(a.hp).toBeLessThan(10000);
    expect(b.hp).toBeLessThan(10000);
  });
  it('fan input launches, stops early, then recalls; no extra mana/CD on stop', () => {
    const f = fixture('luu_phong_bo', 'thien_son_phien');
    f.cast();
    f.step(2);
    const shot = [...f.world.projectiles.values()][0]!;
    expect(shot.stage).toBe('fan_outbound');
    const mana = f.hero.mana;
    f.cast();
    expect(shot.stage).toBe('fan_hold');
    expect(shot.remaining).toBe(0);
    const x = shot.x;
    f.step(2);
    expect(shot.x).toBe(x);
    expect(mana - f.hero.mana).toBeLessThanOrEqual(2);
    f.cast();
    expect(shot.stage).toBe('fan_return');
    f.step(30);
    expect(f.world.projectiles.size).toBe(0);
    expect(f.hero.skillCooldowns[0]).toBeGreaterThan(f.world.tick);
  });
  it('clones conceal without channel-lock, AoE still hurts, own action reveals while clones continue', () => {
    const f = fixture('bach_liet_thien_kich', 'thien_son_dao');
    f.enemy('target', 80);
    f.cast();
    expect(selectableTarget(f.hero, f.world.tick)).toBe(false);
    expect(hasStatus(f.hero, 'channel', f.world.tick)).toBe(false);
    const hp = f.hero.hp;
    hurt(f.world, f.hero, 'environment', 'splash', 40, f.config, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(f.hero.hp).toBeLessThan(hp);
    expect(hp - f.hero.hp).toBeLessThan(40);
    f.step(10);
    f.send({ kind: 'basic' });
    expect(selectableTarget(f.hero, f.world.tick)).toBe(true);
    expect(f.world.actions!.some((a) => a.detached)).toBe(true);
  });
  it('concealed targets are excluded from input focus but remain in radial damage', () => {
    const f = fixture('cuong_long_loan_vu');
    const other = addHero(f.world, 'hidden', 'Hidden', f.config);
    other.x = 650;
    other.y = 500;
    applyStatus(
      other,
      { kind: 'concealed', durationTicks: 40, magnitude: 1 },
      other.id,
      'test',
      0,
    );
    const visible = addHero(f.world, 'visible', 'Visible', f.config);
    visible.x = 600;
    visible.y = 650;
    f.world.duel = new Set([f.hero.id, other.id, visible.id]);
    f.world.duelTeams = new Map([
      [f.hero.id, 'a'],
      [other.id, 'b'],
      [visible.id, 'b'],
    ]);
    expect(targetDirection(f.world, f.hero, 300, f.config)).toEqual({
      x: 0,
      y: 1,
    });
  });
  it('Liệt Phong applies stun then mild slow, respects resistant stun duration', () => {
    for (const resistance of [0, 0.5]) {
      const f = fixture('liet_phong_dao', 'thien_son_dao'),
        a = f.enemy('target', 60);
      a.controlResistance = resistance;
      f.cast();
      f.step(19);
      expect(hasStatus(a, 'stun', f.world.tick)).toBe(true);
      expect(hasStatus(a, 'slow', f.world.tick)).toBe(false);
      const stun = a.statuses!.find((s) => s.kind === 'stun')!;
      f.step(stun.until - f.world.tick);
      expect(hasStatus(a, 'stun', f.world.tick)).toBe(false);
      expect(hasStatus(a, 'slow', f.world.tick)).toBe(true);
    }
  });
  it('palm A reaches the art, steals PVP mana, and refunds a little against mana-less PVE', () => {
    const f = fixture('', 'vo_dang_quyen'),
      a = f.enemy('pve', 110);
    f.hero.mana = 100;
    f.world.random = () => 0;
    f.send({ kind: 'basic' });
    expect(a.hp).toBeLessThan(10000);
    expect(f.hero.mana).toBe(103);
    const g = fixture('', 'vo_dang_quyen');
    const p = addHero(g.world, 'pvp', 'PVP', g.config);
    p.x = 700;
    p.y = 500;
    p.mana = 5;
    g.world.duel = new Set([g.hero.id, p.id]);
    g.hero.mana = 100;
    g.world.random = () => 0;
    g.send({ kind: 'basic' });
    expect(p.mana).toBe(0);
    expect(g.hero.mana).toBe(105);
  });
  it('five ink blasts lock around target at cast, not around caster or later target position', () => {
    const f = fixture('huyen_am_chuong', 'vo_dang_quyen'),
      a = f.enemy('target', 240);
    f.cast();
    a.x = 1500;
    f.step(24);
    const inks = f.world.areas!.filter((a) => a.stage === 'ink');
    expect(inks).toHaveLength(5);
    expect(inks.every((a) => Math.hypot(a.x - 840, a.y - 500) < 170)).toBe(
      true,
    );
    expect(
      inks.every((a) =>
        a.effect.statuses?.some(
          (s) => s.kind === 'stun' && s.durationTicks === 30,
        ),
      ),
    ).toBe(true);
  });
  it('Thất Tinh rains seven fast impacts at locked target, no warning field, target can dodge', () => {
    const f = fixture('that_tinh_kiem', 'vo_dang_kiem'),
      a = f.enemy('target', 250);
    f.cast();
    expect(f.world.areas ?? []).toHaveLength(0);
    expect(f.events.filter((e) => e.stage === 'sword_rain_fall')).toHaveLength(
      7,
    );
    a.y = 850;
    f.step(35);
    expect(
      f.events.filter((e) => e.stage === 'sword_rain_impact'),
    ).toHaveLength(7);
    expect(a.hp).toBe(10000);
    const g = fixture('that_tinh_kiem', 'vo_dang_kiem'),
      b = g.enemy('target', 250);
    g.cast();
    g.step(35);
    expect(g.hits('that_tinh_kiem')).toHaveLength(7);
    expect(b.hp).toBeLessThan(10000);
  });
  it('area reduction is fifteen percent in area and end-star bursts match Q without stun', () => {
    expect(
      m1Config.progression!.skills.thai_cuc_tran!.ranks[0]!.effect,
    ).toMatchObject({ radius: 192 * Math.sqrt(0.85) });
    const f = fixture(conLuan.star, conLuan.sword);
    f.cast();
    f.step(16);
    const area = f.world.areas![0]!;
    const points = fiveSwordPoints(
      area.x,
      area.y,
      area.effect.radius,
      area.effect.radiusY!,
    );
    const a = f.enemy('end', points[0]!.x - f.hero.x, points[0]!.y - f.hero.y);
    a.statuses = [];
    f.events.length = 0;
    f.step(area.until - f.world.tick);
    expect(f.events.filter((e) => e.stage === 'formation_burst')).toHaveLength(
      5,
    );
    expect(
      a.statuses!.some((s) => s.kind === 'stun' && s.until > f.world.tick),
    ).toBe(false);
    const q = m1Config.skillCatalogue![conLuan.detonate]!.effect;
    if (q.mode !== 'area') throw Error('Q area');
    expect(area.effect.expireBurst).toEqual({
      damage: q.damage,
      radius: q.radius,
    });
  });
  it('Minh Vương heals self once and buffs allies, never enemy or allied HP', () => {
    const f = fixture('bat_dong_minh_vuong', 'thieu_lam_dao'),
      ally = addHero(f.world, 'ally', 'Ally', f.config);
    ally.x = 650;
    ally.y = 500;
    ally.hp = 100;
    f.hero.hp = 100;
    f.cast();
    expect(f.hero.hp).toBeGreaterThan(100);
    expect(ally.hp).toBe(100);
    expect(statusValue(ally, 'defense_buff', f.world.tick)).toBeGreaterThan(0);
    expect(statusValue(ally, 'attack_buff', f.world.tick)).toBeGreaterThan(0);
    const hp = f.hero.hp;
    f.step(10);
    expect(f.hero.hp).toBe(hp);
  });
  it('Q is passive: no input cost/toggle; PVE direct hit can be negated and reflected with 0.5s stun', () => {
    const f = fixture(conLuan.stance, conLuan.monk),
      a = f.enemy('attacker', 50);
    f.hero.schoolId = conLuan.school;
    f.world.random = () => 0;
    f.cast();
    expect(f.hero.mana).toBe(1000);
    expect(hasStatus(f.hero, 'con_luan_ranged', f.world.tick)).toBe(false);
    const hp = f.hero.hp;
    expect(hurt(f.world, f.hero, a.id, 'direct_skill', 50, f.config)).toBe(
      false,
    );
    expect(f.hero.hp).toBe(hp);
    expect(a.hp).toBeLessThan(10000);
    expect(
      a.statuses!.find((s) => s.kind === 'stun')!.until - f.world.tick,
    ).toBe(15);
  });
  it('passive excludes PVP skills, DOT, hazards, reflection and has no recursive loops', () => {
    const f = fixture(conLuan.stance, conLuan.monk),
      a = f.enemy('creep', 50);
    f.world.random = () => 0;
    const p = addHero(f.world, 'pvp', 'PVP', f.config);
    p.x = 650;
    p.y = 500;
    f.world.duel = new Set([f.hero.id, p.id]);
    expect(hurt(f.world, f.hero, p.id, 'la_han_quyen', 10, f.config)).toBe(
      true,
    );
    expect(hurt(f.world, f.hero, p.id, 'vo_dang_quyen', 10, f.config)).toBe(
      false,
    );
    delete f.world.duel;
    delete f.world.duel;
    delete f.world.duel;
    expect(
      hurt(f.world, f.hero, a.id, 'dot', 10, f.config, {
        critChance: 0,
        critMultiplier: 1,
        periodic: true,
      }),
    ).toBe(true);
    expect(hurt(f.world, f.hero, 'hazard', 'spike', 10, f.config)).toBe(true);
    expect(
      hurt(f.world, f.hero, a.id, 'reflection', 10, f.config, {
        critChance: 0,
        critMultiplier: 1,
        reactive: true,
      }),
    ).toBe(true);
  });
  it('flight A has three old feathers; flight Q throws three small ice bombs around target', () => {
    const f = fixture(duongMon.arrows, duongMon.coQuan),
      a = f.enemy('target', 200);
    applyStatus(
      f.hero,
      { kind: 'duong_mon_flight', durationTicks: 300, magnitude: 1 },
      f.hero.id,
      duongMon.flight,
      0,
    );
    f.send({ kind: 'basic' });
    expect(
      [...f.world.projectiles.values()].filter((p) => p.stage === 'feather'),
    ).toHaveLength(3);
    f.step(20);
    f.cast();
    f.step(12);
    const bombs = f.world.areas!.filter((a) => a.stage === 'ice_bomb');
    expect(bombs).toHaveLength(3);
    expect(bombs.every((b) => Math.hypot(b.x - a.x, b.y - a.y) < 60)).toBe(
      true,
    );
    const hpBeforeBombs=a.hp;
    f.step(24);
    expect(a.hp).toBeLessThan(hpBeforeBombs);
    expect(hasStatus(a,'slow',f.world.tick)).toBe(true);
    expect(
      [...f.world.projectiles.values()].filter(
        (p) => p.abilityId === duongMon.arrows,
      ),
    ).toHaveLength(0);
  });
  it('flight E dashes with damage along its ground line; R folds wings', () => {
    const f = fixture(duongMon.laser, duongMon.coQuan),
      a = f.enemy('target', 100);
    applyStatus(
      f.hero,
      { kind: 'duong_mon_flight', durationTicks: 300, magnitude: 1 },
      f.hero.id,
      duongMon.flight,
      0,
    );
    f.cast();
    expect(f.hero.x).toBe(600);
    f.step(25);
    expect(f.hero.x).toBeCloseTo(780);
    expect(a.hp).toBeLessThan(10000);
    f.hero.skillIds![0] = duongMon.shell;
    f.hero.skillCooldowns[0] = 0;
    f.cast();
    expect(hasStatus(f.hero, 'duong_mon_flight', f.world.tick)).toBe(false);
    expect(hasStatus(f.hero, 'duong_mon_shell', f.world.tick)).toBe(true);
  });
  it('evade emits eight radial straight darts after actual dash; cancel removes owned effects', () => {
    const f = fixture(duongMon.evade, duongMon.amKhi);
    f.cast();
    f.step(20);
    const darts = [...f.shots.values()].filter((e) => e.stage === 'evade_dart');
    expect(darts).toHaveLength(8);
    expect(
      new Set(darts.map((e) => Math.atan2(e.fy!, e.fx!).toFixed(3))).size,
    ).toBe(8);
    cancelOwnedEffects(f.world, f.hero.id);
    expect(f.world.projectiles.size).toBe(0);
  });
});
