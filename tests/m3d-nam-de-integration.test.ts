import { describe, it, expect } from 'vitest';
import {
  DungeonMatch,
  beginNamDeCast,
  spawnNamDeIfReady,
  answerNamDe,
  addCreep,
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
} from '@volam/game-data';
import {
  PROTOCOL_VERSION,
  inputSchema,
  LobbyState,
} from '@volam/game-protocol';
function setup(chapters = true) {
  const config = {
    ...structuredClone(m1Config),
    creepSpawns: [],
    critChance: 0,
  };
  const nam = { ...structuredClone(namDeDefinition), restTicks: 3 };
  const m = new DungeonMatch(
    config,
    creepDungeon,
    42,
    createInvasionDefinition(180, 1000000),
    [chuBaThongDungeon],
    chapters
      ? {
          ...structuredClone(dongTaDefinition),
          restTicks: 2,
          entryTicks: 3,
          openingTicks: 10000,
        }
      : undefined,
    chapters
      ? { ...structuredClone(tayDocDefinition), gateRest: 2 }
      : undefined,
    nam,
  );
  const h = m.add('p', 'P');
  h.hp = h.maxHp = 10000;
  const w = m.arena.world;
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
  return { m, w, h, step, kill };
}
describe('M3D Dong Ta -> Tay Doc -> Nam De reconciliation', () => {
  it('waits for real predecessor kills and wave15 clear/rest, never respawns, keeps overlapping180s invasions', () => {
    const { m, w, h, step, kill } = setup();
    m.invasion!.wave = 5;
    step(8);
    expect(m.dongTa!.phase).toBe('fighting');
    kill('dong_ta');
    step();
    expect(m.dongTa!.phase).toBe('cleared');
    m.invasion!.wave = 10;
    step(4);
    expect(m.tayDoc!.phase).not.toBe('waiting');
    m.invasion!.wave = 15;
    step(5);
    expect(w.namDe!.phase).toBe('waiting');
    expect(w.namDe!.spawnCount).toBe(0);
    const last = addCreep(
      w,
      'last_wave15',
      { x: h.x + 35, y: h.y },
      m.arena.config,
    );
    last.hp = 1;
    last.controlled = true;
    last.invasion = {
      wave: 15,
      lane: 'west',
      targetId: '',
      chaseOrigin: { x: last.x, y: last.y },
      reacquireAt: 0,
      chaseRange: 100,
      aggroRestTicks: 30,
    };
    kill(m.tayDoc!.bossId);
    step();
    expect(m.tayDoc!.phase).toBe('dead');
    expect(w.namDe!.phase).toBe('waiting');
    kill(last.id);
    expect(w.namDe!.phase).toBe('rest');
    step(2);
    expect(w.namDe!.spawnCount).toBe(0);
    step();
    expect(w.namDe!.spawnCount).toBe(1);
    m.invasion!.nextWaveTick = m.arenaTick + 1;
    step();
    expect(m.invasion!.wave).toBe(16);
    expect(m.invasion!.nextWaveTick - m.arenaTick).toBe(5400);
    expect(w.statue!.invulnerable).toBe(true);
    expect(w.statue!.hp).toBe(1000000);
    kill(NAM_DE_ID);
    step(20);
    expect(w.namDe!.phase).toBe('defeated');
    expect(w.namDe!.spawnCount).toBe(1);
    expect(h.bossItems ?? []).toHaveLength(0);
  });
  it('continues Nam De rest and recalls all dungeon occupants when the wave boss enters', () => {
    const { m, w, h, step } = setup(false);
    m.invasion!.wave = 15;
    step();
    expect(w.namDe!.phase).toBe('rest');
    const clock = w.tick;
    expect(m.enter(h.id, 'shared', 'chu_ba_thong')).toBeUndefined();
    expect(m.arenaPaused).toBe(false);
    step(40);
    expect(w.tick).toBeGreaterThan(clock);
    expect(w.namDe!.spawnCount).toBe(1);
    expect(m.zoneOf(h.id)?.id).toBe('arena');
    expect(w.statue!.invulnerable).toBe(true);
  });
  it('cleans pending QTE through current transient disconnect/reconnect without stale input', () => {
    const { m, w, h, step } = setup(false);
    w.namDe!.phase = 'rest';
    spawnNamDeIfReady(w, m.arena.config, 0);
    m.step(); // Shared entry policy recalls before arranging the cast target.
    const b = w.creeps.get(NAM_DE_ID)!;
    b.x = 800;
    b.y = 790;
    h.x = 760;
    h.y = 790;
    w.namDe!.phase = 'idle';
    w.namDe!.nextActionAt = 1e6;
    beginNamDeCast(w, m.arena.config, 'dai_ly_phong_huyet', h.id);
    step(25);
    const q = w.namDe!.controls.get(h.id)!.qte!;
    expect(h.namDeLocked).toBe(true);
    m.disconnect(h.id);
    expect(h.namDeLocked).toBe(false);
    expect(w.namDe!.controls.size).toBe(0);
    expect(w.namDe!.effects.size).toBe(0);
    m.reconnect(h.id);
    expect(h.hp).toBe(h.maxHp);
    expect(answerNamDe(w, m.arena.config, h, q.id, 0, q.keys[0]!)).toBe(false);
  });
  it('protocol25 retains dash/move and owner-key commands without trusting success/HP', () => {
    expect(PROTOCOL_VERSION).toBe(31);
    const s = new LobbyState();
    expect(s.tayDoc.size).toBe(0);
    expect(s.namDeControls.size).toBe(0);
    expect(s.defense.paused).toBe(false);
    expect(s.defense.dongTa).toBe('');
    for (const cmd of [
      { kind: 'dash' },
      { kind: 'move', x: 1, y: 0 },
      { kind: 'nam-de-key', castId: 'nam_de_1', index: 0, key: 'up' },
    ])
      expect(
        inputSchema.safeParse({
          protocolVersion: PROTOCOL_VERSION,
          sequence: 1,
          ...cmd,
        }).success,
      ).toBe(true);
    expect(
      inputSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        kind: 'nam-de-key',
        castId: 'nam_de_1',
        index: 0,
        key: 'up',
        success: true,
        hp: 1,
      }).success,
    ).toBe(false);
  });
});
