import { it, expect } from 'vitest';
import { DungeonMatch, insideEllipse } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  coMoDungeon,
  dongTaDefinition,
  createInvasionDefinition,
} from '@volam/game-data';
function setup() {
  const base = structuredClone(m1Config);
  base.creepSpawns = [];
  base.spawn = { x: 1400, y: 1000 };
  const d = structuredClone(dongTaDefinition);
  d.restTicks = 2;
  d.entryTicks = 3;
  d.retryTicks = 3;
  d.openingTicks = 10000;
  const m = new DungeonMatch(
    base,
    creepDungeon,
    42,
    createInvasionDefinition(180, 1000000),
    [coMoDungeon],
    d,
  );
  m.add('a', 'A');
  m.add('b', 'B');
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) m.step();
  };
  return { m, d, step };
}
it('retains dungeon-only exterior pause, but a cleared wave5 still approaches and recalls everybody', () => {
  const { m, step } = setup();
  expect(m.enter('a', 'shared', 'co_mo')).toBeUndefined();
  expect(m.enter('b', 'shared', 'co_mo')).toBeUndefined();
  expect(m.arenaPaused).toBe(true);
  const tick = m.arena.world.tick;
  step(2);
  expect(m.arena.world.tick).toBe(tick);
  m.invasion!.wave = 5;
  expect(m.arenaPaused).toBe(false);
  step(8);
  expect(m.dongTa!.phase).toBe('fighting');
  expect(m.zoneOf('a')?.id).toBe('arena');
  expect(m.zoneOf('b')?.id).toBe('arena');
  const before = m.arenaTick;
  step(4);
  expect(m.arenaTick).toBe(before + 4);
});
it('wave recall revives a boss-dungeon spectator without refreshing its retained dungeon life ledger', () => {
  const { m, step } = setup();
  m.enter('b', 'shared', 'co_mo');
  step();
  const h = m.hero('b')!;
  const dungeon = m.zoneOf('b')!,
    life = m.party.life(dungeon, 'b');
  life.revivalUsed = true;
  life.eliminated = true;
  h.hp = 0;
  h.bossSpectator = true;
  m.invasion!.wave = 5;
  step(8);
  expect(m.zoneOf('b')?.id).toBe('arena');
  expect(h.hp).toBeGreaterThan(0);
  expect(h.bossSpectator).toBe(false);
  expect(m.party.life(dungeon, 'b')).toEqual({
    revivalUsed: true,
    eliminated: true,
  });
  expect(
    m.input('b', h.lastSequence + 1, { kind: 'move', x: 1, y: 0 }),
  ).toBeUndefined();
});
it('reconnect during Đông Tà lands inside the locked court and offline heroes cannot prevent a wipe', () => {
  const { m, d, step } = setup();
  m.invasion!.wave = 5;
  step(8);
  m.disconnect('b');
  m.reconnect('b');
  expect(insideEllipse(m.hero('b')!, d.bounds, m.base.radius)).toBe(true);
  m.disconnect('b');
  m.hero('a')!.hp = 0;
  step();
  expect(m.dongTa!.phase).toBe('retry');
  step(4);
  expect(m.dongTa!.attempt).toBe(2);
});
it('rejects an actual Nhân Kiếm recast outside the court without spending its projectile or a second cost', () => {
  const { m, d, step } = setup();
  m.invasion!.wave = 5;
  step(8);
  const h = m.hero('a')!;
  h.schoolId = 'vo_dang';
  h.skillIds = ['nhan_kiem_hop_nhat', '', '', ''];
  Object.assign(h, { x: 1100, y: 616, fx: 1, fy: 0 });
  expect(m.input('a', 1, { kind: 'cast', slot: 0 })).toBeUndefined();
  step(10);
  const shot = [...m.arena.world.projectiles.values()].find(
    (p) => p.ownerId === 'a' && p.abilityId === 'nhan_kiem_hop_nhat',
  )!;
  expect(shot).toBeDefined();
  expect(insideEllipse(shot, d.bounds, m.base.radius)).toBe(false);
  const mana = h.mana,
    cooldown = h.skillCooldowns[0],
    position = { x: h.x, y: h.y };
  m.input('a', 2, { kind: 'cast', slot: 0 });
  step();
  expect(insideEllipse(h, d.bounds, m.base.radius)).toBe(true);
  expect({ x: h.x, y: h.y }).toEqual(position);
  expect(m.arena.world.projectiles.has(shot.id)).toBe(true);
  expect(h.mana - mana).toBeLessThanOrEqual(
    m.base.manaRegen / m.base.tickRate + 0.001,
  );
  expect(h.skillCooldowns[0]).toBe(cooldown);
});
