import assert from 'node:assert/strict';
export async function verifyDuongMonChoreography(x) {
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
      pages,
    } = x,
    id = ids[0],
    d = dirs[1],
    report = { status: 'PASS', basic, checks: [] };
  const setup = async (direction = d, targets = true) => {
    reset(direction);
    if (targets)
      heroes.forEach((h, i) => target(h, direction, 'dm_extra_' + i));
    await settle();
  };
  if (basic === 'duong_mon_co_quan') {
    await setup();
    const on = await observe(1000, () => keys('KeyW'), [
      { name: 'flight-hover', prefix: 'hover_' },
    ]);
    coherent(on, 'canonical flight body');
    assert.ok(
      heroes.every((h) =>
        h.statuses.some((s) => s.kind === 'duong_mon_flight'),
      ),
    );
    assert.ok(on.frames[id].some((f) => f.frame.startsWith('hover_')));
    assert.ok(
      on.frames[id].some(
        (f) =>
          f.statuses.includes('duong_mon_flight') &&
          Math.abs(f.y - (heroes[0].y - 14)) < 2,
      ),
      'retained fourteen-unit native flight lift',
    );
    const flyWalk = await observe(
      480,
      async () => {
        await page.locator('#game canvas').focus();
        await page.keyboard.down('ArrowDown');
        await page.keyboard.down('ArrowRight');
      },
      [{ name: 'flight-walk', prefix: 'flight_' }],
    );
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowDown');
    coherent(flyWalk, 'authored flying gait');
    assert.ok(
      new Set(
        flyWalk.frames[id]
          .filter((f) => f.frame.startsWith('flight_'))
          .map((f) => f.frame),
      ).size >= 2,
      'two actual wing gait cels',
    );
    await wait(
      () =>
        heroes.every((h) => w.tick >= h.actionUntil && w.tick >= h.cooldown),
      'flying A unlock',
    );
    const before = (await read()).events.at(-1)?.id ?? 0;
    const a = await observe(1000, () => keys('KeyA'), [
      { name: 'flight-basic', prefix: 'flight_' },
    ]);
    coherent(a, 'flying feather A');
    assert.ok(
      a.events.some(
        (e) =>
          e.id > before &&
          e.sourceId === id &&
          e.abilityId === basic &&
          e.kind === 'attack' &&
          e.stage === 'feather',
      ),
    );
    assert.ok(a.frames[id].some((f) => f.frame.startsWith('flight_')));
    const off = await observe(900, () => keys('KeyW'), [
      { name: 'flight-fold-back', prefix: 'wing_lower_' },
    ]);
    coherent(off, 'same gear after W off');
    await wait(
      () =>
        heroes.every(
          (h) => !h.statuses.some((s) => s.kind === 'duong_mon_flight'),
        ),
      'actual flight toggle off',
    );
    report.checks.push({
      kind: 'actual W on, hover, fourteen-unit lift, feather A, W off',
    });
    await setup();
    const shell = await observe(1100, () => keys('KeyR'), [
      { name: 'shell-body', prefix: 'shell_' },
    ]);
    coherent(shell, 'canonical shell body');
    assert.ok(shell.frames[id].some((f) => f.frame.startsWith('shell_')));
    const at = { x: heroes[0].x, y: heroes[0].y };
    await page.locator('#game canvas').focus();
    await page.keyboard.down('ArrowRight');
    await observe(350);
    await page.keyboard.up('ArrowRight');
    assert.ok(
      Math.hypot(heroes[0].x - at.x, heroes[0].y - at.y) < 0.1,
      'existing shell immobilization',
    );
    await wait(
      () =>
        heroes.every(
          (h) => !h.statuses.some((s) => s.kind === 'duong_mon_shell'),
        ),
      'natural shell expiry',
    );
    report.checks.push({
      kind: 'actual R shell, unchanged input block, natural expiry',
    });
  } else {
    for (const direction of dirs.filter(
      (d) =>
        !process.env.VOLAM_CHUONG_DIRECTIONS ||
        process.env.VOLAM_CHUONG_DIRECTIONS.split(',').includes(d[0]),
    )) {
      await setup(direction);
      const before = (await read()).events.at(-1)?.id ?? 0;
      const trap = await observe(900, () => keys('KeyQ'), [
        { name: 'private-trap-' + direction[0], prefix: 'trap_' },
      ]);
      coherent(trap, 'private trap canonical body');
      assert.ok(
        trap.frames[id].some((f) => f.frame === 'trap_' + direction[0]),
      );
      const owned = await Promise.all(pages.map((p) => read(p)));
      for (let i = 0; i < ids.length; i++)
        assert.ok(
          owned[i].events.some(
            (e) =>
              e.id > before &&
              e.sourceId === ids[i] &&
              e.abilityId === 'dia_diem_hoa' &&
              e.kind === 'cast',
          ),
          'each owner receives private trap ack',
        );
      assert.ok(
        !owned[1].events.some(
          (e) =>
            e.id > before &&
            e.sourceId === id &&
            e.abilityId === 'dia_diem_hoa' &&
            e.kind === 'cast',
        ),
        'private cast stays hidden from peer',
      );
      report.checks.push({
        kind: 'private Q owner body + all-owner ack, peer event hidden',
        direction: direction[0],
      });
    }
    await setup(d, false);
    const elements = new Map(ids.map((id) => [id, new Set()]));
    const timer = setInterval(() => {
      for (const p of w.projectiles.values())
        if (elements.has(p.ownerId) && p.abilityId === basic)
          elements.get(p.ownerId).add(p.stage);
    }, 5);
    let a;
    try {
      a = await observe(950, () => keys('KeyA'), [
        { name: 'five-elements-basic', prefix: 'release_' },
      ]);
    } finally {
      clearInterval(timer);
    }
    coherent(a, 'five element basic body');
    for (const id of ids)
      assert.deepEqual([...elements.get(id)].sort(), [
        'earth',
        'fire',
        'metal',
        'water',
        'wood',
      ]);
    report.checks.push({
      kind: 'rank4 innate R preserves five real projectile elements',
      owners: Object.fromEntries([...elements].map(([id, k]) => [id, [...k]])),
    });
    await setup();
    const since = (await read()).events.at(-1)?.id ?? 0;
    const passive = await observe(450, () => keys('KeyR'));
    coherent(passive, 'passive R stays canonical idle');
    assert.ok(
      !passive.events.some(
        (e) =>
          e.id > since &&
          e.abilityId === 'ngu_hanh_cach_the_thuat' &&
          e.kind === 'cast',
      ),
      'passive R is not changed into an active skill',
    );
    report.checks.push({ kind: 'R remains passive, no cast manufactured' });
  }
  return report;
}
