import type { LobbyState } from '@volam/game-protocol';
import { m1Config, invasionCreepName } from '@volam/game-data';
import type { DongView } from '@volam/game-core';

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
      '<strong>Tượng trấn phái</strong><div id="statue-meter" role="meter" aria-label="Sinh lực tượng" aria-valuemin="0"><i></i><span></span></div><span id="dong-ta-status" hidden></span><span id="invasion-countdown"></span><span id="next-invasion-creep"></span>';
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
    const boss = d.dongTa ? (JSON.parse(d.dongTa) as DongView) : undefined;
    this.panel.querySelector('strong')!.textContent = boss?.locked
      ? boss.phase === 'retry'
        ? 'Đông Tà · Chuẩn bị đánh lại'
        : `Đông Tà · Lần ${boss.attempt}`
      : 'Tượng trấn phái';
    meter.title = boss?.locked ? 'Tượng tạm bất tử trong trận Đông Tà' : '';
    const encounterStatus =
      this.panel.querySelector<HTMLElement>('#dong-ta-status')!;
    encounterStatus.hidden = !boss?.locked;
    encounterStatus.textContent =
      boss?.phase === 'retry'
        ? `Cả đội thất bại · Đánh lại sau ${Math.max(0, Math.ceil((boss.phaseUntil - boss.tick) / m1Config.tickRate))}s`
        : boss?.locked
          ? `Sinh lực Đông Tà: ${Math.ceil(boss.bossHp)} / ${boss.bossMaxHp}`
          : '';
    meter.setAttribute('aria-valuenow', String(d.statueHp));
    meter.setAttribute('aria-valuemax', String(d.statueMaxHp));
    meter.querySelector<HTMLElement>('i')!.style.width =
      `${Math.max(0, (d.statueHp / d.statueMaxHp) * 100)}%`;
    meter.querySelector('span')!.textContent =
      `${boss?.locked ? 'Tượng bất tử · ' : ''}${Math.ceil(d.statueHp)} / ${d.statueMaxHp}`;
    const seconds = Math.max(
      0,
      Math.ceil((d.nextWaveTick - state.tick) / m1Config.tickRate),
    );
    this.panel.querySelector('#invasion-countdown')!.textContent = d.defeated
      ? 'Trận đấu kết thúc'
      : d.paused
        ? `Đợt ${d.wave} · Tạm dừng — toàn đội đang trong phó bản boss`
        : `Đợt ${d.wave} · Đợt ${d.wave + 1} sau ${Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    const nextName = invasionCreepName(d.wave + 1);
    const roster = this.panel.querySelector<HTMLElement>(
      '#next-invasion-creep',
    )!;
    roster.hidden = d.defeated || !nextName;
    roster.textContent = nextName ? `Sắp tới: ${nextName}` : '';
    const noticeName = invasionCreepName(d.noticeWave);
    const rosterNotice = noticeName ? ` · ${noticeName}` : '';
    const showNotice =
      !d.defeated && d.noticeId > 0 && state.tick < d.noticeUntilTick;
    this.warning.hidden = !showNotice;
    document.body.classList.toggle('invasion-notice', showNotice);
    if (showNotice)
      this.warning.textContent =
        d.noticeKind === 'wave'
          ? `Đợt ${d.noticeWave} đã đến từ hai hướng Tây và Đông!${rosterNotice}`
          : `Đợt ${d.noticeWave} sẽ đến sau ${d.noticeLeadTicks / m1Config.tickRate} giây!${rosterNotice}`;
    this.warning.dataset['noticeId'] = String(d.noticeId);
    if (d.defeated && !this.wasDefeated)
      this.defeat
        .querySelector<HTMLButtonElement>('button')!
        .focus({ preventScroll: true });
    this.wasDefeated = d.defeated;
  }
}
