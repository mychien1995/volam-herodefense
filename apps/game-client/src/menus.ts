export type Menu =
  | 'inventory'
  | 'dungeons'
  | 'merchant'
  | 'skills'
  | 'party'
  | 'pvp'
  | 'settings';
export const icon = (name: string, extra = ''): string =>
  `<span class="pixel-icon icon-${name} ${extra}" aria-hidden="true"></span>`;
const unavailable =
  '<p class="preview-note">PREVIEW · This system has no M1 backend. No items, gold or travel are changed.</p>';
export const menuTitles: Record<Menu, string> = {
  inventory: 'Túi Đồ',
  dungeons: 'Chọn Phó Bản',
  merchant: 'Thương Gia',
  skills: 'Võ Học',
  party: 'Đồng Đội',
  pvp: 'Lôi Đài',
  settings: 'Cài Đặt',
};
export function menuContents(menu: Menu, debug = false): string {
  switch (menu) {
    case 'settings':
      return `<div class="settings-controls"><p>↑ ↓ ← → · Di chuyển<br>A · Đánh thường<br>Q W E R · Kỹ năng<br>Escape · Đóng cửa sổ</p><button data-menu="skills">${icon('scroll')} Võ học / đổi đòn đánh</button><button data-menu="party">${icon('party')} Đồng đội / kết nối</button><button id="fullscreen">Toàn màn hình</button>${debug ? '<button id="forest-study">View forest art study</button>' : ''}</div>`;
    case 'inventory':
      return `${unavailable}
      <div class="inventory-layout"><section class="equipment-pane"><h3>Trang bị <small>4 slots</small></h3>
        <div class="equipment-display"><div class="paper-hero" aria-label="Existing prototype hero art"></div>
          ${[0, 1, 2, 3].map((i) => `<button class="equipment-slot e${i}" disabled aria-label="Empty equipment slot ${i + 1}">${icon(['staff', 'robe', 'jade', 'scroll'][i]!)}<small>${i + 1}</small></button>`).join('')}
        </div><p class="muted">No equipment in this prototype.<br>Slot categories await review.</p><div id="inventory-stats" class="stat-lines"></div></section>
      <section class="backpack-pane"><h3>Hành trang <small>Empty · preview grid</small></h3>
        <div class="bag-grid">${Array.from({ length: 12 }, (_, i) => `<button disabled aria-label="Empty backpack preview slot ${i + 1}"><span>＋</span></button>`).join('')}</div>
        <div class="item-description"><span class="ornament">◇</span><h3>A journey yet to begin</h3><p>Items you obtain will appear here. Equipment, selling and dropping arrive with the item milestone.</p></div>
        <div class="window-footer"><span>${icon('gold')} <b class="live-gold">0</b> gold</span><button disabled>Equip</button><button disabled>Drop / Sell</button></div>
      </section></div>`;
    case 'dungeons':
      return `<p class="dungeon-intro">Bốn vùng đất · Bốn thử thách</p>
      <div class="destinations">${[
        ['forest', 'Rừng Trúc', 'Rừng trúc · Suối ngọc'],
        ['desert', 'Sa Mạc', 'Cát vàng · Cổ tích'],
        ['sea', 'Biển', 'Đảo xa · Sóng biếc'],
        ['hell', 'Địa Ngục', 'Dung nham · Hỏa ngục'],
      ]
        .map(
          ([id, name, desc]) =>
            `<button type="button" class="destination ${id}" data-destination="${id}" aria-label="${name}" aria-pressed="${id === 'forest'}" aria-disabled="${id !== 'forest'}"><img class="destination-illustration" src="/assets/dungeon_cards/${id}.png" alt="${desc}"/><span class="destination-copy"><strong>${name}</strong><span>${desc}</span></span>${id === 'forest' ? '<span class="destination-check" aria-hidden="true">✓</span>' : '<span class="destination-availability">Chưa mở</span>'}</button>`,
        )
        .join('')}</div>
      <div class="dungeon-options"><div class="dungeon-choice"><span>Tổ đội</span><div role="radiogroup" aria-label="Tổ đội"><button type="button" role="radio" data-access="private" aria-checked="true">Riêng</button><button type="button" role="radio" data-access="shared" aria-checked="false">Chung</button></div><input id="dungeon-access" type="hidden" value="private"/></div><div class="dungeon-choice"><span>Thử thách</span><div role="radiogroup" aria-label="Thử thách"><button type="button" role="radio" aria-checked="true">Quái thường</button><button type="button" role="radio" aria-checked="false" disabled title="Phó bản Boss hiện chưa mở">Boss · Chưa mở</button></div></div></div>
      <p id="dungeon-entry-note" role="status"></p><p id="dungeon-availability" aria-live="polite" hidden></p>
      <div class="window-footer"><button id="dungeon-close">Đóng</button><button id="enter-dungeon" class="accent" aria-label="Enter dungeon" disabled>Vào Phó Bản</button></div>`;
    case 'merchant':
      return `${unavailable}<div role="tablist" aria-label="Merchant sections" class="menu-tabs"><button role="tab" aria-selected="true" data-shop-tab="shop">Cửa hàng</button><button role="tab" aria-selected="false" data-shop-tab="craft">Chế tạo</button></div>
      <div id="shop-content"><div class="shop-layout"><div class="shop-grid">${[
        ['staff', 'Weapon study'],
        ['robe', 'Armor study'],
        ['jade', 'Accessory study'],
        ['scroll', 'Recipe study'],
        ['potion', 'Consumable study'],
        ['ore', 'Material study'],
      ]
        .map(
          ([id, label]) =>
            `<button disabled class="shop-item">${icon(id!)}<span>${label}</span><small>Catalogue pending</small></button>`,
        )
        .join(
          '',
        )}</div><section class="shop-details"><h3>Welcome, traveler.</h3><p>The merchant is a menu preview. Item names, prices and effects will come from approved game data.</p><p class="muted">No purchases or sales are possible.</p><button disabled>Buy · unavailable</button></section></div></div>
      <div id="craft-content" hidden><div class="craft-recipe"><span>${icon('staff')}<small>Max basic item</small></span><b>＋</b><span>${icon('ore')}<small>Boss material</small></span><b>＋</b><span>${icon('gold')}<small>Gold · TBD</small></span><b>→</b><span>${icon('jade')}<small>Crafted item</small></span></div><p class="muted">Recipe illustration only. Required items, costs and results have not been implemented.</p><button disabled>Craft · unavailable</button></div>
      <div class="window-footer"><span>${icon('gold')} <b class="live-gold">0</b> gold</span><span>Prices and recipes pending</span></div>`;
    case 'skills':
      return `<p class="menu-intro">Cái Bang · M1 practice loadout</p><label for="basic-style">Normal attack · A</label><select id="basic-style"><option value="cai_bang_bong">Cái Bang Bổng · melee</option><option value="cai_bang_chuong">Cái Bang Chưởng · ranged</option></select>
      <div class="ability-list"><article>${icon('flame')}<div><kbd>Q</kbd><h3>Hỏa Vân Chưởng</h3><p>Three paced, straight shots · 18 MP</p></div></article><article>${icon('dragon')}<div><kbd>W</kbd><h3>Cuồng Long Loạn Vũ</h3><p>Explosive shot and burn · 25 MP</p></div></article></div>
      <p class="muted">E and R are unequipped. Full school selection, skill allocation and respec are future milestones.</p><button disabled>Allocate skill points · unavailable</button>`;
    case 'party':
      return `<div class="room-strip"><span>Room <strong id="party-room">—</strong></span><span id="connection-status">Connected</span></div><p class="muted">Share this room ID to invite a friend. Nicknames only · 6 player cap.</p><ul id="players" data-testid="players" class="party-list"></ul><div class="window-footer"><button id="check">Check connection</button><button id="leave" class="danger">Leave</button></div><p id="ack" class="muted" aria-live="polite">Share the room ID with a friend.</p><details><summary>Practice enemies</summary><ul id="creeps" data-testid="creeps"></ul></details>`;
    case 'pvp':
      return `${unavailable}<div class="pvp-sides"><section><h3>Side A</h3><span>◇</span><button disabled>Join A</button></section><section><h3>Side B</h3><span>◇</span><button disabled>Join B</button></section></div><p class="muted">PvP has not been implemented. This window establishes its in-game placement.</p><button disabled>Ready · unavailable</button>`;
  }
}
