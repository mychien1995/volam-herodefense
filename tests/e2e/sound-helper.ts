import { expect, type Page } from '@playwright/test';
import { waitForGameReady } from '../../tools/qa-browser.mjs';

export const soundSnapshot = (page: Page) =>
  page.evaluate<any>('window.__VOLAM__.snapshot()');
export const soundView = (page: Page, school = 'con-luan') =>
  page.evaluate<any, string>((school) => {
    const view = (window as any).__VOLAM__.presentation();
    return school === 'con-luan'
      ? view.conLuanSounds
      : view.schoolSounds[school];
  }, school);

export async function enterSoundPractice(
  page: Page,
  school: string,
  branch: string,
) {
  await page.addInitScript(() => {
    const samples: Array<{
      bufferId: number;
      duration: number;
      peak: number;
      state: string;
    }> = [];
    const buffers = new WeakMap<AudioBuffer, number>();
    let nextBuffer = 0;
    (window as any).__audioStarts = samples;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof start>
    ) {
      let peak = 0;
      const buffer = this.buffer;
      if (buffer) {
        if (!buffers.has(buffer)) buffers.set(buffer, ++nextBuffer);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 16)
          peak = Math.max(peak, Math.abs(data[i]!));
      }
      samples.push({
        bufferId: buffer ? buffers.get(buffer)! : 0,
        duration: buffer?.duration ?? 0,
        peak,
        state: this.context.state,
      });
      if (samples.length > 256) samples.shift();
      return Reflect.apply(start, this, args);
    };
  });
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Phòng test', exact: true }).click();
  await page.locator('#practice-nickname').fill('Nghe võ công');
  await page
    .getByRole('button', { name: 'Chọn nhân vật', exact: true })
    .click();
  await page
    .locator(`[data-practice="school"][data-school="${school}"]`)
    .click();
  await page
    .locator(`[data-practice="branch"][data-branch="${branch}"]`)
    .click();
  await page
    .getByRole('button', { name: 'Vào phòng test', exact: true })
    .click();
  await waitForGameReady(page, { timeout: 60000 });
  await expect(page.locator('#practice-ui')).toBeHidden();
  await page.locator('canvas').click({ position: { x: 400, y: 300 } });
  await expect.poll(async () => (await soundView(page)).locked).toBe(false);
  await expect
    .poll(async () => (await soundView(page)).contextState)
    .toBe('running');
}

export async function expectSoundCue(
  page: Page,
  school: string,
  name: string,
  after = 0,
) {
  await expect
    .poll(
      async () =>
        (await soundView(page, school)).recent
          .slice(after)
          .some((entry: any) => entry.cue === name),
      { timeout: 18000 },
    )
    .toBe(true);
}

export async function switchSoundHero(
  page: Page,
  school: string,
  branch: string,
) {
  await page
    .getByRole('button', { name: 'Đổi phái/hệ phái', exact: true })
    .click();
  await page
    .locator(`[data-practice="school"][data-school="${school}"]`)
    .click();
  await page
    .locator(`[data-practice="branch"][data-branch="${branch}"]`)
    .click();
  await page.getByRole('button', { name: 'Đổi nhân vật', exact: true }).click();
  await expect
    .poll(async () => {
      const s = await soundSnapshot(page);
      return s.state.players[s.sessionId].basicId;
    })
    .toBe(branch);
  await expect(page.locator('#practice-ui')).toBeHidden();
}
