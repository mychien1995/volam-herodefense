import { settingsControls } from './settings-controls.js';

export type Menu =
  | 'inventory'
  | 'dungeons'
  | 'merchant'
  | 'skills'
  | 'pvp'
  | 'settings'
  | 'quit';
export const icon = (name: string, extra = ''): string =>
  `<span class="pixel-icon icon-${name} ${extra}" aria-hidden="true"></span>`;
export const menuTitles: Record<Menu, string> = {
  inventory: 'Túi Đồ',
  dungeons: 'Chọn Phó Bản',
  merchant: 'Thương Gia',
  skills: 'Võ Công',
  pvp: 'Lôi Đài',
  settings: 'Cài Đặt',
  quit: 'Rời trận',
};
export function menuContents(
  menu: Menu,
  debug = false,
  legacySkills = false,
): string {
  switch (menu) {
    case 'quit':
      return '<p>Bạn có muốn rời trận? Tiến trình trong trận sẽ không được lưu.</p><div class="window-footer"><button id="cancel-quit">Ở lại</button><button id="confirm-quit" class="danger">Rời trận</button></div>';
    case 'settings':
      return `<div class="settings-controls">${settingsControls('match')}${legacySkills ? '<button data-menu="skills">' + icon('scroll') + ' Võ Công <kbd>O</kbd></button>' : ''}<button id="fullscreen">Toàn màn hình</button>${debug ? '<button id="forest-study">Xem bản mẫu rừng</button>' : ''}</div>`;
    case 'inventory':
      return '<div id="item-menu"></div>';
    case 'dungeons':
      return `<p class="dungeon-intro"><span class="dungeon-school-avatar" role="img" aria-label="Nhân vật môn phái đang chọn"></span>Phó bản quái thường và thủ lĩnh</p>
      <div class="destinations">${[
        ['forest', 'Rừng Trúc', 'Rừng trúc · Suối ngọc'],
        ['desert', 'Sa Mạc', 'Cát vàng · Cổ tích'],
        ['sea', 'Biển', 'Đảo xa · Sóng biếc'],
        ['hell', 'Địa Ngục', 'Dung nham · Hỏa ngục'],
        ['co_mo', 'Lý Mạc Sầu', 'Cổ Mộ Phái · Thủ lĩnh'],
        ['hong_liet', 'Hoàn Nhan Hồng Liệt', 'Đại bản doanh · Thủ lĩnh'],
        ['chu_ba_thong', 'Chu Bá Thông', 'Thủ lĩnh · Toàn Chân Trúc Lâm'],
        [
          'kim_luan',
          'Kim Luân Pháp Vương · Tương Dương',
          'Hai học trò → Pháp Vương',
        ],
      ]
        .map(
          ([id, name, desc]) =>
            `<button type="button" class="destination ${id}" data-destination="${id}" aria-label="${name}" aria-pressed="${id === 'forest'}" aria-disabled="${!['forest', 'desert', 'sea', 'hell', 'chu_ba_thong', 'hong_liet', 'kim_luan', 'co_mo'].includes(id!)}"><img class="destination-illustration" src="${['co_mo', 'hong_liet', 'kim_luan'].includes(id!) ? '/assets/m3d_r3/arena_' + id + '.png' : id === 'chu_ba_thong' ? '/assets/m3d_followup/chu_arena.png' : '/assets/dungeon_cards/' + id + '.png'}" alt="${desc}"/><span class="destination-copy"><strong>${name}</strong><span>${desc}</span></span>${['forest', 'desert', 'sea', 'hell', 'chu_ba_thong', 'hong_liet', 'kim_luan', 'co_mo'].includes(id!) ? `<span class="destination-check" aria-hidden="true" ${id === 'forest' ? '' : 'hidden'}>✓</span>` : '<span class="destination-availability">Chưa mở</span>'}</button>`,
        )
        .join('')}</div>
      <div class="dungeon-options"><div class="dungeon-choice"><span>Thử thách</span><strong id="dungeon-kind">Quái thường · Riêng</strong></div></div>
      <p id="dungeon-entry-note" role="status"></p><p id="dungeon-availability" aria-live="polite" hidden></p>
      <div class="window-footer"><button id="dungeon-close">Đóng</button><button id="enter-dungeon" class="accent" aria-label="Vào phó bản" disabled>Vào Phó Bản</button></div>`;
    case 'merchant':
      return '<div id="item-menu"></div>';
    case 'skills':
      return `<p class="menu-intro">Cái Bang · Bộ kỹ năng Q/W/E/R</p><label for="basic-style">Đánh thường · A</label><select id="basic-style"><option value="cai_bang_bong">Cái Bang Bổng · Cận chiến</option><option value="cai_bang_chuong">Cái Bang Chưởng · Tầm xa</option></select>
      <div class="ability-list"><article>${icon('flame')}<div><kbd>Q</kbd><h3>Hỏa Vân Chưởng</h3><p>Ba chưởng bay thẳng · 18 nội lực</p></div></article><article>${icon('dragon')}<div><kbd>W</kbd><h3>Cuồng Long Loạn Vũ</h3><p>Chưởng nổ và thiêu đốt · 25 nội lực</p></div></article></div>
      <p class="muted">Dùng chế độ Võ Học để học và thay đổi kỹ năng.</p><button disabled>Phân điểm · Chưa mở</button>`;
    case 'pvp':
      return '<p id="loi-dai-confirm-copy"></p><div class="window-footer"><button id="cancel-loi-dai">Hủy</button><button id="confirm-loi-dai" class="accent">Xác nhận</button></div>';
  }
}
