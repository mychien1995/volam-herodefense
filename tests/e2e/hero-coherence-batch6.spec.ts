import { verifyDuongMonChoreography } from './duong-mon-unified-probe.mjs';
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifyCoherentChuong } from './chuong-unified-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
test('batch6 Tang body coherence', async ({ browser }) => {
  const branch = process.env['VOLAM_HERO_BRANCH'] ?? 'both';
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_CHUONG_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_CHUONG_DIST'] ?? '.cache/hero-coherence-batch6-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/hero-coherence-batch6'),
    onReady: async (context: any) => {
      for (const basic of branch === 'both'
        ? ['duong_mon_co_quan', 'duong_mon_am_khi']
        : [branch]) {
        const profile = {
          extraChecks:
            process.env['VOLAM_COHERENCE_PARTIAL'] === '1'
              ? undefined
              : verifyDuongMonChoreography,
          keys:
            process.env['VOLAM_COHERENCE_PARTIAL'] === '1'
              ? ['KeyA']
              : basic === 'duong_mon_am_khi'
                ? ['KeyA', 'KeyW', 'KeyE', 'KeyT']
                : undefined,
          basic,
          school: 'duong_mon',
          texture: 'hero-unified:' + basic,
          pivot: [0.5, 248 / 320],
          sameTickAuthority: true,
          settleIdle: true,
          stationaryPartyTargets: true,
          resetChargeCooldowns: true,
          captureByKey:
            basic === 'duong_mon_co_quan'
              ? {
                  KeyA: [{ name: 'A-contact', prefix: 'release_' }],
                  KeyQ: [{ name: 'Q-release', prefix: 'release_' }],
                  KeyW: [{ name: 'W-hover', prefix: 'hover_' }],
                  KeyE: [{ name: 'E-laser', prefix: 'laser_release_' }],
                  KeyR: [{ name: 'R-shell', prefix: 'shell_' }],
                  KeyT: [{ name: 'T-spin', prefix: 'spin_' }],
                }
              : {
                  KeyA: [{ name: 'A-contact', prefix: 'release_' }],
                  KeyW: [{ name: 'W-release', prefix: 'release_' }],
                  KeyE: [{ name: 'E-dash', prefix: 'dash_' }],
                  KeyT: [{ name: 'T-storm', prefix: 'spin_' }],
                },
          actionBodyPattern:
            '^(windup|release|trap|spin|hover|flight|fold|shell|coil|laser|wing|recover|alternate|ready|dash|lunge|channel|guard)_',
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
