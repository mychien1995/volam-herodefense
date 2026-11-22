import { PvpUI, readPvp } from './pvp-ui.js';
import { PracticeUI } from './practice-ui.js';
import type { PracticeRoom } from '../../game-server/src/rooms/PracticeRoom.js';
import { PRACTICE_ROOM, type PracticeJoinOptions, type PracticeSelection } from '@volam/game-protocol';
import type { PvpMapId } from '@volam/game-core';
import type { StandaloneLoiDaiRoom } from '../../game-server/src/rooms/StandaloneLoiDaiRoom.js';
import { NamDeHud } from './nam-de-hud.js';
import { TamLienHud } from './tam-lien-hud.js';
import { ChuHud } from './chu-hud.js';
import { isBossDestination } from './boss-party-ui.js';
import './chu-hud.css';
import type Phaser from 'phaser';
import { connectionReason } from './connection-copy.js';
import { Client, type Room } from '@colyseus/sdk';
import type { MatchRoom } from '../../game-server/src/rooms/MatchRoom.js';
import { lobbyConfig, dungeonForZone } from '@volam/game-data';
import { loiDai, type Command, type CombatEvent } from '@volam/game-core';
import {
  MATCH_ROOM,
  PVP_ROOM,
  PROTOCOL_VERSION,
  joinOptionsSchema,
  connectionAckSchema,
  combatEventSchema,
  rejectionSchema,
  merchantResultSchema,
  type InputMessage,
  type DungeonAction,
} from '@volam/game-protocol';
import type { ArenaScene } from './arena-scene.js';
import type { DeferredArtPack } from './art.js';
import type { ArtPreviewScene } from './art-preview.js';
import type { ThienSonSkillPreviewScene } from './thien-son-skill-preview.js';
import type { AnimationReviewScene } from './animation-review.js';
import { bindGameplayInput } from './input.js';
import { InputTiming } from './input-timing.js';
import { GameUI, element } from './ui.js';
import { SkillPreview } from './skill-preview.js';
import './style.css';
import './arena-hud.css';
import './ui-components.css';
import './dungeon.css';
import './dungeon-selector.css';
import './boss-party-ui.css';
import './boss-retry-ui.css';
import './defense-hud.css';
import './item-menu.css';
import { PreGame } from './pregame.js';
import { preferences, type Preferences } from './preferences.js';
import { playSkillSound, refreshSkillSoundVolumes } from './skill-sounds.js';
import { CreepPreview, creepPreviewRequested } from './creep-preview.js';
import gameOstUrl from '../../../assets/sounds/game-ost.mp3?url';
import gameOst2Url from '../../../assets/sounds/game-ost-2.mp3?url';
import gameOst3Url from '../../../assets/sounds/game-ost-3.mp3?url';

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
ui.onBossRetry = (action) => {
  if (room && !ui.reconnecting && room.state.phase === 'IN_GAME')
    room.send('boss-retry-action', {
      ...action,
      sequence: ++sequence,
      protocolVersion: PROTOCOL_VERSION,
    });
};
const namDeHud = new NamDeHud();
const tamLienHud = new TamLienHud();
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
const pvpUi = new PvpUI();
const practiceUi = new PracticeUI();
let requestedPractice: Pick<PracticeJoinOptions,'schoolId'|'branchId'>|undefined;
pregame.onPractice=()=>{requestedPvp=false;pvpUi.clear();pregame.node.hidden=true;practiceUi.open(pregame.nickname);};
practiceUi.onBack=()=>{requestedPractice=undefined;practiceUi.clear();pregame.openHome();};
ui.onPracticeEscape=()=>practiceUi.escape();
ui.onPracticeChange=()=>{
 if(!room?.state.practice.enabled || ui.reconnecting)return;
 ui.close();
 practiceUi.openChange();
 window.dispatchEvent(new Event('volam:controls-blocked'));
};
practiceUi.onChange=({schoolId,branchId})=>{
 if(!room?.state.practice.enabled)return;
 const selection={protocolVersion:PROTOCOL_VERSION,sequence:++sequence,schoolId,branchId} satisfies PracticeSelection;
 practiceUi.pending(selection.sequence);
 (room as unknown as Room<PracticeRoom>).send('practice-select',selection);
};
practiceUi.onConnect=({nickname,schoolId,branchId})=>{
 requestedPractice={schoolId,branchId};requestedPvp=false;
 element<HTMLInputElement>('#nickname').value=nickname;void connect(false);
};
let requestedPvp = false;
let requestedPvpMap: PvpMapId = 'hong_moc';
pregame.onLoiDai = () => { pregame.node.hidden=true;pvpUi.openEntry(pregame.nickname); };
pvpUi.onBack = () => {requestedPvp=false;pvpUi.clear();pregame.openHome();};
pvpUi.onLeave = () => void room?.leave();
pvpUi.onConnect = (nickname,mapId,id) => {
 requestedPractice=undefined;practiceUi.clear();requestedPvp=true;requestedPvpMap=mapId;
 element<HTMLInputElement>('#nickname').value=nickname;
 element<HTMLInputElement>('#room-id').value=id??'';
 void connect(!!id);
};
pvpUi.onAction = action => {if(room?.state.pvp.enabled)room.send('pvp-action',{...action,protocolVersion:PROTOCOL_VERSION,sequence:++sequence});};
ui.onPvpHistory = () => pvpUi.toggleHistory();
ui.onPvpEscape = () => pvpUi.closeOverlay();
const sharedPvpId=new URLSearchParams(location.search).get('pvp');
if(sharedPvpId&&!artPreview){requestedPvp=true;pregame.node.hidden=true;pvpUi.openEntry(pregame.nickname,sharedPvpId);}
if (artPreview) pregame.node.hidden = true;
const matchTracks = [gameOstUrl, gameOst2Url, gameOst3Url];
const matchMusic = artPreview ? undefined : new Audio();
if (matchMusic) {
  matchMusic.preload = 'none';
  matchMusic.id = 'match-music';
  matchMusic.volume = preferences.musicVolume / 100;
  document.body.append(matchMusic);
}
function applySettings(key?: keyof Preferences): void {
  if (matchMusic) matchMusic.volume = preferences.musicVolume / 100;
  if (key === 'volume' && arenaScene?.presentationReady) refreshSkillSoundVolumes(arenaScene);
  element('#viewport').toggleAttribute(
    'data-mouse-controls',
    preferences.controls === 'mouse',
  );
  if (key === 'controls')
    window.dispatchEvent(new Event('volam:controls-blocked'));
  if (key === 'autoBasic')
    send({ kind: 'auto-basic', enabled: preferences.autoBasic });
}
pregame.onSettings = ui.onSettings = applySettings;
applySettings();
let matchMusicActive = false;
let lastMatchTrack: string | undefined;
let remainingMatchTracks: string[] = [];
function playMatchMusic(): void {
  if (matchMusicActive && matchMusic?.paused)
    void matchMusic.play().catch(() => {
      // If autoplay is blocked, retry on the next in-game gesture.
    });
}
function playNextMatchTrack(): void {
  if (!matchMusicActive || !matchMusic) return;
  if (!remainingMatchTracks.length) remainingMatchTracks = [...matchTracks];
  const choices = remainingMatchTracks.filter(
    (track) => track !== lastMatchTrack,
  );
  const next = choices[Math.floor(Math.random() * choices.length)]!;
  remainingMatchTracks.splice(remainingMatchTracks.indexOf(next), 1);
  lastMatchTrack = next;
  matchMusic.src = next;
  playMatchMusic();
}
matchMusic?.addEventListener('ended', playNextMatchTrack);
function syncMatchMusic(active: boolean): void {
  if (!matchMusic || active === matchMusicActive) return;
  matchMusicActive = active;
  if (active) {
    window.addEventListener('click', playMatchMusic, true);
    window.addEventListener('keydown', playMatchMusic, true);
    playNextMatchTrack();
  } else {
    window.removeEventListener('click', playMatchMusic, true);
    window.removeEventListener('keydown', playMatchMusic, true);
    matchMusic.pause();
    matchMusic.currentTime = 0;
    game?.sound.stopAll();
  }
}
const reviewQuery = new URLSearchParams(location.search);
const inputTiming =
  reviewQuery.has('debug') && reviewQuery.get('inputTiming') === '1'
    ? new InputTiming()
    : undefined;
