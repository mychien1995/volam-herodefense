import type { LobbyState } from '@volam/game-protocol';
import { m1Config } from '@volam/game-data';

export class DefenseHud {
  private readonly panel = document.createElement('section');
  private readonly warning = document.createElement('p');
  private readonly defeat = document.createElement('div');
  private wasDefeated = false;
  constructor(viewport: HTMLElement, onLeave: () => void) {
    this.panel.id = 'defense-hud';
    this.panel.className = 'framed';
    this.panel.hidden = true;
    this.panel.innerHTML =
      '<strong>Tượng trấn phái</strong><div id="statue-meter" role="meter" aria-label="Statue HP" aria-valuemin="0"><i></i><span></span></div><span id="invasion-countdown"></span>';
    this.warning.id = 'invasion-warning';
    this.warning.hidden = true;
    this.warning.setAttribute('role', 'status');
    this.warning.setAttribute('aria-live', 'assertive');
    this.defeat.id = 'defeat-layer';
    this.defeat.hidden = true;
    this.defeat.innerHTML =
      '<section class="framed" role="dialog" aria-modal="true" aria-labelledby="defeat-title"><h2 id="defeat-title">Thất Bại</h2><p>Tượng trấn phái đã bị phá hủy.</p><p>Trận đấu đã kết thúc.</p><button id="defeat-leave">Rời trận</button></section>';
    viewport.append(this.panel, this.warning, this.defeat);
    this.defeat.querySelector('button')!.addEventListener('click', onLeave);
  }
  hide(): void {
    this.panel.hidden = true;
    this.warning.hidden = true;
    this.defeat.hidden = true;
    this.wasDefeated = false;
    document.body.classList.remove('invasion-notice');
  }
  update(state: LobbyState): void {
    const d = state.defense,
      active =
        d.enabled && (state.phase === 'IN_GAME' || state.phase === 'DEFEAT');
    this.panel.hidden = !active;
    this.defeat.hidden = !active || !d.defeated;
    if (!active) {
      this.warning.hidden = true;
      return;
    }
    const meter = this.panel.querySelector<HTMLElement>('#statue-meter')!;
    meter.setAttribute('aria-valuenow', String(d.statueHp));
    meter.setAttribute('aria-valuemax', String(d.statueMaxHp));
    meter.querySelector<HTMLElement>('i')!.style.width =
      `${Math.max(0, (d.statueHp / d.statueMaxHp) * 100)}%`;
    meter.querySelector('span')!.textContent =
      `${Math.ceil(d.statueHp)} / ${d.statueMaxHp}`;
    const seconds = Math.max(
      0,
      Math.ceil((d.nextWaveTick - state.tick) / m1Config.tickRate),
    );
    this.panel.querySelector('#invasion-countdown')!.textContent = d.defeated
      ? 'Trận đấu kết thúc'
      : `Đợt ${d.wave} · Đợt ${d.wave + 1} sau ${Math.floor(seconds / 60)
          .toString()
          .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    const showNotice =
      !d.defeated && d.noticeId > 0 && state.tick < d.noticeUntilTick;
    this.warning.hidden = !showNotice;
    document.body.classList.toggle('invasion-notice', showNotice);
    if (showNotice)
      this.warning.textContent =
        d.noticeKind === 'wave'
          ? `Đợt ${d.noticeWave} đã đến từ hai hướng Tây và Đông!`
          : `Đợt ${d.noticeWave} sẽ đến sau ${d.noticeLeadTicks / m1Config.tickRate} giây!`;
    this.warning.dataset['noticeId'] = String(d.noticeId);
    if (d.defeated && !this.wasDefeated)
      this.defeat
        .querySelector<HTMLButtonElement>('button')!
        .focus({ preventScroll: true });
    this.wasDefeated = d.defeated;
  }
}
