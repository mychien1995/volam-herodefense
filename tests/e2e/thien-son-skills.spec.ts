import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const evidence = resolve('assets/reviews/skills/thien-son');
mkdirSync(evidence, { recursive: true });
const manifest = JSON.parse(
  readFileSync(
    'assets/exports/skills/thien-son/production_manifest_v01.json',
    'utf8',
  ),
) as {
  assets: Array<{
    id: string;
    kind: string;
    animations: Array<{
      name: string;
      frames: string[];
      frameRate: number;
      origin: number[];
    }>;
  }>;
  skills: Array<{
    id: string;
    nameVi: string;
    kind: string;
    style: string;
    icon: string;
  }>;
};
type Snap = {
  ready: boolean;
  errors: string[];
  selected: string;
  mode: string;
  branch: string;
  scope: string;
  gameplayImplemented: boolean;
  zoom: number;
  rotation: number;
  displayZoom: number;
  logicalCanvas: number[];
  phaser: string;
  activeEffects: number;
  completed: number;
  createdEffects: number;
  destroyedEffects: number;
  actors: Array<{
    asset: string;
    tag: string;
    frame: string;
    x: number;
    y: number;
    origin: number[];
    scale: number[];
    depth: number;
    frameRate: number;
  }>;
  effects: Array<{
    asset: string;
    tag: string;
    x: number;
    y: number;
    depth: number;
    offset: number[];
    ownerX?: number;
    ownerY?: number;
    depthDelta: number;
  }>;
  observations: Record<string, string[]>;
  timings: Record<string, Array<{ frame: string; at: number }>>;
  stages: Array<{ stage: string; at: number; branch: string }>;
};
type Bridge = {
  snapshot: () => Snap;
  choose: (
    id: string,
    direction?: string,
    mode?: string,
    branch?: string,
  ) => void;
  inspectAsset: (asset: string, tag: string) => void;
  pause: () => void;
  resume: () => void;
};
const snap = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as { __THIEN_SON_SKILL_REVIEW__: Bridge }
    ).__THIEN_SON_SKILL_REVIEW__.snapshot(),
  );
const choose = (
  page: Page,
  id: string,
  d = 'right',
  mode = 'combined',
  branch = 'counter',
) =>
  page.evaluate(
    ({ id, d, mode, branch }) =>
      (
        window as unknown as { __THIEN_SON_SKILL_REVIEW__: Bridge }
      ).__THIEN_SON_SKILL_REVIEW__.choose(id, d, mode, branch),
    { id, d, mode, branch },
  );
