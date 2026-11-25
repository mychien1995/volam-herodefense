import type { LobbyState } from '@volam/game-protocol';
import { economyTrial, m1Config } from '@volam/game-data';
import {
  equipmentSlots as slots,
  type EquipmentSlot as Slot,
  type MerchantAction,
  type PotionId,
} from '@volam/game-core';

type Hero = NonNullable<ReturnType<LobbyState['players']['get']>>;
type Tab = 'equipment' | 'potions' | 'craft';
const itemUrl = (id: string) =>
  id.startsWith('/assets/') ? id : '/assets/inventory_ui/' + id + '.png';
const art = (id: string, extra = '') =>
  `<img class="item-art ${extra}" src="${itemUrl(id)}" alt="" draggable="false"/>`;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const gear = {
  weapon: 'Tăng sát thương',
  armor: 'Phòng thủ · Máu tối đa',
  hat: 'Hồi máu · Hồi mana',
  boots: 'Tốc chạy · Một ít chí mạng',
};
interface HeldItem {
  name: string;
  description: string;
  image?: string | undefined;
  potionId?: PotionId;
}

/** Catalogue view and server-confirmed transactions; no speculative inventory mutation. */
export class ItemMenu {
  private tab: Tab = 'equipment';
  private slot: Slot = 'weapon';
  private craftSlot: Slot = 'boots';
  private branch = 0;
  private potion: 'potion_hp' | 'potion_mp' = 'potion_hp';
  private hero: Hero | undefined;
  private selectedItem = -1;
  private size: 'small' | 'medium' | 'large' = 'small';
  private quantity = 1;
  private pending = false;
  private sentRevision = -1;
  private signature = '';
  private items: HeldItem[] = [];

