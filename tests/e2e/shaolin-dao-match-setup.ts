import { matchMaker } from '@colyseus/core';
import { addCreep, gainExperience } from '@volam/game-core';
import { MATCH_ROOM } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/dist/rooms/MatchRoom.js';
import { startGameQa } from './global-setup.js';

export default function setup() {
  return startGameQa(() => {
    const prepared = new WeakSet<MatchRoom>();
    const clearedSweepTargets = new WeakSet<MatchRoom>();
    const timer = setInterval(async () => {
      for (const { roomId } of await matchMaker.query({ name: MATCH_ROOM })) {
        const room = matchMaker.getLocalRoomById(roomId) as
          MatchRoom | undefined;
        if (room?.state.phase !== 'IN_GAME') continue;
        if (prepared.has(room)) {
          const edge = room.world.creeps.get('tru_ta_edge');
          const outside = room.world.creeps.get('tru_ta_outside');
          if (
            edge &&
            outside &&
            edge.hp < 20_000 &&
            !clearedSweepTargets.has(room)
          ) {
            // Leave the sweep result visible while clearing the line for the A range probe.
            edge.x += 350;
            outside.x += 350;
            clearedSweepTargets.add(room);
          }
          continue;
        }
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
        const offAxis = addCreep(
          room.world,
          'dao_basic_off_axis',
          {
            x: hero.x - 285,
            y: hero.y - 90,
          },
          config,
        );
        offAxis.controlled = true;
        offAxis.hp = offAxis.maxHp = 20_000;
      }
    }, 80);
    return () => clearInterval(timer);
  });
}
