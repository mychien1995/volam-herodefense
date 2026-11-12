import { describe, expect, it } from 'vitest';
import {
  addCreep,
  DungeonMatch,
  emptyInventory,
  experienceAtLevel,
  gainExperience,
  initializeProgression,
  loiDai,
} from '@volam/game-core';
import {
  campaignDefinition,
  createInvasionDefinition,
  creepDungeon,
  m1Config,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';

function fixture() {
  const config = { ...m1Config, campaign: campaignDefinition };
  const match = new DungeonMatch(
    config,
    creepDungeon,
    42,
    createInvasionDefinition(180, 100_000, { portalCount: 4 }),
  );
  for (const id of ['red', 'blue', 'watcher']) {
    const hero = match.add(id, id);
    initializeProgression(hero, config, 'fixed', 'cai_bang_bong');
  }
  const level = (id: string) =>
    gainExperience(match.hero(id)!, experienceAtLevel(6, config), config);
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) match.step();
  };
  const takeGate = (id: string) => {
    const h = match.hero(id)!;
    h.x = loiDai.spawn.x;
    h.y = loiDai.spawn.y;
    expect(
      match.input(id, h.lastSequence + 1, { kind: 'move', x: 0, y: -1 }),
    ).toBeUndefined();
    steps(10);
  };
  return { match, level, takeGate, steps };
}

