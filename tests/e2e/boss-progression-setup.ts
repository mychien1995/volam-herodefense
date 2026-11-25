import { ColyseusTestServer } from '@colyseus/testing';
import {
  beginNamDeCast,
  clearNamDe,
  beginNamDeDarkCast,
  namDeDarkSkills,
} from '@volam/game-core';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { startOwnedGameQa } from './owned-game-setup.js';
export default async function setup() {
  return startOwnedGameQa({
    config: 'playwright.boss-progression.config.ts',
    environment: {
      NODE_ENV: 'development',
      VOLAM_DEV_WAVE_BOSSES: '1',
      VOLAM_DEV_FINAL_BOSS: '1',
      VOLAM_DEV_BOSS_PROGRESSION: '1',
      VOLAM_DEV_LEGACY_SKILLS: undefined,
      VOLAM_DEV_SKILLS: undefined,
      VOLAM_DEV_CREEP_TEST: undefined,
      VOLAM_DEV_PRACTICE_CREEPS: undefined,
      VOLAM_TEST_LEGACY_PROGRESSION: undefined,
    },
    configure(server) {
      const authority = new ColyseusTestServer(server);
      return {
        plugins: [
          {
            name: 'difficulty-test-prerequisites',
            configurePreviewServer(vite) {
              const partyBots = new Map<string, any[]>();
              vite.middlewares.use('/__nam-dark-party', (req, res) => {
                void (async () => {
                  const q = new URL(req.url ?? '/', 'http://local')
                    .searchParams;
                  const roomId = q.get('room') ?? '';
                  const op = q.get('op');
                  if (req.method !== 'POST') throw Error('POST required');
                  if (op === 'join') {
                    const probe = q.get('probe') === '1';
                    if (partyBots.has(roomId))
                      throw Error('Party already joined');
                    const roster = [
                      ['cai_bang', 'cai_bang_chuong'],
                      ['thieu_lam', 'thieu_lam_quyen'],
                      ['thien_son', 'thien_son_phien'],
                      ['vo_dang', 'vo_dang_quyen'],
                    ] as const;
                    const clients: any[] = [];
                    for (const [i, [school, branch]] of (probe
                      ? roster.slice(0, 1)
                      : roster
                    ).entries()) {
                      const client = await authority.sdk.joinById<MatchRoom>(
                        roomId,
                        {
                          nickname: 'SDK party ' + i,
                          protocolVersion: PROTOCOL_VERSION,
                        },
                      );
                      clients.push(client);
                      client.onMessage('combat-event', () => {});
                      client.onMessage('command-rejected', () => {});
                      let selected = false,
                        sequence = 0,
                        lastTick = -1;
                      client.onStateChange((state: any) => {
                        if (state.phase === 'SCHOOL_SELECTION' && !selected) {
                          selected = true;
                          client.send('lobby-action', {
                            action: 'select',
                            schoolId: school,
                          });
                          client.send('lobby-action', {
                            action: 'branch',
                            basicId: branch,
                          });
                          client.send('lobby-action', { action: 'confirm' });
                        }
                        const h = state.players?.get(client.sessionId),
                          b = state.creeps?.get('boss_nam_de');
                        if (
                          state.phase !== 'IN_GAME' ||
                          !h?.confirmed ||
                          h.hp <= 0 ||
                          !b ||
                          b.hp <= 0 ||
                          state.tick - lastTick < (probe ? 2 : 6)
                        )
                          return;
                        if (!JSON.parse(state.defense.namDe || 'null')?.dark)
                          return;
                        lastTick = state.tick;
                        if (probe) {
                          const dark = JSON.parse(state.defense.namDe).dark;
                          if (
                            dark.blades.some(
                              (blade: any) =>
                                !blade.reflected &&
                                Math.hypot(blade.x - h.x, blade.y - h.y) < 130,
                            ) &&
                            (dark.guards.find(
                              (g: any) => g.id === client.sessionId,
                            )?.cooldownUntil ?? 0) <= state.tick
                          ) {
                            client.send('input', {
                              kind: 'nam-de-guard',
                              sequence: ++sequence,
                              protocolVersion: PROTOCOL_VERSION,
                            });
                          }
                          return;
                        }
                        const dx = b.x - h.x,
                          dy = b.y - h.y,
                          dist = Math.hypot(dx, dy);
                        client.send('input', {
                          kind: 'move',
                          x: dist > 95 ? Math.sign(dx) : 0,
                          y: dist > 95 ? Math.sign(dy) : 0,
                          sequence: ++sequence,
                          protocolVersion: PROTOCOL_VERSION,
                        });
                        client.send('input', {
                          kind: 'basic',
                          sequence: ++sequence,
                          protocolVersion: PROTOCOL_VERSION,
                        });
                      });
                    }
                    partyBots.set(roomId, clients);
                  } else if (op === 'close') {
                    const clients = partyBots.get(roomId) ?? [];
                    partyBots.delete(roomId);
                    await Promise.all(clients.map((client) => client.leave()));
                  } else if (op !== 'report')
                    throw Error('Unknown party operation');
                  const clients = partyBots.get(roomId) ?? [];
                  res.setHeader('content-type', 'application/json');
                  res.end(
                    JSON.stringify(
                      clients.map((client) => ({
                        id: client.sessionId,
                        hero: client.state?.players
                          ?.get(client.sessionId)
                          ?.toJSON(),
                      })),
                    ),
                  );
                })().catch((error) => {
                  res.statusCode = 400;
                  res.end(String(error));
                });
              });
              vite.middlewares.use('/__m4d-fixes', (req, res) => {
                try {
                  if (req.method !== 'POST') throw Error('POST required');
                  const q = new URL(req.url ?? '/', 'http://local')
                    .searchParams;
                  const room = authority.getRoomById<MatchRoom>(
                    q.get('room') ?? '',
                  );
                  if (room.state.phase !== 'IN_GAME')
                    throw Error('IN_GAME required');
                  const m = room.simulation,
                    w = room.world;
                  const h = m.hero(q.get('id') ?? '');
                  if (!h || h.hp <= 0) throw Error('Live actor required');
                  const op = q.get('op');
                  const b = w.creeps.get(
                    op?.startsWith('nam-dark')
                      ? 'boss_nam_de'
                      : w.vuong
                        ? 'vuong_trung_duong'
                        : w.bacCai
                          ? 'bac_cai'
                          : w.namDe?.phase === 'idle'
                            ? 'boss_nam_de'
                            : 'dong_ta',
                  );
                  if (!b || b.hp <= 0) throw Error('Live encounter required');
                  if (
                    [
                      'nam-dark-blade',
                      'nam-dark-fist',
                      'nam-dark-aim',
                      'nam-dark-finish',
                      'nam-dark-pose',
                    ].includes(op ?? '')
                  ) {
                    const s = w.namDe,
                      dark = s?.dark;
                    if (!s || !dark) throw Error('Dark phase required');
                    delete s.cast;
                    delete s.smallCast;
                    delete dark.cast;
                    s.effects.clear();
                    dark.blades = [];
                    dark.fists = [];
                    s.nextActionAt =
                      s.nextSmallAt =
                      dark.nextBlade =
                      dark.nextFist =
                        w.tick + 10000;
                    b.x = s.definition.arenaBounds.x;
                    b.y = s.definition.arenaBounds.y;
                    for (const hero of w.heroes.values()) {
                      hero.x =
                        b.x +
                        (op === 'nam-dark-aim' || op === 'nam-dark-finish'
                          ? 105
                          : op === 'nam-dark-blade'
                            ? 400
                            : 210);
                      hero.y =
                        b.y +
                        (hero.id !== h.id && op !== 'nam-dark-fist' ? 140 : 0);
                      hero.hp = hero.maxHp;
                      hero.statuses = [];
                      // Put the existing cleanse boots on a legal cooldown for this isolated skill probe.
                      if (hero.inventory)
                        hero.inventory.auxiliaryReadyAt = w.tick + 10000;
                      hero.autoBasic = false;
                      hero.moveX = hero.moveY = 0;
                      delete hero.moveDestination;
                      hero.fx = -1;
                      hero.fy = 0;
                    }
                    if (op === 'nam-dark-pose') {
                      const vectors: Record<string, [number, number]> = {
                        right: [1, 0],
                        down_right: [0.707, 0.707],
                        down: [0, 1],
                        down_left: [-0.707, 0.707],
                        left: [-1, 0],
                        up_left: [-0.707, -0.707],
                        up: [0, -1],
                        up_right: [0.707, -0.707],
                      };
                      const vector = vectors[q.get('ability') ?? ''];
                      if (!vector) throw Error('Unknown facing');
                      for (const hero of w.heroes.values()) {
                        hero.x = b.x + vector[0] * 400;
                        hero.y = b.y + vector[1] * 400;
                      }
                      b.fx = vector[0];
                      b.fy = vector[1];
                      b.pose = 'walk';
                    }
                    if (op === 'nam-dark-blade')
                      beginNamDeDarkCast(w, namDeDarkSkills.blade, h);
                    if (op === 'nam-dark-fist')
                      beginNamDeDarkCast(w, namDeDarkSkills.fist, h);
                    dark.nextBlade = dark.nextFist = w.tick + 10000;
                    if (op === 'nam-dark-finish') b.hp = 1;
                  } else if (op === 'nam-dark-ready') {
                    const s = w.namDe;
                    if (!s || b.id !== 'boss_nam_de')
                      throw Error('Nam Đế required');
                    clearNamDe(w);
                    s.phase = 'idle';
                    s.nextActionAt = s.nextSmallAt = w.tick + 10000;
                    b.x = s.definition.arenaBounds.x;
                    b.y = s.definition.arenaBounds.y;
                    b.hp = Math.ceil(b.maxHp * 0.4) + 1;
                    b.invulnerable = false;
                    h.x = b.x + 105;
                    h.y = b.y;
                    h.fx = -1;
                    h.fy = 0;
                    h.autoBasic = false;
                    h.moveX = h.moveY = 0;
                    delete h.moveDestination;
                  } else if (op === 'nam-long-target' || op === 'nam-qte') {
                    const s = w.namDe!;
                    if (!s || s.phase !== 'idle')
                      throw Error('Nam Đế idle required');
                    clearNamDe(w);
                    s.phase = 'idle';
                    s.nextActionAt = s.nextSmallAt = w.tick + 10000;
                    h.moveX = h.moveY = 0;
                    h.autoBasic = false;
                    h.hp = h.maxHp = 10000;
                    h.fx = 1;
                    h.fy = 0;
                    h.x = s.definition.entrance.x - 225;
                    h.y = s.definition.entrance.y;
                    b.x = s.definition.entrance.x + 225;
                    b.y = h.y;
                    if (op === 'nam-qte') {
                      h.x = s.definition.entrance.x - 50;
                      b.x = s.definition.entrance.x;
                      if (
                        !beginNamDeCast(
                          w,
                          m.arena.config,
                          'dai_ly_phong_huyet',
                          h.id,
                        )
                      )
                        throw Error('QTE cast rejected');
                    }
                  } else if (op === 'aim') {
                    h.x = b.x - 55;
                    h.y = b.y;
                    h.fx = 1;
                    h.fy = 0;
                    h.moveX = h.moveY = 0;
                    // Freeze long enough for one accepted player key; the hit is never fabricated.
                    b.pose = 'idle';
                    b.actionUntil = 0;
                    if (w.bacCai) {
                      const fixture = w.bacCai as unknown as {
                        nextAction: number;
                        nextSpecial: number;
                        nextVote: number;
                      };
                      fixture.nextAction =
                        fixture.nextSpecial =
                        fixture.nextVote =
                          w.tick + 10000;
                    }
                  } else if (op === 'vfx') {
                    for (const [i, p] of [...w.heroes.values()].entries()) {
                      p.hp = p.maxHp = 10000;
                      p.x = m.base.waveArena!.center.x + ((i % 3) - 1) * 110;
                      p.y =
                        m.base.waveArena!.center.y +
                        105 +
                        Math.floor(i / 3) * 55;
                      p.moveX = p.moveY = 0;
                      p.autoBasic = false;
                    }
                    const e = w.bacCai!;
                    if (!e || e.phase !== 'combat')
                      throw Error('Combat Bắc Cái required');
                    const ability = q.get('ability');
                    if (
                      ability !== 'spiral' &&
                      ability !== 'beam' &&
                      ability !== 'clones' &&
                      ability !== 'palms'
                    )
                      throw Error('Unsupported cast');
                    const original = e.step.bind(e);
                    e.step = (world, config) => {
                      original(world, config);
                      if (e.view(world, config).forms.length) return;
                      e.step = original;
                      e.cast = undefined;
                      e.effects.clear();
                      if (!e.begin(world, config, ability, h))
                        throw Error('Cast rejected');
                    };
                  } else if (op === 'elements') {
                    const e = w.vuong!;
                    if (!e) throw Error('VTD required');
                    h.x = e.definition.center.x + 235;
                    h.y = e.definition.center.y + 115;
                    h.hp = h.maxHp = 10000;
                    const original = e.step.bind(e);
                    e.step = (world, config) => {
                      original(world, config);
                      const fixture = e as unknown as {
                        start(...args: unknown[]): void;
                      };
                      fixture.start(world, config, b, 'elements', h, [
                        ...world.heroes.values(),
                      ]);
                      e.step = original;
                    };
                  } else throw Error('Unsupported prerequisite');
                  res.setHeader('content-type', 'application/json');
                  res.end(
                    JSON.stringify({
                      tick: w.tick,
                      hp: h.hp,
                      bossHp: b.hp,
                      center: m.base.waveArena!.center,
                    }),
                  );
                } catch (e) {
                  res.statusCode = 400;
                  res.end(String(e));
                }
              });
              vite.middlewares.use('/__difficulty', (req, res) => {
                try {
                  if (req.method !== 'POST') throw Error('POST required');
                  const q = new URL(req.url ?? '/', 'http://local')
                    .searchParams;
                  const room = authority.getRoomById<MatchRoom>(
                    q.get('room') ?? '',
                  );
                  if (
                    q.get('op') === 'arm' &&
                    room.simulation.bossRetries.voting
                  ) {
                    res.setHeader('content-type', 'application/json');
                    res.end(JSON.stringify({ vote: true }));
                    return;
                  }
                  if (
                    room.state.phase !== 'IN_GAME' ||
                    room.simulation.dongTa?.phase !== 'fighting'
                  )
                    throw Error('Wait for actual boss entry');
                  const m = room.simulation,
                    w = room.world,
                    b = w.creeps.get('dong_ta')!,
                    h = m.hero(q.get('id') ?? '')!;
                  if (q.get('op') === 'arm' && h && h.hp <= 0) {
                    res.setHeader('content-type', 'application/json');
                    res.end(JSON.stringify({ tick: w.tick, dead: true }));
                    return;
                  }
                  if (!h || h.hp <= 0 || !b || b.hp <= 0)
                    throw Error('Live actors required');
                  if (q.get('op') === 'aim') {
                    h.x = b.x - 75;
                    h.y = b.y;
                    h.fx = 1;
                    h.fy = 0;
                    h.moveX = h.moveY = 0;
                  } else if (q.get('op') === 'arm') {
                    h.hp = 1;
                    h.x = b.x + 35;
                    h.y = b.y;
                    h.moveX = h.moveY = 0;
                  } else if (q.get('op') === 'banter') {
                    m.dongTa!.casts = [];
                    m.dongTa!.effects = [];
                    b.pose = 'idle';
                    b.actionUntil = 0;
                    b.cooldown = w.tick + 10000;
                    const clock = w.bossBanter?.get(b.id);
                    if (!clock) throw Error('Wait for normal banter clock');
                    clock.nextAt = w.tick + 1;
                  } else if (q.get('op') === 'cast') {
                    const ability = q.get('ability');
                    if (
                      ability !== 'lac_anh_normal' &&
                      ability !== 'ngoc_tieu_hoi_phong'
                    )
                      throw Error('Unsupported prerequisite');
                    const encounter = m.dongTa!,
                      afterStep = encounter.afterStep.bind(encounter);
                    // Select a legal server cast at its actual afterStep event boundary.
                    encounter.afterStep = (world, config) => {
                      afterStep(world, config);
                      encounter.casts = [];
                      encounter.effects = [];
                      b.cooldown = world.tick + 10000;
                      if (
                        !encounter.beginCast(world, config, b.id, ability, h.id)
                      )
                        throw Error('Cast rejected');
                      encounter.afterStep = afterStep;
                    };
                  } else throw Error('Unknown prerequisite');
                  res.setHeader('content-type', 'application/json');
                  res.end(
                    JSON.stringify({
                      tick: w.tick,
                      bossHp: b.hp,
                      x: b.x,
                      y: b.y,
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
      };
    },
  });
}
