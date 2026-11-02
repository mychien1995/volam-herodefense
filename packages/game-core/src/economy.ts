import type { Hero, SimulationConfig } from './types.js';
import type { HeroInventory, MerchantAction } from './economy-types.js';
import { refreshCharacter } from './progression.js';
import { hasStatus } from './status.js';

export function emptyInventory(): HeroInventory {
  return {
    levels: { weapon: 0, armor: 0, hat: 0, boots: 0 },
    potions: {},
    revision: 0,
    potionReadyAt: 0,
  };
}

/** Atomic deterministic transaction. Only the room supplies membership/clocks and identity. */
export function transactMerchant(
  hero: Hero,
  config: SimulationConfig,
  context: { inArena: boolean; matchTick: number; worldTick: number },
  revision: number,
  action: MerchantAction,
): string | undefined {
  const economy = config.economy;
  if (!['buy-basic', 'buy-potion', 'use-potion'].includes(action.action))
    return 'Yêu cầu thương gia không hợp lệ.';
  if (!economy) return 'Thương gia chưa mở.';
  if (hero.hp <= 0)
    return 'Cần hồi sinh trước khi dùng vật phẩm hoặc mua hàng.';
  const inventory = hero.inventory ?? emptyInventory();
  if (revision !== inventory.revision)
    return 'Hành trang đã thay đổi. Hãy thử lại.';
  if (inventory.revision >= Number.MAX_SAFE_INTEGER)
    return 'Không thể thực hiện giao dịch.';
  if (action.action !== 'use-potion' && !context.inArena)
    return 'Chỉ mua và nâng đồ ở đấu trường trung tâm.';
  if (action.action === 'buy-basic') {
    if (!Object.hasOwn(economy.basics, action.slot))
      return 'Trang bị không hợp lệ.';
    const item = economy.basics[action.slot];
    if (!item) return 'Trang bị không hợp lệ.';
    const level = inventory.levels[action.slot];
    if (level >= item.prices.length) return 'Trang bị đã đạt cấp tối đa.';
    const price = item.prices[level]!;
    if (hero.gold < price) return 'Không đủ vàng.';
    hero.gold -= price;
    inventory.levels[action.slot] = level + 1;
    hero.inventory = inventory;
    inventory.revision++;
    refreshCharacter(hero, config); // Recompute; never heal or accumulate prior bonuses.
    return;
  }
  if (!Object.hasOwn(economy.potions, action.potionId))
    return 'Bình không hợp lệ.';
  const potion = economy.potions[action.potionId];
  if (!potion) return 'Bình không hợp lệ.';
  const count = inventory.potions[action.potionId] ?? 0;
  if (action.action === 'buy-potion') {
    if (
      !Number.isInteger(action.quantity) ||
      action.quantity < 1 ||
      action.quantity > economy.potionLimit
    )
      return 'Số lượng bình không hợp lệ.';
    const total = Object.values(inventory.potions).reduce(
      (sum, n) => sum + (n ?? 0),
      0,
    );
    if (total + action.quantity > economy.potionLimit)
      return `Chỉ mang tối đa ${economy.potionLimit} bình tổng cộng.`;
    const price = potion.price * action.quantity;
    if (hero.gold < price) return 'Không đủ vàng.';
    hero.gold -= price;
    inventory.potions[action.potionId] = count + action.quantity;
  } else {
    if (count < 1) return 'Không còn bình loại này.';
    if (context.matchTick < inventory.potionReadyAt)
      return 'Bình đang hồi. Chờ đủ 5 giây.';
    if (hasStatus(hero, 'stun', context.worldTick))
      return 'Không thể dùng bình khi đang choáng.';
    const maximum = potion.resource === 'hp' ? hero.maxHp : hero.maxMana;
    const current = potion.resource === 'hp' ? hero.hp : hero.mana;
    if (current >= maximum) return 'Tài nguyên đã đầy, không tiêu hao bình.';
    if (potion.resource === 'hp')
      hero.hp = Math.min(maximum, current + potion.amount);
    else hero.mana = Math.min(maximum, current + potion.amount);
    inventory.potions[action.potionId] = count - 1;
    inventory.potionReadyAt =
      context.matchTick +
      Math.round(config.tickRate * economy.potionCooldownSeconds);
  }
  inventory.revision++;
  hero.inventory = inventory;
}
