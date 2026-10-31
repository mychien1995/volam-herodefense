import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { m1Config, skillArt } from '@volam/game-data';
import { startTogether } from './pregame-helper.js';
interface Actor {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mana: number;
  xp: number;
  gold: number;
  zoneId: string;
  qSkill: string;
  qCooldown: number;
  wCooldown: number;
  eCooldown: number;
  rCooldown: number;
  basicCooldown: number;
  statuses: string;
  pose: string;
  lastSequence: number;
}
interface Snapshot {
  roomId: string;
  sessionId: string;
  state: {
    tick: number;
    players: Record<string, Actor>;
    creeps: Record<string, Actor & { invasionWave: number }>;
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
interface Presentation {
  zoneId: string;
  camera: { x: number; y: number };
  skills: {
    loadedComponents: number;
    registeredAnimations: number;
    played: string[];
    observedFrames: string[];
    persistent: Array<{ id: string; texture: string }>;
    projectiles: Array<{ id: string; texture: string }>;
  };
  interactions: Array<{ id: string; x: number; y: number }>;
}
const read = (p: Page): Promise<Snapshot> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<Presentation> =>
  p.evaluate('window.__VOLAM__.presentation()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
};
const out = 'docs/evidence/m3a';
async function join(p: Page, name: string, room?: string) {
  await p.goto('/?debug=1&skillPreview=1');
  await p.locator('#pre-nickname').fill(name);
  await p.getByRole('button', { name: 'Vào game', exact: true }).click();
  if (room) {
    await p
      .locator('#pregame')
      .getByLabel('Mã phòng', { exact: true })
      .fill(room);
    await p.getByRole('button', { name: 'Vào bằng mã', exact: true }).click();
  } else
    await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
}
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
async function walk(p: Page, key: string, ms: number) {
  await p.locator('#game canvas').focus();
  await p.keyboard.down(key);
  await p.waitForTimeout(ms);
  await p.keyboard.up(key);
  await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
}
async function equip(p: Page, ids: string[]) {
  await p.locator('[data-menu=settings]').click();
  await p.locator('#dialog-content [data-menu=skills]').click();
  for (let i = 0; i < 4; i++)
    await p
      .getByLabel(`Test skill ${'QWER'[i]}`, { exact: true })
      .selectOption(ids[i] ?? '');
  await p.locator('#apply-test-skills').click();
  await expect.poll(async () => (await hero(p)).qSkill).toBe(ids[0]);
}
async function enter(p: Page, access: 'shared' | 'private') {
  await p.locator('[data-menu=dungeons]').click();
  await p
    .getByRole('radio', {
      name: access === 'shared' ? 'Chung' : 'Riêng',
      exact: true,
    })
    .click();
  await p.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(p)).zoneId).not.toBe('arena');
  await expect(p.locator('#game canvas')).toBeFocused();
}
async function exit(p: Page) {
  const info = await view(p),
    portal = info.interactions.find((x) => x.id === 'dungeon-exit')!,
    canvas = p.locator('#game canvas'),
    box = (await canvas.boundingBox())!;
  const scale = await canvas.evaluate(
    (n) => n.clientWidth / (n as HTMLCanvasElement).width,
  );
  await p.mouse.click(
    box.x + (portal.x - info.camera.x) * scale,
    box.y + (portal.y - 20 - info.camera.y) * scale,
  );
  await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
}
async function faceNearest(p: Page) {
  const s = await read(p),
    h = s.state.players[s.sessionId]!,
    e = Object.values(s.state.creeps)
      .filter((e) => e.hp > 0)
      .sort(
        (a, b) =>
          Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y),
      )[0]!;
  const dx = e.x - h.x,
    dy = e.y - h.y,
    keys =
      Math.min(Math.abs(dx), Math.abs(dy)) /
        Math.max(Math.abs(dx), Math.abs(dy)) >
      0.4
        ? [
            dx < 0 ? 'ArrowLeft' : 'ArrowRight',
            dy < 0 ? 'ArrowUp' : 'ArrowDown',
          ]
        : [
            Math.abs(dx) >= Math.abs(dy)
              ? dx < 0
                ? 'ArrowLeft'
                : 'ArrowRight'
              : dy < 0
                ? 'ArrowUp'
                : 'ArrowDown',
          ];
  await p.locator('#game canvas').focus();
  const opposite: Record<string, string> = {
    ArrowLeft: 'ArrowRight',
    ArrowRight: 'ArrowLeft',
    ArrowUp: 'ArrowDown',
    ArrowDown: 'ArrowUp',
  };
  for (const k of keys) await p.keyboard.down(opposite[k]!);
  await p.waitForTimeout(100);
  await Promise.all(keys.map((k) => p.keyboard.up(opposite[k]!)));
  for (const k of keys) await p.keyboard.down(k);
  await p.waitForTimeout(50);
  const release =
    keys.length === 2 && Math.abs(dx) >= Math.abs(dy)
      ? [keys[1]!, keys[0]!]
      : keys;
  await Promise.all(release.map((k) => p.keyboard.up(k)));
}

