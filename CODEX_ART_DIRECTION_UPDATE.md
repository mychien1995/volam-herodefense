# Codex art direction update — v1.2

Apply this to any existing working repository using v1.1. Read `AGENTS.md`, `ART_ASSET_GUIDE.md`, and `ACCEPTANCE_TESTS.md` from v1.2 before implementation.

> The game must use **original 2D pixel art viewed from a classic Pokémon-style elevated top-down/three-quarter overworld camera**. This is an orthographic 2D scene on a square tilemap, not a 3D chase camera, an isometric diamond grid, a platformer side view, or an overhead view that only shows characters' heads. Keep the camera non-rotating and follow the player across arena, dungeons, and PvP. Use crisp nearest-neighbor pixel rendering and a stable sprite scale. Implement four directional facing animations initially while supporting eight-direction movement; keep hitboxes on the ground near character feet, perform correct Y-depth sorting, and layer roofs/trees so the player can move visually behind them. Tile size, frame size and zoom are provisional defaults, not finalized requirements. In M0, placeholders are fine; in M1, visually verify the camera, four facing directions, proper occlusion, and animations in a running browser. Do not claim finished art assets exist unless actual reviewed files are present.

A dedicated pixel-art skill already exists at `.agents/skills/pixel-art-pipeline/SKILL.md`; no new global installation is needed for these perspective rules.
