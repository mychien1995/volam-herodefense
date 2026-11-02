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
  if (
    effect.mode === 'arc' &&
    base.manualChain &&
    index === base.basicCombo.length - 1
  )
    effect.projectileProc = {
      chance: 1,
      effect: base.manualChain.finisherProjectile,
    };
  if (effect.mode === 'projectile' && step.splashRadius !== undefined)
    effect.splashRadius = step.splashRadius;
  return { ability: { ...base, effect }, stage: step.stage };
}

export function expireBasicChain(
  hero: Hero,
  tick: number,
  cooldownTicks: number,
): void {
  const deadline = hero.basicChainDeadline;
  if (!deadline || tick < deadline.until) return;
  if (hero.basicChains) hero.basicChains[deadline.abilityId] = 0;
  hero.cooldown = Math.max(hero.cooldown, deadline.until + cooldownTicks);
  delete hero.basicChainDeadline;
}
