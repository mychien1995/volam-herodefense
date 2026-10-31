# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forest-natural.spec.ts >> 6 clients: natural shared Forest spawns and clears two authoritative waves
- Location: tests\e2e\forest-natural.spec.ts:175:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 12
Received: 0

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdirSync, writeFileSync } from 'node:fs';
  3   | import { joinWaiting, startTogether } from './pregame-helper.js';
  4   | import { forestRoster, creepDungeon, m1Config } from '@volam/game-data';
  5   | 
  6   | const root =
  7   |   process.env['FOREST_EVIDENCE_DIR'] ??
  8   |   'docs/evidence/forest-natural-2026-11-01';
  9   | // The existing debug bridge is read-only: all actions below are real menu/key input.
  10  | const read = (p: Page): Promise<any> =>
  11  |   p.evaluate('window.__VOLAM__.snapshot()');
  12  | const view = (p: Page): Promise<any> =>
  13  |   p.evaluate('window.__VOLAM__.presentation()');
  14  | async function hero(p: Page) {
  15  |   const s = await read(p);
  16  |   return s.state.players[s.sessionId];
  17  | }
  18  | async function enter(p: Page, access: 'private' | 'shared') {
  19  |   await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  20  |   await p
  21  |     .getByRole('radio', {
  22  |       name: access === 'shared' ? 'Chung' : 'Riêng',
  23  |       exact: true,
  24  |     })
  25  |     .click();
  26  |   await p.locator('#enter-dungeon').click();
  27  |   await expect.poll(async () => (await hero(p)).zoneId).toMatch(/^forest_/);
  28  |   await expect(p.locator('#zone-status')).toContainText('hình ảnh đã duyệt');
  29  |   await expect(p.locator('#zone-status')).not.toContainText('hình tạm');
  30  | }
  31  | async function ranged(p: Page) {
  32  |   await p.locator('[data-menu=settings]').click();
  33  |   await p.locator('#dialog-content [data-menu=skills]').click();
  34  |   await p.locator('#skill-branch').selectOption('cai_bang_chuong');
  35  |   await expect
  36  |     .poll(async () => (await hero(p)).basicId)
  37  |     .toBe('cai_bang_chuong');
  38  |   await p.keyboard.press('Escape');
  39  | }
  40  | async function move(p: Page, x: number, y: number) {
  41  |   await p.bringToFront();
  42  |   await p.locator('#game canvas').focus();
  43  |   for (const [axis, target, neg, pos] of [
  44  |     ['y', y, 'ArrowUp', 'ArrowDown'],
  45  |     ['x', x, 'ArrowLeft', 'ArrowRight'],
  46  |   ] as const) {
  47  |     for (let n = 0; n < 55; n++) {
  48  |       const h = await hero(p),
  49  |         delta = target - h[axis];
  50  |       if (Math.abs(delta) <= 8) break;
  51  |       const key = delta < 0 ? neg : pos;
  52  |       await p.keyboard.down(key);
  53  |       try {
  54  |         await p.waitForTimeout(
  55  |           Math.min(250, Math.max(40, Math.abs(delta) * 5 - 20)),
  56  |         );
  57  |         await expect
  58  |           .poll(async () => (await hero(p)).lastSequence, { intervals: [30] })
  59  |           .toBeGreaterThan(h.lastSequence);
  60  |       } finally {
  61  |         await p.keyboard.up(key);
  62  |       }
  63  |       await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
  64  |     }
  65  |     expect(
  66  |       Math.abs((await hero(p))[axis] - target),
  67  |       `natural walk ${axis}=${target}`,
  68  |     ).toBeLessThanOrEqual(8);
  69  |   }
  70  | }
  71  | const creeps = (s: any, zone: string): Array<[string, any]> =>
  72  |   Object.entries(s.state.creeps).filter(([, c]: any) => c.zoneId === zone);
  73  | async function wave(p: Page, zone: string, number: number, count: number) {
  74  |   await expect
  75  |     .poll(async () => (await read(p)).state.dungeons[zone]?.wave)
  76  |     .toBe(number);
> 77  |   await expect.poll(async () => creeps(await read(p), zone).length).toBe(count);
      |                                                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  78  |   const s = await read(p),
  79  |     actors = creeps(s, zone);
  80  |   expect(actors.map(([, c]) => c.archetypeId)).toEqual(
  81  |     Array.from(
  82  |       { length: count },
  83  |       (_, i) =>
  84  |         forestRoster[((number === 1 ? 0 : 3) + i) % forestRoster.length],
  85  |     ),
  86  |   );
  87  |   await expect
  88  |     .poll(async () => {
  89  |       const v = await view(p);
  90  |       return actors.every(([id, c]) =>
  91  |         v.actors.some(
  92  |           (a: any) =>
  93  |             a.id === id &&
  94  |             a.texture === 'forest_' + c.archetypeId &&
  95  |             a.artStatus === 'approved',
  96  |         ),
  97  |       );
  98  |     })
  99  |     .toBe(true);
  100 |   for (const a of (await view(p)).actors.filter((a: any) =>
  101 |     actors.some(([id]) => a.id === id),
  102 |   )) {
  103 |     expect(a.origin).toEqual([0.5, 106 / 128]);
  104 |     expect(a.scale).toEqual([1, 1]);
  105 |     expect(a.depth).toBe(a.y);
  106 |     expect(a.texture).not.toBe('creep_outlaw');
  107 |   }
  108 |   return actors.map(([id, c]) => ({ id, type: c.archetypeId, maxHp: c.maxHp }));
  109 | }
  110 | async function fight(pages: Page[], zone: string, number: number) {
  111 |   // Independent manual A pulses, bounded by real server cadence. No stat/HP/AI edits.
  112 |   await Promise.all(pages.map((p) => p.locator('#game canvas').focus()));
  113 |   let done = false;
  114 |   const pumps = pages.map(async (p, i) => {
  115 |     while (!done) {
  116 |       const h = await hero(p);
  117 |       if (h.zoneId !== zone)
  118 |         throw Error(
  119 |           'Party left the natural combat zone before clear: ' + h.zoneId,
  120 |         );
  121 |       if (h.hp <= 0) throw Error('Hero died during natural wave ' + number);
  122 |       // Retreat through real inputs so one hero does not tank the whole party's wave.
  123 |       if (h.hp < h.maxHp * 0.65 && h.x > 480) await move(p, 464, 320 + i * 12);
  124 |       if (h.qSkill && h.qCooldown === 0 && h.mana >= 18)
  125 |         await p.keyboard.press('KeyQ', { delay: 65 });
  126 |       await p.keyboard.press('KeyA', { delay: 65 });
  127 |       await p.waitForTimeout(180);
  128 |     }
  129 |   });
  130 |   try {
  131 |     await Promise.race([
  132 |       expect
  133 |         .poll(
  134 |           async () => {
  135 |             const s = await read(pages[0]!);
  136 |             return (
  137 |               s.state.dungeons[zone]?.wave > number ||
  138 |               s.state.dungeons[zone]?.living === 0
  139 |             );
  140 |           },
  141 |           { timeout: 60000, intervals: [150] },
  142 |         )
  143 |         .toBe(true),
  144 |       ...pumps,
  145 |     ]);
  146 |   } finally {
  147 |     done = true;
  148 |     await Promise.allSettled(pumps);
  149 |   }
  150 | }
  151 | async function exit(p: Page) {
  152 |   await move(p, 176, 320);
  153 |   await p.keyboard.press('Space');
  154 |   await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
  155 |   await expect.poll(async () => (await view(p)).zoneId).toBe('arena');
  156 |   await expect.poll(async () => (await view(p)).creepEffects.contacts).toBe(0);
  157 |   expect(
  158 |     (await view(p)).actors.some((a: any) => a.texture.startsWith('forest_')),
  159 |   ).toBe(false);
  160 | }
  161 | function monitor(pages: Page[]) {
  162 |   const errors: string[] = [],
  163 |     requests: string[] = [];
  164 |   for (const p of pages) {
  165 |     p.on('pageerror', (e) => errors.push(e.message));
  166 |     p.on('console', (m) => {
  167 |       if (m.type() === 'error') errors.push(m.text());
  168 |     });
  169 |     p.on('request', (r) => requests.push(r.url()));
  170 |   }
  171 |   return { errors, requests };
  172 | }
  173 | 
  174 | for (const count of [2, 6])
  175 |   test(`${count} clients: natural shared Forest spawns and clears two authoritative waves`, async ({
  176 |     browser,
  177 |   }) => {
```