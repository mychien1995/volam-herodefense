import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { m1Config } from '@volam/game-data';

const evidence = join(
  'docs/evidence/sessions',
  process.env['VOLAM_QA_SESSION'] ?? 'practice',
  'practice',
);
const snapshot = (p: Page) => p.evaluate<any>('window.__VOLAM__.snapshot()');
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  await mkdir(evidence, { recursive: true });
  await page
    .screenshot({ path: join(evidence, 'failure.png') })
    .catch(() => {});
  await writeFile(
    join(evidence, 'failure-state.json'),
    JSON.stringify(
      {
        snapshot: await snapshot(page).catch(() => null),
        presentation: await page
          .evaluate('window.__VOLAM__.presentation()')
          .catch(() => null),
      },
      null,
      2,
    ),
  );
});
const hero = async (p: Page) => {
  const s = await snapshot(p);
  return s.state.players[s.sessionId];
};
async function enter(
  p: Page,
  nickname: string,
  school: string,
  branch: string,
  compact = false,
) {
  await p.goto('/?debug');
  await p.getByRole('button', { name: 'Phòng test', exact: true }).click();
  await p.locator('#practice-nickname').fill(nickname);
  await p.getByRole('button', { name: 'Chọn nhân vật', exact: true }).click();
  await expect(p.locator('#practice-ui .school-card')).toHaveCount(7);
  if (compact) {
    await p.setViewportSize({ width: 850, height: 480 });
    await p.screenshot({ path: join(evidence, 'school-compact.png') });
  }
  await p.locator(`[data-practice="school"][data-school="${school}"]`).click();
  await p.locator(`[data-practice="branch"][data-branch="${branch}"]`).click();
  if (compact)
    await p.screenshot({ path: join(evidence, 'branch-compact.png') });
  await p.getByRole('button', { name: 'Vào phòng test', exact: true }).click();
  await expect
    .poll(async () => {
      const s = await snapshot(p);
      return s.state?.players?.[s.sessionId]?.confirmed;
    })
    .toBe(true);
  if (await p.locator('#practice-ui').isVisible()) {
    const before = await hero(p);
    await p.keyboard.press('ArrowRight', { delay: 120 });
    await p.keyboard.press('q');
    const after = await hero(p);
    expect(
      (await snapshot(p)).events.some(
        (e: any) => e.kind === 'cast' || e.kind === 'attack',
      ),
    ).toBe(false);
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
  }
  await expect(p.locator('#practice-ui')).toBeHidden({ timeout: 60000 });
  if (compact) await p.setViewportSize({ width: 1280, height: 720 });
  await expect
    .poll(() => p.evaluate('window.__VOLAM__.presentation()?.pvpMap'))
    .toBe('rung_truc');
}

test('practice presentation keeps name controls on one line and native bounded world scale at wide ratios', async ({
  page,
}) => {
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 672, height: 419 });
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Phòng test', exact: true }).click();
  const form = await page.locator('#practice-name-form').evaluate((e) =>
    [...e.children].map((c) => ({
      tag: c.tagName,
      width: c.getBoundingClientRect().width,
      height: c.getBoundingClientRect().height,
      top: c.getBoundingClientRect().top,
      whiteSpace: getComputedStyle(c).whiteSpace,
    })),
  );
  expect(form[0]!.whiteSpace).toBe('nowrap');
  expect(form[2]!.whiteSpace).toBe('nowrap');
  expect(form[1]!.height).toBeLessThanOrEqual(48);
  expect(form[2]!.height).toBeLessThanOrEqual(48);
  expect(Math.abs(form[1]!.top - form[2]!.top)).toBeLessThanOrEqual(5);
  await page.screenshot({ path: join(evidence, 'name-single-line.png') });
  await page.setViewportSize({ width: 1872, height: 800 });
  await enter(page, 'Thử camera', 'vo_dang', 'vo_dang_kiem');
  const samples = [];
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1872, height: 800 },
    { width: 850, height: 480 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(async () => {
        const p = await page.evaluate<any>('window.__VOLAM__.presentation()'),
          v = p.worldView;
        return (
          !!v &&
          p.zoom >= 1 &&
          v.x >= -1 &&
          v.y >= -1 &&
          v.x + v.width <= 1281 &&
          v.y + v.height <= 721 &&
          Math.abs(v.width * p.zoom - size.width) < 2 &&
          Math.abs(v.height * p.zoom - size.height) < 2
        );
      })
      .toBe(true);
    const p = await page.evaluate<any>('window.__VOLAM__.presentation()');
    const native = size.width >= 960 && size.height >= 600 ? 2 : 1;
    expect(p.zoom).toBeGreaterThanOrEqual(native);
    const width = await page
      .getByRole('button', { name: 'Thoát', exact: true })
      .evaluate((e) => e.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(73);
    samples.push({
      size,
      zoom: p.zoom,
      worldView: p.worldView,
      utilityWidth: width,
    });
    if (size.width === 1872)
      await page.screenshot({ path: join(evidence, 'native-wide.png') });
  }
  await writeFile(
    join(evidence, 'presentation.json'),
    JSON.stringify({ form, samples }, null, 2),
  );
});

