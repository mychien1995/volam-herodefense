import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fortuneReadings, type CombatEvent } from '@volam/game-core';
import { joinWaiting, startTogether } from './pregame-helper.js';

type Art = {
  name: string;
  texture: string;
  frame: string;
  x: number;
  y: number;
  scale: [number, number];
  origin: [number, number];
  projectileStage?: string;
  velocity?: [number, number];
};
type Sample = { body?: Art; effects: Art[] };

const events = (page: Page): Promise<CombatEvent[]> =>
  page.evaluate('window.__VOLAM__.snapshot().events');
const samples = (page: Page): Promise<Sample[]> =>
  page.evaluate('window.__quyenSamples');
const art = (page: Page): Promise<Art[]> =>
  page.evaluate('window.__VOLAM__.presentation().renovation.skillEffects');
const localStatus = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const s = (window as any).__VOLAM__.snapshot();
    return s.state.players[s.sessionId].statuses;
  });

async function sampleFrames(
  page: Page,
  ownerId: string,
  captureStills = false,
) {
  await page.evaluate(
    ({ ownerId, captureStills }) => {
      const game = (window as any).__VOLAM__;
      const ring: Sample[] = [];
      (window as any).__quyenSamples = ring;
      const stills: Record<string, string> = {};
      (window as any).__quyenStills = stills;
      const sample = () => {
        const { bodies, skillEffects } = game.presentation().renovation;
        const body = bodies.find(
          (entry: Art) => entry.name === 'actor:' + ownerId,
        );
        const effects = skillEffects.filter((entry: Art) =>
          entry.texture.startsWith('vdq-'),
        );
        if (body?.texture.startsWith('vdq-') || effects.length)
          ring.push({ body, effects });
        if (captureStills) {
          const ink = effects.filter((entry: Art) => entry.frame === 'ink');
          const seal = effects.filter((entry: Art) => entry.frame === 'seal');
          const status = JSON.parse(
            game.snapshot().state.players[ownerId]?.statuses ?? '[]',
          );
          const frames = {
            'w-seals': seal.length === 5,
            'w-ink': ink.length === 5 && ink[0]!.scale[0] > 0.12,
            'e-result':
              status.some(
                (s: { kind: string }) => s.kind === 'fortune_result',
              ) && effects.some((e: Art) => e.name === 'vdq:glyph:' + ownerId),
            'r-shield': effects.some(
              (e: Art) => e.name === 'vdq:shield:' + ownerId,
            ),
          't-cast': body?.frame.startsWith('taichi_') ?? false,
            't-formation':
              effects.some((e: Art) => e.frame === 'formation') &&
              !body?.frame.startsWith('taichi_'),
          };
          for (const [id, visible] of Object.entries(frames))
            if (visible && !stills[id])
              stills[id] = document
                .querySelector<HTMLCanvasElement>('#game canvas')!
                .toDataURL();
        }
        if (ring.length > 800) ring.shift();
        setTimeout(() => game.afterRender(sample), 25);
      };
      game.afterRender(sample);
    },
    { ownerId, captureStills },
  );
}

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const frames = (await samples(page).catch(() => [])) ?? [];
  const result = {
    events: await events(page).catch(() => []),
    poses: [...new Set(frames.map((entry) => entry.body?.frame))],
    effects: [...new Set(frames.flatMap((entry) => entry.effects.map((effect) => effect.frame)))],
  };
  await info.attach('frame-diagnostics', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
});