describe('Lôi Đài', () => {
  it('reaches the wide south corners without walking through the rails', () => {
    const { match, level, takeGate, steps } = fixture();
    for (const id of ['red', 'blue']) {
      level(id);
      expect(match.enterLoiDai(id)).toBeUndefined();
      takeGate(id);
    }
    const walk = (id: string, x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const hero = match.hero(id)!;
        match.input(id, hero.lastSequence + 1, { kind: 'move', x, y });
        steps(1);
      }
    };
    for (const [id, sign] of [
      ['red', -1],
      ['blue', 1],
    ] as const) {
      walk(id, 0, 1, 30);
      walk(id, sign, 0, 80);
      const hero = match.hero(id)!;
      expect(hero.y).toBeGreaterThan(315);
      const inset = sign < 0 ? hero.x : loiDai.width - hero.x;
      expect(inset).toBeLessThan(130);
      expect(inset).toBeGreaterThan(106);
      walk(id, -sign, 0, 25);
      walk(id, 0, -1, 36);
      walk(id, sign, 0, 60);
      expect(hero.y).toBeLessThan(185);
      expect(sign < 0 ? hero.x : loiDai.width - hero.x).toBeGreaterThan(145);
      walk(id, 0, 0, 1);
    }
  });

  it('requires level six and restores the arena resources and remaining cooldowns', () => {
    const { match, level, steps } = fixture();
    expect(match.enterLoiDai('red')).toContain('cấp 6');
    level('red');
    const hero = match.hero('red')!;
    hero.inventory = emptyInventory();
    hero.inventory.levels.weapon = 5;
    hero.inventory.potions.hp_small = 3;
    hero.inventory.potionReadyAt = 50;
    hero.dragonBonus = 0.2;
    hero.hp = 64;
    hero.mana = 19;
    hero.cooldown = 13;
    hero.skillCooldowns[0] = 37;
    hero.abilityCooldowns = { hoa_van_chuong: 37 };
    hero.chargeCooldowns = { a: [22, 53] };
    hero.dashRechargeAt = 29;
    expect(match.enterLoiDai('red')).toBeUndefined();
    expect(match.hero('red')!.hp).toBe(match.hero('red')!.maxHp);
    expect(match.hero('red')!.inventory).toBeUndefined();
    expect(match.hero('red')!.dragonBonus).toBeUndefined();
    expect(match.canEnterDungeon('red')).toBe(false);
    expect(
      match.modifyBuild('red', 11, 0, { action: 'upgrade-slot', slot: 0 }),
    ).toContain('Không thể');
    steps(90);
    expect(match.exitLoiDai('red')).toBeUndefined();
    const restored = match.hero('red')!;
    const now = match.arena.world.tick;
    expect(restored).toMatchObject({
      hp: 64,
      mana: 19,
      dragonBonus: 0.2,
      cooldown: now + 13,
      lastSequence: 11,
      dashRechargeAt: now + 29,
      abilityCooldowns: { hoa_van_chuong: now + 37 },
      chargeCooldowns: { a: [now + 22, now + 53] },
      inventory: {
        potionReadyAt: 140,
        levels: { weapon: 5 },
        potions: { hp_small: 3 },
      },
    });
    expect(restored.skillCooldowns[0]).toBe(now + 37);
  });

  it('allows only two fighters and resets the winner and loser on the same gate timer', () => {
    const { match, level, takeGate, steps } = fixture();
    for (const id of ['red', 'blue', 'watcher']) {
      level(id);
      expect(match.enterLoiDai(id)).toBeUndefined();
    }
    expect(match.input('watcher', 1, { kind: 'cast', slot: 0 })).toContain(
      'hai đấu thủ',
    );
    takeGate('red');
    takeGate('blue');
    takeGate('watcher');
    const { world, config } = match.duel.zone;
    const red = match.hero('red')!;
    const blue = match.hero('blue')!;
    const watcher = match.hero('watcher')!;
    expect([...match.duel.fighters]).toEqual(['red', 'blue']);
    expect(hurt(world, watcher, 'red', 'test', 999, config)).toBe(false);
    expect(hurt(world, red, 'watcher', 'test', 999, config)).toBe(false);
    red.x = blue.x - 20;
    red.y = blue.y;
    red.fx = 1;
    expect(
      match.input('red', red.lastSequence + 1, { kind: 'basic' }),
    ).toBeUndefined();
    steps(8);
    expect(blue.hp).toBeLessThan(blue.maxHp);
    expect(watcher.hp).toBe(watcher.maxHp);
    red.hp = 49;
    red.mana = 20;
    red.skillCooldowns[0] = world.tick + 100;
    expect(hurt(world, blue, 'red', 'test', 9999, config)).toBe(true);
    match.step();
    expect(red.hp).toBe(red.maxHp);
    expect(red.mana).toBe(red.maxMana);
    expect(red.skillCooldowns[0]).toBe(world.tick);
    expect(
      match.events.filter(({ event }) => event.abilityId === 'loi_dai_victory'),
    ).toHaveLength(1);
    const deadline = match.tick + loiDai.restSeconds * config.tickRate;
    expect(match.duel.gateAt).toBe(deadline);
    expect(match.duel.respawns.get('blue')).toBe(deadline);
    takeGate('watcher');
    expect(match.duel.fighters.has('watcher')).toBe(false);
    steps(deadline - match.tick - 1);
    expect(blue.hp).toBe(0);
    expect(match.duel.fighters.size).toBe(1);
    match.step();
    expect(blue.hp).toBe(blue.maxHp);
    expect(blue.mana).toBe(blue.maxMana);
    expect(blue.y).toBe(loiDai.spawn.y);
    expect(blue.skillCooldowns[0]).toBe(world.tick - 1);
    takeGate('watcher');
    expect(match.duel.fighters.has('watcher')).toBe(true);
    expect(match.exitLoiDai('red')).toBeUndefined();
    expect(match.duel.fighters.size).toBe(1);
  });

  it('pauses arena and retains boss/creep HP only while all connected players are in Lôi Đài', () => {
    const { match, level, steps } = fixture();
    const { world, config } = match.arena;
    const creep = addCreep(world, 'wave-active', { x: 300, y: 300 }, config);
    creep.hp = 51;
    const boss = addCreep(world, 'boss-active', { x: 520, y: 500 }, config);
    boss.waveBossActor = true;
    boss.hp = 77;
    for (const id of ['red', 'blue', 'watcher']) level(id);
    expect(match.enterLoiDai('red')).toBeUndefined();
    expect(match.arenaPaused).toBe(false);
    expect(match.enterLoiDai('blue')).toBeUndefined();
    expect(match.enterLoiDai('watcher')).toBeUndefined();
    const tick = world.tick;
    const wave = match.invasion!.nextWaveTick;
    steps(300);
    expect(match.arenaPaused).toBe(true);
    expect(world.tick).toBe(tick);
    expect(match.duel.zone.world.tick).toBe(300);
    expect(match.invasion!.nextWaveTick).toBe(wave);
    expect(world.creeps.get(creep.id)?.hp).toBe(51);
    expect(world.creeps.get(boss.id)?.hp).toBe(77);
    expect(match.exitLoiDai('watcher')).toBeUndefined();
    match.step();
    expect(match.arenaPaused).toBe(false);
    expect(world.tick).toBe(tick + 1);
    expect(world.creeps.get(creep.id)?.hp).toBe(51);
    expect(world.creeps.get(boss.id)?.hp).toBe(77);
  });
});
