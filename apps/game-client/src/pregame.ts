import { schools } from '@volam/game-data';
import type { LobbyState, LobbyAction } from '@volam/game-protocol';
import './pregame.css';

interface RoomListing {
  roomId: string;
  clients: number;
  maxClients: number;
  locked: boolean;
  phase: string;
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export class PreGame {
  readonly node = document.createElement('section');
  nickname = '';
  private screen = 'landing';
  private roomId = '';
  private session = '';
  private state: LobbyState | undefined;
  private rows: RoomListing[] = [];
  private busy = false;
  private notice = '';
  private rosterKey = '';
  private refreshTimer: number;
  onConnect: (nickname: string, roomId?: string) => void = () => {};
  onLeave: () => void = () => {};
  onAction: (action: LobbyAction) => void = () => {};
  constructor(private endpoint: string) {
    this.node.id = 'pregame';
    this.node.setAttribute('aria-label', 'Pre-game');
    document.querySelector('#viewport')!.append(this.node);
    document.querySelector<HTMLElement>('#lobby')!.hidden = true;
    this.node.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!button || button.disabled) return;
      const action = button.dataset['action'];
      if (action === 'browser') {
        this.screen = 'browser';
        this.notice = '';
        this.render();
        void this.refresh();
      }
      if (action === 'back') {
        this.screen = 'landing';
        this.render();
      }
      if (action === 'refresh') void this.refresh();
      if (action === 'create') this.connect();
      if (action === 'join') this.connect(button.dataset['room']);
      if (action === 'leave') this.onLeave();
      if (action === 'start') this.onAction({ action: 'start' });
      if (action === 'school') {
        const school = schools.find((s) => s.id === button.dataset['school']);
        if (school) this.onAction({ action: 'select', schoolId: school.id });
      }
      if (action === 'confirm') this.onAction({ action: 'confirm' });
    });
    this.node.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      if (form.id === 'landing-form') {
        const input = form.querySelector<HTMLInputElement>('input')!;
        this.nickname = input.value.normalize('NFC').trim();
        if (!this.nickname) {
          this.notice = 'Enter a nickname.';
          this.render();
          return;
        }
        this.screen = 'browser';
        this.render();
        void this.refresh();
      } else {
        const code = form
          .querySelector<HTMLInputElement>('input')!
          .value.trim();
        if (code) this.connect(code);
        else {
          this.notice = 'Enter a room code.';
          this.render();
        }
      }
    });
    this.refreshTimer = window.setInterval(() => {
      if (this.screen === 'browser' && !this.node.hidden) void this.refresh();
    }, 3000);
    this.render();
  }
  private connect(id?: string) {
    this.busy = true;
    this.notice = 'Connecting…';
    this.render();
    this.onConnect(this.nickname, id);
  }
  fail(message: string) {
    this.busy = false;
    this.notice = message;
    this.render();
  }
  update(state: LobbyState, id: string, session: string) {
    // Live match ticks must not replace focused school controls every 33 ms.
    const rosterKey = JSON.stringify([
      state.phase,
      id,
      session,
      [...state.players].map(([playerId, p]) => [
        playerId,
        p.nickname,
        p.schoolId,
        p.confirmed,
        p.connected,
      ]),
    ]);
    const changed = this.busy || rosterKey !== this.rosterKey;
    this.rosterKey = rosterKey;
    if (this.busy || this.state?.phase !== state.phase) this.notice = '';
    this.state = state;
    this.roomId = id;
    this.session = session;
    this.busy = false;
    const choosing =
      state.phase === 'IN_GAME' && !state.players.get(session)?.confirmed;
    this.node.hidden =
      (state.phase === 'IN_GAME' && !choosing) || state.phase === 'DEFEAT';
    this.screen = choosing ? 'SCHOOL_SELECTION' : state.phase;
    if (changed) this.render();
  }
  disconnected(message: string) {
    this.state = undefined;
    this.roomId = '';
    this.screen = 'browser';
    this.node.hidden = false;
    this.busy = false;
    this.notice = message;
    this.render();
    void this.refresh();
  }
  private async refresh() {
    try {
      const response = await fetch(`${this.endpoint}/rooms`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error('Room list unavailable');
      this.rows = (await response.json()) as RoomListing[];
      if (this.notice.startsWith('Room list')) this.notice = '';
    } catch {
      this.notice = 'Room list unavailable. Check connection and retry.';
    }
    if (this.screen === 'browser' && document.activeElement?.id !== 'pre-code')
      this.render();
  }
  private render() {
    if (this.node.hidden) return;
    const button = (text: string, action: string, disabled = false) =>
      `<button type="button" data-action="${action}" ${disabled ? 'disabled' : ''}>${text}</button>`;
    let content = '';
    let title = '';
    if (this.screen === 'landing') {
      this.node.classList.add('landing');
      this.node.innerHTML = `<div class="brand"><h1>Võ Lâm</h1><h2>HERO DEFENSE</h2></div><section class="pre-window landing-window"><form id="landing-form"><label class="sr-only" for="pre-nickname">Nickname</label><input id="pre-nickname" name="nickname" maxlength="20" autocomplete="off" required placeholder="NICKNAME" value="${escape(this.nickname)}"/><button>Enter Game</button></form><p role="status">${escape(this.notice)}</p></section>`;
      return;
    }
    this.node.classList.remove('landing');
    if (this.screen === 'browser') {
      title = 'Room Browser';
      content = `<div class="room-scroll"><table><thead><tr><th>Room / code</th><th>Players</th><th>Status</th><th></th></tr></thead><tbody>${this.rows.map((r) => `<tr><td>${escape(r.roomId)}</td><td>${r.clients}/${r.maxClients}</td><td>${escape(r.phase)}</td><td><button data-action="join" data-room="${escape(r.roomId)}" ${this.busy || r.locked || r.clients >= r.maxClients || !['WAITING_LOBBY', 'SCHOOL_SELECTION', 'IN_GAME'].includes(r.phase) ? 'disabled' : ''}>Join</button></td></tr>`).join('')}</tbody></table>${this.rows.length ? '' : '<p class="empty">No rooms yet. Create the first room.</p>'}</div><div class="pre-actions">${button('Back', 'back', this.busy)}${button('Refresh', 'refresh', this.busy)}${button('Create room', 'create', this.busy)}</div><form id="code-form"><label class="sr-only" for="pre-code">Room code</label><input id="pre-code" placeholder="ROOM CODE" autocomplete="off"/><button ${this.busy ? 'disabled' : ''}>Join by code</button></form>`;
    } else if (this.state) {
      const state = this.state;
      const players = [...state.players.entries()];
      const self = state.players.get(this.session);
      const host = state.players.get(state.hostId);
      const hostHere = !!host?.connected;
      const list = `<ul class="pre-players">${players.map(([id, p]) => `<li><strong>${escape(p.nickname)}</strong><span>${id === state.hostId ? '♛ Host · ' : ''}${!p.connected ? 'Disconnected' : p.confirmed ? 'Confirmed' : ['SCHOOL_SELECTION', 'IN_GAME'].includes(state.phase) ? 'Choosing…' : 'Connected'}${p.schoolId ? ' · ' + escape(schools.find((s) => s.id === p.schoolId)?.name ?? '') : ''}</span></li>`).join('')}</ul>`;
      if (state.phase === 'WAITING_LOBBY') {
        title = 'Waiting Lobby';
        content = `<p class="pre-room">Room ${escape(this.roomId)} · ${players.length}/6 players</p><div class="parchment">${list}</div><p>${hostHere ? 'The host starts school selection.' : 'Host disconnected. Leave and recreate this room; host transfer is unresolved.'}</p><div class="pre-actions">${button('Start Game', 'start', this.session !== state.hostId || !hostHere)}${button('Leave room', 'leave')}</div>`;
      } else {
        title = 'School Selection';
        content = `<p class="pre-room">Room ${escape(this.roomId)} · <strong data-testid="selection-ready">${players.filter(([, p]) => p.connected && p.confirmed).length}/${players.length} Ready</strong></p><div class="school-grid">${schools.map((s) => `<button type="button" class="school-card ${self?.schoolId === s.id ? 'selected' : ''}" data-action="school" data-school="${s.id}" aria-pressed="${self?.schoolId === s.id}" ${self?.confirmed ? 'disabled' : ''}><h3>${s.name}</h3><div role="img" aria-label="${s.name} portrait" class="school-portrait ${s.portrait}"></div><span class="element">${s.element}</span><p>${s.description}</p><p>${s.style}</p><p>${s.attributes}</p><p><b>${s.passive}</b></p><small>${s.basics}</small><small>${s.starting}</small></button>`).join('')}</div><p class="pre-note">Level 1 · 1 skill point · Same-school selections allowed. School starting attributes and skill sets are awaiting final design values.</p>${list}<div class="pre-actions">${button(self?.confirmed ? 'Selection confirmed' : 'Confirm Selection', 'confirm', !self?.schoolId || !!self?.confirmed)}${button('Leave room', 'leave')}</div>${players.some(([, p]) => !p.connected) ? '<p class="pre-warning">Selection paused: a participant disconnected. No automatic school or timeout is applied. Leave and recreate the room.</p>' : ''}`;
      }
    }
    this.node.innerHTML = `<section class="pre-window ${this.screen === 'SCHOOL_SELECTION' ? 'school-window' : ''}"><h1 class="pre-title">${title}</h1>${content}<p class="pre-error" role="status" aria-live="polite">${escape(this.notice)}</p></section>`;
  }
  destroy() {
    window.clearInterval(this.refreshTimer);
    this.node.remove();
  }
}
