import { describe, it, expect } from 'vitest';
import { createWorld, addHero, type World } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';

describe('practice target immortality', () => {
  it('keeps a real hittable target alive after lethal damage without death/rewards', () => {
    const c = structuredClone(m1Config);
    c.creepSpawns = [{ x: 500, y: 300 }];
    const w = createWorld(c, 42),
      h = addHero(w, 'hero', 'Người thử', c),
      dog = [...w.creeps.values()][0]!;
    (w as World & { practiceTargets?: ReadonlySet<string> }).practiceTargets =
      new Set([dog.id]);
    const xp = h.xp,
      gold = h.gold;
    expect(
      hurt(w, dog, h.id, 'practice_hit', dog.maxHp * 100, c, {
        critChance: 0,
        critMultiplier: 1,
      }),
    ).toBe(true);
    expect(dog.hp).toBe(dog.maxHp);
    expect(
      w.events.some(
        (e) => e.kind === 'hit' && e.targetId === dog.id && e.damage > 0,
      ),
    ).toBe(true);
    expect(w.events.some((e) => e.kind === 'death')).toBe(false);
    expect(h.xp).toBe(xp);
    expect(h.gold).toBe(gold);
  });
});

import { PracticeMatch, skillRank, equippedAbility } from '@volam/game-core';
import { practiceDefinition, creepDungeon } from '@volam/game-data';
const practice = () =>
  new PracticeMatch(
    m1Config,
    creepDungeon,
    structuredClone(practiceDefinition),
    123,
  );
