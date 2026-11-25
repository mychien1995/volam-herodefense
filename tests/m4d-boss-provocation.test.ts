import { expect, it } from 'vitest';
import {
  DungeonMatch,
  createWorld,
  addHero,
  stepWorld,
  initializeNamDe,
  spawnNamDeIfReady,
  type SimulationConfig,
  type World,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  coMoDungeon,
  hongLietDungeon,
  chuBaThongDungeon,
  kimLuanDungeon,
  dongTaDefinition,
  tayDocDefinition,
  namDeDefinition,
  bacCaiDefinition,
  vuongDefinition,
} from '@volam/game-data';
import { DongTaEncounter } from '../packages/game-core/src/dong-ta.js';
import { TayDocEncounter } from '../packages/game-core/src/tay-doc.js';
import { BacCaiEncounter } from '../packages/game-core/src/bac-cai.js';
import { VuongEncounter } from '../packages/game-core/src/vuong-trung-duong.js';
import { bossFightReady } from '../packages/game-core/src/boss-provocation.js';
import { hurt } from '../packages/game-core/src/combat.js';
const config = (): SimulationConfig => ({
  ...structuredClone(m1Config),
  creepSpawns: [],
  bossesWaitForHit: true,
});
for (const d of [
  coMoDungeon,
  hongLietDungeon,
  chuBaThongDungeon,
  kimLuanDungeon,
])
  it(`${d.id}: no combat before hit, whole encounter opens on damage, fresh retry waits`, () => {
    const c = config(),
      m = new DungeonMatch(c, creepDungeon, 61, undefined, [d]);
    const a = m.add('a', 'A');
    m.add('b', 'B');
    expect(m.enter(a.id, 'shared', d.id)).toBeUndefined();
    const z = m.zoneOf(a.id)!;
    for (let i = 0; i < 300; i++) {
      m.step();
      expect(z.world.events.some((e) => e.kind === 'hit')).toBe(false);
    }
    expect(bossFightReady(z.world, z.config)).toBe(false);
    const target = [...z.world.creeps.values()].find((e) => e.hp > 0)!;
    hurt(z.world, target, a.id, 'attack', 2, z.config, {
      critChance: 0,
      critMultiplier: 1,
      directHp: true,
    });
    expect(bossFightReady(z.world, z.config)).toBe(true);
    m.restartCampaignBoss(z, target.id);
    expect(bossFightReady(z.world, z.config)).toBe(false);
    for (let i = 0; i < 30; i++) {
      m.step();
      expect(z.world.events.some((e) => e.kind === 'hit')).toBe(false);
    }
  });
const factories: Array<
  [string, (w: World, c: SimulationConfig) => () => void]
> = [
  [
    'dong_ta',
    (w, c) => {
      const e = new DongTaEncounter(structuredClone(dongTaDefinition), {
        recall() {},
        lock() {},
      });
      e.restartCampaign(w, c);
      return () => e.afterStep(w, c);
    },
  ],
  [
    'tay_doc_boss',
    (w, c) => {
      const e = new TayDocEncounter(structuredClone(tayDocDefinition));
      e.spawn(w, c);
      return () => e.step(w, c);
    },
  ],
  [
    'boss_nam_de',
    (w, c) => {
      initializeNamDe(w, c, structuredClone(namDeDefinition));
      w.namDe!.phase = 'rest';
      w.namDe!.spawnAt = 0;
      spawnNamDeIfReady(w, c, 0);
      return () => {};
    },
  ],
  [
    'bac_cai',
    (w, c) => {
      new BacCaiEncounter(structuredClone(bacCaiDefinition)).initialize(w, c);
      return () => {};
    },
  ],
  [
    'vuong_trung_duong',
    (w, c) => {
      new VuongEncounter(structuredClone(vuongDefinition)).initialize(w, c);
      return () => {};
    },
  ],
];
for (const [id, make] of factories)
  it(`${id}: completes entrance but remains harmless until first actual HP loss`, () => {
    const c = config(),
      w = createWorld(c, 73),
      h = addHero(w, 'p', 'P', c);
    h.hp = h.maxHp = 100000;
    const tick = make(w, c);
    for (let i = 0; i < 600; i++) {
      stepWorld(w, c);
      tick();
      expect(w.events.some((e) => e.kind === 'hit')).toBe(false);
    }
    const b = w.creeps.get(id)!;
    expect(b).toBeDefined();
    expect(bossFightReady(w, c)).toBe(false);
    expect(b.pose).not.toBe('walk');
    hurt(w, b, h.id, 'attack', 2, c, {
      critChance: 0,
      critMultiplier: 1,
      directHp: true,
    });
    expect(b.provoked).toBe(true);
    expect(bossFightReady(w, c)).toBe(true);
    let active = false;
    for (let i = 0; i < 600; i++) {
      stepWorld(w, c);
      tick();
      active ||=
        w.events.some(
          (e) =>
            e.sourceId === id &&
            ['hit', 'cast', 'effect', 'pulse'].includes(e.kind),
        ) || w.projectiles.size > 0;
    }
    expect(active).toBe(true);
  });
