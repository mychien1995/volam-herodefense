import { m1Config, pvpDefinition, pvpMaps, schools } from '@volam/game-data';
import type { LobbyState, PvpAction } from '@volam/game-protocol';
import type { PvpMapId, PvpSnapshot, PvpTeam } from '@volam/game-core';
import './pvp-ui.css';
import { schoolCards, branchCards } from './school-selection.js';
export type PvpRequest = PvpAction extends infer A
  ? A extends PvpAction
    ? Omit<A, 'protocolVersion' | 'sequence'>
    : never
  : never;
export const readPvp = (
  state: LobbyState | undefined,
): PvpSnapshot | undefined => {
  if (!state?.pvp.enabled || !state.pvp.json) return;
  try {
    return JSON.parse(state.pvp.json) as PvpSnapshot;
  } catch {
    return;
  }
};
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const label = (team: PvpTeam) =>
  ({ chinh: 'Chính', ta: 'Tà', spectator: 'Khán giả' })[team];
const branchName = (id: string) =>
  m1Config.basics[id]?.nameVi ?? 'Chưa chọn phái';
const thumb = (id: string) => '/assets/pvp/' + id + '-thumb.png';
const hazardDescription: Record<PvpMapId, string> = {
  hong_moc: 'Võ đài Hồng Mộc không có hiểm họa môi trường.',
  rung_truc:
    'Phi tiêu bay ngẫu nhiên qua võ đài, không có cảnh báo trước. Chú ý né đường bay.',
  dia_nguc:
    'Vùng an toàn thu nhỏ dần; phần núi bên ngoài chìm vào dung nham. Dung nham gây mất máu liên tục; có thể đi hoặc lướt trở lại vùng an toàn.',
  tuong_duong:
    'Tên lửa bay ngẫu nhiên qua võ đài. Quan sát và né đường tên bay.',
  kiem_ho:
    'Độc Cô Cầu Bại bất tử ở giữa hồ: chém nửa võ đài hoặc gọi sét xuống nhiều điểm. Rời vùng cảnh báo trước khi chiêu đánh xuống.',
};
export class PvpUI {
  readonly node = document.createElement('section');
  onAction: (action: PvpRequest) => void = () => {};
  onConnect: (nickname: string, map: PvpMapId, id?: string) => void = () => {};
  onBack: () => void = () => {};
  onLeave: () => void = () => {};
  private view: PvpSnapshot | undefined;
  private state: LobbyState | undefined;
  private session = '';
  private roomId = '';
  private key = '';
  private entry = false;
  private entryId = '';
  private nickname = '';
  private notice = '';
  private settings = false;
  private history = false;
  private characterOpen = false;
  private chosenSchool = '';
  private chosenBranch = '';
  private choicePending = false;
  private dragId = '';
  private previousPhase = '';
  private readonly onKey = (e: KeyboardEvent) => {
    if (
      !this.node.hidden &&
      e.code === 'Escape' &&
      (this.settings || this.history || this.characterOpen)
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.closeOverlay();
    }
  };
  private copied = false;
  private connecting = false;
  constructor() {
    this.node.id = 'pvp-ui';
    this.node.hidden = true;
    this.node.setAttribute('aria-label', 'Lôi Đài');
    document.querySelector('#viewport')!.append(this.node);
    this.node.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>(
        'button[data-pvp]',
      );
      if (!b || b.disabled) return;
      const action = b.dataset['pvp'];
      if (action === 'back') {
        this.entry = false;
        this.node.hidden = true;
        this.onBack();
      }
      if (action === 'character' && this.view?.phase === 'lobby') {
        const self = this.view.members.find((m) => m.id === this.session);
        this.characterOpen = true;
        this.chosenSchool = '';
        this.chosenBranch = self?.branchId ?? '';
        this.choicePending = false;
        this.key = '';
        this.render();
      }
      if (action === 'school' && this.characterOpen && !this.choicePending) {
        this.chosenSchool = b.dataset['school'] ?? '';
        if (
          !m1Config.progression?.schools[this.chosenSchool]?.basicIds.includes(
            this.chosenBranch,
          )
        )
          this.chosenBranch = '';
        this.key = '';
        this.render();
      }
      if (action === 'branch' && this.characterOpen && !this.choicePending) {
        this.chosenBranch = b.dataset['branch'] ?? '';
        this.key = '';
        this.render();
      }
      if (action === 'close-branches') this.closeBranches();
      if (action === 'close-character') this.closeCharacter();
      if (
        action === 'confirm-character' &&
        this.characterOpen &&
        !this.choicePending &&
        this.view?.phase === 'lobby' &&
        m1Config.progression?.schools[this.chosenSchool]?.basicIds.includes(
          this.chosenBranch,
        )
      ) {
        this.choicePending = true;
        this.onAction({
          action: 'choose',
          schoolId: this.chosenSchool as (typeof schools)[number]['id'],
          branchId: this.chosenBranch,
        });
        this.key = '';
        this.render();
      }
      if (action === 'leave') this.onLeave();
      if (action === 'start') this.onAction({ action: 'start' });
      if (action === 'settings') {
        this.settings = true;
        this.key = '';
        this.render();
      }
      if (action === 'close') {
        this.settings = false;
        this.history = false;
        this.key = '';
        this.render();
      }
      if (action === 'map')
        this.onAction({
          action: 'settings',
          mapId: b.dataset['map'] as PvpMapId,
          hazardsEnabled: this.view!.hazardsEnabled,
        });
      if (action === 'share') void this.share();
    });
    this.node.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      if (form.id !== 'pvp-entry-form') return;
      const button = (e as SubmitEvent).submitter as HTMLButtonElement;
      this.nickname = (
        this.node.querySelector<HTMLInputElement>('#pvp-nickname')?.value ?? ''
      ).trim();
      const raw = (
        this.node.querySelector<HTMLInputElement>('#pvp-room-code')?.value ?? ''
      ).trim();
      let id = raw;
      try {
        if (raw.includes('://'))
          id = new URL(raw).searchParams.get('pvp') ?? '';
      } catch {
        id = '';
      }
      const map = (this.node.querySelector<HTMLSelectElement>('#pvp-entry-map')
        ?.value ?? 'hong_moc') as PvpMapId;
      if (button.value === 'join' && !id) {
        this.error('Hãy nhập mã hoặc link phòng.');
        return;
      }
      if (this.connecting) return;
      this.connecting = true;
      this.notice = 'Đang vào phòng…';
      this.renderEntry();
      this.onConnect(
        this.nickname,
        map,
        button.value === 'join' ? id : undefined,
      );
    });
    this.node.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.dataset['assign'])
        this.onAction({
          action: 'assign',
          playerId: input.dataset['assign'],
          team: input.value as PvpTeam,
        });
      if (input.id === 'pvp-hazards')
        this.onAction({
          action: 'settings',
          mapId: this.view!.mapId,
          hazardsEnabled: input.checked,
        });
    });
    this.node.addEventListener('dragstart', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('[data-player]');
      if (!row?.draggable || !e.dataTransfer) {
        e.preventDefault();
        return;
      }
      this.dragId = row.dataset['player']!;
      e.dataTransfer.setData('text/plain', this.dragId);
      e.dataTransfer.effectAllowed = 'move';
    });
    this.node.addEventListener('dragover', (e) => {
      if (
        (e.target as Element).closest('[data-team]') &&
        this.session === this.view?.hostId
      )
        e.preventDefault();
    });
    this.node.addEventListener('drop', (e) => {
      const column = (e.target as Element).closest<HTMLElement>('[data-team]');
      if (!column || this.session !== this.view?.hostId) return;
      e.preventDefault();
      const id = e.dataTransfer?.getData('text/plain') || this.dragId;
      if (id)
        this.onAction({
          action: 'assign',
          playerId: id,
          team: column.dataset['team'] as PvpTeam,
        });
    });
    window.addEventListener('keydown', this.onKey, true);
  }
  get blocksGameplay(): boolean {
    if (this.entry) return true;
    if (!this.view) return false;
    const self = this.view.members.find((m) => m.id === this.session);
    return (
      this.view.phase !== 'fighting' ||
      self?.team === 'spectator' ||
      !self ||
      (this.state?.players.get(this.session)?.hp ?? 0) <= 0 ||
      this.settings ||
      this.history ||
      this.characterOpen
    );
  }
  openEntry(nickname = '', id = '', message = ''): void {
    this.entry = true;
    this.connecting = false;
    this.characterOpen = false;
    this.choicePending = false;
    this.view = undefined;
    this.state = undefined;
    this.nickname = nickname;
    this.entryId = id;
    this.notice = message;
    this.node.hidden = false;
    this.node.classList.add('pvp-entry');
    this.renderEntry();
  }
  private renderEntry(): void {
    this.node.innerHTML =
      '<div class="pvp-layer"><form id="pvp-entry-form" class="pre-window pvp-window pvp-entry-window">' +
      '<h1 class="pre-title">LÔI ĐÀI</h1><p>Chính · Tà · Khán giả — Tối đa 8 người</p>' +
      '<label>Biệt danh<input id="pvp-nickname" maxlength="20" required autocomplete="off" value="' +
      esc(this.nickname) +
      '"></label>' +
      '<label>Map khi tạo phòng<select id="pvp-entry-map">' +
      pvpMaps
        .map((m) => '<option value="' + m.id + '">' + m.name + '</option>')
        .join('') +
      '</select></label>' +
      '<button type="submit" value="create" class="pvp-primary" ' +
      (this.connecting ? 'disabled' : '') +
      '>Tạo phòng</button>' +
      '<label>Mã hoặc link phòng<input id="pvp-room-code" autocomplete="off" value="' +
      esc(this.entryId) +
      '" placeholder="Dán link phòng"></label>' +
      '<button type="submit" value="join" ' +
      (this.connecting ? 'disabled' : '') +
      '>Vào phòng</button><button type="button" data-pvp="back">Quay lại</button>' +
      '<p class="pvp-notice" role="status">' +
      esc(this.notice) +
      '</p></form></div>';
  }
  update(state: LobbyState, roomId: string, session: string): void {
    const view = readPvp(state);
    if (!view) {
      this.clear();
      return;
    }
    if (this.entry) this.notice = '';
    this.connecting = false;
    this.entry = false;
    this.state = state;
    this.view = view;
    this.roomId = roomId;
    this.session = session;
    this.node.hidden = false;
    this.node.classList.remove('pvp-entry');
    const viewport = document.querySelector<HTMLElement>('#viewport')!;
    viewport.dataset['pvp'] = 'true';
    viewport.dataset['pvpPhase'] = view.phase;
    const self = view.members.find((m) => m.id === session),
      hero = state.players.get(session);
    viewport.dataset['pvpWatching'] = String(
      self?.team === 'spectator' || !hero || hero.hp <= 0,
    );
    if (view.phase !== this.previousPhase) {
      this.previousPhase = view.phase;
      window.dispatchEvent(new Event('volam:controls-blocked'));
      if (view.phase === 'lobby') this.settings = this.history = false;
    }
    if (view.phase !== 'lobby') this.characterOpen = false;
    const accepted = view.members.find((m) => m.id === this.session);
    if (
      this.choicePending &&
      accepted?.ready &&
      accepted.schoolId === this.chosenSchool &&
      accepted.branchId === this.chosenBranch
    ) {
      this.choicePending = false;
      this.characterOpen = false;
      this.key = '';
      this.render();
      this.node
        .querySelector<HTMLButtonElement>('[data-pvp="character"]')
        ?.focus();
    } else this.render();
    const timer = this.node.querySelector('#pvp-timer');
    const remaining =
      view.phase === 'countdown'
        ? pvpDefinition.roundTicks / m1Config.tickRate
        : Math.max(
            0,
            Math.ceil((view.roundUntil - view.tick) / m1Config.tickRate),
          );
    if (timer)
      timer.textContent =
        String(Math.floor(remaining / 60)).padStart(2, '0') +
        ':' +
        String(remaining % 60).padStart(2, '0');
    const banner = this.node.querySelector<HTMLElement>('#pvp-phase');
    if (banner) {
      let html = '';
      banner.hidden = view.phase === 'fighting' || view.phase === 'lobby';
      if (view.phase === 'countdown')
        html =
          '<strong>' +
          Math.min(
            3,
            Math.max(
              1,
              4 - Math.ceil((view.until - view.tick) / m1Config.tickRate),
            ),
          ) +
          '</strong><span>Chuẩn bị</span>';
      else if (view.result) {
        const r = view.result;
        const title =
          r.winner === 'draw'
            ? 'HÒA'
            : label(r.winner) +
              (view.phase === 'series_over' ? ' thắng ván' : ' thắng hiệp');
        html =
          '<strong>' +
          title +
          '</strong><span>' +
          view.score.chinh +
          ' — ' +
          view.score.ta +
          '</span><small>' +
          (view.phase === 'series_over'
            ? 'Đang trở về chia phe'
            : r.reason === 'timeout'
              ? 'Hết 3 phút · Đánh lại hiệp'
              : r.winner === 'draw'
                ? 'Hai phe cùng bị hạ · Đánh lại hiệp'
                : 'Chuẩn bị hiệp tiếp theo') +
          '</small>';
      }
      // Keep the Vietnamese text nodes and their font layout stable between
      // server ticks; only countdown/result changes need a new banner.
      if (html && banner.innerHTML !== html) banner.innerHTML = html;
    }
  }

  private closeBranches(): void {
    if (this.choicePending) return;
    const school = this.chosenSchool;
    this.chosenSchool = '';
    this.key = '';
    this.render();
    this.node
      .querySelector<HTMLButtonElement>(`[data-school="${school}"]`)
      ?.focus();
  }
  private closeCharacter(): void {
    if (this.choicePending) return;
    this.characterOpen = false;
    this.key = '';
    this.render();
    this.node
      .querySelector<HTMLButtonElement>('[data-pvp="character"]')
      ?.focus();
  }
  private characterMenu(): string {
    const self = this.view?.members.find((m) => m.id === this.session);
    const school = schools.find((s) => s.id === this.chosenSchool);
    return `<div class="pvp-layer pvp-school-layer"><section class="pre-window school-window pvp-school-picker" role="dialog" aria-modal="true" aria-labelledby="pvp-school-title">
      <h1 id="pvp-school-title" class="pre-title">Chọn môn phái</h1>
      <p class="pre-room">Cấp 30 · Tất cả kỹ năng tối đa · Không tính trang bị</p>
      <div class="school-grid">${schoolCards(self?.schoolId, false, true, 'data-pvp')}</div>
      <div class="pre-actions"><button data-pvp="close-character" ${this.choicePending ? 'disabled' : ''}>Quay lại</button></div>
      ${
        school
          ? `<dialog class="branch-dialog" aria-labelledby="pvp-branch-title">
        <h2 id="pvp-branch-title">${school.name} · Chọn hệ phái</h2><p>${school.style}</p>
        <div class="branch-list" role="group" aria-label="Hệ phái">${branchCards(school, this.chosenBranch, !this.choicePending, 'data-pvp')}</div>
        <div class="pre-actions"><button data-pvp="close-branches" ${this.choicePending ? 'disabled' : ''}>Đổi môn phái</button>
        <button data-pvp="confirm-character" ${!this.chosenBranch || this.choicePending ? 'disabled' : ''}>${this.choicePending ? 'Đang xác nhận…' : 'Xác nhận'}</button></div>
        <p class="pvp-notice" role="status">${esc(this.notice)}</p>
      </dialog>`
          : ''
      }
    </section></div>`;
  }

  private render(): void {
    const v = this.view;
    if (!v) return;
    const key = JSON.stringify([
      v.phase,
      v.mapId,
      v.hazardsEnabled,
      v.members,
      v.score,
      v.alive,
      this.settings,
      this.characterOpen,
      this.chosenSchool,
      this.chosenBranch,
      this.choicePending,
      this.history,
      this.notice,
      this.copied,
      this.history ? v.history : [],
    ]);
    if (key === this.key) return;
    this.key = key;
    const focused = (document.activeElement as HTMLElement | null)?.dataset;
    this.node.querySelector<HTMLDialogElement>('.branch-dialog[open]')?.close();
    const host = this.session === v.hostId,
      lobby = v.phase === 'lobby';
    let content = '';
    if (this.history)
      content =
        '<div class="pvp-layer"><section class="pre-window pvp-window pvp-history"><h2 class="pre-title">Lịch sử hạ gục</h2><button data-pvp="close" class="pvp-close" aria-label="Đóng lịch sử">×</button>' +
        (v.history.length
          ? '<ol>' +
            [...v.history]
              .reverse()
              .map(
                (k) =>
                  '<li class="' +
                  (k.environment ? 'environment' : '') +
                  '"><span>' +
                  esc(k.killer) +
                  '</span><b> → </b><span>' +
                  esc(k.victim) +
                  '</span></li>',
              )
              .join('') +
            '</ol>'
          : '<p>Chưa có lượt hạ gục.</p>') +
        '<small>Tối đa 30 lượt hạ gục · Chỉ lưu trong phòng</small></section></div>';
    else if (this.settings && host && lobby)
      content =
        '<div class="pvp-layer"><section class="pre-window pvp-window pvp-settings"><h2 class="pre-title">Cài đặt Lôi Đài</h2><div class="pvp-map-grid">' +
        pvpMaps
          .map(
            (m) =>
              '<button data-pvp="map" data-map="' +
              m.id +
              '" aria-pressed="' +
              (m.id === v.mapId) +
              '"><img src="' +
              thumb(m.id) +
              '" alt=""><strong>' +
              m.name +
              '</strong></button>',
          )
          .join('') +
        '</div><div class="pvp-hazard-info"><label class="pvp-toggle"><input id="pvp-hazards" type="checkbox" aria-describedby="pvp-hazard-description" ' +
        (v.hazardsEnabled ? 'checked' : '') +
        '><span>Hiểm họa: ' +
        (v.hazardsEnabled ? 'Bật' : 'Tắt') +
        '</span></label><p id="pvp-hazard-description">' +
        hazardDescription[v.mapId] +
        '</p><small>' +
        (v.hazardsEnabled
          ? 'Áp dụng hiểm họa của bản đồ đã chọn.'
          : 'Đã tắt hiểm họa môi trường cho bản đồ này.') +
        '</small></div><div class="pre-actions"><button data-pvp="close">Quay lại</button></div></section></div>';
    else if (lobby) {
      const columns = (['chinh', 'spectator', 'ta'] as const)
        .map((team) => {
          const members = v.members.filter((m) => m.team === team);
          const rows = members
            .map((m) => {
              const school = schools.find((s) => s.id === m.schoolId);
              const portrait = school
                ? '<span class="pvp-portrait school-portrait ' +
                  school.portrait +
                  '" aria-hidden="true"></span>'
                : '<span class="pvp-unknown">?</span>';
              const ready = m.ready ? '✓' : '🔒';
              const select = host
                ? '<select aria-label="Xếp phe ' +
                  esc(m.nickname) +
                  '" data-assign="' +
                  esc(m.id) +
                  '">' +
                  (['spectator', 'chinh', 'ta'] as const)
                    .map(
                      (t) =>
                        '<option value="' +
                        t +
                        '" ' +
                        (t === m.team ? 'selected' : '') +
                        ' ' +
                        (!m.ready && t !== 'spectator' ? 'disabled' : '') +
                        '>' +
                        label(t) +
                        '</option>',
                    )
                    .join('') +
                  '</select>'
                : '';
              return (
                '<li data-player="' +
                esc(m.id) +
                '" draggable="' +
                (host && m.ready) +
                '" class="' +
                (!m.ready ? 'not-ready' : '') +
                '">' +
                portrait +
                '<div><strong>' +
                (m.id === v.hostId ? '♛ ' : '') +
                esc(m.nickname) +
                (m.id === this.session ? ' (bạn)' : '') +
                '</strong><small>' +
                esc(branchName(m.branchId)) +
                '</small>' +
                select +
                '</div><b aria-label="' +
                (m.ready ? 'Sẵn sàng' : 'Chưa chọn phái') +
                '">' +
                ready +
                '</b></li>'
              );
            })
            .join('');
          return (
            '<section data-team="' +
            team +
            '" class="pvp-team ' +
            team +
            '"><h2>' +
            label(team) +
            ' <small>' +
            members.length +
            (team === 'spectator' ? '' : '/4') +
            '</small></h2><ul>' +
            rows +
            (team !== 'spectator'
              ? Array.from(
                  { length: Math.max(0, 4 - members.length) },
                  () => '<li class="pvp-empty">Trống</li>',
                ).join('')
              : '') +
            '</ul></section>'
          );
        })
        .join('');
      const self = v.members.find((m) => m.id === this.session);
      content =
        '<div class="pvp-layer"><section class="pre-window pvp-window pvp-lobby" ' +
        (this.characterOpen ? 'inert' : '') +
        '><header><h1 class="pre-title">LÔI ĐÀI</h1><span>' +
        pvpMaps.find((m) => m.id === v.mapId)!.name +
        ' · ' +
        v.members.length +
        '/8</span></header><div class="pvp-teams">' +
        columns +
        '</div>' +
        '<footer><div class="pvp-character-choice"><span>' +
        esc(branchName(self?.branchId ?? '')) +
        '</span><button data-pvp="character" aria-haspopup="dialog">' +
        (self?.ready ? 'Đổi phái / hệ phái' : 'Chọn phái / hệ phái') +
        '</button></div>' +
        '<button data-pvp="leave">Thoát</button>' +
        (host
          ? '<button data-pvp="settings">Cài đặt</button><button data-pvp="share">' +
            (this.copied ? 'Đã chép link' : 'Chia sẻ link') +
            '</button><button data-pvp="start" class="pvp-primary" ' +
            (!v.members.some((m) => m.team === 'chinh') ||
            !v.members.some((m) => m.team === 'ta')
              ? 'disabled'
              : '') +
            '>Bắt đầu</button>'
          : '') +
        '</footer><p class="pvp-notice" role="status">' +
        esc(this.notice) +
        '</p></section></div>';
    }
    this.node.innerHTML =
      (!lobby
        ? '<section id="pvp-score" class="framed"><strong><i>CHÍNH ' +
          v.score.chinh +
          '</i> — <em>' +
          v.score.ta +
          ' TÀ</em></strong><div><small>' +
          v.alive.chinh +
          ' còn sống</small><b id="pvp-timer">03:00</b><small>' +
          v.alive.ta +
          ' còn sống</small></div></section><div id="pvp-phase" class="game-window framed" hidden></div>'
        : '') +
      content +
      (lobby && this.characterOpen ? this.characterMenu() : '') +
      (!lobby && this.state?.players.get(this.session)?.bossSpectator
        ? '<div class="pvp-watch framed">ĐANG XEM · ' +
          (v.members.find((m) => m.id === this.session)?.team === 'spectator'
            ? 'Khán giả'
            : 'Bạn đã bị hạ') +
          '</div>'
        : '');
    const dialog = this.node.querySelector<HTMLDialogElement>('.branch-dialog');
    if (dialog) {
      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        this.closeBranches();
      });
      dialog.showModal();
      const button = focused?.['branch']
        ? dialog.querySelector<HTMLButtonElement>(
            `[data-branch="${focused['branch']}"]`,
          )
        : focused?.['pvp'] === 'confirm-character'
          ? dialog.querySelector<HTMLButtonElement>(
              '[data-pvp="confirm-character"]',
            )
          : undefined;
      if (button && !button.disabled) button.focus();
    } else if (this.characterOpen)
      this.node
        .querySelector<HTMLButtonElement>('.school-card.selected, .school-card')
        ?.focus();
  }
  closeOverlay(): boolean {
    if (this.characterOpen) {
      if (this.chosenSchool) this.closeBranches();
      else this.closeCharacter();
      return true;
    }
    if (this.node.hidden || (!this.settings && !this.history)) return false;
    this.settings = this.history = false;
    this.key = '';
    this.render();
    return true;
  }
  toggleHistory(): void {
    this.history = !this.history;
    this.settings = false;
    this.key = '';
    this.render();
    window.dispatchEvent(new Event('volam:controls-blocked'));
  }
  error(message: string): void {
    this.connecting = false;
    this.notice = message;
    this.choicePending = false;
    if (this.entry) this.renderEntry();
    else {
      this.key = '';
      this.render();
    }
  }
  private async share(): Promise<void> {
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('pvp', this.roomId);
    url.hash = '';
    try {
      await navigator.clipboard.writeText(url.href);
      this.copied = true;
      this.notice = 'Link phòng đã được sao chép.';
    } catch {
      this.notice = 'Link phòng: ' + url.href;
    }
    this.key = '';
    this.render();
  }
  destroy(): void {
    window.removeEventListener('keydown', this.onKey, true);
    this.node.remove();
  }
  clear(): void {
    this.view = undefined;
    this.state = undefined;
    this.entry = false;
    this.node.hidden = true;
    this.key = '';
    this.previousPhase = '';
    this.notice = '';
    this.copied = false;
    this.settings = this.history = this.characterOpen = false;
    this.choicePending = false;
    const v = document.querySelector<HTMLElement>('#viewport');
    if (v) {
      delete v.dataset['pvp'];
      delete v.dataset['pvpPhase'];
      delete v.dataset['pvpWatching'];
    }
  }
}
