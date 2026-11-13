import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Client, type Room } from '@colyseus/sdk';
import { type LobbyState, PROTOCOL_VERSION } from '@volam/game-protocol';
import { caiBangBongBeatTicks, coMoDungeon, m1Config } from '@volam/game-data';
import { joinWaiting, startAuditTogether } from './pregame-helper.js';
import { qaEvidenceDirectory, qaSession } from '../../tools/qa-session.mjs';

const session = qaSession({
  serverPort: 2928,
  clientPort: 5528,
  profile: 'creep-upgrade',
});
const evidence = qaEvidenceDirectory(
  'docs/evidence/sessions/m3d-review-integration/review',
);
const snapshot = (page: Page): Promise<any> =>
  page.evaluate('window.__VOLAM__.snapshot()');

async function openMatch(
  browser: Browser,
  request: APIRequestContext,
  branches: string[],
  gate: '1' | '4',
  options: {
    viewport?: { width: number; height: number };
    nicknames?: readonly string[];
  } = {},
) {
  const { viewport = { width: 1280, height: 720 }, nicknames = [] } = options;
  const contexts = await Promise.all([
    browser.newContext({ viewport }),
    browser.newContext({ viewport }),
  ]);
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const [host, peer] = pages as [Page, Page];
  const bots: Room<LobbyState>[] = [],
    errors: string[] = [];
  for (const page of pages)
    page.on('pageerror', (error) => errors.push(error.message));
  const close = async () => {
    for (const bot of bots) await bot.leave();
    for (const context of contexts) await context.close();
  };
  try {
    await host.goto('/?debug=1');
    await host.locator('#pre-nickname').fill(nicknames[0] ?? 'M3D Host');
    await host.getByRole('button', { name: 'Vào game', exact: true }).click();
    await host.locator('#pre-portals').selectOption(gate);
    await host.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await expect(host.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
    const first = await snapshot(host);
    const { roomId, sessionId } = first;
    await joinWaiting(peer, nicknames[1] ?? 'M3D Peer', roomId);
    const sdk = new Client(session.serverUrl);
    for (const [index, branch] of branches.slice(2).entries()) {
      const bot = await sdk.joinById<LobbyState>(roomId, {
        nickname: nicknames[index + 2] ?? branch,
        protocolVersion: PROTOCOL_VERSION,
      });
      bot.onMessage('*', () => {});
      bots.push(bot);
    }
    await expect
      .poll(
        async () => Object.keys((await snapshot(host)).state.players).length,
        { timeout: 30000, intervals: [100, 250] },
      )
      .toBe(branches.length);
    await Promise.all([
      startAuditTogether(
        [host, peer].map(
          (page, i) =>
            [
              page,
              m1Config.progression!.defaultBranches![branches[i]!]!.schoolId,
              branches[i]!,
            ] as const,
        ),
        35000,
      ),
      ...bots.map(async (bot, index) => {
        await expect
          .poll(() => bot.state.phase, { timeout: 30000 })
          .toBe('SCHOOL_SELECTION');
        const basicId = branches[index + 2]!;
        bot.send('lobby-action', {
          action: 'select',
          schoolId: m1Config.progression!.defaultBranches![basicId]!.schoolId,
        });
        bot.send('lobby-action', { action: 'branch', basicId });
        bot.send('lobby-action', { action: 'confirm' });
      }),
    ]);
    for (const page of pages)
      await expect(page.locator('#pregame')).toBeHidden({ timeout: 20000 });
    const call = async (op: string, extra: Record<string, string> = {}) => {
      const result = await request.post(
        '/__creep_fixture?' +
          new URLSearchParams({ room: roomId, hero: sessionId, op, ...extra }),
      );
      expect(result.ok(), await result.text()).toBe(true);
    };
    return { host, peer, bots, sessionId, call, close, errors };
  } catch (error) {
    await close();
    throw error;
  }
}

async function observeHeroes(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    const seen: Record<string, Record<string, string[]>> = {};
    w.__m3dHeroAudit = seen;
    let last = 0;
    const sample = () => {
      if (performance.now() - last < 28) {
        w.__VOLAM__.afterRender(sample);
        return;
      }
      last = performance.now();
      const s = w.__VOLAM__.snapshot(),
        p = w.__VOLAM__.presentation();
      for (const a of p.actors ?? []) {
        const hero = s.state.players[a.id];
        if (!hero || hero.hp <= 0) continue;
        const statuses = JSON.parse(hero.statuses) as Array<{ kind: string }>;
        const phases = [hero.pose, ...statuses.map((status) => status.kind)];
        if (hero.pose === 'basic_attack') phases.push('A:' + hero.basicStage);
        const body = (seen[hero.basicId] ??= {});
        for (const phase of phases) {
          const frames = (body[phase] ??= []);
          const source = a.texture + ':' + a.frame;
          if (!frames.includes(source) && frames.length < 40)
            frames.push(source);
        }
      }
      w.__VOLAM__.afterRender(sample);
    };
    w.__VOLAM__.afterRender(sample);
  });
}

