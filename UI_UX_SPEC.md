# Võ Lâm Hero Defense — In-game UI / UX specification v1.4

**Status:** CONFIRMED design direction, PROPOSED exact placements and dimensions. Effective 2026-10-29.

## 1. Intent — GAME FIRST, NOT A WEB DASHBOARD (CONFIRMED)

The game must feel like a **complete 2D pixel-art RPG**. Once a player joins a match, the **world is the main screen**. Health, mana, EXP, hotbar, gold, inventory, dungeon/merchant/crafting/skill menus, PvP waiting room, and boss loot rolls are **drawn over, or anchored within, the same game viewport**. Never shrink the playfield to make space for persistent web-app sidebars, a page header, a status column, or a separate dashboard below the game.

**The current Codex prototype screenshot is an anti-reference** (`assets/references/current_codex_dashboard_anti_reference.png`): title/description outside the game, map embedded on the left, persistent `Temporary practice room`, character stats, players, and training creeps on a right column, footer/tool text beneath. Replace this in-match presentation. It may survive only in an explicitly toggled developer debug overlay (off in regular gameplay).

**Positive visual references:** `assets/references/in_game_world_reference.png` for wuxia pixel-art scene composition; `assets/references/cai_bang_character_reference.png`, `thien_son_thieu_lam_character_reference.png`, and `vo_dang_art_direction_reference.png` for chibi character styling. These **are reference/concept sheets, not ready-to-import animated spritesheets or a finished UI atlas**. The sample in-game scene is an art target, not a pixel-perfect UI layout requirement. No borrowed proprietary assets.

## 2. Display hierarchy (CONFIRMED vs PROPOSED)

**Confirmed:** A single full-size responsive game viewport. World and camera render behind HUD and temporary interactive menus. In-match information is accessible in-game; no always-visible external HTML panel. Mouse usable for NPC/menu/inventory, arrow keys move, `A` basic attack, `QWER` abilities. Avoid click-targeted skills.

**Proposed placements**, subject to visual review:

- **Top-left:** hero portrait, school/name, level, HP and mana bars, small EXP progress (hover/tap details); keep reasonably compact.
- **Top-center:** statue HP and next raid countdown with wave number, warning indicators. High priority, visible even while browsing a dungeon or menu.
- **Top-right:** optional minimap with player/statue/NPC markers; optional multiplayer player-count icon. Minimap design is not a confirmed v1 gameplay feature.
- **Bottom-center:** `A` basic attack and `Q W E R` skill hotbar with icons, mana cost/rank, cooldown radial or numeric overlay, feedback when disabled. Small combo indicator for Thiếu Lâm Phát Động near hotbar.
- **Bottom corners:** gold/EXP indicators, compact in-world buttons for inventory, skills, options, and dungeon navigation as applicable.
- **Floating in-world events:** damage numbers, cast warnings, critical hits, enemy HP only where useful, loot outcome toast, wave start warning, personal respawn countdown.
- **The world remains visible** under the UI; all overlays styled consistently with chibi martial-arts pixel art.

Example only (not to scale):

```text
┌────────────────────────────────────────────────────────────────────┐
│ [Portrait] Cái Bang Lv12     [STATUE HP] Wave 6 · 02:35    [Map?]│
│ [HP ━━━━━━━] [MP ━━━━━]       [Invasion warning]                  │
│ [XP ━━━━━━]                                                        │
│                                                                    │
│                                                                    │
│         ┌──────────────────────────────────────────────┐           │
│         │      ARENA / DUNGEON PIXEL-ART WORLD        │           │
│         │       Players · NPCs · enemies · scenery    │           │
│         └──────────────────────────────────────────────┘           │
│                                                                    │
│ [Gold 1,250]             [A] [Q] [W] [E] [R]          [Bag] [Skill]│
└────────────────────────────────────────────────────────────────────┘
```

No static right sidebar, no HTML list of training creeps replacing in-world enemy HP, no giant page title above the match, no persistent footer outside the viewport. A dedicated lobby/create/join screen **before entering a match** may be implemented as a separate view; once playing, remove lobby/status scaffolding.

## 3. In-game menus (CONFIRMED placement, PROPOSED behavior details)

All menus and modals appear *within* the fixed game viewport or as full-viewport overlays while the match remains rendered underneath. These are **not additional columns outside the game**.

