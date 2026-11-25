import { hurt } from '../packages/game-core/src/combat.js';
import { describe, expect, it } from 'vitest';
import { m1Config, namDeDefinition } from '@volam/game-data';
import {
  addHero,
  createWorld,
  initializeNamDe,
  spawnNamDeIfReady,
  stepWorld,
  beginNamDeCast,
  beginNamDeDarkCast,
  clearNamDe,
  guardNamDeBlade,
  hasStatus,
  NAM_DE_ID,
  namDeDarkSkills,
  submitInput,
  namDeView,
} from '@volam/game-core';
import { inputSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
function setup(count = 1, seed = 42) {
  const c = structuredClone(m1Config);
  c.creepSpawns = [];
  c.critChance = 0;
  const w = createWorld(c, seed);
  initializeNamDe(w, c, structuredClone(namDeDefinition));
  const heroes = Array.from({ length: count }, (_, i) => {
    const h = addHero(w, 'p' + i, 'Peer ' + i, c);
    h.x = 1020 + i * 12;
    h.y = 616;
    h.hp = h.maxHp = 1e6;
    return h;
  });
  w.namDe!.phase = 'rest';
  w.namDe!.spawnAt = 0;
  spawnNamDeIfReady(w, c, 0);
  const b = w.creeps.get(NAM_DE_ID)!;
  b.x = 800;
  b.y = 616;
  w.namDe!.phase = 'idle';
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) stepWorld(w, c);
  };
  const transform = () => {
    hurt(w, b, heroes[0]!.id, 'fixture_hit', 1e9, c, {
      critChance: 0,
      critMultiplier: 1,
    });
    w.namDe!.nextSmallAt = w.namDe!.nextActionAt = 1e9;
    w.namDe!.dark!.nextFist = w.namDe!.dark!.nextBlade = 1e9;
    step(namDeDefinition.dark.transitionTicks);
  };
  return { w, c, b, heroes, step, transform };
}
describe('Nam Đế hắc hóa', () => {
  it('caps an overkill at 40%, transforms once, doubles collision radius and releases phase-one control', () => {
    const a = setup(),
      h = a.heroes[0]!;
    h.x = 760;
    h.y = 616;
    beginNamDeCast(a.w, a.c, 'dai_ly_phong_huyet', h.id);
    a.step(namDeDefinition.pressureDashTicks + 1);
    expect(h.namDeLocked).toBe(true);
    a.transform();
    expect(a.b.hp).toBe(a.b.maxHp * 0.4);
    expect(a.w.namDe!.dark!.shield).toBe(true);
    expect(a.w.namDe!.controls.size).toBe(0);
    expect(h.namDeLocked).toBe(false);
    expect(a.b.stats!.radius).toBe(namDeDefinition.stats.radius * 2);
    expect(beginNamDeCast(a.w, a.c, 'dai_ly_phong_huyet', h.id)).toBe(false);
    expect(beginNamDeCast(a.w, a.c, 'lien_hoan_nhat_duong_chi', h.id)).toBe(
      false,
    );
    const entered = a.w.namDe!.dark!.enteredAt;
    hurt(a.w, a.b, h.id, 'hit', 100, a.c, { critChance: 0, critMultiplier: 1 });
    expect(a.w.namDe!.dark!.enteredAt).toBe(entered);
  });
  it('reduces incoming damage by 75%, applies a refreshing 15% slow and restores normal damage when broken', () => {
    const a = setup(),
      h = a.heroes[0]!;
    a.transform();
    const hp = a.b.hp;
    hurt(a.w, a.b, h.id, 'hit', 160, a.c, { critChance: 0, critMultiplier: 1 });
    expect(hp - a.b.hp).toBe(25);
    expect(h.statuses?.find((s) => s.kind === 'slow')?.magnitude).toBe(0.15);
    hurt(a.w, a.b, h.id, 'hit', 160, a.c, { critChance: 0, critMultiplier: 1 });
    expect(h.statuses?.filter((s) => s.kind === 'slow')).toHaveLength(1);
    a.w.namDe!.dark!.shield = false;
    const before = a.b.hp;
    hurt(a.w, a.b, h.id, 'hit', 160, a.c, { critChance: 0, critMultiplier: 1 });
    expect(before - a.b.hp).toBe(100);
  });
  it.each([42, 1337, 9001])(
    'three actual straight reflected projectiles break the shield once (seed %s)',
    (seed) => {
      const a = setup(1, seed),
        h = a.heroes[0]!;
      a.transform();
      const s = a.w.namDe!.dark!;
      for (let hit = 0; hit < 3; hit++) {
        expect(beginNamDeDarkCast(a.w, namDeDarkSkills.blade, h)).toBe(true);
        let guarded = false;
        for (let tick = 0; tick < 200 && s.reflections === hit; tick++) {
          const blade = s.blades.find((b) => !b.reflected);
          if (
            !guarded &&
            blade &&
            Math.hypot(blade.x - h.x, blade.y - h.y) < 80
          ) {
            expect(
              submitInput(a.w, h.id, h.lastSequence + 1, {
                kind: 'nam-de-guard',
              }),
            ).toBe(true);
            guarded = true;
          }
          a.step();
        }
        expect(guarded).toBe(true);
        expect(s.reflections).toBe(hit + 1);
        expect(s.shield).toBe(hit < 2);
      }
      expect(a.b.hp).toBe(a.b.maxHp * (0.4 - 0.025 * 3));
      expect(h.hp).toBe(h.maxHp);
      expect(
        a.w.events.filter((e) => e.stage === 'ice_shatter').length,
      ).toBeLessThanOrEqual(1);
      expect(namDeView(a.w)?.dark?.reflections).toBe(3);
    },
  );
  it('rejects guard outside phase2, while stunned, and on cooldown; an expired guard cannot reflect', () => {
    const a = setup(),
      h = a.heroes[0]!;
    expect(guardNamDeBlade(a.w, h)).toBe(false);
    a.transform();
    h.statuses = [
      {
        kind: 'stun',
        magnitude: 1,
        durationTicks: 10,
        until: a.w.tick + 10,
        sourceId: NAM_DE_ID,
        abilityId: 'test',
      },
    ];
    expect(guardNamDeBlade(a.w, h)).toBe(false);
    h.statuses = [];
    expect(guardNamDeBlade(a.w, h)).toBe(true);
    expect(guardNamDeBlade(a.w, h)).toBe(false);
    a.step(namDeDefinition.dark.guardTicks + 1);
    beginNamDeDarkCast(a.w, namDeDarkSkills.blade, h);
    a.step(70);
    expect(a.w.namDe!.dark!.reflections).toBe(0);
    expect(h.hp).toBeLessThan(h.maxHp);
  });
  it('a missed straight blade does not turn toward the moving player', () => {
    const a = setup(),
      h = a.heroes[0]!;
    a.transform();
    beginNamDeDarkCast(a.w, namDeDarkSkills.blade, h);
    a.step(namDeDefinition.dark.bladeWarningTicks);
    const blade = a.w.namDe!.dark!.blades[0]!,
      dir = { x: blade.fx, y: blade.fy };
    h.y += 160;
    a.step(50);
    expect(blade.fx).toBe(dir.x);
    expect(blade.fy).toBe(dir.y);
    expect(h.hp).toBe(h.maxHp);
  });
  it('locks a visible fist warning, hits only on impact, stuns once and allows movement/dash evasion', () => {
    const a = setup(3),
      [h, dodger, dasher] = a.heroes;
    a.transform();
    for (const v of a.heroes) {
      v.x = 1020;
      v.y = 616;
    }
    beginNamDeDarkCast(a.w, namDeDarkSkills.fist, h!);
    const fist = a.w.namDe!.dark!.fists[0]!;
    a.step(namDeDefinition.dark.fistWarningTicks - 1);
    expect(h!.hp).toBe(h!.maxHp);
    dodger!.x += 180;
    dasher!.statuses = [
      {
        kind: 'dash_guard',
        magnitude: 1,
        durationTicks: 3,
        until: a.w.tick + 3,
        sourceId: dasher!.id,
        abilityId: 'dash',
      },
    ];
    a.step();
    expect(h!.hp).toBeLessThan(h!.maxHp);
    expect(hasStatus(h!, 'stun', a.w.tick)).toBe(true);
    expect(dodger!.hp).toBe(dodger!.maxHp);
    expect(dasher!.hp).toBe(dasher!.maxHp);
    expect(hasStatus(dasher!, 'stun', a.w.tick)).toBe(false);
    const hp = h!.hp;
    a.step(10);
    expect(h!.hp).toBe(hp);
    expect(fist.resolved).toBe(true);
  });
  it('cleanup removes pending projectiles, impact warnings and guard windows; new initialization resets phase2', () => {
    const a = setup(),
      h = a.heroes[0]!;
    a.transform();
    beginNamDeDarkCast(a.w, namDeDarkSkills.fist, h);
    guardNamDeBlade(a.w, h);
    clearNamDe(a.w);
    expect(a.w.namDe!.dark!.fists).toEqual([]);
    expect(a.w.namDe!.dark!.guards.size).toBe(0);
    initializeNamDe(a.w, a.c, namDeDefinition);
    expect(a.w.namDe!.dark).toBeUndefined();
  });
  it('Z accepts only sequenced intent, never a submitted hit/counter/result', () => {
    const base = {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'nam-de-guard',
    };
    expect(inputSchema.safeParse(base).success).toBe(true);
    for (const extra of [
      { hit: true },
      { reflections: 3 },
      { x: 800 },
      { targetId: NAM_DE_ID },
    ])
      expect(inputSchema.safeParse({ ...base, ...extra }).success).toBe(false);
  });
});

it('fist hit shape matches its authored elliptical warning rather than damaging above the visible rim', () => {
  const a = setup(),
    h = a.heroes[0]!;
  a.transform();
  beginNamDeDarkCast(a.w, namDeDarkSkills.fist, h);
  const target = a.w.namDe!.dark!.fists[0]!;
  h.y = target.y + namDeDefinition.dark.fistRadiusY + a.c.radius + 5;
  a.step(namDeDefinition.dark.fistWarningTicks);
  expect(h.hp).toBe(h.maxHp);
  expect(hasStatus(h, 'stun', a.w.tick)).toBe(false);
});
