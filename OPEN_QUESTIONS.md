# Open Decisions and Safe Provisional Defaults

**Instruction to Codex:** Do not quietly treat any of these as user-approved. For early milestones, a small temporary configurable behavior is acceptable, but label it and do not couple architecture to it. Defer questions not blocking the current milestone.

| Priority | Open choice | Suggested *temporary* choice | First affects |
|---|---|---|---|
| High | Number of backpack slots and item-type-specific equip slots | 12 backpack; four unrestricted equipped slots initially; eventual weapon/armor/accessory categories | M4 |
| High | Boss loot roll UI (Need/Greed/Pass vs uniform roll), timeout, disconnect handling | Every eligible player gets equal auto-roll at timeout; UI offers Roll/Pass when built | M4 |
| High | What happens if inventory full when player wins loot | Safe pending claim or owner-protected ground drop; never delete item | M4 |
| High | Does dungeon boss XP require player still present at death? | Must be present in boss instance and have landed >=1 hit | M4 |
| High | What exactly qualifies as 'meaningful assist' (damage, CC, healing) and expiration window? | Damage/CC within short recent window; add heal support only with clear attribution | M2/M3 |
| Medium | Regular rank caps / ultimate level gating | Normal max4 at levels 1/3/5/7, ultimate max3 ranks at 6/10/14, max one ultimate | M3 |
| Medium | Do normal attacks fire in facing direction if nearest enemy isn't found? | Yes, use last facing vector | M1 |
| Medium | Does pressing a different active skill reset Phát Động? | No progress for unrelated skill; keep current target state until timeout | M3 |
| Medium | Does an out-of-order combo skill reset that target's combo? | Yes | M3 |
| Medium | Shield: is Thái Cực Thần Công a toggle or timed buff? | Timed shield for simplest M3; reconsider toggle when balancing mana | M3 |
| Medium | Bất Động Minh Vương: pulse heal versus mitigation/protection stance? | Healing pulse retained from earlier proposal | M3 |
| Medium | Arena boss rest timer and boss spawn route | 10-second delay after fifth wave cleared; dedicated boss lane entry | M5 |
| Medium | Initial shop basic item max level and exact crafting recipes | Level 5 and 1 required boss drop; exact costs TBD | M4 |
| Medium | Level XP curve and numerical school growth | Tunable config and balance simulator; no invented final numbers | M1/M3 |
| Medium | Player death cooldown length and exact respawn positioning | 5–10 seconds and a safe spawn near statue | M2 |
| Medium | Host/ready behavior in match lobby; can players join ongoing matches? | Only join before match start; host starts | M0 |
| Medium | Disconnect policy and temporary session identity | Short reconnect grace; unused room cleanup | M0/M2 |
| Medium | What happens to ongoing PvP duel when statue raid begins? | Make PvP optional and defer entirely to M6; no silent teleport | M6 |
| Medium | PvP exact winning rule / round limit / rewards | Last team standing; no gold/XP; return to arena | M6 |
| Medium | If existing invasion creeps still alive when final boss becomes eligible, does final wait for complete cleanup? | Final begins after four bosses die, independent of non-boss survivors; announce danger | M5 |
| Low | Trade items directly between players? | No trading initially, only dropped-item pickup | M4 |
| Low | Can basic attack be held down for repeated attacking? | Manual key-down with cooldown, no auto-repeat first | M1 |
| Low | How much cleave, exact enemy detection radius, animation timing? | Data-driven weapon-specific values; test feel | M1/M2 |
| Low | Graphics resolution, pixel tile scale and camera | 32px tiles placeholder, flexible camera zoom | M1 |
| Low | Difficulty modes beyond production/test | Only standard and DEV_FAST now | M5/M7 |

## Proposed future discussion queue

1. Inventory slot categories vs free-for-all four slots; loot roll interaction.
2. EXP/level numerical curves and first dungeon catalogue.
3. Statue, chapter boss and final boss detailed abilities/telegraphs.
4. Distinct recipes and what dungeon drops feed them.
5. Skill-tuning values, animation commitment, precise PvP time policy.
6. Visual asset style guide and original/appropriately licensed art pipeline.

## Decision change template

```
Date:
Affected files:
User-confirmed change:
Previous behavior:
New behavior:
Balance/testing implications:
Acceptance tests updated:
```

## M0 provisional technical policies (2026-10-29)

These are implementation defaults for the connection preview, **not user-approved gameplay decisions**:

- **Host/start/late join:** M0 remains in `lobby` and has no ready/start control. Any free lobby seat may be joined by room ID. Choose host/ready and in-progress admission before adding a playable match lifecycle in M1/M2.
- **Disconnect:** M0 removes a seat when the connection closes, disables SDK automatic reconnect, and auto-disposes an empty room. Reload/rejoin creates a new temporary session. Reconnect grace, late rejoin and ownership policy remain open before progression/inventory exists.
- **Nicknames:** normalize to NFC, trim, allow 1–20 letters/combining marks/numbers/spaces/simple punctuation, and allow duplicate display names; use server session IDs for identity. Length and message rate (10/s) are technical config in `game-data`. Profanity policy and broader international-name punctuation remain undecided.
- **M0 rendering:** original geometric lobby markers are laid out locally from the server roster; they are not authoritative world positions. World geometry, movement and camera tuning remain M1 work.
- **Stack packaging:** use `@colyseus/core` 0.18.23 + `@colyseus/ws-transport` 0.18.4 rather than the umbrella package, whose unused uWebSockets peer caused an install failure under pnpm 11 policy. No major stack change. Reconsider optional native optimizations only after measurements.
