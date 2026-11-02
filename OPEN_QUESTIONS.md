# Open Decisions and Safe Provisional Defaults

## Inventory/merchant revision — 2026-11-02

[ITEMS_AND_CRAFTING.md](ITEMS_AND_CRAFTING.md) v2.0 resolves slot categories (weapon/armor/hat/boots, no necklace), basic cap 5, potion cooldown 5s/no dungeon purchases, personal boss materials without rolls, first-clear Long Châu, no resale/trading/transfer, Thanh Tâm replacing healing Z and penetration replacing weapon stun. These are design decisions; existing encounter loot backend migration has not been performed.

Still open: potion cap 20 total vs per type and shared vs separate 5s cooldown; size/price/heal tables and hotkeys; inventory/stack/pending-claim capacity and discard; Long Châu stats/formula/use; dead/disconnected eligibility and encounter reset attribution; crafting success/branch-switch/upgrade policies; all numeric equipment effects and stacking; where equip/merchant/crafting actions are legal. Do not promote previous chat examples into approved numbers.

**PvP proposal only:** ignore equipment and permit skills only, with no potions. Whether shoe Z, Long Châu, levels, ranks, innate/surplus and base stats are excluded/normalized remains unresolved. Record this intent without implementing PvP or assuming its final rules.

## Resolved by M3C3 feedback — 2026-10-31

Thái Cực Thần Công is now explicitly a toggle, superseding the earlier timed-shield open question/prototype. The director also authorizes ranged boomerang Phiến, moving-dash-only direct immunity with continuing DOT, bounded Chiết Mai CDR and confinement without stun. Numeric conversion/floors/ranges/damage/durations remain trial tuning in data. See `docs/M3C3_FEEDBACK_IMPLEMENTATION.md`. New concept approval does not approve production sprites or actual Phaser visuals; retained raster stand-ins remain explicitly temporary.

## M3C3 implemented provisional choices — 2026-10-31

Bất Động Minh Vương retains the canonical proposed one-pulse healing; mitigation/protection remains open. Six-second Phát Động windows refresh per valid setup step; wrong-order same-chain skills reset only that target,while A/unrelated actives preserve state. Vô Ảnh consumes once per target/cast and empowers its six valid kicks. Rank/growth/surplus/defense/heal/mitigation values remain M3D tuning inputs. Supplied skill-art waiver is retained and does not become final director approval. These choices permit M3C3 completion without reopening confirmed progression/control/authority rules.


**Instruction to Codex:** Do not quietly treat any of these as user-approved. For early milestones, a small temporary configurable behavior is acceptable, but label it and do not couple architecture to it. Defer questions not blocking the current milestone.

