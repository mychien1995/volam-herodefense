import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { startTogether } from './pregame-helper.js';
import { m1Config } from '@volam/game-data';
import { read, hero, view, monitor, moveTo } from './m3c1-helpers.js';
const out = 'docs/evidence/m3c3-feedback';

async function pair(pages: Page[], schools: string[]) {
  let code = '';
  for (const [i, p] of pages.entries()) {
    await p.goto('/?debug=1&skillPreview=1');
    await p.locator('#pre-nickname').fill('Feedback ' + i);
    await p.getByRole('button', { name: 'Enter Game', exact: true }).click();
    if (code) {
      await p.getByLabel('Room code', { exact: true }).fill(code);
      await p
        .getByRole('button', { name: 'Join by code', exact: true })
        .click();
    } else
      await p.getByRole('button', { name: 'Create room', exact: true }).click();
    await expect(p.locator('#pregame .pre-title')).toHaveText('Waiting Lobby');
    if (!code) code = (await read(p)).roomId;
  }
  await startTogether(pages, schools);
}
async function equip(p: Page, id: string) {
  await p.locator('#preview-skill').selectOption(id);
  await p.locator('#preview-equip').click();
  await expect.poll(async () => (await hero(p)).qSkill).toBe(id);
  await expect
    .poll(async () => (await hero(p)).mana, { timeout: 20000 })
    .toBeGreaterThanOrEqual(m1Config.skillCatalogue![id]!.manaCost);
  await p.locator('[data-fixture=clear]').click();
  await p.locator('[data-fixture=targets]').click();
}
async function cast(p: Page) {
  await p.locator('#game canvas').focus();
  await p.keyboard.press('KeyQ');
}

