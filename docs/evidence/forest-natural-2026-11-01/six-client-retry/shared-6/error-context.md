# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forest-natural.spec.ts >> 6 clients: natural shared Forest spawns and clears two authoritative waves
- Location: tests\e2e\forest-natural.spec.ts:195:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 1

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
> 76  |     .toBe(number);
      |      ^ Error: expect(received).toBe(expected) // Object.is equality
  77  |   await expect.poll(async () => creeps(await read(p), zone).length).toBe(count);
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
  110 | async function fight(
  111 |   pages: Page[],
  112 |   zone: string,
  113 |   number: number,
  114 |   captures?: Map<Page, any>,
  115 |   deaths?: Set<string>,
  116 | ) {
  117 |   // Independent manual A pulses, bounded by real server cadence. No stat/HP/AI edits.
  118 |   await Promise.all(pages.map((p) => p.locator('#game canvas').focus()));
  119 |   let done = false;
  120 |   const pumps = pages.map(async (p, i) => {
  121 |     while (!done) {
  122 |       const h = await hero(p);
  123 |       if (captures) {
  124 |         const v = await view(p),
  125 |           old = captures.get(p);
  126 |         // Keep actual pre-transfer observations when a natural hero respawn
  127 |         // clears the inspector for the new zone. Never synthesize frame evidence.
  128 |         if (
  129 |           v.zoneId === zone &&
  130 |           (!old ||
  131 |             Object.keys(v.observedCreepFrames).length >=
  132 |               Object.keys(old.observedCreepFrames).length)
  133 |         )
  134 |           captures.set(p, v);
  135 |       }
  136 |       if (h.hp <= 0) deaths?.add(h.nickname);
  137 |       if (h.hp <= 0 || h.zoneId !== zone) {
  138 |         await p.waitForTimeout(180);
  139 |         continue; // A dead party member must not stop every living player's input.
  140 |       }
  141 |       // Retreat through real inputs so one hero does not tank the whole party's wave.
  142 |       if (h.hp < h.maxHp * 0.65 && h.x > 480) await move(p, 464, 320 + i * 12);
  143 |       if (h.qSkill && h.qCooldown === 0 && h.mana >= 18)
  144 |         await p.keyboard.press('KeyQ', { delay: 65 });
  145 |       await p.keyboard.press('KeyA', { delay: 65 });
  146 |       await p.waitForTimeout(180);
  147 |     }
  148 |   });
  149 |   try {
  150 |     await Promise.race([
  151 |       expect
  152 |         .poll(
  153 |           async () => {
  154 |             const s = await read(pages[0]!);
  155 |             return (
  156 |               s.state.dungeons[zone]?.wave > number ||
  157 |               (s.state.dungeons[zone]?.wave === number &&
  158 |                 s.state.dungeons[zone]?.living === 0)
  159 |             );
  160 |           },
  161 |           { timeout: 60000, intervals: [150] },
  162 |         )
  163 |         .toBe(true),
  164 |       ...pumps,
  165 |     ]);
  166 |   } finally {
  167 |     done = true;
  168 |     await Promise.allSettled(pumps);
  169 |   }
  170 | }
  171 | async function exit(p: Page) {
  172 |   await move(p, 176, 320);
  173 |   await p.keyboard.press('Space');
  174 |   await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
  175 |   await expect.poll(async () => (await view(p)).zoneId).toBe('arena');
  176 |   await expect.poll(async () => (await view(p)).creepEffects.contacts).toBe(0);
```