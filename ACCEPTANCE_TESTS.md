# Acceptance Tests — Rule-to-test traceability

## Current menu-only dungeon access

- No Dẫn Lộ sprite, label or NPC marker remains. Supported entry is enabled for a live arena player at the normal spawn, without walking to an interaction radius.
- Core/server tests reject dead, pre-game or already-in-dungeon entry and preserve instance ownership, capacity, replay protection and physical exit validation.
- Two-client browser tests use only the Phó Bản utility menu to enter shared or separate private instances, then verify combat, isolation, physical exit and retained empty-world state. This supersedes Guide-specific cases below.

## Arena and selector visual v2

- `tests/arena-layout.test.ts` checks removal of the interior trunk on the authoritative map, alignment of moved perimeter tree feet/collision, unchanged statue marker, open west/east routes and expanded Tiled paving.
- `tests/e2e/arena-visual-v2.spec.ts` walks through the old tree footprint, checks the normal camera/HUD, four actual 512×768 card images, Vietnamese live controls, availability restrictions, close/Escape/focus and viewport containment at 944×466 and 1920×1080.
- Genuine normal/critical combat events must match floating target ID, amount, critical flag and world anchor. Digits have no rectangular background, remain camera-scrolled, stack on rapid hits, and simultaneous multi-target hits stay associated with their targets. No fixed-position damage toast remains. Tests do not force RNG or inject fabricated combat events.
- Preserve the existing shared/private dungeon, server reward, keyboard combat, projectile and animation regression suites. No new backend destination or skill is authorized by the card artwork.

## M2A creep dungeon foundation — 2026-10-30

- `tests/dungeons.test.ts`: a live arena hero must approach the Guide; a live dungeon hero must approach its physical exit. One authoritative membership, preserved progression/remaining cooldowns and canceled movement/queued attacks/projectiles across travel. Private owners cannot share worlds; shared capacity is six.
- Full clear starts a rest then the next wave, scaling to the participant count at spawn. A mid-wave join does not change existing strength. Empty worlds freeze complete enemy/timer state, including a partially elapsed rest, and re-entry resumes it. Disconnecting the last participant also pauses.
- Actual damage/contribution/death awards exactly the fixed EXP/gold pool to eligible present contributors; no cross-zone rewards and no items. Death countdown returns to the arena without EXP/gold loss.
- `tests/dungeon-room.test.ts`: real Colyseus clients verify zone-filtered enemies, projectiles and events, private progress visibility, two shared occupants and a separate arena observer, replay/range/style validation, strict rejection of forged private instance IDs and pause/resume after exit.
- `tests/e2e/dungeons.spec.ts`: two separate real Chromium contexts walk to/click the Guide, enter shared or different private instances, attack with A/Q/W, read synchronized enemy HP/rewards, use the physical exit and re-enter a paused dungeon. Menu and map transitions restore keyboard focus. Capture 1280×720 and 1920×1080 gameplay; monitor console/page/HTTP errors. Dungeon status must not overlap the combat toast.
- M2A does not imply invasion, boss reset/loot, crafting or additional school acceptance. The dungeon environment and NPC/portal/enemy assets remain explicitly reused prototypes.

## ART-01 replacement checks — 2026-10-30

- Actual Chromium captures at 954×458, 1280×720 and 1920×1080 must show a full game viewport with compact live HUD, no exterior panel, center title/status block or minimap. Utility order is Settings/Quit/Phó Bản/Thương Gia/Lôi Đài; all existing menus remain reachable inside the viewport.
- Load real PNGs/atlases and every water/glow frame without missing requests; validate frame bounds, tags, 160ms durations, padding, binary alpha and stable animation silhouettes. Approved Cái Bang hashes, four-facing idle/walk and both normal styles remain unchanged.
- Two clients must observe the same movement/combat state; menu inputs must not send combat/movement, closing restores arrows/A/QWER, HP/mana/EXP/level/gold/cooldowns bind to server state. Quit really leaves; connection checks still acknowledge.
- Existing tree collision/feet-depth occlusion and navigation remain intact. Statue art stays at its existing marker; M1's absence of statue/water colliders is disclosed, not changed or reported as implemented.
- Review actual normal-zoom screenshots against the two approved concepts and rejected current build. Produced/integrated/runtime-verified are separate from director-approved. No bulk expansion before director sign-off.

