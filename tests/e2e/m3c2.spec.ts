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
const out = 'docs/evidence/m3c2';
test('M3C2 normal three-school progression, shared dungeon farming, read-only builds, mana sustain and arena defense', async ({
  browser,
}) => {
  const contexts = await Promise.all(
      [1280, 1280, 1920].map((w) =>
        browser.newContext({
          viewport: { width: w, height: w === 1920 ? 1080 : 720 },
        }),
      ),
    ),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    c = pages[2]!,
    errors = pages.map(monitor);
  await mkdir(out, { recursive: true });
  try {
    let room = '';
    for (let i = 0; i < 3; i++) {
      await joinWaiting(pages[i]!, 'Playable ' + i, room || undefined);
      if (!room) room = (await read(pages[i]!)).roomId;
    }
    await startTogether(pages, ['cai_bang', 'thien_son', 'vo_dang']);
    expect((await hero(c)).build.enabled).toBe(true);
    expect((await hero(c)).build.available).toBe(1);
    expect((await hero(c)).basicId).toBe('vo_dang_quyen');
    const builds = [
      ['hoa_van_chuong', '', '', ''],
      ['luc_duong_chuong', '', '', ''],
      ['duong_khi_kich', 'thai_cuc_than_cong', 'bat_quai_kiem_tran', ''],
    ];
    for (let i = 0; i < 3; i++) {
      const p = pages[i]!;
      await menu(p);
      await loadout(p, builds[i]!);
      await upgrade(p, builds[i]![0]!);
      if (p === c) {
        await expect(p.locator('[data-skill-card]')).toHaveCount(10);
        await expect(p.locator('#skill-management')).toContainText(
          'Thái Cực Tâm Pháp',
        );
        await p
          .getByLabel('Normal attack · A', { exact: true })
          .selectOption('vo_dang_kiem');
        await expect
          .poll(async () => (await hero(c)).basicId)
          .toBe('vo_dang_kiem');
        await expect(p.locator('#innate-summary')).toContainText('+3 MP');
        await expect(p.locator('#innate-summary')).toContainText('+0.15 MP/s');
        await expect(p.locator('#innate-summary')).toContainText(
          '+0.4% giảm hồi chiêu',
        );
        await p.screenshot({ path: `${out}/skill-menu-1920.png` });
      }
      await close(p);
    }
    for (const p of pages) await enter(p);
    for (let i = 0; i < 3; i++)
      await moveTo(pages[i]!, 500 + i * 10, 320 + i * 12);
    await menu(c);
    await expect(c.locator('#skill-readonly')).toContainText('Chỉ xem');
    await expect(c.locator('#basic-style')).toBeDisabled();
    await close(c);
    const ids = await Promise.all(
        pages.map(async (p) => (await read(p)).sessionId),
      ),
      end = Date.now() + 35000;
    const participants = new Set<string>();
    const observeHits = async () => {
      for (const p of pages)
        for (const e of (await read(p)).events)
          if (e.kind === 'hit' && ids.includes(e.sourceId))
            participants.add(e.sourceId);
    };
    await observeHits();
    while (Date.now() < end && (await hero(c)).level < 3) {
      for (const p of pages) {
        if ((await hero(p)).hp <= 0) continue;
        await p.locator('#game canvas').focus();
        if ((await hero(p)).qCooldown === 0) await p.keyboard.press('KeyQ');
        if ((await hero(p)).basicCooldown === 0) await p.keyboard.press('KeyA');
      }
      await observeHits();
      await c.waitForTimeout(200);
    }
    await observeHits();
    expect((await hero(c)).level).toBeGreaterThanOrEqual(3);
    expect((await hero(c)).xp).toBeGreaterThan(0);
    const farm = await read(c);
    // snapshot() intentionally retains only the latest60 events. Accumulate
    // real observed hits across the fight instead of treating that tail as a log.
    for (const id of ids) expect(participants.has(id)).toBe(true);
    await c.screenshot({ path: `${out}/three-schools-dungeon.png` });
    for (const p of pages) {
      if ((await hero(p)).hp <= 0)
        await expect
          .poll(async () => (await hero(p)).zoneId, { timeout: 10000 })
          .toBe('arena');
      if ((await hero(p)).zoneId !== 'arena') {
        await p.locator('#game canvas').focus();
        await p.keyboard.press('ArrowLeft', { delay: 1200 });
        if ((await hero(p)).hp <= 0)
          await expect
            .poll(async () => (await hero(p)).zoneId, { timeout: 10000 })
            .toBe('arena');
        if ((await hero(p)).zoneId !== 'arena') await exit(p);
      }
    }
    await menu(c);
    await upgrade(c, 'thai_cuc_than_cong');
    await upgrade(c, 'bat_quai_kiem_tran');
    await close(c);
    await moveTo(c, 800, 750);
    await c.locator('#game canvas').focus();
    await c.keyboard.press('KeyW');
    await expect
      .poll(async () => (await hero(c)).statuses)
      .toContain('mana_shield');
    await c.keyboard.press('KeyE');
    await expect
      .poll(async () =>
        (await view(c)).skills.persistent.some(
          (v) => v.texture === 'bat_quai_kiem_tran_vfx',
        ),
      )
      .toBe(true);
    await expect
      .poll(async () => (await read(c)).state.defense.wave, { timeout: 35000 })
      .toBeGreaterThan(0);
    const defenseEnd = Date.now() + 20000;
    let defended = false;
    while (Date.now() < defenseEnd && !defended) {
      const s = await read(c),
        h = s.state.players[s.sessionId]!,
        e = Object.values(s.state.creeps)
          .filter((e) => e.invasionWave > 0 && e.hp > 0)
          .sort(
            (a, b) =>
              Math.hypot(a.x - h.x, a.y - h.y) -
              Math.hypot(b.x - h.x, b.y - h.y),
          )[0];
      if (e) {
        await moveTo(
          c,
          Math.max(120, Math.min(1450, e.x - 25)),
          Math.max(620, Math.min(900, e.y)),
        );
        await c.keyboard.press('ArrowRight', { delay: 40 });
        await c.keyboard.press('KeyA');
        if ((await hero(c)).qCooldown === 0) await c.keyboard.press('KeyQ');
      }
      const current = await read(c);
      defended = current.events.some(
        (ev) =>
          ev.sourceId === s.sessionId &&
          ev.kind === 'hit' &&
          (current.state.creeps[ev.targetId]?.invasionWave ?? 0) > 0,
      );
      await c.waitForTimeout(100);
    }
    expect(defended).toBe(true);
    await c.screenshot({ path: `${out}/three-schools-arena-defense.png` });
    await writeFile(
      `${out}/normal-observations.json`,
      JSON.stringify(
        {
          farm,
          participants: [...participants],
          final: await read(c),
          presentation: await view(c),
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
test('M3C2 six-player natural combat: three schools keep effects owned, feet/pivots readable and rewards authoritative', async ({
  browser,
}) => {
  test.setTimeout(300000);
  const contexts = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        browser.newContext({
          viewport:
            i === 0
              ? { width: 1920, height: 1080 }
              : { width: 640, height: 360 },
        }),
      ),
    ),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors = pages.map(monitor),
    schools = [
      'vo_dang',
      'cai_bang',
      'thien_son',
      'vo_dang',
      'cai_bang',
      'thien_son',
    ];
  try {
    let room = '';
    for (let i = 0; i < 6; i++) {
      await joinWaiting(pages[i]!, 'Party ' + i, room || undefined);
      if (!room) room = (await read(pages[i]!)).roomId;
    }
    await startTogether(pages, schools);
    for (let i = 0; i < 6; i++) {
      const p = pages[i]!,
        skill =
          schools[i] === 'vo_dang'
            ? 'bat_quai_kiem_tran'
            : schools[i] === 'thien_son'
              ? 'luc_duong_chuong'
              : 'hoa_van_chuong';
      await menu(p);
      await loadout(p, [skill, '', '', '']);
      await upgrade(p, skill);
      await close(p);
      await enter(p);
    }
    for (let i = 0; i < 6; i++) {
      // The sixth shared spawn is below the bridge approach. Align on the open
      // entrance path before moving east, instead of walking into forest terrain.
      await moveTo(pages[i]!, 240, 320);
      await moveTo(pages[i]!, 500 + (i % 3) * 10, 310 + Math.floor(i / 3) * 20);
      await pages[i]!.keyboard.press('KeyQ');
    }
    for (const p of pages) {
      await p.locator('#game canvas').focus();
      await p.keyboard.press('KeyQ');
    }
    const first = pages[0]!;
    await expect
      .poll(
        async () =>
          (await read(first)).events.filter((e) => e.kind === 'hit').length,
      )
      .toBeGreaterThan(0);
    const end = Date.now() + 22000;
    while (
      Date.now() < end &&
      !(await Promise.all(pages.map(hero))).every((h) => h.xp > 0)
    ) {
      for (const p of pages) {
        const h = await hero(p);
        if (h.hp <= 0) continue;
        await p.locator('#game canvas').focus();
        if (h.qCooldown === 0) await p.keyboard.press('KeyQ');
        if (h.basicCooldown === 0) await p.keyboard.press('KeyA');
      }
      await first.waitForTimeout(180);
    }
    const heroes = await Promise.all(pages.map(hero));
    expect(heroes.every((h) => h.xp > 0)).toBe(true);
    const naturalCombat = await read(pages[0]!);
    // Combat may legitimately kill/respawn a participant between CDP reads.
    // Retain real reward evidence, then gather the whole living party for the
    // separate normal-zoom readability/ownership check.
    for (const p of pages) {
      let h = await hero(p);
      if (h.hp <= 0)
        await expect
          .poll(async () => (await hero(p)).zoneId, { timeout: 10000 })
          .toBe('arena');
      h = await hero(p);
      if (h.zoneId !== 'arena') {
        await p.locator('#game canvas').focus();
        await p.keyboard.press('ArrowLeft', { delay: 1000 });
        if ((await hero(p)).hp <= 0)
          await expect
            .poll(async () => (await hero(p)).zoneId, { timeout: 10000 })
            .toBe('arena');
        if ((await hero(p)).zoneId !== 'arena') {
          await moveTo(p, 240, 320);
          await exit(p);
        }
      }
      await expect
        .poll(async () => (await hero(p)).hp, { timeout: 10000 })
        .toBeGreaterThan(0);
    }
    for (let i = 0; i < 6; i++)
      await moveTo(pages[i]!, 740 + (i % 3) * 60, 980 + Math.floor(i / 3) * 60);
    for (const p of pages) {
      await expect
        .poll(async () => (await hero(p)).qCooldown, { timeout: 12000 })
        .toBe(0);
      await p.locator('#game canvas').focus();
      await p.keyboard.press('KeyQ');
    }
    const awaitedIds = new Set(Object.keys((await read(first)).state.players));
    await expect
      .poll(
        async () =>
          (await view(first)).actors.filter((a) => awaitedIds.has(a.id)).length,
      )
      .toBe(6);
    const v = await view(first),
      s = await read(first);
    expect(v.rotation).toBe(0);
    expect(v.zoom).toBe(1);
    for (const [id, h] of Object.entries(s.state.players)) {
      expect(h.zoneId).toBe('arena');
      expect(h.hp).toBeGreaterThan(0);
      const actor = v.actors.find((a) => a.id === id)!;
      expect(actor).toBeDefined();
      expect(actor.origin).toEqual([0.5, 0.8]);
      expect(actor.scale).toEqual([1, 1]);
      expect(actor.depth).toBe(actor.y);
    }
    expect(
      v.skills.persistent.filter((e) => e.texture === 'bat_quai_kiem_tran_vfx'),
    ).toHaveLength(2);
    await first.screenshot({ path: `${out}/six-player-combat-1920.png` });
    await first.setViewportSize({ width: 1280, height: 720 });
    await first.screenshot({ path: `${out}/six-player-combat-1280.png` });
    await writeFile(
      `${out}/six-player-observations.json`,
      JSON.stringify(
        {
          scope:
            'Natural six-player dungeon combat/rewards followed by six living players in arena for readability; no synthetic rewards',
          heroes,
          naturalCombat,
          readability: { state: s, presentation: v },
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
