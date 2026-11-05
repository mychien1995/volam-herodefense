import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { VuongView } from '@volam/game-core';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import { joinWaiting, startTogether } from './pregame-helper.js';

const snapshot = (p: Page) =>
  p.evaluate('window.__VOLAM__.snapshot()') as Promise<any>;
const rendered = (p: Page) =>
  p.evaluate('window.__VOLAM__.presentation().vuong') as Promise<{
    phase: number;
    frames: string[];
    visible: number;
  }>;
const boss = async (p: Page): Promise<VuongView | undefined> => {
  const raw = (await snapshot(p)).state.vuong?.arena?.snapshot;
  return raw ? (JSON.parse(raw) as VuongView) : undefined;
};
async function fixture(
  p: Page,
  op: string,
  options: Record<string, string> = {},
) {
  const response = await p.request.post(
    '/__vtd?' +
      new URLSearchParams({ room: (await snapshot(p)).roomId, op, ...options }),
  );
  expect(response.ok(), await response.text()).toBe(true);
}
const out = 'docs/evidence/vuong-trung-duong';

test('two Phaser peers render both phases and a physical attack crosses the threshold', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [a, b] = (await Promise.all(contexts.map((c) => c.newPage()))) as [
    Page,
    Page,
  ];
  const errors: string[] = [];
  for (const page of [a, b]) {
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  try {
    await joinWaiting(a, 'Trung Thần Thông A');
    await joinWaiting(b, 'Trung Thần Thông B', (await snapshot(a)).roomId);
    await startTogether([a, b], ['cai_bang', 'vo_dang']);
    await fixture(a, 'start');
    await expect.poll(async () => (await boss(a))?.phase).toBe(1);
    await expect.poll(async () => (await boss(b))?.shield).toBe(3);
    expect(JSON.parse((await snapshot(a)).state.defense.waveArena).bossId).toBe(
      'vuong_trung_duong',
    );
    await expect
      .poll(async () => (await rendered(a)).visible)
      .toBeGreaterThan(0);
    if (process.env['VOLAM_VUONG_SLICE'] !== '1') {
      await fixture(a, 'arrange', { spread: '1' });
      await mkdir(out, { recursive: true });
      await expect
        .poll(
          async () => {
            const v = await boss(a);
            return v?.cues.some(
              (e) => e.kind === 'lightning' && v.tick >= e.at,
            );
          },
          { intervals: [65, 100] },
        )
        .toBe(true);
      await a.screenshot({ path: out + '/phase-1.png' });
    }
    await fixture(a, 'arrange', { slice: '1', qteSafe: '1' });
    await expect
      .poll(async () =>
        (await rendered(a)).frames.some(
          (f) => f.startsWith('p1_') && f.endsWith('_release'),
        ),
      )
      .toBe(true);
    if (process.env['VOLAM_VUONG_SLICE'] !== '1') {
      await fixture(a, 'arrange', { qteSafe: '1' });
      const qte = a.getByRole('dialog', { name: 'Toàn Chân Phản Kiếm' });
      await expect(qte).toBeVisible({ timeout: 20_000 });
      const local = await snapshot(a);
      const challenge = JSON.parse(
        local.state.namDeControls[local.sessionId].payload,
      ).qte;
      expect(Object.keys(local.state.namDeControls)).toEqual([local.sessionId]);
      const wrong = challenge.keys[0] === 'left' ? 'ArrowRight' : 'ArrowLeft';
      await a.bringToFront();
      await a.locator('#game canvas').focus();
      await a.keyboard.press(wrong);
      await expect
        .poll(async () => (await boss(b))?.qteOutcome, { intervals: [60, 100] })
        .toBe('failed');
      const state = await snapshot(a);
      const hits = state.events.filter(
        (event: any) =>
          event.kind === 'hit' && event.abilityId === 'vtd_toan_chan_phan_kiem',
      );
      expect(hits).toHaveLength(2);
      expect(
        Object.values(state.state.players).every((hero: any) => hero.hp >= 1),
      ).toBe(true);
    }
    await fixture(a, 'arrange', { threshold: '1' });
    await a.bringToFront();
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyA');
    await expect.poll(async () => (await boss(b))?.phase).toBe(2);
    await expect
      .poll(
        async () =>
          (await rendered(a)).frames.some(
            (f) => f.startsWith('p2_') && f.endsWith('_release'),
          ),
        { timeout: 25_000 },
      )
      .toBe(true);
    await expect.poll(async () => (await rendered(b)).phase).toBe(2);
    expect((await boss(a))?.cues.some((cue) => cue.kind === 'lightning')).toBe(
      false,
    );
    if (process.env['VOLAM_VUONG_SLICE'] !== '1') {
      await expect
        .poll(
          async () => {
            const v = await boss(a);
            return v?.cues.some((e) => e.kind === 'rain' && v.tick >= e.at);
          },
          { intervals: [65, 100] },
        )
        .toBe(true);
      await a.screenshot({ path: out + '/phase-2.png' });
      await writeFile(
        out + '/two-client-frames.json',
        JSON.stringify(
          {
            phase1And2: await rendered(a),
            peer: await rendered(b),
            errors,
            authority:
              'real Colyseus; fixture prepared earlier chapters, level and threshold; physical A caused phase transition',
          },
          null,
          2,
        ) + '\n',
      );
    }
    if (process.env['VOLAM_VUONG_SLICE'] !== '1') {
      await fixture(a, 'arrange', { threshold: 'notes' });
      await a.bringToFront();
      await a.locator('#game canvas').focus();
      const notesThreshold = Math.floor((await boss(a))!.maxHp * 0.24);
      await expect(async () => {
        if ((await boss(a))!.hp <= notesThreshold) return;
        await a.keyboard.press('KeyA');
        await expect
          .poll(async () => (await boss(a))!.hp, { timeout: 1200 })
          .toBeLessThanOrEqual(notesThreshold);
      }).toPass({ timeout: 8000, intervals: [350] });
      await fixture(a, 'arrange', { qteSafe: '1' });
      await expect.poll(async () => (await boss(b))?.notes.length).toBe(7);
      await expect
        .poll(
          async () =>
            (await rendered(a)).frames.filter((f) => /^note[0-5]$/.test(f))
              .length,
        )
        .toBe(6);
      await a.screenshot({ path: out + '/that-tuyet-loi-am.png' });
      await expect
        .poll(
          async () =>
            JSON.parse((await snapshot(b)).state.defense.waveArena)?.phase,
        )
        .toBe('retry');
    }
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('six live peers use real attack inputs against the full-HP boss and share phase 2', async ({
  browser,
}) => {
  test.skip(
    process.env['VOLAM_VUONG_SLICE'] === '1',
    'Two-renderer slice only',
  );
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [a, b] = (await Promise.all(contexts.map((c) => c.newPage()))) as [
    Page,
    Page,
  ];
  const peers: Room<LobbyState>[] = [];
  const errors: string[] = [];
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(a, 'Kiếm trận 1');
    const room = (await snapshot(a)).roomId;
    await joinWaiting(b, 'Kiếm trận 2', room);
    const network = new Client(
      `ws://127.0.0.1:${process.env['VOLAM_QA_SERVER_PORT'] ?? 2932}`,
    );
    peers.push(
      ...(await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          network.joinById<LobbyState>(room, {
            nickname: 'Kiếm trận ' + (i + 3),
            protocolVersion: PROTOCOL_VERSION,
          }),
        ),
      )),
    );
    for (const peer of peers) {
      peer.onError((code, message) => errors.push(code + ':' + message));
      peer.onMessage('combat-event', () => {});
      peer.onMessage('command-rejected', () => {});
    }
    await expect
      .poll(async () => Object.keys((await snapshot(a)).state.players).length)
      .toBe(6);
    await expect(async () => {
      if ((await snapshot(a)).state.phase !== 'WAITING_LOBBY') return;
      await a
        .getByRole('button', { name: 'Bắt đầu', exact: true })
        .click({ timeout: 1500 });
      await expect
        .poll(async () => (await snapshot(a)).state.phase, { timeout: 1500 })
        .toBe('SCHOOL_SELECTION');
    }).toPass({ timeout: 15_000, intervals: [100, 250] });
    await Promise.all(
      peers.map(async (peer, i) => {
        const schoolId = ['vo_dang', 'thien_son', 'thieu_lam', 'cai_bang'][i]!;
        await expect.poll(() => peer.state.phase).toBe('SCHOOL_SELECTION');
        peer.send('lobby-action', { action: 'select', schoolId });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.schoolId)
          .toBe(schoolId);
        peer.send('lobby-action', { action: 'confirm' });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.confirmed)
          .toBe(true);
      }),
    );
    await startTogether([a, b], ['cai_bang', 'vo_dang'], 60_000, true);
    await fixture(a, 'start');
    await expect.poll(async () => (await boss(a))?.phase).toBe(1);
    const initial = (await boss(a))!;
    expect(initial.hp).toBe(initial.maxHp);
    expect(initial.maxHp).toBeGreaterThan(20_000);
    await fixture(a, 'arrange', { slice: '1' });
    await expect.poll(async () => (await boss(b))?.shield).toBe(0);
    const seq = peers.map(() => 0);
    const hitActors = new Set<string>();
    const actors = [
      (await snapshot(a)).sessionId,
      (await snapshot(b)).sessionId,
      ...peers.map((p) => p.sessionId),
    ];
    for (let i = 0; i < 12 && hitActors.size < 6; ++i) {
      for (const p of [a, b]) {
        await p.bringToFront();
        await p.locator('#game canvas').focus();
        await p.keyboard.press('KeyA');
      }
      for (const [i, peer] of peers.entries())
        peer.send('input', {
          kind: 'basic',
          protocolVersion: PROTOCOL_VERSION,
          sequence: ++seq[i]!,
        });
      await expect
        .poll(async () => (await snapshot(a)).state.tick)
        .toBeGreaterThan(initial.tick + 4);
      const snapshots = await Promise.all([snapshot(a), snapshot(b)]);
      for (const state of snapshots)
        for (const event of state.events)
          if (
            event.kind === 'hit' &&
            event.targetId.endsWith('vuong_trung_duong') &&
            actors.includes(event.sourceId)
          )
            hitActors.add(event.sourceId);
      if (hitActors.size < 6)
        await new Promise((resolve) => setTimeout(resolve, 330));
    }
    expect([...hitActors].sort()).toEqual(actors.sort());
    expect((await boss(a))?.hp).toBeLessThan(initial.maxHp);
    await fixture(a, 'arrange', { threshold: '1' });
    await expect(async () => {
      if ((await boss(a))?.phase === 2) return;
      await a.bringToFront();
      await a.locator('#game canvas').focus();
      await a.keyboard.press('KeyA');
      await expect
        .poll(async () => (await boss(a))?.phase, { timeout: 1600 })
        .toBe(2);
    }).toPass({ timeout: 10_000, intervals: [600] });
    for (const page of [a, b])
      await expect.poll(async () => (await rendered(page)).phase).toBe(2);
    await expect
      .poll(
        () =>
          peers.filter(
            (p) =>
              JSON.parse(p.state.vuong.get('arena')?.snapshot ?? 'null')
                ?.phase === 2,
          ).length,
      )
      .toBe(4);
    await expect
      .poll(async () => (await boss(a))?.cues.some((e) => e.kind === 'rain'))
      .toBe(true);
    await fixture(a, 'arrange', { spread: '1' });
    await expect
      .poll(async () => (await rendered(a)).frames.includes('transition_3'))
      .toBe(true);
    await mkdir(out, { recursive: true });
    await a.screenshot({ path: out + '/six-peer-phase-2.png' });
    await writeFile(
      out + '/six-peer.json',
      JSON.stringify(
        {
          participants: actors.length,
          hitActors: hitActors.size,
          initialHp: initial.maxHp,
          phases: [1, 2],
          errors,
          setup:
            'Earlier campaign gates, shield and near-threshold HP staged; full HP for initial exchange; two Phaser renderers and four SDK peers.',
        },
        null,
        2,
      ) + '\n',
    );
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(peers.map((p) => p.leave()));
    await Promise.all(contexts.map((c) => c.close()));
  }
});