test('all ten supplied skill animations load, animate and are observed by a second player', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await mkdir(out, { recursive: true });
    await join(a, 'Skill Caster');
    await join(b, 'Skill Observer', (await read(a)).roomId);
    await startTogether([a, b]);
    await Promise.all([walk(a, 'ArrowDown', 1450), walk(b, 'ArrowDown', 1450)]);
    await expect(a.locator('#skill-preview')).toBeVisible();
    expect((await view(a)).skills.loadedComponents).toBe(
      skillArt.assets.length,
    );
    expect((await view(a)).skills.registeredAnimations).toBe(
      skillArt.assets.reduce((n, a) => n + a.animations.length, 0),
    );
    const evidence = [];
    for (const skill of Object.values(m1Config.skillCatalogue!).filter(
      (a) => m1Config.progression!.skills[a.id]!.schoolId === 'cai_bang',
    )) {
      await a.locator('#preview-skill').selectOption(skill.id);
      await a.locator('#preview-equip').click();
      await expect.poll(async () => (await hero(a)).qSkill).toBe(skill.id);
      await expect
        .poll(async () => (await hero(a)).mana, { timeout: 15000 })
        .toBeGreaterThanOrEqual(skill.manaCost);
      const before = await read(a),
        mana = before.state.players[before.sessionId]!.mana,
        last = (await read(b)).events.at(-1)?.id ?? 0;
      await a.locator('#game canvas').focus();
      await a.keyboard.press('KeyQ');
      await expect
        .poll(async () => (await hero(a)).qCooldown)
        .toBeGreaterThan(0);
      await expect
        .poll(async () =>
          (await read(b)).events.some(
            (e) => e.id > last && e.kind === 'cast' && e.abilityId === skill.id,
          ),
        )
        .toBe(true);
      await a.waitForTimeout(220);
      await a.screenshot({ path: `${out}/${skill.id}.png` });
      if (skill.id === 'hang_long_hoa_vu')
        await b.screenshot({ path: `${out}/observer-1920.png` });
      await a.waitForTimeout(430);
      const after = await read(a);
      expect(after.state.players[after.sessionId]!.mana).toBeLessThanOrEqual(
        mana -
          skill.manaCost +
          ((after.state.tick - before.state.tick) * m1Config.manaRegen) /
            m1Config.tickRate +
          0.4,
      );
      await expect
        .poll(async () =>
          (await view(b)).skills.played.includes(`${skill.id}_character:cast`),
        )
        .toBe(true);
      evidence.push({
        id: skill.id,
        manaBefore: mana,
        manaAfter: (await hero(a)).mana,
        observer: (await view(b)).skills.played.filter((k) =>
          k.includes(skill.id),
        ),
      });
    }
    const frames = [
      ...new Set([
        ...(await view(a)).skills.observedFrames,
        ...(await view(b)).skills.observedFrames,
      ]),
    ];
    for (const id of Object.keys(m1Config.skillCatalogue!).filter(
      (id) => m1Config.progression!.skills[id]!.schoolId === 'cai_bang',
    ))
      expect(
        frames.filter((f) => f.startsWith(`${id}_character:`)).length,
      ).toBeGreaterThanOrEqual(2);
    await writeFile(
      `${out}/live-frame-observations.json`,
      JSON.stringify(
        {
          evidence,
          caster: (await view(a)).skills,
          observer: (await view(b)).skills,
        },
        null,
        2,
      ),
    );
    await a.setViewportSize({ width: 944, height: 466 });
    // ResizeObserver and Phaser's render resize complete after the DOM layout.
    // Wait for the real canvas, rather than capturing its previous framebuffer.
    await expect
      .poll(() =>
        a.locator('#game canvas').evaluate((node) => {
          const canvas = node as HTMLCanvasElement;
          return [
            canvas.width,
            canvas.height,
            canvas.clientWidth,
            canvas.clientHeight,
          ];
        }),
      )
      .toEqual([944, 466, 944, 466]);
    await a.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const panel = (await a.locator('#skill-preview').boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y + panel.height).toBeLessThanOrEqual(466);
    await a.screenshot({ path: `${out}/preview-944.png` });
    await a.setViewportSize({ width: 1920, height: 1080 });
    await expect
      .poll(() =>
        a.locator('#game canvas').evaluate((node) => {
          const canvas = node as HTMLCanvasElement;
          return [
            canvas.width,
            canvas.height,
            canvas.clientWidth,
            canvas.clientHeight,
          ];
        }),
      )
      .toEqual([960, 540, 1920, 1080]);
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('two Cái Bang players cast into shared dungeon enemies and clean a buff on physical exit', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await mkdir(out, { recursive: true });
    await join(a, 'Dungeon Caster');
    await join(b, 'Dungeon Partner', (await read(a)).roomId);
    await startTogether([a, b]);
    await equip(a, [
      'hoa_van_chuong',
      'cuong_long_loan_vu',
      'khang_long_huu_hoi',
      'thien_ha_vo_cau',
    ]);
    await equip(b, [
      'hoa_van_chuong',
      'phi_long_tai_thien',
      'hoanh_tao_bong',
      'cam_long_cong',
    ]);
    await enter(a, 'shared');
    await enter(b, 'shared');
    expect((await hero(a)).zoneId).toBe((await hero(b)).zoneId);
    await Promise.all([
      walk(a, 'ArrowRight', 1630),
      walk(b, 'ArrowRight', 1630),
    ]);
    await Promise.all([a.keyboard.press('KeyQ'), b.keyboard.press('KeyQ')]);
    await expect
      .poll(async () => (await view(b)).skills.projectiles.length)
      .toBeGreaterThan(0);
    await a.screenshot({ path: `${out}/shared-projectiles.png` });
    await a.waitForTimeout(800);
    await a.keyboard.press('KeyW');
    await b.keyboard.press('KeyW');
    await a.waitForTimeout(600);
    const id = (await read(a)).sessionId,
      other = (await read(b)).sessionId;
    const hits = (await read(b)).events.filter((e) => e.kind === 'hit');
    expect(hits.some((e) => e.sourceId === id)).toBe(true);
    expect(hits.some((e) => e.sourceId === other)).toBe(true);
    await expect.poll(async () => (await hero(a)).xp).toBeGreaterThan(0);
    await a.screenshot({ path: `${out}/dungeon-impact.png` });
    // Retreat to the physical exit before enabling a self buff, with actual arrows.
    const x = (await hero(a)).x;
    await walk(a, 'ArrowLeft', Math.max(0, ((x - 180) / 160) * 1000));
    await expect
      .poll(async () => (await hero(a)).mana)
      .toBeGreaterThanOrEqual(20);
    await a.keyboard.press('KeyE');
    await expect.poll(async () => (await hero(a)).eCooldown).toBeGreaterThan(0);
    await expect
      .poll(async () => (await hero(a)).statuses)
      .toContain('crit_buff');
    await expect
      .poll(async () =>
        (await view(a)).skills.persistent.some(
          (v) => v.texture === 'khang_long_huu_hoi_vfx',
        ),
      )
      .toBe(true);
    await exit(a);
    expect((await hero(a)).statuses).toBe('[]');
    await expect
      .poll(async () => (await view(a)).skills.persistent.length)
      .toBe(0);
    const last = (await read(a)).events.at(-1)?.id ?? 0;
    await b.locator('#game canvas').focus();
    await b.keyboard.press('KeyE');
    await a.waitForTimeout(400);
    expect(
      (await read(a)).events.some(
        (e) => e.id > last && e.sourceId === other && e.kind === 'cast',
      ),
    ).toBe(false);
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('projectile and control skills damage arena invaders with shared authoritative feedback', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await mkdir(out, { recursive: true });
    await join(a, 'Lane Caster');
    await join(b, 'Lane Partner', (await read(a)).roomId);
    await startTogether([a, b]);
    await equip(a, [
      'hoa_van_chuong',
      'cuong_long_loan_vu',
      'hoanh_tao_bong',
      'truy_phong_bong',
    ]);
    await equip(b, [
      'hoa_van_chuong',
      'phi_long_tai_thien',
      'cam_long_cong',
      'thien_ha_vo_cau',
    ]);
    await Promise.all([walk(a, 'ArrowLeft', 1650), walk(b, 'ArrowLeft', 1650)]);
    await expect
      .poll(
        async () =>
          Object.values((await read(a)).state.creeps).filter(
            (e) => e.invasionWave === 1 && e.hp > 0,
          ).length,
        { timeout: 35000 },
      )
      .toBeGreaterThan(0);
    await expect
      .poll(
        async () => {
          const h = await hero(a);
          return Math.min(
            ...Object.values((await read(a)).state.creeps)
              .filter((e) => e.invasionWave === 1 && e.hp > 0)
              .map((e) => Math.hypot(e.x - h.x, e.y - h.y)),
          );
        },
        { timeout: 15000 },
      )
      .toBeLessThan(100);
    await Promise.all([a.keyboard.press('KeyE'), b.keyboard.press('KeyE')]);
    for (let n = 0; n < 5; n++)
      await Promise.all([a.keyboard.press('KeyQ'), b.keyboard.press('KeyQ')]);
    await a.waitForTimeout(1000);
    await a.keyboard.press('KeyW');
    await b.keyboard.press('KeyW');
    await a.waitForTimeout(800);
    const s = await read(b),
      first = (await read(a)).sessionId,
      second = s.sessionId,
      targets = (who: string) =>
        new Set(
          s.events
            .filter(
              (e) =>
                e.kind === 'hit' &&
                e.sourceId === who &&
                e.targetId.includes('invasion_'),
            )
            .map((e) => e.targetId),
        );
    expect([...targets(first)].some((id) => targets(second).has(id))).toBe(
      true,
    );
    expect(
      s.events.filter(
        (e) =>
          e.kind === 'cast' &&
          e.sourceId === first &&
          e.abilityId === 'hoa_van_chuong',
      ),
    ).toHaveLength(1);
    expect(
      Object.values(s.state.creeps).some(
        (e) => e.invasionWave === 1 && e.hp < e.maxHp,
      ),
    ).toBe(true);
    await a.screenshot({ path: `${out}/invasion-combat.png` });
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('a real enemy kills a player during a skill channel and both clients clean the effect', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await mkdir(out, { recursive: true });
    await join(a, 'Channel Defender');
    await join(b, 'Death Observer', (await read(a)).roomId);
    await startTogether([a, b]);
    await equip(a, ['thien_ha_vo_cau', '', '', '']);
    // Lure a practice creep south; the observer retreats left. No state/HP injection.
    await walk(b, 'ArrowLeft', 1100);
    await walk(b, 'ArrowDown', 600);
    await walk(a, 'ArrowDown', 940);
    await a.locator('#game canvas').focus();
    await expect
      .poll(
        async () => {
          const h = await hero(a);
          return h.hp > 0 && h.hp <= 6;
        },
        { timeout: 75000, intervals: [30] },
      )
      .toBe(true);
    // Its next normal attack occurs inside the one-second channel, before the finisher.
    const low = await read(a),
      h = low.state.players[low.sessionId]!,
      near = Object.values(low.state.creeps).filter(
        (e) => e.hp > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 36,
      ).length;
    if (near === 1) await a.waitForTimeout(700);
    await a.keyboard.press('KeyQ');
    const id = (await read(a)).sessionId;
    await expect
      .poll(async () => (await read(b)).state.players[id]!.statuses, {
        intervals: [20],
      })
      .toContain('channel');
    await expect
      .poll(async () => (await read(b)).state.players[id]!.hp, {
        timeout: 4000,
      })
      .toBe(0);
    expect((await hero(a)).hp).toBe(0);
    await expect
      .poll(async () =>
        (await view(b)).skills.persistent.some((v) =>
          v.id.startsWith(id + ':'),
        ),
      )
      .toBe(false);
    const death = (await read(b)).events
      .filter((e) => e.kind === 'death' && e.targetId === id)
      .at(-1)!;
    expect(death).toBeDefined();
    await a.waitForTimeout(600);
    expect(
      (await read(b)).events.some(
        (e) => e.id > death.id && e.kind === 'hit' && e.sourceId === id,
      ),
    ).toBe(false);
    await b.screenshot({ path: `${out}/channel-death-cleanup.png` });
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('staff control, armor break, stun and the heavy finisher use their own supplied effects', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await mkdir(out, { recursive: true });
    await join(a, 'Staff Caster');
    await join(b, 'Fire Partner', (await read(a)).roomId);
    await startTogether([a, b]);
    await equip(a, [
      'pha_giap_bong',
      'hoanh_tao_bong',
      'cam_long_cong',
      'truy_phong_bong',
    ]);
    await equip(b, [
      'thien_ha_vo_cau',
      'khang_long_huu_hoi',
      'phi_long_tai_thien',
      'hang_long_hoa_vu',
    ]);
    await walk(b, 'ArrowLeft', 1000);
    await walk(a, 'ArrowRight', 500);
    await expect
      .poll(
        async () => {
          const h = await hero(a);
          return Math.min(
            ...Object.values((await read(a)).state.creeps)
              .filter((e) => e.hp > 0)
              .map((e) => Math.hypot(e.x - h.x, e.y - h.y)),
          );
        },
        { timeout: 12000 },
      )
      .toBeLessThan(60);
    await faceNearest(a);
    await a.keyboard.press('KeyQ');
    await expect
      .poll(async () =>
        Object.values((await read(a)).state.creeps).some((e) =>
          e.statuses.includes('defense_break'),
        ),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        (await view(b)).skills.persistent.some(
          (v) => v.texture === 'pha_giap_bong_vfx',
        ),
      )
      .toBe(true);
    await a.screenshot({ path: `${out}/staff-armor-break.png` });
    await faceNearest(a);
    await a.keyboard.press('KeyE');
    await expect.poll(async () => (await hero(a)).eCooldown).toBeGreaterThan(0);
    await expect
      .poll(async () =>
        Object.values((await read(a)).state.creeps).some(
          (e) =>
            e.statuses.includes('disarm') && e.statuses.includes('silence'),
        ),
      )
      .toBe(true);
    await a.screenshot({ path: `${out}/staff-pull-control.png` });
    await faceNearest(a);
    await a.keyboard.press('KeyR');
    await expect
      .poll(
        async () =>
          Object.values((await read(a)).state.creeps).some((e) =>
            e.statuses.includes('stun'),
          ),
        { intervals: [30] },
      )
      .toBe(true);
    await expect
      .poll(
        async () =>
          (await view(b)).skills.persistent.some(
            (v) => v.texture === 'truy_phong_bong_vfx',
          ),
        { intervals: [30] },
      )
      .toBe(true);
    await a.screenshot({ path: `${out}/staff-dash-stun.png` });
    // Re-approach with real arrows after the forced dash, then sweep the remaining pack.
    const ax = (await hero(a)).x;
    await walk(
      a,
      ax < 820 ? 'ArrowRight' : 'ArrowLeft',
      (Math.abs(820 - ax) / 160) * 1000,
    );
    await faceNearest(a);
    await a.keyboard.press('KeyW');
    await expect
      .poll(async () =>
        (await view(b)).skills.played.some((k) =>
          k.includes('hoanh_tao_bong_vfx:sweep'),
        ),
      )
      .toBe(true);
    await walk(b, 'ArrowRight', 1100);
    await b.keyboard.press('KeyW');
    await expect
      .poll(async () =>
        (await view(a)).skills.persistent.some(
          (v) => v.texture === 'khang_long_huu_hoi_vfx',
        ),
      )
      .toBe(true);
    await b.keyboard.press('KeyQ');
    await expect
      .poll(
        async () =>
          (await view(a)).skills.persistent.some(
            (v) => v.texture === 'thien_ha_vo_cau_vfx',
          ),
        { intervals: [30] },
      )
      .toBe(true);
    await b.screenshot({ path: `${out}/staff-whirlwind.png` });
    await expect
      .poll(async () =>
        (await read(a)).events.some(
          (e) =>
            e.kind === 'pulse' &&
            e.abilityId === 'thien_ha_vo_cau' &&
            (e as { stage?: string }).stage === 'finisher',
        ),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        (await view(a)).skills.played.some((k) =>
          k.includes('thien_ha_vo_cau_vfx:impact'),
        ),
      )
      .toBe(true);
    // Respawned practice enemies exercise the large piercing wave's confirmed impacts.
    await expect
      .poll(
        async () =>
          Object.values((await read(b)).state.creeps).some((e) => e.hp > 0),
        { timeout: 12000 },
      )
      .toBe(true);
    await expect
      .poll(async () => (await hero(b)).mana, { timeout: 12000 })
      .toBeGreaterThanOrEqual(45);
    await expect
      .poll(
        async () => {
          const h = await hero(b);
          return Math.min(
            ...Object.values((await read(b)).state.creeps)
              .filter((e) => e.hp > 0)
              .map((e) => Math.hypot(e.x - h.x, e.y - h.y)),
          );
        },
        { timeout: 12000 },
      )
      .toBeLessThan(80);
    await faceNearest(b);
    await b.keyboard.press('KeyR');
    await expect
      .poll(async () =>
        (await view(a)).skills.played.some((k) =>
          k.includes('hang_long_hoa_vu_vfx:impact'),
        ),
      )
      .toBe(true);
    await writeFile(
      `${out}/staff-live-observations.json`,
      JSON.stringify(
        { a: await view(a), b: await view(b), events: (await read(a)).events },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await writeFile(
      `${out}/staff-last-state.json`,
      JSON.stringify(
        {
          a: await read(a),
          b: await read(b),
          viewA: await view(a),
          viewB: await view(b),
        },
        null,
        2,
      ),
    );
    await ca.close();
    await cb.close();
  }
});
