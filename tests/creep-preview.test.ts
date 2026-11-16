import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { DungeonMatch, blocked } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  createInvasionDefinition,
  creepProfiles,
  creepCombatDefinition,
} from '@volam/game-data';
import {
  PROTOCOL_VERSION,
  creepPreviewActionSchema,
} from '@volam/game-protocol';
import { CreepPreviewSession } from '../apps/game-server/src/creep-preview.js';
import { startRoomTestServer } from './room-test-server.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';

function sandbox() {
  const match = new DungeonMatch(
    structuredClone({ ...m1Config, creepCombat: creepCombatDefinition }),
    creepDungeon,
    42,
    createInvasionDefinition(),
  );
  match.add('h', 'Preview');
  const preview = new CreepPreviewSession(match);
  preview.beforeStep();
  return { match, preview, w: match.arena.world, c: match.arena.config };
}
it('selects exactly one of all 49 identities, clears old hazards, and uses legal arena positions', () => {
  const { preview, w, c } = sandbox();
  let sequence = 0;
  for (const id of Object.keys(creepProfiles)) {
    expect(
      preview.action({ action: 'select', id, sequence: ++sequence }),
    ).toBeUndefined();
    expect(w.creeps.size).toBe(1);
    const e = [...w.creeps.values()][0]!;
    expect(e.archetypeId).toBe(id);
    expect(e.stats!.xp).toBe(0);
    expect(blocked(e, c.creep.radius, c.width, c.height, c.collision)).toBe(
      false,
    );
    expect(
      blocked(w.heroes.get('h')!, c.radius, c.width, c.height, c.collision),
    ).toBe(false);
    expect(w.creepCombat!.effects.size).toBe(0);
  }
});
it('isolates normal-only/stationary options and replay rejection from canonical profiles', () => {
  const { preview, w, c } = sandbox();
  preview.action({
    action: 'options',
    basicOnly: true,
    stationary: true,
    autoHeal: false,
    sequence: 2,
  });
  expect(c.creepCombat!.profiles.wave_02!.special).toBeUndefined();
  expect(creepProfiles.wave_02!.special).toBeDefined();
  expect([...w.creeps.values()][0]!.stats!.speed).toBe(0);
  preview.action({ action: 'select', id: 'wave_15', sequence: 1 });
  expect(preview.view.id).toBe('wave_02');
  expect(
    preview.action({ action: 'select', id: 'unknown', sequence: 3 }),
  ).toContain('không hợp lệ');
  expect(w.creeps.size).toBe(1);
});
it('suppresses timed invasions while retaining real hits, slow, and recovery', () => {
  const { preview, match, w } = sandbox();
  preview.action({ action: 'select', id: 'truc_xa', sequence: 1 });
  let hit = false,
    slow = false;
  for (let i = 0; i < 800; i++) {
    preview.beforeStep();
    match.step();
    hit ||= w.events.some((e) => e.kind === 'hit' && e.targetId === 'h');
    slow ||=
      w.heroes.get('h')!.statuses?.some((s) => s.kind === 'slow') ?? false;
  }
  expect(match.invasion!.wave).toBe(0);
  expect(w.creeps.size).toBe(1);
  expect(hit).toBe(true);
  expect(slow).toBe(true);
  expect(w.heroes.get('h')!.hp).toBeGreaterThan(9900);
});
it('schedules the real death explosion and clears it on reset', () => {
  const { preview, match, w } = sandbox();
  preview.action({ action: 'select', id: 'hell_dung_nham_linh', sequence: 1 });
  preview.action({ action: 'death', sequence: 2 });
  preview.beforeStep();
  match.step();
  expect(
    [...w.creepCombat!.effects.values()].some(
      (e) =>
        e.abilityId === 'creep_hell_dung_nham_linh_death' && e.radius === 144,
    ),
  ).toBe(true);
  preview.action({ action: 'reset', sequence: 3 });
  expect(w.creepCombat!.effects.size).toBe(0);
  expect([...w.creeps.values()][0]!.hp).toBe(10000);
});
it('strictly validates preview messages', () => {
  expect(
    creepPreviewActionSchema.safeParse({
      action: 'select',
      id: 'wave_02',
      sequence: 1,
      damage: 999,
    }).success,
  ).toBe(false);
  expect(
    creepPreviewActionSchema.safeParse({
      action: 'options',
      basicOnly: true,
      stationary: false,
      autoHeal: true,
      sequence: 1,
    }).success,
  ).toBe(true);
});

