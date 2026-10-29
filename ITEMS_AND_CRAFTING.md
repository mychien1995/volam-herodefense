# Items, Shop, Crafting & Loot Specification v1.0

## 1. Confirmed economic constraints

- **4 equip slots**, separate backpack size still open (propose 12 slots until approved).
- **Every school can equip every item**. Do not bind skills to equipped weapon styles; normal attack is selected separately from gear.
- A merchant sells basic items for gold. **Buying duplicates** of a basic item upgrades that basic item one level toward max; level cap is configurable (5 proposed).
- Craft a stronger item by combining **a max-level basic item + one specified dungeon boss item + gold**. No probabilistic crafting failures initially (proposal).
- Every dungeon boss kill creates exactly **one item selected from its loot table**. All eligible players roll; winner receives the one item; solo eligible player wins automatically. Eligible players may keep duplicate items, drop to ground or sell.
- Invasion creeps and major/final invasion bosses award gold/EXP but **never items** in v1.
- No gold or XP penalty on player death. No persistent inventory between matches.

## 2. Example item model (PROPOSED)

```
ItemDefinition {
  id: string,
  displayNameVi: string,
  tier: 'basic'|'crafted'|'boss_drop',
  category: 'weapon'|'armor'|'accessory'|'material',
  maxUpgradeLevel?: number,
  modifiersByLevel?: StatModifiers[],
  sellPrice: number,
  stackable?: boolean,
  unique?: boolean
}
ItemInstance { instanceId, definitionId, level, ownerPlayerId?, slot? }
Recipe { id, basicItemId, requiredBasicLevel, bossDropItemId, goldCost, resultItemId }
```

Separate definition from instance; prevent crafting with someone else's inventory, and validate spend/consume/award atomically on server. A dropped item is a distinct world entity with pickup ownership/rules and a despawn policy, both configurable.

## 3. Illustrative upgrade path (NOT final names/stats/prices)

1. Buy `Thiết Kiếm` Level 1 for 100 gold (e.g. +10 Attack).
2. Buy another copy: if matching eligible item in inventory/equipment has Lv1, consume purchase to upgrade it to Lv2. Repeat until Lv5 (e.g. +40 Attack).
3. Defeat a dungeon boss; one random item drops (could be `Hỏa Long Ngọc`) and is rolled among eligible participants.
4. Craft using `Thiết Kiếm Lv5 + Hỏa Long Ngọc + 5000 Gold → Hỏa Long Kiếm` (e.g. higher Attack and Crit Chance).
5. All sample numbers and names are **proposals**. A real item catalogue, costs and recipes must be reviewed once gameplay pacing is tested.

**Duplicate purchasing ambiguity:** if player has two copies or maxed one already, shop UI should clearly offer `Upgrade eligible existing item` or `Buy separate copy` without silently consuming the wrong item. A first-version implementation may intentionally support one eligible matching basic item at a time, with explicit error/info text.

## 4. Inventory and equipment

- Equip four items; equipped category rules not yet approved. Provisional UI offers weapon / armor / accessory / accessory, but avoid treating this as final restriction.
- Backpack capacity open; a visible grid and ground drops. Equip, unequip, sell, drop and pickup are server-authoritative. Item values affect combat stats through generic stat-modifier pipeline.
- Duplicates permitted, especially for recipe materials. Do not auto-destroy duplicate boss drops.
- A dropped item may have short owner-only claim window before becoming public; **PROPOSED** for fair trading, not confirmed.
- Store full item instance metadata to support upgrading. Dropping may remove it from player inventory permanently; server validates owner.

## 5. Loot resolution process

1. Dungeon boss dies; server locks the boss-kill event to avoid duplicate rewards.
2. Determine eligible participants (for boss XP: each player dealt at least one confirmed hit; item roll eligibility same by default).
3. Select **exactly one** item from weighted boss loot table using server RNG, independent of number of players.
4. Offer each eligible participant a roll (UI with `Roll`/`Pass`; simplest v1 can auto-roll equally if user approves; **OPEN**). Server resolves ties fairly, e.g., reroll among tied contenders.
5. Award the one item instance to winner's inventory; if full, show safe pending-claim or ground-drop mechanism (OPEN choice; don't destroy item silently).
6. Grant boss XP/gold separately per configured fixed-reward distribution; not additional item copies.
7. Start boss respawn cooldown. Dead boss doesn't also reset via the empty-instance timer.

**Fairness:** A 1-player solo kill guarantees the one drop (but not which item). A six-player kill does not generate six drops. Boss drops can be sold or used for crafting; boss reruns remain meaningful.

## 6. Server transaction rules and exploitation tests

- Each operation `buy`, `upgrade`, `craft`, `drop`, `pickup`, `sell`, `roll` validates player state, location, ownership, capacity, cost and IDs against trusted definition.
- Atomic state changes: spend gold/ingredients and award result together; no duplication on retry/network resend (idempotent command IDs).
- No accidental cross-room item transfers. Persistent DB not required for matches.
- Prevent double-awards from overlapping boss death events, roll-timeouts, player disconnect, concurrent purchase clicks, ground pickup race, selling equipped items and upgrading item after it is used as recipe ingredient.
- Unit/integration tests for all these critical inventory transitions before adding many items.
