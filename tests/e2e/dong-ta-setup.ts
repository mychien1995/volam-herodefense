import { fileURLToPath } from 'node:url';
import { ColyseusTestServer } from '@colyseus/testing';
import {
  gainExperience,
  changeBuild,
  addCreep,
  blocked,
  type DongAbility,
  type Pose,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { startOwnedGameQa } from './owned-game-setup.js';
import { qaWorkflowSession } from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.dong-ta.config.ts',
  ]);
  return startOwnedGameQa({
    session,
    environment: {},
    loadClientConfig: false,
    configure(server) {
      const authority = new ColyseusTestServer(server);
      return {
        root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
        configFile: false,
        cacheDir: fileURLToPath(
          new URL('../../.cache/vite-dong-ta', import.meta.url),
        ),
        server: {
          host: '127.0.0.1',
          port: session.clientPort,
          strictPort: true,
          watch: null,
          hmr: false,
        },
        define: {
          'import.meta.env.VITE_SERVER_URL': JSON.stringify(session.serverUrl),
        },
        plugins: [
          {
            name: 'dong-ta-test-authority',
            configureServer(server) {
              server.middlewares.use('/__dong_ta', (req, res) => {
                try {
                  if (req.method !== 'POST') throw Error('POST required');
                  const q = new URL(req.url ?? '/', 'http://127.0.0.1')
                    .searchParams;
                  const room = authority.getRoomById<MatchRoom>(
                      q.get('room') ?? '',
                    ),
                    m = room.simulation,
                    w = room.world,
                    e = m.dongTa!;
                  const mode = q.get('mode');
                  if (mode === 'pose') {
                    const direction = q.get('direction') ?? 'down',
                      index = Number(q.get('index'));
                    const dirs: Record<string, [number, number]> = {
                      down: [0, 1],
                      up: [0, -1],
                      left: [-1, 0],
                      right: [1, 0],
                    };
                    if (
                      !dirs[direction] ||
                      !Number.isInteger(index) ||
                      index < 0 ||
                      index > 8
                    )
                      throw Error('Invalid pose fixture');
                    const poses = {
                      dong_ta: [
                        'idle',
                        'walk',
                        'sword_flurry_cast',
                        'finger_cast',
                        'summon_cast',
                        'hurt',
                        'death',
                        'thrust',
                        'flute',
                      ],
                      mai_sieu_phong: [
                        'idle',
                        'walk',
                        'claw_attack',
                        'pull_cast',
                        'poison_skull_throw',
                        'hurt',
                        'death',
                      ],
                      hoang_dung: [
                        'idle',
                        'walk',
                        'support_cast',
                        'evade',
                        'hurt',
                        'death',
                      ],
                    };
                    const ability: Record<string, DongAbility> = {
                      sword_flurry_cast: 'lac_anh_normal',
                      finger_cast: 'dan_chi_than_cong',
                      summon_cast: 'trieu_hon_dong_hai',
                      thrust: 'ta_kiem_lien_kich',
                      flute: 'ngoc_tieu_hoi_phong',
                      claw_attack: 'bach_cot_trao',
                      pull_cast: 'am_phong_hap_luc',
                      poison_skull_throw: 'doc_cot_bao',
                      support_cast: 'thanh_am_ho_tro',
                      evade: 'linh_xa_bo',
                    };
                    e.casts = [];
                    for (const [i, [id, tags]] of Object.entries(
                      poses,
                    ).entries()) {
                      const tag = tags[index] ?? 'idle',
                        a = addCreep(
                          w,
                          id,
                          { x: 650 + i * 150, y: 650 },
                          m.arena.config,
                        );
                      a.archetypeId = id;
                      a.controlled = true;
                      a.waveBossActor = true;
                      a.bossEncounter = true;
                      [a.fx, a.fy] = dirs[direction]!;
                      a.pose = (ability[tag] ? 'cast' : tag) as Pose;
                      a.actionUntil = w.tick + 1000;
                      a.cooldown = w.tick + 1000;
                      a.hp = tag === 'death' ? 0 : a.maxHp;
                      a.hurtUntil = tag === 'hurt' ? w.tick + 1000 : 0;
                      if (ability[tag])
                        e.casts.push({
                          id: 'pose_' + id,
                          actorId: id,
                          abilityId: ability[tag],
                          x: a.x,
                          y: a.y,
                          fx: a.fx,
                          fy: a.fy,
                          targetId: '',
                          startedAt: w.tick,
                          activeAt: w.tick + 1000,
                          endsAt: w.tick + 1000,
                          released: false,
                          nextPulse: w.tick + 1000,
                          pulse: 0,
                          pattern: 'plus',
                        });
                    }
                  } else if (mode === 'end-poses') {
                    for (const id of [
                      'dong_ta',
                      'mai_sieu_phong',
                      'hoang_dung',
                    ])
                      w.creeps.delete(id);
                    e.casts = [];
                  } else if (mode === 'gate') {
                    // Arrange wave4→5 at the next authoritative tick, then wait for normal clear/rest/entry.
                    m.invasion!.wave = 4;
                    m.invasion!.nextWaveTick = m.tick + 1;
                    for (const h of w.heroes.values()) {
                      gainExperience(
                        h,
                        (30 - h.level) * m1Config.xpPerLevel,
                        m1Config,
                      );
                      const ids =
                        m1Config.progression!.schools[h.schoolId]!.basicIds;
                      if (q.get('ranged') === '1')
                        changeBuild(w, h, m1Config, h.progression!.revision, {
                          action: 'branch',
                          basicId: ids[1]!,
                        });
                    }
                    // Exercise transfer/empty-reset of a real boss dungeon, with a dead participant.
                    const ids = [...m.membership.keys()];
                    if (ids[1]) {
                      m.enter(ids[1], 'shared', 'co_mo');
                      m.hero(ids[1])!.hp = 0;
                    }
                  } else if (mode === 'clear-wave5') {
                    for (const c of w.creeps.values())
                      if (c.invasion?.wave === 5) c.hp = 0;
                  } else if (mode === 'threshold') {
                    const boss = w.creeps.get('dong_ta')!;
                    boss.hp = boss.maxHp * 0.399;
                  } else if (mode === 'position') {
                    const h = m.hero(q.get('player') ?? '');
                    const x = Number(q.get('x')),
                      y = Number(q.get('y'));
                    if (!h || !Number.isFinite(x) || !Number.isFinite(y))
                      throw Error('Invalid authority fixture position');
                    h.x = x;
                    h.y = y;
                    h.moveX = h.moveY = 0;
                  } else if (mode === 'wipe') {
                    for (const h of w.heroes.values()) h.hp = 0;
                  } else if (mode === 'combat') {
                    const boss = w.creeps.get('dong_ta')!;
                    // Two-client iteration bounds clear time; final six-client clear uses the full reset HP.
                    if (w.heroes.size < 6)
                      boss.hp = Math.min(
                        boss.hp,
                        Math.max(90, w.heroes.size * 90),
                      );
                    for (const [i, h] of [...w.heroes.values()].entries()) {
                      const a = (i * Math.PI) / 3;
                      h.x = boss.x + Math.cos(a) * 45;
                      h.y = boss.y + Math.sin(a) * 45;
                      h.fx = -Math.cos(a);
                      h.fy = -Math.sin(a);
                      h.moveX = h.moveY = 0;
                    }
                  } else if (mode === 'inspect') {
                    // Read only: exposes authority outcomes absent from the client view.
                  } else throw Error('Unknown fixture mode');
                  res.setHeader('content-type', 'application/json');
                  res.end(
                    JSON.stringify({
                      mode,
                      tick: w.tick,
                      phase: e.phase,
                      statueInvulnerable: w.statue?.invulnerable,
                      statueHp: w.statue?.hp,
                      encounter: e.view(w),
                      members: Object.fromEntries(m.membership),
                      emptyReset: m.zones.get('co_mo_shared')?.emptyBossResetAt,
                      players: [...m.membership.keys()].map((id) => ({
                        id,
                        hp: m.hero(id)?.hp,
                        gold: m.hero(id)?.gold,
                        xp: m.hero(id)?.xp,
                        overlapsTerrain: blocked(
                          m.hero(id)!,
                          m.zoneOf(id)!.config.radius,
                          m.zoneOf(id)!.config.width,
                          m.zoneOf(id)!.config.height,
                          m.zoneOf(id)!.config.collision,
                        ),
                      })),
                    }),
                  );
                } catch (error) {
                  res.statusCode = 400;
                  res.end(String(error));
                }
              });
            },
          },
        ],
      };
    },
  });
}
