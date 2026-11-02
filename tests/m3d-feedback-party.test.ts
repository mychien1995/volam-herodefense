import { describe, expect, it } from 'vitest';
import { DungeonMatch, characterStats } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  hongLietDungeon,
  kimLuanDungeon,
  chuBaThongDungeon,
  coMoDungeon,
  createInvasionDefinition,
} from '@volam/game-data';

const bosses = [
  hongLietDungeon,
  kimLuanDungeon,
  chuBaThongDungeon,
  coMoDungeon,
];
function setup() {
  const config = structuredClone(m1Config);
  config.creepSpawns = [];
  const m = new DungeonMatch(
    config,
    structuredClone(creepDungeon),
    42,
    createInvasionDefinition(3, 1_000_000),
    structuredClone(bosses),
  );
  for (const id of ['a', 'b']) {
    const h = m.add(id, id);
    h.hp = h.maxHp = 1_000_000;
  }
  return m;
}
function steps(m: DungeonMatch, count: number) {
  for (let n = 0; n < count; n++) m.step();
}
function exit(m: DungeonMatch, id: string) {
  Object.assign(m.hero(id)!, m.zoneOf(id)!.dungeon!.exit);
  expect(m.exit(id)).toBeUndefined();
}

describe('M3D approved boss party lifecycle', () => {
  it('enforces private creep/shared boss access and snapshots buffed speed with one identity per wave', () => {
    const m = setup(),
      h = m.hero('a')!;
    h.statuses = [
      {
        kind: 'speed_buff',
        sourceId: 'a',
        abilityId: 'test',
        until: 9999,
        durationTicks: 9999,
        magnitude: 0.4,
      },
    ];
    const speed = characterStats(h, m.base, 0).total.movementSpeed;
    expect(m.enter('a', 'shared', 'forest')).toBeUndefined();
    expect(m.enter('b', 'shared', 'forest')).toBeUndefined();
    const z = m.zoneOf('a')!;
    expect(z.access).toBe('private');
    expect(z).not.toBe(m.zoneOf('b'));
    expect(z.config.creep.speed).toBeCloseTo(speed * 0.9);
    const types = () =>
      new Set([...z.world.creeps.values()].map((c) => c.archetypeId));
    expect(types().size).toBe(1);
    const first = [...types()][0];
    z.world.creeps.forEach((c) => (c.hp = 0));
    steps(m, z.dungeon!.restTicks + 1);
    expect(types().size).toBe(1);
    expect([...types()][0]).not.toBe(first);
    expect(z.config.creep.speed).toBeCloseTo(speed * 0.9);
    exit(m, 'a');
    exit(m, 'b');
    m.enter('a', 'private', 'hong_liet');
    m.enter('b', 'private', 'hong_liet');
    expect(m.zoneOf('a')).toBe(m.zoneOf('b'));
    expect(m.zoneOf('a')!.access).toBe('shared');
  });

  it('freezes live exterior actors, shots, statue and clocks only while everyone occupies the SAME boss', () => {
    const m = setup();
    steps(m, 91);
    const exterior = m.arena.world;
    expect(exterior.creeps.size).toBeGreaterThan(0);
    m.enter('a', 'shared', 'hong_liet');
    expect(m.arenaPaused).toBe(false);
    m.enter('b', 'shared', 'kim_luan');
    expect(m.arenaPaused).toBe(false);
    exit(m, 'b');
    m.enter('b', 'shared', 'hong_liet');
    expect(m.arenaPaused).toBe(true);
    const before = JSON.stringify({
      tick: exterior.tick,
      creeps: [...exterior.creeps],
      shots: [...exterior.projectiles],
      statue: exterior.statue,
      wave: m.invasion!.wave,
      next: m.invasion!.nextWaveTick,
      arenaTick: m.arenaTick,
    });
    const bossTick = m.zoneOf('a')!.world.tick,
      globalTick = m.tick;
    steps(m, 30);
    expect(m.tick).toBe(globalTick + 30);
    expect(m.zoneOf('a')!.world.tick).toBe(bossTick + 30);
    expect(
      JSON.stringify({
        tick: exterior.tick,
        creeps: [...exterior.creeps],
        shots: [...exterior.projectiles],
        statue: exterior.statue,
        wave: m.invasion!.wave,
        next: m.invasion!.nextWaveTick,
        arenaTick: m.arenaTick,
      }),
    ).toBe(before);
    exit(m, 'b');
    expect(m.arenaPaused).toBe(false);
    m.step();
    expect(exterior.tick).toBe(JSON.parse(before).tick + 1);
  });

  it('uses recipient-scoped 30s realtime invitations, rejects stale replies and excludes occupants', () => {
    const m = setup();
    m.enter('a', 'shared', 'hong_liet');
    m.summonHelp('a', 1000);
    const first = m.party.invitations.get('b')!;
    expect(first.expiresAtMs).toBe(31_000);
    expect(m.party.invitations.has('a')).toBe(false);
    m.summonHelp('a', 2000);
    expect(m.replyInvitation('b', first.id, true, 2001)).toContain('hết hạn');
    const second = m.party.invitations.get('b')!;
    expect(m.replyInvitation('b', second.id, true, 2002)).toBeUndefined();
    expect(m.arenaPaused).toBe(true);
    m.summonHelp('a', 3000);
    expect(m.party.invitations.size).toBe(0);
    exit(m, 'b');
    m.summonHelp('a', 4000);
    const third = m.party.invitations.get('b')!;
    expect(m.replyInvitation('b', third.id, false, 4001)).toBeUndefined();
    expect(m.zoneOf('b')!.id).toBe('arena');
    m.summonHelp('a', 5000);
    m.step(35_000);
    expect(m.party.invitations.size).toBe(0);
    expect(m.replyInvitation('b', third.id, true, 35_001)).toContain('hết hạn');
  });

  it.each(bosses.map((d) => d.id))(
    'retains one revival per attempt across exit/re-entry/reconnect: %s',
    (destination) => {
      const m = setup();
      m.enter('a', 'shared', destination);
      const z = m.zoneOf('a')!,
        h = m.hero('a')!;
      h.hp = 0;
      m.step();
      expect(m.party.life(z, 'a').revivalUsed).toBe(true);
      steps(m, m.base.tickRate * 5 - 1);
      expect(h.hp).toBe(0);
      m.step();
      expect(m.zoneOf('a')).toBe(z);
      expect(h.hp).toBe(h.maxHp);
      expect(h.mana).toBe(h.maxMana);
      expect(h.x).toBe(z.dungeon!.spawn.x);
      exit(m, 'a');
      m.enter('a', 'shared', destination);
      expect(m.party.life(z, 'a').revivalUsed).toBe(true);
      m.disconnect('a');
      expect(z.world.heroes.has('a')).toBe(false);
      expect(m.party.disconnected.has('a')).toBe(true);
      m.reconnect('a');
      expect(m.zoneOf('a')!.id).toBe('arena');
      m.enter('a', 'shared', destination);
      h.hp = 0;
      m.step();
      expect(h.bossSpectator).toBe(true);
      expect(m.respawns.has('a')).toBe(false);
      expect(m.input('a', 100, { kind: 'basic' })).toContain('quan chiến');
      expect(m.exit('a')).toBeUndefined();
      expect(h.hp).toBe(h.maxHp);
      m.enter('a', 'shared', destination);
      expect(h.bossSpectator).toBe(true);
      expect(h.hp).toBe(0);
      m.disconnect('a');
      m.reconnect('a');
      m.enter('a', 'shared', destination);
      expect(h.bossSpectator).toBe(true);
      m.exit('a');
      const attempt = m.party.attempt(z);
      steps(m, m.base.tickRate * 30 + 1);
      m.enter('a', 'shared', destination);
      expect(m.party.attempt(z)).toBeGreaterThan(attempt);
      expect(m.party.life(z, 'a')).toEqual({
        revivalUsed: false,
        eliminated: false,
      });
      expect(h.bossSpectator).toBe(false);
      h.hp = 0;
      m.step();
      expect(h.bossSpectator).toBe(false);
      expect(m.respawns.has('a')).toBe(true);
    },
  );
});
