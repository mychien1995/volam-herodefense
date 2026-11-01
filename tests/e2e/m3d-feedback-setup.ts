// Test-owned fixture only; no debug mutation endpoints enter production routes.
import baseSetup from './global-setup.js';
import { createServer } from 'node:http';
import { matchMaker } from '@colyseus/core';
import { gainExperience, changeBuild, addCreep } from '@volam/game-core';
import {
  cancelOwnedEffects,
  applyStatus,
} from '../../packages/game-core/src/status.js';
import { m1Config } from '@volam/game-data';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
export default async function setup() {
  const cleanup = await baseSetup();
  const fixture = createServer(async (req, res) => {
    try {
      if (req.method !== 'POST' || req.url !== '/fixture') {
        res.writeHead(404).end();
        return;
      }
      let body = '';
      for await (const chunk of req) body += chunk;
      const input = JSON.parse(body),
        room = matchMaker.getLocalRoomById(input.roomId) as
          MatchRoom | undefined;
      const h = room?.simulation.hero(input.sessionId),
        z = room?.simulation.zoneOf(input.sessionId);
      if (!h || !z) throw Error('Unknown fixture hero');
      if (input.action === 'build') {
        gainExperience(h, 29 * 60, m1Config);
        const change = (c: Parameters<typeof changeBuild>[4]) => {
          const error = changeBuild(
            z.world,
            h,
            z.config,
            h.progression!.revision,
            c,
          );
          if (error) throw Error(error);
        };
        change({ action: 'mode', mode: 'custom' });
        change({ action: 'reset' });
        change({ action: 'loadout', ids: input.ids });
        if (input.basic) change({ action: 'basic', basicId: input.basic });
        for (let r = 0; r < 4; r++)
          for (const skillId of input.ids.filter(Boolean))
            if (r < m1Config.progression!.skills[skillId]!.ranks.length)
              change({ action: 'upgrade', skillId });
      } else if (input.action === 'restore') {
        cancelOwnedEffects(z.world, h.id);
        h.hp = h.maxHp;
        h.mana = h.maxMana;
        h.skillCooldowns.fill(0);
        h.abilityCooldowns = {};
        h.cooldown = z.world.tick;
        h.actionUntil = z.world.tick;
        h.pose = 'idle';
        h.castAbilityId = '';
      } else if (input.action === 'stun') {
        applyStatus(
          h,
          { kind: 'stun', durationTicks: 60, magnitude: 1 },
          'fixture',
          'fixture_stun',
          z.world.tick,
        );
      } else if (input.action === 'kill') {
        h.hp = 0;
      } else if (input.action === 'position') {
        h.x = input.x;
        h.y = input.y;
        h.moveX = h.moveY = 0;
        h.fx = input.fx ?? 1;
        h.fy = input.fy ?? 0;
      } else if (input.action === 'targets') {
        z.world.creeps.clear();
        z.world.random = () => 0.99;
        for (let i = 0; i < input.points.length; i++) {
          const c = addCreep(
            z.world,
            'fixture_' + i,
            input.points[i],
            z.config,
          );
          c.hp = c.maxHp = 100000;
          c.stats = {
            ...z.config.creep,
            hp: 100000,
            speed: 0,
            damage: 0,
            defense: 0,
            detectionRange: 1,
          };
        }
      } else throw Error('Unknown fixture action');
      res
        .writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400).end(String(e));
    }
  });
  try {
    await new Promise<void>((resolve, reject) => {
      fixture.once('error', reject);
      fixture.listen(
        Number(process.env['VOLAM_QA_FIXTURE_PORT'] ?? 2878),
        '127.0.0.1',
        resolve,
      );
    });
  } catch (e) {
    await cleanup();
    throw e;
  }
  return async () => {
    await new Promise<void>((resolve) => fixture.close(() => resolve()));
    await cleanup();
  };
}
