import { equippedAbility } from './skills.js';
import { hasStatus } from './status.js';
import type {
  Command,
  Hero,
  SimulationConfig,
  World,
  ComboSpec,
} from './types.js';

/** Only an actual preceding projectile/action can defer a conditional finisher. */
function primerDeadline(
  w: World,
  h: Hero,
  chain: ComboSpec['id'],
  c: SimulationConfig,
): number {
  let until = w.tick;
  for (const a of w.actions ?? [])
    if (
      a.ownerId === h.id &&
      a.ability?.combo?.id === chain &&
      a.ability.combo.step === 2 &&
      a.effect.mode === 'projectile'
    )
      until = Math.max(
        until,
        Math.max(
          a.until,
          a.nextTick +
            Math.ceil((a.effect.range / a.effect.speed) * c.tickRate),
        ) + 2,
      );
  for (const p of w.projectiles.values())
    if (p.ownerId === h.id && p.combo?.id === chain && p.combo.step === 2)
      until = Math.max(
        until,
        w.tick +
          Math.ceil((p.remaining / Math.hypot(p.vx, p.vy)) * c.tickRate) +
          2,
      );
  for (const s of w.shots)
    if (
      s.ownerId === h.id &&
      s.ability.combo?.id === chain &&
      s.ability.combo.step === 2 &&
      s.ability.effect.mode === 'projectile'
    )
      until = Math.max(
        until,
        s.tick +
          Math.ceil(
            (s.ability.effect.range / s.ability.effect.speed) * c.tickRate,
          ) +
          2,
      );
  return until;
}
export function bufferComboFinisher(
  w: World,
  h: Hero,
  command: Command,
  c: SimulationConfig,
): boolean {
  if (command.kind !== 'cast') return false;
  const a = equippedAbility(h, command.slot, c);
  if (
    !a ||
    a.effect.mode !== 'multi_hit' ||
    !a.effect.comboBurstOnly ||
    !a.combo
  )
    return false;
  if (h.comboFinisher?.abilityId === a.id) return true;
  if (
    h.hp <= 0 ||
    hasStatus(h, 'stun', w.tick) ||
    hasStatus(h, 'silence', w.tick) ||
    h.mana < a.manaCost ||
    w.tick < (h.skillCooldowns[command.slot] ?? Infinity) ||
    w.tick < (h.abilityCooldowns?.[a.id] ?? 0)
  )
    return false;
  if (
    (w.actions ?? []).some(
      (x) =>
        x.ownerId === h.id &&
        (x.ability?.combo?.id !== a.combo!.id || x.ability.combo.step !== 2),
    )
  )
    return false;
  const until = primerDeadline(w, h, a.combo.id, c);
  if (until <= w.tick) return false;
  h.comboFinisher = {
    slot: command.slot,
    abilityId: a.id,
    chain: a.combo.id,
    fx: h.fx,
    fy: h.fy,
    until,
  };
  return true;
}
/** Resolve from real projectile collisions; no manufactured hit or combo progress. */
export function takeComboFinisher(
  w: World,
  h: Hero,
  c: SimulationConfig,
): Command | undefined {
  const q = h.comboFinisher;
  if (!q) return;
  if (
    h.hp <= 0 ||
    hasStatus(h, 'stun', w.tick) ||
    hasStatus(h, 'silence', w.tick) ||
    h.skillIds?.[q.slot] !== q.abilityId
  ) {
    delete h.comboFinisher;
    return;
  }
  const landed = (w.combos ?? []).some(
    (x) =>
      x.sourceId === h.id &&
      x.id === q.chain &&
      x.step === 2 &&
      x.until > w.tick &&
      (w.creeps.get(x.targetId)?.hp ?? 0) > 0,
  );
  if (
    w.tick < q.until &&
    ((w.actions ?? []).some((x) => x.ownerId === h.id) ||
      (!landed && primerDeadline(w, h, q.chain, c) > w.tick))
  )
    return;
  delete h.comboFinisher;
  h.fx = q.fx;
  h.fy = q.fy;
  return { kind: 'cast', slot: q.slot };
}
