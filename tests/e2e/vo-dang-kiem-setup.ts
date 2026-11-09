import { matchMaker } from '@colyseus/core';
import { addCreep, emptyInventory, gainExperience } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { MATCH_ROOM } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/dist/rooms/MatchRoom.js';
import { startGameQa } from './global-setup.js';

export default function setup() {
  return startGameQa(() => {
    const prepared = new Set<string>();
    const timer = setInterval(async () => {
      for (const { roomId } of await matchMaker.query({ name: MATCH_ROOM })) {
        if (prepared.has(roomId)) continue;
        const room = matchMaker.getLocalRoomById(roomId) as
          MatchRoom | undefined;
        if (room?.state.phase !== 'IN_GAME') continue;
        const hero = [...room.world.heroes.values()].find(
          (h) => h.nickname === 'Kiem QA',
        );
        if (!hero) continue;
        prepared.add(roomId);
        gainExperience(hero, 10_000, m1Config);
        hero.hp = hero.maxHp * 0.7;
        const inventory = (hero.inventory ??= emptyInventory());
        inventory.potions.hp_small = 1;
        inventory.potions.mp_small = 1;
        inventory.revision++;
        room.world.creeps.clear();
        for (const [id, dx, boss] of [
          ['kiem_review_melee', 52, false],
          ['kiem_review_boss', 185, true],
        ] as const) {
          const creep = addCreep(
            room.world,
            id,
            { x: hero.x + dx, y: hero.y },
            m1Config,
          );
          Object.assign(creep, {
            hp: 5000,
            maxHp: 5000,
            encounterBoss: boss,
            controlled: true,
            stats: {
              ...m1Config.creep,
              hp: 5000,
              speed: 0,
              detectionRange: 0,
              damage: 0,
              defense: 0,
              xp: 0,
              gold: 0,
            },
          });
        }
      }
    }, 80);
    return () => clearInterval(timer);
  });
}
