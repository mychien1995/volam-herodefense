import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import type { CombatEvent } from '@volam/game-core';
import { joinWaiting, startTogether } from './pregame-helper.js';

type Effect = {
  name: string;
  frame: string;
  texture: string;
  swordPhase?: 'rise' | 'quiet' | 'fall' | 'impact';
  x: number;
  y: number;
  rotation: number;
  scale: [number, number];
};
type Frame = { body?: Effect; effects: Effect[] };

const events = (page: Page): Promise<CombatEvent[]> =>
  page.evaluate('window.__VOLAM__.snapshot().events');
const frames = (page: Page): Promise<Frame[]> =>
  page.evaluate('window.__kiemFrames');
const boss = (page: Page): Promise<{ x: number; y: number; hp: number }> =>
  page.evaluate('window.__VOLAM__.snapshot().state.creeps.kiem_review_boss');

async function watch(page: Page, owner: string, capture: boolean) {
  await page.evaluate(
    ({ owner, capture }) => {
      const game = (window as any).__VOLAM__;
      const frames: Frame[] = [];
      const images: Record<string, string> = {};
      (window as any).__kiemFrames = frames;
      (window as any).__kiemImages = images;
      const sample = () => {
        const view = game.presentation();
        const body = view.actors.find(
          (entry: { id: string }) => entry.id === owner,
        );
        const { skillEffects } = view.renovation;
        const effects = skillEffects.filter(
          (entry: Effect) => entry.texture === 'vdk-effects',
        );
        if (body?.texture === 'vdk-body' || effects.length)
          frames.push({ body, effects });
        if (frames.length > 550) frames.shift();
        if (capture) {
          const marker = effects.find(
            (entry: Effect) => entry.frame === 'marker',
          );
          const swordCount = effects.filter((entry: Effect) =>
            entry.name.startsWith('vdk:sword:'),
          ).length;
          const phase = marker?.swordPhase;
          const shots = {
            q: effects.some((entry: Effect) => entry.name === 'vdk:seven:6'),
            rise: phase === 'rise' && swordCount >= 8,
            quiet: phase === 'quiet' && swordCount === 0,
            fall: phase === 'fall' && swordCount >= 8,
            impact:
              effects.filter((entry: Effect) => entry.frame === 'impact')
                .length >= 6,
          };
          for (const [id, draw] of Object.entries(shots))
            // Canvas encoding can pause the software renderer. Capture the
            // rain on the second charge, after counting the first one.
            if (
              draw &&
              !images[id] &&
              (id === 'q' || (window as any).__kiemCaptureRain)
            )
              images[id] = document
                .querySelector<HTMLCanvasElement>('#game canvas')!
                .toDataURL();
        }
        setTimeout(() => game.afterRender(sample), 22);
      };
      game.afterRender(sample);
    },
    { owner, capture },
  );
}

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const trace = (await frames(page).catch(() => [])) ?? [];
  const report = JSON.stringify(
    {
      events: await events(page).catch(() => []),
      bodies: [...new Set(trace.map((frame) => frame.body?.frame))],
      effects: [
        ...new Set(
          trace.flatMap((frame) =>
            frame.effects.map((e) => e.name + ':' + e.swordPhase),
          ),
        ),
      ],
    },
    null,
    2,
  );
  await writeFile(info.outputPath('diagnostics.json'), report);
  await info.attach('diagnostics', {
    body: report,
    contentType: 'application/json',
  });
});

