import { test, expect, type Page } from '@playwright/test';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import type { PvpSnapshot } from '@volam/game-core';
import { qaSession } from '../../tools/qa-session.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pressQaAndWait, observeQa } from '../../tools/qa-browser.mjs';
const evidence = join(
  'docs/evidence/sessions',
  process.env['VOLAM_QA_SESSION'] ?? 'pvp',
  'standalone-pvp',
);
interface Hero {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  lastSequence: number;
  level: number;
  pose: string;
}
interface Snapshot {
  roomId: string;
  sessionId: string;
  state: {
    players: Record<string, Hero>;
    pvp: { enabled: boolean; json: string };
  };
  events: Array<{
    kind: string;
    abilityId: string;
    sourceId: string;
    targetId: string;
    damage: number;
  }>;
}
const snapshot = (p: Page) =>
  p.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const view = async (p: Page) =>
  JSON.parse((await snapshot(p)).state.pvp.json) as PvpSnapshot;
const hero = async (p: Page) => {
  const s = await snapshot(p);
  return s.state.players[s.sessionId]!;
};
const presentation = (p: Page) =>
  p.evaluate<{
    pvpMap: string;
    pvpLayers: string[];
    actors: Array<{
      id: string;
      texture: string;
      x: number;
      y: number;
      animation: string;
      frame: string;
    }>;
    pvp?: {
      npcFrame: number;
      hazards: Array<{
        id: number;
        x: number;
        y: number;
        alpha: number;
        texture: string;
        scale: number[];
        size: number[];
      }>;
      swords: Array<{
        region: { x: number; y: number; width: number; height: number };
        scale: number[];
        width: number;
        height: number;
      }>;
      lava: boolean;
    };
  }>(
    '(() => { try { return window.__VOLAM__.presentation() ?? {pvpMap:"",pvpLayers:[],actors:[]}; } catch { return {pvpMap:"",pvpLayers:[],actors:[]}; } })()',
  );

async function assertArenaView(page: Page, mapId: string) {
  const maps: Record<string, [number, number]> = {
    hong_moc: [836, 470],
    rung_truc: [1280, 720],
    dia_nguc: [1120, 630],
    tuong_duong: [1120, 630],
    kiem_ho: [1120, 630],
  };
  const [width, height] = maps[mapId]!;
  const viewport = page.viewportSize()!;
  await expect
    .poll(async () => {
      const p = await page.evaluate<any>('window.__VOLAM__.presentation()'),
        v = p?.worldView;
      return (
        !!v &&
        p.zoom >= 1 &&
        v.x >= -1 &&
        v.y >= -1 &&
        v.x + v.width <= width + 1 &&
        v.y + v.height <= height + 1 &&
        Math.abs(v.width * p.zoom - viewport.width) < 2 &&
        Math.abs(v.height * p.zoom - viewport.height) < 2
      );
    })
    .toBe(true);
  const widths = await page
    .locator('.system-buttons button:visible')
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().width));
  expect(widths.every((w) => w <= 73)).toBe(true);
}

