# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay.spec.ts >> two clients agree on combat, manual cadence, skills and progression
- Location: tests\e2e\gameplay.spec.ts:204:1

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 90
Received:   100

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Test source

```ts
  196 |       (node) =>
  197 |         node instanceof HTMLCanvasElement &&
  198 |         Number.isInteger(node.clientWidth / node.width),
  199 |     ),
  200 |   ).toBe(true);
  201 |   expect(errors).toEqual([]);
  202 | });
  203 | 
  204 | test('two clients agree on combat, manual cadence, skills and progression', async ({
  205 |   browser,
  206 | }, info) => {
  207 |   test.setTimeout(60000);
  208 |   const aContext = await browser.newContext({
  209 |     viewport: { width: 1440, height: 1100 },
  210 |   });
  211 |   const bContext = await browser.newContext({
  212 |     viewport: { width: 1440, height: 1100 },
  213 |   });
  214 |   const a = await aContext.newPage();
  215 |   const b = await bContext.newPage();
  216 |   const errors = monitor(a);
  217 |   const bErrors = monitor(b);
  218 |   try {
  219 |     await enter(a, 'Cái Bang', undefined, true);
  220 |     const id = (await snapshot(a)).roomId;
  221 |     await enter(b, 'Đồng đội', id, true);
  222 |     await startTogether([a, b]);
  223 |     const aId = (await snapshot(a)).sessionId;
  224 |     // Let the real AI approach. Do not walk toward an old target position:
  225 |     // movement/patch latency can carry the hero past it before the attack.
  226 |     const nearby = async () => {
  227 |       const s = await snapshot(a),
  228 |         h = s.state.players[aId]!;
  229 |       return Object.values(s.state.creeps)
  230 |         .filter((c) => c.hp > 0)
  231 |         .sort(
  232 |           (c, d) =>
  233 |             Math.hypot(c.x - h.x, c.y - h.y) - Math.hypot(d.x - h.x, d.y - h.y),
  234 |         )[0]!;
  235 |     };
  236 |     await expect
  237 |       .poll(async () => {
  238 |         const h = await hero(a),
  239 |           c = await nearby();
  240 |         return Math.hypot(c.x - h.x, c.y - h.y);
  241 |       })
  242 |       .toBeLessThan(42);
  243 |     // The spawn faces east and these M1 creeps approach from the east.
  244 |     // Keep the hero still: no latency-sensitive facing tap is needed.
  245 |     const position = await hero(a),
  246 |       currentTarget = await nearby();
  247 |     expect(position.fx).toBe(1);
  248 |     expect(position.fy).toBe(0);
  249 |     expect(currentTarget.x).toBeGreaterThan(position.x);
  250 |     const totalHp = async (page: Page): Promise<number> =>
  251 |       Object.values((await snapshot(page)).state.creeps).reduce(
  252 |         (sum, creep) => sum + creep.hp,
  253 |         0,
  254 |       );
  255 |     const before = await totalHp(a);
  256 |     await a.keyboard.press('KeyA');
  257 |     await expect.poll(() => totalHp(a)).toBeLessThan(before);
  258 |     await expect
  259 |       .poll(async () =>
  260 |         (await snapshot(a)).events.some(
  261 |           (event) =>
  262 |             event.kind === 'hit' &&
  263 |             event.sourceId === aId &&
  264 |             event.abilityId === 'cai_bang_bong',
  265 |         ),
  266 |       )
  267 |       .toBe(true);
  268 |     const hit = (await snapshot(a)).events.find(
  269 |       (event) =>
  270 |         event.kind === 'hit' &&
  271 |         event.sourceId === aId &&
  272 |         event.abilityId === 'cai_bang_bong',
  273 |     );
  274 |     expect(hit).toBeDefined();
  275 |     await expect
  276 |       .poll(
  277 |         async () =>
  278 |           (await snapshot(a)).state.creeps[hit!.targetId]!.hp -
  279 |           (await snapshot(b)).state.creeps[hit!.targetId]!.hp,
  280 |       )
  281 |       .toBe(0);
  282 |     await expect.poll(async () => (await hero(a)).basicCooldown).toBe(0);
  283 |     const count = (await snapshot(a)).events.filter(
  284 |       (e) => e.kind === 'attack' && e.sourceId === aId,
  285 |     ).length;
  286 |     await a.keyboard.down('KeyA');
  287 |     await a.waitForTimeout(900);
  288 |     await a.keyboard.up('KeyA');
  289 |     expect(
  290 |       (await snapshot(a)).events.filter(
  291 |         (e) => e.kind === 'attack' && e.sourceId === aId,
  292 |       ).length,
  293 |     ).toBe(count + 1);
  294 |     await a.keyboard.press('KeyQ');
  295 |     await a.keyboard.press('KeyW');
> 296 |     await expect.poll(async () => (await hero(a)).mana).toBeLessThan(90);
      |                                                         ^ Error: expect(received).toBeLessThan(expected)
  297 |     await expect
  298 |       .poll(
  299 |         async () =>
  300 |           (await snapshot(a)).events.filter(
  301 |             (e) => e.kind === 'cast' && e.sourceId === aId,
  302 |           ).length,
  303 |       )
  304 |       .toBe(2);
  305 |     await a.keyboard.press('KeyE');
  306 |     await expect(a.locator('#feedback')).toContainText('not equipped');
  307 |     // Finish through real manual inputs; no assumption that all projectiles hit one specific creep.
  308 |     await selectRanged(a);
  309 |     await expect
  310 |       .poll(
  311 |         async () =>
  312 |           (await presentation(a)).actors.find((actor) => actor.id === aId)
  313 |             ?.texture,
  314 |       )
  315 |       .toBe('hero_cai_bang_chuong');
  316 |     await expect
  317 |       .poll(
  318 |         async () =>
  319 |           (await presentation(b)).actors.find((actor) => actor.id === aId)
  320 |             ?.texture,
  321 |       )
  322 |       .toBe('hero_cai_bang_chuong');
  323 |     const latestAttack = async (): Promise<number> =>
  324 |       (await snapshot(a)).events
  325 |         .filter((event) => event.kind === 'attack' && event.sourceId === aId)
  326 |         .at(-1)?.id ?? 0;
  327 |     for (let presses = 0; presses < 6 && (await hero(a)).xp < 60; presses++) {
  328 |       await expect.poll(async () => (await hero(a)).basicCooldown).toBe(0);
  329 |       const accepted = await latestAttack();
  330 |       await a.keyboard.press('KeyA');
  331 |       await expect.poll(latestAttack).toBeGreaterThan(accepted);
  332 |     }
  333 | 
  334 |     await expect
  335 |       .poll(async () => (await hero(a)).xp)
  336 |       .toBeGreaterThanOrEqual(60);
  337 |     expect((await hero(a)).level).toBeGreaterThanOrEqual(2);
  338 |     await a.screenshot({
  339 |       path: info.outputPath('combat-a.png'),
  340 |       fullPage: true,
  341 |     });
  342 |     await a
  343 |       .locator('#viewport')
  344 |       .screenshot({ path: info.outputPath('arena-panel.png') });
  345 |     await b.screenshot({
  346 |       path: info.outputPath('combat-b.png'),
  347 |       fullPage: true,
  348 |     });
  349 |     expect(errors.concat(bErrors)).toEqual([]);
  350 |   } finally {
  351 |     await Promise.all([aContext.close(), bContext.close()]);
  352 |   }
  353 | });
  354 | 
  355 | test('ranged projectile uses a fixed trajectory and original effect frames', async ({
  356 |   page,
  357 | }, info) => {
  358 |   const errors = monitor(page);
  359 |   await enter(page, 'Hỏa Khách');
  360 |   await selectRanged(page);
  361 |   await expect
  362 |     .poll(
  363 |       async () =>
  364 |         (await snapshot(page)).state.players[(await snapshot(page)).sessionId]
  365 |           ?.basicCooldown,
  366 |     )
  367 |     .toBe(0);
  368 |   await page.keyboard.press('KeyA');
  369 |   let observed: { vx: number; vy: number } | undefined;
  370 |   await expect
  371 |     .poll(
  372 |       async () => {
  373 |         observed = Object.values((await snapshot(page)).state.projectiles)[0];
  374 |         return !!observed;
  375 |       },
  376 |       { intervals: [20, 20, 20] },
  377 |     )
  378 |     .toBe(true);
  379 |   expect(Math.hypot(observed!.vx, observed!.vy)).toBeCloseTo(360, 2);
  380 |   await page.screenshot({
  381 |     path: info.outputPath('straight-projectile.png'),
  382 |     fullPage: true,
  383 |   });
  384 |   expect(errors).toEqual([]);
  385 | });
  386 | 
  387 | test('real PNG animation registry covers two actors, six states and four directions', async ({
  388 |   page,
  389 | }, info) => {
  390 |   const errors = monitor(page);
  391 |   await page.goto('/?artPreview=1');
  392 |   await expect(page.locator('#scene-status')).toHaveAttribute(
  393 |     'data-ready',
  394 |     'true',
  395 |   );
  396 |   const read = async (): Promise<{
```