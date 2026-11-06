import { NamDeHud } from './nam-de-hud.js';
import { ChuHud } from './chu-hud.js';
import './chu-hud.css';
import Phaser from 'phaser';
import { connectionReason } from './connection-copy.js';
import { Client, type Room } from '@colyseus/sdk';
import type { MatchRoom } from '../../game-server/src/rooms/MatchRoom.js';
import { lobbyConfig, dungeonForZone } from '@volam/game-data';
import type { Command, CombatEvent } from '@volam/game-core';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  joinOptionsSchema,
  connectionAckSchema,
  combatEventSchema,
  rejectionSchema,
  merchantResultSchema,
  type InputMessage,
  type DungeonAction,
} from '@volam/game-protocol';
import { ArenaScene } from './arena-scene.js';
import { ArtPreviewScene } from './art-preview.js';
import { ThienSonSkillPreviewScene } from './thien-son-skill-preview.js';
import { AnimationReviewScene } from './animation-review.js';
import { bindGameplayInput } from './input.js';
import { GameUI, element } from './ui.js';
import { SkillPreview } from './skill-preview.js';
import { ForestStudyScene } from './forest-study.js';
import './style.css';
import './arena-hud.css';
import './dungeon.css';
import './dungeon-selector.css';
import './boss-party-ui.css';
import './defense-hud.css';
import './item-menu.css';
import { PreGame } from './pregame.js';
import { CreepPreview, creepPreviewRequested } from './creep-preview.js';
import gameOstUrl from '../../../assets/sounds/game-ost.mp3?url';

const artPreview = new URLSearchParams(location.search).has('artPreview');
const runtimeArtGallery =
  new URLSearchParams(location.search).has('debug') &&
  new URLSearchParams(location.search).get('runtimeArtReview') === '1' &&
  new URLSearchParams(location.search).get('artGallery') === '1';
const animationReview =
  artPreview &&
  new URLSearchParams(location.search).get('animationReview') === '1';
const thienSonSkillReview =
  artPreview &&
  new URLSearchParams(location.search).get('thienSonSkills') === '1';
