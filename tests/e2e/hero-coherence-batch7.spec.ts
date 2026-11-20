import { verifyNguDocChoreography } from './ngu-doc-unified-probe.mjs';
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifyCoherentChuong } from './chuong-unified-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
test('batch7 Five Poison body coherence', async ({ browser }) => {
  const branch = process.env['VOLAM_HERO_BRANCH'] ?? 'both';
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_CHUONG_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_CHUONG_DIST'] ?? '.cache/hero-coherence-batch7-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/hero-coherence-batch7'),
    onReady: async (context: any) => {
      for (const basic of branch === 'both'
        ? ['ngu_doc_ta_hiep', 'ngu_doc_co_su']
        : [branch]) {
        const profile = {
          extraChecks: verifyNguDocChoreography,
          captureByKey:
            basic === 'ngu_doc_ta_hiep'
              ? {
                  KeyA: [{ name: 'A-contact', prefix: 'palm_release_' }],
                  KeyQ: [{ name: 'Q-poison', prefix: 'poison_charge_' }],
                  KeyW: [{ name: 'W-pool', prefix: 'pool_press_' }],
                  KeyE: [{ name: 'E-aura', prefix: 'aura_spread_' }],
                  KeyT: [{ name: 'T-hands', prefix: 'swarm_release_' }],
                }
              : {
                  KeyA: [{ name: 'A-contact', prefix: 'skull_release_' }],
                  KeyQ: [{ name: 'Q-worms', prefix: 'worm_release_' }],
                  KeyW: [{ name: 'W-summon', prefix: 'summon_call_' }],
                  KeyE: [{ name: 'E-mark', prefix: 'mark_point_' }],
                  KeyT: [{ name: 'T-ritual', prefix: 'ritual_touch_' }],
                },
          keys:
            process.env['VOLAM_COHERENCE_PARTIAL'] === '1'
              ? ['KeyA']
              : ['KeyA', 'KeyQ', 'KeyW', 'KeyE', 'KeyT'],
          basic,
          school: 'ngu_doc',
          texture: 'hero-unified:' + basic,
          pivot: [0.5, 248 / 320],
          sameTickAuthority: true,
          settleIdle: true,
          stationaryPartyTargets: true,
          actionBodyPattern:
            '^(windup|palm|double|poison|pool|aura|counter|hands|swarm|channel|recover|lunge|staff|skull|worm|summon|mark|ritual|guard)_',
          avatar:
            '/assets/' + basic.replaceAll('_', '-') + '-unified-v1/avatar.png',
          partial: process.env['VOLAM_COHERENCE_PARTIAL'] === '1',
        };
        const opts = { ...context, out: resolve(context.out, basic) };
        if (process.env['VOLAM_CHUONG_STAGE'] === 'baseline')
          await expect(verifyCoherentChuong(opts, profile)).rejects.toThrow(
            'one canonical body',
          );
        else await verifyCoherentChuong(opts, profile);
      }
    },
  });
});
