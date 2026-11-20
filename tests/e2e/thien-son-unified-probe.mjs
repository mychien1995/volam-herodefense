import assert from 'node:assert/strict';
export async function verifyThienSonChoreography(x) {
  const {
    basic,
    heroes,
    ids,
    w,
    reset,
    dirs,
    target,
    settle,
    observe,
    keys,
    coherent,
    read,
    wait,
    page,
  } = x;
  const h = heroes[0],
    id = ids[0],
    d = dirs[1],
    report = { status: 'RUNNING', basic, checks: [] };
  const setup = async () => {
    reset(d);
    heroes.forEach((h, i) => target(h, d, 'ts_extra_' + i));
    await settle();
  };
  const actual = (cap, ability, kind = 'cast') =>
    cap.events.filter(
      (e) => e.sourceId === id && e.abilityId === ability && e.kind === kind,
    );
  if (basic === 'thien_son_phien') {
    await setup();
    const fan = await observe(1500, () => keys('KeyA'), [
      { name: 'fan-release', prefix: 'fan_throw_' },
      { name: 'fan-catch', prefix: 'fan_catch_' },
    ]);
    coherent(fan, 'fan release/recovery');
    const frames = [...new Set(fan.frames[id].map((f) => f.frame))];
    for (const p of ['windup', 'fan_open', 'fan_throw', 'fan_catch'])
      assert.ok(frames.includes(p + '_down_right'), 'four fan body beats ' + p);
    assert.ok(actual(fan, basic, 'attack').length);
    assert.ok(
      fan.events.some(
        (e) =>
          e.sourceId === id &&
          e.abilityId === basic &&
          e.stage === 'projectile_return',
      ),
      'actual fan return',
    );
    report.checks.push({ kind: 'fan four body beats and real return', frames });
    await setup();
    const spin = await observe(1900, () => keys('KeyW'), [
      { name: 'moving-spin', prefix: 'spin_' },
    ]);
    coherent(spin, 'authored fan spin');
    assert.ok(actual(spin, 'luc_duong_chuong').length);
    const spinFrames = [...new Set(spin.frames[id].map((f) => f.frame))];
    assert.ok(spinFrames.some((f) => f.startsWith('spin_')));
    assert.ok(spinFrames.some((f) => f.startsWith('fan_sweep_')));
    report.checks.push({ kind: 'six-pulse spin body', frames: spinFrames });
    await setup();
    const launched = await observe(650, () => keys('KeyE'), [
      { name: 'fan-storm-release', prefix: 'fan_throw_' },
    ]);
    coherent(launched, 'recall fan launch');
    assert.ok(
      [...w.projectiles.values()].some(
        (p) => p.ownerId === id && p.abilityId === 'luu_phong_bo',
      ),
      'actual storm projectile',
    );
    const recalled = await observe(1600, () => keys('KeyE'));
    coherent(recalled, 'real same-slot recall');
    await wait(
      () =>
        ![...w.projectiles.values()].some(
          (p) => p.ownerId === id && p.abilityId === 'luu_phong_bo',
        ),
      'storm recall cleanup',
    );
    assert.ok(recalled.frames[id].some((f) => f.frame.startsWith('idle_')));
    report.checks.push({
      kind: 'real E launch/recall/idle',
      frames: [...new Set(recalled.frames[id].map((f) => f.frame))],
    });
  } else {
    await setup();
    const swings = new Set(),
      attempts = [];
    for (let i = 0; i < 6; i++) {
      await wait(
        () =>
          heroes.every((h) => w.tick >= h.actionUntil && w.tick >= h.cooldown),
        'manual dao cadence',
      );
      const before = (await read()).events.at(-1)?.id ?? 0;
      const cap = await observe(330, () => keys('KeyA'), [
        { name: 'dao-contact-' + i, prefix: 'sweep_' },
        { name: 'dao-overhead', prefix: 'overhead_' },
      ]);
      coherent(cap, 'three accepted dao swings');
      const e = actual(cap, basic, 'attack').find((e) => e.id > before);
      assert.ok(e);
      const pose = ['sweep_right', 'sweep_left', 'overhead'][
        Number(e.stage.at(-1))
      ];
      swings.add(e.stage);
      attempts.push(e.stage);
      assert.ok(
        cap.frames[id].some((f) => f.frame === pose + '_down_right'),
        'contact of accepted ' + e.stage,
      );
    }
    await wait(
      () =>
        heroes.every(
          (h) => h.tamLien?.charges === 6 && h.tamLien.readyUntil > w.tick,
        ),
      'six real hit charges',
    );
    await wait(
      async () =>
        (await Promise.all(x.pages.map((p) => read(p)))).every(
          (s) => s.state.players[s.sessionId]?.inventory.tamLienReadyTicks > 0,
        ),
      'peer S-ready acknowledgement',
    );
    const cross = await observe(1300, () => keys('KeyS'), [
      { name: 'tam-lien-cross', prefix: 'cross_' },
    ]);
    coherent(cross, 'actual Tam Lien');
    const pulses = actual(cross, 'tam_lien_tram', 'pulse').filter((e) =>
      e.stage?.startsWith('cross_'),
    );
    assert.deepEqual(
      pulses.map((e) => e.stage),
      ['cross_0', 'cross_1', 'cross_2'],
    );
    const crossFrames = [...new Set(cross.frames[id].map((f) => f.frame))];
    for (let i = 0; i < 3; i++)
      assert.ok(
        crossFrames.some((f) => f.startsWith('cross_' + i + '_')),
        'actual pass ' + i + ' body',
      );
    // Six hits unlock S; they need not contain all three RNG-selected swing variants.
    // Cover any missing variant separately after the real S sequence, without changing RNG.
    if (swings.size < 3) await setup();
    for (let i = 0; i < 24 && swings.size < 3; i++) {
      await wait(
        () => w.tick >= h.actionUntil && w.tick >= h.cooldown,
        'extra native swing cadence',
      );
      const before = (await read()).events.at(-1)?.id ?? 0;
      const cap = await observe(330, async () => {
        await page.locator('#game canvas').focus();
        await page.keyboard.press('KeyA', { delay: 28 });
      });
      coherent(cap, 'missing RNG swing contact');
      const e = actual(cap, basic, 'attack').find((e) => e.id > before);
      assert.ok(e);
      const pose = ['sweep_right', 'sweep_left', 'overhead'][
        Number(e.stage.at(-1))
      ];
      swings.add(e.stage);
      attempts.push(e.stage);
      assert.ok(cap.frames[id].some((f) => f.frame === pose + '_down_right'));
    }
    assert.equal(swings.size, 3);
    report.checks.push({
      kind: 'three A swings / six actual hits unlock S and three Tam Lien passes',
      attempts,
      pulses,
      frames: crossFrames,
    });
    await setup();
    const before = { x: h.x, y: h.y, fx: h.fx, fy: h.fy };
    const retreat = await observe(1000, () => keys('KeyE'), [
      { name: 'retreat', prefix: 'retreat_' },
    ]);
    coherent(retreat, 'real retreat body');
    assert.ok(
      (h.x - before.x) * before.fx + (h.y - before.y) * before.fy < 0,
      'server retreat backwards',
    );
    assert.equal(h.fx, before.fx);
    assert.equal(h.fy, before.fy);
    report.checks.push({
      kind: 'real E retreat preserves server facing',
      before,
      after: { x: h.x, y: h.y, fx: h.fx, fy: h.fy },
    });
    await setup();
    await page.evaluate((id) => {
      const api = window.__VOLAM__;
      window.__tsShadowFrames = [];
      window.__tsShadowWatch = true;
      const sample = () => {
        if (!window.__tsShadowWatch) return;
        const p = api.presentation();
        const s =
          p.skills?.thienSon?.filter((s) =>
            s.id.startsWith('shadow:' + id + ':'),
          ) ?? [];
        if (s.length)
          window.__tsShadowFrames.push({
            tick: api.snapshot().state.tick,
            shadows: s,
          });
        api.afterRender(sample);
      };
      api.afterRender(sample);
    }, id);
    const flurry = await observe(3000, () => keys('KeyT'), [
      { name: 'four-shadows', prefix: 'flurry_sweep_' },
    ]);
    coherent(flurry, 'four canonical X bodies');
    const samples = await page.evaluate(() => {
      window.__tsShadowWatch = false;
      return window.__tsShadowFrames;
    });
    assert.ok(
      actual(flurry, 'bach_liet_thien_kich').length,
      'real flurry cast',
    );
    assert.ok(
      samples.some((s) => s.shadows.length === 4),
      'four actual body doubles',
    );
    const directions = ['down_right', 'down_left', 'up_right', 'up_left'];
    for (const sample of samples)
      for (const s of sample.shadows) {
        const row = Number(s.id.at(-1));
        assert.equal(s.texture, 'hero-unified:thien_son_dao');
        assert.ok(s.frame.endsWith('_' + directions[row]));
        assert.deepEqual(s.scale, [0.5, 0.5]);
        assert.ok(s.alpha >= 0 && s.alpha <= 0.9);
      }
    const full = samples.find(
      (s) =>
        s.shadows.length === 4 &&
        Math.abs(s.shadows[0].x - 588) <= 1 &&
        Math.abs(s.shadows[0].y - 594) <= 1,
    );
    assert.ok(full, 'retained X offsets112/66');
    assert.ok(
      flurry.frames[id].some((f) => f.alpha < 0.05),
      'retained intentional caster fade during X technique',
    );
    const restored = await observe(300);
    coherent(restored, 'flurry ends with canonical body');
    assert.equal(restored.frames[id].at(-1).alpha, 1);
    assert.equal(
      (
        await page.evaluate(
          () => window.__VOLAM__.presentation().skills.thienSon,
        )
      ).filter((s) => s.id.startsWith('shadow:')).length,
      0,
      'all X bodies cleaned',
    );
    report.checks.push({
      kind: 'four canonical X bodies / fixed offsets / native fade and cleanup',
      samples: samples.length,
      full,
      poses: [
        ...new Set(samples.flatMap((s) => s.shadows.map((s) => s.frame))),
      ],
    });
  }
  report.status = 'PASS';
  return report;
}