const eagerArt =
  artPreview ||
  creepPreviewRequested ||
  !!import.meta.env.VITE_KIM_FRAME_TEST ||
  [
    'runtimeArtReview',
    'feedbackArtReview',
    'visualReview',
    'renovationSkills',
  ].some((key) => reviewQuery.has(key));
let arenaScene: ArenaScene | undefined;
let needsWaveArt: typeof import('./arena-scene.js').needsWaveArt | undefined;
let gallery: ArtPreviewScene | undefined;
let thienSonSkillGallery: ThienSonSkillPreviewScene | undefined;
let animationReviewGallery: AnimationReviewScene | undefined;
let game: Phaser.Game | undefined;
let rendererReady: Promise<boolean> | undefined;
let disposed = false;

async function bootRenderer(): Promise<boolean> {
  if (game && arenaScene) {
    const scene = arenaScene;
    return new Promise((resolve) => {
      scene.events.once('create', () => resolve(scene.presentationReady));
      scene.scene.restart();
    });
  }
  const scenes: Phaser.Scene[] = [];
  if (animationReview) {
    const { AnimationReviewScene } = await import('./animation-review.js');
    animationReviewGallery = new AnimationReviewScene();
    animationReviewGallery.onDisplayScale = (zoom) => {
      reviewScaleOverride = zoom;
      fit();
    };
    scenes.push(animationReviewGallery);
  } else if (thienSonSkillReview) {
    const { ThienSonSkillPreviewScene } =
      await import('./thien-son-skill-preview.js');
    thienSonSkillGallery = new ThienSonSkillPreviewScene();
    scenes.push(thienSonSkillGallery);
  } else if (artPreview) {
    const { ArtPreviewScene } = await import('./art-preview.js');
    gallery = new ArtPreviewScene();
    scenes.push(gallery);
  } else {
    const [arena, { ForestStudyScene }] = await Promise.all([
      import('./arena-scene.js'),
      import('./forest-study.js'),
    ]);
    needsWaveArt = arena.needsWaveArt;
    const scene = new arena.ArenaScene(eagerArt);
    if (room?.state?.defense) scene.waveArtAtBoot = needsWaveArt(room.state);
    if (eagerArt || scene.waveArtAtBoot)
      await arena.loadRenovationActionFrames(eagerArt ? 'all' : 'wave-bosses');
    scene.onNpc = (menu) => {
      if (room && !ui.blocked) ui.open(menu);
    };
    scene.onArtError = reportArtError;
    arenaScene = scene;
    if (room) updateArenaSnapshot(room.state, room.sessionId);
    scenes.push(scene, new ForestStudyScene());
  }
  const { default: Phaser } = await import('phaser');
  if (disposed) return false;
  return new Promise((resolve) => {
    const renderer = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: 640,
      height: 360,
      backgroundColor: '#304b37',
      render: {
        pixelArt: artPreview,
        roundPixels: artPreview,
        antialias: !artPreview,
        antialiasGL: !artPreview,
      },
      scale: { mode: Phaser.Scale.NONE, zoom: 1 },
      scene: scenes,
      input: { keyboard: false, mouse: true, touch: false },
      audio: { noAudio: artPreview },
    });
    game = renderer;
    if (inputTiming)
      renderer.events.on(Phaser.Core.Events.POST_RENDER, () => {
        inputTiming.render(
          arenaScene?.localFrame(),
          room?.state.players.get(room.sessionId)?.pose,
        );
      });
    renderer.events.once(Phaser.Core.Events.READY, () => {
      fit();
      renderer.canvas.tabIndex = 0;
      const scene = arenaScene;
      if (!scene || scene.presentationReady) resolve(true);
      else
        scene.events.once(Phaser.Scenes.Events.CREATE, () => {
          resolve(scene.presentationReady);
        });
    });
  });
}
function startRenderer(): Promise<boolean> {
  return (rendererReady ??= bootRenderer()
    .catch((error: unknown) => {
      console.error(error);
      return false;
    })
    .then((ready) => {
      if (ready) syncMatchRender();
      else {
        rendererReady = undefined;
        if (room)
          pregame.fail(
            'Không tải được hình ảnh trận đấu. Hãy thử xác nhận lại.',
          );
      }
      return ready;
    }));
}
// Approved renovation art renders at native screen density in the normal match.
// Resize the world viewport with its HUD overlays inside it.
let reviewScaleOverride: number | undefined;
const fit = (): void => {
  if (!game?.isBooted) return;
  const host = element('#game');
  const zoom =
    !artPreview || runtimeArtGallery
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
  animationReviewGallery?.setDisplayScale(zoom);
};
const usePregameRenderPause =
  !artPreview &&
  new URLSearchParams(location.search).get('runtimeArtReview') !== '1';