async function verifyHeroes(
  match: Awaited<ReturnType<typeof openMatch>>,
  branches: string[],
) {
  const { host, peer, bots, call } = match;
  const report = () =>
    host.evaluate<Record<string, Record<string, string[]>>>(
      'window.__m3dHeroAudit',
    );
  await observeHeroes(host);
  await call('review-heroes');
  await host.locator('#game canvas').focus();
  await peer.locator('#game canvas').focus();
  await Promise.all([
    host.keyboard.press('a'),
    peer.keyboard.press('a'),
    ...bots.map((bot) =>
      bot.send('input', {
        kind: 'basic',
        sequence: 1,
        protocolVersion: PROTOCOL_VERSION,
      }),
    ),
  ]);
  await expect
    .poll(
      async () => {
        const frames = await report();
        return branches.filter(
          (branch) => frames[branch]?.['basic_attack']?.length,
        );
      },
      { timeout: 9000, intervals: [50, 100, 150] },
    )
    .toEqual(branches);
  const staff = bots.find(
    (bot) => bot.state.players.get(bot.sessionId)?.basicId === 'cai_bang_bong',
  );
  if (staff) {
    for (const [index, stage] of [
      'sweep',
      'lift',
      'smash',
      'thrust',
    ].entries()) {
      await expect
        .poll(
          () => staff.state.players.get(staff.sessionId)?.basicCooldown ?? 99,
          { intervals: [30, 60] },
        )
        .toBe(0);
      staff.send('input', {
        kind: 'basic',
        sequence: index + 2,
        protocolVersion: PROTOCOL_VERSION,
      });
      await expect
        .poll(
          async () =>
            (await report())['cai_bang_bong']?.['A:' + stage]?.some((frame) =>
              frame.startsWith('renovated-bong-combo-body:'),
            ),
          { intervals: [40, 65] },
        )
        .toBe(true);
    }
  }
  await call('review-control', { id: 'truc_xa' });
  await expect
    .poll(
      async () => {
        const frames = await report();
        return branches.filter(
          (branch) =>
            frames[branch]?.['hurt']?.length &&
            frames[branch]?.['slow']?.length,
        );
      },
      { timeout: 11000, intervals: [60, 120, 180] },
    )
    .toEqual(branches);
  await call('review-control', { id: 'cu_nhan_sa_thach' });
  await expect
    .poll(
      async () => {
        const frames = await report();
        return branches.filter((branch) => frames[branch]?.['stun']?.length);
      },
      { timeout: 11000, intervals: [60, 120, 180] },
    )
    .toEqual(branches);
  const frames = await report();
  const legacy =
    /^(hero_cai_bang|hero_cai_bang_chuong|hero_thien_son|hero_thien_son_dao|hero_vo_dang|hero_vo_dang_kiem|hero_thieu_lam|hero_thieu_lam_dao):/;
  for (const branch of branches)
    for (const phase of ['basic_attack', 'hurt', 'slow', 'stun'])
      expect(
        frames[branch]?.[phase]?.filter((frame) => legacy.test(frame)),
        branch + ' ' + phase,
      ).toEqual([]);
  return frames;
}

test('six-branch party: real attacks and slow/stun keep approved bodies; a real shot crosses the statue', async ({
  browser,
  request,
}) => {
  mkdirSync(evidence, { recursive: true });
  const branches = [
    'vo_dang_kiem',
    'thieu_lam_dao',
    'cai_bang_bong',
    'cai_bang_chuong',
    'thien_son_phien',
    'thien_son_dao',
  ];
  const match = await openMatch(browser, request, branches, '4');
  try {
    const frames = await verifyHeroes(match, branches);
    const palm = match.bots.find(
      (bot) =>
        bot.state.players.get(bot.sessionId)?.basicId === 'cai_bang_chuong',
    )!;
    await match.call('review-heroes');
    await match.call('review-statue', { hero: palm.sessionId });
    await expect
      .poll(
        async () =>
          (await snapshot(match.host)).state.creeps['statue_target']?.hp,
      )
      .toBe(300);
    palm.send('input', {
      kind: 'basic',
      sequence: 20,
      protocolVersion: PROTOCOL_VERSION,
    });
    await expect
      .poll(
        async () =>
          (await snapshot(match.host)).state.creeps['statue_target']?.hp,
      )
      .toBeLessThan(300);
    await expect
      .poll(
        async () =>
          (await snapshot(match.peer)).state.creeps['statue_target']?.hp,
      )
      .toBe((await snapshot(match.host)).state.creeps['statue_target']?.hp);
    expect(match.errors).toEqual([]);
    await match.host.screenshot({ path: evidence + '/arena-six-player.png' });
    writeFileSync(
      evidence + '/six-branches.json',
      JSON.stringify(frames, null, 2),
    );
  } finally {
    await match.close();
  }
});

