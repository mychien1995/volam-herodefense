import assert from 'node:assert/strict';
export async function verifyShaolinChoreography(x) {
  const {
    basic,
    heroes,
    ids,
    w,
    dirs,
    reset,
    target,
    settle,
    observe,
    keys,
    coherent,
    wait,
    read,
    pages,
  } = x;
  const report = { status: 'PASS', basic, checks: [] };
  if (basic !== 'thieu_lam_quyen') return report;
  const d = dirs[1],
    id = ids[0],
    seen = new Set();
  reset(d);
  heroes.forEach((h, i) => target(h, d, 'sl_four_' + i));
  await settle();
  for (let n = 0; n < 6 && seen.size < 4; n++) {
    await wait(
      () =>
        heroes.every((h) => w.tick >= h.actionUntil && w.tick >= h.cooldown),
      'Shaolin manual A cadence',
    );
    const before = (await read()).events.at(-1)?.id ?? 0;
    const cap = await observe(450, () => keys('KeyA'), [
      { name: 'four-beats-' + n, prefix: '' },
    ]);
    coherent(cap, 'four Shaolin A beats');
    for (const e of cap.events.filter(
      (e) =>
        e.id > before &&
        e.sourceId === id &&
        e.abilityId === basic &&
        e.kind === 'attack',
    )) {
      seen.add(e.stage);
      const cel = e.stage === 'roundhouse_kick' ? 'roundhouse' : e.stage;
      assert.ok(
        cap.frames[id].some((f) => f.frame === cel + '_down_right'),
        'accepted ' + e.stage + ' body contact',
      );
    }
  }
  assert.equal(seen.size, 4, 'all four actual A contacts');
  report.checks.push({ kind: 'four manual basic beats', stages: [...seen] });
  await wait(
    () => heroes.every((h) => w.tick >= h.actionUntil && w.tick >= h.cooldown),
    'stance unlock',
  );
  await keys('KeyF');
  await wait(async () => {
    return (
      await Promise.all(
        pages.map((p) => p.locator('#slot-e').getAttribute('data-skill-id')),
      )
    ).every((s) => s === 'vo_anh_cuoc');
  }, 'real F alternate stance acknowledged');
  for (const [key, ability, pose] of [
    ['KeyQ', 'toan_phong_thoai', 'spin_kick'],
    ['KeyW', 'hoanh_tao_cuoc', 'stomp'],
    ['KeyE', 'vo_anh_cuoc', 'kick_release'],
  ]) {
    reset(d);
    heroes.forEach((h, i) => target(h, d, 'sl_alt_' + i));
    await settle();
    const before = (await read()).events.at(-1)?.id ?? 0;
    const cap = await observe(1500, () => keys(key), [
      { name: 'stance-' + key, prefix: pose + '_' },
    ]);
    coherent(cap, 'Cước ' + ability);
    assert.ok(
      cap.events.some(
        (e) =>
          e.id > before &&
          e.sourceId === id &&
          e.abilityId === ability &&
          e.kind === 'cast',
      ),
      'accepted alternate ' + ability,
    );
    assert.ok(
      cap.frames[id].some((f) => f.frame.startsWith(pose + '_')),
      'alternate body ' + pose,
    );
    report.checks.push({
      kind: 'F alternate skill',
      ability,
      frames: [...new Set(cap.frames[id].map((f) => f.frame))],
    });
  }
  reset(d);
  heroes.forEach((h, i) => target(h, d, 'sl_combo_' + i, 100));
  await settle();
  const since = (await read()).events.at(-1)?.id ?? 0;
  const combo = await observe(
    2300,
    async () => {
      for (const k of ['KeyQ', 'KeyW', 'KeyE']) await keys(k);
    },
    [{ name: 'empowered-flying-kick', prefix: 'flying_kick_' }],
  );
  coherent(combo, 'real Phát Động Cước combo');
  assert.ok(
    combo.events.some(
      (e) =>
        e.id > since &&
        e.sourceId === id &&
        e.abilityId === 'vo_anh_cuoc' &&
        e.stage === 'empowered_dash',
    ),
    'actual empowered dash accepted',
  );
  assert.ok(
    combo.frames[id].some((f) => f.frame.startsWith('flying_kick_')),
    'canonical flying kick body',
  );
  report.checks.push({
    kind: 'real same-target Q W E empowered dash',
    events: combo.events.filter((e) => e.id > since && e.sourceId === id),
  });
  await wait(
    () => heroes.every((h) => w.tick >= h.actionUntil),
    'F restore unlock',
  );
  await keys('KeyF');
  await wait(async () => {
    return (
      await Promise.all(
        pages.map((p) => p.locator('#slot-e').getAttribute('data-skill-id')),
      )
    ).every((s) => s === 'dai_luc_kim_cuong_chuong');
  }, 'real F restore');
  return report;
}
