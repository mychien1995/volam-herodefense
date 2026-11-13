import { test, expect, type Page } from '@playwright/test';
import { conLuan } from '@volam/game-core';
import { joinWaiting, startTogether } from './pregame-helper.js';

interface Actor {
  basicId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  maxMana: number;
  level: number;
  fx: number;
  fy: number;
  pose: string;
  statuses: string;
  qSkill: string;
  wSkill: string;
  eSkill: string;
  rSkill: string;
  tSkill: string;
  tCooldown: number;
  basicCooldown: number;
  lastSequence: number;
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    players: Record<string, Actor>;
    creeps: Record<string, Actor>;
    areas: Record<
      string,
      { abilityId: string; x: number; y: number; ticks: number }
    >;
  };
  events: Array<{
    sourceId: string;
    abilityId: string;
    kind: string;
    stage?: string;
    tick: number;
  }>;
}
interface Presentation {
  actors: Array<{
    id: string;
    texture: string;
    frame: string;
    origin: number[];
    x: number;
    y: number;
  }>;
  conLuan: Array<{ frame: string; x: number; y: number }>;
}
const snapshot = (page: Page) =>
  page.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const presentation = (page: Page) =>
  page.evaluate<Presentation>('window.__VOLAM__.presentation()');
const me = async (page: Page) => {
  const s = await snapshot(page);
  return s.state.players[s.sessionId]!;
};
const frames = async (page: Page) =>
  (await presentation(page)).conLuan.map((cel) => cel.frame);
const actor = async (page: Page, id: string) =>
  (await presentation(page)).actors.find((v) => v.id === id);

