import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  characterStats,
  changeBuild,
  createWorld,
  directDodgeChance,
  initializeProgression,
  InvasionDirector,
  stepWorld,
  submitInput,
  type SimulationConfig,
} from '@volam/game-core';
import {
  campaignDefinition,
  createInvasionDefinition,
  creepCombatDefinition,
  m1Config,
} from '@volam/game-data';
import { portalCountSchema } from '@volam/game-protocol';
import { hurt } from '../packages/game-core/src/combat.js';
import { hasStatus } from '../packages/game-core/src/status.js';
import art from '../assets/exports/m3d-review/manifest.json' with { type: 'json' };
import continuity from '../assets/exports/m3d-sprite-continuity/provenance.json' with { type: 'json' };

function fixture(dungeonId?: string) {
  const c: SimulationConfig = {
    ...structuredClone(m1Config),
    creepSpawns: [],
    collision: [],
    creepRespawn: false,
    creepCombat: creepCombatDefinition,
    ...(dungeonId ? { dungeonId } : {}),
  };
  const w = createWorld(c, 42),
    h = addHero(w, 'hero', 'Hero', c);
  return {
    w,
    h,
    c,
    step: (n: number) => {
      for (let i = 0; i < n; i++) stepWorld(w, c);
    },
  };
}

it('streams only the east gate and retains the total wave XP and gold budgets', () => {
  expect(portalCountSchema.parse(1)).toBe(1);
  const run = (portalCount: 1 | 4) => {
    const { w, c } = fixture();
    const config = { ...c, campaign: campaignDefinition };
    const invasion = new InvasionDirector(
      createInvasionDefinition(180, 2000, {
        portalCount,
        durationSeconds: 6,
        spawnEverySeconds: 2,
      }),
      w,
    );
    for (let tick = 180 * c.tickRate; tick < 187 * c.tickRate; tick++)
      invasion.beforeStep(w, config, tick, 1);
    const creeps = [...w.creeps.values()];
    return {
      lanes: new Set(creeps.map((e) => e.invasion?.lane)),
      count: creeps.length,
      xp: creeps.reduce((n, e) => n + (e.stats?.xp ?? 0), 0),
      gold: creeps.reduce((n, e) => n + (e.stats?.gold ?? 0), 0),
    };
  };
  const one = run(1),
    four = run(4);
  expect([...one.lanes]).toEqual(['east']);
  expect(four.count).toBe(one.count * 4);
  expect(one.xp).toBeCloseTo(four.xp);
  expect(one.gold).toBeCloseTo(four.gold);
});

it('aims through the statue and damages across it while other walls block the shot', () => {
  for (const obstacle of ['statue', 'wall']) {
    const { w, h, c, step } = fixture();
    const rect = { x: 320, y: 180, width: 32, height: 55 };
    c.collision.push(rect);
    if (obstacle === 'statue')
      w.statue = {
        id: 'statue',
        x: 336,
        y: 207,
        radius: 20,
        collision: rect,
        hp: 2000,
        maxHp: 2000,
        pose: 'idle',
        fx: 0,
        fy: 1,
        hurtUntil: 0,
        cooldown: 0,
        actionUntil: 0,
      };
    initializeProgression(h, c, 'fixed', 'cai_bang_chuong');
    Object.assign(h, { x: 400, y: 220, fx: 0, fy: 1 });
    const e = addCreep(w, 'target', { x: 272, y: 195 }, c);
    e.stats = { ...c.creep, speed: 0, damage: 0 };
    const hp = e.hp;
    submitInput(w, h.id, 1, { kind: 'basic' });
    step(26);
    expect(e.hp < hp).toBe(obstacle === 'statue');
  }
});

it('continues the four Bổng attacks at the retained eight-tick cadence', () => {
  const { w, h, c, step } = fixture();
  initializeProgression(h, c, 'fixed', 'cai_bang_bong');
  const stages = [];
  for (let i = 0; i < 5; i++) {
    submitInput(w, h.id, i + 1, { kind: 'basic' });
    step(1);
    stages.push(
      w.events.find((e) => e.kind === 'attack' && e.sourceId === h.id)?.stage,
    );
    step(7);
  }
  expect(stages).toEqual(['thrust', 'sweep', 'lift', 'smash', 'thrust']);
});

