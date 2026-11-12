import { expect, test, type Page } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { loiDai } from '@volam/game-core';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import { qaSession } from '../../tools/qa-session.mjs';
import { joinWaiting } from './pregame-helper.js';

interface Hero {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  zoneId: string;
  loiDaiFighter: boolean;
  lastSequence: number;
  basicCooldown: number;
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    phase: string;
    players: Record<string, Hero>;
    defense: { paused: boolean };
    loiDaiGateTicks: number;
    loiDaiFighters: number;
  };
}
const snapshot = (page: Page) =>
  page.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const hero = async (page: Page) => {
  const { state, sessionId } = await snapshot(page);
  return state.players[sessionId]!;
};
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 90));

async function toggleDuel(page: Page, action: 'enter' | 'exit') {
  const enter = action === 'enter';
  await page.locator('.system-buttons [data-menu="pvp"]').click();
  await expect(page.locator('#dialog-title')).toHaveText(
    enter ? 'Vào Lôi Đài' : 'Về đấu trường',
  );
  await page.locator('#confirm-loi-dai').click();
  await expect
    .poll(async () => (await hero(page)).zoneId)
    .toBe(enter ? loiDai.id : 'arena');
}

async function moveX(page: Page, target: number) {
  await page.locator('#game canvas').focus();
  for (let attempt = 0; attempt < 16; attempt++) {
    const h = await hero(page);
    const dx = target - h.x;
    if (Math.abs(dx) < 12) return;
    await page.keyboard.press(dx > 0 ? 'ArrowRight' : 'ArrowLeft', {
      delay: Math.min(160, Math.max(35, Math.abs(dx) * 4)),
    });
    await expect
      .poll(async () => (await hero(page)).lastSequence)
      .toBeGreaterThan(h.lastSequence);
  }
  expect(Math.abs((await hero(page)).x - target)).toBeLessThan(12);
}

async function connectPeer(roomId: string, nickname: string) {
  const room = await new Client(qaSession().serverUrl).joinById<LobbyState>(
    roomId,
    {
      nickname,
      protocolVersion: PROTOCOL_VERSION,
    },
  );
  room.onMessage('combat-event', () => {});
  room.onMessage('command-rejected', () => {});
  const read = () => room.state.players.get(room.sessionId)!;
  let sequence = 0;
  const move = (x: number, y: number) =>
    room.send('input', {
      kind: 'move',
      x,
      y,
      sequence: ++sequence,
      protocolVersion: PROTOCOL_VERSION,
    });
  const gate = async (entry: boolean) => {
    for (let i = 0; i < 40; i++) {
      const dx = loiDai.spawn.x - read().x;
      if (Math.abs(dx) < 16) break;
      move(Math.sign(dx), 0);
      await tick();
    }
    move(0, -1);
    await expect
      .poll(() => (entry ? read().loiDaiFighter : read().y < 417))
      .toBe(true);
    move(0, 0);
    expect(read().loiDaiFighter).toBe(entry);
  };
  return {
    room,
    read,
    gate,
    async select(schoolId = 'cai_bang', basicId = 'cai_bang_chuong') {
      await expect.poll(() => room.state.phase).toBe('SCHOOL_SELECTION');
      room.send('lobby-action', { action: 'select', schoolId });
      room.send('lobby-action', {
        action: 'branch',
        basicId,
      });
      room.send('lobby-action', { action: 'confirm' });
      await expect.poll(() => read().confirmed).toBe(true);
    },
    async travel(action: 'enter' | 'exit') {
      room.send('loi-dai-action', {
        action,
        sequence: ++sequence,
        protocolVersion: PROTOCOL_VERSION,
      });
      await expect
        .poll(() => read().zoneId)
        .toBe(action === 'enter' ? loiDai.id : 'arena');
    },
    async learnUltimate(id: string) {
      room.send('build-action', {
        action: 'upgrade-slot',
        slot: 4,
        revision: read().build.revision,
        sequence: ++sequence,
        protocolVersion: PROTOCOL_VERSION,
      });
      await expect.poll(() => read().build.ranks.get(id)).toBe(1);
    },
    castUltimate() {
      room.send('input', {
        kind: 'cast',
        slot: 4,
        sequence: ++sequence,
        protocolVersion: PROTOCOL_VERSION,
      });
    },
    attack() {
      room.send('input', {
        kind: 'basic',
        sequence: ++sequence,
        protocolVersion: PROTOCOL_VERSION,
      });
    },
  };
}