| Priority | Open choice | Suggested *temporary* choice | First affects |
|---|---|---|---|
| High | Backpack/stack capacity, safe claim and discard policy | 12 backpack slots and material stacks are proposals; four typed equip slots are confirmed | M4 |
| High | Dead/disconnected boss participants, encounter reset attribution and reconnect/claim policy | Preserve the confirmed damaged + present-in-instance eligibility; no rolls | M4 |
| High | What happens if inventory full when personal reward is earned | Personal pending claim proposed; never silently delete or make a transferable ground item | M4 |
| High | Does dungeon boss XP require player still present at death? | Must be present in boss instance and have landed >=1 hit | M4 |
| High | What exactly qualifies as 'meaningful assist' (damage, CC, healing) and expiration window? | Damage/CC within short recent window; add heal support only with clear attribution | M2/M3 |
| Medium | Regular rank caps / ultimate level gating | Normal max4 at levels 1/3/5/7, ultimate max3 ranks at 6/10/14, max one ultimate | M3 |
| Medium | Do normal attacks fire in facing direction if nearest enemy isn't found? | Yes, use last facing vector | M1 |
| Medium | Does pressing a different active skill reset Phát Động? | No progress for unrelated skill; keep current target state until timeout | M3 |
| Medium | Does an out-of-order combo skill reset that target's combo? | Yes | M3 |
| Medium | Shield: is Thái Cực Thần Công a toggle or timed buff? | Timed shield for simplest M3; reconsider toggle when balancing mana | M3 |
| Medium | Bất Động Minh Vương: pulse heal versus mitigation/protection stance? | Healing pulse retained from earlier proposal | M3 |
| Medium | Arena boss rest timer and boss spawn route | 10-second delay after fifth wave cleared; dedicated boss lane entry | M5 |
| Medium | Recipe gold/stats, success policy, branch switching and upgrades after crafting | Basic cap 5 and four boss-material/slot mappings confirmed; deterministic crafting proposed, exact costs TBD | M4 |
| Medium | Potion cap interpretation and cooldown sharing | 20 total and shared 5s proposed; 5s duration/no dungeon purchase confirmed | M4 |
| Medium | Long Châu stat formula, stacking and use/inventory policy | Once per character/boss/match confirmed; no approved numeric bonus | M4 |
| Medium | PvP excluding equipment and potions | Proposal only; resolve Z, Long Châu and level/rank/passive normalization | M6 |
| Medium | Level XP curve and numerical school growth | Tunable config and balance simulator; no invented final numbers | M1/M3 |
| Medium | Player death cooldown length and exact respawn positioning | 5–10 seconds and a safe spawn near statue | M2 |
| Medium | Host/ready behavior in match lobby; can players join ongoing matches? | Only join before match start; host starts | M0 |
| Medium | Disconnect policy and temporary session identity | Short reconnect grace; unused room cleanup | M0/M2 |
| Medium | What happens to ongoing PvP duel when statue raid begins? | Make PvP optional and defer entirely to M6; no silent teleport | M6 |
| Medium | PvP exact winning rule / round limit / rewards | Last team standing; no gold/XP; return to arena | M6 |
| Medium | If existing invasion creeps still alive when final boss becomes eligible, does final wait for complete cleanup? | Final begins after four bosses die, independent of non-boss survivors; announce danger | M5 |
| Low | Can basic attack be held down for repeated attacking? | Manual key-down with cooldown, no auto-repeat first | M1 |
| Low | How much cleave, exact enemy detection radius, animation timing? | Data-driven weapon-specific values; test feel | M1/M2 |
| Low | Exact viewport resolution, pixel tile scale, camera zoom and camera smoothing | Confirmed 2D Pokémon-like elevated top-down/three-quarter projection; propose 32px square tiles, integer zoom, test jitter in M1 | M1 |
| Low | Difficulty modes beyond production/test | Only standard and DEV_FAST now | M5/M7 |

## Proposed future discussion queue

1. Inventory capacity/claims, potion interpretation, Long Châu formula and remaining merchant/equipment policies in inventory v2.0; slot categories/no-roll rewards are resolved.
2. EXP/level numerical curves and first dungeon catalogue.
3. Statue, chapter boss and final boss detailed abilities/telegraphs.
4. Exact costs/stats of the four confirmed boss-material/slot recipes and twelve crafted branches; no necklace or weapon stun branch.
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

## Artwork decisions (v1.1)

- **Perspective confirmed:** Pokémon-style 2D elevated overhead/three-quarter orthographic view with a nonrotating camera, not isometric or 3D. Approve final pixel-art palette, exact 32px tile proposal, character frame dimensions (48px or 64px), viewport/zoom and 4-facing versus 8-facing sprite sets.
- Determine whether source artwork comes from artist-created Aseprite files, licensed packs, AI-assisted concept art refined into coherent sprites, or a mix; verify distribution licenses.
- Set animation frame budgets and preview quality gates after M1 gameplay establishes movement and attack timing.
- The art pipeline is a proposed production convention, **not a confirmation that final artwork exists**. See `ART_ASSET_GUIDE.md`.

## UI presentation questions (v1.4) — NOT blockers to viewport refactor

- Exact HUD widget position/sizes, bitmap/pixel fonts with Vietnamese diacritics, minimap decision, health bar visibility per enemy, menu scrolling approach and optional hotkeys (e.g. `I`/`Esc`) are **proposals**, not confirmed requirements. See `UI_UX_SPEC.md`.
- In-inventory/out-of-arena skill selection should remain read-only outside arena; menu display itself can be allowed while locked. Don't confuse opening a UI with changing game rules.
- Existing `M1` dashboard UI is specifically rejected; do not reinterpret this as rejection of a standalone pre-game lobby, tool-enabled development debug overlay, or DOM overlay *inside* the game viewport.

