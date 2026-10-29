import { arena, lobbyConfig, m1Config } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import { icon, menuContents, menuTitles, type Menu } from './menus.js';
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
  private ack = 'Share the room ID with a friend.';
  private toastTimer: number | undefined;
  onBasic: (id: string) => void = () => {};
  onCheck: () => void = () => {};
  onLeave: () => void = () => {};
  onStudy: (enabled: boolean) => void = () => {};
  constructor(artPreview: boolean) {
    element('#app').innerHTML = `
      <main id="viewport" aria-label="Võ Lâm game viewport">
        <div id="game" aria-label="Game canvas"></div>
        <div id="hud" aria-label="In-game HUD">
          <section class="hero-hud framed"><div class="portrait" title="M1 prototype artwork"><span id="hero-level">1</span></div><div class="hero-bars"><div class="hero-name"><strong id="hero-name">Traveler</strong><small>Cái Bang</small></div>
            <div class="meter hp" role="meter" aria-label="HP" aria-valuemin="0"><i></i><span id="hp-text">—</span></div><div class="meter mp" role="meter" aria-label="Mana" aria-valuemin="0"><i></i><span id="mp-text">—</span></div><div class="meter xp" role="meter" aria-label="Experience" aria-valuemin="0"><i></i><span id="xp-text">—</span></div></div></section>
          <section class="world-status framed" aria-label="Statue and invasion status"><strong id="location-title">TỊNH PHONG VIỆN</strong><span>Statue — · Invasions inactive</span><small>M1 practice · prototype art</small></section>
          <nav class="system-buttons" aria-label="Game menus"><button data-menu="skills" title="Skills / normal attack">${icon('scroll')}<span>Võ học</span></button><button data-menu="dungeons" title="Dungeon menu">${icon('portal')}<span>Phó bản</span></button><button data-menu="merchant" title="Merchant">${icon('shop')}<span>Thương gia</span></button><button data-menu="pvp" title="PvP preview">${icon('swords')}<span>Lôi đài</span></button><button data-menu="party" title="Players and connection">${icon('party')}<span>Đồng đội</span></button></nav>
          <button class="room-chip framed" data-menu="party"><span id="hud-connection">Connected</span> · <span id="current-room" data-testid="room-id">—</span> · <span id="player-count" data-testid="player-count">0 / 6</span></button>
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
            <button class="loadout-toggle" data-menu="skills" title="Change normal attack / view skills">◇</button>
          </section><p class="control-hint">↑ ↓ ← → Move <span>·</span> A Attack <span>·</span> Q W E R Skills</p>
          <section class="minimap framed" aria-label="Practice arena minimap"><header>Tịnh Phong Viện <small>N ↑</small></header><svg viewBox="0 0 200 144" role="img" aria-label="Live player and creep positions"><rect width="200" height="144" fill="#304c38"/><path d="M96 0h8v144h-8zM0 80h200v8H0zM84 60h40v40H84z" fill="#a59c77"/><g id="map-markers"></g></svg><small>● You <span>● Party</span> <em>● Creeps</em></small></section>
          <p id="scene-status" class="scene-ready" aria-hidden="true">${artPreview ? 'ART PREVIEW' : ''}</p>
        </div>
        <section id="lobby" class="lobby-layer"><div class="lobby-window framed"><p class="eyebrow">VÕ LÂM · HERO DEFENSE</p><h1>Tịnh Phong Viện</h1><p>A quiet courtyard. Your first steps in the martial world.</p><form id="join-form"><label for="nickname">Nickname</label><input id="nickname" maxlength="${lobbyConfig.nicknameMaxLength}" autocomplete="off" required placeholder="Your nickname"/><button type="submit" id="create" class="accent">Create room</button><div class="divider">or join a friend</div><label for="room-id">Room ID</label><div class="join-row"><input id="room-id" autocomplete="off" maxlength="64" placeholder="Paste room ID"/><button type="submit" id="join">Join room</button></div></form><p id="status" data-testid="status" role="status" aria-live="polite">Disconnected</p><small>Nickname only · 1–6 players · No saved progress<br>M1 combat prototype · Artwork awaiting review</small></div></section>
        <div id="modal-layer" hidden><section id="game-dialog" class="game-window framed" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><header class="window-title"><span class="title-flourish">❖</span><h2 id="dialog-title"></h2><button id="close-menu" aria-label="Close menu">×</button></header><div id="dialog-content" class="window-body"></div><small class="menu-safety">The match continues while this menu is open · Escape to close</small></section></div>
        <div id="study-banner" class="study-banner framed" hidden><strong>RỪNG TRÚC · ENVIRONMENT STUDY</strong><span>Visual preview only. Your hero remains in the live arena.</span><button id="return-study">Return to arena</button></div>
        <div id="announcements" aria-live="polite"><p id="feedback" role="status" hidden></p></div>
        <p id="hero-stats" data-testid="hero-stats" class="sr-only"></p>
      </main>`;
    if (artPreview) document.body.classList.add('art-preview');
    element('#viewport').addEventListener('click', (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-menu]')
          : null;
      if (target && this.roomId && !this.study)
        this.open(target.dataset['menu'] as Menu);
    });
    element('#modal-layer').addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target === element('#modal-layer')) this.close();
    });
    element('#close-menu').addEventListener('click', () => this.close());
    element('#return-study').addEventListener('click', () =>
      this.setStudy(false),
    );
    window.addEventListener('keydown', this.keydown, true);
  }
  get blocked(): boolean {
    return !!this.menu || this.study;
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
    if (this.menu === menu) {
      this.close();
      return;
    }
    this.menu = menu;
    window.dispatchEvent(new Event('volam:controls-blocked'));
    element('#dialog-title').textContent = menuTitles[menu];
    document.querySelector('#dialog-actions')?.remove();
    element('#dialog-content').innerHTML = menuContents(menu);
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
    const select = document.querySelector<HTMLSelectElement>('#basic-style');
    select?.addEventListener('change', () => this.onBasic(select.value));
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
    element('#modal-layer').hidden = true;
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
    element('#map-markers').innerHTML = [
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
    element('#hero-name').textContent = hero.nickname;
    element('#hero-level').textContent = String(hero.level);
    for (const [name, value, max, label] of [
      ['hp', hero.hp, hero.maxHp, 'HP'],
      ['mp', hero.mana, hero.maxMana, 'MP'],
      ['xp', hero.xp, m1Config.xpPerLevel, 'XP'],
    ] as const) {
      const meter = element(`.meter.${name}`);
      // XP is cumulative; only the visual progress within the current level wraps.
      const progress = name === 'xp' ? value % max : value;
      meter.setAttribute('aria-valuenow', String(progress));
      meter.setAttribute('aria-valuemax', String(max));
      meter.querySelector<HTMLElement>('i')!.style.width =
        `${Math.min(100, Math.max(0, (progress / max) * 100))}%`;
      element(`#${name}-text`).textContent =
        `${label} ${Math.floor(progress)} / ${max}`;
    }
    element('#hero-stats').textContent =
      `Lv ${hero.level} · HP ${Math.ceil(hero.hp)}/${hero.maxHp} · MP ${Math.floor(hero.mana)}/${hero.maxMana} · XP ${hero.xp} · Gold ${hero.gold} · Skill points ${hero.skillPoints}`;
    for (const target of document.querySelectorAll('.live-gold'))
      target.textContent = String(hero.gold);
    const stats = document.querySelector('#inventory-stats');
    if (stats)
      stats.textContent = `Level ${hero.level} · HP ${Math.ceil(hero.hp)}/${hero.maxHp} · MP ${Math.floor(hero.mana)}/${hero.maxMana} · XP ${hero.xp} · Skill points ${hero.skillPoints}`;
    const select = document.querySelector<HTMLSelectElement>('#basic-style');
    if (select && document.activeElement !== select)
      select.value = hero.basicId;
    for (const [key, remaining, total, cost] of [
      [
        'a',
        hero.basicCooldown,
        m1Config.basics[hero.basicId]?.cooldownTicks ?? 18,
        0,
      ],
      [
        'q',
        hero.qCooldown,
        m1Config.skills[0]!.cooldownTicks,
        m1Config.skills[0]!.manaCost,
      ],
      [
        'w',
        hero.wCooldown,
        m1Config.skills[1]!.cooldownTicks,
        m1Config.skills[1]!.manaCost,
      ],
    ] as const) {
      const slot = element(`#slot-${key}`);
      const cooling = remaining > 0;
      slot.classList.toggle('cooling', cooling);
      slot.classList.toggle('unavailable', hero.hp <= 0 || hero.mana < cost);
      element(`#timer-${key}`).textContent = cooling
        ? (remaining / m1Config.tickRate).toFixed(1)
        : '';
      slot.querySelector<HTMLElement>('.cooldown-shade')!.style.height =
        `${Math.min(100, (remaining / (total || 1)) * 100)}%`;
      element(`#cooldown-${key}`).textContent =
        key === 'a'
          ? hero.basicId === 'cai_bang_bong'
            ? 'Bổng'
            : 'Chưởng'
          : `${cost} MP`;
      slot.title = `${key === 'a' ? 'Normal attack' : key === 'q' ? 'Hỏa Vân Chưởng' : 'Cuồng Long Loạn Vũ'} · ${cooling ? 'Cooldown' : hero.mana < cost ? 'Need mana' : 'Ready'}`;
    }
  }
  destroy(): void {
    window.removeEventListener('keydown', this.keydown, true);
    window.clearTimeout(this.toastTimer);
  }
}
