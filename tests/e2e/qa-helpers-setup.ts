import { matchMaker } from '@colyseus/core';
import { addCreep } from '@volam/game-core';
import { MATCH_ROOM } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/dist/rooms/MatchRoom.js';
import { startGameQa } from './global-setup.js';

/** Only helper/projectile fixtures: legal starting actors and a durable harmless target.
 * Does not inject input, movement, projectile, hit or peer replication outcomes. */
export default function setup() {
  return startGameQa(() => {
    const prepared = new WeakSet<MatchRoom>();
    const timer = setInterval(async () => {
      for (const { roomId } of await matchMaker.query({ name: MATCH_ROOM })) {
        const room = matchMaker.getLocalRoomById(roomId) as
          MatchRoom | undefined;
        if (room?.state.phase !== 'IN_GAME' || prepared.has(room)) continue;
        const hero = [...room.world.heroes.values()].find((h) =>
          ['QA helper host', 'Hỏa Khách'].includes(h.nickname),
        );
        if (!hero) continue;
        prepared.add(room);
        room.world.creeps.clear();
        const config = room.simulation.arena.config;
        const target = addCreep(
          room.world,
          'qa_helper_target',
          { x: hero.x + 160, y: hero.y },
          config,
        );
        Object.assign(target, {
          controlled: true,
          hp: 20000,
          maxHp: 20000,
          stats: {
            ...config.creep,
            hp: 20000,
            speed: 0,
            detectionRange: 0,
            damage: 0,
            xp: 0,
            gold: 0,
          },
        });
      }
    }, 30);
    return () => clearInterval(timer);
  });
}