test('two remaining branches, east-only invasion, O + Q and server-timed dungeon traps', async ({
  browser,
  request,
}) => {
  mkdirSync(evidence, { recursive: true });
  const branches = ['vo_dang_quyen', 'thieu_lam_quyen'];
  const match = await openMatch(browser, request, branches, '1');
  const { host, peer, sessionId, call } = match;
  const hero = async () => (await snapshot(host)).state.players[sessionId];
  const trapFrames: Record<string, string[]> = {};
  try {
    expect((await snapshot(host)).state.defense.portalCount).toBe(1);
    expect((await snapshot(host)).state.defense.devCreepTest).toBe(false);
    await call('stream');
    await expect
      .poll(async () => [
        ...new Set(
          Object.values((await snapshot(peer)).state.creeps)
            .map((e: any) => e.lane)
            .filter(Boolean),
        ),
      ])
      .toEqual(['east']);
    await call('review-heroes');
    await host.locator('#game canvas').focus();
    await host.keyboard.down('o');
    await host.keyboard.press('q');
    await host.keyboard.up('o');
    await expect.poll(async () => (await hero()).build.available).toBe(0);
    expect((await hero()).qCooldown).toBe(0);
    await host.keyboard.press('q');
    await expect.poll(async () => (await hero()).qCooldown).toBeGreaterThan(0);

    const frames = await verifyHeroes(match, branches);
    for (const [zone, ability, clip, expected] of [
      ['forest', 'darts', 'dart/', 'stun'],
      ['desert', 'quicksand', 'quicksand/', 'dash_lock'],
      ['sea', 'geyser', 'geyser/', 'stun'],
      ['hell', 'firetrap', 'firetrap/', 'stun'],
    ]) {
      await call('arena');
      await call('enter', { zone: zone! });
      await expect.poll(async () => (await hero()).zoneId).toContain(zone);
      if (zone === 'desert') {
        const positions = async () => {
          const s = await snapshot(host);
          return Object.values(s.state.bossEffects as Record<string, any>)
            .filter(
              (e) =>
                e.zoneId === s.state.players[s.sessionId].zoneId &&
                e.abilityId === 'quicksand',
            )
            .map(({ x, y }) => [x, y]);
        };
        await expect.poll(async () => (await positions()).length).toBe(8);
        const first = await positions();
        await expect
          .poll(
            async () => {
              const next = await positions();
              return (
                next.length === 8 &&
                JSON.stringify(next) !== JSON.stringify(first)
              );
            },
            { timeout: 8000 },
          )
          .toBe(true);
      }
      await call('review-hazard');
      const review = () =>
        host.evaluate<string[]>(
          'window.__VOLAM__.presentation().creepCombat?.observed ?? []',
        );
      await expect
        .poll(
          async () => (await review()).some((frame) => frame.includes(clip!)),
          { timeout: 13000, intervals: [60, 120] },
        )
        .toBe(true);
      await expect
        .poll(
          async () => (await hero()).statuses.includes('"' + expected + '"'),
          { timeout: 13000, intervals: [40, 80, 120] },
        )
        .toBe(true);
      trapFrames[ability!] = (await review()).filter((frame) =>
        frame.includes(clip!),
      );
      if (zone === 'desert') {
        const inSand = await hero();
        await host.locator('#game canvas').focus();
        await host.keyboard.press('Shift');
        await expect
          .poll(async () => (await hero()).lastSequence)
          .toBeGreaterThan(inSand.lastSequence);
        expect((await hero()).dashCharges).toBe(inSand.dashCharges);
        await host.screenshot({ path: evidence + '/desert-quicksand.png' });
      }
      if (zone === 'sea' || zone === 'hell') {
        await expect
          .poll(
            async () =>
              (await review()).some((frame) => frame.endsWith(clip + '2')),
            { intervals: [40, 70] },
          )
          .toBe(true);
        await host.screenshot({ path: evidence + '/' + zone + '-trap.png' });
      }
    }
    const supportArt: Record<string, { texture: string; frame: string }> = {};
    for (const [zone, id] of [
      ['hong_liet', 'mongol_infantry'],
      ['hong_liet', 'mongol_archer'],
      ['co_mo', 'co_mo_am_binh'],
      ['chu_ba_thong', 'chu_wine_disciple'],
      ['arena', 'bc_dog'],
    ] as const) {
      await call('arena');
      if (zone !== 'arena') {
        await call('enter', { zone });
        await expect.poll(async () => (await hero()).zoneId).toContain(zone);
      }
      await call('review-support', { id });
      await expect
        .poll(
          async () => {
            const p = await host.evaluate<any>(
              'window.__VOLAM__.presentation()',
            );
            const sample =
              zone === 'hong_liet'
                ? p.hongLiet?.entities.find(
                    (a: any) =>
                      a.id.endsWith('review_' + id) &&
                      a.asset.startsWith('renovated-'),
                  )
                : zone === 'co_mo'
                  ? p.actors.find(
                      (a: any) =>
                        a.id.endsWith('review_' + id) &&
                        a.texture.startsWith('renovated-'),
                    )
                  : zone === 'chu_ba_thong'
                    ? p.chu?.sprites.find(
                        (a: any) =>
                          a.id.startsWith('disciple:') &&
                          a.texture.startsWith('renovated-'),
                      )
                    : p.bacCai?.views.find(
                        (a: any) =>
                          a.key.startsWith('bc_dog_') &&
                          a.texture.startsWith('renovated-'),
                      );
            if (!sample) return false;
            supportArt[id] = {
              texture: sample.texture ?? sample.asset,
              frame: sample.frame,
            };
            return supportArt[id].texture.startsWith('renovated-');
          },
          { timeout: 12000, intervals: [50, 100, 200] },
        )
        .toBe(true);
    }
    expect(match.errors).toEqual([]);
    writeFileSync(
      evidence + '/two-branches-traps.json',
      JSON.stringify({ frames, trapFrames, supportArt }, null, 2),
    );
  } finally {
    await match.close();
  }
});

