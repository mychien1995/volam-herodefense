import {
  createPvp1v1Config,
  pvpControlPolicy,
  type PvpSnapshot,
} from '@volam/game-core';
import { m1Config, pvp1v1Tuning } from '@volam/game-data';

const oneVOne = createPvp1v1Config(m1Config, pvp1v1Tuning);
// The passive tooltip shows its effective enemy stun; server data stays unscaled
// because applyStatus owns that calculation in the actual simulation.
const parryPolicy = pvpControlPolicy(pvp1v1Tuning, m1Config.tickRate).stun;
for (const a of oneVOne.progression!.skills.ngu_loi_chinh_phap_the!.ranks)
  if (a.reactiveBlock)
    a.reactiveBlock.stunTicks = Math.min(
      parryPolicy.maxTicks,
      Math.ceil(a.reactiveBlock.stunTicks * parryPolicy.durationMultiplier),
    );

/** HUD data follows the server's frozen round profile, including for spectators. */
export function pvpCombatConfig(
  snapshot: Pick<PvpSnapshot, 'combatProfile'> | undefined,
) {
  return snapshot?.combatProfile === 'pvp_1v1' ? oneVOne : m1Config;
}
