import { heroTexture } from './art.js';
import { forestArtNotice } from './forest-creeps.js';
import {
  arena,
  lobbyConfig,
  m1Config,
  schools,
  skillIcon,
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
  private dungeonDestination: 'forest' | 'desert' = 'forest';
  private ended = false;
  private defense: DefenseHud;
  private skillMenu: SkillMenu | undefined;
  onBuild: (change: BuildChange) => void = () => {};
  private ack = 'Share the room ID with a friend.';
  private toastTimer: number | undefined;
  onBasic: (id: string) => void = () => {};
  onLoadout: (ids: string[]) => void = () => {};
  onCheck: () => void = () => {};
  onLeave: () => void = () => {};
  onStudy: (enabled: boolean) => void = () => {};
  onDungeonEnter: (
    access: 'private' | 'shared',
    destination: 'forest' | 'desert',
  ) => void = () => {};
  constructor(artPreview: boolean) {
    element('#app').innerHTML = `
      <main id="viewport" aria-label="Võ Lâm game viewport">
        <div id="game" aria-label="Game canvas"></div>
        <div id="hud" aria-label="In-game HUD">
          <section class="hero-hud framed"><div class="portrait" title="Approved Cái Bang character artwork"><span id="hero-level">1</span></div><div class="hero-bars"><div class="hero-name"><strong id="hero-name">Traveler</strong><small id="school-name">Cái Bang</small></div>
            <div class="meter hp" role="meter" aria-label="HP" aria-valuemin="0"><i></i><span id="hp-text">—</span></div><div class="meter mp" role="meter" aria-label="Mana" aria-valuemin="0"><i></i><span id="mp-text">—</span></div><div class="meter xp" role="meter" aria-label="Experience" aria-valuemin="0"><i></i><span id="xp-text">—</span></div></div></section>
          <nav class="system-buttons" aria-label="Game menus"><button data-menu="settings" title="Settings" aria-label="Settings">${icon('settings')}<span>Cài đặt</span></button><button data-action="quit" title="Quit" aria-label="Quit">${icon('quit')}<span>Thoát</span></button><button data-menu="dungeons" title="Phó Bản" aria-label="Phó Bản">${icon('portal')}<span>Phó Bản</span></button><button data-menu="merchant" title="Thương Gia" aria-label="Thương Gia">${icon('shop')}<span>Thương Gia</span></button><button data-menu="pvp" title="Lôi Đài" aria-label="Lôi Đài">${icon('swords')}<span>Lôi Đài</span></button></nav>
          <span class="sr-only"><span id="hud-connection">Connected</span> · <span id="current-room" data-testid="room-id">—</span> · <span id="player-count" data-testid="player-count">0 / 6</span></span>
          <section class="bag-cluster framed"><button data-menu="inventory" title="Inventory">${icon('bag')}<span>Túi đồ</span></button><div>${icon('gold')}<strong class="live-gold">0</strong><small>Gold</small></div></section>
          <section class="hotbar framed" aria-label="Keyboard combat hotbar">
            ${[
              ['a', 'staff', 'Normal attack · A'],
              ['q', 'flame', 'Hỏa Vân Chưởng · Q'],
              ['w', 'dragon', 'Cuồng Long Loạn Vũ · W'],
              ['e', 'lock', 'E · Unequipped'],
              ['r', 'lock', 'R · Unequipped'],
            ]
              .map(
                ([key, art, title]) =>
                  `<div id="slot-${key}" class="hotbar-slot ${key === 'e' || key === 'r' ? 'unequipped' : ''}" title="${title}">${icon(art!)}<kbd>${key!.toUpperCase()}</kbd><b id="timer-${key}" class="cooldown-number"></b><small id="cooldown-${key}">${key === 'q' ? '18 MP' : key === 'w' ? '25 MP' : key === 'a' ? 'Bổng' : 'Empty'}</small><div class="cooldown-shade"></div></div>`,
              )
              .join('')}
            <button class="loadout-toggle" data-menu="skills" title="Võ học / điểm kỹ năng">◇<span id="available-points"></span></button>
          </section>
          <p id="scene-status" class="scene-ready" aria-hidden="true">${artPreview ? 'ART PREVIEW' : ''}</p>
          <p id="zone-status" hidden role="status"></p>
        </div>
        <section id="lobby" class="lobby-layer"><div class="lobby-window framed"><p class="eyebrow">VÕ LÂM · HERO DEFENSE</p><h1>Tịnh Phong Viện</h1><p>A quiet courtyard. Your first steps in the martial world.</p><form id="join-form"><label for="nickname">Nickname</label><input id="nickname" maxlength="${lobbyConfig.nicknameMaxLength}" autocomplete="off" required placeholder="Your nickname"/><button type="submit" id="create" class="accent">Create room</button><div class="divider">or join a friend</div><label for="room-id">Room ID</label><div class="join-row"><input id="room-id" autocomplete="off" maxlength="64" placeholder="Paste room ID"/><button type="submit" id="join">Join room</button></div></form><p id="status" data-testid="status" role="status" aria-live="polite">Disconnected</p><small>Nickname only · 1–6 players · No saved progress<br>M1 combat prototype · Artwork awaiting review</small></div></section>
        <div id="modal-layer" hidden><section id="game-dialog" class="game-window framed" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><header class="window-title"><span class="title-flourish">❖</span><h2 id="dialog-title"></h2><button id="close-menu" aria-label="Close menu">×</button></header><div id="dialog-content" class="window-body"></div><small class="menu-safety">The match continues while this menu is open · Escape to close</small></section></div>
        <div id="study-banner" class="study-banner framed" hidden><strong>RỪNG TRÚC · ENVIRONMENT STUDY</strong><span>Visual preview only. Your hero remains in the live arena.</span><button id="return-study">Return to arena</button></div>
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
        if (target.dataset['action'] === 'quit') this.onLeave();
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
    this.defense.hide();
    this.roomId = id;
    this.sessionId = session;
    if (id) {
      this.ack = 'Share the room ID with a friend.';
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
        : 'The match continues while this menu is open · Escape to close';
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
        this.notify('Fullscreen is unavailable in this browser.'),
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
            '<p>Development test loadout · Rank 1. Mana and cooldowns remain authoritative.</p>' +
            ids
              .map(
                (id, i) =>
                  `<label>${'QWER'[i]}<select data-skill-slot="${i}" aria-label="Test skill ${'QWER'[i]}"><option value="">Chưa trang bị</option>${Object.values(
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
            `<button id="apply-test-skills" ${h.zoneId !== 'arena' || h.hp <= 0 ? 'disabled' : ''}>Apply test loadout</button>`;
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
      .querySelector('#check')
      ?.addEventListener('click', () => this.onCheck());
    document
      .querySelector('#leave')
      ?.addEventListener('click', () => this.onLeave());
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
          (destination === 'forest' || destination === 'desert')
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
        name.textContent = `${hero.nickname}${id === this.sessionId ? ' (you)' : ''} · Lv ${hero.level}`;
        const checks = document.createElement('small');
        checks.textContent = `Checks: ${hero.checks}`;
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
    this.skillMenu?.update(hero);
    element('#available-points').textContent = hero.build.enabled
      ? String(hero.build.available)
      : '';
    const inArena = hero.zoneId === 'arena';
    const canEnter = inArena && hero.hp > 0;
    const enter = document.querySelector<HTMLButtonElement>('#enter-dungeon');
    if (enter) enter.disabled = !canEnter;
    const entryNote = document.querySelector('#dungeon-entry-note');
    if (entryNote)
      entryNote.textContent = canEnter
        ? `Chọn Riêng hoặc Chung để vào ${this.dungeonDestination === 'desert' ? 'Sa Mạc' : 'Rừng Trúc'}.`
        : inArena
          ? 'Bạn cần hồi sinh trước khi vào phó bản.'
          : 'Đến cổng Lối Ra để trở về đấu trường.';
    const studyButton =
      document.querySelector<HTMLButtonElement>('#forest-study');
    if (studyButton) studyButton.disabled = !inArena;
    const zone = state.dungeons.get(hero.zoneId);
    const zoneStatus = element('#zone-status');
    zoneStatus.hidden = inArena && hero.respawnTicks <= 0;
    const desert = hero.zoneId.startsWith('desert_');
    const artNotice = desert
      ? 'Creep: prototype · chờ duyệt hình ảnh trong game'
      : forestArtNotice(
          [...state.creeps.values()]
            .filter((a) => a.zoneId === hero.zoneId)
            .map((a) => a.archetypeId),
        );
    zoneStatus.title = zone ? artNotice : '';
    zoneStatus.textContent =
      hero.respawnTicks > 0
        ? `Defeated · Return to arena in ${Math.ceil(hero.respawnTicks / m1Config.tickRate)}s`
        : zone
          ? `${desert ? 'Sa Mạc' : 'Rừng Trúc'} · ${zone.access === 'private' ? 'Private' : 'Shared'} · Wave ${zone.wave} · ${zone.living} remaining${zone.nextWaveTicks > 0 ? ` · Next wave ${Math.ceil(zone.nextWaveTicks / m1Config.tickRate)}s` : ''} · ${artNotice}`
          : '';
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
        ? 'Approved Thiếu Lâm character artwork'
        : hero.schoolId === 'vo_dang'
          ? 'Approved Võ Đang character artwork'
          : hero.schoolId === 'thien_son'
            ? 'Approved Thiên Sơn character artwork'
            : 'Approved Cái Bang character artwork';
    const chuong = hero.basicId === 'cai_bang_chuong';
    element('#viewport').dataset['basicStyle'] = chuong ? 'chuong' : 'bong';
    element('#slot-a .pixel-icon').className =
      `pixel-icon ${chuong ? 'icon-palm' : 'icon-staff'}`;
    element('#hero-level').textContent = String(hero.level);
    for (const [name, value, max, label] of [
      ['hp', hero.hp, hero.maxHp, 'HP'],
      ['mp', hero.mana, hero.maxMana, 'MP'],
      ['xp', hero.xp, m1Config.xpPerLevel, 'XP'],
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
        ? 'EXP MAX · Cấp 30'
        : `${label} ${Math.floor(progress)} / ${max}`;
    }
    element('#hero-stats').textContent =
      `Lv ${hero.level} · HP ${Math.ceil(hero.hp)}/${hero.maxHp} · MP ${Math.floor(hero.mana)}/${hero.maxMana} · XP ${hero.xp} · Gold ${hero.gold} · Skill points ${hero.skillPoints}`;
    for (const target of document.querySelectorAll('.live-gold'))
      target.textContent = String(hero.gold);
    const stats = document.querySelector('#inventory-stats');
    if (stats)
      stats.textContent = `Level ${hero.level} · HP ${Math.ceil(hero.hp)}/${hero.maxHp} · MP ${Math.floor(hero.mana)}/${hero.maxMana} · XP ${hero.xp} · Skill points ${hero.skillPoints}`;
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
            ? `${cost} MP`
            : 'Empty';
      slot.title = `${ability?.nameVi ?? 'Chưa trang bị'}${key !== 'a' && hero.build.enabled ? ' · Bậc ' + rank : ''} · ${!ability ? 'Unavailable' : rank === 0 ? 'Chưa học' : controlled ? 'Controlled' : cooling ? 'Cooldown' : hero.mana < cost ? 'Need mana' : 'Ready'}`;
      slot.dataset['skillId'] = ability?.id ?? '';
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keydown, true);
    window.clearTimeout(this.toastTimer);
  }
}
