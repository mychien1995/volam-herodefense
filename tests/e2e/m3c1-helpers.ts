import { expect, type Page } from '@playwright/test';
export interface Actor {
  x: number;
  y: number;
  fx: number;
  fy: number;
  hp: number;
  mana: number;
  level: number;
  xp: number;
  zoneId: string;
  pose: string;
  schoolId: string;
  basicId: string;
  basicCooldown: number;
  qCooldown: number;
  qSkill: string;
  wSkill: string;
  eSkill: string;
  rSkill: string;
  lastSequence: number;
  statuses: string;
  build: {
    enabled: boolean;
    revision: number;
    ranks: Record<string, number>;
    available: number;
    earned: number;
    stats: { movementSpeed: number; attackSpeed: number };
  };
}
export interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<string, Actor>;
    creeps: Record<string, Actor & { invasionWave: number }>;
    defense: { wave: number };
  };
  events: Array<{
    id: number;
    kind: string;
    sourceId: string;
    targetId: string;
    abilityId: string;
    damage: number;
  }>;
}
export interface Presentation {
  camera: { x: number; y: number };
  zoom: number;
  rotation: number;
  actors: Array<{
    id: string;
    texture: string;
    animation: string;
    frame: string;
    origin: number[];
    scale: number[];
    x: number;
    y: number;
    depth: number;
  }>;
  skills: {
    loadedComponents: number;
    registeredAnimations: number;
    played: string[];
    observedFrames: string[];
    persistent: Array<{ id: string; texture: string; x: number; y: number }>;
  };
  interactions: Array<{ id: string; x: number; y: number }>;
}
export const read = (p: Page) =>
  p.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
export const view = (p: Page) =>
  p.evaluate<Presentation>('window.__VOLAM__.presentation()');
export const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
};
export function monitor(p: Page) {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  p.on('response', (r) => {
    if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
  });
  return errors;
}
export async function menu(p: Page) {
  await p.locator('.loadout-toggle').click();
  await expect(p.locator('#skill-management')).toBeVisible();
  if ((await p.locator('#skill-mode').inputValue()) === 'default') {
    await p.locator('#skill-mode').selectOption('custom');
    await expect
      .poll(async () => p.locator('#skill-mode').inputValue())
      .toBe('custom');
    await p.locator('#reset-skills').click();
    await expect(p.locator('#reset-skills')).toBeDisabled();
  }
}
export async function close(p: Page) {
  await p.keyboard.press('Escape');
  await expect(p.getByRole('dialog')).toBeHidden();
  await expect(p.locator('#game canvas')).toBeFocused();
}
export async function loadout(p: Page, ids: string[]) {
  for (let i = 0; i < 4; i++)
    await p.locator('#loadout-' + 'qwer'[i]).selectOption(ids[i] ?? '');
  const rev = (await hero(p)).build.revision;
  await p.locator('#apply-loadout').click();
  await expect
    .poll(async () => (await hero(p)).build.revision)
    .toBeGreaterThan(rev);
}
export async function upgrade(p: Page, id: string) {
  const rev = (await hero(p)).build.revision;
  await p.locator('[data-upgrade=' + id + ']').click();
  await expect
    .poll(async () => (await hero(p)).build.revision)
    .toBeGreaterThan(rev);
}
export async function moveTo(p: Page, x: number, y: number) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  const xa = ['x', x, 'ArrowLeft', 'ArrowRight'] as const,
    ya = ['y', y, 'ArrowUp', 'ArrowDown'] as const;
  for (const [axis, target, negative, positive] of (await hero(p)).zoneId ===
  'arena'
    ? [ya, xa]
    : [xa, ya]) {
    const end = Date.now() + 25000;
    while (Date.now() < end) {
      const h = await hero(p),
        d = target - h[axis];
      if (Math.abs(d) <= 10) break;
      const speed = h.build.enabled ? h.build.stats.movementSpeed : 160;
      await p.keyboard.press(d < 0 ? negative : positive, {
        delay: Math.min(900, Math.max(70, (Math.abs(d) * 1000) / speed - 30)),
      });
      await expect
        .poll(async () => (await hero(p)).lastSequence)
        .toBeGreaterThan(h.lastSequence);
      await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
    }
    const final = await hero(p);
    expect(
      Math.abs(final[axis] - target),
      JSON.stringify({ axis, target, hero: final }),
    ).toBeLessThanOrEqual(10);
  }
}
export async function enter(p: Page) {
  await p.locator('[data-menu=dungeons]').click();
  await p.getByRole('radio', { name: 'Chung', exact: true }).click();
  await p.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(p)).zoneId).not.toBe('arena');
}
export async function exit(p: Page) {
  await moveTo(p, 160, 320);
  await p.keyboard.press('Space');
  await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
}
