/** Local review fixture only. Production Room/core/protocol are untouched. */
import { preview } from 'vite';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import { MatchRoom } from '../apps/game-server/dist/rooms/MatchRoom.js';
import { initializeProgression, refreshCharacter } from '@volam/game-core';
import { experienceAtLevel } from '../packages/game-core/dist/campaign.js';
import { m1Config } from '@volam/game-data';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { bossFixture } from '../tests/e2e/boss-coherence-fixture.js';
import {
  qaSession,
  requireFreePorts,
  qaIdentityPlugin,
  ownedQaServices,
  verifyQaIdentity,
} from './qa-session.mjs';

if (process.env['NODE_ENV'] === 'production')
  throw Error('Development review only');
const ids = [
  'dong_ta',
  'tay_doc',
  'tay_doc_cap_mo',
  'nam_de',
  'bac_cai',
  'vuong_trung_duong_p1',
  'vuong_trung_duong_p2',
  'chu_ba_thong',
  'hoan_nhan_hong_liet',
  'kim_luan',
  'ly_mac_sau',
];
const initial = process.env['VOLAM_BOSS_REVIEW_ID'] ?? 'bac_cai';
if (!ids.includes(initial)) throw Error('Unknown review boss');
const session = qaSession({
    profile: 'presentation-boss-play',
    serverPort: 3022,
    clientPort: 5622,
  }),
  owned = ownedQaServices();
process.env['NODE_ENV'] = 'development';
process.env['VOLAM_QA_RUN_ID'] = session.runId;
const rooms = new Map<string, any>();
function select(room: any, id: string) {
  if (
    !ids.includes(id) ||
    !room ||
    room.state.phase !== 'IN_GAME' ||
    ![...room.state.players.keys()].some((key: string) =>
      room.simulation.hero(key),
    )
  )
    throw Error('Start a new active review match first');
  const f = bossFixture(room, id),
    { w, encounter: e, actor: b, heroes } = f;
  // Unlock native AI after the explicitly labelled placement/build prerequisite.
  b.hp = b.maxHp = b.stats.hp;
  b.cooldown = w.tick;
  if (id === 'dong_ta') {
    e.ready.clear();
  } else if (id.startsWith('tay_doc')) {
    e.nextActionAt = w.tick + 60;
    if (id.endsWith('cap_mo')) e.transitionAt = Math.max(1, w.tick - 100);
  } else if (id === 'nam_de') {
    e.nextActionAt = e.nextSmallAt = w.tick + 60;
  } else if (id === 'bac_cai') {
    e.nextAction = w.tick + 60;
    e.nextPreference = e.nextVote = w.tick + 300;
  } else if (id.startsWith('vuong_')) {
    e.lightningHits = 3;
    e.nextAction = e.nextSpecial = w.tick + 60;
    e.nextHazard = w.tick + 180;
    e.nextFinger = w.tick + 300;
  } else if (id === 'chu_ba_thong') {
    e.until = w.tick + 60;
    e.nextBasicAt = w.tick + 60;
  } else if (id === 'kim_luan') e.next.set(b.id, w.tick + 60);
  else e.nextActionAt = w.tick + 60;
  for (const h of heroes) {
    refreshCharacter(h, f.c);
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    h.invulnerable = true;
  }
  const info = {
    roomId: room.roomId,
    id,
    zone: f.zone.id,
    level: 30,
    rank: 4,
    invulnerable: true,
    scope:
      'isolated server-owned review prerequisites; native AI/damage/controls/HUD/F8',
  };
  writeFileSync(
    '.cache/presentation-boss-play-player.json',
    JSON.stringify(info, null, 2),
  );
  console.log('BOSS_REVIEW_SELECTED ' + JSON.stringify(info));
  return info;
}
const spawn = (MatchRoom.prototype as any).spawnPlayer;
(MatchRoom.prototype as any).spawnPlayer = function (id: string, player: any) {
  spawn.call(this, id, player);
  const h = this.simulation.hero(id),
    basic = player.selectedBranch;
  h.level = 30;
  h.xp = experienceAtLevel(30, m1Config);
  initializeProgression(h, m1Config, 'fixed', basic);
  const skills = [...m1Config.progression!.fixedBranches![basic]!.skillIds];
  h.progression.ranks = Object.fromEntries(skills.map((skill) => [skill, 4]));
  h.progression.defaultSkills = skills;
  h.progression.revision++;
  h.skillIds = skills;
  h.skillCooldowns = [0, 0, 0, 0, 0];
  h.abilityCooldowns = {};
  refreshCharacter(h, m1Config);
  h.hp = h.maxHp;
  h.mana = h.maxMana;
  rooms.set(this.roomId, this);
  if (!this.bossReviewQueued) {
    this.bossReviewQueued = true;
    setTimeout(() => {
      try {
        select(this, initial);
      } catch (e) {
        console.error(e);
      }
    }, 300);
  }
};
try {
  await requireFreePorts(session);
  const server = createGameServer();
  await server.listen(session.serverPort);
  owned.add(() => server.gracefullyShutdown(false));
  await verifyQaIdentity(session.serverUrl + '/health', {
    runId: session.runId,
    protocolVersion: PROTOCOL_VERSION,
  });
  const client = await preview({
    root: resolve('apps/game-client'),
    configFile: false,
    build: { outDir: resolve('.cache/boss-coherence-dist') },
    plugins: [
      qaIdentityPlugin(session),
      {
        name: 'isolated-boss-review-controls',
        configurePreviewServer(server) {
          server.middlewares.use('/__boss-review', async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            if (
              req.method !== 'POST' ||
              req.headers['x-review-run'] !== session.runId
            ) {
              res.statusCode = 403;
              res.end('{}');
              return;
            }
            try {
              let body = '';
              for await (const part of req) {
                body += part;
                if (body.length > 2048) throw Error('Too large');
              }
              const { roomId, id } = JSON.parse(body);
              res.end(JSON.stringify(select(rooms.get(roomId), id)));
            } catch (error) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: String(error) }));
            }
          });
        },
      },
    ],
    preview: { host: '127.0.0.1', port: session.clientPort, strictPort: true },
  });
  owned.add(() => client.close());
  await verifyQaIdentity(session.clientUrl + '/volam-build-endpoint.json', {
    serverUrl: session.serverUrl,
  });
  const info = {
    ...session,
    pid: process.pid,
    cwd: process.cwd(),
    boss: initial,
    url: session.clientUrl + '/?debug=1',
  };
  writeFileSync(
    '.cache/presentation-boss-play-session.json',
    JSON.stringify(info, null, 2),
  );
  console.log('BOSS_PLAY_READY ' + JSON.stringify(info));
  const close = async () => {
    await owned.close();
    process.exit(0);
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
} catch (error) {
  await owned.close();
  console.error(error);
  process.exit(1);
}
