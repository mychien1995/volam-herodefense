import { startOwnedGameQa } from './owned-game-setup.js';
import { ColyseusTestServer } from '@colyseus/testing';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { applyStatus } from '../../packages/game-core/src/status.js';
import { blocked } from '../../packages/game-core/src/geometry.js';
export default () =>
  startOwnedGameQa({
    config: 'playwright.m4d.config.ts',
    ...(process.env['VOLAM_M4D_SLICE_DEVELOPMENT'] === '1'
      ? { clientMode: 'development' as const }
      : {}),
    loadClientConfig: true,
    configure(server) {
      const authority = new ColyseusTestServer(server);
      const middleware = (vite: any) => {
        vite.middlewares.use('/__m4d', (req: any, res: any) => {
          try {
            if (req.method !== 'POST') throw Error('POST required');
            const q = new URL(req.url ?? '/', 'http://fixture').searchParams;
            const room = authority.getRoomById<MatchRoom>(q.get('room') ?? '');
            if (room.state.phase !== 'IN_GAME')
              throw Error('Join a match first');
            const m = room.simulation,
              h = m.hero(q.get('id') ?? '')!,
              z = m.zoneOf(h.id)!;
            const op = q.get('op');
            if (op === 'place') {
              const point = { x: Number(q.get('x')), y: Number(q.get('y')) };
              if (
                blocked(
                  point,
                  z.config.radius,
                  z.config.width,
                  z.config.height,
                  z.config.collision,
                )
              )
                throw Error('Illegal fixture position');
              h.x = point.x;
              h.y = point.y;
              h.moveX = h.moveY = 0;
            } else if (op === 'status') {
              // Renderer prerequisite only; core tests separately cover status/cleanse mechanics.
              applyStatus(
                h,
                { kind: 'stun', magnitude: 1, durationTicks: 150 },
                'fixture',
                'fixture_stun',
                z.world.tick,
              );
            } else if (op === 'invasion') {
              // Idle art-review peers do not defend; isolate rendering from statue defeat.
              z.world.statue!.invulnerable = true;
              m.invasion!.nextWaveTick = m.arenaTick + 1;
            } else if (op === 'target') {
              const enemy = z.world.creeps.get(q.get('target') ?? '')!;
              const point = { x: enemy.x - 40, y: enemy.y };
              if (
                blocked(
                  point,
                  z.config.radius,
                  z.config.width,
                  z.config.height,
                  z.config.collision,
                )
              )
                throw Error('No legal target fixture');
              enemy.hp = 1;
              enemy.controlled = true;
              h.invulnerable = true;
              h.hp = h.maxHp;
              h.x = point.x;
              h.y = point.y;
              h.fx = 1;
              h.fy = 0;
            } else if (op === 'wave') {
              // Legal encounter prerequisite, no injected hit, kill, reward or vote outcome.
              if (m.invasion!.streaming)
                m.invasion!.beforeStep(
                  z.world,
                  z.config,
                  m.invasion!.streamUntilTick,
                  m.membership.size,
                );
              m.invasion!.nextWaveTick = m.arenaTick + 1000000;
              z.world.creeps.clear();
              z.world.invasionPending?.clear();
              for (const hero of z.world.heroes.values()) {
                hero.invulnerable = false;
                hero.hp = hero.maxHp;
              }
              m.dongTa!.restartCampaign(z.world, z.config);
            } else if (op === 'boss-target') {
              const boss = z.world.creeps.get('dong_ta')!;
              h.x = boss.x - 45;
              h.y = boss.y;
              h.fx = 1;
              h.fy = 0;
            } else throw Error('Unknown fixture operation');
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      };
      return {
        plugins: [
          {
            name: 'm4d-prerequisites',
            configureServer: middleware,
            configurePreviewServer: middleware,
          },
        ],
      };
    },
  });