async function observeFrames(
  page: Page,
  source: string,
  ms: number,
): Promise<void> {
  await page.evaluate(
    ({ source, ms }) => {
      const debug = window as unknown as {
        __VOLAM__: { presentation(): Presentation };
        conLuanObserved?: string[];
        conLuanObservation?: number;
      };
      const seen = new Set<string>();
      debug.conLuanObserved = [];
      const end = performance.now() + ms;
      debug.conLuanObservation = end;
      const record = () => {
        if (debug.conLuanObservation !== end) return;
        const view = debug.__VOLAM__.presentation();
        if (source) {
          const frame = view.actors.find((actor) => actor.id === source)?.frame;
          if (frame) seen.add(frame);
        } else {
          for (const { frame } of view.conLuan) seen.add(frame);
        }
        debug.conLuanObserved = [...seen];
        if (performance.now() < end) requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    },
    { source, ms },
  );
}

const observed = (page: Page) =>
  page.evaluate<string[]>('window.conLuanObserved');

test('Côn Luân in a six-player match retains both character kits, combat sync and existing actors', async ({
  browser,
}, info) => {
  test.setTimeout(180_000);
  const contexts = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      browser.newContext({
        viewport:
          i < 2 ? { width: 1280, height: 720 } : { width: 800, height: 550 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const [monk, sword, cai, son, vo, lam] = pages as [
    Page,
    Page,
    Page,
    Page,
    Page,
    Page,
  ];
  const errors: string[] = [];
  for (const page of pages) {
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('/assets/'))
        errors.push(response.url() + ': ' + response.status());
    });
    page.on('console', (message) => {
      if (
        message.type() === 'warning' &&
        /missing|animation key/i.test(message.text())
      )
        errors.push(message.text());
    });
  }
  try {
    await joinWaiting(monk, 'Thiền Sư');
    const room = (await snapshot(monk)).roomId;
    for (const [index, page] of pages.slice(1).entries())
      await joinWaiting(
        page,
        ['Kiếm Tôn', 'Cái Bang', 'Thiên Sơn', 'Võ Đang', 'Thiếu Lâm'][index]!,
        room,
      );
    const branches = [
      conLuan.monk,
      conLuan.sword,
      'cai_bang_bong',
      'thien_son_dao',
      'vo_dang_kiem',
      'thieu_lam_dao',
    ];
    await startTogether(pages, branches, 45000);
    const ids = await Promise.all(
      pages.map(async (page) => (await snapshot(page)).sessionId),
    );
    const [monkId, swordId, caiId] = ids as [string, string, string];
    await expect
      .poll(
        async () => Object.keys((await snapshot(monk)).state.players).length,
      )
      .toBe(6);
    for (const [index, id] of ids.entries()) {
      const texture = [
        'hero_con_luan_thien_su',
        'hero_con_luan_kiem_ton',
        'renovated-bong-combo-body',
        'hero_thien_son_dao',
        'hero_vo_dang_kiem',
        'hero_thieu_lam_dao',
      ][index]!;
      if (index < 3)
        await expect
          .poll(async () => (await actor(monk, id))?.texture)
          .toBe(texture);
      else {
        await expect
          .poll(async () => (await snapshot(monk)).state.players[id]?.basicId)
          .toBe(branches[index]);
        await expect
          .poll(async () => (await actor(monk, id))?.texture ?? '')
          .toMatch(/^(?!__MISSING$|__DEFAULT$|hero_con_luan).+/);
      }
    }
    for (const [page, id] of [
      [monk, monkId],
      [sword, swordId],
    ] as const) {
      expect((await me(page)).level).toBe(6);
      expect((await actor(page, id))?.origin).toEqual([0.5, 0.75]);
      await page.bringToFront();
      await page.locator('canvas').focus();
      for (const [key, dir] of [
        ['ArrowDown', 'down'],
        ['ArrowLeft', 'left'],
        ['ArrowUp', 'up'],
        ['ArrowRight', 'right'],
      ]) {
        await page.keyboard.down(key!);
        try {
          await expect
            .poll(async () => (await actor(page, id))?.frame)
            .toMatch(new RegExp('walk_' + dir + '_[0-3]'));
        } finally {
          await page.keyboard.up(key!);
        }
      }
      for (const key of ['q', 'w', 'e', 'r', 't'] as const) {
        const slot = (key + 'Skill') as 'qSkill';
        await expect(async () => {
          if ((await me(page))[slot]) return;
          await page.keyboard.down('o');
          try {
            await page.keyboard.press(key);
          } finally {
            await page.keyboard.up('o');
          }
          await expect
            .poll(async () => (await me(page))[slot], { timeout: 2500 })
            .not.toBe('');
        }, 'Server acknowledges rank for ' + key).toPass({ timeout: 15000 });
      }
    }
    await monk.bringToFront();
    await monk.locator('canvas').focus();
    for (const page of [monk, sword])
      await expect(page.locator('#slot-t .pixel-icon')).toHaveCSS(
        'background-image',
        /con_luan_hac_thiet_v04\/icons\/.+\.png/,
      );
    const basicStart = await me(monk);
    await monk.keyboard.down('ArrowDown');
    try {
      await expect
        .poll(async () => (await me(monk)).y)
        .toBeGreaterThan(basicStart.y + 145);
    } finally {
      await monk.keyboard.up('ArrowDown');
    }
    for (const [beat, stage] of [
      [1, 'thrust'],
      [2, 'sweep'],
      [3, 'rising'],
      [4, 'overhead'],
    ] as const) {
      await expect.poll(async () => (await me(monk)).basicCooldown).toBe(0);
      const attackFrames =
        beat <= 2
          ? await monk.evaluate(async (id) => {
              const debug = (
                window as unknown as {
                  __VOLAM__: { presentation(): Presentation };
                }
              ).__VOLAM__;
              const seen = new Set<string>();
              window.dispatchEvent(
                new KeyboardEvent('keydown', { code: 'KeyA' }),
              );
              window.dispatchEvent(
                new KeyboardEvent('keyup', { code: 'KeyA' }),
              );
              const end = performance.now() + 750;
              while (performance.now() < end) {
                await new Promise<void>((resolve) =>
                  requestAnimationFrame(() => resolve()),
                );
                const frame = debug
                  .presentation()
                  .actors.find((actor) => actor.id === id)?.frame;
                if (frame) seen.add(frame);
              }
              return [...seen];
            }, monkId)
          : await monk.keyboard.press('a').then(() => []);
      await expect
        .poll(async () =>
          (await snapshot(monk)).events.some(
            (e) =>
              e.sourceId === monkId && e.kind === 'attack' && e.stage === stage,
          ),
        )
        .toBe(true);
      if (beat <= 2)
        expect(attackFrames.join(' '), stage).toContain('melee_' + beat + '_');
    }
    const closeHp = (await me(monk)).maxHp;
    await monk.keyboard.press('q');
    await expect.poll(async () => (await me(monk)).maxHp).toBeLessThan(closeHp);
    await expect
      .poll(async () =>
        (await frames(sword)).some((frame) => frame.startsWith('coil_')),
      )
      .toBe(true);
    await expect.poll(async () => (await me(monk)).basicCooldown).toBe(0);
    await monk.keyboard.press('a');
    await expect
      .poll(async () =>
        (await snapshot(sword)).events.some(
          (e) => e.abilityId === conLuan.bolt && e.kind === 'pulse',
        ),
      )
      .toBe(true);
    await expect
      .poll(async () => (await me(monk)).pose)
      .not.toBe('basic_attack');
    for (const [key, id] of [
      ['w', conLuan.slam],
      ['e', conLuan.ring],
      ['r', conLuan.hammer],
    ] as const) {
      if (key !== 'r') await observeFrames(monk, '', 2200);
      await monk.keyboard.press(key);
      await expect
        .poll(async () =>
          (await snapshot(monk)).events.some(
            (e) => e.abilityId === id && e.kind === 'cast',
          ),
        )
        .toBe(true);
      if (key === 'w') {
        await expect
          .poll(async () =>
            (await observed(monk)).some((frame) =>
              /^hammer_contact_[0-3]$/.test(frame),
            ),
          )
          .toBe(true);
        await expect
          .poll(async () =>
            (await snapshot(sword)).events.some(
              (e) =>
                e.abilityId === conLuan.slam && e.stage === 'hammer_contact',
            ),
          )
          .toBe(true);
      }
      if (key === 'e') {
        await expect
          .poll(async () =>
            (await observed(monk)).some((frame) =>
              /^lightning_ring_[0-2]$/.test(frame),
            ),
          )
          .toBe(true);
        await expect
          .poll(async () => (await observed(monk)).includes('lightning_ring_3'))
          .toBe(true);
      }
      await expect.poll(async () => (await me(monk)).pose).not.toBe('cast');
    }
    const beforeChaos = await me(monk);
    await monk.keyboard.down('ArrowLeft');
    try {
      await expect
        .poll(async () => (await me(monk)).x)
        .toBeLessThan(beforeChaos.x - 150);
    } finally {
      await monk.keyboard.up('ArrowLeft');
    }
    await monk.keyboard.press('t');
    await expect
      .poll(async () => (await actor(monk, monkId))?.frame)
      .toMatch(/^chaos_/);
    await expect
      .poll(async () => (await frames(monk)).includes('chaos_aura_0'))
      .toBe(true);
    await expect.poll(async () => (await me(monk)).pose).not.toBe('cast');
    const chaosFrames = await monk.evaluate(async (id) => {
      const debug = (
        window as unknown as {
          __VOLAM__: { presentation(): Presentation };
        }
      ).__VOLAM__;
      const seen = new Set<string>();
      for (const code of ['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight']) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        try {
          const end = performance.now() + 650;
          while (performance.now() < end) {
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
            const frame = debug
              .presentation()
              .actors.find((actor) => actor.id === id)?.frame;
            if (frame) seen.add(frame);
          }
        } finally {
          window.dispatchEvent(new KeyboardEvent('keyup', { code }));
        }
      }
      return [...seen];
    }, monkId);
    for (const dir of ['down', 'left', 'up', 'right'])
      expect(
        chaosFrames.filter((frame) =>
          frame.startsWith('chaos_walk_' + dir + '_'),
        ),
        dir,
      ).toEqual(expect.arrayContaining([expect.stringMatching(/_\d$/)]));
    expect(
      chaosFrames.filter((frame) => frame.startsWith('chaos_walk_')).length,
    ).toBeGreaterThanOrEqual(8);
    await monk.screenshot({ path: info.outputPath('thien-su-chaos.png') });
    await sword.bringToFront();
    await sword.locator('canvas').focus();
    await expect
      .poll(async () => (await frames(sword)).includes('jian_0'))
      .toBe(true);
    await sword.keyboard.press('s');
    await expect
      .poll(async () =>
        Object.values((await snapshot(sword)).state.areas).some(
          (a) => a.abilityId === conLuan.plant,
        ),
      )
      .toBe(true);
    await expect(sword.locator('#kinh-loi-charges')).toHaveText('2');
    await expect.poll(async () => (await me(sword)).pose).not.toBe('cast');
    await sword.keyboard.press('q');
    await expect
      .poll(async () =>
        Object.values((await snapshot(sword)).state.areas).some(
          (a) => a.abilityId === conLuan.plant,
        ),
      )
      .toBe(false);
    for (const [key, id] of [
      ['w', conLuan.dash],
      ['e', conLuan.fan],
      ['r', conLuan.dragon],
    ] as const) {
      await expect.poll(async () => (await me(sword)).pose).not.toBe('cast');
      if (key === 'r') {
        const initial = await me(sword);
        await sword.keyboard.down('ArrowLeft');
        try {
          await expect
            .poll(async () => (await me(sword)).x)
            .toBeLessThan(initial.x - 130);
        } finally {
          await sword.keyboard.up('ArrowLeft');
        }
        await sword.evaluate(() => {
          const w = window as unknown as {
            __VOLAM__: { presentation(): Presentation };
            conLuanDragonSeen?: boolean;
          };
          const deadline = performance.now() + 5000;
          const observe = () => {
            if (
              w.__VOLAM__
                .presentation()
                ?.conLuan.some((cel) => cel.frame === 'dragon_head_0')
            ) {
              w.conLuanDragonSeen = true;
            } else if (performance.now() < deadline)
              requestAnimationFrame(observe);
          };
          requestAnimationFrame(observe);
        });
      }
      await sword.keyboard.press(key);
      await expect
        .poll(async () =>
          (await snapshot(sword)).events.some(
            (e) => e.abilityId === id && e.kind === 'cast',
          ),
        )
        .toBe(true);
      if (key === 'r')
        await expect
          .poll(() => sword.evaluate('window.conLuanDragonSeen'))
          .toBe(true);
    }
    await expect.poll(async () => (await me(sword)).pose).not.toBe('cast');
    const origin = await me(sword);
    await sword.keyboard.press('t');
    const star = async (page: Page) =>
      Object.values((await snapshot(page)).state.areas).find(
        (a) => a.abilityId === conLuan.star,
      );
    await expect.poll(async () => (await star(sword))?.x).toBeCloseTo(origin.x);
    await expect.poll(async () => (await star(monk))?.y).toBeCloseTo(origin.y);
    await expect
      .poll(
        async () =>
          (await frames(sword)).filter((frame) => frame === 'edge_0').length,
      )
      .toBe(5);
    await sword.screenshot({ path: info.outputPath('kiem-ton-tran-phap.png') });
    await cai.bringToFront();
    await cai.locator('canvas').focus();
    const legacyAttack = async () =>
      (await snapshot(cai)).events.some(
        (e) =>
          e.sourceId === caiId &&
          e.kind === 'attack' &&
          e.abilityId === 'cai_bang_bong',
      );
    await expect(async () => {
      if (await legacyAttack()) return;
      await cai.keyboard.press('a');
      await expect.poll(legacyAttack, { timeout: 1500 }).toBe(true);
    }).toPass({ timeout: 10000 });
    await expect
      .poll(async () => await star(sword), { timeout: 8000 })
      .toBeUndefined();
    await expect
      .poll(
        async () =>
          (await frames(sword)).filter((frame) => frame === 'edge_0').length,
      )
      .toBe(0);
    expect((await me(sword)).tCooldown).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    expect(son).toBeDefined();
    expect(vo).toBeDefined();
    expect(lam).toBeDefined();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
