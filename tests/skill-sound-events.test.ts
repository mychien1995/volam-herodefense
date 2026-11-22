import { describe, expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  changeBuild,
  createWorld,
  initializeProgression,
  stepWorld,
  submitInput,
  nguDoc,
  duongMon,
  type CombatEvent,
  type Command,
  type SimulationConfig,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';

function trial(school: string, branch: string) {
  const config: SimulationConfig = {
    ...m1Config,
    collision: [],
    creepSpawns: [],
    spawn: { x: 700, y: 600 },
    creep: {
      ...m1Config.creep,
      speed: 0,
      detectionRange: 0,
      damage: 0,
      hp: 100000,
    },
  };
  const world = createWorld(config, 42);
  const hero = addHero(world, 'self', 'SFX', config);
  hero.schoolId = school;
  hero.level = 30;
  expect(initializeProgression(hero, config, 'fixed', branch)).toBe(true);
  for (let slot = 0; slot < 5; slot++)
    expect(
      changeBuild(world, hero, config, hero.progression!.revision, {
        action: 'upgrade-slot',
        slot,
      }),
    ).toBeUndefined();
  const events: CombatEvent[] = [];
  const step = (count = 1) => {
    for (let i = 0; i < count; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const send = (command: Command) => {
    submitInput(world, hero.id, hero.lastSequence + 1, command);
    step();
  };
  return { config, world, hero, events, step, send };
}

describe('server-owned skill presentation cues', () => {
  it('emits eight storm batches at their actual releases, rather than one cue per 124 projectiles', () => {
    const { send, events, step } = trial(duongMon.school, duongMon.amKhi);
    send({ kind: 'cast', slot: 4 });
    const cast = events.find((e) => e.kind === 'cast')!;
    expect(events.filter((e) => e.kind === 'pulse')).toEqual([]);
    step(60);
    const batches = events.filter(
      (e) => e.kind === 'pulse' && e.abilityId === duongMon.storm,
    );
    expect(batches.map((e) => e.stage)).toEqual([
      'slow_knives',
      ...Array(6).fill('poison_knives'),
      'water',
    ]);
    expect(batches.map((e) => e.tick! - cast.tick!)).toEqual([
      9, 25, 27, 29, 31, 33, 35, 48,
    ]);
  });

  it('emits six knife releases even if there is nothing to hit, and none after owner death', () => {
    const alive = trial(duongMon.school, duongMon.amKhi);
    alive.send({ kind: 'cast', slot: 1 });
    alive.step(25);
    expect(
      alive.events.filter(
        (e) => e.kind === 'pulse' && e.abilityId === duongMon.knives,
      ),
    ).toHaveLength(6);
    const dead = trial(duongMon.school, duongMon.amKhi);
    dead.send({ kind: 'cast', slot: 4 });
    dead.hero.hp = 0;
    dead.step(60);
    expect(
      dead.events.filter(
        (e) => e.kind === 'pulse' && e.abilityId === duongMon.storm,
      ),
    ).toEqual([]);
  });

  it('opens Âm Phong once after its nine-tick windup, with no invented target hit', () => {
    const { send, events, step } = trial(nguDoc.school, nguDoc.taiHiep);
    send({ kind: 'cast', slot: 4 });
    const cast = events.find((e) => e.kind === 'cast')!;
    step(160);
    const opening = events.filter(
      (e) => e.kind === 'pulse' && e.abilityId === nguDoc.hands,
    );
    expect(opening).toHaveLength(1);
    expect(opening[0]!.tick! - cast.tick!).toBe(9);
    expect(events.filter((e) => e.kind === 'hit')).toEqual([]);
  });

  it('marks a real projectile contact and returns a missed grub without an attach cue', () => {
    const hit = trial(nguDoc.school, nguDoc.coSu);
    addCreep(
      hit.world,
      'target',
      { x: hit.hero.x + 100, y: hit.hero.y },
      hit.config,
    );
    hit.send({ kind: 'cast', slot: 2 });
    hit.step(100);
    const phases = hit.events
      .filter(
        (e) =>
          e.abilityId === nguDoc.mark &&
          ['attached', 'detonate', 'return'].includes(e.stage ?? ''),
      )
      .map((e) => e.stage);
    expect(phases).toEqual(['attached', 'detonate', 'return']);
    const miss = trial(nguDoc.school, nguDoc.coSu);
    miss.send({ kind: 'cast', slot: 2 });
    miss.step(40);
    expect(
      miss.events
        .filter((e) => e.abilityId === nguDoc.mark && e.stage)
        .map((e) => e.stage),
    ).toEqual(['return']);
  });

  it('cues reflected poison on an actual incoming hit and stays silent for R or periodic damage', () => {
    const { world, hero, config, send } = trial(nguDoc.school, nguDoc.taiHiep);
    send({ kind: 'cast', slot: 3 });
    expect(world.events.some((e) => e.abilityId === nguDoc.counter)).toBe(
      false,
    );
    const foe = addCreep(
      world,
      'attacker',
      { x: hero.x + 50, y: hero.y },
      config,
    );
    const nonCrit = { critChance: 0, critMultiplier: 1 };
    hurt(world, hero, foe.id, 'incoming', 31, config, nonCrit);
    expect(
      world.events.filter(
        (e) => e.abilityId === nguDoc.counter && e.stage === 'reflected',
      ),
    ).toHaveLength(1);
    hurt(world, hero, foe.id, 'burn', 5, config, {
      ...nonCrit,
      periodic: true,
    });
    expect(
      world.events.filter(
        (e) => e.abilityId === nguDoc.counter && e.stage === 'reflected',
      ),
    ).toHaveLength(1);
  });
});