These are behavioral requirements, not already implemented tests. Codex should convert them to automated tests during the matching roadmap milestone and preserve them as regressions.

## A. Lobby and rooms

- Given no account, when player enters only a nickname and creates room, then a temporary independent match exists and another player joins via room identifier.
- Given six players in room, when seventh attempts join, then server denies admission without corrupting state.
- Given players in different rooms, when one attacks, then no state/rewards leak to the other room.

## B. Controls and attacks

- Given arrow input, when moving diagonally, then server-authoritative position and last-facing direction are valid and both clients observe same position after reconciliation.
- Given ranged basic attack against nearest foe, when foe moves perpendicular after shot launched, then **projectile continues straight and can miss**; it never turns to chase.
- Given melee primary and two secondary enemies inside forward arc, when `A` attack lands, then primary receives full damage and each secondary receives smaller cleave per configured multipliers; enemies behind player are unaffected.
- Given cooldown still active, when `A` or a skill key is spammed, then no extra attack occurs.
- Given mouse cursor on enemy, when pressing QWER, then no click-based targeting is required; skill uses configured direction/area/self behavior.

## C. Skills and levels

- Given level 1, then player has earned exactly one skill point. At level 15 exactly fifteen; at 30 thirty.
- Given a school and new level, then automatic base stat and school innate passive growth are applied without consuming points.
- Given four equipped skills all at max, then unspent earned points convert to the school's stat package; after respec, former stat modifiers are removed before new bonuses applied.
- Given player inside dungeon/PvP, then respec/change of active skills/normal attack is server-rejected; same operation in arena allowed.
- Given skills from Chưởng and Bổng, then any legal four-slot combination can be equipped; no matching weapon restriction.
- Given any of four schools, then content registry contains expected passive, two normals, and correct canonical active skills (43 total).

## D. Phát Động

- Given La Hán Quyền hits A and B, Vi Đà Quyền hits B only, Đại Lực Kim Cương Chưởng hits both, then **only B** receives combo bonus.
- Given secondary cleave hit at any combo step, then that enemy progresses that same-target combo.
- Given an attack misses, then it does not advance a combo on the missed enemy.
- Given combo window elapsed, then finisher does unempowered damage.

## E. EXP and leveling

- Given creep with 60 XP, killed by eligible A/B/C, then A/B/C each get 20 XP. No double reward for last hitter.
- Given player does not assist that particular creep, then they get zero XP from its kill even if elsewhere in shared dungeon.
- Given boss killed with two eligible players who each landed >=1 successful hit, then one fixed boss XP reward is shared; only one loot item is generated.

## F. Dungeons

- Given private dungeon with occupant, when second player attempts join same instance, then denied.
- Given shared creep dungeon with surviving enemies, when last player exits, then wave pauses; reentry continues same wave progress.
- Given all creeps in dungeon wave defeated, then next stronger wave spawns only after all previous wave required enemies are dead.
- Given boss alive and dungeon empty for 29s, when player reenters, then boss has not reset; after >=30s empty, health and position reset.
- Given boss killed, when no one is inside, then empty-alive reset must not bypass configured kill respawn cooldown.
- Given player is in dungeon 60s before scheduled statue wave, then warning is shown; there is no automatic teleport; exit portal must be used.

## G. Statue and invasions

- Given live match started at T=0, then waves 1..20 spawn at T=180*n seconds, independent of survival of previous enemies.
- Given wave 5 enemies alive after T=900, then Đông Tà does **not** spawn until the last wave-5 enemy dies, then configurable short delay.
- Given wave 5 clears after wave 6 already spawned, then Đông Tà still spawns once; wave 6 continues as usual.
- Given all four chapter bosses defeated and prerequisites satisfied, then final Vương Trùng Dương becomes eligible and spawns once.
- Given player enters creep detection radius, then creep prioritizes nearest player; when no player in radius, target statue; attack range remains separately validated.
- Given statue HP lost in wave 1, then it does **not** regenerate or get repaired during match.
- Given statue HP reaches 0 before final kill, then match loses; given final boss defeated while statue alive, match wins.
- Given chapter boss death, then gold/XP can be given but zero item drops occur.

