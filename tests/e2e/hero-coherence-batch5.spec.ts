import { verifyConLuanChoreography } from './con-luan-unified-probe.mjs';
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifyCoherentChuong } from './chuong-unified-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const branch = process.env['VOLAM_HERO_BRANCH'] ?? 'both';
test('batch5 Kunlun body coherence', async ({ browser }) => {
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_CHUONG_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_CHUONG_DIST'] ?? '.cache/hero-coherence-batch5-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/hero-coherence-batch5'),
    onReady: async (context: any) => {
      for (const basic of branch === 'both'
        ? ['con_luan_thien_su', 'con_luan_kiem_ton']
        : [branch]) {
        const profile = {
          basic,
          extraChecks: verifyConLuanChoreography,
          resetChargeCooldowns: true,
          prepareKey: async ({ key, keys, wait, heroes, w }: any) => {
            if (basic === 'con_luan_kiem_ton' && key === 'KeyQ') {
              await keys('KeyS');
              await wait(
                () => heroes.every((h: any) => w.tick >= h.actionUntil),
                'real S plant before Q',
              );
            }
          },
          captureByKey: basic.endsWith('thien_su')
            ? {
                KeyA: [{ name: 'A-contact', prefix: 'thrust_' }],
                KeyQ: [{ name: 'Q-stance', prefix: 'guard_' }],
                KeyW: [{ name: 'W-slam', prefix: 'overhead_' }],
                KeyE: [{ name: 'E-ring', prefix: 'ranged_release_' }],
                KeyR: [{ name: 'R-throw', prefix: 'hammer_throw_' }],
                KeyT: [{ name: 'T-form', prefix: 'chaos_idle_' }],
              }
            : {
                KeyA: [{ name: 'A-contact', prefix: 'sword_point_' }],
                KeyQ: [{ name: 'Q-detonate', prefix: 'detonate_' }],
                KeyW: [{ name: 'W-dash', prefix: 'dash_' }],
                KeyE: [{ name: 'E-fan', prefix: 'fan_' }],
                KeyR: [{ name: 'R-dragon', prefix: 'dragon_' }],
                KeyT: [{ name: 'T-star', prefix: 'star_hold_' }],
              },
          sameTickAuthority: true,
          settleIdle: true,
          stationaryPartyTargets: true,
          actionBodyPattern:
            '^(windup|thrust|sweep|rising|overhead|recover|ranged|hammer|guard|channel|chaos|release|palm|sword|plant|detonate|dash|fan|storm|dragon|star|cast)_',
          school: 'con_luan',
          texture: 'hero-unified:' + basic,
          pivot: [0.5, 248 / 320],
          avatar:
            '/assets/' + basic.replaceAll('_', '-') + '-unified-v2/avatar.png',
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