it('Vi Đà lands a real 60-tick stun at every rank and retains defense break', () => {
  const { w, h, c, step } = fixture();
  h.schoolId = 'thieu_lam';
  initializeProgression(h, c, 'fixed', 'thieu_lam_quyen');
  h.level = 7;
  for (let r = 0; r < 4; r++)
    expect(
      changeBuild(w, h, c, r, { action: 'upgrade-slot', slot: 1 }),
    ).toBeUndefined();
  Object.assign(h, { x: 400, y: 400, fx: 1, fy: 0 });
  const e = addCreep(w, 'target', { x: 550, y: 400 }, c);
  Object.assign(e, {
    hp: 500,
    maxHp: 500,
    stats: { ...c.creep, speed: 0, damage: 0 },
  });
  submitInput(w, h.id, 1, { kind: 'cast', slot: 1 });
  step(1);
  expect(e.hp).toBeLessThan(500);
  expect(e.statuses?.find((s) => s.kind === 'stun')?.until).toBe(w.tick + 60);
  expect(hasStatus(e, 'defense_break', w.tick)).toBe(true);
  expect(
    c.progression?.skills['vi_da_quyen']?.ranks.map(
      (a) => a.effect.mode === 'arc' && a.effect.damage,
    ),
  ).toEqual([51, 59, 67, 75]);
});

it('rolls Thiên Sơn dodge only for direct enemy hits and reports the real level chance', () => {
  const counts: number[] = [];
  for (const [level, chance] of [
    [1, 0.04],
    [6, 0.05],
    [15, 0.068],
    [30, 0.098],
  ] as const) {
    const { w, h, c } = fixture();
    h.schoolId = 'thien_son';
    initializeProgression(h, c, 'fixed', 'thien_son_phien');
    h.level = level;
    const e = addCreep(w, 'enemy', { x: 550, y: 400 }, c);
    expect(directDodgeChance(h.schoolId, level, c)).toBeCloseTo(chance);
    let dodges = 0;
    for (let i = 0; i < 500; i++) {
      h.hp = h.maxHp;
      if (
        !hurt(w, h, e.id, 'enemy_hit', 20, c, {
          critChance: 0,
          critMultiplier: 1,
        })
      )
        dodges++;
    }
    expect(dodges).toBeGreaterThan(8);
    expect(dodges).toBeLessThan(80);
    counts.push(dodges);
    w.random = () => 0;
    expect(
      hurt(w, h, e.id, 'poison', 20, c, {
        critChance: 0,
        critMultiplier: 1,
        periodic: true,
      }),
    ).toBe(true);
  }
  console.info(
    'Bắc Minh dodge rolls (seed 42, levels 1/6/15/30, 500 direct hits each):',
    counts,
  );
});

it('cycles darts, warns four geysers every three seconds and relocates staggered fire blasts', () => {
  const forest = fixture('forest'),
    seen = new Set<string>();
  const forestData = creepCombatDefinition.dungeonHazards!['forest']!;
  expect(forestData.kind).toBe('darts');
  for (let i = 0; i < 280; i++) {
    forest.step(1);
    for (const e of forest.w.creepCombat!.effects.values())
      if (e.abilityId === 'darts') {
        expect(e.activeAt).toBe(e.startedAt);
        seen.add(e.fx + ',' + e.fy);
      }
  }
  expect(seen).toEqual(new Set(['1,0', '0,1', '-1,0', '0,-1']));
  const sea = fixture('sea');
  Object.assign(sea.h, { x: 450, y: 400 });
  sea.step(135);
  const geysers = () =>
    [...sea.w.creepCombat!.effects.values()].filter(
      (e) => e.abilityId === 'geyser',
    );
  const [water, second] = geysers();
  expect(geysers()).toHaveLength(4);
  expect(second?.activeAt).toBe(water?.activeAt);
  expect(
    Math.hypot(water!.x - second!.x, water!.y - second!.y),
  ).toBeGreaterThan(108);
  expect(water!.activeAt - water!.startedAt).toBe(19);
  expect([water!.x, water!.y]).toEqual([450, 400]);
  Object.assign(sea.h, sea.c.spawn);
  sea.step(19);
  expect(hasStatus(sea.h, 'stun', sea.w.tick)).toBe(false);
  Object.assign(sea.h, { x: 450, y: 400 });
  sea.step(70);
  expect(geysers()).toHaveLength(0);
  sea.step(1);
  expect(geysers()).toHaveLength(4);

  const hell = fixture('hell');
  hell.step(1);
  const fire = [...hell.w.creepCombat!.effects.values()];
  expect(fire.map((e) => e.activeAt)).toEqual([115, 157, 199, 241]);
  Object.assign(hell.h, { x: fire[0]!.x, y: fire[0]!.y });
  hell.step(113);
  expect(hasStatus(hell.h, 'stun', hell.w.tick)).toBe(false);
  hell.step(1);
  expect(hasStatus(hell.h, 'stun', hell.w.tick)).toBe(true);
  hell.step(150);
  const relocated = hell.w.creepCombat!.effects.get('firetrap_0')!;
  expect(relocated.activeAt).toBe(283);
  expect(relocated.activeAt - relocated.startedAt).toBe(18);
  expect(
    Math.hypot(relocated.x - fire[0]!.x, relocated.y - fire[0]!.y),
  ).toBeGreaterThanOrEqual(relocated.radius * 2);
  expect(hasStatus(hell.h, 'stun', hell.w.tick)).toBe(false);
  Object.assign(hell.h, { x: relocated.x, y: relocated.y });
  hell.step(18);
  expect(hasStatus(hell.h, 'stun', hell.w.tick)).toBe(true);
});

