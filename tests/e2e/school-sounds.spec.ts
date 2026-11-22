import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { nguDoc, duongMon } from '@volam/game-core';
import {
  castQaSkill,
  ensureQaSkillLearned,
  placeQaOwnerOnlyArea,
} from '../../tools/qa-skill-browser.mjs';
import {
  enterSoundPractice,
  soundView,
  expectSoundCue,
  soundSnapshot,
  switchSoundHero,
} from './sound-helper.js';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { observeQa } from '../../tools/qa-browser.mjs';

const evidence = join(
  'docs/evidence/sessions',
  process.env['VOLAM_QA_SESSION'] ?? 'school-sounds',
  'audio',
);
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  await mkdir(evidence, { recursive: true });
  await writeFile(
    join(
      evidence,
      'failure-' +
        info.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 70) +
        '.json',
    ),
    JSON.stringify(
      {
        snapshot: await soundSnapshot(page).catch(() => null),
        sounds: await page
          .evaluate('window.__VOLAM__?.presentation()?.schoolSounds')
          .catch(() => null),
      },
      null,
      2,
    ),
  );
});
async function report(page: Page, school: string, name: string) {
  const starts = await page.evaluate<any[]>('(window).__audioStarts');
  expect(starts.some((s) => s.peak > 0.02 && s.state === 'running')).toBe(true);
  await mkdir(evidence, { recursive: true });
  await writeFile(
    join(evidence, name + '.json'),
    JSON.stringify({ sounds: await soundView(page, school), starts }, null, 2),
  );
}

test('Ngũ Độc pilot: normal and toxic palms, hands open after windup and end with the server area', async ({
  page,
}) => {
  test.setTimeout(90000);
  await enterSoundPractice(page, 'ngu_doc', nguDoc.taiHiep);
  await castQaSkill(page, 'a', nguDoc.taiHiep, { kind: 'attack' });
  await expectSoundCue(page, 'ngu-doc', 'palm');
  await castQaSkill(page, 'q', nguDoc.palm);
  await expectSoundCue(page, 'ngu-doc', 'palm-on');
  await castQaSkill(page, 'a', nguDoc.taiHiep, { kind: 'attack' });
  await expectSoundCue(page, 'ngu-doc', 'toxic-palm');
  await castQaSkill(page, 't', nguDoc.hands);
  await expectSoundCue(page, 'ngu-doc', 'hands-open');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).loops)
    .toContain('hands-loop');
  await expectSoundCue(page, 'ngu-doc', 'hands-end');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).loops)
    .toEqual([]);
  await report(page, 'ngu-doc', 'ngu-doc-pilot');
});

test('Đường Môn pilot: mechanical A, flower deployment and one grouped twenty-flower explosion', async ({
  page,
}) => {
  test.setTimeout(90000);
  await enterSoundPractice(page, 'duong_mon', duongMon.coQuan);
  await castQaSkill(page, 'a', duongMon.coQuan, { kind: 'attack' });
  await expectSoundCue(page, 'duong-mon', 'bolt');
  await castQaSkill(page, 't', duongMon.flowers);
  await expectSoundCue(page, 'duong-mon', 'flowers-cast');
  await expectSoundCue(page, 'duong-mon', 'flowers-scatter');
  await expectSoundCue(page, 'duong-mon', 'flowers-burst');
  expect(
    (await soundView(page, 'duong-mon')).recent.filter(
      (e: any) => e.cue === 'flowers-burst',
    ),
  ).toHaveLength(1);
  await report(page, 'duong-mon', 'duong-mon-pilot');
});

