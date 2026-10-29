import Phaser from 'phaser';
import { Client, type Room } from '@colyseus/sdk';
import type { MatchRoom } from '../../game-server/src/rooms/MatchRoom.js';
import { lobbyConfig, m1Config } from '@volam/game-data';
import type { Command, CombatEvent } from '@volam/game-core';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  joinOptionsSchema,
  connectionAckSchema,
  combatEventSchema,
  rejectionSchema,
  type LobbyState,
  type InputMessage,
} from '@volam/game-protocol';
import { ArenaScene } from './arena-scene.js';
import { ArtPreviewScene } from './art-preview.js';
import { bindGameplayInput } from './input.js';
import './style.css';

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}
const artPreview = new URLSearchParams(location.search).has('artPreview');
element('#app').innerHTML = `
<main class="shell">
  <header><div><p class="eyebrow">VÕ LÂM · SÂN LUYỆN VÕ</p><h1>Võ Lâm Hero Defense</h1><p class="subtitle">Enter the courtyard. Master your first strikes.</p></div><span class="badge">M1 · Original art prototype</span></header>
  <div class="layout">
    <section class="courtyard" aria-label="Orthographic training arena">
      <div class="scene-heading"><span>TỊNH PHONG VIỆN</span><span id="scene-status">${artPreview ? 'ART PREVIEW' : 'ELEVATED TOP-DOWN · 2D'}</span></div>
      <div id="game" aria-label="Game canvas"></div>
      <div class="skill-strip"><div class="skill" id="slot-q"><kbd>Q</kbd><span>Hỏa Vân Chưởng</span><small id="cooldown-q">18 MP · Ready</small></div><div class="skill" id="slot-w"><kbd>W</kbd><span>Cuồng Long Loạn Vũ</span><small id="cooldown-w">25 MP · Ready</small></div><div class="skill empty"><kbd>E</kbd><span>Empty</span></div><div class="skill empty"><kbd>R</kbd><span>Empty</span></div></div>
      <div class="scene-footer"><span>Arrow keys move · A attacks · Q / W cast</span><span>Original prototype sprites</span></div>
    </section>
    <aside>
      <section class="panel"><p class="eyebrow">TEMPORARY PRACTICE ROOM</p><h2>Enter the courtyard</h2>
        <form id="join-form"><label for="nickname">Nickname</label><input id="nickname" maxlength="${lobbyConfig.nicknameMaxLength}" autocomplete="off" required placeholder="Your nickname" />
        <button type="submit" id="create">Create room</button><label for="room-id">Room ID <span class="muted">· join a friend</span></label><input id="room-id" autocomplete="off" maxlength="64" placeholder="Paste room ID" /><button type="submit" id="join" class="secondary">Join room</button></form>
        <p id="status" role="status" data-testid="status" aria-live="polite">Disconnected</p><p class="room-label">Current room <strong id="current-room" data-testid="room-id">—</strong></p>
        <div class="actions"><button id="check" disabled>Check connection</button><button id="leave" class="secondary" disabled>Leave</button></div><p id="ack" class="muted" aria-live="polite">Choose a nickname to begin.</p>
      </section>
      <section class="panel"><h2>Cái Bang</h2><p id="hero-stats" data-testid="hero-stats" class="muted">Level 1 · Training archetype</p>
        <label for="basic-style">Normal attack · A</label><select id="basic-style" disabled><option value="cai_bang_bong">Cái Bang Bổng · melee</option><option value="cai_bang_chuong">Cái Bang Chưởng · ranged</option></select>
        <p id="basic-cooldown" class="muted">Manual attacks. Each press counts once.</p><p id="feedback" role="status" class="feedback">Walk behind a tree to explore the foreground.</p>
      </section>
      <section class="panel roster"><h2>Players <span id="player-count" data-testid="player-count">0 / 6</span></h2><ul id="players" data-testid="players"></ul><p id="empty" class="muted">The courtyard is quiet.</p></section>
      <section class="panel enemies"><h2>Training creeps</h2><ul id="creeps" data-testid="creeps"></ul></section>
    </aside>
  </div>
  <footer><span><kbd>↑ ↓ ← →</kbd> move · <kbd>A</kbd> manual attack · <kbd>Q W E R</kbd> skill slots</span><span>M1 practice · ${artPreview ? 'Animation inspection' : 'Art awaiting review'}</span></footer>
</main>`;
const arenaScene = new ArenaScene();
const gallery = new ArtPreviewScene();
const logicalHeight = artPreview ? 520 : 300;
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: logicalHeight,
  backgroundColor: '#66835a',
  render: {
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
  },
  scale: { mode: Phaser.Scale.NONE, zoom: 1 },
  scene: [artPreview ? gallery : arenaScene],
  input: { keyboard: false, mouse: false, touch: false },
  audio: { noAudio: true },
});
const fit = (): void => {
  if (!game.isBooted) return;
  const zoom = Math.max(
    1,
    Math.min(2, Math.floor(element('#game').clientWidth / 480)),
  );
  game.scale.setZoom(zoom);
  element('#game').style.height = `${logicalHeight * zoom}px`;
};
game.events.once(Phaser.Core.Events.READY, fit);
const observer = new ResizeObserver(fit);
observer.observe(element('#game'));
fit();
const client = new Client(
  import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:2567',
);
let room: Room<MatchRoom> | undefined;
let sequence = 0;
const events: CombatEvent[] = [];
const form = element<HTMLFormElement>('#join-form');
const status = element('#status');
const checkButton = element<HTMLButtonElement>('#check');
const leaveButton = element<HTMLButtonElement>('#leave');
const basicSelect = element<HTMLSelectElement>('#basic-style');
function send(command: Command): void {
  if (!room || artPreview) return;
  const payload = {
    ...command,
    sequence: ++sequence,
    protocolVersion: PROTOCOL_VERSION,
  } as InputMessage;
  room.send('input', payload);
}
const unbindInput = bindGameplayInput(send, () => !!room && !artPreview);
function controls(connected: boolean, busy = false): void {
  document.body.classList.toggle('connected', connected);
  for (const field of form.querySelectorAll<
    HTMLInputElement | HTMLButtonElement
  >('input, button'))
    field.disabled = connected || busy;
  checkButton.disabled = !connected;
  leaveButton.disabled = !connected;
  basicSelect.disabled = !connected;
}
function refresh(state: LobbyState): void {
  if (!room || !state.players) return;
  arenaScene.setSnapshot(state, room.sessionId);
  element('#players').replaceChildren(
    ...[...state.players.entries()].map(([id, hero]) => {
      const li = document.createElement('li');
      li.dataset['playerId'] = id;
      li.dataset['x'] = String(hero.x);
      li.dataset['y'] = String(hero.y);
      li.dataset['hp'] = String(hero.hp);
      const name = document.createElement('span');
      name.textContent = `${hero.nickname}${id === room?.sessionId ? ' (you)' : ''} · Lv ${hero.level}`;
      const checks = document.createElement('span');
      checks.className = 'muted';
      checks.textContent = `Checks: ${hero.checks}`;
      li.append(name, checks);
      return li;
    }),
  );
  element('#empty').hidden = state.players.size > 0;
  element('#player-count').textContent =
    `${state.players.size} / ${lobbyConfig.maxPlayers}`;
  element('#creeps').replaceChildren(
    ...[...state.creeps.entries()].map(([id, creep]) => {
      const li = document.createElement('li');
      li.dataset['creepId'] = id;
      li.dataset['hp'] = String(creep.hp);
      li.textContent = `Sơn tặc · ${Math.ceil(creep.hp)} / ${creep.maxHp} HP${creep.hp <= 0 ? ' · Fallen' : ''}`;
      return li;
    }),
  );
  const hero = state.players.get(room.sessionId);
  if (hero) {
    element('#hero-stats').textContent =
      `Lv ${hero.level} · HP ${Math.ceil(hero.hp)}/${hero.maxHp} · MP ${Math.floor(hero.mana)}/${hero.maxMana} · XP ${hero.xp} · Gold ${hero.gold} · Skill points ${hero.skillPoints}`;
    basicSelect.value = hero.basicId;
    element('#basic-cooldown').textContent =
      hero.basicCooldown > 0
        ? `A · ${(hero.basicCooldown / m1Config.tickRate).toFixed(1)}s`
        : 'A · Ready · Press once per attack';
    for (const [key, remaining, cost] of [
      ['q', hero.qCooldown, 18],
      ['w', hero.wCooldown, 25],
    ] as const) {
      element(`#cooldown-${key}`).textContent =
        remaining > 0
          ? `${(remaining / m1Config.tickRate).toFixed(1)}s`
          : `${cost} MP · ${hero.mana < cost ? 'Need mana' : 'Ready'}`;
      element(`#slot-${key}`).classList.toggle(
        'cooling',
        remaining > 0 || hero.mana < cost,
      );
    }
    if (hero.hp <= 0)
      element('#feedback').textContent =
        'You have fallen. Leave and create a new practice room.';
  }
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
    element('#current-room').textContent = joined.roomId;
    element('#ack').textContent = 'Share the room ID with a friend.';
    controls(true);
    joined.onStateChange((state) => {
      if (room === joined) refresh(state);
    });
    joined.onMessage('connection-ack', (payload: unknown) => {
      const ack = connectionAckSchema.safeParse(payload);
      element('#ack').textContent = ack.success
        ? `Server acknowledged check #${ack.data.sequence}. Count: ${ack.data.checks}.`
        : 'Incompatible server acknowledgement.';
    });
    joined.onMessage('combat-event', (payload: unknown) => {
      const parsedEvent = combatEventSchema.safeParse(payload);
      if (!parsedEvent.success) return;
      events.push(parsedEvent.data);
      if (events.length > 60) events.shift();
      arenaScene.combat(parsedEvent.data);
      if (
        parsedEvent.data.sourceId === joined.sessionId &&
        parsedEvent.data.kind === 'hit'
      )
        element('#feedback').textContent =
          `${parsedEvent.data.critical ? 'Critical · ' : ''}${parsedEvent.data.damage} damage`;
    });
    joined.onMessage('command-rejected', (payload: unknown) => {
      const rejected = rejectionSchema.safeParse(payload);
      if (rejected.success)
        element('#feedback').textContent = rejected.data.reason;
    });
    joined.onError((code, message) => {
      status.textContent = `Connection error ${code}: ${message}`;
    });
    joined.onLeave((code) => {
      if (room !== joined) return;
      room = undefined;
      arenaScene.setSnapshot(undefined);
      controls(false);
      status.textContent = `Disconnected (${code}). Create or join a room to return.`;
      element('#current-room').textContent = '—';
      element('#players').replaceChildren();
      element('#creeps').replaceChildren();
      element('#empty').hidden = false;
      element('#player-count').textContent = '0 / 6';
    });
    if (joined.state?.players) refresh(joined.state);
    const canvas = element<HTMLCanvasElement>('#game canvas');
    canvas.tabIndex = 0;
    canvas.focus();
  } catch (error: unknown) {
    status.textContent = `Could not connect: ${error instanceof Error ? error.message : 'unknown error'}`;
    controls(false);
  }
}
checkButton.addEventListener('click', () =>
  room?.send('connection-check', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++sequence,
  }),
);
leaveButton.addEventListener('click', () => {
  void room?.leave();
});
basicSelect.addEventListener('change', () => {
  send({ kind: 'select-basic', id: basicSelect.value });
  element<HTMLCanvasElement>('#game canvas').focus();
});
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
        artPreview ? gallery.inspect() : arenaScene.inspect(),
    }),
  });
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    void room?.leave();
    unbindInput();
    observer.disconnect();
    game.destroy(true);
  });
