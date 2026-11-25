import { describe, it, expect } from 'vitest';
import {
  addHero,
  createWorld,
  stepWorld,
  submitInput,
  initializeProgression,
  characterStats,
  gainExperience,
  changeBuild,
  pointAccounting,
  hasStatus,
  DungeonMatch,
  createSeededRandom,
  fortuneReadings,
  skillCharges,
  type CombatEvent,
  type BuildChange,
} from '@volam/game-core';
import {
  m1Config,
  voDangSkills,
  voDangBasics,
  creepDungeon,
  abilitySchema,
  skillArt,
  skillIcon,
  skillVisualStages,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import {
  applyStatus,
  cancelOwnedEffects,
} from '../packages/game-core/src/status.js';
function fixture(id = 'luong_nghi_thu') {
  const config = structuredClone(m1Config);
  Object.assign(config, {
    width: 1000,
    height: 800,
    collision: [],
    spawn: { x: 300, y: 300 },
    manaRegen: 0,
    critChance: 0,
    creepSpawns: [
      { x: 340, y: 300 },
      { x: 380, y: 300 },
      { x: 260, y: 300 },
    ],
  });
  Object.assign(config.creep, {
    hp: 10000,
    defense: 0,
    speed: 0,
    detectionRange: 1,
  });
  const world = createWorld(config),
    hero = addHero(world, 'a', 'A', config),
    events: CombatEvent[] = [];
  hero.schoolId = 'vo_dang';
  hero.basicId = 'vo_dang_quyen';
  hero.skillIds = [id, '', '', ''];
  hero.mana = hero.maxMana = 180;
  world.random = () => 0.99;
  const enemies = [...world.creeps.values()];
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const input = (c: Parameters<typeof submitInput>[3]) =>
    submitInput(world, hero.id, hero.lastSequence + 1, c);
  const cast = () => {
    input({ kind: 'cast', slot: 0 });
    steps(1);
  };
  const hits = (target = enemies[0]!.id) =>
    events.filter(
      (e) =>
        e.kind === 'hit' && e.sourceId === hero.id && e.targetId === target,
    );
  return { config, world, hero, enemies, events, steps, input, cast, hits };
}
describe('M3C2 authoritative Yin–Yang', () => {
  it.each(voDangSkills.map((a) => a.id))(
    '%s validates mana/cooldown/death/silence and duplicate sequences',
    (id) => {
      const f = fixture(id);
      f.hero.mana = 0;
      f.cast();
      expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(
        id === 'thai_cuc_than_cong' ? 1 : 0,
      );
      f.hero.mana = 180;
      f.hero.hp = 0;
      f.cast();
      expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(
        id === 'thai_cuc_than_cong' ? 1 : 0,
      );
      const g = fixture(id);
      applyStatus(
        g.hero,
        { kind: 'silence', magnitude: 1, durationTicks: 10 },
        'enemy',
        'silence',
        0,
      );
      g.cast();
      expect(g.events).toEqual([]);
      const h = fixture(id);
      h.cast();
      expect(h.events.filter((e) => e.kind === 'cast')).toHaveLength(1);
      expect(
        submitInput(h.world, 'a', h.hero.lastSequence, {
          kind: 'cast',
          slot: 0,
        }),
      ).toBe(false);
      for (let i = 0; i < 8; i++) h.input({ kind: 'cast', slot: 0 });
      h.steps(1);
      expect(h.events.filter((e) => e.kind === 'cast')).toHaveLength(
        id === 'thai_cuc_than_cong' ? 2 : 1,
      );
      expect(h.hero.mana).toBe(180 - m1Config.skillCatalogue![id]!.manaCost);
    },
  );
  it('Quyền is fast modest forward melee with reduced cleave and misses behind/range/terrain', () => {
    const f = fixture();
    f.enemies[1]!.x = 345;
    f.enemies[1]!.y = 315;
    f.input({ kind: 'basic' });
    f.steps(1);
    expect(f.hits()[0]!.damage).toBe(19);
    expect(f.hits(f.enemies[1]!.id)[0]!.damage).toBe(4);
    expect(f.enemies[2]!.hp).toBe(10000);
    expect(f.world.projectiles.size).toBe(0);
    expect(voDangBasics['vo_dang_quyen']!.cooldownTicks).toBe(0);
    expect(f.hero.cooldown).toBe(f.world.tick);
    f.input({ kind: 'basic' });
    f.input({ kind: 'basic' });
    f.steps(1);
    expect(
      f.events.filter((e) => e.kind === 'attack').map((e) => e.stage),
    ).toEqual(['left_palm', 'right_palm']);
    const g = fixture();
    g.config.collision = [{ x: 320, y: 250, width: 2, height: 100 }];
    g.input({ kind: 'basic' });
    g.steps(1);
    expect(g.hits()).toHaveLength(0);
  });
  it('Kiếm proc uses server RNG, captures nearest eligible position once, and can miss a moving target', () => {
    const f = fixture();
    f.hero.basicId = 'vo_dang_kiem';
    f.world.random = () => 0.1;
    f.enemies[0]!.x = 480;
    f.enemies[1]!.x = 650;
    f.enemies[2]!.x = 800;
    f.input({ kind: 'basic' });
    f.steps(1);
    expect(f.world.projectiles.size).toBe(1);
    const shot = [...f.world.projectiles.values()][0]!;
    expect(shot.vy).toBe(0);
    expect(shot.vx).toBe(390);
    f.enemies[0]!.y = 450;
    f.steps(24);
    expect(shot.vy).toBe(0);
    expect(f.enemies[0]!.hp).toBe(10000);
    const g = fixture();
    g.hero.basicId = 'vo_dang_kiem';
    g.input({ kind: 'basic' });
    g.steps(1);
    expect(g.world.projectiles.size).toBe(0);
    const outcomes = (seed: number) => {
      const r = fixture();
      r.world.random = createSeededRandom(seed);
      r.hero.basicId = 'vo_dang_kiem';
      r.world.creeps.clear();
      for (let i = 0; i < 20; i++) {
        r.input({ kind: 'basic' });
        r.steps(19);
      }
      return r.events.filter((e) => e.stage === 'proc').map((e) => e.id);
    };
    expect(outcomes(42)).toEqual(outcomes(42));
    expect(outcomes(42).length).toBeGreaterThan(0);
    expect(outcomes(42)).not.toEqual(outcomes(99));
  });
  it('Kiếm chooses one of five independent sword poses per accepted A with unchanged melee damage', () => {
    const poses = ['thrust', 'cut_left', 'cut_right', 'cut_down', 'cut_up'];
    for (const [index, pose] of poses.entries()) {
      const f = fixture();
      f.hero.basicId = 'vo_dang_kiem';
      let draws = 0;
      f.world.random = () => (draws++ === 0 ? (index + 0.5) / 5 : 0.99);
      f.input({ kind: 'basic' });
      f.input({ kind: 'basic' });
      f.steps(1);
      expect(
        f.events.filter((e) => e.kind === 'attack').map((e) => e.stage),
      ).toEqual([pose]);
      expect(f.hero.basicStage).toBe(pose);
      expect(f.hits()[0]?.damage).toBe(27);
      expect(f.world.projectiles.size).toBe(0);
    }
  });
  it('Lưỡng Nghi reduces actual enemy attack power, strongest nonstacking refresh and exact expiry', () => {
    const f = fixture();
    f.cast();
    f.steps(8);
    const e = f.enemies[0]!;
    expect(hasStatus(e, 'attack_break', f.world.tick)).toBe(true);
    expect(hasStatus(e, 'slow', f.world.tick)).toBe(true);
    const hp = f.hero.hp;
    hurt(f.world, f.hero, e.id, 'strike', 50, f.config);
    expect(f.hero.hp).toBe(hp - 40);
    applyStatus(
      e,
      { kind: 'attack_break', magnitude: 0.1, durationTicks: 5 },
      'b',
      'weaker',
      1,
    );
    hurt(f.world, f.hero, e.id, 'strike', 50, f.config);
    expect(f.hero.hp).toBe(hp - 80);
    applyStatus(
      e,
      { kind: 'attack_break', magnitude: 0.2, durationTicks: 90 },
      'a',
      'luong_nghi_thu',
      1,
    );
    expect(
      e.statuses!.filter(
        (s) => s.kind === 'attack_break' && s.abilityId === 'luong_nghi_thu',
      ),
    ).toHaveLength(1);
    f.steps(90);
    expect(hasStatus(e, 'attack_break', f.world.tick)).toBe(false);
  });
  it('Huyền Âm launches two straight knockbacks before five seals detonate together after 30 ticks', () => {
    const f = fixture('huyen_am_chuong');
    f.cast();
    expect(f.world.projectiles.size).toBe(0);
    f.steps(4);
    expect(
      [...f.world.projectiles.values()].map((p) => [p.stage, p.vx, p.vy]),
    ).toEqual([['travel_0', 650, 0]]);
    f.steps(5);
    expect([...f.world.projectiles.values()].map((p) => p.stage)).toContain(
      'travel_1',
    );
    f.steps(12);
    const seals = f.world.areas!;
    expect(f.hits().map((e) => e.hitPhase)).toEqual(['travel_0', 'travel_1']);
    expect(f.enemies[0]!.x).toBeCloseTo(384);
    expect(f.enemies[2]!.hp).toBe(10000);
    expect(seals).toHaveLength(5);
    expect(new Set(seals.map(({ x, y }) => x + ',' + y)).size).toBe(5);
    for (const seal of seals) {
      expect(
        Math.hypot(seal.x - f.hero.x, seal.y - f.hero.y),
      ).toBeGreaterThanOrEqual(63);
      expect(seal.nextTick - f.world.tick).toBe(30);
    }
    Object.assign(f.enemies[0]!, { x: seals[0]!.x, y: seals[0]!.y });
    f.steps(29);
    expect(f.hits()).toHaveLength(2);
    f.steps(1);
    expect(f.hits().map((e) => e.hitPhase)).toEqual([
      'travel_0',
      'travel_1',
      undefined,
    ]);
    expect(f.events.filter((e) => e.stage === 'area_tick')).toHaveLength(5);
    f.steps(1);
    expect(f.world.areas).toEqual([]);
  });
  it('cancels the pending ink scatter and fortune roll when their owner leaves the world', () => {
    for (const id of ['huyen_am_chuong', 'duong_khi_kich']) {
      const f = fixture(id);
      f.cast();
      f.steps(10);
      cancelOwnedEffects(f.world, f.hero.id);
      f.steps(151);
      expect(f.world.areas).toEqual([]);
      expect(
        f.events.some(
          (e) => e.stage === 'area_tick' || e.stage?.startsWith('fortune:'),
        ),
      ).toBe(false);
      expect(f.hero.fortune).toBeUndefined();
    }
  });
  it('movement slow and attack slow remain independent statuses', () => {
    const f = fixture();
    initializeProgression(f.hero, f.config);
    const base = characterStats(f.hero, f.config).total;
    applyStatus(
      f.hero,
      { kind: 'slow', magnitude: 0.3, durationTicks: 5 },
      'enemy',
      'test',
      1,
    );
    applyStatus(
      f.hero,
      { kind: 'attack_slow', magnitude: 0.25, durationTicks: 10 },
      'enemy',
      'test',
      1,
    );
    const slow = characterStats(f.hero, f.config, 1).total;
    expect(slow.movementSpeed).toBeCloseTo(base.movementSpeed * 0.7);
    expect(slow.attackSpeed).toBeCloseTo(base.attackSpeed * 0.75);
    expect(characterStats(f.hero, f.config, 6).total.movementSpeed).toBe(
      base.movementSpeed,
    );
    expect(characterStats(f.hero, f.config, 6).total.attackSpeed).toBeCloseTo(
      base.attackSpeed * 0.75,
    );
  });
  it.each(fortuneReadings)(
    'Bói Toán chốt %s through the second cast',
    (reading) => {
      const f = fixture('duong_khi_kich');
      const index = fortuneReadings.indexOf(reading);
      f.world.random = () => (index + 0.05) / 8;
      f.hero.hp = 100;
      f.hero.mana = 80;
      const ally = addHero(f.world, 'ally', 'Ally', f.config);
      f.cast();
      const cooldown = f.hero.skillCooldowns[0];
      expect(
        f.hero.statuses?.find((s) => s.kind === 'fortune_roll')?.magnitude,
      ).toBe(index);
      f.cast();
      expect(
        f.hero.statuses?.find((s) => s.kind === 'fortune_result')?.magnitude,
      ).toBe(index);
      expect(f.hero.skillCooldowns[0]).toBe(cooldown);
      expect(f.hero.mana).toBeCloseTo(reading === 'ton' ? 70 + 180 * 0.16 : 70);
      expect(f.hero.hp).toBeCloseTo(
        reading === 'can'
          ? 100 + 160 * 0.12
          : reading === 'ly'
            ? 100 - 160 * 0.08
            : 100,
      );
      expect(ally.hp).toBe(160);
      expect(f.hits()).toHaveLength(reading === 'doai' ? 1 : 0);
      if (reading === 'doai') expect(f.hits()[0]?.damage).toBe(30);
      const status = {
        can: 'hp_regen_buff',
        khon: 'attack_buff',
        ton: 'mana_regen_buff',
        kham: 'speed_buff',
        chan: 'stun',
      } as const;
      const kind = status[reading as keyof typeof status];
      if (kind) {
        const duration = reading === 'chan' ? 60 : 90;
        const applied = f.hero.statuses?.find((s) => s.kind === kind);
        expect(applied?.until).toBe(f.world.tick + duration);
        if (reading === 'khon') {
          expect(
            f.hero.statuses?.find((s) => s.kind === 'crit_buff')?.secondary,
          ).toBe(0.25);
          hurt(f.world, f.enemies[0]!, f.hero.id, 'strike', 100, f.config, {
            critChance: 1,
            critMultiplier: 2.25,
          });
          expect(f.world.events.at(-1)?.damage).toBe(259);
        }
        f.steps(duration);
        expect(hasStatus(f.hero, kind, f.world.tick)).toBe(false);
      }
      f.cast();
      expect(
        f.events.filter((e) => e.stage === 'fortune:' + reading),
      ).toHaveLength(1);
    },
  );
  it('rotates through all eight quẻ and auto-chốt at the five-second deadline even under silence', () => {
    const f = fixture('duong_khi_kich');
    f.world.random = () => 0;
    f.cast();
    for (let index = 0; index < 8; index++) {
      if (index > 0) f.steps(5);
      expect(
        f.hero.statuses?.find((s) => s.kind === 'fortune_roll')?.magnitude,
      ).toBe(index);
    }
    f.steps(113);
    applyStatus(
      f.hero,
      { kind: 'silence', magnitude: 1, durationTicks: 10 },
      'enemy',
      'probe',
      f.world.tick,
    );
    f.cast();
    expect(f.hero.fortune).toBeDefined();
    f.steps(1);
    expect(f.hero.fortune).toBeUndefined();
    expect(
      f.events
        .filter((e) => e.stage?.startsWith('fortune:'))
        .map((e) => e.stage),
    ).toEqual(['fortune:can-nui']);
  });
  it('Thái Cực shield spends mana after armor, partially absorbs depletion and applies lethal remainder', () => {
    const f = fixture('thai_cuc_than_cong');
    f.cast();
    const hp = f.hero.hp;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 100, f.config);
    expect(f.hero.hp).toBe(hp);
    expect(f.hero.mana).toBe(55);
    f.hero.mana = 25;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 100, f.config);
    expect(f.hero.mana).toBe(0);
    expect(f.hero.hp).toBe(hp - 80);
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 100, f.config);
    expect(f.hero.hp).toBe(0);
    expect(f.hero.statuses).toEqual([]);
    const g = fixture('thai_cuc_than_cong');
    g.cast();
    g.steps(180);
    expect(hasStatus(g.hero, 'mana_shield', g.world.tick)).toBe(true);
    g.cast();
    expect(hasStatus(g.hero, 'mana_shield', g.world.tick)).toBe(false);
    const before = g.hero.mana;
    hurt(g.world, g.hero, g.enemies[0]!.id, 'strike', 10, g.config);
    expect(g.hero.mana).toBe(before);
  });
  it('mana shields absorb the post-armor amount and never refill from respec', () => {
    const f = fixture('thai_cuc_than_cong');
    f.config.progression!.schools['vo_dang']!.base.defense = 100;
    initializeProgression(f.hero, f.config);
    changeBuild(f.world, f.hero, f.config, 0, {
      action: 'loadout',
      ids: ['thai_cuc_than_cong', '', '', ''],
    });
    changeBuild(f.world, f.hero, f.config, 1, {
      action: 'upgrade',
      skillId: 'thai_cuc_than_cong',
    });
    f.cast();
    const hp = f.hero.hp,
      mana = f.hero.mana;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 100, f.config);
    expect(f.hero.hp).toBe(hp);
    expect(f.hero.mana).toBe(mana - 62.5);
  });
  it('shield uses only strongest active shield and insufficient mana never prevents lethal damage', () => {
    const f = fixture('thai_cuc_than_cong');
    f.cast();
    applyStatus(
      f.hero,
      { kind: 'mana_shield', magnitude: 0.5, secondary: 1, durationTicks: 30 },
      'b',
      'other',
      1,
    );
    f.hero.hp = 15;
    f.hero.mana = 5;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 20, f.config);
    expect(f.hero.hp).toBe(0);
    expect(f.hero.mana).toBe(0);
    const g = fixture('thai_cuc_than_cong');
    g.cast();
    g.hero.hp = 20;
    g.hero.mana = 100;
    hurt(g.world, g.hero, g.enemies[0]!.id, 'strike', 30, g.config);
    expect(g.hero.hp).toBe(20);
  });
  it.each(['thai_cuc_tran', 'bat_quai_kiem_tran'])(
    '%s is stationary, ticks exactly, validates entry/exit/terrain, and expires',
    (id) => {
      const f = fixture(id);
      f.cast();
      if (id === 'thai_cuc_tran') {
        f.steps(23);
        expect(f.world.areas).toHaveLength(0);
        f.steps(1);
        expect(f.world.areas?.[0]?.effect.radius).toBeCloseTo(
          192 * Math.sqrt(0.85),
        );
      }
      expect(f.hits()).toHaveLength(1);
      const area = f.world.areas![0]!;
      const interval = area.effect.tickInterval;
      f.hero.x = 600;
      f.enemies[0]!.x = 700;
      f.steps(interval);
      expect(f.hits()).toHaveLength(1);
      expect(area.x).toBe(300);
      f.enemies[0]!.x = 340;
      f.steps(interval);
      expect(f.hits()).toHaveLength(2);
      f.config.collision = [{ x: 320, y: 250, width: 5, height: 100 }];
      f.steps(interval);
      expect(f.hits()).toHaveLength(2);
      f.steps(250);
      expect(f.world.areas).toEqual([]);
      const g = fixture(id);
      g.cast();
      g.steps(220);
      expect(g.hits()).toHaveLength(6);
      expect(g.enemies[0]!.statuses).toEqual([]);
    },
  );
  it('overlapping formations have independent IDs/cadence and never damage allies', () => {
    const f = fixture('bat_quai_kiem_tran'),
      b = addHero(f.world, 'b', 'B', f.config);
    b.skillIds = ['bat_quai_kiem_tran', '', '', ''];
    b.x = 300;
    b.y = 300;
    f.cast();
    submitInput(f.world, 'b', 1, { kind: 'cast', slot: 0 });
    f.steps(1);
    expect(f.world.areas).toHaveLength(2);
    const hp = f.hero.hp;
    f.steps(150);
    expect(f.hero.hp).toBe(hp);
    expect(b.hp).toBe(160);
    expect(f.enemies[0]!.hp).toBe(10000 - 12 * 22);
  });
  it('Thất Tinh base cooldown is 3s: rejects at tick 89 and accepts exactly at tick 90, retaining rank reductions', () => {
    expect(m1Config.skillCatalogue!.that_tinh_kiem!.cooldownTicks).toBe(90);
    m1Config.progression!.skills.that_tinh_kiem!.ranks.forEach((a, i) =>
      expect(a.cooldownTicks).toBe(90 - i * 3),
    );
    const f = fixture('that_tinh_kiem');
    f.cast();
    const start = f.world.tick;
    expect(f.hero.skillCooldowns[0]).toBe(start + 90);
    f.steps(88);
    f.cast();
    expect(f.world.tick - start).toBe(89);
    expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(1);
    f.cast();
    expect(f.world.tick - start).toBe(90);
    expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(2);
  });

  it('Thất Tinh has seven staggered remote impacts despite cast spam and no warning ring', () => {
    const f = fixture('that_tinh_kiem');
    f.cast();
    const castAt = f.world.tick;
    expect(f.world.areas ?? []).toHaveLength(0);
    f.steps(14);
    expect(f.hits()).toHaveLength(0);
    for (let i = 0; i < 30; i++) {
      f.input({ kind: 'cast', slot: 0 });
      f.steps(1);
    }
    expect(f.hits().map((e) => e.damage)).toEqual(Array(7).fill(14));
    const impacts = f.events.filter((e) => e.stage === 'sword_rain_impact');
    expect(impacts.map((e) => e.hitIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(impacts.map((e) => e.tick! - castAt)).toEqual([
      15, 17, 19, 21, 23, 25, 27,
    ]);
    expect(f.enemies[2]!.hp).toBe(10000);
  });

  it('Nhân Kiếm pierces each target once along its original direction; walls stop travel', () => {
    const f = fixture('nhan_kiem_hop_nhat');
    f.cast();
    f.steps(40);
    expect(f.hits().map((e) => e.damage)).toEqual([55]);
    expect(f.hits(f.enemies[1]!.id)).toHaveLength(1);
    expect(f.enemies[2]!.hp).toBe(10000);
    const g = fixture('nhan_kiem_hop_nhat');
    g.config.collision = [{ x: 320, y: 200, width: 2, height: 200 }];
    g.cast();
    g.steps(40);
    expect(g.hits()).toHaveLength(0);
  });
  it('Tọa Sát mitigates by 70%, retains actual damage, then reflects radially once at five seconds', () => {
    const f = fixture('toa_sat_bac_do');
    f.cast();
    const hp = f.hero.hp;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 10, f.config);
    expect(f.hero.hp).toBe(hp - 3);
    expect(f.enemies[0]!.hp).toBe(10000);
    expect(hasStatus(f.hero, 'guard_counter', f.world.tick)).toBe(true);
    f.steps(150);
    expect(f.enemies[0]!.hp).toBe(9997);
    expect(f.enemies[2]!.hp).toBe(9997);
    expect(f.events.filter((e) => e.stage === 'counter_release')).toHaveLength(
      1,
    );
    f.steps(151);
    expect(f.events.filter((e) => e.stage === 'counter_release')).toHaveLength(
      1,
    );
  });
  it('Vạn Kiếm locks a front boss over a nearer creep and lands once after the rise, quiet beat and drop', () => {
    const f = fixture('van_kiem_quy_tong');
    const boss = f.enemies[1]!;
    Object.assign(boss, { x: 530, y: 300, encounterBoss: true });
    f.enemies[2]!.encounterBoss = true;
    f.cast();
    const area = f.world.areas![0]!;
    expect(area).toMatchObject({
      x: 530,
      y: 300,
      launch: { x: 300, y: 300, fx: 1, fy: 0 },
    });
    expect(area.nextTick - f.world.tick).toBe(80);
    expect(f.world.projectiles.size).toBe(0);
    expect(hasStatus(f.hero, 'channel', f.world.tick)).toBe(true);
    boss.x = 700;
    f.enemies[0]!.x = 534;
    f.steps(36);
    expect(hasStatus(f.hero, 'channel', f.world.tick)).toBe(false);
    f.steps(43);
    expect(f.hits()).toHaveLength(0);
    f.steps(1);
    expect(f.hits().map((e) => e.damage)).toEqual([108]);
    expect(f.hits(boss.id)).toHaveLength(0);
    expect(f.events.filter((e) => e.stage === 'area_tick')).toHaveLength(1);
    expect(f.world.areas).toHaveLength(1);
    f.steps(40);
    expect(f.world.areas).toEqual([]);
    expect(f.events.filter((e) => e.stage === 'area_tick')).toHaveLength(1);
  });
  it('Vạn Kiếm spends one charge and mana per accepted cast, restores charges in order, and scales 2–5 by rank', () => {
    const f = fixture('van_kiem_quy_tong');
    const ability = f.config.skillCatalogue!['van_kiem_quy_tong']!;
    const charges = () => skillCharges(f.hero, ability, f.world.tick);
    expect(
      f.config.progression!.skills[ability.id]!.ranks.map((a) => a.charges),
    ).toEqual([2, 3, 4, 5]);
    expect(charges()?.count).toBe(2);
    f.cast();
    f.cast();
    expect(charges()?.count).toBe(1);
    expect(f.hero.mana).toBe(138);
    f.steps(34);
    f.cast();
    expect(charges()?.count).toBe(0);
    expect(f.world.areas).toHaveLength(2);
    expect(f.hero.mana).toBe(96);
    f.steps(36);
    f.cast();
    expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(2);
    const first = charges()!.pending[0]!;
    const second = charges()!.pending[1]!;
    expect(second - first).toBe(510);
    f.steps(first - f.world.tick);
    expect(charges()?.count).toBe(1);
    f.steps(second - f.world.tick);
    expect(charges()?.count).toBe(2);
  });
  it('mana regeneration uses server ticks, innate growth and max caps without regenerating dead players', () => {
    const f = fixture();
    initializeProgression(f.hero, f.config);
    f.hero.mana = 0;
    f.steps(30);
    expect(f.hero.mana).toBeCloseTo(9);
    gainExperience(f.hero, 1740, f.config);
    expect(
      characterStats(f.hero, f.config).sources.innate.manaRegen,
    ).toBeCloseTo(4.35);
    f.hero.mana = f.hero.maxMana - 0.01;
    f.steps(1);
    expect(f.hero.mana).toBe(f.hero.maxMana);
    f.hero.hp = 0;
    f.hero.mana = 0;
    f.steps(30);
    expect(f.hero.mana).toBe(0);
  });
  it('M3B mix/ranks/ultimates/school/surplus are validated, recalculate without duplication and retain cooldown debt', () => {
    const f = fixture();
    initializeProgression(f.hero, f.config);
    expect(f.hero.maxMana).toBe(180);
    expect(f.hero.skillIds).toEqual(['', '', '', '']);
    const change = (c: BuildChange) =>
      changeBuild(f.world, f.hero, f.config, f.hero.progression!.revision, c);
    expect(
      change({ action: 'loadout', ids: ['hoa_van_chuong', '', '', ''] }),
    ).toBeTruthy();
    expect(change({ action: 'basic', basicId: 'thien_son_dao' })).toBeTruthy();
    expect(
      change({ action: 'loadout', ids: ['thai_cuc_tran', '', '', ''] }),
    ).toBeTruthy();
    gainExperience(f.hero, 1740, f.config);
    expect(
      change({
        action: 'loadout',
        ids: ['thai_cuc_tran', 'van_kiem_quy_tong', '', ''],
      }),
    ).toBeTruthy();
    const ids = [
      'luong_nghi_thu',
      'duong_khi_kich',
      'thai_cuc_than_cong',
      'van_kiem_quy_tong',
    ];
    expect(change({ action: 'loadout', ids })).toBeUndefined();
    for (const id of ids) {
      const skill = f.config.progression!.skills[id]!;
      const rankCap = skill.ultimate ? 3 : skill.ranks.length;
      for (let r = 0; r < rankCap; r++)
        expect(change({ action: 'upgrade', skillId: id })).toBeUndefined();
    }
    expect(pointAccounting(f.hero, f.config).surplus).toBe(15);
    const stats = characterStats(f.hero, f.config);
    expect(stats.sources.innate.maxMana).toBe(87);
    expect(stats.sources.surplus.maxMana).toBe(60);
    expect(stats.total.cooldownReduction).toBeCloseTo(0.241);
    f.cast();
    const cooldown = f.hero.skillCooldowns[0]!;
    change({ action: 'reset' });
    for (const id of ids) {
      const skill = f.config.progression!.skills[id]!;
      const rankCap = skill.ultimate ? 3 : skill.ranks.length;
      for (let r = 0; r < rankCap; r++)
        change({ action: 'upgrade', skillId: id });
    }
    expect(characterStats(f.hero, f.config).total).toEqual(stats.total);
    expect(f.hero.skillCooldowns[0]).toBe(cooldown);
  });
  it.each([
    'thai_cuc_than_cong',
    'toa_sat_bac_do',
    'thai_cuc_tran',
    'bat_quai_kiem_tran',
    'van_kiem_quy_tong',
  ])(
    '%s cleans up death/travel/respec/disconnect while preserving cooldown debt',
    (id) => {
      const f = fixture(id);
      f.cast();
      f.hero.hp = 0;
      f.steps(1);
      expect(f.world.areas ?? []).toHaveLength(0);
      expect(f.world.shots).toEqual([]);
      expect(f.world.projectiles.size).toBe(0);
      expect(f.hero.statuses).toEqual([]);
      const match = new DungeonMatch(m1Config, creepDungeon),
        h = match.add('a', 'A');
      h.schoolId = 'vo_dang';
      h.skillIds = [id, '', '', ''];
      match.input('a', 1, { kind: 'cast', slot: 0 });
      match.step();
      const debt = h.skillCooldowns[0]! - match.arena.world.tick;
      expect(match.enter('a', 'private')).toBeUndefined();
      expect(match.arena.world.areas ?? []).toEqual([]);
      expect(match.arena.world.projectiles.size).toBe(0);
      expect(h.statuses).toEqual([]);
      expect(h.skillCooldowns[0]).toBe(debt);
      match.remove('a');
      expect(match.hero('a')).toBeUndefined();
    },
  );
  it.each(['thai_cuc_tran', 'van_kiem_quy_tong'])(
    '%s preserves ultimate gates 6/10/14 and the three-rank cap',
    (id) => {
      const f = fixture(id);
      initializeProgression(f.hero, f.config);
      const change = (c: BuildChange) =>
        changeBuild(f.world, f.hero, f.config, f.hero.progression!.revision, c);
      expect(change({ action: 'loadout', ids: [id, '', '', ''] })).toBeTruthy();
      for (const level of [6, 10, 14]) {
        gainExperience(f.hero, (level - f.hero.level) * 60, f.config);
        if (level === 6)
          expect(
            change({ action: 'loadout', ids: [id, '', '', ''] }),
          ).toBeUndefined();
        expect(change({ action: 'upgrade', skillId: id })).toBeUndefined();
        expect(change({ action: 'upgrade', skillId: id })).toBeTruthy();
      }
    },
  );
  it.each(['thai_cuc_than_cong', 'toa_sat_bac_do', 'bat_quai_kiem_tran'])(
    '%s arena respec cancels active owned state without resource refill',
    (id) => {
      const f = fixture(id);
      initializeProgression(f.hero, f.config);
      gainExperience(f.hero, 120, f.config);
      const change = (c: BuildChange) =>
        changeBuild(f.world, f.hero, f.config, f.hero.progression!.revision, c);
      change({ action: 'loadout', ids: [id, '', '', ''] });
      change({ action: 'upgrade', skillId: id });
      f.cast();
      const mana = f.hero.mana,
        cooldown = f.hero.skillCooldowns[0];
      expect(change({ action: 'reset' })).toBeUndefined();
      expect(f.world.areas ?? []).toEqual([]);
      expect(f.hero.statuses).toEqual([]);
      expect(f.hero.mana).toBe(mana);
      expect(f.hero.skillCooldowns[0]).toBe(cooldown);
    },
  );
  it('rank variants improve intended mechanics and reject invalid shield/tick metadata at load', () => {
    for (const base of voDangSkills) {
      const ranks = m1Config.progression!.skills[base.id]!.ranks;
      expect(ranks).toHaveLength(4);
      if (base.id === 'thai_cuc_than_cong')
        expect(ranks.at(-1)!.cooldownTicks).toBe(1);
      else expect(ranks.at(-1)!.cooldownTicks).toBeLessThan(base.cooldownTicks);
    }
    expect(
      abilitySchema.safeParse({
        id: 'bad',
        nameVi: 'bad',
        manaCost: 0,
        cooldownTicks: 1,
        effect: {
          mode: 'mana_shield',
          durationTicks: 1,
          absorbFraction: 1,
          manaPerDamage: 0,
        },
      }).success,
    ).toBe(false);
    expect(
      abilitySchema.safeParse({
        id: 'bad',
        nameVi: 'bad',
        manaCost: 0,
        cooldownTicks: 1,
        effect: {
          mode: 'area',
          durationTicks: 1,
          tickInterval: 0,
          radius: 1,
          damage: 1,
        },
      }).success,
    ).toBe(false);
  });
  it('all ten skills bind existing approved character/VFX tags and canonical icon paths', () => {
    for (const skill of voDangSkills) {
      for (const kind of ['character', 'vfx'])
        expect(
          skillArt.assets.find((a) => a.id === skill.id + '_' + kind)
            ?.animations.length,
        ).toBeGreaterThan(0);
      expect(skillIcon(skill.id)).toContain(
        skill.id === 'that_tinh_kiem'
          ? '/skill-revise-feedback-v04/'
          : '/vo-dang/',
      );
      expect(skillVisualStages[skill.id]).toBeDefined();
    }
  });
});
