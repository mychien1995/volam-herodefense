import { describe, expect, it } from 'vitest';
import { DungeonMatch, type DongAbility } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  dongTaForDifficulty,
} from '@volam/game-data';
import {
  difficultySchema,
  joinOptionsSchema,
  PROTOCOL_VERSION,
} from '@volam/game-protocol';
function setup(difficulty: 'easy' | 'hard', seed = 42) {
  const config = {
    ...structuredClone(m1Config),
    difficulty,
    creepSpawns: [],
    collision: [],
    critChance: 0,
  };
  const d = dongTaForDifficulty(dongTaDefinition, difficulty);
  d.restTicks = 1;
  d.entryTicks = 1;
  d.openingTicks = 100000;
  const match = new DungeonMatch(
    config,
    creepDungeon,
    seed,
    createInvasionDefinition(120, 100000),
    [],
    d,
  );
  const hero = match.add('p', 'P');
  match.invasion!.wave = 5;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) match.step();
  };
  step(5);
  hero.hp = hero.maxHp = 10000;
  hero.x = 800;
  hero.y = 820;
  const boss = match.arena.world.creeps.get('dong_ta')!;
  boss.fx = 1;
  boss.fy = 0;
  const cast = (id: DongAbility) => {
    match.dongTa!.casts = [];
    match.dongTa!.effects = [];
    boss.cooldown = match.arena.world.tick + 100000;
    expect(
      match.dongTa!.beginCast(
        match.arena.world,
        match.arena.config,
        boss.id,
        id,
        hero.id,
      ),
    ).toBe(true);
    return match.dongTa!.casts[0]!;
  };
  return { config, d, match, world: match.arena.world, hero, boss, step, cast };
}
describe('room difficulty / Đông Tà', () => {
  it('validates only easy/hard and retains the untouched hard definition', () => {
    expect(difficultySchema.safeParse('normal').success).toBe(false);
    expect(
      joinOptionsSchema.safeParse({
        nickname: 'P',
        protocolVersion: PROTOCOL_VERSION,
        difficulty: 'easy',
      }).success,
    ).toBe(true);
    expect(dongTaForDifficulty(dongTaDefinition, 'hard')).toEqual(
      dongTaDefinition,
    );
    const easy = dongTaForDifficulty(dongTaDefinition, 'easy');
    for (const id of Object.keys(easy.abilities) as DongAbility[])
      expect(easy.abilities[id].damage).toBeCloseTo(
        dongTaDefinition.abilities[id].damage * 0.85,
      );
    expect(
      (easy.thrust.range / dongTaDefinition.thrust.range) ** 2,
    ).toBeCloseTo(0.3);
    expect(
      easy.thrust.halfWidth / dongTaDefinition.thrust.halfWidth,
    ).toBeCloseTo(Math.sqrt(0.3));
    expect(easy.slash).toEqual(dongTaDefinition.slash);
    expect(dongTaDefinition.abilities.ngoc_tieu_hoi_phong.damage).toBe(40);
  });
  it.each([17, 41, 89])(
    'easy telegraphs only a closed rectangle before movement, seed %i',
    (seed) => {
      const s = setup('easy', seed),
        c = s.cast('lac_anh_normal');
      expect(c.telegraphHalfWidth).toBe(s.d.normalDash.halfWidth);
      expect(c.activeAt - c.startedAt).toBe(30);
      expect(c.path).toHaveLength(6);
      expect(c.path![1]).toEqual(c.path!.at(-1));
      const corners = c.path!.slice(1);
      for (let i = 1; i < corners.length; i++) {
        const dx = corners[i]!.x - corners[i - 1]!.x,
          dy = corners[i]!.y - corners[i - 1]!.y;
        expect(dx === 0 || dy === 0).toBe(true);
      }
      const before = { x: s.boss.x, y: s.boss.y };
      s.step(29);
      expect({ x: s.boss.x, y: s.boss.y }).toEqual(before);
      s.step(2);
      expect({ x: s.boss.x, y: s.boss.y }).not.toEqual(before);
      expect(
        setup('hard', seed).cast('lac_anh_normal').telegraphHalfWidth,
      ).toBeUndefined();
    },
  );
  it.each([17, 41, 89])(
    'easy holds Đông Tà until every Ngọc Tiêu petal finishes, seed %i',
    (seed) => {
      const s = setup('easy', seed),
        c = s.cast('ngoc_tieu_hoi_phong');
      s.step(s.d.abilities.ngoc_tieu_hoi_phong.windup + 1);
      const petals = s.match.dongTa!.effects.filter((e) => e.kind === 'petal');
      expect(petals).toHaveLength(40);
      expect(c.endsAt).toBe(Math.max(...petals.map((e) => e.expiresAt)));
      const before = { x: s.boss.x, y: s.boss.y };
      while (s.world.tick < c.endsAt - 1) {
        s.step();
        expect({ x: s.boss.x, y: s.boss.y }).toEqual(before);
      }
      expect(s.match.dongTa!.casts).toContain(c);
    },
  );
  it('shrinks the real frontal hit area and applies reduced damage through the real hit pipeline', () => {
    const run = (difficulty: 'easy' | 'hard', distance: number) => {
      const s = setup(difficulty);
      s.hero.x = s.boss.x + distance;
      s.hero.y = s.boss.y;
      s.cast('ta_kiem_lien_kich');
      let damage = 0;
      const hits: number[] = [];
      for (let i = 0; i < 50; i++) {
        s.step();
        hits.push(
          ...s.world.events
            .filter(
              (e) =>
                e.kind === 'hit' &&
                e.targetId === s.hero.id &&
                e.abilityId === 'ta_kiem_lien_kich',
            )
            .map((e) => e.damage),
        );
        damage += s.world.events
          .filter(
            (e) =>
              e.kind === 'hit' &&
              e.targetId === s.hero.id &&
              e.abilityId === 'ta_kiem_lien_kich',
          )
          .reduce((n, e) => n + e.damage, 0);
      }
      return { damage, hits };
    };
    expect(run('hard', 300).damage).toBeGreaterThan(0);
    expect(run('easy', 300).damage).toBe(0);
    const hard = run('hard', 100),
      easy = run('easy', 100);
    expect(hard.damage).toBeGreaterThan(0);
    expect(easy.damage).toBeGreaterThan(0);
    expect(Math.abs(easy.hits[0]! - hard.hits[0]! * 0.85)).toBeLessThanOrEqual(
      1,
    );
  });
});
