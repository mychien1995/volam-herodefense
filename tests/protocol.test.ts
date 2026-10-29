import { describe, expect, it } from 'vitest';
import {
  lobbyConfig,
  lobbyConfigSchema,
  inputBindings,
} from '@volam/game-data';
import {
  joinOptionsSchema,
  connectionCheckSchema,
  connectionAckSchema,
  LobbyState,
  LobbyPlayer,
  PROTOCOL_VERSION,
} from '@volam/game-protocol';

describe('validated M0 data and protocol', () => {
  it('preserves the six-player cap and canonical controls', () => {
    expect(lobbyConfig.maxPlayers).toBe(6);
    expect(
      lobbyConfigSchema.safeParse({ ...lobbyConfig, maxPlayers: 7 }).success,
    ).toBe(false);
    expect(inputBindings).toEqual({
      movement: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
      basicAttack: 'KeyA',
      activeSkills: ['KeyQ', 'KeyW', 'KeyE', 'KeyR'],
    });
  });
  it('normalizes Vietnamese nicknames to NFC and trims whitespace', () => {
    const nickname = 'Võ Lâm';
    expect(
      joinOptionsSchema.parse({
        nickname: `  ${nickname.normalize('NFD')}  `,
        protocolVersion: 1,
      }).nickname,
    ).toBe(nickname);
  });
  it.each(['', '    ', 'x'.repeat(21), '<script>', 'a\nb', 'a\u200bb'])(
    'rejects malformed nickname %s',
    (nickname) => {
      expect(
        joinOptionsSchema.safeParse({ nickname, protocolVersion: 1 }).success,
      ).toBe(false);
    },
  );
  it('rejects incompatible versions and client-submitted authority', () => {
    expect(
      joinOptionsSchema.safeParse({ nickname: 'Hero', protocolVersion: 2 })
        .success,
    ).toBe(false);
    expect(
      joinOptionsSchema.safeParse({
        nickname: 'Hero',
        protocolVersion: 1,
        maxPlayers: 99,
      }).success,
    ).toBe(false);
    expect(
      connectionCheckSchema.safeParse({
        protocolVersion: 1,
        sequence: 1,
        checks: 999,
      }).success,
    ).toBe(false);
    expect(
      connectionCheckSchema.safeParse({ protocolVersion: 1, sequence: NaN })
        .success,
    ).toBe(false);
    expect(
      connectionCheckSchema.safeParse({ protocolVersion: 1, sequence: -1 })
        .success,
    ).toBe(false);
    expect(
      connectionAckSchema.safeParse({
        protocolVersion: 2,
        sequence: 1,
        checks: 1,
      }).success,
    ).toBe(false);
  });
  it('allocates independent synchronized collections per room', () => {
    const a = new LobbyState();
    const b = new LobbyState();
    a.players.set('one', new LobbyPlayer({ nickname: 'Hero' }));
    expect(b.players.size).toBe(0);
    expect(a.protocolVersion).toBe(PROTOCOL_VERSION);
  });
});
