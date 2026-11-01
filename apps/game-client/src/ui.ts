import { heroTexture } from './art.js';
import { forestArtNotice } from './forest-creeps.js';
import {
  arena,
  lobbyConfig,
  m1Config,
  schools,
  skillIcon,
  dungeonForZone,
  lyMacSauEncounter,
} from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import { icon, menuContents, menuTitles, type Menu } from './menus.js';
import { DefenseHud } from './defense-hud.js';
import { SkillMenu } from './skill-menu.js';
import type { BuildChange } from '@volam/game-core';
export function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}
export class GameUI {
  private menu: Menu | undefined;
  private state: LobbyState | undefined;
  private sessionId = '';
  private roomId = '';
  private study = false;
  private dungeonDestination:
    | 'forest'
    | 'desert'
    | 'sea'
    | 'chu_ba_thong'
    | 'hong_liet'
    | 'kim_luan'
    | 'co_mo' = 'forest';
  private ended = false;
  private dead = false;
  private defense: DefenseHud;
  private skillMenu: SkillMenu | undefined;
  onBuild: (change: BuildChange) => void = () => {};
  private ack = 'Chia sẻ mã phòng với bạn bè.';
  private toastTimer: number | undefined;
  onBasic: (id: string) => void = () => {};
  onLoadout: (ids: string[]) => void = () => {};
  onCheck: () => void = () => {};
  onLeave: () => void = () => {};
  onStudy: (enabled: boolean) => void = () => {};
  onDungeonEnter: (
    access: 'private' | 'shared',
    destination:
      | 'forest'
      | 'desert'
      | 'sea'
      | 'chu_ba_thong'
      | 'hong_liet'
      | 'kim_luan'
      | 'co_mo',
  ) => void = () => {};
  constructor(artPreview: boolean) {
    element('#app').innerHTML = `
      <main id="viewport" aria-label="Khung cảnh Võ Lâm">
        <div id="game" aria-label="Khung cảnh trò chơi"></div>
        <div id="hud" aria-label="Thông tin trong trận">
          <section class="hero-hud framed"><div class="portrait" title="Chân dung Cái Bang"><span id="hero-level">1</span></div><div class="hero-bars"><div class="hero-name"><strong id="hero-name">Thiếu hiệp</strong><small id="school-name">Cái Bang</small></div>
            <div class="meter hp" role="meter" aria-label="Sinh lực" aria-valuemin="0"><i></i><span id="hp-text">—</span></div><div class="meter mp" role="meter" aria-label="Nội lực" aria-valuemin="0"><i></i><span id="mp-text">—</span></div><div class="meter xp" role="meter" aria-label="Kinh nghiệm" aria-valuemin="0"><i></i><span id="xp-text">—</span></div></div></section>
          <nav class="system-buttons" aria-label="Menu trò chơi"><button data-action="quit" title="Thoát" aria-label="Thoát">${icon('quit')}<span>Thoát</span></button><button data-menu="settings" title="Cài đặt" aria-label="Cài đặt">${icon('settings')}<span>Cài đặt</span></button><button data-menu="dungeons" title="Phó Bản" aria-label="Phó Bản">${icon('portal')}<span>Phó Bản</span></button><button data-menu="merchant" title="Thương Gia" aria-label="Thương Gia">${icon('shop')}<span>Thương Gia</span></button><button data-menu="pvp" title="Lôi Đài" aria-label="Lôi Đài">${icon('swords')}<span>Lôi Đài</span></button></nav>
          <span class="sr-only"><span id="hud-connection">Connected</span> · <span id="current-room" data-testid="room-id">—</span> · <span id="player-count" data-testid="player-count">0 / 6</span></span>
          <section class="bag-cluster framed"><button data-menu="inventory" title="Túi đồ">${icon('bag')}<span>Túi đồ</span></button><div>${icon('gold')}<strong class="live-gold">0</strong><small>Vàng</small></div></section>
          <section class="hotbar framed" aria-label="Thanh kỹ năng chiến đấu">
            ${[
              ['a', 'staff', 'Đánh thường · A'],
              ['q', 'flame', 'Hỏa Vân Chưởng · Q'],
              ['w', 'dragon', 'Cuồng Long Loạn Vũ · W'],
              ['e', 'lock', 'E · Chưa trang bị'],
              ['r', 'lock', 'R · Chưa trang bị'],
            ]
              .map(
                ([key, art, title]) =>
                  `<div id="slot-${key}" class="hotbar-slot ${key === 'e' || key === 'r' ? 'unequipped' : ''}" title="${title}">${icon(art!)}<kbd>${key!.toUpperCase()}</kbd><b id="timer-${key}" class="cooldown-number"></b><small id="cooldown-${key}">${key === 'q' ? '18 NL' : key === 'w' ? '25 NL' : key === 'a' ? 'Bổng' : 'Trống'}</small><div class="cooldown-shade"></div></div>`,
              )
              .join('')}
            <button class="loadout-toggle" data-menu="skills" title="Võ Học · P" aria-label="Võ Học · P">◇<span id="available-points"></span></button>
          </section>
          <p id="scene-status" class="scene-ready" aria-hidden="true">${artPreview ? 'XEM TRƯỚC HÌNH ẢNH' : ''}</p>
          <p id="zone-status" hidden role="status"></p>
        </div>
        <section id="lobby" class="lobby-layer"><div class="lobby-window framed"><p class="eyebrow">VÕ LÂM · ANH HÙNG THỦ THÀNH</p><h1>Tịnh Phong Viện</h1><p>Sân viện thanh bình. Khởi đầu hành trình võ lâm.</p><form id="join-form"><label for="nickname">Biệt danh</label><input id="nickname" maxlength="${lobbyConfig.nicknameMaxLength}" autocomplete="off" required placeholder="Biệt danh của bạn"/><button type="submit" id="create" class="accent">Tạo phòng</button><div class="divider">hoặc tham gia cùng bạn</div><label for="room-id">Mã phòng</label><div class="join-row"><input id="room-id" autocomplete="off" maxlength="64" placeholder="Nhập mã phòng"/><button type="submit" id="join">Vào phòng</button></div></form><p id="status" data-testid="status" role="status" aria-live="polite">Mất kết nối</p><small>Chỉ cần biệt danh · 1–6 người chơi · Không lưu tiến trình<br>Bản thử nghiệm · Hình ảnh đang hoàn thiện</small></div></section>
        <div id="modal-layer" hidden><section id="game-dialog" class="game-window framed" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><header class="window-title"><span class="title-flourish">❖</span><h2 id="dialog-title"></h2><button id="close-menu" aria-label="Đóng menu">×</button></header><div id="dialog-content" class="window-body"></div><small class="menu-safety">Trận đấu vẫn tiếp tục · Escape để đóng</small></section></div>
        <div id="study-banner" class="study-banner framed" hidden><strong>RỪNG TRÚC · BẢN MẪU KHUNG CẢNH</strong><span>Chỉ xem hình ảnh. Nhân vật của bạn vẫn ở trong đấu trường.</span><button id="return-study">Về đấu trường</button></div>
        <section id="boss-hud" hidden aria-label="Lý Mạc Sầu"><strong>Lý Mạc Sầu</strong><progress id="boss-hp" max="1" value="1"></progress><span id="boss-cast"></span></section><p id="boss-loot-notice" role="status"></p><p id="dungeon-exit-hint" hidden>Space — Rời phó bản</p><div id="respawn-overlay" hidden role="status" aria-live="polite"><strong>Bạn đã gục ngã</strong><span id="respawn-countdown"></span></div>
        <div id="announcements" aria-live="polite"><p id="feedback" role="status" hidden></p></div>
        <p id="hero-stats" data-testid="hero-stats" class="sr-only"></p>
      </main>`;
    this.defense = new DefenseHud(element('#viewport'), () => this.onLeave());
    if (artPreview) document.body.classList.add('art-preview');
    element('#viewport').addEventListener('click', (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(
              'button[data-menu],button[data-action]',
            )
          : null;
      if (target && this.roomId && !this.study) {
        if (target.dataset['action'] === 'quit') this.open('quit');
        else this.open(target.dataset['menu'] as Menu);
      }
    });
    element('#modal-layer').addEventListener('click', (event) => {
      event.stopPropagation();
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('button[data-menu]')
          : null;
      if (target && this.roomId) this.open(target.dataset['menu'] as Menu);
      if (event.target === element('#modal-layer')) this.close();
    });
    element('#close-menu').addEventListener('click', () => this.close());
    element('#return-study').addEventListener('click', () =>
      this.setStudy(false),
    );
    window.addEventListener('keydown', this.keydown, true);
  }
  get blocked(): boolean {
    return !!this.menu || this.study || this.ended;
  }
  private keydown = (event: KeyboardEvent): void => {
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
        target.isContentEditable);
    const hero = this.state?.players.get(this.sessionId);
    if (
      event.code === 'KeyP' &&
      !typing &&
      !event.repeat &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      this.roomId &&
      this.state?.phase === 'IN_GAME' &&
      hero?.confirmed &&
      !this.study &&
      !this.ended &&
      (!this.menu || this.menu === 'skills')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.open('skills');
      return;
    }
    if (event.code === 'Escape' && this.blocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (this.study) this.setStudy(false);
      else this.close();
    }
    if (!this.menu || event.code !== 'Tab') return;
    const focusable = [
      ...element('#game-dialog').querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]',
      ),
    ].filter((el) => !el.closest('[hidden]'));
    const first = focusable[0],
      last = focusable.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === element('#game-dialog'))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  connected(id: string, session: string): void {
    this.ended = false;
    this.dead = false;
    element('#game').classList.remove('hero-dead');
    element('#respawn-overlay').hidden = true;
    element('#dungeon-exit-hint').hidden = true;
    this.defense.hide();
    this.roomId = id;
    this.sessionId = session;
    if (id) {
      this.ack = 'Chia sẻ mã phòng với bạn bè.';
      element('#hud-connection').textContent = 'Connected';
    }
    element('#current-room').textContent = id || '—';
    document.body.classList.toggle('connected', !!id);
    this.close(false);
    this.setStudy(false);
    if (!id) this.state = undefined;
  }
  open(menu: Menu): void {
    if (menu === 'dungeons') this.dungeonDestination = 'forest';
    if (this.ended) return;
    if (this.menu === menu) {
      this.close();
      return;
    }
    this.menu = menu;
    element('#dungeon-exit-hint').hidden = true;
    window.dispatchEvent(new Event('volam:controls-blocked'));
    element('#dialog-title').textContent = menuTitles[menu];
    document.querySelector('#dialog-actions')?.remove();
    element('#dialog-content').innerHTML = menuContents(
      menu,
      new URLSearchParams(location.search).has('debug'),
    );
    element('#modal-layer').dataset['activeMenu'] = menu;
    element('.menu-safety').textContent =
      menu === 'dungeons'
        ? 'Trận đấu vẫn tiếp tục · Escape để đóng'
        : 'Trận đấu vẫn tiếp tục · Escape để đóng';
    const footer =
      element('#dialog-content').querySelector<HTMLElement>('.window-footer');
    if (footer) {
      // Keep close/primary actions visible while the content scrolls on short windows.
      footer.id = 'dialog-actions';
      element('#game-dialog').insertBefore(footer, element('.menu-safety'));
    }
    element('#game-dialog').dataset['menu'] = menu;
    element('#modal-layer').hidden = false;
    element('#close-menu').focus({ preventScroll: true });
    this.skillMenu = undefined;
    const select = document.querySelector<HTMLSelectElement>('#basic-style');
    document.querySelector('#fullscreen')?.addEventListener('click', () => {
      const request = document.fullscreenElement
        ? document.exitFullscreen()
        : element('#viewport').requestFullscreen();
      void request.catch(() =>
        this.notify('Trình duyệt này không hỗ trợ toàn màn hình.'),
      );
    });
    select?.addEventListener('change', () => this.onBasic(select.value));
    if (menu === 'skills' && this.state) {
      const h = this.state.players.get(this.sessionId),
        ids = [h?.qSkill, h?.wSkill, h?.eSkill, h?.rSkill];
      if (h?.build.enabled) {
        this.skillMenu = new SkillMenu(
          element('#dialog-content'),
          (change) => this.onBuild(change),
          h.schoolId,
        );
        this.skillMenu.update(h);
      } else if (
        h &&
        h.schoolId !== 'cai_bang' &&
        !this.state.devSkillLoadout
      ) {
        element('#dialog-content').innerHTML =
          `<p>Võ học ${schools.find((s) => s.id === h.schoolId)?.name ?? ''} chưa mở.</p><p class="muted">Môn phái này sẽ có bộ kỹ năng riêng. Hiện chưa thể học hoặc trang bị võ công Cái Bang.</p>`;
      } else {
        const list = element('#dialog-content .ability-list');
        list.innerHTML = ids
          .map((id, i) => {
            const a = id ? m1Config.skillCatalogue?.[id] : undefined;
            return `<article><div><kbd>${'QWER'[i]}</kbd><h3>${a?.nameVi ?? 'Chưa trang bị'}</h3><p>${a ? `${a.manaCost} MP · ${a.cooldownTicks / m1Config.tickRate}s` : ''}</p></div></article>`;
          })
          .join('');
        if (
          this.state.devSkillLoadout &&
          h &&
          m1Config.progression?.schools[h.schoolId]
        ) {
          const panel = document.createElement('div');
          panel.className = 'dev-loadout';
          panel.innerHTML =
            '<p>Bộ kỹ năng thử nghiệm · Bậc 1. Server quản lý nội lực và hồi chiêu.</p>' +
            ids
              .map(
                (id, i) =>
                  `<label>${'QWER'[i]}<select data-skill-slot="${i}" aria-label="Kỹ năng thử nghiệm ${'QWER'[i]}"><option value="">Chưa trang bị</option>${Object.values(
                    m1Config.skillCatalogue ?? {},
                  )
                    .filter(
                      (a) =>
                        m1Config.progression?.skills[a.id]?.schoolId ===
                        h.schoolId,
                    )
                    .map(
                      (a) =>
                        `<option value="${a.id}" ${id === a.id ? 'selected' : ''}>${a.nameVi}</option>`,
                    )
                    .join('')}</select></label>`,
              )
              .join('') +
            `<button id="apply-test-skills" ${h.zoneId !== 'arena' || h.hp <= 0 ? 'disabled' : ''}>Áp dụng bộ thử nghiệm</button>`;
          list.after(panel);
          panel.querySelector('button')!.addEventListener('click', () => {
            this.onLoadout(
              [...panel.querySelectorAll<HTMLSelectElement>('select')].map(
                (s) => s.value,
              ),
            );
            this.close();
          });
        }
      }
    }
    document
      .querySelector('#cancel-quit')
      ?.addEventListener('click', () => this.close());
    document
      .querySelector('#confirm-quit')
      ?.addEventListener('click', () => this.onLeave());
    if (menu === 'quit') element('#cancel-quit').focus({ preventScroll: true });
    document
      .querySelector('#check')
      ?.addEventListener('click', () => this.onCheck());
    document
      .querySelector('#leave')
      ?.addEventListener('click', () => this.open('quit'));
    document.querySelector('#forest-study')?.addEventListener('click', () => {
      this.close(false);
      this.setStudy(true);
    });
    document
      .querySelector('#dungeon-close')
      ?.addEventListener('click', () => this.close());
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-access]',
    ))
      button.addEventListener('click', () => {
        element<HTMLInputElement>('#dungeon-access').value =
          button.dataset['access']!;
        for (const peer of document.querySelectorAll('[data-access]'))
          peer.setAttribute('aria-checked', String(peer === button));
      });
    for (const card of document.querySelectorAll<HTMLButtonElement>(
      '[data-destination]',
    ))
      card.addEventListener('click', () => {
        const unavailable = card.getAttribute('aria-disabled') === 'true';
        const note = element('#dungeon-availability');
        note.hidden = !unavailable;
        note.textContent = unavailable
          ? `${card.getAttribute('aria-label')} hiện chưa mở. Bạn có thể chọn Rừng Trúc hoặc Sa Mạc.`
          : '';
        const destination = card.dataset['destination'];
        if (
          !unavailable &&
          (destination === 'forest' ||
            destination === 'desert' ||
            destination === 'sea' ||
            destination === 'chu_ba_thong' ||
            destination === 'hong_liet' ||
            destination === 'kim_luan' ||
            destination === 'co_mo')
        ) {
          this.dungeonDestination = destination;
          for (const peer of document.querySelectorAll<HTMLButtonElement>(
            '[data-destination]',
          )) {
            peer.setAttribute('aria-pressed', String(peer === card));
            const check = peer.querySelector<HTMLElement>('.destination-check');
            if (check) check.hidden = peer !== card;
          }
          if (this.state) this.refresh(this.state);
        }
      });
    document.querySelector('#enter-dungeon')?.addEventListener('click', () => {
      const access = element<HTMLInputElement>('#dungeon-access').value;
      if (access === 'private' || access === 'shared')
        this.onDungeonEnter(access, this.dungeonDestination);
    });
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-shop-tab]',
    ))
      button.addEventListener('click', () => {
        const craft = button.dataset['shopTab'] === 'craft';
        element('#craft-content').hidden = !craft;
        element('#shop-content').hidden = craft;
        for (const tab of document.querySelectorAll('[data-shop-tab]'))
          tab.setAttribute('aria-selected', String(tab === button));
      });
    if (this.state) this.refresh(this.state);
  }
  close(focus = true): void {
    this.menu = undefined;
    this.skillMenu = undefined;
    element('#modal-layer').hidden = true;
    delete element('#modal-layer').dataset['activeMenu'];
    delete element('#game-dialog').dataset['menu'];
    element('#dialog-content').replaceChildren();
    document.querySelector('#dialog-actions')?.remove();
    if (focus)
      document
        .querySelector<HTMLCanvasElement>('#game canvas')
        ?.focus({ preventScroll: true });
  }
  private setStudy(enabled: boolean): void {
    this.study = enabled;
    element('#study-banner').hidden = !enabled;
    document.body.classList.toggle('studying', enabled);
    if (enabled) window.dispatchEvent(new Event('volam:controls-blocked'));
    this.onStudy(enabled);
    if (!enabled)
      document
        .querySelector<HTMLCanvasElement>('#game canvas')
        ?.focus({ preventScroll: true });
  }
  acknowledge(message: string): void {
    this.ack = message;
    const ack = document.querySelector('#ack');
    if (ack) ack.textContent = message;
  }
  notify(message: string): void {
    const target = element('#feedback');
    target.textContent = message;
    target.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      target.hidden = true;
    }, 4500);
  }
  refresh(state: LobbyState): void {
    this.state = state;
    if (state.phase === 'DEFEAT' && !this.ended) {
      this.ended = true;
      window.dispatchEvent(new Event('volam:controls-blocked'));
      this.close(false);
      this.setStudy(false);
    }
    this.defense.update(state);
    element('#player-count').textContent =
      `${state.players.size} / ${lobbyConfig.maxPlayers}`;
    const list = document.querySelector('#players');
    list?.replaceChildren(
      ...[...state.players.entries()].map(([id, hero]) => {
        const row = document.createElement('li');
        Object.assign(row.dataset, {
          playerId: id,
          x: String(hero.x),
          y: String(hero.y),
          hp: String(hero.hp),
        });
        const name = document.createElement('strong');
        name.textContent = `${hero.nickname}${id === this.sessionId ? ' (bạn)' : ''} · Cấp ${hero.level}`;
        const checks = document.createElement('small');
        checks.textContent = `Lần kiểm tra: ${hero.checks}`;
        row.append(name, checks);
        return row;
      }),
    );
    const partyRoom = document.querySelector('#party-room');
    if (partyRoom) partyRoom.textContent = this.roomId;
    const ack = document.querySelector('#ack');
    if (ack) ack.textContent = this.ack;
    document.querySelector('#creeps')?.replaceChildren(
      ...[...state.creeps.entries()].map(([id, creep]) => {
        const row = document.createElement('li');
        row.dataset['creepId'] = id;
        row.dataset['hp'] = String(creep.hp);
        row.textContent = `Sơn tặc · ${Math.ceil(creep.hp)} / ${creep.maxHp} HP`;
        return row;
      }),
    );
    const markers = document.querySelector('#map-markers');
    if (markers)
      markers.innerHTML = [
        ...[...state.players.entries()].map(
          ([id, h]) =>
            `<circle cx="${(h.x / arena.width) * 200}" cy="${(h.y / arena.height) * 144}" r="${id === this.sessionId ? 3 : 2}" fill="${id === this.sessionId ? '#ffdf8b' : '#78d9e2'}" stroke="#162c2c" stroke-width="1"/>`,
        ),
        ...[...state.creeps.values()]
          .filter((h) => h.hp > 0)
          .map(
            (h) =>
              `<circle cx="${(h.x / arena.width) * 200}" cy="${(h.y / arena.height) * 144}" r="1.8" fill="#e57963"/>`,
          ),
      ].join('');
    const hero = state.players.get(this.sessionId);
    if (!hero) return;
    const dead = hero.hp <= 0 && state.phase === 'IN_GAME';
    if (dead && !this.dead)
      window.dispatchEvent(new Event('volam:controls-blocked'));
    this.dead = dead;
    element('#game').classList.toggle('hero-dead', dead);
    element('#respawn-overlay').hidden = !dead;
    element('#respawn-countdown').textContent =
      `Hồi sinh giữa đấu trường sau ${Math.ceil(hero.respawnTicks / m1Config.tickRate)} giây`;
    const dungeon =
      hero.zoneId === 'arena' ? undefined : dungeonForZone(hero.zoneId);
    element('#dungeon-exit-hint').hidden =
      this.blocked ||
      dead ||
      !dungeon ||
      Math.hypot(hero.x - dungeon.exit.x, hero.y - dungeon.exit.y) >
        dungeon.exitRange;
    this.skillMenu?.update(hero);
    element('#available-points').textContent = hero.build.enabled
      ? String(hero.build.available)
      : '';
    const inArena = hero.zoneId === 'arena';
    const canEnter = inArena && hero.hp > 0;
    const enter = document.querySelector<HTMLButtonElement>('#enter-dungeon');
    if (enter) enter.disabled = !canEnter;
    const kind = document.querySelector('#dungeon-kind');
    if (kind)
      kind.textContent = [
        'chu_ba_thong',
        'hong_liet',
        'kim_luan',
        'co_mo',
      ].includes(this.dungeonDestination)
        ? 'Thủ lĩnh'
        : 'Quái thường';
    const entryNote = document.querySelector('#dungeon-entry-note');
    if (entryNote)
      entryNote.textContent = canEnter
        ? `Chọn Riêng hoặc Chung để vào ${{ forest: 'Rừng Trúc', desert: 'Sa Mạc', sea: 'Biển', chu_ba_thong: 'Chu Bá Thông', hong_liet: 'Hoàn Nhan Hồng Liệt', kim_luan: 'Kim Luân Pháp Vương · Tương Dương', co_mo: 'Cổ Mộ Phái' }[this.dungeonDestination]}.`
        : inArena
          ? 'Bạn cần hồi sinh trước khi vào phó bản.'
          : 'Đến gần cửa rồi nhấn Space để về đấu trường.';
    const studyButton =
      document.querySelector<HTMLButtonElement>('#forest-study');
    if (studyButton) studyButton.disabled = !inArena;
    const zone = state.dungeons.get(hero.zoneId);
    const zoneStatus = element('#zone-status');
    zoneStatus.hidden = inArena && hero.respawnTicks <= 0;
    const desert = hero.zoneId.startsWith('desert_');
    const beach = hero.zoneId.startsWith('sea_');
    const coMo = hero.zoneId.startsWith('co_mo_');
    const boss = [...state.creeps.values()].find(
      (c) =>
        c.zoneId === hero.zoneId && c.archetypeId === 'ly_mac_sau' && c.hp > 0,
    );
    element('#boss-hud').hidden = !coMo || !boss || hero.hp <= 0;
    if (coMo && boss && hero.hp > 0) zoneStatus.hidden = true;
    if (boss) {
      const bar = element<HTMLProgressElement>('#boss-hp');
      bar.max = boss.maxHp;
      bar.value = boss.hp;
      bar.setAttribute(
        'aria-label',
        `Sinh lực ${Math.ceil(boss.hp)} / ${boss.maxHp}`,
      );
      element('#boss-cast').textContent =
        boss.castTicks > 0
          ? (lyMacSauEncounter.attacks.find((a) => a.id === boss.castAbilityId)
              ?.nameVi ?? '')
          : `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    }
    const hongLiet = hero.zoneId.startsWith('hong_liet_');
    const kim = hero.zoneId.startsWith('kim_luan_');
    const artNotice =
      dungeon?.id === 'chu_ba_thong'
        ? 'Art đã duyệt · gameplay thử nghiệm'
        : desert || beach
          ? 'Hình quái đang chờ duyệt'
          : forestArtNotice(
              [...state.creeps.values()]
                .filter((a) => a.zoneId === hero.zoneId)
                .map((a) => a.archetypeId),
            );
    zoneStatus.title = hongLiet
      ? 'Art preview v04 đã duyệt; môi trường ghép tiles/props. Chưa có backend vật phẩm.'
      : zone
        ? artNotice
        : '';
    zoneStatus.textContent =
      hero.respawnTicks > 0
        ? `Đã gục ngã · Về đấu trường sau ${Math.ceil(hero.respawnTicks / m1Config.tickRate)} giây`
        : zone
          ? kim
            ? 'Kim Luân Pháp Vương · Tương Dương · ' +
              zone.living +
              ' địch còn sống'
            : coMo
              ? `Cổ Mộ Phái · ${zone.access === 'private' ? 'Riêng' : 'Chung'} · ${zone.respawnTicks > 0 ? `Lý Mạc Sầu hồi sinh sau ${Math.ceil(zone.respawnTicks / m1Config.tickRate)}s` : 'Lý Mạc Sầu'}`
              : hongLiet
                ? `Hoàn Nhan Hồng Liệt · ${zone.access === 'private' ? 'Riêng' : 'Chung'} · HP ${Math.ceil(zone.bossHp)} / ${zone.bossMaxHp}${zone.bossRespawnTicks ? ` · Hồi sinh ${Math.ceil(zone.bossRespawnTicks / 30)}s` : ''}`
                : `${dungeon?.id === 'chu_ba_thong' ? 'Chu Bá Thông' : beach ? 'Biển' : desert ? 'Sa Mạc' : 'Rừng Trúc'} · ${zone.access === 'private' ? 'Riêng' : 'Chung'} · Đợt ${zone.wave} · ${zone.living} còn lại${zone.nextWaveTicks > 0 ? ` · Đợt tiếp sau ${Math.ceil(zone.nextWaveTicks / m1Config.tickRate)}s` : ''} · ${artNotice}`
          : '';
    const claims = JSON.parse(hero.bossLoot || '[]') as Array<{
      nameVi: string;
    }>;
    const lootNotice = document.querySelector('#boss-loot-notice');
    if (lootNotice)
      lootNotice.textContent = claims.length
        ? `Chiến lợi phẩm: ${claims.at(-1)!.nameVi} · ${claims.length} vật phẩm`
        : '';
    const lootList = document.querySelector('#boss-loot-items');
    if (lootList) {
      lootList.replaceChildren(
        ...claims.map((c) => {
          const li = document.createElement('li');
          li.textContent = c.nameVi;
          return li;
        }),
      );
      const title = document.querySelector('#game-dialog .item-description h3');
      if (title && claims.length) title.textContent = 'Chiến lợi phẩm đang giữ';
    }
    element('#hero-name').textContent = hero.nickname;
    element('#school-name').textContent =
      schools.find((s) => s.id === hero.schoolId)?.name ?? 'Cái Bang';
    element('#viewport').dataset['heroSchool'] = hero.schoolId;
    element('#viewport').style.setProperty(
      '--hero-idle',
      'url("/assets/characters/' +
        // Both monk weapon presentations share one square portrait source.
        (hero.schoolId === 'thieu_lam'
          ? 'hero_thieu_lam'
          : heroTexture(hero.basicId, hero.schoolId)) +
        '_idle.png")',
    );
    element('.portrait').title =
      hero.schoolId === 'thieu_lam'
        ? 'Chân dung Thiếu Lâm'
        : hero.schoolId === 'vo_dang'
          ? 'Chân dung Võ Đang'
          : hero.schoolId === 'thien_son'
            ? 'Chân dung Thiên Sơn'
            : 'Chân dung Cái Bang';
    const chuong = hero.basicId === 'cai_bang_chuong';
    element('#viewport').dataset['basicStyle'] = chuong ? 'chuong' : 'bong';
    element('#slot-a .pixel-icon').className =
      `pixel-icon ${chuong ? 'icon-palm' : 'icon-staff'}`;
    element('#hero-level').textContent = String(hero.level);
    for (const [name, value, max, label] of [
      ['hp', hero.hp, hero.maxHp, 'SL'],
      ['mp', hero.mana, hero.maxMana, 'NL'],
      ['xp', hero.xp, m1Config.xpPerLevel, 'KN'],
    ] as const) {
      const meter = element(`.meter.${name}`);
      // XP is cumulative; only the visual progress within the current level wraps.
      const capped = name === 'xp' && hero.level >= m1Config.maxLevel;
      const progress = name === 'xp' ? (capped ? max : value % max) : value;
      meter.setAttribute('aria-valuenow', String(progress));
      meter.setAttribute('aria-valuemax', String(max));
      meter.querySelector<HTMLElement>('i')!.style.width =
        `${Math.min(100, Math.max(0, (progress / max) * 100))}%`;
      element(`#${name}-text`).textContent = capped
        ? 'Kinh nghiệm tối đa · Cấp 30'
        : `${label} ${Math.floor(progress)} / ${max}`;
    }
    element('#hero-stats').textContent =
      `Cấp ${hero.level} · Sinh lực ${Math.ceil(hero.hp)}/${hero.maxHp} · Nội lực ${Math.floor(hero.mana)}/${hero.maxMana} · Kinh nghiệm ${hero.xp} · Vàng ${hero.gold} · Điểm kỹ năng ${hero.skillPoints}`;
    for (const target of document.querySelectorAll('.live-gold'))
      target.textContent = String(hero.gold);
    const stats = document.querySelector('#inventory-stats');
    if (stats)
      stats.textContent = `Cấp ${hero.level} · Sinh lực ${Math.ceil(hero.hp)}/${hero.maxHp} · Nội lực ${Math.floor(hero.mana)}/${hero.maxMana} · Kinh nghiệm ${hero.xp} · Điểm kỹ năng ${hero.skillPoints}`;
    const select = document.querySelector<HTMLSelectElement>('#basic-style');
    if (select) select.disabled = !inArena || hero.hp <= 0;
    if (select && document.activeElement !== select)
      select.value = hero.basicId;
    let combo = document.querySelector<HTMLElement>('#phat-dong-progress');
    if (!combo) {
      combo = document.createElement('div');
      combo.id = 'phat-dong-progress';
      document.querySelector('#slot-q')?.parentElement?.append(combo);
    }
    const records = JSON.parse(hero.combos) as Array<{
      id: string;
      targetId: string;
      step: number;
      ticks: number;
    }>;
    combo.hidden = hero.schoolId !== 'thieu_lam' || records.length === 0;
    combo.textContent =
      records
        .slice(0, 3)
        .map(
          (c) =>
            `${c.id === 'phat_dong_a' ? 'A' : 'B'} ${c.step}/3 · ${(c.ticks / m1Config.tickRate).toFixed(1)}s`,
        )
        .join(' | ') +
      (records.length > 3 ? ` +${records.length - 3} địch` : '');
    combo.title = records
      .map(
        (c) =>
          `${c.id === 'phat_dong_a' ? 'A' : 'B'} · ${c.targetId} · ${c.step}/3`,
      )
      .join('\n');
    const slots = [
      {
        key: 'a' as const,
        remaining: hero.basicCooldown,
        ability: m1Config.basics[hero.basicId],
      },
      ...(['q', 'w', 'e', 'r'] as const).map((key) => ({
        key,
        remaining: hero[`${key}Cooldown`],
        ability: hero.build.enabled
          ? m1Config.progression?.skills[hero[`${key}Skill`]]?.ranks[
              Math.max(0, (hero.build.ranks.get(hero[`${key}Skill`]) ?? 0) - 1)
            ]
          : m1Config.skillCatalogue?.[hero[`${key}Skill`]],
      })),
    ];
    const activeStatuses = JSON.parse(hero.statuses) as Array<{ kind: string }>;
    for (const { key, remaining, ability } of slots) {
      const rank =
        key === 'a'
          ? 1
          : hero.build.enabled
            ? (hero.build.ranks.get(hero[`${key}Skill`]) ?? 0)
            : 1;
      const slot = element(`#slot-${key}`),
        cooling = remaining > 0,
        cost = ability?.manaCost ?? 0;
      slot.classList.toggle('cooling', cooling);
      const controlled = activeStatuses.some((s) =>
        [
          'stun',
          'dash',
          'channel',
          key === 'a' ? 'disarm' : 'silence',
        ].includes(s.kind),
      );
      slot.classList.toggle(
        'unavailable',
        !ability ||
          rank === 0 ||
          hero.hp <= 0 ||
          hero.mana < cost ||
          controlled,
      );
      slot.classList.toggle('unequipped', !ability);
      if (key !== 'a') {
        let badge = slot.querySelector<HTMLElement>('.skill-rank');
        if (!badge) {
          badge = document.createElement('b');
          badge.className = 'skill-rank';
          slot.append(badge);
        }
        badge.textContent = hero.build.enabled && ability ? String(rank) : '';
        const art = slot.querySelector<HTMLElement>('.pixel-icon')!;
        art.className = ability
          ? 'pixel-icon skill-icon'
          : 'pixel-icon icon-lock';
        art.style.backgroundImage = ability
          ? `url("${skillIcon(ability.id)}")`
          : '';
        art.style.backgroundPosition = ability ? 'center' : '';
        art.style.backgroundSize = ability ? 'contain' : '';
        art.style.backgroundRepeat = 'no-repeat';
      }
      if (
        key === 'a' &&
        ['thien_son', 'vo_dang', 'thieu_lam'].includes(hero.schoolId)
      ) {
        const art = slot.querySelector<HTMLElement>('.pixel-icon')!;
        art.className = 'pixel-icon skill-icon';
        art.style.background = `url("${skillIcon(hero.basicId)}") center / contain no-repeat`;
      } else if (key === 'a')
        slot.querySelector<HTMLElement>('.pixel-icon')!.style.background = '';
      element(`#timer-${key}`).textContent = cooling
        ? (remaining / m1Config.tickRate).toFixed(1)
        : '';
      slot.querySelector<HTMLElement>('.cooldown-shade')!.style.height =
        `${Math.min(100, (remaining / (ability?.cooldownTicks || 1)) * 100)}%`;
      element(`#cooldown-${key}`).textContent =
        key === 'a'
          ? hero.schoolId === 'thieu_lam'
            ? hero.basicId === 'thieu_lam_quyen'
              ? 'Quyền'
              : 'Đao'
            : hero.schoolId === 'vo_dang'
              ? hero.basicId === 'vo_dang_quyen'
                ? 'Quyền'
                : 'Kiếm'
              : hero.schoolId === 'thien_son'
                ? hero.basicId === 'thien_son_phien'
                  ? 'Phiến'
                  : 'Đao'
                : hero.basicId === 'cai_bang_bong'
                  ? 'Bổng'
                  : 'Chưởng'
          : ability
            ? `${cost} NL`
            : 'Trống';
      slot.title = `${ability?.nameVi ?? 'Chưa trang bị'}${key !== 'a' && hero.build.enabled ? ' · Bậc ' + rank : ''} · ${!ability ? 'Chưa mở' : rank === 0 ? 'Chưa học' : controlled ? 'Đang bị khống chế' : cooling ? 'Đang hồi chiêu' : hero.mana < cost ? 'Thiếu nội lực' : 'Sẵn sàng'}`;
      slot.dataset['skillId'] = ability?.id ?? '';
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keydown, true);
    window.clearTimeout(this.toastTimer);
  }
}
