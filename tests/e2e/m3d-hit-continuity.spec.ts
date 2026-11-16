import { expect, test, type Page } from '@playwright/test';
import { schools } from '@volam/game-data';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifyM3dHitContinuity } from './m3d-hit-continuity-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';

interface SelectionSnapshot {
  sessionId: string;
  state: {
    phase: string;
    hostId: string;
    players: Record<string, { schoolId: string }>;
  };
}

const snapshot = (page: Page) =>
  page.evaluate<SelectionSnapshot>('window.__VOLAM__.snapshot()');

async function verifySchoolControls({
  page: host,
  pages,
  out,
}: {
  page: Page;
  pages: Page[];
  out: string;
}) {
  const [, peer] = pages;
  if (!peer) throw Error('The lobby check needs at least two clients');
  for (const [i, page] of pages.entries()) {
    await waitForQa(
      () =>
        page.evaluate(
          ({ players, schoolCount }) => {
            const state = (window as any).__VOLAM__.snapshot().state;
            return (
              state?.phase === 'SCHOOL_SELECTION' &&
              document.querySelectorAll('#pregame [data-school]').length ===
                schoolCount &&
              document.querySelectorAll('#pregame .pre-players li').length ===
                players
            );
          },
          { players: pages.length, schoolCount: schools.length },
        ),
      'selection controls and roster for client ' + (i + 1),
    );
  }
  await peer.bringToFront();
  const choice = peer.locator('#pregame [data-school="cai_bang"]');
  const original = await choice.elementHandle();
  const bounds = await original.boundingBox();
  if (!bounds) throw Error('Cái Bang school control is outside the pregame');
  await peer.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await peer.mouse.down();
  try {
    // Hold the guest's real pointer down while a peer selection is acknowledged.
    await host
      .locator('#pregame [data-school="vo_dang"]')
      .evaluate((node: HTMLElement) => node.click());
    await waitForQa(async () => {
      const { state } = await snapshot(peer);
      return state.players[state.hostId]?.schoolId === 'vo_dang';
    }, 'host selection reaches guest during a held click');
    expect(await original.evaluate((node) => node.isConnected)).toBe(true);
  } finally {
    await peer.mouse.up();
    await original.dispose();
  }
  await waitForQa(async () => {
    const { state, sessionId } = await snapshot(peer);
    return state.players[sessionId]?.schoolId === 'cai_bang';
  }, 'held guest click is acknowledged');

  writeFileSync(
    resolve(out, 'lobby-selection.json'),
    JSON.stringify(
      {
        clients: pages.length,
        phase: 'SCHOOL_SELECTION',
        rosterSize: pages.length,
        preservedControlOnPeerSelection: true,
        guestClickAcknowledgedByServer: true,
      },
      null,
      2,
    ) + '\n',
  );
}

test('M3D live hit, critical and four-facing action continuity', async ({
  browser,
}) => {
  await verifyRenovationRuntime(browser, {
    players:
      process.env['VOLAM_QA_DEV_CLIENT'] === '1' ||
      process.env['VOLAM_QA_HIT_TWO_CLIENTS'] === '1'
        ? 2
        : 6,
    compareLegacy: false,
    development: process.env['VOLAM_QA_DEV_CLIENT'] === '1',
    evidenceDir: qaEvidenceDirectory('docs/evidence/m3d-hit-continuity'),
    onSelection: verifySchoolControls,
    onReady: verifyM3dHitContinuity,
  });
});
