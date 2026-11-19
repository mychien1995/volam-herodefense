import { describe, it, expect } from 'vitest';
import {
  StandaloneLoiDai,
  pvpMapIds,
  skillRank,
  type PvpDefinition,
} from '@volam/game-core';
import { m1Config, creepDungeon, pvpDefinition } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { opponents, opponent } from '../packages/game-core/src/opponents.js';

const fixture = (settings: Partial<PvpDefinition> = {}) => {
  const definition = {
    ...structuredClone(pvpDefinition),
    countdownTicks: 3,
    roundTicks: 20,
    intermissionTicks: 2,
    resultTicks: 3,
    ...settings,
  };
  const p = new StandaloneLoiDai(m1Config, creepDungeon, definition, 123);
  for (const id of ['host', 'a', 'b', 'c']) p.join(id, id);
  for (const id of ['a', 'b', 'c']) p.choose(id, 'cai_bang', 'cai_bang_bong');
  p.assign('host', 'a', 'chinh');
  p.assign('host', 'b', 'ta');
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) p.step();
  };
  const start = () => {
    expect(p.start('host')).toBeUndefined();
    steps(3);
  };
  return { p, steps, start };
};
describe('standalone Lôi Đài authoritative simulation', () => {
  it('raises Doc Co cast frequency by twenty percent without changing warnings or damage (three seeds)', () => {
    const rows = [];
    for (const seed of [11, 42, 193]) {
      const counts = [];
      for (const old of [true, false]) {
        const d = structuredClone(pvpDefinition);
        d.countdownTicks = 1;
        d.roundTicks = 20000;
        if (old) {
          d.hazards.swordInterval = 360;
          d.hazards.lightningInterval = 270;
        }
        const p = new StandaloneLoiDai(m1Config, creepDungeon, d, seed);
        for (const id of ['host', 'a', 'b']) p.join(id, id);
        for (const id of ['a', 'b']) p.choose(id, 'cai_bang', 'cai_bang_bong');
        p.assign('host', 'a', 'chinh');
        p.assign('host', 'b', 'ta');
        p.configure('host', 'kiem_ho', true);
        p.start('host');
        p.step();
        p.hero('a')!.invulnerable = true;
        p.hero('b')!.invulnerable = true;
        const seen = new Set<number>(),
          casts: Array<{ tick: number; kind: string }> = [];
        for (let i = 0; i < 9000; i++) {
          p.step();
          const spawned = p.hazards.filter((h) => !seen.has(h.id));
          for (const h of spawned) {
            seen.add(h.id);
            expect(h.armedAt - p.tick).toBe(d.hazards.warningTicks);
          }
          if (spawned.length)
            casts.push({ tick: p.tick, kind: spawned[0]!.kind });
        }
        for (let i = 1; i < casts.length; i++)
          expect(casts[i]!.tick - casts[i - 1]!.tick).toBe(
            casts[i - 1]!.kind === 'sword'
              ? d.hazards.swordInterval
              : d.hazards.lightningInterval,
          );
        counts.push(casts.length);
      }
      const ratio = counts[1]! / counts[0]!;
      expect(ratio).toBeGreaterThan(1.15);
      expect(ratio).toBeLessThan(1.27);
      rows.push({ seed, old: counts[0], current: counts[1], ratio });
    }
    expect(pvpDefinition.hazards.swordInterval).toBe(300);
    expect(pvpDefinition.hazards.lightningInterval).toBe(225);
    console.log('DOC_CO_CADENCE ' + JSON.stringify(rows));
  });

  it('requires character readiness, host authority and nonempty teams', () => {
    const { p } = fixture();
    expect(p.assign('host', 'host', 'chinh')).toContain('chưa chọn');
    expect(p.assign('a', 'c', 'chinh')).toContain('Chỉ chủ');
    expect(p.start('a')).toContain('Chỉ chủ');
    p.assign('host', 'b', 'spectator');
    expect(p.start('host')).toContain('ít nhất');
  });
  it('caps the room at eight including spectators, and each team at four', () => {
    const { p } = fixture();
    for (let i = 0; i < 4; i++)
      expect(p.join('extra' + i, 'Khách')).toBeUndefined();
    expect(p.join('ninth', 'Khách')).toContain('đầy');
    for (const id of ['c', 'extra0', 'extra1', 'extra2'])
      p.choose(id, 'cai_bang', 'cai_bang_bong');
    for (const id of ['c', 'extra0', 'extra1'])
      expect(p.assign('host', id, 'chinh')).toBeUndefined();
    expect(p.assign('host', 'extra2', 'chinh')).toContain('4 người');
  });
  it('allows uneven teams and late spectators but locks the series lineup', () => {
    const { p, start } = fixture();
    p.assign('host', 'c', 'chinh');
    start();
    expect(p.snapshot().alive).toEqual({ chinh: 2, ta: 1 });
    expect(p.join('late', 'Khách mới')).toBeUndefined();
    expect(p.members.get('late')?.team).toBe('spectator');
    expect(p.choose('late', 'vo_dang', 'vo_dang_kiem')).toContain('Chỉ đổi');
    expect(p.assign('host', 'late', 'ta')).toContain('khóa');
    expect(p.configure('host', 'rung_truc', false)).toContain('Chỉ đổi');
  });
  it('locks movement/attacks during 1→2→3 then accepts real combat inputs', () => {
    const { p, steps } = fixture();
    p.start('host');
    const x = p.hero('a')!.x;
    expect(p.input('a', 1, { kind: 'move', x: 1, y: 0 })).toContain('khóa');
    expect(p.input('a', 2, { kind: 'cast', slot: 0 })).toContain('khóa');
    steps(2);
    expect(p.hero('a')!.x).toBe(x);
    steps(1);
    expect(p.phase).toBe('fighting');
    expect(p.input('a', 3, { kind: 'move', x: 1, y: 0 })).toBeUndefined();
    steps(1);
    expect(p.hero('a')!.x).toBeGreaterThan(x);
  });
  it('starts every supported branch at 30 with all five skills at their actual max ranks', () => {
    for (const branchId of Object.keys(m1Config.progression!.fixedBranches!)) {
      const schoolId = Object.entries(m1Config.progression!.schools).find(
        ([, s]) => s.basicIds.includes(branchId),
      )![0];
      const { p } = fixture();
      expect(p.choose('a', schoolId, branchId)).toBeUndefined();
      p.start('host');
      const h = p.hero('a')!;
      expect(h.level).toBe(30);
      expect(h.skillIds).toHaveLength(5);
      for (const id of h.skillIds!)
        expect(skillRank(h, id, p.arena.config)).toBe(
          m1Config.progression!.skills[id]!.ranks.length,
        );
      expect(h.inventory).toBeUndefined();
      expect(h.dragonBonus).toBeUndefined();
      expect(h.skillPoints).toBe(0);
      expect(h.hp).toBe(h.maxHp);
      expect(h.mana).toBe(h.maxMana);
    }
  });
  it('filters friendly heroes and their summons from target selection and damage', () => {
    const { p, start } = fixture();
    p.assign('host', 'c', 'chinh');
    start();
    const w = p.arena.world,
      h = p.hero('c')!,
      before = h.hp;
    expect([...opponents(w, 'a')].map((x) => x.id)).toEqual(['b']);
    expect(opponent(w, 'a', 'c')).toBeUndefined();
    expect(hurt(w, h, 'a', 'test', 10000, p.arena.config)).toBe(false);
    expect(h.hp).toBe(before);
  });
  it('records a real manual attack kill, and does not respawn the defeated player within the hiệp', () => {
    const { p, start, steps } = fixture();
    p.assign('host', 'c', 'ta');
    start();
    const a = p.hero('a')!,
      b = p.hero('b')!;
    a.x = 400;
    a.y = 250;
    a.fx = 1;
    a.fy = 0;
    b.x = 445;
    b.y = 250;
    b.hp = 1;
    p.input('a', 1, { kind: 'basic' });
    steps(1);
    expect(b.hp).toBe(0);
    expect(p.phase).toBe('fighting');
    expect(p.history.at(-1)).toMatchObject({
      sourceId: 'a',
      targetId: 'b',
      environment: false,
    });
    expect(p.input('b', 2, { kind: 'cast', slot: 0 })).toContain('quan chiến');
    steps(3);
    expect(b.hp).toBe(0);
  });
  it('reaches 3 wins then returns everyone to team assignment', () => {
    const { p, start, steps } = fixture();
    start();
    for (let i = 0; i < 3; i++) {
      p.hero('b')!.hp = 0;
      steps(1);
      expect(p.score.chinh).toBe(i + 1);
      if (i < 2) {
        expect(p.phase).toBe('intermission');
        steps(5);
        expect(p.phase).toBe('fighting');
      }
    }
    expect(p.phase).toBe('series_over');
    steps(3);
    expect(p.phase).toBe('lobby');
    expect(p.members.size).toBe(4);
    expect(p.hero('a')).toBeUndefined();
  });
  it('draws simultaneous elimination without a point, then resets resources and effects', () => {
    const { p, start, steps } = fixture();
    start();
    p.hero('a')!.hp = 0;
    p.hero('b')!.hp = 0;
    steps(1);
    expect(p.result?.winner).toBe('draw');
    expect(p.score).toEqual({ chinh: 0, ta: 0 });
    steps(5);
    expect(p.phase).toBe('fighting');
    expect(p.hero('a')!.hp).toBe(p.hero('a')!.maxHp);
    expect(p.arena.world.projectiles.size).toBe(0);
  });
  it('draws at the exact deadline, replays, and never counts draws toward best-of-five', () => {
    const { p, start, steps } = fixture({ roundTicks: 4 });
    start();
    steps(4);
    expect(p.result).toEqual({ winner: 'draw', reason: 'timeout' });
    expect(p.score).toEqual({ chinh: 0, ta: 0 });
    for (let i = 0; i < 7; i++) steps(9);
    expect(p.score).toEqual({ chinh: 0, ta: 0 });
    expect(p.phase).not.toBe('series_over');
  });
  it('forfeits the entire series on a fighter disconnect, even when teammates remain', () => {
    const { p, start } = fixture();
    p.assign('host', 'c', 'chinh');
    start();
    p.remove('a');
    expect(p.phase).toBe('series_over');
    expect(p.score.ta).toBe(3);
    expect(p.result).toEqual({ winner: 'ta', reason: 'disconnect' });
  });
  it('does not forfeit for spectator departure, and closes on host departure', () => {
    const { p, start } = fixture();
    p.join('watch', 'Khách');
    start();
    p.remove('watch');
    expect(p.phase).toBe('fighting');
    p.remove('host');
    expect(p.closed).toBe(true);
  });
  it('clears combat channels at series end and preserves input replay protection into the next series', () => {
    const { p, start, steps } = fixture();
    start();
    p.input('a', 50, { kind: 'move', x: 0, y: 0 });
    p.arena.world.supports = [];
    p.remove('b');
    steps(3);
    expect(p.phase).toBe('lobby');
    expect(p.arena.world.supports).toBeUndefined();
    p.join('d', 'Người mới');
    p.choose('d', 'cai_bang', 'cai_bang_bong');
    p.assign('host', 'd', 'ta');
    p.start('host');
    steps(3);
    expect(p.hero('a')!.lastSequence).toBe(50);
    const x = p.hero('a')!.x;
    p.input('a', 49, { kind: 'move', x: 1, y: 0 });
    steps(1);
    expect(p.hero('a')!.x).toBe(x);
  });
  it('enforces replay protection for room commands', () => {
    const { p } = fixture();
    expect(p.acceptSequence('host', 3)).toBe(true);
    expect(p.acceptSequence('host', 3)).toBe(false);
    expect(p.acceptSequence('host', 2)).toBe(false);
  });
  it('supports all map choices with deterministic walls and valid full-size geometry', () => {
    for (const id of pvpMapIds) {
      const { p, start } = fixture();
      p.configure('host', id, false);
      start();
      expect(p.arena.config.width).toBe(pvpDefinition.maps[id].width);
      expect(p.arena.config.collision.length).toBeGreaterThan(0);
      expect(p.invasion).toBeUndefined();
      expect(p.arena.world.creeps.size).toBe(0);
    }
  });
  it('turns hazards fully off, including lava damage and shrinking', () => {
    const { p, start, steps } = fixture({ roundTicks: 100 });
    p.configure('host', 'dia_nguc', false);
    start();
    const h = p.hero('a')!;
    h.x = 50;
    h.y = 50;
    const hp = h.hp,
      safe = p.snapshot().safe;
    steps(40);
    expect(h.hp).toBe(hp);
    expect(p.hazards).toEqual([]);
    expect(p.snapshot().safe).toEqual(safe);
  });
  it('attributes lava kills to environment and keeps only the newest 30 entries across draws', () => {
    const { p, start, steps } = fixture({ roundTicks: 100 });
    p.configure('host', 'dia_nguc', true);
    start();
    for (let n = 0; n < 17; n++) {
      for (const id of ['a', 'b']) {
        const h = p.hero(id)!;
        h.x = 45;
        h.y = 45;
        h.hp = 1;
      }
      steps(1);
      expect(p.result?.winner).toBe('draw');
      if (n < 16) steps(5);
    }
    expect(p.history).toHaveLength(30);
    expect(p.history[0]!.id).toBe(5);
    expect(p.history.at(-1)).toMatchObject({
      killer: 'Môi trường',
      environment: true,
    });
    expect(p.score).toEqual({ chinh: 0, ta: 0 });
  });
  it('emits reproducible non-homing darts and warned sword/lightning hazards', () => {
    const a = fixture({ roundTicks: 1000 }),
      b = fixture({ roundTicks: 1000 });
    for (const f of [a, b]) {
      f.p.configure('host', 'rung_truc', true);
      f.start();
      f.steps(75);
    }
    expect(a.p.hazards).toEqual(b.p.hazards);
    expect(a.p.hazards[0]?.kind).toBe('dart');
    const dart = { ...a.p.hazards[0]! };
    a.p.hero('a')!.x += 60;
    a.steps(1);
    expect(a.p.hazards[0]?.vx).toBe(dart.vx);
    expect(a.p.hazards[0]?.vy).toBe(dart.vy);
    const f = fixture({ roundTicks: 1000 });
    f.p.configure('host', 'kiem_ho', true);
    f.start();
    const warned = new Set<string>();
    for (let i = 0; i < 550; i++) {
      f.steps(1);
      for (const h of f.p.hazards) if (h.armedAt > f.p.tick) warned.add(h.kind);
    }
    expect([...warned].sort()).toEqual(['lightning', 'sword']);
  });
});
