import { m1Config, schools } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import type { Command } from '@volam/game-core';
import './skill-preview.css';
/** An optional UI for real server commands, never a second/client combat simulation. */
export class SkillPreview {
  private panel = document.createElement('aside');
  private state: LobbyState | undefined;
  private session = '';
  private school = '';
  private requested =
    new URLSearchParams(location.search).get('skillPreview') === '1';
  constructor(
    viewport: HTMLElement,
    onLoadout: (ids: string[]) => void,
    onCast: () => void,
    onCommand: (command: Command) => void,
    onFixture: (action: 'targets' | 'attacker' | 'clear') => void,
  ) {
    this.panel.id = 'skill-preview';
    this.panel.className = 'framed';
    this.panel.hidden = true;
    this.panel.innerHTML = `<strong>Skill VFX Preview</strong><select id="preview-school" aria-label="Preview school">${schools
      .filter((s) =>
        ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'].includes(s.id),
      )
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join(
        '',
      )}</select><select id="preview-skill" aria-label="Preview skill">${Object.values(
      m1Config.skillCatalogue ?? {},
    )
      .map((a) => `<option value="${a.id}">${a.nameVi}</option>`)
      .join(
        '',
      )}</select><div><button id="preview-equip">Equip Q</button><button id="preview-cast">Cast Q</button></div><select id="preview-basic" aria-label="Preview basic attack"></select><button id="preview-attack">Attack A</button><small id="preview-status"></small><div><button data-fixture="targets">Target line</button><button data-fixture="attacker">Attacking dummy</button><button data-fixture="clear">Clear dummies</button></div><small>Live server · mana/cooldowns apply · arrow keys set direction · use multiple arena practice enemies. Choose school before the match.</small>`;
    viewport.append(this.panel);
    this.panel
      .querySelectorAll<HTMLButtonElement>('[data-fixture]')
      .forEach((b) =>
        b.addEventListener('click', () =>
          onFixture(b.dataset['fixture'] as 'targets' | 'attacker' | 'clear'),
        ),
      );
    this.panel
      .querySelector('#preview-equip')!
      .addEventListener('click', () => {
        const h = this.state?.players.get(this.session),
          id =
            this.panel.querySelector<HTMLSelectElement>(
              '#preview-skill',
            )!.value;
        if (!h) return;
        onLoadout([
          id,
          ...[h.wSkill, h.eSkill, h.rSkill].map((s) => (s === id ? '' : s)),
        ]);
      });
    this.panel
      .querySelector('#preview-cast')!
      .addEventListener('click', onCast);
    this.panel
      .querySelector('#preview-attack')!
      .addEventListener('click', () => onCommand({ kind: 'basic' }));
    this.panel
      .querySelector<HTMLSelectElement>('#preview-basic')!
      .addEventListener('change', (e) =>
        onCommand({
          kind: 'select-basic',
          id: (e.target as HTMLSelectElement).value,
        }),
      );
  }
  update(state: LobbyState, session: string) {
    this.state = state;
    this.session = session;
    const h = state.players.get(session);
    this.panel.hidden =
      !this.requested ||
      !state.devSkillLoadout ||
      state.phase !== 'IN_GAME' ||
      !h?.confirmed ||
      !['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'].includes(h.schoolId);
    if (!h || this.panel.hidden) return;
    if (this.school !== h.schoolId) {
      this.school = h.schoolId;
      this.panel.querySelector<HTMLSelectElement>('#preview-skill')!.innerHTML =
        Object.values(m1Config.progression!.skills)
          .filter((d) => d.schoolId === h.schoolId)
          .map((d) => `<option value="${d.id}">${d.ranks[0]!.nameVi}</option>`)
          .join('');
      const school =
        this.panel.querySelector<HTMLSelectElement>('#preview-school')!;
      school.value = h.schoolId;
      for (const o of school.options) o.disabled = o.value !== h.schoolId;
      this.panel.querySelector<HTMLSelectElement>('#preview-basic')!.innerHTML =
        m1Config
          .progression!.schools[h.schoolId]!.basicIds.map(
            (id) =>
              `<option value="${id}">${m1Config.basics[id]!.nameVi}</option>`,
          )
          .join('');
      school.title =
        'Select the school during pre-match selection. This live preview uses your authoritative character.';
    }
    this.panel.querySelector<HTMLSelectElement>('#preview-basic')!.value =
      h.basicId;
    this.panel.querySelector<HTMLButtonElement>('#preview-equip')!.disabled =
      h.zoneId !== 'arena' || h.hp <= 0;
    this.panel.querySelector<HTMLButtonElement>('#preview-cast')!.disabled =
      h.hp <= 0 || !h.qSkill;
    this.panel.querySelector('#preview-status')!.textContent =
      `Q: ${m1Config.skillCatalogue?.[h.qSkill]?.nameVi ?? 'Empty'} · ${Math.floor(h.mana)} MP · ${(h.qCooldown / m1Config.tickRate).toFixed(1)}s`;
  }
  hide() {
    this.panel.hidden = true;
    this.state = undefined;
    this.session = '';
  }
  destroy() {
    this.panel.remove();
  }
}