| Trigger | UI | Actions | Important restrictions |
|---|---|---|---|
| Click NPC Dungeon Guide | Dungeon selection window | Choose solo/shared, creep/boss, view details, enter | Server validates interaction and entry; modal stays inside viewport |
| Click Merchant NPC | Shop window | Buy basic items, sell items | Show gold, prices, disabled unavailable purchases |
| Click Crafting NPC or merchant crafting tab | Crafting window | Preview recipe, materials, gold cost, craft | Server validates ownership and crafting; no dupes |
| Click inventory icon (or configurable key) | Inventory modal | 4 equipment slots, backpack, item details, equip/drop/sell | No duplicate rewards or client authority |
| Click skill icon (or configurable key) | Skill loadout menu | Select A normal attack, equip QWER, allocate/reset skill points | Server permits change **only in arena**; dungeon/PvP read-only |
| Click PvP NPC | PvP setup / waiting overlay | Join team A/B, ready/start | No persistent web sidebar |
| Boss killed, eligible | Loot roll dialog | Roll or pass; result toast | One drop per dungeon boss, authoritative tie-break and timeout |
| Personal death | Respawn/countdown overlay | View countdown, return to arena | Shared match clock and statue invasion continue |

Modal rules:

- Show a **close button**, mouse dismiss control and (proposed) `Escape` to close, unless a result is actively resolving.
- When a modal opens, **suppress gameplay hotkeys** (arrow/A/QWER) while typing or using text inputs, or while modal input focus owns the controls. Do not accidentally attack when purchasing or rebinding skills.
- Do **not pause** the multiplayer server/game clock when a client opens inventory or NPC UI. Warn player if a wave is imminent.
- If server sends a raid warning or critical statue event, display a clearly visible notification **above the open menu** without stealing clicks unexpectedly.
- Menu position may be center or near a clicked NPC but must remain inside viewport bounds; use scroll regions and readable item details on small desktop viewports. Use explicit back/close navigation.
- Preserve keyboard attack/skills and mouse NPC interaction. Do not add mouse targeting.

## 4. Technical implementation (implementation choice, not mandated framework)

**Acceptable:** Phaser game world + Phaser HUD layers (`scrollFactor=0`) for compact HUD, AND/OR **HTML/CSS UI overlay absolutely positioned within the same relative-positioned game viewport wrapper** for complex inventories and shops. The HTML overlay is still *in-game* as long as it covers the canvas and never steals permanent page layout width/height. HTML is not forbidden; a dashboard is.

Suggested component tree:

```text
GameApplication
  PreMatchLobby (create/join, optional separate screen)
  GameViewport [position:relative; aspect-ratio policy; fills available screen]
    PhaserCanvas (world/camera; pixelArt/nearest-neighbor)
    InGameHudOverlay (fixed to viewport, does not scroll with world)
      HeroHud | StatueHud | RaidTimer | Hotbar | Notifications | OptionalMinimap
    ModalLayer (above HUD inside same viewport)
      Inventory | SkillLoadout | DungeonMenu | Shop | Crafting | PvPLobby | LootRoll
    DevDebugLayer (opt-in via dev flag; hidden in normal play)
```

Engineering constraints:

- Client UI is a **view** of validated server state; server remains authoritative for HP/MP/XP, gold, equipment, dungeon, loot, skill respec and raid state.
- World mouse clicks should find NPCs/hit interactive objects; UI mouse clicks should stop at UI instead of becoming world interactions.
- Coordinate input focus and pointer ownership; keep HUD noninteractive areas pointer-transparent so movement/interaction isn't blocked.
- All overlays must respond to viewport resizes and browser zoom (no position relative to page sidebar). Target desktop 16:9 initially; other desktop ratios must remain usable. Exact min resolution and scaling are not final.
- Separate rendering/simulation from UI: no UI dependencies in `game-core`, no new network trust. Reuse client state bindings; avoid rewriting combat.
- Pixel art rendering stays crisp; keep fonts readable, with wuxia-inspired frames/palettes and original icons. DOM fonts may use a carefully chosen readable pixel/bitmap-style face, with Vietnamese diacritics correctly supported (no missing glyphs).
- HUD and menu animations are client-side presentation; multiplayer world continues behind overlays.
- UI depth order above characters and VFX; world depth by feet/Y. Do not make NPC interaction UI disappear behind trees/buildings.
- Maintain room connect/reconnect indicators compactly in-game, not as permanent web application cards.

## 5. UI visual direction

- Original wuxia pixel-art interface: dark/wood/jade/bronze/red accents, crisp beveled/panel borders, small parchment windows if readable; match the beautiful game reference scene rather than dashboard styling.
- Main game view should be visually dominant. Keep each HUD region small enough to preserve sightlines, especially both statue invasion routes. Use opacity and responsive hide/collapse on narrow viewports.
- Highlight statuses with icons and tooltips, cooldown shading, and concise labels. The skill bar uses **icons and rank/cooldown state**, not a text-only table.
- Inventory is a visually recognizable grid of item icons; show four equipped slots, a separate backpack grid, item descriptions/rarity/upgrade level, gold, crafting recipe previews.
- Dungeon selection should show destination labels, solo/shared and creep/boss distinction, preview/difficulty info when available, and Enter/Cancel. Avoid a browser page navigation.
- Different hero school portrait and skill effects adhere to referenced chibi pixel-art standards.

