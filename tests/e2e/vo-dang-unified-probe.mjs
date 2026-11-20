import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
export async function verifyVoDangChoreography(x) {
  const {
    basic,
    observe,
    reset,
    settle,
    target,
    keys,
    heroes,
    ids,
    read,
    coherent,
    wait,
    dirs,
    w,
    c,
    page,
    resolveHit,
  } = x;
  const d = dirs[1],
    h = heroes[0],
    id = ids[0],
    report = { basic, checks: [] };
  const stage = process.env.VOLAM_CHUONG_STAGE;
  const setup = async () => {
    reset(d);
    heroes.forEach((h, i) => target(h, d, 'vd_extra_' + i));
    await settle();
  };
  const active = () =>
    [...w.projectiles.values()].some(
      (p) => p.ownerId === id && p.abilityId === 'nhan_kiem_hop_nhat',
    );
  if (stage !== 'weapon') {
    await setup();
    if (basic === 'vo_dang_quyen') {
      const stages = [];
      for (let i = 0; i < 2; i++) {
        await wait(
          () =>
            heroes.every(
              (h) => w.tick >= h.actionUntil && w.tick >= h.cooldown,
            ),
          'manual palm cadence',
        );
        const before = (await read()).events.at(-1)?.id ?? 0;
        const cap = await observe(350, () => keys('KeyA'), [
          { name: 'palm-' + i, prefix: i ? 'palm_right_' : 'palm_left_' },
        ]);
        coherent(cap, 'two-palm sequence');
        const event = cap.events.find(
          (e) =>
            e.id > before &&
            e.kind === 'attack' &&
            e.sourceId === id &&
            e.abilityId === basic,
        );
        assert.ok(event);
        stages.push(event.stage);
        assert.ok(
          cap.frames[id].some((f) =>
            f.frame.startsWith(i ? 'palm_right_' : 'palm_left_'),
          ),
        );
      }
      assert.deepEqual(stages, ['left_palm', 'right_palm']);
      report.checks.push({ kind: 'alternating palms', stages });
      await setup();
      const cap = await observe(1400, () => keys('KeyT'), [
        { name: 'taichi-open', prefix: 'taichi_open_' },
        { name: 'taichi-sweep', prefix: 'taichi_sweep_' },
        { name: 'taichi-hold', prefix: 'taichi_hold_' },
      ]);
      coherent(cap, 'six taichi body beats');
      const poses = [...new Set(cap.frames[id].map((f) => f.frame))];
      for (const p of [
        'charge',
        'taichi_open',
        'taichi_cross',
        'taichi_sweep',
        'taichi_hold',
        'recover',
      ])
        assert.ok(poses.includes(p + '_down_right'), 'taichi body ' + p);
      assert.ok(
        w.areas.some(
          (a) => a.ownerId === id && a.abilityId === 'thai_cuc_tran',
        ),
        'actual formation exists',
      );
      report.checks.push({ kind: 'six taichi beats', frames: poses });
    } else {
      const variants = new Set(),
        attempts = [];
      for (let i = 0; i < 35 && variants.size < 5; i++) {
        await wait(
          () =>
            heroes.every(
              (h) => w.tick >= h.actionUntil && w.tick >= h.cooldown,
            ),
          'manual sword cadence',
        );
        const before = (await read()).events.at(-1)?.id ?? 0;
        const cap = await observe(270, () => keys('KeyA'));
        coherent(cap, 'five sword variants');
        const event = cap.events.find(
          (e) =>
            e.id > before &&
            e.sourceId === id &&
            e.kind === 'attack' &&
            e.abilityId === basic,
        );
        assert.ok(event);
        variants.add(event.stage);
        assert.ok(
          cap.frames[id].some((f) => f.frame === event.stage + '_down_right'),
          'sword variant ' + event.stage,
        );
        attempts.push(event.stage);
      }
      assert.equal(variants.size, 5);
      report.checks.push({
        kind: 'five real RNG-selected A variants',
        attempts,
      });
      await setup();
      const cap = await observe(1800, () => keys('KeyQ'), [
        { name: 'seven-cut-up', prefix: 'cut_up_' },
        { name: 'seven-cut-left', prefix: 'cut_left_' },
      ]);
      coherent(cap, 'seven cuts');
      const events = cap.events.filter(
        (e) =>
          e.sourceId === id &&
          e.abilityId === 'that_tinh_kiem' &&
          e.kind === 'pulse' &&
          e.stage === 'sweep',
      );
      assert.deepEqual(
        events.map((e) => e.hitIndex),
        [0, 1, 2, 3, 4, 5, 6],
      );
      const sequence = cap.frames[id]
        .map((f) => f.frame)
        .filter((f, i, a) => i === 0 || f !== a[i - 1]);
      let at = 0;
      for (const pose of [
        'cut_up',
        'cut_down',
        'cut_right',
        'cut_down',
        'cut_up',
        'cut_left',
        'cut_right',
      ]) {
        const found = sequence.indexOf(pose + '_down_right', at);
        assert.ok(found >= at, 'ordered seven-cut ' + pose);
        at = found + 1;
      }
      report.checks.push({
        kind: 'seven accepted cut pulses / pose order',
        events,
        sequence,
      });
    }
  }
  if (basic === 'vo_dang_kiem') {
    await setup();
    const launch = await observe(600, () => keys('KeyW'), [
      { name: 'swordless-release', prefix: 'release_away_' },
      { name: 'swordless-idle', prefix: 'idle_away_' },
    ]);
    coherent(launch, 'swordless launch');
    assert.ok(active());
    assert.ok(
      launch.frames[id].some((f) => /^(release_away|idle_away)_/.test(f.frame)),
    );
    const walk = await observe(
      380,
      async () => {
        await page.locator('#game canvas').focus();
        await page.keyboard.down('ArrowDown');
        await page.keyboard.down('ArrowRight');
      },
      [{ name: 'swordless-walk', prefix: 'walk_away_' }],
    );
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowDown');
    coherent(walk, 'swordless walking');
    assert.ok(walk.frames[id].some((f) => f.frame.startsWith('walk_away_')));
    assert.ok(active());
    const emptyAttack = await observe(350, () => keys('KeyA'), [
      { name: 'swordless-A', prefix: 'release_away_' },
    ]);
    coherent(emptyAttack, 'same unarmed body during actual A');
    assert.ok(active());
    assert.ok(
      emptyAttack.frames[id].some((f) => f.frame.startsWith('release_away_')),
    );
    const hurt = await observe(450, async () => resolveHit(20), [
      { name: 'swordless-hurt', prefix: 'hurt_away_' },
    ]);
    coherent(hurt, 'swordless hurt');
    assert.ok(hurt.frames[id].some((f) => f.frame.startsWith('hurt_away_')));
    assert.ok(h.hp < h.maxHp);
    await wait(() => !active(), 'natural sword expiry');
    // Normal hit resolution may rotate the hero. Validate against authoritative facing,
    // rather than forcing the initial down-right fixture after walking / attacks / hurt.
    const returnDirection = dirs.find(
      (d) => d[1] === Math.sign(h.fx) && d[2] === Math.sign(h.fy),
    )?.[0];
    assert.ok(returnDirection, 'server return facing');
    const returned = await observe(450, undefined, [
      { name: 'sword-return', prefix: 'idle_0_' + returnDirection },
    ]);
    coherent(returned, 'same body after sword return');
    writeFileSync(
      resolve(x.out, 'weapon-return-observation.json'),
      JSON.stringify(
        {
          server: {
            tick: w.tick,
            fx: h.fx,
            fy: h.fy,
            pose: h.pose,
            x: h.x,
            y: h.y,
            projectile: active(),
          },
          frames: [...new Set(returned.frames[id].map((f) => f.frame))],
          client: (await read()).state.players[id],
        },
        null,
        2,
      ),
    );
    assert.ok(
      returned.frames[id].some((f) =>
        new RegExp('^idle_[0-3]_' + returnDirection + '$').test(f.frame),
      ),
    );
    report.checks.push({
      kind: 'natural launch / swordless idle-walk-hurt / return',
      launch: [...new Set(launch.frames[id].map((f) => f.frame))],
      walk: [...new Set(walk.frames[id].map((f) => f.frame))],
      hurt: [...new Set(hurt.frames[id].map((f) => f.frame))],
      attack: [...new Set(emptyAttack.frames[id].map((f) => f.frame))],
      returnDirection,
      returned: [...new Set(returned.frames[id].map((f) => f.frame))],
    });
    await setup();
    await observe(450, () => keys('KeyW'));
    await wait(() => active(), 'second sword exists');
    const before = { x: h.x, y: h.y };
    const blink = await observe(650, () => keys('KeyW'));
    coherent(blink, 'real sword recast teleport');
    assert.ok(
      Math.hypot(h.x - before.x, h.y - before.y) > 15,
      'server-owned sword blink',
    );
    await wait(async () => {
      const s = (await read()).state.players[id];
      return Math.hypot(s.x - h.x, s.y - h.y) < 2;
    }, 'teleport position ack');
    report.checks.push({
      kind: 'real W recast teleport',
      before,
      after: { x: h.x, y: h.y },
    });
    if (stage !== 'weapon') {
      await setup();
      const sky = await observe(6100, () => keys('KeyT'), [
        { name: 'skyfall-aim', prefix: 'aim_' },
      ]);
      coherent(sky, 'skyfall aim and idle');
      assert.ok(sky.frames[id].some((f) => f.frame === 'aim_down_right'));
      assert.ok(sky.frames[id].at(-1).frame.startsWith('idle_'));
      assert.ok(
        sky.events.some(
          (e) =>
            e.sourceId === id &&
            e.abilityId === 'van_kiem_quy_tong' &&
            e.kind === 'hit',
        ),
        'server skyfall hit',
      );
      report.checks.push({
        kind: 'skyfall aim, natural strike, idle',
        hits: sky.events.filter(
          (e) =>
            e.sourceId === id &&
            e.abilityId === 'van_kiem_quy_tong' &&
            e.kind === 'hit',
        ).length,
      });
    }
  }
  return { status: 'PASS', ...report };
}
