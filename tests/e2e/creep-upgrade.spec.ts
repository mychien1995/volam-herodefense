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
import { joinWaiting, startAuditTogether } from './pregame-helper.js';
import { qaEvidenceDirectory, qaSession } from '../../tools/qa-session.mjs';
const session = qaSession({
  serverPort: 2928,
  clientPort: 5528,
  profile: 'creep-upgrade',
});
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const presentation = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
const out = qaEvidenceDirectory(
  'docs/evidence/sessions/m3d-review-integration/creep-motion',
);

test('4 gates stream naturally; 44 regular identities cast in live Phaser with six players and private-zone filtering', async ({
  browser,
  request,
}) => {
  test.setTimeout(480000);
  mkdirSync(out, { recursive: true });
  const contexts = await Promise.all([
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
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
        { timeout: 30000, intervals: [100, 250] },
      )
      .toBe(6);
    await Promise.all([
      startAuditTogether(
        [
          [pages[0]!, 'vo_dang', 'vo_dang_kiem'],
          [pages[1]!, 'thieu_lam', 'thieu_lam_dao'],
        ],
        35000,
      ),
      ...bots.map(async (b) => {
        await expect
          .poll(() => b.state.phase, { timeout: 30000 })
          .toBe('SCHOOL_SELECTION');
        b.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
        b.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
        b.send('lobby-action', { action: 'confirm' });
      }),
    ]);
    for (const page of pages)
      await expect(page.locator('#pregame')).toBeHidden({ timeout: 20000 });
    const fixture = async (op: string, extra: Record<string, string> = {}) => {
      const response = await request.post(
        `/__creep_fixture?${new URLSearchParams({ room, hero: initial.sessionId, op, ...extra })}`,
      );
      expect(response.ok(), await response.text()).toBe(true);
      return response.json();
    };
    expect((await snapshot(host)).state.defense.portalCount).toBe(4);
    expect((await snapshot(pages[1]!)).state.defense.portalCount).toBe(4);
    await fixture('stream', { audit: '1' });
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
    await fixture('review-isolate');
    await host.evaluate(() => {
      const w = window as any;
      const observed: Record<
        string,
        Record<
          string,
          {
            texture: string;
            source: string;
            frame: string;
            scale: number[];
            cels: string[];
            windup: number;
          }
        >
      > = {};
      w.__m3dCreepAudit = observed;
      const sample = () => {
        const s = w.__VOLAM__.snapshot();
        const targets = Object.entries(s.state.creeps).filter(([id]) =>
          id.includes('review_'),
        );
        if (targets.length) {
          const view = w.__VOLAM__.presentation();
          for (const [id, value] of targets) {
            const a = value as {
              hp: number;
              castAbilityId: string;
              actionStartedAt: number;
              actionActiveAt: number;
            };
            const body = view.actors.find((actor: any) => actor.id === id);
            if (!body) continue;
            const phase =
              a.hp <= 0 && /death|die/.test(body.frame)
                ? 'death'
                : body.pose === 'hurt'
                  ? 'hurt'
                  : body.pose === 'cast' && a.castAbilityId.endsWith('_special')
                    ? 'special'
                    : /attack|cast/.test(body.frame) &&
                        a.castAbilityId.endsWith('_basic')
                      ? 'basic'
                      : body.pose === 'idle' || body.pose === 'walk'
                        ? 'locomotion'
                        : '';
            if (phase) {
              const sample = ((observed[id.split('review_')[1]!] ??= {})[
                phase
              ] ??= {
                texture: body.texture,
                source: body.source,
                frame: body.frame,
                scale: body.scale,
                cels: [],
                windup: a.actionActiveAt - a.actionStartedAt,
              });
              const cel = body.texture + ':' + body.frame;
              if (!sample.cels.includes(cel)) sample.cels.push(cel);
              if (
                id.endsWith('review_truc_xa') &&
                phase === 'special' &&
                body.texture === 'renovated-forest-truc-xa-actions' &&
                /^basic_attack_.+_2$/.test(body.frame) &&
                !w.__renovatedVenomPng
              ) {
                w.__renovatedVenomPng = document
                  .querySelector('canvas')
                  ?.toDataURL('image/png');
              }
            }
          }
        }
        w.__VOLAM__.afterRender(sample);
      };
      w.__VOLAM__.afterRender(sample);
    });
    const check = async (id: string, death = false) => {
      console.info('[creep-runtime]', id);
      await fixture('spawn', { id, audit: '1' });
      const see = async (
        phase: 'locomotion' | 'basic' | 'special' | 'hurt' | 'death',
        attack = false,
      ) => {
        const read = () =>
          host.evaluate(
            ({ id, phase }) => (window as any).__m3dCreepAudit[id]?.[phase],
            { id, phase },
          );
        if (attack) await host.locator('#game canvas').focus();
        await expect
          .poll(
            async () => {
              const observed = await read();
              if (!observed && attack) await host.keyboard.press('a');
              return observed;
            },
            {
              timeout: 12000,
              intervals: [100, 160, 250],
              message: id + ' ' + phase,
            },
          )
          .toBeTruthy();
        return read();
      };
      const locomotion = await see('locomotion');
      const basic = await see('basic');
      const profile = creepProfiles[id]!;
      const hit = async () => {
        await fixture('review-hit', { id });
        return see('hurt', true);
      };
      const earlyHurt = profile.special?.suicide ? await hit() : undefined;
      let special = profile.special ? await see('special') : undefined;
      const authored = new Set([
        'truc_xa',
        'son_vien',
        'moc_linh',
        'xac_uop',
        'cu_nhan_sa_thach',
        'hai_tac_hoa_phao',
        'hai_vu',
        'hell_xich_quy',
        'doc_chu',
      ]);
      if (authored.has(id)) {
        const ability = 'creep_' + id + (special ? '_special' : '_basic');
        await expect
          .poll(
            () =>
              host.evaluate(
                (ability) =>
                  (
                    (window as any).__VOLAM__.presentation().creepCombat
                      ?.releases ?? []
                  ).some(
                    (v: any) => v.abilityId === ability && v.frames.length > 0,
                  ),
                ability,
              ),
            {
              timeout: 8000,
              intervals: [100, 200],
              message: id + ' authored VFX',
            },
          )
          .toBe(true);
      }
      const p = await presentation(host);
      if (id === 'doc_chu') {
        await expect
          .poll(
            async () =>
              (await snapshot(host)).state.players[
                initial.sessionId
              ].statuses.includes('creep_doc_chu_basic'),
            { timeout: 5000, intervals: [30, 50, 100] },
          )
          .toBe(true);
        await host.screenshot({ path: out + '/forest-web.png' });
      }
      if (id === 'truc_xa') {
        const shot = () =>
          host.evaluate(
            () => (window as any).__renovatedVenomPng as string | undefined,
          );
        await expect.poll(shot, { timeout: 8000 }).toBeTruthy();
        const png = (await shot())!;
        writeFileSync(
          out + '/forest-venom-cast.png',
          Buffer.from(png.split(',')[1]!, 'base64'),
        );
      }
      const hurt = earlyHurt ?? (await hit());
      expect(locomotion.texture).toMatch(/^renovated-/);
      expect(locomotion.scale).toEqual([0.5, 0.5]);
      expect(hurt.texture).toBe(locomotion.texture);
      expect(hurt.scale[0]).toBe(0.5);
      if (special) {
        special = await see('special');
        expect([
          locomotion.texture,
          'renovated-forest-truc-xa-actions',
        ]).toContain(special.texture);
        expect(special.scale).toEqual([0.5, 0.5]);
        expect(special.windup).toBe(
          Math.round(
            creepProfiles[id]!.special!.windup *
              creepCombatDefinition.specialWindupScale,
          ),
        );
        expect(
          special.cels.every(
            (cel: string) =>
              cel.startsWith(locomotion.texture + ':') ||
              (id === 'truc_xa' &&
                cel.startsWith('renovated-forest-truc-xa-actions:')),
          ),
        ).toBe(true);
      }
      const existing = Object.values((await snapshot(host)).state.creeps).find(
        (e: any) => e.archetypeId === id,
      ) as any;
      const alive = !profile.special?.suicide && existing?.hp > 0;
      if (alive) await fixture('review-finisher', { id });
      const deathBody = await see('death', alive);
      expect(deathBody.texture).toBe(basic.texture);
      if (id === 'truc_xa' || id === 'doc_chu') {
        expect(basic.texture).toBe(
          'renovated-forest-' + id.replace('_', '-') + '-actions',
        );
        expect(basic.scale).toEqual([0.5, 0.5]);
        expect(deathBody.scale).toEqual([0.5, 0.5]);
        expect(
          p.creepCombat.releases.some(
            (effect: any) =>
              effect.abilityId.startsWith('creep_' + id + '_') &&
              effect.frames.some((frame: string) =>
                frame.startsWith('renovated-forest-combat-effects:'),
              ),
          ),
        ).toBe(true);
      } else expect(basic.source).toContain('creep_motion_v08__');
      coverage[id] = {
        locomotion,
        hurt,
        basic,
        special,
        death: deathBody,
        deathAbility: death,
        effects: p.creepCombat?.releases?.filter((e: any) =>
          e.abilityId.startsWith('creep_' + id + '_'),
        ),
      };
    };
    const defects: Record<string, string> = {};
    const audit = async (id: string) => {
      try {
        await check(id, !!creepProfiles[id]!.death);
      } catch (error) {
        defects[id] = String(error);
        const details = await host
          .evaluate((id) => {
            const w = (window as any).__VOLAM__,
              s = w.snapshot(),
              p = w.presentation();
            const entries = Object.entries(s.state.creeps).filter(([key]) =>
              key.endsWith('review_' + id),
            );
            return {
              server: entries,
              body: p.actors.filter((a: any) => a.id.endsWith('review_' + id)),
              renderedZone: p.zoneId,
              heroZone: s.state.players[s.sessionId]?.zoneId,
            };
          }, id)
          .catch(() => null);
        console.info(
          '[creep-audit-defect]',
          id,
          String(error),
          JSON.stringify(details),
        );
      }
    };
    const requested = process.env['VOLAM_QA_CREEP_AUDIT_IDS']?.split(',');
    const selected = (id: string) => !requested || requested.includes(id);
    for (const id of creepCombatDefinition.waveIds.filter(selected))
      await audit(id);
    for (const [zone, roster] of [
      ['forest', forestRoster],
      ['desert', desertRoster],
      ['sea', beachRoster],
      ['hell', hellRoster],
    ] as const) {
      const ids = roster.filter(selected);
      if (!ids.length) continue;
      await fixture('enter', { zone });
      await expect
        .poll(
          async () =>
            (await snapshot(host)).state.players[initial.sessionId].zoneId,
        )
        .toContain(zone);
      for (const id of ids) await audit(id);
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
    const lowered = async () =>
      (await presentation(host)).actors.filter(
        (actor: any) => actor.id.startsWith('crowd_') && actor.depth < actor.y,
      );
    await expect.poll(async () => (await lowered()).length).toBeGreaterThan(0);
    const adjusted = new Set((await lowered()).map((a: any) => a.id));
    await expect
      .poll(async () =>
        (await presentation(pages[1]!)).actors.some(
          (actor: any) => adjusted.has(actor.id) && actor.depth === actor.y,
        ),
      )
      .toBe(true);
    await host.screenshot({ path: `${out}/arena-six-player.png` });
    await fixture('review-isolate');
    await expect.poll(async () => (await lowered()).length).toBe(0);
    expect(defects).toEqual({});
    expect(Object.keys(coverage)).toHaveLength(requested?.length ?? 44);
    expect(errors).toEqual([]);
    writeFileSync(
      `${out}/browser.json`,
      JSON.stringify(
        {
          players: 6,
          browserClients: 2,
          sdkClients: 4,
          scope: requested ?? 'full',
          coverage,
          errors,
        },
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
          coverage,
          observed: await pages[0]!
            .evaluate('window.__m3dCreepAudit')
            .catch(() => null),
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
    await Promise.all([
      ...bots.map((bot) => {
        bot.reconnection.enabled = false;
        return bot.leave(false);
      }),
      ...contexts.map((context) => context.close()),
    ]);
  }
});