## H. Items and loot

- Given boss is killed, then exactly one item selected from its configured loot table is produced regardless of eligible count (1, 2 or 6 players).
- Given one eligible player, then that player wins item automatically; given multiple, a unique roll winner; ties resolved without duplicated items.
- Given duplicate shop basic items, then upgrade exactly one eligible basic item until cap (proposed level 5).
- Given max-level basic item, required boss item and gold, then crafting consumes them once and awards one stronger item; replay of same request cannot duplicate.
- Given 4 equipment slots full, then fifth equip action is denied or requires explicit swap; other backpack items remain available.
- Given owner drops an item and another player picks it up, ownership and state update exactly once, never two copies.

## I. Presentation / pixel art camera (M0–M1)

- Given M0 boots, then the client uses a **fixed orthographic 2D top-down/three-quarter** view resembling a classic Pokémon overworld; no side-scrolling, 3D chase, rotating camera or isometric diamond tile projection.
- Given square-grid tilemap and hero, then arrow-key movement includes diagonals while the client consistently selects supported facing sprites; the local camera follows on the same projected ground plane.
- Given a hero walks to the north (behind) a tree/roof foreground layer, then foliage/roof appears in front of the hero, and moving south (in front) produces the opposite visual ordering where appropriate.
- Given character graphics are taller than ground footprints, then their collision footprint and render Y-depth are tied to their feet/ground location, not to the sprite image bounds; visual occlusion does not alter server-authoritative collision.
- Given pixel art displayed at normal game zoom, then textures retain crisp hard-edged pixels without filtering blur or obvious camera shimmer; inspect real client screenshots where possible.
- Given a skill used in dungeon or PvP, then camera perspective and pixel scale remain consistent with the central arena.

## J. PvP (future milestone)

- Given two sides populated and both ready, then PvP starts; before ready, no damage in duel.
- Given more than six total room players, no side assignment may bypass match cap.
- Given duel active, then no active-skill respec within PvP zone; after end they return to normal match state.

## UI presentation regression suite — v1.4

- **Viewport:** Given the player has joined a room, when gameplay starts, then the world consumes the available game viewport and there are **no persistent page-sidebars** for room/hero/creeps, no large page title/footer squeezing the map.
- **In-world HUD:** Given the player is in arena or dungeon, then hero HP/MP/level/EXP, skill hotbar and next invasion/statue status remain visible as viewport overlays (when state exists), not external cards.
- **Inventory:** Given the player opens inventory, then an overlay opens inside the game viewport, with four equipment slots, backpack representation, details/close action, and no page reflow.
- **NPC interaction:** Given the player clicks a dungeon NPC within interaction range, then the dungeon menu opens within the viewport and is dismissible; server validates any requested travel.
- **Input safety:** Given an in-game menu is open, pressing keys used by menus must not cast spells/attack/move accidentally; when closed, Arrow, A and QWER recover. Clicking buttons should not trigger a world click.
- **Clock:** Given the player browses an item/dungeon menu, the server match clock, waves, and other players continue normally and urgent raid warnings remain visible above the menu.
- **Responsive:** Given 1280×720 and 1920×1080 desktop viewports (suggested test sizes), then all required HUD/modal content is reachable and not clipped.
- **Visual regression:** When the implementation is reviewed, take real screenshots of game + inventory open + NPC menu open; compare positively to `in_game_world_reference.png` and negatively to `current_codex_dashboard_anti_reference.png`. Report placeholder imagery, real test commands, and any unimplemented systems.

## v1.6 Visual approval cases (ART-01)

