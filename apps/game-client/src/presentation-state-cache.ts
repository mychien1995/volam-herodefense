import type { PvpSnapshot } from '@volam/game-core';
type Status = { kind: string; ticks?: number };
const statuses = new WeakMap<object, { raw: string; value: Status[] }>();
/** Read-only projection cache: a new raw value or actor object always decodes again. */
export function actorStatuses(actor: { statuses?: string }): Status[] {
  const raw = actor.statuses ?? '[]';
  const previous = statuses.get(actor);
  if (previous?.raw === raw) return previous.value;
  const value = JSON.parse(raw) as Status[];
  statuses.set(actor, { raw, value });
  return value;
}
const pvp = new WeakMap<object, { raw: string; value: PvpSnapshot }>();
export function pvpSnapshot(
  state: { pvp: { enabled: boolean; json: string } } | undefined,
): PvpSnapshot | undefined {
  if (!state?.pvp.enabled || !state.pvp.json) return;
  const raw = state.pvp.json,
    previous = pvp.get(state.pvp);
  if (previous?.raw === raw) return previous.value;
  const value = JSON.parse(raw) as PvpSnapshot;
  pvp.set(state.pvp, { raw, value });
  return value;
}
