import { heroTexture } from './hero-texture.js';
import { heroIdleUrl } from './character-revision.js';
import {
  arena,
  lobbyConfig,
  m1Config,
  schools,
  skillIcon,
  dungeonForZone,
  economyTrial,
  type DungeonDestination,
} from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import { icon, menuContents, menuTitles, type Menu } from './menus.js';
import type { Preferences } from './preferences.js';
import { bindSettings } from './settings-controls.js';
import { DefenseHud } from './defense-hud.js';
import { BossRetryUI, type RetryAction } from './boss-retry-ui.js';
import { abilitySummary, SkillMenu } from './skill-menu.js';
import { skillRankStats } from './skill-rank-stats.js';
import { BossPartyUI, isBossDestination } from './boss-party-ui.js';
import {
  conLuan,
  duongMon,
  nguDoc,
  directDodgeChance,
  loiDai,
  type BuildChange,
} from '@volam/game-core';
import type { MerchantAction, PotionId } from '@volam/game-core';
import { ItemMenu, auxiliarySlot, updateAuxiliarySlot } from './item-menu.js';
export function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}
const dodgePercentage = new Intl.NumberFormat('vi-VN', {
  style: 'percent',
  maximumFractionDigits: 1,
});
export class GameUI {
  readonly bossRetry: BossRetryUI;
  onBossRetry: (action: RetryAction) => void = () => {};
  readonly bossParty: BossPartyUI;
  reconnecting = false;
  private menu: Menu | undefined;
  private state: LobbyState | undefined;
  private sessionId = '';
  private roomId = '';
  private study = false;
  private dungeonDestination:
    | 'forest'
    | 'desert'
    | 'sea'
    | 'hell'
    | 'chu_ba_thong'
    | 'hong_liet'
    | 'kim_luan'
    | 'co_mo' = 'forest';
  private ended = false;
  private dead = false;
  private defense: DefenseHud;
  private skillMenu: SkillMenu | undefined;
  private itemMenu: ItemMenu | undefined;
  onBuild: (change: BuildChange) => void = () => {};
  onSettings: (key: keyof Preferences) => void = () => {};
  onMerchant: (action: MerchantAction) => void = () => {};
  private ack = 'Chia sẻ mã phòng với bạn bè.';
  private toastTimer: number | undefined;
  onBasic: (id: string) => void = () => {};
  onLoadout: (ids: string[]) => void = () => {};
  onCheck: () => void = () => {};
  onLeave: () => void = () => {};
  onLoiDai: (action: 'enter' | 'exit') => void = () => {};
  onDestinationPreview: (destination: DungeonDestination | 'loi_dai') => void =
    () => {};
  onStudy: (enabled: boolean) => void = () => {};
  onDungeonEnter: (
    access: 'private' | 'shared',
    destination:
      | 'forest'
      | 'desert'
      | 'sea'
      | 'hell'
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
          <section class="hero-hud framed"><div class="portrait" title="Chân dung Cái Bang"><span id="hero-level">1</span></div><div class="hero-bars"><div class="hero-name"><strong id="hero-name">Thiếu hiệp</strong><span class="hero-school"><img id="duong-mon-innate-icon" hidden src="${skillIcon(duongMon.passive)}" width="16" height="16" alt="Tứ tuyệt khí" title="Tứ tuyệt khí · Tăng hồi nội lực, hồi máu và chí mạng theo cấp"><img id="ngu-doc-innate-icon" hidden src="${skillIcon(nguDoc.innate)}" width="16" height="16" alt="Ngũ Độc Tâm Kinh" title="Ngũ Độc Tâm Kinh · Tăng máu tối đa, hồi máu và hồi nội lực theo cấp"><small id="school-name">Cái Bang</small></span></div>
            <div class="meter hp" role="meter" aria-label="Sinh lực" aria-valuemin="0"><i></i><span id="hp-text">—</span></div><div class="meter mp" role="meter" aria-label="Nội lực" aria-valuemin="0"><i></i><span id="mp-text">—</span></div><div class="meter xp" role="meter" aria-label="Kinh nghiệm" aria-valuemin="0"><i></i><span id="xp-text">—</span></div></div></section>
          <nav class="system-buttons" aria-label="Menu trò chơi"><button data-action="quit" title="Thoát" aria-label="Thoát">${icon('quit')}<span>Thoát</span></button><button data-menu="settings" title="Cài đặt" aria-label="Cài đặt">${icon('settings')}<span>Cài đặt</span></button><button data-menu="dungeons" title="Phó Bản" aria-label="Phó Bản">${icon('portal')}<span>Phó Bản</span></button><button data-menu="merchant" title="Thương Gia" aria-label="Thương Gia">${icon('shop')}<span>Thương Gia</span></button><button data-menu="pvp" title="Lôi Đài" aria-label="Lôi Đài">${icon('swords')}<span>Lôi Đài</span></button></nav>
          <span class="sr-only"><span id="hud-connection">Connected</span> · <span id="current-room" data-testid="room-id">—</span> · <span id="player-count" data-testid="player-count">0 / 6</span></span>
          <section class="bag-cluster framed"><button data-menu="inventory" title="Túi đồ">${icon('bag')}<span>Túi đồ</span></button><div>${icon('gold')}<strong class="live-gold">0</strong><small>Vàng</small></div><section class="quick-potions" aria-label="Bình mang theo"><button type="button" data-potion-resource="hp" aria-keyshortcuts="1" title="Bình máu" aria-label="Bình máu" disabled><img src="/assets/inventory_ui/potion_hp.png" alt=""/><kbd>1</kbd><em>—</em><b></b></button><button type="button" data-potion-resource="mp" aria-keyshortcuts="2" title="Bình mana" aria-label="Bình mana" disabled><img src="/assets/inventory_ui/potion_mp.png" alt=""/><kbd>2</kbd><em>—</em><b></b></button></section></section>
          <section class="hotbar framed" aria-label="Thanh kỹ năng chiến đấu">
            ${[
              ['a', 'staff', 'Đánh thường · A'],
              ['q', 'flame', 'Hỏa Vân Chưởng · Q'],
              ['w', 'dragon', 'Cuồng Long Loạn Vũ · W'],
              ['e', 'lock', 'E · Chưa trang bị'],
              ['r', 'lock', 'R · Chưa trang bị'],
              ['t', 'lock', 'T · Tuyệt kỹ'],
            ]
              .map(
                ([key, art, title]) =>
                  `<div id="slot-${key}" class="hotbar-slot hotbar-skill ${key === 'e' || key === 'r' ? 'unequipped' : ''}"><span class="pixel-icon icon-${art}" role="img" tabindex="0" aria-label="${title}" aria-describedby="skill-tip-${key}"></span><kbd>${key!.toUpperCase()}</kbd><b id="timer-${key}" class="cooldown-number"></b><small id="cooldown-${key}">${key === 'q' ? '18 NL' : key === 'w' ? '25 NL' : key === 'a' ? 'Bổng' : 'Trống'}</small><div class="cooldown-shade"></div>${key !== 'a' ? `<button class="rank-up" type="button" data-rank-slot="${'qwert'.indexOf(key!)}" hidden>+</button>` : ''}<span id="skill-tip-${key}" class="skill-tooltip" role="tooltip"><strong></strong><span class="skill-tip-description"></span><span class="skill-tip-stats"></span><span class="skill-tip-state"></span></span></div>`,
              )
              .join('')}
            <div id="dash-status" class="dash-status" role="status" aria-label="Lướt · Shift"><img src="/assets/m3d_feedback/dash_icon_frame.png" alt="" width="32" height="32"><b id="dash-charges">2</b><kbd>Shift</kbd><small id="dash-timer"></small><progress id="dash-progress" max="180" value="180" aria-label="Hồi lượt lướt"></progress></div>
            <div id="kinh-loi-status" class="dash-status" role="status" aria-label="Kinh Lôi · S" hidden><img src="${skillIcon(conLuan.plant)}" alt="" width="32" height="32"><b id="kinh-loi-charges"></b><kbd>S</kbd><small id="kinh-loi-timer"></small></div>
            ${auxiliarySlot()}
            <span id="fixed-skill-points" class="skill-points" hidden></span><span id="shaolin-stance" class="stance-indicator" hidden></span><span id="con-luan-stance" class="stance-indicator" hidden></span><span id="innate-dodge" class="stance-indicator" hidden></span>
            <button hidden class="loadout-toggle" data-menu="skills" title="Võ Công · O" aria-label="Võ Công · O">◇<span id="available-points"></span></button>
          </section>
          <p id="scene-status" class="scene-ready" aria-hidden="true">${artPreview ? 'XEM TRƯỚC HÌNH ẢNH' : ''}</p>
          <p id="zone-status" hidden role="status"></p>
        </div>
        <section id="lobby" class="lobby-layer"><div class="lobby-window framed"><p class="eyebrow">VÕ LÂM · ANH HÙNG THỦ THÀNH</p><h1>Tịnh Phong Viện</h1><p>Sân viện thanh bình. Khởi đầu hành trình võ lâm.</p><form id="join-form"><label for="nickname">Biệt danh</label><input id="nickname" maxlength="${lobbyConfig.nicknameMaxLength}" autocomplete="off" required placeholder="Biệt danh của bạn"/><button type="submit" id="create" class="accent">Tạo phòng</button><div class="divider">hoặc tham gia cùng bạn</div><label for="room-id">Mã phòng</label><div class="join-row"><input id="room-id" autocomplete="off" maxlength="64" placeholder="Nhập mã phòng"/><button type="submit" id="join">Vào phòng</button></div></form><p id="status" data-testid="status" role="status" aria-live="polite">Mất kết nối</p><small>Chỉ cần biệt danh · 1–6 người chơi · Không lưu tiến trình<br>Bản thử nghiệm · Hình ảnh đang hoàn thiện</small></div></section>
        <div id="modal-layer" hidden><section id="game-dialog" class="game-window framed" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><header class="window-title"><span class="title-flourish">❖</span><h2 id="dialog-title"></h2><button id="close-menu" aria-label="Đóng menu">×</button></header><div id="dialog-content" class="window-body"></div><small class="menu-safety">Trận đấu vẫn tiếp tục · Escape để đóng</small></section></div>
        <div id="study-banner" class="study-banner framed" hidden><strong>RỪNG TRÚC · BẢN MẪU KHUNG CẢNH</strong><span>Chỉ xem hình ảnh. Nhân vật của bạn vẫn ở trong đấu trường.</span><button id="return-study">Về đấu trường</button></div>
        <p id="boss-loot-notice" role="status"></p><p id="loi-dai-hint" hidden></p><p id="dungeon-exit-hint" hidden>Space — Rời phó bản</p><div id="respawn-overlay" hidden role="status" aria-live="polite"><strong>Bạn đã gục ngã</strong><span id="respawn-countdown"></span></div>
        <div id="announcements" aria-live="polite"><p id="feedback" role="status" hidden></p></div>
        <p id="hero-stats" data-testid="hero-stats" class="sr-only"></p>
      </main>`;
    this.defense = new DefenseHud(element('#viewport'), () => this.onLeave());
    this.bossRetry = new BossRetryUI(element('#viewport'), (action) =>
      this.onBossRetry(action),
    );
    this.bossParty = new BossPartyUI(element('#viewport'));
    const help = document.createElement('button');
    help.id = 'boss-help-button';
    help.textContent = 'Mời trợ giúp';
    help.hidden = true;
    help.addEventListener('click', () => this.bossParty.help());
    element('#viewport').append(help);
    for (const [selector, key] of [
      ['[data-action="quit"]', 'Esc'],
      ['.system-buttons [data-menu="dungeons"]', 'P'],
      ['.loadout-toggle', 'O'],
    ]) {
      const button = document.querySelector(selector!);
      if (button) {
        const badge = document.createElement('kbd');
        badge.textContent = key!;
        button.append(badge);
        button.setAttribute(
          'title',
          `${button.getAttribute('aria-label')?.replace(' · P', '') ?? ''} · ${key}`,
        );
      }
    }
    if (artPreview) document.body.classList.add('art-preview');
    element('#viewport').addEventListener('click', (event) => {
      const upgrade =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>('[data-rank-slot]')
          : null;
      if (upgrade) {
        if (!upgrade.disabled && !this.blocked)
          this.onBuild({
            action: 'upgrade-slot',
            slot: Number(upgrade.dataset['rankSlot']),
          });
        return;
      }
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(
              'button[data-menu],button[data-action],button[data-potion-resource]',
            )
          : null;
      if (target && this.roomId && !this.study) {
        const resource = target.dataset['potionResource'];
        if (resource === 'hp' || resource === 'mp') {
          this.usePotion(resource);
          return;
        }
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
    return (
      this.bossRetry.blocked ||
      !!this.menu ||
      this.study ||
      this.ended ||
      this.bossParty.blocked ||
      this.reconnecting
    );
  }
  private keydown = (event: KeyboardEvent): void => {
    if (
      this.bossRetry.blocked &&
      !['Tab', 'Enter', 'Space'].includes(event.code)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
        target.isContentEditable);
    const hero = this.state?.players.get(this.sessionId);
    if (event.code === 'Escape' && !event.repeat && this.bossParty.blocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.bossParty.escape();
      return;
    }
    const hotkeyMenu = event.code === 'KeyO' ? 'skills' : 'dungeons';
    if (
      (event.code === 'KeyP' ||
        (event.code === 'KeyO' && !this.state?.requiresBranch)) &&
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
      !this.bossParty.blocked &&
      !this.reconnecting &&
      (!this.menu || this.menu === hotkeyMenu)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.open(hotkeyMenu);
      return;
    }
    if (
      event.code === 'Escape' &&
      !event.repeat &&
      this.roomId &&
      this.state?.phase === 'IN_GAME'
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (this.study) this.setStudy(false);
      else if (this.menu) this.close();
      else this.open('quit');
      return;
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
    this.reconnecting = false;
    this.bossParty.close();
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
    const hero = this.state?.players.get(this.sessionId);
    const leavingDuel = hero?.zoneId === loiDai.id;
    if (leavingDuel && (menu === 'dungeons' || menu === 'merchant')) return;
    if (menu === 'pvp' && (!hero || (!leavingDuel && hero.zoneId !== 'arena')))
      return;
    if (menu === 'dungeons') this.dungeonDestination = 'forest';
    if (this.ended || (menu === 'skills' && this.state?.requiresBranch)) return;
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
      this.state?.requiresBranch === false,
    );
    if (menu === 'settings')
      bindSettings(element('#dialog-content'), 'match', this.onSettings);
    element('#modal-layer').dataset['activeMenu'] = menu;
    element('.menu-safety').textContent =
      menu === 'dungeons'
        ? 'Trận đấu vẫn tiếp tục · Escape để đóng'
        : 'Trận đấu vẫn tiếp tục · Escape để đóng';
    if (menu === 'pvp' && hero) {
      const eligible =
        leavingDuel || (hero.level >= loiDai.minLevel && hero.hp > 0);
      element('#dialog-title').textContent = leavingDuel
        ? 'Về đấu trường'
        : 'Vào Lôi Đài';
      element('#loi-dai-confirm-copy').textContent = leavingDuel
        ? 'Bạn có muốn rời Lôi Đài và trở về đấu trường?'
        : hero.level < loiDai.minLevel
          ? 'Cần cấp 6 để vào Lôi Đài.'
          : hero.hp <= 0
            ? 'Hãy hồi sinh trước khi vào Lôi Đài.'
            : 'Vào Đài Hồng Mộc? Bước lên sàn để đấu hoặc đứng ở viền gạch trắng để xem.';
      const confirm = element<HTMLButtonElement>('#confirm-loi-dai');
      confirm.textContent = leavingDuel ? 'Về đấu trường' : 'Vào Lôi Đài';
      confirm.disabled = !eligible;
      if (eligible && !leavingDuel) this.onDestinationPreview('loi_dai');
      confirm.addEventListener('click', () => {
        this.close();
        this.onLoiDai(leavingDuel ? 'exit' : 'enter');
      });
      element('#cancel-loi-dai').addEventListener('click', () => this.close());
    }
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
    this.itemMenu = undefined;
    if (menu === 'inventory' || menu === 'merchant')
      this.itemMenu = new ItemMenu(element('#item-menu'), menu, (action) =>
        this.onMerchant(action),
      );
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
    for (const card of document.querySelectorAll<HTMLButtonElement>(
      '[data-destination]',
    )) {
      const destination = card.dataset['destination']!;
      if (!isBossDestination(destination)) continue;
      const wrapper = document.createElement('div');
      wrapper.className = 'destination-slot';
      card.replaceWith(wrapper);
      wrapper.append(card);
      const info = document.createElement('button');
      info.className = 'boss-information';
      info.textContent = 'I';
      info.setAttribute(
        'aria-label',
        `Thông tin ${card.getAttribute('aria-label')}`,
      );
      info.addEventListener('click', () =>
        this.bossParty.information(destination),
      );
      wrapper.append(info);
    }
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
            destination === 'hell' ||
            destination === 'chu_ba_thong' ||
            destination === 'hong_liet' ||
            destination === 'kim_luan' ||
            destination === 'co_mo')
        ) {
          this.dungeonDestination = destination;
          this.onDestinationPreview(destination);
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
      const boss = isBossDestination(this.dungeonDestination);
      this.onDungeonEnter(boss ? 'shared' : 'private', this.dungeonDestination);
      this.close();
    });
    if (this.state) this.refresh(this.state);
  }
  close(focus = true): void {
    this.menu = undefined;
    this.skillMenu = undefined;
    this.itemMenu = undefined;
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
  resolveMerchant(): void {
    this.itemMenu?.resolve();
  }
  usePotion(resource: 'hp' | 'mp'): void {
    const hero = this.state?.players.get(this.sessionId);
    const id = this.quickPotion(resource);
    if (
      !hero ||
      hero.zoneId === loiDai.id ||
      !id ||
      this.blocked ||
      hero.hp <= 0 ||
      hero.inventory.potionCooldownTicks > 0 ||
      (resource === 'hp' ? hero.hp >= hero.maxHp : hero.mana >= hero.maxMana)
    )
      return;
    this.onMerchant({ action: 'use-potion', potionId: id });
  }
  private quickPotion(resource: 'hp' | 'mp'): PotionId | undefined {
    const hero = this.state?.players.get(this.sessionId);
    return (['small', 'medium', 'large'] as const)
      .map((size) => `${resource}_${size}` as PotionId)
      .find((id) => (hero?.inventory.potions.get(id) ?? 0) > 0);
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
    if (['DEFEAT', 'VICTORY'].includes(state.phase) && !this.ended) {
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
    this.bossRetry.sync(hero, state.phase === 'IN_GAME');
    if (!hero) return;
    this.bossParty.sync(hero.bossInvitation);
    const inDuel = hero.zoneId === loiDai.id;
    const canDuel =
      !inDuel || (hero.loiDaiFighter && state.loiDaiFighters === 2);
    const pvp = element<HTMLButtonElement>('.system-buttons [data-menu="pvp"]');
    const duelLabel = inDuel ? 'Về đấu trường' : 'Lôi Đài';
    pvp.title = duelLabel;
    pvp.setAttribute('aria-label', duelLabel);
    pvp.querySelector('span:last-child')!.textContent = duelLabel;
    pvp.disabled = hero.zoneId !== 'arena' && !inDuel;
    for (const menu of ['dungeons', 'merchant'])
      element<HTMLButtonElement>(
        `.system-buttons [data-menu="${menu}"]`,
      ).disabled = inDuel;
    const hint = element('#loi-dai-hint');
    hint.hidden = !inDuel || hero.hp <= 0 || this.blocked;
    hint.textContent = !inDuel
      ? ''
      : state.loiDaiGateTicks > 0
        ? `Mở lối lên đài sau ${Math.ceil(state.loiDaiGateTicks / m1Config.tickRate)} giây`
        : state.loiDaiFighters === 2
          ? hero.loiDaiFighter
            ? ''
            : 'Đang quan chiến · Sàn đủ hai đấu thủ'
          : hero.loiDaiFighter
            ? 'Đang chờ đối thủ'
            : 'Đi lên bậc thang để vào sàn đấu';
    hint.hidden ||= !hint.textContent;
    const help = element<HTMLButtonElement>('#boss-help-button');
    help.hidden =
      hero.zoneId === 'arena' ||
      inDuel ||
      !isBossDestination(dungeonForZone(hero.zoneId).id) ||
      state.players.size <= 1 ||
      hero.hp <= 0;
    help.disabled = this.blocked;
    const dead = hero.hp <= 0 && state.phase === 'IN_GAME';
    if (dead && !this.dead)
      window.dispatchEvent(new Event('volam:controls-blocked'));
    this.dead = dead;
    element('#game').classList.toggle('hero-dead', dead);
    element('#respawn-overlay').hidden = !dead;
    element('#respawn-countdown').textContent = inDuel
      ? `Trở về sảnh chờ sau ${Math.ceil(hero.respawnTicks / m1Config.tickRate)} giây`
      : hero.bossSpectator
        ? 'Đã hết lượt hồi sinh · ↑ ↓ ← → để quan chiến'
        : `Tự hồi sinh ${hero.zoneId === 'arena' ? 'tại đấu trường' : isBossDestination(dungeonForZone(hero.zoneId).id) ? 'tại cửa phó bản' : 'tại đấu trường'} sau ${Math.ceil(hero.respawnTicks / m1Config.tickRate)} giây`;
    const dungeon =
      hero.zoneId === 'arena' || inDuel
        ? undefined
        : dungeonForZone(hero.zoneId);
    const exit = dungeon?.exit;
    element('#dungeon-exit-hint').hidden =
      this.blocked ||
      dead ||
      !dungeon ||
      !exit ||
      Math.hypot(hero.x - exit.x, hero.y - exit.y) > dungeon.exitRange;
    this.skillMenu?.update(hero);
    this.itemMenu?.update(hero);
    for (const resource of ['hp', 'mp'] as const) {
      const button = document.querySelector<HTMLButtonElement>(
        `[data-potion-resource="${resource}"]`,
      );
      if (!button) continue;
      const id = this.quickPotion(resource);
      const count = [...hero.inventory.potions]
        .filter(([key]) => key.startsWith(resource + '_'))
        .reduce((sum, [, amount]) => sum + amount, 0);
      const seconds = Math.ceil(
        hero.inventory.potionCooldownTicks / m1Config.tickRate,
      );
      button.disabled =
        inDuel ||
        dead ||
        !id ||
        seconds > 0 ||
        (resource === 'hp' ? hero.hp >= hero.maxHp : hero.mana >= hero.maxMana);
      button.querySelector('em')!.textContent = String(count);
      button.querySelector('b')!.textContent = seconds ? `${seconds}` : '';
      const label = id
        ? `${economyTrial.potions[id].nameVi} · Hồi ${economyTrial.potions[id].amount} · Dùng cỡ nhỏ trước`
        : `Không còn bình ${resource === 'hp' ? 'máu' : 'mana'}`;
      const hotkey = resource === 'hp' ? '1' : '2';
      button.title = `${hotkey} · ${seconds ? `Đang hồi · ${seconds}s` : label}`;
      button.setAttribute('aria-label', `${label} · Phím ${hotkey}`);
    }
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
        ? 'Thủ lĩnh · Chung'
        : 'Quái thường · Riêng';
    const entryNote = document.querySelector('#dungeon-entry-note');
    if (entryNote)
      entryNote.textContent = canEnter
        ? `${isBossDestination(this.dungeonDestination) ? 'Phó bản chung' : 'Phó bản riêng'} · ${{ forest: 'Rừng Trúc', desert: 'Sa Mạc', sea: 'Biển', hell: 'Địa Ngục', chu_ba_thong: 'Chu Bá Thông', hong_liet: 'Hoàn Nhan Hồng Liệt', kim_luan: 'Kim Luân Pháp Vương · Tương Dương', co_mo: 'Cổ Mộ Phái' }[this.dungeonDestination]}.`
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
    const hell = hero.zoneId.startsWith('hell_');
    const coMo = hero.zoneId.startsWith('co_mo_');
    const hongLiet = hero.zoneId.startsWith('hong_liet_');
    const kim = hero.zoneId.startsWith('kim_luan_');
    zoneStatus.title = '';
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
                ? `Hoàn Nhan Hồng Liệt · ${zone.access === 'private' ? 'Riêng' : 'Chung'}${zone.bossRespawnTicks ? ` · Hồi sinh ${Math.ceil(zone.bossRespawnTicks / 30)}s` : ''}`
                : `${dungeon?.id === 'chu_ba_thong' ? 'Chu Bá Thông' : hell ? 'Địa Ngục' : beach ? 'Biển' : desert ? 'Sa Mạc' : 'Rừng Trúc'} · ${zone.access === 'private' ? 'Riêng' : 'Chung'} · Đợt ${zone.wave} · ${zone.living} còn lại${zone.nextWaveTicks > 0 ? ` · Đợt tiếp sau ${Math.ceil(zone.nextWaveTicks / m1Config.tickRate)}s` : ''}`
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
    element('#duong-mon-innate-icon').hidden =
      hero.schoolId !== duongMon.school;
    element('#ngu-doc-innate-icon').hidden = hero.schoolId !== nguDoc.school;
    element('#viewport').dataset['heroSchool'] = hero.schoolId;
    element('#viewport').dataset['heroForm'] = heroTexture(
      hero.basicId,
      hero.schoolId,
    );
    element('#viewport').style.setProperty(
      '--hero-idle',
      'url("' +
        heroIdleUrl(
          // Both monk weapon presentations share one square portrait source.
          hero.schoolId === 'thieu_lam'
            ? 'hero_thieu_lam'
            : heroTexture(hero.basicId, hero.schoolId),
        ) +
        '")',
    );
    element('.portrait').title =
      'Chân dung ' +
      (schools.find((s) => s.id === hero.schoolId)?.name ?? 'Cái Bang');
    const chuong = hero.basicId === 'cai_bang_chuong';
    element('#viewport').dataset['basicStyle'] = chuong ? 'chuong' : 'bong';
    element('#slot-a .pixel-icon').className =
      `pixel-icon ${chuong ? 'icon-palm' : 'icon-staff'}`;
    element('#hero-level').textContent = String(hero.level);
    for (const [name, value, max, label] of [
      ['hp', hero.hp, hero.maxHp, 'SL'],
      ['mp', hero.mana, hero.maxMana, 'NL'],
      [
        'xp',
        hero.xp,
        hero.inventory.campaign
          ? Math.max(
              1,
              JSON.parse(hero.inventory.campaign).xpNext -
                JSON.parse(hero.inventory.campaign).xpStart,
            )
          : m1Config.xpPerLevel,
        'KN',
      ],
    ] as const) {
      const meter = element(`.meter.${name}`);
      // XP is cumulative; only the visual progress within the current level wraps.
      const capped = name === 'xp' && hero.level >= m1Config.maxLevel;
      const progress =
        name === 'xp'
          ? capped
            ? max
            : hero.inventory.campaign
              ? value - JSON.parse(hero.inventory.campaign).xpStart
              : value % max
          : value;
      meter.setAttribute('aria-valuenow', String(progress));
      meter.setAttribute('aria-valuemax', String(max));
      meter.querySelector<HTMLElement>('i')!.style.width =
        `${Math.min(100, Math.max(0, (progress / max) * 100))}%`;
      element(`#${name}-text`).textContent = capped
        ? 'Kinh nghiệm tối đa · Cấp 30'
        : `${label} ${Math.floor(progress)} / ${Math.ceil(max)}`;
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
    element('#dash-charges').textContent = String(hero.dashCharges);
    element('#dash-timer').textContent =
      hero.dashRechargeTicks > 0
        ? `${(hero.dashRechargeTicks / m1Config.tickRate).toFixed(1)}s`
        : '';
    const dashProgress = element<HTMLProgressElement>('#dash-progress');
    dashProgress.max = m1Config.mobility!.rechargeTicks;
    dashProgress.value =
      m1Config.mobility!.rechargeTicks - hero.dashRechargeTicks;
    element('#dash-status').classList.toggle(
      'unavailable',
      hero.hp <= 0 ||
        hero.dashCharges === 0 ||
        hero.statuses.includes('"dash_lock"'),
    );
    const fixed = hero.build.mode === 'fixed';
    const points = element('#fixed-skill-points');
    points.hidden = inDuel || !fixed || hero.build.available === 0;
    points.textContent = hero.build.available + ' điểm · Giữ O + QWERT';
    const stance = element('#shaolin-stance');
    stance.hidden = !fixed || hero.basicId !== 'thieu_lam_quyen';
    stance.textContent =
      (hero.build.slotSkills[0] === 'toan_phong_thoai' ? 'Cước' : 'Quyền') +
      ' · F';
    const dodge = directDodgeChance(hero.schoolId, hero.level, m1Config);
    const passive = element('#innate-dodge');
    passive.hidden = dodge === 0;
    passive.textContent =
      'Bắc Minh Thần Công · Né đòn ' + dodgePercentage.format(dodge);
    element('.loadout-toggle').hidden = !!this.state?.requiresBranch;
    element('#slot-t').hidden = !fixed;
    updateAuxiliarySlot(hero);
    const slots = [
      {
        key: 'a' as const,
        remaining: hero.basicCooldown,
        ability: m1Config.basics[hero.basicId],
      },
      ...(['q', 'w', 'e', 'r', 't'] as const).map((key, index) => {
        const id = fixed
          ? (hero.build.slotSkills[index] ?? '')
          : hero[`${key}Skill`];
        return {
          key,
          remaining: hero[`${key}Cooldown`],
          ability: hero.build.enabled
            ? m1Config.progression?.skills[id]?.ranks[
                Math.max(0, (hero.build.ranks.get(id) ?? 0) - 1)
              ]
            : m1Config.skillCatalogue?.[id],
        };
      }),
    ];
    const activeStatuses = JSON.parse(hero.statuses) as Array<{
      kind: string;
      ticks: number;
    }>;
    const plant = hero.build.charges.get(conLuan.plant);
    const placed = [...(this.state?.areas.values() ?? [])].filter(
      (area) =>
        area.abilityId === conLuan.plant &&
        area.ownerId === this.sessionId &&
        area.zoneId === hero.zoneId,
    ).length;
    element('#kinh-loi-status').hidden = !plant;
    element('#kinh-loi-charges').textContent = plant
      ? String(Math.min(plant.count, plant.capacity - placed))
      : '';
    element('#kinh-loi-timer').textContent = plant?.rechargeTicks
      ? (plant.rechargeTicks / m1Config.tickRate).toFixed(1)
      : '';
    const conLuanStance = element('#con-luan-stance');
    conLuanStance.hidden = hero.basicId !== conLuan.monk;
    conLuanStance.textContent = activeStatuses.some(
      (s) => s.kind === 'con_luan_ranged',
    )
      ? 'Đánh xa'
      : 'Đánh gần';
    const recallReady = [...(this.state?.projectiles.values() ?? [])].some(
      (shot) =>
        shot.ownerId === this.sessionId &&
        shot.zoneId === hero.zoneId &&
        (shot.stage === 'fan_outbound' || shot.stage === 'fan_hold'),
    );
    const hasReaper =
      hero.basicId === nguDoc.coSu &&
      [...(this.state?.creeps.values() ?? [])].some(
        (minion) =>
          minion.ownerId === this.sessionId &&
          minion.zoneId === hero.zoneId &&
          minion.archetypeId === 'ngu_doc_reaper' &&
          minion.hp > 0,
      );
    for (const { key, remaining: cooldownRemaining, ability } of slots) {
      const charge = hero.build.charges.get(ability?.id ?? '');
      const remaining =
        charge && charge.count === 0 ? charge.rechargeTicks : cooldownRemaining;
      const rank =
        key === 'a'
          ? 1
          : hero.build.enabled
            ? (hero.build.ranks.get(ability?.id ?? '') ?? 0)
            : 1;
      const recall =
        ability?.effect.mode === 'projectile' &&
        !!ability.effect.recallDrain &&
        recallReady;
      const fortune =
        ability?.effect.mode === 'fortune'
          ? activeStatuses.find((s) => s.kind === 'fortune_roll')
          : undefined;
      const recast =
        recall ||
        !!fortune ||
        (ability?.effect.mode === 'projectile' &&
          ability.effect.blinkWindowTicks !== undefined &&
          hero.blinkTicks > 0);
      const reaperActive = ability?.id === nguDoc.reaper && hasReaper;
      const passive =
        ability?.id === nguDoc.counter || ability?.id === nguDoc.zombie;
      const slot = element(`#slot-${key}`),
        cooling = remaining > 0 && !recast,
        cost = recast ? 0 : (ability?.manaCost ?? 0);
      slot.dataset['recastReady'] = String(recast);
      slot.classList.toggle('cooling', cooling);
      const controlled = activeStatuses.some(
        (s) =>
          s.kind === 'stun' ||
          s.kind === (key === 'a' ? 'disarm' : 'silence') ||
          (!fortune && (s.kind === 'dash' || s.kind === 'channel')),
      );
      slot.classList.toggle(
        'unavailable',
        !canDuel ||
          !ability ||
          rank === 0 ||
          hero.hp <= 0 ||
          hero.mana < cost ||
          charge?.count === 0 ||
          reaperActive ||
          controlled,
      );
      slot.classList.toggle('unequipped', !ability);
      slot.classList.toggle('passive-skill', passive);
      slot.classList.toggle(
        'recast-ready',
        recast ||
          (ability?.id === nguDoc.palm &&
            activeStatuses.some((s) => s.kind === 'ngu_doc_palm')) ||
          (ability?.id === nguDoc.aura &&
            activeStatuses.some((s) => s.kind === 'ngu_doc_aura')),
      );
      if (key !== 'a') {
        let badge = slot.querySelector<HTMLElement>('.skill-rank');
        if (!badge) {
          badge = document.createElement('b');
          badge.className = 'skill-rank';
          slot.append(badge);
        }
        badge.textContent = hero.build.enabled && ability ? String(rank) : '';
        const upgrade = slot.querySelector<HTMLButtonElement>('.rank-up')!;
        const gate = ability
          ? m1Config.progression?.skills[ability.id]?.levelGates[rank]
          : undefined;
        upgrade.hidden =
          inDuel ||
          !fixed ||
          !ability ||
          gate === undefined ||
          hero.build.available === 0;
        upgrade.disabled =
          hero.hp <= 0 ||
          this.blocked ||
          gate === undefined ||
          hero.level < gate;
        upgrade.title =
          ability && gate !== undefined
            ? 'Tăng ' +
              ability.nameVi +
              ' lên bậc ' +
              (rank + 1) +
              ' · Cấp ' +
              gate
            : '';
        upgrade.setAttribute('aria-label', upgrade.title);
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
        [
          'cai_bang',
          'thien_son',
          'vo_dang',
          'thieu_lam',
          'con_luan',
          'duong_mon',
          'ngu_doc',
        ].includes(hero.schoolId)
      ) {
        const art = slot.querySelector<HTMLElement>('.pixel-icon')!;
        art.className = 'pixel-icon skill-icon';
        art.style.background = `url("${skillIcon(hero.basicId)}") center / contain no-repeat`;
      } else if (key === 'a')
        slot.querySelector<HTMLElement>('.pixel-icon')!.style.background = '';
      element(`#timer-${key}`).textContent = passive
        ? ''
        : recast
          ? recall
            ? ''
            : ((fortune?.ticks ?? hero.blinkTicks) / m1Config.tickRate).toFixed(
                1,
              )
          : cooling
            ? (remaining / m1Config.tickRate).toFixed(1)
            : '';
      slot.querySelector<HTMLElement>('.cooldown-shade')!.style.height =
        `${recast ? 0 : Math.min(100, (remaining / (ability?.cooldownTicks || 1)) * 100)}%`;
      element(`#cooldown-${key}`).textContent =
        key === 'a'
          ? hero.schoolId === nguDoc.school
            ? hero.basicId === nguDoc.coSu
              ? 'Đạn trượng'
              : 'Chưởng'
            : hero.schoolId === 'duong_mon'
              ? hero.basicId === 'duong_mon_am_khi'
                ? 'Băng Châm'
                : 'Tụ Tiễn'
              : hero.schoolId === 'con_luan'
                ? hero.basicId === 'con_luan_kiem_ton'
                  ? 'Kiếm Tôn'
                  : 'Thiền Sư'
                : hero.schoolId === 'thieu_lam'
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
          : recast
            ? recall
              ? 'Thu quạt'
              : fortune
                ? 'Chốt quẻ'
                : 'Hiện thân'
            : charge
              ? `${charge.count}/${charge.capacity} lượt`
              : ability
                ? fixed && !rank
                  ? 'Cấp ' +
                    m1Config.progression?.skills[ability.id]?.levelGates[0]
                  : `${cost} NL`
                : 'Trống';
      const id = ability?.id ?? '';
      const definition = m1Config.progression?.skills[id];
      if (
        slot.dataset['skillId'] !== id ||
        slot.dataset['skillRank'] !== String(rank)
      ) {
        slot.dataset['skillId'] = id;
        slot.dataset['skillRank'] = String(rank);
        const name = ability?.nameVi ?? 'Chưa trang bị';
        element(`#skill-tip-${key} strong`).textContent = name;
        slot
          .querySelector('.pixel-icon')!
          .setAttribute('aria-label', `${name} · ${key.toUpperCase()}`);
        element(`#skill-tip-${key} .skill-tip-description`).textContent =
          definition?.descriptionVi ??
          (ability ? abilitySummary(ability).replace(/^ · /, '') : '');
        element(`#skill-tip-${key} .skill-tip-stats`).textContent =
          ability && definition && rank > 0 ? skillRankStats(ability) : '';
      }
      const status = !ability
        ? 'Chưa mở'
        : rank === 0
          ? `Chưa học${definition ? ' · Cấp ' + definition.levelGates[0] : ''}`
          : passive
            ? 'Nội tại'
            : reaperActive
              ? 'Thần Chết đang chiến đấu'
              : controlled
                ? 'Đang bị khống chế'
                : cooling
                  ? 'Đang hồi chiêu'
                  : hero.mana < cost
                    ? 'Thiếu nội lực'
                    : 'Sẵn sàng';
      const details = [
        key !== 'a' && hero.build.enabled && rank > 0 ? `Bậc ${rank}` : '',
        status,
        charge ? `${charge.count}/${charge.capacity} lượt` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      const tipState = element(`#skill-tip-${key} .skill-tip-state`);
      if (tipState.textContent !== details) tipState.textContent = details;
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keydown, true);
    window.clearTimeout(this.toastTimer);
  }
}