test('Ngũ Độc complete kit: toggles, fields, marks, minions and all three Reaper attacks', async ({
  page,
}) => {
  test.skip(
    process.env['VOLAM_SFX_PILOT'] === '1',
    'Pilot before batch production.',
  );
  test.setTimeout(180000);
  await enterSoundPractice(page, 'ngu_doc', nguDoc.taiHiep);
  await castQaSkill(page, 'w', nguDoc.pool);
  await expectSoundCue(page, 'ngu-doc', 'pool-open');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).loops)
    .toContain('pool-loop');
  await castQaSkill(page, 'e', nguDoc.aura);
  await expectSoundCue(page, 'ngu-doc', 'aura-on');
  await castQaSkill(page, 'e', nguDoc.aura);
  await expectSoundCue(page, 'ngu-doc', 'aura-off');
  await expectSoundCue(page, 'ngu-doc', 'pool-end');
  await switchSoundHero(page, 'ngu_doc', nguDoc.coSu);
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).loops)
    .toEqual([]);
  await castQaSkill(page, 'a', nguDoc.coSu, { kind: 'attack' });
  await expectSoundCue(page, 'ngu-doc', 'skull');
  await castQaSkill(page, 'q', nguDoc.worms);
  await expectSoundCue(page, 'ngu-doc', 'worms');
  await castQaSkill(page, 'w', nguDoc.jiangshi);
  await expectSoundCue(page, 'ngu-doc', 'jiangshi-emerge');
  await castQaSkill(page, 'e', nguDoc.mark);
  await expectSoundCue(page, 'ngu-doc', 'mark-attach');
  await expectSoundCue(page, 'ngu-doc', 'mark-detonate');
  await expectSoundCue(page, 'ngu-doc', 'mark-return');
  await castQaSkill(page, 't', nguDoc.reaper);
  for (const cue of [
    'reaper-emerge',
    'reaper-sweep',
    'reaper-wave',
    'reaper-slam',
  ])
    await expectSoundCue(page, 'ngu-doc', cue);
  for (
    let i = 0;
    i < 24 &&
    !(await soundView(page, 'ngu-doc')).recent.some(
      (e: any) => e.cue === 'zombie-emerge',
    );
    i++
  )
    await castQaSkill(page, 'a', nguDoc.coSu, { kind: 'attack' });
  await expectSoundCue(page, 'ngu-doc', 'zombie-emerge');
  await report(page, 'ngu-doc', 'ngu-doc-complete');
  await switchSoundHero(page, 'con_luan', 'con_luan_thien_su');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).active)
    .toBe(0);
});

test('Đường Môn complete kit: flight, laser, shell, hidden trap, six knives and three storm phases', async ({
  page,
}) => {
  test.skip(
    process.env['VOLAM_SFX_PILOT'] === '1',
    'Pilot before batch production.',
  );
  test.setTimeout(180000);
  await enterSoundPractice(page, 'duong_mon', duongMon.coQuan);
  await castQaSkill(page, 'q', duongMon.arrows);
  await expectSoundCue(page, 'duong-mon', 'arrows');
  await castQaSkill(page, 'w', duongMon.flight);
  await expectSoundCue(page, 'duong-mon', 'flight-open');
  await castQaSkill(page, 'a', duongMon.coQuan, { kind: 'attack' });
  await expectSoundCue(page, 'duong-mon', 'feather');
  await castQaSkill(page, 'w', duongMon.flight);
  await expectSoundCue(page, 'duong-mon', 'flight-close');
  await castQaSkill(page, 'e', duongMon.laser);
  await expectSoundCue(page, 'duong-mon', 'laser-charge');
  await expectSoundCue(page, 'duong-mon', 'laser-release');
  await castQaSkill(page, 'r', duongMon.shell);
  await expectSoundCue(page, 'duong-mon', 'shell-close');
  await expectSoundCue(page, 'duong-mon', 'shell-open');
  await switchSoundHero(page, 'duong_mon', duongMon.amKhi);
  await castQaSkill(page, 'a', duongMon.amKhi, { kind: 'attack' });
  await expectSoundCue(page, 'duong-mon', 'needles-4');
  await castQaSkill(page, 'q', duongMon.trap);
  await expectSoundCue(page, 'duong-mon', 'trap-set');
  await castQaSkill(page, 'w', duongMon.knives);
  await expectSoundCue(page, 'duong-mon', 'knife-shot');
  await expect
    .poll(
      async () =>
        (await soundView(page, 'duong-mon')).recent.filter(
          (e: any) => e.cue === 'knife-shot',
        ).length,
    )
    .toBe(6);
  await castQaSkill(page, 'e', duongMon.evade);
  await expectSoundCue(page, 'duong-mon', 'evade');
  await expectSoundCue(page, 'duong-mon', 'evade-end');
  await castQaSkill(page, 't', duongMon.storm);
  for (const cue of ['storm-slow', 'storm-poison', 'storm-water'])
    await expectSoundCue(page, 'duong-mon', cue);
  expect(
    (await soundView(page, 'duong-mon')).recent.filter(
      (e: any) => e.cue === 'storm-poison',
    ),
  ).toHaveLength(6);
  const s = await soundSnapshot(page);
  expect(
    s.events.some(
      (e: any) => e.abilityId === duongMon.elements && e.kind === 'cast',
    ),
  ).toBe(false);
  await report(page, 'duong-mon', 'duong-mon-complete');
});

