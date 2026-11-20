import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { addCreep } from '@volam/game-core';
import { waitForQa } from '../../tools/qa-wait.mjs';
import { verifyDepthExpansion } from './world-depth-expansion-probe.mjs';
export async function verifyFinishScenes(context) {
  const { room, pages, out } = context,
    [page] = pages,
    sim = room.simulation;
  const movements = [];
  const onZone = async ({ hero: h, zone, dungeon }) => {
    if (dungeon) Object.assign(h, { x: dungeon.spawn.x, y: dungeon.spawn.y });
    const view = () => page.evaluate(() => window.__VOLAM__.presentation());
    const wait = (fn, label) =>
      waitForQa(fn, label, { timeout: 12000, diagnostics: view });
    await wait(
      async () =>
        (await view()).actors.some(
          (a) => a.id === h.id && Math.abs(a.x - h.x) < 3,
        ),
      'zone feet acknowledgement',
    );
    if (zone.id === 'loi_dai') {
      const v = await view();
      assert.ok(
        v.actors.some(
          (a) => a.id === h.id && /^hero-(motion|finish):/.test(a.texture),
        ),
      );
      movements.push({
        zone: zone.id,
        scope: 'PvP waiting/spectator idle and lighting; no active duel seeded',
      });
      return;
    }
    await page.locator('#game canvas').focus();
    const start = { x: h.x, y: h.y };
    // All canonical spawn points have a short open area toward the arena interior.
    const arrow = dungeon?.id === 'forest' ? 'ArrowRight' : 'ArrowUp';
    await page.keyboard.down(arrow);
    try {
      await wait(
        async () => Math.hypot(h.x - start.x, h.y - start.y) > 16,
        'real zone walk ' + zone.id,
      );
    } finally {
      await page.keyboard.up(arrow);
    }
    await wait(async () => h.pose === 'idle', 'zone walk recovery');
    if (zone.id === 'loi_dai') {
      movements.push({
        zone: zone.id,
        moved: Math.hypot(h.x - start.x, h.y - start.y),
        scope: 'real walk and idle; duel skills require an active duel',
      });
      return;
    }
    h.fx = h.fy = Math.SQRT1_2;
    h.cooldown = 0;
    h.actionUntil = 0;
    const e = [...zone.world.creeps.values()].find(
      (e) =>
        !e.encounterBoss &&
        !e.bossEncounter &&
        !e.waveBossActor &&
        e.archetypeId !== dungeon?.id,
    );
    if (e)
      Object.assign(e, {
        x: h.x + 34,
        y: h.y + 34,
        controlled: true,
        hp: 100000,
        maxHp: 100000,
      });
    await page.waitForTimeout(150);
    const before = await page.evaluate(
      () => window.__VOLAM__.snapshot().events.at(-1)?.id ?? 0,
    );
    await page.evaluate(() => {
      window.__zoneCastFrames = [];
      window.__zoneCastEvents = [];
      window.__zoneStop = false;
      const api = window.__VOLAM__;
      const sample = () => {
        if (window.__zoneStop) return;
        const s = api.snapshot(),
          a = api.presentation().actors.find((a) => a.id === s.sessionId);
        if (a) window.__zoneCastFrames.push(a.texture + ':' + a.frame);
        window.__zoneCastEvents.push(...s.events);
        api.afterRender(sample);
      };
      api.afterRender(sample);
    });
    await page.keyboard.press('KeyA', { delay: 30 });
    await page.waitForTimeout(950);
    const sample = await page.evaluate(() => {
      window.__zoneStop = true;
      return {
        frames: [...new Set(window.__zoneCastFrames)],
        events: window.__zoneCastEvents,
      };
    });
    assert.ok(
      sample.events.some(
        (e) => e.id > before && e.sourceId === h.id && e.kind === 'attack',
      ),
      'zone A command ' + zone.id,
    );
    const attack = sample.events.find(
      (e) => e.id > before && e.sourceId === h.id && e.kind === 'attack',
    );
    const sector =
      (Math.round(Math.atan2(attack.fy, attack.fx) / (Math.PI / 4)) + 8) % 8;
    const direction = [
      'right',
      'down_right',
      'down',
      'down_left',
      'left',
      'up_left',
      'up',
      'up_right',
    ][sector];
    if (direction.includes('_'))
      assert.ok(
        sample.frames.some(
          (f) =>
            f.includes('strike_' + direction) ||
            f.includes('alternate_' + direction),
        ),
        'diagonal body after travel ' + zone.id,
      );
    else
      assert.ok(
        sample.frames.some((f) => !/^hero-(motion|finish):/.test(f)),
        'retained cardinal action after travel ' + zone.id,
      );
    const audit = await page.evaluate(
      () =>
        new Promise((resolve) =>
          window.__VOLAM__.afterRender((renderer) =>
            resolve(
              renderer.game.scene.getScene('Arena').worldDepth.auditShadows(),
            ),
          ),
        ),
    );
    assert.equal(audit.clipped, 0);
    movements.push({
      zone: zone.id,
      moved: Math.hypot(h.x - start.x, h.y - start.y),
      frames: sample.frames,
      hp: e?.hp,
      edgeAudit: audit,
    });
  };
  let zones;
  if (process.env.VOLAM_SCENES_PART !== 'bosses') {
    const zonesOut = resolve(out, 'zones');
    mkdirSync(zonesOut, { recursive: true });
    process.env.VOLAM_DEPTH_STAGE = '2';
    process.env.VOLAM_DEPTH_BATCH = '2';
    zones = await verifyDepthExpansion({
      ...context,
      out: zonesOut,
      onZone,
    });
    writeFileSync(
      resolve(out, 'zone-motion.json'),
      JSON.stringify({ status: 'PASS', movements }, null, 2),
    );
  }
  const bossOut = resolve(out, 'bosses');
  mkdirSync(bossOut, { recursive: true });
  process.env.VOLAM_DEPTH_STAGE = '4';
  process.env.VOLAM_DEPTH_BATCH = '4';
  const bosses = await verifyDepthExpansion({ ...context, out: bossOut });
  return { zones, bosses, movements };
}
