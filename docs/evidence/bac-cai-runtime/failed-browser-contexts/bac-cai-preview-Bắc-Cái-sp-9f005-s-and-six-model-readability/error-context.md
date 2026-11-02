# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bac-cai-preview.spec.ts >> Bắc Cái sprite / VFX: real Phaser frames, final-brief branches and six-model readability
- Location: tests\e2e\bac-cai-preview.spec.ts:68:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "ws://127.0.0.1:5397/?token=8-_Sx0UB-GBK",
+   "ws://127.0.0.1:5397/?token=8-_Sx0UB-GBK",
+ ]
```

# Test source

```ts
  212 |       (await snap(a)).state.layers.filter((l) => /^clone-\d$/.test(l.id)),
  213 |     ).toHaveLength(1);
  214 |     await choose(a, 'clones', 'right', 'failure');
  215 |     await seek(a, cloneDecisionAt + 300);
  216 |     expect(
  217 |       (await snap(a)).state.layers.filter((l) => l.id.startsWith('map-hit-')),
  218 |     ).toHaveLength(6);
  219 |     await choose(a, 'tether', 'right', 'failure', 1);
  220 |     await seek(a, 2000);
  221 |     expect((await snap(a)).state.tetherActive).toBe(false);
  222 |     for (const branch of ['success', 'failure'] as Outcome[]) {
  223 |       await choose(a, 'tether', 'right', branch);
  224 |       await seek(a, 3500);
  225 |       expect((await snap(a)).state.tetherActive).toBe(branch === 'failure');
  226 |       await choose(a, 'preferences', 'right', branch);
  227 |       await seek(a, 16000);
  228 |       const state = (await snap(a)).state;
  229 |       if (branch === 'success') expect(state.sleepRemaining).toBe(8000);
  230 |       else expect(state.bossHp).toBe(80);
  231 |       observations.push({ branch, state });
  232 |     }
  233 |     await choose(a, 'beam');
  234 |     await seek(a, 450);
  235 |     const beam = (await snap(a)).actors.find((v) => v.id === 'beam')!;
  236 |     expect(beam.asset).toBe('bac_cai_beam_v03');
  237 |     expect(beam.scale).toEqual([1, 1]);
  238 |     await choose(a, 'field');
  239 |     await seek(a, 560);
  240 |     const landing = (await snap(a)).actors;
  241 |     expect(landing.find((v) => v.id === 'field')!.depth).toBeLessThan(
  242 |       landing.find((v) => v.id === 'boss')!.depth,
  243 |     );
  244 |     expect(landing.find((v) => v.id === 'field')!.alpha).toBeLessThanOrEqual(
  245 |       0.6,
  246 |     );
  247 |     await choose(a, 'preferences');
  248 |     await seek(a, 450);
  249 |     const spoken = await snap(a);
  250 |     expect(spoken.state.captions.some((c) => c.id === 'dialog')).toBe(true);
  251 |     expect(spoken.actors.some((v) => v.id === 'concurrent-beam')).toBe(true);
  252 |     await choose(a, 'spiral');
  253 |     await seek(a, 1100);
  254 |     const detached = await snap(a);
  255 |     expect(detached.actors.some((v) => v.id === 'spiral-0')).toBe(true);
  256 |     expect(detached.actors.some((v) => v.id === 'concurrent-beam')).toBe(true);
  257 |     expect(detached.state.dragonReleased).toBe(true);
  258 |     observations.push({
  259 |       nativeBeam: beam,
  260 |       landing,
  261 |       dialogueAndCast: spoken.state,
  262 |       detachedDragon: detached.state,
  263 |     });
  264 |     // Required director-review artwork: genuine rendered phase stills, no recordings.
  265 |     const times: Record<string, number> = {
  266 |       entrance: 1900,
  267 |       staff: 400,
  268 |       palms: 550,
  269 |       beam: 500,
  270 |       dogs: 2400,
  271 |       clones: 2400,
  272 |       vortex: 2200,
  273 |       tether: 2100,
  274 |       field: 560,
  275 |       spiral: 1100,
  276 |       preferences: 450,
  277 |     };
  278 |     for (const [id] of previews) {
  279 |       await choose(a, id);
  280 |       await seek(a, times[id]!);
  281 |       await a.screenshot({
  282 |         path: '.cache/bac-cai-preview-captures-v03/' + id + '.png',
  283 |       });
  284 |       expect((await snap(a)).errors).toEqual([]);
  285 |     }
  286 |     await choose(a, 'field');
  287 |     await seek(a, 560);
  288 |     await a.screenshot({ path: output + '/arena-field-six-models-1x.png' });
  289 |     await choose(b, 'spiral');
  290 |     await seek(b, 1100);
  291 |     await b.screenshot({
  292 |       path: output + '/arena-spiral-six-models-display.png',
  293 |     });
  294 |     await a.evaluate(() => window.__BAC_CAI_PREVIEW__.zoom(2));
  295 |     expect((await snap(a)).camera).toEqual({ zoom: 2, rotation: 0 });
  296 |     const layout = await a.evaluate(() => ({
  297 |       canvas: document
  298 |         .querySelector('canvas')!
  299 |         .getBoundingClientRect()
  300 |         .toJSON(),
  301 |       controls: document
  302 |         .getElementById('review-controls')!
  303 |         .getBoundingClientRect()
  304 |         .toJSON(),
  305 |       viewport: document
  306 |         .getElementById('bac-cai-viewport')!
  307 |         .getBoundingClientRect()
  308 |         .toJSON(),
  309 |     }));
  310 |     expect(layout.canvas.width).toBe(layout.viewport.width);
  311 |     expect(layout.controls.right).toBeLessThanOrEqual(layout.viewport.right);
> 312 |     expect(sockets).toEqual([]);
      |                     ^ Error: expect(received).toEqual(expected) // deep equality
  313 |     expect(errors).toEqual([]);
  314 |     await writeFile(
  315 |       output + '/verification.json',
  316 |       JSON.stringify(
  317 |         {
  318 |           status: 'PASS',
  319 |           scope:
  320 |             'Art preview only; two independent render contexts, six scripted hero models; no boss server/multiplayer-combat acceptance',
  321 |           frameCount,
  322 |           clipCount: clips.length,
  323 |           viewports: [1280, 1920],
  324 |           observations,
  325 |           errors,
  326 |           sockets,
  327 |           recordingsCreated: false,
  328 |           approval: 'PENDING_DIRECTOR_REVIEW',
  329 |         },
  330 |         null,
  331 |         2,
  332 |       ) + '\n',
  333 |     );
  334 |   } catch (error) {
  335 |     await pages[0]?.screenshot({ path: output + '/failure.png' });
  336 |     throw error;
  337 |   } finally {
  338 |     await Promise.all(contexts.map((c) => c.close()));
  339 |   }
  340 | });
  341 | 
```