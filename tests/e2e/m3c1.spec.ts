import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import {
  read,
  hero,
  view,
  monitor,
  menu,
  close,
  loadout,
  upgrade,
  moveTo,
  enter,
  exit,
} from './m3c1-helpers.js';
test('M3C1 normal mixed-school progression: shared farming, independent ranks, mobility, statue defense and cleanup', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)],
    out = 'docs/evidence/m3c1';
  await mkdir(out, { recursive: true });
  try {
    await joinWaiting(a, 'Cái Bang');
    await joinWaiting(b, 'Thiên Sơn', (await read(a)).roomId);
    await startTogether([a, b], ['cai_bang', 'thien_son']);
    expect((await hero(b)).build.enabled).toBe(true);
    expect((await hero(b)).build.available).toBe(1);
    expect((await hero(b)).basicId).toBe('thien_son_phien');
    await menu(b);
    await expect(b.locator('[data-skill-card]')).toHaveCount(10);
    await expect(b.locator('#skill-management')).toContainText(
      'Bắc Minh Thần Công',
    );
    await expect(b.locator('[data-skill-card=hoa_van_chuong]')).toHaveCount(0);
    await loadout(b, [
      'luc_duong_chuong',
      'luu_phong_bo',
      'chiet_mai_thu',
      'truy_hon_dao',
    ]);
    await upgrade(b, 'luc_duong_chuong');
    await b
      .getByLabel('Normal attack · A', { exact: true })
      .selectOption('thien_son_dao');
    await expect
      .poll(async () => (await hero(b)).basicId)
      .toBe('thien_son_dao');
    await b.screenshot({ path: `${out}/skill-menu-1920.png` });
    await close(b);
    await menu(a);
    await loadout(a, ['hoa_van_chuong', '', '', '']);
    await upgrade(a, 'hoa_van_chuong');
    await a
      .getByLabel('Normal attack · A', { exact: true })
      .selectOption('cai_bang_chuong');
    await close(a);
    await b.locator('[data-menu=dungeons]').click();
    await expect(b.locator('.dungeon-school-avatar')).toBeVisible();
    await b.screenshot({ path: `${out}/dungeon-selector-avatar.png` });
    await b.keyboard.press('Escape');
    await enter(a);
    await enter(b);
    await moveTo(a, 530, 320);
    await moveTo(b, 490, 350);
    await menu(b);
    await expect(b.locator('#skill-readonly')).toContainText('Chỉ xem');
    await expect(b.locator('#basic-style')).toBeDisabled();
    await close(b);
    await b.keyboard.press('ArrowRight', { delay: 40 });
    const idA = (await read(a)).sessionId,
      idB = (await read(b)).sessionId,
      deadline = Date.now() + 30000;
    const hitsA = new Set<string>(),
      hitsB = new Set<string>();
    while (
      Date.now() < deadline &&
      ((await hero(b)).level < 3 || (await hero(a)).level < 2)
    ) {
      for (const p of [a, b]) {
        await p.locator('#game canvas').focus();
        if ((await hero(p)).qCooldown === 0) await p.keyboard.press('KeyQ');
        if ((await hero(p)).basicCooldown === 0) await p.keyboard.press('KeyA');
      }
      for (const e of (await read(a)).events.filter((e) => e.kind === 'hit')) {
        if (e.sourceId === idA) hitsA.add(e.targetId);
        if (e.sourceId === idB) hitsB.add(e.targetId);
      }
      await a.waitForTimeout(220);
    }
    expect((await hero(a)).level).toBeGreaterThanOrEqual(2);
    expect((await hero(b)).level).toBeGreaterThanOrEqual(3);
    expect([...hitsA].some((id) => hitsB.has(id))).toBe(true);
    await a.screenshot({ path: `${out}/mixed-shared-dungeon.png` });
    // Follow actual exit or death/respawn state, not stale dungeon coordinates.
    async function leaveFarm(p: typeof a) {
      let h = await hero(p);
      if (h.zoneId !== 'arena' && h.hp > 0) {
        await p.bringToFront();
        await p.locator('#game canvas').focus();
        await p.keyboard.press('ArrowLeft', { delay: 1600 });
      }
      h = await hero(p);
      if (h.hp <= 0)
        await expect
          .poll(async () => (await hero(p)).zoneId, { timeout: 10000 })
          .toBe('arena');
      if ((await hero(p)).zoneId !== 'arena') await exit(p);
      await expect
        .poll(async () => (await hero(p)).hp, { timeout: 10000 })
        .toBeGreaterThan(0);
    }
    await leaveFarm(a);
    await leaveFarm(b);
    await menu(b);
    await upgrade(b, 'luu_phong_bo');
    await upgrade(b, 'chiet_mai_thu');
    await close(b);
    await moveTo(a, 850, 680);
    await moveTo(b, 790, 680);
    await b.keyboard.press('KeyE');
    await expect
      .poll(async () => (await hero(b)).statuses)
      .toContain('speed_buff');
    expect((await hero(a)).statuses).not.toContain('speed_buff');
    await b.keyboard.press('ArrowRight', { delay: 50 });
    const x = (await hero(b)).x;
    await b.keyboard.press('KeyW');
    await expect.poll(async () => (await hero(b)).x).toBeGreaterThan(x + 100);
    await expect
      .poll(async () => (await read(a)).state.defense.wave, { timeout: 35000 })
      .toBeGreaterThan(0);
    const defenseEnd = Date.now() + 20000;
    let fireHit = false,
      windHit = false;
    while (Date.now() < defenseEnd && (!fireHit || !windHit)) {
      for (const p of [a, b]) {
        const s = await read(p),
          h = s.state.players[s.sessionId]!,
          enemy = Object.values(s.state.creeps)
            .filter((e) => e.hp > 0 && e.invasionWave > 0)
            .sort(
              (a, b) =>
                Math.hypot(a.x - h.x, a.y - h.y) -
                Math.hypot(b.x - h.x, b.y - h.y),
            )[0];
        if (enemy) {
          await moveTo(
            p,
            Math.max(120, Math.min(1450, enemy.x - 25)),
            Math.max(620, Math.min(900, enemy.y)),
          );
          await p.keyboard.press('ArrowRight', { delay: 40 });
          if ((await hero(p)).qCooldown === 0) await p.keyboard.press('KeyQ');
          await p.keyboard.press('KeyA');
        }
      }
      for (const e of (await read(a)).events) {
        if (e.kind === 'hit' && e.targetId.startsWith('invasion_')) {
          if (e.sourceId === idA) fireHit = true;
          if (e.sourceId === idB) windHit = true;
        }
      }
      await a.waitForTimeout(200);
    }
    expect(fireHit).toBe(true);
    expect(windHit).toBe(true);
    await b.screenshot({ path: `${out}/mixed-statue-defense.png` });
    await menu(b);
    await b.locator('#reset-skills').click();
    await expect
      .poll(async () => (await hero(b)).build.available)
      .toBe((await hero(b)).build.earned);
    await upgrade(b, 'luc_duong_chuong');
    await upgrade(b, 'luc_duong_chuong');
    await b.screenshot({ path: `${out}/rank-upgrade.png` });
    await close(b);
    await enter(b);
    await expect.poll(async () => (await hero(b)).statuses).toBe('[]');
    await writeFile(
      `${out}/mixed-school-browser.json`,
      JSON.stringify(
        {
          a: await read(a),
          b: await read(b),
          presentation: await view(b),
          hitsA: [...hitsA],
          hitsB: [...hitsB],
          fireHit,
          windHit,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
