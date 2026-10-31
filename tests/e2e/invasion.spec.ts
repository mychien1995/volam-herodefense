import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';

interface Actor {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  xp: number;
  gold: number;
  zoneId: string;
  invasionWave: number;
  basicCooldown: number;
  pose: string;
  lastSequence: number;
}
interface Snapshot {
  roomId: string;
  sessionId: string;
  state: {
    tick: number;
    phase: string;
    players: Record<string, Actor>;
    creeps: Record<string, Actor>;
    defense: {
      wave: number;
      statueHp: number;
      noticeId: number;
      noticeKind: string;
      nextWaveTick: number;
      defeatTick: number;
    };
  };
  events: Array<{
    kind: string;
    sourceId: string;
    targetId: string;
    damage: number;
  }>;
}
const read = (p: Page): Promise<Snapshot> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
};
const evidence = 'docs/evidence/m2b';
function monitor(p: Page) {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  p.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}
async function move(p: Page, key: string, ms: number) {
  await p.locator('#game canvas').focus();
  await p.keyboard.down(key);
  await p.waitForTimeout(ms);
  await p.keyboard.up(key);
  await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
}
async function ranged(p: Page) {
  await p.locator('[data-menu=settings]').click();
  await p.locator('#dialog-content [data-menu=skills]').click();
  await p.getByLabel('Normal attack').selectOption('cai_bang_chuong');
  await p.keyboard.press('Escape');
  await expect(p.locator('#game canvas')).toBeFocused();
}