test('Bổng tầm 105 trong trận M3D, cả bốn hướng và nhịp A cận chiến', async ({
  browser,
  request,
}) => {
  const match = await openMatch(
    browser,
    request,
    [
      'cai_bang_bong',
      'vo_dang_kiem',
      'vo_dang_quyen',
      'thieu_lam_quyen',
      'thieu_lam_dao',
      'thien_son_phien',
    ],
    '4',
    {
      viewport: { width: 960, height: 640 },
      nicknames: ['Bổng', 'Kiếm', 'Võ Đang', 'Quyền', 'Đao', 'Phiến'],
    },
  );
  const { host, peer, sessionId, call } = match;
  const texture = 'renovated-bong-combo-body';
  const report = () =>
    host.evaluate<Record<string, string[]>>('window.__bongFrames');
  const hero = async () => (await snapshot(host)).state.players[sessionId];
  const frame = async (page: Page) =>
    page.evaluate(
      (id) =>
        (window as any).__VOLAM__
          .presentation()
          .actors.find((a: any) => a.id === id),
      sessionId,
    );
  const target = async (page: Page, key: string) => {
    const creeps = (await snapshot(page)).state.creeps as Record<
      string,
      { hp: number }
    >;
    return Object.entries(creeps).find(([id]) => id.endsWith(key))?.[1].hp;
  };
  const directions = [
    ['right', 'ArrowRight', 1, 0],
    ['down', 'ArrowDown', 0, 1],
    ['left', 'ArrowLeft', -1, 0],
    ['up', 'ArrowUp', 0, -1],
  ] as const;
  const stages = [
    ['thrust', 'thrust'],
    ['sweep', 'sweep'],
    ['lift', 'rising'],
    ['smash', 'overhead'],
  ] as const;

  const capture = (page: Page, names: string[], id: string) =>
    page.evaluate(
      ({ id, names }) =>
        new Promise<string>((resolve) => {
          const api = (window as any).__VOLAM__;
          const deadline = performance.now() + 5000;
          const after = () => {
            const actor = api
              .presentation()
              .actors.find((a: any) => a.id === id);
            if (names.includes(actor?.frame)) {
              resolve(
                document
                  .querySelector<HTMLCanvasElement>('#game canvas')!
                  .toDataURL('image/png'),
              );
            } else if (performance.now() > deadline) {
              resolve('');
            } else api.afterRender(after);
          };
          api.afterRender(after);
        }),
      { id, names },
    );

  try {
    await call('review-bong-party');
    mkdirSync(evidence, { recursive: true });
    await expect
      .poll(
        async () => Object.keys((await snapshot(peer)).state.players).length,
      )
      .toBe(6);
    await expect
      .poll(() =>
        peer.evaluate(() => {
          const api = (window as any).__VOLAM__;
          const players = api.snapshot().state.players;
          return api
            .presentation()
            .actors.filter((a: any) => players[a.id] && a.alpha > 0).length;
        }),
      )
      .toBe(6);

    const peerId = (await snapshot(peer)).sessionId;
    await peer.bringToFront();
    await peer.locator('#game canvas').focus();
    const peerTick = async () =>
      (await snapshot(peer)).state.players[peerId].actionStartedAt;
    for (let i = 0; i < 2; i++) {
      const before = await peerTick();
      await peer.keyboard.press('a');
      await expect.poll(peerTick).toBeGreaterThan(before);
      expect((await snapshot(peer)).state.players[peerId].basicCooldown).toBe(
        0,
      );
    }
    for (const bot of match.bots) {
      const player = () => bot.state.players.get(bot.sessionId)!;
      for (let sequence = 1; sequence <= 2; sequence++) {
        const before = player().actionStartedAt;
        bot.send('input', {
          kind: 'basic',
          sequence,
          protocolVersion: PROTOCOL_VERSION,
        });
        await expect
          .poll(() => player().actionStartedAt)
          .toBeGreaterThan(before);
        if (player().basicId !== 'thien_son_phien')
          expect(player().basicCooldown).toBe(0);
        else await expect.poll(() => player().basicCooldown).toBe(0);
      }
    }

    await host.bringToFront();
    await host.locator('#game canvas').focus();
    await host.evaluate(
      ({ sessionId, texture }) => {
        const w = window as any;
        const api = w.__VOLAM__;
        const seen: Record<string, string[]> = {};
        w.__bongFrames = seen;
        const sample = () => {
          const actor = api
            .presentation()
            .actors.find((a: any) => a.id === sessionId);
          if (actor?.texture === texture) {
            const group = String(actor.frame).replace(/_\d+$/, '');
            const frames = (seen[group] ??= []);
            if (!frames.includes(actor.frame)) frames.push(actor.frame);
          }
          api.afterRender(sample);
        };
        api.afterRender(sample);
      },
      { sessionId, texture },
    );

    const hits = [];
    for (const [direction, key, fx, fy] of directions) {
      await host.keyboard.down(key);
      try {
        await expect
          .poll(async () => (await report())['walk_' + direction]?.length ?? 0)
          .toBe(4);
      } finally {
        await host.keyboard.up(key);
      }
      await expect
        .poll(async () => {
          const player = await hero();
          return [player.pose, player.fx, player.fy];
        })
        .toEqual(['idle', fx, fy]);
      await expect
        .poll(async () => {
          const pose = await frame(peer);
          return [pose?.texture, pose?.frame];
        })
        .toEqual([texture, 'idle_' + direction + '_0']);
      const idle = await frame(host);
      expect(idle.origin).toEqual([0.5, 235 / 320]);
      expect(idle.scale).toEqual([0.5, 0.5]);
      if (direction === 'right') {
        const png = await capture(host, ['idle_right_0'], sessionId);
        expect(png).toMatch(/^data:image\/png;base64,/);
        writeFileSync(
          evidence + '/bong-idle.png',
          Buffer.from(png.split(',')[1]!, 'base64'),
        );
      }
      await call('review-bong-targets');
      await expect.poll(() => target(host, 'bong_in_reach')).toBe(600);
      for (const [stage, prefix] of stages) {
        await expect
          .poll(async () => (await hero()).basicCooldown, {
            intervals: [25, 50],
          })
          .toBe(0);
        const before = (await target(host, 'bong_in_reach'))!;
        const accepted = (await hero()).actionStartedAt;
        const tag = 'combo_' + prefix + '_' + direction;
        const sample =
          stage === 'smash'
            ? capture(
                host,
                [0, 1, 2, 3].map((cel) => tag + '_' + cel),
                sessionId,
              )
            : undefined;
        await host.keyboard.press('a');
        await expect
          .poll(
            async () => {
              const player = await hero();
              return (
                player.actionStartedAt > accepted && player.basicStage === stage
              );
            },
            { intervals: [25, 50] },
          )
          .toBe(true);
        await expect
          .poll(() => target(host, 'bong_in_reach'))
          .toBeLessThan(before);
        const hp = (await target(host, 'bong_in_reach'))!;
        await expect.poll(() => target(peer, 'bong_in_reach')).toBe(hp);
        expect(await target(host, 'bong_out_of_reach')).toBe(600);
        // The 8-tick beat can span only one draw on a busy CI renderer.
        // Check the actual rendered pose for every beat and retain its cel list.
        await expect
          .poll(async () => (await report())[tag]?.length ?? 0, {
            message: 'Rendered Bổng pose ' + tag,
            intervals: [30, 60],
          })
          .toBeGreaterThan(0);
        hits.push({ direction, stage, damage: before - hp, outsideHP: 600 });
        writeFileSync(
          evidence + '/bong-in-match.json',
          JSON.stringify({ players: 6, frames: await report(), hits }, null, 2),
        );

        if (sample) {
          const png = await sample;
          expect(png).toMatch(/^data:image\/png;base64,/);
          writeFileSync(
            evidence + '/bong-vut-' + direction + '.png',
            Buffer.from(png.split(',')[1]!, 'base64'),
          );
        }
      }
    }
    const frames = await report();
    expect(Object.keys(frames)).toHaveLength(24);
    expect(m1Config.basics.cai_bang_bong?.cooldownTicks).toBe(
      caiBangBongBeatTicks,
    );
    expect(match.errors).toEqual([]);
    writeFileSync(
      evidence + '/bong-in-match.json',
      JSON.stringify({ players: 6, frames, hits }, null, 2),
    );
  } finally {
    await match.close();
  }
});

