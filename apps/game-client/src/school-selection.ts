import { skillIcon } from './asset-url.js';
import { heroBodyUrl, schoolHeroBasic } from './hero-portraits.js';
import './school-selection.css';
import { m1Config, schools } from '@volam/game-data';
import { nguDoc } from '@volam/game-core';
import {
  actionRow,
  escapeHtml as escape,
  type ActionAttribute,
  type UiAction,
} from './ui-components.js';

type School = (typeof schools)[number];

/** Identical school portraits/layout for Defense and Lôi Đài. */
export function schoolCards(
  selected = '',
  disabled = false,
  requiresBranch = true,
  attribute: ActionAttribute = 'data-action',
) {
  return schools
    .map(
      (s) =>
        `<button type="button" class="school-card ${selected === s.id ? 'selected' : ''}" ${attribute}="school" data-school="${s.id}" aria-pressed="${selected === s.id}" ${requiresBranch ? 'aria-haspopup="dialog"' : ''} ${disabled ? 'disabled' : ''}><img class="school-portrait ${s.portrait}" src="${heroBodyUrl(schoolHeroBasic(s.id))}" alt="" aria-hidden="true" width="78" height="78" decoding="async" fetchpriority="high"/><h3>${s.name}</h3><span class="school-element">${s.element}</span></button>`,
    )
    .join('');
}

export function branchCards(
  school: School,
  selected = '',
  enabled = true,
  attribute: ActionAttribute = 'data-action',
) {
  return (m1Config.progression?.schools[school.id]?.basicIds ?? [])
    .map((id) => {
      const style = m1Config.progression!.defaultBranches![id]!.style;
      const basic =
        school.id === nguDoc.school ? m1Config.basics[id] : undefined;
      const icon = `<img src="${skillIcon(basic?.id ?? id)}" width="44" height="44" alt=""/>`;
      return `<button type="button" ${attribute}="branch" data-branch="${id}" aria-pressed="${selected === id}" ${enabled ? '' : 'disabled'}${basic ? ` aria-description="Đánh thường · ${escape(basic.nameVi)}"` : ''}>
      ${basic ? `<span class="branch-basic-icon" aria-hidden="true" title="Đánh thường · ${escape(basic.nameVi)}">${icon}</span>` : icon}<span>${style}</span>
    </button>`;
    })
    .join('');
}

/** Common markup; callers keep their existing cancel/focus and local/server choice semantics. */
export function branchDialog(options: {
  school: School;
  titleId: string;
  selected?: string;
  enabled?: boolean;
  attribute?: ActionAttribute;
  actions: readonly UiAction[];
  notice?: string;
  noticeClass?: 'pre-error' | 'pvp-notice';
}): string {
  const {
    school,
    titleId,
    selected = '',
    enabled = true,
    attribute = 'data-action',
    actions,
    notice,
    noticeClass = 'pre-error',
  } = options;
  return `<dialog class="branch-dialog" aria-labelledby="${escape(titleId)}">
    <h2 id="${escape(titleId)}">${escape(school.name)} · Chọn hệ phái</h2><p>${escape(school.style)}</p>
    <div class="branch-list" role="group" aria-label="Hệ phái">${branchCards(school, selected, enabled, attribute)}</div>
    ${actionRow(actions, attribute)}
    ${notice === undefined ? '' : `<p class="${noticeClass}" role="status" aria-live="polite">${escape(notice)}</p>`}
  </dialog>`;
}
