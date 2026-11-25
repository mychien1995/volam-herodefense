import type { LobbyPlayer } from '@volam/game-protocol';
import {
  vuongNotes,
  type BossRetryView,
  type BossTestSkipStage,
} from '@volam/game-core';
export type RetryAction =
  | { action: 'vote'; id: number; accept: boolean }
  | { action: 'call'; id: number };
export class BossRetryUI {
  readonly layer = document.createElement('div');
  private readonly status = document.createElement('span');
  private view: BossRetryView | null = null;
  private skipStage: BossTestSkipStage | 'vuong_trung_duong' | undefined;
  constructor(
    viewport: HTMLElement,
    private send: (action: RetryAction) => void,
    skip: (
      stage: BossTestSkipStage | 'vuong_trung_duong' | 'vuong_notes',
    ) => void,
  ) {
    this.layer.id = 'boss-retry-dialog';
    this.layer.hidden = true;
    this.layer.innerHTML =
      '<section class="framed" role="dialog" aria-modal="true" aria-labelledby="boss-retry-title"><h2 id="boss-retry-title">Thử lại trận boss?</h2><p data-retry-summary></p><p data-retry-votes aria-live="polite"></p><div class="retry-actions"><button data-retry-yes>Đánh lại</button><button data-retry-no>Dừng lượt đánh</button><button data-retry-skip hidden>Bỏ qua → mốc tiếp theo</button><button data-retry-notes hidden>Test lại Thất Tuyệt Lôi Âm</button></div></section>';
    this.layer
      .querySelector<HTMLButtonElement>('[data-retry-skip]')!
      .addEventListener('click', () => {
        if (this.skipStage) skip(this.skipStage);
      });
    this.layer
      .querySelector('[data-retry-notes]')!
      .addEventListener('click', () => skip('vuong_notes'));
    this.status.id = 'boss-lives';
    this.status.className = 'framed';
    this.status.hidden = true;
    this.status.innerHTML =
      '<span></span><button hidden>Gọi đánh lại boss</button>';
    this.layer.tabIndex = -1;
    this.layer.addEventListener('keydown', (event) => {
      if (event.code !== 'Tab') return;
      const buttons = [
        ...this.layer.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled):not([hidden])',
        ),
      ];
      event.preventDefault();
      if (!buttons.length) {
        this.layer.focus();
        return;
      }
      const index = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      buttons[
        (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus();
    });
    viewport.append(this.layer, this.status);
    this.layer
      .querySelector('[data-retry-yes]')!
      .addEventListener('click', () => this.vote(true));
    this.layer
      .querySelector('[data-retry-no]')!
      .addEventListener('click', () => this.vote(false));
    this.status.querySelector('button')!.addEventListener('click', () => {
      if (this.view) this.send({ action: 'call', id: this.view.id });
    });
  }
  setSkip(stage: BossTestSkipStage | 'vuong_trung_duong' | undefined): void {
    this.skipStage = stage;
    this.layer.querySelector<HTMLButtonElement>('[data-retry-notes]')!.hidden =
      !stage;
    this.layer.querySelector<HTMLButtonElement>('[data-retry-skip]')!.hidden =
      !stage;
  }
  get blocked(): boolean {
    return !this.layer.hidden;
  }
  private vote(accept: boolean): void {
    if (this.view) this.send({ action: 'vote', id: this.view.id, accept });
  }
  sync(hero: LobbyPlayer | undefined, active: boolean): void {
    const data = hero?.inventory.campaign
      ? (JSON.parse(hero.inventory.campaign) as { retry: BossRetryView | null })
      : null;
    this.view = data?.retry ?? null;
    const v = active ? this.view : null;
    const wasHidden = this.layer.hidden;
    this.layer.hidden = !v || v.phase !== 'vote';
    this.status.hidden = !v;
    if (!v) return;
    this.status.querySelector('span')!.textContent =
      v.phase === 'waiting'
        ? 'Boss chưa vượt qua · Có thể thử lại'
        : `Lần ${v.attempt} · Còn ${v.revivals} lượt hồi sinh${v.revivalTicks ? ` · Hồi sinh sau ${Math.ceil(v.revivalTicks / 30)}s` : ''}`;
    this.status.querySelector('button')!.hidden = v.phase !== 'waiting';
    this.layer.querySelector('[data-retry-summary]')!.textContent =
      v.notesFailure
        ? `Thất Tuyệt Lôi Âm: hụt nhịp ${v.notesFailure.beat}/7 (${vuongNotes[v.notesFailure.note]}). Cần đứng trong ô đúng lúc hết nhịp; rời ô sớm cũng tính sai. Đánh lại giữ cấp, trang bị và Long Châu.`
        : 'Cả đội đã hết lượt hồi sinh. Đánh lại giữ cấp, trang bị và Long Châu; boss trở về đầy máu.';
    this.layer.querySelector('[data-retry-votes]')!.textContent =
      `${v.yes}/${v.required} phiếu đồng ý · ${v.total} người · Còn ${Math.ceil(v.remainingMs / 1000)} giây`;
    for (const b of this.layer.querySelectorAll<HTMLButtonElement>(
      'button:not([data-retry-skip]):not([data-retry-notes])',
    ))
      b.disabled = v.choice !== null;
    if (!this.layer.hidden && wasHidden) {
      window.dispatchEvent(new Event('volam:controls-blocked'));
      this.layer
        .querySelector<HTMLButtonElement>('button')!
        .focus({ preventScroll: true });
    }
  }
}
