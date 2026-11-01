import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { m1Config } from '@volam/game-data';
const out =
  process.env['LY_MAC_SAU_QA_EVIDENCE_DIR'] ??
  'docs/evidence/ly-mac-sau-runtime';
interface Actor {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  zoneId: string;
  archetypeId?: string;
  bossLoot?: string;
  level: number;
}
interface Snap {
  roomId: string;
  sessionId: string;
  state: {
    players: Record<string, Actor>;
    creeps: Record<string, Actor>;
    projectiles: Record<string, { abilityId: string; vx: number; vy: number }>;
  };
  events: Array<{
    kind: string;
    abilityId: string;
    stage?: string;
    zoneId: string;
    targetId: string;
  }>;
}
interface View {
  zoneId: string;
  zoom: number;
  rotation: number;
  observedCreepFrames: Record<string, string[]>;
  completedAnimations: Array<{ key: string }>;
  coMoEffects: {
    observed: string[];
    played: string[];
    warnings: number;
    shots: number;
    contacts: number;
  };
  coMoScenery: Array<{ name: string; depth: number; origin: number[] }>;
  actors: Array<{
    id: string;
    texture: string;
    origin: number[];
    scale: number[];
    x: number;
    y: number;
    depth: number;
  }>;
}
const snapshot = (p: Page): Promise<Snap> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const presentation = (p: Page): Promise<View> =>
  p.evaluate('window.__VOLAM__.presentation()');
