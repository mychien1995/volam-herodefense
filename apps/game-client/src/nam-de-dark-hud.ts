import type { LobbyState } from '@volam/game-protocol';
import type { NamDeView } from '@volam/game-core';
import './nam-de-dark-hud.css';
export class NamDeDarkHud {
  readonly button = document.createElement('button');
  private ready = false;
  constructor(use: () => void) {
    this.button.id = 'nam-de-guard';
    this.button.hidden = true;
    this.button.type = 'button';
    this.button.addEventListener('click', () => {
      if (this.ready) use();
    });
    document.querySelector('#viewport')!.append(this.button);
  }
  get active(): boolean {
    return !this.button.hidden;
  }
  sync(state: LobbyState | undefined, id: string): void {
    const h = state?.players.get(id);
    const v: NamDeView | null = state?.defense.namDe
      ? JSON.parse(state.defense.namDe)
      : null;
    const d =
      h?.zoneId === 'arena' &&
      h.hp > 0 &&
      !h.bossSpectator &&
      v?.phase !== 'defeated'
        ? v?.dark
        : null;
    this.button.hidden = !d;
    if (!d || !state) {
      this.ready = false;
      return;
    }
    const guard = d.guards.find((g) => g.id === id);
    const remaining = Math.max(0, (guard?.cooldownUntil ?? 0) - state.tick);
    this.ready = !remaining && state.tick >= d.transitionUntil;
    this.button.disabled = !this.ready;
    this.button.innerHTML = `<kbd>Z</kbd><strong>Đỡ Băng Đao</strong><small>${state.tick < d.transitionUntil ? 'Nam Đế hắc hóa…' : (guard?.until ?? 0) > state.tick ? 'Đang đỡ' : remaining ? `Hồi ${(remaining / 30).toFixed(1)}s` : 'Bấm đúng lúc đao tới'} · ${d.reflections}/${d.reflectionsRequired} phản trúng</small>`;
    this.button.title = d.shield
      ? 'Phản trúng Nam Đế 3 lần để phá Canh Khí'
      : 'Canh Khí đã vỡ · Z vẫn đỡ được Băng Đao';
  }
}
