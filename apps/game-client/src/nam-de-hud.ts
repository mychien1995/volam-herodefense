import type { LobbyState } from '@volam/game-protocol';
import type { NamDeControl, NamDeKey } from '@volam/game-core';
import './nam-de-hud.css';
const symbols: Record<NamDeKey, string> = {
  up: '↑',
  right: '→',
  down: '↓',
  left: '←',
};
export class NamDeHud {
  private dialog = document.createElement('section');
  private pending: { id: string; index: number } | undefined;
  constructor() {
    this.dialog.id = 'nam-de-qte';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-label', 'Đại Lý Phong Huyệt');
    this.dialog.hidden = true;
    document.querySelector('#viewport')!.append(this.dialog);
  }
  capture(
    key: string,
  ): { castId: string; index: number; key: NamDeKey } | null | undefined {
    if (!this.pending) return undefined;
    const physical: Record<string, NamDeKey> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };
    if (!physical[key] || this.pending.index >= 10) return null;
    return {
      castId: this.pending.id,
      index: this.pending.index++,
      key: physical[key],
    };
  }
  sync(state: LobbyState | undefined, id: string) {
    const h = state?.players.get(id);
    const control =
        h?.zoneId === 'arena' && state?.namDeControls.get(id)?.payload
          ? (JSON.parse(state.namDeControls.get(id)!.payload) as NamDeControl)
          : null,
      q = control?.qte;
    const open = !!q && q.state === 'pending' && !!h && h.hp > 0;
    if (open) {
      if (this.pending?.id !== q.id) {
        this.pending = { id: q.id, index: q.index };
        window.dispatchEvent(new Event('volam:controls-blocked'));
      } else this.pending.index = Math.max(this.pending.index, q.index);
      const final = q.id.startsWith('vtd:');
      const name = final ? 'Toàn Chân Phản Kiếm' : 'Đại Lý Phong Huyệt';
      const penalty = final ? 'Một người sai · Cả đội chịu một nhát chém, còn ít nhất 1 HP' : 'Sai: phản phệ 70% máu tối đa · choáng 2s';
      this.dialog.setAttribute('aria-label', name);
      this.dialog.innerHTML = `<strong>${name}</strong><p>Gõ phím mũi tên vật lý · ${Math.max(0, (q.until - state!.tick) / 30).toFixed(1)}s</p><div>${q.keys.map((key, i) => `<span class="${i < q.index ? 'done' : i === q.index ? 'next' : ''}">${symbols[key]}</span>`).join('')}</div><small>${penalty}</small>`;
    } else this.pending = undefined;
    this.dialog.hidden = !open;
  }
}
