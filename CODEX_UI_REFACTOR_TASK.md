# Codex — UI/HUD Refactor Task (v1.4)

> Historical task brief. Continue only the scope requested in the current chat; use root [AGENTS.md](AGENTS.md). Resolve original filenames and corrected roles through [the current reference index](assets/references/README.md). Do not restart M0 or completed art milestones from this brief.

This is the **next task for the existing playable Codex prototype**, not a request to scaffold a second project or restart M0. Paste into Codex in the current repository, with its current game app open.

---

I want a **game-first in-game UI**, not a web dashboard with panels outside the Phaser canvas. The current prototype has a small embedded map on the left and persistent cards on the right for room status, character stats, players, and training creeps. That is **not my desired final game layout**.

Please read `AGENTS.md`, `DECISIONS.md`, `UI_UX_SPEC.md`, `ART_ASSET_GUIDE.md`, `ART_DIRECTION_REFERENCE.md`, `TECHNICAL_ARCHITECTURE.md`, and `ACCEPTANCE_TESTS.md`. Inspect the provided actual images, especially:

- `assets/references/anti-reference/dashboard_layout.png` — **BAD layout; avoid**.
- `assets/references/mood/world/central_arena_hub_reference.png` — **GOOD** full-screen hub composition reference.
- `assets/references/mood/world/arena_battle_reference.png` — **GOOD** combat + HUD composition reference.
- `assets/references/mood/world/forest_dungeon_reference.png`, `assets/references/mood/world/desert_dungeon_reference.png`, `assets/references/mood/world/sea_dungeon_reference.png`, `assets/references/mood/world/hell_dungeon_reference.png` — environment targets for dungeon scenes.
- `assets/references/mood/ui/dungeon_selection_menu_reference.png` — desired dungeon selection overlay reference.
- `assets/references/mood/ui/merchant_shop_menu_reference.png` — desired merchant/shop overlay reference.
- `assets/references/mood/ui/inventory_menu_reference.png` — desired inventory/equipment overlay reference.
- `assets/references/mood/characters/cai_bang_character_reference.png`, `assets/references/mood/characters/vo_dang_character_reference.png` — school identity references; use actual approved school sources for Thiên Sơn/Thiếu Lâm.
- `assets/references/mood/world/wuxia_town_reference.png` — additional overworld/environment quality reference.

**Required redesign:**

1. Once a match starts, let the game viewport occupy the available screen. No persistent right-side HTML panel, header, documentation column, text-based skill listing, or bottom debugging footer outside the game. A separate lobby before joining is fine.
2. Overlay a polished, readable in-game HUD: character portrait, school, HP/MP/EXP/level, statue HP, upcoming invasion countdown, gold, player info as needed, and an `A` + `QWER` skill/attack hotbar with cooldowns.
3. All inventory, shop, skill loadout, crafting, dungeon NPC and PvP menus must open as **in-game overlays**, over the world and within the game viewport. An HTML/CSS overlay **inside the relative-positioned canvas wrapper** is acceptable; do not force everything into Phaser Graphics if DOM makes interactive menus easier. Keep the visual style wuxia pixel art, not a generic admin dashboard.
4. As the first examples, make a functional inventory overlay and dungeon-selection overlay (reuse any working backend; if not yet implemented, show clearly disabled preview content without inventing behavior). Include close buttons and safe input handling.
5. Preserve Arrow movement, `A` normal attack, `QWER` skills, mouse NPC interaction, all current multiplayer functionality, and server-authoritative state. Do not touch the balance formulas, school data, or networking protocol unless essential to a documented UI bug fix.
6. Implement robust layering, responsive sizing, keyboard/mouse focus capture, and live raid warnings above dialogs without pausing multiplayer.
7. Test with two clients and verify keyboard controls after closing a menu. Capture and show screenshots of normal play, inventory open, and NPC/dungeon menu open at desktop viewport sizes. Compare screenshots with the references and list any placeholder imagery.
8. Only change the UI/presentation and required wiring for this task. Stop when the UI refactor is verified; do not implement future boss/dungeon gameplay merely to make menus look functional.

9. Use the new concept images as concrete layout/art targets. The bottom-center hotbar, top-left HP/MP/EXP block, top-right compact system buttons, bottom-right minimap, and lower-left bag/gold cluster are all approved patterns. You may adapt scale and spacing for usability, but the resulting match UI should be recognizably closer to these references than to the old dashboard prototype.


Before coding, give me a brief UI migration plan and list the current components you will remove/restructure. After coding, report changed files, actual tests, screenshots, and known limitations.