async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/assets/'))
      errors.push(r.status() + ' ' + r.url());
  });
  await page.goto('/?artPreview=1&thienSonSkills=1');
  await page.waitForFunction(() =>
    Boolean(
      (
        window as unknown as { __THIEN_SON_SKILL_REVIEW__?: Bridge }
      ).__THIEN_SON_SKILL_REVIEW__?.snapshot().ready,
    ),
  );
  expect(errors).toEqual([]);
  expect((await snap(page)).errors).toEqual([]);
  return errors;
}
async function capture(page: Page, name: string) {
  await page.evaluate(() =>
    (
      window as unknown as { __THIEN_SON_SKILL_REVIEW__: Bridge }
    ).__THIEN_SON_SKILL_REVIEW__.pause(),
  );
  const observed = await snap(page);
  await page.screenshot({
    path: resolve(evidence, name + '.png'),
    type: 'png',
    animations: 'disabled',
  });
  await page.evaluate(() =>
    (
      window as unknown as { __THIEN_SON_SKILL_REVIEW__: Bridge }
    ).__THIEN_SON_SKILL_REVIEW__.resume(),
  );
  return observed;
}
test.describe('Thiên Sơn skill art', () => {
  test('all atlas tags play their actual frames and metadata cadence in Phaser', async ({
    page,
  }) => {
    const errors = await open(page);
    const results = [];
    for (const asset of manifest.assets)
      for (const tag of asset.animations) {
        await page.evaluate(
          ({ id, name }) =>
            (
              window as unknown as { __THIEN_SON_SKILL_REVIEW__: Bridge }
            ).__THIEN_SON_SKILL_REVIEW__.inspectAsset(id, name),
          { id: asset.id, name: tag.name },
        );
        const key = asset.id + ':' + tag.name;
        await expect
          .poll(
            async () => {
              const s = await snap(page);
              return tag.frames.every((f) => s.observations[key]?.includes(f));
            },
            { timeout: 3500, intervals: [30, 40, 50] },
          )
          .toBe(true);
        const s = await snap(page),
          root = s.actors[0]!;
        expect(root.origin).toEqual(tag.origin);
        expect(root.scale).toEqual([1, 1]);
        expect(root.frameRate).toBeCloseTo(tag.frameRate, 5);
        expect(s.zoom).toBe(1);
        expect(s.rotation).toBeCloseTo(0, 8);
        const times = s.timings[key]!,
          deltas = times
            .slice(1)
            .map((v, i) => v.at - times[i]!.at)
            .filter((v) => v > 0);
        expect(deltas.length).toBeGreaterThan(0);
        const expected = 1000 / tag.frameRate,
          median = [...deltas].sort((a, b) => a - b)[
            Math.floor(deltas.length / 2)
          ]!;
        expect(median).toBeGreaterThan(expected * 0.45);
        expect(median).toBeLessThan(expected * 1.75 + 20);
        const fixed = [root.x, root.y];
        await page.waitForTimeout(35);
        const later = (await snap(page)).actors[0]!;
        expect([later.x, later.y]).toEqual(fixed);
        results.push({
          asset: asset.id,
          tag: tag.name,
          frames: s.observations[key],
          frameRate: root.frameRate,
          observedIntervals: deltas,
          medianInterval: median,
          foot: fixed,
          origin: root.origin,
        });
      }
    expect(errors).toEqual([]);
    const final = await snap(page);
    writeFileSync(
      resolve(evidence, 'phaser_frames_v01.json'),
      JSON.stringify(
        {
          status: 'PASS',
          scope:
            'All exported tags and frames observed in actual Phaser; diagnostic repeat override does not alter export repeat metadata',
          phaser: final.phaser,
          tags: results.length,
          observations: results,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
  });
  test('stage composition, motion, expiry, pairing and normal-zoom readability', async ({
    page,
  }) => {
    const errors = await open(page),
      reports = [];
    const peaks: Record<string, number> = {
      lien_hoa_phien: 300,
      luc_duong_chuong: 620,
      luu_phong_bo: 180,
      chiet_mai_thu: 650,
      bach_phien_phong_bao: 700,
      phi_anh_tram: 220,
      truy_hon_dao: 250,
      phong_anh_hoan_vi: 500,
      liet_phong_dao: 300,
      bach_liet_thien_kich: 650,
      thien_son_phien: 150,
      thien_son_dao: 150,
      bac_minh_than_cong: 250,
    };
    for (const info of manifest.skills) {
      const start = (await snap(page)).completed;
      await choose(page, info.id);
      await page.waitForTimeout(peaks[info.id]!);
      const s = await capture(page, info.id + '_combined_v01');
      expect(s.selected).toBe(info.id);
      expect(s.scope).toBe('presentation_only');
      expect(s.gameplayImplemented).toBe(false);
      expect(s.zoom).toBe(1);
      expect(s.displayZoom).toBe(2);
      expect(s.logicalCanvas).toEqual([640, 360]);
      await expect(
        page.locator('.ts-art-icons button[aria-pressed="true"]'),
      ).toHaveAttribute('data-skill-id', info.id);
      await expect(
        page.locator('.ts-art-icons button[aria-pressed="true"] img'),
      ).toHaveAttribute(
        'src',
        '/' + info.icon.replace('assets/exports/', 'assets/'),
      );
      for (const fx of s.effects)
        if (fx.ownerX !== undefined) {
          expect(
            Math.abs(fx.x - fx.ownerX - fx.offset[0]!),
          ).toBeLessThanOrEqual(0.51);
          expect(
            Math.abs(fx.y - fx.ownerY! - fx.offset[1]!),
          ).toBeLessThanOrEqual(0.51);
          expect(fx.depth).toBeCloseTo(fx.ownerY! + fx.depthDelta, 4);
        }
      if (info.id === 'chiet_mai_thu')
        expect(s.effects.map((e) => e.tag).sort()).toEqual([
          'heel_loop',
          'wrist_loop_right',
        ]);
      if (info.id === 'bach_phien_phong_bao') {
        expect(s.effects.some((e) => e.depthDelta < 0)).toBe(true);
        expect(s.effects.some((e) => e.depthDelta > 0)).toBe(true);
      }
      if (info.kind !== 'active') expect(s.activeEffects).toBe(0);
      await expect
        .poll(async () => (await snap(page)).completed, {
          timeout: 3500,
          intervals: [50],
        })
        .toBeGreaterThan(start);
      await expect
        .poll(async () => (await snap(page)).activeEffects, {
          timeout: 1000,
          intervals: [40],
        })
        .toBe(0);
      const settled = await snap(page);
      expect(settled.actors[0]!.asset).toBe(
        info.style === 'dao' ? 'hero_thien_son_dao' : 'hero_thien_son',
      );
      const foot = [settled.actors[0]!.x, settled.actors[0]!.y];
      await page.waitForTimeout(80);
      const stable = (await snap(page)).actors[0]!;
      expect([stable.x, stable.y]).toEqual(foot);
      reports.push({ id: info.id, peak: s, settled });
    }
    await choose(page, 'phong_anh_hoan_vi', 'right', 'combined', 'expiry');
    const prior = (await snap(page)).stages.length;
    await page.waitForTimeout(900);
    const expiry = await capture(page, 'phong_anh_hoan_vi_expiry_v01');
    expect(
      expiry.stages
        .slice(prior)
        .some((s) => s.stage === 'conditional_counter_reused_basic_attack'),
    ).toBe(false);
    expect(
      expiry.stages.slice(prior).some((s) => s.stage === 'feedback_expiry'),
    ).toBe(true);
    await expect
      .poll(async () => (await snap(page)).activeEffects, {
        timeout: 1800,
        intervals: [50],
      })
      .toBe(0);
    for (const id of [
      'luu_phong_bo',
      'phi_anh_tram',
      'phong_anh_hoan_vi',
      'bach_phien_phong_bao',
    ]) {
      await choose(page, id, 'right', 'four');
      await page.waitForTimeout(id === 'bach_phien_phong_bao' ? 650 : 210);
      const observed = await capture(page, id + '_four_facings_v01');
      expect(observed.actors).toHaveLength(4);
      expect(
        observed.actors.every(
          (a) =>
            a.origin[0] === 0.5 &&
            a.origin[1] === 0.8 &&
            a.scale[0] === 1 &&
            a.scale[1] === 1,
        ),
      ).toBe(true);
      reports.push({ id, fourFacings: observed });
    }
    await choose(page, 'bach_phien_phong_bao', 'right', 'six');
    await page.waitForTimeout(650);
    const six = await capture(page, 'six_whirlwinds_v01');
    expect(six.actors).toHaveLength(6);
    const canvas = await page.locator('#game canvas').boundingBox(),
      viewport = await page.locator('#viewport').boundingBox();
    expect(canvas).toMatchObject({ x: 0, y: 0, width: 1280, height: 720 });
    expect(viewport).toMatchObject({ x: 0, y: 0, width: 1280, height: 720 });
    const iconSizes = await page
      .locator('.ts-art-icons img')
      .evaluateAll((imgs) =>
        imgs.map((im) => ({
          loaded:
            (im as HTMLImageElement).complete &&
            (im as HTMLImageElement).naturalWidth === 64,
          width: im.getBoundingClientRect().width,
          height: im.getBoundingClientRect().height,
        })),
      );
    expect(iconSizes).toHaveLength(13);
    expect(
      iconSizes.every((s) => s.loaded && s.width === 64 && s.height === 64),
    ).toBe(true);
    expect(errors).toEqual([]);
    writeFileSync(
      resolve(evidence, 'phaser_composition_v01.json'),
      JSON.stringify(
        {
          status: 'PASS',
          scope:
            'Visual assets verified in preview; gameplay implementation pending. Six actors are presentation replicas, not a six-client simulation.',
          normalZoom: 1,
          displayZoom: 2,
          reports,
          expiry,
          six,
          iconSizes,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
  });
  test('preview triggers never join a room or send gameplay commands', async ({
    page,
  }) => {
    const sockets: Array<{ origin: string; path: string; port: string }> = [];
    page.on('websocket', (ws) => {
      const url = new URL(ws.url());
      sockets.push({ origin: url.origin, path: url.pathname, port: url.port });
    });
    const errors = await open(page);
    await choose(page, 'phi_anh_tram', 'left');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('a');
    await page.keyboard.press('q');
    await page.waitForTimeout(550);
    const state = await page.evaluate(() =>
      (
        window as unknown as {
          __VOLAM__: {
            snapshot: () => {
              roomId?: string;
              state?: unknown;
              events: unknown[];
            };
          };
        }
      ).__VOLAM__.snapshot(),
    );
    expect(state.roomId).toBeUndefined();
    expect(state.state).toBeUndefined();
    expect(state.events).toEqual([]);
    const gameSockets = sockets.filter(
      (s) => !(s.port === new URL(page.url()).port && s.path === '/'),
    );
    writeFileSync(
      resolve(evidence, 'preview_socket_diagnostics_v01.json'),
      JSON.stringify({ sockets, gameSockets, state }, null, 2) + '\n',
    );
    expect(gameSockets).toEqual([]);
    expect(
      (await page.locator('.ts-art-controls').boundingBox())!.height,
    ).toBeLessThan(100);
    await capture(page, 'authority_guard_preview_v02');
    expect(errors).toEqual([]);
    writeFileSync(
      resolve(evidence, 'preview_authority_guard_v01.json'),
      JSON.stringify(
        {
          status: 'PASS',
          scope:
            'Preview-only route, no game websocket/room/commands; development-server transport recorded separately',
          websockets: sockets,
          gameWebsockets: gameSockets,
          state,
        },
        null,
        2,
      ) + '\n',
    );
  });
});
