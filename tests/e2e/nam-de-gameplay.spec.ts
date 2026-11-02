import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { joinWaiting, startTogether } from './pregame-helper.js';
import type { NamDeControl, NamDeView } from '@volam/game-core';
interface Snap {
  roomId: string;
  sessionId: string;
  state: {
    tick: number;
    defense: { namDe: string; statueHp: number };
    namDeControls: Record<string, { payload: string }>;
    players: Record<
      string,
      {
        hp: number;
        maxHp: number;
        x: number;
        y: number;
        gold: number;
        xp: number;
        bossItems: string;
      }
    >;
    creeps: Record<string, { x: number; y: number; hp: number }>;
    bossEffects: Record<
      string,
      {
        x: number;
        y: number;
        fx: number;
        fy: number;
        length: number;
        activeAt: number;
        radius: number;
        startedAt: number;
        expiresAt: number;
        castId: string;
        kind: string;
      }
    >;
  };
}
interface Render {
  namDe: {
    rays: Snap['state']['bossEffects'];
    sprites: {
      id: string;
      x: number;
      y: number;
      frame: string;
      rotation: number;
      origin: number[];
      width: number;
      height: number;
    }[];
    frames: Record<string, string[]>;
  };
}
const snap = (p: Page): Promise<Snap> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const render = (p: Page): Promise<Render> =>
  p.evaluate('window.__VOLAM__.presentation()');