function syncMatchRender(): void {
  if (!game || !usePregameRenderPause || !arenaScene?.presentationReady) return;
  if (pregame.node.hidden || room?.state.phase === 'VICTORY') game.resume();
  else game.pause();
}
const observer = new ResizeObserver(fit);
observer.observe(element('#game'));
ui.onStudy = (enabled) => {
  if (artPreview || !game?.isBooted) return;
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
function updateArenaSnapshot(
  state: NonNullable<typeof room>['state'],
  id: string,
): void {
  arenaScene?.setSnapshot(
    ['IN_GAME', 'DEFEAT', 'VICTORY'].includes(state.phase) ? state : undefined,
    id,
  );
}
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
    artPreview ||
    (room.state.pvp.enabled && pvpUi.blocksGameplay)
  )
    return;
  const hero = room.state.players.get(room.sessionId);
  if (
    hero?.zoneId === loiDai.id &&
    command.kind !== 'move' &&
    command.kind !== 'move-to' &&
    command.kind !== 'auto-basic' &&
    (!hero.loiDaiFighter || room.state.loiDaiFighters < 2)
  )
    return;
  const payload = {
    ...command,
    sequence: ++sequence,
    protocolVersion: PROTOCOL_VERSION,
  } as InputMessage;
  inputTiming?.input(command, payload.sequence, arenaScene?.localFrame());
  room.send('input', payload);
  if (command.kind === 'move') arenaScene?.moveLocal(command.x, command.y);
}
const gameplayConnected = () =>
  !!room &&
  room.state.phase === 'IN_GAME' &&
  !!room.state.players.get(room.sessionId)?.confirmed &&
  !artPreview;
