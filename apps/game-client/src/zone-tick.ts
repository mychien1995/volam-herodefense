import { loiDai } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';

/** Ability timestamps belong to the world that emitted them. */
export function zoneTick(
  state: LobbyState | undefined,
  zone: string,
): number | undefined {
  if (zone === 'arena') return state?.tick;
  if (zone === loiDai.id) return state?.loiDaiTick;
  return state?.dungeons.get(zone)?.tick;
}
