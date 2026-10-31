import { setTimeout as delay } from 'node:timers/promises';

/** Poll observations, never retry thrown prerequisite/transport errors. */
export async function waitForQa(
  predicate,
  label,
  { timeout = 12000, interval = 70, diagnostics } = {},
) {
  const started = performance.now();
  let attempts = 0;
  while (performance.now() - started < timeout) {
    attempts++;
    if (await predicate()) return;
    const remaining = timeout - (performance.now() - started);
    if (remaining > 0) await delay(Math.min(interval, remaining));
  }
  let detail;
  try {
    detail = await diagnostics?.();
  } catch (error) {
    detail = { diagnosticError: String(error) };
  }
  throw Error(
    `Timeout: ${label} after ${Math.round(performance.now() - started)}ms (${attempts} observations)` +
      (detail === undefined ? '' : `; ${JSON.stringify(detail)}`),
  );
}

export function requireQaActor(actor, id, zoneId, actualZone = actor?.zoneId) {
  if (!actor) throw Error(`Missing authoritative actor ${id}`);
  if (actor.hp <= 0)
    throw Error(`Dead authoritative actor ${id}: hp=${actor.hp}`);
  if (actualZone !== zoneId)
    throw Error(
      `Wrong zone for ${id}: expected ${zoneId}, received ${actualZone}`,
    );
  return actor;
}
