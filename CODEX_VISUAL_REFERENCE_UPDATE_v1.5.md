# Codex prompt — apply v1.5 visual references

> Historical task brief. Continue only the scope requested in the current chat; use root [AGENTS.md](AGENTS.md). Resolve original filenames and corrected roles through [the current reference index](assets/references/README.md). Do not restart M0 or completed art milestones from this brief.

Please read `AGENTS.md`, `ART_DIRECTION_REFERENCE.md`, `ART_ASSET_GUIDE.md`, `UI_UX_SPEC.md`, and `CODEX_UI_REFACTOR_TASK.md`, then inspect all files in `assets/references/`.

New approved references include:
- `central_arena_hub_reference.png`
- `arena_battle_reference.png`
- `forest_dungeon_reference.png`
- `desert_dungeon_reference.png`
- `sea_dungeon_reference.png`
- `hell_dungeon_reference.png`
- `dungeon_selection_menu_reference.png`
- `merchant_shop_menu_reference.png`
- `inventory_menu_reference.png`
- the school character references for Võ Đang, Cái Bang, Thiên Sơn and Thiếu Lâm

Treat these as the primary art/UI direction for the project.

Requirements:
1. Keep the gameplay world as the dominant full-screen match viewport.
2. Use a compact in-game HUD: top-left hero block, bottom-center hotbar, bottom-right minimap, top-right system buttons, lower-left bag/gold cluster.
3. Make inventory, merchant/shop, dungeon selection and other menus appear as ornate in-game overlay windows inside the viewport, not web panels outside it.
4. Match the environment ambition of the forest, desert, sea, hell and arena references, while preserving gameplay readability and the existing camera perspective.
5. Do not copy reference images tile-for-tile; use them as direction for composition, theme, density and UI placement.
6. Preserve all existing keyboard controls, multiplayer networking and server-authoritative gameplay rules.
7. After implementation/refactor, capture screenshots of: normal hub gameplay, one dungeon scene, inventory open, merchant open, and dungeon menu open. Explain remaining placeholders honestly.

Do not restart the project. Apply the updated references to the current repository and current milestone work.
