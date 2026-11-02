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
      dash: ['ShiftLeft', 'ShiftRight'],
      activeSkills: ['KeyQ', 'KeyW', 'KeyE', 'KeyR'],
      healthPotion: ['Digit1', 'Numpad1'],
      manaPotion: ['Digit2', 'Numpad2'],
    });
  });
  it('normalizes Vietnamese nicknames to NFC and trims whitespace', () => {
    const nickname = 'Võ Lâm';
    expect(
      joinOptionsSchema.parse({
        nickname: `  ${nickname.normalize('NFD')}  `,
        protocolVersion: PROTOCOL_VERSION,
      }).nickname,
    ).toBe(nickname);
  });
  it.each(['', '    ', 'x'.repeat(21), '<script>', 'a\nb', 'a\u200bb'])(
    'rejects malformed nickname %s',
    (nickname) => {
      expect(
        joinOptionsSchema.safeParse({
          nickname,
          protocolVersion: PROTOCOL_VERSION,
        }).success,
      ).toBe(false);
    },
  );
  it('rejects incompatible versions and client-submitted authority', () => {
    expect(
      joinOptionsSchema.safeParse({ nickname: 'Hero', protocolVersion: 999 })
        .success,
    ).toBe(false);
    expect(
      joinOptionsSchema.safeParse({
        nickname: 'Hero',
        protocolVersion: PROTOCOL_VERSION,
        maxPlayers: 99,
      }).success,
    ).toBe(false);
    expect(
      connectionCheckSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        checks: 999,
      }).success,
    ).toBe(false);
    expect(
      connectionCheckSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: NaN,
      }).success,
    ).toBe(false);
    expect(
      connectionCheckSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: -1,
      }).success,
    ).toBe(false);
    expect(
      connectionAckSchema.safeParse({
        protocolVersion: 999,
        sequence: 1,
        checks: 1,
      }).success,
    ).toBe(false);
  });
  it.each([19, 20])(
    'rejects previous uncombined branch protocol%s',
    (protocolVersion) => {
      expect(
        joinOptionsSchema.safeParse({ nickname: 'Hero', protocolVersion })
          .success,
      ).toBe(false);
    },
  );
  it('allocates independent synchronized collections per room', () => {
    const a = new LobbyState();
    const b = new LobbyState();
    a.players.set('one', new LobbyPlayer({ nickname: 'Hero' }));
    expect(b.players.size).toBe(0);
    expect(a.protocolVersion).toBe(PROTOCOL_VERSION);
  });
});
