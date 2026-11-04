import { m1Config, schools } from '@volam/game-data';
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
    this.node.setAttribute('aria-label', 'Trước trận');
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
      if (action === 'branch' && button.dataset['branch'])
        this.onAction({ action: 'branch', basicId: button.dataset['branch'] });
      if (action === 'confirm') this.onAction({ action: 'confirm' });
    });
    this.node.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      if (form.id === 'landing-form') {
        const input = form.querySelector<HTMLInputElement>('input')!;
        this.nickname = input.value.normalize('NFC').trim();
        if (!this.nickname) {
          this.notice = 'Hãy nhập biệt danh.';
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
          this.notice = 'Hãy nhập mã phòng.';
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
    this.notice = 'Đang kết nối…';
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
      state.requiresBranch,
      id,
      session,
      [...state.players].map(([playerId, p]) => [
        playerId,
        p.nickname,
        p.schoolId,
        p.selectedBranch,
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
      if (!response.ok) throw new Error('Không tải được danh sách phòng');
      this.rows = (await response.json()) as RoomListing[];
      if (this.notice.startsWith('Không tải được danh sách phòng'))
        this.notice = '';
    } catch {
      this.notice =
        'Không tải được danh sách phòng. Hãy kiểm tra kết nối và thử lại.';
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
      this.node.innerHTML = `<div class="brand"><h1>Võ Lâm</h1><h2>ANH HÙNG THỦ THÀNH</h2></div><section class="pre-window landing-window"><form id="landing-form"><label class="sr-only" for="pre-nickname">Biệt danh</label><input id="pre-nickname" name="nickname" maxlength="20" autocomplete="off" required placeholder="BIỆT DANH" value="${escape(this.nickname)}"/><button>Vào game</button></form><p role="status">${escape(this.notice)}</p></section>`;
      return;
    }
    this.node.classList.remove('landing');
    if (this.screen === 'browser') {
      title = 'Danh sách phòng';
      content = `<div class="room-scroll"><table><thead><tr><th>Phòng / Mã</th><th>Người chơi</th><th>Trạng thái</th><th></th></tr></thead><tbody>${this.rows.map((r) => `<tr><td>${escape(r.roomId)}</td><td>${r.clients}/${r.maxClients}</td><td>${escape(({ WAITING_LOBBY: 'Đang chờ', SCHOOL_SELECTION: 'Chọn phái', IN_GAME: 'Trong trận', DEFEAT: 'Đã kết thúc' } as Record<string, string>)[r.phase] ?? 'Không khả dụng')}</td><td><button data-action="join" data-room="${escape(r.roomId)}" ${this.busy || r.locked || r.clients >= r.maxClients || !['WAITING_LOBBY', 'SCHOOL_SELECTION', 'IN_GAME'].includes(r.phase) ? 'disabled' : ''}>Vào phòng</button></td></tr>`).join('')}</tbody></table>${this.rows.length ? '' : '<p class="empty">Chưa có phòng. Hãy tạo phòng đầu tiên.</p>'}</div><div class="pre-actions">${button('Quay lại', 'back', this.busy)}${button('Làm mới', 'refresh', this.busy)}${button('Tạo phòng', 'create', this.busy)}</div><form id="code-form"><label class="sr-only" for="pre-code">Mã phòng</label><input id="pre-code" placeholder="MÃ PHÒNG" autocomplete="off"/><button ${this.busy ? 'disabled' : ''}>Vào bằng mã</button></form>`;
    } else if (this.state) {
      const state = this.state;
      const players = [...state.players.entries()];
      const self = state.players.get(this.session);
      const host = state.players.get(state.hostId);
      const hostHere = !!host?.connected;
      const list = `<ul class="pre-players">${players.map(([id, p]) => `<li><strong>${escape(p.nickname)}</strong><span>${id === state.hostId ? '♛ Host · ' : ''}${!p.connected ? 'Mất kết nối' : p.confirmed ? 'Đã xác nhận' : ['SCHOOL_SELECTION', 'IN_GAME'].includes(state.phase) ? 'Đang chọn…' : 'Connected'}${p.schoolId ? ' · ' + escape(schools.find((s) => s.id === p.schoolId)?.name ?? '') : ''}</span></li>`).join('')}</ul>`;
      if (state.phase === 'WAITING_LOBBY') {
        title = 'Phòng chờ';
        content = `<p class="pre-room">Phòng ${escape(this.roomId)} · ${players.length}/6 người chơi</p><div class="parchment">${list}</div><p>${hostHere ? 'Host bắt đầu để mọi người chọn phái.' : 'Host đã mất kết nối. Hãy rời và tạo phòng mới.'}</p><div class="pre-actions">${button('Bắt đầu', 'start', this.session !== state.hostId || !hostHere)}${button('Rời phòng', 'leave')}</div>`;
      } else {
        title = 'Chọn môn phái';
        const branches =
          self && state.requiresBranch
            ? (m1Config.progression?.schools[self.schoolId]?.basicIds ?? [])
            : [];
        const branchButtons = branches.length
          ? '<div class="pre-actions pre-branches" role="group" aria-label="Nhánh võ học">' +
            branches
              .map(
                (id) =>
                  '<button type="button" data-action="branch" data-branch="' +
                  id +
                  '" aria-pressed="' +
                  (self?.selectedBranch === id) +
                  '"' +
                  (self?.confirmed ? ' disabled' : '') +
                  '>' +
                  m1Config.progression!.defaultBranches![id]!.style +
                  '</button>',
              )
              .join('') +
            '</div>'
          : '';
        content = `<p class="pre-room">Phòng ${escape(this.roomId)} · <strong data-testid="selection-ready">${players.filter(([, p]) => p.connected && p.confirmed).length}/${players.length} đã sẵn sàng</strong></p><div class="school-grid">${schools.map((s) => `<button type="button" class="school-card ${self?.schoolId === s.id ? 'selected' : ''}" data-action="school" data-school="${s.id}" aria-pressed="${self?.schoolId === s.id}" ${self?.confirmed ? 'disabled' : ''}><h3>${s.name}</h3><div role="img" aria-label="${s.name} — chân dung" class="school-portrait ${s.portrait}"></div><span class="element">${s.element}</span><p>${s.description}</p><small>${s.basics}</small></button>`).join('')}</div>${branchButtons}<p class="pre-note">${state.requiresBranch ? 'Chọn một môn phái và một nhánh. Dùng dấu + trên thanh Q W E R T để học chiêu.' : 'Cấp 1 · Có thể chọn trùng phái.'}</p>${list}<div class="pre-actions">${button('Rời phòng', 'leave')}${button(self?.confirmed ? 'Đã xác nhận' : 'Xác nhận', 'confirm', !self?.schoolId || (state.requiresBranch && !self.selectedBranch) || !!self?.confirmed)}</div>${players.some(([, p]) => !p.connected) ? '<p class="pre-warning">Đang chờ người chơi mất kết nối. Không tự chọn phái hoặc bắt đầu trận. Bạn có thể rời và tạo phòng mới.</p>' : ''}`;
      }
    }
    this.node.innerHTML = `<section class="pre-window ${this.screen === 'SCHOOL_SELECTION' ? 'school-window' : ''}"><h1 class="pre-title">${title}</h1>${content}<p class="pre-error" role="status" aria-live="polite">${escape(this.notice)}</p></section>`;
  }
  destroy() {
    window.clearInterval(this.refreshTimer);
    this.node.remove();
  }
}