const thieuLamReview = new URLSearchParams(location.search).has(
  'thieuLamReview',
);
const ui = new GameUI(artPreview);
const namDeHud = new NamDeHud();
const chuHud = new ChuHud((action, id, itemId) => {
  if (itemId && (action === 'sell' || action === 'drop'))
    room?.send('boss-item-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: ++sequence,
      index: id,
      itemId: itemId === 'kim_luan_tan_phien' ? itemId : 'toan_chan_tien_tuu',
      action,
    });
  else if (action === 'roll' || action === 'pass' || action === 'pickup')
    room?.send('boss-loot-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: ++sequence,
      lootId: id,
      action,
    });
});
chuHud.onNotify = (message) => ui.notify(message);
const endpoint = import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:2567';
const pregame = new PreGame(endpoint);
if (artPreview) pregame.node.hidden = true;
const matchMusic = artPreview ? undefined : new Audio(gameOstUrl);
if (matchMusic) {
  matchMusic.id = 'match-music';
  matchMusic.loop = true;
  matchMusic.volume = 0.45;
  document.body.append(matchMusic);
}
let matchMusicActive = false;
function playMatchMusic(): void {
  if (matchMusicActive && matchMusic?.paused)
    void matchMusic.play().catch(() => {
      // If autoplay is blocked, retry on the next in-game gesture.
    });
}
function syncMatchMusic(active: boolean): void {
  if (!matchMusic || active === matchMusicActive) return;
  matchMusicActive = active;
  if (active) {
    window.addEventListener('click', playMatchMusic, true);
    window.addEventListener('keydown', playMatchMusic, true);
    playMatchMusic();
  } else {
    window.removeEventListener('click', playMatchMusic, true);
    window.removeEventListener('keydown', playMatchMusic, true);
    matchMusic.pause();
    matchMusic.currentTime = 0;
  }
}
const arenaScene = new ArenaScene();
const gallery = new ArtPreviewScene();
const thienSonSkillGallery = new ThienSonSkillPreviewScene();
const animationReviewGallery = new AnimationReviewScene();
const study = new ForestStudyScene();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  backgroundColor: '#304b37',
  render: {
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
  },
  scale: { mode: Phaser.Scale.NONE, zoom: 1 },
  scene: animationReview
    ? [animationReviewGallery]
    : thienSonSkillReview
      ? [thienSonSkillGallery]
      : artPreview
        ? [gallery]
        : [arenaScene, study],
  input: { keyboard: false, mouse: true, touch: false },
  audio: { noAudio: true },
});
// A fixed integer display scale preserves square pixels. Resize the world view,
// rather than reserving page space for HUD or stretching a fixed aspect ratio.
let reviewScaleOverride: number | undefined;
const fit = (): void => {
  if (!game.isBooted) return;
  const host = element('#game');
  const zoom = runtimeArtGallery
    ? 1
    : animationReview
      ? (reviewScaleOverride ??
        (host.clientWidth >= 960 && host.clientHeight >= 600 ? 2 : 1))
      : artPreview
        ? 2
        : host.clientWidth >= 960 && host.clientHeight >= 600
          ? 2
          : 1;
  game.scale.resize(
    thienSonSkillReview || animationReview
      ? Math.ceil(host.clientWidth / zoom)
      : artPreview
        ? thieuLamReview
          ? 640
          : 480
        : Math.ceil(host.clientWidth / zoom),
    thienSonSkillReview || animationReview
      ? Math.ceil(host.clientHeight / zoom)
      : artPreview
        ? 520
        : Math.ceil(host.clientHeight / zoom),
  );
  // NONE-mode resize at zoom 1 retains the previous CSS dimensions in Phaser
  // 4.2.1. Apply zoom after the new base size so CSS size and input bounds agree.
  game.scale.setZoom(zoom);
  if (animationReview) animationReviewGallery.setDisplayScale(zoom);
};
animationReviewGallery.onDisplayScale = (zoom) => {
  reviewScaleOverride = zoom;
  fit();
};
game.events.once(Phaser.Core.Events.READY, fit);
const observer = new ResizeObserver(fit);
observer.observe(element('#game'));
fit();
arenaScene.onNpc = (menu) => {
  if (room && !ui.blocked) {
    ui.open(menu);
  }
};
ui.onStudy = (enabled) => {
  if (artPreview || !game.isBooted) return;
  if (enabled) {
    game.scene.sleep('Arena');
    game.scene.start('ForestStudy');
  } else if (game.scene.isActive('ForestStudy')) {
    game.scene.stop('ForestStudy');
    game.scene.wake('Arena');
  }
};
const client = new Client(
  import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:2567',
);
let room: Room<MatchRoom> | undefined;
let sequence = 0;
const events: CombatEvent[] = [];
const skillPreview = new SkillPreview(
  element('#viewport'),
  (ids) => send({ kind: 'dev-loadout', ids }),
  () => send({ kind: 'cast', slot: 0 }),
  send,
  (action) => room?.send('skill-preview-action', { action }),
);
const creepPreview = new CreepPreview(element('#viewport'), (action) =>
  room?.send('creep-preview-action', { ...action, sequence: ++sequence }),
);
const form = element<HTMLFormElement>('#join-form');
const status = element('#status');
function dungeonAction(
  action:
    | { action: 'open' | 'exit' | 'summon-help' | 'interact' }
    | { action: 'reply-invitation'; invitationId: number; accept: boolean }
    | {
        action: 'enter';
        access: 'private' | 'shared';
        destination:
          | 'forest'
          | 'desert'
          | 'sea'
          | 'hell'
          | 'chu_ba_thong'
          | 'hong_liet'
          | 'kim_luan'
          | 'co_mo';
      },
): void {
  if (
    !room ||
    ui.reconnecting ||
    room.state.phase !== 'IN_GAME' ||
    !room.state.players.get(room.sessionId)?.confirmed
  )
    return;
  room.send('dungeon-action', {
    ...action,
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++sequence,
  } satisfies DungeonAction);
}
function send(command: Command): void {
  if (
    !room ||
    ui.reconnecting ||
    room.state.phase !== 'IN_GAME' ||
    !room.state.players.get(room.sessionId)?.confirmed ||
    artPreview
  )
    return;
  const payload = {
    ...command,
    sequence: ++sequence,
    protocolVersion: PROTOCOL_VERSION,
  } as InputMessage;
  room.send('input', payload);
}
const unbindInput = bindGameplayInput(
  send,
  () =>
    !!room &&
    room.state.phase === 'IN_GAME' &&
    !!room.state.players.get(room.sessionId)?.confirmed &&
    !artPreview,
  () =>
    ui.blocked ||
    ((room?.state?.players?.get(room.sessionId)?.hp ?? 0) <= 0 &&
      !room?.state?.players?.get(room.sessionId)?.bossSpectator),
  () => {
    const hero = room?.state.players.get(room.sessionId);
    if (
      !hero ||
      hero.zoneId === 'arena' ||
      (hero.hp <= 0 && !hero.bossSpectator)
    )
      return;
    const d = dungeonForZone(hero.zoneId);
    if (
      hero.bossSpectator ||
      Math.hypot(hero.x - d.exit.x, hero.y - d.exit.y) <= d.exitRange
    )
      dungeonAction({ action: 'exit' });
    else if (d.id === 'chu_ba_thong') dungeonAction({ action: 'interact' });
  },
  (resource) => ui.usePotion(resource),
  {
    active: () => !!room?.state?.players?.get(room.sessionId)?.bossSpectator,
    pan: (x, y) => arenaScene.panSpectator(x, y),
  },
  (key) => namDeHud.capture(key),
  () => {
    const hero = room?.state.players.get(room.sessionId);
    if (hero?.build.mode === 'fixed' && hero.basicId === 'thieu_lam_quyen')
      ui.onBuild({ action: 'stance' });
  },
);
function controls(connected: boolean, busy = false): void {
  for (const field of form.querySelectorAll<
    HTMLInputElement | HTMLButtonElement
  >('input,button'))
    field.disabled = connected || busy;
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  void connect(event.submitter?.id === 'join');
});
async function connect(existing: boolean): Promise<void> {
  if (room) return;
  const parsed = joinOptionsSchema.safeParse({
    nickname: element<HTMLInputElement>('#nickname').value,
    protocolVersion: PROTOCOL_VERSION,
  });
  const roomId = element<HTMLInputElement>('#room-id').value.trim();
  if (!parsed.success) {
    status.textContent = `Biệt danh cần từ 1–${lobbyConfig.nicknameMaxLength} ký tự chữ, số hoặc dấu câu đơn giản.`;
    pregame.fail(status.textContent);
    return;
  }
  if (existing && !roomId) {
    status.textContent = 'Hãy nhập mã phòng để tham gia.';
    return;
  }
  controls(false, true);
  status.textContent = 'Đang kết nối…';
  try {
    const joined = existing
      ? await client.joinById<MatchRoom>(roomId, parsed.data)
      : await client.create<MatchRoom>(MATCH_ROOM, {
          ...parsed.data,
          portalCount: pregame.portalCount,
          creepPreview: creepPreviewRequested,
        });
    joined.reconnection.enabled = true;
    room = joined;
    sequence = 0;
    events.length = 0;
    status.textContent = 'Connected';
    ui.connected(joined.roomId, joined.sessionId);
    controls(true);
    let previousZone = 'arena';
    const syncJoinedState = (state: typeof joined.state) => {
      if (room === joined) {
        syncMatchMusic(state.phase === 'IN_GAME');
        chuHud.sync(state, joined.sessionId);
        namDeHud.sync(state, joined.sessionId);
        const zone = state.players.get(joined.sessionId)?.zoneId ?? 'arena';
        if (zone !== previousZone) {
          previousZone = zone;
          window.dispatchEvent(new Event('volam:controls-blocked'));
          ui.close();
        }
        pregame.update(state, joined.roomId, joined.sessionId);
        arenaScene.setSnapshot(
          state.phase === 'IN_GAME' || state.phase === 'DEFEAT'
            ? state
            : undefined,
          joined.sessionId,
        );
        ui.refresh(state);
        skillPreview.update(state, joined.sessionId);
        creepPreview.update(state, joined.sessionId);
      }
    };
    joined.onStateChange(syncJoinedState);
    // The SDK may already have decoded the initial snapshot before this callback is attached.
    if (joined.state?.hostId) syncJoinedState(joined.state);
    joined.onMessage('dungeon-menu', () => {
      if (room === joined) ui.open('dungeons');
    });
    joined.onMessage('connection-ack', (payload: unknown) => {
      const ack = connectionAckSchema.safeParse(payload);
      ui.acknowledge(
        ack.success
          ? `Server đã nhận kiểm tra #${ack.data.sequence}. Tổng: ${ack.data.checks}.`
          : 'Phản hồi server không tương thích.',
      );
    });
    joined.onMessage('combat-event', (payload: unknown) => {
      const parsedEvent = combatEventSchema.safeParse(payload);
      if (
        !parsedEvent.success ||
        parsedEvent.data.zoneId !==
          joined.state.players.get(joined.sessionId)?.zoneId
      )
        return;
      events.push(parsedEvent.data);
      if (events.length > 60) events.shift();
      arenaScene.combat(parsedEvent.data);
    });
    joined.onMessage('command-rejected', (payload: unknown) => {
      const rejected = rejectionSchema.safeParse(payload);
      if (rejected.success) {
        ui.resolveMerchant();
        ui.notify(rejected.data.reason);
        pregame.fail(rejected.data.reason);
      }
    });
    joined.onMessage('merchant-result', (payload: unknown) => {
      const result = merchantResultSchema.safeParse(payload);
      if (result.success && room === joined) {
        ui.resolveMerchant();
        ui.notify(result.data.message);
      }
    });
    joined.onError((code, message) => {
      status.textContent = `Lỗi kết nối ${code}: ${connectionReason(message ?? '')}`;
      pregame.fail(status.textContent);
      element('#hud-connection').textContent = `Lỗi ${code}`;
      ui.notify(status.textContent);
    });
    joined.onDrop(() => {
      if (room !== joined) return;
      creepPreview.hide();
      namDeHud.sync(undefined, '');
      ui.reconnecting = true;
      window.dispatchEvent(new Event('volam:controls-blocked'));
      arenaScene.setSnapshot(undefined);
      ui.notify('Mất kết nối · Đang kết nối lại…');
    });
    joined.onReconnect(() => {
      if (room !== joined) return;
      ui.reconnecting = false;
      ui.notify('Đã kết nối lại · Trở về đấu trường chính.');
    });
    joined.onLeave((code) => {
      if (room !== joined) return;
      syncMatchMusic(false);
      chuHud.sync(undefined, '');
      namDeHud.sync(undefined, '');
      room = undefined;
      pregame.disconnected(
        `Mất kết nối (${code}). Hãy tạo hoặc vào phòng để trở lại.`,
      );
      arenaScene.setSnapshot(undefined);
      controls(false);
      ui.connected('', '');
      skillPreview.hide();
      creepPreview.hide();
      status.textContent = `Mất kết nối (${code}). Hãy tạo hoặc vào phòng để trở lại.`;
    });
    if (joined.state?.players && joined.state.phase) {
      syncMatchMusic(joined.state.phase === 'IN_GAME');
      pregame.update(joined.state, joined.roomId, joined.sessionId);
      arenaScene.setSnapshot(
        joined.state.phase === 'IN_GAME' || joined.state.phase === 'DEFEAT'
          ? joined.state
          : undefined,
        joined.sessionId,
      );
      ui.refresh(joined.state);
      skillPreview.update(joined.state, joined.sessionId);
      creepPreview.update(joined.state, joined.sessionId);
    }
    const canvas = element<HTMLCanvasElement>('#game canvas');
    canvas.tabIndex = 0;
    canvas.focus();
  } catch (error: unknown) {
    status.textContent = `Không thể kết nối: ${connectionReason(error instanceof Error ? error.message : '')}`;
    controls(false);
    pregame.fail(status.textContent ?? 'Kết nối thất bại');
  }
}
pregame.onConnect = (nickname, id) => {
  element<HTMLInputElement>('#nickname').value = nickname;
  element<HTMLInputElement>('#room-id').value = id ?? '';
  void connect(!!id);
};
pregame.onAction = (action) => room?.send('lobby-action', action);
pregame.onLeave = () => void room?.leave();
ui.onBuild = (change) => {
  const hero = room?.state.players.get(room.sessionId);
  if (!room || !hero?.build.enabled || room.state.phase !== 'IN_GAME') return;
  room.send('build-action', {
    ...change,
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++sequence,
    revision: hero.build.revision,
  });
};
ui.onMerchant = (action) => {
  const hero = room?.state.players.get(room.sessionId);
  if (!room || !hero || room.state.phase !== 'IN_GAME') return;
  room.send('merchant-action', {
    ...action,
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++sequence,
    revision: hero.inventory.revision,
  });
};
ui.onCheck = () =>
  room?.send('connection-check', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++sequence,
  });
