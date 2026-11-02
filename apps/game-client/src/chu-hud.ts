import type { LobbyState } from '@volam/game-protocol';
import type { ChuView, KimView } from '@volam/game-core';
const names: Record<string, string> = {
  idle: 'Chuẩn bị',
  sweep: 'Phong kình',
  fists: 'Song quyền',
  palm: 'Bắn chưởng',
  hands: 'Song Thủ Hỗ Bác',
  trap: 'Thái Cực Âm Dương Trận',
  spin: 'Túy Tiên Bộ',
  reflect: 'Càn Khôn Phản Chấn',
  ultimate: 'Âm Dương Nghịch Chuyển',
  drink: 'Tiểu đồng đưa rượu',
};
const itemNames: Record<string, string> = {
  kim_luan_tan_phien: 'Kim Luân Tàn Phiến',
  toan_chan_tien_tuu: 'Toàn Chân Tiên Tửu',
};
/** Compact overlays live inside the existing viewport and never reserve map space. */
export class ChuHud {
  private root: HTMLElement;
  private loot: HTMLElement;
  private state: LobbyState | undefined;
  private session = '';
  private announced = new Set<string>();
  onNotify: (message: string) => void = () => {};
  constructor(send: (action: string, id: number, itemId?: string) => void) {
    this.root = document.createElement('section');
    this.root.id = 'chu-boss-hud';
    this.root.className = 'framed';
    this.root.hidden = true;
    this.loot = document.createElement('section');
    this.loot.id = 'chu-loot';
    this.loot.className = 'framed';
    this.loot.hidden = true;
    this.loot.setAttribute('aria-label', 'Chiến lợi phẩm thủ lĩnh');
    document.querySelector('#viewport')!.append(this.root, this.loot);
    this.loot.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-loot]',
      );
      if (b) {
        e.stopPropagation();
        send(b.dataset['action']!, Number(b.dataset['loot']));
      }
    });
    document.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
        'button[data-boss-item]',
      );
      if (b) {
        e.stopPropagation();
        send(
          b.dataset['action']!,
          Number(b.dataset['bossItem']),
          b.dataset['itemId'],
        );
      }
    });
  }
  sync(state: LobbyState | undefined, session: string) {
    this.state = state;
    this.session = session;
    if (!state) this.announced.clear();
    const h = state?.players.get(session),
      encoded = h ? state?.dungeons.get(h.zoneId)?.encounter : undefined;
    const decoded = encoded ? (JSON.parse(encoded) as ChuView | KimView) : null;
    const kim = decoded && 'kind' in decoded ? (decoded as KimView) : null;
    const v: Pick<
      ChuView,
      'bossHp' | 'bossMaxHp' | 'phase' | 'trap' | 'loot'
    > | null = kim
      ? { ...kim, phase: 'idle', trap: null }
      : (decoded as ChuView | null);
    this.root.hidden = !v;
    document.querySelector<HTMLElement>('#viewport')!.dataset['chu'] =
      String(!!v);
    if (v) {
      const percent = Math.max(0, (100 * v.bossHp) / v.bossMaxHp);
      this.root.innerHTML = `<strong>${kim ? 'Kim Luân Pháp Vương · Tương Dương' : 'Chu Bá Thông'}</strong><div class="chu-health"><i style="width:${percent}%"></i><span>${Math.ceil(v.bossHp)} / ${v.bossMaxHp}</span></div><small>${h?.zoneId.includes('_private_') ? 'Riêng' : 'Chung'} · ${kim ? (kim.phase === 'disciples' ? 'Đánh bại cả hai học trò' : kim.phase === 'defeated' ? 'Đã đánh bại' : kim.enraged ? 'Long Tượng Bát Nhã Thập Tầng' : 'Pháp Vương xuất trận') : v.bossHp > 0 ? names[v.phase] : 'Đã đánh bại'}${v.phase === 'trap' && v.trap && !v.trap.released ? ' · ' + v.trap.inside + '/' + v.trap.required.length + ' vào trận' : ''}</small>`;
    }
    for (const l of v?.loot ?? []) {
      const token = h!.zoneId + ':' + l.id;
      if (l.state === 'claimed' && !this.announced.has(token)) {
        this.announced.add(token);
        this.onNotify(
          (state?.players.get(l.ownerId)?.nickname ?? 'Đồng đội') +
            ' nhận ' +
            l.nameVi,
        );
      }
    }
    const loot = v?.loot.filter((l) => l.state !== 'claimed') ?? [];
    this.loot.hidden = !loot.length;
    // Rebuild only when the authoritative content changes, preserving button focus.
    const html = loot
      .map(
        (l) =>
          `<article><strong>${l.nameVi}</strong><small>${l.state === 'rolling' ? 'Roll · 15 giây tối đa' : 'Chiến lợi phẩm trên đất'}</small>${l.state === 'rolling' && l.eligible.includes(session) && l.rolls[session] === undefined ? `<button data-loot="${l.id}" data-action="roll">Roll</button><button data-loot="${l.id}" data-action="pass">Bỏ qua</button>` : l.state === 'ground' ? `<button data-loot="${l.id}" data-action="pickup">Nhặt · đứng gần</button>` : '<span>Đang chờ kết quả</span>'}</article>`,
      )
      .join('');
    if (this.loot.innerHTML !== html) this.loot.innerHTML = html;
    this.inventory();
  }
  inventory() {
    const h = this.state?.players.get(this.session),
      grid = document.querySelector('.bag-grid');
    if (!h || !grid || grid.hasAttribute('data-inventory-v2')) return;
    const items = JSON.parse(h.bossItems || '[]') as string[];
    const content = Array.from(
      { length: Math.max(12, items.length) },
      (_, i) => {
        const item = items[i];
        return item
          ? `<div class="chu-bag-item">${item === 'toan_chan_tien_tuu' ? '<img src="/assets/chu/toan_chan_tien_tuu_icon.png" alt=""/>' : ''}<span>${itemNames[item] ?? 'Chiến lợi phẩm'}</span><button data-boss-item="${i}" data-item-id="${item}" data-action="sell">Bán</button><button data-boss-item="${i}" data-item-id="${item}" data-action="drop">Thả</button></div>`
          : `<button disabled aria-label="Ô hành trang trống ${i + 1}">＋</button>`;
      },
    ).join('');
    if (grid.innerHTML !== content) grid.innerHTML = content;
  }
}