test.use({ viewport: { width: 1672, height: 940 } });
test('Lôi Đài renders a gated stage, victory fireworks and spectator respawn', async ({
  page,
}, info) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await joinWaiting(page, 'Hồng Mộc');
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
  const roomId = (await snapshot(page)).roomId;
  const blue = await connectPeer(roomId, 'Thanh Kiếm');
  const watcher = await connectPeer(roomId, 'Khán giả');
  try {
    await expect(page.locator('#pregame .pre-players li')).toHaveCount(3);
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await expect(page.locator('#pregame .pre-title')).toHaveText(
      'Chọn môn phái',
    );
    await blue.select();
    await watcher.select();
    const school = page.locator('#pregame button[data-school=cai_bang]');
    await school.click();
    await expect(school).toHaveAttribute('aria-pressed', 'true');
    const branch = page.locator('#pregame button[data-branch=cai_bang_chuong]');
    await branch.click();
    await expect(branch).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect
      .poll(async () => (await snapshot(page)).state.phase)
      .toBe('IN_GAME');
    expect((await hero(page)).level).toBe(6);

    await toggleDuel(page, 'enter');
    await expect(
      page.getByRole('button', { name: 'Thương Gia', exact: true }),
    ).toBeDisabled();
    await page.keyboard.press('p');
    await expect(page.locator('#modal-layer')).toBeHidden();
    expect((await snapshot(page)).state.defense.paused).toBe(false);
    await blue.travel('enter');
    await watcher.travel('enter');
    await expect
      .poll(async () => (await snapshot(page)).state.defense.paused)
      .toBe(true);
    await watcher.travel('exit');
    await expect
      .poll(async () => (await snapshot(page)).state.defense.paused)
      .toBe(false);
    await watcher.travel('enter');

    await moveX(page, loiDai.spawn.x);
    await page.keyboard.down('ArrowUp');
    try {
      await expect
        .poll(async () => (await hero(page)).loiDaiFighter)
        .toBe(true);
    } finally {
      await page.keyboard.up('ArrowUp');
    }
    await blue.gate(true);
    await watcher.gate(false);
    await expect
      .poll(async () => (await snapshot(page)).state.loiDaiFighters)
      .toBe(2);
    await expect
      .poll(() => page.evaluate('window.__VOLAM__.presentation().zoneId'))
      .toBe(loiDai.id);
    await expect
      .poll(() =>
        page.evaluate('window.__VOLAM__.presentation().actors.length'),
      )
      .toBe(3);
    await page.screenshot({ path: info.outputPath('hong-moc-live.png') });

    await moveX(page, 440);
    await expect
      .poll(
        async () => {
          const local = await hero(page);
          if (blue.read().hp > 0 && local.basicCooldown === 0)
            await page.keyboard.press('a');
          return blue.read().hp;
        },
        { timeout: 20_000, intervals: [90] },
      )
      .toBe(0);
    await expect
      .poll(async () => (await snapshot(page)).state.loiDaiGateTicks)
      .toBeGreaterThan(0);
    const frames = () =>
      page.evaluate<string[]>(
        'window.__VOLAM__.presentation().loiDaiFireworks',
      );
    await expect.poll(frames, { intervals: [40, 70] }).not.toEqual([]);
    const first = (await frames())[0];
    await expect
      .poll(async () => (await frames())[0], { intervals: [40, 70] })
      .not.toBe(first);
    await page.screenshot({ path: info.outputPath('fireworks-live.png') });
    await expect
      .poll(
        () =>
          blue.read().hp === blue.read().maxHp && !blue.read().loiDaiFighter,
        { timeout: 5_000 },
      )
      .toBe(true);
    await expect
      .poll(async () => (await snapshot(page)).state.loiDaiGateTicks)
      .toBe(0);

    await watcher.gate(true);
    await expect
      .poll(
        async () => {
          const local = await hero(page);
          if (local.hp > 0 && watcher.read().basicCooldown === 0)
            watcher.attack();
          return local.hp;
        },
        { timeout: 20_000, intervals: [90] },
      )
      .toBe(0);
    await expect(page.locator('#game')).toHaveClass(/hero-dead/);
    await expect(page.locator('#respawn-countdown')).toContainText(
      'Trở về sảnh chờ',
    );
    await expect(page.locator('#game')).not.toHaveClass(/hero-dead/, {
      timeout: 5_000,
    });
    await expect.poll(async () => (await hero(page)).loiDaiFighter).toBe(false);
    await toggleDuel(page, 'exit');
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([blue.room.leave(), watcher.room.leave()]);
  }
});

