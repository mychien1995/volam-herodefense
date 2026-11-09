import type { Hero, SimulationConfig, World, Ability } from './types.js';
import type {
  BuildChange,
  CharacterStats,
  PointAccounting,
  StatBonuses,
  StatCalculation,
  SkillMode,
  RankedSkill,
} from './progression-types.js';
import { cancelOwnedEffects, statusValue } from './status.js';

export const statKeys: Array<keyof CharacterStats> = [
  'maxHp',
  'maxMana',
  'attackPower',
  'defense',
  'attackSpeed',
  'movementSpeed',
  'critChance',
  'critMultiplier',
  'manaRegen',
  'cooldownReduction',
  'hpRegen',
];
const zero = (): CharacterStats =>
  Object.fromEntries(statKeys.map((k) => [k, 0])) as unknown as CharacterStats;
const scale = (values: StatBonuses, n: number): CharacterStats =>
  Object.fromEntries(
    statKeys.map((k) => [k, (values[k] ?? 0) * n]),
  ) as unknown as CharacterStats;
const SKILL_POINT_CAP = 20;

function legacyLevelGates(skill: RankedSkill): number[] {
  return skill.ultimate ? [6, 10, 14] : skill.levelGates;
}
export function pointAccounting(
  hero: Hero,
  config: SimulationConfig,
): PointAccounting {
  const earned = Math.min(config.maxLevel, Math.max(1, hero.level));
  const ids = hero.skillIds ?? [];
  const allocated = hero.progression
    ? Object.values(hero.progression.ranks).reduce((a, b) => a + b, 0)
    : 0;
  if (hero.progression?.mode === 'fixed')
    return {
      earned,
      allocated,
      available: Math.max(0, Math.min(SKILL_POINT_CAP, earned) - allocated),
      surplus: Math.max(0, earned - SKILL_POINT_CAP),
    };
  const remaining = Math.max(0, earned - allocated);
  const maxed =
    ids.length === 4 &&
    ids.every((id) => {
      const d = config.progression?.skills[id];
      return (
        !!id &&
        !!d &&
        hero.progression?.ranks[id] === legacyLevelGates(d).length
      );
    });
  return {
    earned,
    allocated,
    available: maxed ? 0 : remaining,
    surplus: maxed ? remaining : 0,
  };
}
/** Pure derived layers; never accumulate previous totals into a new build. */
export function characterStats(
  hero: Hero,
  config: SimulationConfig,
  tick = 0,
): StatCalculation {
  const profile =
    hero.progression && config.progression?.schools[hero.schoolId];
  const levels = Math.max(0, Math.min(config.maxLevel, hero.level) - 1);
  const base: CharacterStats = profile?.base ?? {
    maxHp: config.maxHp,
    maxMana: config.maxMana,
    attackPower: 28,
    defense: 0,
    attackSpeed: 1,
    movementSpeed: config.speed,
    critChance: config.critChance,
    critMultiplier: config.critMultiplier,
    manaRegen: config.manaRegen,
    cooldownReduction: 0,
    hpRegen: 0,
  };
  const legacyInnate =
    hero.schoolId === 'cai_bang' ? config.caiBangPassive : undefined;
  const sources: StatCalculation['sources'] = {
    base: { ...base },
    growth: scale(
      profile?.growth ?? {
        maxHp: config.hpPerLevel,
        attackPower: config.attackPerLevel,
      },
      levels,
    ),
    innate: scale(
      profile?.innate ?? {
        attackPower: legacyInnate?.damagePerLevel ?? 0,
        critChance: legacyInnate?.critChancePerLevel ?? 0,
        critMultiplier: legacyInnate?.critMultiplierPerLevel ?? 0,
      },
      levels,
    ),
    surplus: scale(
      profile?.surplus ?? {},
      profile && hero.progression?.mode !== 'fixed'
        ? pointAccounting(hero, config).surplus
        : 0,
    ),
    equipment: zero(),
    temporary: zero(),
  };
  sources.temporary.critChance = statusValue(hero, 'crit_buff', tick);
  for (const key of ['maxHp', 'maxMana', 'attackPower', 'defense'] as const)
    sources.innate[key] +=
      (sources.base[key] + sources.growth[key] + sources.innate[key]) *
      (hero.dragonBonus ?? 0);
  if (hero.inventory && config.economy)
    for (const [slot, item] of Object.entries(config.economy.basics)) {
      const level =
        hero.inventory.levels[slot as keyof typeof hero.inventory.levels];
      const branchId =
        hero.inventory.crafted?.[slot as keyof typeof hero.inventory.levels];
      const branch = config.economy.recipes[
        slot as keyof typeof hero.inventory.levels
      ].branches.find((candidate) => candidate.id === branchId);
      for (const key of statKeys)
        sources.equipment[key] +=
          (item.perLevel[key] ?? 0) * level + (branch?.stats[key] ?? 0);
    }
  sources.temporary.critMultiplier = Math.max(
    0,
    ...(hero.statuses ?? [])
      .filter((s) => s.kind === 'crit_buff' && s.until > tick)
      .map((s) => s.secondary ?? 0),
  );
  sources.temporary.defense =
    statusValue(hero, 'defense_buff', tick) -
    statusValue(hero, 'defense_break', tick);
  sources.temporary.cooldownReduction = statusValue(
    hero,
    'cooldown_buff',
    tick,
  );
  const speed = statusValue(hero, 'speed_buff', tick);
  const attackSpeed = Math.max(
    0,
    ...(hero.statuses ?? [])
      .filter((s) => s.kind === 'speed_buff' && s.until > tick)
      .map((s) => s.secondary ?? 0),
  );
  sources.temporary.movementSpeed =
    Object.values(sources).reduce((sum, s) => sum + s.movementSpeed, 0) * speed;
  sources.temporary.attackSpeed =
    Object.values(sources).reduce((sum, s) => sum + s.attackSpeed, 0) *
    attackSpeed;
  const total = zero();
  for (const key of statKeys)
    total[key] = Object.values(sources).reduce((sum, s) => sum + s[key], 0);
  const slow =
    -total.movementSpeed * Math.min(0.85, statusValue(hero, 'slow', tick));
  sources.temporary.movementSpeed += slow;
  total.movementSpeed += slow;
  const attackSlow =
    -total.attackSpeed * Math.min(0.85, statusValue(hero, 'attack_slow', tick));
  sources.temporary.attackSpeed += attackSlow;
  total.attackSpeed += attackSlow;
  const attackBreak =
    -total.attackPower *
    Math.min(0.85, statusValue(hero, 'attack_break', tick));
  sources.temporary.attackPower += attackBreak;
  total.attackPower += attackBreak;
  total.maxHp = Math.max(1, total.maxHp);
  total.maxMana = Math.max(1, total.maxMana);
  total.defense = Math.max(0, total.defense);
  total.attackSpeed = Math.max(0.25, Math.min(3, total.attackSpeed));
  total.critChance = Math.max(
    0,
    Math.min(profile ? config.progression!.maxCritChance : 1, total.critChance),
  );
  total.cooldownReduction = Math.max(
    0,
    Math.min(
      config.progression?.maxCooldownReduction ?? 0.4,
      total.cooldownReduction,
    ),
  );
  return { sources, total };
}
export function refreshCharacter(hero: Hero, config: SimulationConfig): void {
  if (!hero.progression) return;
  const s = characterStats(hero, config).total;
  hero.maxHp = s.maxHp;
  hero.maxMana = s.maxMana;
  hero.hp = Math.min(hero.hp, s.maxHp);
  hero.mana = Math.min(hero.mana, s.maxMana);
  hero.skillPoints = pointAccounting(hero, config).available;
}
/** Points belong to Q/W/E/R, bounded by the existing rank caps and level gates. */
export function automaticRanks(
  ids: string[],
  level: number,
  config: SimulationConfig,
): Record<string, number> {
  const ranks: Record<string, number> = {};
  ids.forEach((id, slot) => {
    const skill = config.progression?.skills[id];
    if (!skill) return;
    const quota = Math.max(
      0,
      Math.floor((Math.min(config.maxLevel, level) + 3 - slot) / 4),
    );
    const unlocked = legacyLevelGates(skill).filter(
      (gate) => level >= gate,
    ).length;
    const rank = Math.min(quota, unlocked, skill.ranks.length);
    if (rank > 0) ranks[id] = rank;
  });
  return ranks;
}
function applyAutomaticProgression(hero: Hero, config: SimulationConfig): void {
  const p = hero.progression!;
  p.ranks = automaticRanks(p.defaultSkills, hero.level, config);
  const previousIds = hero.skillIds ?? [];
  const previousCooldowns = hero.skillCooldowns;
  hero.skillIds = p.defaultSkills.map((id) => (p.ranks[id] ? id : ''));
  hero.skillCooldowns = hero.skillIds.map((id, slot) =>
    Math.max(
      id && id === previousIds[slot] ? (previousCooldowns[slot] ?? 0) : 0,
      id ? (hero.abilityCooldowns?.[id] ?? 0) : 0,
    ),
  );
}
/** Explicit activation lets old isolated combat fixtures retain their historical M1/M3A contracts. */
export function initializeProgression(
  hero: Hero,
  config: SimulationConfig,
  mode: SkillMode = 'custom',
  selectedBranchId?: string,
): boolean {
  if (!config.progression?.schools[hero.schoolId]) return false;
  const profile = config.progression.schools[hero.schoolId]!;
  const branchId = selectedBranchId ?? profile.basicIds[0]!;
  const branch = config.progression.defaultBranches?.[branchId];
  const fixed =
    mode === 'fixed' ? config.progression.fixedBranches?.[branchId] : undefined;
  if (
    !profile.basicIds.includes(branchId) ||
    (mode === 'default' && !branch) ||
    (mode === 'fixed' && !fixed)
  )
    return false;
  hero.progression = {
    revision: 0,
    ranks: {},
    mode,
    branchId,
    defaultSkills: [...(fixed?.skillIds ?? branch?.skillIds ?? [])],
  };
  hero.skillIds = Array<string>(fixed ? 5 : 4).fill('');
  hero.skillCooldowns = hero.skillIds.map(() => 0);
  hero.basicId = branchId;
  if (mode === 'default') applyAutomaticProgression(hero, config);
  refreshCharacter(hero, config);
  hero.hp = hero.maxHp;
  hero.mana = hero.maxMana;
  return true;
}
export function gainExperience(
  hero: Hero,
  amount: number,
  config: SimulationConfig,
): void {
  if (!Number.isSafeInteger(amount) || amount < 0) return;
  const oldLevel = hero.level,
    oldHp = hero.maxHp,
    oldMana = hero.maxMana;
  hero.xp = Math.min(
    experienceAtLevel(config.maxLevel, config),
    hero.xp + amount,
  );
  hero.level = 1;
  while (
    hero.level < config.maxLevel &&
    hero.xp >= experienceAtLevel(hero.level + 1, config)
  )
    hero.level++;
  if (hero.progression) {
    if (hero.level !== oldLevel) {
      hero.progression.revision++;
      if (hero.progression.mode === 'default')
        applyAutomaticProgression(hero, config);
    }
    refreshCharacter(hero, config);
  } else {
    hero.skillPoints = hero.level;
    hero.maxHp = config.maxHp + (hero.level - 1) * config.hpPerLevel;
  }
  if (hero.hp > 0) {
    hero.hp = Math.min(hero.maxHp, hero.hp + Math.max(0, hero.maxHp - oldHp));
    hero.mana = Math.min(
      hero.maxMana,
      hero.mana + Math.max(0, hero.maxMana - oldMana),
    );
  }
}
/** Fixed branches account for each slot once, even when two moves share its rank. */
export function skillRank(
  hero: Hero,
  id: string,
  config: SimulationConfig,
): number {
  const p = hero.progression;
  if (!p) return 0;
  if (p.mode !== 'fixed') return p.ranks[id] ?? 0;
  const slot = p.defaultSkills.indexOf(id);
  const key = config.progression?.fixedBranches?.[p.branchId]?.skillIds[slot];
  return key ? (p.ranks[key] ?? 0) : 0;
}
function updateFixedSlots(hero: Hero, config: SimulationConfig): void {
  hero.skillIds = hero.progression!.defaultSkills.map((id) =>
    skillRank(hero, id, config) ? id : '',
  );
  hero.skillCooldowns = hero.skillIds.map(
    (id) => hero.abilityCooldowns?.[id] ?? 0,
  );
}
function changeFixedBuild(
  world: World,
  hero: Hero,
  config: SimulationConfig,
  change: BuildChange,
): string | undefined {
  const p = hero.progression!;
  const branch = config.progression?.fixedBranches?.[p.branchId];
  if (!branch) return 'Nhánh võ học chưa mở.';
  if (change.action === 'upgrade-slot') {
    const id = branch.skillIds[change.slot];
    const skill = id ? config.progression?.skills[id] : undefined;
    if (!id || !skill) return 'Ô kỹ năng không hợp lệ.';
    const next = (p.ranks[id] ?? 0) + 1;
    if (next > skill.ranks.length) return 'Kỹ năng đã đạt bậc tối đa.';
    const level = skill.levelGates[next - 1]!;
    if (hero.level < level) return 'Bậc tiếp theo cần cấp ' + level + '.';
    if (pointAccounting(hero, config).available < 1)
      return 'Không đủ điểm kỹ năng.';
    p.ranks[id] = next;
  } else if (change.action === 'stance' && branch.alternateSkillIds) {
    if (
      hero.namDeLocked ||
      hero.comboFinisher ||
      hero.actionUntil > world.tick ||
      world.actions?.some((action) => action.ownerId === hero.id) ||
      world.pending.some(
        (input) => input.heroId === hero.id && input.command.kind === 'cast',
      )
    )
      return 'Chờ thi triển xong để đổi thế.';
    p.defaultSkills = [
      ...(p.defaultSkills[0] === branch.skillIds[0]
        ? branch.alternateSkillIds
        : branch.skillIds),
    ];
  } else return 'Nhánh võ học đã được khóa khi vào trận.';
  updateFixedSlots(hero, config);
  p.revision++;
  refreshCharacter(hero, config);
  return undefined;
}
export function rankedAbility(
  hero: Hero,
  id: string,
  config: SimulationConfig,
): Ability | undefined {
  if (!hero.progression)
    return Object.hasOwn(config.skillCatalogue ?? {}, id)
      ? config.skillCatalogue?.[id]
      : undefined;
  const skill = config.progression?.skills[id],
    rank = skillRank(hero, id, config);
  return skill?.schoolId === hero.schoolId && rank > 0
    ? skill.ranks[rank - 1]
    : undefined;
}
export function abilityCooldown(
  hero: Hero,
  ability: Ability,
  config: SimulationConfig,
  tick: number,
  basic = false,
): number {
  if (basic && ability.cooldownTicks === 0)
    return ability.minIntervalTicks ?? 0;
  if (!hero.progression)
    return Math.max(ability.minIntervalTicks ?? 1, ability.cooldownTicks);
  const stats = characterStats(hero, config, tick).total;
  return Math.max(
    ability.minIntervalTicks ?? 1,
    Math.ceil(
      ability.cooldownTicks *
        (basic ? 1 / stats.attackSpeed : 1 - stats.cooldownReduction),
    ),
  );
}
/** Called synchronously by the zone owner after validating phase, membership and replay sequence. */
export function changeBuild(
  world: World,
  hero: Hero,
  config: SimulationConfig,
  expectedRevision: number,
  change: BuildChange,
): string | undefined {
  const p = hero.progression,
    def = config.progression,
    profile = def?.schools[hero.schoolId];
  if (!p || !def || !profile) return 'Võ học của môn phái này chưa mở.';
  if (hero.hp <= 0) return 'Cần hồi sinh trước khi đổi võ học.';
  if (expectedRevision !== p.revision)
    return 'Võ học đã thay đổi. Hãy thử lại với trạng thái mới.';
  if (p.mode === 'fixed') return changeFixedBuild(world, hero, config, change);
  if (change.action === 'upgrade-slot' || change.action === 'stance')
    return 'Nhánh võ học chưa mở.';
  let ids = [...(hero.skillIds ?? ['', '', '', ''])],
    ranks = { ...p.ranks },
    basic = hero.basicId,
    mode = p.mode,
    branchId = p.branchId,
    defaultSkills = [...p.defaultSkills];
  if (change.action === 'mode') {
    if (!['default', 'custom'].includes(change.mode))
      return 'Chế độ võ học không hợp lệ.';
    mode = change.mode;
    if (mode === 'default') basic = branchId;
  }
  if (
    change.action === 'branch' ||
    (change.action === 'basic' && mode === 'default')
  ) {
    if (mode !== 'default') return 'Chọn nhánh tự động trong chế độ Mặc định.';
    const branch = def.defaultBranches?.[change.basicId];
    if (
      !branch ||
      branch.schoolId !== hero.schoolId ||
      !profile.basicIds.includes(change.basicId)
    )
      return 'Nhánh võ học không thuộc môn phái của bạn.';
    branchId = basic = change.basicId;
    defaultSkills = [...branch.skillIds];
  }
  if (change.action === 'loadout') {
    ids = [...change.ids];
    if (
      ids.length !== 4 ||
      ids.some((id) => typeof id !== 'string') ||
      new Set(ids.filter(Boolean)).size !== ids.filter(Boolean).length
    )
      return 'Không thể trang bị trùng kỹ năng.';
    for (const id of ids.filter(Boolean)) {
      const skill = Object.hasOwn(def.skills, id) ? def.skills[id] : undefined;
      if (!skill || skill.schoolId !== hero.schoolId)
        return 'Kỹ năng không thuộc môn phái của bạn.';
      if (hero.level < skill.levelGates[0]!)
        return `Kỹ năng cần cấp ${skill.levelGates[0]}.`;
    }
    if (ids.filter((id) => def.skills[id]?.ultimate).length > def.maxUltimates)
      return 'Chỉ được trang bị một tuyệt kỹ.';
    if (mode === 'default') {
      const branch = def.defaultBranches?.[branchId];
      if (
        !branch ||
        ids.some((id) => !id || def.skills[id]?.style !== branch.style)
      )
        return 'Chế độ Mặc định chỉ cho phép bốn kỹ năng cùng nhánh.';
      defaultSkills = [...ids];
    } else
      ranks = Object.fromEntries(
        ids.filter(Boolean).map((id) => [id, p.ranks[id] ?? 0]),
      );
  } else if (change.action === 'upgrade') {
    if (mode === 'default')
      return 'Chế độ Mặc định tự phân điểm theo ô Q → W → E → R.';
    const skill = Object.hasOwn(def.skills, change.skillId)
      ? def.skills[change.skillId]
      : undefined;
    if (
      !skill ||
      skill.schoolId !== hero.schoolId ||
      !ids.includes(change.skillId)
    )
      return 'Trang bị kỹ năng trước khi tăng bậc.';
    const next = (ranks[change.skillId] ?? 0) + 1;
    const gates = legacyLevelGates(skill);
    if (next > gates.length) return 'Kỹ năng đã đạt bậc tối đa.';
    if (hero.level < gates[next - 1]!)
      return `Bậc tiếp theo cần cấp ${gates[next - 1]}.`;
    if (pointAccounting(hero, config).available < 1)
      return 'Không đủ điểm kỹ năng.';
    ranks[change.skillId] = next;
  } else if (change.action === 'reset') {
    if (mode === 'default') return 'Chuyển sang Tùy chỉnh để tự phân lại điểm.';
    ranks = Object.fromEntries(ids.filter(Boolean).map((id) => [id, 0]));
  } else if (change.action === 'basic') {
    if (
      !profile.basicIds.includes(change.basicId) ||
      !Object.hasOwn(config.basics, change.basicId)
    )
      return 'Đòn đánh không thuộc môn phái của bạn.';
    basic = change.basicId;
  }
  if (mode === 'default') {
    const branch = def.defaultBranches?.[branchId];
    if (!branch || branch.schoolId !== hero.schoolId)
      return 'Nhánh võ học chưa mở.';
    ranks = automaticRanks(defaultSkills, hero.level, config);
    ids = defaultSkills.map((id) => (ranks[id] ? id : ''));
  }
  if (Object.values(ranks).reduce((a, b) => a + b, 0) > hero.level)
    return 'Vượt quá số điểm đã nhận.';
  // Commit only after every validation. Keep cooldowns by ID, including removed skills.
  hero.abilityCooldowns ??= {};
  (hero.skillIds ?? []).forEach((id, i) => {
    if (id)
      hero.abilityCooldowns![id] = Math.max(
        hero.abilityCooldowns![id] ?? 0,
        hero.skillCooldowns[i] ?? 0,
      );
  });
  const hostile = (hero.statuses ?? []).filter((s) => s.sourceId !== hero.id);
  cancelOwnedEffects(world, hero.id);
  hero.statuses = hostile;
  world.pending = world.pending.filter((i) => i.heroId !== hero.id);
  hero.actionUntil = world.tick;
  hero.castAbilityId = '';
  hero.skillIds = ids;
  hero.skillCooldowns = ids.map((id) => hero.abilityCooldowns![id] ?? 0);
  hero.basicId = basic;
  p.mode = mode;
  p.branchId = branchId;
  p.defaultSkills = defaultSkills;
  p.ranks = ranks;
  p.revision++;
  refreshCharacter(hero, config);
  return undefined;
}
import { experienceAtLevel } from './campaign.js';