test('practice switches school and branch without leaving the room, blocks modal controls and clears summons', async ({
  page,
}) => {
  test.setTimeout(180000);
  await mkdir(evidence, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await enter(page, 'Thử đổi phái', 'cai_bang', 'cai_bang_chuong');
  const initial = await snapshot(page),
    old = await hero(page);
  const button = page.getByRole('button', {
    name: 'Đổi phái/hệ phái',
    exact: true,
  });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('#practice-ui .school-card')).toHaveCount(7);
  await page.keyboard.press('ArrowRight', { delay: 150 });
  await page.keyboard.press('q');
  await page.waitForTimeout(350);
  expect((await hero(page)).x).toBe(old.x);
  expect((await hero(page)).y).toBe(old.y);
  expect((await snapshot(page)).events).toHaveLength(0);
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.locator('#practice-ui')).toBeHidden();
  expect((await hero(page)).selectedBranch).toBe('cai_bang_chuong');
  const changes: any[] = [];
  const choose = async (school: string, branch: string) => {
    await button.click();
    await page
      .locator(`[data-practice="school"][data-school="${school}"]`)
      .click();
    await page
      .locator(`[data-practice="branch"][data-branch="${branch}"]`)
      .click();
    await page
      .getByRole('button', { name: 'Đổi nhân vật', exact: true })
      .click();
    await expect
      .poll(async () => (await hero(page)).selectedBranch)
      .toBe(branch);
    await expect(page.locator('#practice-ui')).toBeHidden();
    await expect(page.locator('.hotbar-skill .skill-rank')).toHaveText([
      '4',
      '4',
      '4',
      '4',
      '4',
    ]);
    const s = await snapshot(page),
      h = await hero(page);
    expect(s.roomId).toBe(initial.roomId);
    expect(s.sessionId).toBe(initial.sessionId);
    expect(h).toMatchObject({
      nickname: old.nickname,
      schoolId: school,
      level: 30,
      x: old.x,
      y: old.y,
    });
    expect(Object.keys(s.state.creeps)).toEqual(
      Object.keys(initial.state.creeps),
    );
    expect(h.hp).toBe(h.maxHp);
    expect(h.mana).toBe(h.maxMana);
    await expect(page.locator('#slot-q')).toHaveAttribute(
      'data-skill-id',
      h.qSkill,
    );
    await expect
      .poll(async () => {
        const p = await page.evaluate<any>('window.__VOLAM__.presentation()');
        return p.actors.find((a: any) => a.id === initial.sessionId)?.texture;
      })
      .toMatch(
        new RegExp(
          branch === 'cai_bang_bong' ? 'bong' : school.replaceAll('_', '[-_]'),
        ),
      );
    changes.push({ school, branch, hero: h });
  };
  await choose('cai_bang', 'cai_bang_bong');
  await button.click();
  await page.setViewportSize({ width: 850, height: 480 });
  await page.screenshot({ path: join(evidence, 'change-school-compact.png') });
  await page.locator('[data-practice="school"][data-school="vo_dang"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#practice-ui dialog')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#practice-ui')).toBeHidden();
  expect((await hero(page)).selectedBranch).toBe('cai_bang_bong');
  await page.setViewportSize({ width: 1280, height: 720 });
  await choose('ngu_doc', 'ngu_doc_co_su');
  await page.locator('#game canvas').focus();
  await page.keyboard.press('w');
  await expect
    .poll(
      async () =>
        Object.values((await snapshot(page)).state.creeps).filter(
          (c: any) => c.ownerId === initial.sessionId,
        ).length,
    )
    .toBeGreaterThan(0);
  await choose('vo_dang', 'vo_dang_kiem');
  await expect
    .poll(
      async () =>
        Object.values((await snapshot(page)).state.creeps).filter(
          (c: any) => c.ownerId === initial.sessionId,
        ).length,
    )
    .toBe(0);
  const q = (await hero(page)).qSkill,
    count = (await snapshot(page)).events.filter(
      (e: any) => e.kind === 'cast' && e.abilityId === q,
    ).length;
  await page.locator('#game canvas').focus();
  await page.keyboard.press('q');
  await expect
    .poll(
      async () =>
        (await snapshot(page)).events.filter(
          (e: any) => e.kind === 'cast' && e.abilityId === q,
        ).length,
    )
    .toBeGreaterThan(count);
  await choose('thieu_lam', 'thieu_lam_quyen');
  await page.locator('#game canvas').focus();
  await page.keyboard.press('f');
  await expect(page.locator('#shaolin-stance')).toContainText('Cước');
  await page.screenshot({ path: join(evidence, 'changed-hero.png') });
  expect(errors).toEqual([]);
  await writeFile(
    join(evidence, 'change-observations.json'),
    JSON.stringify(
      { roomId: initial.roomId, sessionId: initial.sessionId, changes, errors },
      null,
      2,
    ),
  );
});

