import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import {
  creepCombatDefinition,
  forestRoster,
  desertRoster,
  beachRoster,
  hellRoster,
  creepProfiles,
} from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { qaSession } from '../../tools/qa-session.mjs';
const session = qaSession({
  serverPort: 2928,
  clientPort: 5528,
  profile: 'creep-upgrade',
});
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const presentation = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
const out = 'docs/evidence/creep-upgrade';

test('4 gates stream naturally; 44 regular identities cast in live Phaser with six players and private-zone filtering', async ({
  browser,
  request,
}) => {
  mkdirSync(out, { recursive: true });
  const contexts = await Promise.all([
      browser.newContext({ viewport: { width: 1920, height: 1080 } }),
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ]),
    pages = await Promise.all(contexts.map((c) => c.newPage()));
  const bots: Room<LobbyState>[] = [],
    errors: string[] = [],
    coverage: Record<string, unknown> = {};
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  try {
    const host = pages[0]!;
    await host.goto('/?debug=1');
    await host.locator('#pre-nickname').fill('Creep Host');
    await host.getByRole('button', { name: 'Vào game', exact: true }).click();
    await host.locator('#pre-portals').selectOption('4');
    await host.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await expect(host.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
    const initial = await snapshot(host),
      room = initial.roomId;
    await joinWaiting(pages[1]!, 'Creep Peer', room);
    const client = new Client(session.serverUrl);
    for (let i = 0; i < 4; i++) {
      const b = await client.joinById<LobbyState>(room, {
        nickname: `Creep Bot ${i}`,
        protocolVersion: PROTOCOL_VERSION,
      });
      b.onMessage('*', () => {});
      bots.push(b);
    }
    await expect
      .poll(
        async () => Object.keys((await snapshot(host)).state.players).length,
      )
      .toBe(6);
    await host.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await expect
      .poll(async () => (await snapshot(host)).state.phase)
      .toBe('SCHOOL_SELECTION');
    await Promise.all([
      startTogether(pages, ['vo_dang_kiem', 'thieu_lam_dao'], 30000, true),
      ...bots.map(async (b) => {
        await expect
          .poll(() => b.state.phase, { timeout: 30000 })
          .toBe('SCHOOL_SELECTION');
        b.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
        b.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
        b.send('lobby-action', { action: 'confirm' });
      }),
    ]);
    const fixture = async (op: string, extra: Record<string, string> = {}) => {
      const response = await request.post(
        `/__creep_fixture?${new URLSearchParams({ room, hero: initial.sessionId, op, ...extra })}`,
      );
      expect(response.ok(), await response.text()).toBe(true);
      return response.json();
    };
    expect((await snapshot(host)).state.defense.portalCount).toBe(4);
    expect((await snapshot(pages[1]!)).state.defense.portalCount).toBe(4);
    await fixture('stream');
    await expect
      .poll(async () => Object.keys((await snapshot(host)).state.creeps).length)
      .toBeGreaterThanOrEqual(4);
    const count = Object.keys((await snapshot(host)).state.creeps).length;
    await expect
      .poll(
        async () => Object.keys((await snapshot(host)).state.creeps).length,
        { timeout: 6000 },
      )
      .toBeGreaterThan(count);
    const before = (await snapshot(host)).state.players[initial.sessionId]
      .lastSequence;
    await host.locator('#game canvas').focus();
    await host.keyboard.press('ArrowRight', { delay: 100 });
    await expect
      .poll(
        async () =>
          (await snapshot(host)).state.players[initial.sessionId].lastSequence,
      )
      .toBeGreaterThan(before);
    const check = async (id: string, death = false) => {
      console.info('[creep-runtime]', id);
      await fixture('spawn', { id });
      await expect
        .poll(async () =>
          Object.values((await snapshot(host)).state.creeps).some(
            (e: any) => e.archetypeId === id,
          ),
        )
        .toBe(true);
      if (death) {
        await host.locator('#game canvas').focus();
        await host.keyboard.press('a');
        await expect
          .poll(
            async () =>
              Object.values((await snapshot(host)).state.creeps).some(
                (e: any) => e.archetypeId === id && e.hp <= 0,
              ),
            { timeout: 5000 },
          )
          .toBe(true);
      }
      if (creepProfiles[id]!.special || death)
        await expect
          .poll(
            async () => (await presentation(host)).creepCombat?.active ?? 0,
            { timeout: 5000 },
          )
          .toBeGreaterThan(0);
      if (creepProfiles[id]!.special || death)
        await expect
          .poll(
            async () =>
              ((await presentation(host)).creepCombat?.releases ?? []).some(
                (v: any) =>
                  v.abilityId ===
                    `creep_${id}_${death ? 'death' : 'special'}` &&
                  v.frames.length > 0,
              ),
            { timeout: 5000, intervals: [50, 100, 200] },
          )
          .toBe(true);
      const p = await presentation(host);
      const actors = p.actors.filter((a: any) => a.id.includes(id));
      expect(actors.length).toBeGreaterThan(0);
      expect(actors.every((a: any) => a.texture !== 'creep_outlaw')).toBe(true);
      coverage[id] = { actors, effects: p.creepCombat };
      if (id === 'wave_15')
        await host.screenshot({ path: `${out}/arena-skill.png` });
      if (id === 'doc_chu')
        await host.screenshot({ path: `${out}/forest-web.png` });
    };
    for (const id of creepCombatDefinition.waveIds)
      await check(id, !!creepProfiles[id]!.death);
    for (const [zone, roster] of [
      ['forest', forestRoster],
      ['desert', desertRoster],
      ['sea', beachRoster],
      ['hell', hellRoster],
    ] as const) {
      await fixture('enter', { zone });
      await expect
        .poll(
          async () =>
            (await snapshot(host)).state.players[initial.sessionId].zoneId,
        )
        .toContain(zone);
      for (const id of roster) await check(id, !!creepProfiles[id]!.death);
      expect(
        Object.values((await snapshot(pages[1]!)).state.creeps).every(
          (e: any) => e.zoneId === 'arena',
        ),
      ).toBe(true);
      await fixture('arena');
    }
    await fixture('crowd');
    await expect
      .poll(
        async () =>
          (await presentation(host)).actors.filter((a: any) =>
            a.id.startsWith('crowd_'),
          ).length,
      )
      .toBe(120);
    await expect
      .poll(async () => (await presentation(host)).creepCombat?.active ?? 0, {
        timeout: 5000,
      })
      .toBeGreaterThan(0);
    await host.screenshot({ path: `${out}/arena-six-player.png` });
    expect(Object.keys(coverage)).toHaveLength(44);
    expect(errors).toEqual([]);
    writeFileSync(
      `${out}/browser.json`,
      JSON.stringify(
        { players: 6, browserClients: 2, sdkClients: 4, coverage, errors },
        null,
        2,
      ),
    );
  } finally {
    writeFileSync(
      `${out}/browser-progress.json`,
      JSON.stringify(
        {
          covered: Object.keys(coverage),
          errors,
          snapshots: await Promise.all(
            pages.map(async (p) => ({
              state: await snapshot(p).catch(() => null),
              presentation: await presentation(p).catch(() => null),
            })),
          ),
        },
        null,
        2,
      ),
    );
    for (const b of bots) await b.leave();
    for (const c of contexts) await c.close();
  }
});
