import type { LobbyState } from '@volam/game-protocol';

type Hero = NonNullable<ReturnType<LobbyState['players']['get']>>;
type Slot = 'weapon' | 'armor' | 'hat' | 'boots';
type Tab = 'equipment' | 'potions' | 'craft';
const art = (id: string, extra = '') =>
  `<img class="item-art ${extra}" src="${id.startsWith('/assets/') ? id : `/assets/inventory_ui/${id}.png`}" alt="" draggable="false"/>`;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const gear: Record<
  Slot,
  {
    name: string;
    stats: string;
    material: string;
    materialArt: string;
    boss: string;
    branches: Array<[string, string, string]>;
  }
> = {
  weapon: {
    name: 'Vũ khí',
    stats: 'Tăng sát thương',
    material: 'Kim Luân',
    materialArt: 'wheel',
    boss: 'Kim Luân Pháp Vương',
    branches: [
      ['weapon', 'Đánh lan', 'Đánh xa bắn ba tia; đánh gần tăng phạm vi lan.'],
      [
        'weapon',
        'Hút máu',
        'Hồi theo sát thương một đòn A, không nhân theo số địch.',
      ],
      ['weapon', 'Xuyên giáp', 'Đòn A bỏ qua một phần phòng thủ mục tiêu.'],
    ],
  },
  armor: {
    name: 'Giáp',
    stats: 'Phòng thủ · Máu tối đa',
    material: 'Đại Kim Chiến Giáp',
    materialArt: 'armor',
    boss: 'Hoàn Nhan Hồng Liệt',
    branches: [
      [
        'armor',
        'Phản đòn',
        'Có cơ hội phản đòn; khi kích hoạt chỉ nhận 50% sát thương.',
      ],
      ['armor', 'Aura làm chậm', 'Làm chậm kẻ địch quanh người.'],
      ['armor', 'Aura đốt', 'Gây sát thương đốt quanh người.'],
    ],
  },
  hat: {
    name: 'Mũ',
    stats: 'Hồi máu · Hồi mana',
    material: 'Đại Hồ Lô',
    materialArt: '/assets/chu/toan_chan_tien_tuu_icon.png',
    boss: 'Chu Bá Thông',
    branches: [
      ['hat', 'Hồi phục', 'Tăng hồi máu và hồi mana.'],
      ['hat', 'Bền bỉ', 'Tăng máu, mana tối đa và phòng thủ.'],
      ['hat', 'Tấn công', 'Tăng nhẹ sát thương và tỉ lệ chí mạng.'],
    ],
  },
  boots: {
    name: 'Giày',
    stats: 'Tốc chạy · Một ít chí mạng',
    material: 'Ngọc Uyên Ương',
    materialArt: 'jade_pair',
    boss: 'Lý Mạc Sầu',
    branches: [
      ['thanh_tam', 'Thanh Tâm', 'Giải làm chậm, độc và đốt.'],
      ['blink', 'Blink', 'Dịch chuyển về phía trước.'],
      ['needle', 'Phi châm', 'Một phi châm bay thẳng, gây làm chậm và độc.'],
    ],
  },
};
const slots = Object.keys(gear) as Slot[];
interface HeldItem {
  name: string;
  description: string;
  image?: string | undefined;
}

/** Presentation-only catalogue. No price, stat modifiers, ownership or commands are invented. */
export class ItemMenu {
  private tab: Tab = 'equipment';
  private slot: Slot = 'weapon';
  private craftSlot: Slot = 'boots';
  private branch = 0;
  private potion: 'potion_hp' | 'potion_mp' = 'potion_hp';
  private hero: Hero | undefined;
  private selectedItem = -1;
  private signature = '';
  private items: HeldItem[] = [];