test('Võ Đang Kiếm renders A, Q and T and enforces the R stance in a real room', async ({
  page,
  context,
}, info) => {
  const observer = await context.newPage();
  const errors: string[] = [];
  for (const client of [page, observer]) {
    client.on('pageerror', (error) => errors.push(error.message));
    client.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
  }
  await joinWaiting(page, 'Kiem QA');
  const { roomId, sessionId } = await page.evaluate<{
    roomId: string;
    sessionId: string;
  }>('window.__VOLAM__.snapshot()');
  await joinWaiting(observer, 'Kiem Peer', roomId);
  await startTogether([page, observer], ['vo_dang_kiem', 'vo_dang_quyen']);
  for (const [slot, id] of [
    [0, 'that_tinh_kiem'],
    [3, 'toa_sat_bac_do'],
    [4, 'van_kiem_quy_tong'],
  ] as const) {
    const key = 'qwert'[slot]!;
    await expect(page.locator('#slot-' + key)).toHaveAttribute(
      'data-skill-id',
      id,
    );
    const button = page.locator(`[data-rank-slot="${slot}"]`);
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.locator('#slot-' + key + ' .skill-rank')).toHaveText('1');
  }
  await expect(page.locator('#cooldown-t')).toHaveText('2/2 lượt');
  await page.bringToFront();
  await page.locator('#game canvas').focus();
  await watch(page, sessionId, true);
  await watch(observer, sessionId, false);
  const casts = async (id: string, kind: string, peer = page) =>
    (await events(peer)).filter(
      (e) => e.sourceId === sessionId && e.abilityId === id && e.kind === kind,
    );
  const attacks = () => casts('vo_dang_kiem', 'attack');
  for (let i = 1; i <= 7; i++) {
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const s = (window as any).__VOLAM__.snapshot();
          return s.state.players[s.sessionId].basicCooldown;
        }),
      )
      .toBe(0);
    await page.keyboard.press('KeyA');
    await expect.poll(async () => (await attacks()).length).toBe(i);
  }
  const stages = new Set((await attacks()).map((event) => event.stage));
  expect(stages.size).toBeGreaterThan(1);
  expect(
    [...stages].every((stage) =>
      /^(thrust|cut_left|cut_right|cut_down|cut_up)$/.test(stage ?? ''),
    ),
  ).toBe(true);
  await expect
    .poll(async () =>
      (await frames(page)).some(
        (frame) =>
          frame.body?.texture === 'vdk-body' &&
          /_(thrust|cut_)/.test(frame.body.frame),
      ),
    )
    .toBe(true);

  await page.keyboard.press('KeyQ');
  const sweeps = async () =>
    (await casts('that_tinh_kiem', 'pulse')).filter(
      (event) => event.stage === 'sweep',
    );
  await expect
    .poll(async () => (await sweeps()).map((event) => event.hitIndex))
    .toEqual([0, 1, 2, 3, 4, 5, 6]);
  const qPulses = await sweeps();
  expect(qPulses.map((e) => e.tick! - qPulses[0]!.tick!)).toEqual([
    0, 6, 12, 18, 24, 30, 36,
  ]);
  await expect
    .poll(
      async () =>
        new Set(
          (await frames(page)).flatMap(({ effects }) =>
            effects
              .filter((e) => e.name.startsWith('vdk:seven:'))
              .map((e) => e.name),
          ),
        ).size,
    )
    .toBe(7);
  await expect(page.locator('#slot-t')).not.toHaveClass(/unavailable/);

  const target = await boss(page);
  await page.keyboard.press('KeyT');
  await expect(page.locator('#cooldown-t')).toHaveText('1/2 lượt');
  const impacts = async (peer = page) =>
    (await casts('van_kiem_quy_tong', 'pulse', peer)).filter(
      (e) => e.stage === 'area_tick',
    );
  await expect.poll(async () => (await impacts()).length).toBe(1);
  const [impact] = await impacts();
  const [cast] = await casts('van_kiem_quy_tong', 'cast');
  expect(impact!.tick! - cast!.tick!).toBe(80);
  expect({ x: impact!.x, y: impact!.y }).toEqual({ x: target.x, y: target.y });
  await expect.poll(async () => (await boss(page)).hp).toBeLessThan(target.hp);
  await expect
    .poll(async () => (await boss(observer)).hp)
    .toBe((await boss(page)).hp);
  await expect.poll(async () => (await impacts(observer)).length).toBe(1);

  const rain = (await frames(page)).filter(({ effects }) =>
    effects.some((entry) => entry.frame === 'marker'),
  );
  expect(
    rain.some(({ effects }) =>
      effects.some(
        (e) =>
          e.swordPhase === 'rise' &&
          e.frame === 'blade' &&
          Math.abs(e.rotation) < 0.3,
      ),
    ),
  ).toBe(true);
  expect(
    rain.some(({ effects }) =>
      effects.some(
        (e) =>
          e.swordPhase === 'fall' &&
          e.frame === 'blade' &&
          Math.abs(e.rotation) === Math.PI &&
          Math.abs(e.scale[0] / e.scale[1] - 1.1 / 1.2) < 1e-8,
      ),
    ),
  ).toBe(true);
  const gap = rain.filter(({ effects }) =>
    effects.some((e) => e.swordPhase === 'quiet'),
  );
  expect(gap.length).toBeGreaterThan(0);
  expect(
    gap.every(({ effects }) => effects.every((e) => e.frame === 'marker')),
  ).toBe(true);
  expect(
    rain.every(({ effects }) =>
      effects
        .filter((e) => e.frame === 'marker')
        .every((e) => e.x === target.x && e.y === target.y),
    ),
  ).toBe(true);
  expect(
    (await frames(observer)).some(({ effects }) =>
      effects.some((e) => e.frame === 'marker'),
    ),
  ).toBe(true);
  const contacts = async (peer = page) =>
    new Map(
      (await frames(peer)).flatMap(({ effects }) =>
        effects
          .filter((e) => e.name.startsWith('vdk:impact:'))
          .map((e) => [e.name, e] as const),
      ),
    );
  for (const client of [page, observer])
    await expect.poll(async () => (await contacts(client)).size).toBe(48);
  const blasts = [...(await contacts()).values()];
  expect(new Set(blasts.map(({ x, y }) => `${x},${y}`)).size).toBe(48);
  const peakBurstScale = Math.max(
    ...blasts.map((e) => {
      const index = Number(e.name.split(':')[2]);
      const base = ((41 + (index % 3) * 4) * 0.5) / 251;
      return e.scale[0] / base;
    }),
  );
  expect(peakBurstScale).toBeCloseTo(1.1 * Math.sqrt(1.1), 2);
  const center = blasts.find((e) => e.name.startsWith('vdk:impact:0:'));
  expect(center).toMatchObject({ x: target.x, y: target.y });
  const xs = blasts.map((e) => e.x);
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(100);
  expect(await impacts()).toHaveLength(1);

  await page.evaluate('window.__kiemCaptureRain = true');
  await page.keyboard.press('KeyT');
  await expect(page.locator('#cooldown-t')).toHaveText('0/2 lượt');
  await expect(page.locator('#slot-t')).toHaveClass(/cooling/);
  await expect.poll(async () => (await impacts()).length).toBe(2);
  await expect
    .poll(async () => page.evaluate('Boolean(window.__kiemImages.impact)'))
    .toBe(true);
  await page.keyboard.press('KeyT');
  expect(await casts('van_kiem_quy_tong', 'cast')).toHaveLength(2);

  const images = await page.evaluate<Record<string, string>>(
    'window.__kiemImages',
  );
  for (const [id, data] of Object.entries(images))
    await writeFile(
      info.outputPath(id + '.png'),
      Buffer.from(data.split(',')[1]!, 'base64'),
    );
  await info.attach('observed-frames', {
    body: JSON.stringify(
      {
        stages: [...stages],
        sweeps: await sweeps(),
        rain: await impacts(),
        gapFrames: gap.length,
        swordContacts: blasts.length,
        peakBurstScale,
        footprintWidth: Math.max(...xs) - Math.min(...xs),
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });

  const player = () =>
    page.evaluate((id) => {
      const { state } = (window as any).__VOLAM__.snapshot();
      const { x, y, hp, dashCharges, statuses, inventory } = state.players[id];
      return {
        x,
        y,
        hp,
        dashCharges,
        statuses,
        potions: inventory.potions,
        potionCooldownTicks: inventory.potionCooldownTicks,
        tick: state.tick,
      };
    }, sessionId);
  const guard = () => casts('toa_sat_bac_do', 'cast');
  const useDuringGuard = async (resource: 'hp' | 'mp') => {
    const button = page.locator(`[data-potion-resource="${resource}"]`);
    await expect(button).toBeEnabled();
    await page.keyboard.press(resource === 'hp' ? 'Digit1' : 'Digit2');
    await expect
      .poll(async () => (await player()).potions[`${resource}_small`])
      .toBe(0);
    expect((await player()).statuses).toContain('guard_counter');
  };
  const attacksBefore = (await attacks()).length;
  await page.keyboard.press('KeyR');
  await expect
    .poll(async () => (await player()).statuses)
    .toContain('guard_counter');
  const start = await player();
  await page.keyboard.down('ArrowDown');
  await page.keyboard.press('ShiftLeft');
  await page.keyboard.press('KeyA');
  await page.keyboard.press('KeyQ');
  await expect
    .poll(async () => (await player()).tick)
    .toBeGreaterThan(start.tick + 6);
  await page.keyboard.up('ArrowDown');
  expect(await player()).toMatchObject({
    x: start.x,
    y: start.y,
    dashCharges: start.dashCharges,
  });
  expect(await attacks()).toHaveLength(attacksBefore);
  expect(await casts('that_tinh_kiem', 'cast')).toHaveLength(1);
  await useDuringGuard('hp');
  expect((await player()).hp).toBeGreaterThan(start.hp);
  await expect
    .poll(async () => (await player()).statuses, { timeout: 8000 })
    .not.toContain('guard_counter');
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await player()).y).toBeGreaterThan(start.y);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.press('KeyQ');
  await expect
    .poll(async () => (await casts('that_tinh_kiem', 'cast')).length)
    .toBe(2);
  await expect.poll(async () => (await sweeps()).length).toBe(14);
  await expect(page.locator('#slot-r')).not.toHaveClass(/cooling/);
  await expect.poll(async () => (await player()).potionCooldownTicks).toBe(0);
  await page.keyboard.press('KeyR');
  await expect.poll(async () => (await guard()).length).toBe(2);
  await useDuringGuard('mp');
  expect(errors).toEqual([]);
});
