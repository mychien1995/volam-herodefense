import { m1Config, skillIcon, schools } from '@volam/game-data';
import { automaticRanks, duongMon } from '@volam/game-core';
import type {
  Ability,
  BuildChange,
  CharacterStats,
  StatBonuses,
} from '@volam/game-core';
import type { LobbyPlayer } from '@volam/game-protocol';
import './skill-menu.css';
const slots = ['Q', 'W', 'E', 'R'];
const image = (id: string) =>
  id
    ? `<img src="${skillIcon(id)}" alt="" class="skill-art"/>`
    : '<span class="skill-empty">＋</span>';
const seconds = (ticks: number) =>
  (ticks / m1Config.tickRate).toFixed(1).replace(/\.0$/, '');
export function abilitySummary(a: Ability): string {
  if (a.passive && a.reactiveBlock)
    return `Nội tại · ${Math.round(a.reactiveBlock.chance * 100)}% chặn hoàn toàn sát thương một đòn trực tiếp · phản sét ${a.reactiveBlock.damage} · choáng ${seconds(a.reactiveBlock.stunTicks)}s`;
  const e = a.effect;
  let result = '';
  if (e.mode === 'projectile')
    result =
      e.dragonDive && e.dragonDive.forwardTicks === 0
        ? `Rồng cuộn quanh người · ${e.damage} sát thương khi đáp · bán kính ${e.dragonDive.impactRadius}`
        : `${e.count > 1 ? e.count + ' × ' : ''}${e.damage} sát thương · tầm ${e.range}${e.splashRadius ? ` · nổ ${e.splashRadius}, đốt ${e.burnDamage}/s × ${seconds(e.burnTicks)}s` : ''}${e.knockback ? ` · đẩy ${e.knockback}` : ''}`;
  if (e.mode === 'arc')
    result = `${e.damage} sát thương · tầm ${e.range}${e.pull ? ` · kéo ${e.pull}` : ''}${e.armorPenetration ? ' · xuyên thủ ' + Math.round(e.armorPenetration * 100) + '%' : ''}${(e.statuses ?? []).map((s) => ` · ${s.kind === 'slow' ? `chậm ${Math.round(s.magnitude * 100)}%` : s.kind === 'attack_break' ? `giảm công ${Math.round(s.magnitude * 100)}%` : s.kind === 'attack_slow' ? `chậm đánh ${Math.round(s.magnitude * 100)}%` : s.kind === 'defense_break' ? `giảm thủ ${s.magnitude}` : s.kind === 'silence' ? 'câm lặng' : s.kind === 'stun' ? 'choáng' : 'tước vũ khí'} ${seconds(s.durationTicks)}s`).join('')}`;
  if (e.mode === 'mana_shield')
    result = `Hấp thụ ${Math.round(e.absorbFraction * 100)}% · ${e.manaPerDamage.toFixed(2)} nội lực / sát thương hấp thụ · ${e.toggle ? 'bật/tắt' : seconds(e.durationTicks) + 's'}`;
  if (e.mode === 'area')
    result = `${e.damage} sát thương / ${seconds(e.tickInterval)}s · bán kính ${e.radius} · ${seconds(e.durationTicks)}s`;
  if (e.mode === 'counter')
    result = `${e.damage} phản kích một lần · tầm ${e.range} · cửa sổ ${seconds(e.durationTicks)}s`;
  if ((e.mode === 'arc' || e.mode === 'projectile') && e.manaRefund)
    result += ` · hoàn ${e.manaRefund} nội lực khi trúng`;
  if (e.mode === 'arc' && e.projectileProc)
    result += ` · ${e.projectileProc.chance * 100}% kiếm khí`;
  if (e.mode === 'buff')
    result = [
      e.movementSpeed ? `+${Math.round(e.movementSpeed * 100)}% di chuyển` : '',
      e.attackSpeed ? `+${Math.round(e.attackSpeed * 100)}% tốc đánh` : '',
      e.cooldownReduction
        ? `+${Math.round(e.cooldownReduction * 100)}% giảm hồi chiêu (có giới hạn)`
        : '',
      e.critChance ? `+${Math.round(e.critChance * 100)}% bạo kích` : '',
      e.critMultiplier
        ? `+${Math.round(e.critMultiplier * 100)}% sát thương bạo kích`
        : '',
    ]
      .filter(Boolean)
      .join(' · ');
  if (e.mode === 'dash')
    result = `${e.damage} sát thương · lướt ${e.distance}${e.stunTicks ? ' · choáng ' + seconds(e.stunTicks) + 's' : ''}${e.invulnerable ? ' · miễn sát thương trực tiếp khi đang lướt, sát thương theo thời gian vẫn tác dụng' : ''}${e.counter ? ' · phản kích ' + seconds(e.counter.durationTicks) + 's' : ''}`;
  if (e.mode === 'multi_hit')
    result = `${e.hits} × ${e.damage} + ${e.finisherDamage} kết thúc · tầm ${e.range}/${e.finisherRange}`;
  if (e.mode === 'projectile')
    for (const s of e.statuses ?? [])
      result +=
        s.kind === 'stun'
          ? ` · choáng ${seconds(s.durationTicks)}s`
          : ` · ${s.kind === 'attack_slow' ? 'chậm đánh' : s.kind === 'attack_break' ? 'giảm công' : 'chậm di chuyển'} ${Math.round(s.magnitude * 100)}% / ${seconds(s.durationTicks)}s`;
  if (e.mode === 'projectile' && e.boomerang)
    result += ' · trúng một lần mỗi lượt đi/về';
  if (e.mode === 'area' && e.confines) result += ' · giữ địch trong biên trận';
  if (e.mode === 'multi_hit' && e.guard)
    result += ` · giảm ${Math.round(e.guard * 100)}% sát thương khi xoay`;
  if (e.mode === 'multi_hit' && e.projectileBurst)
    result += ` · phóng quạt ${e.projectileBurst.count} hướng`;
  if (e.mode === 'support')
    result = `${e.heal ? 'Hồi ' + e.heal + ' sinh lực' : 'Hào quang phòng thủ +' + (e.statuses?.[0]?.magnitude ?? 0)} · bán kính ${e.radius} · ${seconds(e.durationTicks)}s`;
  if (a.combo)
    result += ` · Phát Động ${a.combo.id === 'phat_dong_a' ? 'A' : 'B'} ${a.combo.step}/3${a.combo.step === 3 ? ' ×' + a.combo.multiplier.toFixed(2) : ''}`;
  for (const s of a.selfStatuses ?? [])
    if (s.kind === 'damage_reduction')
      result += ` · giảm sát thương ${Math.round(s.magnitude * 100)}% / ${seconds(s.durationTicks)}s`;
  if (a.allies)
    result += ` · đồng đội +${a.allies.statuses?.[0]?.magnitude ?? 0} phòng thủ / ${seconds(a.allies.statuses?.[0]?.durationTicks ?? 0)}s`;
  if (a.id === 'cai_bang_bong')
    result +=
      ' · A trúng cùng target tích tối đa 4 charge cho Phá Giáp; đổi target reset';
  if (a.targeting === 'nearestEnemyAtCast')
    result += ' · tự ngắm địch gần nhất, đạn bay thẳng';
  if (e.mode === 'dash' && e.endBlast)
    result += ` · nổ cuối ${e.endBlast.damage} sát thương / bán kính ${e.endBlast.radius}`;
  if (e.mode === 'dash' && e.afterProjectile)
    result += ` · ${e.afterProjectile.count} projectile sau khi lướt`;
  if (e.mode === 'multi_hit' && e.targetArea)
    result = `${e.hits} kiếm rơi × ${e.damage} sát thương · tầm ${e.targetArea.range} · bán kính nổ ${e.targetArea.radius}`;
  return `${result} · ${a.manaCost} nội lực · ${e.mode === 'mana_shield' && e.toggle ? 'bật/tắt không hồi chiêu phụ' : `${Object.hasOwn(m1Config.basics, a.id) ? 'nhịp cơ sở' : 'hồi'} ${seconds(a.cooldownTicks)}s`}`;
}
/** Stable DOM and local draft selections; only the server commits ranks/stats. */
export class SkillMenu {
  private definitions: Array<
    NonNullable<typeof m1Config.progression>['skills'][string]
  >;
  private hero: LobbyPlayer | undefined;
  private revision = -1;
  private renderKey = '';
  private draft = ['', '', '', ''];
  constructor(
    private root: HTMLElement,
    send: (change: BuildChange) => void,
    schoolId = 'cai_bang',
  ) {
    const definitions = (this.definitions = Object.values(
      m1Config.progression!.skills,
    ).filter((d) => d.schoolId === schoolId));
    const school = schools.find((s) => s.id === schoolId)!;
    const styles = [...new Set(definitions.map((d) => d.style))];
    root.innerHTML = `<section id="skill-management"><div class="skill-ledger"><strong>${school.name} <small>${school.element} · ${styles.join(' / ')}</small></strong><span id="skill-points-ledger" role="status"></span></div>
    <div class="skill-mode-controls"><label>Chế độ <select id="skill-mode" aria-label="Chế độ Võ Học"><option value="default">Mặc định</option><option value="custom">Tùy chỉnh</option></select></label><label id="skill-branch-label">Nhánh võ học <select id="skill-branch" aria-label="Nhánh võ học">${m1Config.progression!.schools[schoolId]!.basicIds.map((id) => `<option value="${id}">${m1Config.basics[id]!.nameVi}</option>`).join('')}</select></label><p id="skill-mode-help"></p></div>
    <p id="skill-readonly" role="status" hidden></p>
    <div class="skill-loadout">${slots.map((s, i) => `<label class="skill-equipped"><span>${s}</span><div id="equipped-art-${i}" class="skill-equipped-art"></div><select id="loadout-${s.toLowerCase()}" aria-label="Kỹ năng ${s}" data-loadout="${i}"><option value="">Chưa trang bị</option>${definitions.map((d) => `<option value="${d.id}">${d.ranks[0]!.nameVi}${d.ultimate ? ' ★' : ''}</option>`).join('')}</select></label>`).join('')}<div class="skill-basic"><label for="basic-style">A · Đánh thường</label><select id="basic-style" aria-label="Đánh thường · A">${m1Config.progression!.schools[schoolId]!.basicIds.map((id) => `<option value="${id}">${m1Config.basics[id]!.nameVi}</option>`).join('')}</select><small>Độc lập với Q/W/E/R</small></div></div>
    <div class="skill-build-actions"><button id="apply-loadout" class="accent">Áp dụng bộ kỹ năng</button><span id="loadout-hint"></span><button id="reset-skills">Hoàn điểm miễn phí</button></div>
    <div class="skill-workbench"><div class="skill-catalogue">${styles
      .map(
        (style) =>
          `<section class="skill-style" data-style="${style}"><h3>${style} <small>${definitions.filter((d) => d.style === style).length} kỹ năng</small></h3>${definitions
            .filter((d) => d.style === style)
            .map(
              (d) =>
                `<article class="skill-card" data-skill-card="${d.id}"><header>${image(d.id)}<div><h4>${d.ranks[0]!.nameVi} ${d.ultimate ? '<span class="ultimate-mark">★ Tuyệt kỹ</span>' : ''}</h4><span data-rank="${d.id}"></span></div></header><p>${d.descriptionVi.replace(/\bDOT\b/g, 'sát thương theo thời gian').replace(/các tick đang lướt/g, 'lúc đang lướt')}</p><p class="skill-current" data-current="${d.id}"></p><details><summary>Bậc tiếp theo</summary><p data-next="${d.id}"></p></details><footer><button data-pick="${d.id}" aria-label="Chọn ${d.ranks[0]!.nameVi}">Chọn vào ô</button><button data-upgrade="${d.id}" aria-label="Nâng ${d.ranks[0]!.nameVi}">Học · 1 điểm</button></footer></article>`,
            )
            .join('')}</section>`,
      )
      .join('')}</div>
    <aside class="skill-character"><label for="skill-target-slot">Ô nhận kỹ năng</label><select id="skill-target-slot">${slots.map((s) => `<option>${s}</option>`).join('')}</select><h3>Chỉ số nhân vật</h3><dl id="character-stat-list"></dl><section class="skill-passive"><h4>${schoolId === 'thieu_lam' ? image('dich_can_kinh') : schoolId === 'vo_dang' ? image('thai_cuc_tam_phap') : schoolId === 'thien_son' ? image('bac_minh_than_cong') : schoolId === duongMon.school ? image(duongMon.passive) : ''}${school.passive}</h4><p id="innate-summary"></p></section><section class="skill-surplus"><h4>Điểm dư tự động</h4><p id="surplus-summary"></p></section><details><summary>Nguồn chỉ số</summary><div id="stat-sources"></div></details></aside></div><p class="skill-policy">Chọn ô → chọn kỹ năng → Áp dụng → Học hoặc tăng bậc. Bỏ kỹ năng hoàn điểm; hồi chiêu vẫn được giữ.</p></section>`;
    root
      .querySelector<HTMLSelectElement>('#skill-mode')!
      .addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value;
        if (value === 'default' || value === 'custom')
          send({ action: 'mode', mode: value });
        if (this.hero)
          (e.target as HTMLSelectElement).value = this.hero.build.mode;
      });
    root
      .querySelector<HTMLSelectElement>('#skill-branch')!
      .addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        send({ action: 'branch', basicId: select.value });
        if (this.hero) select.value = this.hero.build.branchId;
      });
    root.querySelectorAll<HTMLSelectElement>('[data-loadout]').forEach((s) =>
      s.addEventListener('change', () => {
        this.draft[Number(s.dataset['loadout'])] = s.value;
        this.updateDraft();
      }),
    );
    root.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((b) =>
      b.addEventListener('click', () => {
        const slot = slots.indexOf(
          root.querySelector<HTMLSelectElement>('#skill-target-slot')!.value,
        );
        this.draft[slot] = b.dataset['pick']!;
        root.querySelector<HTMLSelectElement>(
          `#loadout-${slots[slot]!.toLowerCase()}`,
        )!.value = this.draft[slot]!;
        this.updateDraft();
      }),
    );
    root
      .querySelectorAll<HTMLButtonElement>('[data-upgrade]')
      .forEach((b) =>
        b.addEventListener('click', () =>
          send({ action: 'upgrade', skillId: b.dataset['upgrade']! }),
        ),
      );
    root
      .querySelector('#apply-loadout')!
      .addEventListener('click', () =>
        send({ action: 'loadout', ids: [...this.draft] }),
      );
    root
      .querySelector('#reset-skills')!
      .addEventListener('click', () => send({ action: 'reset' }));
    root
      .querySelector<HTMLSelectElement>('#basic-style')!
      .addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        send({ action: 'basic', basicId: select.value });
        if (this.hero) select.value = this.hero.basicId;
      });
  }
  private locked(): boolean {
    return !this.hero || this.hero.zoneId !== 'arena' || this.hero.hp <= 0;
  }
  private updateDraft() {
    const h = this.hero;
    if (!h) return;
    const automatic = h.build.mode === 'default';
    const actual = automatic
      ? [...h.build.slotSkills]
      : [h.qSkill, h.wSkill, h.eSkill, h.rSkill];
    const branch = m1Config.progression!.defaultBranches?.[h.build.branchId];
    const invalidBranch =
      automatic &&
      this.draft.some(
        (id) =>
          !id || m1Config.progression!.skills[id]?.style !== branch?.style,
      );
    const repeated =
      new Set(this.draft.filter(Boolean)).size !==
      this.draft.filter(Boolean).length;
    const ultimates = this.draft.filter(
      (id) => m1Config.progression!.skills[id]?.ultimate,
    ).length;
    this.root.querySelector<HTMLButtonElement>('#apply-loadout')!.disabled =
      this.locked() ||
      repeated ||
      invalidBranch ||
      ultimates > 1 ||
      this.draft.every((id, i) => id === actual[i]);
    this.root.querySelector('#loadout-hint')!.textContent = repeated
      ? 'Mỗi kỹ năng chỉ được dùng một ô.'
      : invalidBranch
        ? 'Chọn đủ bốn kỹ năng cùng nhánh.'
        : ultimates > 1
          ? 'Chỉ một tuyệt kỹ trong bộ kỹ năng.'
          : this.draft.some((id, i) => id !== actual[i])
            ? 'Chưa áp dụng'
            : 'Đã đồng bộ';
    const draftRanks = automatic
      ? automaticRanks(this.draft, h.level, m1Config)
      : Object.fromEntries(h.build.ranks);
    this.draft.forEach((id, i) => {
      this.root.querySelector(`#equipped-art-${i}`)!.innerHTML =
        image(id) + `<b>${id ? 'Bậc ' + (draftRanks[id] ?? 0) : 'Trống'}</b>`;
    });
  }
  update(h: LobbyPlayer): void {
    this.hero = h;
    const key = JSON.stringify([
      h.build.revision,
      h.level,
      h.zoneId,
      h.hp > 0,
      h.basicId,
      h.build.stats,
      h.build.sources,
    ]);
    if (key === this.renderKey) return;
    this.renderKey = key;
    if (this.revision !== h.build.revision) {
      this.revision = h.build.revision;
      this.draft =
        h.build.mode === 'default'
          ? [...h.build.slotSkills]
          : [h.qSkill, h.wSkill, h.eSkill, h.rSkill];
      slots.forEach((s, i) => {
        this.root.querySelector<HTMLSelectElement>(
          `#loadout-${s.toLowerCase()}`,
        )!.value = this.draft[i]!;
      });
    }
    const locked = this.locked();
    const automatic = h.build.mode === 'default';
    const branch = m1Config.progression!.defaultBranches?.[h.build.branchId];
    const modeSelect =
      this.root.querySelector<HTMLSelectElement>('#skill-mode')!;
    modeSelect.value = h.build.mode;
    modeSelect.disabled = locked;
    const branchSelect =
      this.root.querySelector<HTMLSelectElement>('#skill-branch')!;
    branchSelect.value = h.build.branchId;
    branchSelect.disabled = locked;
    this.root
      .querySelectorAll<HTMLElement>('[data-style]')
      .forEach((section) => {
        section.hidden =
          automatic && section.dataset['style'] !== branch?.style;
      });
    this.root.querySelector<HTMLElement>('#skill-branch-label')!.hidden =
      !automatic;
    this.root.querySelector<HTMLElement>('.skill-basic')!.hidden = automatic;
    this.root.querySelector<HTMLElement>('#skill-mode-help')!.textContent =
      automatic
        ? `Tự học và trang bị theo Q → W → E → R. Điểm thuộc về ô; chỉ đổi chiêu cùng nhánh. Giữ trần bậc và điều kiện cấp.${h.build.available > 0 ? ' Điểm chờ: ' + h.build.available + '.' : ''}`
        : 'Tự chọn kỹ năng, phối nhánh và phân điểm. Đòn A độc lập với Q/W/E/R.';
    this.root.querySelector<HTMLElement>('.skill-policy')!.textContent =
      automatic
        ? 'Chọn ô → chọn chiêu cùng nhánh → Áp dụng. Cấp chiêu theo điểm của ô, trong giới hạn hợp lệ. Chỉ sửa tại đấu trường.'
        : 'Chọn ô → chọn kỹ năng → Áp dụng → Học hoặc tăng bậc. Bỏ kỹ năng hoàn điểm; hồi chiêu vẫn được giữ.';
    const note = this.root.querySelector<HTMLElement>('#skill-readonly')!;
    note.hidden = !locked;
    note.textContent =
      h.hp <= 0
        ? 'Cần hồi sinh để thay đổi võ học.'
        : 'Chỉ xem trong phó bản hoặc PvP. Trở về đấu trường để thay đổi võ học.';
    const p = h.build;
    this.root.querySelector('#skill-points-ledger')!.textContent =
      `Cấp ${h.level} · Nhận ${p.earned} · Đã dùng ${p.allocated} · Còn ${p.available} · Dư ${p.surplus}`;
    this.root
      .querySelectorAll<HTMLSelectElement>(
        '[data-loadout],#basic-style,#skill-target-slot',
      )
      .forEach((s) => {
        s.disabled = locked;
      });
    this.root
      .querySelectorAll<HTMLOptionElement>('[data-loadout] option')
      .forEach((o) => {
        const d = m1Config.progression!.skills[o.value];
        if (d) {
          o.hidden = automatic && d.style !== branch?.style;
          o.disabled = h.level < d.levelGates[0]! || o.hidden;
        } else o.hidden = automatic;
      });
    const basic = this.root.querySelector<HTMLSelectElement>('#basic-style')!;
    if (document.activeElement !== basic) basic.value = h.basicId;
    this.root.querySelector<HTMLButtonElement>('#reset-skills')!.disabled =
      locked || p.allocated === 0 || automatic;
    this.root.querySelector<HTMLElement>('#reset-skills')!.hidden = automatic;
    for (const d of this.definitions) {
      const rank = p.ranks.get(d.id) ?? 0,
        equipped = [h.qSkill, h.wSkill, h.eSkill, h.rSkill].includes(d.id),
        next = d.ranks[rank],
        gate = d.levelGates[rank];
      const card = this.root.querySelector<HTMLElement>(
        `[data-skill-card="${d.id}"]`,
      )!;
      card.hidden = automatic && d.style !== branch?.style;
      card.classList.toggle('equipped', equipped);
      card.classList.toggle('locked', h.level < d.levelGates[0]!);
      card.querySelector('[data-rank]')!.textContent =
        `Bậc ${rank}/${d.ranks.length}${equipped ? ' · Đang trang bị' : ''}`;
      card.querySelector('[data-current]')!.textContent =
        rank > 0
          ? abilitySummary(d.ranks[rank - 1]!)
          : `Chưa học · Mở cấp ${d.levelGates[0]}`;
      card.querySelector('[data-next]')!.textContent = next
        ? `Bậc ${rank + 1} · Cấp ${gate} · 1 điểm: ${abilitySummary(next)}`
        : 'Đã đạt bậc tối đa.';
      const upgrade = card.querySelector<HTMLButtonElement>('[data-upgrade]')!;
      upgrade.hidden = automatic;
      upgrade.disabled =
        automatic ||
        locked ||
        !equipped ||
        !next ||
        h.level < (gate ?? 31) ||
        p.available < 1;
      upgrade.textContent = !next
        ? 'Tối đa'
        : h.level < (gate ?? 31)
          ? `Cần cấp ${gate}`
          : !equipped
            ? 'Trang bị trước'
            : p.available < 1
              ? 'Hết điểm'
              : rank === 0
                ? 'Học · 1 điểm'
                : `Bậc ${rank + 1} · 1 điểm`;
      card.querySelector<HTMLButtonElement>('[data-pick]')!.disabled =
        locked || h.level < d.levelGates[0]!;
    }
    const s = p.stats;
    const entries: Array<[string, number, string?]> = [
      ['Sinh lực', s.maxHp],
      ['Nội lực', s.maxMana],
      ['Tấn công', s.attackPower],
      ['Phòng thủ', s.defense],
      ['Tốc độ đánh', s.attackSpeed, '×'],
      ['Di chuyển', s.movementSpeed],
      ['Bạo kích', s.critChance * 100, '%'],
      ['Sát thương BK', s.critMultiplier * 100, '%'],
      ['Hồi nội lực', s.manaRegen, '/s'],
      ['Hồi sinh lực', s.hpRegen, '/s'],
      ['Giảm hồi chiêu', s.cooldownReduction * 100, '%'],
    ];
    this.root.querySelector('#character-stat-list')!.innerHTML = entries
      .map(
        ([k, v, u]) =>
          `<div><dt>${k}</dt><dd>${Number(v.toFixed(2))}${u ?? ''}</dd></div>`,
      )
      .join('');
    const sources = JSON.parse(p.sources) as Record<string, CharacterStats>;
    const i = sources['innate'],
      surplus = sources['surplus'];
    const statLabels: Array<[keyof CharacterStats, string, number?]> = [
      ['maxHp', 'Sinh lực'],
      ['maxMana', 'Nội lực'],
      ['attackPower', 'công'],
      ['defense', 'phòng thủ'],
      ['attackSpeed', 'tốc đánh'],
      ['movementSpeed', 'di chuyển'],
      ['critChance', '% bạo kích', 100],
      ['critMultiplier', '% sát thương BK', 100],
      ['manaRegen', 'nội lực/giây'],
      ['cooldownReduction', '% giảm hồi chiêu', 100],
      ['hpRegen', 'sinh lực/giây'],
    ];
    const line = (v: StatBonuses | undefined) =>
      statLabels
        .filter(([key]) => (v?.[key] ?? 0) !== 0)
        .map(([key, label, multiplier]) => {
          const value = Number(
            ((v?.[key] ?? 0) * (multiplier ?? 1)).toFixed(3),
          );
          return `${value > 0 ? '+' : ''}${value}${label.startsWith('%') ? '' : ' '}${label}`;
        })
        .join(' · ') || 'Không có điều chỉnh.';
    const innate = m1Config.progression?.schools[h.schoolId]?.innate;
    this.root.querySelector('#innate-summary')!.textContent =
      `Tự tăng theo cấp, không tốn điểm. Hiện tại: ${line(i)} Mỗi cấp sau cấp 1: ${line(innate)}`;
    this.root.querySelector('#surplus-summary')!.textContent =
      p.surplus > 0
        ? `${p.surplus} điểm dư: ${line(surplus)}`
        : 'Chỉ kích hoạt khi cả bốn kỹ năng đã đạt bậc tối đa.';
    this.root.querySelector('#stat-sources')!.innerHTML = [
      ['base', 'Cơ bản'],
      ['growth', 'Tăng theo cấp'],
      ['innate', 'Nội tại'],
      ['surplus', 'Điểm dư'],
      ['equipment', 'Trang bị'],
      ['temporary', 'Tạm thời'],
    ]
      .map(([key, label]) => `<p>${label}: ${line(sources[key!])}</p>`)
      .join('');
    this.updateDraft();
  }
}
