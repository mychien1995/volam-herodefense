import { describe, it, expect } from 'vitest';
import {
  DungeonMatch,
  initializeProgression,
  pointAccounting,
  gainExperience,
  characterStats,
  rankedAbility,
  submitInput,
  abilityCooldown,
  type BuildChange,
} from '@volam/game-core';
import { m1Config, creepDungeon, progressionSchema } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
function fixture(level = 1) {
  const config = structuredClone(m1Config),
    match = new DungeonMatch(config, creepDungeon),
    hero = match.add('a', 'A');
  initializeProgression(hero, config);
  if (level > 1) gainExperience(hero, (level - 1) * config.xpPerLevel, config);
  let seq = 0;
  const change = (c: BuildChange, rev = hero.progression!.revision) =>
    match.modifyBuild('a', ++seq, rev, c);
  return { config, match, hero, change, world: match.arena.world };
}
const normals = [
  'hoa_van_chuong',
  'hoanh_tao_bong',
  'pha_giap_bong',
  'cam_long_cong',
];
function maxBuild(f: ReturnType<typeof fixture>, ids = normals) {
  expect(f.change({ action: 'loadout', ids })).toBeUndefined();
  for (const id of ids)
    for (let i = 0; i < f.config.progression!.skills[id]!.ranks.length; i++)
      expect(f.change({ action: 'upgrade', skillId: id })).toBeUndefined();
}
describe('M3B deterministic progression and builds', () => {
  it('starts at level1 with exactly one available point and no free learned actives', () => {
    const f = fixture();
    expect(f.hero.level).toBe(1);
    expect(f.hero.xp).toBe(0);
    expect(pointAccounting(f.hero, f.config)).toEqual({
      earned: 1,
      allocated: 0,
      available: 1,
      surplus: 0,
    });
    expect(f.hero.skillIds).toEqual(['', '', '', '']);
    expect(f.hero.skillPoints).toBe(1);
  });
  it('earns precisely one point at every level and clamps EXP/power at30', () => {
    const f = fixture();
    for (let i = 2; i <= 30; i++) {
      gainExperience(f.hero, 60, f.config);
      expect(f.hero.level).toBe(i);
      expect(pointAccounting(f.hero, f.config).earned).toBe(i);
    }
    gainExperience(f.hero, 100000, f.config);
    expect(f.hero.xp).toBe(1740);
    expect(f.hero.level).toBe(30);
    expect(f.hero.skillPoints).toBe(30);
    gainExperience(f.hero, -1, f.config);
    gainExperience(f.hero, NaN, f.config);
    expect(f.hero.xp).toBe(1740);
  });
  it('spends available points once and rejects insufficient budgets and standard rank gates', () => {
    const f = fixture();
    f.change({ action: 'loadout', ids: [normals[0]!, normals[1]!, '', ''] });
    expect(
      f.change({ action: 'upgrade', skillId: normals[0]! }),
    ).toBeUndefined();
    expect(f.hero.skillPoints).toBe(0);
    expect(f.change({ action: 'upgrade', skillId: normals[1]! })).toMatch(
      /điểm/,
    );
    expect(f.change({ action: 'upgrade', skillId: normals[0]! })).toMatch(
      /cấp 3/,
    );
    gainExperience(f.hero, 120, f.config);
    expect(
      f.change({ action: 'upgrade', skillId: normals[0]! }),
    ).toBeUndefined();
    expect(f.hero.progression!.ranks[normals[0]!]).toBe(2);
  });
  it('enforces ultimate6/10/14 gates, rank3 cap and at most one in any slot', () => {
    const f = fixture(5),
      id = 'hang_long_hoa_vu';
    expect(f.change({ action: 'loadout', ids: [id, '', '', ''] })).toMatch(
      /cấp 6/,
    );
    gainExperience(f.hero, 60, f.config);
    f.change({ action: 'loadout', ids: [id, '', '', ''] });
    expect(f.change({ action: 'upgrade', skillId: id })).toBeUndefined();
    expect(f.change({ action: 'upgrade', skillId: id })).toMatch(/cấp 10/);
    gainExperience(f.hero, 240, f.config);
    expect(f.change({ action: 'upgrade', skillId: id })).toBeUndefined();
    expect(f.change({ action: 'upgrade', skillId: id })).toMatch(/cấp 14/);
    gainExperience(f.hero, 240, f.config);
    expect(f.change({ action: 'upgrade', skillId: id })).toBeUndefined();
    expect(f.change({ action: 'upgrade', skillId: id })).toMatch(/tối đa/);
    expect(
      f.change({ action: 'loadout', ids: [id, 'thien_ha_vo_cau', '', ''] }),
    ).toMatch(/một tuyệt/);
  });
  it('mixes styles, swaps ranks by ID, changes A independently and refunds removed ranks', () => {
    const f = fixture(7);
    f.change({ action: 'loadout', ids: [normals[0]!, normals[1]!, '', ''] });
    f.change({ action: 'upgrade', skillId: normals[0]! });
    f.change({ action: 'upgrade', skillId: normals[1]! });
    const original = [...f.hero.skillIds!];
    expect(
      f.change({ action: 'basic', basicId: 'cai_bang_chuong' }),
    ).toBeUndefined();
    expect(f.hero.skillIds).toEqual(original);
    f.change({ action: 'loadout', ids: [normals[1]!, normals[0]!, '', ''] });
    expect(f.hero.progression!.ranks[normals[0]!]).toBe(1);
    f.change({ action: 'loadout', ids: [normals[1]!, '', '', ''] });
    expect(f.hero.progression!.ranks[normals[0]!]).toBeUndefined();
    expect(f.hero.skillPoints).toBe(6);
    expect(rankedAbility(f.hero, normals[0]!, f.config)).toBeUndefined();
  });
  it.each(['la_han_quyen', 'thien_son_phien', 'constructor', '__proto__'])(
    'rejects cross-school/unknown/reserved ID %s atomically',
    (id) => {
      const f = fixture(30),
        before = JSON.stringify(f.hero);
      expect(
        f.change({ action: 'loadout', ids: [id, '', '', ''] }),
      ).toBeTruthy();
      expect(JSON.stringify({ ...f.hero, lastSequence: 0 })).toBe(before);
      expect(f.change({ action: 'basic', basicId: id })).toBeTruthy();
    },
  );
  it('rejects duplicate slots, upgrading an unequipped skill and standard cap5', () => {
    const f = fixture(30);
    expect(
      f.change({ action: 'loadout', ids: [normals[0]!, normals[0]!, '', ''] }),
    ).toBeTruthy();
    expect(f.change({ action: 'upgrade', skillId: normals[0]! })).toMatch(
      /Trang bị/,
    );
    maxBuild(f);
    expect(f.change({ action: 'upgrade', skillId: normals[0]! })).toMatch(
      /tối đa/,
    );
  });
  it('gives14 surplus for four normals and15 for three normals plus one ultimate', () => {
    const f = fixture(30);
    maxBuild(f);
    expect(pointAccounting(f.hero, f.config)).toEqual({
      earned: 30,
      allocated: 16,
      available: 0,
      surplus: 14,
    });
    const s = characterStats(f.hero, f.config);
    expect(s.sources.surplus.attackPower).toBeCloseTo(16.8);
    f.change({ action: 'reset' });
    maxBuild(f, [...normals.slice(0, 3), 'hang_long_hoa_vu']);
    expect(pointAccounting(f.hero, f.config)).toEqual({
      earned: 30,
      allocated: 15,
      available: 0,
      surplus: 15,
    });
  });
  it('requires four nonempty maxed slots, removes surplus immediately and recalculates on levelup', () => {
    const f = fixture(20);
    maxBuild(f);
    expect(pointAccounting(f.hero, f.config).surplus).toBe(4);
    gainExperience(f.hero, 60, f.config);
    expect(pointAccounting(f.hero, f.config).surplus).toBe(5);
    f.change({ action: 'loadout', ids: [...normals.slice(0, 3), ''] });
    expect(pointAccounting(f.hero, f.config).surplus).toBe(0);
    expect(characterStats(f.hero, f.config).sources.surplus.attackPower).toBe(
      0,
    );
    expect(f.hero.skillPoints).toBe(9);
  });
  it('repeats100 resets/rebuilds without duplicated points, permanent stats, HP/MP or gold', () => {
    const f = fixture(30);
    f.hero.hp = 37;
    f.hero.mana = 11;
    f.hero.gold = 123;
    const base = characterStats(f.hero, f.config).total;
    for (let i = 0; i < 100; i++) {
      maxBuild(f);
      f.change({ action: 'reset' });
      expect(pointAccounting(f.hero, f.config)).toEqual({
        earned: 30,
        allocated: 0,
        available: 30,
        surplus: 0,
      });
      expect(characterStats(f.hero, f.config).total).toEqual(base);
      expect(f.hero.hp).toBe(37);
      expect(f.hero.mana).toBe(11);
      expect(f.hero.gold).toBe(123);
    }
  });
  it('keeps build state and cooldowns across private/shared transitions and rejects edits there', () => {
    const f = fixture(30);
    maxBuild(f);
    submitInput(f.world, 'a', 100, { kind: 'cast', slot: 0 });
    f.match.step();
    const ranks = { ...f.hero.progression!.ranks },
      remaining = f.hero.skillCooldowns[0]! - f.world.tick;
    expect(f.match.enter('a', 'private')).toBeUndefined();
    expect(f.hero.progression!.ranks).toEqual(ranks);
    expect(f.hero.skillCooldowns[0]).toBe(remaining);
    expect(
      f.match.modifyBuild('a', 101, f.hero.progression!.revision, {
        action: 'reset',
      }),
    ).toMatch(/đấu trường/);
    Object.assign(f.hero, creepDungeon.exit);
    expect(f.match.exit('a')).toBeUndefined();
    expect(f.hero.progression!.ranks).toEqual(ranks);
    expect(f.hero.skillCooldowns[0]! - f.world.tick).toBe(remaining);
    expect(f.match.enter('a', 'shared')).toBeUndefined();
    expect(f.hero.progression!.ranks).toEqual(ranks);
  });
  it('rejects read-only dungeon and PvP ownership, dead and defeated edits', () => {
    const f = fixture(7);
    f.change({ action: 'loadout', ids: [normals[0]!, '', '', ''] });
    f.change({ action: 'upgrade', skillId: normals[0]! });
    const before = JSON.stringify(f.hero.progression);
    f.match.enter('a', 'private');
    expect(f.change({ action: 'reset' })).toMatch(/đấu trường/);
    f.match.membership.set('a', 'pvp');
    f.match.zones.set('pvp', { ...f.match.arena, id: 'pvp' });
    f.match.arena.world.heroes.set('a', f.hero);
    expect(f.change({ action: 'reset' })).toMatch(/đấu trường/);
    f.match.membership.set('a', 'arena');
    f.hero.hp = 0;
    expect(f.change({ action: 'reset' })).toMatch(/hồi sinh/);
    expect(JSON.stringify(f.hero.progression)).toBe(before);
  });
  it('keeps cooldown debt through swap, rank upgrade, reset, relearn and basic changes', () => {
    const f = fixture(7);
    f.change({ action: 'loadout', ids: [normals[0]!, '', '', ''] });
    f.change({ action: 'upgrade', skillId: normals[0]! });
    submitInput(f.world, 'a', 100, { kind: 'cast', slot: 0 });
    f.match.step();
    const expiry = f.hero.abilityCooldowns![normals[0]!]!;
    // Build sequence and control input share the same authoritative sequence space.
    const change = (c: BuildChange) => {
      const seq = f.hero.lastSequence + 1;
      return f.match.modifyBuild('a', seq, f.hero.progression!.revision, c);
    };
    expect(change({ action: 'upgrade', skillId: normals[0]! })).toBeUndefined();
    expect(
      change({ action: 'loadout', ids: ['', normals[0]!, '', ''] }),
    ).toBeUndefined();
    expect(f.hero.skillCooldowns[1]).toBe(expiry);
    change({ action: 'reset' });
    change({ action: 'upgrade', skillId: normals[0]! });
    submitInput(f.world, 'a', f.hero.lastSequence + 1, {
      kind: 'cast',
      slot: 1,
    });
    f.match.step();
    expect(f.world.events.filter((e) => e.kind === 'cast')).toHaveLength(0);
    expect(f.hero.abilityCooldowns![normals[0]!]).toBe(expiry);
    f.hero.cooldown = 200;
    change({ action: 'basic', basicId: 'cai_bang_chuong' });
    expect(f.hero.cooldown).toBe(200);
  });
  it('rejects stale/replayed concurrent requests rather than spending twice', () => {
    const f = fixture(7);
    f.change({ action: 'loadout', ids: [normals[0]!, '', '', ''] });
    const rev = f.hero.progression!.revision;
    expect(
      f.change({ action: 'upgrade', skillId: normals[0]! }, rev),
    ).toBeUndefined();
    expect(f.change({ action: 'upgrade', skillId: normals[0]! }, rev)).toMatch(
      /thay đổi/,
    );
    expect(
      f.match.modifyBuild(
        'a',
        f.hero.lastSequence,
        f.hero.progression!.revision,
        { action: 'reset' },
      ),
    ).toMatch(/xử lý/);
    expect(pointAccounting(f.hero, f.config).allocated).toBe(1);
  });
  it('layers base, level, innate, surplus, zero equipment and temporary buffs once', () => {
    const f = fixture(15),
      s = characterStats(f.hero, f.config);
    expect(s.sources.base.attackPower).toBe(28);
    expect(s.sources.growth.attackPower).toBe(28);
    expect(s.sources.innate.attackPower).toBeCloseTo(4.2);
    expect(s.total.attackPower).toBeCloseTo(60.2);
    expect(s.total.maxHp).toBe(272);
    expect(s.total.maxMana).toBe(128);
    expect(s.total.defense).toBeCloseTo(2.1);
    expect(s.total.critChance).toBeCloseTo(0.128);
    expect(s.total.critMultiplier).toBeCloseTo(1.57);
    f.hero.statuses = [
      {
        kind: 'crit_buff',
        durationTicks: 30,
        magnitude: 0.3,
        secondary: 0.75,
        until: 30,
        sourceId: 'a',
        abilityId: 'khang_long_huu_hoi',
      },
    ];
    expect(characterStats(f.hero, f.config, 1).total.critChance).toBeCloseTo(
      0.428,
    );
    expect(characterStats(f.hero, f.config, 30).total.critChance).toBeCloseTo(
      0.128,
    );
  });
  it('uses configured attack speed/CDR and preserves caps in derived stats', () => {
    const f = fixture(30),
      profile = f.config.progression!.schools['cai_bang']!;
    profile.growth.attackSpeed = 0.05;
    profile.growth.cooldownReduction = 0.03;
    profile.growth.critChance = 0.1;
    const a = f.config.skills[0]!;
    expect(abilityCooldown(f.hero, a, f.config, 0)).toBe(54);
    expect(
      abilityCooldown(
        f.hero,
        f.config.basics['cai_bang_bong']!,
        f.config,
        0,
        true,
      ),
    ).toBe(8);
    expect(characterStats(f.hero, f.config).total.critChance).toBe(0.75);
  });
  it.each(Object.keys(m1Config.skillCatalogue!))(
    'preserves M3A rank1 and provides mechanic-specific rank improvements for %s',
    (id) => {
      const d = m1Config.progression!.skills[id]!;
      expect(d.ranks[0]).toEqual(m1Config.skillCatalogue![id]);
      expect(d.ranks.at(-1)).not.toEqual(d.ranks[0]);
      if (id === 'cam_long_cong')
        for (const a of d.ranks) {
          expect(a.effect.mode === 'arc' && a.effect.damage).toBe(0);
          expect(
            a.effect.mode === 'arc' && a.effect.statuses?.map((s) => s.kind),
          ).toEqual(['silence', 'disarm']);
        }
    },
  );
  it('rank upgrades change real damage, control duration and burn configuration without client authority', () => {
    const hit = (rank: number) => {
      const f = fixture(7);
      f.change({ action: 'loadout', ids: ['hoanh_tao_bong', '', '', ''] });
      for (let i = 0; i < rank; i++)
        f.change({ action: 'upgrade', skillId: 'hoanh_tao_bong' });
      f.world.creeps.clear();
      const enemy = {
        ...f.match.arena.world.heroes.get('a')!,
        id: 'dummy',
        x: f.hero.x + 30,
        y: f.hero.y,
        hp: 1000,
        maxHp: 1000,
        spawn: { x: 0, y: 0 },
        respawnAt: 0,
        hits: {},
        burnSource: '',
        burnUntil: 0,
        burnNext: 0,
        burnDamage: 0,
      };
      f.world.creeps.set('dummy', enemy);
      f.world.random = () => 0.99;
      submitInput(f.world, 'a', 100, { kind: 'cast', slot: 0 });
      f.match.step();
      return {
        damage: f.world.events.find((e) => e.kind === 'hit')?.damage,
        status: enemy.statuses?.[0],
      };
    };
    const a = hit(1),
      b = hit(4);
    expect(b.damage!).toBeGreaterThan(a.damage!);
    expect(b.status!.durationTicks).toBe(135);
    expect(a.status!.durationTicks).toBe(90);
    const burn =
      m1Config.progression!.skills['cuong_long_loan_vu']!.ranks[3]!.effect;
    expect(burn.mode === 'projectile' && burn.burnDamage).toBe(7);
  });
  it('level gains cannot revive a dead hero and respec cannot refill a living hero', () => {
    const f = fixture();
    f.hero.hp = 0;
    gainExperience(f.hero, 600, f.config);
    expect(f.hero.hp).toBe(0);
    expect(f.hero.maxHp).toBe(240);
    f.hero.hp = 1;
    f.hero.mana = 0;
    f.change({ action: 'reset' });
    expect(f.hero.hp).toBe(1);
    expect(f.hero.mana).toBe(0);
  });
  it('applies configured defense, movement, regeneration and cooldown reduction in actual simulation', () => {
    const f = fixture(30),
      p = f.config.progression!.schools['cai_bang']!;
    p.base.defense = 100;
    p.base.movementSpeed = 90;
    p.base.manaRegen = 30;
    p.base.cooldownReduction = 0.25;
    f.world.creeps.clear();
    f.hero.mana = 0;
    submitInput(f.world, 'a', 100, { kind: 'move', x: 1, y: 0 });
    const before = f.hero.x;
    f.match.step();
    expect(f.hero.x - before).toBeCloseTo(3);
    expect(f.hero.mana).toBeCloseTo(1);
    const c = (change: BuildChange) =>
      f.match.modifyBuild(
        'a',
        f.hero.lastSequence + 1,
        f.hero.progression!.revision,
        change,
      );
    c({ action: 'loadout', ids: ['hoa_van_chuong', '', '', ''] });
    c({ action: 'upgrade', skillId: 'hoa_van_chuong' });
    f.hero.mana = 100;
    submitInput(f.world, 'a', f.hero.lastSequence + 1, {
      kind: 'cast',
      slot: 0,
    });
    f.match.step();
    expect(f.hero.skillCooldowns[0]! - f.world.tick).toBe(68);
    expect(characterStats(f.hero, f.config).total.defense).toBeCloseTo(104.35);
    f.world.random = () => 0.99;
    const hp = f.hero.hp;
    hurt(f.world, f.hero, 'npc', 'creep_strike', 20, f.config);
    expect(hp - f.hero.hp).toBe(10);
  });
  it('validates rank data counts, IDs, gates and finite stat coefficients at load', () => {
    const def = structuredClone(m1Config.progression!);
    def.skills['hoa_van_chuong']!.levelGates = [1, 1, 1, 1];
    expect(() => progressionSchema.parse(def)).toThrow();
    const bad = structuredClone(m1Config.progression!);
    bad.schools['cai_bang']!.surplus.attackPower = NaN;
    expect(() => progressionSchema.parse(bad)).toThrow();
  });
  it('preserves hostile control through reset and cancels self buffs/actions without refilling mana', () => {
    const f = fixture(10);
    f.hero.statuses = [
      {
        kind: 'stun',
        durationTicks: 60,
        magnitude: 1,
        until: 60,
        sourceId: 'enemy',
        abilityId: 'npc_stun',
      },
      {
        kind: 'crit_buff',
        durationTicks: 180,
        magnitude: 0.3,
        secondary: 0.75,
        until: 180,
        sourceId: 'a',
        abilityId: 'khang_long_huu_hoi',
      },
    ];
    f.hero.mana = 12;
    expect(f.change({ action: 'reset' })).toBeUndefined();
    expect(f.hero.statuses.map((s) => s.kind)).toEqual(['stun']);
    expect(f.hero.mana).toBe(12);
    expect(
      characterStats(f.hero, f.config, 1).sources.temporary.critChance,
    ).toBe(0);
  });
});