  constructor(
    private root: HTMLElement,
    private kind: 'merchant' | 'inventory',
  ) {
    root.addEventListener('click', this.click);
    root.addEventListener('keydown', (event) => {
      const tab = (event.target as HTMLElement).closest<HTMLButtonElement>(
        '[data-ui-action="tab"]',
      );
      if (
        !tab ||
        !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
      )
        return;
      event.preventDefault();
      const tabs: Tab[] = ['equipment', 'potions', 'craft'];
      const index = tabs.indexOf(tab.dataset['value'] as Tab);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? 2
            : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      this.tab = tabs[next]!;
      this.render();
      root
        .querySelector<HTMLButtonElement>(
          `[data-ui-action="tab"][data-value="${this.tab}"]`,
        )
        ?.focus({ preventScroll: true });
    });
    this.render();
  }

  private click = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-ui-action]',
    );
    if (!button || button.disabled) return;
    const action = button.dataset['uiAction'],
      value = button.dataset['value'] ?? '';
    if (action === 'tab' && ['equipment', 'potions', 'craft'].includes(value))
      this.tab = value as Tab;
    else if (action === 'gear' && slots.includes(value as Slot))
      this.slot = value as Slot;
    else if (action === 'recipe' && slots.includes(value as Slot)) {
      this.craftSlot = value as Slot;
      this.branch = 0;
    } else if (action === 'branch' && /^[0-2]$/.test(value))
      this.branch = Number(value);
    else if (action === 'potion' && ['potion_hp', 'potion_mp'].includes(value))
      this.potion = value as typeof this.potion;
    else if (action === 'held' && /^\d+$/.test(value))
      this.selectedItem = Number(value);
    else return;
    event.stopPropagation();
    this.render();
    this.root
      .querySelector<HTMLButtonElement>(
        `[data-ui-action="${action}"][data-value="${value}"]`,
      )
      ?.focus({ preventScroll: true });
  };

  update(hero: Hero): void {
    this.hero = hero;
    // Only redraw on authoritative changes that affect this menu. Preserve focus/scroll otherwise.
    const signature = JSON.stringify([
      hero.zoneId,
      hero.hp <= 0,
      hero.bossItems,
      hero.bossLoot,
    ]);
    if (signature !== this.signature) {
      this.signature = signature;
      this.items = this.readItems(hero);
      this.render();
    }
    for (const value of this.root.querySelectorAll<HTMLElement>(
      '[data-item-stat]',
    )) {
      const key = value.dataset['itemStat'] as keyof typeof hero.build.stats;
      const number = Number(hero.build.stats[key]);
      value.textContent = Number.isFinite(number)
        ? key === 'critChance'
          ? `${(number * 100).toFixed(1)}%`
          : number.toFixed(1)
        : '—';
    }
    for (const value of this.root.querySelectorAll('.live-gold'))
      value.textContent = String(hero.gold);
  }

  private readItems(hero: Hero): HeldItem[] {
    const items: HeldItem[] = [];
    // Retained boss materials and Cổ Mộ claims remain separate server fields.
    try {
      for (const id of JSON.parse(hero.bossItems || '[]') as string[]) {
        items.push({
          name:
            id === 'toan_chan_tien_tuu'
              ? 'Toàn Chân Tiên Tửu'
              : id === 'kim_luan_tan_phien'
                ? 'Kim Luân Tàn Phiến'
                : 'Chiến lợi phẩm thủ lĩnh',
          description:
            'Chiến lợi phẩm đang giữ trong trận. Chưa có công thức trang bị tương ứng.',
          image:
            id === 'toan_chan_tien_tuu'
              ? '/assets/chu/toan_chan_tien_tuu_icon.png'
              : undefined,
        });
      }
      for (const claim of JSON.parse(hero.bossLoot || '[]') as Array<{
        nameVi: string;
      }>) {
        items.push({
          name: claim.nameVi,
          description:
            'Chiến lợi phẩm Cổ Mộ trong trận. Trang bị và sử dụng chưa mở.',
        });
      }
    } catch {
      /* Wait for a valid synchronized payload rather than fabricating contents. */
    }
    return items;
  }

  private choice(
    action: string,
    value: string,
    label: string,
    selected: boolean,
    content = '',
  ): string {
    return `<button type="button" data-ui-action="${action}" data-value="${value}" aria-pressed="${selected}" class="item-choice">${content}<strong>${label}</strong>${selected ? '<span class="item-check" aria-hidden="true">✓</span>' : ''}</button>`;
  }

  private render(): void {
    const active = document.activeElement;
    const focused =
      active instanceof HTMLButtonElement && this.root.contains(active)
        ? { action: active.dataset['uiAction'], value: active.dataset['value'] }
        : undefined;
    this.root.innerHTML =
      this.kind === 'inventory' ? this.inventory() : this.merchant();
    if (this.hero) {
      for (const value of this.root.querySelectorAll('.live-gold'))
        value.textContent = String(this.hero.gold);
    }
    if (focused?.action && focused.value !== undefined)
      (
        this.root.querySelector<HTMLButtonElement>(
          `[data-ui-action="${focused.action}"][data-value="${focused.value}"]`,
        ) ?? document.querySelector<HTMLButtonElement>('#close-menu')
      )?.focus({ preventScroll: true });
  }

  private merchant(): string {
    const selected = gear[this.slot],
      recipe = gear[this.craftSlot];
    const tabs = `<div class="item-tabs" role="tablist" aria-label="Các mục thương gia">${(
      [
        ['equipment', 'Trang bị'],
        ['potions', 'Bình dược'],
        ['craft', 'Chế tạo'],
      ] as const
    )
      .map(
        ([id, label]) =>
          `<button type="button" role="tab" id="item-tab-${id}" data-ui-action="tab" data-value="${id}" aria-controls="item-panel" aria-selected="${id === this.tab}" tabindex="${id === this.tab ? 0 : -1}">${label}</button>`,
      )
      .join(
        '',
      )}<span class="item-gold"><span class="pixel-icon icon-gold" aria-hidden="true"></span><b class="live-gold">${this.hero?.gold ?? '—'}</b></span></div>`;
    let body: string;
    if (this.tab === 'equipment')
      body = `<div class="item-shop-layout"><div class="item-catalogue">${slots.map((slot) => this.choice('gear', slot, gear[slot].name, slot === this.slot, `${art(slot)}<small>Chưa sở hữu</small>`)).join('')}</div><section class="item-detail">${art(this.slot, 'item-large')}<h3>${selected.name}</h3><p>${selected.stats}</p><div class="item-levels" aria-label="Năm cấp trang bị cơ bản">${'<i></i>'.repeat(5)}</div><p>Mua lại để tăng 1 cấp · Tối đa cấp 5</p><small>Giá và chỉ số chưa mở</small><button class="item-primary" disabled>Mua · Chưa mở</button></section></div>`;
    else if (this.tab === 'potions')
      body = `<div class="item-potion-layout"><div class="item-potion-choices">${this.choice('potion', 'potion_hp', 'Bình máu', this.potion === 'potion_hp', art('potion_hp'))}${this.choice('potion', 'potion_mp', 'Bình mana', this.potion === 'potion_mp', art('potion_mp'))}</div><section class="item-detail">${art(this.potion, 'item-large')}<h3>${this.potion === 'potion_hp' ? 'Bình máu' : 'Bình mana'}</h3><p>${this.potion === 'potion_hp' ? 'Hồi sinh lực' : 'Hồi nội lực'}</p><p>Thời gian chờ: <b>5 giây</b></p><p class="item-muted">Cỡ bình, lượng hồi và giá chưa mở.</p><button class="item-primary" disabled>Mua bình · Chưa mở</button><p data-testid="potion-restriction">${this.hero && this.hero.zoneId !== 'arena' ? 'Không mua bình trong phó bản.' : 'Chuẩn bị bình trước khi vào phó bản.'}</p></section></div>`;
    else
      body = `<div class="item-recipe-slots" aria-label="Chọn ô chế tạo">${slots.map((slot) => this.choice('recipe', slot, gear[slot].name, slot === this.craftSlot)).join('')}</div><div class="item-recipe">${art(this.craftSlot)}<span>${recipe.name} cấp 5</span><b>+</b>${art(recipe.materialArt)}<span>${recipe.material}<small>Từ ${recipe.boss}</small></span><b>+</b><span>Vàng<small>Chưa định giá</small></span></div><h3 class="item-branch-title">Chọn một nhánh</h3><div class="item-branches">${recipe.branches.map(([image, name, text], i) => this.choice('branch', String(i), name, i === this.branch, `${art(image)}${this.craftSlot === 'boots' ? '<kbd>Z</kbd>' : ''}<p>${text}</p>`)).join('')}</div><div class="item-craft-action"><p>Cần ${recipe.name.toLowerCase()} cấp 5 và ${recipe.material}.</p><button class="item-primary" disabled>Chế tạo · Chưa mở</button></div>`;
    return `${tabs}<section id="item-panel" role="tabpanel" aria-labelledby="item-tab-${this.tab}">${body}</section><p class="item-availability" role="status">Xem trước trang bị · Mua, nâng cấp và chế tạo chưa mở.</p>`;
  }

  private inventory(): string {
    const selected = this.items[this.selectedItem];
    return `<div class="item-inventory-layout"><section class="item-equipment-pane"><h3>Trang bị <small>4 ô</small></h3><div class="item-paper-doll"><div class="paper-hero" aria-label="Nhân vật hiện tại"></div>${slots.map((slot, i) => `<button type="button" class="equipment-slot item-equip-${i}" disabled aria-label="${gear[slot].name} · Chưa trang bị">${art(slot)}<strong>${gear[slot].name}</strong><small>Trống</small></button>`).join('')}</div><dl class="item-stats">${(
      [
        ['attackPower', 'Sát thương'],
        ['defense', 'Phòng thủ'],
        ['hpRegen', 'Hồi máu'],
        ['manaRegen', 'Hồi mana'],
        ['movementSpeed', 'Tốc chạy'],
        ['critChance', 'Chí mạng'],
      ] as const
    )
      .map(
        ([key, label]) =>
          `<div><dt>${label}</dt><dd data-item-stat="${key}">—</dd></div>`,
      )
      .join(
        '',
      )}</dl><p class="item-muted">Trang bị chưa mở. Chỉ số hiện tại của nhân vật.</p></section><section class="item-backpack"><h3>Hành trang <small>${this.items.length} chiến lợi phẩm trong trận</small></h3><div class="bag-grid" data-inventory-v2="true">${Array.from(
      { length: Math.max(12, this.items.length) },
      (_, i) => {
        const item = this.items[i];
        return item
          ? this.choice(
              'held',
              String(i),
              escape(item.name),
              i === this.selectedItem,
              item.image
                ? `<img class="item-art" src="${item.image}" alt=""/>`
                : '<span class="pixel-icon icon-jade" aria-hidden="true"></span>',
            )
          : `<button disabled aria-label="Ô hành trang trống ${i + 1}"></button>`;
      },
    ).join(
      '',
    )}</div><section class="item-held-detail" aria-live="polite"><h3>${selected ? escape(selected.name) : 'Chọn một vật phẩm'}</h3><p>${selected ? selected.description : this.items.length ? 'Xem thông tin chiến lợi phẩm đang giữ trong trận.' : 'Chưa có chiến lợi phẩm. Hạ thủ lĩnh để nhận thưởng.'}</p><button disabled>Trang bị</button></section><div class="item-auxiliary-detail">${art('thanh_tam')}<div><h3>Kỹ năng từ giày <kbd>Z</kbd></h3><p>Cần giày chế tạo · Chưa mở</p></div></div><div class="item-gold"><span class="pixel-icon icon-gold" aria-hidden="true"></span><b class="live-gold">${this.hero?.gold ?? '—'}</b><span>vàng</span></div></section></div>`;
  }
}

export function auxiliarySlot(): string {
  return `<div id="slot-z" class="hotbar-slot auxiliary-slot unequipped" tabindex="0" role="img" aria-label="Z · Kỹ năng từ giày chưa mở" aria-describedby="auxiliary-tip">${art('boots')}<kbd>Z</kbd><span id="auxiliary-tip" class="auxiliary-tooltip" role="tooltip"><strong>Kỹ năng từ giày · Z</strong><span>Cần giày chế tạo. Kỹ năng trang bị chưa mở.</span></span></div>`;
}
