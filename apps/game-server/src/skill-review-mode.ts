import {
  initializeProgression,
  refreshCharacter,
  type Hero,
  type SimulationConfig,
  type World,
  type Command,
} from '@volam/game-core';

/** Called only behind MatchRoom.devSkillLoadout; never a client-controlled flag. */
export function prepareSkillReviewHero(h: Hero, c: SimulationConfig): void {
  h.level = c.maxLevel;
  h.xp = (c.maxLevel - 1) * c.xpPerLevel;
  initializeProgression(h, c, 'custom');
  const skills = Object.values(c.progression!.skills).filter(
    (s) => s.schoolId === h.schoolId,
  );
  h.progression!.ranks = Object.fromEntries(
    skills.map((s) => [s.id, s.ranks.length]),
  );
  h.skillIds = skills.slice(0, 4).map((s) => s.id);
  h.progression!.defaultSkills = [...h.skillIds];
  h.progression!.revision++;
  refreshCharacter(h, c);
  h.hp = h.maxHp;
  resetSkillReviewResources(h);
}
export function resetSkillReviewResources(h: Hero): void {
  h.skillCooldowns = [0, 0, 0, 0];
  h.abilityCooldowns = {};
  if (h.hp > 0) h.mana = h.maxMana;
}
/** Preserve four slots and normal server casts. Test loadouts bypass point allocation only. */
export function applySkillReviewLoadout(
  w: World,
  h: Hero,
  c: SimulationConfig,
  sequence: number,
  command: Command,
): boolean {
  if (command.kind !== 'dev-loadout' && command.kind !== 'select-basic')
    return false;
  if (sequence <= h.lastSequence) return true;
  h.lastSequence = sequence;
  if (command.kind === 'select-basic') {
    if (c.progression?.schools[h.schoolId]?.basicIds.includes(command.id)) {
      h.basicId = command.id;
      h.basicChains = {};
      h.progression!.branchId = command.id;
      h.progression!.revision++;
    }
  } else {
    const ids = command.ids;
    if (
      ids.length !== 4 ||
      new Set(ids.filter(Boolean)).size !== ids.filter(Boolean).length ||
      ids.some((id) => id && c.progression?.skills[id]?.schoolId !== h.schoolId)
    )
      return true;
    // Match the retained preview loadout lifecycle without granting client-owned effects.
    w.projectiles.forEach((p, id) => {
      if (p.ownerId === h.id) w.projectiles.delete(id);
    });
    w.areas = (w.areas ?? []).filter((a) => a.ownerId !== h.id);
    w.actions = (w.actions ?? []).filter((a) => a.ownerId !== h.id);
    w.supports = (w.supports ?? []).filter((a) => a.ownerId !== h.id);
    w.shots = w.shots.filter((a) => a.ownerId !== h.id);
    w.combos = (w.combos ?? []).filter(
      (a) => a.sourceId !== h.id && a.targetId !== h.id,
    );
    delete h.comboFinisher;
    h.statuses = (h.statuses ?? []).filter((s) => s.sourceId !== h.id);
    h.skillIds = [...ids];
    h.actionUntil = 0;
    h.castAbilityId = '';
    h.pose = 'idle';
    h.progression!.revision++;
  }
  resetSkillReviewResources(h);
  return true;
}
