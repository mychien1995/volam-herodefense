export type Menu =
  | 'inventory'
  | 'dungeons'
  | 'merchant'
  | 'skills'
  | 'party'
  | 'pvp'
  | 'settings'
  | 'quit';
export const icon = (name: string, extra = ''): string =>
  `<span class="pixel-icon icon-${name} ${extra}" aria-hidden="true"></span>`;
const unavailable =
  '<p class="preview-note">Xem trước · Tính năng này chưa mở. Chưa thể giao dịch hoặc sử dụng vật phẩm.</p>';
export const menuTitles: Record<Menu, string> = {
  inventory: 'Túi Đồ',
  dungeons: 'Chọn Phó Bản',
  merchant: 'Thương Gia',
  skills: 'Võ Học',
  party: 'Đồng Đội',
  pvp: 'Lôi Đài',
  settings: 'Cài Đặt',
  quit: 'Rời trận',
};
export function menuContents(menu: Menu, debug = false): string {
  switch (menu) {
    case 'quit':
      return '<p>Bạn có muốn rời trận? Tiến trình trong trận sẽ không được lưu.</p><div class="window-footer"><button id="cancel-quit">Ở lại</button><button id="confirm-quit" class="danger">Rời trận</button></div>';
    case 'settings':
      return `<div class="settings-controls"><p>↑ ↓ ← → · Di chuyển<br>A · Đánh thường<br>Q W E R · Kỹ năng<br>P · Võ Học<br>Space · Rời phó bản khi gần cửa<br>Escape · Đóng cửa sổ</p><button data-menu="skills">${icon('scroll')} Võ học / đổi đòn đánh</button><button data-menu="party">${icon('party')} Đồng đội / kết nối</button><button id="fullscreen">Toàn màn hình</button>${debug ? '<button id="forest-study">Xem bản mẫu rừng</button>' : ''}</div>`;
    case 'inventory':
      return `<p>Chiến lợi phẩm nhận trong trận. Bốn ô trang bị chưa mở.</p>
      <div class="inventory-layout"><section class="equipment-pane"><h3>Trang bị <small>4 ô</small></h3>
        <div class="equipment-display"><div class="paper-hero" aria-label="Hình nhân vật hiện tại"></div>
          ${[0, 1, 2, 3].map((i) => `<button class="equipment-slot e${i}" disabled aria-label="Ô trang bị trống ${i + 1}">${icon(['staff', 'robe', 'jade', 'scroll'][i]!)}<small>${i + 1}</small></button>`).join('')}
        </div><p class="muted">Chưa có trang bị.<br>Loại ô trang bị đang chờ hoàn thiện.</p><div id="inventory-stats" class="stat-lines"></div></section>
      <section class="backpack-pane"><h3>Hành trang <small>Chiến lợi phẩm trong trận</small></h3>
        <div class="bag-grid">${Array.from({ length: 12 }, (_, i) => `<button disabled aria-label="Ô hành trang xem trước ${i + 1}"><span>＋</span></button>`).join('')}</div>
        <div class="item-description"><span class="ornament">◇</span><h3>Chiến lợi phẩm trong trận</h3><ul id="boss-loot-items" aria-label="Chiến lợi phẩm Cổ Mộ"></ul><p>Bán từng vật phẩm trong hành trang; thả và nhặt lại tại phó bản thủ lĩnh. Trang bị chưa mở.</p></div>
        <div class="window-footer"><span>${icon('gold')} <b class="live-gold">0</b> vàng</span><button disabled>Trang bị</button><span>Chọn vật phẩm để bán hoặc thả</span></div>
      </section></div>`;
    case 'dungeons':
      return `<p class="dungeon-intro"><span class="dungeon-school-avatar" role="img" aria-label="Nhân vật môn phái đang chọn"></span>Phó bản quái thường và thủ lĩnh</p>
      <div class="destinations">${[
        ['forest', 'Rừng Trúc', 'Rừng trúc · Suối ngọc'],
        ['desert', 'Sa Mạc', 'Cát vàng · Cổ tích'],
        ['sea', 'Biển', 'Đảo xa · Sóng biếc'],
        ['hell', 'Địa Ngục', 'Dung nham · Hỏa ngục'],
        ['hong_liet', 'Hoàn Nhan Hồng Liệt', 'Đại bản doanh · Thủ lĩnh'],
        [
          'kim_luan',
          'Kim Luân Pháp Vương · Tương Dương',
          'Hai học trò → Pháp Vương',
        ],
        ['chu_ba_thong', 'Chu Bá Thông', 'Thủ lĩnh · Toàn Chân Trúc Lâm'],
        ['co_mo', 'Lý Mạc Sầu', 'Cổ Mộ Phái · Thủ lĩnh'],
      ]
        .map(
          ([id, name, desc]) =>
            `<button type="button" class="destination ${id}" data-destination="${id}" aria-label="${name}" aria-pressed="${id === 'forest'}" aria-disabled="${!['forest', 'desert', 'sea', 'hell', 'chu_ba_thong', 'hong_liet', 'kim_luan', 'co_mo'].includes(id!)}"><img class="destination-illustration" src="${id === 'co_mo' ? '/assets/co_mo/arena_preview.png' : id === 'chu_ba_thong' ? '/assets/chu/boss_idle.png' : '/assets/dungeon_cards/' + (['hong_liet', 'kim_luan'].includes(id!) ? 'hell' : id) + '.png'}" alt="${desc}"/><span class="destination-copy"><strong>${name}</strong><span>${desc}</span></span>${['forest', 'desert', 'sea', 'hell', 'chu_ba_thong', 'hong_liet', 'kim_luan', 'co_mo'].includes(id!) ? `<span class="destination-check" aria-hidden="true" ${id === 'forest' ? '' : 'hidden'}>✓</span>` : '<span class="destination-availability">Chưa mở</span>'}</button>`,
        )
        .join('')}</div>
      <div class="dungeon-options"><div class="dungeon-choice"><span>Tổ đội</span><div role="radiogroup" aria-label="Tổ đội"><button type="button" role="radio" data-access="private" aria-checked="true">Riêng</button><button type="button" role="radio" data-access="shared" aria-checked="false">Chung</button></div><input id="dungeon-access" type="hidden" value="private"/></div><div class="dungeon-choice"><span>Thử thách</span><strong id="dungeon-kind">Quái thường</strong></div></div>
      <p id="dungeon-entry-note" role="status"></p><p id="dungeon-availability" aria-live="polite" hidden></p>
      <div class="window-footer"><button id="dungeon-close">Đóng</button><button id="enter-dungeon" class="accent" aria-label="Vào phó bản" disabled>Vào Phó Bản</button></div>`;
    case 'merchant':
      return `${unavailable}<div role="tablist" aria-label="Các mục thương gia" class="menu-tabs"><button role="tab" aria-selected="true" data-shop-tab="shop">Cửa hàng</button><button role="tab" aria-selected="false" data-shop-tab="craft">Chế tạo</button></div>
      <div id="shop-content"><div class="shop-layout"><div class="shop-grid">${[
        ['staff', 'Vũ khí mẫu'],
        ['robe', 'Áo giáp mẫu'],
        ['jade', 'Phụ kiện mẫu'],
        ['scroll', 'Công thức mẫu'],
        ['potion', 'Vật phẩm tiêu hao mẫu'],
        ['ore', 'Nguyên liệu mẫu'],
      ]
        .map(
          ([id, label]) =>
            `<button disabled class="shop-item">${icon(id!)}<span>${label}</span><small>Chưa có danh mục</small></button>`,
        )
        .join(
          '',
        )}</div><section class="shop-details"><h3>Chào mừng thiếu hiệp.</h3><p>Cửa hàng hiện là bản xem trước. Danh mục, giá và công dụng vật phẩm sẽ được bổ sung sau.</p><p class="muted">Chưa thể mua hoặc bán.</p><button disabled>Mua · Chưa mở</button></section></div></div>
      <div id="craft-content" hidden><div class="craft-recipe"><span>${icon('staff')}<small>Vật phẩm cơ bản tối đa</small></span><b>＋</b><span>${icon('ore')}<small>Nguyên liệu thủ lĩnh</small></span><b>＋</b><span>${icon('gold')}<small>Vàng · Chưa định giá</small></span><b>→</b><span>${icon('jade')}<small>Vật phẩm chế tạo</small></span></div><p class="muted">Đây là minh họa công thức. Nguyên liệu, chi phí và kết quả chưa được triển khai.</p><button disabled>Chế tạo · Chưa mở</button></div>
      <div class="window-footer"><span>${icon('gold')} <b class="live-gold">0</b> vàng</span><span>Giá và công thức chưa mở</span></div>`;
    case 'skills':
      return `<p class="menu-intro">Cái Bang · Bộ kỹ năng Q/W/E/R</p><label for="basic-style">Đánh thường · A</label><select id="basic-style"><option value="cai_bang_bong">Cái Bang Bổng · Cận chiến</option><option value="cai_bang_chuong">Cái Bang Chưởng · Tầm xa</option></select>
      <div class="ability-list"><article>${icon('flame')}<div><kbd>Q</kbd><h3>Hỏa Vân Chưởng</h3><p>Ba chưởng bay thẳng · 18 nội lực</p></div></article><article>${icon('dragon')}<div><kbd>W</kbd><h3>Cuồng Long Loạn Vũ</h3><p>Chưởng nổ và thiêu đốt · 25 nội lực</p></div></article></div>
      <p class="muted">Dùng chế độ Võ Học để học và thay đổi kỹ năng.</p><button disabled>Phân điểm · Chưa mở</button>`;
    case 'party':
      return `<div class="room-strip"><span>Phòng <strong id="party-room">—</strong></span><span id="connection-status">Connected</span></div><p class="muted">Chia sẻ mã phòng để mời bạn. Chỉ cần biệt danh · Tối đa 6 người.</p><ul id="players" data-testid="players" class="party-list"></ul><div class="window-footer"><button id="check">Kiểm tra kết nối</button><button id="leave" class="danger">Rời trận</button></div><p id="ack" class="muted" aria-live="polite">Chia sẻ mã phòng với bạn bè.</p><details><summary>Quái tập luyện</summary><ul id="creeps" data-testid="creeps"></ul></details>`;
    case 'pvp':
      return `${unavailable}<div class="pvp-sides"><section><h3>Đội A</h3><span>◇</span><button disabled>Vào đội A</button></section><section><h3>Đội B</h3><span>◇</span><button disabled>Vào đội B</button></section></div><p class="muted">Đấu đối kháng chưa mở. Đây là cửa sổ xem trước.</p><button disabled>Sẵn sàng · Chưa mở</button>`;
  }
}
