import { expect, it } from 'vitest';
import {
  DungeonMatch,
  characterStats,
  equippedAbility,
  gainExperience,
  initializeProgression,
  pointAccounting,
  skillRank,
  type BuildChange,
} from '@volam/game-core';
import { creepDungeon, m1Config, waveBossFarewells } from '@volam/game-data';

function fixture(branch = 'thieu_lam_quyen') {
  const config = structuredClone(m1Config);
  const match = new DungeonMatch(config, creepDungeon);
  const hero = match.add('hero', 'Thiếu hiệp');
  hero.schoolId = config.progression!.defaultBranches![branch]!.schoolId;
  expect(initializeProgression(hero, config, 'fixed', branch)).toBe(true);
  let seq = 0;
  const change = (action: BuildChange, revision = hero.progression!.revision) =>
    match.modifyBuild(hero.id, ++seq, revision, action);
  const level = (value: number) =>
    gainExperience(hero, (value - hero.level) * config.xpPerLevel, config);
  return { config, match, hero, change, level, nextSequence: () => ++seq };
}

it.each(Object.keys(m1Config.progression!.fixedBranches!))(
  'locks %s to five same-branch skills and spends only twenty points',
  (branch) => {
    const f = fixture(branch);
    const { config, hero, change, level } = f;
    const skills = hero.progression!.defaultSkills;
    expect(skills).toHaveLength(5);
    expect(hero.skillIds).toEqual(['', '', '', '', '']);
    expect(hero.skillPoints).toBe(1);
    expect(hero.basicId).toBe(branch);
    expect(change({ action: 'loadout', ids: skills.slice(0, 4) })).toMatch(
      /khóa/,
    );
    expect(change({ action: 'basic', basicId: branch })).toMatch(/khóa/);
    expect(change({ action: 'reset' })).toMatch(/khóa/);
    expect(change({ action: 'upgrade-slot', slot: 0 })).toBeUndefined();
    expect(change({ action: 'upgrade-slot', slot: 1 })).toMatch(/điểm/);
    expect(change({ action: 'upgrade-slot', slot: 0 })).toMatch(/cấp 3/);
    expect(change({ action: 'upgrade-slot', slot: 4 })).toMatch(/cấp 6/);
    level(6);
    expect(change({ action: 'upgrade-slot', slot: 4 })).toBeUndefined();
    for (const gate of [12, 18, 24]) {
      expect(change({ action: 'upgrade-slot', slot: 4 })).toContain(
        String(gate),
      );
      level(gate);
      expect(change({ action: 'upgrade-slot', slot: 4 })).toBeUndefined();
    }
    expect(change({ action: 'upgrade-slot', slot: 4 })).toMatch(/tối đa/);
    for (let slot = 0; slot < 4; slot++)
      while (skillRank(hero, skills[slot]!, config) < 4)
        expect(change({ action: 'upgrade-slot', slot })).toBeUndefined();
    expect(hero.skillIds).toEqual(skills);
    expect(equippedAbility(hero, 4, config)?.id).toBe(skills[4]);
    level(30);
    expect(pointAccounting(hero, config)).toEqual({
      earned: 30,
      allocated: 20,
      available: 0,
      surplus: 10,
    });
    expect(
      Object.values(characterStats(hero, config).sources.surplus).every(
        (n) => n === 0,
      ),
    ).toBe(true);
  },
);

it('executes T only after learning it and preserves ranks and skill cooldowns across F', () => {
  const { hero, config, change, level, match, nextSequence } = fixture();
  level(6);
  expect(equippedAbility(hero, 4, config)).toBeUndefined();
  for (const slot of [0, 1, 2, 3, 4])
    expect(change({ action: 'upgrade-slot', slot })).toBeUndefined();
  const revision = hero.progression!.revision;
  expect(change({ action: 'stance' }, revision - 1)).toMatch(/thay đổi/);
  match.input(hero.id, nextSequence(), { kind: 'cast', slot: 4 });
  expect(change({ action: 'stance' })).toMatch(/thi triển/);
  match.step();
  const ultimate = 'nhu_lai_niet_ban';
  expect(
    match.events.some(
      ({ event }) => event.kind === 'cast' && event.abilityId === ultimate,
    ),
  ).toBe(true);
  const cooldown = hero.skillCooldowns[4]!;
  expect(cooldown).toBeGreaterThan(0);
  for (let n = 0; n < 60; n++) match.step();
  expect(change({ action: 'stance' })).toBeUndefined();
  expect(hero.skillIds).toEqual([
    'toan_phong_thoai',
    'hoanh_tao_cuoc',
    'vo_anh_cuoc',
    'kim_cang_bat_hoai',
    ultimate,
  ]);
  expect(hero.skillCooldowns[4]).toBe(cooldown);
  expect(pointAccounting(hero, config).allocated).toBe(5);
  expect(change({ action: 'upgrade-slot', slot: 0 })).toBeUndefined();
  expect(skillRank(hero, 'toan_phong_thoai', config)).toBe(2);
  expect(change({ action: 'stance' })).toBeUndefined();
  expect(skillRank(hero, 'la_han_quyen', config)).toBe(2);
  expect(hero.skillCooldowns[4]).toBe(cooldown);
});

it('has a localized farewell for the four live wave encounters and the reserved fifth chapter', () => {
  expect(Object.keys(waveBossFarewells)).toEqual([
    'dong_ta',
    'tay_doc_boss',
    'boss_nam_de',
    'bac_cai',
    'vuong_trung_duong',
  ]);
  expect(
    Object.values(waveBossFarewells).every((line) => line.includes('…')),
  ).toBe(true);
});
