import type { Actor, Hero, StatusKind } from './types.js';
/** Scripted marks, confinement and movement locks deliberately remain outside this list. */
export const cleansableDebuffs = new Set<StatusKind>([
  'slow',
  'stun',
  'root',
  'silence',
  'disarm',
  'poison',
  'burn',
  'attack_slow',
  'attack_break',
  'defense_break',
]);
export function cleanseBoots(actor: Actor, tick: number): boolean {
  const hero = actor as Hero,
    inv = hero.inventory;
  if (
    hero.hp <= 0 ||
    inv?.crafted?.boots !== 'cleanse' ||
    !inv.bootsCooldownTicks ||
    tick < (inv.auxiliaryReadyAt ?? 0) ||
    !(
      hero.statuses?.some(
        (s) =>
          cleansableDebuffs.has(s.kind) &&
          s.until > tick &&
          (s.startsAt ?? 0) <= tick,
      ) ||
      (hero.duelBurn && hero.duelBurn.until > tick) ||
      hero.nguDocVenom?.some((dot) => dot.until > tick)
    )
  )
    return false;
  hero.statuses = (hero.statuses ?? []).filter(
    (s) => !cleansableDebuffs.has(s.kind),
  );
  delete hero.duelBurn;
  delete hero.nguDocVenom;
  inv.auxiliaryReadyAt = tick + inv.bootsCooldownTicks;
  return true;
}
