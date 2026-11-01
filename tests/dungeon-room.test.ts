import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { Client, type Room } from '@colyseus/sdk';
import { CloseCode } from '@colyseus/core';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
import {
  creepDungeon,
  desertDungeon,
  desertRoster,
  forestRoster,
} from '@volam/game-data';

let server: ColyseusTestServer;
const previousLegacy = process.env['VOLAM_DEV_LEGACY_SKILLS'];
const client = new Client('http://localhost:2568');
const sequences = new Map<string, number>();
const next = (room: Room<MatchRoom>) => {
  const value = (sequences.get(room.sessionId) ?? 0) + 1;
  sequences.set(room.sessionId, value);
  return value;
};
beforeAll(async () => {
  process.env['VOLAM_DEV_LEGACY_SKILLS'] = '1';
  server = await boot(createGameServer(), 2568);
});
afterEach(async () => {
  await server.cleanup();
  sequences.clear();
});
afterAll(async () => {
  if (previousLegacy === undefined)
    delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  else process.env['VOLAM_DEV_LEGACY_SKILLS'] = previousLegacy;
  await server.shutdown();
});
async function join(count = 2) {
  const a = await client.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'A',
    protocolVersion: PROTOCOL_VERSION,
  });
  const rooms = [a];
  for (let i = 1; i < count; i++)
    rooms.push(
      await client.joinById<MatchRoom>(a.roomId, {
        nickname: `Hero ${i}`,
        protocolVersion: PROTOCOL_VERSION,
      }),
    );
  await Promise.all(
    rooms.map((r) =>
      expect.poll(() => r.state?.players?.has(r.sessionId)).toBe(true),
    ),
  );
  a.send('lobby-action', { action: 'start' });
  for (const room of rooms) {
    await expect.poll(() => room.state.phase).toBe('SCHOOL_SELECTION');
    room.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    room.send('lobby-action', { action: 'confirm' });
  }
  for (const room of rooms)
    await expect.poll(() => room.state.phase).toBe('IN_GAME');
  const authority = server.getRoomById<MatchRoom>(a.roomId);
  return { rooms, authority };
}
async function enter(
  room: Room<MatchRoom>,
  authority: MatchRoom,
  access: 'private' | 'shared',
) {
  expect(authority.simulation.zoneOf(room.sessionId)?.access).toBe('arena');
  room.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(room),
    action: 'enter',
    access,
  });
  await expect
    .poll(() => room.state.players.get(room.sessionId)?.zoneId)
    .not.toBe('arena');
}
async function exit(room: Room<MatchRoom>, authority: MatchRoom) {
  Object.assign(authority.simulation.hero(room.sessionId)!, creepDungeon.exit);
  room.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(room),
    action: 'exit',
  });
  await expect
    .poll(() => room.state.players.get(room.sessionId)?.zoneId)
    .toBe('arena');
}