test('feedback two-client fan return, bounded A cadence, traveling blades and wind loop frames', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const [a, b] = (await Promise.all(contexts.map((c) => c.newPage()))) as [
    Page,
    Page,
  ];
  const errors = [monitor(a), monitor(b)];
  try {
    await pair([a, b], ['thien_son', 'cai_bang']);
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    await a.keyboard.press('ArrowRight', { delay: 40 });
    await a.locator('[data-fixture=targets]').click();
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyA');
    await expect
      .poll(async () =>
        (await read(b)).events.some(
          (e) => e.kind === 'hit' && e.abilityId === 'thien_son_phien',
        ),
      )
      .toBe(true);
    await expect
      .poll(
        async () =>
          await b.evaluate(
            `window.__VOLAM__.snapshot().events.some(e=>e.stage==='projectile_return'&&e.abilityId==='thien_son_phien')`,
          ),
      )
      .toBe(true);
    await expect
      .poll(
        async () =>
          (await view(b)).skills.observedFrames.filter((f) =>
            f.startsWith('lien_hoa_phien_vfx:'),
          ).length,
      )
      .toBeGreaterThanOrEqual(2);
    await equip(a, 'truy_hon_dao');
    await cast(a);
    await expect
      .poll(
        async () =>
          await b.evaluate(
            `Object.values(window.__VOLAM__.snapshot().state.projectiles).filter(p=>p.abilityId==='truy_hon_dao').length`,
          ),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(
        async () =>
          (await view(b)).skills.observedFrames.filter((f) =>
            f.startsWith('truy_hon_dao_vfx:'),
          ).length,
      )
      .toBeGreaterThanOrEqual(2);
    await equip(a, 'bach_phien_phong_bao');
    await cast(a);
    await expect
      .poll(
        async () =>
          await b.evaluate(
            `Object.values(window.__VOLAM__.snapshot().state.projectiles).filter(p=>p.abilityId==='bach_phien_phong_bao').length`,
          ),
      )
      .toBeGreaterThanOrEqual(8);
    await expect
      .poll(async () =>
        (await view(b)).skills.persistent.some(
          (v) => v.texture === 'bach_phien_phong_bao_vfx',
        ),
      )
      .toBe(true);
    await expect
      .poll(
        async () =>
          (await view(a)).skills.observedFrames.filter((f) =>
            f.startsWith('bach_phien_phong_bao_character:'),
          ).length,
      )
      .toBeGreaterThanOrEqual(2);
    await mkdir(out, { recursive: true });
    await a.screenshot({ path: out + '/wind-runtime.png' });
    await expect
      .poll(
        async () =>
          (await view(b)).skills.persistent.some(
            (v) => v.texture === 'bach_phien_phong_bao_vfx',
          ),
        { timeout: 10000 },
      )
      .toBe(false);
    expect((await view(a)).zoom).toBe(1);
    expect((await view(a)).rotation).toBe(0);
    expect(errors).toEqual([[], []]);
    await writeFile(
      out + '/wind-observations.json',
      JSON.stringify(
        { caster: await view(a), observer: await view(b), errors },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('feedback two-client shield toggle and traveling Yin–Yang palms render while preserving state authority', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const [a, b] = (await Promise.all(contexts.map((c) => c.newPage()))) as [
    Page,
    Page,
  ];
  const errors = [monitor(a), monitor(b)];
  try {
    await pair([a, b], ['vo_dang', 'cai_bang']);
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    await a.keyboard.press('ArrowRight', { delay: 40 });
    await equip(a, 'thai_cuc_than_cong');
    await cast(a);
    const owner = (await read(a)).sessionId;
    await expect
      .poll(async () => (await read(b)).state.players[owner]!.statuses)
      .toContain('mana_shield');
    await expect
      .poll(async () =>
        (await view(b)).skills.persistent.some(
          (v) => v.texture === 'thai_cuc_than_cong_vfx',
        ),
      )
      .toBe(true);
    await cast(a);
    await expect
      .poll(async () => (await read(b)).state.players[owner]!.statuses)
      .not.toContain('mana_shield');
    await expect
      .poll(async () =>
        (await view(b)).skills.persistent.some(
          (v) => v.texture === 'thai_cuc_than_cong_vfx',
        ),
      )
      .toBe(false);
    for (const id of [
      'luong_nghi_thu',
      'huyen_am_chuong',
      'duong_khi_kich',
      'thai_cuc_tran',
    ]) {
      await equip(a, id);
      await cast(a);
      await expect
        .poll(
          async () =>
            (await view(b)).skills.observedFrames.filter((f) =>
              f.startsWith(id + '_vfx:'),
            ).length,
        )
        .toBeGreaterThanOrEqual(2);
    }
    await mkdir(out, { recursive: true });
    await a.screenshot({ path: out + '/yin-yang-runtime.png' });
    expect(errors).toEqual([[], []]);
    await writeFile(
      out + '/yin-yang-observations.json',
      JSON.stringify(
        {
          caster: await view(a),
          observer: await view(b),
          state: await read(b),
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('feedback fire fan and forward ultimate remain visible on the observer', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const [a, b] = (await Promise.all(contexts.map((c) => c.newPage()))) as [
    Page,
    Page,
  ];
  const errors = [monitor(a), monitor(b)];
  try {
    await pair([a, b], ['cai_bang', 'thieu_lam']);
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    await a.keyboard.press('ArrowRight', { delay: 40 });
    for (const id of [
      'hoa_van_chuong',
      'hang_long_hoa_vu',
      'hoanh_tao_bong',
      'pha_giap_bong',
      'cam_long_cong',
      'thien_ha_vo_cau',
    ]) {
      await equip(a, id);
      await cast(a);
      await expect
        .poll(
          async () =>
            (await view(b)).skills.observedFrames.filter((f) =>
              f.startsWith(id + '_vfx:'),
            ).length,
          { message: id },
        )
        .toBeGreaterThanOrEqual(2);
      if (id === 'hang_long_hoa_vu')
        await a.screenshot({ path: out + '/fire-wave-runtime.png' });
      await expect.poll(async () => (await hero(a)).pose).not.toBe('cast');
    }
    await b.keyboard.press('ArrowRight', { delay: 40 });
    for (const id of [
      'la_han_quyen',
      'vi_da_quyen',
      'dai_luc_kim_cuong_chuong',
    ]) {
      await equip(b, id);
      await cast(b);
      await expect
        .poll(
          async () =>
            (await view(a)).skills.observedFrames.filter((f) =>
              f.startsWith(id + '_vfx:'),
            ).length,
          { message: id },
        )
        .toBeGreaterThanOrEqual(2);
      await expect
        .poll(
          async () =>
            (await view(b)).skills.observedFrames.filter((f) =>
              f.startsWith(id + '_character:'),
            ).length,
          { message: id },
        )
        .toBeGreaterThanOrEqual(2);
      await expect.poll(async () => (await hero(b)).pose).not.toBe('cast');
    }
    await b.screenshot({ path: out + '/gold-runtime.png' });
    expect(errors).toEqual([[], []]);
    await writeFile(
      out + '/fire-observations.json',
      JSON.stringify(
        { caster: await view(a), observer: await view(b), errors },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
