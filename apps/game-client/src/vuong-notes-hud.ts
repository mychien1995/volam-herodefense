import type { LobbyState } from '@volam/game-protocol';
import { vuongNotes, type VuongView } from '@volam/game-core';
import './vuong-notes-hud.css';
/** Presentation only: deadlines and readiness come from the server. */
export class VuongNotesHud {
  private panel = document.createElement('section');
  constructor() {
    this.panel.id = 'vuong-notes-hud';
    this.panel.className = 'framed';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', 'Thất Tuyệt Lôi Âm');
    document.querySelector('#viewport')!.append(this.panel);
  }
  sync(state: LobbyState | undefined, id: string): void {
    const h = state?.players.get(id);
    const raw =
      h?.zoneId === 'arena' ? state?.vuong.get('arena')?.snapshot : undefined;
    const v: VuongView | null = raw ? JSON.parse(raw) : null;
    const a = v?.action;
    const active = a?.skill === 'notes';
    this.panel.hidden =
      !h || h.hp <= 0 || !v || (!active && !(v.notesTest && v.notesComplete));
    if (this.panel.hidden || !v) return;
    if (!active || !a) {
      this.panel.textContent = 'Thất Tuyệt Lôi Âm · Hoàn thành 7/7 nhịp!';
      return;
    }
    const seconds = Math.max(0, (a.next - v.tick) / v.rate).toFixed(1);
    const current = a.stage - 1;
    const ready = v.noteReadyIds.includes(id);
    const title = a.stage
      ? `Nhịp ${a.stage}/7 · ${vuongNotes[v.notes[current]!]} · còn ${seconds}s`
      : `Ghi nhớ chuỗi · Bắt đầu sau ${seconds}s`;
    const hint = a.stage
      ? ready
        ? `Đã đúng ô · Giữ đến hết nhịp (${v.noteReadyIds.length}/${v.noteParticipants} người)`
        : 'Vào ô đang sáng · Đứng yên đến khi chuyển nhịp'
      : 'Đứng vào nốt đầu tiên · Mỗi nhịp chỉ chốt khi đồng hồ về 0';
    this.panel.dataset['ready'] = String(ready);
    this.panel.innerHTML = `<strong>${title}</strong><div>${v.notes.map((n, i) => `<span class="${i < current ? 'done' : i === current ? 'current' : ''}">${vuongNotes[n]}</span>`).join('<b>›</b>')}</div><small>${hint}</small>`;
  }
}
