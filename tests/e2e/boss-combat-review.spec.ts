import { expect, test, type Page } from '@playwright/test';
import { kimLuanDefinition, m1Config } from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';

test.beforeEach(({ baseURL }) => {
  test.skip(baseURL !== 'http://127.0.0.1:59761', 'Requires the local boss combat preview');
});

interface Actor {
  id: string;
  zoneId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  castAbilityId: string;
  dashCharges: number;
  statuses: string;
}

interface Readout {
  hero: Actor;
  effects: Array<{
    id: string;
    kind: string;
    x: number;
    y: number;
    fy: number;
    length: number;
    activeAt: number;
  }>;
  creeps: Actor[];
  art: Array<{ id: string; frame: string }>;
  arenaWidth: number;
}

const read = (page: Page) =>
  page.evaluate<Readout>(`(() => {
    const s = window.__VOLAM__.snapshot();
    const v = window.__VOLAM__.presentation();
    const hero = s.state.players[s.sessionId];
    return { hero,
      effects: Object.values(s.state.bossEffects).filter(e => e.zoneId === hero.zoneId),
      creeps: Object.values(s.state.creeps).filter(e => e.zoneId === hero.zoneId),
      art: v.kim?.entities ?? [], arenaWidth: v.kimArena?.width };
  })()`);

async function enter(page: Page, boss: string, combat = false) {
  await joinWaiting(page, 'Boss QA', undefined, `/?bossVfx=${boss}${combat ? '&combat=1' : ''}`, 40000);
  await startTogether([page], ['vo_dang'], 40000);
  await expect.poll(async () => (await read(page)).hero.zoneId).toBe(`${boss}_shared`);
}

async function cast(page: Page, ability: string) {
  const skills = page.getByRole('combobox', { name: 'Chiêu VFX' });
  const response = page.waitForResponse(
    (r) => new URL(r.url()).searchParams.get('ability') === ability,
  );
  if ((await skills.inputValue()) === ability)
    await page.getByRole('button', { name: 'Phát lại' }).click();
  else await skills.selectOption(ability);
  expect((await response).ok()).toBe(true);
  await page.locator('#game canvas').focus();
}

async function moveToX(page: Page, x: number) {
  const start = (await read(page)).hero.x;
  if (Math.abs(x - start) < 14) return;
  const right = x > start;
  const key = right ? 'ArrowRight' : 'ArrowLeft';
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => (right ? 1 : -1) * ((await read(page)).hero.x - x), {
      intervals: [35], timeout: 4000,
    }).toBeGreaterThan(-10);
  } finally {
    await page.keyboard.up(key);
  }
}

function stun(readout: Readout, abilityId: string): number {
  const statuses = JSON.parse(readout.hero.statuses) as Array<{
    kind: string;
    abilityId: string;
    ticks: number;
  }>;
  return statuses.find((s) => s.kind === 'stun' && s.abilityId === abilityId)?.ticks ?? 0;
}

test('the rendered Tương Dương shelter blocks movement and Shift until it despawns', async ({ page }) => {
  await enter(page, 'kim_luan');
  await cast(page, 'long_tuong_bat_nha_cong');
  await expect.poll(async () => (await read(page)).effects.filter((e) => e.kind === 'rock').length).toBeGreaterThan(0);
  const initial = await read(page);
  expect(initial.arenaWidth).toBe(1190);
  const buffer = kimLuanDefinition.elephants.rockHalfDepth + m1Config.radius;
  const rock = initial.effects.filter((e) => e.kind === 'rock' && e.y + buffer < initial.hero.y)
    .sort((a, b) => Math.abs(a.x - initial.hero.x) - Math.abs(b.x - initial.hero.x))[0]!;
  expect(rock).toBeTruthy();
  await expect.poll(async () => (await read(page)).art.some((a) => a.frame === 'shelter_rise_2')).toBe(true);
  await moveToX(page, rock.x);
  const edge = rock.y + buffer;
  await page.keyboard.down('ArrowUp');
  try {
    await expect.poll(async () => (await read(page)).hero.y).toBeLessThan(edge + 12);
    const charges = (await read(page)).hero.dashCharges;
    await page.keyboard.press('Shift');
    await expect.poll(async () => (await read(page)).hero.dashCharges).toBe(charges - 1);
    await expect.poll(async () => (await read(page)).hero.y).toBeGreaterThanOrEqual(edge - 0.05);
    await expect.poll(async () => (await read(page)).effects.some((e) => e.id === rock.id), { timeout: 15000 }).toBe(false);
    await expect.poll(async () => (await read(page)).hero.y).toBeLessThan(rock.y - 10);
  } finally {
    await page.keyboard.up('ArrowUp');
  }
});

test('an open elephant lane takes HP and replicates the two-second stun', async ({ page }) => {
  const ability = 'long_tuong_bat_nha_cong';
  await enter(page, 'kim_luan', true);
  await cast(page, ability);
  await expect.poll(async () => (await read(page)).effects.some((e) => e.kind === 'elephant')).toBe(true);
  const { hero, effects } = await read(page);
  const lane = effects.filter((e) => e.kind === 'elephant' && e.fy === 1 && e.length > hero.y + 30)
    .sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x) || a.activeAt - b.activeAt)[0]!;
  expect(lane).toBeTruthy();
  await moveToX(page, lane.x);
  await expect.poll(async () => stun(await read(page), ability), { timeout: 12000, intervals: [35] }).toBeGreaterThanOrEqual(54);
  expect((await read(page)).hero.hp).toBeLessThan(hero.hp);
});

test('Hồng Liệt spawns 1,140-HP soldiers and his ground eruption stuns in Phaser', async ({ page }) => {
  const ability = 'dung_nham_liet_dia';
  await enter(page, 'hong_liet', true);
  const { hero } = await read(page);
  await cast(page, ability);
  await expect.poll(async () => stun(await read(page), ability), { intervals: [35] }).toBeGreaterThanOrEqual(54);
  expect((await read(page)).hero.hp).toBeLessThan(hero.hp);
  await cast(page, 'thiet_ky_trieu_binh');
  await expect.poll(async () => (await read(page)).creeps.filter((e) => e.maxHp === 1140).length).toBe(4);
});

test('the Kim Luân solo preset opens with active disciples and real combat', async ({ page }) => {
  await joinWaiting(page, 'Solo Kim QA', undefined, '/?bossReview=kim_luan', 40000);
  await startTogether([page], ['vo_dang'], 40000);
  await expect.poll(async () => (await read(page)).hero.zoneId).toBe('kim_luan_shared');
  expect((await read(page)).hero.level).toBe(24);
  await expect.poll(async () => (await read(page)).creeps.some((creep) => creep.castAbilityId), {
    timeout: 10000,
  }).toBe(true);
  await expect(page.getByRole('combobox', { name: 'Chiêu VFX' })).toBeHidden();
});
