import { describe, expect, it } from 'vitest';
import {
  StandaloneLoiDai,
  characterStats,
  rankedAbility,
  createPvp1v1Config,
  skillCharges,
  type PvpDefinition,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  pvpDefinition,
  pvp1v1Tuning,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { applyStatus } from '../packages/game-core/src/status.js';
import { pvpCombatConfig } from '../apps/game-client/src/pvp-combat-config.js';

function duel(
  a = 'cai_bang_bong',
  b = 'cai_bang_bong',
  extra = false,
  enabled = true,
) {
  const definition: PvpDefinition = {
    ...structuredClone(pvpDefinition),
    countdownTicks: 1,
    roundTicks: 1000,
    intermissionTicks: 1,
    resultTicks: 1,
  };
  if (!enabled) delete definition.oneVOne;
  const p = new StandaloneLoiDai(m1Config, creepDungeon, definition, 42);
  const lineup: Array<[string, string]> = [
    ['a', a],
    ['b', b],
  ];
  if (extra) lineup.push(['c', 'cai_bang_bong']);
  for (const [id, branch] of lineup) {
    expect(p.join(id, id)).toBeUndefined();
    const school = Object.entries(m1Config.progression!.schools).find(([, s]) =>
      s.basicIds.includes(branch!),
    )![0];
    expect(p.choose(id!, school, branch!)).toBeUndefined();
    expect(p.assign('a', id!, id === 'b' ? 'ta' : 'chinh')).toBeUndefined();
  }
  expect(p.configure('a', 'rung_truc', false)).toBeUndefined();
  expect(p.start('a')).toBeUndefined();
  p.step();
  return p;
}
const nonCrit = { critChance: 0, critMultiplier: 1 };
const maxSkill = (p: StandaloneLoiDai, id: string, hero = 'a') =>
  rankedAbility(p.hero(hero)!, id, p.arena.config)!;

describe('isolated PvP 1v1 balance profile', () => {
  it('reflects the actual guard-counter HP loss without applying the PvP multiplier twice', () => {
    for (const enabled of [false, true]) {
      const p = duel('cai_bang_bong', 'vo_dang_kiem', false, enabled);
      const a = p.hero('a')!,
        b = p.hero('b')!;
      Object.assign(a, { x: 600, y: 360 });
      Object.assign(b, { x: 680, y: 360 });
      p.input('b', 1, { kind: 'cast', slot: 3 });
      p.step();
      const beforeA = a.hp,
        beforeB = b.hp;
      expect(b.statuses!.some((s) => s.kind === 'guard_counter')).toBe(true);
      hurt(p.arena.world, b, 'a', 'probe', 500, p.arena.config, nonCrit);
      const received = beforeB - b.hp;
      const defense = characterStats(a, p.arena.config, p.tick).total.defense;
      expect(beforeA - a.hp).toBeCloseTo((received * 100) / (100 + defense));
      expect(b.statuses!.some((s) => s.kind === 'guard_counter')).toBe(false);
    }
  });
  it('spends the adjusted mana and refills a real Kinh Loi charge at the new server deadline', () => {
    const dao = duel('thien_son_dao');
    const h = dao.hero('a')!;
    dao.input('a', 1, { kind: 'cast', slot: 0 });
    dao.step();
    expect(h.mana).toBe(h.maxMana - 23);
    expect(
      dao.events.some(
        ({ event }) =>
          event.kind === 'cast' && event.abilityId === 'phi_anh_tram',
      ),
    ).toBe(true);
    const p = duel('con_luan_kiem_ton');
    const swords = p.hero('a')!;
    const plant = p.arena.config.skillCatalogue!.kinh_loi!;
    p.input('a', 1, { kind: 'tam-lien-tram' });
    p.step();
    expect(skillCharges(swords, plant, p.tick)!.count).toBe(2);
    expect(skillCharges(swords, plant, p.tick)!.rechargeTicks).toBe(90);
    for (let i = 0; i < 89; i++) p.step();
    expect(skillCharges(swords, plant, p.tick)!.count).toBe(2);
    p.step();
    expect(skillCharges(swords, plant, p.tick)!.count).toBe(3);
  });
  it('copies all overridden ranks/catalogues and never writes into the canonical PvE data', () => {
    const before = JSON.stringify(m1Config),
      rules = JSON.stringify(pvp1v1Tuning);
    const p = duel('thieu_lam_quyen', 'vo_dang_kiem');
    expect(p.snapshot().combatProfile).toBe('pvp_1v1');
    expect(p.arena.config.basics.thieu_lam_quyen!.minIntervalTicks).toBe(12);
    expect(
      p.arena.config.basics.thieu_lam_quyen!.manualChain!.cooldownTicks,
    ).toBe(12);
    expect(p.arena.config.basics.vo_dang_kiem!.minIntervalTicks).toBe(9);
    const guard = maxSkill(p, 'kim_cang_bat_hoai');
    expect(guard.cooldownTicks).toBe(360);
    expect(guard.selfStatuses!.map((s) => s.durationTicks)).toEqual([105, 105]);
    expect(p.hero('a')!.maxHp).toBe(626);
    expect(
      characterStats(p.hero('a')!, p.arena.config, p.tick).total.defense,
    ).toBe(40.1);
    const sword = maxSkill(p, 'nhan_kiem_hop_nhat', 'b').effect;
    expect(sword.mode === 'projectile' && sword.speed).toBe(240);
    const rain = maxSkill(p, 'that_tinh_kiem', 'b').effect;
    expect(rain.mode === 'multi_hit' && rain.targetArea?.radius).toBe(48);
    expect(rain.mode === 'multi_hit' && rain.hits).toBe(7);
    expect(JSON.stringify(m1Config)).toBe(before);
    expect(JSON.stringify(pvp1v1Tuning)).toBe(rules);
    p.arena.config.progression!.skills.kim_cang_bat_hoai!.ranks[0]!.manaCost = 999;
    expect(JSON.stringify(m1Config)).toBe(before);
  });

  it('retains transformation identity, implements the faster plant recharge and rounded Dao costs', () => {
    const monk = duel('con_luan_thien_su');
    expect(
      maxSkill(monk, 'ngu_loi_chinh_phap_the').reactiveBlock!.chance,
    ).toBeCloseTo(0.18);
    const chaos = maxSkill(monk, 'vo_cuc_phong_loi_quyet').selfStatuses![0]!;
    expect(chaos.magnitude).toBeCloseTo(1.16);
    expect(chaos.durationTicks).toBe(480);
    const plants = duel('con_luan_kiem_ton');
    expect(plants.arena.config.skillCatalogue!.kinh_loi!.cooldownTicks).toBe(
      90,
    );
    expect(plants.arena.config.skillCatalogue!.kinh_loi!.charges).toBe(3);
    const dao = duel('thien_son_dao');
    expect(
      dao.hero('a')!.skillIds!.map((id) => maxSkill(dao, id).manaCost),
    ).toEqual([23, 19, 21, 26, 49]);
  });

  it('selects the profile from the starting teams, excludes spectators, and never switches a team round after deaths', () => {
    const solo = duel();
    solo.join('watch', 'watch');
    expect(solo.snapshot().combatProfile).toBe('pvp_1v1');
    solo.definition.oneVOne!.damageMultiplier = 0.01;
    expect(solo.arena.world.pvp1v1!.damageMultiplier).toBe(0.75);
    const team = duel('thieu_lam_quyen', 'cai_bang_bong', true);
    expect(team.snapshot().combatProfile).toBe('standard');
    expect(team.arena.config.basics.thieu_lam_quyen!.cooldownTicks).toBe(0);
    team.hero('c')!.hp = 0;
    team.step();
    expect(team.phase).toBe('fighting');
    expect(team.snapshot().alive).toEqual({ chinh: 1, ta: 1 });
    expect(team.snapshot().combatProfile).toBe('standard');
    expect(team.hero('a')!.statusDurationPolicy).toBeUndefined();
    const disabled = duel('thieu_lam_quyen', 'cai_bang_bong', false, false);
    expect(disabled.snapshot().combatProfile).toBe('standard');
  });

  it('clears the profile at series end and builds a fresh standard config for the next team series', () => {
    const p = duel('thieu_lam_quyen');
    p.remove('b');
    p.step();
    expect(p.phase).toBe('lobby');
    expect(p.snapshot().combatProfile).toBe('standard');
    p.join('b', 'b');
    p.choose('b', 'cai_bang', 'cai_bang_bong');
    p.assign('a', 'b', 'ta');
    p.join('c', 'c');
    p.choose('c', 'cai_bang', 'cai_bang_bong');
    p.assign('a', 'c', 'chinh');
    p.start('a');
    p.step();
    expect(p.snapshot().combatProfile).toBe('standard');
    expect(p.arena.config.basics.thieu_lam_quyen!.cooldownTicks).toBe(0);
    expect(p.hero('a')!.statusDurationPolicy).toBeUndefined();
  });

  it('scales player and periodic damage once, before mana absorption, and excludes environment and resolved reflection', () => {
    for (const periodic of [false, true]) {
      const p = duel(),
        base = duel('cai_bang_bong', 'cai_bang_bong', false, false);
      const before = p.hero('b')!.hp,
        old = base.hero('b')!.hp;
      hurt(p.arena.world, p.hero('b')!, 'a', 'probe', 100, p.arena.config, {
        ...nonCrit,
        periodic,
      });
      hurt(
        base.arena.world,
        base.hero('b')!,
        'a',
        'probe',
        100,
        base.arena.config,
        { ...nonCrit, periodic },
      );
      expect(before - p.hero('b')!.hp).toBeCloseTo(
        (old - base.hero('b')!.hp) * 0.75,
      );
    }
    const p = duel('thieu_lam_quyen', 'vo_dang_quyen'),
      h = p.hero('b')!,
      mp = h.mana;
    applyStatus(
      h,
      {
        kind: 'mana_shield',
        durationTicks: 100,
        magnitude: 1,
        secondary: 0.95,
      },
      h.id,
      'shield',
      p.tick,
    );
    const raw = Math.round(
      (100 * 100) /
        (100 + characterStats(h, p.arena.config, p.tick).total.defense),
    );
    hurt(p.arena.world, h, 'a', 'probe', 100, p.arena.config, nonCrit);
    expect(h.hp).toBe(h.maxHp);
    expect(mp - h.mana).toBeCloseTo(raw * 0.75 * 0.85 * 0.95);
    h.statuses = [];
    const hp = h.hp;
    hurt(p.arena.world, h, 'a', 'reflection', 42, p.arena.config, {
      ...nonCrit,
      preserveFraction: true,
      resolvedReflection: true,
    });
    expect(hp - h.hp).toBe(42);
    const envBefore = h.hp;
    hurt(
      p.arena.world,
      h,
      'pvp_environment',
      'hazard',
      100,
      p.arena.config,
      nonCrit,
    );
    expect(envBefore - h.hp).toBe(raw);
  });

  it('scales only hostile hard controls on fighters and preserves slow, self effects, flying immunity and PvE', () => {
    const p = duel(),
      h = p.hero('b')!,
      tick = p.tick;
    for (const [kind, duration, expected] of [
      ['stun', 60, 36],
      ['root', 30, 20],
      ['silence', 78, 48],
      ['disarm', 78, 48],
      ['slow', 90, 90],
      ['attack_slow', 90, 90],
    ] as const) {
      h.statuses = [];
      applyStatus(
        h,
        { kind, durationTicks: duration, magnitude: 0.4 },
        'a',
        'probe',
        tick,
      );
      expect(h.statuses![0]!.until - tick).toBe(expected);
      expect(h.statuses![0]!.magnitude).toBe(0.4);
    }
    h.statuses = [];
    applyStatus(
      h,
      { kind: 'stun', durationTicks: 60, magnitude: 1 },
      h.id,
      'fortune',
      tick,
    );
    expect(h.statuses![0]!.until - tick).toBe(60);
    h.statuses = [];
    applyStatus(
      h,
      { kind: 'duong_mon_flight', durationTicks: 100, magnitude: 1 },
      h.id,
      'flight',
      tick,
    );
    applyStatus(
      h,
      { kind: 'stun', durationTicks: 60, magnitude: 1 },
      'a',
      'probe',
      tick,
    );
    expect(h.statuses!.some((s) => s.kind === 'stun')).toBe(false);
    const original = duel('cai_bang_bong', 'cai_bang_bong', false, false).hero(
      'b',
    )!;
    applyStatus(
      original,
      { kind: 'stun', durationTicks: 60, magnitude: 1 },
      'a',
      'probe',
      tick,
    );
    expect(original.statuses![0]!.until - tick).toBe(60);
  });

  it('preserves a damageable summon and applies the owner multiplier to actual summon attacks', () => {
    const p = duel('ngu_doc_co_su'),
      a = p.hero('a')!,
      b = p.hero('b')!;
    Object.assign(a, { x: 600, y: 360, fx: 1, fy: 0 });
    Object.assign(b, { x: 680, y: 360 });
    p.input('a', 1, { kind: 'cast', slot: 1 });
    p.step();
    const minion = a.nguDocSummons![0]!;
    expect(minion.statusDurationPolicy).toBeUndefined();
    const hp = minion.hp;
    hurt(p.arena.world, minion, 'b', 'probe', 10, p.arena.config, nonCrit);
    expect(hp - minion.hp).toBe(
      Math.round((10 * 100) / (100 + minion.defense)),
    );
    let summonHits = 0;
    const expected =
      Math.round(
        (minion.damage * 100) /
          (100 + characterStats(b, p.arena.config, p.tick).total.defense),
      ) * 0.75;
    for (let i = 0; i < 60 && p.phase === 'fighting'; i++) {
      p.step();
      for (const { event: e } of p.events)
        if (
          e.kind === 'hit' &&
          e.abilityId === 'yeu_co' &&
          e.targetId === 'b'
        ) {
          summonHits++;
          expect(e.damage).toBe(expected);
        }
    }
    expect(summonHits).toBeGreaterThan(0);
  });

  it.each([
    ['thieu_lam_quyen', 2],
    ['vo_dang_quyen', 3],
    ['vo_dang_kiem', 3],
  ] as const)(
    'limits rapid manual %s presses without changing its PvE cadence',
    (branch, expected) => {
      for (const enabled of [false, true]) {
        const p = duel(branch, 'cai_bang_bong', false, enabled),
          a = p.hero('a')!,
          b = p.hero('b')!;
        Object.assign(a, { x: 600, y: 360, fx: 1, fy: 0 });
        Object.assign(b, { x: 680, y: 360, invulnerable: true });
        let attacks = 0;
        for (let i = 0; i < 24; i++) {
          p.input('a', a.lastSequence + 1, { kind: 'basic', targetId: 'b' });
          p.step();
          attacks += p.events.filter(
            ({ event: e }) => e.kind === 'attack' && e.sourceId === 'a',
          ).length;
        }
        expect(attacks).toBe(enabled ? expected : 24);
      }
    },
  );

  it('uses the server round profile for HUD mana costs and cooldowns and resets in standard modes', () => {
    const one = pvpCombatConfig({ combatProfile: 'pvp_1v1' });
    expect(
      one.progression!.skills.bach_liet_thien_kich!.ranks[3]!.manaCost,
    ).toBe(49);
    expect(one.skillCatalogue!.kinh_loi!.cooldownTicks).toBe(90);
    expect(
      one.progression!.skills.ngu_loi_chinh_phap_the!.ranks[3]!.reactiveBlock!
        .stunTicks,
    ).toBe(10);
    expect(
      m1Config.progression!.skills.ngu_loi_chinh_phap_the!.ranks[3]!
        .reactiveBlock!.stunTicks,
    ).toBe(15);
    expect(pvpCombatConfig({ combatProfile: 'standard' })).toBe(m1Config);
    expect(pvpCombatConfig(undefined)).toBe(m1Config);
    expect(
      createPvp1v1Config(m1Config, pvp1v1Tuning).basics.cai_bang_bong,
    ).toBe(m1Config.basics.cai_bang_bong);
  });
});
