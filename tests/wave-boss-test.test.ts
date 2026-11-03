import { describe, it, expect } from 'vitest';
import {
  DungeonMatch,
  addCreep,
  submitInput,
  stepWorld,
  type WaveBossTestOptions,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  tayDocDefinition,
  namDeDefinition,
  bacCaiDefinition,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { serverWaveBossTestOptions } from '../apps/game-server/src/wave-boss-test-config.js';
import {
  joinOptionsSchema,
  inputSchema,
  PROTOCOL_VERSION,
} from '@volam/game-protocol';
const options: WaveBossTestOptions = {
  bossHitFraction: 0.05,
  runSpeedMultiplier: 3,
  firstRestTicks: 3,
  restTicks: 5,
};
function setup(enabled = true) {
  const c = { ...structuredClone(m1Config), creepSpawns: [], critChance: 0 };
  const m = new DungeonMatch(
    c,
    creepDungeon,
    42,
    createInvasionDefinition(180, 1e6),
    [],
    {
      ...structuredClone(dongTaDefinition),
      entryTicks: 3,
      openingTicks: 10000,
    },
    structuredClone(tayDocDefinition),
    structuredClone(namDeDefinition),
    structuredClone(bacCaiDefinition),
    enabled ? options : undefined,
  );
  const h = m.add('p', 'P'),
    w = m.arena.world;
  h.hp = h.maxHp = 10000;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) m.step();
  };
  return { m, c, w, h, step };
}
describe('server-only wave boss sandbox', () => {
  it('applies god mode to a hero entering another zone, without enabling it in a normal match', () => {
    const { m, h } = setup();
    expect(m.enter(h.id, 'private')).toBeUndefined();
    const zone = m.zoneOf(h.id)!;
    expect(zone.world.waveBossTest).toBe(m.arena.world.waveBossTest);
    expect(hurt(zone.world, h, 'creep', 'test', 1e9, zone.config)).toBe(false);
    expect(h.hp).toBe(h.maxHp);
    const normal = setup(false);
    normal.m.enter(normal.h.id, 'private');
    expect(normal.m.zoneOf(normal.h.id)!.world.waveBossTest).toBeUndefined();
  });
  it('only exact env=1 in non-production enables it; payloads cannot enable cheats', () => {
    expect(serverWaveBossTestOptions(30, {})).toBeUndefined();
    expect(
      serverWaveBossTestOptions(30, { VOLAM_DEV_WAVE_BOSSES: 'true' }),
    ).toBeUndefined();
    expect(
      serverWaveBossTestOptions(30, {
        NODE_ENV: 'production',
        VOLAM_DEV_WAVE_BOSSES: '1',
      }),
    ).toBeUndefined();
    expect(
      serverWaveBossTestOptions(30, {
        NODE_ENV: 'development',
        VOLAM_DEV_WAVE_BOSSES: '1',
      }),
    ).toEqual({
      bossHitFraction: 0.05,
      runSpeedMultiplier: 3,
      firstRestTicks: 90,
      restTicks: 150,
    });
    expect(
      joinOptionsSchema.safeParse({
        nickname: 'Test',
        protocolVersion: PROTOCOL_VERSION,
        VOLAM_DEV_WAVE_BOSSES: '1',
      }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        kind: 'basic',
        bossHitFraction: 0.05,
      }).success,
    ).toBe(false);
  });
  it('god mode prevents ordinary, periodic, unavoidable direct HP loss before death/status cleanup', () => {
    const { w, c, h } = setup();
    const hp = h.hp;
    for (const snapshot of [
      undefined,
      { critChance: 1, critMultiplier: 10, periodic: true },
      {
        critChance: 0,
        critMultiplier: 1,
        directHp: true,
        unavoidableHpLoss: true,
      },
    ])
      expect(hurt(w, h, 'boss', 'test', 1e9, c, snapshot)).toBe(false);
    expect(h.hp).toBe(hp);
    expect(
      w.events.filter(
        (e) => e.targetId === h.id && (e.kind === 'hit' || e.kind === 'death'),
      ),
    ).toHaveLength(0);
    const normal = setup(false);
    expect(hurt(normal.w, normal.h, 'boss', 'test', 10, normal.c)).toBe(true);
    expect(normal.h.hp).toBeLessThan(normal.h.maxHp);
  });
  it('accepted manual A hits remove exactly5% boss max HP despite defense/crit; minions and invulnerable phases retain rules', () => {
    const { w, c, h } = setup();
    const b = addCreep(w, 'dummy', { x: h.x + 35, y: h.y }, c);
    b.controlled = true;
    b.archetypeId = 'tay_doc';
    b.hp = b.maxHp = 1003;
    b.stats = { ...c.creep, defense: 1e6, hp: 1003 };
    h.fx = 1;
    h.fy = 0;
    h.basicId = Object.keys(c.basics).find(
      (k) => c.basics[k]!.effect.mode === 'arc',
    )!;
    submitInput(w, h.id, 1, { kind: 'basic' });
    for (let i = 0; i < 60 && b.hp === b.maxHp; i++) stepWorld(w, c);
    expect(b.hp).toBeCloseTo(1003 * 0.95, 8);
    b.invulnerable = true;
    expect(hurt(w, b, h.id, 'a', 1e9, c)).toBe(false);
    expect(b.hp).toBeCloseTo(1003 * 0.95, 8);
    b.invulnerable = false;
    for (let i = 1; i < 20; i++)
      hurt(w, b, h.id, 'a', 1, c, { critChance: 1, critMultiplier: 100 });
    expect(b.hp).toBe(0);
    const minion = addCreep(w, 'minion', { x: 900, y: 900 }, c);
    minion.hp = minion.maxHp = 1000;
    minion.stats = { ...c.creep, defense: 0 };
    hurt(w, minion, h.id, 'a', 10, c, { critChance: 0, critMultiplier: 1 });
    expect(minion.hp).toBe(990);
  });
  it('arrow movement is3x base speed; production definitions and non-test cadence stay unchanged', () => {
    const run = (enabled: boolean) => {
      const { m, h, w } = setup(enabled);
      h.x = 800;
      h.y = 900;
      submitInput(w, h.id, 1, { kind: 'move', x: 1, y: 0 });
      m.step();
      return h.x - 800;
    };
    expect(run(true)).toBeCloseTo(run(false) * 3, 8);
    const m = setup(false).m;
    m.step();
    expect(m.arena.world.waveBossTest).toBeUndefined();
    expect(m.invasion!.wave).toBe(0);
    expect(m.invasion!.nextWaveTick).toBe(5400);
    expect(dongTaDefinition.restTicks).toBe(300);
    expect(bacCaiDefinition.restMs).toBe(10000);
  });
  it('real A kills progress all four encounters with rest and stop at Bac Cai, with no ordinary creep waves', () => {
    const { m, w, h, step } = setup();
    const stages: string[] = [];
    const awaitActive = (id: string) => {
      for (let i = 0; i < 1600; i++) {
        step();
        const b = w.creeps.get(id);
        if (
          b &&
          b.hp > 0 &&
          !b.invulnerable &&
          id !== 'boss_nam_de' &&
          id !== 'bac_cai'
        )
          return b;
        if (
          b &&
          b.hp > 0 &&
          !b.invulnerable &&
          (id === 'boss_nam_de'
            ? w.namDe!.phase !== 'enter'
            : w.bacCai!.phase !== 'entering')
        )
          return b;
      }
      throw Error('Boss did not enter: ' + id);
    };
    for (const id of ['dong_ta', 'tay_doc_boss', 'boss_nam_de', 'bac_cai']) {
      const b = awaitActive(id);
      stages.push(w.waveBossTest!.stage);
      const before = b.hp;
      for (let attack = 0; attack < 100 && b.hp > 0; attack++) {
        h.x = b.x - 35;
        h.y = b.y;
        h.fx = 1;
        h.fy = 0;
        h.moveX = h.moveY = 0;
        h.statuses = [];
        h.namDeLocked = false;
        h.cooldown = 0;
        h.actionUntil = w.tick;
        expect(
          m.input(h.id, h.lastSequence + 1, { kind: 'basic' }),
        ).toBeUndefined();
        step(20);
      }
      expect(b.hp, 'boss ' + id + ' before ' + before).toBe(0);
      expect(h.hp).toBe(h.maxHp);
      const clock = w.tick;
      step(2);
      expect(w.tick).toBe(clock + 2);
      expect([...w.creeps.values()].some((c) => c.invasion)).toBe(false);
    }
    expect(stages).toEqual(['dong_ta', 'tay_doc', 'nam_de', 'bac_cai']);
    step(1000);
    expect(w.waveBossTest!.stage).toBe('complete');
    expect(m.invasion!.wave).toBe(20);
    expect(m.mainBosses!.defeatedBosses).toEqual([
      'dong_ta',
      'tay_doc',
      'nam_de',
      'bac_cai',
    ]);
    expect(w.statue!.hp).toBe(w.statue!.maxHp);
  });
});
