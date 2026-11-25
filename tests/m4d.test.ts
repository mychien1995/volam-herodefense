import { describe, expect, it } from 'vitest';
import {
  addHero,
  addCreep,
  createWorld,
  emptyInventory,
  InvasionDirector,
  DungeonMatch,
  initializeProgression,
  refreshCharacter,
  transactMerchant,
  stepWorld,
  submitInput,
} from '@volam/game-core';
import {
  arenaVariants,
  campaignDefinition,
  creepCombatDefinition,
  coMoDungeon,
  creepDungeon,
  createInvasionDefinition,
  m1Config,
} from '@volam/game-data';
import {
  inputSchema,
  joinOptionsSchema,
  PROTOCOL_VERSION,
} from '@volam/game-protocol';
import { hurt } from '../packages/game-core/src/combat.js';
import { applyStatus } from '../packages/game-core/src/status.js';
import { dashCapacity } from '../packages/game-core/src/mobility.js';
import { findWalkPath } from '../packages/game-core/src/dungeon-navigation.js';
import { nativeCreepPose } from '../apps/game-client/src/creep-body-policy.js';
import {
  resetQuicksand,
  inQuicksand,
} from '../packages/game-core/src/creep-abilities.js';
import { blocked } from '../packages/game-core/src/geometry.js';
import { serverInvasionDefinition } from '../apps/game-server/src/invasion-config.js';
const hit = { critChance: 0, critMultiplier: 1, directHp: true };
function fixture() {
  const c = { ...structuredClone(m1Config), creepSpawns: [], collision: [] };
  const w = createWorld(c, 42),
    h = addHero(w, 'p', 'Player', c);
  h.inventory = emptyInventory();
  refreshCharacter(h, c);
  h.hp = 500;
  h.maxHp = 1000;
  return { c, w, h };
}
describe('M4D approved changes', () => {
  it('production starts waves every 120 seconds and streams two rows', () => {
    const d = serverInvasionDefinition({ NODE_ENV: 'production' }, 4);
    expect(d.intervalTicks).toBe(3600);
    expect(d.rowsPerGate).toBe(2);
    expect(d.warningTicks).toEqual([1800, 450]);
    expect(d.streamTicks).toBe(1800);
    expect(campaignDefinition.chapterSeconds).toBe(600);
  });
  for (const players of [1, 2, 6])
    for (const gates of [2, 3, 4] as const)
      it(`doubles ${gates}-gate P${players} count, separates rows and preserves reward budgets`, () => {
        const c = {
          ...structuredClone(m1Config),
          campaign: structuredClone(campaignDefinition),
          creepSpawns: [],
        };
        const run = (rowsPerGate: 1 | 2) => {
          const w = createWorld(c, 123),
            d = createInvasionDefinition(120, 2000, {
              portalCount: gates,
              rowsPerGate,
            });
          const director = new InvasionDirector(d, w);
          for (
            let t = d.intervalTicks;
            t <= d.intervalTicks + d.streamTicks!;
            t++
          )
            director.beforeStep(w, c, t, players);
          const all = [...w.creeps.values()];
          return {
            all,
            xp: all.reduce((n, e) => n + e.stats!.xp, 0),
            gold: all.reduce((n, e) => n + e.stats!.gold, 0),
          };
        };
        const one = run(1),
          two = run(2);
        expect(two.all).toHaveLength(one.all.length * 2);
        expect(two.xp).toBeCloseTo(one.xp, 8);
        expect(two.gold).toBeCloseTo(one.gold, 8);
        expect(Math.abs(two.all[0]!.y - two.all[1]!.y)).toBe(36);
      });
  it('automatically cleanses stun and ordinary debuffs, preserves scripted locks and cooldown', () => {
    const { c, w, h } = fixture();
    h.inventory!.crafted = { boots: 'cleanse' };
    applyStatus(
      h,
      {
        kind: 'dash_lock',
        durationTicks: 1000,
        magnitude: 1,
        blocksMovementSkills: true,
      },
      'boss',
      'scripted',
      0,
    );
    applyStatus(
      h,
      { kind: 'stun', durationTicks: 30, magnitude: 1 },
      'enemy',
      'stun',
      0,
    );
    expect(h.statuses!.map((s) => s.kind)).toEqual(['dash_lock']);
    expect(h.inventory!.auxiliaryReadyAt).toBe(30 * c.tickRate);
    applyStatus(
      h,
      { kind: 'poison', durationTicks: 30, magnitude: 1 },
      'enemy',
      'poison',
      1,
    );
    expect(h.statuses!.some((s) => s.kind === 'poison')).toBe(true);
    w.tick = h.inventory!.auxiliaryReadyAt!;
    applyStatus(
      h,
      { kind: 'stun', durationTicks: 30, magnitude: 1 },
      'enemy',
      'stun',
      w.tick,
    );
    expect(h.statuses!.some((s) => s.kind === 'stun')).toBe(false);
  });
  it('adds two dash capacity on top of Đường Môn without changing recharge debt', () => {
    const { c, h } = fixture();
    h.inventory!.crafted = { boots: 'haste' };
    expect(dashCapacity(h, c)).toBe(4);
    h.basicId = 'duong_mon_am_khi';
    h.dashCharges = 1;
    h.dashRechargeAt = 123;
    expect(dashCapacity(h, c)).toBe(6);
    expect(h.dashRechargeAt).toBe(123);
  });
  it('Phùng Xuân uses actual >5% HP loss, 10% RNG, 30s successful cooldown and cannot resurrect', () => {
    const { c, w, h } = fixture();
    h.inventory!.crafted = { boots: 'spring' };
    w.random = () => 0;
    hurt(w, h, 'enemy', 'hit', 50, c, hit);
    expect(h.hp).toBe(450);
    expect(h.inventory!.auxiliaryReadyAt).toBeUndefined();
    hurt(w, h, 'enemy', 'hit', 51, c, hit);
    expect(h.hp).toBe(499);
    expect(h.inventory!.auxiliaryReadyAt).toBe(900);
    hurt(w, h, 'enemy', 'hit', 51, c, hit);
    expect(h.hp).toBe(448);
    w.tick = 900;
    w.random = () => 0.1;
    hurt(w, h, 'enemy', 'hit', 51, c, hit);
    expect(h.hp).toBe(397);
    expect(h.inventory!.auxiliaryReadyAt).toBe(900);
    w.random = () => 0;
    hurt(w, h, 'enemy', 'fatal', 1000, c, hit);
    expect(h.hp).toBe(0);
  });
  it('haste crafting grants only the two new slots and preserves outstanding dash debt', () => {
    const { c, w, h } = fixture();
    h.inventory!.levels.boots = 5;
    h.inventory!.materials = { boots: 1 };
    h.gold = 1000;
    h.dashCharges = 1;
    h.dashRechargeAt = 80;
    expect(
      transactMerchant(h, c, { inArena: true, matchTick: 0, worldTick: 0 }, 0, {
        action: 'craft',
        slot: 'boots',
        branch: 'haste',
      }),
    ).toBeUndefined();
    expect(h.dashCharges).toBe(3);
    expect(h.dashRechargeAt).toBe(80);
    for (let i = 0; i < 80; i++) stepWorld(w, c);
    expect(h.dashCharges).toBe(4);
  });
  it('cleanse removes ordinary private DOT clocks and keeps its cooldown across dungeon travel', () => {
    const c = { ...structuredClone(m1Config), creepSpawns: [] };
    const m = new DungeonMatch(c, creepDungeon, 51),
      h = m.add('p', 'P');
    h.inventory = { ...emptyInventory(), crafted: { boots: 'cleanse' } };
    refreshCharacter(h, c);
    h.duelBurn = {
      sourceId: 'enemy',
      abilityId: 'burn',
      damage: 10,
      next: 60,
      until: 300,
    };
    m.step();
    expect(h.duelBurn).toBeUndefined();
    const remaining = h.inventory.auxiliaryReadyAt! - m.arena.world.tick;
    expect(m.enter(h.id, 'private', 'forest')).toBeUndefined();
    const z = m.zoneOf(h.id)!;
    expect(h.inventory.auxiliaryReadyAt! - z.world.tick).toBe(remaining);
    applyStatus(
      h,
      { kind: 'stun', magnitude: 1, durationTicks: 30 },
      'enemy',
      'stun',
      z.world.tick,
    );
    expect(h.statuses!.some((s) => s.kind === 'stun')).toBe(true);
  });
  it('actual straight projectiles cross lotus water while dash movement remains on walkable ground', () => {
    const { c, w, h } = fixture();
    const lotus = {
      ...c,
      collision: arenaVariants.tu_hien_trang.collision,
      combatCollision: [],
    };
    h.x = 1010;
    h.y = 690;
    h.basicId = 'cai_bang_chuong';
    const enemy = addCreep(w, 'outer-bank', { x: 1250, y: 890 }, lotus);
    enemy.controlled = true;
    enemy.hp = enemy.maxHp = 10000;
    submitInput(w, h.id, 1, { kind: 'basic', targetId: enemy.id });
    for (let i = 0; i < 80; i++) stepWorld(w, lotus);
    expect(enemy.hp).toBeLessThan(10000);
    h.moveX = 1;
    h.moveY = 1;
    submitInput(w, h.id, 2, { kind: 'dash' });
    for (let i = 0; i < 15; i++) stepWorld(w, lotus);
    expect(
      blocked(h, lotus.radius, lotus.width, lotus.height, lotus.collision),
    ).toBe(false);
  });
  it('removes Z from network input and validates arena selection', () => {
    expect(
      inputSchema.safeParse({
        kind: 'gear-skill',
        sequence: 1,
        protocolVersion: PROTOCOL_VERSION,
      }).success,
    ).toBe(false);
    expect(
      joinOptionsSchema.parse({
        nickname: 'Player',
        protocolVersion: PROTOCOL_VERSION,
        arenaId: 'tu_hien_trang',
      }).arenaId,
    ).toBe('tu_hien_trang');
    expect(
      joinOptionsSchema.safeParse({
        nickname: 'Player',
        protocolVersion: PROTOCOL_VERSION,
        arenaId: 'unknown',
      }).success,
    ).toBe(false);
  });
  it('lotus water blocks movement while all four bridges and central island stay walkable', () => {
    const walls = arenaVariants.tu_hien_trang.collision;
    const solid = (x: number, y: number) =>
      blocked({ x, y }, 10, 1600, 1152, walls);
    expect(solid(1100, 800)).toBe(true);
    const definition = createInvasionDefinition(120, 2000, { portalCount: 4 });
    const obstacles = [...walls, definition.statue.collision];
    for (const start of [
      { x: 64, y: 576 },
      { x: 1536, y: 576 },
      { x: 800, y: 320 },
      { x: 800, y: 1056 },
    ]) {
      expect(
        findWalkPath(
          start,
          { x: 800, y: 680 },
          m1Config.creep.radius,
          { width: 1600, height: 1152 },
          obstacles,
        ).length,
      ).toBeGreaterThan(0);
    }

    for (const p of [
      [800, 576],
      [800, 250],
      [800, 900],
      [350, 576],
      [1250, 576],
    ])
      expect(solid(p[0]!, p[1]!)).toBe(false);
  });
  it('keeps the renovated source for death as for live creep poses', () => {
    for (const group of ['wave_creeps', 'dungeon_creeps', 'minions'])
      expect(nativeCreepPose(group, 'death')).toBe(true);
    expect(nativeCreepPose('heroes', 'death')).toBe(false);
  });
  it('allows a real Shift input to escape a sand pit', () => {
    const { c, w, h } = fixture();
    const desert = {
      ...c,
      dungeonId: 'desert',
      creepCombat: structuredClone(creepCombatDefinition),
    };
    resetQuicksand(w, desert);
    const pit = w.creepCombat!.effects.get('quicksand_0')!;
    h.x = pit.x;
    h.y = pit.y;
    h.moveX = 1;
    stepWorld(w, desert);
    expect(inQuicksand(w, h)).toBe(true);
    const start = h.x;
    submitInput(w, h.id, 1, { kind: 'dash' });
    for (let i = 0; i < 15; i++) stepWorld(w, desert);
    expect(h.x).toBeGreaterThan(start + 80);
    expect(inQuicksand(w, h)).toBe(false);
    expect(h.dashCharges).toBe(1);
  });
  it('a shared dungeon boss waits for an actual player hit before starting combat', () => {
    const c = {
      ...structuredClone(m1Config),
      creepSpawns: [],
      bossesWaitForHit: true,
    };
    const m = new DungeonMatch(c, creepDungeon, 42, undefined, [coMoDungeon]);
    const h = m.add('p', 'Player');
    initializeProgression(h, c, 'fixed', 'cai_bang_bong');
    expect(m.enter(h.id, 'shared', 'co_mo')).toBeUndefined();
    const zone = m.zoneOf(h.id)!,
      boss = zone.world.creeps.get('boss_ly_mac_sau')!;
    const startHp = h.hp;
    for (let i = 0; i < 300; i++) m.step();
    expect(h.hp).toBe(startHp);
    expect(zone.world.projectiles.size).toBe(0);
    expect(boss.provoked).not.toBe(true);
    h.x = boss.x - 40;
    h.y = boss.y;
    h.fx = 1;
    h.fy = 0;
    expect(
      m.input(h.id, 1, { kind: 'basic', targetId: boss.id }),
    ).toBeUndefined();
    for (let i = 0; i < 60; i++) m.step();
    expect(boss.provoked).toBe(true);
  });
});
