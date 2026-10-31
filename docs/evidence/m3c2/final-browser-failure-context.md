# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m3c2.spec.ts >> M3C2 normal three-school progression, shared dungeon farming, read-only builds, mana sustain and arena defense
- Location: tests\e2e\m3c2.spec.ts:18:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { joinWaiting, startTogether } from './pregame-helper.js';
  4   | import {
  5   |   read,
  6   |   hero,
  7   |   view,
  8   |   monitor,
  9   |   menu,
  10  |   close,
  11  |   loadout,
  12  |   upgrade,
  13  |   moveTo,
  14  |   enter,
  15  |   exit,
  16  | } from './m3c1-helpers.js';
  17  | const out = 'docs/evidence/m3c2';
  18  | test('M3C2 normal three-school progression, shared dungeon farming, read-only builds, mana sustain and arena defense', async ({
  19  |   browser,
  20  | }) => {
  21  |   const contexts = await Promise.all(
  22  |       [1280, 1280, 1920].map((w) =>
  23  |         browser.newContext({
  24  |           viewport: { width: w, height: w === 1920 ? 1080 : 720 },
  25  |         }),
  26  |       ),
  27  |     ),
  28  |     pages = await Promise.all(contexts.map((c) => c.newPage())),
  29  |     c = pages[2]!,
  30  |     errors = pages.map(monitor);
  31  |   await mkdir(out, { recursive: true });
  32  |   try {
  33  |     let room = '';
  34  |     for (let i = 0; i < 3; i++) {
  35  |       await joinWaiting(pages[i]!, 'Playable ' + i, room || undefined);
  36  |       if (!room) room = (await read(pages[i]!)).roomId;
  37  |     }
  38  |     await startTogether(pages, ['cai_bang', 'thien_son', 'vo_dang']);
  39  |     expect((await hero(c)).build.enabled).toBe(true);
  40  |     expect((await hero(c)).build.available).toBe(1);
  41  |     expect((await hero(c)).basicId).toBe('vo_dang_quyen');
  42  |     const builds = [
  43  |       ['hoa_van_chuong', '', '', ''],
  44  |       ['luc_duong_chuong', '', '', ''],
  45  |       ['duong_khi_kich', 'thai_cuc_than_cong', 'bat_quai_kiem_tran', ''],
  46  |     ];
  47  |     for (let i = 0; i < 3; i++) {
  48  |       const p = pages[i]!;
  49  |       await menu(p);
  50  |       await loadout(p, builds[i]!);
  51  |       await upgrade(p, builds[i]![0]!);
  52  |       if (p === c) {
  53  |         await expect(p.locator('[data-skill-card]')).toHaveCount(10);
  54  |         await expect(p.locator('#skill-management')).toContainText(
  55  |           'Thái Cực Tâm Pháp',
  56  |         );
  57  |         await p
  58  |           .getByLabel('Normal attack · A', { exact: true })
  59  |           .selectOption('vo_dang_kiem');
  60  |         await expect
  61  |           .poll(async () => (await hero(c)).basicId)
  62  |           .toBe('vo_dang_kiem');
  63  |         await expect(p.locator('#innate-summary')).toContainText('+3 MP');
  64  |         await expect(p.locator('#innate-summary')).toContainText('+0.15 MP/s');
  65  |         await expect(p.locator('#innate-summary')).toContainText(
  66  |           '+0.4% giảm hồi chiêu',
  67  |         );
  68  |         await p.screenshot({ path: `${out}/skill-menu-1920.png` });
  69  |       }
  70  |       await close(p);
  71  |     }
  72  |     for (const p of pages) await enter(p);
  73  |     for (let i = 0; i < 3; i++)
  74  |       await moveTo(pages[i]!, 500 + i * 10, 320 + i * 12);
  75  |     await menu(c);
  76  |     await expect(c.locator('#skill-readonly')).toContainText('Chỉ xem');
  77  |     await expect(c.locator('#basic-style')).toBeDisabled();
  78  |     await close(c);
  79  |     const ids = await Promise.all(
  80  |         pages.map(async (p) => (await read(p)).sessionId),
  81  |       ),
  82  |       end = Date.now() + 35000;
  83  |     while (Date.now() < end && (await hero(c)).level < 3) {
  84  |       for (const p of pages) {
  85  |         if ((await hero(p)).hp <= 0) continue;
  86  |         await p.locator('#game canvas').focus();
  87  |         if ((await hero(p)).qCooldown === 0) await p.keyboard.press('KeyQ');
  88  |         if ((await hero(p)).basicCooldown === 0) await p.keyboard.press('KeyA');
  89  |       }
  90  |       await c.waitForTimeout(200);
  91  |     }
  92  |     expect((await hero(c)).level).toBeGreaterThanOrEqual(3);
  93  |     expect((await hero(c)).xp).toBeGreaterThan(0);
  94  |     const farm = await read(c);
  95  |     for (const id of ids)
  96  |       expect(
  97  |         farm.events.some((e) => e.sourceId === id && e.kind === 'hit'),
> 98  |       ).toBe(true);
      |         ^ Error: expect(received).toBe(expected) // Object.is equality
  99  |     await c.screenshot({ path: `${out}/three-schools-dungeon.png` });
  100 |     for (const p of pages) {
  101 |       if ((await hero(p)).hp <= 0)
  102 |         await expect
  103 |           .poll(async () => (await hero(p)).zoneId, { timeout: 10000 })
  104 |           .toBe('arena');
  105 |       if ((await hero(p)).zoneId !== 'arena') {
  106 |         await p.locator('#game canvas').focus();
  107 |         await p.keyboard.press('ArrowLeft', { delay: 1200 });
  108 |         if ((await hero(p)).hp <= 0)
  109 |           await expect
  110 |             .poll(async () => (await hero(p)).zoneId, { timeout: 10000 })
  111 |             .toBe('arena');
  112 |         if ((await hero(p)).zoneId !== 'arena') await exit(p);
  113 |       }
  114 |     }
  115 |     await menu(c);
  116 |     await upgrade(c, 'thai_cuc_than_cong');
  117 |     await upgrade(c, 'bat_quai_kiem_tran');
  118 |     await close(c);
  119 |     await moveTo(c, 800, 750);
  120 |     await c.locator('#game canvas').focus();
  121 |     await c.keyboard.press('KeyW');
  122 |     await expect
  123 |       .poll(async () => (await hero(c)).statuses)
  124 |       .toContain('mana_shield');
  125 |     await c.keyboard.press('KeyE');
  126 |     await expect
  127 |       .poll(async () =>
  128 |         (await view(c)).skills.persistent.some(
  129 |           (v) => v.texture === 'bat_quai_kiem_tran_vfx',
  130 |         ),
  131 |       )
  132 |       .toBe(true);
  133 |     await expect
  134 |       .poll(async () => (await read(c)).state.defense.wave, { timeout: 35000 })
  135 |       .toBeGreaterThan(0);
  136 |     const defenseEnd = Date.now() + 20000;
  137 |     let defended = false;
  138 |     while (Date.now() < defenseEnd && !defended) {
  139 |       const s = await read(c),
  140 |         h = s.state.players[s.sessionId]!,
  141 |         e = Object.values(s.state.creeps)
  142 |           .filter((e) => e.invasionWave > 0 && e.hp > 0)
  143 |           .sort(
  144 |             (a, b) =>
  145 |               Math.hypot(a.x - h.x, a.y - h.y) -
  146 |               Math.hypot(b.x - h.x, b.y - h.y),
  147 |           )[0];
  148 |       if (e) {
  149 |         await moveTo(
  150 |           c,
  151 |           Math.max(120, Math.min(1450, e.x - 25)),
  152 |           Math.max(620, Math.min(900, e.y)),
  153 |         );
  154 |         await c.keyboard.press('ArrowRight', { delay: 40 });
  155 |         await c.keyboard.press('KeyA');
  156 |         if ((await hero(c)).qCooldown === 0) await c.keyboard.press('KeyQ');
  157 |       }
  158 |       const current = await read(c);
  159 |       defended = current.events.some(
  160 |         (ev) =>
  161 |           ev.sourceId === s.sessionId &&
  162 |           ev.kind === 'hit' &&
  163 |           (current.state.creeps[ev.targetId]?.invasionWave ?? 0) > 0,
  164 |       );
  165 |       await c.waitForTimeout(100);
  166 |     }
  167 |     expect(defended).toBe(true);
  168 |     await c.screenshot({ path: `${out}/three-schools-arena-defense.png` });
  169 |     await writeFile(
  170 |       `${out}/normal-observations.json`,
  171 |       JSON.stringify(
  172 |         { farm, final: await read(c), presentation: await view(c), errors },
  173 |         null,
  174 |         2,
  175 |       ),
  176 |     );
  177 |     expect(errors.flat()).toEqual([]);
  178 |   } finally {
  179 |     await Promise.all(contexts.map((c) => c.close()));
  180 |   }
  181 | });
  182 | test('M3C2 six-player natural combat: three schools keep effects owned, feet/pivots readable and rewards authoritative', async ({
  183 |   browser,
  184 | }) => {
  185 |   test.setTimeout(300000);
  186 |   const contexts = await Promise.all(
  187 |       Array.from({ length: 6 }, (_, i) =>
  188 |         browser.newContext({
  189 |           viewport:
  190 |             i === 0
  191 |               ? { width: 1920, height: 1080 }
  192 |               : { width: 640, height: 360 },
  193 |         }),
  194 |       ),
  195 |     ),
  196 |     pages = await Promise.all(contexts.map((c) => c.newPage())),
  197 |     errors = pages.map(monitor),
  198 |     schools = [
```