const gameplayBlocked = () =>
  !practiceUi.node.hidden ||
  pvpUi.blocksGameplay ||
  ui.blocked ||
  !arenaScene?.zoneReady ||
  ((room?.state?.players?.get(room.sessionId)?.hp ?? 0) <= 0 &&
    !room?.state?.players?.get(room.sessionId)?.bossSpectator);
const mouseMode = () => preferences.controls === 'mouse';
const unbindInput = bindGameplayInput(
  send,
  gameplayConnected,
  gameplayBlocked,
  () => {
    const hero = room?.state.players.get(room.sessionId);
    if (
      !hero ||
      hero.zoneId === 'arena' ||
      hero.zoneId === loiDai.id ||
      (hero.hp <= 0 && !hero.bossSpectator)
    )
      return;
    const d = dungeonForZone(hero.zoneId);
    const { exit } = d;
    if (
      hero.bossSpectator ||
      Math.hypot(hero.x - exit.x, hero.y - exit.y) <= d.exitRange
    )
      dungeonAction({ action: 'exit' });
    else if (d.id === 'chu_ba_thong') dungeonAction({ action: 'interact' });
  },
  (resource) => ui.usePotion(resource),
  {
    active: () => !!room?.state?.players?.get(room.sessionId)?.bossSpectator,
    pan: (x, y) => arenaScene?.panSpectator(x, y),
  },
  (key) => namDeHud.capture(key),
  () => {
    const hero = room?.state.players.get(room.sessionId);
    if (hero?.build.mode === 'fixed' && hero.basicId === 'thieu_lam_quyen')
      ui.onBuild({ action: 'stance' });
  },
  {
    enabled: () => {
      const hero = room?.state.players.get(room.sessionId);
      return !!hero && hero.hp > 0 && hero.build.mode === 'fixed';
    },
    upgrade: (slot) => ui.onBuild({ action: 'upgrade-slot', slot }),
  },
  mouseMode,
);
const worldCanvas = element('#game');
const worldMouse = (event: MouseEvent) =>
  event.target instanceof HTMLCanvasElement &&
  mouseMode() &&
  gameplayConnected();
