import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export async function verifyNguDocChoreography(x) {
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
      resolveHit,
    } = x,
    id = ids[0],
    d = dirs[1],
    report = { status: 'PASS', basic, checks: [] };
  const setup = async () => {
    reset(d);
    heroes.forEach((h, i) => target(h, d, 'nd_extra_' + i));
    await settle();
  };
  if (basic === 'ngu_doc_ta_hiep') {
    await setup();
    const on = await observe(1100, () => keys('KeyQ'), [
      { name: 'poison-toggle', prefix: 'poison_charge_' },
      { name: 'poison-hands-idle', prefix: 'idle_' },
    ]);
    coherent(on, 'same canonical body with poison palms');
    assert.ok(
      heroes.every((h) => h.statuses.some((s) => s.kind === 'ngu_doc_palm')),
    );
    const sockets = JSON.parse(
      readFileSync(
        'assets/exports/ngu-doc-ta-hiep-unified-v1/hands.json',
        'utf8',
      ),
    );
    const checkHands = async () => {
      const p = await page.evaluate(() => window.__VOLAM__.presentation());
      const body = p.actors.find((b) => b.id === id);
      const fx = p.nguDoc.filter((f) =>
        f.name?.startsWith('ngu-doc:hand:' + id + ':'),
      );
      assert.equal(fx.length, 2, 'same two existing palm effects');
      const measured = sockets[body.frame];
      assert.ok(measured);
      for (let i = 0; i < 2; i++) {
        const f = fx.find((f) => f.name.endsWith(':' + i));
        assert.ok(
          Math.abs(f.x - (body.x + measured[i].x * 0.5)) < 0.6 &&
            Math.abs(f.y - (body.y + measured[i].y * 0.5)) < 0.6,
          'effect follows actual canonical hand ' + i,
        );
      }
      return { frame: body.frame, effects: fx };
    };
    report.checks.push({
      kind: 'Q poison toggle + canonical palm attachment',
      sample: await checkHands(),
    });
    const before = (await read()).events.at(-1)?.id ?? 0;
    const a = await observe(1000, () => keys('KeyA'), [
      { name: 'poison-basic', prefix: 'palm_release_' },
    ]);
    coherent(a, 'actual poisonous A body');
    assert.ok(
      a.events.some(
        (e) =>
          e.id > before &&
          e.sourceId === id &&
          e.abilityId === basic &&
          e.kind === 'attack' &&
          e.stage === 'ngu_doc_toxic',
      ),
    );
    await checkHands();
    const hurt = await observe(450, async () => resolveHit(40), [
      { name: 'poison-hurt', prefix: 'hurt_' },
    ]);
    coherent(hurt, 'same body hurt while poison palms active');
    assert.ok(hurt.frames[id].some((f) => f.frame.startsWith('hurt_')));
    await checkHands();
    await observe(700, () => keys('KeyQ'));
    await wait(
      () =>
        heroes.every((h) => !h.statuses.some((s) => s.kind === 'ngu_doc_palm')),
      'actual Q toggle off',
    );
    await wait(
      async () =>
        !(
          await page.evaluate(() => window.__VOLAM__.presentation().nguDoc)
        ).some((f) => f.name?.startsWith('ngu-doc:hand:' + id + ':')),
      'same flame objects cleaned after Q off',
    );
    report.checks.push({
      kind: 'real toxic A, hurt, Q off and effect cleanup',
    });
  } else {
    await setup();
    const army = await observe(1200, () => keys('KeyW'), [
      { name: 'summon-jiangshi', prefix: 'summon_' },
    ]);
    coherent(army, 'canonical caller body');
    assert.ok(
      heroes.every(
        (h) =>
          h.nguDocSummons.filter((m) => m.kind === 'jiangshi').length === 4,
      ),
      'actual rank4 jiangshi summons',
    );
    report.checks.push({
      kind: 'real W summons four retained original minions per owner',
    });
    await setup();
    const reaper = await observe(1400, () => keys('KeyT'), [
      { name: 'reaper-ritual', prefix: 'ritual_touch_' },
    ]);
    coherent(reaper, 'canonical reaper ritual');
    assert.ok(
      heroes.every((h) => h.nguDocSummons.some((m) => m.kind === 'reaper')),
      'actual reaper summons',
    );
    assert.ok(reaper.frames[id].some((f) => f.frame.startsWith('ritual_')));
    report.checks.push({
      kind: 'real T ritual with retained original reaper art',
    });
  }
  await setup();
  const passive = basic === 'ngu_doc_ta_hiep' ? 'vo_hinh_doc' : 'vo_hinh_ma_co',
    since = (await read()).events.at(-1)?.id ?? 0;
  const r = await observe(450, () => keys('KeyR'));
  coherent(r, 'passive R remains canonical idle');
  assert.ok(
    !r.events.some(
      (e) => e.id > since && e.abilityId === passive && e.kind === 'cast',
    ),
    'R remains passive',
  );
  report.checks.push({ kind: 'unchanged passive R, no manufactured cast' });
  return report;
}
