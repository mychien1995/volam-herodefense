import Phaser from 'phaser';
import { Client, type Room } from '@colyseus/sdk';
import type { MatchRoom } from '../../game-server/src/rooms/MatchRoom.js';
import { lobbyConfig } from '@volam/game-data';
import type { Command, CombatEvent } from '@volam/game-core';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  joinOptionsSchema,
  connectionAckSchema,
  combatEventSchema,
  rejectionSchema,
  type InputMessage,
  type DungeonAction,
} from '@volam/game-protocol';
import { ArenaScene } from './arena-scene.js';
import { ArtPreviewScene } from './art-preview.js';
import { ThienSonSkillPreviewScene } from './thien-son-skill-preview.js';
import { bindGameplayInput } from './input.js';
import { GameUI, element } from './ui.js';
import { SkillPreview } from './skill-preview.js';
import { ForestStudyScene } from './forest-study.js';
import './style.css';
import './arena-hud.css';
import './dungeon.css';
import './dungeon-selector.css';
import './defense-hud.css';
import { PreGame } from './pregame.js';

const artPreview = new URLSearchParams(location.search).has('artPreview');
const thienSonSkillReview =
  artPreview &&
  new URLSearchParams(location.search).get('thienSonSkills') === '1';
const thieuLamReview = new URLSearchParams(location.search).has(
  'thieuLamReview',
);
const ui = new GameUI(artPreview);
const endpoint = import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:2567';
const pregame = new PreGame(endpoint);
if (artPreview) pregame.node.hidden = true;
const arenaScene = new ArenaScene();
const gallery = new ArtPreviewScene();
const thienSonSkillGallery = new ThienSonSkillPreviewScene();
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
  scene: thienSonSkillReview
    ? [thienSonSkillGallery]
    : artPreview
      ? [gallery]
      : [arenaScene, study],
  input: { keyboard: false, mouse: true, touch: false },
  audio: { noAudio: true },
});
// A fixed integer display scale preserves square pixels. Resize the world view,
// rather than reserving page space for HUD or stretching a fixed aspect ratio.
const fit = (): void => {
  if (!game.isBooted) return;
  const host = element('#game');
  const zoom = artPreview
    ? 2
    : host.clientWidth >= 960 && host.clientHeight >= 600
      ? 2
      : 1;
  game.scale.resize(
    thienSonSkillReview
      ? Math.ceil(host.clientWidth / zoom)
      : artPreview
        ? thieuLamReview
          ? 640
          : 480
        : Math.ceil(host.clientWidth / zoom),
    thienSonSkillReview
      ? Math.ceil(host.clientHeight / zoom)
      : artPreview
        ? 520
        : Math.ceil(host.clientHeight / zoom),
  );
  // NONE-mode resize at zoom 1 retains the previous CSS dimensions in Phaser
  // 4.2.1. Apply zoom after the new base size so CSS size and input bounds agree.
  game.scale.setZoom(zoom);
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
arenaScene.onDungeonExit = () => {
  if (!ui.blocked) dungeonAction({ action: 'exit' });
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
const form = element<HTMLFormElement>('#join-form');
const status = element('#status');
function dungeonAction(
  action:
    | { action: 'open' | 'exit' }
    | { action: 'enter'; access: 'private' | 'shared' },
): void {
  if (
    !room ||
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
  () => ui.blocked,
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
    status.textContent = `Use a nickname of 1–${lobbyConfig.nicknameMaxLength} letters, numbers or simple punctuation.`;
    pregame.fail(status.textContent);
    return;
  }
  if (existing && !roomId) {
    status.textContent = 'Enter a room ID to join.';
    return;
  }
  controls(false, true);
  status.textContent = 'Connecting…';
  try {
    const joined = existing
      ? await client.joinById<MatchRoom>(roomId, parsed.data)
      : await client.create<MatchRoom>(MATCH_ROOM, parsed.data);
    joined.reconnection.enabled = false;
    room = joined;
    sequence = 0;
    events.length = 0;
    status.textContent = 'Connected';
    ui.connected(joined.roomId, joined.sessionId);
    controls(true);
    let previousZone = 'arena';
    joined.onStateChange((state) => {
      if (room === joined) {
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
      }
    });
    joined.onMessage('dungeon-menu', () => {
      if (room === joined) ui.open('dungeons');
    });
    joined.onMessage('connection-ack', (payload: unknown) => {
      const ack = connectionAckSchema.safeParse(payload);
      ui.acknowledge(
        ack.success
          ? `Server acknowledged check #${ack.data.sequence}. Count: ${ack.data.checks}.`
          : 'Incompatible server acknowledgement.',
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
        ui.notify(rejected.data.reason);
        pregame.fail(rejected.data.reason);
      }
    });
    joined.onError((code, message) => {
      status.textContent = `Connection error ${code}: ${message}`;
      pregame.fail(status.textContent);
      element('#hud-connection').textContent = `Error ${code}`;
      ui.notify(status.textContent);
    });
    joined.onLeave((code) => {
      if (room !== joined) return;
      room = undefined;
      pregame.disconnected(
        `Disconnected (${code}). Create or join a room to return.`,
      );
      arenaScene.setSnapshot(undefined);
      controls(false);
      ui.connected('', '');
      skillPreview.hide();
      status.textContent = `Disconnected (${code}). Create or join a room to return.`;
    });
    if (joined.state?.players && joined.state.phase) {
      pregame.update(joined.state, joined.roomId, joined.sessionId);
      arenaScene.setSnapshot(
        joined.state.phase === 'IN_GAME' || joined.state.phase === 'DEFEAT'
          ? joined.state
          : undefined,
        joined.sessionId,
      );
      ui.refresh(joined.state);
      skillPreview.update(joined.state, joined.sessionId);
    }
    const canvas = element<HTMLCanvasElement>('#game canvas');
    canvas.tabIndex = 0;
    canvas.focus();
  } catch (error: unknown) {
    status.textContent = `Could not connect: ${error instanceof Error ? error.message : 'unknown error'}`;
    controls(false);
    pregame.fail(status.textContent ?? 'Connection failed');
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
ui.onDungeonEnter = (access) => dungeonAction({ action: 'enter', access });
// Read-only browser evidence bridge, enabled explicitly for automated playtesting.
if (new URLSearchParams(location.search).has('debug') || artPreview) {
  Object.defineProperty(window, '__VOLAM__', {
    configurable: true,
    value: Object.freeze({
      snapshot: () => ({
        sessionId: room?.sessionId,
        roomId: room?.roomId,
        state: room?.state?.toJSON(),
        events: events.map((event) => ({ ...event })),
      }),
      presentation: () =>
        thienSonSkillReview
          ? thienSonSkillGallery.inspect()
          : artPreview
            ? gallery.inspect()
            : arenaScene.inspect(),
    }),
  });
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    void room?.leave();
    unbindInput();
    pregame.destroy();
    ui.destroy();
    skillPreview.destroy();
    observer.disconnect();
    game.destroy(true);
  });