function worldContextMenu(event: MouseEvent): void {
  if (worldMouse(event)) event.preventDefault();
}
function worldPointerDown(event: PointerEvent): void {
  if (event.button !== 2 || !worldMouse(event) || !room || !arenaScene) return;
  event.preventDefault();
  if (gameplayBlocked() || ui.reconnecting) return;
  const hero = room.state.players.get(room.sessionId);
  if (
    !hero ||
    hero.hp <= 0 ||
    hero.bossSpectator ||
    namDeHud.capture('') !== undefined
  )
    return;
  const click = arenaScene.worldClick(event.clientX, event.clientY);
  const { x, y } = click.position;
  if (x < 0 || y < 0 || x > 16384 || y > 16384) return;
  send({
    kind: 'move-to',
    x,
    y,
    zoneId: hero.zoneId,
    targetId: click.targetId,
  });
  if (!click.targetId) arenaScene.showMoveMarker(click.position);
}
worldCanvas.addEventListener('contextmenu', worldContextMenu);
worldCanvas.addEventListener('pointerdown', worldPointerDown);
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
    if(requestedPractice)practiceUi.error(status.textContent);else if(requestedPvp)pvpUi.error(status.textContent);else pregame.fail(status.textContent);
    return;
  }
  if (existing && !roomId) {
    status.textContent = 'Hãy nhập mã phòng để tham gia.';
    if(requestedPvp)pvpUi.error(status.textContent);
    return;
  }
  controls(false, true);
  status.textContent = 'Đang kết nối…';
  try {
    const joined = requestedPractice
      ? await client.create<PracticeRoom>(PRACTICE_ROOM,{...parsed.data,...requestedPractice})
      : requestedPvp
      ? existing
        ? await client.joinById<StandaloneLoiDaiRoom>(roomId,{...parsed.data,pvp:true})
        : await client.create<StandaloneLoiDaiRoom>(PVP_ROOM,{...parsed.data,pvp:true,mapId:requestedPvpMap})
      : existing
      ? await client.joinById<MatchRoom>(roomId, parsed.data)
      : await client.create<MatchRoom>(MATCH_ROOM, {
          ...parsed.data,
          portalCount: pregame.portalCount,
          creepPreview: creepPreviewRequested,
        });
    joined.reconnection.enabled = !requestedPvp && !requestedPractice;
    room = joined;
    sequence = 0;
    inputTiming?.reset();
    events.length = 0;
    status.textContent = 'Connected';
    ui.connected(joined.roomId, joined.sessionId);
    controls(true);
    let previousZone = 'arena';
    let rendererRequested = false;
    let sentAutoBasic = false;
    let previousPvpPhase = '';
    const syncJoinedState = (state: typeof joined.state) => {
      if (room === joined) {
        inputTiming?.patch(
          state.players.get(joined.sessionId)?.lastSequence ?? 0,
        );
        if (!rendererRequested) {
          rendererRequested = true;
          void startRenderer();
        }
        syncMatchMusic(state.phase === 'IN_GAME');
        if (
          !sentAutoBasic &&
          state.phase === 'IN_GAME' &&
          state.players.get(joined.sessionId)?.confirmed
        ) {
          sentAutoBasic = true;
          if (preferences.autoBasic)
            send({ kind: 'auto-basic', enabled: true });
        }
        chuHud.sync(state, joined.sessionId);
        namDeHud.sync(state, joined.sessionId);
        tamLienHud.sync(state, joined.sessionId);
        const zone = state.players.get(joined.sessionId)?.zoneId ?? 'arena';
        if (zone !== previousZone) {
          previousZone = zone;
          window.dispatchEvent(new Event('volam:controls-blocked'));
          ui.close();
        }
        const wasChoosing = !pregame.node.hidden;
        if(state.practice.enabled) {pregame.node.hidden=true;pvpUi.clear();if(arenaScene?.presentationReady)practiceUi.connected(state.players.get(joined.sessionId));else practiceUi.loading();}
        else if(state.pvp.enabled) {
          pregame.node.hidden=true;pvpUi.update(state,joined.roomId,joined.sessionId);
          const phase=readPvp(state)?.phase;
          if(phase==='fighting'&&phase!==previousPvpPhase&&preferences.autoBasic)send({kind:'auto-basic',enabled:true});
          previousPvpPhase=phase??'';
        } else {pvpUi.clear();pregame.update(state, joined.roomId, joined.sessionId);}
        syncMatchRender();
        if (wasChoosing && pregame.node.hidden && state.phase === 'IN_GAME')
          document.querySelector<HTMLCanvasElement>('#game canvas')?.focus();
        updateArenaSnapshot(state, joined.sessionId);
        ui.refresh(state);
        skillPreview.update(state, joined.sessionId);
        creepPreview.update(state, joined.sessionId);
      }
    };
    joined.onStateChange(syncJoinedState);
    if (inputTiming)
      joined.onMessage('input-timing', (sample) => {
        if (room === joined) inputTiming.server(sample);
      });
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
      if (room !== joined) return;
      const parsedEvent = combatEventSchema.safeParse(payload);
      if (
        !parsedEvent.success ||
        parsedEvent.data.zoneId !==
          joined.state.players.get(joined.sessionId)?.zoneId
      )
        return;
      events.push(parsedEvent.data);
      if (events.length > 60) events.shift();
      if (arenaScene?.presentationReady)
        playSkillSound(arenaScene, parsedEvent.data, joined.sessionId);
      arenaScene?.combat(parsedEvent.data);
    });
    joined.onMessage('command-rejected', (payload: unknown) => {
      const rejected = rejectionSchema.safeParse(payload);
      if (rejected.success) {
        ui.resolveMerchant();
        ui.notify(rejected.data.reason);
        if(joined.state.practice.enabled)practiceUi.rejected(rejected.data.sequence,rejected.data.reason);else if(joined.state.pvp.enabled)pvpUi.error(rejected.data.reason);else pregame.fail(rejected.data.reason);
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
      pendingEntry = undefined;
      creepPreview.hide();
      namDeHud.sync(undefined, '');
      tamLienHud.sync(undefined, '');
      ui.reconnecting = true;
      window.dispatchEvent(new Event('volam:controls-blocked'));
      arenaScene?.setSnapshot(undefined);
      ui.notify(joined.state.practice.enabled?'Mất kết nối phòng test.':joined.state.pvp.enabled?'Mất kết nối Lôi Đài.':'Mất kết nối · Đang kết nối lại…');
    });
    joined.onReconnect(() => {
      if (room !== joined) return;
      ui.reconnecting = false;
      send({ kind: 'auto-basic', enabled: preferences.autoBasic });
      ui.notify('Đã kết nối lại · Trở về đấu trường chính.');
    });
    joined.onLeave((code) => {
      if (room !== joined) return;
      pendingEntry = undefined;
      syncMatchMusic(false);
      chuHud.sync(undefined, '');
      namDeHud.sync(undefined, '');
      tamLienHud.sync(undefined, '');
      const wasPractice=joined.state.practice.enabled;
      const wasPvp=joined.state.pvp.enabled;
      const nickname=joined.state.players.get(joined.sessionId)?.nickname??'';
      room = undefined;
      if(wasPractice){pregame.node.hidden=true;practiceUi.open(nickname);}
      else if(wasPvp){pvpUi.clear();pregame.node.hidden=true;pvpUi.openEntry(nickname,'',code===4011?'Phòng đã đóng · Chủ phòng đã rời phòng.':'Bạn đã rời phòng Lôi Đài.');}
      else pregame.disconnected(
        `Mất kết nối (${code}). Hãy tạo hoặc vào phòng để trở lại.`,
      );
      syncMatchRender();
      arenaScene?.setSnapshot(undefined);
      controls(false);
      ui.connected('', '');
      skillPreview.hide();
      creepPreview.hide();
      status.textContent = `Mất kết nối (${code}). Hãy tạo hoặc vào phòng để trở lại.`;
    });
    // The initial snapshot can arrive before this connection finishes wiring its UI.
    const canvas = document.querySelector<HTMLCanvasElement>('#game canvas');
    if (canvas) canvas.tabIndex = 0;
    if (joined.state?.hostId) syncJoinedState(joined.state);
  } catch (error: unknown) {
    status.textContent = `Không thể kết nối: ${connectionReason(error instanceof Error ? error.message : '')}`;
    controls(false);
    if(requestedPractice)practiceUi.error(status.textContent ?? 'Kết nối thất bại');else if(requestedPvp)pvpUi.error(status.textContent ?? 'Kết nối thất bại');else pregame.fail(status.textContent ?? 'Kết nối thất bại');
  }
}
pregame.onConnect = (nickname, id) => {
  requestedPractice=undefined;practiceUi.clear();requestedPvp=false;pvpUi.clear();
  element<HTMLInputElement>('#nickname').value = nickname;
  element<HTMLInputElement>('#room-id').value = id ?? '';
  void connect(!!id);
};
let confirmingRoom: typeof room;
pregame.onAction = (action) => {
  const joined = room;
  if (!joined) return;
  if (
    action.action !== 'confirm' ||
    (arenaScene?.presentationReady &&
      (!needsWaveArt?.(joined.state) || arenaScene.hasArt('wave-bosses')))
  ) {
    joined.send('lobby-action', action);
    return;
  }
  if (confirmingRoom === joined) return;
  const hero = joined.state.players.get(joined.sessionId);
  const school = hero?.schoolId;
  const branch = hero?.selectedBranch;
  confirmingRoom = joined;
  pregame.setArtLoading(true);
  void startRenderer()
    .then(async (ready) => {
      if (!ready || room !== joined) return;
      if (needsWaveArt?.(joined.state))
        await arenaScene?.prepareArt('wave-bosses');
      const current = joined.state.players.get(joined.sessionId);
      if (
        room === joined &&
        current?.schoolId === school &&
        current?.selectedBranch === branch &&
        current?.connected &&
        !current.confirmed
      )
        joined.send('lobby-action', action);
    })
    .catch((error) => {
      if (room === joined) reportArtError(error);
    })
    .finally(() => {
      if (confirmingRoom === joined) confirmingRoom = undefined;
      if (room === joined) pregame.setArtLoading(false);
    });
};
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
const enterWithArt = (pack: DeferredArtPack, enter: () => void) => {
  const joined = room;
  const origin = joined?.state.players.get(joined.sessionId)?.zoneId;
  if (!joined || !origin || !arenaScene) return;
  if (arenaScene.hasArt(pack)) {
    pendingEntry = undefined;
    enter();
    return;
  }
  if (pendingEntry?.room === joined && pendingEntry.pack === pack) return;
  const entry = { room: joined, pack };
  pendingEntry = entry;
  ui.notify('Đang tải hình ảnh khu vực…');
  void arenaScene
    .prepareArt(pack)
    .then(() => {
      if (
        pendingEntry === entry &&
        room === joined &&
        joined.state.players.get(joined.sessionId)?.zoneId === origin
      )
        enter();
    })
    .catch((error) => {
      if (room === joined) reportArtError(error);
    })
    .finally(() => {
      if (pendingEntry === entry) pendingEntry = undefined;
    });
};
let pendingEntry:
  { room: NonNullable<typeof room>; pack: DeferredArtPack } | undefined;
