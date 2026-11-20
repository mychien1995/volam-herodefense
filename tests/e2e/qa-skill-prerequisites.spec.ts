import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { conLuan, duongMon, nguDoc } from '@volam/game-core';
import { joinWaiting, startAuditTogether } from './pregame-helper.js';
import { observeQa } from '../../tools/qa-browser.mjs';
import {
  ensureQaKinhLoi,
  ensureQaSkillLearned,
  castQaSkill,
  placeQaOwnerOnlyArea,
  captureQaSummon,
  waitQaSummonTransfer,
} from '../../tools/qa-skill-browser.mjs';

test('skill prerequisites use real keys, fresh server events and three live Phaser clients', async ({
  browser,
}, info) => {
  const contexts = await Promise.all(
    [0, 1, 2].map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const [sword, trapper, summoner] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  const errors: string[] = [];
  for (const page of [sword!, trapper!, summoner!]) {
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (e) => {
      if (e.type() === 'error') errors.push(e.text());
    });
  }
  try {
    await joinWaiting(sword!, 'QA Kinh Lôi');
    const roomId = await sword!.evaluate(
      () => (window as any).__VOLAM__.snapshot().roomId,
    );
    await joinWaiting(trapper!, 'QA Bẫy', roomId);
    await joinWaiting(summoner!, 'QA Triệu Hồi', roomId);
    await startAuditTogether([
      [sword!, conLuan.school, conLuan.sword],
      [trapper!, duongMon.school, duongMon.amKhi],
      [summoner!, nguDoc.school, nguDoc.coSu],
    ]);
    const learned = await ensureQaSkillLearned(sword!, 0, conLuan.detonate);
    const kinh = await ensureQaKinhLoi(sword!);
    expect(kinh.areaIds.length).toBeGreaterThan(0);
    const detonate = await castQaSkill(sword!, 'q', conLuan.detonate);
    await observeQa(
      sword!,
      ({ ids }) => {
        const s = (window as any).__VOLAM__.snapshot();
        return ids.every((id: string) => !s.state.areas[id]);
      },
      { ids: kinh.areaIds },
    );
    const privateArea = await placeQaOwnerOnlyArea(
      trapper!,
      [sword!, summoner!],
      { key: 'q', abilityId: duongMon.trap },
    );
    const summoned = await castQaSkill(summoner!, 't', nguDoc.reaper);
    const summonId = await observeQa(
      summoner!,
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          Object.entries(s.state.creeps).find(
            ([, a]: [string, any]) =>
              a.ownerId === s.sessionId && a.archetypeId === 'ngu_doc_reaper',
          )?.[0] ?? false
        );
      },
      undefined,
    );
    const before = await captureQaSummon(summoner!, summonId as string);
    await summoner!
      .getByRole('button', { name: 'Phó Bản', exact: true })
      .click();
    await summoner!.locator('[data-destination=forest]').click();
    await summoner!.locator('#enter-dungeon').click();
    const after = await waitQaSummonTransfer(summoner!, before, {
      zonePattern: '^forest_',
      texture: 'ngu-doc-minions',
      peers: [trapper!, sword!],
    });
    expect(after.summonId).toBe(before.summonId);
    expect(errors).toEqual([]);
    await summoner!.screenshot({
      path: info.outputPath('summon-destination.png'),
    });
    writeFileSync(
      info.outputPath('skill-observations.json'),
      JSON.stringify(
        {
          roomId,
          learned,
          kinh,
          detonate,
          privateArea,
          summoned,
          before,
          after,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test('skill helpers reject stale receipts, zero charges and stale peer absence', async ({
  page,
  browser,
}) => {
  await page.setContent(
    '<div id="scene-status" data-ready="true"></div><div id="game"><canvas tabindex="0"></canvas></div>',
  );
  await page.evaluate(() => {
    const s: any = {
      roomId: 'room',
      sessionId: 'owner',
      state: {
        phase: 'IN_GAME',
        tick: 1,
        players: {
          owner: {
            hp: 100,
            confirmed: true,
            pose: 'idle',
            basicId: 'con_luan_kiem_ton',
            lastSequence: 1,
            zoneId: 'arena',
            build: { charges: { kinh_loi: { count: 0 } } },
          },
        },
        areas: {},
        creeps: {},
      },
      events: [
        { id: 1, tick: 1, sourceId: 'owner', kind: 'cast', abilityId: 'old' },
      ],
    };
    (window as any).__VOLAM__ = { snapshot: () => structuredClone(s) };
    (window as any).state = s;
    document.addEventListener('keydown', () => {
      s.state.players.owner.lastSequence++;
    });
  });
  await expect(ensureQaKinhLoi(page)).rejects.toThrow(
    'no authoritative charge',
  );
  await expect(castQaSkill(page, 'q', 'old', { timeout: 150 })).rejects.toThrow(
    'fresh cast old',
  );
  await page.evaluate(() => {
    const h = (window as any).state.state.players.owner;
    Object.assign(h.build, {
      slotSkills: ['old'],
      ranks: {},
      revision: 0,
      available: 0,
    });
  });
  await expect(ensureQaSkillLearned(page, 0, 'old')).rejects.toThrow(
    'no authoritative skill point',
  );
  await page.evaluate(() => {
    const s = (window as any).state;
    s.state.players.owner.build.available = 1;
    const button = document.createElement('button');
    button.dataset.rankSlot = '0';
    button.textContent = 'Learn';
    button.onclick = () => {
      setTimeout(() => {
        Object.assign(s.state.players.owner.build, {
          ranks: { old: 1 },
          revision: 1,
          available: 0,
        });
      }, 100);
    };
    document.body.append(button);
  });
  expect(await ensureQaSkillLearned(page, 0, 'old')).toMatchObject({
    rank: 1,
    revision: 1,
    points: 0,
  });
  expect(await ensureQaSkillLearned(page, 0, 'old')).toMatchObject({
    rank: 1,
    revision: 1,
    points: 0,
  });
  const context = await browser.newContext();
  const peer = await context.newPage();
  try {
    await peer.setContent('<div id="scene-status" data-ready="true"></div>');
    await peer.evaluate(() => {
      (window as any).__VOLAM__ = {
        snapshot: () => ({
          roomId: 'room',
          sessionId: 'peer',
          state: {
            phase: 'IN_GAME',
            tick: 1,
            players: { peer: { confirmed: true, zoneId: 'arena' } },
            areas: {},
          },
          events: [],
        }),
      };
    });
    await page.evaluate(() => {
      document.addEventListener('keydown', () => {
        const s = (window as any).state;
        s.events.push({
          id: 2,
          tick: 2,
          sourceId: 'owner',
          kind: 'cast',
          abilityId: 'trap',
        });
        s.state.areas.trap = {
          abilityId: 'trap',
          ownerId: 'owner',
          zoneId: 'arena',
        };
      });
    });
    await expect(
      placeQaOwnerOnlyArea(page, [peer], {
        key: 'q',
        abilityId: 'trap',
        absenceMilliseconds: 120,
      }),
    ).rejects.toThrow('did not advance');
  } finally {
    await context.close();
  }
});
