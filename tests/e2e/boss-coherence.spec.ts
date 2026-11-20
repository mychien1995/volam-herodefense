import { test } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';
test('Dong Ta coherent body uses native encounter releases and manual A defeat', async ({
  browser,
}) => {
  const before = process.env['VOLAM_BOSS_BEFORE'] === '1';
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_BOSS_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist: '.cache/boss-coherence-dist',
    clientQuery: before ? '&bossCoherence=0' : '',
    evidenceDir: qaEvidenceDirectory('docs/evidence/boss-coherence'),
    onReady: async ({ room, pages, out }: any) => {
      mkdirSync(out, { recursive: true });
      const w = room.world,
        c = room.simulation.arena.config,
        dong = room.simulation.dongTa,
        heroes = [...w.heroes.values()] as any[],
        page = pages[0];
      w.creeps.clear();
      w.projectiles.clear();
      w.areas = [];
      w.shots = [];
      w.actions = [];
      room.simulation.invasion.nextWaveTick = w.tick + 100000;
      dong.phase = 'fighting';
      dong.summoned = true;
      const boss = dong.spawn(w, c, 'dong_ta', { x: 700, y: 650 });
      boss.maxHp = boss.hp = 1000000;
      const arrange = (distance = 118) => {
        dong.casts = [];
        dong.effects = [];
        Object.assign(boss, {
          x: 700,
          y: 650,
          fx: 1,
          fy: 1,
          hp: 1000000,
          cooldown: w.tick + 100000,
          statuses: [],
          pose: 'idle',
          actionUntil: 0,
        });
        heroes.forEach((h: any, i: number) =>
          Object.assign(h, {
            x: 700 + distance / Math.SQRT2 + i * 25,
            y: 650 + distance / Math.SQRT2 + i * 25,
            hp: 100000,
            maxHp: 100000,
            moveX: 0,
            moveY: 0,
            statuses: [],
            invulnerable: true,
          }),
        );
      };
      const body = async () =>
        page.evaluate(() =>
          (window as any).__VOLAM__
            .presentation()
            .renovation.bodies.find(
              (b: any) => b.id === 'dong_ta' && b.visible,
            ),
        );
      const wait = (fn: any, label: string) =>
        waitForQa(fn, label, { timeout: 15000 });
      const observe = async (ms: number) =>
        page.evaluate(
          (ms: number) =>
            new Promise<any>((resolve) => {
              const start = performance.now(),
                frames = new Set<string>(),
                scales = new Set<string>();
              const poll = () => {
                const b = (window as any).__VOLAM__
                  .presentation()
                  .renovation.bodies.find(
                    (b: any) => b.id === 'dong_ta' && b.visible,
                  );
                if (b) {
                  frames.add(String(b.frame));
                  scales.add(JSON.stringify(b.scale));
                }
                if (performance.now() - start >= ms)
                  resolve({ frames: [...frames], scales: [...scales] });
                else requestAnimationFrame(poll);
              };
              poll();
            }),
          ms,
        );
      arrange();
      await wait(async () => !!(await body()), 'real boss body');
      const idle = await observe(2900);
      if (!before) {
        for (let i = 0; i < 4; i++)
          assert.ok(idle.frames.includes('idle_' + i + '_down_right'));
        assert.deepEqual(idle.scales, ['[0.5,0.5]']);
      }
      await page
        .locator('#viewport')
        .screenshot({ path: resolve(out, 'idle.png') });
      arrange(440);
      const walk = await observe(550);
      if (!before)
        assert.ok(walk.frames.some((f: string) => f.startsWith('walk_')));
      const cases = [];
      for (const ability of [
        'ta_kiem_lien_kich',
        'lac_anh_normal',
        'dan_chi_than_cong',
        'lac_anh_kiem_phap',
        'ngoc_tieu_hoi_phong',
        'trieu_hon_dong_hai',
      ]) {
        arrange();
        await page.waitForTimeout(150);
        const since = w.events.at(-1)?.id ?? 0;
        const definition = dong.definition.abilities[ability];
        const observation = observe(
          ((definition.windup + Math.min(definition.duration, 75) + 10) *
            1000) /
            c.tickRate,
        );
        assert.ok(dong.beginCast(w, c, 'dong_ta', ability, heroes[0].id));
        await wait(
          () =>
            dong.casts.some((a: any) => a.abilityId === ability && a.released),
          'server release ' + ability,
        );
        const serverCast = dong.casts.find(
          (a: any) => a.abilityId === ability,
        )!;
        let peerReleases: any[] = [];
        await wait(async () => {
          peerReleases = await Promise.all(
            pages.map((p: any) =>
              p.evaluate(
                ({ ability, activeAt }: any) => {
                  const v = JSON.parse(
                    (window as any).__VOLAM__.snapshot().state.defense.dongTa,
                  );
                  return v.casts.find(
                    (a: any) =>
                      a.abilityId === ability &&
                      a.activeAt === activeAt &&
                      a.released,
                  );
                },
                { ability, activeAt: serverCast.activeAt },
              ),
            ),
          );
          return peerReleases.every(Boolean);
        }, 'peer replicated release ' + ability);
        const present = await body();
        if (!before) assert.equal(present.texture, 'boss-unified:dong_ta');
        await page
          .locator('#viewport')
          .screenshot({ path: resolve(out, ability + '.png') });
        const cap = await observation;
        const ack = await Promise.all(
          pages.map((p: any) =>
            p.evaluate((ability: string) => {
              const s = (window as any).__VOLAM__.snapshot();
              return {
                phase: s.state.phase,
                events: s.events
                  .filter(
                    (e: any) =>
                      e.abilityId === ability && e.sourceId === 'dong_ta',
                  )
                  .map((e: any) => ({
                    id: e.id,
                    kind: e.kind,
                    stage: e.stage,
                  })),
              };
            }, ability),
          ),
        );

        cases.push({
          ability,
          sourceSince: since,
          body: present,
          cap,
          peerEvents: ack,
          peerReleases,
        });
      }
      const facings = [];
      for (const [d, fx, fy] of [
        ['down', 0, 1],
        ['down_right', 1, 1],
        ['right', 1, 0],
        ['up_right', 1, -1],
        ['up', 0, -1],
        ['up_left', -1, -1],
        ['left', -1, 0],
        ['down_left', -1, 1],
      ] as const) {
        arrange();
        boss.fx = fx;
        boss.fy = fy;
        heroes.forEach((h: any, i: number) =>
          Object.assign(h, {
            x: 700 + fx * 100 + i * fx * 25,
            y: 650 + fy * 100 + i * fy * 25,
          }),
        );
        if (!before)
          await wait(
            async () => (await body())?.frame?.endsWith('_' + d),
            'live facing ' + d,
          );
        facings.push({ direction: d, body: await body() });
      }
      arrange();
      await page.locator('#game canvas').focus();
      for (const enabled of [false, true]) {
        await page.keyboard.press('F8');
        await wait(
          async () =>
            (await page.evaluate(
              () => (window as any).__VOLAM__.presentation().worldDepth.enabled,
            )) === enabled,
          'F8',
        );
      }
      // A real accepted manual attack kills a server-owned one-HP fixture.
      arrange(45);
      for (const a of [...w.creeps.values()] as any[])
        if (a.id !== boss.id) w.creeps.delete(a.id);
      boss.hp = 1;
      boss.invulnerable = false;
      await page.keyboard.down('ArrowUp');
      await page.keyboard.down('ArrowLeft');
      try {
        await wait(
          () => heroes[0].fx < 0 && heroes[0].fy < 0 && heroes[0].x < 730,
          'server acknowledges facing input',
        );
      } finally {
        await page.keyboard.up('ArrowUp');
        await page.keyboard.up('ArrowLeft');
      }
      const deathObservation = observe(1600);
      await page.keyboard.press('KeyA');
      await wait(
        () => boss.hp <= 0 || !w.creeps.has(boss.id),
        'manual A defeated boss',
      );
      if (!before) {
        await wait(
          async () => (await body())?.frame?.startsWith('death_'),
          'canonical corpse body',
        );
        await page
          .locator('#viewport')
          .screenshot({ path: resolve(out, 'death.png') });
      }
      const death = await deathObservation;
      if (!before) {
        assert.ok(death.frames.some((f: string) => f.startsWith('death_0_')));
        assert.ok(death.frames.some((f: string) => f.startsWith('death_1_')));
        assert.ok(!death.frames.some((f: string) => /^death_[a-z]+_/.test(f)));
      }
      await wait(async () => !(await body()), 'corpse cleanup');
      writeFileSync(
        resolve(out, 'verification.json'),
        JSON.stringify(
          {
            status: 'PASS',
            before,
            clients: pages.length,
            fixture:
              'Isolated server-owned boss spawn/build/location/cooldown prerequisites; actual encounter beginCast/release and replicated effects; manual A defeat/corpse cleanup covered; not natural progression or balance acceptance',
            idle,
            walk,
            facings,
            death,
            cases,
          },
          null,
          2,
        ),
      );
    },
  });
});
