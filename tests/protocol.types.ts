import type { Room } from '@colyseus/sdk';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';

// Compiled by pnpm typecheck; never executed. Keep SDK message inference strict.
export function checkProtocolTypes(room: Room<MatchRoom>): void {
  room.send('connection-check', { protocolVersion: 1, sequence: 1 });
  // @ts-expect-error Unknown command names are not in the M0 contract.
  room.send('move', { x: 99 });
  // @ts-expect-error A player cannot submit their check count.
  room.send('connection-check', {
    protocolVersion: 1,
    sequence: 1,
    checks: 999,
  });
  // @ts-expect-error Sequence is a number, not a string.
  room.send('connection-check', { protocolVersion: 1, sequence: 'one' });
  room.onMessage('connection-ack', (ack) => {
    const count: number = ack.checks;
    void count;
    // @ts-expect-error Acknowledgements never grant gold.
    void ack.gold;
  });
}
