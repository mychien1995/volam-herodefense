import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { conLuan } from '@volam/game-core';
import { observeQa } from '../../tools/qa-browser.mjs';
import { castQaSkill, ensureQaKinhLoi } from '../../tools/qa-skill-browser.mjs';
import {
  enterSoundPractice,
  soundView,
  soundSnapshot,
  expectSoundCue,
} from './sound-helper.js';

const evidence = join(
  'docs/evidence/sessions',
  process.env['VOLAM_QA_SESSION'] ?? 'con-luan-sounds',
  'audio',
);
const view = (page: Page) => soundView(page);
const snapshot = soundSnapshot;

async function enter(page: Page, branch: string) {
  await enterSoundPractice(page, 'con_luan', branch);
}

async function cue(page: Page, name: string, after = 0) {
  await expectSoundCue(page, 'con-luan', name, after);
}

test('Côn Luân pilot: four A stages and Chaos play decoded audio with authoritative cleanup', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.url().includes('con-luan-v01') && r.status() >= 400)
      errors.push(r.url());
  });
  await enter(page, conLuan.monk);
  for (const stage of ['thrust', 'sweep', 'rising', 'overhead']) {
    const result = await castQaSkill(page, 'a', conLuan.monk, {
      kind: 'attack',
    });
    expect(result.event.stage).toBe(stage);
    await cue(page, `monk-${stage}`);
  }
  await castQaSkill(page, 't', conLuan.chaos);
  await cue(page, 'chaos-start');
  await expect
    .poll(async () => (await view(page)).loops)
    .toContain('chaos-loop');
  await castQaSkill(page, 'a', conLuan.monk, { kind: 'attack' });
  await observeQa(
    page,
    () => {
      const s = (window as any).__VOLAM__.snapshot();
      return !JSON.parse(s.state.players[s.sessionId].statuses).some(
        (status: any) => status.kind === 'con_luan_chaos',
      );
    },
    undefined,
    { label: 'server Chaos expiration', timeout: 22000 },
  );
  await cue(page, 'chaos-end');
  await expect.poll(async () => (await view(page)).loops).toEqual([]);
  const starts = await page.evaluate<any[]>('(window).__audioStarts');
  expect(
    starts.filter((s) => s.peak > 0.02 && s.state === 'running').length,
  ).toBeGreaterThanOrEqual(7);
  // Phaser schedules successive sources for seamless looping; native .loop is false.
  const bed = starts.filter(
    (s) => Math.abs(s.duration - 2) < 0.02 && s.peak > 0.02,
  );
  expect(bed.length).toBeGreaterThanOrEqual(2);
  expect(new Set(bed.map((s) => s.bufferId)).size).toBe(1);
  expect(errors).toEqual([]);
  await mkdir(evidence, { recursive: true });
  await writeFile(
    join(evidence, 'pilot.json'),
    JSON.stringify({ sounds: await view(page), starts, errors }, null, 2),
  );
});

test('Côn Luân complete kit: both stances, all active skills, S, true hit phases and lifetime cleanup', async ({
  browser,
}) => {
  test.skip(
    process.env['VOLAM_SFX_PILOT'] === '1',
    'Representative pilot precedes the remaining sound production.',
  );
  test.setTimeout(180000);
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [monk, sword] = (await Promise.all(
    contexts.map((c) => c.newPage()),
  )) as [Page, Page];
  const errors: string[] = [];
  for (const page of [monk, sword]) {
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      if (r.url().includes('con-luan-v01') && r.status() >= 400)
        errors.push(r.url());
    });
  }
  try {
    await enter(monk, conLuan.monk);
    await enter(sword, conLuan.sword);
    expect((await view(monk)).loaded).toBe(41);
    await castQaSkill(monk, 'q', conLuan.stance);
    await cue(monk, 'stance-ranged');
    await castQaSkill(monk, 'a', conLuan.bolt, { kind: 'attack' });
    await cue(monk, 'monk-bolt');
    await castQaSkill(monk, 'q', conLuan.stance);
    await cue(monk, 'stance-melee');
    for (const [key, id, sound] of [
      ['w', conLuan.slam, 'slam-impact'],
      ['e', conLuan.ring, 'ring'],
      ['r', conLuan.hammer, 'hammer-explosion'],
    ]) {
      await castQaSkill(monk, key!, id!);
      await cue(monk, sound!);
    }
    for (let i = 0; i < 7; i++)
      await castQaSkill(sword, 'a', conLuan.sword, { kind: 'attack' });
    await cue(sword, 'orb');
    await cue(sword, 'sword');
    await ensureQaKinhLoi(sword);
    await cue(sword, 'plant');
    await castQaSkill(sword, 'q', conLuan.detonate);
    await cue(sword, 'detonate-trigger');
    await cue(sword, 'detonate-impact');
    for (const [key, id, sound] of [
      ['w', conLuan.dash, 'dash'],
      ['e', conLuan.fan, 'fan-sweep'],
      ['r', conLuan.dragon, 'dragon-launch'],
      ['t', conLuan.star, 'star-open'],
    ]) {
      await castQaSkill(sword, key!, id!);
      await cue(sword, sound!);
    }
    expect(
      (await view(sword)).recent.filter((x: any) => x.cue === 'fan-sweep'),
    ).toHaveLength(5);
    await expect
      .poll(async () => (await view(sword)).loops)
      .toContain('star-loop');
    await cue(sword, 'star-pulse');
    await cue(sword, 'star-end');
    await expect.poll(async () => (await view(sword)).loops).toEqual([]);
    expect(errors).toEqual([]);
    await mkdir(evidence, { recursive: true });
    await writeFile(
      join(evidence, 'complete-kits.json'),
      JSON.stringify(
        {
          monk: await view(monk),
          sword: await view(sword),
          monkState: await snapshot(monk),
          swordState: await snapshot(sword),
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
