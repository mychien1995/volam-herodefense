import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addCreep,
  initializeProgression,
  refreshCharacter,
  conLuan,
  duongMon,
} from '@volam/game-core';
import {
  cancelOwnedEffects,
  applyStatus,
} from '../../packages/game-core/dist/status.js';
import { waitForQa } from '../../tools/qa-wait.mjs';
const snapshot = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
const presentation = (p) => p.evaluate(() => window.__VOLAM__.presentation());
export async function pauseSecondaryRenderers(pages) {
  for (const p of pages.slice(2))
    await p.evaluate(
      () =>
        new Promise((resolve) =>
          window.__VOLAM__.afterRender((renderer) => {
            window.__skillRevisePausedGame = renderer.game;
            renderer.game.pause();
            resolve();
          }),
        ),
    );
}
export async function resumeSecondaryRenderers(pages) {
  for (const p of pages.slice(2))
    await p.evaluate(() => {
      const game = window.__skillRevisePausedGame;
      if (!game) return;
      game.scene.scenes
        .find((s) => s.sys.settings.key === 'Arena')
        .reviewClearTransientEffects();
      game.resume();
      delete window.__skillRevisePausedGame;
    });
}
/** Observe submitted Phaser frames; retain compact frame/event sets, no recordings. */
export async function arm(page, id, ms, waitForPrefix, minFrames = 6) {
  await page.bringToFront();
  await page.evaluate(
    ({ id, ms, waitForPrefix, minFrames }) => {
      const api = window.__VOLAM__,
        frames = new Map(),
        effects = new Map(),
        events = new Map();
      window.__skillReviseTake = new Promise((resolve) => {
        const baseline = api.snapshot().state.players[id]?.actionStartedAt ?? 0,
          deadline = performance.now() + 15000;
        let started;
        const sample = (renderer) => {
          const scene = renderer.game.scene.scenes.find(
              (s) => s.sys.settings.key === 'Arena',
            ),
            sprite = scene.actors.get(id)?.sprite;
          const b = sprite && {
            texture: sprite.texture.key,
            frame: sprite.frame.name,
            scale: [sprite.scaleX, sprite.scaleY],
            origin: [sprite.originX, sprite.originY],
            alpha: sprite.alpha,
            depth: sprite.depth,
            x: sprite.x,
            y: sprite.y,
          };
          const v = { skillRevise: scene.skillReviseArt.inspect() },
            s = api.snapshot();
          const actor = s.state.players[id];
          if (actor?.actionStartedAt > baseline) started ??= performance.now();
          if (b)
            frames.set(b.texture + ':' + b.frame, {
              texture: b.texture,
              frame: b.frame,
              scale: b.scale,
              origin: b.origin,
              alpha: b.alpha,
              pose: actor?.pose,
              tick: s.state.tick,
              startedAt: actor?.actionStartedAt,
              until: actor?.actionUntil,
              fps: scene.game.loop.actualFps,
              renderedAt: performance.now(),
            });
          for (const e of [
            ...v.skillRevise.effects,
            ...v.skillRevise.burstFrames,
          ])
            if (e.visible !== false) effects.set(e.texture + ':' + e.frame, e);
          for (const node of scene.children.list)
            if (node.visible && node.texture?.key === 'contact-impacts-v01') {
              const e = {
                texture: node.texture.key,
                frame: node.frame.name,
                visible: true,
                x: node.x,
                y: node.y,
                depth: node.depth,
                scaleX: node.scaleX,
                scaleY: node.scaleY,
              };
              effects.set(e.texture + ':' + e.frame, e);
            }
          for (const e of s.events) if (e.sourceId === id) events.set(e.id, e);
          if (
            (started &&
              performance.now() >= started + ms &&
              (!waitForPrefix ||
                [...frames.values()].filter((f) =>
                  f.frame.startsWith(waitForPrefix),
                ).length >= minFrames)) ||
            performance.now() >= deadline
          )
            resolve({
              frames: [...frames.values()],
              effects: [...effects.values()],
              events: [...events.values()],
            });
          else api.afterRender(sample);
        };
        api.afterRender(sample);
      });
    },
    { id, ms, waitForPrefix, minFrames },
  );
  return () => page.evaluate(() => window.__skillReviseTake);
}
export async function verifySkillReviseGame({ room, pages, out, report }) {
  const combatOnly = process.env.VOLAM_QA_SKILL_REVISE_RESUME === 'combat';
  const [page, peer] = pages,
    w = room.world,
    c = room.simulation.arena.config,
    result = {
      players: pages.length,
      actualGame: true,
      renderClientsDuringArt: 2,
      coverage: combatOnly
        ? 'natural-six-client-combat-retry'
        : process.env.VOLAM_QA_SKILL_REVISE_RESUME === 'laser'
          ? 'laser-and-combat-retry'
          : process.env.VOLAM_QA_SKILL_REVISE_ONLY === 'skills'
            ? 'skills-only'
            : 'full',
      naturalCombat: false,
      cases: [],
      fixtures:
        'Server arranges legal builds and stationary target placement; normal keyboard A/Q/T and real simulation resolve every hit. No client damage/position injection.',
    };
  const save = () =>
    writeFileSync(
      resolve(out, 'skill-revise-game.json'),
      JSON.stringify(result, null, 2) + '\n',
    );
  const owner = (await snapshot(page)).sessionId,
    h = w.heroes.get(owner);
  room.simulation.invasion.nextWaveTick = w.tick + 100000;
  c.collision = [];
  c.creepRespawn = false;
  w.random = () => 0.99;
  w.creeps.clear();
  for (const a of w.heroes.values())
    Object.assign(a, { x: 800, y: 650, moveX: 0, moveY: 0 });
  const setup = async (basic, school, skill = '', fx = 1, fy = 0) => {
    w.creeps.clear();
    for (const a of w.heroes.values()) cancelOwnedEffects(w, a.id);
    h.schoolId = school;
    room.state.players.get(owner).schoolId = school;
    h.level = 30;
    initializeProgression(h, c, 'custom', basic);
    const slot = c.progression.skills[skill]?.ultimate ? 4 : 0;
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
      skillIds: Array.from({ length: 5 }, (_, i) => (i === slot ? skill : '')),
      skillCooldowns: [0, 0, 0, 0, 0],
      abilityCooldowns: {},
      basicChains: {},
      hurtUntil: 0,
    });
    refreshCharacter(h, c);
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    await waitForQa(async () => {
      const s = await snapshot(peer);
      return (
        s.state.players[owner]?.basicId === basic &&
        s.state.players[owner]?.castAbilityId === ''
      );
    }, 'peer receives revised build');
    return slot;
  };
  const target = (distance = 150) => {
    const e = addCreep(
      w,
      'revise_target',
      { x: h.x + h.fx * distance, y: h.y + h.fy * distance },
      c,
    );
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
  await page.locator('#game canvas').focus();
  const press = async (key) => {
    await page.keyboard.press(key);
  };
  try {
    // Art iteration needs two live renderers. Keep all six server connections;
    // resume every renderer for the separate natural combat/readability phase.
    if (!combatOnly) await pauseSecondaryRenderers(pages);
    if (
      process.env.VOLAM_QA_SKILL_REVISE_ONLY === 'skills' &&
      pages.length === 6
    )
      throw Error('Final six-client coverage cannot omit hammer motion');
    if (!combatOnly) {
      if (
        process.env.VOLAM_QA_SKILL_REVISE_ONLY !== 'skills' &&
        process.env.VOLAM_QA_SKILL_REVISE_RESUME !== 'laser'
      )
        for (const [d, fx, fy] of [
          ['right', 1, 0],
          ['down', 0, 1],
          ['left', -1, 0],
          ['up', 0, -1],
          ['down_right', 1, 1],
          ['down_left', -1, 1],
          ['up_right', 1, -1],
          ['up_left', -1, -1],
        ]) {
          const length = Math.hypot(fx, fy);
          await setup(
            conLuan.monk,
            conLuan.school,
            '',
            fx / length,
            fy / length,
          );
          target(50);
          for (const stage of ['thrust', 'sweep', 'overhead']) {
            const take = await arm(peer, owner, 1800),
              before = h.actionStartedAt;
            await press('KeyA');
            await waitForQa(
              () => h.actionStartedAt > before,
              'server accepts ' + stage,
            );
            const observed = await take(),
              prefix = stage === 'overhead' ? 'slam' : stage;
            const motion = observed.frames.filter(
              (f) =>
                f.texture.startsWith('skill-revise:') &&
                f.frame.startsWith(prefix + '_'),
            );
            assert(
              motion.length >= 3,
              `${stage}/${d}: ${JSON.stringify(observed.frames)}`,
            );
            assert(
              motion.every(
                (f) => f.scale[0] === 0.5 && f.origin[1] === 320 / 448,
              ),
            );
            result.cases.push({
              type: 'hammer',
              direction: d,
              stage,
              frames: motion.map((f) => f.frame),
              scale: 0.5,
            });
          }
        }
      await page
        .locator('#game canvas')
        .screenshot({ path: resolve(out, 'arena-idle-down.png') });
      for (const [basic, school, skill, ms, effect] of [
        ['cai_bang_chuong', 'cai_bang', 'hoa_van_chuong', 1600, 'fire-impact'],
        [
          'thien_son_phien',
          'thien_son',
          'chiet_mai_thu',
          2100,
          'wind-crescent',
        ],
        ['vo_dang_quyen', 'vo_dang', 'huyen_am_chuong', 2500, 'ink-impact'],
        [
          'vo_dang_kiem',
          'vo_dang',
          'that_tinh_kiem',
          1800,
          'sword-rain-impact',
        ],
        [duongMon.coQuan, duongMon.school, duongMon.arrows, 1900, 'ice-bomb'],
        [
          duongMon.coQuan,
          duongMon.school,
          duongMon.laser,
          1600,
          'laser-ground',
        ],
        [
          conLuan.sword,
          conLuan.school,
          conLuan.star,
          9000,
          'con_luan_spell_fx',
        ],
      ]) {
        if (
          process.env.VOLAM_QA_SKILL_REVISE_RESUME === 'laser' &&
          ![duongMon.laser, conLuan.star].includes(skill)
        )
          continue;
        const slot = await setup(basic, school, skill);
        if (basic === duongMon.coQuan)
          applyStatus(
            h,
            { kind: 'duong_mon_flight', durationTicks: 1000, magnitude: 1 },
            owner,
            duongMon.flight,
            w.tick,
          );
        const e = target(skill === 'that_tinh_kiem' ? 240 : 150),
          before = e.hp;
        const take = await arm(peer, owner, ms);
        await press(slot === 4 ? 'KeyT' : 'KeyQ');
        const observed = await take();
        result.pending = {
          skill,
          observed,
          server: {
            x: h.x,
            y: h.y,
            pose: h.pose,
            castAbilityId: h.castAbilityId,
            statuses: h.statuses,
          },
        };
        save();
        assert(
          observed.events.some(
            (e) => e.kind === 'cast' && e.abilityId === skill,
          ),
          'Missing accepted cast ' + skill,
        );
        assert(
          observed.effects.some((e) => e.texture.includes(effect)),
          `${skill}: missing ${effect}; ${JSON.stringify(observed.effects)}`,
        );
        assert(e.hp < before, skill + ' did not damage target');
        if (skill === 'huyen_am_chuong')
          assert(
            observed.events.filter(
              (e) => e.kind === 'pulse' && e.stage === 'area_tick',
            ).length >= 5,
          );
        if (skill === 'that_tinh_kiem')
          assert.equal(
            observed.events.filter((e) => e.stage === 'sword_rain_impact')
              .length,
            7,
          );
        if (skill === conLuan.star)
          assert.equal(
            observed.events.filter((e) => e.stage === 'formation_burst').length,
            5,
          );
        result.cases.push({
          type: 'skill',
          skill,
          hpLost: before - e.hp,
          frames: observed.frames.map((f) => f.texture + ':' + f.frame),
          effects: observed.effects.map((e) => e.texture + ':' + e.frame),
        });
        delete result.pending;
        save();
      }
      await setup(conLuan.monk, conLuan.school, conLuan.stance);
      const attacker = target(35);
      attacker.controlled = false;
      attacker.stats.damage = 4;
      attacker.stats.attackRange = 80;
      attacker.stats.detectionRange = 500;
      w.random = () => 0;
      const take = await arm(peer, owner, 1300),
        hp = h.hp;
      await waitForQa(
        () => attacker.statuses?.some((s) => s.kind === 'stun'),
        'passive lightning from real creep A',
      );
      const parry = await take();
      assert(parry.effects.some((e) => e.texture.includes('lightning-parry')));
      result.cases.push({
        type: 'passive',
        hpLost: hp - h.hp,
        effects: parry.effects,
      });
      w.random = () => 0.99;
      await setup('thien_son_phien', 'thien_son', 'luu_phong_bo');
      await press('KeyQ');
      await waitForQa(
        () =>
          [...w.projectiles.values()].some((p) => p.stage === 'fan_outbound'),
        'fan launched',
      );
      await press('KeyQ');
      await waitForQa(
        () => [...w.projectiles.values()].some((p) => p.stage === 'fan_hold'),
        'fan stopped',
      );
      await press('KeyQ');
      await waitForQa(
        () => [...w.projectiles.values()].some((p) => p.stage === 'fan_return'),
        'fan recalled',
      );
      await waitForQa(() => w.projectiles.size === 0, 'fan cleanup');
      result.cases.push({ type: 'fan', threeInputs: true });
    }
    if (!combatOnly) await resumeSecondaryRenderers(pages);
    // One real combat pass across all clients, using normal A inputs and natural death/rewards.
    w.creeps.clear();
    const heroes = [...w.heroes.values()],
      basics = [
        conLuan.monk,
        'cai_bang_bong',
        'thien_son_dao',
        'thieu_lam_quyen',
        'vo_dang_quyen',
        'vo_dang_kiem',
      ];
    for (const [i, a] of heroes.entries()) {
      cancelOwnedEffects(w, a.id);
      a.schoolId = c.progression.defaultBranches[basics[i]].schoolId;
      a.level = 6;
      a.xp = 5 * c.xpPerLevel;
      initializeProgression(a, c, 'fixed', basics[i]);
      room.state.players.get(a.id).schoolId = a.schoolId;
      refreshCharacter(a, c);
      Object.assign(a, {
        x: 700 + (i % 3) * 25,
        y: 700 + Math.floor(i / 3) * 16,
        hp: a.maxHp,
        moveX: 0,
        moveY: 0,
        cooldown: 0,
        pose: 'idle',
        castAbilityId: '',
        actionUntil: 0,
      });
    }
    const e = addCreep(w, 'natural_revise', { x: 760, y: 708 }, c);
    e.hp = e.maxHp = 1000;
    e.invasionWave = 2;
    e.stats = {
      ...c.creep,
      hp: 1000,
      speed: 0,
      damage: 12,
      attackRange: 100,
      detectionRange: 500,
    };
    const rewards = heroes.map((a) => ({
      id: a.id,
      xp: a.xp,
      gold: a.gold,
      hp: a.hp,
    }));
    for (const p of pages) await p.locator('#game canvas').focus();
    for (let n = 0; n < 30 && e.hp > 0; n++) {
      await Promise.all(pages.map((p) => p.keyboard.press('KeyA')));
      if (n === 3)
        await page
          .locator('#game canvas')
          .screenshot({ path: resolve(out, 'arena-natural-combat.png') });
      const tick = w.tick;
      await waitForQa(() => w.tick >= tick + 7, 'combat cadence');
    }
    assert(e.hp <= 0, 'natural attacks must kill the enemy');
    assert(
      heroes.some((a, i) => a.xp > rewards[i].xp || a.gold > rewards[i].gold),
      'natural reward',
    );
    await Promise.all(
      pages.map((p) =>
        waitForQa(async () => {
          const s = await snapshot(p);
          return (
            s.state.creeps.natural_revise?.hp === 0 ||
            !s.state.creeps.natural_revise
          );
        }, 'peer enemy death'),
      ),
    );
    result.naturalCombat = true;
    result.rewards = heroes.map((a, i) => ({
      id: a.id,
      xpGained: a.xp - rewards[i].xp,
      goldGained: a.gold - rewards[i].gold,
      hpLost: rewards[i].hp - a.hp,
    }));
    assert(
      result.rewards.some((r) => r.hpLost > 0),
      'natural incoming damage observed',
    );
    for (const a of heroes) cancelOwnedEffects(w, a.id);
    w.creeps.clear();
    await waitForQa(async () => {
      const v = await presentation(peer);
      return v.skillRevise.effects.length === 0 && v.skillRevise.bursts === 0;
    }, 'new VFX cleanup');
    result.status = 'PASS';
    result.finalAcceptance =
      pages.length === 6 &&
      !report.development &&
      !process.env.VOLAM_QA_SKILL_REVISE_RESUME;
    save();
    return result;
  } catch (e) {
    result.status = 'FAIL';
    result.error = e.stack;
    save();
    await page.screenshot({ path: resolve(out, 'failure.png') });
    throw e;
  }
}