const hero = async (p: Page) => {
  const s = await snapshot(p);
  return s.state.players[s.sessionId]!;
};
async function fixture(
  p: Page,
  mode: string,
  extra: Record<string, string> = {},
) {
  const s = await snapshot(p);
  const response = await p.request.post(
    '/__ly_mac_sau?' + new URLSearchParams({ room: s.roomId, mode, ...extra }),
  );
  expect(response.ok(), await response.text()).toBe(true);
}
async function enter(p: Page, access = 'shared') {
  await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await p.getByRole('button', { name: 'Lý Mạc Sầu', exact: true }).click();
  await p
    .getByRole('radio', {
      name: access === 'shared' ? 'Chung' : 'Riêng',
      exact: true,
    })
    .click();
  await p.getByRole('button', { name: 'Vào phó bản', exact: true }).click();
  await expect.poll(async () => (await hero(p)).zoneId).toMatch(/^co_mo_/);
}
test('real Phaser encounter: frames, authority, natural skills/combat and cleanup', async ({
  browser,
}) => {
  const players = process.env['LY_MAC_SAU_QA_PLAYERS'] === '2' ? 2 : 6;
  const contexts = await Promise.all(
    Array.from({ length: players }, () =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const first = pages[0]!;
  const errors: string[] = [];
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    p.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
  }
  let frameCase = '';
  const started = performance.now();
  mkdirSync(out, { recursive: true });
  try {
    await joinWaiting(first, 'MạcSầu-1');
    const room = (await snapshot(first)).roomId;
    for (let i = 1; i < players; i++)
      await joinWaiting(pages[i]!, `MạcSầu-${i + 1}`, room);
    await startTogether(
      pages,
      Array.from(
        { length: players },
        (_, i) => ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'][i % 4]!,
      ),
    );
    // Regular controls/menu entry, no travel fixture.
    for (const p of pages) await enter(p);
    await expect
      .poll(
        async () =>
          (await presentation(first)).actors.filter(
            (a) => a.texture === 'boss_ly_mac_sau',
          ).length,
      )
      .toBe(1);
    await fixture(first, 'grant');
    const p0 = (await snapshot(first)).sessionId;
    const before = (await hero(first)).x;
    await first.locator('#game').click({ position: { x: 100, y: 400 } });
    await first.keyboard.down('ArrowRight');
    await first.waitForTimeout(220);
    await first.keyboard.up('ArrowRight');
    await expect
      .poll(async () => (await hero(first)).x)
      .toBeGreaterThan(before + 10);
    await expect
      .poll(async () =>
        Math.abs(
          ((await snapshot(pages[1]!)).state.players[p0]?.x ?? -1000) -
            (await hero(first)).x,
        ),
      )
      .toBeLessThan(0.5);
    const manifest = JSON.parse(
      readFileSync(
        'apps/game-client/public/assets/co_mo/manifest.json',
        'utf8',
      ),
    ) as {
      assets: Array<{
        id: string;
        animations: Array<{
          state: string;
          direction: string;
          frames: string[];
          durations: number[];
        }>;
      }>;
    };
    // Actual Phaser animation events, including all four facing attacks/casts/deaths.
    const observed = new Set<string>();
    for (const direction of ['down', 'left', 'right', 'up'])
      for (const state of [
        'idle',
        'walk',
        'basic_attack',
        'needle_cast',
        'palm_channel',
        'fast_sweep',
        'summon_cast',
        'hurt',
        'death',
      ]) {
        frameCase = direction + '/' + state;
        await fixture(first, 'pose', { direction, state });
        const relevant = manifest.assets.filter((a) =>
          a.animations.some(
            (t) => t.state === state && t.direction === direction,
          ),
        );
        await expect
          .poll(
            async () => {
              const v = await presentation(first);
              for (const a of relevant) {
                const tag = a.animations.find(
                  (t) => t.state === state && t.direction === direction,
                )!;
                const actual =
                  v.observedCreepFrames[`${a.id}:${state}:${direction}`] ?? [];
                for (const f of actual) observed.add(a.id + ':' + f);
                if (!tag.frames.every((f) => actual.includes(f))) return false;
              }
              return true;
            },
            { timeout: 5000, intervals: [50, 100] },
          )
          .toBe(true);
        const views = (await presentation(first)).actors;
        for (const a of relevant) {
          const sprite = views.find((v) => v.texture === a.id)!;
          expect(sprite.origin).toEqual(
            a.id === 'boss_ly_mac_sau' ? [0.5, 0.8125] : [0.5, 88 / 112],
          );
          expect(sprite.scale).toEqual([1, 1]);
        }
      }
    expect(observed.size).toBe(192);
    await fixture(first, 'pose', { state: 'idle', direction: 'down' });
    await fixture(first, 'position', { player: p0, x: '128', y: '640' });
    await first.locator('#game').click({ position: { x: 100, y: 400 } });
    await first.keyboard.down('ArrowLeft');
    await first.waitForTimeout(500);
    await first.keyboard.up('ArrowLeft');
    expect((await hero(first)).x).toBeGreaterThanOrEqual(96 + m1Config.radius);
    await fixture(first, 'position', { player: p0, x: '448', y: '288' });
    await expect
      .poll(async () => {
        const v = await presentation(first);
        const a = v.actors.find((a) => a.id === p0),
          statue = v.coMoScenery.find(
            (s) => s.name === 'co_mo:male_founder_statue',
          );
        return !!a && !!statue && a.depth < statue.depth;
      })
      .toBe(true);
    // Restore unmodified authored encounter tuning; no invulnerability, damage or HP cheats.
    await fixture(first, 'reset');
    await expect(first.locator('#boss-hud')).toBeVisible();
    await expect
      .poll(
        async () =>
          Object.values((await snapshot(first)).state.creeps).find(
            (c) => c.archetypeId === 'ly_mac_sau',
          )?.maxHp,
      )
      .toBe(1800);
    if (players === 6)
      await first
        .locator('#viewport')
        .screenshot({ path: out + '/arena-design-scale.png' });
    const required = [
      'needle_projectile',
      'palm_projectile',
      'duster_sweep_trail',
      'co_mo_spawn',
      'ngu_doc_projectile',
      'basic_hit',
    ];
    await expect
      .poll(
        async () => {
          const v = await presentation(first);
          return required.every((f) => v.coMoEffects.played.includes(f));
        },
        { timeout: 55000, intervals: [200] },
      )
      .toBe(true);
    for (const p of pages) expect((await hero(p)).hp).toBeGreaterThan(0);
    // Real keyboard bots approach/face the nearest enemy; no client/server damage fixture.
    for (const p of pages) await p.locator('#game canvas').focus();
    let attacking = true;
    const loops = pages.map(async (p) => {
      while (attacking && !p.isClosed()) {
        const sn = await snapshot(p),
          h = sn.state.players[sn.sessionId];
        const target =
          h &&
          Object.values(sn.state.creeps)
            .filter((c) => c.hp > 0)
            .sort(
              (a, b) =>
                Math.hypot(a.x - h.x, a.y - h.y) -
                Math.hypot(b.x - h.x, b.y - h.y),
            )[0];
        if (h && h.hp > 0 && target) {
          const dx = target.x - h.x,
            dy = target.y - h.y,
            d = Math.hypot(dx, dy);
          const toward =
            Math.abs(dx) >= Math.abs(dy)
              ? dx > 0
                ? 'ArrowRight'
                : 'ArrowLeft'
              : dy > 0
                ? 'ArrowDown'
                : 'ArrowUp';
          const opposite: Record<string, string> = {
            ArrowLeft: 'ArrowRight',
            ArrowRight: 'ArrowLeft',
            ArrowUp: 'ArrowDown',
            ArrowDown: 'ArrowUp',
          };
          if (d < 55) {
            await p.keyboard.down(opposite[toward]!);
            await p.waitForTimeout(60);
            await p.keyboard.up(opposite[toward]!);
          }
          await p.keyboard.down(toward);
          await p.waitForTimeout(d > 55 ? 160 : 60);
          await p.keyboard.up(toward);
          await p.keyboard.press('a');
        }
        await p.waitForTimeout(100);
      }
    });
    try {
      await expect
        .poll(
          async () =>
            Object.values((await snapshot(first)).state.creeps).find(
              (c) => c.archetypeId === 'ly_mac_sau',
            )?.hp ?? 1800,
          { timeout: 20000, intervals: [150] },
        )
        .toBeLessThan(1750);
      if (players === 6) {
        await first
          .locator('#viewport')
          .screenshot({ path: out + '/arena-natural-combat.png' });
        await expect
          .poll(
            async () =>
              Object.values((await snapshot(first)).state.creeps).find(
                (c) => c.archetypeId === 'ly_mac_sau',
              )?.hp ?? -1,
            { timeout: 80000, intervals: [200] },
          )
          .toBe(0);
      }
    } finally {
      attacking = false;
      await Promise.allSettled(loops);
    }
    const result = await snapshot(first);
    const claims = Object.values(result.state.players).flatMap(
      (h) => JSON.parse(h.bossLoot ?? '[]') as Array<{ id: string }>,
    );
    if (players === 6) {
      expect(claims).toHaveLength(1);
      for (const p of pages) {
        await expect
          .poll(async () =>
            JSON.stringify(
              Object.values((await snapshot(p)).state.players).flatMap((h) =>
                JSON.parse(h.bossLoot ?? '[]'),
              ),
            ),
          )
          .toBe(JSON.stringify(claims));
      }
      await expect
        .poll(async () => (await presentation(first)).coMoEffects.shots)
        .toBe(0);
    }
    // Exit requires the normal proximity-checked Space command and cleans all encounter visuals.
    await fixture(first, 'position', { player: p0, x: '640', y: '872' });
    await expect.poll(async () => (await hero(first)).y).toBe(872);
    await expect(first.locator('#dungeon-exit-hint')).toBeVisible();
    await first.keyboard.press('Space');
    await expect.poll(async () => (await hero(first)).zoneId).toBe('arena');
    const after = await presentation(first);
    expect(
      after.coMoEffects.shots +
        after.coMoEffects.warnings +
        after.coMoEffects.contacts,
    ).toBe(0);
    const currentClaims = Object.values(
      (await snapshot(first)).state.players,
    ).flatMap((h) => JSON.parse(h.bossLoot ?? '[]'));
    expect(currentClaims.length).toBeLessThanOrEqual(1);
    await enter(first, 'private');
    await expect
      .poll(
        async () =>
          Object.values((await snapshot(first)).state.creeps).find(
            (c) => c.archetypeId === 'ly_mac_sau',
          )?.hp,
      )
      .toBe(1800);
    expect(
      Object.keys((await snapshot(first)).state.creeps).every((id) =>
        id.startsWith('co_mo_private_'),
      ),
    ).toBe(true);
    expect(
      Object.keys((await snapshot(pages[1]!)).state.creeps).every(
        (id) => !id.startsWith('co_mo_private_'),
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    writeFileSync(
      `${out}/${players}-players.json`,
      JSON.stringify(
        {
          status: 'PASS',
          players,
          artFramesObserved: observed.size,
          allSixActionsLive: true,
          serverHpObserved: true,
          bossKillAndLootVerified: players === 6,
          finalAcceptance: players === 6,
          lootClaims: claims,
          keyboardMovement: true,
          collision: true,
          foregroundDepth: true,
          normalSpaceExit: true,
          cleanup: true,
          errors,
          durationSeconds: (performance.now() - started) / 1000,
          fixtureScope:
            'Frame poses plus legal level-15 XP grants and position arrangements; natural combat restores shipped boss tuning, real A input, no HP/damage overrides.',
          runtimeDirectorApproval: false,
          recordingsCreated: false,
        },
        null,
        2,
      ) + '\n',
    );
  } catch (error) {
    writeFileSync(
      out + `/${players}-players-failure.json`,
      JSON.stringify(
        {
          frameCase,
          errors,
          snapshot: await snapshot(first),
          presentation: await presentation(first),
        },
        null,
        2,
      ),
    );
    await first
      .screenshot({ path: out + `/${players}-players-failure.png` })
      .catch(() => {});
    throw error;
  } finally {
    for (const c of contexts) await c.close();
  }
});

test('M3D selector retains existing dungeons and enters Cổ Mộ through normal UI', async ({
  browser,
}) => {
  mkdirSync(out, { recursive: true });
  const destinations = [
    ['forest', 'Rừng Trúc'],
    ['desert', 'Sa Mạc'],
    ['sea', 'Biển'],
    ['hong_liet', 'Hoàn Nhan Hồng Liệt'],
    ['chu_ba_thong', 'Chu Bá Thông'],
    ['co_mo', 'Lý Mạc Sầu'],
  ] as const;
  const entries: Array<{ destination: string; zone: string }> = [];
  for (const [destination, label] of destinations) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const p = await context.newPage();
    const errors: string[] = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    p.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    try {
      await joinWaiting(p, `Menu-${destination}`);
      await startTogether([p]);
      await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
      for (const [, name] of destinations)
        await expect(
          p.getByRole('button', { name, exact: true }),
        ).toHaveAttribute('aria-disabled', 'false');
      await p.getByRole('button', { name: label, exact: true }).click();
      await expect(p.locator('#dungeon-entry-note')).toContainText(
        destination === 'co_mo' ? 'Cổ Mộ Phái' : label,
      );
      if (destination === 'co_mo') {
        for (const width of [960, 1280, 1920]) {
          await p.setViewportSize({
            width,
            height: width === 1920 ? 1080 : width === 960 ? 600 : 720,
          });
          const card = p.locator('.destinations > [data-destination="co_mo"]');
          await expect(card).toHaveCount(1);
          await expect(
            p.locator('.dungeon-options [data-destination]'),
          ).toHaveCount(0);
          await expect(card).toHaveAttribute('aria-pressed', 'true');
          await expect(card.locator('.destination-check')).toBeVisible();
          await expect
            .poll(() =>
              card
                .locator('img')
                .evaluate(
                  (n: HTMLImageElement) => n.complete && n.naturalWidth > 0,
                ),
            )
            .toBe(true);
          const bounds = (await card.boundingBox())!;
          expect(
            (await card.locator('img').boundingBox())!.height,
          ).toBeGreaterThan(30);
          for (const boss of ['hong_liet', 'chu_ba_thong']) {
            const peer = (await p
              .locator(`.destinations > [data-destination="${boss}"]`)
              .boundingBox())!;
            expect(Math.abs(bounds.y - peer.y)).toBeLessThanOrEqual(1);
            expect(Math.abs(bounds.width - peer.width)).toBeLessThanOrEqual(1);
            expect(Math.abs(bounds.height - peer.height)).toBeLessThanOrEqual(
              1,
            );
          }
          const viewport = (await p.locator('#viewport').boundingBox())!;
          const dialog = (await p.getByRole('dialog').boundingBox())!;
          expect(bounds.y).toBeGreaterThanOrEqual(dialog.y);
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(
            dialog.y + dialog.height,
          );
          expect(dialog.x).toBeGreaterThanOrEqual(viewport.x);
          expect(dialog.y).toBeGreaterThanOrEqual(viewport.y);
          expect(dialog.x + dialog.width).toBeLessThanOrEqual(
            viewport.x + viewport.width + 1,
          );
          expect(dialog.y + dialog.height).toBeLessThanOrEqual(
            viewport.y + viewport.height + 1,
          );
          await p.screenshot({ path: `${out}/dungeon-selector-${width}.png` });
        }
      }
      await p.getByRole('radio', { name: 'Riêng', exact: true }).click();
      await p.getByRole('button', { name: 'Vào phó bản', exact: true }).click();
      await expect
        .poll(async () => (await hero(p)).zoneId)
        .toMatch(new RegExp(`^${destination}_private_`));
      await expect(p.getByRole('dialog')).toBeHidden();
      await expect
        .poll(async () => (await presentation(p)).zoneId)
        .toBe((await hero(p)).zoneId);
      await expect
        .poll(
          async () => Object.values((await snapshot(p)).state.creeps).length,
        )
        .toBeGreaterThan(0);
      if (destination === 'co_mo')
        await expect(p.locator('#boss-hud')).toBeVisible();
      else await expect(p.locator('#boss-hud')).toBeHidden();
      entries.push({ destination, zone: (await hero(p)).zoneId });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  }
  writeFileSync(
    `${out}/selector-regression.json`,
    JSON.stringify(
      {
        status: 'PASS',
        entries,
        bossCardsSameRow: true,
        thumbnailLoaded: true,
        viewportWidths: [960, 1280, 1920],
        normalUiOnly: true,
        recordingsCreated: false,
      },
      null,
      2,
    ),
  );
});
