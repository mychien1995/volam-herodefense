import { escapeHtml as esc } from './ui-components.js';
import { readPlayerName, rememberPlayerName } from './player-name.js';
import {
  nicknameSchema,
  type PracticeJoinOptions,
  type PracticeSelection,
  type LobbyPlayer,
} from '@volam/game-protocol';
import { schools } from '@volam/game-data';
import { schoolCards, branchDialog } from './school-selection.js';
import './practice-ui.css';
export class PracticeUI {
  readonly node = document.createElement('section');
  onBack: () => void = () => {};
  onConnect: (choice: Omit<PracticeJoinOptions, 'protocolVersion'>) => void =
    () => {};
  onChange: (choice: Pick<PracticeSelection, 'schoolId' | 'branchId'>) => void =
    () => {};
  private changing = false;
  private pendingSequence = 0;
  private nickname = '';
  private stage: 'name' | 'school' = 'name';
  private school = '';
  private branch = '';
  private busy = false;
  private notice = '';
  constructor() {
    this.node.id = 'practice-ui';
    this.node.hidden = true;
    this.node.setAttribute('aria-label', 'Phòng test');
    document.querySelector('#viewport')!.append(this.node);
    this.node.addEventListener('submit', (e) => {
      e.preventDefault();
      const parsed = nicknameSchema.safeParse(
        this.node.querySelector<HTMLInputElement>('#practice-nickname')
          ?.value ?? '',
      );
      if (!parsed.success) {
        this.notice = 'Hãy nhập biệt danh hợp lệ (1–20 ký tự).';
        this.render();
        return;
      }
      this.nickname = parsed.data;
      rememberPlayerName(this.nickname);
      this.stage = 'school';
      this.notice = '';
      this.render();
    });
    this.node.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>(
        'button[data-practice]',
      );
      if (!b || b.disabled || this.busy) return;
      switch (b.dataset['practice']) {
        case 'back':
          if (this.changing) {
            this.clear();
            break;
          }
          if (this.stage === 'school') {
            this.stage = 'name';
            this.school = '';
            this.render();
          } else {
            this.clear();
            this.onBack();
          }
          break;
        case 'school':
          this.school = b.dataset['school'] ?? '';
          this.branch = '';
          this.render();
          break;
        case 'branch':
          this.branch = b.dataset['branch'] ?? '';
          this.render();
          break;
        case 'close-branches':
          this.school = '';
          this.render();
          break;
        case 'confirm':
          if (!this.school || !this.branch) return;
          this.busy = true;
          this.notice = this.changing
            ? 'Đang đổi nhân vật…'
            : 'Đang vào phòng test…';
          this.render();
          const choice = {
            schoolId: this.school as PracticeJoinOptions['schoolId'],
            branchId: this.branch,
          };
          if (this.changing) this.onChange(choice);
          else this.onConnect({ nickname: this.nickname, ...choice });
          break;
      }
    });
    window.addEventListener(
      'keydown',
      (e) => {
        if (this.node.hidden || e.code !== 'Escape') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.escape();
      },
      true,
    );
  }
  escape(): boolean {
    if (this.node.hidden) return false;
    if (this.busy) return true;
    if (this.school) {
      this.school = '';
      this.render();
    } else if (this.changing) this.clear();
    else if (this.stage === 'school') {
      this.stage = 'name';
      this.render();
    } else {
      this.clear();
      this.onBack();
    }
    return true;
  }
  open(nickname = ''): void {
    this.clear();
    this.nickname = readPlayerName() || nickname;
    this.stage = 'name';
    this.node.hidden = false;
    this.render();
  }
  openChange(): void {
    this.clear();
    this.changing = true;
    this.stage = 'school';
    this.node.dataset['inGame'] = 'true';
    this.node.hidden = false;
    this.render();
  }
  pending(sequence: number): void {
    this.pendingSequence = sequence;
  }
  rejected(sequence: number, reason: string): void {
    if (this.changing && this.busy && sequence === this.pendingSequence)
      this.error(reason);
  }
  loading(): void {
    if (
      this.changing ||
      this.node.hidden ||
      this.notice === 'Đang tải Rừng Trúc…'
    )
      return;
    this.notice = 'Đang tải Rừng Trúc…';
    this.render();
  }
  connected(
    hero?: Pick<LobbyPlayer, 'schoolId' | 'selectedBranch' | 'lastSequence'>,
  ): void {
    if (
      this.changing &&
      !(
        this.busy &&
        this.pendingSequence > 0 &&
        hero &&
        hero.lastSequence >= this.pendingSequence &&
        hero.schoolId === this.school &&
        hero.selectedBranch === this.branch
      )
    )
      return;
    this.clear();
  }
  error(message: string): void {
    this.pendingSequence = 0;
    this.busy = false;
    this.notice = message;
    this.render();
  }
  clear(): void {
    const wasChanging = this.changing;
    this.changing = false;
    this.pendingSequence = 0;
    delete this.node.dataset['inGame'];
    this.node.querySelector<HTMLDialogElement>('dialog[open]')?.close();
    this.node.hidden = true;
    this.busy = false;
    this.school = '';
    this.branch = '';
    this.notice = '';
    if (wasChanging)
      document.querySelector<HTMLCanvasElement>('#game canvas')?.focus();
  }
  private render(): void {
    if (this.node.hidden) return;
    const focused = (document.activeElement as HTMLElement | null)?.dataset[
      'branch'
    ];
    this.node.querySelector<HTMLDialogElement>('dialog[open]')?.close();
    const school = schools.find((s) => s.id === this.school);
    this.node.innerHTML =
      this.stage === 'name'
        ? `<section class="pre-window practice-entry"><h1 class="pre-title">Phòng test</h1><p>Rừng Trúc · Một người chơi · Ba Chó Hoang bất tử</p>
     <form id="practice-name-form"><label for="practice-nickname">Biệt danh</label><input id="practice-nickname" value="${esc(this.nickname)}" maxlength="20" required autocomplete="off">
     <button type="submit">Chọn nhân vật</button></form><p class="pre-error" role="status">${esc(this.notice)}</p><button data-practice="back">Quay lại</button></section>`
        : `<section class="pre-window school-window"><h1 class="pre-title">${this.changing ? 'Đổi phái/hệ phái' : 'Chọn môn phái'}</h1><p class="pre-room">Cấp 30 · Kỹ năng tối đa · Bất tử · Nội lực vô hạn · Không hồi chiêu</p>
     <div class="school-grid">${schoolCards(this.school, this.busy, true, 'data-practice')}</div><div class="pre-actions"><button data-practice="back" ${this.busy ? 'disabled' : ''}>${this.changing ? 'Hủy' : 'Quay lại'}</button></div>
     ${
       school
         ? branchDialog({
             school,
             titleId: 'practice-branch-title',
             selected: this.branch,
             enabled: !this.busy,
             attribute: 'data-practice',
             notice: this.notice,
             actions: [
               {
                 label: 'Đổi môn phái',
                 action: 'close-branches',
                 disabled: this.busy,
               },
               {
                 label: this.changing
                   ? this.busy
                     ? 'Đang đổi…'
                     : 'Đổi nhân vật'
                   : this.busy
                     ? 'Đang vào phòng…'
                     : 'Vào phòng test',
                 action: 'confirm',
                 disabled: !this.branch || this.busy,
               },
             ],
           })
         : ''
     }
   </section>`;
    const dialog = this.node.querySelector<HTMLDialogElement>('dialog');
    if (dialog) {
      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        if (!this.busy) {
          this.school = '';
          this.render();
        }
      });
      dialog.showModal();
      if (focused)
        dialog
          .querySelector<HTMLButtonElement>(`[data-branch="${focused}"]`)
          ?.focus();
    } else if (this.stage === 'name')
      this.node.querySelector<HTMLInputElement>('#practice-nickname')?.focus();
    else this.node.querySelector<HTMLButtonElement>('.school-card')?.focus();
  }
}