test('private practice: max hero, immortal idle dogs, free repeated casts, real movement, stance and exit', async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  await mkdir(evidence, { recursive: true });
  const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    other = await context.newPage();
  const errors: string[] = [];
  for (const p of [page, other]) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  try {
    await page.setViewportSize({ width: 1280, height: 720 });
    await enter(page, 'Thử Chưởng', 'cai_bang', 'cai_bang_chuong', true);
    await enter(other, 'Thử Quyền', 'thieu_lam', 'thieu_lam_quyen');
    const a = await snapshot(page),
      b = await snapshot(other);
    expect(a.roomId).not.toBe(b.roomId);
    expect(Object.keys(a.state.players)).toEqual([a.sessionId]);
    expect(a.state.practice.enabled).toBe(true);
    expect(a.state.pvp.enabled).toBe(false);
    expect(a.state.defense.enabled).toBe(false);
    expect(Object.values(a.state.creeps)).toHaveLength(3);
    expect(await hero(page)).toMatchObject({
      level: 30,
      skillPoints: 0,
      gold: 0,
    });
    await expect(page.locator('.hotbar-skill .skill-rank')).toHaveText([
      '4',
      '4',
      '4',
      '4',
      '4',
    ]);
    await expect(page.locator('#practice-banner')).toBeVisible();
    await expect(page.locator('[data-menu="dungeons"]')).toBeHidden();
    await expect(page.locator('.bag-cluster')).toBeHidden();
    const positions = Object.values(a.state.creeps).map((c: any) => [
      c.id,
      c.x,
      c.y,
    ]);
    const frames = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const presentation = await page.evaluate<any>(
        'window.__VOLAM__.presentation()',
      );
      const dogs = presentation.actors.filter((v: any) =>
        v.id.includes('practice_dog_'),
      );
      expect(dogs).toHaveLength(3);
      for (const d of dogs) {
        expect(d.texture).toBe('renovated-creep_wild_dog');
        frames.add(d.frame);
      }
      expect(presentation.pvp?.hazards ?? []).toHaveLength(0);
      await page.waitForTimeout(80);
    }
    // Current renovated idle is a held cel; walking/attack frames are not expected here.
    expect([...frames].every((frame) => frame.startsWith('idle_'))).toBe(true);
    expect(
      Object.values((await snapshot(page)).state.creeps).map((c: any) => [
        c.id,
        c.x,
        c.y,
      ]),
    ).toEqual(positions);
    await page.screenshot({ path: join(evidence, 'three-dogs.png') });
    await page.bringToFront();
    await page.locator('#game canvas').focus();
    await page.keyboard.press('a');
    await expect
      .poll(async () =>
        (await snapshot(page)).events.some(
          (e: any) =>
            e.kind === 'hit' && e.sourceId === a.sessionId && e.damage > 0,
        ),
      )
      .toBe(true);
    await expect
      .poll(async () => (await hero(page)).pose, { timeout: 5000 })
      .toBe('idle');
    const q = await page.locator('#slot-q').getAttribute('data-skill-id');
    await page.keyboard.press('q');
    await expect
      .poll(
        async () =>
          (await snapshot(page)).events.filter(
            (e: any) => e.kind === 'cast' && e.abilityId === q,
          ).length,
      )
      .toBe(1);
    await expect
      .poll(async () => (await hero(page)).pose, { timeout: 5000 })
      .toBe('idle');
    await page.keyboard.press('q');
    await expect
      .poll(
        async () =>
          (await snapshot(page)).events.filter(
            (e: any) => e.kind === 'cast' && e.abilityId === q,
          ).length,
      )
      .toBe(2);
    const final = await snapshot(page),
      h = await hero(page),
      casts = final.events.filter(
        (e: any) => e.kind === 'cast' && e.abilityId === q,
      );
    const normal = m1Config.progression!.skills[q!]!.ranks[3]!;
    expect(casts[1].tick - casts[0].tick).toBeLessThan(normal.cooldownTicks);
    expect(h.mana).toBe(h.maxMana);
    expect(h.hp).toBe(h.maxHp);
    expect([
      h.qCooldown,
      h.wCooldown,
      h.eCooldown,
      h.rCooldown,
      h.tCooldown,
    ]).toEqual([0, 0, 0, 0, 0]);
    expect(
      Object.values(final.state.creeps).every((c: any) => c.hp === c.maxHp),
    ).toBe(true);
    expect(final.events.some((e: any) => e.kind === 'death')).toBe(false);
    expect((await snapshot(other)).events).toHaveLength(0);
    const beforeMove = h.x,
      sequence = h.lastSequence;
    await page.keyboard.press('ArrowLeft', { delay: 160 });
    await expect
      .poll(async () => (await hero(page)).lastSequence)
      .toBeGreaterThan(sequence);
    await expect
      .poll(async () => (await hero(page)).x)
      .toBeLessThan(beforeMove);
    await other.bringToFront();
    await other.locator('#game canvas').focus();
    await other.keyboard.press('f');
    await expect(other.locator('#shaolin-stance')).toContainText('Cước');
    await page.screenshot({ path: join(evidence, 'real-cast.png') });
    await writeFile(
      join(evidence, 'observations.json'),
      JSON.stringify(
        {
          roomA: a.roomId,
          roomB: b.roomId,
          frames: [...frames],
          casts,
          hero: h,
          dogs: final.state.creeps,
          errors,
        },
        null,
        2,
      ),
    );
    await page.getByRole('button', { name: 'Thoát', exact: true }).click();
    await page.locator('#confirm-quit').click();
    await expect(page.locator('#practice-nickname')).toBeVisible();
    expect(errors).toEqual([]);
  } catch (error) {
    await page
      .screenshot({ path: join(evidence, 'failure.png') })
      .catch(() => {});
    await writeFile(
      join(evidence, 'failure-state.json'),
      JSON.stringify(
        {
          snapshot: await snapshot(page).catch(() => null),
          presentation: await page
            .evaluate('window.__VOLAM__.presentation()')
            .catch(() => null),
          errors,
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await context.close();
  }
});