describe('M2A real Colyseus zone authority and views', () => {
  it('syncs desert server identities and isolates destination/private views with physical return', async () => {
    const {
      rooms: [a, b],
      authority,
    } = await join();
    a!.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      action: 'enter',
      access: 'shared',
      destination: 'desert',
    });
    b!.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(b!),
      action: 'enter',
      access: 'private',
      destination: 'desert',
    });
    await expect
      .poll(() => a!.state.players.get(a!.sessionId)?.zoneId)
      .toBe('desert_shared');
    await expect
      .poll(() => b!.state.players.get(b!.sessionId)?.zoneId)
      .toBe(`desert_private_${b!.sessionId}`);
    await expect.poll(() => [...a!.state.creeps.values()].length).toBe(6);
    expect([...a!.state.creeps.values()].map((c) => c.archetypeId)).toEqual(
      desertRoster,
    );
    expect(
      [...a!.state.creeps.values()].every((c) => c.zoneId === 'desert_shared'),
    ).toBe(true);
    expect(
      [...b!.state.creeps.values()].every(
        (c) => c.zoneId === `desert_private_${b!.sessionId}`,
      ),
    ).toBe(true);
    const far = a!.waitForMessage('command-rejected');
    a!.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      action: 'exit',
    });
    expect((await far).reason).toContain('Space');
    Object.assign(authority.simulation.hero(a!.sessionId)!, desertDungeon.exit);
    a!.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      action: 'exit',
    });
    await expect
      .poll(() => a!.state.players.get(a!.sessionId)?.zoneId)
      .toBe('arena');
    await expect.poll(() => a!.state.creeps.size).toBe(0);
    expect(authority.simulation.hero(a!.sessionId)).toMatchObject(
      desertDungeon.arenaReturn,
    );
  });
  it('rejects dungeon travel before the match starts without creating a hero or instance', async () => {
    const room = await client.create<MatchRoom>(MATCH_ROOM, {
      nickname: 'Waiting',
      protocolVersion: PROTOCOL_VERSION,
    });
    await expect
      .poll(() => room.state?.players?.has(room.sessionId))
      .toBe(true);
    const rejected = room.waitForMessage('command-rejected');
    room.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(room),
      action: 'enter',
      access: 'private',
    });
    expect((await rejected).reason).toContain('chưa bắt đầu');
    const authority = server.getRoomById<MatchRoom>(room.roomId);
    expect(authority.simulation.membership.size).toBe(0);
    expect(authority.simulation.zones.size).toBe(1);
    expect(room.state.tick).toBe(0);
  });
  it('allows menu entry from spawn, validates alive/arena and exit distance, and ignores replayed travel', async () => {
    const {
      rooms: [a, b],
      authority,
    } = await join();
    const hero = authority.simulation.hero(a!.sessionId)!;
    hero.hp = 0;
    const rejected = a!.waitForMessage('command-rejected');
    a!.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      action: 'enter',
      access: 'private',
    });
    expect((await rejected).reason).toContain('còn sống');
    expect(authority.simulation.zones.size).toBe(1);
    hero.hp = hero.maxHp;
    await enter(a!, authority, 'private');
    const zone = authority.simulation.zoneOf(a!.sessionId)!;
    const far = a!.waitForMessage('command-rejected');
    a!.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      action: 'exit',
    });
    expect((await far).reason).toContain('Space');
    expect(authority.simulation.zoneOf(a!.sessionId)).toBe(zone);
    const style = a!.waitForMessage('command-rejected');
    a!.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      kind: 'select-basic',
      id: 'cai_bang_chuong',
    });
    expect((await style).reason).toContain('đấu trường');
    await exit(a!, authority);
    expect(authority.simulation.hero(a!.sessionId)!).toMatchObject(
      creepDungeon.arenaReturn,
    );
    a!.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      action: 'enter',
      access: 'private',
    });
    await expect.poll(() => b!.state.tick).toBeGreaterThan(a!.state.tick + 1);
    expect(authority.simulation.zoneOf(a!.sessionId)!.id).toBe('arena');
  });
  it('sends shared enemies/combat to both occupants and hides them from an arena observer', async () => {
    const {
      rooms: [a, b, c],
      authority,
    } = await join(3);
    await enter(a!, authority, 'shared');
    await enter(b!, authority, 'shared');
    const zone = authority.simulation.zoneOf(a!.sessionId)!;
    expect(authority.simulation.zoneOf(b!.sessionId)).toBe(zone);
    await expect.poll(() => a!.state.creeps.size).toBe(6);
    const firstForestTypes = forestRoster;
    await expect
      .poll(() => [...a!.state.creeps.values()].map((c) => c.archetypeId))
      .toEqual(firstForestTypes);
    await expect
      .poll(() => [...b!.state.creeps.values()].map((c) => c.archetypeId))
      .toEqual(firstForestTypes);
    expect([...zone.world.creeps.values()].map((c) => c.archetypeId)).toEqual(
      firstForestTypes,
    );
    await expect
      .poll(() =>
        [...b!.state.creeps.values()].every((e) => e.zoneId === zone.id),
      )
      .toBe(true);
    expect(
      [...c!.state.creeps.values()].every((e) => e.zoneId === 'arena'),
    ).toBe(true);
    expect(a!.state.creeps.has('creep_0')).toBe(false);
    const leaked: unknown[] = [];
    c!.onMessage('combat-event', (e) => leaked.push(e));
    const enemy = [...zone.world.creeps.values()][0]!;
    enemy.hp = 1;
    const hero = authority.simulation.hero(a!.sessionId)!;
    Object.assign(hero, {
      x: enemy.x - 24,
      y: enemy.y,
      fx: 1,
      fy: 0,
      cooldown: zone.world.tick,
    });
    const hit = b!.waitForMessage('combat-event');
    a!.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      kind: 'basic',
    });
    expect((await hit).zoneId).toBe(zone.id);
    await expect
      .poll(() => a!.state.players.get(a!.sessionId)!.gold)
      .toBeGreaterThan(0);
    await expect
      .poll(() => [...b!.state.creeps.values()].find((e) => e.hp === 0)?.hp)
      .toBe(0);
    expect(c!.state.players.get(c!.sessionId)!.gold).toBe(0);
    expect(leaked).toEqual([]);
  });
  it('isolates two private dungeon snapshots, projectiles, events, rewards and pause/resume state', async () => {
    const {
      rooms: [a, b],
      authority,
    } = await join();
    await enter(a!, authority, 'private');
    await enter(b!, authority, 'private');
    const za = authority.simulation.zoneOf(a!.sessionId)!,
      zb = authority.simulation.zoneOf(b!.sessionId)!;
    expect(za.id).not.toBe(zb.id);
    await expect.poll(() => a!.state.dungeons.has(zb.id)).toBe(false);
    await expect
      .poll(() =>
        [...a!.state.creeps.keys()].every((id) => id.startsWith(za.id + ':')),
      )
      .toBe(true);
    expect(
      [...b!.state.creeps.keys()].every((id) => id.startsWith(zb.id + ':')),
    ).toBe(true);
    expect(b!.state.dungeons.has(za.id)).toBe(false);
    expect(b!.state.players.get(a!.sessionId)!.x).not.toBe(
      authority.simulation.hero(a!.sessionId)!.x,
    );
    const observed: unknown[] = [];
    b!.onMessage('combat-event', (e) => observed.push(e));
    const enemy = [...za.world.creeps.values()][0]!;
    enemy.hp = 1;
    Object.assign(authority.simulation.hero(a!.sessionId)!, {
      x: enemy.x - 24,
      y: enemy.y,
      fx: 1,
      fy: 0,
      cooldown: za.world.tick,
    });
    a!.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      kind: 'basic',
    });
    await expect
      .poll(() => a!.state.players.get(a!.sessionId)!.xp)
      .toBeGreaterThan(0);
    expect(b!.state.players.get(b!.sessionId)!.xp).toBe(0);
    expect([...zb.world.creeps.values()][0]!.hp).toBe(zb.config.creep.hp);
    expect(observed).toEqual([]);
    Object.assign(authority.simulation.hero(a!.sessionId)!, { x: 340, y: 240 });
    a!.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      kind: 'cast',
      slot: 0,
    });
    await expect
      .poll(() => a!.state.projectiles.size, { interval: 10 })
      .toBeGreaterThan(0);
    expect(
      [...a!.state.projectiles.values()].every((p) => p.zoneId === za.id),
    ).toBe(true);
    expect(b!.state.projectiles.size).toBe(0);
    expect(zb.world.projectiles.size).toBe(0);
    expect(observed).toEqual([]);
    const survivor = [...za.world.creeps.values()][1]!;
    survivor.hp = 77;
    await exit(a!, authority);
    expect(za.world.projectiles.size).toBe(0);
    expect(za.world.shots).toHaveLength(0);
    const tick = za.world.tick,
      hp = survivor.hp,
      position = { x: survivor.x, y: survivor.y };
    const activeTick = authority.simulation.tick;
    await expect
      .poll(() => authority.simulation.tick)
      .toBeGreaterThan(activeTick + 8);
    expect(za.world.tick).toBe(tick);
    expect(survivor.hp).toBe(hp);
    expect(survivor).toMatchObject(position);
    await expect.poll(() => a!.state.dungeons.get(za.id)?.paused).toBe(true);
    await enter(a!, authority, 'private');
    expect(authority.simulation.zoneOf(a!.sessionId)).toBe(za);
    await expect.poll(() => za.world.tick).toBeGreaterThan(tick);
    expect(survivor.hp).toBe(77);
  });
  it('rejects forged instance IDs instead of letting a client join another private world', async () => {
    const {
      rooms: [a, b],
      authority,
    } = await join();
    await enter(a!, authority, 'private');
    const closed = new Promise<number>((resolve) => b!.onLeave.once(resolve));
    Reflect.apply(b!.send, b!, [
      'dungeon-action',
      {
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        action: 'enter',
        access: 'private',
        instanceId: authority.simulation.zoneOf(a!.sessionId)!.id,
      },
    ]);
    expect(await closed).toBe(CloseCode.WITH_ERROR);
    expect(authority.simulation.zoneOf(a!.sessionId)!.world.heroes.size).toBe(
      1,
    );
  });
  it('projects Hong Liet v04 cues to both occupants, isolates private state, and clears a disconnected empty encounter', async () => {
    const {
      rooms: [a, b, c],
      authority,
    } = await join(3);
    for (const room of [a!, b!])
      room.send('dungeon-action', {
        protocolVersion: PROTOCOL_VERSION,
        sequence: next(room),
        action: 'enter',
        access: 'shared',
        destination: 'hong_liet',
      });
    for (const room of [a!, b!])
      await expect
        .poll(() => room.state.players.get(room.sessionId)?.zoneId)
        .toBe('hong_liet_shared');
    const z = authority.simulation.zoneOf(a!.sessionId)!,
      e = z.encounter!;
    e.clear(z.world);
    e.begin(
      z.world,
      z.config,
      'hoa_phao_thien_la',
      authority.simulation.hero(a!.sessionId)!,
    );
    for (const room of [a!, b!])
      await expect
        .poll(
          () =>
            [...room.state.bossEffects.values()].filter(
              (cue) => cue.kind === 'cannon',
            ).length,
        )
        .toBe(16);
    const geometry = (room: Room<MatchRoom>) =>
      [...room.state.bossEffects.values()]
        .filter((cue) => cue.kind === 'line')
        .map((cue) => [cue.x, cue.y, cue.fx, cue.fy, cue.length, cue.activeAt]);
    expect(geometry(a!)).toEqual(geometry(b!));
    expect(geometry(a!)).toHaveLength(8);
    expect(c!.state.bossEffects.size).toBe(0);
    const pulsesA: Array<{
        kind: string;
        abilityId: string;
        targetId?: string;
      }> = [],
      pulsesB: typeof pulsesA = [];
    a!.onMessage('combat-event', (message) => pulsesA.push(message));
    b!.onMessage('combat-event', (message) => pulsesB.push(message));
    await expect
      .poll(
        () =>
          pulsesA.some(
            (p) => p.kind === 'pulse' && p.abilityId === 'hoa_phao_thien_la',
          ),
        { timeout: 4000 },
      )
      .toBe(true);
    await expect
      .poll(
        () =>
          pulsesB.some(
            (p) => p.kind === 'pulse' && p.abilityId === 'hoa_phao_thien_la',
          ),
        { timeout: 4000 },
      )
      .toBe(true);
    await expect
      .poll(() =>
        [...a!.state.bossEffects.values()].some(
          (cue) => cue.kind === 'projectile',
        ),
      )
      .toBe(true);
    c!.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(c!),
      action: 'enter',
      access: 'private',
      destination: 'hong_liet',
    });
    await expect
      .poll(() => c!.state.players.get(c!.sessionId)?.zoneId)
      .toBe(`hong_liet_private_${c!.sessionId}`);
    expect(
      [...c!.state.creeps.values()].every(
        (enemy) => enemy.zoneId === `hong_liet_private_${c!.sessionId}`,
      ),
    ).toBe(true);
    expect(
      [...c!.state.bossEffects.values()].every(
        (cue) => cue.zoneId === `hong_liet_private_${c!.sessionId}`,
      ),
    ).toBe(true);
    e.clear(z.world);
    e.begin(
      z.world,
      z.config,
      'thiet_ky_trieu_binh',
      authority.simulation.hero(a!.sessionId)!,
    );
    await expect
      .poll(
        () =>
          [...a!.state.creeps.values()].some(
            (m) => m.archetypeId === 'mongol_infantry',
          ),
        { timeout: 3000 },
      )
      .toBe(true);
    const minion = [...z.world.creeps.values()].find(
      (m) => m.archetypeId === 'mongol_infantry',
    )!;
    minion.hp = 1;
    Object.assign(authority.simulation.hero(a!.sessionId)!, {
      x: minion.x - 20,
      y: minion.y,
      fx: 1,
      fy: 0,
    });
    a!.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(a!),
      kind: 'basic',
    });
    await expect
      .poll(
        () =>
          pulsesA.some(
            (p) => p.kind === 'death' && p.targetId === `${z.id}:${minion.id}`,
          ),
        { timeout: 2000 },
      )
      .toBe(true);
    // Start another long-lived grid to verify the final disconnect cancels it.
    e.clear(z.world);
    e.begin(
      z.world,
      z.config,
      'hoa_phao_thien_la',
      authority.simulation.hero(a!.sessionId)!,
    );
    b!.connection.close();
    await expect
      .poll(() => authority.simulation.zoneOf(b!.sessionId))
      .toBeUndefined();
    expect(z.world.heroes.size).toBe(1);
    expect(e.effects.size).toBeGreaterThan(0);
    await a!.leave();
    await expect.poll(() => e.effects.size).toBe(0);
    expect(
      [...z.world.creeps.values()].some((m) =>
        m.archetypeId?.startsWith('mongol_'),
      ),
    ).toBe(false);
    expect(z.world.creeps.get(e.bossId)!.castAbilityId).toBe('');
  });
});