describe('private practice simulation', () => {
  it('keeps the hammer beat in practice even while skill cooldowns are refilled', () => {
    const p = practice();
    p.addSelected('h', 'Thử nhịp búa', 'con_luan', 'con_luan_thien_su');
    const attacks: { tick: number; stage: string | undefined }[] = [];
    for (let i = 1; i <= 25; i++) {
      p.input('h', i, { kind: 'basic' });
      p.step();
      for (const { event } of p.events)
        if (event.kind === 'attack')
          attacks.push({ tick: p.tick, stage: event.stage });
    }
    expect(attacks).toEqual([
      { tick: 1, stage: 'thrust' },
      { tick: 13, stage: 'sweep' },
      { tick: 25, stage: 'overhead' },
    ]);
  });
  it('clears real summons and old-school damage when switching, across every legal branch', () => {
    const p = practice(),
      h = p.addSelected('h', 'Thử triệu hồi', 'ngu_doc', 'ngu_doc_co_su'),
      w = p.arena.world;
    p.input('h', 1, { kind: 'cast', slot: 1 });
    for (let i = 0; i < 50; i++) p.step();
    expect(h.nguDocSummons?.length).toBeGreaterThan(0);
    expect(p.switchHero('h', 2, 'vo_dang', 'vo_dang_kiem')).toBeUndefined();
    expect(p.hero('h')!.nguDocSummons ?? []).toHaveLength(0);
    expect(w.actions ?? []).toHaveLength(0);
    expect(w.areas ?? []).toHaveLength(0);
    expect(w.projectiles.size).toBe(0);
    for (let i = 0; i < 100; i++) {
      p.step();
      expect(w.events).toHaveLength(0);
    }
    let sequence = 2;
    for (const [schoolId, school] of Object.entries(
      m1Config.progression!.schools,
    ))
      for (const branchId of school.basicIds) {
        expect(
          p.switchHero('h', ++sequence, schoolId, branchId),
        ).toBeUndefined();
        const next = p.hero('h')!;
        expect(next.level).toBe(30);
        expect(next.basicId).toBe(branchId);
        expect(next.hp).toBe(next.maxHp);
        expect(next.mana).toBe(next.maxMana);
        expect(next.skillIds).toHaveLength(5);
        for (const skill of next.skillIds!)
          expect(skillRank(next, skill, p.base)).toBe(4);
      }
    expect(w.creeps.size).toBe(3);
  });

  it('switches school and branch in the same world with a clean max build, keeping identity and targets', () => {
    const p = practice(),
      h = p.addSelected('h', 'Thử nhiều phái', 'ngu_doc', 'ngu_doc_ta_hiep'),
      w = p.arena.world;
    const dogs = [...w.creeps.values()].map((d) => [d.id, d.x, d.y]);
    h.x = 520;
    h.y = 380;
    h.statuses = [
      {
        kind: 'silence',
        sourceId: 'h',
        abilityId: 'test_silence',
        durationTicks: 1000,
        magnitude: 1,
        until: 1000,
      },
    ];
    p.input('h', 1, { kind: 'move', x: 1, y: 0 });
    expect(p.switchHero('h', 2, 'vo_dang', 'vo_dang_kiem')).toBeUndefined();
    const next = p.hero('h')!;
    expect(next).not.toBe(h);
    expect(next).toMatchObject({
      id: 'h',
      nickname: 'Thử nhiều phái',
      schoolId: 'vo_dang',
      basicId: 'vo_dang_kiem',
      level: 30,
      x: 520,
      y: 380,
      lastSequence: 2,
      invulnerable: true,
      moveX: 0,
      moveY: 0,
    });
    expect(next.statuses).toEqual([]);
    expect(next.hp).toBe(next.maxHp);
    expect(next.mana).toBe(next.maxMana);
    for (const id of next.skillIds!)
      expect(skillRank(next, id, p.base)).toBe(4);
    expect(w.pending).toEqual([]);
    expect([...w.creeps.values()].map((d) => [d.id, d.x, d.y])).toEqual(dogs);
    expect(p.membership.size).toBe(1);
    expect(p.switchHero('h', 2, 'cai_bang', 'cai_bang_bong')).toBeTruthy();
    expect(p.switchHero('h', 3, 'vo_dang', 'cai_bang_bong')).toBeTruthy();
    expect(p.hero('h')).toBe(next);
    expect(p.switchHero('h', 4, 'vo_dang', 'vo_dang_quyen')).toBeUndefined();
    expect(p.hero('h')!.basicId).toBe('vo_dang_quyen');
  });

  it('normal targets still die and are not granted training privileges', () => {
    const c = structuredClone(m1Config);
    c.creepSpawns = [{ x: 500, y: 300 }];
    const w = createWorld(c, 42),
      h = addHero(w, 'h', 'Thường', c),
      target = [...w.creeps.values()][0]!;
    hurt(w, target, h.id, 'normal', target.maxHp * 100, c, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(target.hp).toBe(0);
    expect(w.events.some((e) => e.kind === 'death')).toBe(true);
  });
  it('supports all fourteen legal branches at level30 with five maxed skills', () => {
    const original = JSON.stringify(m1Config);
    for (const [schoolId, s] of Object.entries(m1Config.progression!.schools))
      for (const branchId of s.basicIds) {
        const p = practice(),
          h = p.addSelected('h', 'Thử phái', schoolId, branchId);
        expect(h.level).toBe(30);
        expect(h.basicId).toBe(branchId);
        expect(h.skillIds).toHaveLength(5);
        for (const id of h.skillIds!) expect(skillRank(h, id, p.base)).toBe(4);
        for (let slot = 0; slot < 5; slot++)
          expect(
            equippedAbility(h, slot, p.base)!.manaCost,
          ).toBeLessThanOrEqual(h.maxMana);
        expect(h.invulnerable).toBe(true);
        expect(h.inventory).toBeUndefined();
      }
    expect(JSON.stringify(m1Config)).toBe(original);
  });
  it('has exactly three stationary nonattacking dogs and no invasion, hazards or rewards', () => {
    const p = practice(),
      h = p.addSelected('h', 'Thử', 'cai_bang', 'cai_bang_chuong'),
      w = p.arena.world;
    const before = [...w.creeps.values()].map((c) => [c.id, c.x, c.y]);
    const events = [];
    for (let i = 0; i < 600; i++) {
      p.step();
      events.push(...w.events);
    }
    expect(w.creeps.size).toBe(3);
    expect([...w.creeps.values()].map((c) => [c.id, c.x, c.y])).toEqual(before);
    expect(events.some((e) => e.kind === 'attack')).toBe(false);
    expect(p.invasion).toBeUndefined();
    expect(w.creepCombat).toBeUndefined();
    expect(w.statue).toBeUndefined();
    expect(h.hp).toBe(h.maxHp);
    expect(h.gold).toBe(0);
  });
  it('casts twice with depleted mana and long cooldowns reset by the sandbox, while animation cadence remains real', () => {
    const p = practice(),
      h = p.addSelected('h', 'Thử', 'cai_bang', 'cai_bang_chuong'),
      w = p.arena.world;
    const casts = [];
    let sequence = 1;
    for (let turn = 0; turn < 2; turn++) {
      h.mana = 0;
      h.skillCooldowns.fill(w.tick + 100000);
      h.abilityCooldowns = { [h.skillIds![0]!]: w.tick + 100000 };
      p.input(h.id, sequence++, { kind: 'cast', slot: 0 });
      for (let i = 0; i < 60; i++) {
        p.step();
        casts.push(
          ...w.events.filter(
            (e) => e.kind === 'cast' && e.abilityId === h.skillIds![0],
          ),
        );
        expect(h.mana).toBe(h.maxMana);
        expect(h.skillCooldowns.every((c) => c === 0)).toBe(true);
      }
    }
    expect(casts).toHaveLength(2);
    expect([...w.creeps.values()].every((c) => c.hp === c.maxHp)).toBe(true);
  });
  it('permits real repeated hits and statuses but never dummy deaths or XP', () => {
    const p = practice(),
      h = p.addSelected('h', 'Thử', 'thieu_lam', 'thieu_lam_quyen'),
      w = p.arena.world;
    const xp = h.xp,
      dog = [...w.creeps.values()][0]!;
    for (let i = 0; i < 12; i++)
      expect(
        hurt(w, dog, h.id, 'hit', dog.maxHp * 100, p.base, {
          critChance: 0,
          critMultiplier: 1,
        }),
      ).toBe(true);
    expect(w.events.filter((e) => e.kind === 'hit')).toHaveLength(12);
    expect(w.events.some((e) => e.kind === 'death')).toBe(false);
    expect(dog.hp).toBe(dog.maxHp);
    expect(h.xp).toBe(xp);
    expect(h.gold).toBe(0);
    hurt(w, h, dog.id, 'enemy', 1e9, p.base, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(h.hp).toBe(h.maxHp);
  });
  it('rejects cross-school choices, second players, loadout bypass and travel', () => {
    const p = practice();
    expect(() =>
      p.addSelected('h', 'Sai', 'vo_dang', 'cai_bang_bong'),
    ).toThrow();
    const h = p.addSelected('h', 'Đúng', 'vo_dang', 'vo_dang_kiem');
    expect(() =>
      p.addSelected('other', 'Khác', 'cai_bang', 'cai_bang_chuong'),
    ).toThrow();
    expect(p.input(h.id, 1, { kind: 'dev-loadout', ids: [] })).toBeTruthy();
    expect(p.canEnterDungeon()).toBe(false);
    expect(p.enterLoiDai()).toBeTruthy();
  });
});
