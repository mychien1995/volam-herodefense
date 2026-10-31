import type { Ability, Hero } from './types.js';

/** Called only after the server accepts A; targets/cleaves never advance a chain. */
export function nextBasic(
  hero: Hero,
  base: Ability,
): { ability: Ability; stage?: string } {
  if (!base.basicCombo) return { ability: base };
  hero.basicChains ??= {};
  const index = hero.basicChains[base.id] ?? 0;
  const step = base.basicCombo[index % base.basicCombo.length]!;
  hero.basicChains[base.id] = (index + 1) % base.basicCombo.length;
  const effect = { ...base.effect };
  if ('damage' in effect) effect.damage *= step.damageMultiplier;
  if (effect.mode === 'arc' && step.halfAngle !== undefined)
    effect.halfAngle = step.halfAngle;
  if (effect.mode === 'projectile' && step.splashRadius !== undefined)
    effect.splashRadius = step.splashRadius;
  return { ability: { ...base, effect }, stage: step.stage };
}
