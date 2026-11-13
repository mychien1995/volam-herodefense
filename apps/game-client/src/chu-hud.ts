import type { LobbyState } from '@volam/game-protocol';
import type { ChuView, KimView, WaveArenaView } from '@volam/game-core';
import { hongLietDefinition, lyMacSauEncounter } from '@volam/game-data';
const bosses: Record<string, string> = {
  dong_ta: 'Đông Tà',
  tay_doc: 'Tây Độc',
  nam_de: 'Nam Đế',
  bac_cai: 'Bắc Cái',
  vuong_trung_duong: 'Vương Trùng Dương',
  ly_mac_sau: 'Lý Mạc Sầu',
  hoan_nhan_hong_liet: 'Hoàn Nhan Hồng Liệt',
  chu_ba_thong: 'Chu Bá Thông',
  kim_luan_phap_vuong: 'Kim Luân Pháp Vương',
  hoac_do: 'Hoắc Đô',
  dat_nhi_ba: 'Đạt Nhĩ Ba',
};
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
    this.root.id = 'boss-hud';
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
    const wave =
      h?.zoneId === 'arena' && state?.defense.waveArena
        ? (JSON.parse(state.defense.waveArena) as WaveArenaView | null)
        : null;
    const entries: Array<{
      name: string;
      hp: number;
      maxHp: number;
      detail?: string | undefined;
    }> = [];
    if (wave?.locked && wave.bossHp > 0 && bosses[wave.bossId]) {
      entries.push({
        name: bosses[wave.bossId]!,
        hp: wave.bossHp,
        maxHp: wave.bossMaxHp,
      });
    } else if (h && state?.phase === 'IN_GAME') {
      for (const a of state.creeps.values()) {
        const name = bosses[a.archetypeId];
        if (a.zoneId !== h.zoneId || !name || a.hp <= 0 || a.maxHp <= 0)
          continue;
        const cast =
          a.castAbilityId as keyof typeof hongLietDefinition.abilities;
        const detail =
          a.archetypeId === 'chu_ba_thong' && v
            ? names[v.phase] +
              (v.phase === 'trap' && v.trap && !v.trap.released
                ? ` · ${v.trap.inside}/${v.trap.required.length} vào trận`
                : '')
            : a.archetypeId === 'kim_luan_phap_vuong' && kim?.enraged
              ? 'Long Tượng Bát Nhã Thập Tầng'
              : a.archetypeId === 'hoan_nhan_hong_liet'
                ? hongLietDefinition.abilities[cast]?.nameVi
                : a.archetypeId === 'ly_mac_sau' && a.castTicks > 0
                  ? lyMacSauEncounter.attacks.find(
                      (attack) => attack.id === a.castAbilityId,
                    )?.nameVi
                  : undefined;
        entries.push({ name, hp: a.hp, maxHp: a.maxHp, detail });
      }
    }
    this.root.hidden =
      !entries.length || (h?.hp ?? 0) <= 0 || state?.phase !== 'IN_GAME';
    document.querySelector<HTMLElement>('#viewport')!.dataset['bossHud'] =
      String(!this.root.hidden);
    const bars = entries
      .map(({ name, hp, maxHp, detail }) => {
        const current = Math.ceil(hp);
        const max = Math.ceil(maxHp);
        return `<div class="boss-health-row"><strong>${name}</strong><div class="boss-health" role="meter" aria-label="Sinh lực ${name}" aria-valuemin="0" aria-valuenow="${current}" aria-valuemax="${max}"><i style="width:${Math.min(100, Math.max(0, (100 * hp) / maxHp))}%"></i><span>${current} / ${max}</span></div>${detail ? `<small>${detail}</small>` : ''}</div>`;
      })
      .join('');
    if (this.root.innerHTML !== bars) this.root.innerHTML = bars;
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
