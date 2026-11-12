import type { BossInvitation } from '@volam/game-core';
import type { DungeonDestination } from '@volam/game-data';

type BossDestination = Extract<
  DungeonDestination,
  'co_mo' | 'hong_liet' | 'chu_ba_thong' | 'kim_luan'
>;
const mechanisms: Record<BossDestination, [string, string[]]> = {
  co_mo: [
    'Lý Mạc Sầu',
    [
      'Phất trần quét quanh người và độc châm tầm xa.',
      'Cổ Mộ Kiếm Pháp triệu hồi 4, 6 hoặc 8 đệ tử có đòn bắn xa.',
      'Tránh vùng độc và xử lý đệ tử trước khi bị vây.',
    ],
  ],
  hong_liet: [
    'Hoàn Nhan Hồng Liệt',
    [
      'Năm đường đao xuất phát từ boss; đòn chém vòng cung phủ nửa vòng tròn phía trước.',
      'Đọc vùng báo chiêu và tránh mặt trước khi boss vung đao.',
      'Boss triệu hồi viện binh và tung các đợt đao liên tiếp.',
    ],
  ],
  chu_ba_thong: [
    'Chu Bá Thông',
    [
      'Túy Tiên Bộ di chuyển đồng thời bắn chưởng về vị trí người chơi.',
      'Càn Khôn Phản Chấn hút trên toàn arena và khóa Shift. Giết tiểu đồng, đến gần bình bấm Space uống: Tửu lực 12s xuyên 70% phòng thủ Chu Bá Thông. Uống lại làm mới, không cộng dồn.',
      'Các vòng Âm Dương liên tục di chuyển; tránh đứng trong vùng nguy hiểm.',
    ],
  ],
  kim_luan: [
    'Kim Luân Pháp Vương',
    [
      'Hạ Hoắc Đô và Đạt Nhĩ Ba trước khi đấu Pháp Vương. Bất Động Kim Cang đổi người được bảo hộ.',
      'Truy Hồn có bảy luân nảy quanh arena trong thời gian dài.',
      'Bảy luân Hộ Thể xoay quanh boss rồi bắn ra bảy hướng; tránh cả đao khí bán nguyệt.',
    ],
  ],
};
export const isBossDestination = (id: string): id is BossDestination =>
  Object.hasOwn(mechanisms, id);

/** Temporary dialogs remain inside the match viewport and never pause simulation. */
export class BossPartyUI {
  private readonly layer = document.createElement('div');
  private invitation: BossInvitation | undefined;
  private dismissedId = 0;
  private kind: 'help' | 'invitation' | 'info' | undefined;
  onSummon = (): void => {};
  onReply = (_invitation: BossInvitation, _accept: boolean): void => {};
  onInvitation = (_destination: BossDestination): void => {};
  get blocked(): boolean {
    return !!this.kind;
  }
  constructor(viewport: HTMLElement) {
    this.layer.id = 'boss-party-dialog';
    this.layer.hidden = true;
    viewport.append(this.layer);
    this.layer.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).closest<HTMLElement>(
        '[data-party-action]',
      )?.dataset['partyAction'];
      if (!action) return;
      const kind = this.kind,
        invitation = this.invitation;
      if (invitation) this.dismissedId = invitation.id;
      this.close();
      if (kind === 'invitation' && invitation)
        this.onReply(invitation, action === 'yes');
      else if (kind === 'help' && action === 'yes') this.onSummon();
    });
    this.layer.addEventListener('keydown', (e) => {
      if (e.code !== 'Tab') return;
      const buttons = [
        ...this.layer.querySelectorAll<HTMLButtonElement>('button'),
      ];
      const current = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      e.preventDefault();
      e.stopPropagation();
      buttons[
        (current + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus();
    });
  }
  help(): void {
    this.show(
      'help',
      'Triệu hồi đồng đội',
      '<p>Bạn đã vào phó bản boss. Có muốn mời các đồng đội ở ngoài đến trợ giúp?</p>',
      true,
    );
  }
  information(id: string): void {
    if (!isBossDestination(id)) return;
    const entry = mechanisms[id];
    this.show(
      'info',
      entry[0],
      entry[1].map((text) => `<p>${text}</p>`).join('') +
        '<p>Mỗi lượt boss có 3 lần hồi sinh sau 5 giây. Chết lần thứ tư sẽ quan chiến. Khi cả đội hết lượt, biểu quyết ít nhất 50% để đánh lại. Khi tất cả đồng đội cùng ở đây, chiến sự ngoài đấu trường tạm dừng.</p>',
      false,
    );
  }
  sync(raw: string): void {
    let invitation: BossInvitation | undefined;
    try {
      invitation = JSON.parse(raw || 'null') ?? undefined;
    } catch {
      /* malformed state cannot open a dialog */
    }
    if (!invitation) {
      if (this.kind === 'invitation') this.close();
      return;
    }
    if (invitation.id === this.dismissedId) return;
    if (invitation.id !== this.invitation?.id || this.kind !== 'invitation') {
      this.invitation = invitation;
      const destination = invitation.destination;
      let name = 'boss';
      if (isBossDestination(destination)) {
        this.onInvitation(destination);
        name = mechanisms[destination][0];
      }
      this.show(
        'invitation',
        'Đồng đội cần trợ giúp',
        `<p>Vào phó bản ${name} để trợ giúp?</p><p>Còn <b id="boss-invitation-time"></b> giây để trả lời.</p>`,
        true,
      );
    }
    const timer = this.layer.querySelector('#boss-invitation-time');
    if (timer)
      timer.textContent = String(
        Math.max(0, Math.ceil((invitation.expiresAtMs - Date.now()) / 1000)),
      );
  }
  escape(): void {
    const invitation = this.kind === 'invitation' ? this.invitation : undefined;
    if (invitation) this.dismissedId = invitation.id;
    this.close();
    if (invitation) this.onReply(invitation, false);
  }
  close(): void {
    this.kind = undefined;
    this.invitation = undefined;
    this.layer.hidden = true;
    this.layer.replaceChildren();
  }
  private show(
    kind: NonNullable<BossPartyUI['kind']>,
    title: string,
    body: string,
    choice: boolean,
  ): void {
    this.kind = kind;
    this.layer.hidden = false;
    this.layer.innerHTML = `<section class="framed" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2>${body}<div class="window-footer">${choice ? '<button data-party-action="no">Không</button><button class="accent" data-party-action="yes">Đồng ý</button>' : '<button data-party-action="close">Đóng</button>'}</div></section>`;
    window.dispatchEvent(new Event('volam:controls-blocked'));
    this.layer
      .querySelector<HTMLButtonElement>('button')
      ?.focus({ preventScroll: true });
  }
}