ui.onLeave = () => {
  void room?.leave();
};
ui.onBasic = (id) => send({ kind: 'select-basic', id });
ui.onLoadout = (ids) => send({ kind: 'dev-loadout', ids });
window.addEventListener('click', () => chuHud.inventory());
ui.onDungeonEnter = (access, destination) =>
  dungeonAction({ action: 'enter', access, destination });
ui.bossParty.onSummon = () => dungeonAction({ action: 'summon-help' });
ui.bossParty.onReply = (invitationId, accept) =>
  dungeonAction({ action: 'reply-invitation', invitationId, accept });
// Explicit evidence and presentation review only; no authoritative mutation bridge.
if (new URLSearchParams(location.search).has('debug') || artPreview) {
  Object.defineProperty(window, '__VOLAM__', {
    configurable: true,
    value: Object.freeze({
      ...(new URLSearchParams(location.search).get('visualReview') === '1'
        ? {
            reviewVisualStyle: (polished: boolean) =>
              arenaScene.reviewVisualStyle(polished),
          }
        : {}),
      ...(import.meta.env.VITE_KIM_FRAME_TEST
        ? {
            reviewKim: (bundle: string, clip: string) =>
              arenaScene.reviewKim(bundle, clip),
          }
        : {}),
      reviewChu: (
        bundle: string,
        tag: string,
        x: number,
        y: number,
        ms: number,
      ) => arenaScene.reviewChu(bundle, tag, x, y, ms),
      snapshot: () => ({
        sessionId: room?.sessionId,
        roomId: room?.roomId,
        state: room?.state?.toJSON(),
        events: events.map((event) => ({ ...event })),
      }),
      // Read-only evidence hook: capture after the GPU has drawn the inspected
      // frame, rather than pairing a new pose with the previous canvas buffer.
      afterRender: (inspect: () => void) => {
        game.events.once(Phaser.Core.Events.POST_RENDER, inspect);
      },
      ...(runtimeArtGallery
        ? {
            // Explicit standalone QA surface: use the existing validated client
            // commands and lobby actions; never submit damage or positions.
            galleryStart: async () => {
              if (room) return;
              element<HTMLInputElement>('#nickname').value = 'ArtworkReview';
              await connect(false);
              const wait = async (ready: () => boolean) => {
                const deadline = performance.now() + 20000;
                while (!ready()) {
                  if (performance.now() > deadline)
                    throw Error('Không khởi động được preview');
                  await new Promise((resolve) => setTimeout(resolve, 50));
                }
              };
              await wait(() => room?.state.phase === 'WAITING_LOBBY');
              pregame.onAction({ action: 'start' });
              await wait(
                () =>
                  room?.state.phase === 'SCHOOL_SELECTION' ||
                  room?.state.phase === 'IN_GAME',
              );
              pregame.onAction({ action: 'select', schoolId: 'cai_bang' });
              await wait(
                () =>
                  room?.state.players.get(room.sessionId)?.schoolId ===
                  'cai_bang',
              );
              pregame.onAction({ action: 'branch', basicId: 'cai_bang_bong' });
              await wait(
                () =>
                  room?.state.players.get(room.sessionId)?.selectedBranch ===
                  'cai_bang_bong',
              );
              pregame.onAction({ action: 'confirm' });
              await wait(
                () =>
                  room?.state.phase === 'IN_GAME' &&
                  !!room.state.players.get(room.sessionId)?.confirmed,
              );
            },
            galleryCast: (active: boolean, slot = 0) =>
              send(active ? { kind: 'cast', slot } : { kind: 'basic' }),
            galleryClearEffects: () => arenaScene.reviewClearTransientEffects(),
          }
        : {}),
      progressionPresentation: () => arenaScene.inspectProgression(),
      presentation: () =>
        animationReview
          ? animationReviewGallery.inspect()
          : thienSonSkillReview
            ? thienSonSkillGallery.inspect()
            : artPreview
              ? gallery.inspect()
              : arenaScene.inspect(),
      ...(new URLSearchParams(location.search).get('feedbackArtReview') === '1'
        ? {
            // Explicit presentation-only renderer fixture: no command or state mutation.
            reviewFeedback: (
              asset: string,
              tag: string,
              x: number,
              y: number,
            ) => arenaScene.reviewFeedback(asset, tag, x, y),
          }
        : {}),
    }),
  });
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    syncMatchMusic(false);
    matchMusic?.remove();
    void room?.leave();
    unbindInput();
    pregame.destroy();
    creepPreview.destroy();
    ui.destroy();
    skillPreview.destroy();
    observer.disconnect();
    game.destroy(true);
  });