- GIVEN the actual running game screenshot, WHEN compared with the approved concept art and `current_game_2026_10_29_placeholder_anti_reference.png`, THEN the new hero/tree/tile/building/FX assets are demonstrably non-placeholder, cohesive and readable at target zoom.
- GIVEN a hero walking and attacking in four directions, WHEN captured from Phaser, THEN animation frames are real source asset frames, pivots are consistent and collision remains server-owned.
- GIVEN the small demo scene is complete, WHEN reviewed, THEN art is marked `NEEDS REVISION` until the director explicitly approves it. Tech tests passing does not implicitly approve art.


## UI Phase 1 — dedicated pre-game school selection

- Landing has exactly one nickname input; blank submission cannot advance. Room Browser displays actual rooms/counts/capacity/lock/phase, create/join and recoverable list/join errors.
- Waiting lobby synchronizes connected players, room code and host; no school controls. Guests cannot start. Waiting host loss disables start without promoting a client.
- Host start sends every connected client to SCHOOL_SELECTION in the same room. Four canonical schools only, distinct portraits, selected highlight, design-derived copy, confirm action and authoritative ready count.
- Selection may change until confirmation; confirmed choice cannot change. Duplicates allowed. Empty/invalid school rejected by server; clients cannot advance themselves.
- Tick/matchElapsedMs remain zero and no core hero/gameplay commands execute before every confirmation. Afterwards all level-1 heroes retain selected school IDs in the same IN_GAME room. Existing M1 arena/runtime art/combat remain the current prototype.
- Selection disconnect leaves a visibly disconnected/unconfirmed roster slot and clock stopped; no timeout or auto-selection. Leave/recreate remains available.
- Capture real browser screenshots at 1280×720 and 1920×1080; confirm no exterior dashboard or camera rescaling. Re-run movement/combat/modal/art regressions. See docs/UI_PHASE1_IMPLEMENTATION.md for measured results and limitations.

## M2B — Statue invasion foundation

- [x] Deterministic production waves at 180/360/540 seconds; exact 60/15-second warnings. Clock starts after the school confirmation barrier, not room creation.
- [x] Server-only validated development override; 30-second interval warns at 10/3 seconds; production ignores overrides.
- [x] West/east spawns, spawn-strength participant snapshots, multiple living waves coexist; no previous-wave clearing or invasion respawns.
- [x] Statue objective movement, sticky player acquisition, invalid/dead/zone/leash release and return to objective. Detection/chase/rest are data driven.
- [x] Common authoritative damage/death/reward pipeline; one fixed assist pool; hero death and five-second arena respawn without currency/EXP loss.
- [x] Permanent statue damage with no repair/regeneration, one defeat transition, all zones/inputs/spawns frozen after defeat.
- [x] Real SDK clients agree on warnings/timer, enemy HP/death, statue HP and rewards; dungeon filtering persists; separate rooms own independent defense state.
- [x] Two real browser contexts verify joint invader hits/rewards, overlapping waves, public statue HP, warnings without dungeon recall, same defeat tick and frozen inputs. Invasion tests 2/2 passed; existing movement/combat/UI/dungeon browser regressions 11/11 passed. Screenshots inspected at normal gameplay zoom.
- Browser-specific evidence and final results: docs/M2B_IMPLEMENTATION.md and docs/evidence/m2b/. The accelerated browser run uses a six-second interval and HP300; 3/6/9-minute production timing uses simulated time.
- Remaining: production wave catalogue, bosses, victory/results, final tuning and enemy/VFX artwork approval. M2B does not authorize M2C.

## Late-join correction

- Non-full selection and active rooms expose an enabled Join button; both listed-room and room-code joins obey the same server admission policy.
- A selection-phase entrant must confirm before the initial match clock starts. Existing selections and confirmation state remain intact.
- An active-match entrant chooses a school locally while existing players continue; the global phase and clock never reset. Only confirmation creates their server-owned hero.
- Forged gameplay/dungeon commands before confirmation are rejected. Pending players are absent from rendered arena actors. Repeated confirmation cannot duplicate/reset a hero.
- Existing progression, statue HP and invasion deadline survive late entry. Full rooms reject a seventh client, an active free seat reopens when a pending entrant leaves, and defeated matches reject entry.
- Live tick updates preserve school-control DOM/focus; arrows/A work after confirmation. See docs/LATE_JOIN_FIX.md for actual verification results.
