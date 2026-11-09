import { describe, expect, it } from 'vitest';
import {
  addHero,
  addCreep,
  createWorld,
  stepWorld,
  submitInput,
  hasStatus,
} from '@volam/game-core';
import type { CombatEvent } from '@volam/game-core';
import { m1Config } from '@volam/game-data';

function setup(skill = 'hoanh_tao_cuoc', seed = 42) {
  const c = structuredClone(m1Config);
  c.collision = [];
  c.creepSpawns = [];
  c.creepRespawn = false;
  c.critChance = 0;
  c.creep.defense = 0;
  const w = createWorld(c, seed),
    h = addHero(w, 'hero', 'hero', c);
  Object.assign(h, {
    x: 500,
    y: 400,
    schoolId: 'thieu_lam',
    basicId: 'thieu_lam_quyen',
    skillIds: [skill, '', '', ''],
    mana: 1000,
    maxMana: 1000,
  });
  const events: CombatEvent[] = [];
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      stepWorld(w, c);
      events.push(...w.events);
    }
  };
  const target = (id: string, x: number, y = 400) => {
    const e = addCreep(w, id, { x, y }, c);
    e.hp = e.maxHp = 10000;
    e.controlled = true;
    return e;
  };
  let sequence = 0;
  const cast = () => {
    submitInput(w, h.id, ++sequence, { kind: 'cast', slot: 0 });
    step();
  };
  const attack = () => {
    submitInput(w, h.id, ++sequence, { kind: 'basic' });
    step();
  };
  return { c, w, h, events, step, target, cast, attack };
}
describe('M3D school gameplay reworks', () => {
  it('Tru Tà retains its rank range increments in fixed builds', () => {
    const ranks = m1Config.progression!.skills['tru_ta']!.ranks;
    expect(
      ranks.map(({ effect }) => effect.mode === 'arc' && effect.range),
    ).toEqual([190, 194, 198, 202]);
  });
  it('Ca Diệp remains in place, pierces ALL path targets, stuns and damages each once', () => {
    const s = setup();
    const targets = [
      s.target('near', 600),
      s.target('middle', 680),
      s.target('far', 750),
    ];
    const outside = s.target('off-lane', 700, 480);
    s.cast();
    expect(s.w.projectiles.size).toBe(0);
    const stunned = new Set<string>();
    for (let i = 0; i < 60; i++) {
      s.step();
      targets.forEach((e) => {
        if (hasStatus(e, 'stun', s.w.tick)) stunned.add(e.id);
      });
    }
    expect(s.h.x).toBe(500);
    expect(s.h.y).toBe(400);
    expect([...stunned].sort()).toEqual(['far', 'middle', 'near']);
    for (const e of targets)
      expect(
        s.events.filter((x) => x.kind === 'hit' && x.targetId === e.id),
      ).toHaveLength(1);
    expect(outside.hp).toBe(10000);
    expect(s.w.projectiles.size).toBe(0);
    expect(s.w.actions).toHaveLength(0);
  });
  it('cancel before foot contact clears delayed mound and recovery without a hit', () => {
    const s = setup();
    s.target('near', 600);
    s.cast();
    s.h.statuses!.push({
      kind: 'stun',
      magnitude: 1,
      durationTicks: 30,
      until: s.w.tick + 30,
      sourceId: 'enemy',
      abilityId: 'test',
    });
    s.step(60);
    expect(s.w.projectiles.size).toBe(0);
    expect(s.events.filter((e) => e.kind === 'hit')).toHaveLength(0);
    expect(s.events.some((e) => e.stage === 'cancel')).toBe(true);
  });
  it('gold tornado pierces once per target and preserves target-specific Phát Động B', () => {
    const s = setup('toan_phong_thoai');
    s.target('a', 600);
    s.target('b', 720);
    s.cast();
    s.step(40);
    expect(s.h.x).toBe(500);
    expect(s.events.filter((e) => e.kind === 'hit')).toHaveLength(2);
    expect(s.w.combos?.map((c) => [c.targetId, c.step]).sort()).toEqual([
      ['a', 1],
      ['b', 1],
    ]);
  });
  it('Sanskrit field hits on first entry only, never standing ticks or re-entry', () => {
    const s = setup('nhu_lai_niet_ban'),
      e = s.target('entrant', 850);
    s.cast();
    s.step(16);
    expect(s.w.areas).toHaveLength(1);
    expect(e.hp).toBe(10000);
    e.x = 520;
    s.step(4);
    const after = e.hp;
    expect(after).toBeLessThan(10000);
    s.step(10);
    expect(e.hp).toBe(after);
    e.x = 850;
    s.step(2);
    e.x = 520;
    s.step(5);
    expect(e.hp).toBe(after);
    s.h.x = 900;
    s.step();
    expect(s.w.areas![0]!.x).toBe(500);
    s.h.hp = 0;
    s.step();
    expect(s.w.areas).toHaveLength(0);
  });
  it('four fresh A presses produce four actions, one crescent and then exactly 1s cooldown', () => {
    const s = setup();
    for (let i = 0; i < 4; i++) {
      s.attack();
      if (i < 3) s.step(5);
    }
    expect(
      s.events.filter((e) => e.kind === 'attack').map((e) => e.stage),
    ).toEqual(['left_fist', 'right_fist', 'front_kick', 'roundhouse_kick']);
    expect(s.w.projectiles.size).toBe(1);
    expect(s.h.cooldown - s.w.tick).toBe(30);
    s.attack();
    expect(s.events.filter((e) => e.kind === 'attack')).toHaveLength(4);
    s.step(29);
    s.attack();
    expect(s.events.filter((e) => e.kind === 'attack')).toHaveLength(5);
  });
  it('idle >2s starts 1s recovery from the timeout instant, not the first A', () => {
    const s = setup();
    s.attack();
    s.step(59);
    expect(s.h.basicChains?.thieu_lam_quyen).toBe(1);
    s.step();
    expect(s.h.cooldown - s.w.tick).toBe(30);
    s.attack();
    expect(s.events.filter((e) => e.kind === 'attack')).toHaveLength(1);
    s.step(29);
    s.attack();
    expect(s.events.filter((e) => e.kind === 'attack').at(-1)?.stage).toBe(
      'left_fist',
    );
  });
  it('Vô Ảnh without Phát Động has three staggered parallel lanes', () => {
    const s = setup('vo_anh_cuoc');
    s.cast();
    expect(
      s.w.shots.map((p) => ({ at: p.tick, y: p.y, dx: p.dx, dy: p.dy })),
    ).toEqual([
      { at: 4, y: 400, dx: 1, dy: 0 },
      { at: 7, y: 418, dx: 1, dy: 0 },
    ]);
    const shot = s.w.projectiles.values().next().value!;
    expect(shot.y).toBe(382);
    expect(shot.effect.range).toBe(260);
    s.step(38);
    expect(s.w.shots).toHaveLength(0);
  });
  it('Sư Tử Hống is radial damage plus armor reduction/slow; Tru Tà stays attached melee', () => {
    const s = setup('tam_gioi_quy_thien'),
      behind = s.target('behind', 350);
    s.cast();
    s.step(6);
    expect(behind.hp).toBeLessThan(10000);
    expect(hasStatus(behind, 'defense_break', s.w.tick)).toBe(true);
    expect(hasStatus(behind, 'slow', s.w.tick)).toBe(true);
    const t = setup('tru_ta');
    const e = t.target('ahead', 670);
    t.cast();
    expect(e.hp).toBeLessThan(10000);
    expect(t.w.projectiles.size).toBe(0);
  });
  it.each([17, 42, 113])(
    'Tru Tà reaches the new edge and retains its arc and cleave (seed %i)',
    (seed) => {
      const s = setup('tru_ta', seed);
      const inside = 189 + s.c.creep.radius;
      const primary = s.target('edge', s.h.x + inside);
      const secondary = s.target(
        'flank',
        s.h.x + inside * Math.cos(Math.PI / 4),
        s.h.y + inside * Math.sin(Math.PI / 4),
      );
      const outside = s.target('outside', s.h.x + 191 + s.c.creep.radius);
      const rear = s.target('rear', s.h.x - 50);
      s.cast();
      const hits = s.events.filter(
        (e) => e.kind === 'hit' && e.abilityId === 'tru_ta',
      );
      expect(hits.map((e) => e.targetId)).toEqual([primary.id, secondary.id]);
      expect(hits[1]!.damage).toBeLessThan(hits[0]!.damage);
      expect(hasStatus(primary, 'slow', s.w.tick)).toBe(true);
      expect(hasStatus(secondary, 'slow', s.w.tick)).toBe(true);
      expect(outside.hp).toBe(10000);
      expect(rear.hp).toBe(10000);
      expect(s.w.projectiles.size).toBe(0);
    },
  );
});