test('Thiên Hạ Vô Cẩu giảm sát thương trong lúc xoay và hồi máu ở cú cuối', async ({
  browser,
  request,
}) => {
  const match = await openMatch(
    browser,
    request,
    ['cai_bang_bong', 'vo_dang_kiem'],
    '4',
    { viewport: { width: 960, height: 640 } },
  );
  const { host, peer, sessionId, call } = match;
  const skill = 'thien_ha_vo_cau';
  const enemyHits = (events: any[]) =>
    events.filter(
      (e) =>
        e.kind === 'hit' &&
        e.targetId === sessionId &&
        e.sourceId.endsWith('ultimate_attacker'),
    );
  try {
    await host.bringToFront();
    await host.locator('#game canvas').focus();
    await call('review-bong-ultimate');
    await expect
      .poll(async () => enemyHits((await snapshot(host)).events).length)
      .toBeGreaterThan(0);
    await host.keyboard.press('t');
    await expect
      .poll(async () =>
        (await snapshot(host)).events.some(
          (e: any) => e.abilityId === skill && e.stage === 'heal',
        ),
      )
      .toBe(true);
    await expect
      .poll(async () => {
        const s = await snapshot(host);
        const heal = s.events.find(
          (e: any) => e.abilityId === skill && e.stage === 'heal',
        );
        return enemyHits(s.events).some((e) => e.tick > heal.tick);
      })
      .toBe(true);

    const s = await snapshot(host);
    const cast = s.events.find(
      (e: any) => e.abilityId === skill && e.kind === 'cast',
    );
    const heal = s.events.find(
      (e: any) => e.abilityId === skill && e.stage === 'heal',
    );
    const all = enemyHits(s.events);
    const before = all.filter((e) => e.tick < cast.tick).at(-1)!;
    const during = all.filter((e) => e.tick > cast.tick && e.tick < heal.tick);
    const after = all.find((e) => e.tick > heal.tick)!;
    expect(during.length).toBeGreaterThan(0);
    for (const hit of during)
      expect(hit.damage).toBeCloseTo(before.damage * 0.2, 5);
    expect(after.damage).toBe(before.damage);
    expect(heal.damage).toBeCloseTo(s.state.players[sessionId].maxHp * 0.05, 5);
    await expect
      .poll(
        async () =>
          (await snapshot(peer)).events.find((e: any) => e.id === heal.id)
            ?.damage,
      )
      .toBe(heal.damage);
    expect(match.errors).toEqual([]);
    mkdirSync(evidence, { recursive: true });
    writeFileSync(
      evidence + '/bong-ultimate.json',
      JSON.stringify({ before, during, after, heal }, null, 2),
    );
  } finally {
    await match.close();
  }
});

