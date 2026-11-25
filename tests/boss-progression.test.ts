import { describe, expect, it } from 'vitest';
import {
  DungeonMatch,
  initializeProgression,
  experienceAtLevel,
  pointAccounting,
  addCreep,
  type WaveBossTestStage,
} from '@volam/game-core';
import {
  m1Config,
  campaignDefinition,
  creepDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  tayDocDefinition,
  namDeDefinition,
  bacCaiDefinition,
  vuongDefinition,
  arenaVariants,
} from '@volam/game-data';
import {
  prepareBossProgressionHero,
  bossProgressionPresets,
} from '../apps/game-server/src/boss-progression-mode.js';
import { serverWaveBossTestOptions } from '../apps/game-server/src/wave-boss-test-config.js';
import { hurt } from '../packages/game-core/src/combat.js';

function setup(center?: { x: number; y: number }) {
  const config = {
    ...structuredClone(m1Config),
    campaign: structuredClone(campaignDefinition),
    creepSpawns: [],
  };
  const options = serverWaveBossTestOptions(30, {
    NODE_ENV: 'development',
    VOLAM_DEV_WAVE_BOSSES: '1',
    VOLAM_DEV_BOSS_PROGRESSION: '1',
  })!;
  const match = new DungeonMatch(
    config,
    creepDungeon,
    42,
    createInvasionDefinition(180, 1e6),
    [],
    structuredClone(dongTaDefinition),
    structuredClone(tayDocDefinition),
    structuredClone(namDeDefinition),
    structuredClone(bacCaiDefinition),
    options,
    structuredClone(vuongDefinition),
  );
  if (center) match.registerArenaCenter(center);
  const hero = match.add('player', 'Test');
  initializeProgression(hero, config, 'fixed', 'cai_bang_bong');
  return { match, config, hero, world: match.arena.world, options };
}
describe('wave boss progression presets', () => {
  it('requires both exact server flags and refuses production', () => {
    expect(
      serverWaveBossTestOptions(30, { VOLAM_DEV_BOSS_PROGRESSION: '1' }),
    ).toBeUndefined();
    expect(
      serverWaveBossTestOptions(30, {
        NODE_ENV: 'production',
        VOLAM_DEV_WAVE_BOSSES: '1',
        VOLAM_DEV_BOSS_PROGRESSION: '1',
      }),
    ).toBeUndefined();
    expect(setup().options).toMatchObject({
      progression: true,
      runSpeedMultiplier: 1,
      firstRestTicks: 600,
    });
  });
  it('grants exact readiness, legal ranks, prior pearls and affordable equipment at all five stages', () => {
    const { hero, world, config } = setup();
    const rows = Object.entries(bossProgressionPresets);
    for (const [index, [stage, preset]] of rows.entries()) {
      expect(
        prepareBossProgressionHero(
          hero,
          world,
          config,
          stage as WaveBossTestStage,
        ),
      ).toBe(true);
      expect(hero.level).toBe(preset!.level);
      expect(hero.xp).toBe(experienceAtLevel(hero.level, config));
      expect(hero.inventory!.levels).toEqual(preset!.levels);
      expect(Object.keys(hero.inventory!.crafted!)).toHaveLength(index);
      expect(hero.dragonBonus).toBeCloseTo(index * 0.12);
      expect(hero.campaignClears).toHaveLength(index * 2);
      expect(hero.inventory!.potions).toEqual({ hp_small: 10, mp_small: 10 });
      expect(hero.gold).toBeGreaterThanOrEqual(0);
      expect(pointAccounting(hero, config).allocated).toBeLessThanOrEqual(
        Math.min(20, hero.level),
      );
      const ultimate = hero.progression!.defaultSkills[4]!;
      expect(hero.progression!.ranks[ultimate]).toBe(Math.min(4, index + 1));
      expect(hero.hp).toBe(hero.maxHp);
    }
  });
  it('retains real incoming/outgoing damage, potion and skill cooldown debt; ordinary waves never spawn', () => {
    const { match, hero, world, config } = setup();
    prepareBossProgressionHero(hero, world, config, 'dong_ta');
    hero.inventory!.potionReadyAt = 1000;
    hero.inventory!.auxiliaryReadyAt = 2000;
    hero.abilityCooldowns = { test: 3000 };
    prepareBossProgressionHero(hero, world, config, 'tay_doc');
    expect(hero.inventory!.potionReadyAt).toBe(1000);
    expect(hero.inventory!.auxiliaryReadyAt).toBe(2000);
    expect(hero.abilityCooldowns.test).toBe(3000);
    const hp = hero.hp;
    expect(
      hurt(world, hero, 'boss', 'test', 100, config, {
        critChance: 0,
        critMultiplier: 1,
      }),
    ).toBe(true);
    expect(hero.hp).toBeLessThan(hp);
    const enemy = addCreep(
      world,
      'dummy',
      { x: hero.x + 30, y: hero.y },
      config,
    );
    enemy.archetypeId = 'dong_ta';
    enemy.hp = enemy.maxHp = 10000;
    enemy.stats = { ...config.creep, defense: 0 };
    hurt(world, enemy, hero.id, 'test', 10, config, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(enemy.hp).toBe(9990);
    match.step();
    expect([...world.creeps.values()].some((c) => c.invasion)).toBe(false);
    delete world.waveBossTest;
    const before = hero.level;
    expect(
      prepareBossProgressionHero(hero, world, config, 'vuong_trung_duong'),
    ).toBe(false);
    expect(hero.level).toBe(before);
  });
  it('opens final only after the four actual master defeats, without inventing a team Kim clear', () => {
    const { match, world, config } = setup();
    const director = match.mainBosses!;
    director.step(world, config, match.invasion);
    expect(world.vuong).toBeUndefined();
    for (const id of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'] as const)
      director.recordDefeat(id);
    director.step(world, config, match.invasion);
    world.tick += 600;
    director.step(world, config, match.invasion);
    expect(world.vuong).toBeDefined();
    expect(world.campaign!.cleared.has('kim_luan_phap_vuong')).toBe(false);
    const normal = setup();
    delete normal.world.waveBossTest;
    for (const id of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'] as const)
      normal.match.mainBosses!.recordDefeat(id);
    normal.world.tick = 100000;
    normal.match.mainBosses!.step(
      normal.world,
      normal.config,
      normal.match.invasion,
    );
    expect(normal.world.vuong).toBeUndefined();
  });
});

describe('explicit DEV boss progression skip', () => {
  it('advances all four test gates without kill rewards, and stale requests cannot skip twice', () => {
    const { match, hero, world } = setup();
    const xp = hero.xp,
      gold = hero.gold;
    const stages = ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'] as const;
    const next = ['tay_doc', 'nam_de', 'bac_cai', 'vuong_trung_duong'];
    for (let i = 0; i < stages.length; i++) {
      expect(match.skipWaveBossTest(stages[i]!)).toBeUndefined();
      expect(world.waveBossTest!.stage).toBe(next[i]);
      expect(match.skipWaveBossTest(stages[i]!)).toContain('đã thay đổi');
      expect(hero.xp).toBe(xp);
      expect(hero.gold).toBe(gold);
      expect(world.campaign!.cleared.size).toBe(0);
      match.step();
      expect(world.waveBossTest!.stage).toBe(next[i]);
    }
    expect(world.waveBossTest!.skipped).toEqual(stages);
    for (let i = 0; i < 1000 && !world.vuong; i++) match.step();
    expect(world.vuong).toBeDefined();
    expect(match.victory).toBe(false);
    expect(world.campaign!.cleared.size).toBe(0);
    expect(
      [...world.creeps.values()].some((c) =>
        ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'].includes(
          c.archetypeId ?? '',
        ),
      ),
    ).toBe(false);
  });
  it('retires live hazards and clears the dead/spectator/retry state before the next encounter', () => {
    const { match, hero, world, config } = setup();
    hero.invulnerable = true;
    for (let i = 0; i < 1000 && match.dongTa!.phase !== 'fighting'; i++)
      match.step();
    match.dongTa!.casts = [];
    match.dongTa!.effects = [];
    expect(
      match.dongTa!.beginCast(
        world,
        match.arena.config,
        'dong_ta',
        'ngoc_tieu_hoi_phong',
        hero.id,
      ),
    ).toBe(true);
    for (let i = 0; i < 35; i++) match.step();
    expect(match.dongTa!.effects.some((e) => e.kind === 'petal')).toBe(true);
    expect(match.skipWaveBossTest('dong_ta')).toBeUndefined();
    expect(match.dongTa!.effects).toHaveLength(0);
    expect(match.dongTa!.casts).toHaveLength(0);
    expect(world.creeps.size).toBe(0);
    expect(world.projectiles.size).toBe(0);
    expect(hero.statuses).toEqual([]);
    delete world.waveBossTest;
    expect(match.skipWaveBossTest('tay_doc')).toContain('Chỉ bỏ qua');
    expect(world.campaign!.cleared.size).toBe(0);
    expect(config.campaign.bosses.tay_doc_boss!.gold).toBe(250);
  });
  it('can escape a real four-death solo ballot and resume the invasion clock', () => {
    const { match, hero, world, config } = setup();
    for (let i = 0; i < 1000 && match.dongTa!.phase !== 'fighting'; i++)
      match.step();
    match.dongTa!.casts = [];
    match.dongTa!.effects = [];
    world.creeps.get('dong_ta')!.cooldown = 1e9;
    for (let death = 0; death < 4; death++) {
      hero.hp = 1;
      expect(
        hurt(world, hero, 'dong_ta', 'test', 1e6, config, {
          critChance: 0,
          critMultiplier: 1,
        }),
      ).toBe(true);
      match.step();
      if (death < 3) for (let i = 0; i < 151; i++) match.step();
    }
    expect(match.bossRetries.voting).toBe(true);
    expect(hero.bossSpectator).toBe(true);
    expect(match.skipWaveBossTest('dong_ta')).toBeUndefined();
    expect(match.bossRetries.voting).toBe(false);
    expect(match.bossRetries.trials.size).toBe(0);
    expect(hero.bossSpectator).toBe(false);
    expect(hero.hp).toBe(hero.maxHp);
    const tick = match.arenaTick;
    match.step();
    expect(match.arenaTick).toBe(tick + 1);
    expect(world.waveBossTest!.stage).toBe('tay_doc');
  });
});

describe('registered arena and phase-two test action', () => {
  it('uses the authored circle center for statue, bounds and every encounter in all maps without changing templates', () => {
    for (const variant of Object.values(arenaVariants)) {
      const { match, world } = setup(variant.circleCenter);
      const center = variant.circleCenter;
      for (const point of [
        world.statue,
        match.dongTa!.definition.center,
        match.dongTa!.definition.bounds,
        world.namDe!.definition.entrance,
        world.namDe!.definition.arenaBounds,
        match.mainBosses!.definition.center,
        match.mainBosses!.final!.center,
        match.base.waveArena!.center,
      ])
        expect(point).toMatchObject(center);
      expect(match.tayDoc!.definition.spawn.y).toBe(center.y);
      expect(match.invasion!.definition.statue.position).toEqual(center);
    }
    expect(dongTaDefinition.center).toEqual({ x: 800, y: 616 });
    expect(bacCaiDefinition.center).toEqual({ x: 800, y: 616 });
  });
  it('enters actual VTD phase two at its HP threshold, clearing phase-one mechanics without rewards', () => {
    const { match, world, hero } = setup();
    expect(match.skipVuongPhaseOneTest()).toBeTruthy();
    for (const stage of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'] as const)
      expect(match.skipWaveBossTest(stage)).toBeUndefined();
    for (let i = 0; i < 1000 && !world.vuong; i++) match.step();
    expect(world.vuong).toBeDefined();
    expect(match.skipVuongPhaseOneTest()).toBeUndefined();
    expect(world.vuong!.phase).toBe(2);
    expect(world.vuong!.lightningHits).toBe(3);
    const boss = world.creeps.get('vuong_trung_duong')!;
    expect(boss.hp).toBe(Math.ceil(boss.maxHp * vuongDefinition.phase2Hp));
    expect(world.vuong!.controls.size).toBe(0);
    expect(world.campaign!.cleared.size).toBe(0);
    expect(hero.hp).toBe(hero.maxHp);
    expect(match.skipVuongPhaseOneTest()).toBeTruthy();
  });
});

it('starts isolated Thất Tuyệt directly from early progression, retries cleanly and returns to normal phase two', () => {
  const { match, world, hero } = setup();
  expect(match.startVuongNotesTest()).toBeUndefined();
  expect(world.waveBossTest).toMatchObject({
    stage: 'vuong_trung_duong',
    scenario: 'vuong_notes',
  });
  expect(world.vuong!.phase).toBe(2);
  expect(world.campaign!.cleared.size).toBe(0);
  for (
    let i = 0;
    i < 120 &&
    world.vuong!.view(world, match.arena.config).action?.skill !== 'notes';
    i++
  )
    match.step();
  let view = world.vuong!.view(world, match.arena.config);
  expect(view.notesTest).toBe(true);
  expect(view.action?.skill).toBe('notes');
  expect(view.notes).toHaveLength(7);
  expect(view.cues).toHaveLength(0);
  const old = world.vuong;
  expect(match.startVuongNotesTest()).toBeUndefined();
  expect(world.vuong).not.toBe(old);
  expect(match.bossRetries.trials.size).toBe(0);
  expect(match.skipVuongPhaseOneTest()).toBeUndefined();
  expect(world.waveBossTest!.scenario).toBeUndefined();
  expect(world.vuong!.phase).toBe(2);
  expect(hero.hp).toBe(hero.maxHp);
});

it('restarts notes practice from its real wipe ballot without requiring a campaign win', () => {
  const { match, world, hero } = setup();
  expect(match.startVuongNotesTest()).toBeUndefined();
  hero.x = match.mainBosses!.final!.center.x;
  hero.y = match.mainBosses!.final!.center.y;
  for (let i = 0; i < 400 && !match.bossRetries.voting; i++) match.step();
  expect(match.bossRetries.voting).toBe(true);
  expect(world.vuong!.wipeRequested).toBe(true);
  expect(match.bossRetries.view(hero.id).retry).toMatchObject({
    revivals: 3,
    notesFailure: { beat: 1, missed: [hero.id] },
  });
  hero.moveDestination = { point: { x: 10, y: 10 } };
  expect(match.startVuongNotesTest()).toBeUndefined();
  expect(match.bossRetries.voting).toBe(false);
  expect(hero.hp).toBe(hero.maxHp);
  expect(world.vuong!.wipeRequested).toBe(false);
  expect(world.vuong!.notesFailure).toBeUndefined();
  expect(hero.moveDestination).toBeUndefined();
  expect(world.campaign!.cleared.size).toBe(0);
});

it('leaves successful notes practice idle without other hazards or a boss kill', () => {
  const { match, world, hero } = setup();
  expect(match.startVuongNotesTest()).toBeUndefined();
  const view = () => world.vuong!.view(world, match.arena.config);
  for (let i = 0; i < 300 && view().action?.stage !== 1; i++) match.step();
  const initial = view();
  expect(initial.action?.skill).toBe('notes');
  for (let i = 0; i < initial.notes.length; i++) {
    const seal = initial.noteSeals[initial.notes[i]!]!;
    hero.x = seal.x;
    hero.y = seal.y;
    for (let j = 0; j < 100 && view().action?.stage === i + 1; j++)
      match.step();
  }
  for (let i = 0; i < 120; i++) match.step();
  expect(view().action).toBeNull();
  expect(view().cues).toHaveLength(0);
  expect(view().notesTest).toBe(true);
  const boss = world.creeps.get('vuong_trung_duong')!,
    hp = boss.hp;
  hurt(world, boss, hero.id, 'practice_attack', 1e9, match.arena.config);
  expect(boss.hp).toBe(hp);
  expect(match.victory).toBe(false);
  expect(world.campaign!.cleared.size).toBe(0);
});

it('starts Nam De dark practice with no kills/rewards, resets transient mechanics and forbids backwards progression', () => {
  const { match, world, hero } = setup();
  expect(match.startNamDeDarkTest()).toBeUndefined();
  expect(world.waveBossTest!.stage).toBe('nam_de');
  expect(world.namDe!.dark!.shield).toBe(true);
  const boss = world.creeps.get('boss_nam_de')!;
  expect(boss.hp).toBe(Math.ceil(boss.maxHp * 0.4));
  expect(world.campaign!.cleared.size).toBe(0);
  expect(hero.hp).toBe(hero.maxHp);
  const old = world.namDe!.dark;
  expect(match.startNamDeDarkTest()).toBeUndefined();
  expect(world.namDe!.dark).not.toBe(old);
  expect(match.skipWaveBossTest('nam_de')).toBeUndefined();
  expect(match.startNamDeDarkTest()).toContain('Chỉ test');
});
