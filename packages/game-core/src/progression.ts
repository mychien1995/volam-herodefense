import type { Hero, SimulationConfig, World, Ability } from './types.js';
import type {
  BuildChange,
  CharacterStats,
  PointAccounting,
  StatBonuses,
  StatCalculation,
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
export function pointAccounting(
  hero: Hero,
  config: SimulationConfig,
): PointAccounting {
  const earned = Math.min(config.maxLevel, Math.max(1, hero.level));
  const ids = hero.skillIds ?? [];
  const allocated = hero.progression
    ? Object.values(hero.progression.ranks).reduce((a, b) => a + b, 0)
    : 0;
  const remaining = Math.max(0, earned - allocated);
  const maxed =
    ids.length === 4 &&
    ids.every((id) => {
      const d = config.progression?.skills[id];
      return !!id && !!d && hero.progression?.ranks[id] === d.ranks.length;
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
      profile ? pointAccounting(hero, config).surplus : 0,
    ),
    equipment: zero(),
    temporary: zero(),
  };
  sources.temporary.critChance = statusValue(hero, 'crit_buff', tick);
  sources.temporary.critMultiplier = Math.max(
    0,
    ...(hero.statuses ?? [])
      .filter((s) => s.kind === 'crit_buff' && s.until > tick)
      .map((s) => s.secondary ?? 0),
  );
  sources.temporary.defense =
    statusValue(hero, 'defense_buff', tick) -
    statusValue(hero, 'defense_break', tick);
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
/** Explicit activation lets old isolated combat fixtures retain their historical M1/M3A contracts. */
export function initializeProgression(
  hero: Hero,
  config: SimulationConfig,
): boolean {
  if (!config.progression?.schools[hero.schoolId]) return false;
  hero.progression = { revision: 0, ranks: {} };
  hero.skillIds = ['', '', '', ''];
  hero.skillCooldowns = [0, 0, 0, 0];
  hero.basicId = config.progression.schools[hero.schoolId]!.basicIds[0]!;
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
    (config.maxLevel - 1) * config.xpPerLevel,
    hero.xp + amount,
  );
  hero.level = Math.min(
    config.maxLevel,
    Math.floor(hero.xp / config.xpPerLevel) + 1,
  );
  if (hero.progression) {
    if (hero.level !== oldLevel) hero.progression.revision++;
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
    rank = hero.progression.ranks[id] ?? 0;
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
  if (!hero.progression) return ability.cooldownTicks;
  const stats = characterStats(hero, config, tick).total;
  return Math.max(
    1,
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
  let ids = [...(hero.skillIds ?? ['', '', '', ''])],
    ranks = { ...p.ranks },
    basic = hero.basicId;
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
    ranks = Object.fromEntries(
      ids.filter(Boolean).map((id) => [id, p.ranks[id] ?? 0]),
    );
  } else if (change.action === 'upgrade') {
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
    if (next > skill.ranks.length) return 'Kỹ năng đã đạt bậc tối đa.';
    if (hero.level < skill.levelGates[next - 1]!)
      return `Bậc tiếp theo cần cấp ${skill.levelGates[next - 1]}.`;
    if (pointAccounting(hero, config).available < 1)
      return 'Không đủ điểm kỹ năng.';
    ranks[change.skillId] = next;
  } else if (change.action === 'reset')
    ranks = Object.fromEntries(ids.filter(Boolean).map((id) => [id, 0]));
  else if (change.action === 'basic') {
    if (
      !profile.basicIds.includes(change.basicId) ||
      !Object.hasOwn(config.basics, change.basicId)
    )
      return 'Đòn đánh không thuộc môn phái của bạn.';
    basic = change.basicId;
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
  p.ranks = ranks;
  p.revision++;
  refreshCharacter(hero, config);
  return undefined;
}