it('slows walking, blocks a dash without spending a charge and restores both after leaving sand', () => {
  const { w, h, c, step } = fixture('desert');
  step(1);
  const pit = w.creepCombat!.effects.get('quicksand_0')!;
  Object.assign(h, { x: pit.x, y: pit.y });
  const speed = characterStats(h, c, w.tick).total.movementSpeed;
  submitInput(w, h.id, 1, { kind: 'move', x: 1, y: 0 });
  submitInput(w, h.id, 2, { kind: 'dash' });
  step(1);
  const x = h.x;
  step(1);
  expect(h.x - x).toBeCloseTo((speed * 0.1) / c.tickRate);
  expect(hasStatus(h, 'slow', w.tick)).toBe(true);
  expect(h.dashCharges).toBe(2);
  Object.assign(h, c.spawn);
  step(1);
  expect(hasStatus(h, 'slow', w.tick)).toBe(false);
  submitInput(w, h.id, 3, { kind: 'dash' });
  step(1);
  expect(h.dashCharges).toBe(1);
});

it('keeps the reviewed source and Phaser atlas bytes pinned', () => {
  for (const [path, sha] of Object.entries(art.files))
    expect(
      createHash('sha256').update(readFileSync(path)).digest('hex'),
      path,
    ).toBe(sha);
});

it('pins the native action exports and their original pose sources', () => {
  const base = 'assets/exports/m3d-sprite-continuity/';
  for (const [path, hash] of Object.entries(continuity.inputs))
    expect(
      createHash('sha256').update(readFileSync(path)).digest('hex'),
      path,
    ).toBe(hash);
  for (const [name, hash] of Object.entries(continuity.outputs))
    expect(
      createHash('sha256')
        .update(readFileSync(base + name))
        .digest('hex'),
      name,
    ).toBe(hash);
  for (const [name, frames, width, height] of [
    ['body', 64, 256, 288],
    ['forest_truc_xa', 32, 320, 256],
    ['forest_doc_chu', 32, 320, 256],
    ['forest_effects', 32, 256, 256],
  ] as const) {
    const atlas = JSON.parse(readFileSync(base + name + '.json', 'utf8'));
    expect(Object.keys(atlas.frames)).toHaveLength(frames);
    const png = readFileSync(base + name + '.png');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
      atlas.meta.size.w,
      atlas.meta.size.h,
    ]);
    for (const cel of Object.values(atlas.frames) as Array<{
      trimmed: boolean;
      sourceSize: { w: number; h: number };
    }>) {
      expect(cel.trimmed).toBe(true);
      expect(cel.sourceSize).toEqual({ w: width, h: height });
    }
  }
});

it.each([1, 6])(
  'raises invasion pressure for %i players without increasing creep count or reward pools',
  (players) => {
    const measure = (tuned: boolean) => {
      const { w, c } = fixture();
      const campaign = structuredClone(campaignDefinition);
      if (!tuned) {
        campaign.invasionHpMultiplier = 1;
        campaign.invasionDamageMultiplier = 1;
      }
      c.campaign = campaign;
      const inv = new InvasionDirector(
        createInvasionDefinition(180, 2000, {
          portalCount: 4,
          durationSeconds: 4,
        }),
        w,
      );
      for (let tick = 180 * c.tickRate; tick < 185 * c.tickRate; tick++)
        inv.beforeStep(w, c, tick, players);
      return [...w.creeps.values()].map((e) => e.stats!);
    };
    const before = measure(false);
    const after = measure(true);
    expect(after).toHaveLength(before.length);
    expect(after[0]!.hp / before[0]!.hp).toBeCloseTo(1.1, 2);
    expect(after[0]!.damage).toBeGreaterThan(before[0]!.damage);
    expect(after.map(({ xp, gold, speed }) => [xp, gold, speed])).toEqual(
      before.map(({ xp, gold, speed }) => [xp, gold, speed]),
    );
  },
);