function reportArtError(error: unknown): void {
  console.error(error);
  ui.notify('Không tải được hình ảnh khu vực. Vui lòng thử lại.');
}
ui.onDestinationPreview = (pack) => {
  void arenaScene?.prepareArt(pack).catch(() => {
    // The enter action reports errors and can retry a failed prefetch.
  });
};
const sendLoiDai = (action: 'enter' | 'exit') => {
  if (!room || ui.reconnecting || room.state.phase !== 'IN_GAME') return;
  room.send('loi-dai-action', {
    action,
    sequence: ++sequence,
    protocolVersion: PROTOCOL_VERSION,
  });
};
ui.onLoiDai = (action) => {
  if (action === 'enter') enterWithArt('loi_dai', () => sendLoiDai(action));
  else sendLoiDai(action);
};
ui.onDungeonEnter = (access, destination) => {
  enterWithArt(destination, () => {
    dungeonAction({ action: 'enter', access, destination });
    if (isBossDestination(destination) && (room?.state.players.size ?? 0) > 1)
      ui.bossParty.help();
  });
};
ui.bossParty.onSummon = () => dungeonAction({ action: 'summon-help' });
ui.bossParty.onInvitation = ui.onDestinationPreview;
ui.bossParty.onReply = ({ id: invitationId, destination }, accept) => {
  const reply = () =>
    dungeonAction({ action: 'reply-invitation', invitationId, accept });
  if (accept && isBossDestination(destination))
    enterWithArt(destination, reply);
  else reply();
};
// Explicit evidence and presentation review only; no authoritative mutation bridge.
if (new URLSearchParams(location.search).has('debug') || artPreview) {
  Object.defineProperty(window, '__VOLAM__', {
    configurable: true,
    value: Object.freeze({
      ...(new URLSearchParams(location.search).get('visualReview') === '1'
        ? {
            reviewVisualStyle: (polished: boolean) =>
              arenaScene?.reviewVisualStyle(polished),
          }
        : {}),
      ...(import.meta.env.VITE_KIM_FRAME_TEST
        ? {
            reviewKim: (bundle: string, clip: string) =>
              arenaScene?.reviewKim(bundle, clip),
          }
        : {}),
      reviewWorldDepth: (enabled: boolean) =>
        arenaScene?.reviewWorldDepth(enabled),
      reviewChu: (
        bundle: string,
        tag: string,
        x: number,
        y: number,
        ms: number,
      ) => arenaScene?.reviewChu(bundle, tag, x, y, ms),
      snapshot: () => ({
        sessionId: room?.sessionId,
        roomId: room?.roomId,
        state: room?.state?.toJSON(),
        events: events.map((event) => ({ ...event })),
      }),
      ...(inputTiming ? { inputTiming: () => inputTiming.inspect() } : {}),
      // Read-only evidence hook: capture after the GPU has drawn the inspected
      // frame, rather than pairing a new pose with the previous canvas buffer.
      afterRender: (inspect: () => void) => {
        game?.events.once('postrender', inspect);
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
            galleryClearEffects: () =>
              arenaScene?.reviewClearTransientEffects(),
          }
        : {}),
      progressionPresentation: () => arenaScene?.inspectProgression(),
      presentation: () =>
        animationReview
          ? animationReviewGallery?.inspect()
          : thienSonSkillReview
            ? thienSonSkillGallery?.inspect()
            : artPreview
              ? gallery?.inspect()
              : arenaScene?.inspect(),
      ...(new URLSearchParams(location.search).get('feedbackArtReview') === '1'
        ? {
            // Explicit presentation-only renderer fixture: no command or state mutation.
            reviewFeedback: (
              asset: string,
              tag: string,
              x: number,
              y: number,
            ) => arenaScene?.reviewFeedback(asset, tag, x, y),
          }
        : {}),
    }),
  });
}
if (eagerArt) void startRenderer();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    disposed = true;
    syncMatchMusic(false);
    matchMusic?.removeEventListener('ended', playNextMatchTrack);
    matchMusic?.remove();
    void room?.leave();
    unbindInput();
    worldCanvas.removeEventListener('contextmenu', worldContextMenu);
    worldCanvas.removeEventListener('pointerdown', worldPointerDown);
    pregame.destroy();
    pvpUi.destroy();
    creepPreview.destroy();
    ui.destroy();
    skillPreview.destroy();
    observer.disconnect();
    game?.destroy(true);
  });