test('Co Mo tuning: arena, projectile slows and a real Q during the sweep', async ({
  browser,
  request,
}, testInfo) => {
  const match = await openMatch(
    browser,
    request,
    ['thien_son_phien', 'cai_bang_bong'],
    '4',
  );
  const { host, peer, call, sessionId } = match;
  const hero = async () => (await snapshot(host)).state.players[sessionId];
  const presentation = () =>
    host.evaluate<any>('window.__VOLAM__.presentation()');
  const boss = async () =>
    Object.values((await snapshot(host)).state.creeps).find(
      (c: any) => c.archetypeId === 'ly_mac_sau',
    ) as { castAbilityId: string } | undefined;
  const summons = async (page: Page) =>
    Object.entries((await snapshot(page)).state.creeps)
      .filter(([, c]: [string, any]) => c.archetypeId === 'co_mo_am_binh')
      .map(([id, c]: [string, any]) => [id, c.maxHp])
      .sort();
  const readSlow = async (page: Page, abilityId: string) => {
    const s = await snapshot(page);
    const player = s.state.players[s.sessionId];
    const statuses = JSON.parse(player.statuses) as Array<{
      kind: string;
      abilityId: string;
      magnitude: number;
      ticks: number;
    }>;
    return statuses.find((s) => s.kind === 'slow' && s.abilityId === abilityId);
  };
  try {
    await call('review-isolate');
    await host.locator('#game canvas').focus();
    await host.keyboard.down('o');
    await host.keyboard.press('q');
    await host.keyboard.up('o');
    await expect.poll(async () => (await hero()).qSkill).toBe('lien_hoa_phien');
    for (const page of [host, peer]) {
      await page.keyboard.press('p');
      await page
        .getByRole('button', { name: 'Lý Mạc Sầu', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Vào phó bản', exact: true })
        .click();
      await expect
        .poll(async () => {
          const s = await snapshot(page);
          return s.state.players[s.sessionId].zoneId;
        })
        .toBe('co_mo_shared');
      const help = page.getByRole('dialog', { name: 'Triệu hồi đồng đội' });
      await help.getByRole('button', { name: 'Không', exact: true }).click();
      await expect(help).toBeHidden();
    }
    await host.bringToFront();
    await expect
      .poll(async () => (await presentation()).coMoArena)
      .toMatchObject({
        camera: {
          width: expect.closeTo(coMoDungeon.width),
          height: expect.closeTo(coMoDungeon.height),
        },
        ground: {
          width: expect.closeTo(coMoDungeon.width),
          height: expect.closeTo(coMoDungeon.height),
        },
      });
    const arena = (await presentation()).coMoArena;
    expect(arena.camera.width * arena.camera.height).toBeCloseTo(
      1408 * 1056 * 0.8 * 0.9,
    );

    await call('review-co-mo', { phase: 'far' });
    await expect
      .poll(async () => (await boss())?.castAbilityId)
      .toBe('bang_phach_ngan_cham');
    await peer.bringToFront();
    const recipient = (await snapshot(peer)).sessionId;
    await call('review-co-mo', { phase: 'summon', hero: recipient });
    await expect
      .poll(
        async () =>
          (await readSlow(peer, 'creep_co_mo_am_binh_basic'))?.magnitude,
        { message: 'Âm Binh slow on the player it hits', intervals: [40, 80] },
      )
      .toBe(0.6);
    await expect
      .poll(async () => (await summons(host)).length)
      .toBeGreaterThanOrEqual(4);
    const adds = await summons(host);
    expect([4, 6, 8]).toContain(adds.length);
    expect(adds.every(([, hp]) => hp === 240)).toBe(true);
    await expect.poll(() => summons(peer)).toEqual(adds);
    await call('review-co-mo', { phase: 'poison', hero: recipient });
    await expect
      .poll(async () => (await readSlow(peer, 'ngu_doc_chuong'))?.magnitude, {
        message: 'Ngũ Độc Chưởng slow on the peer it hits',
        intervals: [40, 80],
      })
      .toBe(0.7);

    await host.bringToFront();
    await call('review-co-mo', { phase: 'sweep' });
    await host.locator('#game canvas').focus();
    expect((await hero()).qCooldown).toBe(0);
    await host.keyboard.press('q');
    await expect.poll(async () => (await hero()).qCooldown).toBeGreaterThan(0);
    const lotus = async (page: Page) =>
      Object.values((await snapshot(page)).state.areas).find(
        (a: any) => a.abilityId === 'lien_hoa_phien' && a.ownerId === sessionId,
      );
    await expect.poll(() => lotus(host)).toBeTruthy();
    await expect.poll(() => lotus(peer)).toBeTruthy();
    await expect
      .poll(async () => (await presentation()).skills.approved.persistent)
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ skill: 'lien_hoa_phien' }),
        ]),
      );
    await call('review-co-mo-sweep');
    const sweepHit = async () =>
      (await snapshot(host)).events.find(
        (e: any) =>
          e.kind === 'hit' &&
          e.abilityId === 'phat_tran_cong' &&
          e.targetId === sessionId &&
          e.damage > 0,
      );
    await expect.poll(sweepHit).toBeTruthy();
    mkdirSync(evidence, { recursive: true });
    await host.screenshot({ path: evidence + '/co-mo-lien-hoa-phien.png' });
    writeFileSync(
      evidence + '/co-mo-tuning.json',
      JSON.stringify(
        {
          arena,
          adds,
          observedSlows: [0.6, 0.7],
          sweepHit: await sweepHit(),
        },
        null,
        2,
      ),
    );
    expect(match.errors).toEqual([]);
  } catch (error) {
    const captures = await Promise.all([host, peer].map(snapshot));
    await testInfo.attach('Cổ Mộ combat state', {
      body: JSON.stringify(
        captures.map((s) => ({
          sessionId: s.sessionId,
          players: s.state.players,
          events: s.events.slice(-50),
        })),
        null,
        2,
      ),
      contentType: 'application/json',
    });
    throw error;
  } finally {
    await match.close();
  }
});

