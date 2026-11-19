/** Isolated, server-owned level30/max-rank review fixture. Normal production Room/gameplay sources are unchanged. */
import { preview } from 'vite';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import { MatchRoom } from '../apps/game-server/dist/rooms/MatchRoom.js';
import {
  initializeProgression,
  refreshCharacter,
  addCreep,
} from '@volam/game-core';
import { experienceAtLevel } from '../packages/game-core/dist/campaign.js';
import { m1Config } from '@volam/game-data';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import {
  qaSession,
  requireFreePorts,
  qaIdentityPlugin,
  ownedQaServices,
  verifyQaIdentity,
} from '../tools/qa-session.mjs';

const basic = process.env.VOLAM_HERO_REVIEW_BASIC ?? 'cai_bang_bong';
if (
  ![
    'cai_bang_bong',
    'cai_bang_chuong',
    'vo_dang_quyen',
    'vo_dang_kiem',
  ].includes(basic)
)
  throw Error('Unsupported body review branch');
const school = basic.startsWith('vo_dang') ? 'vo_dang' : 'cai_bang';
const reviewBranches =
  school === 'vo_dang' ? ['vo_dang_quyen', 'vo_dang_kiem'] : [basic];
const session = qaSession({
  profile: 'presentation-hero-play',
  serverPort: 2990,
  clientPort: 5592,
});
const owned = ownedQaServices();
process.env.NODE_ENV = 'development';
process.env.VOLAM_QA_RUN_ID = session.runId;
const spawn = MatchRoom.prototype.spawnPlayer;
MatchRoom.prototype.spawnPlayer = function (id, player) {
  spawn.call(this, id, player);
  const selected = player.selectedBranch;
  if (player.schoolId !== school || !reviewBranches.includes(selected)) return;
  const h = this.simulation.hero(id);
  h.level = 30;
  h.xp = experienceAtLevel(30, m1Config);
  initializeProgression(h, m1Config, 'fixed', selected);
  const skills = [...m1Config.progression.fixedBranches[selected].skillIds];
  h.progression.ranks = Object.fromEntries(skills.map((skill) => [skill, 4]));
  h.progression.defaultSkills = skills;
  h.progression.revision++;
  h.skillIds = skills;
  h.skillCooldowns = [0, 0, 0, 0, 0];
  h.abilityCooldowns = {};
  refreshCharacter(h, m1Config);
  h.hp = h.maxHp;
  h.mana = h.maxMana;
  Object.assign(h, { x: 700, y: 660, fx: 1, fy: 1 });
  const w = this.world,
    config = this.simulation.arena.config;
  for (const [i, x, y] of [
    [0, 810, 710],
    [1, 845, 660],
  ]) {
    const dog = addCreep(
      w,
      'hero_review_dog_' + id + '_' + i,
      { x, y },
      config,
    );
    Object.assign(dog, {
      archetypeId: 'creep_wild_dog',
      hp: 10000,
      maxHp: 10000,
      controlled: true,
    });
    dog.stats = { ...config.creep, hp: 10000, damage: 0, xp: 0, gold: 0 };
  }
  const info = {
    roomId: this.roomId,
    id,
    school: h.schoolId,
    basic: h.basicId,
    level: h.level,
    skills: h.skillIds,
    ranks: h.progression.ranks,
  };
  writeFileSync(
    '.cache/presentation-hero-play-player.json',
    JSON.stringify(info, null, 2),
  );
  console.log('HERO_PLAYER_READY ' + JSON.stringify(info));
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
    build: {
      outDir: resolve(
        process.env.VOLAM_HERO_REVIEW_DIST ??
          '.cache/hero-coherence-batch1-dist',
      ),
    },
    plugins: [qaIdentityPlugin(session)],
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
    url: session.clientUrl + '/?debug=1',
  };
  writeFileSync(
    '.cache/presentation-hero-play-session.json',
    JSON.stringify(info, null, 2),
  );
  console.log('HERO_PLAY_READY ' + JSON.stringify(info));
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