## v1.5 UI implementation review — 2026-10-29

- **Reference packaging:** `current_codex_dashboard_anti_reference.png` actually shows Võ Đang art; `wuxia_town_world_reference.png` actually shows the dashboard; `thien_son_thieu_lam_character_reference.png` shows a town. The old `vo_dang_art_direction_reference.png` and `in_game_world_reference.png` aliases are absent. Files remain unchanged; see the reference inventory. Correct school-specific source sheets can be supplied during the art review, without blocking this UI task.
- **Art approval remains OPEN:** existing Cái Bang/creep sprites and all new original UI/environment studies are prototypes. The mandatory detailed Võ Đang candidate has not been produced or approved here; no bulk character generation occurred.
- **Proposed UI details:** integer 2x display scale on desktop ≥960×600 (1x below), viewport-dependent logical canvas, bronze/jade frames, four empty generic equipment slots and a 12-cell backpack *illustration*. These do not approve slot categories, backpack capacity, item catalogue, prices or travel behavior. Optional I/K shortcuts were not added; Escape closes menus without conflicting with Arrow/A/QWER.
- **Reference ambition:** production environment richness, final portraits, ornate pixel frame art, and all four dungeon maps still need artist review. The forest study establishes composition/perspective only. Decorative NPC buildings/statue/lanterns do not add new authoritative collision; future solid scenery needs matching server geometry in its milestone.
- **Later backend integration:** M1 has no statue HP/raid timer/warnings, inventory, shop, crafting, dungeon or PvP state. UI shows unavailable states instead of fake HP/countdowns/items. The notification layer sits above dialogs, but live raid-warning behavior cannot be exercised until M2 provides real events. The live hero remains vulnerable while viewing menus or the forest study.
- **Placement decision superseded:** the v1.4 question about whether to show a minimap is superseded for this prototype by the v1.5 approved bottom-right layout pattern. Current markers show actual arena snapshots; future discovery/navigation behavior remains undecided.


## Dedicated school selection — unresolved policies (2026-10-30)

- Host migration if the host leaves the waiting lobby: no promotion rule confirmed. Current safe state disables Start Game; leave/recreate is available.
- Selection reconnect/rejoin grace and identity recovery, removing disconnected participants, cancellation back to waiting, timeout and automatic choice: unresolved. Current selection holds with the absent participant unconfirmed; no implicit choice or timer.
- Exact numeric level-1 school attributes and initial active-skill assignments for all four schools: not finalized. Current M1 combat sandbox remains unchanged; selection stores the canonical school identity. UI shows qualitative identities and explicitly undefined starting sets, rather than mockup numbers.
- Non-Cái Bang gameplay animation assets remain outside UI Phase 1; concept portraits are not animation atlases.

## M3B configurable defaults in use — 2026-10-31

The requested progression milestone is implemented using the documented rank gates/caps and explicit provisional rank/growth/surplus values. This does not finalize balance. Current refund, cooldown and point-accounting policy was recorded before coding in docs/M3B_RULES.md; exact values and measured legal-build probes are in docs/M3B_IMPLEMENTATION.md. Full other-school kits and equipment remain outside M3B. Do not reopen these implementation choices as routine approval blockers; future tuning can change the validated data while preserving confirmed one-point/level, arena-only changes and nonstacking surplus rules.

## M3C2 provisional implementation — 2026-10-31

Thái Cực Thần Công uses the suggested configurable timed-shield prototype; toggle versus timed remains OPEN. Numerical Võ Đang base/growth/innate/surplus,rank effects,25% Kiếm Khí chance,shield conversion,stationary formation cadence and one-trigger counter values are explicit proposals in `game-data/vo-dang.ts`. They need balance review, not a new school progression framework. Retained character/skill artwork has its existing separate approvals; independent baseline hurt/death frames remain missing.
