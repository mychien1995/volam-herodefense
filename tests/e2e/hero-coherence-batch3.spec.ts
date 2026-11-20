import { verifyThienSonChoreography } from './thien-son-unified-probe.mjs';
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifyCoherentChuong } from './chuong-unified-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const branch = process.env['VOLAM_HERO_BRANCH'] ?? 'thien_son_phien';
test('batch3 Thien Son body coherence', async ({ browser }) => {
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_CHUONG_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_CHUONG_DIST'] ?? '.cache/hero-coherence-batch3-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/hero-coherence-batch3'),
    onReady: async (context: any) => {
      const forms =
        process.env['VOLAM_CHUONG_STAGE'] === 'baseline' || branch === 'both'
          ? ['thien_son_phien', 'thien_son_dao']
          : [branch];
      for (const basic of forms) {
        const profile = {
          basic,
          sameTickAuthority: true,
          settleIdle: true,
          extraChecks: process.env['VOLAM_COHERENCE_PARTIAL'] === '1' ? undefined : verifyThienSonChoreography,
          nativeFacingAbilities: ['liet_phong_dao'],
          stationaryPartyTargets: true,
          actionBodyPattern:
            '^(windup|fan|palm|lotus|guard|channel|spin|storm|sweep|overhead|recover|dash|cut|retreat|charge|blade|slam|ready|follow|cross|flurry)_',
          contactPose: (e: any) =>
            basic === 'thien_son_phien'
              ? 'fan_throw'
              : ['sweep_right', 'sweep_left', 'overhead'][
                  Number(e.stage.at(-1))
                ],
          captureByKey: {
            KeyA: [
              {
                name: 'A-contact',
                prefix: basic === 'thien_son_phien' ? 'fan_throw_' : 'sweep_',
              },
              { name: 'A-overhead', prefix: 'overhead_' },
            ],
            KeyQ: [
              {
                name: 'Q-body',
                prefix: basic === 'thien_son_phien' ? 'lotus_' : 'dash_slash_',
              },
            ],
            KeyW: [
              {
                name: 'W-body',
                prefix: basic === 'thien_son_phien' ? 'spin_' : 'cut_',
              },
            ],
            KeyE: [
              {
                name: 'E-body',
                prefix: basic === 'thien_son_phien' ? 'fan_throw_' : 'retreat_',
              },
            ],
            KeyR: [
              {
                name: 'R-body',
                prefix:
                  basic === 'thien_son_phien'
                    ? 'palm_release_'
                    : 'blade_raise_',
              },
              { name: 'R-contact', prefix: 'slam_contact_' },
            ],
            KeyT: [
              {
                name: 'T-body',
                prefix: basic === 'thien_son_phien' ? 'storm_' : 'flurry_',
              },
            ],
          },
          school: 'thien_son',
          texture: 'hero-unified:' + basic,
          pivot: [0.5, 224 / 288],
          avatar:
            '/assets/' + basic.replaceAll('_', '-') + (basic === 'thien_son_dao' ? '-unified-v3/avatar.png' : '-unified-v2/avatar.png'),
          partial: process.env['VOLAM_COHERENCE_PARTIAL'] === '1',
        };
        const options = { ...context, out: resolve(context.out, basic) };
        if (process.env['VOLAM_CHUONG_STAGE'] === 'baseline')
          await expect(verifyCoherentChuong(options, profile)).rejects.toThrow(
            'one canonical body',
          );
        else await verifyCoherentChuong(options, profile);
      }
    },
  });
});