test('Three-school audio: mute, unmute, hero switch and room leave stop sustained sounds', async ({
  page,
}) => {
  test.skip(
    process.env['VOLAM_SFX_PILOT'] === '1',
    'Full integration after pilots.',
  );
  test.setTimeout(120000);
  await enterSoundPractice(page, 'ngu_doc', nguDoc.taiHiep);
  await castQaSkill(page, 'e', nguDoc.aura);
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).loops)
    .toContain('aura-loop');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const slider = page
    .locator('#game-dialog')
    .getByRole('slider', { name: 'Âm thanh game' });
  await slider.focus();
  await page.keyboard.press('Home');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).active)
    .toBe(0);
  await page.keyboard.press('End');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).loops)
    .toContain('aura-loop');
  await page.locator('#close-menu').click();
  await switchSoundHero(page, 'duong_mon', duongMon.coQuan);
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).active)
    .toBe(0);
  await castQaSkill(page, 'w', duongMon.flight);
  await expect
    .poll(async () => (await soundView(page, 'duong-mon')).loops)
    .toContain('flight-loop');
  await page.getByRole('button', { name: 'Thoát', exact: true }).click();
  await page.locator('#confirm-quit').click();
  await expect
    .poll(async () => (await soundSnapshot(page)).roomId)
    .toBeUndefined();
  await expect
    .poll(async () => (await soundView(page, 'duong-mon')).active)
    .toBe(0);
});

