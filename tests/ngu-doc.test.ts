import { describe, expect, it } from 'vitest';
import { hurt } from '../packages/game-core/src/combat.js';
import {
  addCreep,
  addHero,
  changeBuild,
  characterStats,
  createWorld,
  DungeonMatch,
  hasStatus,
  initializeProgression,
  nguDoc,
  nguDocSummons,
  stepWorld,
  submitInput,
  transactMerchant,
  type Command,
  type Hero,
  type SimulationConfig,
  type World,
} from '@volam/game-core';
import {
  creepDungeon,
  desertDungeon,
  economyTrial,
  m1Config,
} from '@volam/game-data';

function setupConfig(): SimulationConfig {
  return {
    ...m1Config,
    collision: [],
    creepSpawns: [],
    spawn: { x: 700, y: 600 },
    creep: {
      ...m1Config.creep,
      hp: 8500,
      speed: 0,
      damage: 0,
      detectionRange: 0,
    },
  };
}
function learn(
  hero: Hero,
  world: World,
  config: SimulationConfig,
  branch: string,
  extraW = 0,
) {
  hero.schoolId = nguDoc.school;
  hero.level = 30;
  expect(initializeProgression(hero, config, 'fixed', branch)).toBe(true);
  for (const slot of [0, 1, 2, 3, 4, ...Array<number>(extraW).fill(1)]) {
    expect(
      changeBuild(world, hero, config, hero.progression!.revision, {
        action: 'upgrade-slot',
        slot,
      }),
    ).toBeUndefined();
  }
}
function trial(branch: string, seed = 42, extraW = 0) {
  const config = setupConfig();
  const world = createWorld(config, seed);
  const hero = addHero(world, 'owner', 'Ngũ Độc', config);
  learn(hero, world, config, branch, extraW);
  const step = (ticks = 1) => {
    for (let i = 0; i < ticks; i++) stepWorld(world, config);
  };
  const send = (command: Command) => {
    submitInput(world, hero.id, hero.lastSequence + 1, command);
    step();
  };
  const cast = (slot: number) => send({ kind: 'cast', slot });
  const target = (id: string, dx: number, dy = 0) =>
    addCreep(world, id, { x: hero.x + dx, y: hero.y + dy }, config);
  return { config, world, hero, step, send, cast, target };
}
const nonCrit = { critChance: 0, critMultiplier: 1 };

