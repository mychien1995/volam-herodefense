import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { joinWaiting, startAuditTogether } from './pregame-helper.js';

const dir = qaEvidenceDirectory('docs/evidence/diamond-palm');
const ability = 'dai_luc_kim_cuong_chuong';
const snap = (page: Page) => page.evaluate<any>('window.__VOLAM__.snapshot()');
const view = (page: Page) =>
  page.evaluate<any>('window.__VOLAM__.presentation().skills.approved');

for (const empowered of [false, true])
  test(
    'Đại Lực live ' + (empowered ? 'Phát Động' : 'normal'),
    async ({ browser }) => {
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
      ]);
      const [player, peer] = (await Promise.all(
        contexts.map((c) => c.newPage()),
      )) as [Page, Page];
      const errors: string[] = [];
      for (const page of [player, peer])
        page.on('pageerror', (e) => errors.push(e.message));
      try {
        await joinWaiting(
          player,
          empowered ? 'Palm Combo Audit' : 'Palm Audit',
        );
        await joinWaiting(peer, 'Palm Observer', (await snap(player)).roomId);
        await startAuditTogether([
          [player, 'thieu_lam', 'thieu_lam_quyen'],
          [peer, 'cai_bang', 'cai_bang_chuong'],
        ]);
        const owner = (await snap(player)).sessionId;
        const actor = async () => (await snap(player)).state.players[owner];
        await expect.poll(async () => (await actor()).level).toBe(30);
        for (const [index, key] of [...'qwe'].entries()) {
          await player
            .locator('[data-rank-slot="' + index + '"]')
            .evaluate((button: HTMLButtonElement) => button.click());
          await expect(
            player.locator('#slot-' + key + ' .skill-rank'),
          ).toHaveText('1');
        }
        await player.locator('#game canvas').focus();
        const travel = empowered ? 'empowered_travel' : 'travel';
        const impact = empowered ? 'empowered_impact' : 'impact';
        await player.evaluate((stage) => {
          const w = window as any;
          const deadline = Date.now() + 5000;
          const sample = () => {
            const v = w.__VOLAM__.presentation().skills.approved;
            if (
              v.active.some(
                (r: any) => r.asset === 'diamond_palm_v05' && r.phase === stage,
              ) &&
              v.observedFrames.includes('diamond_palm_v05:' + stage + '_1')
            ) {
              w.__VOLAM__.afterRender(() => {
                w.__palmPng = document
                  .querySelector<HTMLCanvasElement>('#game canvas')!
                  .toDataURL('image/png');
              });
            } else if (Date.now() < deadline) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }, impact);
        for (const key of empowered ? ['KeyQ', 'KeyW', 'KeyE'] : ['KeyE'])
          await player.keyboard.press(key, { delay: 35 });
        const shots = [new Map<string, any>(), new Map<string, any>()];
        const deadline = Date.now() + 2000;
        while (Date.now() < deadline) {
          const snapshots = await Promise.all([player, peer].map(snap));
          snapshots.forEach((s, i) => {
            for (const [id, p] of Object.entries(s.state.projectiles) as [
              string,
              any,
            ][])
              if (
                p.abilityId === ability &&
                p.ownerId === owner &&
                !shots[i]!.has(id)
              )
                shots[i]!.set(id, p);
          });
          await player.waitForTimeout(20);
        }
        for (const map of shots) {
          const ordered = [...map.values()].sort(
            (a, b) => a.startedAt - b.startedAt,
          );
          expect(ordered.map((p) => p.stage)).toEqual(
            empowered ? [travel] : [travel, travel, travel],
          );
          expect(ordered.map((p) => p.y)).toEqual(
            empowered ? [650] : [630, 650, 670],
          );
        }
        expect([...shots[0]!.keys()].sort()).toEqual(
          [...shots[1]!.keys()].sort(),
        );
        for (const page of [player, peer]) {
          const events = (await snap(page)).events.filter(
            (e: any) => e.abilityId === ability,
          );
          expect(events.filter((e: any) => e.kind === 'hit')).toHaveLength(1);
          if (empowered) {
            const primers = (await snap(page)).events.filter(
              (e: any) =>
                e.kind === 'hit' &&
                ['la_han_quyen', 'vi_da_quyen'].includes(e.abilityId),
            );
            expect(primers.map((e: any) => e.targetId)).toEqual([
              'palm_target',
              'palm_target',
            ]);
          }
          expect(
            events.some(
              (e: any) => e.kind === 'hit' && e.stage === 'empowered',
            ),
          ).toBe(empowered);
          expect(
            events.some((e: any) => e.kind === 'pulse' && e.stage === impact),
          ).toBe(true);
          const rendered = await view(page);
          expect(rendered.observedFrames).toContain(
            'diamond_palm_v05:' + travel + '_0',
          );
          const contactFrames = rendered.observedFrames.filter(
            (frame: string) =>
              frame.startsWith('diamond_palm_v05:' + impact + '_'),
          );
          expect(contactFrames.length).toBeGreaterThanOrEqual(2);
          expect(rendered.projectiles).toBe(0);
        }
        expect(errors).toEqual([]);
        const png = await player.evaluate<string>('window.__palmPng');
        expect(png).toMatch(/^data:image\/png;base64,/);
        await mkdir(dir, { recursive: true });
        await writeFile(
          join(dir, travel + '.png'),
          Buffer.from(png.split(',')[1]!, 'base64'),
        );
        await writeFile(
          join(dir, travel + '.json'),
          JSON.stringify(
            {
              shots: shots.map((x) => [...x]),
              events: (await snap(player)).events.filter(
                (e: any) => e.abilityId === ability,
              ),
              frames: (await view(player)).observedFrames,
            },
            null,
            2,
          ),
        );
      } finally {
        await Promise.all(contexts.map((c) => c.close()));
      }
    },
  );
