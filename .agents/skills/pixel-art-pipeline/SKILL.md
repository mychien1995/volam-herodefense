---
name: pixel-art-pipeline
description: Use when importing, exporting, validating, organizing, or animating 2D pixel-art sprites, tilesets, VFX and Phaser assets for Võ Lâm Hero Defense; includes Aseprite/Tiled workflows and visual verification. Do not invoke for non-art game logic or invent completed art.
---

# Pixel art and animation workflow

Follow the recording policy in `AGENTS.md`: use PNG screenshots, frame observations and logs; keep routine browser video and trace screenshot streams disabled. Do not run video recording, encoding or conversion tools or create WebM/MP4/GIF evidence unless the user explicitly requests recordings for the current task. Preserve existing recordings. Validate animation frames/timing, transitions, facing, pivots/positioning and gameplay live in Phaser; still images alone do not prove motion.

1. Read `ART_ASSET_GUIDE.md`, `AGENTS.md`, `TECHNICAL_ARCHITECTURE.md` and the relevant milestone in `ROADMAP.md` before editing assets.
2. Identify the exact asset requested, whether it exists as an editable source, approved art, a licensed third-party file, or only a placeholder. If no art exists, do not fabricate provenance or pretend a complete sprite sheet is present. Generate only original simple temporary sprites when appropriate; flag them as placeholders.
3. Follow the guide's folder and ID conventions. Keep Vietnamese display names separate from ASCII IDs. Record source, ownership/license, status, dimensions, pivot, atlas/frame tags and directions in a manifest.
4. When Aseprite is installed, export from actual `.aseprite`/`.ase` sources to PNG + JSON using its documented CLI. Otherwise use existing PNG/JSON or a documented fallback; **do not require commercial software to run the game**.
5. For maps, use Tiled JSON and ensure collision/spawn/NPC/portal object markers are present. Never make the client tilemap the authority for server collision.
6. Implement a data-driven Phaser loader and animation registry. Use pixel-art-friendly filtering and verify frame dimensions, IDs, orientation and timing. Server combat events control damage and hit outcomes; display animation does not determine them.
7. Run a local browser playtest when possible. Inspect idle, four-direction walk, normal attack, spell VFX, hurt/death, hit feedback, camera zoom and two-player synchronization. Capture actual screenshots, note defects and fix them. No fabricated PASS claims.
   Follow `docs/ART_ITERATION_WORKFLOW.md`: static exports first, then two-player frame iteration (three only when useful), then one six-player natural-combat/readability gate at final delivery. Reuse retained valid sources and existing extractors; retry only defective pose groups. Record per-stage timings and keep reduced coverage clearly labeled.
8. Report all affected files, exported artifacts, validation steps and remaining placeholder/approval status. Update art guide if conventions change, and only update approved design decisions after user approval.

**Important:** This skill is an **asset production / integration workflow**, not an image generator. High-quality sprites require original art or appropriately licensed sources. Prefer a coherent tiny reviewed set over dozens of inconsistent generated frames.
