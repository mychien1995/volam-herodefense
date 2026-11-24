import { describe, it, expect } from 'vitest';
import {
  addHero,
  createWorld,
  stepWorld,
  submitInput,
  hasStatus,
  DungeonMatch,
  type CombatEvent,
} from '@volam/game-core';
import { m1Config, creepDungeon } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { applyStatus } from '../packages/game-core/src/status.js';
function fixture(id: string) {
  const config = structuredClone(m1Config);
  config.width = 1000;
  config.height = 800;
  config.collision = [];
  config.spawn = { x: 300, y: 300 };
  config.critChance = 0;
  config.manaRegen = 0;
  config.creepSpawns = [
    { x: 360, y: 300 },
    { x: 400, y: 300 },
    { x: 360, y: 340 },
    { x: 160, y: 300 },
  ];
  config.creep.hp = 1000;
  config.creep.defense = 0;
  config.creep.speed = 0;
  config.creep.detectionRange = 1;
  const world = createWorld(config, 42),
    hero = addHero(world, 'a', 'A', config),
    events: CombatEvent[] = [];
  hero.skillIds = [id, '', '', ''];
  const enemies = [...world.creeps.values()];
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const cast = () => {
    submitInput(world, hero.id, hero.lastSequence + 1, {
      kind: 'cast',
      slot: 0,
    });
    steps(1);
  };
  return { config, world, hero, enemies, steps, cast, events };
}
describe('M3A canonical Cái Bang skills', () => {
  it.each(
    Object.values(m1Config.progression!.skills)
      .filter((s) => s.schoolId === 'cai_bang')
      .map((s) => s.id),
  )('%s validates mana, cooldown, death and rapid commands', (id) => {
    const f = fixture(id),
      skill = f.config.skillCatalogue![id]!;
    f.cast();
    expect(f.hero.mana).toBeCloseTo(
      100 -
        skill.manaCost +
        (id === 'khang_long_huu_hoi' ? (8 * (f.world.tick - 1)) / 30 : 0),
    );
    expect(f.hero.skillCooldowns[0]).toBe(1 + skill.cooldownTicks);
    const deadline = f.hero.skillCooldowns[0];
    for (let i = 0; i < 20; i++)
      submitInput(f.world, 'a', f.hero.lastSequence + 1, {
        kind: 'cast',
        slot: 0,
      });
    f.steps(1);
    expect(f.hero.mana).toBeCloseTo(
      100 -
        skill.manaCost +
        (id === 'khang_long_huu_hoi' ? (8 * (f.world.tick - 1)) / 30 : 0),
    );
    expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(1);
    expect(f.hero.skillCooldowns[0]).toBe(deadline);
    const empty = fixture(id);
    empty.hero.mana = 0;
    empty.cast();
    expect(empty.events.filter((e) => e.kind === 'cast')).toHaveLength(0);
    empty.hero.hp = 0;
    empty.hero.mana = 100;
    empty.cast();
    expect(empty.events.filter((e) => e.kind === 'cast')).toHaveLength(0);
  });
  it('Hỏa Long dash keeps its cast direction and creates one endpoint explosion', () => {
    const f = fixture('hoa_van_chuong');
    const start = f.hero.x;
    f.cast();
    f.hero.fx = 0;
    f.hero.fy = 1;
    f.steps(35);
    expect(f.hero.x).toBeCloseTo(start + 210);
    expect(f.world.projectiles.size).toBe(0);
    expect(f.events.filter((e) => e.stage === 'dash_impact')).toHaveLength(1);
    expect(f.enemies[0]!.hp).toBeLessThan(1000);
    expect(f.world.areas).toEqual([]);
  });

  it('Cuồng Long explodes once on collision, burns its area, and expires', () => {
    const f = fixture('cuong_long_loan_vu');
    f.cast();
    f.steps(105);
    expect(f.enemies.slice(0, 3).map((e) => e.hp)).toEqual([956, 956, 956]);
    expect(f.enemies[3]!.hp).toBe(1000);
    expect(
      f.events.filter((e) => e.kind === 'pulse' && e.stage === 'explosion'),
    ).toHaveLength(1);
    const hp = f.enemies[0]!.hp;
    f.steps(40);
    expect(f.enemies[0]!.hp).toBe(hp);
    expect(f.world.projectiles.size).toBe(0);
  });
  it('Phi Long pierces the frontal lane once per target and knocks back through legal terrain', () => {
    const f = fixture('phi_long_tai_thien');
    f.cast();
    f.steps(35);
    expect(f.enemies[0]!.hp).toBe(964);
    expect(f.enemies[1]!.hp).toBe(964);
    expect(f.enemies[0]!.x).toBeGreaterThan(400);
    expect(f.enemies[3]!.hp).toBe(1000);
    expect(
      f.events.filter(
        (e) => e.kind === 'hit' && e.targetId === f.enemies[0]!.id,
      ),
    ).toHaveLength(1);
  });
  it('Kháng Long buffs crit only, does not stack, and ends at the authoritative deadline', () => {
    const f = fixture('khang_long_huu_hoi');
    f.world.random = () => 0.2;
    f.cast();
    expect(f.enemies.every((e) => e.hp === 1000)).toBe(true);
    submitInput(f.world, 'a', 2, { kind: 'basic' });
    f.steps(1);
    expect(
      f.events
        .filter((e) => e.kind === 'hit' && e.targetId === f.enemies[0]!.id)
        .at(-1),
    ).toMatchObject({
      critical: true,
      damage: 63,
    });
    f.cast();
    expect(f.hero.statuses?.filter((s) => s.kind === 'crit_buff')).toHaveLength(
      1,
    );
    f.steps(270);
    expect(hasStatus(f.hero, 'crit_buff', f.world.tick)).toBe(false);
    submitInput(f.world, 'a', f.hero.lastSequence + 1, { kind: 'basic' });
    f.steps(1);
    expect(
      f.events
        .filter((e) => e.kind === 'hit' && e.targetId === f.enemies[0]!.id)
        .at(-1),
    ).toMatchObject({
      critical: false,
      damage: 28,
    });
  });
  it('Hàng Long damages during its coil, then hits and stuns on landing', () => {
    const f = fixture('hang_long_hoa_vu');
    f.hero.fx = 1;
    f.hero.fy = 0;
    f.cast();
    f.steps(40);
    const first = f.enemies[0]!;
    const hpAfterCoil = first.hp;
    expect(hpAfterCoil).toBeLessThan(1000);
    expect(hasStatus(first, 'stun', f.world.tick)).toBe(false);
    f.steps(56);
    expect(first.hp).toBe(hpAfterCoil - 90);
    expect(hasStatus(first, 'stun', f.world.tick)).toBe(true);
    expect(f.enemies[3]!.hp).toBe(1000);
    expect(
      f.events.filter((e) => e.kind === 'hit' && e.targetId === first.id),
    ).toHaveLength(2);
    expect(f.events.filter((e) => e.stage === 'dragon_impact')).toHaveLength(1);
  });
  it('Hoành Tảo uses its wide frontal sweep and a nonstacking movement slow', () => {
    const f = fixture('hoanh_tao_bong');
    f.hero.hp = 100;
    f.config.creep.xp = 0;
    f.enemies[1]!.hp = 5;
    f.cast();
    expect(f.enemies[0]!.hp).toBe(960);
    expect(f.enemies[2]!.hp).toBe(960);
    expect(f.enemies[3]!.hp).toBe(1000);
    expect(f.hero.hp).toBeCloseTo(108.5);
    expect(f.enemies[0]!.statuses?.[0]).toMatchObject({
      kind: 'slow',
      magnitude: 0.4,
    });
    f.steps(90);
    expect(hasStatus(f.enemies[0]!, 'slow', f.world.tick)).toBe(false);
  });
  it('Phá Giáp heals on impact within 144, briefly stuns and reduces defense', () => {
    const f = fixture('pha_giap_bong');
    f.config.creep.defense = 50;
    f.hero.hp = 100;
    Object.assign(f.enemies[1]!, { x: 444, y: 300 });
    Object.assign(f.enemies[2]!, { x: 445, y: 300 });
    f.cast();
    expect(f.enemies[0]!.hp).toBe(1000);
    expect(f.hero.hp).toBe(100);
    f.steps(6);
    expect(f.enemies[0]!.hp).toBe(963);
    expect(f.enemies[1]!.hp).toBe(963);
    expect(f.enemies[2]!.hp).toBe(1000);
    expect(f.hero.hp).toBeCloseTo(107.4);
    expect(hasStatus(f.enemies[0]!, 'stun', f.world.tick)).toBe(true);
    expect(hasStatus(f.enemies[2]!, 'stun', f.world.tick)).toBe(false);
    f.steps(59);
    expect(hasStatus(f.enemies[0]!, 'stun', f.world.tick)).toBe(true);
    f.steps(1);
    expect(hasStatus(f.enemies[0]!, 'stun', f.world.tick)).toBe(false);
    f.steps(6);
    submitInput(f.world, 'a', 2, { kind: 'basic' });
    f.steps(1);
    expect(
      f.events
        .filter((e) => e.kind === 'hit' && e.targetId === f.enemies[0]!.id)
        .at(-1)?.damage,
    ).toBe(22);
    f.steps(211);
    submitInput(f.world, 'a', 3, { kind: 'basic' });
    f.steps(1);
    expect(
      f.events
        .filter((e) => e.kind === 'hit' && e.targetId === f.enemies[0]!.id)
        .at(-1)?.damage,
    ).toBe(19);
  });
  it.each(['hoanh_tao_bong', 'pha_giap_bong'])(
    '%s heals only on damaging hits and caps recovery at max HP',
    (id) => {
      const miss = fixture(id);
      miss.hero.hp = 100;
      miss.world.creeps.clear();
      miss.cast();
      miss.steps(6);
      expect(miss.hero.hp).toBe(100);

      const hit = fixture(id);
      hit.hero.hp = hit.hero.maxHp - 1;
      hit.enemies[0]!.bossEncounter = true;
      hit.cast();
      hit.steps(6);
      expect(hit.enemies[0]!.hp).toBeLessThan(1000);
      expect(hit.hero.hp).toBe(hit.hero.maxHp);
      expect(hasStatus(hit.enemies[0]!, 'stun', hit.world.tick)).toBe(false);
    },
  );
  it('Cầm Long pulls a limited frontal distance and disarms/silences without stun or movement lock', () => {
    const f = fixture('cam_long_cong'),
      enemy = f.enemies[0]!;
    enemy.x = 440;
    f.config.creep.speed = 30;
    f.config.creep.detectionRange = 160;
    f.enemies[3]!.x = 240;
    f.cast();
    expect(enemy.x).toBeLessThan(350);
    expect(enemy.x).toBeGreaterThanOrEqual(325);
    expect(enemy.hp).toBe(1000);
    expect(hasStatus(enemy, 'silence', f.world.tick)).toBe(true);
    expect(hasStatus(enemy, 'disarm', f.world.tick)).toBe(true);
    expect(hasStatus(enemy, 'stun', f.world.tick)).toBe(false);
    expect(f.enemies[3]!.statuses ?? []).toHaveLength(0);
    const x = enemy.x;
    f.hero.x = 260;
    f.enemies[3]!.x = 100;
    f.steps(10);
    expect(enemy.x).not.toBe(x);
    expect(f.hero.hp).toBe(160);
  });
  it('Truy Phong stomps once after windup and stuns targets around its stationary caster', () => {
    const f = fixture('truy_phong_bong');
    f.enemies[3]!.x = 205;
    f.cast();
    f.steps(5);
    expect(f.enemies[0]!.hp).toBe(1000);
    f.steps(1);
    expect(f.hero.x).toBe(300);
    expect(f.hero.y).toBe(300);
    expect(f.enemies[0]!.hp).toBe(934);
    expect(f.enemies[3]!.hp).toBe(934);
    expect(hasStatus(f.enemies[0]!, 'stun', f.world.tick)).toBe(true);
    expect(
      f.events.filter(
        (e) => e.kind === 'hit' && e.targetId === f.enemies[0]!.id,
      ),
    ).toHaveLength(1);
    const g = fixture('truy_phong_bong');
    g.config.collision = [{ x: 330, y: 240, width: 10, height: 120 }];
    g.cast();
    g.steps(12);
    expect(g.hero.x).toBe(300);
    expect(g.enemies[0]!.hp).toBe(1000);
  });
  it('Thiên Hạ lands four timed sweeps plus one heavy finisher, and death cancels later pulses', () => {
    const f = fixture('thien_ha_vo_cau');
    f.cast();
    f.steps(40);
    expect(f.enemies[0]!.hp).toBe(853);
    expect(
      f.events.filter(
        (e) => e.kind === 'hit' && e.targetId === f.enemies[0]!.id,
      ),
    ).toHaveLength(5);
    expect(
      f.events.filter((e) => e.kind === 'pulse').map((e) => e.stage),
    ).toEqual(['sweep', 'sweep', 'sweep', 'sweep', 'finisher']);
    const g = fixture('thien_ha_vo_cau');
    g.cast();
    g.hero.hp = 0;
    g.steps(40);
    expect(g.enemies[0]!.hp).toBe(982);
    expect(g.world.actions ?? []).toHaveLength(0);
    expect(g.hero.statuses).toEqual([]);
  });
  it('Thiên Hạ mitigates 80% only while spinning and heals 5% once on completion', () => {
    const f = fixture('thien_ha_vo_cau');
    f.world.creeps.clear();
    const incoming = () => {
      const before = f.hero.hp;
      hurt(f.world, f.hero, 'attacker', 'strike', 30, f.config, {
        critChance: 0,
        critMultiplier: 1,
      });
      return before - f.hero.hp;
    };
    const normal = incoming();
    f.cast();
    expect(incoming()).toBeCloseTo(normal * 0.2);
    const before = f.hero.hp;
    f.steps(45);
    expect(f.hero.hp - before).toBeCloseTo(f.hero.maxHp * 0.05);
    const heal = f.events.filter(
      (e) => e.stage === 'heal' && e.abilityId === 'thien_ha_vo_cau',
    );
    expect(heal).toHaveLength(1);
    expect(heal[0]?.targetId).toBe(f.hero.id);
    expect(incoming()).toBeCloseTo(normal);
  });
  it('an interrupted Thiên Hạ loses mitigation and does not heal', () => {
    const f = fixture('thien_ha_vo_cau');
    f.world.creeps.clear();
    f.hero.hp = f.hero.maxHp / 2;
    f.cast();
    applyStatus(
      f.hero,
      { kind: 'stun', durationTicks: 10, magnitude: 1 },
      'enemy',
      'stun',
      f.world.tick,
    );
    f.steps(1);
    expect(f.world.actions).toHaveLength(0);
    f.steps(45);
    expect(f.hero.hp).toBe(f.hero.maxHp / 2);
    expect(f.events.some((e) => e.stage === 'heal')).toBe(false);
  });
  it('rejects status-blocked casts and preserves cooldowns when moving a skill to another slot', () => {
    const f = fixture('hoa_van_chuong');
    f.hero.statuses = [
      {
        kind: 'silence',
        magnitude: 1,
        durationTicks: 60,
        until: 60,
        sourceId: 'npc',
        abilityId: 'control',
      },
    ];
    f.cast();
    expect(f.hero.mana).toBe(100);
    f.hero.statuses = [];
    f.cast();
    const mana = f.hero.mana;
    submitInput(f.world, 'a', f.hero.lastSequence + 1, {
      kind: 'dev-loadout',
      ids: ['', 'hoa_van_chuong', '', ''],
    });
    f.steps(1);
    submitInput(f.world, 'a', f.hero.lastSequence + 1, {
      kind: 'cast',
      slot: 1,
    });
    f.steps(1);
    expect(f.hero.mana).toBe(mana);
    expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(1);
  });
  it('Cầm Long actually blocks in-range enemy attacks until disarm expires', () => {
    const f = fixture('cam_long_cong'),
      e = f.enemies[0]!;
    f.cast();
    e.x = 320;
    e.y = 300;
    f.config.creep.detectionRange = 160;
    f.steps(59);
    expect(f.hero.hp).toBe(160);
    f.steps(1);
    expect(f.hero.hp).toBe(154);
  });
  it('successful Cầm Long control counts as a meaningful assist without inventing damage or a second reward pool', () => {
    const f = fixture('cam_long_cong'),
      enemy = f.enemies[0]!;
    enemy.hp = 20;
    f.cast();
    expect(enemy.hp).toBe(20);
    const partner = addHero(f.world, 'b', 'B', f.config);
    partner.x = 300;
    partner.y = 300;
    partner.fx = 1;
    partner.fy = 0;
    submitInput(f.world, 'b', 1, { kind: 'basic' });
    f.steps(1);
    expect(enemy.hp).toBe(0);
    expect(f.hero.xp).toBe(30);
    expect(partner.xp).toBe(30);
    expect(f.hero.gold + partner.gold).toBe(12);
  });
  it('stun stops movement/basic/casts and test loadouts cannot erase hostile control', () => {
    const f = fixture('hoa_van_chuong');
    f.hero.statuses = [
      {
        kind: 'stun',
        sourceId: 'enemy',
        abilityId: 'enemy_control',
        magnitude: 1,
        durationTicks: 60,
        until: 60,
      },
    ];
    submitInput(f.world, 'a', 1, { kind: 'move', x: 1, y: 0 });
    submitInput(f.world, 'a', 2, { kind: 'basic' });
    f.cast();
    expect(f.hero.x).toBe(300);
    expect(f.enemies[0]!.hp).toBe(1000);
    submitInput(f.world, 'a', f.hero.lastSequence + 1, {
      kind: 'dev-loadout',
      ids: ['hoa_van_chuong', '', '', ''],
    });
    f.steps(1);
    expect(hasStatus(f.hero, 'stun', f.world.tick)).toBe(true);
  });
  it('Tiêu Diêu Công scales Cái Bang automatically without spending or duplicating points', () => {
    const f = fixture('hoa_van_chuong');
    f.hero.level = 15;
    f.hero.skillPoints = 15;
    f.world.random = () => 0.01;
    f.cast();
    f.steps(20);
    expect(f.events.find((e) => e.kind === 'hit')?.critical).toBe(true);
    expect(f.hero.skillPoints).toBe(15);
    const g = fixture('hoa_van_chuong');
    g.hero.level = 15;
    g.hero.schoolId = 'vo_dang';
    g.world.random = () => 0.01;
    g.cast();
    g.steps(20);
    expect(g.events.find((e) => e.kind === 'hit')?.critical).toBe(false);
    expect(f.events.find((e) => e.kind === 'hit')!.damage).toBeGreaterThan(
      g.events.find((e) => e.kind === 'hit')!.damage,
    );
  });
  it('travel cancels channels, self buffs and queued/travelling projectiles while preserving cooldowns', () => {
    const match = new DungeonMatch(m1Config, creepDungeon),
      h = match.add('a', 'A');
    h.skillIds = [
      'thien_ha_vo_cau',
      'khang_long_huu_hoi',
      'cuong_long_loan_vu',
      '',
    ];
    match.input('a', 1, { kind: 'cast', slot: 0 });
    match.step();
    expect(match.arena.world.actions).toHaveLength(1);
    const remaining = h.skillCooldowns[0]! - match.arena.world.tick;
    expect(match.enter('a', 'private')).toBeUndefined();
    expect(match.arena.world.actions).toHaveLength(0);
    expect(h.statuses).toEqual([]);
    expect(h.skillCooldowns[0]).toBe(remaining);
    match.input('a', 2, { kind: 'cast', slot: 1 });
    match.input('a', 3, { kind: 'cast', slot: 2 });
    match.step();
    const zone = match.zoneOf('a')!;
    expect(hasStatus(h, 'crit_buff', zone.world.tick)).toBe(true);
    expect(
      zone.world.shots.length + zone.world.projectiles.size,
    ).toBeGreaterThan(0);
    Object.assign(h, creepDungeon.exit);
    expect(match.exit('a')).toBeUndefined();
    expect(h.statuses).toEqual([]);
    expect(zone.world.shots).toEqual([]);
    expect(zone.world.projectiles.size).toBe(0);
  });
});
