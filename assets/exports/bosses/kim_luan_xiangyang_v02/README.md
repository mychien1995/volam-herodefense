# Tương Dương · Kim Luân arena

The director approved this court on 2026-11-13 for the normal Kim Luân dungeon.

- Art source: OpenAI ImageGen, host image route. The existing `assets/references/in_game_world_reference.png` was supplied for pixel-art detail and the overhead camera.
- Prompt direction: Song military barbican with a central red gate, blue slate roof, grey crenellated ramparts and an open south passage. Keep the central rectangular court low-contrast and free of props, no characters or interface, and use a fixed elevated north-up view.
- Native artwork: `xiangyang-gate-court.png`, 1659 × 948, SHA-256 `976bb19edbeed125e0ce81ee23e423f7efeee23a53d91a0efcc05a9efb62a050`. The arena is 1190 × 680 world units and the entire raster is displayed with equal X/Y scaling.
- Layout: `kimLuanDungeon` in `packages/game-data/src/kim-luan.ts`. The north and side wall feet and two south wall spans block movement. The central south passage leads to the return portal.