test('Lôi Đài centers the widescreen court and renders ultimate frames with six players', async ({
  page,
}, info) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1896, height: 919 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await joinWaiting(page, 'Hồng Mộc Bổng');
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
  const roomId = (await snapshot(page)).roomId;
  const [blade, palm, fan, guest, guest2] = await Promise.all([
    connectPeer(roomId, 'Thiên Sơn Đao'),
    connectPeer(roomId, 'Cái Bang Chưởng'),
    connectPeer(roomId, 'Thiên Sơn Phiến'),
    connectPeer(roomId, 'Khách một'),
    connectPeer(roomId, 'Khách hai'),
  ]);
  const peers = [blade, palm, fan, guest, guest2];
  try {
    await expect(page.locator('#pregame .pre-players li')).toHaveCount(6);
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await expect(page.locator('#pregame .pre-title')).toHaveText(
      'Chọn môn phái',
    );
    await Promise.all([
      blade.select('thien_son', 'thien_son_dao'),
      palm.select(),
      fan.select('thien_son', 'thien_son_phien'),
      guest.select(),
      guest2.select(),
    ]);
    await page.locator('#pregame button[data-school=cai_bang]').click();
    const branch = page.locator('#pregame button[data-branch=cai_bang_bong]');
    await branch.click();
    await expect(branch).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect
      .poll(async () => (await snapshot(page)).state.phase)
      .toBe('IN_GAME');
    await page.locator('#slot-t .rank-up').click();
    await Promise.all([
      blade.learnUltimate('bach_liet_thien_kich'),
      palm.learnUltimate('hang_long_hoa_vu'),
      fan.learnUltimate('bach_phien_phong_bao'),
    ]);
    await toggleDuel(page, 'enter');
    await Promise.all(peers.map((peer) => peer.travel('enter')));
    await moveX(page, loiDai.spawn.x);
    await page.keyboard.down('ArrowUp');
    try {
      await expect
        .poll(async () => (await hero(page)).loiDaiFighter)
        .toBe(true);
    } finally {
      await page.keyboard.up('ArrowUp');
    }
    await blade.gate(true);
    const view = () =>
      page.evaluate<{
        center: { x: number; y: number };
        layers: string[];
        skillArt: string[];
      }>('window.__VOLAM__.presentation().loiDaiView');
    const centered = async () => {
      await expect
        .poll(async () => (await view()).center.x)
        .toBeCloseTo(418, 0);
      await expect
        .poll(async () => (await view()).center.y)
        .toBeCloseTo(235, 0);
    };
    await centered();
    expect((await view()).layers).toContain('loi-dai:west-drum');
    expect((await view()).layers).toContain('loi-dai:east-overscan');
    await expect
      .poll(() =>
        page.evaluate('window.__VOLAM__.presentation().actors.length'),
      )
      .toBe(6);
    await page.screenshot({ path: info.outputPath('hong-moc-wide.png') });
    await page.setViewportSize({ width: 1280, height: 720 });
    await centered();
    await page.setViewportSize({ width: 1896, height: 919 });
    await centered();

    const observe = async (needle: RegExp, shot?: string) => {
      const sample = async () =>
        (await view()).skillArt.find((frame) => needle.test(frame));
      await expect.poll(sample, { intervals: [25, 45, 70] }).toBeDefined();
      const first = await sample();
      await expect
        .poll(
          async () => {
            const next = await sample();
            return next !== undefined && next !== first;
          },
          { intervals: [25, 45, 70] },
        )
        .toBe(true);
      if (shot) await page.screenshot({ path: info.outputPath(shot) });
      await expect.poll(sample, { timeout: 8_000 }).toBeUndefined();
    };
    await page.keyboard.press('t');
    await observe(/vo_cau|thien_ha_vo_cau/i);
    blade.castUltimate();
    await observe(/thien-son-x-(shadows|crescents)/i, 'bach-liet-live.png');
    await blade.travel('exit');
    await palm.gate(true);
    palm.castUltimate();
    await observe(/cai_bang_hang_long_v2/i);
    await palm.travel('exit');
    await fan.gate(true);
    fan.castUltimate();
    await observe(/thien_son_fan_v2/i);
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(peers.map((peer) => peer.room.leave()));
  }
});
