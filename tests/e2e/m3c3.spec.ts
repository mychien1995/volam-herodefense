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
const out = process.env['VOLAM_FEEDBACK_V2_REVIEW']
  ? 'docs/evidence/m3c3-feedback-v2-runtime'
  : process.env['VOLAM_FEEDBACK_REVIEW']
    ? 'docs/evidence/m3c3-feedback'
    : 'docs/evidence/m3c3';
test('M3C3 normal four-school progression, shared dungeon farming, read-only builds, mana sustain and arena defense', async ({
  browser,
}) => {
  const contexts = await Promise.all(
      [1280, 1280, 1280, 1920].map((w) =>
        browser.newContext({
          viewport: { width: w, height: w === 1920 ? 1080 : 720 },
        }),
      ),
    ),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    c = pages[3]!,
    errors = pages.map(monitor);
  await mkdir(out, { recursive: true });
  try {
    let room = '';
    for (let i = 0; i < 4; i++) {
      await joinWaiting(pages[i]!, 'Playable ' + i, room || undefined);
      if (!room) room = (await read(pages[i]!)).roomId;
    }
    await startTogether(pages, [
      'cai_bang',
      'thien_son',
      'vo_dang',
      'thieu_lam',
    ]);
    expect((await hero(c)).build.enabled).toBe(true);
    expect((await hero(c)).build.available).toBe(1);
    expect((await hero(c)).basicId).toBe('thieu_lam_quyen');
    const builds = [
      ['hoa_van_chuong', '', '', ''],
      ['luc_duong_chuong', '', '', ''],
      ['duong_khi_kich', '', '', ''],
      ['la_han_quyen', 'kim_cang_bat_hoai', 'kim_quang_ho_tran', ''],
    ];
    for (let i = 0; i < 4; i++) {
      const p = pages[i]!;
      await menu(p);
      await loadout(p, builds[i]!);
      await upgrade(p, builds[i]![0]!);
      if (p === c) {
        await expect(p.locator('[data-skill-card]')).toHaveCount(13);
        await expect(p.locator('#skill-management')).toContainText(
          'Dịch Cân Kinh',
        );
        await p
          .getByLabel('Đánh thường · A', { exact: true })
          .selectOption('thieu_lam_dao');
        await expect
          .poll(async () => (await hero(c)).basicId)
          .toBe('thieu_lam_dao');
        await expect(p.locator('#innate-summary')).toContainText('+4 HP');
        await expect(p.locator('#innate-summary')).toContainText('+0.12 HP/s');
        await expect(p.locator('#innate-summary')).toContainText(
          '+0.5 phòng thủ',
        );
        await p.screenshot({ path: `${out}/skill-menu-1920.png` });
      }
      await close(p);
    }
    for (const p of pages) await enter(p);
    // Stage outside aggro while menus are checked, then approach together.
    for (const p of pages) await moveTo(p, 240, 320);
    await menu(c);
    await expect(c.locator('#skill-readonly')).toContainText('Chỉ xem');
    await expect(c.locator('#basic-style')).toBeDisabled();
    await close(c);
    await Promise.all(
      pages.map((p, i) => moveTo(p, 550 + i * 10, 320 + i * 12)),
    );
    await Promise.all(
      pages.map((p) => p.keyboard.press('ArrowRight', { delay: 70 })),
    );
    const ids = await Promise.all(
        pages.map(async (p) => (await read(p)).sessionId),
      ),
      end = Date.now() + 35000;
    const participants = new Set<string>();
    const observeHits = async () => {
      for (const s of await Promise.all(pages.map(read)))
        for (const e of s.events)
          if (e.kind === 'hit' && ids.includes(e.sourceId))
            participants.add(e.sourceId);
    };
    await observeHits();
    let stop = false;
    const fighters = pages.map(async (p) => {
      await p.locator('#game canvas').focus();
      while (!stop && Date.now() < end) {
        const h = await hero(p);
        if (h.hp > 0) {
          if (h.qCooldown === 0) await p.keyboard.press('KeyQ');
          if (h.basicCooldown === 0) await p.keyboard.press('KeyA');
        }
        await p.waitForTimeout(80);
      }
    });
    try {
      while (Date.now() < end && (await hero(c)).level < 3) {
        await observeHits();
        await c.waitForTimeout(200);
      }
    } finally {
      stop = true;
      await Promise.all(fighters);
    }
    await observeHits();
    await writeFile(
      `${out}/four-player-natural-attempt.json`,
      JSON.stringify(
        {
          heroes: await Promise.all(pages.map(hero)),
          participants: [...participants],
          state: await read(c),
          errors,
        },
        null,
        2,
      ),
    );
    expect((await hero(c)).level).toBeGreaterThanOrEqual(3);
    expect((await hero(c)).xp).toBeGreaterThan(0);
    const farm = await read(c);
    // snapshot() intentionally retains only the latest60 events. Accumulate
    // real observed hits across the fight instead of treating that tail as a log.
    for (const id of ids) expect(participants.has(id)).toBe(true);
    await c.screenshot({ path: `${out}/four-schools-dungeon.png` });
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
    await upgrade(c, 'kim_cang_bat_hoai');
    await upgrade(c, 'kim_quang_ho_tran');
    await close(c);
    await moveTo(c, 800, 750);
    await c.locator('#game canvas').focus();
    await c.keyboard.press('KeyW');
    await expect
      .poll(async () => (await hero(c)).statuses)
      .toContain('damage_reduction');
    await c.keyboard.press('KeyE');
    await expect
      .poll(async () =>
        (await view(c)).skills.persistent.some(
          (v) => v.texture === 'kim_quang_ho_tran_vfx',
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
        if (h.hp > 0) {
          // A moving enemy is not a fixed movement assertion. Steer briefly,
          // then attack; never spend 25s trying to stand on a stale target point.
          const dx = e.x - h.x,
            dy = e.y - h.y;
          const key =
            Math.abs(dx) > Math.abs(dy)
              ? dx < 0
                ? 'ArrowLeft'
                : 'ArrowRight'
              : dy < 0
                ? 'ArrowUp'
                : 'ArrowDown';
          await c.keyboard.press(key, {
            delay: Math.hypot(dx, dy) > 65 ? 160 : 40,
          });
          const now = await hero(c);
          if (now.basicCooldown === 0) await c.keyboard.press('KeyA');
          if (now.qCooldown === 0) await c.keyboard.press('KeyQ');
        }
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
    await c.screenshot({ path: `${out}/four-schools-arena-defense.png` });
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
test('M3C3 six-player natural combat: four schools keep effects owned, feet/pivots readable and rewards authoritative', async ({
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
      'thieu_lam',
      'cai_bang',
      'thien_son',
      'thieu_lam',
      'vo_dang',
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
          schools[i] === 'thieu_lam'
            ? process.env['VOLAM_FEEDBACK_V2_REVIEW']
              ? i === 0
                ? 'la_han_quyen'
                : 'vi_da_quyen'
              : 'toan_phong_thoai'
            : schools[i] === 'vo_dang'
              ? process.env['VOLAM_FEEDBACK_V2_REVIEW']
                ? 'luong_nghi_thu'
                : 'bat_quai_kiem_tran'
              : schools[i] === 'thien_son'
                ? 'luc_duong_chuong'
                : 'hoa_van_chuong';
      await menu(p);
      await loadout(p, [skill, '', '', '']);
      await upgrade(p, skill);
      await close(p);
    }
    await Promise.all(pages.map(enter));
    // Stage safely, then approach together; nobody idles alone in six-player aggro.
    for (const p of pages) await moveTo(p, 240, 320);
    await Promise.all(
      pages.map((p, i) =>
        moveTo(p, 550 + (i % 3) * 10, 310 + Math.floor(i / 3) * 20),
      ),
    );
    await Promise.all(
      pages.map((p) => p.keyboard.press('ArrowRight', { delay: 70 })),
    );
    await Promise.all(
      pages.map(async (p) => {
        await p.locator('#game canvas').focus();
        await p.keyboard.press('KeyQ');
      }),
    );
    const first = pages[0]!;
    await expect
      .poll(
        async () =>
          (await read(first)).events.filter((e) => e.kind === 'hit').length,
      )
      .toBeGreaterThan(0);
    if (process.env['VOLAM_FEEDBACK_V2_REVIEW'])
      await first.screenshot({
        path: `${out}/six-player-natural-contact-1920.png`,
      });
    const end = Date.now() + 35000;
    while (
      Date.now() < end &&
      !(await Promise.all(pages.map(hero))).every((h) => h.xp > 0)
    ) {
      await Promise.all(
        pages.map(async (p) => {
          const h = await hero(p);
          if (h.hp <= 0) return;
          await p.locator('#game canvas').focus();
          if (h.qCooldown === 0) await p.keyboard.press('KeyQ');
          if (h.basicCooldown === 0) await p.keyboard.press('KeyA');
        }),
      );
      await first.waitForTimeout(180);
    }
    const heroes = await Promise.all(pages.map(hero));
    await writeFile(
      out + '/six-player-natural-attempt.json',
      JSON.stringify({ heroes, state: await read(first) }, null, 2),
    );
    expect(
      heroes.every((h) => h.xp > 0),
      JSON.stringify(
        heroes.map((h) => ({
          school: h.schoolId,
          hp: h.hp,
          xp: h.xp,
          zone: h.zoneId,
        })),
      ),
    ).toBe(true);
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
    // Use the same earned/refunded points for the separate aura readability check.
    for (let i = 0; i < 6; i++)
      if (schools[i] === 'thieu_lam') {
        const p = pages[i]!;
        await menu(p);
        await loadout(p, ['kim_quang_ho_tran', '', '', '']);
        await upgrade(p, 'kim_quang_ho_tran');
        await close(p);
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
      v.skills.persistent.filter((e) => e.texture === 'kim_quang_ho_tran_vfx'),
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
