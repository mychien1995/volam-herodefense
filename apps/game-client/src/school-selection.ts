import { m1Config, schools, skillIcon } from '@volam/game-data';
import { nguDoc } from '@volam/game-core';

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
type School = (typeof schools)[number];

/** Identical school portraits/layout for Defense and Lôi Đài. */
export function schoolCards(
  selected = '',
  disabled = false,
  requiresBranch = true,
  attribute = 'data-action',
) {
  return schools
    .map(
      (s) =>
        `<button type="button" class="school-card ${selected === s.id ? 'selected' : ''}" ${attribute}="school" data-school="${s.id}" aria-pressed="${selected === s.id}" ${requiresBranch ? 'aria-haspopup="dialog"' : ''} ${disabled ? 'disabled' : ''}><span class="school-portrait ${s.portrait}" aria-hidden="true"></span><h3>${s.name}</h3><span class="school-element">${s.element}</span></button>`,
    )
    .join('');
}

export function branchCards(
  school: School,
  selected = '',
  enabled = true,
  attribute = 'data-action',
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
