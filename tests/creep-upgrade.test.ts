import { describe, it, expect } from 'vitest';
import {
  createWorld,
  addHero,
  addCreep,
  stepWorld,
  stepCreepActor,
  stepCreepHazards,
  creepGuardDamage,
  InvasionDirector,
  stepControlledCreepSpecial,
  gateNamDe,
  initializeNamDe,
  DongTaEncounter,
  TayDocGate,
  TayDocEncounter,
  MainBossDirector,
} from '@volam/game-core';
import { applyStatus } from '../packages/game-core/src/status.js';
import {
  m1Config,
  creepCombatDefinition,
  creepProfiles,
  creepProfileSchema,
  createInvasionDefinition,
  namDeDefinition,
  dongTaDefinition,
  tayDocDefinition,
  bacCaiDefinition,
} from '@volam/game-data';
import { serverInvasionDefinition } from '../apps/game-server/src/invasion-config.js';
import { joinOptionsSchema, PROTOCOL_VERSION } from '@volam/game-protocol';

function fixture(id = 'truc_xa') {
  const config = structuredClone(m1Config);
  config.collision = [];
  config.creepSpawns = [];
  config.creepCombat = structuredClone(creepCombatDefinition);
  config.creepRespawn = false;
  config.critChance = 0;
  const world = createWorld(config, 42),
    enemy = addCreep(world, 'enemy', { x: 400, y: 400 }, config),
    hero = addHero(world, 'hero', 'Hero', config);
  enemy.archetypeId = id;
  enemy.stats = { ...config.creep, speed: 0, damage: 20 };
  Object.assign(enemy, {
    hp: 1000,
    maxHp: 1000,
    fx: 1,
    fy: 0,
    cooldown: 100000,
  });
  Object.assign(hero, { x: 440, y: 400, hp: 10000, maxHp: 10000 });
  stepCreepHazards(world, config);
  world.creepCombat!.actors.get(enemy.id)!.nextSpecial = 0;
  return { world, config, enemy, hero };
}
const advance = (s: ReturnType<typeof fixture>, n: number) => {
  for (let i = 0; i < n; i++) {
    s.world.tick++;
    stepCreepHazards(s.world, s.config);
  }
};
function special(s: ReturnType<typeof fixture>) {
  stepCreepActor(s.world, s.enemy, s.hero, undefined, s.config);
}

