import { Client } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import { coMoDungeon, m1Config, waveBossFarewells } from '@volam/game-data';
import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
const out =
  process.env['VOLAM_WAVE_FEEDBACK_EVIDENCE'] ??
  'docs/evidence/wave-boss-feedback-v02-runtime';
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const art = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
async function fixture(
  p: Page,
  op: string,
  extra: Record<string, string> = {},
) {
  const s = await snapshot(p),
    r = await p.request.post(
      '/__wave_feedback?' +
        new URLSearchParams({ room: s.roomId, op, ...extra }),
    );
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
const arena = async (p: Page) =>
  JSON.parse((await snapshot(p)).state.defense.waveArena || 'null');

test('two production Phaser clients match approved pixels/timing and server pull/arena behavior', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    a = pages[0]!,
    b = pages[1]!,
    errors: string[] = [],
    report: any = {
      scope:
        'Production bundle; server-owned cast prerequisites; two real clients. Not natural campaign gates.',
      cases: [],
    };
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  await mkdir(out, { recursive: true });
  try {
    await joinWaiting(a, 'Feedback A');
    await joinWaiting(b, 'Feedback B', (await snapshot(a)).roomId);
    await startTogether(pages, ['vo_dang', 'thien_son']);
    for (const boss of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai']) {
      await fixture(a, 'spawn', { boss });
      await expect.poll(async () => (await arena(a))?.bossId).toBe(boss);
      await expect.poll(async () => (await arena(b))?.locked).toBe(true);
      expect((await art(a)).dong.statueVisible).toBe(false);
      expect((await art(a)).waveArena.boundaryVisible).toBe(true);
      report.cases.push({ boss, arena: await arena(a) });
      if (boss === 'dong_ta') {
        await fixture(a, 'cast', { boss, ability: 'lac_anh_normal' });
        await expect
          .poll(
            async () =>
              ((await art(a)).dong.observed['dong:dash_right'] ?? []).length,
          )
          .toBeGreaterThan(0);
        await fixture(a, 'cast', { boss, ability: 'trieu_hon_dong_hai' });
        await expect
          .poll(async () =>
            Boolean((await snapshot(a)).state.creeps.mai_sieu_phong),
          )
          .toBe(true);
        await fixture(a, 'cast', {
          boss: 'mai_sieu_phong',
          ability: 'bach_cot_trao',
        });
        await expect
          .poll(
            async () =>
              ((await art(a)).dong.observed['maifx:claw_left'] ?? []).length,
          )
          .toBe(4);
        await fixture(a, 'cast', {
          boss: 'mai_sieu_phong',
          ability: 'am_phong_hap_luc',
        });
        await expect
          .poll(
            async () =>
              (await snapshot(a)).state.players[
                (await snapshot(a)).sessionId
              ].statuses?.includes('dash_lock') ?? false,
          )
          .toBe(true);
      }
      if (boss === 'dong_ta') {
        const n = await snapshot(a),
          hero = n.state.players[n.sessionId];
        await a.locator('#game canvas').focus();
        await a.keyboard.press('Shift');
        expect((await snapshot(a)).state.players[n.sessionId].dashCharges).toBe(
          hero.dashCharges,
        );
        await expect
          .poll(
            async () => {
              const v = (await art(a)).dong.view,
                c = v?.casts.find(
                  (x: any) => x.abilityId === 'ma_anh_troc_hon',
                );
              if (c) report.cases.push({ boss: 'mai_sieu_phong', followup: c });
              return c ? c.activeAt - c.startedAt : 0;
            },
            { intervals: [50, 75] },
          )
          .toBe(24);
      }
      if (boss === 'tay_doc') {
        for (const [ability, asset] of [
          ['tay_doc_gas', 'poison_bolt'],
          ['hon_thien_phuc_long_chan', 'snake_bolt'],
        ] as const) {
          await fixture(a, 'cast', { boss, ability });
          await expect
            .poll(
              async () =>
                (await art(a)).tayDoc.feedback.observed.filter((x: string) =>
                  x.startsWith(asset + ':'),
                ).length,
            )
            .toBe(4);
          const f = (await art(a)).tayDoc.feedback;
          expect(
            f.images
              .filter((x: any) => x.texture === 'wave_feedback_v02:' + asset)
              .every((x: any) => x.scale[0] === 1 && x.scale[1] === 1),
          ).toBe(true);
          report.cases.push({ boss, ability, feedback: f });
          await a.screenshot({ path: out + '/live-' + asset + '.png' });
        }
        await fixture(a, 'cast', { boss, ability: 'van_doc_phi_cham' });
        let needle: any;
        await expect
          .poll(
            async () => {
              needle = (await art(a)).tayDoc.entities.find((e: any) =>
                e.frame.startsWith('poison_needle'),
              );
              return !!needle;
            },
            { intervals: [50, 75] },
          )
          .toBe(true);
        expect(needle.scaleX).toBe(1.5);
        report.cases.push({ boss, needle });
        await fixture(a, 'cast', { boss, ability: 'doc_vu_me_hon' });
        await expect
          .poll(
            async () =>
              ((await art(a)).tayDoc.feedback.observed ?? []).filter(
                (f: string) => f.startsWith('tay_doc_cloud_v2:'),
              ).length,
          )
          .toBe(4);
        await a.screenshot({ path: out + '/live-poison-pools.png' });
        await fixture(a, 'cast', { boss, ability: 'cap_mo_chan_kich' });
        const stompSamples: any[] = [];
        try {
          await expect
            .poll(
              async () => {
                const n = await snapshot(a),
                  f = (await art(a)).tayDoc;
                const v = JSON.parse(n.state.tayDoc.arena.json);
                stompSamples.push({
                  tick: v.tick,
                  phase: v.phase,
                  cast: v.cast,
                  impacts: v.impacts,
                  feedback: f.feedback,
                });
                return f.feedback.observed.includes('tay_doc_impact:rim');
              },
              { intervals: [75, 100, 150] },
            )
            .toBe(true);
          await a.screenshot({ path: out + '/live-stomp-rim.png' });
        } finally {
          await writeFile(
            out + '/stomp-samples.json',
            JSON.stringify(stompSamples, null, 2),
          );
        }
      }
      if (boss === 'nam_de') {
        await expect(a.locator('#nam-de-hud')).toHaveCount(0);
        await fixture(a, 'cast', { boss, ability: 'nam_de_aura' });
        await expect
          .poll(
            async () =>
              (await art(a)).namDe.feedback.images.some(
                (s: any) => s.texture === 'wave_feedback:nam_de_ring',
              ),
            { intervals: [50, 75] },
          )
          .toBe(true);
        await a.screenshot({ path: out + '/live-phat-quang.png' });
        await expect
          .poll(
            async () =>
              ((await art(a)).namDe.feedback.observed ?? []).filter(
                (f: string) => f.startsWith('nam_de_ring:'),
              ).length,
          )
          .toBe(4);
        await fixture(a, 'cast', { boss, ability: 'nhat_duong_chi' });
        await expect
          .poll(async () =>
            ((await art(a)).namDe.feedback.observed ?? []).some((f: string) =>
              f.startsWith('nd_feedback01:thin_beam'),
            ),
          )
          .toBe(true);
        await fixture(a, 'cast', { boss, ability: 'nam_de_palm' });
        await expect
          .poll(async () =>
            (await art(a)).namDe.feedback.observed.some((f: string) =>
              f.startsWith('nd_palm:palm_trail_'),
            ),
          )
          .toBe(true);
        await fixture(a, 'cast', { boss, ability: 'nam_de_small_finger' });
        await a.locator('#game canvas').focus();
        await a.keyboard.down('ArrowDown');
        await expect
          .poll(
            async () =>
              (await art(a)).namDe.feedback.observed.filter((x: string) =>
                x.startsWith('gold_bolt:'),
              ).length,
          )
          .toBe(4);
        await a.keyboard.up('ArrowDown');
        report.cases.push({
          boss,
          ability: 'small_finger',
          feedback: (await art(a)).namDe.feedback,
        });
        await fixture(a, 'cast', { boss, ability: 'phat_quang_pho_chieu' });
        await expect
          .poll(
            async () =>
              (await art(a)).namDe.feedback.observed.filter((x: string) =>
                x.startsWith('spotlight:'),
              ).length,
          )
          .toBe(4);
        const lit = (await art(a)).namDe;
        expect(
          lit.feedback.images.some(
            (x: any) => x.texture === 'wave_feedback_v02:spotlight',
          ),
        ).toBe(true);
        expect(lit.sprites.some((x: any) => x.id === 'charge')).toBe(false);
        report.cases.push({ boss, ability: 'spotlight', presentation: lit });
        await a.screenshot({ path: out + '/live-spotlight.png' });
        await fixture(a, 'boss_stand', { boss, x: '970', y: '720' });
        await fixture(a, 'cast', { boss, ability: 'nhat_duong_quy_tong' });
        await expect
          .poll(
            async () =>
              (await art(a)).namDe.sprites.find((x: any) => x.id === 'boss')?.x,
          )
          .toBe(800);
        await expect
          .poll(
            async () => {
              const n = await snapshot(a);
              return Object.values(n.state.bossEffects).filter(
                (x: any) => x.kind === 'sky' && x.activeAt <= n.state.tick,
              ).length;
            },
            { intervals: [75, 100] },
          )
          .toBeGreaterThanOrEqual(7);
        report.cases.push({
          boss,
          ability: 'sky',
          snapshot: await snapshot(a),
          presentation: (await art(a)).namDe,
        });
        await a.screenshot({ path: out + '/live-dense-sky.png' });
        await fixture(a, 'kill_boss', { boss });
        await expect
          .poll(
            async () =>
              (await art(a)).namDe.sprites.filter((x: any) => x.id === 'boss')
                .length,
          )
          .toBe(0);
        report.cases.push({ boss, corpseCleared: true });
        await fixture(a, 'spawn', { boss });
        const seen = (await art(a)).namDe.feedback.observed;
        report.cases.push({ boss, observed: seen });
      }
      if (boss === 'bac_cai') {
        await a.setViewportSize({ width: 1920, height: 1080 });
        const owner = (await snapshot(a)).sessionId;
        await fixture(a, 'stand', { player: owner, x: '800', y: '616' });
        await fixture(a, 'cast', { boss, ability: 'dogs' });
        await expect
          .poll(async () => (await art(a)).bacCai.view.dogs.length)
          .toBe(4);
        await fixture(a, 'cast', { boss, ability: 'vortex' });
        await expect
          .poll(
            async () =>
              (await art(a)).bacCai.feedback.images.filter((x: any) =>
                x.id.startsWith('spin-fx:'),
              ).length,
          )
          .toBe(9);
        const before = await art(a),
          first = before.bacCai.view;
        await expect
          .poll(
            async () => {
              const now = (await art(a)).bacCai.view;
              if (now.spinners.length !== 9) return 0;
              return Math.min(
                ...now.spinners.map((p: any, i: number) =>
                  Math.hypot(
                    p.x - first.spinners[i].x,
                    p.y - first.spinners[i].y,
                  ),
                ),
              );
            },
            { intervals: [75, 100] },
          )
          .toBeGreaterThan(30);
        const after = await art(a);
        report.cases.push({
          boss,
          nineMoving: { before: first, after: after.bacCai.view },
          feedback: after.bacCai.feedback,
        });
        const n = await snapshot(a),
          hero = n.state.players[n.sessionId];
        expect(hero.statuses).not.toContain('dash_lock');
        expect(hero.statuses).not.toContain('slow');
        await a.locator('#game canvas').focus();
        await a.keyboard.press('Shift');
        await expect
          .poll(
            async () =>
              (await snapshot(a)).state.players[n.sessionId].dashCharges,
          )
          .toBeLessThan(hero.dashCharges);
        await fixture(a, 'stand', { player: n.sessionId, x: '800', y: '616' });
        await expect
          .poll(async () => (await snapshot(a)).state.players[n.sessionId].y)
          .toBe(616);
        await a.screenshot({ path: out + '/live-nine-moving-spinners.png' });
        await fixture(a, 'natural_bac_clones');
        for (const p of pages)
          await expect
            .poll(async () =>
              (await art(p)).bossShouts.active.some(
                (x: any) => x.name === 'Mục Hạ Vô Nhân',
              ),
            )
            .toBe(true);
        await expect
          .poll(async () => (await art(a)).bacCai.view.forms.length)
          .toBe(8);
        expect((await art(a)).bacCai.view.dialogue).toBe('');
        report.cases.push({ boss, cloneShout: (await art(a)).bossShouts });
      }
      // Real server death prerequisite; generic retry must preserve statue HP and recall both clients.
      const hp = (await snapshot(a)).state.defense.statueHp;
      await fixture(a, 'wipe');
      await expect.poll(async () => (await arena(a))?.phase).toBe('retry');
      await expect
        .poll(async () => (await arena(a))?.attempt, { timeout: 15000 })
        .toBe(2);
      expect((await snapshot(a)).state.defense.statueHp).toBe(hp);
    }
    expect(errors).toEqual([]);
    report.errors = errors;
    report.status = 'PASS';
    await writeFile(out + '/two-client.json', JSON.stringify(report, null, 2));
  } catch (error) {
    await writeFile(
      out + '/two-client-failure.json',
      JSON.stringify(
        {
          error: String(error),
          errors,
          snapshot: await snapshot(a),
          presentation: await art(a),
        },
        null,
        2,
      ),
    );
    await a.screenshot({ path: out + '/two-client-failure.png' });
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('six clients: two Phaser plus four SDK peers, full boss HP and natural combat/rewards', async ({
  browser,
}) => {
  const contexts = await Promise.all(
      Array.from({ length: 2 }, () => browser.newContext()),
    ),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    a = pages[0]!,
    errors: string[] = [],
    sdkPeers: any[] = [],
    report: any = {
      scope:
        'Six real network clients (two production Phaser/keyboard plus four SDK/input peers), level30 legal builds and phase/spawn prerequisites. Full boss HP and natural AI; no god mode, injected hits or damage/HP reduction. Six same-machine renderer load was not accepted.',
      bosses: [],
    };
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  await mkdir(out, { recursive: true });
  try {
    await joinWaiting(a, 'Party 1');
    const room = (await snapshot(a)).roomId;
    await joinWaiting(pages[1]!, 'Party 2', room);
    const network = new Client(
      `ws://127.0.0.1:${process.env['VOLAM_QA_SERVER_PORT'] ?? 2904}`,
    );
    const peers = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        network.joinById<LobbyState>(room, {
          nickname: 'SDK ' + (i + 3),
          protocolVersion: PROTOCOL_VERSION,
        }),
      ),
    );
    sdkPeers.push(...peers);
    for (const peer of peers) {
      peer.onError((code, message) => errors.push(code + ':' + message));
      peer.onMessage('combat-event', () => {});
      peer.onMessage('command-rejected', () => {});
    }
    await expect
      .poll(async () => Object.keys((await snapshot(a)).state.players).length)
      .toBe(6);
    await expect(async () => {
      if ((await snapshot(a)).state.phase !== 'WAITING_LOBBY') return;
      await a
        .getByRole('button', { name: 'Bắt đầu', exact: true })
        .click({ timeout: 1500 });
      await expect
        .poll(async () => (await snapshot(a)).state.phase, { timeout: 1500 })
        .toBe('SCHOOL_SELECTION');
    }).toPass({ timeout: 15000, intervals: [100, 250] });
    await Promise.all(
      peers.map(async (peer, i) => {
        await expect
          .poll(() => peer.state.phase, { timeout: 15000 })
          .toBe('SCHOOL_SELECTION');
        const schoolId = ['thien_son', 'vo_dang', 'cai_bang', 'thieu_lam'][i]!;
        peer.send('lobby-action', { action: 'select', schoolId });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.schoolId)
          .toBe(schoolId);
        peer.send('lobby-action', {
          action: 'branch',
          basicId: m1Config.progression!.schools[schoolId]!.basicIds[0],
        });
        peer.send('lobby-action', { action: 'confirm' });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.confirmed)
          .toBe(true);
      }),
    );
    await startTogether(pages, ['thien_son', 'vo_dang'], 60000, true);
    const sequences = peers.map(() => 0);
    for (const boss of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai']) {
      await fixture(a, 'spawn', { boss, natural: '1' });
      await expect.poll(async () => (await arena(a))?.bossId).toBe(boss);
      const start = await snapshot(a),
        key =
          boss === 'tay_doc'
            ? 'tay_doc_boss'
            : boss === 'nam_de'
              ? 'boss_nam_de'
              : boss,
        hp = JSON.parse(start.state.defense.waveArena).bossMaxHp,
        started = Date.now();
      const gold = Object.fromEntries(
        Object.entries(start.state.players).map(([id, h]: any) => [id, h.gold]),
      );
      let samples = 0,
        driving = true;
      await Promise.all(pages.map((p) => p.locator('#game canvas').focus()));
      const sdkDrivers = Promise.all(
        peers.map(async (peer, i) => {
          let pulse = 0;
          const send = (command: any) =>
            peer.send('input', {
              protocolVersion: PROTOCOL_VERSION,
              sequence: ++sequences[i]!,
              ...command,
            });
          while (driving) {
            const h = peer.state.players.get(peer.sessionId);
            const view = JSON.parse(
              peer.state.bacCai.get('arena')?.snapshot ?? 'null',
            );
            const target =
              boss === 'bac_cai'
                ? view?.forms?.length
                  ? view.forms[i % view.forms.length]
                  : view?.boss
                : peer.state.creeps.get(key);
            if (h && h.hp > 0 && target) {
              const qte = JSON.parse(
                peer.state.namDeControls.get(peer.sessionId)?.payload ?? 'null',
              )?.qte;
              if (qte?.state === 'pending')
                send({
                  kind: 'nam-de-key',
                  castId: qte.id,
                  index: qte.index,
                  key: qte.keys[qte.index],
                });
              else {
                const d = Math.hypot(target.x - h.x, target.y - h.y),
                  range =
                    m1Config.basics[h.basicId]?.effect.mode === 'projectile'
                      ? 135
                      : 38;
                send({
                  kind: 'move',
                  x: d > range ? Math.sign(target.x - h.x) : 0,
                  y: d > range ? Math.sign(target.y - h.y) : 0,
                });
                send({ kind: 'basic' });
                if (pulse % 5 === 0)
                  send({ kind: 'cast', slot: (Math.floor(pulse / 5) + i) % 4 });
              }
            }
            pulse++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }),
      );
      const drivers = Promise.all(
        pages.map(async (p, i) => {
          let pulse = 0;
          while (driving) {
            await p.keyboard.press('a');
            if (pulse % 8 === 0)
              await p.keyboard.press(
                ['q', 'w', 'e', 'r'][(Math.floor(pulse / 8) + i) % 4]!,
              );
            pulse++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }),
      );
      const held = pages.map(() => new Set<string>());
      try {
        while (Date.now() - started < 100000) {
          const s = await snapshot(a),
            view = JSON.parse(s.state.bacCai?.arena?.snapshot || 'null');
          if (!JSON.parse(s.state.defense.waveArena ?? 'null')) break;
          await Promise.all(
            pages.map(async (p, partyIndex) => {
              const n = await snapshot(p),
                h = n.state.players[n.sessionId];
              let target =
                boss === 'bac_cai' ? view?.boss : n.state.creeps[key];
              if (boss === 'bac_cai' && view?.forms?.length)
                target =
                  view.forms[Math.floor(samples / 12) % view.forms.length];
              if (!h || h.hp <= 0 || !target) return;
              const control = n.state.namDeControls[n.sessionId];
              const qte = control ? JSON.parse(control.payload).qte : undefined;
              if (qte?.state === 'pending') {
                await p.keyboard.press(
                  {
                    up: 'ArrowUp',
                    down: 'ArrowDown',
                    left: 'ArrowLeft',
                    right: 'ArrowRight',
                  }[qte.keys[qte.index] as 'up']!,
                );
                return;
              }
              const dist = Math.hypot(target.x - h.x, target.y - h.y),
                dx = dist > 135 ? Math.sign(target.x - h.x) : 0,
                dy = dist > 135 ? Math.sign(target.y - h.y) : 0;
              for (const [key, want] of [
                ['ArrowRight', dx > 0],
                ['ArrowLeft', dx < 0],
                ['ArrowDown', dy > 0],
                ['ArrowUp', dy < 0],
              ] as const)
                if (want && !held[partyIndex]!.has(key)) {
                  await p.keyboard.down(key);
                  held[partyIndex]!.add(key);
                } else if (!want && held[partyIndex]!.has(key)) {
                  await p.keyboard.up(key);
                  held[partyIndex]!.delete(key);
                }
            }),
          );
          samples++;
          if (boss === 'bac_cai' && samples === 8)
            await a.screenshot({
              path: out + '/six-player-natural-combat.png',
            });
        }
      } finally {
        driving = false;
        await drivers;
        await sdkDrivers;
        for (const [i, peer] of peers.entries())
          peer.send('input', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: ++sequences[i]!,
            kind: 'move',
            x: 0,
            y: 0,
          });
      }
      await Promise.all(
        pages.map(async (p) => {
          for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'])
            await p.keyboard.up(k);
        }),
      );
      const end = await snapshot(a);
      expect(
        !JSON.parse(end.state.defense.waveArena ?? 'null'),
        'Natural clear ' + boss,
      ).toBe(true);
      expect(
        Object.entries(end.state.players).some(
          ([id, h]: any) => h.gold > gold[id],
        ),
      ).toBe(true);
      expect(end.state.defense.statueHp).toBe(start.state.defense.statueHp);
      for (const h of Object.values(end.state.players) as any[])
        expect(JSON.parse(h.bossItems ?? '[]')).toHaveLength(0);
      report.bosses.push({
        boss,
        fullMaxHp: hp,
        seconds: (Date.now() - started) / 1000,
        samples,
        statueHp: end.state.defense.statueHp,
      });
    }
    await expect
      .poll(async () => (await arena(a))?.locked ?? false)
      .toBe(false);
    await a.screenshot({ path: out + '/six-player-arena-restored.png' });
    // Additional arranged VFX/readability phase, separate from the completed natural clears above.
    const sixVfx: any[] = [];
    for (const boss of ['bac_cai', 'nam_de']) {
      await fixture(a, 'spawn', { boss });
      await a.setViewportSize({ width: 1920, height: 1080 });
      const n = await snapshot(a),
        ids = Object.keys(n.state.players);
      for (const [i, id] of ids.entries())
        await fixture(a, 'stand', {
          player: id,
          x: String(i === 0 ? 800 : 800 + Math.cos((i * Math.PI) / 3) * 160),
          y: String(i === 0 ? 616 : 616 + Math.sin((i * Math.PI) / 3) * 120),
        });
      await fixture(a, 'cast', {
        boss,
        ability: boss === 'bac_cai' ? 'vortex' : 'nhat_duong_quy_tong',
      });
      await expect
        .poll(async () => {
          const v = await art(a),
            n = await snapshot(a);
          return boss === 'bac_cai'
            ? v.bacCai.feedback.images.filter((x: any) =>
                x.id.startsWith('spin-fx:'),
              ).length
            : Object.values(n.state.bossEffects).filter(
                (x: any) => x.kind === 'sky' && x.activeAt <= n.state.tick,
              ).length;
        })
        .toBeGreaterThanOrEqual(boss === 'bac_cai' ? 9 : 7);
      const view = await art(a);
      expect(Object.keys((await snapshot(a)).state.players)).toHaveLength(6);
      await a.screenshot({ path: out + '/six-player-' + boss + '-vfx.png' });
      sixVfx.push({
        boss,
        scope:
          'Arranged visual-only cast after natural clears; high player HP fixture; six real network peers/two renderers',
        presentation: view,
      });
    }
    report.sixPeerVfx = sixVfx;

    expect(errors).toEqual([]);
    report.status = 'PASS';
    report.errors = errors;
    await writeFile(out + '/six-client.json', JSON.stringify(report, null, 2));
  } catch (error) {
    await writeFile(
      out + '/six-client-failure.json',
      JSON.stringify(
        {
          error: String(error),
          report,
          snapshot: await snapshot(a),
          presentation: await art(a),
        },
        null,
        2,
      ),
    );
    await a.screenshot({ path: out + '/six-client-failure.png' });
    throw error;
  } finally {
    await Promise.allSettled(sdkPeers.map((p) => p.leave()));
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('dungeon bosses announce real naturally-entered specials above their heads in both clients', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    a = pages[0]!,
    b = pages[1]!,
    errors: string[] = [],
    cases: any[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(a, 'Shout A');
    await joinWaiting(b, 'Shout B', (await snapshot(a)).roomId);
    await startTogether(pages, ['vo_dang', 'thien_son']);
    for (const [destination, name] of [
      ['co_mo', 'Băng Phách Ngân Châm'],
      ['chu_ba_thong', 'Song Thủ Hỗ Bác'],
      ['hong_liet', 'Hỏa Sơn Bạo Phát'],
      ['kim_luan', 'Cuồng Phong Tấn Lôi Công'],
    ] as const) {
      await fixture(a, 'dungeon_shout', { destination });
      for (const p of pages)
        await expect
          .poll(
            async () =>
              (await snapshot(p)).state.players[(await snapshot(p)).sessionId]
                .zoneId,
          )
          .toContain(destination);
      for (const p of pages)
        await expect
          .poll(async () =>
            (await art(p)).bossShouts.observed.some(
              (x: any) => x.name === name,
            ),
          )
          .toBe(true);
      for (const p of pages)
        await expect
          .poll(
            async () => {
              const v = await art(p),
                label = v.bossShouts.active.find((x: any) => x.name === name),
                cam = v.camera;
              return (
                !!label &&
                label.x > cam.x + 10 &&
                label.x < cam.x + 630 &&
                label.y > cam.y + 75 &&
                label.y < cam.y + 345
              );
            },
            { intervals: [25, 50] },
          )
          .toBe(true);
      const view = (await art(a)).bossShouts;
      expect(view.observed.filter((x: any) => x.name === name)).toHaveLength(1);
      cases.push({ destination, name, view, other: (await art(b)).bossShouts });
      if (destination === 'hong_liet')
        await a.screenshot({ path: out + '/live-dungeon-skill-shout.png' });
    }
    expect(errors).toEqual([]);
    await writeFile(
      out + '/dungeon-shouts.json',
      JSON.stringify(
        {
          status: 'PASS',
          scope:
            'Two real clients; dungeon entry and next natural AI action prerequisites only',
          cases,
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('latest feedback: synchronized banter, five concurrent fingers, clone-hit and no-hit termination', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [a, b] = (await Promise.all(contexts.map((c) => c.newPage()))) as [
    Page,
    Page,
  ];
  const errors: string[] = [],
    cases: any[] = [];
  for (const p of [a, b]) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  await mkdir(out, { recursive: true });
  try {
    await joinWaiting(a, 'Banter A');
    await joinWaiting(b, 'Banter B', (await snapshot(a)).roomId);
    await startTogether([a, b], ['vo_dang', 'thien_son']);
    for (const boss of ['dong_ta', 'tay_doc', 'nam_de']) {
      await fixture(a, 'spawn', { boss });
      const actorId =
        boss === 'nam_de'
          ? 'boss_nam_de'
          : boss === 'tay_doc'
            ? 'tay_doc_boss'
            : boss;
      await expect
        .poll(
          async () =>
            (await art(a)).bossShouts.active.some(
              (x: any) => x.banter && x.sourceId === actorId,
            ),
          { timeout: 20000 },
        )
        .toBe(true);
      const line = (await art(a)).bossShouts.active.find(
        (x: any) => x.banter && x.sourceId === actorId,
      );
      await a.screenshot({ path: out + '/live-banter-' + boss + '.png' });
      await expect
        .poll(async () =>
          (await art(b)).bossShouts.observed.some(
            (x: any) => x.sourceId === actorId && x.name === line.name,
          ),
        )
        .toBe(true);
      cases.push({ boss, banter: line, synchronized: true });
      if (boss === 'nam_de') {
        await fixture(a, 'stand', {
          player: (await snapshot(a)).sessionId,
          x: '800',
          y: '760',
        });
        await a.setViewportSize({ width: 1920, height: 1080 });
        await fixture(a, 'cast', { boss, ability: 'nhat_duong_quy_tong' });
        const seen = new Map<string, Set<number>>();
        let concurrent = false;
        await expect
          .poll(
            async () => {
              const s = await snapshot(a),
                v = JSON.parse(s.state.defense.namDe);
              for (const effect of Object.values(s.state.bossEffects) as any[])
                if (effect.kind === 'finger') {
                  const indices = seen.get(effect.castId) ?? new Set<number>();
                  indices.add(effect.index);
                  seen.set(effect.castId, indices);
                  if (
                    v.cast?.ability === 'nhat_duong_quy_tong' &&
                    v.smallCast?.id === effect.castId
                  )
                    concurrent = true;
                }
              return [...seen.values()].some((s) => s.size === 5) && concurrent;
            },
            { timeout: 12000, intervals: [35, 50] },
          )
          .toBe(true);
        for (const p of [a, b]) {
          const v = JSON.parse((await snapshot(p)).state.defense.namDe);
          expect(v.cast?.ability).toBe('nhat_duong_quy_tong');
        }
        await a.screenshot({ path: out + '/live-concurrent-five-fingers.png' });
        cases.push({
          boss,
          concurrent,
          bursts: [...seen].map(([id, indices]) => ({
            id,
            indices: [...indices],
          })),
        });
      }
    }
    await fixture(a, 'spawn', { boss: 'bac_cai' });
    for (const p of [a, b])
      await expect
        .poll(async () => (await art(p)).bacCai.view?.phase)
        .toBe('combat');
    for (const mode of ['hit', 'timeout']) {
      await fixture(a, 'natural_bac_clones');
      await expect
        .poll(async () => (await art(a)).bacCai.view?.clonePhase, {
          timeout: 20000,
          intervals: [50, 100],
        })
        .toBe('reveal');
      const started = Date.now();
      const peerId = (await snapshot(b)).sessionId;
      await fixture(a, 'stand', { player: peerId, x: '800', y: '880' });
      const hp = (await snapshot(b)).state.players[peerId].hp;
      if (mode === 'hit') {
        await fixture(a, 'approach_copy');
        await expect
          .poll(
            async () =>
              (await snapshot(a)).state.players[(await snapshot(a)).sessionId]
                .fx,
          )
          .toBe(1);
        await a.locator('#game canvas').focus();
        await a.keyboard.press('a');
      }
      await expect
        .poll(async () => (await art(a)).bacCai.view.forms.length, {
          timeout: 8000,
          intervals: [50, 100],
        })
        .toBe(0);
      await expect
        .poll(async () => (await art(b)).bacCai.view.forms.length)
        .toBe(0);
      const elapsed = Date.now() - started;
      if (mode === 'timeout') expect(elapsed).toBeGreaterThan(4100);
      else expect(elapsed).toBeLessThan(2500);
      await expect
        .poll(async () => (await snapshot(b)).state.players[peerId].hp)
        .toBeLessThan(hp - 5);
      expect(
        (await art(a)).bossShouts.observed.some((x: any) =>
          x.abilityId.startsWith('banter_bac_cai'),
        ),
      ).toBe(false);
      cases.push({
        boss: 'bac_cai',
        mode,
        elapsed,
        peerHpBefore: hp,
        peerHpAfter: (await snapshot(b)).state.players[peerId].hp,
      });
    }
    expect(errors).toEqual([]);
    await writeFile(
      out + '/latest-feedback.json',
      JSON.stringify({ status: 'PASS', cases, errors }, null, 2),
    );
  } catch (error) {
    await writeFile(
      out + '/latest-feedback-failure.json',
      JSON.stringify({ error: String(error), cases, errors }, null, 2),
    );
    await a.screenshot({ path: out + '/latest-feedback-failure.png' });
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('gameplay update synchronizes boss farewells, corpse expiry and dungeon chatter', async ({
  browser,
}, info) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [a, b] = (await Promise.all(
    contexts.map((context) => context.newPage()),
  )) as [Page, Page];
  const errors: string[] = [];
  for (const page of [a, b])
    page.on('pageerror', (error) => errors.push(error.message));
  try {
    await joinWaiting(a, 'Hộ Thạch');
    await joinWaiting(b, 'Bằng Hữu', (await snapshot(a)).roomId);
    await startTogether([a, b], ['vo_dang_kiem', 'thien_son_dao']);
    await expect
      .poll(() =>
        a.evaluate(
          'window.__VOLAM__.progressionPresentation().statueIntroduction',
        ),
      )
      .toContain('Long Hồn Thần Thạch');
    for (const [boss, id] of [
      ['dong_ta', 'dong_ta'],
      ['tay_doc', 'tay_doc_boss'],
      ['nam_de', 'boss_nam_de'],
      ['bac_cai', 'bac_cai'],
    ] as const) {
      await fixture(a, 'spawn', { boss });
      await expect.poll(async () => (await arena(b))?.bossId).toBe(boss);
      await fixture(a, 'kill_boss', { boss });
      const line = waveBossFarewells[id];
      const corpse = async () => {
        const state = (await snapshot(a)).state;
        if (boss === 'bac_cai')
          return !!JSON.parse(state.bacCai.arena?.snapshot ?? 'null')?.boss;
        return state.creeps[id]?.hp === 0;
      };
      for (const page of [a, b])
        await expect
          .poll(async () =>
            (await art(page)).bossShouts.active.some(
              (entry: any) =>
                entry.farewell &&
                entry.visible &&
                entry.sourceId === id &&
                entry.name === line,
            ),
          )
          .toBe(true);
      expect(await corpse()).toBe(true);
      if (boss === 'bac_cai')
        await a.screenshot({ path: info.outputPath('bac-cai-farewell.png') });
      await expect.poll(corpse, { timeout: 8000 }).toBe(false);
      for (const page of [a, b])
        expect(
          (await art(page)).bossShouts.observed.filter(
            (entry: any) => entry.name === line,
          ),
        ).toHaveLength(1);
    }
    for (const [destination, id] of [
      ['co_mo', 'boss_ly_mac_sau'],
      ['chu_ba_thong', 'chu_ba_thong'],
      ['hong_liet', 'hong_liet_boss'],
      ['kim_luan', 'hoac_do'],
    ] as const) {
      await fixture(a, 'dungeon_shout', { destination });
      const zoneId = destination + '_shared';
      const heard = async (page: Page) =>
        (await art(page)).bossShouts.observed.find(
          (entry: any) =>
            entry.sourceId === zoneId + ':' + id &&
            entry.abilityId.startsWith('banter_' + id + '_'),
        );
      await expect
        .poll(() => heard(a), {
          message: 'Banter from ' + id + ' in ' + zoneId,
          timeout: 22_000,
        })
        .toBeTruthy();
      await expect.poll(() => heard(b)).toEqual(await heard(a));
    }
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('crafting consumes an earned boss material, equips Z and loads both new Cái Bang icon sets', async ({
  browser,
}, info) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [a, b] = (await Promise.all(
    contexts.map((context) => context.newPage()),
  )) as [Page, Page];
  const errors: string[] = [];
  for (const page of [a, b])
    page.on('pageerror', (error) => errors.push(error.message));
  const sdk = new Client(
    process.env['VITE_SERVER_URL'] ?? 'http://127.0.0.1:2904',
  );
  const joinObserver = (roomId: string, nickname: string) =>
    sdk.joinById<LobbyState>(roomId, {
      nickname,
      protocolVersion: PROTOCOL_VERSION,
    });
  const peers: Awaited<ReturnType<typeof joinObserver>>[] = [];
  try {
    await joinWaiting(a, 'Thử Bổng');
    const roomId = (await snapshot(a)).roomId;
    await joinWaiting(b, 'Thử Chưởng', roomId);
    for (let i = 1; i <= 4; i++) {
      const peer = await joinObserver(roomId, 'Quan sát ' + i);
      peer.onMessage('combat-event', () => {});
      peers.push(peer);
    }
    await Promise.all([
      startTogether([a, b], ['cai_bang_bong', 'cai_bang_chuong'], 60_000),
      ...peers.map(async (peer) => {
        await expect
          .poll(() => peer.state?.phase, { timeout: 60_000 })
          .toBe('SCHOOL_SELECTION');
        peer.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
        peer.send('lobby-action', {
          action: 'branch',
          basicId: 'cai_bang_bong',
        });
        peer.send('lobby-action', { action: 'confirm' });
      }),
    ]);
    await expect
      .poll(async () => Object.keys((await snapshot(a)).state.players).length)
      .toBe(6);
    for (const [page, ids] of [
      [
        a,
        [
          'cai_bang_bong',
          'hoanh_tao_bong',
          'pha_giap_bong',
          'cam_long_cong',
          'truy_phong_bong',
          'thien_ha_vo_cau',
        ],
      ],
      [
        b,
        [
          'cai_bang_chuong',
          'hoa_van_chuong',
          'cuong_long_loan_vu',
          'phi_long_tai_thien',
          'khang_long_huu_hoi',
          'hang_long_hoa_vu',
        ],
      ],
    ] as const) {
      for (const [i, id] of ids.entries()) {
        const url = '/assets/skills/cai-bang-icons-v2/' + id + '.png';
        await expect(
          page.locator('#slot-' + 'aqwert'[i] + ' .pixel-icon'),
        ).toHaveCSS('background-image', new RegExp(url));
        expect((await page.request.get(url)).ok()).toBe(true);
      }
      await page.screenshot({ path: info.outputPath(ids[0] + '.png') });
    }
    await fixture(a, 'craft_gold');
    const player = (await snapshot(a)).sessionId;
    const hero = async () => (await snapshot(a)).state.players[player];
    const shop = () =>
      a.getByRole('button', { name: 'Thương Gia', exact: true }).click();
    await a.bringToFront();
    await shop();
    await a.locator('[data-ui-action=gear][data-value=boots]').click();
    for (let level = 1; level <= 5; level++) {
      await a.locator('[data-ui-action=buy][data-value=boots]').click();
      await expect
        .poll(async () => (await hero()).inventory.levels.boots)
        .toBe(level);
    }
    await a.getByRole('tab', { name: 'Chế tạo' }).click();
    await expect(a.locator('[data-ui-action=craft]')).toBeDisabled();
    await expect(a.locator('.item-craft-action')).toContainText(
      'Thiếu Ngọc Uyên Ương',
    );
    await a.keyboard.press('Escape');
    await fixture(a, 'craft_target', { player });
    await expect.poll(async () => (await hero()).zoneId).toBe('co_mo_shared');
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyA');
    await expect
      .poll(async () => (await hero()).inventory.materials.boots)
      .toBe(1);
    expect(
      (await snapshot(b)).state.players[(await snapshot(b)).sessionId].inventory
        .materials.boots,
    ).toBe(0);
    await fixture(a, 'craft_exit', { player });
    await expect
      .poll(async () => {
        const h = await hero();
        return Math.hypot(h.x - coMoDungeon.exit.x, h.y - coMoDungeon.exit.y);
      })
      .toBeLessThan(coMoDungeon.exitRange);

    await a.keyboard.press('Space');
    await expect.poll(async () => (await hero()).zoneId).toBe('arena');
    await shop();
    await a.getByRole('tab', { name: 'Chế tạo' }).click();
    await a.locator('[data-ui-action=branch][data-value="2"]').click();
    const gold = (await hero()).gold;
    await expect(a.locator('[data-ui-action=craft]')).toBeEnabled();
    await a.screenshot({ path: info.outputPath('craft-ready.png') });
    await a.locator('[data-ui-action=craft]').click();
    await expect
      .poll(async () => (await hero()).inventory.crafted.boots)
      .toBe('needle');
    expect((await hero()).inventory.materials.boots).toBe(0);
    expect((await hero()).gold).toBe(gold - 450);
    await expect(a.locator('[data-ui-action=craft]')).toBeDisabled();
    await expect
      .poll(
        async () =>
          (await snapshot(b)).state.players[player].inventory.crafted.boots,
      )
      .toBe('needle');
    await a.keyboard.press('Escape');
    await expect(a.locator('#slot-z')).toHaveAttribute(
      'aria-label',
      'Z · Phi châm',
    );
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyZ');
    await expect
      .poll(async () => (await hero()).inventory.auxiliaryCooldownTicks)
      .toBeGreaterThan(0);
    await expect
      .poll(async () =>
        (await snapshot(a)).events.some(
          (event: any) =>
            event.abilityId === 'gear_needle' && event.kind === 'cast',
        ),
      )
      .toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([
      ...contexts.map((context) => context.close()),
      ...peers.map((peer) => peer.leave()),
    ]);
  }
});
