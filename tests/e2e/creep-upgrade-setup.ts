import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { ColyseusTestServer } from '@colyseus/testing';
import {
  addCreep,
  BacCaiEncounter,
  stepCreepHazards,
  blocked,
  initializeProgression,
} from '@volam/game-core';
import {
  bacCaiDefinition,
  creepProfiles,
  creepCombatDefinition,
} from '@volam/game-data';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import {
  qaSession,
  requireFreePorts,
  qaIdentityPlugin,
  verifyQaIdentity,
  ownedQaServices,
} from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaSession({
    serverPort: 2928,
    clientPort: 5528,
    profile: 'creep-upgrade',
  });
  await requireFreePorts(session);
  const names = [
    'NODE_ENV',
    'VOLAM_QA_RUN_ID',
    'VOLAM_DEV_CREEP_TEST',
    'VOLAM_DEV_WAVE_BOSSES',
    'VOLAM_DEV_PRACTICE_CREEPS',
  ];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  if (process.env['VOLAM_QA_CREEP_PRODUCTION'] === '1') {
    process.env['NODE_ENV'] = 'production';
    delete process.env['VOLAM_DEV_CREEP_TEST'];
  } else {
    process.env['NODE_ENV'] = 'development';
    process.env['VOLAM_DEV_CREEP_TEST'] = '1';
  }
  process.env['VOLAM_QA_RUN_ID'] = session.runId;
  delete process.env['VOLAM_DEV_WAVE_BOSSES'];
  delete process.env['VOLAM_DEV_PRACTICE_CREEPS'];
  const owned = ownedQaServices();
  const cleanup = async () => {
    await owned.close();
    for (const [n, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[n];
      else process.env[n] = v;
    }
  };
  try {
    const server = createGameServer();
    await server.listen(session.serverPort);
    owned.add(() => server.gracefullyShutdown(false));
    const authority = new ColyseusTestServer(server);
    await verifyQaIdentity(`${session.serverUrl}/health`, {
      service: 'volam-game-server',
      runId: session.runId,
      protocolVersion: PROTOCOL_VERSION,
    });
    const client = await preview({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      preview: {
        host: '127.0.0.1',
        port: session.clientPort,
        strictPort: true,
      },
      plugins: [
        qaIdentityPlugin(session),
        {
          name: 'creep-upgrade-qa-only',
          configurePreviewServer(v) {
            v.middlewares.use('/__creep_fixture', (req, res) => {
              try {
                if (req.method !== 'POST') throw Error('POST required');
                const q = new URL(req.url ?? '/', 'http://local').searchParams,
                  room = authority.getRoomById<MatchRoom>(q.get('room') ?? ''),
                  m = room.simulation,
                  op = q.get('op');
                if (room.state.phase !== 'IN_GAME')
                  throw Error('Enter a real match first');
                const heroId = q.get('hero') ?? [...m.membership.keys()][0]!,
                  hero = m.hero(heroId)!;
                if (op === 'arena') {
                  for (const id of m.membership.keys()) {
                    const z = m.zoneOf(id)!;
                    if (z.id !== 'arena') {
                      Object.assign(m.hero(id)!, z.dungeon!.exit);
                      const error = m.exit(id);
                      if (error) throw Error(error);
                    }
                  }
                }
                if (op === 'enter') {
                  const error = m.enter(
                    heroId,
                    'private',
                    q.get('zone') ?? 'forest',
                  );
                  if (error) throw Error(error);
                }
                const zone = m.zoneOf(heroId)!,
                  w = zone.world,
                  c = zone.config;
                if (op === 'stream') {
                  if (q.get('audit') === '1')
                    m.invasion!.definition.streamTicks = 4 * c.tickRate;
                  m.invasion!.nextWaveTick = m.arena.world.tick + 1;
                } else if (op === 'review-isolate') {
                  // Keep the arena playable while the party's browser is inspecting private instances.
                  m.arena.world.statue!.invulnerable = true;
                  m.invasion!.nextWaveTick = 10000000;
                  m.arena.world.creeps.clear();
                } else if (
                  op === 'review-heroes' ||
                  op === 'review-control' ||
                  op === 'review-bong-party'
                ) {
                  w.creeps.clear();
                  w.creepCombat = { actors: new Map(), effects: new Map() };
                  m.invasion!.nextWaveTick = 10000000;
                  const bongParty = [
                    [535, 770],
                    [675, 722],
                    [730, 722],
                    [785, 722],
                    [710, 842],
                    [765, 842],
                  ];
                  let i = 0;
                  for (const h of w.heroes.values()) {
                    const [x, y] =
                      op === 'review-bong-party'
                        ? bongParty[i]!
                        : [535 + i * 106, 770];
                    Object.assign(h, {
                      x,
                      y,
                      fx: 0,
                      fy: -1,
                      cooldown: 0,
                      hp: h.maxHp,
                      hurtUntil: 0,
                      actionUntil: 0,
                      statuses: [],
                      invulnerable: false,
                      moveX: 0,
                      moveY: 0,
                    });
                    if (op === 'review-control') {
                      const foe = addCreep(
                        w,
                        'control_' + i,
                        { x: h.x, y: h.y - 44 },
                        c,
                      );
                      foe.archetypeId = q.get('id') ?? 'truc_xa';
                      foe.stats = { ...c.creep, damage: 12, speed: 0 };
                    }
                    i++;
                  }
                } else if (op === 'review-bong-ultimate') {
                  w.creeps.clear();
                  m.invasion!.nextWaveTick = 10000000;
                  hero.level = 6;
                  initializeProgression(hero, c, 'fixed', 'cai_bang_bong');
                  hero.skillIds![4] = 'thien_ha_vo_cau';
                  hero.progression!.ranks.thien_ha_vo_cau = 1;
                  Object.assign(hero, {
                    x: 560,
                    y: 770,
                    fx: 1,
                    fy: 0,
                    hp: hero.maxHp * 0.8,
                    statuses: [],
                    invulnerable: false,
                    hurtUntil: 0,
                  });
                  const attacker = addCreep(
                    w,
                    'ultimate_attacker',
                    {
                      x: hero.x + 30,
                      y: hero.y,
                    },
                    c,
                  );
                  attacker.archetypeId = 'creep_bandit_grunt';
                  attacker.hp = attacker.maxHp = 10000;
                  attacker.stats = {
                    ...c.creep,
                    speed: 0,
                    attackRange: 50,
                    detectionRange: 100,
                    damage: 18,
                    attackCooldownTicks: 15,
                  };
                  attacker.cooldown = w.tick + 16;
                } else if (op === 'review-bong-targets') {
                  w.creeps.clear();
                  for (const [id, distance] of [
                    ['bong_in_reach', 100],
                    ['bong_out_of_reach', 126],
                  ] as const) {
                    const target = addCreep(
                      w,
                      id,
                      {
                        x: hero.x + hero.fx * distance,
                        y: hero.y + hero.fy * distance,
                      },
                      c,
                    );
                    target.archetypeId = 'creep_bandit_grunt';
                    target.stats = { ...c.creep, speed: 0, damage: 0 };
                    target.hp = target.maxHp = 600;
                  }
                } else if (op === 'review-statue') {
                  w.creeps.clear();
                  const r = w.statue!.collision!;
                  const point = { x: r.x - 66, y: r.y + r.height / 2 };
                  Object.assign(hero, {
                    x: r.x + r.width + 62,
                    y: point.y,
                    fx: 1,
                    fy: 0,
                    statuses: [],
                  });
                  const target = addCreep(w, 'statue_target', point, c);
                  target.stats = { ...c.creep, speed: 0, damage: 0 };
                  target.hp = target.maxHp = 300;
                } else if (op === 'review-hazard') {
                  const d = c.creepCombat!.dungeonHazards![zone.dungeon!.id]!;
                  w.creeps.clear();
                  hero.invulnerable = false;
                  hero.hp = hero.maxHp;
                  hero.statuses = [];
                  if (d.kind === 'quicksand') {
                    const pit = w.creepCombat?.effects.get('quicksand_0');
                    if (!pit)
                      throw Error('Desert entry did not spawn quicksand');
                    Object.assign(hero, { x: pit.x, y: pit.y });
                  } else if (d.kind === 'firetrap') {
                    Object.assign(hero, {
                      x: d.points[0]!.x * c.width,
                      y: d.points[0]!.y * c.height,
                    });
                  } else if (d.kind === 'geyser') {
                    Object.assign(hero, {
                      x: c.width * 0.46,
                      y: c.height * 0.5,
                    });
                  } else {
                    Object.assign(hero, {
                      x: c.width * 0.18,
                      y: c.height * 0.48,
                    });
                  }
                  if (d.kind !== 'quicksand') {
                    w.creepCombat = { actors: new Map(), effects: new Map() };
                    w.tick = Math.min(w.tick, d.firstTick - 2);
                  }
                } else if (op === 'review-support') {
                  hero.hp = hero.maxHp;
                  hero.invulnerable = true;
                  const id = q.get('id');
                  if (id === 'chu_wine_disciple' && w.chu) {
                    const phases = w.chu.definition.phases;
                    const drink = phases.findIndex(
                      (phase) => phase.id === 'drink',
                    );
                    w.chu.phaseIndex =
                      (drink + phases.length - 1) % phases.length;
                    w.chu.until = w.tick + 1;
                  } else if (id === 'bc_dog' && zone.id === 'arena') {
                    const definition = structuredClone(bacCaiDefinition);
                    definition.actionGapMs = definition.specialCooldownMs = 1e6;
                    definition.preferences.voteEveryMs = 1e9;
                    const encounter = new BacCaiEncounter(definition);
                    encounter.initialize(w, c);
                    encounter.phase = 'combat';
                    Object.assign(hero, {
                      x: definition.center.x + 100,
                      y: definition.center.y,
                    });
                    if (!encounter.begin(w, c, 'dogs', hero))
                      throw Error('Dog cast rejected');
                  } else if (
                    id &&
                    [
                      'mongol_infantry',
                      'mongol_archer',
                      'co_mo_am_binh',
                    ].includes(id)
                  ) {
                    const p = { x: c.width * 0.47, y: c.height * 0.55 };
                    Object.assign(hero, { x: p.x + 40, y: p.y, fx: -1, fy: 0 });
                    const support = addCreep(w, 'review_' + id, p, c);
                    support.archetypeId = id;
                    support.hp = support.maxHp = 100000;
                    support.stats = { ...c.creep, speed: 0, damage: 2 };
                  } else throw Error('Unknown encounter support');
                } else if (op === 'review-finisher' || op === 'review-hit') {
                  const e = w.creeps.get('review_' + q.get('id'));
                  if (e && e.hp > 0) {
                    if (op === 'review-finisher') e.hp = 1;
                    e.cooldown = w.tick + 10000;
                    if (w.creepCombat)
                      for (const [key, cue] of w.creepCombat.effects)
                        if (cue.ownerId === e.id)
                          w.creepCombat.effects.delete(key);
                    hero.cooldown = 0;
                    hero.statuses = [];
                    hero.actionUntil = 0;
                    Object.assign(hero, {
                      x: e.x + 40,
                      y: e.y,
                      fx: -1,
                      fy: 0,
                      moveX: 0,
                      moveY: 0,
                    });
                  }
                } else if (op === 'crowd') {
                  w.creeps.clear();
                  w.creepCombat = { actors: new Map(), effects: new Map() };
                  m.invasion!.nextWaveTick = 10000000;
                  let peer = 0;
                  for (const h of w.heroes.values()) {
                    const angle = (peer++ * Math.PI * 2) / 6;
                    Object.assign(h, {
                      x: 800 + Math.cos(angle) * 150,
                      y: 640 + Math.sin(angle) * 110,
                      invulnerable: true,
                      hp: h.maxHp,
                    });
                  }
                  let count = 0;
                  for (let row = 0; row < 14 && count < 120; row++)
                    for (let col = 0; col < 18 && count < 120; col++) {
                      const p = { x: 600 + col * 24, y: 440 + row * 24 };
                      if (
                        blocked(
                          p,
                          c.creep.radius,
                          c.width,
                          c.height,
                          c.collision,
                        )
                      )
                        continue;
                      const wave = (count % 20) + 1,
                        e = addCreep(w, `crowd_${count}`, p, c);
                      e.archetypeId = creepCombatDefinition.waveIds[wave - 1]!;
                      e.stats = { ...c.creep, speed: 0 };
                      e.hp = e.maxHp = 100000;
                      e.invasion = {
                        wave,
                        lane: 'west',
                        targetId: heroId,
                        chaseOrigin: { ...p },
                        reacquireAt: 0,
                        chaseRange: 500,
                        aggroRestTicks: 90,
                      };
                      count++;
                    }
                } else if (op === 'spawn') {
                  const id = q.get('id')!;
                  if (!creepProfiles[id]) throw Error('Unknown profile');
                  m.invasion!.nextWaveTick = 10000000;
                  w.creeps.clear();
                  w.projectiles.clear();
                  zone.nextWaveAt = undefined;
                  w.creepCombat = { actors: new Map(), effects: new Map() };
                  w.events = [];
                  const separated = q.get('placement') === 'separated-target';
                  const audit = q.get('audit') === '1';
                  const origin = separated
                    ? { x: 740, y: 740 }
                    : audit && zone.dungeon
                      ? { x: c.width * 0.49, y: c.height * 0.5 }
                      : (zone.dungeon?.creepSpawns[0] ?? { x: 760, y: 616 });
                  let index = 0;
                  for (const h of w.heroes.values()) {
                    const angle = (index++ * Math.PI * 2) / 5;
                    Object.assign(h, {
                      x:
                        origin.x +
                        (separated
                          ? h.id === heroId
                            ? 240
                            : 260
                          : h.id === heroId
                            ? audit && id === 'doc_chu'
                              ? 100
                              : 40
                            : Math.cos(angle) * 120),
                      y:
                        origin.y +
                        (separated || h.id === heroId
                          ? 0
                          : Math.sin(angle) * 120),
                      hp: 10000,
                      maxHp: 10000,
                      mana: h.maxMana,
                      invulnerable: !separated && !audit,
                      ...(audit
                        ? {
                            statuses: [],
                            moveX: 0,
                            moveY: 0,
                            hurtUntil: 0,
                            actionUntil: 0,
                          }
                        : {}),
                      fx: -1,
                      fy: 0,
                    });
                  }
                  const enemy = addCreep(w, `review_${id}`, origin, c);
                  enemy.archetypeId = id;
                  enemy.stats = { ...c.creep, speed: 0, damage: 20 };
                  enemy.hp = enemy.maxHp = 100000;
                  if (audit) enemy.cooldown = w.tick + 9;
                  const wave = creepCombatDefinition.waveIds.indexOf(id) + 1;
                  if (wave)
                    enemy.invasion = {
                      wave,
                      lane: 'west',
                      targetId: heroId,
                      chaseOrigin: { ...origin },
                      reacquireAt: 0,
                      chaseRange: 240,
                      aggroRestTicks: 90,
                    };
                  stepCreepHazards(w, c);
                  // Leave time for a real nonlethal hit before a self-destruct.
                  const specialDelay = creepProfiles[id]!.special?.suicide
                    ? 105
                    : 30;
                  w.creepCombat.actors.get(enemy.id)!.nextSpecial =
                    w.tick + (audit ? specialDelay : 12);
                  if (!audit && creepProfiles[id]!.death) {
                    enemy.hp = 1;
                    hero.invulnerable = false;
                  }
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    zone: zone.id,
                    tick: w.tick,
                    creeps: w.creeps.size,
                    hero: heroId,
                  }),
                );
              } catch (error) {
                res.statusCode = 500;
                res.end(String(error));
              }
            });
          },
        },
      ],
    });
    owned.add(() => client.close());
    await verifyQaIdentity(`${session.clientUrl}/volam-build-endpoint.json`, {
      serverUrl: session.serverUrl,
    });
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
