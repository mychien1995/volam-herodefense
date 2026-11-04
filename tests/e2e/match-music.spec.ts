import { expect, test } from '@playwright/test';
import { joinWaiting, startTogether } from './pregame-helper.js';

test('match OST plays, loops and resets on leaving', async ({ browser }) => {
  test.setTimeout(120_000);
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    const host = await first.newPage();
    const peer = await second.newPage();
    await joinWaiting(host, 'Nhạc Một');
    const roomId = await host.evaluate(
      () => (window as any).__VOLAM__.snapshot().roomId as string,
    );
    await joinWaiting(peer, 'Nhạc Hai', roomId);

    const music = (page: typeof host) => page.locator('audio#match-music');
    for (const page of [host, peer])
      expect(
        await music(page).evaluate((audio: HTMLAudioElement) => audio.paused),
      ).toBe(true);

    await startTogether([host, peer], ['cai_bang_bong', 'cai_bang_chuong']);
    const playing = (audio: HTMLAudioElement) =>
      audio.loop && !audio.paused && !audio.muted && audio.currentTime > 0;
    for (const page of [host, peer])
      await expect.poll(() => music(page).evaluate(playing)).toBe(true);

    await test.step('the actual MP3 wraps around', async () => {
      await host.bringToFront();
      await music(host).evaluate((audio: HTMLAudioElement) => {
        audio.currentTime = audio.duration - 0.25;
      });
      await expect
        .poll(() =>
          music(host).evaluate(
            (audio: HTMLAudioElement) =>
              !audio.seeking && !audio.paused && audio.currentTime < 2,
          ),
        )
        .toBe(true);
    });

    await test.step('leaving resets only the local player', async () => {
      await host.getByRole('button', { name: 'Thoát', exact: true }).click();
      await host.locator('#confirm-quit').click();
      await expect(host.locator('#pregame .pre-title')).toHaveText(
        'Danh sách phòng',
      );
      await expect
        .poll(() =>
          music(host).evaluate(
            (audio: HTMLAudioElement) =>
              audio.paused && audio.currentTime < 0.1,
          ),
        )
        .toBe(true);
      await peer.bringToFront();
      expect(await music(peer).evaluate(playing)).toBe(true);
    });
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});
