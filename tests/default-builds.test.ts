import { describe, it, expect } from 'vitest';
import {
  DungeonMatch,
  initializeProgression,
  gainExperience,
  pointAccounting,
  characterStats,
  type BuildChange,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  desertDungeon,
  progressionSchema,
} from '@volam/game-data';
import { buildActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
function fixture(school = 'cai_bang', level = 1) {
  const config = structuredClone(m1Config),
    match = new DungeonMatch(config, creepDungeon, 42, undefined, [
      desertDungeon,
    ]),
    hero = match.add('hero', 'Thiếu hiệp');
  hero.schoolId = school;
  expect(initializeProgression(hero, config, 'default')).toBe(true);
  if (level > 1) gainExperience(hero, (level - 1) * config.xpPerLevel, config);
  let seq = 0;
  const change = (c: BuildChange) =>
    match.modifyBuild(hero.id, ++seq, hero.progression!.revision, c);
  const ranks = () =>
    hero.progression!.defaultSkills.map(
      (id) => hero.progression!.ranks[id] ?? 0,
    );
  return { config, match, hero, change, ranks };
}
describe('Default branch progression', () => {
  it('learns/equips each slot on level gain, cycling left to right QWER', () => {
    const f = fixture();
    for (const [i, expected] of [
      [1, 0, 0, 0],
      [1, 1, 0, 0],
      [1, 1, 1, 0],
      [1, 1, 1, 1],
      [2, 1, 1, 1],
      [2, 2, 1, 1],
    ].entries()) {
      if (i) gainExperience(f.hero, 60, f.config);
      expect(f.ranks()).toEqual(expected);
      expect(f.hero.skillIds!.map(Boolean)).toEqual(expected.map((n) => n > 0));
      expect(pointAccounting(f.hero, f.config)).toMatchObject({
        earned: i + 1,
        allocated: i + 1,
        available: 0,
        surplus: 0,
      });
    }
  });
  it('validates all eight data-driven branches at every level and preserves existing caps/surplus', () => {
    for (const [id, branch] of Object.entries(
      m1Config.progression!.defaultBranches!,
    )) {
      const f = fixture(branch.schoolId);
      expect(f.change({ action: 'branch', basicId: id })).toBeUndefined();
      for (let level = 1; level <= 30; level++) {
        if (level > 1) gainExperience(f.hero, 60, f.config);
        const p = pointAccounting(f.hero, f.config);
        expect(p.allocated + p.available + p.surplus).toBe(level);
        f.ranks().forEach((r, slot) => {
          const skill = f.config.progression!.skills[branch.skillIds[slot]!]!;
          expect(r).toBeLessThanOrEqual(skill.ranks.length);
          if (r) expect(level).toBeGreaterThanOrEqual(skill.levelGates[r - 1]!);
        });
      }
      expect(pointAccounting(f.hero, f.config)).toMatchObject({
        allocated: 16,
        surplus: 14,
        available: 0,
      });
    }
  });
  it('transfers rank by SLOT on replacement, rejects cross-branch/foreign/duplicate/empty builds atomically', () => {
    const f = fixture('cai_bang', 6),
      p = f.hero.progression!;
    const ids = [...p.defaultSkills];
    [ids[0], ids[2]] = [ids[2]!, ids[0]!];
    expect(f.change({ action: 'loadout', ids })).toBeUndefined();
    expect(f.ranks()).toEqual([2, 2, 1, 1]);
    expect(p.ranks['cam_long_cong']).toBe(2);
    for (const bad of [
      ['hoa_van_chuong', ...ids.slice(1)],
      ['lien_hoa_phien', ...ids.slice(1)],
      [ids[0]!, ids[0]!, ...ids.slice(2)],
      ['', ...ids.slice(1)],
    ]) {
      const before = JSON.stringify(p);
      expect(f.change({ action: 'loadout', ids: bad })).toBeTypeOf('string');
      expect(JSON.stringify(p)).toBe(before);
    }
    expect(f.change({ action: 'branch', basicId: 'vo_dang_kiem' })).toBeTypeOf(
      'string',
    );
    expect(f.change({ action: 'upgrade', skillId: ids[0]! })).toMatch(
      /tự phân/,
    );
  });
  it('gates ultimate replacement and leaves point quotas pending until each rank unlocks', () => {
    const f = fixture('cai_bang', 5);
    const ids = [
      'thien_ha_vo_cau',
      ...f.hero.progression!.defaultSkills.slice(1),
    ];
    expect(f.change({ action: 'loadout', ids })).toMatch(/cấp 6/);
    gainExperience(f.hero, 60, f.config);
    expect(f.change({ action: 'loadout', ids })).toBeUndefined();
    expect(f.ranks()).toEqual([1, 2, 1, 1]);
    expect(pointAccounting(f.hero, f.config).available).toBe(1);
    gainExperience(f.hero, 24 * 60, f.config);
    expect(f.ranks()).toEqual([3, 4, 4, 4]);
    expect(pointAccounting(f.hero, f.config)).toMatchObject({
      allocated: 15,
      surplus: 15,
    });
  });
  it('preserves custom mixing, cooldown debt and resources across repeated mode/branch changes', () => {
    const f = fixture('cai_bang', 30),
      h = f.hero;
    h.hp = 50;
    h.mana = 20;
    h.skillCooldowns[0] = 1000;
    const original = characterStats(h, f.config).total;
    for (let i = 0; i < 30; i++) {
      expect(f.change({ action: 'mode', mode: 'custom' })).toBeUndefined();
      expect(f.change({ action: 'reset' })).toBeUndefined();
      expect(
        f.change({
          action: 'loadout',
          ids: ['hoa_van_chuong', 'hoanh_tao_bong', '', ''],
        }),
      ).toBeUndefined();
      expect(
        f.change({ action: 'upgrade', skillId: 'hoa_van_chuong' }),
      ).toBeUndefined();
      expect(
        f.change({ action: 'branch', basicId: 'cai_bang_chuong' }),
      ).toBeTypeOf('string');
      expect(f.change({ action: 'mode', mode: 'default' })).toBeUndefined();
      expect(
        f.change({ action: 'branch', basicId: 'cai_bang_chuong' }),
      ).toBeUndefined();
      expect(
        f.change({ action: 'branch', basicId: 'cai_bang_bong' }),
      ).toBeUndefined();
      expect(pointAccounting(h, f.config)).toMatchObject({
        allocated: 16,
        surplus: 14,
      });
      expect(characterStats(h, f.config).total).toEqual(original);
      expect(h.skillCooldowns[0]).toBe(1000);
      expect([h.hp, h.mana]).toEqual([50, 20]);
    }
  });
  it('rejects edits while dead/outside arena and rejects forged rank/mode payloads', () => {
    const f = fixture();
    expect(f.match.enter(f.hero.id, 'private')).toBeUndefined();
    expect(f.change({ action: 'mode', mode: 'custom' })).toMatch(/đấu trường/);
    f.hero.hp = 0;
    expect(f.match.exit(f.hero.id)).toMatch(/Space/);
    const base = {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      revision: 0,
      action: 'mode',
      mode: 'default',
    };
    expect(buildActionSchema.safeParse(base).success).toBe(true);
    expect(
      buildActionSchema.safeParse({ ...base, ranks: { hoa_van_chuong: 99 } })
        .success,
    ).toBe(false);
    expect(
      buildActionSchema.safeParse({ ...base, mode: 'forged' }).success,
    ).toBe(false);
  });
  it('validates branch definitions at startup', () => {
    const d = structuredClone(m1Config.progression!);
    d.defaultBranches!['cai_bang_bong']!.skillIds[0] = 'hoa_van_chuong';
    expect(progressionSchema.safeParse(d).success).toBe(false);
  });
  it.each(['arena', 'forest', 'desert'])(
    'respawns dead heroes from %s at the central arena spawn with unchanged rewards',
    (destination) => {
      const f = fixture();
      if (destination !== 'arena')
        expect(
          f.match.enter(f.hero.id, 'private', destination),
        ).toBeUndefined();
      const d = destination === 'desert' ? desertDungeon : creepDungeon;
      f.hero.hp = 0;
      f.hero.gold = 25;
      const xp = f.hero.xp;
      f.match.step();
      const before = { x: f.hero.x, y: f.hero.y };
      f.match.input(f.hero.id, 100, { kind: 'move', x: 1, y: 0 });
      for (let i = 0; i < d.respawnTicks - 1; i++) f.match.step();
      expect(f.hero.hp).toBe(0);
      expect({ x: f.hero.x, y: f.hero.y }).toEqual(before);
      f.match.step();
      expect(f.match.zoneOf(f.hero.id)!.id).toBe('arena');
      expect(f.hero).toMatchObject({
        ...f.config.spawn,
        hp: f.hero.maxHp,
        mana: f.hero.maxMana,
        gold: 25,
        xp,
      });
    },
  );
});