test('fixed Võ Đang Quyền loadout renders authoritative casts on two Phaser clients', async ({
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
  await joinWaiting(page, 'Quyen QA');
  const { roomId, sessionId } = await page.evaluate<{
    roomId: string;
    sessionId: string;
  }>('window.__VOLAM__.snapshot()');
  await joinWaiting(observer, 'Quyen Peer', roomId);
  await startTogether([page, observer], ['vo_dang_quyen', 'vo_dang_kiem']);
  for (const [slot, id] of [
    ['q', 'luong_nghi_thu'],
    ['w', 'huyen_am_chuong'],
    ['e', 'duong_khi_kich'],
    ['r', 'thai_cuc_than_cong'],
    ['t', 'thai_cuc_tran'],
  ]) {
    await expect(page.locator('#slot-' + slot)).toHaveAttribute(
      'data-skill-id',
      id!,
    );
    const button = page.locator(`[data-rank-slot="${'qwert'.indexOf(slot!)}"]`);
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.locator('#slot-' + slot + ' .skill-rank')).toHaveText(
      '1',
    );
  }
  await expect(page.locator('#slot-e')).toHaveAttribute(
    'title',
    /Bói Toán Thiên Cơ/,
  );
  await page.bringToFront();
  await page.locator('#game canvas').focus();
  await sampleFrames(page, sessionId, true);
  await sampleFrames(observer, sessionId);
  const stages = async (id: string, kind: string, peer = page) =>
    (await events(peer)).filter(
      (e) => e.sourceId === sessionId && e.abilityId === id && e.kind === kind,
    );
  const seen = async (condition: (sample: Sample) => boolean, peer = page) =>
    (await samples(peer)).some(condition);
  const hasFrame = (frame: string, peer = page) =>
    seen(
      ({ effects }) => effects.some((effect) => effect.frame === frame),
      peer,
    );

  for (let i = 1; i <= 2; i++) {
    await page.keyboard.press('KeyA');
    await expect
      .poll(async () => (await stages('vo_dang_quyen', 'attack')).length)
      .toBe(i);
  }
  expect(
    (await stages('vo_dang_quyen', 'attack')).map((event) => event.stage),
  ).toEqual(['left_palm', 'right_palm']);
  await expect
    .poll(() => seen(({ body }) => body?.texture === 'vdq-punch'))
    .toBe(true);
  await expect
    .poll(() =>
      seen(({ effects }) => effects.some((e) => e.texture === 'vdq-fist-wave')),
    )
    .toBe(true);
  await expect(page.locator('#slot-a')).toHaveClass(/^(?!.*cooling)/);

  await page.keyboard.press('KeyQ');
  await expect
    .poll(() => seen(({ body }) => body?.frame.startsWith('palm_') ?? false))
    .toBe(true);
  await expect
    .poll(() =>
      seen(({ effects }) => effects.some((e) => e.texture === 'vdq-huyen-am')),
    )
    .toBe(true);
  const palm = (await samples(page))
    .flatMap((sample) => sample.effects)
    .find((e) => e.texture === 'vdq-huyen-am')!;
  expect(palm.frame).toMatch(/^huyen_am_travel_right_/);
  expect(palm.scale[0]).toBe(palm.scale[1]);
  expect(palm.velocity).toEqual([390, 0]);
  await expect.poll(() => localStatus(page)).not.toContain('"kind":"channel"');

  await page.keyboard.press('KeyW');
  await expect
    .poll(() =>
      seen(
        ({ effects }) =>
          effects.some((e) => e.projectileStage === 'travel_0') &&
          effects.some((e) => e.projectileStage === 'travel_1'),
      ),
    )
    .toBe(true);
  await expect
    .poll(
      async () => (await art(page)).filter((e) => e.frame === 'seal').length,
      {
        intervals: [50],
      },
    )
    .toBe(5);
  const markerTick = await page.evaluate(() => {
    const s = (window as any).__VOLAM__.snapshot();
    return Math.min(
      ...Object.values(s.state.areas).map((a: any) => a.startedAt),
    );
  });
  await expect
    .poll(
      async () =>
        (await stages('huyen_am_chuong', 'pulse')).filter(
          (e) => e.stage === 'area_tick',
        ).length,
    )
    .toBe(5);
  const detonations = (await stages('huyen_am_chuong', 'pulse')).filter(
    (e) => e.stage === 'area_tick',
  );
  expect(detonations.map((event) => event.tick! - markerTick)).toEqual(
    Array(5).fill(30),
  );
  await expect.poll(() => hasFrame('ink')).toBe(true);
  await expect.poll(() => hasFrame('ink', observer)).toBe(true);

  await page.keyboard.press('KeyE');
  await expect(page.locator('#slot-e')).toHaveAttribute(
    'data-recast-ready',
    'true',
  );
  await expect(page.locator('#cooldown-e')).toHaveText('Chốt quẻ');
  await expect
    .poll(
      async () =>
        new Set(
          (await samples(page))
            .flatMap((sample) => sample.effects)
            .filter((e) => e.name === 'vdq:glyph:' + sessionId)
            .map((e) => e.frame),
        ).size,
    )
    .toBeGreaterThanOrEqual(3);
  await page.keyboard.press('KeyE');
  const result = async (peer = page) =>
    (await stages('duong_khi_kich', 'pulse', peer)).find((event) =>
      event.stage?.startsWith('fortune:'),
    );
  await expect.poll(async () => (await result())?.stage).toMatch(/^fortune:/);
  const chosen = (await result())!.stage!.slice('fortune:'.length);
  expect(fortuneReadings).toContain(chosen);
  await expect
    .poll(async () => (await result(observer))?.stage)
    .toBe('fortune:' + chosen);
  await expect(page.locator('#slot-e')).toHaveAttribute(
    'data-recast-ready',
    'false',
  );
  await expect.poll(() => localStatus(page)).not.toContain('"kind":"stun"');

  await page.keyboard.press('KeyR');
  await expect.poll(() => hasFrame('shield'), { timeout: 3500 }).toBe(true);
  const shield = (await art(page)).find((e) => e.frame === 'shield');
  expect(shield).toBeDefined();
  expect(shield?.scale[0]).toBe(shield?.scale[1]);
  await observer.bringToFront();
  await expect
    .poll(async () =>
      (await art(observer)).some((e) => e.name === 'vdq:shield:' + sessionId),
    )
    .toBe(true);
  await page.bringToFront();

  await page.evaluate(() =>
    new Promise<void>((resolve) => (window as any).__VOLAM__.afterRender(resolve)),
  );
  await page.keyboard.press('KeyT');
  await expect
    .poll(async () => (await stages('thai_cuc_tran', 'cast')).length)
    .toBe(1);
  await expect.poll(() => hasFrame('formation')).toBe(true);
  await observer.bringToFront();
  await expect.poll(async () => (await art(observer)).some((e) => e.frame === 'formation')).toBe(true);
  await page.bringToFront();
  const fieldSamples = (await samples(page)).filter(({ effects }) =>
    effects.some((e) => e.frame === 'formation'),
  );
  const poseFrames = new Set(
    (await samples(page))
      .map(({ body }) => body?.frame)
      .filter((frame) => frame?.startsWith('taichi_')),
  );
  expect(poseFrames.size).toBeGreaterThanOrEqual(3);
  expect(
    fieldSamples.some(({ body, effects }) =>
      effects.some(
        (effect) =>
          effect.frame === 'formation' &&
          effect.x === body?.x &&
          effect.y === body.y &&
          effect.scale[0] === effect.scale[1],
      ),
    ),
  ).toBe(true);
  await expect
    .poll(
      async () =>
        new Set(
          (await samples(page)).flatMap(({ effects }) =>
            effects
              .filter((e) => e.name.endsWith(':0') && e.texture === 'vdq-rim')
              .map(({ x, y }) => x + ',' + y),
          ),
        ).size,
    )
    .toBeGreaterThan(3);
  const stills = await page.evaluate<Record<string, string>>(
    'window.__quyenStills',
  );
  for (const [id, data] of Object.entries(stills))
    await writeFile(
      info.outputPath(id + '.png'),
      Buffer.from(data.split(',')[1]!, 'base64'),
    );
  await info.attach('observed-frames', {
    body: JSON.stringify(
      {
        taichi: [...poseFrames],
        q: palm,
        w: detonations,
        fortune: chosen,
        field: fieldSamples.at(-1),
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  expect(errors).toEqual([]);
});
