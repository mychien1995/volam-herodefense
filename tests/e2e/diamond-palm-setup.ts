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
        const hero = [...room.world.heroes.values()].find((h) =>
          ['Palm Audit', 'Palm Combo Audit', 'Quyen Audit'].includes(
            h.nickname,
          ),
        );
        if (!hero) continue;
        prepared.add(room);
        room.world.creeps.clear();
        Object.assign(hero, { x: 850, y: 650, fx: 1, fy: 0 });
        const config = room.simulation.arena.config;
        gainExperience(hero, 1_000_000, config);
        const dummy = addCreep(
          room.world,
          'palm_target',
          {
            x:
              hero.nickname === 'Quyen Audit'
                ? 1070
                : hero.nickname === 'Palm Combo Audit'
                  ? 985
                  : 918,
            y: 650,
          },
          config,
        );
        dummy.hp = dummy.maxHp = 20_000;
        dummy.controlled = true;
        if (hero.nickname === 'Palm Combo Audit') {
          const decoy = addCreep(
            room.world,
            'closer_decoy',
            { x: 850, y: 695 },
            config,
          );
          decoy.hp = decoy.maxHp = 20_000;
          decoy.controlled = true;
        }
      }
    }, 80);
    return () => clearInterval(timer);
  });
}
