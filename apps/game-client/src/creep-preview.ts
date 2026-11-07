import {
  creepProfiles,
  creepCombatDefinition,
  forestRoster,
  desertRoster,
  beachRoster,
  hellRoster,
} from '@volam/game-data';
import {
  creepPreviewViewSchema,
  type CreepPreviewAction,
  type LobbyState,
} from '@volam/game-protocol';
import './creep-preview.css';

type Action = CreepPreviewAction extends infer A
  ? A extends CreepPreviewAction
    ? Omit<A, 'sequence'>
    : never
  : never;
export const creepPreviewRequested =
  new URLSearchParams(location.search).get('creepPreview') === '1';

/** Optional, in-viewport controls for a real server-owned sandbox room. */
export class CreepPreview {
  readonly panel = document.createElement('details');
  private select: HTMLSelectElement;
  private id = '';
  private projection = '';
  constructor(viewport: HTMLElement, send: (action: Action) => void) {
    const groups: Array<[string, readonly string[]]> = [
      ['Wave', creepCombatDefinition.waveIds],
      ['Rừng Trúc', forestRoster],
      ['Sa Mạc', desertRoster],
      ['Biển', beachRoster],
      ['Địa Ngục', hellRoster],
    ];
    const regular = new Set(groups.flatMap(([, ids]) => ids));
    groups.push([
      'Hỗ trợ boss',
      Object.keys(creepProfiles).filter((id) => !regular.has(id)),
    ]);
    this.panel.id = 'creep-preview';
    this.panel.className = 'framed';
    this.panel.open = true;
    this.panel.hidden = true;
    this.panel.innerHTML = `<summary>Preview từng creep</summary><div class="creep-preview-body"><label for="creep-preview-id">Loại creep</label><select id="creep-preview-id">${groups.map(([name, ids]) => `<optgroup label="${name}">${ids.map((id) => `<option value="${id}">${id.startsWith('wave_') ? `Đợt ${Number(id.slice(5))} · ` : ''}${creepProfiles[id]!.nameVi}</option>`).join('')}</optgroup>`).join('')}</select><div class="creep-preview-buttons"><button data-action="previous">← Trước</button><button data-action="next">Sau →</button><button data-action="reset">Tạo lại</button><button data-action="special">Dùng skill</button><button data-action="death">Thử khi chết</button><button data-action="heal">Hồi đầy</button></div><label><input id="creep-preview-basic" type="checkbox"> Chỉ đánh thường</label><label><input id="creep-preview-stationary" type="checkbox"> Creep đứng tại chỗ</label><label><input id="creep-preview-heal" type="checkbox" checked> Tự hồi máu / mana</label><p id="creep-preview-description"></p><output id="creep-preview-status"></output><small>Mũi tên: di chuyển · A / QWERT: chiến đấu · Shift: lướt. Bấm vào sân để điều khiển. Host chọn creep cho cả phòng.</small></div>`;
    viewport.append(this.panel);
    this.select = this.panel.querySelector('select')!;
    this.select.addEventListener('change', () =>
      send({ action: 'select', id: this.select.value }),
    );
    this.panel.addEventListener('change', (e) => {
      if (!(e.target instanceof HTMLInputElement)) return;
      send({
        action: 'options',
        basicOnly: this.checkbox('basic').checked,
        stationary: this.checkbox('stationary').checked,
        autoHeal: this.checkbox('heal').checked,
      });
    });
    this.panel.addEventListener('pointerdown', () =>
      window.dispatchEvent(new Event('volam:controls-blocked')),
    );
    this.panel.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!button || button.disabled) return;
      const action = button.dataset['action']!;
      if (action === 'previous' || action === 'next') {
        const n = this.select.options.length;
        const i =
          (this.select.selectedIndex + (action === 'next' ? 1 : -1) + n) % n;
        send({ action: 'select', id: this.select.options[i]!.value });
      } else send({ action: action as 'reset' | 'special' | 'death' | 'heal' });
      viewport.querySelector<HTMLCanvasElement>('canvas')?.focus();
    });
  }
  private checkbox(id: string): HTMLInputElement {
    return this.panel.querySelector(`#creep-preview-${id}`)!;
  }
  update(state: LobbyState, session: string): void {
    let raw: unknown;
    try {
      raw = JSON.parse(state.defense.creepPreview || 'null');
    } catch {
      raw = null;
    }
    const parsed = creepPreviewViewSchema.safeParse(raw);
    this.panel.hidden =
      state.phase !== 'IN_GAME' ||
      !state.players.get(session)?.confirmed ||
      !parsed.success;
    if (!parsed.success || this.panel.hidden) return;
    const view = parsed.data,
      p = creepProfiles[view.id];
    if (!p) return;
    const host = state.hostId === session;
    for (const field of this.panel.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement
    >('input,select,button'))
      field.disabled = !host;
    // Do not overwrite a user gesture with the previous tick while its message
    // is in flight. Apply controls only when the server projection changes.
    if (this.projection !== state.defense.creepPreview) {
      this.projection = state.defense.creepPreview;
      this.select.value = view.id;
      this.checkbox('basic').checked = view.basicOnly;
      this.checkbox('stationary').checked = view.stationary;
      this.checkbox('heal').checked = view.autoHeal;
    }
    this.panel.querySelector<HTMLButtonElement>(
      '[data-action="special"]',
    )!.disabled = !host || view.basicOnly || !p.special;
    this.panel.querySelector<HTMLButtonElement>(
      '[data-action="death"]',
    )!.disabled = !host || !p.death;
    this.panel.querySelector('#creep-preview-description')!.textContent =
      `${p.nameVi} · ${Object.keys(creepProfiles).indexOf(view.id) + 1}/49\nĐòn thường: ${p.basic.nameVi}${p.basic.mode === 'projectile' ? ' (tay dài)' : ' (tay ngắn)'} · Skill: ${p.special?.nameVi ?? 'Không có'}${p.death ? ` · Khi chết: ${p.death.nameVi}` : ''}`;
    if (this.id !== view.id) {
      this.id = view.id;
      this.panel.dataset['selected'] = view.id;
    }
    const enemy = [...state.creeps.values()].find(
      (e) => e.archetypeId === view.id,
    );
    const h = state.players.get(session)!;
    const names: Record<string, string> = {
      slow: 'Chậm',
      root: 'Định thân',
      stun: 'Choáng',
      poison: 'Độc',
      burn: 'Cháy',
      attack_slow: 'Chậm đánh',
      defense_break: 'Giảm thủ',
    };
    const statuses = (JSON.parse(h.statuses || '[]') as Array<{ kind: string }>)
      .map((s) => names[s.kind])
      .filter(Boolean);
    this.panel.querySelector('output')!.textContent =
      `Creep: ${enemy && enemy.hp > 0 ? `${Math.ceil(enemy.hp)} HP` : 'Đã chết · bấm Tạo lại'} · Bạn: ${Math.ceil(h.hp)} HP${statuses.length ? ` · ${[...new Set(statuses)].join(', ')}` : ''}`;
  }
  hide(): void {
    this.panel.hidden = true;
    this.projection = '';
  }
  destroy(): void {
    this.panel.remove();
  }
}