let server: Awaited<ReturnType<typeof startRoomTestServer>>;
const previous = process.env['VOLAM_DEV_CREEP_TEST'];
beforeAll(async () => {
  process.env['VOLAM_DEV_CREEP_TEST'] = '1';
  server = await startRoomTestServer();
});
afterEach(async () => {
  await server?.cleanup();
});
afterAll(async () => {
  await server?.shutdown();
  if (previous === undefined) delete process.env['VOLAM_DEV_CREEP_TEST'];
  else process.env['VOLAM_DEV_CREEP_TEST'] = previous;
});
it('requires the server test flag and refuses preview creation in production', async () => {
  const old = process.env['NODE_ENV'];
  try {
    process.env['NODE_ENV'] = 'production';
    const client = server.sdk;
    await expect(
      client.create('match', {
        nickname: 'Denied',
        protocolVersion: PROTOCOL_VERSION,
        creepPreview: true,
      }),
    ).rejects.toThrow('VOLAM_DEV_CREEP_TEST');
  } finally {
    if (old === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = old;
  }
});
it('only the confirmed host can select; peers share state and ordinary rooms are untouched', async () => {
  const client = server.sdk;
  const a = await client.create<MatchRoom['state']>('match', {
    nickname: 'Host',
    protocolVersion: PROTOCOL_VERSION,
    creepPreview: true,
  });
  const b = await client.joinById<MatchRoom['state']>(a.roomId, {
    nickname: 'Peer',
    protocolVersion: PROTOCOL_VERSION,
  });
  a.onMessage('*', () => {});
  b.onMessage('*', () => {});
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  a.send('creep-preview-action', {
    action: 'select',
    id: 'wave_15',
    sequence: 1,
  });
  for (const r of [a, b]) {
    r.send('lobby-action', { action: 'select', schoolId: 'vo_dang' });
    r.send('lobby-action', { action: 'branch', basicId: 'vo_dang_kiem' });
    r.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  await expect.poll(() => a.state.creeps.size).toBe(1);
  expect(JSON.parse(a.state.defense.creepPreview).id).toBe('wave_02');
  b.send('creep-preview-action', {
    action: 'select',
    id: 'wave_15',
    sequence: 99,
  });
  a.send('creep-preview-action', {
    action: 'select',
    id: 'truc_xa',
    sequence: 2,
  });
  await expect
    .poll(() => JSON.parse(b.state.defense.creepPreview).id)
    .toBe('truc_xa');
  const real = server.getRoomById<MatchRoom>(a.roomId);
  expect([...real.world.creeps.values()][0]!.archetypeId).toBe('truc_xa');
  expect([...real.world.heroes.values()].every((h) => !h.invulnerable)).toBe(
    true,
  );
  const normal = await client.create<MatchRoom['state']>('match', {
    nickname: 'Normal',
    protocolVersion: PROTOCOL_VERSION,
  });
  normal.onMessage('*', () => {});
  normal.send('creep-preview-action', {
    action: 'select',
    id: 'wave_15',
    sequence: 1,
  });
  await expect.poll(() => normal.state.defense.devCreepTest).toBe(true);
  expect(normal.state.defense.creepPreview).toBe('');
  expect(
    server.getRoomById<MatchRoom>(normal.roomId).simulation.invasion!
      .nextWaveTick,
  ).toBe(600);
  await Promise.all([a.leave(), b.leave(), normal.leave()]);
});
