import { fileURLToPath } from 'node:url';
import { preview, type Plugin } from 'vite';
import { ColyseusTestServer } from '@colyseus/testing';
import {
  BacCaiEncounter,
  initializeNamDe,
  clearNamDe,
  beginNamDeCast,
  NAM_DE_ID,
  gainExperience,
  changeBuild,
  type DongAbility,
  type NamDeAbility,
  type TayDocAbility,
  type BacCaiAbility,
} from '@volam/game-core';
import { m1Config, bacCaiDefinition } from '@volam/game-data';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import {
  qaSession,
  requireFreePorts,
  qaIdentityPlugin,
  verifyQaIdentity,
  ownedQaServices,
} from '../../tools/qa-session.mjs';
export default async function setup() {
  return startWaveFeedback();
}
export async function startWaveFeedback(extraPlugins: Plugin[] = []) {
  const session = qaSession({
    serverPort: 2904,
    clientPort: 5504,
    profile: 'wave-boss-feedback',
  });
  await requireFreePorts(session);
  const names = [
    'NODE_ENV',
    'VOLAM_DEV_WAVE_BOSSES',
    'VOLAM_DEV_TAY_DOC',
    'VOLAM_DEV_LEGACY_SKILLS',
    'VOLAM_DEV_SKILLS',
    'VOLAM_DEV_PRACTICE_CREEPS',
    'VOLAM_INVASION_INTERVAL_SECONDS',
    'VOLAM_DEV_STATUE_HP',
  ];
  const previous = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  for (const n of names) delete process.env[n];
  process.env['NODE_ENV'] = 'development';
  const owners = ownedQaServices(),
    server = createGameServer();
  try {
    await server.listen(session.serverPort);
    owners.add(() => server.gracefullyShutdown(false));
    const authority = new ColyseusTestServer(server);
    const client = await preview({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      preview: {
        host: '127.0.0.1',
        port: session.clientPort,
        strictPort: true,
      },
      plugins: [
        ...extraPlugins,
        qaIdentityPlugin(session),
        {
          name: 'wave-feedback-authority-fixtures',
          configurePreviewServer(v) {
            v.middlewares.use('/__wave_feedback', (req, res) => {
              try {
                if (req.method !== 'POST') throw Error('POST required');
                const q = new URL(req.url ?? '/', 'http://local').searchParams,
                  room = authority.getRoomById<MatchRoom>(q.get('room') ?? ''),
                  m = room.simulation,
                  w = room.world;
                const op = q.get('op'),
                  boss = q.get('boss') ?? 'dong_ta';
                if (room.state.phase !== 'IN_GAME')
                  throw Error('Join a real match first');
                if (op === 'spawn') {
                  // Arrange prior chapter prerequisites and phase only, not the outcome under test.
                  m.dongTa!.casts = [];
                  m.dongTa!.effects = [];
                  m.dongTa!.phase = 'cleared';
                  m.tayDoc!.reset(w);
                  m.tayDoc!.phase = 'dead';
                  m.tayDocGate.spawned = true;
                  const nd = w.namDe!.definition;
                  clearNamDe(w);
                  initializeNamDe(w, m.arena.config, nd);
                  w.bacCai?.clear(w);
                  delete w.bacCai;
                  if (m.mainBosses) m.mainBosses.encounter = undefined;
                  w.creeps.clear();
                  w.projectiles.clear();
                  w.actions = [];
                  w.pending = [];
                  m.waveArena = undefined;
                  m.invasion!.wave = 0;
                  m.invasion!.nextWaveTick = m.arenaTick + 100000;
                  for (const h of w.heroes.values()) {
                    gainExperience(h, 1e8, m.arena.config);
                    const ids =
                      m1Config.progression!.schools[h.schoolId]!.basicIds;
                    changeBuild(w, h, m.arena.config, h.progression!.revision, {
                      action: 'branch',
                      basicId: ids[1]!,
                    });
                    h.hp = h.maxHp;
                    h.mana = h.maxMana;
                    h.moveX = h.moveY = 0;
                    h.statuses = [];
                  }
                  if (boss === 'dong_ta') {
                    m.dongTa!.phase = 'waiting';
                    m.dongTa!.definition.restTicks = 1;
                    m.dongTa!.definition.entryTicks = 2;
                    m.invasion!.wave = 5;
                    for (let i = 0; i < 5; i++) m.step();
                  } else if (boss === 'tay_doc') {
                    m.tayDoc!.reset(w);
                    m.tayDoc!.spawn(w, m.arena.config);
                    m.tayDoc!.phase = 'phase1';
                  } else if (boss === 'nam_de') {
                    w.namDe!.phase = 'rest';
                    w.namDe!.spawnAt = w.tick;
                    m.step();
                    w.namDe!.phase = 'idle';
                  } else if (boss === 'bac_cai') {
                    const e = new BacCaiEncounter(
                      structuredClone(bacCaiDefinition),
                    );
                    e.initialize(w, m.arena.config);
                    e.phase = 'combat';
                    if (m.mainBosses) m.mainBosses.encounter = e;
                  } else throw Error('Unknown boss');
                  m.step();
                  const b = w.creeps.get(
                    boss === 'nam_de'
                      ? NAM_DE_ID
                      : boss === 'tay_doc'
                        ? m.tayDoc!.bossId
                        : boss,
                  )!;
                  b.x = 800;
                  b.y = 616;
                  b.fx = 1;
                  b.fy = 0;
                  b.invulnerable = false;
                  b.cooldown = w.tick + 30;
                  if (q.get('natural') !== '1') {
                    for (const h of w.heroes.values()) h.hp = h.maxHp = 100000;
                    if (boss === 'tay_doc') m.tayDoc!.nextActionAt = Infinity;
                    if (boss === 'nam_de') w.namDe!.nextActionAt = Infinity;
                  }
                } else if (op === 'cast') {
                  const ability = q.get('ability') ?? '',
                    target = [...w.heroes.values()][0]!;
                  if (
                    boss === 'dong_ta' ||
                    boss === 'mai_sieu_phong' ||
                    boss === 'hoang_dung'
                  ) {
                    const e = m.dongTa!;
                    e.casts = [];
                    e.effects = [];
                    const b = w.creeps.get(boss)!;
                    if (!b) throw Error('Summon first');
                    b.cooldown = w.tick + 100000;
                    b.fx = 1;
                    b.fy = 0;
                    if (
                      !e.beginCast(
                        w,
                        m.arena.config,
                        boss,
                        ability as DongAbility,
                        target.id,
                      )
                    )
                      throw Error('Dong cast rejected');
                  } else if (boss === 'tay_doc') {
                    const e = m.tayDoc!;
                    e.clear(w);
                    e.nextActionAt = Infinity;
                    const b = w.creeps.get(e.bossId)!;
                    const phase2 = [
                      'doc_chuong',
                      'cap_mo_chan_kich',
                      'ngu_doc_than_chuong',
                      'van_doc_bao_phat',
                    ].includes(ability);
                    e.phase = phase2 ? 'phase2' : 'phase1';
                    b.hp = phase2 ? b.maxHp * 0.49 : b.maxHp;
                    b.fx = 1;
                    b.fy = 0;
                    if (
                      !e.begin(
                        w,
                        m.arena.config,
                        ability as TayDocAbility,
                        target,
                      )
                    )
                      throw Error('Tay cast rejected');
                  } else if (boss === 'nam_de') {
                    clearNamDe(w);
                    w.namDe!.phase = 'idle';
                    w.namDe!.nextActionAt = Infinity;
                    if (
                      !beginNamDeCast(
                        w,
                        m.arena.config,
                        ability as NamDeAbility,
                        target.id,
                      )
                    )
                      throw Error('Nam cast rejected');
                  } else {
                    const e = w.bacCai!;
                    e.cast = undefined;
                    if (
                      !e.begin(
                        w,
                        m.arena.config,
                        ability as BacCaiAbility,
                        target,
                      )
                    )
                      throw Error('Bac cast rejected');
                  }
                } else if (op === 'approach_copy') {
                  const e = w.bacCai!;
                  if (e.view(w, m.arena.config).clonePhase !== 'reveal')
                    throw Error('Wait for reveal');
                  const copy = [...w.creeps.values()].find(
                    (a) => a.archetypeId === 'bc_form',
                  );
                  if (!copy) throw Error('No copy');
                  const h = [...w.heroes.values()][0]!;
                  h.x = copy.x - 40;
                  h.y = copy.y;
                  h.fx = 1;
                  h.fy = 0;
                  h.moveX = h.moveY = 0;
                  h.actionUntil = 0;
                  h.cooldown = 0;
                } else if (op === 'natural_bac_clones') {
                  const e = w.bacCai!;
                  e.cast = undefined;
                  (e as any).nextAction = w.tick;
                  (e as any).nextSpecial = w.tick;
                  for (const ability of [
                    'dogs',
                    'beam',
                    'tether',
                    'field',
                    'spiral',
                    'vortex',
                  ])
                    (e as any).cooldowns.set(ability, Infinity);
                  (e as any).cooldowns.set('clones', 0);
                  (e as any).summonedDogs = true;
                } else if (op === 'boss_stand' || op === 'kill_boss') {
                  const key =
                    boss === 'nam_de'
                      ? NAM_DE_ID
                      : boss === 'tay_doc'
                        ? m.tayDoc!.bossId
                        : boss;
                  const actor = w.creeps.get(key);
                  if (!actor) throw Error('Boss not present');
                  if (op === 'kill_boss') actor.hp = 0;
                  else {
                    actor.x = Number(q.get('x'));
                    actor.y = Number(q.get('y'));
                  }
                } else if (op === 'dungeon_shout') {
                  const destination = q.get('destination') as
                    'co_mo' | 'chu_ba_thong' | 'hong_liet' | 'kim_luan';
                  if (
                    ![
                      'co_mo',
                      'chu_ba_thong',
                      'hong_liet',
                      'kim_luan',
                    ].includes(destination)
                  )
                    throw Error('Invalid dungeon');
                  for (const id of room.state.players.keys()) {
                    const old = m.zoneOf(id),
                      h = m.hero(id)!;
                    if (old && old.id !== 'arena') {
                      h.x = old.dungeon!.exit.x;
                      h.y = old.dungeon!.exit.y;
                      const error = m.exit(id);
                      if (error) throw Error(error);
                    }
                    const error = m.enter(id, 'shared', destination);
                    if (error) throw Error(error);
                  }
                  const z = m.zoneOf([...room.state.players.keys()][0]!)!,
                    dw = z.world;
                  for (const h of dw.heroes.values()) {
                    h.hp = h.maxHp = 100000;
                    h.moveX = h.moveY = 0;
                  }
                  if (destination === 'co_mo') {
                    const actor = dw.creeps.get(dw.boss!.actorId)!;
                    for (const h of dw.heroes.values()) {
                      h.x = actor.x + 240;
                      h.y = actor.y + 40;
                    }
                    dw.boss!.cast = undefined;
                    dw.boss!.rotation = 0;
                    dw.boss!.nextActionAt = dw.tick;
                  }
                  if (destination !== 'co_mo') {
                    const key =
                      destination === 'chu_ba_thong'
                        ? 'chu_ba_thong'
                        : destination === 'hong_liet'
                          ? 'hong_liet_boss'
                          : 'hoac_do';
                    const actor = dw.creeps.get(key)!;
                    for (const [i, h] of [...dw.heroes.values()].entries()) {
                      h.x = actor.x + 100 + i * 20;
                      h.y = actor.y + 40;
                    }
                  }
                  if (destination === 'chu_ba_thong') {
                    dw.chu!.phaseIndex =
                      dw.chu!.definition.phases.findIndex(
                        (p) => p.id === 'hands',
                      ) - 1;
                    dw.chu!.until = dw.tick;
                  }
                  if (destination === 'hong_liet') {
                    z.encounter!.cast = undefined;
                    (z.encounter as any).actionIndex = 3;
                    z.encounter!.nextActionAt = dw.tick;
                  }
                  if (destination === 'kim_luan') {
                    z.kim!.casts.clear();
                    (z.kim as any).order.set('hoac_do', 1);
                    (z.kim as any).next.set('hoac_do', dw.tick);
                  }
                } else if (op === 'stand') {
                  const x = Number(q.get('x')),
                    y = Number(q.get('y')),
                    h = m.hero(q.get('player') ?? [...w.heroes.keys()][0]!)!;
                  if (!Number.isFinite(x) || !Number.isFinite(y))
                    throw Error('Invalid position');
                  h.x = x;
                  h.y = y;
                  h.moveX = h.moveY = 0;
                } else if (op === 'wipe') {
                  for (const h of w.heroes.values()) h.hp = 0;
                } else if (op === 'inspect') {
                } else throw Error('Unknown fixture operation');
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    tick: w.tick,
                    arena: m.waveArenaView(),
                    statueInvulnerable: w.statue?.invulnerable,
                    statueHp: w.statue?.hp,
                    worldHp: Object.fromEntries(
                      [...w.creeps].map(([id, c]) => [id, c.hp]),
                    ),
                  }),
                );
              } catch (e) {
                res.statusCode = 400;
                res.end(String(e));
              }
            });
          },
        },
      ],
    });
    owners.add(() => client.close());
    await verifyQaIdentity(session.clientUrl + '/__volam_qa_identity', {
      service: 'volam-qa-client',
      runId: session.runId,
      serverUrl: session.serverUrl,
    });
    const build = await (
      await fetch(session.clientUrl + '/volam-build-endpoint.json')
    ).json();
    if (build.serverUrl !== session.serverUrl)
      throw Error('Build endpoint differs from owned QA server');
    return async () => {
      await owners.close();
      for (const n of names)
        if (previous[n] === undefined) delete process.env[n];
        else process.env[n] = previous[n];
    };
  } catch (e) {
    await owners.close();
    throw e;
  }
}
