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
  return createM3dFixture(baseSetup);
}
export async function createM3dFixture(
  startServices: () => Promise<() => Promise<void>>,
) {
  const cleanup = await startServices();
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
      if (input.action === 'fixed-rank') {
        gainExperience(h, 29 * 60, m1Config);
        for (let rank = 0; rank < input.rank; rank++) {
          const error = changeBuild(
            z.world,
            h,
            z.config,
            h.progression!.revision,
            {
              action: 'upgrade-slot',
              slot: input.slot,
            },
          );
          if (error) throw Error(error);
        }
      } else if (input.action === 'build') {
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
        room!.simulation.respawns.delete(h.id);
        h.statuses = [];
        // A fresh isolated QA cast must not inherit a previous partial manual-A deadline.
        h.basicChains = {};
        delete h.basicChainDeadline;
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
      } else if (input.action === 'travel') {
        if (z.id !== 'arena') {
          if (h.hp > 0) Object.assign(h, z.dungeon!.exit);
          const error = room!.simulation.exit(h.id);
          if (error) throw Error(error);
        }
        if (input.destination) {
          const error = room!.simulation.enter(
            h.id,
            'shared',
            input.destination,
          );
          if (error) throw Error(error);
        }
      } else if (input.action === 'endurance') {
        h.hp = h.maxHp = 1000000;
        h.mana = h.maxMana = 100000;
      } else if (input.action === 'invasion') {
        room!.simulation.invasion!.nextWaveTick =
          room!.simulation.arenaTick + 1;
      } else if (input.action === 'boss-cast') {
        if (z.encounter) {
          z.encounter.cast = undefined;
          z.encounter.effects.clear();
          z.encounter.begin(z.world, z.config, input.ability, {
            x: h.x,
            y: h.y,
          });
        } else if (z.kim) {
          if (
            input.actor === 'kim_luan_phap_vuong' &&
            !z.world.creeps.has(input.actor)
          ) {
            for (const id of ['hoac_do', 'dat_nhi_ba']) {
              const c = z.world.creeps.get(id);
              if (c) c.hp = 0;
            }
            z.kim.step(z.world, z.config);
          }
          z.kim.casts.clear();
          z.kim.effects.clear();
          z.kim.begin(z.world, z.config, input.actor, input.ability, h);
        } else if (z.world.chu) {
          const c = z.world.chu;
          if (input.ability === 'drink') {
            c.phaseIndex =
              c.definition.phases.findIndex((p) => p.id === 'drink') - 1;
            c.until = z.world.tick;
          } else {
            c.phase = input.ability;
            c.started = z.world.tick;
            c.until = z.world.tick + 300;
            c.nextAction = z.world.tick;
            c.nextBasicAt = z.world.tick;
            c.fx = 1;
            c.fy = 0;
            const b = z.world.creeps.get('chu_ba_thong')!;
            c.spinOrigin = { x: b.x, y: b.y };
          }
        } else if (z.world.boss) {
          const runtime = z.world.boss,
            b = z.world.creeps.get(runtime.actorId)!;
          const a = z.config.bossEncounter!.attacks.find(
            (a) => a.id === input.ability,
          )!;
          const dx = h.x - b.x,
            dy = h.y - b.y,
            len = Math.hypot(dx, dy) || 1;
          runtime.cast = {
            id: a.id,
            startedAt: z.world.tick,
            releaseAt: z.world.tick + a.windupTicks,
            until: z.world.tick + a.windupTicks + a.recoveryTicks,
            targetId: h.id,
            fx: dx / len,
            fy: dy / len,
            origin: { x: b.x, y: b.y },
            released: false,
          };
          runtime.nextActionAt = runtime.cast.until + 30;
          b.fx = dx / len;
          b.fy = dy / len;
          b.castAbilityId = a.id;
          b.pose = 'cast';
          b.actionUntil = runtime.cast.until;
        } else throw Error('Not a boss fixture');
      } else if (input.action === 'position') {
        h.x = input.x;
        h.y = input.y;
        h.moveX = h.moveY = 0;
        h.fx = input.fx ?? 1;
        h.fy = input.fy ?? 0;
      } else if (input.action === 'targets') {
        const archetype = [...z.world.creeps.values()].find(
          (e) => e.hp > 0,
        )?.archetypeId;
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
            speed: input.mobile ? z.config.creep.speed : 0,
            damage: 0,
            defense: 0,
            detectionRange: 1,
          };
          if (input.mobile && archetype) c.archetypeId = archetype;
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
