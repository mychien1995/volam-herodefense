import Phaser from 'phaser';
import { Client, type Room } from '@colyseus/sdk';
// Erased at build time: message types without server runtime code.
import type { MatchRoom } from '../../game-server/src/rooms/MatchRoom.js';
import { lobbyConfig } from '@volam/game-data';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  joinOptionsSchema,
  connectionAckSchema,
  type ConnectionCheck,
  type LobbyState,
} from '@volam/game-protocol';
import { LobbyScene, type RosterEntry } from './lobby-scene.js';
import './style.css';

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

element('#app').innerHTML = `
  <main class="shell">
    <header><div><p class="eyebrow">VÕ LÂM · M0 ENGINEERING PREVIEW</p>
      <h1>Võ Lâm Hero Defense</h1><p class="subtitle">Gather in the courtyard.</p></div>
      <span class="badge">M0 · Lobby only</span></header>
    <div class="layout">
      <section class="courtyard" aria-label="Placeholder courtyard">
        <div class="scene-heading"><span>SẢNH CHỜ</span><span id="scene-status">PHASER 4</span></div>
        <div id="game"></div>
        <div class="scene-footer"><span>Original placeholder geometry</span><span>1–6 players</span></div>
      </section>
      <aside>
        <section class="panel">
          <p class="eyebrow">TEMPORARY MATCH</p><h2>Enter the courtyard</h2>
          <p class="muted">Choose a nickname to create a room, or join a friend by room ID.</p>
          <form id="join-form">
            <label for="nickname">Nickname</label>
            <input id="nickname" name="nickname" maxlength="${lobbyConfig.nicknameMaxLength}" autocomplete="off" required placeholder="Your nickname" />
            <button type="submit" id="create">Create room</button>
            <label for="room-id">Room ID <span class="muted">· to join a friend</span></label>
            <input id="room-id" name="roomId" autocomplete="off" placeholder="Paste room ID" maxlength="64" />
            <button type="submit" id="join" class="secondary">Join room</button>
          </form>
          <p id="status" role="status" aria-live="polite" data-testid="status">Disconnected</p>
          <p class="room-label">Current room <strong id="current-room" data-testid="room-id">—</strong></p>
          <div class="actions"><button id="check" disabled>Check connection</button>
            <button id="leave" class="secondary" disabled>Leave</button></div>
          <p id="ack" class="muted" aria-live="polite">Waiting for a connection.</p>
        </section>
        <section class="panel roster"><h2>Players <span id="player-count" data-testid="player-count">0 / 6</span></h2>
          <ul id="players" data-testid="players"></ul><p id="empty" class="muted">The courtyard is quiet.</p>
        </section>
      </aside>
    </div>
    <footer><span>Controls for M1: <kbd>↑ ↓ ← →</kbd> move · <kbd>A</kbd> attack · <kbd>Q W E R</kbd> skills</span>
      <span>Gameplay begins in M1.</span></footer>
  </main>`;

const scene = new LobbyScene();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 480,
  backgroundColor: '#15282c',
  pixelArt: true,
  scene: [scene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { keyboard: false, mouse: false, touch: false },
  audio: { noAudio: true },
});

const endpoint = import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:2567';
const client = new Client(endpoint);
let room: Room<MatchRoom> | undefined;
let sequence = 0;
const form = element<HTMLFormElement>('#join-form');
const status = element('#status');
const checkButton = element<HTMLButtonElement>('#check');
const leaveButton = element<HTMLButtonElement>('#leave');

function controls(connected: boolean, busy = false): void {
  for (const field of form.querySelectorAll<
    HTMLInputElement | HTMLButtonElement
  >('input, button')) {
    field.disabled = connected || busy;
  }
  checkButton.disabled = !connected;
  leaveButton.disabled = !connected;
}

function showRoster(entries: RosterEntry[]): void {
  element('#players').replaceChildren(
    ...entries.map((player) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = `${player.nickname}${player.id === room?.sessionId ? ' (you)' : ''}`;
      const count = document.createElement('span');
      count.className = 'muted';
      count.textContent = `Checks: ${player.checks}`;
      li.append(name, count);
      return li;
    }),
  );
  element('#empty').hidden = entries.length > 0;
  element('#player-count').textContent =
    `${entries.length} / ${lobbyConfig.maxPlayers}`;
  scene.setRoster(entries);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void connect(event.submitter?.id === 'join');
});

async function connect(joinExisting: boolean): Promise<void> {
  if (room) return;
  const parsed = joinOptionsSchema.safeParse({
    nickname: element<HTMLInputElement>('#nickname').value,
    protocolVersion: PROTOCOL_VERSION,
  });
  const roomId = element<HTMLInputElement>('#room-id').value.trim();
  if (!parsed.success) {
    status.textContent = `Enter a nickname of 1–${lobbyConfig.nicknameMaxLength} letters, numbers or simple punctuation.`;
    return;
  }
  if (joinExisting && !roomId) {
    status.textContent = 'Enter a room ID to join.';
    return;
  }
  controls(false, true);
  status.textContent = 'Connecting…';
  try {
    const joined = joinExisting
      ? await client.joinById<MatchRoom>(roomId, parsed.data)
      : await client.create<MatchRoom>(MATCH_ROOM, parsed.data);
    // Provisional M0 policy: disconnect removes the seat; rejoin explicitly.
    joined.reconnection.enabled = false;
    room = joined;
    sequence = 0;
    element('#current-room').textContent = joined.roomId;
    status.textContent = 'Connected';
    element('#ack').textContent =
      'Check the connection to update the shared roster.';
    controls(true);
    const refresh = (state: LobbyState): void => {
      if (room !== joined || !state.players) return;
      if (state.protocolVersion !== PROTOCOL_VERSION) {
        status.textContent =
          'Protocol mismatch. Reload with the current client.';
        void joined.leave();
        return;
      }
      const entries: RosterEntry[] = [];
      state.players.forEach((player, id) =>
        entries.push({ id, nickname: player.nickname, checks: player.checks }),
      );
      showRoster(entries);
    };
    joined.onStateChange(refresh);
    joined.onMessage('connection-ack', (payload: unknown) => {
      const ack = connectionAckSchema.safeParse(payload);
      element('#ack').textContent = ack.success
        ? `Server acknowledged check #${ack.data.sequence}. Count: ${ack.data.checks}.`
        : 'Server sent an incompatible acknowledgement.';
    });
    joined.onError((code, message) => {
      status.textContent = `Connection error ${code}: ${message}`;
    });
    joined.onLeave((code) => {
      if (room !== joined) return;
      room = undefined;
      status.textContent = `Disconnected (${code}). Create or join a room to return.`;
      element('#current-room').textContent = '—';
      element('#ack').textContent = 'Waiting for a connection.';
      controls(false);
      showRoster([]);
    });
    if (joined.state) refresh(joined.state);
  } catch (error: unknown) {
    status.textContent = `Could not connect: ${error instanceof Error ? error.message : 'unknown error'}`;
    controls(false);
  }
}

checkButton.addEventListener('click', () => {
  if (!room) return;
  const message: ConnectionCheck = {
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++sequence,
  };
  room.send('connection-check', message);
});
leaveButton.addEventListener('click', () => {
  void room?.leave();
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void room?.leave();
    game.destroy(true);
  });
}
