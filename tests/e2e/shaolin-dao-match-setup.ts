import { matchMaker } from '@colyseus/core';
import { addCreep, gainExperience } from '@volam/game-core';
import { MATCH_ROOM } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/dist/rooms/MatchRoom.js';
import { startGameQa } from './global-setup.js';

export default function setup() {
  return startGameQa(() => {
    const prepared = new WeakSet<MatchRoom>();
    const timer = setInterval(async () => {
      for (const { roomId } of await matchMaker.query({ name: MATCH_ROOM })) {
        const room = matchMaker.getLocalRoomById(roomId) as
          MatchRoom | undefined;
        if (room?.state.phase !== 'IN_GAME' || prepared.has(room)) continue;
        const hero = [...room.world.heroes.values()].find(
          (h) => h.nickname === 'Dao Reach QA',
        );
        if (!hero) continue;
        prepared.add(room);
        const config = room.simulation.arena.config;
        room.world.creeps.clear();
        Object.assign(hero, { x: 850, y: 650, fx: 1, fy: 0 });
        gainExperience(hero, 1_000_000, config);
        for (const [id, reach, offsetY] of [
          ['tru_ta_edge', 189, 0],
          ['tru_ta_outside', 191, 50],
        ] as const) {
          const distance = reach + config.creep.radius;
          const target = addCreep(
            room.world,
            id,
            {
              x: hero.x + Math.sqrt(distance ** 2 - offsetY ** 2),
              y: hero.y + offsetY,
            },
            config,
          );
          target.controlled = true;
          target.hp = target.maxHp = 20_000;
        }
      }
    }, 80);
    return () => clearInterval(timer);
  });
}
