import { duongMon, type Ability } from '@volam/game-core';
import { m1Config } from '@volam/game-data';

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const seconds = (ticks: number) => number.format(ticks / m1Config.tickRate);

function damageText(effect: Ability['effect']): string {
  const amount =
    'damage' in effect && effect.damage > 0 ? number.format(effect.damage) : '';
  switch (effect.mode) {
    case 'projectile': {
      if (effect.scatter)
        return `${number.format(effect.scatter.damage)} mỗi vụ nổ, ${amount} mỗi kim`;
      const direct = effect.dragonDive
        ? `${amount} khi đáp`
        : `${amount} mỗi phát`;
      const burn =
        effect.burnDamage > 0
          ? `${number.format(effect.burnDamage)} đốt mỗi giây`
          : '';
      return [direct, burn].filter(Boolean).join(' + ');
    }
    case 'area':
      return amount &&
        !effect.oncePerTarget &&
        effect.tickInterval < effect.durationTicks
        ? `${amount} mỗi ${seconds(effect.tickInterval)} giây`
        : amount;
    case 'multi_hit': {
      const burst = effect.projectileBurst
        ? `${number.format(effect.projectileBurst.damage)} mỗi đạn`
        : '';
      if (effect.inwardBurst) return burst;
      return [
        amount && `${amount} mỗi nhịp`,
        effect.finisherDamage > 0 &&
          `${number.format(effect.finisherDamage)} đòn cuối`,
        burst,
      ]
        .filter(Boolean)
        .join(' + ');
    }
    case 'dash':
      return [
        amount,
        effect.endBlast && `${number.format(effect.endBlast.damage)} nổ cuối`,
        effect.afterProjectile &&
          `${number.format(effect.afterProjectile.damage)} mỗi projectile sau lướt`,
        effect.counter && `${number.format(effect.counter.damage)} phản kích`,
      ]
        .filter(Boolean)
        .join(' + ');
    case 'guard_counter':
      return 'Phản lại sát thương đã nhận';
    case 'fortune':
      return `${number.format(effect.blastDamage)} nếu ra quẻ nổ`;
    case 'buff':
      return effect.burnAura
        ? `${number.format(effect.burnAura.damage)} mỗi ${seconds(effect.burnAura.tickInterval)} giây`
        : '';
    default:
      return amount;
  }
}

export function skillRankStats(ability: Ability): string {
  if (ability.passive && ability.reactiveBlock)
    return `Nội tại · ${number.format(ability.reactiveBlock.chance * 100)}% chặn đòn\nPhản sét · ${number.format(ability.reactiveBlock.damage)} sát thương\nChoáng · ${seconds(ability.reactiveBlock.stunTicks)} giây`;
  const { effect } = ability;
  const drain = effect.mode === 'projectile' ? effect.recallDrain : undefined;
  const toggleShield = effect.mode === 'mana_shield' && effect.toggle;
  let mana = number.format(ability.manaCost);
  if (effect.mode === 'mana_shield')
    mana += ` khi bật, ${number.format(effect.manaPerDamage)} mỗi sát thương hấp thụ`;
  else if (drain)
    mana += ` khi tung, ${number.format(drain.mana)} mỗi ${seconds(drain.intervalTicks)} giây duy trì`;
  else if (ability.id === duongMon.flight) mana += ' khi bật, tiêu hao khi bay';

  const cooldown = drain
    ? `${number.format(drain.cooldownSeconds)} giây sau khi thu về`
    : toggleShield
      ? 'Bật/tắt tự do'
      : `${seconds(ability.cooldownTicks)} giây`;
  return [
    `Sát thương cơ bản · ${damageText(effect) || '—'}`,
    `Nội lực · ${mana}`,
    `Hồi chiêu cơ bản · ${cooldown}`,
  ].join('\n');
}
