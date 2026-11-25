import type { Creep, SimulationConfig, World } from './types.js';
export const isEncounterActor = (a: Creep): boolean =>
  !!(
    a.bossEncounter ||
    a.encounterBoss ||
    a.waveBossActor ||
    a.id === 'hoac_do' ||
    a.id === 'dat_nhi_ba' ||
    a.id === 'tay_doc_boss' ||
    a.id === 'hong_liet_boss'
  );
/** Shared team encounter; fresh actor instances reset provocation on every retry. */
export function bossFightReady(w: World, c: SimulationConfig): boolean {
  if (!c.bossesWaitForHit) return true;
  const actors = [...w.creeps.values()].filter(isEncounterActor);
  return !actors.some((a) => a.hp > 0) || actors.some((a) => a.provoked);
}
export function provokeBossFight(
  w: World,
  c: SimulationConfig,
  target: Creep,
): void {
  if (!c.bossesWaitForHit || !isEncounterActor(target)) return;
  for (const a of w.creeps.values()) if (isEncounterActor(a)) a.provoked = true;
}