const sceneErrors = new WeakMap<Page, string[]>();
const errors = (p: Page) => {
  const found: string[] = [];
  sceneErrors.set(p, found);
  p.on('pageerror', (e) => found.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') found.push(m.text());
  });
  return found;
};
async function create(p: Page, nickname: string, map = 'rung_truc') {
  await p.goto('/?debug');
  await p.getByRole('button', { name: 'Lôi Đài', exact: true }).click();
  await p.locator('#pvp-nickname').fill(nickname);
  await p.locator('#pvp-entry-map').selectOption(map);
  await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await expect(p.locator('.pvp-lobby')).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => (await presentation(p))?.pvpMap, { timeout: 45000 })
    .toBe(map);
  return snapshot(p);
}
async function joinRoom(p: Page, id: string, nickname: string) {
  await p.goto('/?debug&pvp=' + encodeURIComponent(id));
  // Phaser's first rendered frame requires the guest tab to be foregrounded.
  await p.bringToFront();
  await p.locator('#pvp-nickname').fill(nickname);
  await p.getByRole('button', { name: 'Vào phòng', exact: true }).click();
  await expect(p.locator('.pvp-lobby')).toBeVisible({ timeout: 30000 });
  await expect.poll(async () => (await snapshot(p)).roomId).toBe(id);
  // Joining the replicated lobby precedes Phaser's asset/scene boot. Apply
  // the same initial-render gate as create(), before exercising transitions.
  try {
    await expect(p.locator('#scene-status')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 45000 },
    );
  } catch (cause) {
    console.error('Guest scene diagnostic', {
      errors: sceneErrors.get(p),
      presentation: await presentation(p),
    });
    throw cause;
  }
  await expect
    .poll(async () => (await presentation(p)).pvpMap, { timeout: 45000 })
    .toBe((await view(p)).mapId);
}
const choose = async (p: Page, branch: string) => {
  const [schoolId, branchId] = branch.split(':');
  await p.locator('[data-pvp="character"]').click();
  await expect(p.locator('.pvp-school-picker .school-card')).toHaveCount(7);
  await p.locator(`[data-school="${schoolId}"]`).click();
  await p.locator(`.branch-dialog [data-branch="${branchId}"]`).click();
  await p.locator('[data-pvp="confirm-character"]').click();
  await expect(p.locator('.pvp-school-picker')).toBeHidden();
  await expect
    .poll(async () => {
      const s = await snapshot(p);
      const member = (await view(p)).members.find((m) => m.id === s.sessionId);
      return member?.ready && member.branchId === branchId;
    })
    .toBe(true);
};
async function assign(p: Page, id: string, team: string) {
  await p.locator('[data-assign="' + id + '"]').selectOption(team);
  await expect
    .poll(async () => (await view(p)).members.find((m) => m.id === id)?.team)
    .toBe(team);
}
const seq = new WeakMap<object, number>();
const peerLifecycle: unknown[] = [];
async function sdkPeer(
  id: string,
  nickname: string,
  schoolId: string,
  branchId: string,
) {
  const p = await new Client(qaSession().serverUrl).joinById<LobbyState>(id, {
    nickname,
    protocolVersion: PROTOCOL_VERSION,
    pvp: true,
  });
  p.reconnection.enabled = false;
  p.onLeave((code) =>
    peerLifecycle.push({ id: p.sessionId, code, at: Date.now() }),
  );
  p.onMessage('combat-event', () => {});
  p.onMessage('command-rejected', () => {});
  const send = (a: Record<string, unknown>) => {
    const n = (seq.get(p) ?? 0) + 1;
    seq.set(p, n);
    p.send('pvp-action', {
      ...a,
      sequence: n,
      protocolVersion: PROTOCOL_VERSION,
    });
  };
  send({ action: 'choose', schoolId, branchId });
  await expect
    .poll(
      () =>
        p.state.pvp?.json &&
        JSON.parse(p.state.pvp.json).members.find(
          (m: { id: string; ready: boolean }) => m.id === p.sessionId,
        )?.ready,
    )
    .toBe(true);
  return p;
}
test('1v1 profile publishes adjusted mana costs and replicates real skill damage', async ({
  page,
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const guest = await context.newPage(),
    hostErrors = errors(page),
    guestErrors = errors(guest);
  try {
    const host = await create(page, 'Cân bằng 1v1');
    await joinRoom(guest, host.roomId, 'Đối thủ');
    const other = await snapshot(guest);
    await choose(page, 'thien_son:thien_son_dao');
    await choose(guest, 'vo_dang:vo_dang_kiem');
    await assign(page, host.sessionId, 'chinh');
    await assign(page, other.sessionId, 'ta');
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.locator('#pvp-hazards').uncheck();
    await expect
      .poll(async () => (await view(page)).hazardsEnabled)
      .toBe(false);
    await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await expect
      .poll(async () => (await view(guest)).combatProfile)
      .toBe('pvp_1v1');
    await expect
      .poll(async () => (await view(page)).phase, { timeout: 7000 })
      .toBe('fighting');
    await expect(page.locator('#cooldown-q')).toHaveText('23 NL');
    await expect(page.locator('#cooldown-t')).toHaveText('49 NL');
    const before = await hero(page);
    await pressQaAndWait(
      page,
      'ArrowRight',
      (sequence) => {
        const s = (window as any).__VOLAM__?.snapshot();
        return (
          s &&
          s.state.players[s.sessionId].lastSequence > sequence &&
          s.state.players[s.sessionId].pose !== 'walk'
        );
      },
      before.lastSequence,
      { keyDelay: 1900, label: '1v1 movement acknowledged' },
    );
    expect((await hero(page)).x).toBeGreaterThan(before.x + 250);
    const castSequence = (await hero(page)).lastSequence;
    await pressQaAndWait(
      page,
      'q',
      ({ seq, id }) => {
        const s = (window as any).__VOLAM__?.snapshot();
        return (
          s &&
          s.state.players[id].lastSequence > seq &&
          s.events.some(
            (e: any) =>
              e.kind === 'cast' &&
              e.sourceId === id &&
              e.abilityId === 'phi_anh_tram',
          )
        );
      },
      { seq: castSequence, id: host.sessionId },
      { label: '1v1 adjusted-cost dash accepted' },
    );
    await observeQa(
      page,
      () => {
        const s = (window as any).__VOLAM__?.snapshot();
        return (
          s &&
          !JSON.parse(s.state.players[s.sessionId].statuses).some(
            (e: any) => e.kind === 'dash',
          )
        );
      },
      undefined,
      { label: '1v1 dash completed' },
    );
    const hp = (await hero(guest)).hp,
      sequence = (await hero(page)).lastSequence;
    await pressQaAndWait(
      page,
      'w',
      ({ seq, id, targetId }) => {
        const s = (window as any).__VOLAM__?.snapshot();
        const hits = s?.events.filter(
          (e: any) =>
            e.kind === 'hit' &&
            e.sourceId === id &&
            e.targetId === targetId &&
            e.abilityId === 'truy_hon_dao',
        );
        return (
          s &&
          s.state.players[id].lastSequence > seq &&
          hits?.length >= 2 && { hits: hits.length }
        );
      },
      { seq: sequence, id: host.sessionId, targetId: other.sessionId },
      { label: '1v1 real projectile hit' },
    );
    await expect.poll(async () => (await hero(guest)).hp).toBeLessThan(hp);
    const finalHp = (await hero(guest)).hp;
    await expect
      .poll(
        async () => (await snapshot(page)).state.players[other.sessionId]!.hp,
      )
      .toBe(finalHp);
    await expect
      .poll(async () =>
        (await snapshot(guest)).events.some(
          (e) =>
            e.kind === 'hit' &&
            e.sourceId === host.sessionId &&
            e.targetId === other.sessionId &&
            e.abilityId === 'truy_hon_dao',
        ),
      )
      .toBe(true);
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: join(evidence, 'pvp-1v1-balance.png') });
    expect(hostErrors).toEqual([]);
    expect(guestErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('entry, link, host team assignment, countdown freeze and replicated manual combat', async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const guest = await context.newPage(),
    hostErrors = errors(page),
    guestErrors = errors(guest);
  try {
    const host = await create(page, 'Chủ phòng');
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width: 850, height: 480 });
    await page.locator('[data-pvp="character"]').click();
    await expect(page.locator('.pvp-school-picker .school-card')).toHaveCount(
      7,
    );
    const bounds = await page.locator('.pvp-school-picker').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(850);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(480);
    await page.screenshot({
      path: join(evidence, 'school-picker-compact.png'),
    });
    await page.locator('[data-school="vo_dang"]').click();
    await expect(page.locator('.branch-dialog')).toBeVisible();
    await page.locator('[data-branch="vo_dang_kiem"]').click();
    // Draft choices do not mark a player ready before server confirmation.
    expect(
      (await view(page)).members.find((m) => m.id === host.sessionId)?.ready,
    ).toBe(false);
    await page.screenshot({
      path: join(evidence, 'branch-picker-compact.png'),
    });
    await page.keyboard.press('Escape');
    await expect(page.locator('.branch-dialog')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('.pvp-school-picker')).toBeHidden();
    expect(
      (await view(page)).members.find((m) => m.id === host.sessionId)?.ready,
    ).toBe(false);
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(guest, host.roomId, 'Khách');
    const other = await snapshot(guest);
    expect(
      await page
        .locator('[data-player="' + other.sessionId + '"]')
        .getAttribute('draggable'),
    ).toBe('false');
    await expect(
      page.locator('[data-assign="' + other.sessionId + '"] option[value=ta]'),
    ).toBeDisabled();
    await choose(page, 'cai_bang:cai_bang_chuong');
    await choose(guest, 'cai_bang:cai_bang_bong');
    await page
      .locator('[data-player="' + host.sessionId + '"]')
      .dragTo(page.locator('[data-team=chinh]'));
    await expect
      .poll(
        async () =>
          (await view(page)).members.find((m) => m.id === host.sessionId)?.team,
      )
      .toBe('chinh');
    await assign(page, other.sessionId, 'ta');
    await expect(guest.locator('[data-assign]')).toHaveCount(0);
    await expect(
      guest.getByRole('button', { name: 'Bắt đầu', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await expect(page.locator('#pvp-hazard-description')).toContainText(
      'không có cảnh báo trước',
    );
    const toggle = await page.locator('.pvp-toggle').evaluate((e) => {
      const a = e.querySelector('input')!.getBoundingClientRect(),
        b = e.querySelector('span')!.getBoundingClientRect();
      return { width: a.width, gap: b.x - a.right };
    });
    expect(toggle.width).toBe(18);
    expect(toggle.gap).toBeGreaterThanOrEqual(0);
    expect(toggle.gap).toBeLessThanOrEqual(10);
    await page.screenshot({ path: join(evidence, 'settings-hazard.png') });
    await page.locator('#pvp-hazards').uncheck();
    await expect
      .poll(async () => (await view(page)).hazardsEnabled)
      .toBe(false);
    await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await mkdir(evidence, { recursive: true });
    await page.screenshot({ path: join(evidence, 'lobby.png') });
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await expect.poll(async () => (await view(guest)).phase).toBe('countdown');
    const before = await hero(page);
    await page.locator('#game canvas').focus();
    await page.keyboard.press('ArrowRight', { delay: 160 });
    expect((await hero(page)).x).toBe(before.x);
    await expect
      .poll(async () => (await view(page)).phase, { timeout: 7000 })
      .toBe('fighting');
    await expect(page.locator('.bag-cluster')).toBeHidden();
    await expect(page.locator('.meter.xp')).toBeHidden();
    await page.bringToFront();
    await page.locator('#game canvas').focus();
    const old = await hero(page);
    for (let attempt = 0; attempt < 40; attempt++) {
      const a = await hero(page),
        b = await hero(guest);
      if (Math.abs(b.x - a.x) <= 250) break;
      await page.keyboard.press(b.x > a.x ? 'ArrowRight' : 'ArrowLeft', {
        delay: 150,
      });
      await expect
        .poll(async () => (await hero(page)).lastSequence)
        .toBeGreaterThan(a.lastSequence);
      await expect.poll(async () => (await hero(page)).pose).not.toBe('walk');
    }
    const a = await hero(page),
      target = await hero(guest);
    expect(Math.abs(target.x - a.x)).toBeLessThanOrEqual(260);
    expect(a.x).toBeGreaterThan(old.x + 50);
    await expect
      .poll(
        async () => (await snapshot(guest)).state.players[host.sessionId]!.x,
      )
      .toBeCloseTo(a.x, 0);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('a');
      const received = (await snapshot(page)).events.some(
        (e) =>
          e.kind === 'hit' &&
          e.sourceId === host.sessionId &&
          e.targetId === other.sessionId &&
          e.damage > 0,
      );
      if (received) break;
      await page.waitForTimeout(500);
    }
    await writeFile(
      join(evidence, 'combat-input-observations.json'),
      JSON.stringify(
        {
          host: await hero(page),
          guest: await hero(guest),
          hostEvents: (await snapshot(page)).events,
          guestEvents: (await snapshot(guest)).events,
        },
        null,
        2,
      ),
    );
    await expect
      .poll(
        async () =>
          (await snapshot(guest)).events.some(
            (e) =>
              e.kind === 'hit' &&
              e.sourceId === host.sessionId &&
              e.targetId === other.sessionId &&
              e.damage > 0,
          ),
        { timeout: 5000 },
      )
      .toBe(true);
    expect((await hero(guest)).hp).toBeLessThan((await hero(guest)).maxHp);
    await page.screenshot({ path: join(evidence, 'two-client-combat.png') });
    await guest.getByRole('button', { name: 'Lịch sử', exact: true }).click();
    await expect(guest.locator('.pvp-history')).toBeVisible();
    await guest.keyboard.press('Escape');
    await expect(guest.locator('.pvp-history')).toBeHidden();
    await page.bringToFront();
    await page.locator('#game canvas').focus();
    // Observe the short result from its first visible frame, while the real
    // keyboard attack loop continues. Sampling after the loop can cross the
    // legitimate two-second transition into the next countdown.
    const roundObservation = page
      .evaluate(
        () =>
          new Promise<{
            text: string;
            font: string;
            sameNode: boolean;
            phaseBefore: PvpSnapshot['phase'];
            phaseAfter: PvpSnapshot['phase'];
            afterText: string | null;
          }>((resolve, reject) => {
            let frame = 0;
            const phase = () =>
              JSON.parse((window as any).__VOLAM__.snapshot().state.pvp.json)
                .phase as PvpSnapshot['phase'];
            const deadline = setTimeout(() => {
              cancelAnimationFrame(frame);
              reject(
                new Error('No Chính round result observed from real combat'),
              );
            }, 25000);
            const inspect = () => {
              const node = document.querySelector('#pvp-phase strong');
              if (node?.textContent === 'Chính thắng hiệp') {
                clearTimeout(deadline);
                const text = node.textContent,
                  font = getComputedStyle(node).fontFamily,
                  phaseBefore = phase();
                setTimeout(
                  () =>
                    resolve({
                      text,
                      font,
                      phaseBefore,
                      phaseAfter: phase(),
                      sameNode:
                        node === document.querySelector('#pvp-phase strong'),
                      afterText:
                        document.querySelector('#pvp-phase strong')
                          ?.textContent ?? null,
                    }),
                  120,
                );
              } else frame = requestAnimationFrame(inspect);
            };
            inspect();
          }),
      )
      .then(async (observation) => {
        await writeFile(
          join(evidence, 'round-result-observation.json'),
          JSON.stringify(observation, null, 2),
        );
        await page.screenshot({
          path: join(evidence, 'round-result-vietnamese.png'),
        });
        return observation;
      });
    void roundObservation.catch(() => undefined);
    for (let i = 0; i < 25 && (await view(page)).phase === 'fighting'; i++) {
      const sequence = (await hero(page)).lastSequence;
      await page.keyboard.press('a');
      await expect
        .poll(async () => (await hero(page)).lastSequence)
        .toBeGreaterThan(sequence);
      await page.waitForTimeout(850);
    }
    const observedRound = await roundObservation;
    expect(observedRound.text).toBe('Chính thắng hiệp');
    expect(observedRound.font).toContain('Segoe UI');
    expect(observedRound.phaseBefore).toBe(
      'intermission' satisfies PvpSnapshot['phase'],
    );
    if (
      observedRound.phaseAfter === 'intermission' &&
      observedRound.afterText === observedRound.text
    )
      expect(observedRound.sameNode).toBe(true);
    await context.close();
    await expect.poll(async () => (await view(page)).phase).toBe('series_over');
    await expect(page.locator('#pvp-phase strong')).toHaveText(
      'Chính thắng ván',
    );
    expect(
      await page
        .locator('#pvp-phase strong')
        .evaluate((e) => getComputedStyle(e).fontFamily),
    ).toContain('Segoe UI');
    await page.screenshot({
      path: join(evidence, 'series-result-vietnamese.png'),
    });
    await expect
      .poll(async () => (await view(page)).phase, { timeout: 7000 })
      .toBe('lobby');
    expect((await view(page)).score.chinh).toBe(3);
    await writeFile(
      join(evidence, 'two-client.json'),
      JSON.stringify({ roomId: host.roomId, hostErrors, guestErrors }, null, 2),
    );
    expect(hostErrors).toEqual([]);
    expect(guestErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

async function observeSword(page: Page) {
  const result = await page.evaluate<any>(
    () =>
      new Promise((resolve) => {
        const samples: any[] = [];
        let png: string | undefined;
        const start = performance.now();
        const frame = () => {
          const p = (window as any).__VOLAM__.presentation();
          const hazards = p?.pvp?.hazards ?? [];
          for (const h of hazards)
            if (/sword-[012][.]png$/.test(h.texture)) {
              samples.push({ ...h });
              if (!png && h.texture.endsWith('sword-1.png') && h.alpha > 0.8) {
                png = document
                  .querySelector<HTMLCanvasElement>('#game canvas')
                  ?.toDataURL('image/png');
              }
            }
          if (
            new Set(samples.map((s) => s.texture)).size === 3 ||
            performance.now() - start > 25000
          ) {
            resolve({ samples, png });
            return;
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
  );
  await writeFile(
    join(evidence, 'sword-observed-frames.json'),
    JSON.stringify(result.samples, null, 2),
  );
  if (result.png)
    await writeFile(
      join(evidence, 'doc-co-sweep.png'),
      Buffer.from(result.png.split(',')[1], 'base64'),
    );
  return result.samples as Array<{
    id: number;
    texture: string;
    x: number;
    y: number;
    alpha: number;
    scale: number[];
  }>;
}
test('Doc Co sweep has finite moving raster frames and an accurate half-plane warning', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await mkdir(evidence, { recursive: true });
  const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    guest = await context.newPage();
  try {
    const host = await create(page, 'Thử chém', 'kiem_ho');
    await joinRoom(guest, host.roomId, 'Người né');
    await choose(page, 'cai_bang:cai_bang_chuong');
    await choose(guest, 'thieu_lam:thieu_lam_quyen');
    const other = await snapshot(guest);
    await assign(page, host.sessionId, 'chinh');
    await assign(page, other.sessionId, 'ta');
    await page.bringToFront();
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await expect.poll(async () => (await view(page)).phase).toBe('fighting');
    const samples = await observeSword(page);
    expect(new Set(samples.map((s) => s.texture)).size).toBe(3);
    expect(
      samples.every((s) => Number.isFinite(s.x) && Number.isFinite(s.y)),
    ).toBe(true);
    expect(
      samples.some((s, i) =>
        samples
          .slice(i + 1)
          .some((t) => t.id === s.id && Math.hypot(s.x - t.x, s.y - t.y) > 1),
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

test('eight players, all five maps, hazards, NPC frames and host closure', async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const guest = await context.newPage(),
    hostErrors = errors(page),
    guestErrors = errors(guest);
  const browserNetwork: unknown[] = [];
  await guest.addInitScript(() => {
    const record: unknown[] = [];
    (window as any).__QA_LIFECYCLE__ = record;
    for (const event of ['freeze', 'resume', 'visibilitychange'])
      document.addEventListener(event, () =>
        record.push({
          event,
          visibility: document.visibilityState,
          at: Date.now(),
        }),
      );
  });
  guest.on('crash', () => browserNetwork.push({ event: 'page-crash' }));
  const peers: Array<Room<any, LobbyState>> = [];
  const branches = [
    ['vo_dang', 'vo_dang_kiem'],
    ['thieu_lam', 'thieu_lam_quyen'],
    ['con_luan', 'con_luan_kiem_ton'],
    ['duong_mon', 'duong_mon_am_khi'],
    ['ngu_doc', 'ngu_doc_co_su'],
    ['cai_bang', 'cai_bang_bong'],
  ] as const;
  const observations: unknown[] = [];
  try {
    const host = await create(page, 'Chính Chủ', 'hong_moc');
    await joinRoom(guest, host.roomId, 'Tà Khách');
    const other = await snapshot(guest);
    await choose(page, 'cai_bang:cai_bang_chuong');
    await choose(guest, 'thien_son:thien_son_dao');
    for (let i = 0; i < 6; i++) {
      const [s, b] = branches[i]!;
      peers.push(await sdkPeer(host.roomId, 'Đấu thủ ' + i, s, b));
    }
    await expect.poll(async () => (await view(page)).members.length).toBe(8);
    const sdk = new Client(qaSession().serverUrl);
    await expect(
      sdk.joinById(host.roomId, {
        nickname: 'Thứ chín',
        protocolVersion: PROTOCOL_VERSION,
        pvp: true,
      }),
    ).rejects.toThrow();
    for (const [i, id] of [
      host.sessionId,
      other.sessionId,
      ...peers.map((p) => p.sessionId),
    ].entries())
      await assign(page, id, i % 2 ? 'ta' : 'chinh');
    const maps = [
      'hong_moc',
      'rung_truc',
      'dia_nguc',
      'tuong_duong',
      'kiem_ho',
    ] as const;
    for (const map of maps) {
      if (map !== 'hong_moc') {
        await page
          .getByRole('button', { name: 'Cài đặt', exact: true })
          .click();
        await page.locator('[data-map="' + map + '"]').click();
        await expect.poll(async () => (await view(page)).mapId).toBe(map);
        await page
          .getByRole('button', { name: 'Quay lại', exact: true })
          .click();
      }
      await expect
        .poll(async () => (await presentation(page)).pvpMap, {
          timeout: 20000,
        })
        .toBe(map);
      await expect.poll(async () => (await view(page)).members.length).toBe(8);
      await guest.bringToFront();
      const guestReadyAt = Date.now();
      // Wait for this client's real map transition before reading the roster.
      // The host's ready canvas does not imply the background client is ready.
      const guestSamples: unknown[] = [];
      try {
        await expect
          .poll(
            async () => {
              const at = Date.now();
              const value = await guest.evaluate(
                '(() => {const p=window.__VOLAM__.presentation();return {map:p?.pvpMap,scene:p?.sceneSnapshot,ready:p?.ready};})()',
              );
              guestSamples.push({ at, ms: Date.now() - at, value });
              return (value as any)?.map;
            },
            {
              timeout: 20000,
            },
          )
          .toBe(map);
      } catch (error) {
        await mkdir(evidence, { recursive: true });
        await writeFile(
          join(evidence, 'guest-render-failure.json'),
          JSON.stringify(
            {
              map,
              guest: await snapshot(guest).catch((e) => String(e)),
              rawPresentation: await guest
                .evaluate('window.__VOLAM__.presentation()')
                .catch((e) => String(e)),
              dom: await guest.evaluate(
                '({href:location.href,status:document.querySelector("#scene-status")?.outerHTML,feedback:document.querySelector("#feedback")?.textContent,canvas:document.querySelectorAll("canvas").length})',
              ),
              hostErrors,
              guestErrors,
              guestSamples,
            },
            null,
            2,
          ),
        );
        throw error;
      }
      await expect
        .poll(() =>
          guest.evaluate(
            'JSON.parse(window.__VOLAM__.snapshot().state.pvp.json).members.map(m=>m.id).sort()',
          ),
        )
        .toEqual((await view(page)).members.map((m) => m.id).sort());
      observations.push({ map, guestReadyMs: Date.now() - guestReadyAt });
      await page.bringToFront();
      await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
      await expect
        .poll(async () => (await view(page)).phase, { timeout: 7000 })
        .toBe('fighting');
      let actorCount = 0;
      try {
        await expect
          .poll(
            async () => {
              const ids = (await view(page)).members
                .filter((m) => m.team !== 'spectator')
                .map((m) => m.id);
              actorCount = (await presentation(page)).actors.filter((a) =>
                ids.includes(a.id),
              ).length;
              return actorCount;
            },
            { timeout: 15000 },
          )
          .toBe(8);
      } finally {
        if (actorCount !== 8)
          await writeFile(
            join(evidence, 'actor-failure.json'),
            JSON.stringify(
              {
                map,
                view: await view(page),
                presentation: await presentation(page),
                host: await snapshot(page),
                guest: await snapshot(guest).catch((e) => String(e)),
                hostErrors,
                guestErrors,
                peerLifecycle,
                browserNetwork,
                guestPageLifecycle: await guest.evaluate(
                  '(window.__QA_LIFECYCLE__ ?? [])',
                ),
              },
              null,
              2,
            ),
          );
      }
      await assertArenaView(page, map);
      expect((await view(page)).alive).toEqual({ chinh: 4, ta: 4 });
      if (map === 'rung_truc')
        await expect
          .poll(
            async () =>
              (await presentation(page)).pvp?.hazards.some((h) =>
                h.texture.includes('dart'),
              ),
            { timeout: 6500, intervals: [80] },
          )
          .toBe(true);
      if (map === 'dia_nguc')
        expect((await presentation(page)).pvp?.lava).toBe(true);
      if (map === 'tuong_duong') {
        const samples: unknown[] = [];
        try {
          await expect
            .poll(
              async () => {
                const v = await view(page),
                  p = await presentation(page);
                samples.push({
                  tick: v.tick,
                  phase: v.phase,
                  round: v.roundNumber,
                  server: v.hazards.map((h) => h.kind),
                  render: p.pvp?.hazards.map((h) => h.texture),
                });
                return p.pvp?.hazards.some((h) => h.texture.includes('arrow'));
              },
              { timeout: 7000, intervals: [80] },
            )
            .toBe(true);
        } finally {
          await writeFile(
            join(evidence, 'tuong-duong-hazard-samples.json'),
            JSON.stringify(samples, null, 2),
          );
        }
      }
      if (map === 'kiem_ho') {
        const frames = new Set<number>(),
          textures = new Set<string>();
        const swordSamples: Array<{
          id: number;
          texture: string;
          x: number;
          y: number;
          alpha: number;
          scale: number[];
        }> = [];
        const observedSword = observeSword(page).then((records) => {
          swordSamples.push(...records);
          for (const record of records) textures.add(record.texture);
          return records;
        });
        void observedSword.catch(() => undefined);
        for (let i = 0; i < 600; i++) {
          const v = (await presentation(page)).pvp;
          if (v) {
            frames.add(v.npcFrame);
            for (const h of v.hazards) {
              textures.add(h.texture);
              if (h.texture.includes('sword-')) {
                expect(h.scale[0]).toBeCloseTo(h.scale[1]!, 5);
                expect(h.scale[0]).toBeLessThanOrEqual(1);
                if (!h.texture.includes('warning')) swordSamples.push(h);
              }
            }
            for (const sword of v.swords) {
              expect(sword.region.width * sword.region.height).toBeCloseTo(
                (1120 * 630) / 2,
                0,
              );
            }
          }
          if (
            frames.size === 10 &&
            [...textures].filter((s) => /sword-[012]\.png$/.test(s)).length ===
              3 &&
            [...textures].some((s) => /lightning-[012]\.png$/.test(s))
          )
            break;
          if (i % 25 === 0)
            await writeFile(
              join(evidence, 'npc-observation-progress.json'),
              JSON.stringify(
                {
                  i,
                  frames: [...frames],
                  textures: [...textures],
                  samples: swordSamples.length,
                  phase: (await view(page)).phase,
                },
                null,
                2,
              ),
            );
          await page.waitForTimeout(60);
        }
        expect([...frames].sort((a, b) => a - b)).toEqual([
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        ]);
        expect([...textures].some((s) => /sword-[012]\.png$/.test(s))).toBe(
          true,
        );
        expect([...textures].some((s) => /lightning-[012]\.png$/.test(s))).toBe(
          true,
        );
        await writeFile(
          join(evidence, 'sword-samples.json'),
          JSON.stringify(swordSamples, null, 2),
        );
        await observedSword;
        expect(new Set(swordSamples.map((s) => s.texture)).size).toBe(3);
        expect(
          swordSamples.some((s, i) =>
            swordSamples
              .slice(i + 1)
              .some(
                (t) => t.id === s.id && Math.hypot(s.x - t.x, s.y - t.y) > 1,
              ),
          ),
        ).toBe(true);
        observations.push({
          npcFrames: [...frames],
          hazardTextures: [...textures],
          swordSamples,
        });
      }
      await page.setViewportSize({ width: 1872, height: 800 });
      await assertArenaView(page, map);
      if (map === 'dia_nguc')
        await page.screenshot({ path: join(evidence, 'dia-nguc-wide.png') });
      await page.setViewportSize({ width: 1280, height: 720 });
      await assertArenaView(page, map);
      const p = await presentation(page);
      observations.push({ map, presentation: p, view: await view(page) });
      await mkdir(evidence, { recursive: true });
      await page.screenshot({ path: join(evidence, map + '-eight.png') });
      if (map !== maps.at(-1)) {
        await peers[0]!.leave();
        await expect
          .poll(async () => (await view(page)).phase)
          .toBe('series_over');
        await expect
          .poll(async () => (await view(page)).phase, { timeout: 7000 })
          .toBe('lobby');
        peers[0] = await sdkPeer(
          host.roomId,
          'Đấu thủ trở lại',
          branches[0][0],
          branches[0][1],
        );
        await assign(page, peers[0]!.sessionId, 'chinh');
      }
    }
    await page.setViewportSize({ width: 1896, height: 919 });
    await page.screenshot({ path: join(evidence, 'kiem-ho-wide.png') });
    await page.getByRole('button', { name: 'Thoát', exact: true }).click();
    await page.locator('#confirm-quit').click();
    await expect(guest.locator('.pvp-entry-window')).toBeVisible();
    await expect(
      guest.getByText('Phòng đã đóng · Chủ phòng đã rời phòng.'),
    ).toBeVisible();
    await writeFile(
      join(evidence, 'eight-player-frame-observations.json'),
      JSON.stringify(
        {
          observations,
          hostErrors,
          guestErrors,
          peerLifecycle,
          browserNetwork,
        },
        null,
        2,
      ),
    );
    expect(hostErrors).toEqual([]);
    expect(guestErrors).toEqual([]);
  } finally {
    for (const p of peers)
      try {
        await p.leave();
      } catch {}
    await context.close();
  }
});