describe('49 authored creep combat profiles', () => {
  it('validates every profile, preserves all identities, and rejects malformed combat data', () => {
    expect(Object.keys(creepProfiles)).toHaveLength(49);
    expect(creepCombatDefinition.waveIds).toHaveLength(20);
    for (const p of Object.values(creepProfiles))
      expect(creepProfileSchema.safeParse(p).success).toBe(true);
    expect(() =>
      creepProfileSchema.parse({
        ...creepProfiles['truc_xa'],
        basic: { ...creepProfiles['truc_xa']!.basic, damage: NaN },
      }),
    ).toThrow();
  });
  for (const p of Object.values(creepProfiles).filter(
    (p) => p.special && p.id !== 'bc_dog',
  ))
    it(`${p.id}: starts its actual signature with a windup and cooldown`, () => {
      const s = fixture(p.id);
      special(s);
      expect(s.world.creepCombat!.effects.size).toBeGreaterThan(0);
      const window = Math.max(
        1,
        Math.round(
          p.special!.windup * creepCombatDefinition.specialWindupScale,
        ),
      );
      const cues = [...s.world.creepCombat!.effects.values()];
      expect(Math.min(...cues.map((e) => e.activeAt - e.startedAt))).toBe(
        window,
      );
      expect(s.enemy.encounterAction?.activeAt).toBe(s.world.tick + window);
      expect(s.world.creepCombat!.actors.get(s.enemy.id)!.nextSpecial).toBe(
        p.special!.cooldown,
      );
      const count = s.world.creepCombat!.effects.size;
      special(s);
      expect(s.world.creepCombat!.effects.size).toBe(count);
      advance(s, p.special!.windup + 70);
      expect(
        [...s.world.creepCombat!.effects.values()].every(
          (e) => Number.isFinite(e.x) && Number.isFinite(e.y),
        ),
      ).toBe(true);
    });
  it('shoots non-homing arrows and venom; a side-step misses without applying poison', () => {
    const s = fixture();
    s.hero.x = 550;
    special(s);
    const e = [...s.world.creepCombat!.effects.values()][0]!;
    const v = { fx: e.fx, fy: e.fy };
    s.hero.y = 500;
    advance(s, 80);
    expect({ fx: e.fx, fy: e.fy }).toEqual(v);
    expect(s.hero.hp).toBe(10000);
    expect(s.hero.statuses?.some((v) => v.kind === 'poison')).not.toBe(true);
  });
  it('venom hits once, applies poison, and DOT does not multiply with attackers', () => {
    const s = fixture();
    special(s);
    advance(s, 32);
    expect(s.hero.hp).toBeLessThan(10000);
    expect(s.hero.statuses?.some((v) => v.kind === 'poison')).toBe(true);
    for (let i = 0; i < 20; i++)
      applyStatus(
        s.hero,
        { kind: 'poison', magnitude: 2, durationTicks: 90 },
        `other_${i}`,
        'creep_truc_xa_special',
        s.world.tick,
      );
    const hp = s.hero.hp;
    advance(s, 30);
    expect(hp - s.hero.hp).toBe(2);
  });
  it('melee heavy attacks hit the captured front, miss a rear dodge, and do not hit late entrants', () => {
    const s = fixture('cua_khong_lo');
    special(s);
    s.hero.x = 370;
    const lastStrike = Math.max(
      ...[...s.world.creepCombat!.effects.values()].map((e) => e.activeAt),
    );
    advance(s, lastStrike - s.world.tick + 1);
    expect(s.hero.hp).toBe(10000);
    s.hero.x = 440;
    advance(s, 5);
    expect(s.hero.hp).toBe(10000);
  });
  it('projectiles stop at terrain and cannot poison through a wall', () => {
    const s = fixture();
    special(s);
    s.config.collision = [{ x: 415, y: 370, width: 8, height: 60 }];
    advance(s, 80);
    expect(s.hero.hp).toBe(10000);
  });
  it('charge is swept, hits once, respects walls, and has an opening after missing', () => {
    const s = fixture('wave_16');
    special(s);
    s.config.collision = [{ x: 480, y: 350, width: 16, height: 100 }];
    advance(s, 70);
    expect(s.enemy.x).toBeLessThan(480);
    const hits = s.world.events.filter(
      (e) => e.kind === 'hit' && e.targetId === s.hero.id,
    );
    expect(hits).toHaveLength(1);
  });
  it('stun interrupts an unreleased cast, silence blocks specials, disarm blocks normal attacks', () => {
    const s = fixture();
    applyStatus(
      s.enemy,
      { kind: 'silence', magnitude: 1, durationTicks: 60 },
      'hero',
      'test',
      0,
    );
    special(s);
    expect(s.world.creepCombat!.effects.size).toBe(0);
    s.enemy.statuses = [];
    special(s);
    applyStatus(
      s.enemy,
      { kind: 'stun', magnitude: 1, durationTicks: 60 },
      'hero',
      'test',
      0,
    );
    advance(s, 30);
    expect(s.world.creepCombat!.effects.size).toBe(0);
    expect(s.hero.hp).toBe(10000);
    s.enemy.statuses = [];
    s.world.creepCombat!.actors.get(s.enemy.id)!.nextSpecial = 10000;
    s.enemy.cooldown = 0;
    applyStatus(
      s.enemy,
      { kind: 'disarm', magnitude: 1, durationTicks: 60 },
      'hero',
      'test',
      s.world.tick,
    );
    special(s);
    expect(s.world.creepCombat!.effects.size).toBe(0);
  });
  it('guard works only in front; counter schedules one readable retaliation', () => {
    const s = fixture('wave_11');
    special(s);
    advance(s, 25);
    expect(creepGuardDamage(s.world, s.enemy, 'hero', 100, s.config)).toBe(50);
    s.hero.x = 350;
    expect(creepGuardDamage(s.world, s.enemy, 'hero', 100, s.config)).toBe(100);
    const c = fixture('truc_lam_kiem_khach');
    special(c);
    advance(c, 25);
    expect(creepGuardDamage(c.world, c.enemy, 'hero', 100, c.config)).toBe(50);
    expect(creepGuardDamage(c.world, c.enemy, 'hero', 100, c.config)).toBe(100);
  });
  it('kill during self-detonation cancels it; lava spirit death explosion is warned and happens once', () => {
    const s = fixture('wave_14');
    special(s);
    s.enemy.hp = 0;
    advance(s, 60);
    expect(s.hero.hp).toBe(10000);
    const d = fixture('hell_dung_nham_linh');
    d.enemy.hp = 0;
    advance(d, 1);
    expect(d.world.creepCombat!.effects.size).toBe(1);
    expect(d.hero.hp).toBe(10000);
    advance(d, 30);
    expect(d.hero.hp).toBeLessThan(10000);
    const hp = d.hero.hp;
    advance(d, 60);
    expect(d.hero.hp).toBe(hp);
  });
  it('does not heal or apply special attacks to the statue', () => {
    const s = fixture('wave_19');
    s.world.statue = {
      ...s.hero,
      id: 'statue',
      x: 440,
      y: 400,
      hp: 2000,
      maxHp: 2000,
      radius: 36,
    };
    s.enemy.hp = 100;
    s.enemy.cooldown = 0;
    s.world.heroes.clear();
    stepCreepActor(s.world, s.enemy, undefined, s.world.statue, s.config);
    expect(s.world.statue.hp).toBe(2000);
    advance(s, 30);
    expect(s.world.statue.hp).toBe(1980);
    expect(s.enemy.hp).toBe(100);
    expect(s.world.creepCombat!.effects.size).toBe(0);
  });
  it('normal ranged shots can hit the real statue through its own movement footprint, while terrain still blocks', () => {
    const s = fixture('wave_04');
    s.world.heroes.clear();
    const definition = createInvasionDefinition();
    new InvasionDirector(definition, s.world);
    s.config.collision.push(definition.statue.collision);
    Object.assign(s.enemy, {
      x: s.world.statue!.x - 180,
      y: s.world.statue!.y,
      cooldown: 0,
    });
    stepCreepActor(s.world, s.enemy, undefined, s.world.statue, s.config);
    expect(s.world.creepCombat!.effects.size).toBe(1);
    advance(s, 45);
    expect(s.world.statue!.hp).toBeLessThan(2000);
    const h = s.world.statue!.hp;
    s.enemy.cooldown = 0;
    s.config.collision.push({
      x: s.enemy.x + 30,
      y: s.enemy.y - 50,
      width: 16,
      height: 100,
    });
    stepCreepActor(s.world, s.enemy, undefined, s.world.statue, s.config);
    advance(s, 45);
    expect(s.world.statue!.hp).toBe(h);
  });
  it('melee normal attacks do not mistake the objective footprint for obstructing scenery', () => {
    const s = fixture('wave_01');
    s.world.heroes.clear();
    const d = createInvasionDefinition();
    new InvasionDirector(d, s.world);
    s.config.collision.push(d.statue.collision);
    Object.assign(s.enemy, {
      x: s.world.statue!.x - 50,
      y: s.world.statue!.y,
      cooldown: 0,
    });
    stepCreepActor(s.world, s.enemy, undefined, s.world.statue, s.config);
    expect(s.world.statue!.hp).toBe(1980);
  });
  it('limits nearby simultaneous special casters and cleans removed-owner hazards', () => {
    const s = fixture('wave_04');
    for (let i = 0; i < 8; i++) {
      const e = addCreep(
        s.world,
        `extra_${i}`,
        { x: s.enemy.x, y: s.enemy.y },
        s.config,
      );
      e.archetypeId = 'wave_04';
      e.stats = { ...s.config.creep };
    }
    stepCreepHazards(s.world, s.config);
    for (const a of s.world.creepCombat!.actors.values()) a.nextSpecial = 0;
    for (const e of s.world.creeps.values())
      stepCreepActor(s.world, e, s.hero, undefined, s.config);
    expect(
      new Set(
        [...s.world.creepCombat!.effects.values()]
          .filter((e) => e.special)
          .map((e) => e.ownerId),
      ).size,
    ).toBe(3);
    s.world.creeps.clear();
    advance(s, 1);
    expect(s.world.creepCombat!.effects.size).toBe(0);
    expect(s.world.creepCombat!.actors.size).toBe(0);
  });
  it('keeps boss-support steering and normal attacks without an extra dog special', () => {
    const s = fixture('bc_dog');
    s.enemy.controlled = true;
    expect(stepControlledCreepSpecial(s.world, s.enemy, s.hero, s.config)).toBe(
      false,
    );
    advance(s, 50);
    expect(s.hero.hp).toBe(10000);
  });
  it('is deterministic through the actual world stepping and leaves combat RNG untouched', () => {
    const run = () => {
      const s = fixture('wave_04');
      for (let i = 0; i < 180; i++) stepWorld(s.world, s.config);
      return {
        hp: s.hero.hp,
        enemy: [s.enemy.x, s.enemy.y],
        effects: [...s.world.creepCombat!.effects.values()].map((e) => [
          e.x,
          e.y,
          e.activeAt,
        ]),
        rng: s.world.random(),
      };
    };
    expect(run()).toEqual(run());
  });
  it('dash travel survives the full dungeon separation pipeline and burrow rises at the captured point', () => {
    const s = fixture('wave_16');
    s.config.dungeonAggro = true;
    s.hero.x = 550;
    for (let i = 0; i < 50; i++) stepWorld(s.world, s.config);
    expect(s.enemy.x).toBeGreaterThan(570);
    const b = fixture('sa_xa');
    special(b);
    b.hero.x = 500;
    advance(b, 50);
    expect(b.enemy.x).toBeCloseTo(440);
    expect(b.hero.hp).toBe(10000);
  });
});