  constructor(
    private root: HTMLElement,
    private kind: 'merchant' | 'inventory',
    private send: (action: MerchantAction) => void = () => {},
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
    if (action === 'buy' && slots.includes(value as Slot)) {
      this.request({ action: 'buy-basic', slot: value as Slot });
      return;
    }
    if (action === 'craft') {
      const branch = economyTrial.recipes[this.craftSlot].branches[this.branch];
      if (branch)
        this.request({
          action: 'craft',
          slot: this.craftSlot,
          branch: branch.id,
        });
      return;
    }
    if (action === 'buy-potion') {
      this.request({
        action: 'buy-potion',
        potionId: this.potionId(),
        quantity: this.quantity,
      });
      return;
    }
    if (action === 'use-held') {
      const potionId = this.items[this.selectedItem]?.potionId;
      if (potionId) this.request({ action: 'use-potion', potionId });
      return;
    }
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
    else if (action === 'size' && ['small', 'medium', 'large'].includes(value))
      this.size = value as typeof this.size;
    else if (action === 'quantity' && ['more', 'less'].includes(value))
      this.quantity = Math.min(
        20,
        Math.max(1, this.quantity + (value === 'more' ? 1 : -1)),
      );
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
    if (hero.inventory.revision > this.sentRevision) this.pending = false;
    // Only redraw on authoritative changes that affect this menu. Preserve focus/scroll otherwise.
    const signature = JSON.stringify([
      hero.zoneId,
      hero.hp <= 0,
      hero.bossItems,
      hero.bossLoot,
      hero.inventory.revision,
      Math.ceil(hero.inventory.potionCooldownTicks / m1Config.tickRate),
      hero.gold,
      hero.hp >= hero.maxHp,
      hero.mana >= hero.maxMana,
    ]);
    if (signature !== this.signature) {
      this.signature = signature;
      const selectedName = this.items[this.selectedItem]?.name;
      this.items = this.readItems(hero);
      if (selectedName !== this.items[this.selectedItem]?.name)
        this.selectedItem = -1;
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
    for (const [id, definition] of Object.entries(economyTrial.potions)) {
      const count = hero.inventory.potions.get(id) ?? 0;
      if (count > 0)
        items.push({
          name: `${definition.nameVi} ×${count}`,
          description: `Hồi ${definition.amount} ${definition.resource === 'hp' ? 'sinh lực' : 'nội lực'} · Dùng chung thời gian chờ 5 giây.`,
          image: `/assets/inventory_ui/potion_${definition.resource === 'hp' ? 'hp' : 'mp'}.png`,
          potionId: id as PotionId,
        });
    }
    for (const slot of slots) {
      const count = hero.inventory.materials.get(slot) ?? 0;
      if (count < 1) continue;
      const recipe = economyTrial.recipes[slot];
      items.push({
        name: recipe.materialNameVi + ' ×' + count,
        description:
          'Nguyên liệu từ ' +
          recipe.bossNameVi +
          '. Dùng trong tab Chế tạo của Thương Gia.',
        image: itemUrl(recipe.materialArt),
      });
    }
    // Historical encounter fixtures still project their original reward fields.
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

  resolve(): void {
    this.pending = false;
    this.render();
  }
  private request(action: MerchantAction): void {
    if (!this.hero || this.pending) return;
    this.pending = true;
    this.sentRevision = this.hero.inventory.revision;
    this.send(action);
    this.render();
  }
  private potionId(): PotionId {
    return `${this.potion === 'potion_hp' ? 'hp' : 'mp'}_${this.size}`;
  }
  private level(slot: Slot): number {
    return this.hero?.inventory.levels.get(slot) ?? 0;
  }
  private totalPotions(): number {
    return [...(this.hero?.inventory.potions.values() ?? [])].reduce(
      (a, b) => a + b,
      0,
    );
  }
  private canBuy(price: number | undefined): boolean {
    return (
      !!this.hero &&
      this.hero.hp > 0 &&
      this.hero.zoneId === 'arena' &&
      price !== undefined &&
      this.hero.gold >= price &&
      !this.pending
    );
  }
  private potionDisabled(id: PotionId): boolean {
    if (
      !this.hero ||
      this.pending ||
      this.hero.hp <= 0 ||
      this.hero.inventory.potionCooldownTicks > 0
    )
      return true;
    const resource = economyTrial.potions[id].resource;
    return resource === 'hp'
      ? this.hero.hp >= this.hero.maxHp
      : this.hero.mana >= this.hero.maxMana;
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
    const recipe = economyTrial.recipes[this.craftSlot];
    const definition = economyTrial.basics[this.slot],
      level = this.level(this.slot);
    const price = definition.prices[level];
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
    const canShop = this.hero?.zoneId === 'arena' && (this.hero?.hp ?? 0) > 0;
    let body: string;
    if (this.tab === 'equipment') {
      const labels: Record<string, string> = {
        attackPower: 'Sát thương',
        maxHp: 'Máu tối đa',
        defense: 'Phòng thủ',
        hpRegen: 'Hồi máu/s',
        manaRegen: 'Hồi mana/s',
        movementSpeed: 'Tốc chạy',
        critChance: 'Chí mạng',
      };
      const stats = Object.entries(definition.perLevel)
        .map(
          ([key, amount]) =>
            `<div><dt>${labels[key] ?? key}</dt><dd>${key === 'critChance' ? `${(amount! * level * 100).toFixed(1)}% → ${(amount! * Math.min(5, level + 1) * 100).toFixed(1)}%` : `${amount! * level} → ${amount! * Math.min(5, level + 1)}`}</dd></div>`,
        )
        .join('');
      body = `<div class="item-shop-layout"><div class="item-catalogue">${slots.map((slot) => this.choice('gear', slot, economyTrial.basics[slot].nameVi, slot === this.slot, `${art(slot)}<small>${this.level(slot) ? `Cấp ${this.level(slot)}/5` : 'Chưa sở hữu'}</small><span class="item-price">${economyTrial.basics[slot].prices[this.level(slot)] ?? 'Tối đa'}${this.level(slot) < 5 ? ' vàng' : ''}</span>`)).join('')}</div><section class="item-detail">${art(this.slot, 'item-large')}<h3>${definition.nameVi}</h3><p>${gear[this.slot]}</p><p>${level ? `Cấp ${level}${level < 5 ? ` → Cấp ${level + 1}` : ' · Tối đa'}` : 'Mua cấp 1 · Tự trang bị'}</p><dl class="item-stats item-purchase-stats">${stats}</dl><div class="item-levels" aria-label="Năm cấp trang bị cơ bản">${Array.from({ length: 5 }, (_, i) => `<i class="${i < level ? 'owned' : ''}"></i>`).join('')}</div><p>Mua lại để tăng 1 cấp · Tối đa cấp 5</p><button data-ui-action="buy" data-value="${this.slot}" class="item-primary" ${this.canBuy(price) ? '' : 'disabled'}>${this.pending ? 'Đang xử lý…' : price === undefined ? 'Đã tối đa' : `${level ? 'Nâng cấp' : 'Mua'} · ${price} vàng`}</button><small>${!canShop ? 'Chỉ mua khi còn sống ở đấu trường trung tâm.' : price !== undefined && (this.hero?.gold ?? 0) < price ? 'Không đủ vàng.' : 'Giá thử nghiệm · Mua xong áp dụng chỉ số ngay.'}</small></section></div>`;
    } else if (this.tab === 'potions') {
      const id = this.potionId(),
        potion = economyTrial.potions[id];
      const cost = potion.price * this.quantity;
      const capacity =
        this.totalPotions() + this.quantity <= economyTrial.potionLimit;
      body = `<div class="item-potion-layout"><div class="item-potion-choices">${this.choice('potion', 'potion_hp', 'Bình máu', this.potion === 'potion_hp', art('potion_hp'))}${this.choice('potion', 'potion_mp', 'Bình mana', this.potion === 'potion_mp', art('potion_mp'))}</div><section class="item-detail">${art(this.potion, 'item-large')}<h3>${potion.nameVi}</h3><p>Hồi ngay ${potion.amount} ${potion.resource === 'hp' ? 'sinh lực' : 'nội lực'}</p><div class="item-sizes">${(
        [
          ['small', 'Nhỏ'],
          ['medium', 'Vừa'],
          ['large', 'Lớn'],
        ] as const
      )
        .map(([value, label]) =>
          this.choice('size', value, label, this.size === value),
        )
        .join(
          '',
        )}</div><p>Thời gian chờ chung: <b>5 giây</b></p><p>Đang mang: ${this.totalPotions()}/${economyTrial.potionLimit} bình · Loại này: ${this.hero?.inventory.potions.get(id) ?? 0}</p><div class="item-quantity"><button data-ui-action="quantity" data-value="less" aria-label="Giảm số lượng" ${this.quantity <= 1 ? 'disabled' : ''}>−</button><output aria-label="Số lượng mua">${this.quantity}</output><button data-ui-action="quantity" data-value="more" aria-label="Tăng số lượng" ${this.quantity >= 20 ? 'disabled' : ''}>+</button></div><button data-ui-action="buy-potion" data-value="${id}" class="item-primary" ${this.canBuy(cost) && capacity ? '' : 'disabled'}>${this.pending ? 'Đang xử lý…' : `Mua bình · ${cost} vàng`}</button><p data-testid="potion-restriction">${!canShop ? 'Không mua bình trong phó bản hoặc khi đã gục ngã.' : !capacity ? 'Đã vượt giới hạn mang bình.' : (this.hero?.gold ?? 0) < cost ? 'Không đủ vàng.' : 'Chuẩn bị bình trước khi vào phó bản.'}</p></section></div>`;
    } else {
      const slot = this.craftSlot;
      const basic = economyTrial.basics[slot];
      const count = this.hero?.inventory.materials.get(slot) ?? 0;
      const crafted = this.hero?.inventory.crafted.get(slot);
      const status = crafted
        ? 'Đã chế tạo nhánh ' +
          recipe.branches.find((branch) => branch.id === crafted)?.nameVi +
          '.'
        : !canShop
          ? 'Chỉ chế tạo khi còn sống ở đấu trường trung tâm.'
          : this.level(slot) !== 5
            ? 'Cần ' + basic.nameVi.toLowerCase() + ' cấp 5.'
            : count < 1
              ? 'Thiếu ' + recipe.materialNameVi + '.'
              : (this.hero?.gold ?? 0) < basic.craftGold
                ? 'Không đủ vàng.'
                : 'Thành phẩm sẽ tự trang bị.';
      const enabled =
        !crafted &&
        this.level(slot) === 5 &&
        count > 0 &&
        this.canBuy(basic.craftGold);
      body = `<div class="item-recipe-slots" aria-label="Chọn ô chế tạo">${slots.map((option) => this.choice('recipe', option, economyTrial.basics[option].nameVi, option === slot)).join('')}</div>
        <div class="item-recipe">${art(slot)}<span>${basic.nameVi} cấp 5<small>Đang có cấp ${this.level(slot)}</small></span><b>+</b>${art(recipe.materialArt)}<span>${recipe.materialNameVi}<small>Đang có ${count} · Từ ${recipe.bossNameVi}</small></span><b>+</b><span>${basic.craftGold} vàng<small>Giá thử nghiệm</small></span></div>
        <h3 class="item-branch-title">Chọn một nhánh</h3><div class="item-branches">${recipe.branches.map((branch, i) => this.choice('branch', String(i), branch.nameVi, crafted ? crafted === branch.id : i === this.branch, `${art(branch.art)}${slot === 'boots' ? '<kbd>Z</kbd>' : ''}<p>${branch.descriptionVi}</p>`)).join('')}</div>
        <div class="item-craft-action"><p>${status}</p><button type="button" data-ui-action="craft" data-value="${slot}" class="item-primary" ${enabled ? '' : 'disabled'}>${this.pending ? 'Đang xử lý…' : crafted ? 'Đã chế tạo' : 'Chế tạo · ' + basic.craftGold + ' vàng'}</button></div>`;
    }
    return `${tabs}<section id="item-panel" role="tabpanel" aria-labelledby="item-tab-${this.tab}">${body}</section><p class="item-availability" role="status">Giá thử nghiệm · Chọn món để xem giá và nâng cấp.</p>`;
  }

  private branchFor(slot: Slot) {
    const id = this.hero?.inventory.crafted.get(slot);
    return economyTrial.recipes[slot].branches.find(
      (branch) => branch.id === id,
    );
  }
  private inventory(): string {
    const campaign = this.hero?.inventory.campaign
      ? (JSON.parse(this.hero.inventory.campaign) as {
          pearls: number;
          dragonBonus: number;
        })
      : null;
    const pearlNotice = campaign
      ? `<p data-testid="dragon-pearls">Long Châu ${campaign.pearls}/8 · +${Math.round(campaign.dragonBonus * 100)}% sinh lực, nội lực, công và thủ nền</p>`
      : '';
    const boots = this.branchFor('boots');
    const selected = this.items[this.selectedItem];
    const cooldown = Math.ceil(
      (this.hero?.inventory.potionCooldownTicks ?? 0) / m1Config.tickRate,
    );
    return `<div class="item-inventory-layout"><section class="item-equipment-pane"><h3>Trang bị <small>4 ô · Mua đồ sẽ tự trang bị</small></h3>${pearlNotice}<div class="item-paper-doll"><div class="paper-hero" aria-label="Nhân vật hiện tại"></div>${slots.map((slot, i) => `<button type="button" class="equipment-slot item-equip-${i} ${this.level(slot) ? 'owned' : ''}" disabled aria-label="${economyTrial.basics[slot].nameVi} · ${this.level(slot) ? `Cấp ${this.level(slot)}` : 'Chưa trang bị'}">${art(this.branchFor(slot)?.art ?? slot)}<strong>${economyTrial.basics[slot].nameVi}</strong><small>${this.branchFor(slot)?.nameVi ?? (this.level(slot) ? `Cấp ${this.level(slot)}/5` : 'Trống')}</small></button>`).join('')}</div><dl class="item-stats">${(
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
      )}</dl><p class="item-muted">Chỉ số nhân vật đã gồm trang bị.</p></section><section class="item-backpack"><h3>Hành trang <small>${this.totalPotions()}/20 bình · ${this.items.length} loại vật phẩm</small></h3><div class="bag-grid" data-inventory-v2="true">${Array.from(
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
    )}</div><section class="item-held-detail" aria-live="polite"><h3>${selected ? escape(selected.name) : 'Chọn một vật phẩm'}</h3><p>${selected ? selected.description : 'Chọn bình để sử dụng hoặc xem chiến lợi phẩm đang giữ.'}</p>${selected?.potionId ? `<button data-ui-action="use-held" data-value="${selected.potionId}" ${this.potionDisabled(selected.potionId) ? 'disabled' : ''}>${cooldown ? `Đang hồi · ${cooldown}s` : 'Dùng bình'}</button>` : '<button disabled>Trang bị</button>'}</section><div class="item-auxiliary-detail">${art(boots?.art ?? 'thanh_tam')}<div><h3>Đặc tính giày</h3><p>${boots ? boots.nameVi + ' · ' + boots.descriptionVi : 'Cần giày chế tạo.'}</p></div></div><div class="item-gold"><span class="pixel-icon icon-gold" aria-hidden="true"></span><b class="live-gold">${this.hero?.gold ?? '—'}</b><span>vàng</span></div></section></div>`;
  }
}