test('two browser defenders damage the same invader and share HP/death/rewards', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await mkdir(evidence, { recursive: true });
    await joinWaiting(a, 'Defender A');
    await joinWaiting(b, 'Defender B', (await read(a)).roomId);
    await startTogether([a, b]);
    await ranged(a);
    await ranged(b);
    // Both walk down the broad west approach, leaving the practice targets behind.
    await Promise.all([move(a, 'ArrowLeft', 1650), move(b, 'ArrowLeft', 1650)]);
    await expect
      .poll(async () => (await read(a)).state.defense.wave)
      .toBeGreaterThanOrEqual(1);
    const west = async () =>
      Object.entries((await read(a)).state.creeps)
        .filter(([id, c]) => id.includes('invasion_1_west') && c.hp > 0)
        .sort((x, y) => x[1].x - y[1].x)[0];
    await expect
      .poll(
        async () => {
          const e = await west();
          return e
            ? Math.hypot(e[1].x - (await hero(a)).x, e[1].y - (await hero(a)).y)
            : 999;
        },
        { timeout: 15000 },
      )
      .toBeLessThan(150);
    const target = (await west())![0],
      aId = (await read(a)).sessionId,
      bId = (await read(b)).sessionId;
    // Real arrow/A/Q/W actions only. No debug state writes or client damage injection.
    const deaths = new Set<string>();
    for (
      let n = 0;
      n < 12 && (await read(a)).state.creeps[target]!.hp > 0;
      n++
    ) {
      await Promise.all([a.keyboard.press('KeyA'), b.keyboard.press('KeyA')]);
      if (n === 1)
        await Promise.all([a.keyboard.press('KeyQ'), b.keyboard.press('KeyW')]);
      await a.waitForTimeout(750);
      for (const e of (await read(a)).events)
        if (e.kind === 'death' && ![aId, bId].includes(e.targetId))
          deaths.add(e.targetId);
    }
    const s = await read(a);
    expect(
      s.events.some(
        (e) => e.kind === 'hit' && e.sourceId === aId && e.targetId === target,
      ),
    ).toBe(true);
    expect(
      (await read(b)).events.some(
        (e) => e.kind === 'hit' && e.sourceId === bId && e.targetId === target,
      ),
    ).toBe(true);
    await expect
      .poll(async () => (await read(b)).state.creeps[target]?.hp)
      .toBe(0);
    await expect.poll(async () => (await hero(a)).xp).toBeGreaterThan(0);
    await expect.poll(async () => (await hero(b)).xp).toBeGreaterThan(0);
    expect(s.state.players[aId]!.gold + s.state.players[bId]!.gold).toBe(
      deaths.size * 12,
    );
    expect(s.state.players[aId]!.xp + s.state.players[bId]!.xp).toBe(
      deaths.size * 60,
    );
    await expect
      .poll(async () => (await read(b)).state.defense.wave)
      .toBe((await read(a)).state.defense.wave);
    expect(
      Math.abs((await read(a)).state.tick - (await read(b)).state.tick),
    ).toBeLessThanOrEqual(6);
    await a.screenshot({ path: `${evidence}/two-defenders.png` });
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('dungeon warning, overlapping waves, persistent statue damage, responsive HUD and defeat', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 944, height: 466 },
    }),
    cb = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await mkdir(evidence, { recursive: true });
    await joinWaiting(a, 'Arena Watch');
    await joinWaiting(b, 'Dungeon Watch', (await read(a)).roomId);
    await startTogether([a, b]);
    await b.locator('[data-menu=dungeons]').click();
    await b.getByRole('radio', { name: 'Riêng', exact: true }).click();
    await b.locator('#enter-dungeon').click();
    await expect.poll(async () => (await hero(b)).zoneId).not.toBe('arena');
    const zone = (await hero(b)).zoneId;
    await move(a, 'ArrowDown', 1500);
    await expect(b.locator('#invasion-warning')).toBeVisible();
    await b.screenshot({ path: `${evidence}/dungeon-warning-1920.png` });
    expect((await hero(b)).zoneId).toBe(zone);
    await expect
      .poll(async () => (await read(a)).state.defense.wave, { timeout: 15000 })
      .toBeGreaterThanOrEqual(2);
    let s = await read(a);
    expect(
      Object.values(s.state.creeps).some(
        (c) => c.invasionWave === 1 && c.hp > 0,
      ),
    ).toBe(true);
    expect(
      Object.values(s.state.creeps).some(
        (c) => c.invasionWave === 2 && c.hp > 0,
      ),
    ).toBe(true);
    expect(
      Object.values((await read(b)).state.creeps).every(
        (c) => c.zoneId === zone && c.invasionWave === 0,
      ),
    ).toBe(true);
    await a.screenshot({ path: `${evidence}/overlapping-waves-944.png` });
    const panel = (await a.locator('#defense-hud').boundingBox())!;
    const player = (await a.locator('.hero-hud').boundingBox())!;
    expect(panel.x).toBeGreaterThan(player.x + player.width);
    expect(panel.x + panel.width).toBeLessThan(944);
    await a.setViewportSize({ width: 1920, height: 1080 });
    await expect
      .poll(async () => (await read(a)).state.defense.statueHp, {
        timeout: 35000,
      })
      .toBeLessThan(300);
    await expect
      .poll(async () => (await read(b)).state.defense.statueHp)
      .toBe((await read(a)).state.defense.statueHp);
    await move(a, 'ArrowUp', 950);
    await a.screenshot({ path: `${evidence}/statue-under-attack-1920.png` });
    expect(
      (await read(a)).events.some(
        (e) => e.kind === 'hit' && e.targetId === 'statue' && e.damage > 0,
      ),
    ).toBe(true);
    await move(a, 'ArrowDown', 950);
    await expect(a.locator('#defeat-layer')).toBeVisible({ timeout: 45000 });
    await expect(b.locator('#defeat-layer')).toBeVisible();
    expect((await hero(b)).zoneId).toBe(zone);
    s = await read(a);
    expect(s.state.defense.statueHp).toBe(0);
    expect((await read(b)).state.defense.defeatTick).toBe(
      s.state.defense.defeatTick,
    );
    await a.keyboard.press('ArrowRight');
    await a.keyboard.press('KeyA');
    await a.waitForTimeout(200);
    expect((await read(a)).state.tick).toBe(s.state.tick);
    await a.screenshot({ path: `${evidence}/defeat-1920.png` });
    await a.getByRole('button', { name: 'Rời trận', exact: true }).click();
    await expect(a.locator('#pregame .pre-title')).toHaveText(
      'Danh sách phòng',
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
