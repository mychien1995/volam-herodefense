import { m1Config, schools } from '@volam/game-data';
import { schoolCards, branchCards } from './school-selection.js';
import type { LobbyState, LobbyAction } from '@volam/game-protocol';
import './pregame.css';
import { guide, guideTabs, type GuideTab } from './pregame-guide.js';
import type { Preferences } from './preferences.js';
import { bindSettings, settingsControls } from './settings-controls.js';
import './pregame-guide.css';
import { creepPreviewRequested } from './creep-preview.js';

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
  portalCount: 1 | 2 | 3 | 4 = 4;
  private screen = 'home';
  private guideTab: GuideTab = 'campaign';
  private guideSchool = schools[0].id as string;
  private guideBoss = 'dong-ta';
  private roomId = '';
  private session = '';
  private state: LobbyState | undefined;
  private rows: RoomListing[] = [];
  private busy = false;
  private artLoading = false;
  private notice = '';
  private controlsKey = '';
  private selectionKey = '';
  private rosterKey = '';
  private branchSchool = '';
  private refreshTimer: number;
  onConnect: (nickname: string, roomId?: string) => void = () => {};
  onLeave: () => void = () => {};
  onLoiDai: () => void = () => {};
  onPractice: () => void = () => {};
  openHome(): void {
    this.node.hidden = false;
    this.showHome();
  }
  onSettings: (key: keyof Preferences) => void = () => {};
  onAction: (action: LobbyAction) => void = () => {};
  constructor(private endpoint: string) {
    if (creepPreviewRequested) this.nickname = 'Preview Creep';
    this.node.id = 'pregame';
    this.node.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      if (select.id === 'pre-portals')
        this.portalCount = Number(select.value) as 1 | 2 | 3 | 4;
      if (select.id === 'guide-school') {
        this.guideSchool = select.value;
        this.render();
        this.node.querySelector<HTMLElement>('#guide-school')?.focus();
      }
      if (select.id === 'guide-boss') {
        this.guideBoss = select.value;
        this.render();
        this.node.querySelector<HTMLElement>('#guide-boss')?.focus();
      }
    });
    this.node.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        ['guide', 'settings', 'landing'].includes(this.screen)
      ) {
        event.preventDefault();
        this.showHome();
        return;
      }
      if (
        !(event.target instanceof HTMLElement) ||
        event.target.getAttribute('role') !== 'tab'
      )
        return;
      const current = guideTabs.findIndex(([id]) => id === this.guideTab);
      const next = {
        ArrowRight: (current + 1) % 3,
        ArrowLeft: (current + 2) % 3,
        Home: 0,
        End: 2,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      this.showGuideTab(guideTabs[next]![0]);
    });
    this.node.setAttribute('aria-label', 'Trước trận');
    document.querySelector('#viewport')!.append(this.node);
    document.querySelector<HTMLElement>('#lobby')!.hidden = true;
    this.node.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!button || button.disabled) return;
      const action = button.dataset['action'];
      if (action === 'home') this.showHome();
      if (action === 'standalone-loi-dai') this.onLoiDai();
      if (action === 'practice') this.onPractice();
      if (action === 'play') {
        this.screen = 'landing';
        this.render();
        this.node.querySelector<HTMLElement>('#pre-nickname')?.focus();
      }
      if (action === 'guide' || action === 'settings') {
        this.screen = action;
        this.render();
        this.node.querySelector<HTMLElement>('.pre-title')?.focus();
      }
      if (action === 'guide-tab') {
        const tab = guideTabs.find(([id]) => id === button.dataset['tab']);
        if (tab) this.showGuideTab(tab[0]);
      }
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
        if (!school) return;
        if (this.state?.requiresBranch) {
          this.branchSchool = school.id;
          this.render();
        }
        if (this.state?.players.get(this.session)?.schoolId !== school.id)
          this.onAction({ action: 'select', schoolId: school.id });
      }
      if (action === 'close-branches') this.closeBranches();
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
  private showHome(): void {
    const previous = this.screen;
    this.screen = 'home';
    this.render();
    const action = previous === 'landing' ? 'play' : previous;
    this.node.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus();
  }
  private showGuideTab(tab: GuideTab): void {
    this.guideTab = tab;
    this.render();
    this.node.querySelector<HTMLElement>('#guide-tab-' + tab)?.focus();
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
  setArtLoading(loading: boolean) {
    if (this.artLoading === loading) return;
    this.artLoading = loading;
    if (this.screen === 'SCHOOL_SELECTION') this.renderSelectionControls();
    else this.render();
  }
  update(state: LobbyState, id: string, session: string) {
    const self = state.players.get(session);
    const host = state.players.get(state.hostId);
    const choosing = state.phase === 'IN_GAME' && !self?.confirmed;
    const screen = choosing ? 'SCHOOL_SELECTION' : state.phase;
    // Peer acknowledgements update the roster without replacing local controls.
    // A patch between pointer-down and pointer-up must keep that button mounted.
    const controlsKey = JSON.stringify([
      id,
      session,
      screen,
      state.requiresBranch,
      self?.confirmed,
      state.hostId,
      host?.connected,
    ]);
    const selectionKey = JSON.stringify([self?.schoolId, self?.selectedBranch]);
    const selectionChanged = this.selectionKey !== selectionKey;
    this.selectionKey = selectionKey;
    const rosterKey = JSON.stringify(
      [...state.players].map(([playerId, p]) => [
        playerId,
        p.nickname,
        p.schoolId,
        p.confirmed,
        p.connected,
      ]),
    );
    const redraw =
      this.busy || this.screen !== screen || controlsKey !== this.controlsKey;
    const rosterChanged = rosterKey !== this.rosterKey;
    if (this.busy || this.screen !== screen) this.notice = '';
    this.controlsKey = controlsKey;
    this.rosterKey = rosterKey;
    this.state = state;
    this.roomId = id;
    this.session = session;
    this.busy = false;
    const hide =
      (state.phase === 'IN_GAME' && !choosing) || state.phase === 'DEFEAT';
    if (hide) this.closeDialog();
    this.node.hidden = hide;
    this.screen = screen;
    if (screen !== 'SCHOOL_SELECTION' || self?.confirmed)
      this.branchSchool = '';
    if (redraw) this.render();
    else {
      if (selectionChanged) this.renderSelectionControls();
      if (rosterChanged) this.renderRoster();
    }
  }
  private renderSelectionControls(): void {
    if (this.node.hidden || this.screen !== 'SCHOOL_SELECTION') return;
    const self = this.state?.players.get(this.session);
    for (const card of this.node.querySelectorAll<HTMLButtonElement>(
      '.school-card',
    )) {
      const chosen = card.dataset['school'] === self?.schoolId;
      card.classList.toggle('selected', chosen);
      card.setAttribute('aria-pressed', String(chosen));
    }
    const schoolAcknowledged = this.branchSchool === self?.schoolId;
    for (const branch of this.node.querySelectorAll<HTMLButtonElement>(
      '[data-branch]',
    )) {
      branch.disabled =
        !schoolAcknowledged || !!self?.confirmed || this.artLoading;
      branch.setAttribute(
        'aria-pressed',
        String(
          schoolAcknowledged &&
            branch.dataset['branch'] === self?.selectedBranch,
        ),
      );
    }
    const confirm = this.node.querySelector<HTMLButtonElement>(
      '[data-action="confirm"]',
    );
    if (!confirm) return;
    const needBranch =
      this.state?.requiresBranch &&
      (!schoolAcknowledged || !self?.selectedBranch);
    confirm.disabled =
      this.artLoading || !!self?.confirmed || !self?.schoolId || !!needBranch;
    confirm.textContent = self?.confirmed
      ? 'Đã xác nhận'
      : this.artLoading
        ? 'Đang tải hình ảnh…'
        : 'Xác nhận';
  }
  private renderRoster() {
    if (this.node.hidden || !this.state) return;
    const state = this.state;
    const players = [...state.players];
    const list = this.node.querySelector('.pre-players');
    if (!list) return;
    const selecting =
      state.phase === 'SCHOOL_SELECTION' || state.phase === 'IN_GAME';
    list.innerHTML = players
      .map(([id, p]) => {
        const school = schools.find((s) => s.id === p.schoolId);
        const status = !p.connected
          ? 'Mất kết nối'
          : p.confirmed
            ? 'Đã xác nhận'
            : selecting
              ? 'Đang chọn…'
              : 'Connected';
        return `<li><strong>${escape(p.nickname)}</strong><span>${id === state.hostId ? '♛ Host · ' : ''}${status}${school ? ' · ' + escape(school.name) : ''}</span></li>`;
      })
      .join('');
    const seats = this.node.querySelector('.pre-seat-count');
    if (seats) seats.textContent = String(players.length);
    const ready = this.node.querySelector('[data-testid="selection-ready"]');
    if (ready) {
      const count = players.filter(
        ([, p]) => p.connected && p.confirmed,
      ).length;
      ready.textContent = `${count}/${players.length} đã sẵn sàng`;
    }
    const warning = this.node.querySelector<HTMLElement>('.pre-warning');
    if (warning) warning.hidden = players.every(([, p]) => p.connected);
  }

  disconnected(message: string) {
    this.artLoading = false;
    this.branchSchool = '';
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
    const before = JSON.stringify([this.rows, this.notice]);
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
    if (
      this.screen === 'browser' &&
      !this.busy &&
      !['pre-code', 'pre-portals'].includes(document.activeElement?.id ?? '') &&
      before !== JSON.stringify([this.rows, this.notice])
    )
      this.render();
  }
  private closeDialog(): void {
    this.node.querySelector<HTMLDialogElement>('.branch-dialog[open]')?.close();
  }

  private closeBranches(): void {
    const school = this.branchSchool;
    this.branchSchool = '';
    this.render();
    this.node
      .querySelector<HTMLButtonElement>(`[data-school="${school}"]`)
      ?.focus();
  }

  private render() {
    if (this.node.hidden) return;
    const active =
      document.activeElement instanceof HTMLButtonElement
        ? document.activeElement.dataset
        : undefined;
    this.closeDialog();
    const button = (text: string, action: string, disabled = false) =>
      `<button type="button" data-action="${action}" ${disabled ? 'disabled' : ''}>${text}</button>`;
    let content = '';
    let title = '';
    const brand =
      '<div class="brand"><h1>Võ Lâm</h1><h2>ANH HÙNG THỦ THÀNH</h2></div>';
    if (this.screen === 'home') {
      this.node.classList.add('landing');
      this.node.innerHTML = `${brand}<nav class="pre-home" aria-label="Menu chính">${button('Vào game', 'play')}${button('Lôi Đài', 'standalone-loi-dai')}${button('Phòng test', 'practice')}${button('Hướng dẫn', 'guide')}${button('Cài đặt', 'settings')}</nav>`;
      return;
    }
    if (this.screen === 'guide' || this.screen === 'settings') {
      this.node.classList.remove('landing');
      const instructions = this.screen === 'guide';
      this.node.innerHTML = `<section class="pre-window pre-book ${instructions ? 'guide-book' : 'settings-book'}">
        <h1 class="pre-title" tabindex="-1">${instructions ? 'Hướng dẫn' : 'Cài đặt'}</h1>
        ${instructions ? guide(this.guideTab, this.guideSchool, this.guideBoss) : settingsControls('pre', true)}
        <div class="book-actions">${button('Quay lại', 'home')}</div>
      </section>`;
      if (!instructions) bindSettings(this.node, 'pre', this.onSettings);
      return;
    }
    if (this.screen === 'landing') {
      this.node.classList.add('landing');
      this.node.innerHTML = `${brand}<section class="pre-window landing-window"><form id="landing-form"><label class="sr-only" for="pre-nickname">Biệt danh</label><input id="pre-nickname" name="nickname" maxlength="20" autocomplete="off" required placeholder="BIỆT DANH" value="${escape(this.nickname)}"/><button>Vào game</button></form><p role="status">${escape(this.notice)}</p></section>`;
      if (creepPreviewRequested)
        this.node.querySelector('[role="status"]')!.textContent =
          this.notice ||
          'Preview từng creep · Tạo phòng, chọn phái rồi dùng bộ chọn trong sân test.';
      return;
    }
    this.node.classList.remove('landing');
    if (this.screen === 'browser') {
      title = 'Danh sách phòng';
      content = `<div class="room-scroll"><table><thead><tr><th>Phòng / Mã</th><th>Người chơi</th><th>Trạng thái</th><th></th></tr></thead><tbody>${this.rows.map((r) => `<tr><td>${escape(r.roomId)}</td><td>${r.clients}/${r.maxClients}</td><td>${escape(({ WAITING_LOBBY: 'Đang chờ', SCHOOL_SELECTION: 'Chọn phái', IN_GAME: 'Trong trận', DEFEAT: 'Đã kết thúc' } as Record<string, string>)[r.phase] ?? 'Không khả dụng')}</td><td><button data-action="join" data-room="${escape(r.roomId)}" ${this.busy || r.locked || r.clients >= r.maxClients || !['WAITING_LOBBY', 'SCHOOL_SELECTION', 'IN_GAME'].includes(r.phase) ? 'disabled' : ''}>Vào phòng</button></td></tr>`).join('')}</tbody></table>${this.rows.length ? '' : '<p class="empty">Chưa có phòng. Hãy tạo phòng đầu tiên.</p>'}</div><div class="pre-actions">${button('Quay lại', 'back', this.busy)}${button('Làm mới', 'refresh', this.busy)}${button('Tạo phòng', 'create', this.busy)}</div><form id="code-form"><label class="sr-only" for="pre-code">Mã phòng</label><input id="pre-code" placeholder="MÃ PHÒNG" autocomplete="off"/><button ${this.busy ? 'disabled' : ''}>Vào bằng mã</button></form>`;
      content =
        `<label class="pre-gates" for="pre-portals">Cổng xâm lăng khi tạo phòng <select id="pre-portals" ${this.busy ? 'disabled' : ''}>${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === this.portalCount ? 'selected' : ''}>${n} cổng${n === 1 ? ' · Phải' : n === 2 ? ' · Trái / Phải' : n === 3 ? ' · Thêm Bắc' : ' · Bốn hướng'}</option>`).join('')}</select></label><p class="pre-note">Quái tràn trong 60 giây mỗi đợt · Đợt mới mỗi 3 phút.</p>` +
        content;
    } else if (this.state) {
      const state = this.state;
      const self = state.players.get(this.session);
      const host = state.players.get(state.hostId);
      const hostHere = !!host?.connected;
      const list = '<ul class="pre-players"></ul>';
      if (state.phase === 'WAITING_LOBBY') {
        title = 'Phòng chờ';
        content = `<p class="pre-room">Phòng ${escape(this.roomId)} · <span class="pre-seat-count"></span>/6 người chơi · ${state.defense.portalCount} cổng${state.defense.devCreepTest ? ' · TEST CREEP' : ''}</p><div class="parchment">${list}</div><p>${hostHere ? 'Host bắt đầu để mọi người chọn phái.' : 'Host đã mất kết nối. Hãy rời và tạo phòng mới.'}</p><div class="pre-actions">${button('Bắt đầu', 'start', this.session !== state.hostId || !hostHere)}${button('Rời phòng', 'leave')}</div>`;
      } else {
        title = 'Chọn môn phái';
        const dialogSchool = schools.find(
          (school) => school.id === this.branchSchool,
        );
        const branches =
          dialogSchool && state.requiresBranch
            ? (m1Config.progression?.schools[dialogSchool.id]?.basicIds ?? [])
            : [];
        const confirmLabel = self?.confirmed
          ? 'Đã xác nhận'
          : this.artLoading
            ? 'Đang tải hình ảnh…'
            : 'Xác nhận';
        const confirmedSchool = dialogSchool?.id === self?.schoolId;
        const popup =
          dialogSchool && branches.length && !self?.confirmed
            ? `<dialog class="branch-dialog" aria-labelledby="branch-title">
              <h2 id="branch-title">${dialogSchool.name} · Chọn hệ phái</h2>
              <p>${dialogSchool.style}</p>
              <div class="branch-list" role="group" aria-label="Hệ phái">
${branchCards(dialogSchool, confirmedSchool ? self?.selectedBranch : '', confirmedSchool)}
              </div>
              <div class="pre-actions">${button('Đổi môn phái', 'close-branches')}${button(confirmLabel, 'confirm', this.artLoading || !confirmedSchool || !self?.selectedBranch)}</div>
            </dialog>`
            : '';
        content = `<p class="pre-room">Phòng ${escape(this.roomId)} · <strong data-testid="selection-ready"></strong></p><div class="school-grid">${schoolCards(self?.schoolId, !!self?.confirmed, state.requiresBranch)}</div>${list}<div class="pre-actions">${button('Rời phòng', 'leave')}${state.requiresBranch ? '' : button(confirmLabel, 'confirm', this.artLoading || !self?.schoolId || !!self?.confirmed)}</div><p class="pre-warning" hidden>Đang chờ người chơi mất kết nối. Bạn có thể rời và tạo phòng mới.</p>${popup}`;
      }
    }
    if (this.state?.devSkillLoadout)
      content = content.replace(
        'Cấp 1 · Tự học kỹ năng theo Q → W → E → R',
        'Test · Cấp 30 · Tối đa kỹ năng · Không hồi chiêu',
      );
    this.node.innerHTML = `<section class="pre-window ${this.screen === 'SCHOOL_SELECTION' ? 'school-window' : ''}"><h1 class="pre-title">${title}</h1>${content}<p class="pre-error" role="status" aria-live="polite">${escape(this.notice)}</p></section>`;
    this.renderRoster();
    this.renderSelectionControls();
    const dialog = this.node.querySelector<HTMLDialogElement>('.branch-dialog');
    dialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.closeBranches();
    });
    if (dialog) {
      dialog.showModal();
      const focus = active?.['branch']
        ? dialog.querySelector<HTMLButtonElement>(
            `[data-branch="${active['branch']}"]`,
          )
        : active?.['action'] === 'confirm'
          ? dialog.querySelector<HTMLButtonElement>('[data-action="confirm"]')
          : undefined;
      if (focus && !focus.disabled) focus.focus();
    }
  }
  destroy() {
    window.clearInterval(this.refreshTimer);
    this.closeDialog();
    this.node.remove();
  }
}
