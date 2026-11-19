import { verifyCoherentChuong } from './chuong-unified-probe.mjs';
import { test, expect } from '@playwright/test';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeProgression,
  refreshCharacter,
  addCreep,
} from '@volam/game-core';
import { experienceAtLevel } from '../../packages/game-core/dist/campaign.js';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';

test('Cái Bang Chưởng keeps one coherent body through idle and A', async ({
  browser,
}) => {
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_CHUONG_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_CHUONG_DIST'] ?? '.cache/chuong-unified-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/chuong-unified'),
    onReady: async ({ room, pages, out }: any) => {
      if (process.env['VOLAM_CHUONG_FULL'] === '1')
        return verifyCoherentChuong({ room, pages, out });
      const w = room.world,
        c = room.simulation.arena.config;
      const ids = await Promise.all(
        pages.map((p: any) =>
          p.evaluate(() => (window as any).__VOLAM__!.snapshot().sessionId),
        ),
      );
      w.creeps.clear();
      room.simulation.invasion.nextWaveTick = w.tick + 100000;
      ids.forEach((id: string, i: number) => {
        const h = w.heroes.get(id);
        h.schoolId = 'cai_bang';
        room.state.players.get(id).schoolId = 'cai_bang';
        h.level = 30;
        h.xp = experienceAtLevel(30, c);
        initializeProgression(h, c, 'fixed', 'cai_bang_chuong');
        h.progression.ranks = Object.fromEntries(
          h.progression.defaultSkills.map((s: string) => [s, 4]),
        );
        h.progression.revision++;
        h.skillIds = [...h.progression.defaultSkills];
        refreshCharacter(h, c);
        Object.assign(h, {
          x: 700 + i * 140,
          y: 660,
          fx: 1,
          fy: process.env['VOLAM_CHUONG_PILOT'] === '1' ? 1 : 0,
          hp: h.maxHp,
          mana: h.maxMana,
          invulnerable: true,
          moveX: 0,
          moveY: 0,
          actionUntil: 0,
        });
      });
      const page = pages[0];
      await expect
        .poll(() =>
          page.evaluate(() => {
            const s = (window as any).__VOLAM__!.snapshot();
            return s.state.players[s.sessionId]!.basicId;
          }),
        )
        .toBe('cai_bang_chuong');
      await page.locator('#game canvas').focus();
      const observe = async (ms: number, proof: string) => {
        return page.evaluate(
          ({ ms }: any) =>
            new Promise<any>((resolve) => {
              const api = (window as any).__VOLAM__!,
                end = performance.now() + ms,
                frames: any[] = [],
                pngs: Record<string, string> = {};
              const sample = (renderer: any) => {
                const s = api.snapshot(),
                  body = renderer.game.scene
                    .getScene('Arena')
                    .children.getByName('actor:' + s.sessionId);
                if (body) {
                  frames.push({
                    texture: body.texture.key,
                    frame: String(body.frame.name),
                    alpha: body.alpha,
                    scale: [body.scaleX, body.scaleY],
                    origin: [body.originX, body.originY],
                  });
                  if (!pngs[body.texture.key])
                    pngs[body.texture.key] =
                      renderer.game.canvas.toDataURL('image/png');
                }
                if (performance.now() >= end) resolve({ frames, pngs });
                else api.afterRender(sample);
              };
              api.afterRender(sample);
            }),
          { ms, proof },
        );
      };
      const idle = await observe(2800, 'idle');
      const h = w.heroes.get(ids[0]);
      const e = addCreep(
        w,
        'coherence_target',
        {
          x: h.x + 78,
          y: h.y + (process.env['VOLAM_CHUONG_PILOT'] === '1' ? 78 : 0),
        },
        c,
      );
      Object.assign(e, {
        controlled: true,
        hp: 100000,
        maxHp: 100000,
        archetypeId: 'creep_wild_dog',
      });
      e.stats = { ...c.creep, hp: 100000, damage: 0 };
      const actionCapture = observe(1400, 'A');
      await page.keyboard.press('KeyA', { delay: 30 });
      const action = await actionCapture;
      mkdirSync(out, { recursive: true });
      const textures = [
        ...new Set(
          [...idle.frames, ...action.frames].map((f: any) => f.texture),
        ),
      ];
      const report = {
        status: textures.length === 1 ? 'PASS' : 'REPRODUCED_MIXED_BODY',
        textures,
        idle: idle.frames,
        action: action.frames,
      };
      writeFileSync(
        resolve(out, 'coherence.json'),
        JSON.stringify(report, null, 2),
      );
      let n = 0;
      for (const png of Object.values({ ...idle.pngs, ...action.pngs }))
        writeFileSync(
          resolve(out, `body-${n++}.png`),
          Buffer.from((png as string).split(',')[1]!, 'base64'),
        );
      expect(textures).toEqual(['cai-bang-chuong-unified']);
      return report;
    },
  });
});
