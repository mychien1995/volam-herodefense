import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { joinWaiting, startAuditTogether } from './pregame-helper.js';

const output = qaEvidenceDirectory('docs/evidence/shaolin-quyen');
const snapshot = (page: Page) =>
  page.evaluate<any>('window.__VOLAM__.snapshot()');
const presentation = (page: Page) =>
  page.evaluate<any>('window.__VOLAM__.presentation().skills.r3');
const foot = 'vo_anh_cuoc';
const click = (button: HTMLButtonElement) => button.click();
const monkArt = (page: Page) =>
  page.evaluate(() => {
    const r = (window as any).__VOLAM__.presentation().renovation;
    return {
      body: r.bodies.find((b: any) => b.id === 'hero_thieu_lam'),
      observed: r.observed.hero_thieu_lam ?? [],
    };
  });

test('Thiếu Lâm Quyền plays four new A poses, La Hán, and real Phát Động B movement', async ({
  browser,
}) => {
  test.setTimeout(110_000);
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [player, peer] = (await Promise.all(
    contexts.map((c) => c.newPage()),
  )) as [Page, Page];
  const errors: string[] = [];
  for (const p of [player, peer])
    p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(player, 'Quyen Audit');
    const roomId = (await snapshot(player)).roomId;
    await joinWaiting(peer, 'Quyen Observer', roomId);
    await startAuditTogether([
      [player, 'thieu_lam', 'thieu_lam_quyen'],
      [peer, 'cai_bang', 'cai_bang_chuong'],
    ]);
    const id = (await snapshot(player)).sessionId;
    const hero = async (p = player) => (await snapshot(p)).state.players[id];
    const frames = async (p: Page) =>
      Object.keys((await presentation(p)).frames);
    await expect.poll(async () => (await hero()).level).toBe(30);
    for (const [i, key] of [...'qwe'].entries()) {
      await player.locator('[data-rank-slot="' + i + '"]').evaluate(click);
      await expect(player.locator('#slot-' + key + ' .skill-rank')).toHaveText(
        '1',
      );
    }
    await player.locator('#game canvas').focus();

    await expect
      .poll(async () => (await monkArt(player)).body?.texture)
      .toBe('renovated-hero_thieu_lam');
    const basicPoses = [
      'left_fist',
      'right_fist',
      'front_kick',
      'roundhouse_kick',
    ];
    for (const [index, stage] of basicPoses.entries()) {
      await expect.poll(async () => (await hero()).basicCooldown).toBe(0);
      await expect(async () => {
        if ((await hero()).basicStage !== stage) {
          await player.locator('#game canvas').focus();
          await player.keyboard.press('KeyA', { delay: 55 });
        }
        await expect
          .poll(async () => (await hero()).basicStage, { timeout: 900 })
          .toBe(stage);
      }).toPass({ timeout: 5000, intervals: [150, 250] });
      await expect
        .poll(async () =>
          Promise.all(
            [player, peer].map(async (p) =>
              (await monkArt(p)).observed.some((key: string) =>
                new RegExp(
                  '^renovated-action-hero_thieu_lam_actions:(right|left|up|down)_' +
                    index +
                    '$',
                ).test(key),
              ),
            ),
          ),
        )
        .toEqual([true, true]);
      await expect
        .poll(async () => {
          const h = await hero();
          return (await snapshot(player)).state.tick >= h.actionStartedAt + 6;
        })
        .toBe(true);
    }
    await expect
      .poll(async () => (await monkArt(player)).body?.texture)
      .toBe('renovated-hero_thieu_lam');
    await expect
      .poll(async () =>
        (await frames(player)).includes('shaolin_quyen_ki:roundhouse_kick'),
      )
      .toBe(true);

    const watch = async (asset: string) => {
      await player.evaluate((asset) => {
        const w = window as any;
        w.__shaolinPngs ??= {};
        w.__shaolinCueIds ??= {};
        w.__shaolinCueIds[asset] = new Set();
        const deadline = Date.now() + 6500;
        const inspect = () => {
          const state = w.__VOLAM__.presentation().skills.r3;
          for (const effect of state.entities.filter(
            (v: any) => v.asset === asset,
          ))
            w.__shaolinCueIds[asset].add(effect.id);
          const enough =
            w.__shaolinCueIds[asset].size >=
            (asset === 'shaolin_la_han_ground' ? 3 : 1);
          if (enough && state.entities.some((v: any) => v.asset === asset))
            w.__VOLAM__.afterRender(() => {
              w.__shaolinPngs[asset] = document
                .querySelector<HTMLCanvasElement>('#game canvas')!
                .toDataURL('image/png');
            });
          else if (Date.now() < deadline) requestAnimationFrame(inspect);
        };
        requestAnimationFrame(inspect);
      }, asset);
    };
    await watch('shaolin_la_han_ground');
    await player.keyboard.press('q');
    await expect
      .poll(async () =>
        (await frames(player)).includes('shaolin_la_han_ground:impact'),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        Object.values((await presentation(player)).frames).some((a: any) =>
          a.includes('apparition_right_5'),
        ),
      )
      .toBe(true);

    await expect
      .poll(async () => {
        const state = (await snapshot(player)).state;
        return state.tick >= state.players[id].actionUntil;
      })
      .toBe(true);
    await player.keyboard.press('f');
    await expect(player.locator('#slot-e')).toHaveAttribute(
      'data-skill-id',
      foot,
    );
    const start = (await hero()).x;
    const normalSince = (await snapshot(player)).events.at(-1)?.id ?? 0;
    const allPages = [player, peer];
    for (const p of allPages)
      await p.evaluate((owner) => {
        const w = window as any;
        const observed = (w.__ordinaryFootIds = new Set<string>());
        const timer = setInterval(() => {
          const state = w.__VOLAM__.snapshot().state;
          for (const [key, shot] of Object.entries(state.projectiles) as [
            string,
            any,
          ][])
            if (shot.abilityId === 'vo_anh_cuoc' && shot.ownerId === owner)
              observed.add(key);
          if (observed.size === 3) clearInterval(timer);
        }, 20);
        setTimeout(() => clearInterval(timer), 15000);
      }, id);
    const normalAccepted = async () =>
      (await snapshot(player)).events.some(
        (e: any) =>
          e.id > normalSince && e.abilityId === foot && e.kind === 'cast',
      );
    await expect(async () => {
      if (!(await normalAccepted())) {
        await player.locator('#game canvas').focus();
        await player.keyboard.press('KeyE', { delay: 60 });
      }
      await expect.poll(normalAccepted, { timeout: 1200 }).toBe(true);
    }).toPass({ timeout: 7000, intervals: [150, 300] });
    const ordinaryIds = async () =>
      await Promise.all(
        allPages.map((p) =>
          p.evaluate<string[]>('Array.from(window.__ordinaryFootIds).sort()'),
        ),
      );
    await expect
      .poll(async () => (await ordinaryIds()).map((ids) => ids.length), {
        timeout: 8000,
      })
      .toEqual([3, 3]);
    const ids = await ordinaryIds();
    expect(ids[0]).toEqual(ids[1]);
    expect((await hero()).x).toBe(start);
    await expect
      .poll(async () => (await hero()).eCooldown, { timeout: 12_000 })
      .toBe(0);

    const prior = (await snapshot(player)).events.at(-1)?.id ?? 0;
    await watch('shaolin_vo_anh_dust');
    await player.locator('#game canvas').focus();
    for (const key of ['KeyQ', 'KeyW', 'KeyE', 'KeyQ', 'KeyW'])
      await player.keyboard.press(key, { delay: 35 });
    const results = [];
    for (const p of [player, peer]) {
      await expect
        .poll(async () => (await hero(p)).x)
        .toBeCloseTo(start + 210, 0);
      const events = (await snapshot(p)).events.filter(
        (e: any) => e.id > prior && e.abilityId === foot,
      );
      expect(
        events.filter((e: any) => e.kind === 'cast').map((e: any) => e.stage),
      ).toEqual(['empowered_dash']);
      expect(
        events.filter((e: any) => e.kind === 'hit').map((e: any) => e.stage),
      ).toEqual(['empowered']);
      const art = await frames(p);
      expect(art).toContain('shaolin_vo_anh_body:fly_right');
      expect(art).toContain('shaolin_vo_anh_dust:gust');
      expect(art).toContain('shaolin_quyen_ki:heel');
      results.push({ x: (await hero(p)).x, events, art });
    }
    expect(errors).toEqual([]);
    await mkdir(output, { recursive: true });
    for (const asset of ['shaolin_la_han_ground', 'shaolin_vo_anh_dust']) {
      await expect
        .poll(() =>
          player.evaluate((a) => (window as any).__shaolinPngs?.[a], asset),
        )
        .toMatch(/^data:image\/png;base64,/);
      const png = await player.evaluate<string, string>(
        (a) => (window as any).__shaolinPngs[a],
        asset,
      );
      await writeFile(
        join(output, asset + '.png'),
        Buffer.from(png.split(',')[1]!, 'base64'),
      );
    }
    await writeFile(
      join(output, 'observations.json'),
      JSON.stringify({ start, ordinaryIds: ids, results }, null, 2),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