test('Three-school audio: six real clients keep local ownership and do not reveal a private trap', async ({
  browser,
}) => {
  test.skip(
    process.env['VOLAM_SFX_PILOT'] === '1',
    'Full integration after pilots.',
  );
  test.setTimeout(240000);
  const branches = [
    'con_luan_thien_su',
    'con_luan_kiem_ton',
    nguDoc.taiHiep,
    nguDoc.coSu,
    duongMon.coQuan,
    duongMon.amKhi,
  ];
  const banks = [
    'con-luan',
    'con-luan',
    'ngu-doc',
    'ngu-doc',
    'duong-mon',
    'duong-mon',
  ];
  const cues = ['monk-thrust', 'orb', 'palm', 'skull', 'bolt', 'needles-0'];
  const contexts = await Promise.all(
    branches.map((_, index) =>
      browser.newContext({
        viewport:
          index < 2
            ? { width: 1280, height: 720 }
            : { width: 800, height: 550 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const errors: string[] = [];
  for (const page of pages) page.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(pages[0]!, 'SFX 1', undefined, '/?debug');
    const room = (await soundSnapshot(pages[0]!)).roomId;
    for (let i = 1; i < pages.length; i++)
      await joinWaiting(pages[i]!, `SFX ${i + 1}`, room, '/?debug');
    await startTogether(pages, branches, 60000);
    const sources = await Promise.all(
      pages.map(async (p) => (await soundSnapshot(p)).sessionId),
    );
    // Retain only player combat metadata while inputs happen. The game's
    // 60-event debug ring can legitimately roll over during six-client QA.
    const propagation = pages.map((page) =>
      observeQa(
        page,
        (sources) => {
          const w = window as any;
          const s = w.__VOLAM__.snapshot();
          const seen = (w.__sfxEventAudit ??= []);
          for (const event of s.events) {
            if (
              sources.includes(event.sourceId) &&
              !seen.some((old: any) => old.id === event.id)
            ) {
              seen.push({
                id: event.id,
                sourceId: event.sourceId,
                abilityId: event.abilityId,
                kind: event.kind,
              });
              if (seen.length > 128) seen.shift();
            }
          }
          return sources.every((source: string) =>
            seen.some((e: any) => e.sourceId === source && e.kind === 'attack'),
          )
            ? seen
            : false;
        },
        sources,
        { label: 'six fresh player attacks propagated', timeout: 120000 },
      ),
    );
    for (const observation of propagation) observation.catch(() => {});
    const receipts = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]!;
      await page.bringToFront();
      await page.locator('canvas').click({ position: { x: 400, y: 300 } });
      receipts.push(
        await castQaSkill(page, 'a', branches[i]!, { kind: 'attack' }),
      );
      await expectSoundCue(page, banks[i]!, cues[i]!);
    }
    const retained = await Promise.all(propagation);
    const owner = pages[5]!;
    for (const page of pages.slice(0, 5)) {
      await page.bringToFront();
      const before = (await soundSnapshot(page)).state.tick;
      await observeQa(
        page,
        (before) => {
          const s = (window as any).__VOLAM__.snapshot();
          return (
            s.state.players[s.sessionId].connected && s.state.tick > before
          );
        },
        before,
        { label: 'live peer before private-area observation' },
      );
    }
    await ensureQaSkillLearned(owner, 0, duongMon.trap);
    const privateArea = await placeQaOwnerOnlyArea(owner, pages.slice(0, 5), {
      key: 'q',
      abilityId: duongMon.trap,
      absenceMilliseconds: 1000,
    });
    await expectSoundCue(owner, 'duong-mon', 'trap-set');
    for (let i = 0; i < pages.length; i++) {
      const s = await soundSnapshot(pages[i]!);
      for (const receipt of receipts)
        expect(
          retained[i].some(
            (e: any) =>
              e.id === receipt.event['id'] &&
              e.sourceId === receipt.actor.sourceId,
          ),
        ).toBe(true);
      const sounds = await soundView(pages[i]!, banks[i]!);
      const own = new Set(
        [...retained[i], ...s.events]
          .filter((e: any) => e.sourceId === s.sessionId)
          .map((e: any) => e.id),
      );
      expect(
        sounds.recent
          .filter((e: any) => e.eventId !== undefined)
          .every((e: any) => own.has(e.eventId)),
      ).toBe(true);
      if (i < 5) {
        const dm = await soundView(pages[i]!, 'duong-mon');
        expect(dm.recent?.some((e: any) => e.cue === 'trap-set') ?? false).toBe(
          false,
        );
      }
    }
    expect(errors).toEqual([]);
    await mkdir(evidence, { recursive: true });
    await writeFile(
      join(evidence, 'six-clients.json'),
      JSON.stringify(
        {
          branches,
          privateArea,
          receipts,
          sounds: await Promise.all(
            pages.map((p, i) => soundView(p, banks[i]!)),
          ),
          errors,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await mkdir(evidence, { recursive: true });
    await writeFile(
      join(evidence, 'six-client-diagnostic.json'),
      JSON.stringify(
        await Promise.all(
          pages.map(async (p) => ({
            snapshot: await soundSnapshot(p).catch(() => null),
            presentation: await p
              .evaluate('window.__VOLAM__?.presentation()?.sceneSnapshot')
              .catch(() => null),
          })),
        ),
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
