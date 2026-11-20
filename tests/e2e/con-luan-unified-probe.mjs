import assert from 'node:assert/strict';
export async function verifyConLuanChoreography(x) {
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
      page,
    } = x,
    d = dirs[1],
    id = ids[0],
    report = { status: 'PASS', basic, checks: [] };
  const setup = async () => {
    reset(d);
    heroes.forEach((h, i) => target(h, d, 'cl_extra_' + i));
    await settle();
  };
  if (basic === 'con_luan_thien_su') {
    await setup();
    const stages = new Set();
    for (let i = 0; i < 5 && stages.size < 4; i++) {
      await wait(
        () =>
          heroes.every((h) => w.tick >= h.actionUntil && w.tick >= h.cooldown),
        'hammer manual cadence',
      );
      const before = (await read()).events.at(-1)?.id ?? 0;
      const cap = await observe(
        460,
        () => keys('KeyA'),
        ['thrust', 'sweep', 'rising', 'overhead'].map((p) => ({
          name: 'hammer-' + p,
          prefix: p + '_',
        })),
      );
      coherent(cap, 'four hammer beats');
      for (const e of cap.events.filter(
        (e) =>
          e.id > before &&
          e.sourceId === id &&
          e.abilityId === basic &&
          e.kind === 'attack',
      )) {
        stages.add(e.stage);
        assert.ok(
          cap.frames[id].some((f) => f.frame === e.stage + '_down_right'),
          'hammer contact ' + e.stage,
        );
      }
    }
    assert.equal(stages.size, 4);
    report.checks.push({
      kind: 'four accepted hammer contacts',
      stages: [...stages],
    });
    await setup();
    await observe(700, () => keys('KeyQ'));
    await wait(
      () =>
        heroes.every((h) =>
          h.statuses.some((s) => s.kind === 'con_luan_ranged'),
        ),
      'replicated ranged stance',
    );
    await wait(
      () =>
        heroes.every((h) => w.tick >= h.actionUntil && w.tick >= h.cooldown),
      'ranged A unlock',
    );
    const before = (await read()).events.at(-1)?.id ?? 0;
    const shot = await observe(1200, () => keys('KeyA'), [
      { name: 'ranged-release', prefix: 'ranged_release_' },
    ]);
    coherent(shot, 'same body ranged A');
    assert.ok(
      shot.events.some(
        (e) =>
          e.id > before &&
          e.sourceId === id &&
          e.abilityId === 'con_luan_thien_loi' &&
          e.kind === 'attack',
      ),
      'actual ranged bolt A',
    );
    assert.ok(
      shot.frames[id].some((f) => f.frame.startsWith('ranged_release_')),
    );
    report.checks.push({ kind: 'actual Q stance then ranged A' });
    await setup();
    const grow = await observe(3350, () => keys('KeyT'), [
      { name: 'chaos-form', prefix: 'chaos_idle_' },
    ]);
    coherent(grow, 'canonical chaos form');
    assert.ok(
      grow.frames[id].some(
        (f) => f.statuses.includes('con_luan_chaos') && f.scale[0] === 0.5,
      ),
    );
    for (let i = 0; i < 4; i++)
      assert.ok(
        grow.frames[id].some(
          (f) => f.frame === 'chaos_idle_' + i + '_down_right',
        ),
        'chaos idle cel ' + i,
      );
    const walk = await observe(
      500,
      async () => {
        await page.locator('#game canvas').focus();
        await page.keyboard.down('ArrowDown');
        await page.keyboard.down('ArrowRight');
      },
      [{ name: 'chaos-walk', prefix: 'chaos_walk_' }],
    );
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowDown');
    coherent(walk, 'canonical chaos gait');
    assert.ok(walk.frames[id].some((f) => f.frame.startsWith('chaos_walk_')));
    report.checks.push({
      kind: 'replicated chaos growth and authored idle/walk; same physical growth from higher native density; constant scale .5',
    });
  } else {
    await setup();
    const plant = await observe(900, () => keys('KeyS'), [
      { name: 'sword-plant', prefix: 'plant_' },
    ]);
    coherent(plant, 'canonical sword plant');
    assert.ok(
      [...w.areas].some((a) => a.ownerId === id && a.abilityId === 'kinh_loi'),
      'actual planted sword',
    );
    await wait(
      () => heroes.every((h) => w.tick >= h.actionUntil),
      'plant action unlock',
    );
    const det = await observe(1300, () => keys('KeyQ'), [
      { name: 'sword-detonate', prefix: 'detonate_' },
    ]);
    coherent(det, 'canonical sword detonation');
    assert.ok(
      det.events.some(
        (e) =>
          e.sourceId === id &&
          e.abilityId === 'loi_dong_thien_dia' &&
          e.kind === 'cast',
      ),
      'real Q detonation',
    );
    report.checks.push({ kind: 'actual S plant and Q detonation' });
  }
  return report;
}
