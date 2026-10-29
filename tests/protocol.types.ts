import { PROTOCOL_VERSION } from '@volam/game-protocol';
import type { Room } from '@colyseus/sdk';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';

// Compiled by pnpm typecheck; never executed. Keep SDK message inference strict.
export function checkProtocolTypes(room: Room<MatchRoom>): void {
  room.send('connection-check', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
  });
  room.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    kind: 'move',
    x: 1,
    y: -1,
  });
  // @ts-expect-error Damage is never a client input.
  room.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    kind: 'basic',
    damage: 999,
  });
  // @ts-expect-error Unknown command names are not in the M0 contract.
  room.send('move', { x: 99 });
  // @ts-expect-error A player cannot submit their check count.
  room.send('connection-check', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    checks: 999,
  });
  // @ts-expect-error Sequence is a number, not a string.
  room.send('connection-check', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 'one',
  });
  room.onMessage('connection-ack', (ack) => {
    const count: number = ack.checks;
    void count;
    // @ts-expect-error Acknowledgements never grant gold.
    void ack.gold;
  });
}