describe('Ngũ Độc trong mô phỏng có thẩm quyền', () => {
  it('Q changes outgoing A on toggle, applies independent poison and slow only after a hit', () => {
    const { config, world, hero, step, cast, send, target } = trial(
      nguDoc.taiHiep,
    );
    const creep = target('creep', 124);
    cast(0);
    expect(hasStatus(hero, 'ngu_doc_palm', world.tick)).toBe(true);
    send({ kind: 'basic' });
    const shot = [...world.projectiles.values()][0]!;
    expect(shot.stage).toBe('ngu_doc_toxic');
    expect(shot.vy).toBe(0);
    step(10);
    expect(creep.nguDocVenom).toHaveLength(1);
    expect(hasStatus(creep, 'slow', world.tick)).toBe(true);
    const hp = creep.hp;
    step(config.tickRate);
    expect(creep.hp).toBeLessThan(hp);
    cast(0);
    expect(hasStatus(hero, 'ngu_doc_palm', world.tick)).toBe(false);
    send({ kind: 'basic' });
    expect(
      [...world.projectiles.values()].some((p) => p.stage === 'ngu_doc_toxic'),
    ).toBe(false);
  });

  it('W chooses a boss in range and remains fixed, E follows while active, T makes one direct beat plus poison', () => {
    const { world, hero, step, cast, send, target } = trial(nguDoc.taiHiep);
    const boss = target('boss', 171);
    boss.encounterBoss = true;
    target('creep', 50);
    cast(1);
    expect(world.areas?.find((a) => a.abilityId === nguDoc.pool)).toMatchObject(
      { x: boss.x, y: boss.y },
    );
    const hp = boss.hp;
    step(24);
    expect(boss.hp).toBeLessThan(hp);
    cast(2);
    const aura = world.areas!.find((a) => a.abilityId === nguDoc.aura)!;
    const oldX = aura.x;
    send({ kind: 'move', x: 1, y: 0 });
    step(7);
    expect(aura.x).toBe(hero.x);
    expect(aura.x).toBeGreaterThan(oldX);
    expect(world.areas?.find((a) => a.abilityId === nguDoc.pool)?.x).toBe(
      boss.x,
    );
    cast(2);
    expect(world.areas?.some((a) => a.abilityId === nguDoc.aura)).toBe(false);
    send({ kind: 'move', x: 0, y: 0 });
    const next = target('new_target', 35);
    cast(4);
    expect(next.nguDocVenom).toBeUndefined();
    step(9);
    expect(
      next.nguDocVenom?.some((dot) => dot.abilityId === nguDoc.hands),
    ).toBe(true);
    step(121);
    expect(
      next.nguDocVenom?.some((dot) => dot.abilityId === nguDoc.hands),
    ).toBe(false);
    const expiredHp = next.hp;
    step(31);
    expect(next.hp).toBe(expiredHp);
  });

  it('Âm Phong Thực Cốt reaches 180 units for five seconds and hits late entrants once', () => {
    const { world, step, cast, target } = trial(nguDoc.taiHiep);
    const center = target('center', 35);
    const edge = target('edge', 200);
    const late = target('late', 260);
    const outsideHp = late.hp;
    cast(4);
    const area = world.areas?.find((a) => a.abilityId === nguDoc.hands)!;
    expect(area.effect.radius).toBe(180);
    expect(area.until - world.tick).toBe(150);
    step(9);
    expect(center.hp).toBeLessThan(center.maxHp);
    expect(edge.hp).toBeLessThan(edge.maxHp);
    step(105);
    expect(late.hp).toBe(outsideHp);
    late.x = area.x + 166;
    step(18);
    expect(late.hp).toBeLessThan(outsideHp);
    const struckHp = late.hp;
    step(18);
    expect(struckHp - late.hp).toBeLessThan(outsideHp - struckHp);
    expect(area.hitIds?.filter((id) => id === late.id)).toHaveLength(1);
    expect(world.areas?.includes(area)).toBe(false);
  });

  it('Vô Hình Độc adds defense and responds silently to real incoming hits, not pressing R or periodics', () => {
    const { config, world, hero, cast, target } = trial(nguDoc.taiHiep);
    const before = characterStats(hero, config).total.defense;
    expect(
      characterStats(hero, config).sources.temporary.defense,
    ).toBeGreaterThan(0);
    cast(3);
    expect(world.events.some((e) => e.abilityId === nguDoc.counter)).toBe(
      false,
    );
    const foe = target('attacker', 50);
    const idle = target('other', 54);
    expect(hurt(world, hero, foe.id, 'incoming', 31, config, nonCrit)).toBe(
      true,
    );
    expect(foe.nguDocVenom?.[0]?.abilityId).toBe(nguDoc.counter);
    expect(hasStatus(foe, 'slow', world.tick)).toBe(true);
    hurt(world, hero, idle.id, 'burn', 5, config, {
      ...nonCrit,
      periodic: true,
    });
    expect(idle.nguDocVenom).toBeUndefined();
    expect(characterStats(hero, config).total.defense).toBe(before);
  });

  it('Vạn Cổ launches a boss-prioritized fan and Tâm Hình Cổ detonates 90 ticks after contact, stuns and heals', () => {
    const { config, world, hero, step, cast, target } = trial(nguDoc.coSu);
    const boss = target('boss', 0, -170);
    boss.encounterBoss = true;
    const near = target('near', 90);
    cast(0);
    expect(world.projectiles.size).toBe(4);
    expect([...world.projectiles.values()].every((p) => p.vy < 0)).toBe(true);
    hero.hp = 220;
    cast(2);
    for (let i = 0; i < 12 && !world.nguDocMarks?.length; i++) step();
    const mark = world.nguDocMarks?.[0]!;
    expect(mark.targetId).toBe(near.id);
    expect(mark.until - world.tick).toBe(3 * config.tickRate);
    const hp = near.hp;
    step(3 * config.tickRate - 1);
    expect(near.hp).toBe(hp);
    const ownerHp = hero.hp;
    step();
    expect(near.hp).toBeLessThan(hp);
    expect(hasStatus(near, 'stun', world.tick)).toBe(true);
    expect(hero.hp).toBeGreaterThan(ownerHp + 5);
    expect(world.events).toContainEqual(
      expect.objectContaining({
        abilityId: nguDoc.mark,
        stage: 'return',
        targetId: hero.id,
      }),
    );
  });

  it('returns Tâm Hình Cổ on early death or a missed shot without detonation', () => {
    const marked = trial(nguDoc.coSu);
    const victim = marked.target('victim', 102);
    const neighbor = marked.target('neighbor', 138, 28);
    marked.cast(2);
    marked.step(10);
    expect(marked.world.nguDocMarks).toHaveLength(1);
    hurt(
      marked.world,
      victim,
      marked.hero.id,
      'test',
      100_000,
      marked.config,
      nonCrit,
    );
    marked.step();
    expect(marked.world.nguDocMarks).toEqual([]);
    expect(marked.world.events).toContainEqual(
      expect.objectContaining({
        abilityId: nguDoc.mark,
        stage: 'return',
        targetId: marked.hero.id,
        x: victim.x,
        y: victim.y,
      }),
    );
    expect(neighbor.hp).toBe(neighbor.maxHp);

    const missed = trial(nguDoc.coSu);
    missed.cast(2);
    const stages: string[] = [];
    for (let i = 0; i < 40; i++) {
      missed.step();
      stages.push(
        ...missed.world.events
          .filter((e) => e.abilityId === nguDoc.mark && e.stage)
          .map((e) => e.stage!),
      );
    }
    expect(stages).toEqual(['return']);
    expect(missed.world.projectiles.size).toBe(0);
  });

  it('Thần Chết follows a walking owner with continuous positive steps', () => {
    const { world, hero, step, cast, send } = trial(nguDoc.coSu);
    cast(4);
    const reaper = [...nguDocSummons(world)][0]!;
    for (let i = 0; i < 75; i++) {
      const x = reaper.x;
      send({ kind: 'move', x: 1, y: 0 });
      if (i < 35) continue;
      expect(reaper.pose).toBe('walk');
      expect(reaper.x - x).toBeGreaterThan(3);
    }
    send({ kind: 'move', x: 0, y: 0 });
    step(75);
    expect(reaper.pose).toBe('idle');
    expect(Math.abs(reaper.x - hero.x - 48)).toBeLessThan(6);
  });

  it.each([1, 2, 3, 4])(
    'Yêu Cổ calls %i cương thi and normal attacks proc zombies independently of pressing R',
    (rank) => {
      const { world, hero, step, cast, send } = trial(
        nguDoc.coSu,
        12,
        rank - 1,
      );
      cast(1);
      const minions = [...nguDocSummons(world)];
      expect(minions.map((m) => m.kind)).toEqual(Array(rank).fill('jiangshi'));
      expect(minions[0]!.maxHp).toBe(86 + 23 * (rank - 1));
      expect(minions[0]!.damage).toBe(14 + 4 * (rank - 1));
      expect(minions.every((m) => m.ownerId === hero.id)).toBe(true);
      cast(3);
      expect([...nguDocSummons(world)].some((m) => m.kind === 'zombie')).toBe(
        false,
      );
      for (
        let i = 0;
        i < 45 && ![...nguDocSummons(world)].some((m) => m.kind === 'zombie');
        i++
      ) {
        send({ kind: 'basic' });
        step(24);
      }
      expect([...nguDocSummons(world)].some((m) => m.kind === 'zombie')).toBe(
        true,
      );
    },
  );

  it('equipped ranks increase poison, passive defense, the mark, zombie chance and Reaper stats', () => {
    function upgrade(t: ReturnType<typeof trial>, slots: number[]) {
      for (const slot of slots)
        for (let rank = 1; rank < 4; rank++)
          expect(
            changeBuild(
              t.world,
              t.hero,
              t.config,
              t.hero.progression!.revision,
              { action: 'upgrade-slot', slot },
            ),
          ).toBeUndefined();
    }
    const playTaiHiep = (maxRank: boolean) => {
      const t = trial(nguDoc.taiHiep);
      if (maxRank) upgrade(t, [0, 3]);
      const enemy = t.target('attacker', 114);
      t.cast(0);
      t.send({ kind: 'basic' });
      t.step(10);
      hurt(t.world, t.hero, enemy.id, 'incoming', 30, t.config, nonCrit);
      return {
        palm:
          enemy.nguDocVenom?.find((dot) => dot.abilityId === nguDoc.palm)
            ?.damage ?? 0,
        counter:
          enemy.nguDocVenom?.find((dot) => dot.abilityId === nguDoc.counter)
            ?.damage ?? 0,
        defense: characterStats(t.hero, t.config).total.defense,
      };
    };
    const lowTaiHiep = playTaiHiep(false);
    const highTaiHiep = playTaiHiep(true);
    expect(highTaiHiep.palm).toBeGreaterThan(lowTaiHiep.palm);
    expect(highTaiHiep.counter).toBeGreaterThan(lowTaiHiep.counter);
    expect(highTaiHiep.defense).toBeGreaterThan(lowTaiHiep.defense);

    const playCoSu = (maxRank: boolean) => {
      const t = trial(nguDoc.coSu);
      if (maxRank) upgrade(t, [2, 3, 4]);
      const enemy = t.target('target', 114);
      t.cast(2);
      t.step(105);
      const markDamage = enemy.maxHp - enemy.hp;
      t.world.random = () => 0.2;
      t.send({ kind: 'basic' });
      const zombie = [...nguDocSummons(t.world)].some(
        (minion) => minion.kind === 'zombie',
      );
      t.cast(4);
      const reaper = [...nguDocSummons(t.world)].find(
        (minion) => minion.kind === 'reaper',
      )!;
      return { markDamage, zombie, reaper };
    };
    const lowCoSu = playCoSu(false);
    const highCoSu = playCoSu(true);
    expect(highCoSu.markDamage).toBeGreaterThan(lowCoSu.markDamage);
    expect(lowCoSu.zombie).toBe(false);
    expect(highCoSu.zombie).toBe(true);
    expect(highCoSu.reaper.maxHp).toBeGreaterThan(lowCoSu.reaper.maxHp);
    expect(highCoSu.reaper.damage).toBeGreaterThan(lowCoSu.reaper.damage);
  });

  it('Thần Chết uses AoE sweeps, poison waves and a stunning slam', () => {
    const { world, step, cast, target } = trial(nguDoc.coSu);
    const primary = target('primary', 111);
    const secondary = target('secondary', 123, 23);
    cast(4);
    const hits = new Map<string, Set<string>>();
    let sawSlow = false;
    let sawStun = false;
    for (let tick = 0; tick < 320; tick++) {
      step();
      sawSlow ||= hasStatus(secondary, 'slow', world.tick);
      sawStun ||= hasStatus(secondary, 'stun', world.tick);
      for (const event of world.events) {
        if (event.kind !== 'hit' || !event.targetId) continue;
        const victims = hits.get(event.abilityId) ?? new Set<string>();
        victims.add(event.targetId);
        hits.set(event.abilityId, victims);
      }
    }
    expect(hits.get(nguDoc.reaperSweep)).toEqual(
      new Set([primary.id, secondary.id]),
    );
    expect(hits.get(nguDoc.reaperWave)?.has(primary.id)).toBe(true);
    expect(hits.get(nguDoc.reaperSlam)).toEqual(
      new Set([primary.id, secondary.id]),
    );
    expect(sawSlow && sawStun).toBe(true);
  });

  it('Thần Chết keeps identity and missing HP through Forest → arena → Desert → death → arena', () => {
    const config = setupConfig();
    const match = new DungeonMatch(config, creepDungeon, 4, undefined, [
      desertDungeon,
    ]);
    const hero = match.add('owner', 'Âm Linh');
    learn(hero, match.arena.world, config, nguDoc.coSu);
    expect(match.enter(hero.id, 'private')).toBeUndefined();
    const forest = match.zoneOf(hero.id)!;
    match.input(hero.id, 1, { kind: 'cast', slot: 4 });
    match.step();
    const summon = [...nguDocSummons(forest.world)][0]!;
    expect(summon.kind).toBe('reaper');
    const attacker = [...forest.world.creeps.values()][0]!;
    hurt(
      forest.world,
      summon,
      attacker.id,
      'incoming',
      45,
      forest.config,
      nonCrit,
    );
    const hp = summon.hp;
    expect(hp).toBeLessThan(summon.maxHp);
    Object.assign(hero, forest.dungeon!.exit);
    expect(match.exit(hero.id)).toBeUndefined();
    expect([...nguDocSummons(forest.world)]).toHaveLength(0);
    expect([...nguDocSummons(match.arena.world)][0]).toBe(summon);
    expect(match.enter(hero.id, 'private', desertDungeon.id)).toBeUndefined();
    const desert = match.zoneOf(hero.id)!;
    expect([...nguDocSummons(desert.world)][0]).toBe(summon);
    expect(summon.hp).toBe(hp);
    const foe = [...desert.world.creeps.values()][0]!;
    hurt(
      desert.world,
      hero,
      foe.id,
      'incoming',
      hero.maxHp * 10,
      desert.config,
      nonCrit,
    );
    expect(hero.hp).toBe(0);
    match.step();
    expect([...nguDocSummons(desert.world)][0]?.id).toBe(summon.id);
    for (
      let i = 0;
      i < desertDungeon.respawnTicks + 6 &&
      match.zoneOf(hero.id) !== match.arena;
      i++
    )
      match.step();
    expect(match.zoneOf(hero.id)).toBe(match.arena);
    expect([...nguDocSummons(match.arena.world)][0]).toBe(summon);
    expect(summon.hp).toBeGreaterThan(0);
    expect(summon.hp).toBeLessThan(summon.maxHp);
  });

  it('equipment transaction updates summons already alive, retaining their health fraction', () => {
    const config = { ...setupConfig(), economy: economyTrial };
    const match = new DungeonMatch(config, creepDungeon);
    const hero = match.add('owner', 'Âm Linh');
    const world = match.arena.world;
    learn(hero, world, config, nguDoc.coSu);
    match.input(hero.id, 1, { kind: 'cast', slot: 4 });
    match.step();
    const summon = [...nguDocSummons(world)][0]!;
    const before = {
      hp: summon.maxHp,
      damage: summon.damage,
      defense: summon.defense,
    };
    summon.hp *= 0.5;
    hero.gold = 1_000;
    for (const slot of ['weapon', 'armor', 'hat'] as const)
      expect(
        transactMerchant(
          hero,
          config,
          { inArena: true, matchTick: match.tick, worldTick: world.tick },
          hero.inventory?.revision ?? 0,
          { action: 'buy-basic', slot },
        ),
      ).toBeUndefined();
    match.step();
    expect(summon.maxHp).toBeGreaterThan(before.hp);
    expect(summon.damage).toBeGreaterThan(before.damage);
    expect(summon.defense).toBeGreaterThan(before.defense);
    expect(summon.hp / summon.maxHp).toBeCloseTo(0.5);
  });
});
