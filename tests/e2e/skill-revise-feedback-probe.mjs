import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addCreep,
  initializeProgression,
  refreshCharacter,
  conLuan,
} from '@volam/game-core';
import { cancelOwnedEffects } from '../../packages/game-core/dist/status.js';
import { waitForQa } from '../../tools/qa-wait.mjs';
import {
  arm,
  verifySkillReviseGame,
  pauseSecondaryRenderers,
  resumeSecondaryRenderers,
} from './skill-revise-game-probe.mjs';

export async function verifySkillReviseFeedback({ room, pages, out, report }) {
  const baseline = process.env.VOLAM_QA_SKILL_REVISE_FEEDBACK === 'baseline';
  const pilot = process.env.VOLAM_QA_SKILL_REVISE_FEEDBACK === 'pilot';
  const hammerBank = process.env.VOLAM_QA_HAMMER_BANK ?? 'hammer-combo-v7';
  const sweepBank = process.env.VOLAM_QA_SWEEP_BANK ?? 'hammer-sweep-v8';
  const [page, peer] = pages,
    w = room.world,
    c = room.simulation.arena.config;
  const snapshot = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
  const owner = (await snapshot(page)).sessionId,
    h = w.heroes.get(owner);
  const result = {
    status: 'RUNNING',
    baseline,
    players: pages.length,
    facings: [],
    attacks: [],
    walking: [],
    fire: [],
    fixtures:
      'Server-arranged legal builds/positions. Accepted keyboard A/Q resolve attacks and AOE.',
  };
  if (process.env.VOLAM_QA_SKIP_RETAINED_WALK === '1') {
    const path =
      process.env.VOLAM_QA_RETAINED_WALK_REPORT ??
      'docs/evidence/skill-revise-thien-su-v05/two/skill-revise-game/feedback-v04.json';
    const retained = JSON.parse(readFileSync(path, 'utf8'));
    assert(
      retained.status === 'PASS' &&
        retained.walking.length === 3 &&
        retained.walking.every((w) => w.frames.length === 4),
    );
    result.retainedWalking = {
      path,
      walking: retained.walking,
      note: 'Walking rasters unchanged; explicit two-client coverage retained. Six-client run covers the current three-stage A and natural combat.',
    };
  }
  const save = () =>
    writeFileSync(
      resolve(out, 'feedback-v04.json'),
      JSON.stringify(result, null, 2) + '\n',
    );
  room.simulation.invasion.nextWaveTick = w.tick + 100000;
  c.collision = [];
  c.creepRespawn = false;
  w.creeps.clear();
  w.random = () => 0.99;
  const setup = async (basic, school, skill = '', fx = 1, fy = 0) => {
    w.creeps.clear();
    for (const a of w.heroes.values()) cancelOwnedEffects(w, a.id);
    h.schoolId = school;
    room.state.players.get(owner).schoolId = school;
    h.level = 30;
    initializeProgression(h, c, 'custom', basic);
    if (skill) h.progression.ranks[skill] = 1;
    h.progression.revision++;
    Object.assign(h, {
      x: 700,
      y: 700,
      fx,
      fy,
      pose: 'idle',
      actionUntil: 0,
      actionStartedAt: 0,
      castAbilityId: '',
      moveX: 0,
      moveY: 0,
      cooldown: 0,
      skillIds: [skill, '', '', '', ''],
      skillCooldowns: [0, 0, 0, 0, 0],
      abilityCooldowns: {},
      basicChains: {},
      hurtUntil: 0,
    });
    refreshCharacter(h, c);
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    for (const a of w.heroes.values())
      if (a.id !== owner)
        Object.assign(a, { x: 950, y: 650, moveX: 0, moveY: 0 });
    await waitForQa(async () => {
      const s = await snapshot(peer);
      return (
        s.state.players[owner]?.basicId === basic &&
        s.state.players[owner]?.castAbilityId === '' &&
        Math.abs(s.state.players[owner]?.fx - fx) < 0.00001
      );
    }, 'feedback build/facing acknowledged');
    await page.locator('#game canvas').focus();
  };
  const enemy = (id, x, y) => {
    const e = addCreep(w, id, { x, y }, c);
    Object.assign(e, {
      hp: 10000,
      maxHp: 10000,
      controlled: true,
      invasionWave: 2,
      stats: {
        ...c.creep,
        hp: 10000,
        defense: 0,
        speed: 0,
        damage: 0,
        detectionRange: 0,
      },
    });
    return e;
  };
  const body = () =>
    peer.evaluate(
      (id) =>
        new Promise((resolve) =>
          window.__VOLAM__.afterRender((renderer) => {
            const s = renderer.game.scene.scenes
              .find((s) => s.sys.settings.key === 'Arena')
              .actors.get(id).sprite;
            resolve({
              texture: s.texture.key,
              frame: s.frame.name,
              scale: s.scaleX,
              origin: [s.originX, s.originY],
              depth: s.depth,
            });
          }),
        ),
      owner,
    );
  const proof = async (kind) => {
    await peer.evaluate(
      ({ id, kind, hammerBank, sweepBank }) => {
        const api = window.__VOLAM__,
          deadline = performance.now() + 15000;
        window.__skillRepairProof = new Promise((resolve) => {
          const observe = (renderer) => {
            const scene = renderer.game.scene.scenes.find(
                (s) => s.sys.settings.key === 'Arena',
              ),
              sprite = scene.actors.get(id)?.sprite;
            const found =
              kind === 'slam' || kind === 'sweep'
                ? sprite?.texture.key ===
                    'skill-revise:' +
                      (kind === 'sweep' ? sweepBank : hammerBank) &&
                  sprite.frame.name ===
                    (kind === 'slam' ? 'slam_4_right' : 'sweep_3_right')
                : scene.skillReviseArt
                    .inspect()
                    .burstFrames.some(
                      (e) =>
                        e.visible &&
                        e.texture === 'skill-revise:fire-impact' &&
                        ['open', 'peak'].includes(e.frame),
                    );
            if (found) resolve(renderer.game.canvas.toDataURL('image/png'));
            else if (performance.now() > deadline) resolve(null);
            else api.afterRender(observe);
          };
          api.afterRender(observe);
        });
      },
      { id: owner, kind, hammerBank, sweepBank },
    );
    return async () => {
      const data = await peer.evaluate(() => window.__skillRepairProof);
      assert(data, 'Missing rendered ' + kind + ' proof');
      writeFileSync(
        resolve(out, 'feedback-v04-' + kind + '.png'),
        Buffer.from(data.split(',')[1], 'base64'),
      );
    };
  };
  try {
    await pauseSecondaryRenderers(pages);
    for (const [d, fx, fy] of pilot
      ? [['right', 1, 0]]
      : baseline
        ? [
            ['right', 1, 0],
            ['left', -1, 0],
          ]
        : [
            ['right', 1, 0],
            ['left', -1, 0],
            ['down', 0, 1],
            ['up', 0, -1],
            ['down_right', Math.SQRT1_2, Math.SQRT1_2],
            ['down_left', -Math.SQRT1_2, Math.SQRT1_2],
            ['up_right', Math.SQRT1_2, -Math.SQRT1_2],
            ['up_left', -Math.SQRT1_2, -Math.SQRT1_2],
          ]) {
      await setup(conLuan.monk, conLuan.school, '', fx, fy);
      const idle = await body();
      result.facings.push({ direction: d, idle });
      if (!baseline)
        assert.equal(idle.texture, 'skill-revise:hammer-coherent-v4');
      if (!baseline && fx < 0 && !result.retainedWalking) {
        await peer.evaluate(
          ({ id, d }) => {
            const api = window.__VOLAM__,
              deadline = performance.now() + 12000,
              frames = new Set();
            window.__repairWalk = new Promise((resolve) => {
              const sample = (renderer) => {
                const sprite = renderer.game.scene.scenes
                  .find((s) => s.sys.settings.key === 'Arena')
                  .actors.get(id)?.sprite;
                if (
                  sprite?.texture.key === 'skill-revise:hammer-coherent-v4' &&
                  sprite.frame.name.startsWith('walk_') &&
                  sprite.frame.name.endsWith('_' + d)
                )
                  frames.add(sprite.frame.name);
                if (frames.size === 4 || performance.now() > deadline)
                  resolve([...frames]);
                else api.afterRender(sample);
              };
              api.afterRender(sample);
            });
          },
          { id: owner, d },
        );
        const start = { x: h.x, y: h.y };
        const keys = [
          'ArrowLeft',
          ...(fy < 0 ? ['ArrowUp'] : fy > 0 ? ['ArrowDown'] : []),
        ];
        for (const key of keys) await page.keyboard.down(key);
        let frames;
        try {
          frames = await peer.evaluate(() => window.__repairWalk);
        } finally {
          for (const key of keys) await page.keyboard.up(key);
        }
        await waitForQa(
          () => h.moveX === 0 && h.moveY === 0,
          'walking release acknowledged',
        );
        assert.equal(
          frames.length,
          4,
          'left-facing walk must draw its four authored cels',
        );
        assert(h.x < start.x - 10, 'server must acknowledge walking left');
        result.walking.push({
          direction: d,
          frames,
          delta: { x: h.x - start.x, y: h.y - start.y },
        });
        await setup(conLuan.monk, conLuan.school, '', fx, fy);
      }
      enemy('hammer-target', 700 + fx * 50, 700 + fy * 50);
      for (const stage of ['thrust', 'sweep', 'overhead']) {
        const capture =
          !baseline && d === 'right' && stage !== 'thrust'
            ? await proof(stage === 'overhead' ? 'slam' : 'sweep')
            : undefined;
        const prefix = stage === 'overhead' ? 'slam' : stage;
        const take = await arm(
            peer,
            owner,
            1000,
            !baseline ? prefix + '_' : undefined,
            6,
          ),
          before = h.actionStartedAt;
        await page.keyboard.press('KeyA');
        await waitForQa(
          () => h.actionStartedAt > before,
          'feedback accepted ' + stage,
        );
        const observed = await take();
        const frames = observed.frames.filter((f) =>
          f.frame.startsWith(prefix + '_'),
        );
        assert(
          frames.length >= (baseline ? 3 : 6),
          stage + '/' + d + ' missing motion',
        );
        if (!baseline)
          assert(
            frames.every(
              (f) =>
                f.texture ===
                  (stage === 'thrust'
                    ? 'skill-revise:hammer-coherent-v4'
                    : 'skill-revise:' +
                      (stage === 'sweep' ? sweepBank : hammerBank)) &&
                f.scale[0] === 0.5,
            ),
          );
        const recovery = await body();
        if (!baseline && stage === 'overhead')
          assert(
            observed.effects.some((e) => e.texture === 'con_luan_thien_su_fx'),
            'ground impact must be drawn during slam contact',
          );
        if (!baseline && stage !== 'overhead')
          assert(
            observed.effects.some(
              (e) =>
                e.texture === 'contact-impacts-v01' &&
                e.frame.startsWith(
                  stage === 'thrust' ? 'hammer-point' : 'hammer-sweep',
                ),
            ),
            'retained hammer lightning/contact image must remain visible on ' +
              stage,
          );
        result.attacks.push({ direction: d, stage, frames, recovery });
        if (capture) await capture();
        save();
      }
    }
    await setup('cai_bang_chuong', 'cai_bang', 'hoa_van_chuong');
    const crossed = enemy('crossed', 780, 700),
      a = enemy('aoe-a', 910, 750),
      b = enemy('aoe-b', 910, 650),
      outside = enemy('outside', 910, 790);
    const captureFire = !baseline ? await proof('fire') : undefined;
    const take = await arm(peer, owner, 1500);
    await page.keyboard.press('KeyQ');
    const observed = await take();
    result.fire = observed.effects.filter((e) =>
      e.texture.includes('fire-impact'),
    );
    assert(result.fire.length > 0, 'endpoint explosion not drawn');
    assert(
      crossed.hp < 10000 && a.hp < 10000 && b.hp < 10000,
      'AOE must hit both sides at the endpoint',
    );
    assert.equal(outside.hp, 10000);
    result.fireDamage = {
      crossed: 10000 - crossed.hp,
      left: 10000 - a.hp,
      right: 10000 - b.hp,
      outside: 10000 - outside.hp,
    };
    if (captureFire) await captureFire();
    result.hudIcon = await page
      .locator('.hotbar-slot .skill-icon')
      .evaluateAll((nodes) =>
        nodes.map((n) => getComputedStyle(n).backgroundImage),
      );
    if (!baseline)
      assert(
        result.hudIcon.some((path) =>
          path.includes('/skill-revise-feedback-v04/icons/hoa-long.png'),
        ),
      );
    if (!baseline)
      assert(
        result.fire.every(
          (e) =>
            e.depth < 700 && Math.abs(e.y - 700) < 1 && e.scaleY < e.scaleX,
        ),
        'Explosion must be below feet in the ground plane',
      );
    if (!baseline && !pilot) {
      await resumeSecondaryRenderers(pages);
      const prior = process.env.VOLAM_QA_SKILL_REVISE_RESUME;
      process.env.VOLAM_QA_SKILL_REVISE_RESUME = 'combat';
      try {
        const natural = await verifySkillReviseGame({
          room,
          pages,
          out,
          report,
        });
        result.naturalCombat = natural.naturalCombat;
      } finally {
        if (prior === undefined)
          delete process.env.VOLAM_QA_SKILL_REVISE_RESUME;
        else process.env.VOLAM_QA_SKILL_REVISE_RESUME = prior;
      }
    }
    result.status = 'PASS';
    result.finalAcceptance =
      pages.length === 6 &&
      !report.development &&
      !baseline &&
      !pilot &&
      result.attacks.length === 24 &&
      (result.walking.length === 3 || !!result.retainedWalking) &&
      result.naturalCombat === true;
    save();
    return result;
  } catch (e) {
    result.status = 'FAIL';
    result.error = e.stack;
    save();
    await page.screenshot({ path: resolve(out, 'feedback-v04-failure.png') });
    throw e;
  }
}
