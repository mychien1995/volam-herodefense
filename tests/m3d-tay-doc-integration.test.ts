import { describe, it, expect } from 'vitest';
import { DungeonMatch, addCreep } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  createInvasionDefinition,
  dongTaDefinition,
  tayDocDefinition,
} from '@volam/game-data';

function setup() {
  const config = {
    ...structuredClone(m1Config),
    creepSpawns: [],
    collision: [],
    critChance: 0,
  };
  const dong = {
    ...structuredClone(dongTaDefinition),
    restTicks: 2,
    entryTicks: 3,
    openingTicks: 10000,
  };
  const tay = { ...structuredClone(tayDocDefinition), gateRest: 8 };
  const m = new DungeonMatch(
    config,
    creepDungeon,
    42,
    createInvasionDefinition(180, 1000000),
    [],
    dong,
    tay,
  );
  const h = m.add('p', 'P'),
    w = m.arena.world;
  h.hp = h.maxHp = 10000;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) m.step();
  };
  return { m, h, w, step };
}
describe('M3D Dong Ta -> Tay Doc integration', () => {
  it('requires actual Dong Ta defeat and wave10 clear/rest; keeps statue and clock rules', () => {
    const { m, h, w, step } = setup();
    m.invasion!.wave = 5;
    step(8);
    expect(m.dongTa!.phase).toBe('fighting');
    const dong = w.creeps.get('dong_ta')!;
    dong.hp = 1;
    h.x = dong.x - 35;
    h.y = dong.y;
    h.fx = 1;
    h.fy = 0;
    expect(m.input(h.id, 1, { kind: 'basic' })).toBeUndefined();
    for (let i = 0; i < 60 && m.dongTa!.phase !== 'cleared'; i++) step();
    expect(m.dongTa!.phase).toBe('cleared');
    expect(m.tayDocGate.dongTaDefeated).toBe(true);
    expect(m.tayDoc!.phase).toBe('waiting');
    expect(w.statue!.invulnerable).toBe(false);
    expect(m.arena.config.heroBounds).toBeUndefined();
    m.invasion!.wave = 10;
    const creep = addCreep(
      w,
      'wave10_remaining',
      { x: h.x + 35, y: h.y },
      m.arena.config,
    );
    creep.hp = 1;
    creep.controlled = true;
    creep.invasion = {
      wave: 10,
      lane: 'west',
      targetId: '',
      chaseOrigin: { x: creep.x, y: creep.y },
      reacquireAt: 0,
      chaseRange: 100,
      aggroRestTicks: 30,
    };
    step(30);
    expect(m.tayDocGate.readyAt).toBeUndefined();
    expect(m.tayDoc!.phase).toBe('waiting');
    expect(m.input(h.id, 2, { kind: 'basic' })).toBeUndefined();
    for (let i = 0; i < 60 && creep.hp > 0; i++) step();
    expect(creep.hp).toBe(0);
    expect(m.tayDocGate.readyAt).toBe(w.tick + 8);
    step(7);
    expect(m.tayDoc!.phase).toBe('waiting');
    step();
    expect(m.tayDoc!.phase).toBe('enter');
    const boss = w.creeps.get(m.tayDoc!.bossId)!;
    expect(boss.x).toBeGreaterThanOrEqual(80);
    expect(boss.x).toBeLessThan(90);
    expect(boss.y).toBe(616);
    expect(m.invasion!.definition.intervalTicks).toBe(5400);
    expect(w.statue!.hp).toBe(1000000);
    expect(w.statue!.invulnerable).toBe(true);
    expect(m.waveArenaView()?.bossId).toBe('tay_doc');
    expect(m.dongTa!.phase).toBe('cleared');
    expect(m.tayDocGate.spawned).toBe(true);
  });
  it('settles a selected mark on arena disconnect without affecting the canonical reconnect heal or causing stale damage', () => {
    const { m, h, w, step } = setup();
    const e = m.tayDoc!;
    e.spawn(w, m.arena.config);
    e.phase = 'phase1';
    e.nextActionAt = Infinity;
    e.marks.set(h.id, {
      id: 'disconnect-mark',
      targetId: h.id,
      at: w.tick,
      until: w.tick + 100,
    });
    const max = h.maxHp;
    m.disconnect(h.id);
    expect(h.hp).toBe(max * 0.75);
    expect(e.marks.size).toBe(0);
    m.reconnect(h.id);
    expect(h.hp).toBe(max);
    step(110);
    expect(e.marks.size).toBe(0);
    expect(h.hp).toBe(max);
  });
});