## 6. Incremental refactor plan for existing Codex M1 game

1. **Audit existing app** and list all dashboard/side-panel/page-header/footer elements; identify where game state and callbacks are currently wired. Do not discard multiplayer functionality.
2. Create a **single responsive GameViewport** spanning the main screen, wrap Phaser canvas and overlay UI in that viewport; keep a separate pre-match lobby if needed.
3. Move current status/stats/actions into **in-game HUD**; expose existing HP, mana, EXP, level, gold, weapon mode, connected room, player count, training enemies where appropriate. Remove redundant right-hand cards and persistent page chrome.
4. Convert the existing Q/W skill text rows and A attack setting into **hotbar icons plus in-game skill/equipment menus**, retaining keybindings and server state.
5. Create one functional **inventory overlay** and one functional **Dungeon NPC menu** as representative interactions. If backend support for a feature is not implemented yet, clearly label it as preview/disabled and do not fake authoritative purchases/teleports.
6. Visual smoke test: 1280×720 and 1920×1080 (suggested) plus a narrower desktop window, with gameplay, menu open, and invasion warning. Test two clients, keyboard input, mouse NPC menu, modal input capture, network state. Capture actual screenshots and compare to user references.
7. Stop after UI refactor, report screenshots, tests, and remaining placeholders. Do **not** rewrite game rules, back end or assets without cause.

## 7. Acceptance criteria

- [ ] Game world fills the intended game viewport and is not squeezed by a permanent right column or page header.
- [ ] HUD for hero HP/MP/level/EXP, wave countdown/statue health, gold and hotbar is layered over world.
- [ ] Q/W/E/R and A keys still work during gameplay; icon and cooldown states are visible and synchronized.
- [ ] Inventory opens inside the game viewport; shows four equipment slots and backpack area (placeholder slots okay until gameplay implementation).
- [ ] Clicking dungeon NPC opens an **in-game** menu, not an outside panel, and closes cleanly.
- [ ] Clicking UI does not unintentionally move/attack/activate skills; modal keyboard focus is safe.
- [ ] Server keeps simulating and waves/alerts remain visible while inventory/shop is open; no artificial multiplayer pause.
- [ ] UI stays usable with different desktop sizes; no off-screen modal/window or disappearing HUD.
- [ ] Real screenshots of both normal gameplay and one menu-open state are reviewed against `in_game_world_reference.png` and `current_codex_dashboard_anti_reference.png`.
- [ ] No change to authoritative gameplay logic and no invented feature claims (e.g. fake item purchase / dungeon entry).

## 8. Unresolved details (do not silently declare approved)

- Exact placement, size, pixel art frame aesthetics, gold/XP widget positions, and minimap inclusion.
- Keyboard inventory (`I` suggested) / skills (`K` suggested) / Escape bindings: confirm collision with existing game controls before implementing.
- Whether character and target HP bars are always shown or on interaction; item rarity colors; exact backpack capacity and scroll behavior.
- Menu display rule during active raids and whether the HUD changes based on solo/team mode.

The user has explicitly approved **in-world HUD and menus instead of external panels**, but has **not** approved every provisional pixel/layout specification.


## 9. v1.5 reference images to inspect before UI work

Before making or refactoring any in-match UI, inspect these files:

- `assets/references/central_arena_hub_reference.png` — full in-game hub composition.
- `assets/references/arena_battle_reference.png` — arena battle HUD composition.
- `assets/references/forest_dungeon_reference.png`
- `assets/references/desert_dungeon_reference.png`
- `assets/references/sea_dungeon_reference.png`
- `assets/references/hell_dungeon_reference.png`
- `assets/references/dungeon_selection_menu_reference.png` — desired dungeon menu overlay.
- `assets/references/merchant_shop_menu_reference.png` — desired merchant overlay.
- `assets/references/inventory_menu_reference.png` — desired inventory/equipment overlay.
- `assets/references/current_codex_dashboard_anti_reference.png` — anti-reference showing what not to do.

These references lock in the intended pattern:
- world fills the screen,
- HUD is compact and overlaid,
- bottom-center hotbar is iconic and always visible,
- top-left hero HP/MP/EXP block is compact and readable,
- top-right feature buttons are compact,
- minimap sits inside the viewport,
- inventory/shop/dungeon selection open as ornate in-game windows while the world remains visible behind them.
