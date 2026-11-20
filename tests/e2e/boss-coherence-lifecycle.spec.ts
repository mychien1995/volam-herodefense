import { test } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';
import { bossFixture } from './boss-coherence-fixture.js';

test('native boss transitions and death retain coherent bodies after accepted A', async ({
  browser,
}) => {
  const ids = (
    process.env['VOLAM_BOSS_IDS'] ?? 'tay_doc,tay_doc_cap_mo,nam_de,bac_cai'
  ).split(',');
  await verifyRenovationRuntime(browser, {
    players: 2,
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist: '.cache/boss-coherence-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/boss-lifecycle'),
    onReady: async ({ room, pages, out }: any) => {
      mkdirSync(out, { recursive: true });
      const report: any = {
        status: 'RUNNING',
        fixture:
          'Server-owned phase/HP prerequisites; real acknowledged arrow keys and manual A; not natural campaign progression, lightning/QTE or balance acceptance',
        cases: [],
      };
      const checkpoint = () =>
        writeFileSync(
          resolve(out, 'verification.json'),
          JSON.stringify(report, null, 2),
        );
      const wait = (fn: any, label: string, diagnostics?: any) =>
        waitForQa(fn, label, {
          timeout: 20000,
          ...(diagnostics ? { diagnostics } : {}),
        });
      const bs = () =>
        pages[0].evaluate(() =>
          (window as any).__VOLAM__
            .presentation()
            .renovation.bodies.filter((b: any) => b.visible),
        );
      for (const id of ids) {
        const f = bossFixture(room, id),
          { actor, encounter: e, w, heroes } = f;
        if (id === 'tay_doc_cap_mo') e.transitionAt = Math.max(1, w.tick - 100);
        if (id === 'vuong_trung_duong_p1') e.lightningHits = 3; // Native prerequisite already cleared in this isolated presentation fixture.
        if (id === 'vuong_trung_duong_p2') e.notesDone = true;
        if (id === 'bac_cai') e.nextPreference = e.nextVote = w.tick + 100000;
        const enteredAt = w.tick;
        await wait(
          () => w.tick >= enteredAt + 3,
          'native arena/instance initial sync ' + id,
        );
        f.arrange(1, 1, 45);
        await wait(
          async () =>
            (await bs()).some(
              (b: any) => b.id === id && b.texture === 'boss-unified:' + id,
            ),
          'canonical live ' + id,
        );
        f.arrange(1, 1, 45);
        await pages[0].waitForTimeout(180);
        const beforeHp = actor.hp;
        const transition = id === 'tay_doc' || id === 'vuong_trung_duong_p1';
        actor.hp = transition
          ? Math.ceil(
              actor.maxHp * (id === 'tay_doc' ? 0.5 : e.definition.phase2Hp),
            ) + 1
          : 1;
        actor.invulnerable = false;
        const hpAtAttack = actor.hp;
        const startX = heroes[0].x;
        await pages[0].locator('#game canvas').focus();
        await pages[0].keyboard.down('ArrowUp');
        await pages[0].keyboard.down('ArrowLeft');
        try {
          await wait(
            () => heroes[0].x < startX && heroes[0].fx < 0 && heroes[0].fy < 0,
            'server accepted diagonal facing',
          );
        } finally {
          await pages[0].keyboard.up('ArrowUp');
          await pages[0].keyboard.up('ArrowLeft');
        }
        if (id === 'kim_luan') {
          // His native low-HP chase can cross the hero during the facing ACK.
          // Restore legal spacing after that ACK, retaining the accepted NW aim.
          f.arrange(1, 1, 78);
          actor.hp = hpAtAttack;
          actor.invulnerable = false;
        }
        const observe = Promise.all(
          pages.map((p: any) =>
            p.evaluate(
              ({ ids }: any) =>
                new Promise<any>((resolve) => {
                  const start = performance.now(),
                    frames = new Set<string>(),
                    textures = new Set<string>();
                  const poll = () => {
                    for (const b of (window as any).__VOLAM__
                      .presentation()
                      .renovation.bodies.filter(
                        (b: any) => b.visible && ids.includes(b.id),
                      )) {
                      frames.add(String(b.frame));
                      textures.add(b.texture);
                    }
                    if (performance.now() - start >= 3500)
                      resolve({ frames: [...frames], textures: [...textures] });
                    else requestAnimationFrame(poll);
                  };
                  poll();
                }),
              {
                ids:
                  id === 'tay_doc'
                    ? ['tay_doc', 'tay_doc_cap_mo']
                    : id === 'vuong_trung_duong_p1'
                      ? ['vuong_trung_duong_p1', 'vuong_trung_duong_p2']
                      : [id],
              },
            ),
          ),
        );
        await pages[0].keyboard.press('KeyA');
        await wait(
          () => actor.hp < hpAtAttack || !w.creeps.has(actor.id),
          'server resolved manual A ' + id,
          async () => ({
            hp: actor.hp,
            invulnerable: actor.invulnerable,
            bossPosition: [actor.x, actor.y],
            hero: {
              x: heroes[0].x,
              y: heroes[0].y,
              fx: heroes[0].fx,
              fy: heroes[0].fy,
              basic: heroes[0].basicId,
              pose: heroes[0].pose,
            },
            waveArena: f.sim.waveArena,
            events: await pages[0].evaluate(() =>
              (window as any).__VOLAM__.snapshot().events.slice(-8),
            ),
          }),
        );
        if (transition) {
          await wait(
            () =>
              id === 'tay_doc'
                ? e.phase === 'transition' || e.phase === 'phase2'
                : e.phase === 2,
            'native form transition ' + id,
          );
        } else
          await wait(
            () => actor.hp <= 0 || !w.creeps.has(actor.id),
            'native death ' + id,
          );
        await wait(
          async () =>
            (await bs()).some(
              (b: any) =>
                b.id ===
                  (id === 'tay_doc'
                    ? 'tay_doc_cap_mo'
                    : id === 'vuong_trung_duong_p1'
                      ? 'vuong_trung_duong_p2'
                      : id) &&
                (transition || String(b.frame).startsWith('death_')),
            ),
          'rendered terminal body ' + id,
        );
        await pages[0].locator('#viewport').screenshot({
          path: resolve(
            out,
            id + (transition ? '-transition' : '-death') + '.png',
          ),
        });
        const peerMotions = await observe;
        const motion = peerMotions[0];
        for (const peer of peerMotions) {
          if (!transition) {
            assert.ok(
              peer.frames.some((frame: string) => frame.startsWith('death_0_')),
              id + ' peer death0',
            );
            assert.ok(
              peer.frames.some((frame: string) => frame.startsWith('death_1_')),
              id + ' peer death1',
            );
            assert.deepEqual(peer.textures, ['boss-unified:' + id]);
          }
        }
        if (transition) {
          const next =
            id === 'tay_doc' ? 'tay_doc_cap_mo' : 'vuong_trung_duong_p2';
          assert.ok(motion.textures.includes('boss-unified:' + next));
          assert.ok(
            motion.textures.every(
              (t: string) =>
                t === 'boss-unified:' + id || t === 'boss-unified:' + next,
            ),
          );
        } else {
          assert.ok(
            motion.frames.some((frame: string) => frame.startsWith('death_0_')),
            id + ' death0',
          );
          assert.ok(
            motion.frames.some((frame: string) => frame.startsWith('death_1_')),
            id + ' death1',
          );
          assert.deepEqual(motion.textures, ['boss-unified:' + id]);
        }
        const peers = await Promise.all(
          pages.map((p: any) =>
            p.evaluate(() => {
              const s = (window as any).__VOLAM__.snapshot();
              return {
                phase: s.state.phase,
                tick: s.state.tick,
                basic: s.state.players[s.sessionId]?.basicId,
              };
            }),
          ),
        );
        report.cases.push({
          id,
          beforeHp,
          hpAtAttack,
          afterHp: actor.hp,
          transition,
          motion,
          peerMotions,
          peers,
        });
        checkpoint();
      }
      report.status = 'PASS';
      checkpoint();
    },
  });
});
