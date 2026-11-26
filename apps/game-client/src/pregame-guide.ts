import { skillIcon } from './asset-url.js';
import statueArt from './controls-art/statue-guide.webp?url';
import {
  bossSkillNames,
  m1Config,
  schools,
  statueIntroduction,
} from '@volam/game-data';
import { abilitySummary } from './skill-menu.js';
import { bossGuide } from './pregame-boss-guide.js';

export const guideTabs = [
  ['campaign', 'Cơ chế chung'],
  ['schools', 'Môn phái'],
  ['bosses', 'Boss'],
] as const;
export type GuideTab = (typeof guideTabs)[number][0];

function campaign(): string {
  return `<div class="campaign-guide"><div>
    <h2>Giữ Tượng Võ Thần</h2>
    <p>${statueIntroduction.join(' ')}</p>
    <ol class="campaign-steps">
      <li><strong>Thủ thành</strong><p>Mỗi 2 phút có một đợt xâm lăng, hai hàng quái mỗi cổng, kéo dài 60 giây. Trận có 20 đợt và mặc định mở bốn cổng. Dọn quái trước khi chúng phá tượng.</p></li>
      <li><strong>Luyện cấp và kiếm vàng</strong><p>Mở Phó Bản để vào khu quái khi có thời gian giữa các đợt. Hạ quái hoặc góp sát thương để nhận kinh nghiệm và vàng. Dùng nút + hoặc giữ O rồi bấm Q/W/E/R/T để học và tăng bậc kỹ năng. Dùng vàng để mua, nâng cấp trang bị.</p></li>
      <li><strong>Đối đầu Tứ Tuyệt</strong><p>Sau khi dọn các đợt 5, 10, 15 và 20, lần lượt đối đầu Đông Tà, Tây Độc, Nam Đế và Bắc Cái. Hạ cả bốn và thắng Kim Luân Pháp Vương để mở trận với Vương Trùng Dương sau 60 giây.</p></li>
      <li><strong>Đánh boss phó bản</strong><p>Gây sát thương và có mặt trong phó bản khi boss bị hạ để đủ điều kiện nhận thưởng. Dùng nguyên liệu boss để chế tạo đồ từ trang bị cơ bản bậc 5. Lần hạ đầu của các boss đủ điều kiện còn trao Long Châu tăng chỉ số.</p></li>
    </ol>
    <p class="guide-tip">Mỗi lượt đấu boss có ba lần hồi sinh. Khi thất bại, đội có thể bỏ phiếu đánh lại.</p>
    </div><figure><img src="${statueArt}" alt="Các hiệp khách bảo vệ Tượng Võ Thần"><figcaption>Tượng Võ Thần</figcaption></figure></div>`;
}

function schoolGuide(id: string): string {
  const school = schools.find((entry) => entry.id === id) ?? schools[0];
  const data = m1Config.progression!;
  const profile = data.schools[school.id]!;
  const rows = (ids: readonly string[]) =>
    ids
      .map((id, slot) => {
        const skill = data.skills[id]!;
        return `<details class="guide-skill"><summary><img src="${skillIcon(id)}" alt=""><kbd>${'QWERT'[slot]}</kbd><strong>${skill.ranks[0]!.nameVi}</strong></summary>
        <p>${skill.descriptionVi}</p><ol>${skill.ranks.map((rank, i) => `<li><strong>Bậc ${i + 1} · cấp ${skill.levelGates[i]}</strong><span>${abilitySummary(rank).replace(/^ · /, '')}</span></li>`).join('')}</ol></details>`;
      })
      .join('');
  return `<label class="guide-picker">Môn phái <select id="guide-school">${schools.map((s) => `<option value="${s.id}" ${s.id === school.id ? 'selected' : ''}>${s.name}</option>`).join('')}</select></label>
    <h2>${school.name} <small>· ${school.element}</small></h2><p>${school.description} ${school.style}</p>
    <p><strong>Nội tại · ${school.passive}</strong><br>${school.attributes} Nội tại tự tăng theo cấp.</p>
    <div class="guide-branches">${profile.basicIds
      .map((id) => {
        const branch = data.fixedBranches![id]!;
        const basic = m1Config.basics[id]!;
        const style = data.defaultBranches?.[id]?.style ?? basic.nameVi;
        return `<section><h3>${style}</h3><details class="guide-skill"><summary><img src="${skillIcon(id)}" alt=""><kbd>A</kbd><strong>${basic.nameVi}</strong></summary><p>${abilitySummary(basic).replace(/^ · /, '')}</p></details>${rows(branch.skillIds)}${branch.alternateSkillIds ? '<h4>Đổi thế bằng F</h4>' + rows(branch.alternateSkillIds.slice(0, 3)) : ''}</section>`;
      })
      .join('')}</div>`;
}

function bosses(id: string): string {
  const boss = bossGuide.find((entry) => entry.id === id) ?? bossGuide[0]!;
  return `<label class="guide-picker">Chọn boss <select id="guide-boss">${bossGuide.map((entry) => `<option value="${entry.id}" ${entry === boss ? 'selected' : ''}>${entry.name}</option>`).join('')}</select></label>
    <h2>${boss.name}</h2><p class="boss-location">${boss.where}</p><p>${boss.tip}</p>
    <dl class="guide-moves">${boss.moves.map(([skill, description]) => `<div><dt>${bossSkillNames[skill] ?? skill}</dt><dd>${description}</dd></div>`).join('')}</dl>`;
}

export function guide(tab: GuideTab, school: string, boss: string): string {
  return `<div class="guide-tabs" role="tablist" aria-label="Mục hướng dẫn">
    ${guideTabs.map(([id, label]) => `<button type="button" role="tab" id="guide-tab-${id}" data-action="guide-tab" data-tab="${id}" aria-selected="${tab === id}" aria-controls="guide-panel" tabindex="${tab === id ? 0 : -1}">${label}</button>`).join('')}
    </div><div class="book-paper guide-body" id="guide-panel" role="tabpanel" aria-labelledby="guide-tab-${tab}" tabindex="0">
      ${tab === 'campaign' ? campaign() : tab === 'schools' ? schoolGuide(school) : bosses(boss)}
    </div>`;
}
