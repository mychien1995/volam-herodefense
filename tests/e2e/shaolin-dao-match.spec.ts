import { expect, test, type Page } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import { qaSession } from '../../tools/qa-session.mjs';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { monitor, read } from './m3c1-helpers.js';

interface DaoPresentation {
  actors: { id: string; texture: string; frame: string; depth: number }[];
  shaolinDao: {
    effects: {
      owner: string;
      frame: string;
      x: number;
      depth: number;
      scale: number;
    }[];
    lotusRings: { depth: number }[];
  };
}

const inspect = (page: Page) =>
  page.evaluate<DaoPresentation>('window.__VOLAM__.presentation()');

test('Tru Tà matches the rendered reach in a normal six-player M3D room', async ({
  page: a,
  browser,
}, info) => {
  const b = await browser.newPage();
  const errors = [monitor(a), monitor(b)];
  await joinWaiting(a, 'Dao Reach QA', undefined, '/?debug=1', 45_000);
  const { roomId, sessionId } = await read(a);
  await joinWaiting(b, 'Dao Reach Observer', roomId, '/?debug=1', 45_000);
  const client = new Client(qaSession().serverUrl);
  const peers = await Promise.all(
    ['Bổng', 'Chưởng', 'Phiến', 'Quyền'].map((nickname) =>
      client.joinById<LobbyState>(roomId, {
        protocolVersion: PROTOCOL_VERSION,
        nickname,
      }),
    ),
  );
  try {
    peers.forEach((peer) => peer.onMessage('combat-event', () => {}));
    await expect(a.locator('#pregame .pre-players li')).toHaveCount(6);
    await a.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    const branches = [
      ['cai_bang', 'cai_bang_bong'],
      ['cai_bang', 'cai_bang_chuong'],
      ['thien_son', 'thien_son_phien'],
      ['thieu_lam', 'thieu_lam_quyen'],
    ] as const;
    await Promise.all(
      peers.map(async (peer, index) => {
        const [schoolId, basicId] = branches[index]!;
        await expect.poll(() => peer.state.phase).toBe('SCHOOL_SELECTION');
        peer.send('lobby-action', { action: 'select', schoolId });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.schoolId)
          .toBe(schoolId);
        peer.send('lobby-action', { action: 'branch', basicId });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.selectedBranch)
          .toBe(basicId);
        peer.send('lobby-action', { action: 'confirm' });
      }),
    );
    await startTogether(
      [a, b],
      ['thieu_lam_dao', 'vo_dang_kiem'],
      45_000,
      true,
    );
    await expect(a.locator('#skill-preview')).toBeHidden();
    await expect
      .poll(async () => (await read(a)).state.creeps.tru_ta_edge?.hp)
      .toBe(20_000);
    await expect
      .poll(
        async () =>
          (await inspect(b)).actors.find((h) => h.id === sessionId)?.frame,
      )
      .toBe('idle_right');
    await a.locator('#slot-q button').click();
    await expect
      .poll(async () => (await read(a)).state.players[sessionId]?.qSkill)
      .toBe('tru_ta');
    const snapshot = await read(a);
    const caster = snapshot.state.players[sessionId]!;
    const cast = async (key: string) => {
      await a.locator('#game canvas').focus();
      await a.keyboard.press(key);
    };
    const verifyBoth = async (predicate: (view: DaoPresentation) => boolean) =>
      Promise.all(
        [a, b].map((page) =>
          expect
            .poll(async () => predicate(await inspect(page)), {
              intervals: [25, 35],
            })
            .toBe(true),
        ),
      );
    await Promise.all([
      verifyBoth((view) => {
        const actor = view.actors.find((h) => h.id === sessionId);
        const arhat = view.shaolinDao.effects.find(
          (e) => e.owner === sessionId && e.frame === 'arhat',
        );
        const sweep = view.shaolinDao.effects.find(
          (e) => e.owner === sessionId && e.frame === 'sweep',
        );
        return (
          !!actor &&
          !!arhat &&
          !!sweep &&
          arhat.depth < actor.depth &&
          Math.abs(sweep.x + 84.5 * sweep.scale - caster.x - 190) < 0.01
        );
      }),
      cast('KeyQ'),
    ]);
    await a.screenshot({ path: info.outputPath('six-player-tru-ta.png') });
    await expect
      .poll(async () =>
        (await read(b)).events
          .filter(
            (event) =>
              event.kind === 'hit' &&
              event.sourceId === sessionId &&
              event.abilityId === 'tru_ta',
          )
          .map((event) => event.targetId),
      )
      .toEqual(['tru_ta_edge']);
    await expect
      .poll(() =>
        peers.every(
          (peer) =>
            (peer.state.creeps.get('tru_ta_edge')?.hp ?? 20_000) < 20_000 &&
            peer.state.creeps.get('tru_ta_outside')?.hp === 20_000,
        ),
      )
      .toBe(true);

    await Promise.all([
      verifyBoth((view) =>
        view.shaolinDao.effects.some(
          (e) => e.owner === sessionId && e.frame === 'crescent',
        ),
      ),
      cast('KeyA'),
    ]);
    await a.locator('#slot-t button').click();
    await expect
      .poll(() =>
        a.evaluate((id) => {
          const s = (window as any).__VOLAM__.snapshot();
          return s.state.players[id]?.tSkill;
        }, sessionId),
      )
      .toBe('nhu_lai_thien_diep');
    await Promise.all([
      verifyBoth(
        (view) =>
          view.actors.some(
            (h) => h.id === sessionId && h.frame === 'lotus_right',
          ) && view.shaolinDao.lotusRings.length === 1,
      ),
      cast('KeyT'),
    ]);
    await a.screenshot({ path: info.outputPath('six-player-dao-lotus.png') });
    expect(errors.flat()).toEqual([]);
  } finally {
    await Promise.all(peers.map((peer) => peer.leave()));
    await b.close();
  }
});
