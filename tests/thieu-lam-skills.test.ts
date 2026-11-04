import { describe, it, expect } from 'vitest';
import {
  addHero,
  createWorld,
  stepWorld,
  submitInput,
  initializeProgression,
  gainExperience,
  characterStats,
  changeBuild,
  pointAccounting,
  hasStatus,
  DungeonMatch,
  removeHero,
  type CombatEvent,
} from '@volam/game-core';
import {
  m1Config,
  thieuLamSkills,
  thieuLamBasics,
  abilitySchema,
  skillArt,
  skillIcon,
  skillVisualStages,
  thieuLamComboWindowTicks,
  creepDungeon,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { applyStatus, displace } from '../packages/game-core/src/status.js';
function fixture() {
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
      { x: 342, y: 312 },
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
    hero = addHero(world, 'a', 'Gold', config),
    enemies = [...world.creeps.values()],
    events: CombatEvent[] = [];
  Object.assign(hero, {
    schoolId: 'thieu_lam',
    basicId: 'thieu_lam_quyen',
    mana: 1000,
    maxMana: 1000,
  });
  world.random = () => 0.99;
  const steps = (n = 1) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const input = (c: Parameters<typeof submitInput>[3]) =>
    submitInput(world, hero.id, hero.lastSequence + 1, c);
  const cast = (id: string) => {
    hero.skillIds = [id, '', '', ''];
    hero.skillCooldowns[0] = 0;
    hero.abilityCooldowns![id] = 0;
    input({ kind: 'cast', slot: 0 });
    steps();
  };
  const hits = (id: string, target = enemies[0]!.id) =>
    events.filter(
      (e) => e.kind === 'hit' && e.abilityId === id && e.targetId === target,
    );
  return { config, world, hero, enemies, events, steps, input, cast, hits };
}
describe('M3C3 Thiếu Lâm shared combat', () => {
  it('has exactly 43 actives, eight basics and canonical 8/5 Thiếu Lâm styles with retained art', () => {
    expect(Object.keys(m1Config.progression!.skills)).toHaveLength(43);
    expect(Object.keys(m1Config.basics)).toHaveLength(8);
    expect(thieuLamSkills).toHaveLength(13);
    const d = Object.values(m1Config.progression!.skills).filter(
      (s) => s.schoolId === 'thieu_lam',
    );
    expect(d.filter((s) => s.style === 'Quyền')).toHaveLength(8);
    expect(d.filter((s) => s.style === 'Đao')).toHaveLength(5);
    for (const a of [...thieuLamSkills, ...Object.values(thieuLamBasics)])
      expect(abilitySchema.parse(a)).toEqual(a);
    for (const a of thieuLamSkills) {
      if (a.id === 'tam_gioi_quy_thien')
        expect(skillIcon(a.id)).toBe(
          '/assets/m3d_followup/su_tu_hong-icon.png',
        );
      else expect(skillIcon(a.id)).toContain('/thieu-lam/');
      expect(skillArt.assets.some((v) => v.id === a.id + '_character')).toBe(
        true,
      );
      expect(skillVisualStages[a.id]).toBeDefined();
    }
  });
  it.each(thieuLamSkills.map((a) => a.id))(
    '%s rejects dead, silenced, low-mana, duplicate and cooldown casts',
    (id) => {
      for (const invalid of ['dead', 'silenced', 'mana']) {
        const f = fixture();
        if (invalid === 'dead') f.hero.hp = 0;
        if (invalid === 'mana') f.hero.mana = 0;
        if (invalid === 'silenced')
          applyStatus(
            f.hero,
            { kind: 'silence', magnitude: 1, durationTicks: 30 },
            'enemy',
            'silence',
            0,
          );
        f.cast(id);
        expect(f.events.some((e) => e.kind === 'cast')).toBe(false);
        expect(f.world.combos ?? []).toHaveLength(0);
      }
      const f = fixture();
      f.cast(id);
      f.input({ kind: 'cast', slot: 0 });
      f.steps();
      expect(
        submitInput(f.world, 'a', f.hero.lastSequence, {
          kind: 'cast',
          slot: 0,
        }),
      ).toBe(false);
      expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(1);
    },
  );
  it('Quyền is shorter/heavier/slower; Đao has a wider arc and reduced secondary cleave; A preserves chains', () => {
    for (const id of Object.keys(thieuLamBasics)) {
      const f = fixture();
      f.cast('la_han_quyen');
      const before = structuredClone(f.world.combos);
      f.hero.basicId = id;
      f.input({ kind: 'basic' });
      f.steps();
      const h = f.hits(id);
      expect(h).toHaveLength(1);
      expect(f.hits(id, f.enemies[1]!.id)[0]!.damage).toBeLessThan(
        h[0]!.damage,
      );
      expect(f.hits(id, f.enemies[2]!.id)).toHaveLength(0);
      expect(f.world.combos).toEqual(before);
      f.input({ kind: 'basic' });
      f.steps();
      expect(f.hits(id)).toHaveLength(1);
    }
    const punch = thieuLamBasics.thieu_lam_quyen!,
      dao = thieuLamBasics.thieu_lam_dao!;
    expect(punch.manualChain).toMatchObject({
      idleTicks: 60,
      cooldownTicks: 30,
    });
    expect(punch.cooldownTicks).toBe(1);
    if (punch.effect.mode === 'arc' && dao.effect.mode === 'arc') {
      expect(punch.effect.damage).toBeGreaterThanOrEqual(dao.effect.damage);
      expect(punch.effect.range).toBeLessThan(dao.effect.range);
      expect(punch.effect.halfAngle).toBeLessThan(dao.effect.halfAngle);
    }
  });
  it.each([
    ['la_han_quyen', 'vi_da_quyen', 'dai_luc_kim_cuong_chuong'],
    ['toan_phong_thoai', 'hoanh_tao_cuoc', 'vo_anh_cuoc'],
  ])(
    'same-target %s → %s → %s counts secondary hits without sharing target progress',
    (first, second, finish) => {
      const f = fixture(),
        [a, b] = f.enemies;
      if (first === 'toan_phong_thoai') f.enemies[2]!.x = 100;
      f.cast(first);
      expect(f.world.combos).toHaveLength(2);
      a!.y = 450;
      if (second === 'vi_da_quyen') f.hero.x -= 126; // Keep the explosion on the same target after the new189px offset.
      f.cast(second);
      if (second === 'vi_da_quyen') f.hero.x += 126;
      if (second === 'hoanh_tao_cuoc') f.steps(16);
      a!.y = 300;
      f.cast(finish);
      f.steps(30);
      expect(f.hits(finish, a!.id).every((e) => !e.stage)).toBe(true);
      expect(f.hits(finish, b!.id).every((e) => e.stage === 'empowered')).toBe(
        true,
      );
      expect(f.hits(finish, b!.id).length).toBeGreaterThan(0);
      expect(
        f.events.filter(
          (e) => e.stage === 'combo_empowered' && e.targetId === b!.id,
        ),
      ).toHaveLength(1);
      expect((f.world.combos ?? []).some((c) => c.targetId === b!.id)).toBe(
        false,
      );
      if (finish === 'vo_anh_cuoc')
        expect(f.hits(finish, b!.id)).toHaveLength(6);
    },
  );
  it('never empowers misses, wrong order, expired targets, or another attacker; unrelated skills preserve progress', () => {
    const f = fixture();
    f.hero.fx = -1;
    f.cast('la_han_quyen');
    f.hero.fx = 1;
    f.cast('vi_da_quyen');
    f.cast('dai_luc_kim_cuong_chuong');
    f.steps(15);
    expect(
      f.hits('dai_luc_kim_cuong_chuong').some((e) => e.stage === 'empowered'),
    ).toBe(false);
    const g = fixture();
    g.cast('la_han_quyen');
    g.cast('tru_ta');
    expect(g.world.combos).toHaveLength(2);
    g.cast('vi_da_quyen');
    g.steps(thieuLamComboWindowTicks);
    expect(g.world.combos).toHaveLength(0);
    g.cast('dai_luc_kim_cuong_chuong');
    g.steps(15);
    expect(g.hits('dai_luc_kim_cuong_chuong').some((e) => e.stage)).toBe(false);
    const h = fixture();
    h.cast('vi_da_quyen');
    h.cast('dai_luc_kim_cuong_chuong');
    h.steps(15);
    expect(h.world.combos).toHaveLength(0);
    h.cast('la_han_quyen');
    const other = addHero(h.world, 'b', 'Other', h.config);
    Object.assign(other, {
      x: 300,
      y: 300,
      schoolId: 'thieu_lam',
      skillIds: ['vi_da_quyen', '', '', ''],
    });
    submitInput(h.world, 'b', 1, { kind: 'cast', slot: 0 });
    h.steps();
    expect(h.world.combos!.some((c) => c.sourceId === 'b')).toBe(false);
  });
  it('slow palm snapshots facing/offense, resolves against current positions and can miss/be interrupted', () => {
    const f = fixture();
    f.cast('dai_luc_kim_cuong_chuong');
    expect(f.hits('dai_luc_kim_cuong_chuong')).toHaveLength(0);
    f.hero.fx = -1;
    f.steps(12);
    expect(f.hits('dai_luc_kim_cuong_chuong')).toHaveLength(1);
    const g = fixture();
    g.cast('dai_luc_kim_cuong_chuong');
    g.enemies[0]!.y = 500;
    g.steps(12);
    expect(g.hits('dai_luc_kim_cuong_chuong')).toHaveLength(0);
    const h = fixture();
    h.cast('dai_luc_kim_cuong_chuong');
    applyStatus(
      h.hero,
      { kind: 'stun', magnitude: 1, durationTicks: 30 },
      'enemy',
      'stun',
      h.world.tick,
    );
    h.steps(15);
    expect(h.hits('dai_luc_kim_cuong_chuong')).toHaveLength(0);
  });
  it('keeps both chains independent and never builds progress through terrain or from another owner', () => {
    const f = fixture();
    f.cast('la_han_quyen');
    f.cast('toan_phong_thoai');
    f.hero.x -= 126;
    f.cast('vi_da_quyen');
    f.hero.x += 126;
    const records = (f.world.combos ?? []).filter(
      (c) => c.targetId === f.enemies[0]!.id,
    );
    expect(records.map((c) => [c.id, c.step]).sort()).toEqual([
      ['phat_dong_a', 2],
      ['phat_dong_b', 1],
    ]);
    f.cast('hoanh_tao_cuoc');
    f.cast('dai_luc_kim_cuong_chuong');
    f.steps(12);
    expect(
      (f.world.combos ?? []).find(
        (c) => c.id === 'phat_dong_b' && c.targetId === f.enemies[0]!.id,
      )?.step,
    ).toBe(2);
    const g = fixture();
    g.config.collision = [{ x: 320, y: 250, width: 10, height: 100 }];
    g.cast('la_han_quyen');
    expect(g.world.combos ?? []).toHaveLength(0);
  });
  it('combines strongest protection after armor before mana shields without additive stacking', () => {
    const f = fixture();
    initializeProgression(f.hero, f.config);
    f.hero.mana = 100;
    // Override the fixture profile to make the pipeline's armor result exact.
    f.config.progression!.schools.thieu_lam!.base.defense = 100;
    applyStatus(
      f.hero,
      { kind: 'damage_reduction', magnitude: 0.4, durationTicks: 20 },
      'a',
      'strong',
      0,
    );
    applyStatus(
      f.hero,
      { kind: 'damage_reduction', magnitude: 0.2, durationTicks: 20 },
      'b',
      'weak',
      0,
    );
    applyStatus(
      f.hero,
      { kind: 'mana_shield', magnitude: 0.8, secondary: 1, durationTicks: 20 },
      'a',
      'shield',
      0,
    );
    const hp = f.hero.hp;
    hurt(f.world, f.hero, 'creep_0', 'test', 100, f.config, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(hp - f.hero.hp).toBeCloseTo(6);
    expect(f.hero.mana).toBeCloseTo(76);
  });
  it('La Hán guards briefly; Kim Cang reduces post-armor damage without invulnerability and resists interrupts/displacement', () => {
    const f = fixture();
    f.cast('kim_cang_bat_hoai');
    const hp = f.hero.hp;
    hurt(f.world, f.hero, 'creep_0', 'test', 100, f.config);
    expect(hp - f.hero.hp).toBeCloseTo(60);
    applyStatus(
      f.hero,
      { kind: 'stun', magnitude: 1, durationTicks: 60 },
      'enemy',
      'stun',
      f.world.tick,
    );
    expect(hasStatus(f.hero, 'stun', f.world.tick)).toBe(false);
    displace(f.hero, 50, 0, 10, f.config, f.world.tick);
    expect(f.hero.x).toBe(300);
    f.cast('vo_anh_cuoc');
    f.steps(26);
    expect(f.hits('vo_anh_cuoc')).toHaveLength(1);
    f.steps(120);
    const before = f.hero.hp;
    hurt(f.world, f.hero, 'creep_0', 'test', 100, f.config);
    expect(before - f.hero.hp).toBe(100);
    const g = fixture();
    g.cast('la_han_quyen');
    expect(hasStatus(g.hero, 'damage_reduction', g.world.tick)).toBe(true);
    g.steps(45);
    expect(hasStatus(g.hero, 'damage_reduction', g.world.tick)).toBe(false);
  });
  it('Như Lai Niết Bàn is radial, rank-scales radius/damage/aftereffect, and does not require a combo', () => {
    const f = fixture();
    f.cast('nhu_lai_niet_ban');
    f.steps(15);
    for (const e of f.enemies)
      expect(f.hits('nhu_lai_niet_ban', e.id)).toHaveLength(2);
    expect(hasStatus(f.hero, 'damage_reduction', f.world.tick)).toBe(true);
    const r = m1Config.progression!.skills.nhu_lai_niet_ban!.ranks;
    expect(r[2]!.selfStatuses![0]!.durationTicks).toBeGreaterThan(
      r[0]!.selfStatuses![0]!.durationTicks,
    );
    if (r[0]!.effect.mode === 'arc' && r[2]!.effect.mode === 'arc')
      expect(r[2]!.effect.range).toBeGreaterThan(r[0]!.effect.range);
  });
  it('Tru Tà slows and Tam Giới breaks defense temporarily through shared statuses', () => {
    const f = fixture();
    f.cast('tru_ta');
    f.cast('tam_gioi_quy_thien');
    f.steps(6);
    expect(hasStatus(f.enemies[0]!, 'slow', f.world.tick)).toBe(true);
    expect(hasStatus(f.enemies[0]!, 'defense_break', f.world.tick)).toBe(true);
    f.steps(181);
    expect(f.enemies[0]!.statuses).toHaveLength(0);
  });
  it('Kim Quang aura follows caster, supports entering allies, expires on exit and never stacks or repairs statue', () => {
    const f = fixture(),
      ally = addHero(f.world, 'b', 'Ally', f.config);
    Object.assign(ally, { x: 330, y: 300 });
    const far = addHero(f.world, 'c', 'Far', f.config);
    Object.assign(far, { x: 700, y: 300 });
    f.cast('kim_quang_ho_tran');
    expect(characterStats(ally, f.config, f.world.tick).total.defense).toBe(22);
    expect(characterStats(far, f.config, f.world.tick).total.defense).toBe(0);
    const x = f.hero.x;
    f.hero.x = 700;
    f.steps(16);
    expect(characterStats(far, f.config, f.world.tick).total.defense).toBe(22);
    expect(characterStats(ally, f.config, f.world.tick).total.defense).toBe(0);
    f.hero.x = x;
    f.cast('kim_quang_ho_tran');
    f.steps(16);
    expect(characterStats(ally, f.config, f.world.tick).total.defense).toBe(22);
    f.steps(181);
    expect(characterStats(ally, f.config, f.world.tick).total.defense).toBe(0);
  });
  it('Bất Động heals only living in-range heroes once, clamps HP and never heals creeps/statue or revives', () => {
    const f = fixture(),
      ally = addHero(f.world, 'b', 'Ally', f.config),
      dead = addHero(f.world, 'c', 'Dead', f.config),
      far = addHero(f.world, 'd', 'Far', f.config);
    Object.assign(ally, { x: 330, y: 300, hp: 150 });
    Object.assign(dead, { x: 340, y: 300, hp: 0 });
    Object.assign(far, { x: 700, y: 300, hp: 30 });
    f.hero.hp = 40;
    f.world.statue = { ...f.hero, id: 'statue', hp: 20, radius: 30 };
    const enemyHp = f.enemies[0]!.hp;
    f.cast('bat_dong_minh_vuong');
    expect(f.hero.hp).toBe(82);
    expect(ally.hp).toBe(160);
    expect(dead.hp).toBe(0);
    expect(far.hp).toBe(30);
    expect(f.world.statue.hp).toBe(20);
    expect(f.enemies[0]!.hp).toBe(enemyHp);
    f.steps(60);
    expect(f.hero.hp).toBe(82);
  });
  it('Như Lai Thiên Diệp sends 15 straight volleys to each nearby enemy and buffs allies', () => {
    const f = fixture(),
      ally = addHero(f.world, 'b', 'Ally', f.config);
    Object.assign(ally, { x: 330, y: 300 });
    f.enemies[2]!.x = 200;
    f.enemies[1]!.x = 750;
    f.cast('nhu_lai_thien_diep');
    const hp = ally.hp;
    expect(characterStats(ally, f.config, f.world.tick).total.defense).toBe(30);
    const shot = [...f.world.projectiles.values()].find(
      (p) => p.targetId === f.enemies[2]!.id,
    )!;
    expect(shot.vx).toBeLessThan(0);
    f.hero.x += 10;
    f.hero.fx = -1;
    f.steps(450);
    expect(f.hits('nhu_lai_thien_diep')).toHaveLength(15);
    expect(f.hits('nhu_lai_thien_diep', f.enemies[2]!.id)).toHaveLength(15);
    expect(f.hits('nhu_lai_thien_diep', f.enemies[1]!.id)).toHaveLength(0);
    expect(ally.hp).toBe(hp);
    expect(f.world.areas).toHaveLength(0);
    f.steps(60);
    expect(f.hits('nhu_lai_thien_diep')).toHaveLength(15);
  });
  it('Dịch Cân grows HP/defense/regen automatically and surplus recalculates without respec stacking', () => {
    const f = fixture();
    initializeProgression(f.hero, f.config);
    expect(f.hero.maxHp).toBe(220);
    expect(f.hero.skillPoints).toBe(1);
    gainExperience(f.hero, 1740, f.config);
    const stats = characterStats(f.hero, f.config).total;
    expect(stats.maxHp).toBe(626);
    expect(stats.defense).toBeCloseTo(40.1);
    expect(stats.hpRegen).toBeCloseTo(4.68);
    const change = (c: Parameters<typeof changeBuild>[4]) =>
      changeBuild(f.world, f.hero, f.config, f.hero.progression!.revision, c);
    const ids = [
      'la_han_quyen',
      'vi_da_quyen',
      'dai_luc_kim_cuong_chuong',
      'kim_cang_bat_hoai',
    ];
    for (let repeat = 0; repeat < 5; repeat++) {
      expect(change({ action: 'loadout', ids })).toBeUndefined();
      for (const id of ids)
        for (let rank = 0; rank < 4; rank++)
          expect(change({ action: 'upgrade', skillId: id })).toBeUndefined();
      expect(pointAccounting(f.hero, f.config)).toEqual({
        earned: 30,
        allocated: 16,
        available: 0,
        surplus: 14,
      });
      expect(characterStats(f.hero, f.config).total.maxHp).toBe(710);
      f.hero.hp = 100;
      f.hero.mana = 10;
      expect(change({ action: 'reset' })).toBeUndefined();
      expect(f.hero.hp).toBe(100);
      expect(f.hero.mana).toBe(10);
      expect(characterStats(f.hero, f.config).total).toEqual(stats);
    }
    f.world.creeps.clear();
    f.steps(30);
    expect(f.hero.hp).toBeCloseTo(104.68);
    f.hero.hp = 0;
    f.steps(30);
    expect(f.hero.hp).toBe(0);
  });
  it('death, target death, respec, disconnect and travel clear sequences/support without cross-zone leftovers', () => {
    for (const cleanup of [
      'death',
      'target',
      'disconnect',
      'respec',
      'travel',
    ]) {
      const f = fixture();
      f.cast('la_han_quyen');
      f.cast('vi_da_quyen');
      f.cast('kim_quang_ho_tran');
      if (cleanup === 'death') {
        f.hero.hp = 0;
        f.steps();
      }
      if (cleanup === 'target') {
        for (const e of f.enemies)
          hurt(f.world, e, 'a', 'kill', 100000, f.config);
      }
      if (cleanup === 'disconnect') removeHero(f.world, 'a');
      if (cleanup === 'respec') {
        initializeProgression(f.hero, f.config);
        changeBuild(f.world, f.hero, f.config, 0, { action: 'reset' });
      }
      if (cleanup === 'travel') {
        const match = new DungeonMatch(f.config, creepDungeon);
        const h = match.add('a', 'Travel');
        h.schoolId = 'thieu_lam';
        initializeProgression(h, f.config);
        match.arena.world.combos = [
          {
            sourceId: 'a',
            targetId: 'creep_0',
            id: 'phat_dong_a',
            step: 2,
            until: 999,
          },
        ];
        expect(match.enter('a', 'shared')).toBeUndefined();
        expect(match.arena.world.combos).toHaveLength(0);
        expect(match.zoneOf('a')!.world.combos ?? []).toHaveLength(0);
        continue;
      }
      expect(f.world.combos ?? []).toHaveLength(0);
      if (cleanup !== 'target') expect(f.world.supports ?? []).toHaveLength(0);
    }
  });
});
