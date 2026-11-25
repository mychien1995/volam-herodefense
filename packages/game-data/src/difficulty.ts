import type { DongDefinition } from '@volam/game-core';
import { dongTaDefinitionSchema } from './dong-ta.js';
export const easyDongTuning = {
  damageRatio: 0.85,
  fanAreaRatio: 0.3,
  dashWarningTicks: 30,
} as const;
/** Clone and validate each room's tuning; hard retains the current encounter. */
export function dongTaForDifficulty(
  definition: DongDefinition,
  difficulty: 'easy' | 'hard',
): DongDefinition {
  const tuned = dongTaDefinitionSchema.parse(definition) as DongDefinition;
  if (difficulty === 'hard') return tuned;
  tuned.difficulty = 'easy';
  const scale = Math.sqrt(easyDongTuning.fanAreaRatio);
  tuned.thrust.range *= scale;
  tuned.thrust.halfWidth *= scale;
  tuned.fan.range *= scale;
  for (const profile of Object.values(tuned.abilities))
    profile.damage *= easyDongTuning.damageRatio;
  tuned.abilities.lac_anh_normal.windup = Math.max(
    tuned.abilities.lac_anh_normal.windup,
    easyDongTuning.dashWarningTicks,
  );
  return dongTaDefinitionSchema.parse(tuned) as DongDefinition;
}