test('Wave creep và nhịp bẫy Sa Mạc, Biển, Địa Ngục trong trận M3D', async ({
  browser,
  request,
}) => {
  const match = await openMatch(
    browser,
    request,
    ['cai_bang_bong', 'vo_dang_kiem'],
    '1',
    { viewport: { width: 960, height: 640 } },
  );
  const { host, peer, call, sessionId } = match;
  const report: Record<string, unknown> = {};
  try {
    await call('stream');
    const firstWaveHp = async (page: Page) =>
      Object.values(
        (await snapshot(page)).state.creeps as Record<
          string,
          { lane: string; maxHp: number }
        >,
      ).find((enemy) => enemy.lane === 'east')?.maxHp;
    await expect.poll(() => firstWaveHp(host)).toBe(158);
    await expect.poll(() => firstWaveHp(peer)).toBe(158);
    report.firstWaveHp = 158;
    await call('review-isolate');
    await host.bringToFront();
    for (const [zone, ability, prefix, count] of [
      ['desert', 'quicksand', 'quicksand/', 8],
      ['sea', 'geyser', 'geyser/', 4],
      ['hell', 'firetrap', 'firetrap/', 4],
    ] as const) {
      await call('arena');
      await call('enter', { zone });
      const player = async () =>
        (await snapshot(host)).state.players[sessionId];
      await expect.poll(async () => (await player()).zoneId).toContain(zone);
      await expect
        .poll(async () => {
          const s = await snapshot(host);
          return Object.values(
            s.state.creeps as Record<string, { zoneId: string }>,
          ).filter((e) => e.zoneId === s.state.players[sessionId].zoneId)
            .length;
        })
        .toBe(10);
      await call('review-hazard');
      const effects = async () => {
        const s = await snapshot(host);
        return Object.values(
          s.state.bossEffects as Record<
            string,
            {
              zoneId: string;
              abilityId: string;
              x: number;
              y: number;
              startedAt: number;
              activeAt: number;
            }
          >,
        ).filter(
          (e) =>
            e.zoneId === s.state.players[sessionId].zoneId &&
            e.abilityId === ability,
        );
      };
      let hazardBatch: Awaited<ReturnType<typeof effects>> = [];
      await expect
        .poll(
          async () => {
            const current = await effects();
            if (current.length === count) hazardBatch = current;
            return hazardBatch.length;
          },
          { timeout: 13000, intervals: [40, 80] },
        )
        .toBe(count);
      await expect
        .poll(
          async () =>
            (await player()).statuses.includes(
              zone === 'desert' ? '"dash_lock"' : '"stun"',
            ),
          { timeout: 13000, intervals: [40, 80] },
        )
        .toBe(true);
      const frames = () =>
        host.evaluate<string[]>(
          'window.__VOLAM__.presentation().creepCombat?.observed ?? []',
        );
      await expect
        .poll(
          async () =>
            (await frames()).some(
              (entry) => entry.includes(prefix) && entry.endsWith(prefix + '2'),
            ),
          { timeout: 13000, intervals: [50, 100] },
        )
        .toBe(true);
      if (zone === 'desert') {
        const inSand = await player();
        await host.locator('#game canvas').focus();
        await host.keyboard.press('Shift');
        await expect
          .poll(async () => (await player()).lastSequence)
          .toBeGreaterThan(inSand.lastSequence);
        expect((await player()).dashCharges).toBe(inSand.dashCharges);
        await expect
          .poll(
            async () =>
              (await effects()).filter(
                (e) => e.startedAt === hazardBatch[0]!.startedAt + 150,
              ).length,
            { timeout: 10000 },
          )
          .toBe(count);
      } else if (zone === 'hell') {
        const firstBlast = hazardBatch.reduce((first, e) =>
          e.activeAt < first.activeAt ? e : first,
        );
        await expect
          .poll(
            async () =>
              (await effects()).some(
                (e) =>
                  e.activeAt === firstBlast.activeAt + 168 &&
                  Math.hypot(e.x - firstBlast.x, e.y - firstBlast.y) > 0,
              ),
            { timeout: 10000 },
          )
          .toBe(true);
      }
      report[zone] = {
        hazards: hazardBatch,
        frames: (await frames()).filter((entry) => entry.includes(prefix)),
      };
    }
    expect(match.errors).toEqual([]);
    mkdirSync(evidence, { recursive: true });
    writeFileSync(
      evidence + '/wave-and-traps.json',
      JSON.stringify(report, null, 2),
    );
  } finally {
    await match.close();
  }
});