describe('timed invasion streams and server-owned gates', () => {
  for (const portals of [2, 3, 4] as const)
    it(`${portals} gates stream for exactly 60 seconds, snapshot players, then stop`, () => {
      const s = fixture();
      s.world.creeps.clear();
      const d = createInvasionDefinition(180, 1000000, {
          portalCount: portals,
        }),
        director = new InvasionDirector(d, s.world);
      director.beforeStep(s.world, s.config, 5400, 1);
      expect(s.world.creeps.size).toBe(portals);
      for (let t = 5401; t <= 7200; t++)
        director.beforeStep(s.world, s.config, t, t > 5500 ? 6 : 1);
      expect(s.world.creeps.size).toBe(portals * 30);
      expect(
        new Set([...s.world.creeps.values()].map((e) => e.invasion!.lane)).size,
      ).toBe(portals);
      expect(s.world.invasionPending!.size).toBe(0);
      expect(director.spawnPlayerCount).toBe(1);
      director.beforeStep(s.world, s.config, 10800, 6);
      expect(director.spawnPlayerCount).toBe(6);
      expect(director.streaming).toBe(true);
    });
  it('never gates a chapter boss while its stream still has pending spawns', () => {
    const s = fixture();
    s.world.creeps.clear();
    s.world.invasionPending = new Set([5, 10, 15, 20]);
    const dong = new DongTaEncounter(dongTaDefinition, {
      lock: () => {},
      recall: () => {},
    });
    dong.beforeStep(s.world, s.config, 5);
    expect(dong.phase).toBe('waiting');
    const tay = new TayDocGate();
    tay.completeChapter('dong_ta');
    tay.step(s.world, s.config, 10, new TayDocEncounter(tayDocDefinition));
    expect(tay.readyAt).toBeUndefined();
    initializeNamDe(s.world, s.config, namDeDefinition);
    gateNamDe(s.world, 15, 0);
    expect(s.world.namDe!.phase).toBe('waiting');
    const main = new MainBossDirector(bacCaiDefinition);
    main.recordDefeat('dong_ta');
    main.recordDefeat('tay_doc');
    main.recordDefeat('nam_de');
    main.step(s.world, s.config, {} as InvasionDirector);
    expect(main.encounter).toBeUndefined();
  });
  it('validates portal choices and ignores every creep-test override in production', () => {
    for (const n of [0, 5, 2.5, '4', null])
      expect(
        joinOptionsSchema.safeParse({
          nickname: 'Hero',
          protocolVersion: PROTOCOL_VERSION,
          portalCount: n,
        }).success,
      ).toBe(false);
    const prod = serverInvasionDefinition(
      {
        NODE_ENV: 'production',
        VOLAM_DEV_CREEP_TEST: '1',
        VOLAM_INVASION_INTERVAL_SECONDS: '3',
      },
      4,
    );
    expect(prod.intervalTicks).toBe(5400);
    expect(prod.streamTicks).toBe(1800);
    expect(prod.statue.maxHp).toBe(2000);
    const dev = serverInvasionDefinition({
      NODE_ENV: 'development',
      VOLAM_DEV_CREEP_TEST: '1',
    });
    expect(dev.intervalTicks).toBe(600);
    expect(dev.streamTicks).toBe(360);
    expect(dev.waves).toHaveLength(20);
  });
});
