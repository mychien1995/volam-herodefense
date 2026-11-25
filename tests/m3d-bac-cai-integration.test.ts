import { it, expect } from 'vitest';
import {
  DungeonMatch,
  addCreep,
  BacCaiEncounter,
  NAM_DE_ID,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  chuBaThongDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  tayDocDefinition,
  namDeDefinition,
  bacCaiDefinition,
} from '@volam/game-data';
import { LobbyState, PROTOCOL_VERSION } from '@volam/game-protocol';
it('real ordered kills unlock wave20 clear/rest on arena clock without dropping existing M3D controls/state', () => {
  const c = { ...structuredClone(m1Config), creepSpawns: [], critChance: 0 };
  const m = new DungeonMatch(
    c,
    creepDungeon,
    42,
    createInvasionDefinition(180, 1000000),
    [chuBaThongDungeon],
    {
      ...structuredClone(dongTaDefinition),
      restTicks: 2,
      entryTicks: 3,
      openingTicks: 10000,
    },
    { ...structuredClone(tayDocDefinition), gateRest: 2 },
    { ...structuredClone(namDeDefinition), restTicks: 3 },
    { ...structuredClone(bacCaiDefinition), restMs: 100 },
  );
  const h = m.add('p', 'P'),
    w = m.arena.world;
  h.hp = h.maxHp = 10000;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) m.step();
  };
  const kill = (id: string) => {
    const b = w.creeps.get(id)!;
    expect(b).toBeDefined();
    for (let i = 0; i < 900 && b.invulnerable; i++) step();
    b.hp = 1;
    h.x = b.x - 35;
    h.y = b.y;
    h.fx = 1;
    h.fy = 0;
    h.moveX = h.moveY = 0;
    h.cooldown = 0;
    h.actionUntil = w.tick;
    h.statuses = [];
    expect(
      m.input(h.id, h.lastSequence + 1, { kind: 'basic' }),
    ).toBeUndefined();
    for (let i = 0; i < 90 && b.hp > 0; i++) step();
    expect(b.hp).toBe(0);
  };
  m.invasion!.wave = 5;
  step(8);
  kill('dong_ta');
  step();
  expect(m.dongTa!.phase).toBe('cleared');
  m.invasion!.wave = 10;
  step(4);
  m.invasion!.wave = 20;
  step(5);
  expect(w.bacCai).toBeUndefined();
  kill(m.tayDoc!.bossId);
  step(4);
  expect(w.namDe!.spawnCount).toBe(1);
  expect(w.bacCai).toBeUndefined();
  const last = addCreep(
    w,
    'last_wave20',
    { x: h.x + 35, y: h.y },
    m.arena.config,
  );
  last.hp = 1;
  last.controlled = true;
  last.invasion = {
    wave: 20,
    lane: 'west',
    targetId: '',
    chaseOrigin: { x: last.x, y: last.y },
    reacquireAt: 0,
    chaseRange: 100,
    aggroRestTicks: 30,
  };
  kill(NAM_DE_ID);
  step();
  expect(m.mainBosses!.defeatedBosses).toEqual([
    'dong_ta',
    'tay_doc',
    'nam_de',
  ]);
  expect(w.bacCai).toBeUndefined();
  kill(last.id);
  const clock = w.tick;
  expect(m.enter(h.id, 'shared', 'chu_ba_thong')).toBeUndefined();
  expect(m.arenaPaused).toBe(false);
  step(40);
  expect(w.tick).toBeGreaterThan(clock);
  expect(w.bacCai).toBeDefined();
  expect(m.zoneOf(h.id)?.id).toBe('arena');
  expect(w.statue!.invulnerable).toBe(true);
  expect(w.statue!.hp).toBe(1000000);
  expect(h.bossItems ?? []).toHaveLength(0);
  expect(m.invasion!.definition.intervalTicks).toBe(5400);
  const s = new LobbyState();
  expect(PROTOCOL_VERSION).toBe(49);
  expect(s.bacCai.size).toBe(0);
  expect(s.tayDoc.size).toBe(0);
  expect(s.namDeControls.size).toBe(0);
  expect(s.defense.paused).toBe(false);
});
it('M3D transient disconnect immediately breaks Bac Cai tether without changing canonical reconnect heal', () => {
  const m = new DungeonMatch(m1Config, creepDungeon, 77),
    a = m.add('a', 'A'),
    b = m.add('b', 'B'),
    w = m.arena.world,
    c = m.arena.config;
  const e = new BacCaiEncounter(structuredClone(bacCaiDefinition));
  e.initialize(w, c);
  e.phase = 'combat';
  const boss = w.creeps.get('bac_cai')!;
  boss.x = 800;
  boss.y = 780;
  a.x = 760;
  a.y = 850;
  b.x = 830;
  b.y = 850;
  for (const h of [a, b]) h.hp = h.maxHp = 10000;
  e.begin(w, c, 'tether', a);
  for (let i = 0; i < 12; i++) m.step();
  expect([...e.effects.values()].some((x) => x.kind === 'tether')).toBe(true);
  m.disconnect(a.id);
  expect([...e.effects.values()].some((x) => x.kind === 'tether')).toBe(false);
  const hp = b.hp;
  for (let i = 0; i < 30; i++) m.step();
  expect(b.hp).toBeGreaterThanOrEqual(hp);
  m.reconnect(a.id);
  expect(a.hp).toBe(a.maxHp);
  expect(m.zoneOf(a.id)?.id).toBe('arena');
  expect([...e.effects.values()].some((x) => x.kind === 'tether')).toBe(false);
});