const out = 'docs/evidence/nam-de-runtime';
async function fixture(p: Page, mode: string, extra = '') {
  const s = await snap(p),
    r = await p.request.post(
      '/__nam_de?room=' + s.roomId + '&mode=' + mode + extra,
    );
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
const keys = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};
for (const count of [2, 6])
  test(`${count} real Phaser clients: synchronized Nam Đế, physical QTE, raster frames and viewport`, async ({
    browser,
  }) => {
    mkdirSync(out, { recursive: true });
    const contexts = [],
      pages: Page[] = [],
      errors: string[] = [];
    const observations: unknown[] = [];
    try {
      for (let i = 0; i < count; i++) {
        const ctx = await browser.newContext({
          viewport:
            i === 1
              ? { width: 1024, height: 768 }
              : { width: 1280, height: 720 },
        });
        contexts.push(ctx);
        const p = await ctx.newPage();
        pages.push(p);
        p.on('pageerror', (e) => errors.push(e.message));
        p.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        await joinWaiting(
          p,
          'NamDe QA ' + i,
          i ? (await snap(pages[0]!)).roomId : undefined,
        );
      }
      await startTogether(pages, [
        'vo_dang',
        'thieu_lam',
        'cai_bang',
        'thien_son',
        'vo_dang',
        'cai_bang',
      ]);
      const p = pages[0]!;
      await fixture(p, 'gate');
      await expect
        .poll(
          async () =>
            JSON.parse((await snap(p)).state.defense.namDe).spawnCount,
        )
        .toBe(1);
      const entryY = (await snap(p)).state.creeps['boss_nam_de']!.y;
      await p.waitForTimeout(400);
      expect((await snap(p)).state.creeps['boss_nam_de']!.y).toBeLessThan(
        entryY,
      );
      await fixture(p, 'park');
      await expect
        .poll(async () =>
          (await render(p)).namDe.sprites.some((s) => s.id === 'boss'),
        )
        .toBe(true);
      await p.screenshot({ path: out + `/${count}-clients-entry.png` });
      // Slow rotation, four independent fixed warnings, same world geometry across different viewports.
      await fixture(p, 'cast', '&ability=lien_hoan_nhat_duong_chi');
      await expect
        .poll(
          async () =>
            Object.values((await snap(p)).state.bossEffects).filter(
              (e) => e.kind === 'beam',
            ).length,
        )
        .toBeGreaterThanOrEqual(4);
      const a = await snap(p),
        v = JSON.parse(a.state.defense.namDe) as NamDeView,
        cast = v.cast!.id;
      const rays = Object.entries(a.state.bossEffects)
        .filter(([, e]) => e.castId === cast)
        .slice(0, 4);
      expect(rays).toHaveLength(4);
      for (const other of pages.slice(1)) {
        await expect
          .poll(async () => {
            const history = (await render(other)).namDe.rays;
            const geometry = (
              e: Snap['state']['bossEffects'][string] | undefined,
            ) =>
              e
                ? [
                    e.x,
                    e.y,
                    e.fx,
                    e.fy,
                    e.length,
                    e.radius,
                    e.activeAt,
                    e.startedAt,
                    e.expiresAt,
                    e.castId,
                  ]
                : null;
            return rays.every(
              ([id, e]) =>
                JSON.stringify(geometry(history[id])) ===
                JSON.stringify(geometry(e)),
            );
          })
          .toBe(true);
      }
      await p.screenshot({
        path: out + `/${count}-clients-barrage-warning.png`,
      });
      await expect
        .poll(async () => {
          const r = await render(p);
          return r.namDe.sprites.some(
            (s) =>
              s.id.startsWith('nam_de_fx') && s.frame.includes('thin_beam'),
          );
        })
        .toBe(true);
      await p.screenshot({ path: out + `/${count}-clients-barrage-fired.png` });
      observations.push({ barrage: await render(p), rays });
      await p.waitForTimeout(13000);
      observations.push({ rotationFrames: await render(p) });
      expect(
        (await render(p)).namDe.frames['feedback01:thin_beam'],
      ).toHaveLength(4);
      // Own challenge only, all10 physical arrow presses; success closes on authoritative response.
      await fixture(
        p,
        'cast',
        '&ability=dai_ly_phong_huyet&target=' + (await snap(p)).sessionId,
      );
      await expect(p.locator('#nam-de-qte')).toBeVisible();
      let s = await snap(p),
        q = (
          JSON.parse(
            s.state.namDeControls[s.sessionId]!.payload,
          ) as NamDeControl
        ).qte!;
      expect(
        Object.keys((await snap(pages[1]!)).state.namDeControls),
      ).not.toContain(s.sessionId);
      await p.evaluate(() => {
        const input = document.createElement('input');
        input.id = 'qa-menu-focus';
        document.querySelector('#viewport')!.append(input);
        input.focus();
      });
      for (const key of q.keys) await p.keyboard.press(keys[key]);
      await p.evaluate(() =>
        document.querySelector('#qa-menu-focus')!.remove(),
      );
      await expect(p.locator('#nam-de-qte')).toBeHidden();
      s = await snap(p);
      expect(
        (
          JSON.parse(
            s.state.namDeControls[s.sessionId]!.payload,
          ) as NamDeControl
        ).qte!.state,
      ).toBe('success');
      await p.screenshot({ path: out + `/${count}-clients-qte-success.png` });
      await fixture(
        p,
        'cast',
        '&ability=dai_ly_phong_huyet&target=' + s.sessionId,
      );
      await expect(p.locator('#nam-de-qte')).toBeVisible();
      s = await snap(p);
      q = (
        JSON.parse(s.state.namDeControls[s.sessionId]!.payload) as NamDeControl
      ).qte!;
      await p.keyboard.press(q.keys[0] === 'up' ? 'ArrowDown' : 'ArrowUp');
      await expect(p.locator('#nam-de-qte')).toBeHidden();
      await expect
        .poll(async () =>
          (await render(p)).namDe.sprites.some(
            (s) =>
              s.id.startsWith('nam_de_fx') &&
              s.frame.includes('pressure_contact'),
          ),
        )
        .toBe(true);
      await p.screenshot({
        path: out + `/${count}-clients-qte-wrong-world-explosion.png`,
      });
      const failed = (await snap(p)).state.players[s.sessionId]!;
      expect(failed.hp / failed.maxHp).toBeCloseTo(0.3, 1);
      await p.waitForTimeout(2100);
      const before = (await snap(p)).state.players[s.sessionId]!.x;
      await p.keyboard.down('ArrowLeft');
      await p.waitForTimeout(250);
      await p.keyboard.up('ArrowLeft');
      await expect
        .poll(async () => (await snap(p)).state.players[s.sessionId]!.x)
        .toBeLessThan(before);
      if (count === 2) {
        await fixture(
          p,
          'cast',
          '&ability=dai_ly_phong_huyet&target=' + s.sessionId,
        );
        await expect(p.locator('#nam-de-qte')).toBeVisible();
        await expect(p.locator('#nam-de-qte')).toBeHidden({ timeout: 7000 });
        const timed = await snap(p);
        expect(
          (
            JSON.parse(
              timed.state.namDeControls[s.sessionId]!.payload,
            ) as NamDeControl
          ).qte!.state,
        ).toBe('timeout');
      }
      for (const ability of [
        'nam_de_palm',
        'nam_de_aura',
        'nam_de_small_finger',
        'nhat_duong_chi',
        'phat_quang_pho_chieu',
        'nhat_duong_quy_tong',
      ]) {
        await fixture(p, 'cast', '&ability=' + ability);
        await p.waitForTimeout(700);
        if (ability === 'nhat_duong_quy_tong')
          await expect
            .poll(async () =>
              (await render(p)).namDe.sprites.some(
                (s) =>
                  s.id.startsWith('nam_de_fx') && s.frame.includes('sky_ray'),
              ),
            )
            .toBe(true);
        await p.screenshot({ path: out + `/${count}-clients-${ability}.png` });
        observations.push({ ability, render: await render(p) });
        await p.waitForTimeout(1000);
      }
      await fixture(p, 'park');
      const statue = (await snap(p)).state.defense.statueHp;
      await fixture(p, 'overlap');
      await expect
        .poll(async () => (await fixture(p, 'inspect')).wave)
        .toBe(16);
      expect((await snap(p)).state.defense.statueHp).toBe(statue);
      // Death through the normal physical A attack and common reward pipeline.
      await fixture(p, 'kill');
      const h = (await snap(p)).state.players[(await snap(p)).sessionId]!,
        gold = h.gold;
      await p.keyboard.press('a');
      await expect
        .poll(async () => (await snap(p)).state.creeps['boss_nam_de']!.hp)
        .toBe(0);
      await expect
        .poll(
          async () =>
            (await snap(p)).state.players[(await snap(p)).sessionId]!.gold,
        )
        .toBeGreaterThan(gold);
      expect(
        JSON.parse(
          (await snap(p)).state.players[(await snap(p)).sessionId]!.bossItems,
        ),
      ).toHaveLength(0);
      if (count === 2) {
        await expect
          .poll(async () =>
            Object.entries((await render(p)).namDe.frames).some(
              ([key, frames]) =>
                key.startsWith('boss:death_') && frames.length === 4,
            ),
          )
          .toBe(true);
      }
      for (const witness of pages) {
        await expect
          .poll(
            async () => (await snap(witness)).state.creeps['boss_nam_de']!.hp,
          )
          .toBe(0);
        await expect
          .poll(async () =>
            (await render(witness)).namDe.sprites.some(
              (s) =>
                s.id === 'boss' &&
                s.frame.startsWith('death_') &&
                s.frame.endsWith('_3'),
            ),
          )
          .toBe(true);
      }
      observations.push({ death: await render(p) });
      const viewport = await p.locator('#viewport').boundingBox();
      expect(viewport!.width).toBeGreaterThan(1100);
      expect(
        await p.locator('#nam-de-qte').evaluate((e) => e.parentElement!.id),
      ).toBe('viewport');
      expect(errors).toEqual([]);
      writeFileSync(
        out + `/${count}-clients-observations.json`,
        JSON.stringify(
          { count, errors, observations, final: await snap(p) },
          null,
          2,
        ),
      );
    } finally {
      for (const ctx of contexts) await ctx.close();
    }
  });
