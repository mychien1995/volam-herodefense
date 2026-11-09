import { matchMaker } from '@colyseus/core';
import { gainExperience } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { MATCH_ROOM } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/dist/rooms/MatchRoom.js';
import { startGameQa } from './global-setup.js';

export default function setup() {
  return startGameQa(() => {
    const prepared = new Set<string>();
    // Only the test host is leveled. It still learns ranks and casts via the regular HUD.
    const timer = setInterval(async () => {
      for (const { roomId } of await matchMaker.query({ name: MATCH_ROOM })) {
        if (prepared.has(roomId)) continue;
        const room = matchMaker.getLocalRoomById(roomId) as
          MatchRoom | undefined;
        if (room?.state.phase !== 'IN_GAME') continue;
        const hero = [...room.world.heroes.values()].find(
          (h) => h.nickname === 'Quyen QA',
        );
        if (!hero) continue;
        prepared.add(roomId);
        room.world.creeps.clear();
        gainExperience(hero, 10_000, m1Config);
      }
    }, 80);
    return () => clearInterval(timer);
  });
}
